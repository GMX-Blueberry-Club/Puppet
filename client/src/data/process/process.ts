import { map } from "@most/core"
import { Stream } from "@most/types"
import { BASIS_POINTS_DIVISOR, BYTES32_ZERO, IntervalTime, TIME_INTERVAL_MAP } from "gmx-middleware-const"
import {
  IPositionIncrease, IPositionSlot, IPriceInterval,
  IPriceIntervalIdentity, createPricefeedCandle, div, getIntervalIdentifier, importGlobal, switchMap
} from "gmx-middleware-utils"
import { getPuppetSubscriptionKey } from "puppet-middleware-const"
import { IAccountToRouteMap, IPositionMirrorSettled, IPositionMirrorSlot, IPositionRequest, IPuppetRouteTrades } from "puppet-middleware-utils"
import * as viem from "viem"
import { arbitrum } from "viem/chains"
import { rootStoreScope } from "../store/store"
import { IProcessEnvironmentMode, IProcessedStore, IProcessedStoreConfig, defineProcess, validateSeed } from "../../utils/indexer/processor"
import { transformBigints } from "../../utils/storage/storeScope"
import { puppetLog } from "../scope"
import * as gmxLog from "../scope/gmx"


export interface IProcessMetrics {
  cumulativeBlocks: bigint
  cumulativeDeltaTime: bigint
  timestamp: bigint
  avgDeltaTime: bigint
  height: bigint
}


export const PRICEFEED_INTERVAL = [
  TIME_INTERVAL_MAP.MIN5,
  TIME_INTERVAL_MAP.MIN15,
  TIME_INTERVAL_MAP.MIN60,
  TIME_INTERVAL_MAP.HR4,
  TIME_INTERVAL_MAP.HR24,
] as const

export interface IGmxProcessState {
  blockMetrics: IProcessMetrics,
  // positionSlot: Record<viem.Hex, IPositionSlot>
  // positionsSettled: Record<viem.Hex, IPositionSettled>
  // leaderboard: Record<viem.Address, ITraderSummary>
  pricefeed: Record<IPriceIntervalIdentity, Record<string, IPriceInterval>>
  latestPrice: Record<viem.Address, bigint>
  approximatedTimestamp: number

  mirrorPositionRequest: Record<viem.Hex, IPositionRequest>
  mirrorPositionSlot: Record<viem.Hex, IPositionMirrorSlot>
  mirrorPositionSettled: IAccountToRouteMap<IPositionMirrorSettled[]>
  subscription: IPuppetRouteTrades[]
}




const state: IGmxProcessState = {
  blockMetrics: {
    cumulativeBlocks: 0n,
    cumulativeDeltaTime: 0n,

    height: 0n,
    timestamp: 0n,
    avgDeltaTime: 0n,
  },
  approximatedTimestamp: 0,
  pricefeed: {},
  latestPrice: {},

  mirrorPositionRequest: {},
  mirrorPositionSlot: {},
  mirrorPositionSettled: {},
  subscription: [],
}

const config: IProcessedStoreConfig = {
  startBlock: 115000000n,
  endBlock: 122956472n,
  chainId: arbitrum.id,
}


export const seedFile: Stream<IProcessedStore<IGmxProcessState>> = importGlobal(async () => {
  const req = await (await fetch('/db/sha256-Ki3Ek+i1Li+uz6FtPOX__5CohGfIoGmTtBsQf5VULng=.json')).json()
  const storedSeed: IProcessedStore<IGmxProcessState> = transformBigints(req)

  const seedFileValidationError = validateSeed(config, storedSeed.config)

  if (seedFileValidationError) {
    throw new Error(`Seed file validation error: ${seedFileValidationError}`)
  }
      
  return storedSeed
})

export const gmxProcess = defineProcess(
  {
    mode: SW_DEV ? IProcessEnvironmentMode.DEV : IProcessEnvironmentMode.PROD,
    seed: seedFile,
    blueprint: {
      config,
      state,
    },
    parentScope: rootStoreScope,
    queryBlockSegmentLimit: 100000n,
  },
  {
    source: gmxLog.requestIncreasePosition,
    step(seed, value) {
    
      if (seed.blockMetrics.height > 0n)  {
        const heightDelta = value.blockNumber - seed.blockMetrics.height
        const timeDelta = value.args.blockTime - seed.blockMetrics.timestamp

        if (seed.blockMetrics.cumulativeBlocks >= 10000)  {
          seed.blockMetrics.cumulativeDeltaTime -= seed.blockMetrics.avgDeltaTime      
          seed.blockMetrics.cumulativeBlocks -= heightDelta      
        }

        seed.blockMetrics.cumulativeDeltaTime += timeDelta
        seed.blockMetrics.cumulativeBlocks += heightDelta
        seed.blockMetrics.avgDeltaTime = div(seed.blockMetrics.cumulativeDeltaTime, seed.blockMetrics.cumulativeBlocks)
      }

      seed.blockMetrics.height = value.blockNumber
      seed.blockMetrics.timestamp = value.args.blockTime

      return seed
    },
  },
  {
    source: gmxLog.vaultPriceEvents,
    step(seed, value) {
      const args = value.args

      seed.latestPrice[args.token] = args.fastPrice

      if (seed.blockMetrics.timestamp === 0n) {
        return seed
      }

      seed.approximatedTimestamp = Number(seed.blockMetrics.timestamp + (value.blockNumber - seed.blockMetrics.height) * seed.blockMetrics.avgDeltaTime / BASIS_POINTS_DIVISOR)

      for (const key in PRICEFEED_INTERVAL) {
        storeCandle(seed, args.token, PRICEFEED_INTERVAL[key], args.fastPrice)
      }

      return seed
    },
  },
  {
    source: gmxLog.increaseEvents,
    step(seed, value) {

      const args = value.args
      seed.mirrorPositionRequest[args.key] ??= {
        positionKey: args.key,
        puppets: [],
        requestKey: BYTES32_ZERO,
        routeTypeKey: BYTES32_ZERO,
        route: args.account,
        trader: args.account,
        shares: [],
        shareSupply: 0n,
        traderShare: 0n,
        blockTimestamp: seed.approximatedTimestamp,
        transactionHash: value.transactionHash,
        __typename: 'PositionRequest',
      }


      const mirrorPositionReq = seed.mirrorPositionRequest[args.key]



      if (!seed.mirrorPositionSlot[args.key]) {
        const positionSlot = seed.mirrorPositionSlot[args.key] = createMirrorPositionSlot(
          seed.approximatedTimestamp,
          value.transactionHash,
          {
            ...args,
            __typename: 'IncreasePosition',
            blockTimestamp: seed.approximatedTimestamp,
            transactionHash: value.transactionHash,
          },
          mirrorPositionReq.requestKey,
          mirrorPositionReq
        )
        seed.mirrorPositionSlot[args.key].puppets.forEach(puppet => {
          const subscKey = getPuppetSubscriptionKey(puppet, positionSlot.trader, positionSlot.routeTypeKey)
          const subsc = seed.subscription.find(s => s.puppetSubscriptionKey === subscKey)!

          subsc.open.push(positionSlot)
        })
      }


      const positionSlot = seed.mirrorPositionSlot[args.key]
      positionSlot.lastIncreasedTime = BigInt(seed.approximatedTimestamp)
      positionSlot.requestKey = mirrorPositionReq.routeTypeKey
      positionSlot.cumulativeCollateral += args.collateralDelta
      positionSlot.cumulativeSize += args.sizeDelta
      positionSlot.cumulativeFee += args.fee * 2n
      positionSlot.link.increaseList.push({
        ...value.args,
        blockTimestamp: seed.approximatedTimestamp,
        transactionHash: value.transactionHash,
        __typename: 'IncreasePosition'
      })


      return seed
    },
  },
  {
    source: gmxLog.decreaseEvents,
    step(seed, value) {
      const args = value.args
      const positionSlot = seed.mirrorPositionSlot[args.key]

      if (!positionSlot) {
        return seed
        // throw new Error('position not found')
      }

      positionSlot.cumulativeFee += args.fee
      positionSlot.link.decreaseList.push({ ...value.args, blockTimestamp: seed.approximatedTimestamp, transactionHash: value.transactionHash, __typename: 'DecreasePosition' })

      return seed
    },
  },
  {
    source: gmxLog.updateEvents,
    step(seed, value) {
      const args = value.args
      const positionSlot = seed.mirrorPositionSlot[args.key]

      if (!positionSlot) {
        return seed
        // throw new Error('position not found')
      }

      const markPrice = seed.latestPrice[positionSlot.indexToken]

      positionSlot.link.updateList.push({ ...value.args, blockTimestamp: seed.approximatedTimestamp, markPrice, transactionHash: value.transactionHash, __typename: 'UpdatePosition' })
      positionSlot.collateral = args.collateral
      positionSlot.realisedPnl = args.realisedPnl
      positionSlot.averagePrice = args.averagePrice
      positionSlot.size = args.size
      positionSlot.reserveAmount = args.reserveAmount
      positionSlot.entryFundingRate = args.entryFundingRate
      positionSlot.maxCollateral = args.collateral > positionSlot.maxCollateral ? args.collateral : positionSlot.maxCollateral
      positionSlot.maxSize = args.size > positionSlot.maxSize ? args.size : positionSlot.maxSize

      return seed
    },
  },
  {
    source: gmxLog.closeEvents,
    step(seed, value) {
      const args = value.args
      const positionSlot = seed.mirrorPositionSlot[args.key]

      if (!positionSlot ) {
        return seed
        // throw new Error('position not found')
      }


      seed.mirrorPositionSettled[positionSlot.trader] ??= {}
      seed.mirrorPositionSettled[positionSlot.trader][positionSlot.routeTypeKey] ??= []
      const newSettledPosition: IPositionMirrorSettled = {
        ...positionSlot,
        realisedPnl: args.realisedPnl,
        settlePrice: seed.latestPrice[positionSlot.indexToken],
        isLiquidated: false,
        settlement: {
          ...args,
          transactionHash: value.transactionHash,
          blockTimestamp: seed.approximatedTimestamp,
          __typename: 'ClosePosition',
        },
        blockTimestamp: seed.approximatedTimestamp,
        transactionHash: value.transactionHash,
        __typename: 'PositionMirrorSettled',
      } as const
      seed.mirrorPositionSettled[positionSlot.trader][positionSlot.routeTypeKey].push(newSettledPosition)


      positionSlot.puppets.forEach(puppet => {
        const subscKey = getPuppetSubscriptionKey(puppet, positionSlot.trader, positionSlot.routeTypeKey)
        const subsc = seed.subscription.find(s => s.puppetSubscriptionKey === subscKey)!

        subsc.settled.push(newSettledPosition)

        const removeIdx = subsc.open.findIndex(pos => pos.positionKey === positionSlot.positionKey)
        subsc.open.splice(removeIdx, 1)
      })

      delete seed.mirrorPositionSlot[args.key]
      delete seed.mirrorPositionRequest[args.key]


      return seed
    },
  },
  {
    source: gmxLog.liquidateEvents,
    step(seed, value) {
      const args = value.args
      const positionSlot = seed.mirrorPositionSlot[args.key]

      if (!positionSlot) {
        return seed
        // throw new Error('position not found')
      }


      const realisedPnl = -args.collateral

      seed.mirrorPositionSettled[positionSlot.trader] ??= {}
      seed.mirrorPositionSettled[positionSlot.trader][positionSlot.routeTypeKey] ??= []
      const newSettledPosition: IPositionMirrorSettled = {
        ...positionSlot,
        realisedPnl: realisedPnl,
        settlePrice: args.markPrice,
        isLiquidated: false,
        settlement: {
          ...args,
          transactionHash: value.transactionHash,
          blockTimestamp: seed.approximatedTimestamp,
          __typename: 'LiquidatePosition',
        },
        __typename: 'PositionMirrorSettled',
      } as const
      seed.mirrorPositionSettled[positionSlot.trader][positionSlot.routeTypeKey].push(newSettledPosition)

      positionSlot.puppets.forEach(puppet => {
        const subscKey = getPuppetSubscriptionKey(puppet, positionSlot.trader, positionSlot.routeTypeKey)
        const subsc = seed.subscription.find(s => s.puppetSubscriptionKey === subscKey)!

        subsc.settled.push(newSettledPosition)

        const removeIdx = subsc.open.findIndex(pos => pos.positionKey === positionSlot.positionKey)
        subsc.open.splice(removeIdx, 1)
      })

      delete seed.mirrorPositionSlot[args.key]
      delete seed.mirrorPositionRequest[args.key]

      return seed
    },
  },
  {
    source: puppetLog.shareIncrease,
    step(seed, value) {
      const args = value.args
      const positionSlot = seed.mirrorPositionSlot[args.positionKey]

      if (!positionSlot) {
        return seed
        // throw new Error('position not found')
      }

      positionSlot.shares = args.puppetsShares
      positionSlot.traderShare = args.traderShares
      positionSlot.shareSupply = args.totalSupply

      // positionSlot.position.cumulativeFee += args.fee
      // positionSlot.position.link.decreaseList.push({ ...value.args, blockTimestamp: seed.approximatedTimestamp, transactionHash: value.transactionHash, __typename: 'DecreasePosition' })

      return seed
    },
  },
  // puppet
  {
    source: puppetLog.openPosition,
    step(seed, value) {
      const args = value.args

      seed.mirrorPositionRequest[args.positionKey] ??= {
        ...args,
        shares: [],
        shareSupply: 0n,
        traderShare: 0n,
        blockTimestamp: seed.approximatedTimestamp,
        transactionHash: value.transactionHash,
        __typename: 'PositionRequest',
      }


      return seed
    },
  },
  {
    source: puppetLog.subscribeRoute,
    step(seed, value) {
      const args = value.args
      const subscKey = getPuppetSubscriptionKey(args.puppet, args.trader, args.routeTypeKey)

      let subsc = seed.subscription.find(subsc => subsc.puppetSubscriptionKey === subscKey)

      if (!subsc) {
        subsc = {
          allowance: 0n,
          puppet: args.puppet,
          trader: args.trader,
          puppetSubscriptionKey: subscKey,
          routeTypeKey: args.routeTypeKey,
          subscribed: args.subscribe,
          endDate: 0n,
          settled: [],
          open: []
        }

        seed.subscription.push(subsc)
      }

      

      subsc.subscribed = args.subscribe

      return seed
    },
  },
)


export interface IPuppetProcess extends IGmxProcessState {

}



function storeCandle(seed: IGmxProcessState, token: viem.Address, interval: IntervalTime, price: bigint) {
  const id = getIntervalIdentifier(token, interval)

  seed.pricefeed[id] ??= {}

  const candleSlot = Math.floor(seed.approximatedTimestamp / interval)
  const time = candleSlot * interval

  const candle = seed.pricefeed[id][String(candleSlot)]
  if (candle) {
    if (price > candle.h) {
      candle.h = price
    }
    if (price < candle.l) {
      candle.l = price
    }
    candle.c = price
  } else {
    seed.pricefeed[id][String(candleSlot)] = createPricefeedCandle(time, price)
  }
}

export function createPositionSlot(blockTimestamp: number, transactionHash: viem.Hex, event: IPositionIncrease, requestKey: viem.Hex): IPositionSlot {
  return {
    requestKey,
    key: event.key,
    account: event.account,
    collateralToken: event.collateralToken,
    indexToken: event.indexToken,
    isLong: event.isLong,
    lastIncreasedTime: 0n,
    averagePrice: 0n,
    collateral: 0n,
    cumulativeCollateral: 0n,
    cumulativeFee: 0n,
    cumulativeSize: 0n,
    entryFundingRate: 0n,
    maxCollateral: 0n,
    reserveAmount: 0n,
    size: 0n,
    maxSize: 0n,
    realisedPnl: 0n,
    __typename: 'PositionSlot',
    link: {
      decreaseList: [],
      increaseList: [],
      updateList: [],
    },

    transactionHash: transactionHash,
    blockTimestamp: blockTimestamp,
  }
}

export function createMirrorPositionSlot(blockTimestamp: number, transactionHash: viem.Hex, event: IPositionIncrease, requestKey: viem.Hex, req: IPositionRequest): IPositionMirrorSlot {
  return {
    ...req,
    ...createPositionSlot(blockTimestamp, transactionHash, event, requestKey),
    __typename: 'PositionMirrorSlot'
  }
}



export const latestTokenPrice = (process: Stream<IGmxProcessState>, tokenEvent: Stream<viem.Address>) => {
  return switchMap(token => map(seed => seed.latestPrice[token], process), tokenEvent)
}


import { map } from "@most/core"
import { Stream } from "@most/types"
import { BASIS_POINTS_DIVISOR, IntervalTime, TIME_INTERVAL_MAP } from "gmx-middleware-const"
import {
  IPositionIncrease, IPositionSlot, IPriceInterval,
  IPriceIntervalIdentity, createPricefeedCandle, div, getIntervalIdentifier, importGlobal, switchMap
} from "gmx-middleware-utils"
import { getPuppetSubscriptionKey } from "puppet-middleware-const"
import { IAccountToRouteMap, IPositionMirrorSettled, IPositionMirrorSlot, IPositionRequest, IPuppetSubscritpion } from "puppet-middleware-utils"
import * as viem from "viem"
import { arbitrum } from "viem/chains"
import { rootStoreScope } from "../../rootStore"
import { IProcessedStore, defineProcess } from "../../utils/indexer/processor"
import { puppetLog } from "../scope"
import * as gmxLog from "../scope/gmx"
import { transformBigints } from "../../utils/storage/storeScope"
import { nullSink } from "@aelea/core"
import { newDefaultScheduler } from "@most/scheduler"


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

export interface IGmxProcessSeed {
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
  subscription: IPuppetSubscritpion[]
}

const processMetrics: IProcessMetrics = {
  cumulativeBlocks: 0n,
  cumulativeDeltaTime: 0n,

  height: 0n,
  timestamp: 0n,
  avgDeltaTime: 0n,
}

const gmxSeedData: IGmxProcessSeed = {
  blockMetrics: processMetrics,
  approximatedTimestamp: 0,
  // positionSlot: {},
  // positionsSettled: {},
  // leaderboard: {},
  pricefeed: {},
  latestPrice: {},

  mirrorPositionRequest: {},
  mirrorPositionSlot: {},
  mirrorPositionSettled: {},
  subscription: [],
}


const seedProcess =  importGlobal(async () => {
  const req = await import('../../data/db/sha256-w9wMeTD1weowD5_n86aDyKg9M_HofhCG4g9mQTzuuy0=.json')
  return req
})

export const gmxProcess = defineProcess(
  {
    startBlock: 114838028n,
    chainId: arbitrum.id,

    seed: seedProcess,
    blueprint: gmxSeedData,

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
      const mirrorPositionReq = seed.mirrorPositionRequest[args.key]

      if (mirrorPositionReq?.route !== args.account) {
        return seed
      }


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
      positionSlot.position.lastIncreasedTime = BigInt(seed.approximatedTimestamp)
      positionSlot.position.requestKey = mirrorPositionReq.routeTypeKey
      positionSlot.position.cumulativeCollateral += args.collateralDelta
      positionSlot.position.cumulativeSize += args.sizeDelta
      positionSlot.position.cumulativeFee += args.fee * 2n
      positionSlot.position.link.increaseList.push({
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

      positionSlot.position.cumulativeFee += args.fee
      positionSlot.position.link.decreaseList.push({ ...value.args, blockTimestamp: seed.approximatedTimestamp, transactionHash: value.transactionHash, __typename: 'DecreasePosition' })

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
  {
    source: gmxLog.updateEvents,
    step(seed, value) {
      const args = value.args
      const positionSlot = seed.mirrorPositionSlot[args.key]

      if (!positionSlot) {
        return seed
        // throw new Error('position not found')
      }

      const markPrice = seed.latestPrice[positionSlot.position.indexToken]

      positionSlot.position.link.updateList.push({ ...value.args, blockTimestamp: seed.approximatedTimestamp, markPrice, transactionHash: value.transactionHash, __typename: 'UpdatePosition' })
      positionSlot.position.collateral = args.collateral
      positionSlot.position.realisedPnl = args.realisedPnl
      positionSlot.position.averagePrice = args.averagePrice
      positionSlot.position.size = args.size
      positionSlot.position.reserveAmount = args.reserveAmount
      positionSlot.position.entryFundingRate = args.entryFundingRate
      positionSlot.position.maxCollateral = args.collateral > positionSlot.position.maxCollateral ? args.collateral : positionSlot.position.maxCollateral
      positionSlot.position.maxSize = args.size > positionSlot.position.maxSize ? args.size : positionSlot.position.maxSize

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
        position: {
          ...positionSlot.position,
          realisedPnl: args.realisedPnl,
          settlePrice: seed.latestPrice[positionSlot.position.indexToken],
          isLiquidated: false,
          settlement: {
            ...args,
            transactionHash: value.transactionHash,
            blockTimestamp: seed.approximatedTimestamp,
            __typename: 'ClosePosition',
          },
          __typename: 'PositionSettled',
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

      // seed.leaderboard[positionSlot.account] ??= {
      //   account: positionSlot.account,
      //   size: 0n,
      //   collateral: 0n,
      //   leverage: 0n,

      //   lossCount: 0,
      //   winCount: 0,

      //   fee: 0n,
      //   pnl: 0n,

      //   avgLeverage: 0n,
      //   avgCollateral: 0n,
      //   avgSize: 0n,
      // }
      // const accountSummary = seed.leaderboard[settledPosition.account]

      // const settledPosition = seed.positionsSettled[settleId]

      // accountSummary.size = settledPosition.maxSize
      // accountSummary.collateral = accountSummary.collateral + settledPosition.maxCollateral
      // accountSummary.leverage = accountSummary.leverage + div(settledPosition.maxSize, settledPosition.maxCollateral)

      // if (settledPosition.realisedPnl > 0n) {
      //   ++accountSummary.winCount
      // } else {
      //   ++accountSummary.lossCount
      // }

      // accountSummary.fee = accountSummary.fee + settledPosition.cumulativeFee
      // accountSummary.pnl = accountSummary.pnl + settledPosition.realisedPnl

      // const tradeCount = BigInt(accountSummary.winCount + accountSummary.lossCount)
      // accountSummary.avgSize = accountSummary.size / tradeCount
      // accountSummary.avgCollateral = accountSummary.collateral / tradeCount
      // accountSummary.avgLeverage = accountSummary.leverage / tradeCount

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
        position: {
          ...positionSlot.position,
          realisedPnl: realisedPnl,
          settlePrice: args.markPrice,
          isLiquidated: false,
          settlement: {
            ...args,
            transactionHash: value.transactionHash,
            blockTimestamp: seed.approximatedTimestamp,
            __typename: 'LiquidatePosition',
          },
          __typename: 'PositionSettled',
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


export interface IPuppetProcess extends IGmxProcessSeed {

}



function storeCandle(seed: IGmxProcessSeed, token: viem.Address, interval: IntervalTime, price: bigint) {
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
    position: createPositionSlot(blockTimestamp, transactionHash, event, requestKey),
    __typename: 'PositionMirrorSlot',
  }
}



export const latestTokenPrice = (process: Stream<IGmxProcessSeed>, tokenEvent: Stream<viem.Address>) => {
  return switchMap(token => map(seed => seed.latestPrice[token], process), tokenEvent)
}


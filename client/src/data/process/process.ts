import { combineObject, replayLatest } from "@aelea/core"
import { map, multicast } from "@most/core"
import { Stream } from "@most/types"
import { BASIS_POINTS_DIVISOR, IntervalTime, TIME_INTERVAL_MAP } from "gmx-middleware-const"
import {
  IAbstractPositionIdentity, IAbstractPositionKey, IPositionSettled, IPositionSlot, IPriceInterval,
  IPriceIntervalIdentity, createPricefeedCandle, div, getIntervalIdentifier, switchMap
} from "gmx-middleware-utils"
import * as viem from "viem"
import { arbitrum } from "viem/chains"
import { rootStoreScope } from "../../rootStore"
import { defineProcess, syncProcess } from "../../utils/indexer/processor"
import { block, publicClient } from "../../wallet/walletLink"
import { puppetLog } from "../scope"
import * as gmxLog from "../scope/gmx"
import { IPositionMirrorSettled, IPositionMirrorSlot, IPositionRequest } from "puppet-middleware-utils"


export interface IProcessMetrics {
  cumulativeBlocks: bigint
  cumulativeDeltaTime: bigint
  timestamp: bigint
  avgDeltaTime: bigint
  height: bigint
}

type MirrorTrades = Record<viem.Address, {
  subscribed: boolean
  settled: IPositionMirrorSettled[]
  open: IPositionMirrorSlot[]
}>

type IPositionCounter = `0x${string}:${number}`

export interface IGmxProcessSeed {
  blockMetrics: IProcessMetrics,
  positionSlot: Record<viem.Hex, IPositionSlot>
  positionsSettled: Record<IPositionCounter, IPositionSettled>
  // leaderboard: Record<viem.Address, ITraderSummary>
  countId: number
  pricefeed: Record<IPriceIntervalIdentity, Record<string, IPriceInterval>>
  latestPrice: Record<viem.Address, bigint>
  approximatedTimestamp: number

  mirrorPositionRequest: Record<viem.Hex, IPositionRequest>
  mirrorPositionSlot: Record<viem.Hex, IPositionMirrorSlot>
  mirrorPositionSettled: Record<viem.Hex, IPositionMirrorSettled>
  subscription: Record<viem.Hex, MirrorTrades>
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
  countId: 0,
  approximatedTimestamp: 0,
  positionSlot: {},
  positionsSettled: {},
  // leaderboard: {},
  pricefeed: {},
  latestPrice: {},

  mirrorPositionRequest: {},
  mirrorPositionSlot: {},
  mirrorPositionSettled: {},
  subscription: {},
}



export const gmxProcess = defineProcess(
  {
    startBlock: 113260800n,
    chainId: arbitrum.id,
    genesisSeed: gmxSeedData,
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

      storeCandle(seed, args.token, TIME_INTERVAL_MAP.MIN5, args.fastPrice)
      storeCandle(seed, args.token, TIME_INTERVAL_MAP.MIN15, args.fastPrice)
      storeCandle(seed, args.token, TIME_INTERVAL_MAP.MIN60, args.fastPrice)
      storeCandle(seed, args.token, TIME_INTERVAL_MAP.HR4, args.fastPrice)
      storeCandle(seed, args.token, TIME_INTERVAL_MAP.HR24, args.fastPrice)

      return seed
    },
  },
  {
    source: gmxLog.increaseEvents,
    step(seed, value) {

      const args = value.args

      const positionSlot = seed.positionSlot[args.key] ??= createPositionSlot(value.transactionHash, seed.approximatedTimestamp, args)

      positionSlot.idCount = seed.countId
      positionSlot.cumulativeCollateral += args.collateralDelta
      positionSlot.cumulativeSize += args.sizeDelta
      positionSlot.cumulativeFee += args.fee

      positionSlot.link.increaseList.push({ ...value.args, blockTimestamp: seed.approximatedTimestamp, transactionHash: value.transactionHash, __typename: 'IncreasePosition' })


      return seed
    },
  },
  {
    source: gmxLog.decreaseEvents,
    step(seed, value) {
      const args = value.args
      const positionSlot = seed.positionSlot[args.key]

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
      const positionSlot = seed.positionSlot[args.key]

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
      const positionSlot = seed.positionSlot[args.key]
      const mpSlot = seed.mirrorPositionSlot[args.key]

      if (!mpSlot || !positionSlot ) {
        return seed
        // throw new Error('position not found')
      }



      const settleId = `${args.key}:${seed.countId}` as const

      seed.positionsSettled[settleId] = {
        ...positionSlot,
        settleBlockTimestamp: seed.approximatedTimestamp,
        realisedPnl: args.realisedPnl,
        settlePrice: args.averagePrice,
        isLiquidated: false,
        __typename: 'PositionSettled',
      }

      seed.mirrorPositionSettled[settleId] = {
        ...mpSlot,
        position: seed.positionsSettled[settleId],
      }


      delete seed.positionSlot[args.key]
      delete seed.mirrorPositionSlot[args.key]
      seed.countId++

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
      const positionSlot = seed.positionSlot[args.key]

      if (!positionSlot) {
        return seed
        // throw new Error('position not found')
      }


      const settleId = `${args.key}:${seed.countId}` as const
      const realisedPnl = -args.collateral

      seed.positionsSettled[settleId] = {
        ...positionSlot,
        settleBlockTimestamp: seed.approximatedTimestamp,
        realisedPnl: realisedPnl,
        settlePrice: args.markPrice,
        isLiquidated: true,
        __typename: 'PositionSettled',
      }

      delete seed.positionSlot[args.key]
 

      seed.countId++

      return seed
    },
  },

  // puppet
  {
    source: puppetLog.openPosition,
    step(seed, value) {
      const args = value.args

      const key = args.positionKey

      seed.mirrorPositionRequest[args.requestKey] ??= {
        ...args,
        blockTimestamp: seed.approximatedTimestamp,
        transactionHash: value.transactionHash,
        __typename: 'PositionRequest',
      }


      return seed
    },
  },
  {
    source: puppetLog.executePosition,
    step(seed, value) {
      const args = value.args

      const request = seed.mirrorPositionRequest[args.requestKey]

      if (request) {
        const slot = seed.positionSlot[request.positionKey]
        seed.mirrorPositionSlot[request.positionKey] = {
          ...request,
          position: slot,
          blockTimestamp: seed.approximatedTimestamp,
          transactionHash: value.transactionHash,
          __typename: 'PositionMirrorSlot',
        }
      }

      delete seed.mirrorPositionRequest[args.requestKey]

      return seed
    },
  },
  {
    source: puppetLog.subscribeRoute,
    step(seed, value) {
      const args = value.args

      seed.subscription[args.routeTypeKey] ??= {}
      seed.subscription[args.routeTypeKey][args.trader] ??= {
        subscribed: true,
        settled: [],
        open: []
      }

      seed.subscription[args.routeTypeKey][args.trader].subscribed = args.subscribe

      return seed
    },
  },
)


export interface IPuppetProcess extends IGmxProcessSeed {

}

const puppetSeedData: IPuppetProcess = {
  ...gmxSeedData,

  mirrorPositionRequest: {},
  mirrorPositionSlot: {},
  // mirrorPositionsSettled: {},
}


// export const puppetProcess = defineProcess(
//   {
//     startBlock: 113108778n,
//     chainId: arbitrum.id,
//     genesisSeed: puppetSeedData,
//     parentScope: rootStoreScope,
//     queryBlockSegmentLimit: 100000n,
//   },

// )

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

export function createPositionSlot( transactionHash: viem.Hex, openTimestamp: number, args: IAbstractPositionIdentity & IAbstractPositionKey): IPositionSlot {
  return {
    // id: args.key,
    idCount: 0,
    key: args.key,
    account: args.account,
    collateralToken: args.collateralToken,
    indexToken: args.indexToken,
    isLong: args.isLong,
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

    transactionHash,
    blockTimestamp: openTimestamp,
  }
}

export const trading = replayLatest(multicast(switchMap(params => {
  return map(seedState => seedState.seed, syncProcess({ ...gmxProcess, publicClient: params.publicClient, endBlock: params.block }))
}, combineObject({ publicClient, block }))))

export const latestTokenPrice = (tokenEvent: Stream<viem.Address>) => switchMap(token => map(seed => seed.latestPrice[token], trading), tokenEvent)
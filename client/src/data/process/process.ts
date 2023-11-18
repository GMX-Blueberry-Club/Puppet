import { map } from "@most/core"
import { Stream } from "@most/types"
import { ADDRESS_ZERO, BASIS_POINTS_DIVISOR, IntervalTime, TIME_INTERVAL_MAP, TOKEN_ADDRESS_DESCRIPTION_MAP } from "gmx-middleware-const"
import {
  IEventLog1Args,
  ILogTxType,
  IOraclePrice,
  IOraclePriceUpdateEvent,
  IPositionDecrease,
  IPositionIncrease,
  IPriceInterval,
  IPriceIntervalIdentity,
  createPricefeedCandle,
  getDenominator,
  getIntervalIdentifier,
  getMappedValue,
  ITradeRoute,
  importGlobal,
  unixTimestampNow,
  IMarketCreatedEvent
} from "gmx-middleware-utils"
import { IMirrorPositionRequest, IPositionMirrorSettled, IPositionMirrorSlot, IPuppetRouteSubscritpion, getPuppetSubscriptionKey, getRouteTypeKey } from "puppet-middleware-utils"
import * as viem from "viem"
import { arbitrum } from "viem/chains"
import { IProcessEnvironmentMode, IProcessedStore, IProcessedStoreConfig, defineProcess, validateConfig } from "../../utils/indexer/processor.js"
import { transformBigints } from "../../utils/storage/storeScope.js"
import * as gmxLog from "../scope/gmx.js"
import * as puppetLog from "../scope/puppet"
import { rootStoreScope } from "../store/store.js"
import * as GMX from "gmx-middleware-const"


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

  pricefeed: Record<IPriceIntervalIdentity, Record<string, IPriceInterval>>
  latestPrice: Record<viem.Address, IOraclePrice>
  approximatedTimestamp: number

  marketMap: Record<viem.Address, IMarketCreatedEvent>
  routeMap: Record<viem.Hex, ITradeRoute>
  
  mirrorPositionRequest: Record<viem.Hex, IMirrorPositionRequest>
  mirrorPositionSlot: Record<viem.Hex, IPositionMirrorSlot>
  mirrorPositionSettled: IPositionMirrorSettled[]
  subscription: IPuppetRouteSubscritpion[]

  // mirrorPositionSlotV2: Record<viem.Hex, IPositionMirrorSlotV2>
  // mirrorPositionSettledV2: IAccountToRouteMap<IPositionMirrorSettled[]>

}


const seedFile: Stream<IProcessedStore<IGmxProcessState>> = importGlobal(async () => {
  const req = await (await fetch('/db/sha256-1RBFkvvr8xwuk6w74UGs1h+IOoP4_sztAWX1S1MBrBo=.json')).json().catch(() => null)

  if (req === null) {
    return null
  }

  const storedSeed: IProcessedStore<IGmxProcessState> = transformBigints(req)
  const seedFileValidationError = validateConfig(storedSeed.config, storedSeed.config)

  if (seedFileValidationError) {
    console.error(new Error(`Seed file validation error: ${seedFileValidationError}`))
    return null
  }

  return storedSeed
})



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
  mirrorPositionSettled: [],
  subscription: [],

  // V2
  // mirrorPositionSlotV2: {},
  // mirrorPositionSettledV2: {},
  routeMap: {},
  marketMap: {},
}

const config: IProcessedStoreConfig = {
  startBlock: 107745255n,
  endBlock: 146000000n,
  chainId: arbitrum.id,
}



export const gmxProcess = defineProcess(
  {
    seedFile,
    mode: SW_DEV ? IProcessEnvironmentMode.DEV : IProcessEnvironmentMode.PROD,
    blueprint: { config, state },
    parentScope: rootStoreScope,
    queryBlockRange: 100000n,
  },
  {
    source: gmxLog.marketCreated,
    step(seed, value) {
      const entity = getEventType<IMarketCreatedEvent>('Market', value, seed.approximatedTimestamp)

      const market: IMarketCreatedEvent = {
        salt: entity.salt,
        indexToken: entity.indexToken,
        longToken: entity.longToken,
        marketToken: entity.marketToken,
        shortToken: entity.shortToken,
        __typename: 'MarketCreated',
        blockTimestamp: seed.approximatedTimestamp,
        transactionHash: value.transactionHash,
      }

      seed.marketMap[entity.marketToken] = market

      if (entity.indexToken === viem.zeroAddress) {
        return seed
      }
      
      const trMarketLongLongTokenKey = getRouteTypeKey(entity.longToken, entity.indexToken, true, entity.salt)
      const trMarketLongShortTokenKey = getRouteTypeKey(entity.shortToken, entity.indexToken, true, entity.salt)

      const trMarketShortLongTokenKey = getRouteTypeKey(entity.longToken, entity.indexToken, false, entity.salt)
      const trMarketShortShortTokenKey = getRouteTypeKey(entity.shortToken, entity.indexToken, false, entity.salt)

      seed.routeMap[trMarketLongLongTokenKey] =   { marketSalt: entity.salt, indexToken: entity.indexToken, collateralToken: entity.longToken, isLong: true, routeTypeKey: trMarketLongLongTokenKey }
      seed.routeMap[trMarketLongShortTokenKey] =  { marketSalt: entity.salt, indexToken: entity.indexToken, collateralToken: entity.shortToken, isLong: true, routeTypeKey: trMarketLongShortTokenKey }

      seed.routeMap[trMarketShortLongTokenKey] =  { marketSalt: entity.salt, indexToken: entity.indexToken, collateralToken: entity.longToken, isLong: false, routeTypeKey: trMarketShortLongTokenKey }
      seed.routeMap[trMarketShortShortTokenKey] = { marketSalt: entity.salt, indexToken: entity.indexToken, collateralToken: entity.shortToken, isLong: false, routeTypeKey: trMarketShortShortTokenKey }

      return seed
    },
  },

  {
    // queryBlockRange: 100000n,
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
        seed.blockMetrics.avgDeltaTime = seed.blockMetrics.cumulativeDeltaTime * BASIS_POINTS_DIVISOR / seed.blockMetrics.cumulativeBlocks
      }

      seed.blockMetrics.height = value.blockNumber
      seed.blockMetrics.timestamp = value.args.blockTime

      return seed
    },
  },

  {
    source: gmxLog.oraclePrice,
    // queryBlockRange: 100000n,
    step(seed, value) {
      const entity = getEventdata<IOraclePriceUpdateEvent>(value)

      seed.latestPrice[entity.token] = {
        isPriceFeed: entity.isPriceFeed,
        max: entity.maxPrice,
        min: entity.minPrice,
        token: entity.token,
      }

      if (seed.blockMetrics.timestamp === 0n) {
        return seed
      }

      seed.approximatedTimestamp = Number(seed.blockMetrics.timestamp + (value.blockNumber - seed.blockMetrics.height) * seed.blockMetrics.avgDeltaTime / BASIS_POINTS_DIVISOR)

      for (const key in PRICEFEED_INTERVAL) {
        storeCandle(seed, entity.token, PRICEFEED_INTERVAL[key], entity.minPrice)
      }

      return seed
    },
  },

  {
    source: gmxLog.positionIncrease,
    // queryBlockRange: 100000n,
    step(seed, value) {
      const update = getEventType<IPositionIncrease>('PositionIncrease', value, seed.approximatedTimestamp)


      const mirrorSlot = seed.mirrorPositionRequest[update.orderKey]
      if (!mirrorSlot) {
        return seed
      }

      const market = seed.marketMap[update.market]

      const slot = seed.mirrorPositionSlot[update.positionKey] ??= {
        averagePrice: 0n,
        cumulativeFee: 0n,
        maxCollateralUsd: 0n,
        maxCollateralToken: 0n,
        maxSizeToken: 0n,
        maxSizeUsd: 0n,
        cumulativeSizeToken: 0n,
        cumulativeSizeUsd: 0n,
        updates: [],
        realisedPnl: 0n,
        key: update.positionKey,
        account: update.account,
        collateralToken: update.collateralToken,
        isLong: update.isLong,
        indexToken: market.indexToken,
        // latestUpdate: update,
        puppets: [],
        // feeUpdates: [],
        orderKey: update.orderKey,
        routeTypeKey: getRouteTypeKey(update.collateralToken, update.market, update.isLong, '0x'),
        route: ADDRESS_ZERO,
        trader: mirrorSlot.trader,
        shares: [],
        shareSupply: 0n,
        traderShare: 0n,
        transactionHash: value.transactionHash,
        blockTimestamp: unixTimestampNow(),
        __typename: "PositionSlot",
      }

      const tokenDescription = getMappedValue(TOKEN_ADDRESS_DESCRIPTION_MAP, market.indexToken)

      // slot.latestUpdate = update
      slot.updates = [...slot.updates, update]
      slot.averagePrice = update.sizeInUsd / update.sizeInTokens * getDenominator(tokenDescription.decimals)
      slot.cumulativeFee += update.fundingFeeAmountPerSize

      slot.cumulativeSizeUsd += update.sizeDeltaUsd
      slot.cumulativeSizeToken += update.sizeDeltaInTokens

      if (update.sizeInTokens > slot.maxSizeToken) {
        slot.maxSizeToken = update.sizeInTokens
      }
      if (update.sizeInUsd > slot.maxSizeUsd) {
        slot.maxSizeUsd = update.sizeInUsd
      }

      if (update.collateralAmount > slot.maxCollateralToken) {
        slot.maxCollateralToken = update.collateralAmount
      }

      // const collateralTokenDescription = getMappedValue(TOKEN_ADDRESS_DESCRIPTION_MAP, adjustment.collateralToken)
      // const collateralUsd = getTokenUsd(adjustment.collateralAmount, adjustment["collateralTokenPrice.min"], collateralTokenDescription.decimals)

      const collateralUsd = update.collateralAmount * update["collateralTokenPrice.min"]

      if (collateralUsd > slot.maxCollateralUsd) {
        slot.maxCollateralUsd = collateralUsd
      }

      return seed
    },
  },
  {
    source: gmxLog.positionDecrease,
    // queryBlockRange: 100000n,
    step(seed, value) {
      const update = getEventType<IPositionDecrease>('PositionDecrease', value, seed.approximatedTimestamp)
      const slot = seed.mirrorPositionSlot[update.positionKey]

      if (!slot) return seed

      // slot.latestUpdate = update
      slot.realisedPnl += update.basePnlUsd
                
      slot.updates = [...slot.updates, update]
      slot.cumulativeFee += update.fundingFeeAmountPerSize

      slot.cumulativeSizeUsd += update.sizeDeltaUsd
      slot.cumulativeSizeToken += update.sizeDeltaInTokens

      if (update.sizeInTokens > slot.maxSizeToken) {
        slot.maxSizeToken = update.sizeInTokens
      }
      if (update.sizeInUsd > slot.maxSizeUsd) {
        slot.maxSizeUsd = update.sizeInUsd
      }

      if (update.collateralAmount > slot.maxCollateralUsd) {
        slot.maxCollateralUsd = update.collateralAmount
      }


      if (update.sizeInTokens === 0n) {
        seed.mirrorPositionSettled.push({
          ...slot,
          openBlockTimestamp: slot.blockTimestamp,
          isLiquidated: false,
          settlement: update,
          blockTimestamp: seed.approximatedTimestamp,
          transactionHash: value.transactionHash,
          __typename: 'PositionSettled',
        } as const)
      }

      delete seed.mirrorPositionSlot[update.positionKey]
      delete seed.mirrorPositionRequest[update.orderKey]


      return seed
    },
  },


  // {
  //   source: gmxLog.positionFeeInfo,
  //   queryBlockRange: 100000n,
  //   step(seed, value) {
  //     const entity = getEventdata<PositionFeesInfo>(value)
  //     const slot = seed.mirrorPositionSlot[entity.positionKey]
  //     if (slot) {
  //       slot.feeUpdates = [...slot.feeUpdates, entity]
  //     }

  //     return seed
  //   },
  // },


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
  // // puppet
  {
    source: puppetLog.openPosition,
    step(seed, value) {
      const args = value.args

      seed.mirrorPositionRequest[args.requestKey] ??= {
        ...args,
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
          expiry: 0n,
          // settled: [],
          // open: []
        }

        seed.subscription.push(subsc)
      }

      subsc.subscribed = args.subscribe

      return seed
    },
  },
)


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




export const latestTokenPrice = (process: Stream<IGmxProcessState>, token: viem.Address) => {
  return map(seed => seed.latestPrice[token], process)
}

export const getEventType = <T extends ILogTxType<any>>(typeName: string, log: IEventLog1Args, blockTimestamp: number): T => {
  const initObj = {
    blockTimestamp,
    transactionHash: log.transactionHash,
    __typename: typeName,
  }

  return getEventdata(log, initObj)
}

export const getEventdata = <T>(log: IEventLog1Args, initObj: any = {}): T => {
  const obj = Object.values(log.args.eventData).map(x => x.items).flat().reduce((acc, value) => {
    acc[value.key] = value.value
    return acc
  }, initObj)

  return obj
}


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
import { IMirrorPositionRequest, IPositionMirrorSettled, IPositionMirrorSlot, IPuppetSubscritpion, getPuppetSubscriptionKey, getRouteTypeKey } from "puppet-middleware-utils"
import * as viem from "viem"
import { arbitrum } from "viem/chains"
import { IProcessEnvironmentMode, IProcessedStore, IProcessedStoreConfig, defineProcess, validateConfig } from "../../utils/indexer/processor.js"
import { transformBigints } from "../../utils/storage/storeScope.js"
import * as gmxLog from "../scope/gmx.js"
import * as puppetLog from "../scope/puppet"
import { rootStoreScope } from "../store/store.js"
import * as GMX from "gmx-middleware-const"


export interface IProcessMetrics {
  timestamp: bigint
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

  marketMap: Record<viem.Address, IMarketCreatedEvent>
  routeMap: Record<viem.Hex, ITradeRoute>
  
  mirrorPositionRequest: Record<viem.Hex, IMirrorPositionRequest>
  mirrorPositionSlot: Record<viem.Hex, IPositionMirrorSlot>
  mirrorPositionSettled: IPositionMirrorSettled[]
  subscription: IPuppetSubscritpion[]

  // mirrorPositionSlotV2: Record<viem.Hex, IPositionMirrorSlotV2>
  // mirrorPositionSettledV2: IAccountToRouteMap<IPositionMirrorSettled[]>

}

const seedFile: Stream<IProcessedStore<IGmxProcessState>> = importGlobal(async () => {
  const req = await (await fetch('/db/sha256-UEb947xBE+yJ1jQ2YyQMcaPdL4_JLMCBmE+gBf6fO_I=.json')).json().catch(() => null)

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
    // cumulativeBlocks: 0n,
    // cumulativeDeltaTime: 0n,

    // height: 0n,
    timestamp: 0n,
    // avgDeltaTime: 0n,
  },
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
  endBlock: 146100000n,
  chainId: arbitrum.id,
}



export const gmxProcess = defineProcess(
  {
    seedFile,
    mode: import.meta.env.DEV ? IProcessEnvironmentMode.DEV : IProcessEnvironmentMode.PROD,
    blueprint: { config, state },
    parentScope: rootStoreScope,
    queryBlockRange: 100000n,
  },
  {
    source: gmxLog.marketCreated,
    step(seed, value) {
      const entity = getEventType<IMarketCreatedEvent>('Market', value, seed.blockMetrics.timestamp)

      const market: IMarketCreatedEvent = {
        salt: entity.salt,
        indexToken: entity.indexToken,
        longToken: entity.longToken,
        marketToken: entity.marketToken,
        shortToken: entity.shortToken,
        __typename: 'MarketCreated',
        blockTimestamp: entity.blockTimestamp,
        transactionHash: value.transactionHash,
      }

      seed.marketMap[entity.marketToken] = market

      if (entity.indexToken === viem.zeroAddress) {
        return seed
      }
      
      const trMarketLongLongTokenKey = getRouteTypeKey(entity.shortToken, entity.indexToken, true, entity.salt)
      const trMarketShortLongTokenKey = getRouteTypeKey(entity.shortToken, entity.indexToken, false, entity.salt)

      seed.routeMap[trMarketLongLongTokenKey] =   { marketSalt: entity.salt, indexToken: entity.indexToken, collateralToken: entity.longToken, isLong: true, routeTypeKey: trMarketLongLongTokenKey }
      seed.routeMap[trMarketShortLongTokenKey] =  { marketSalt: entity.salt, indexToken: entity.indexToken, collateralToken: entity.longToken, isLong: false, routeTypeKey: trMarketShortLongTokenKey }

      return seed
    },
  },
  {
    source: gmxLog.oraclePrice,
    // queryBlockRange: 100000n,
    step(seed, value) {
      
      const entity = getEventdata<IOraclePriceUpdateEvent>(value)

      seed.blockMetrics.timestamp = entity.timestamp

      const oraclePrice: IOraclePrice = {
        timestamp: Number(entity.timestamp),
        priceSourceType: entity.priceSourceType,
        max: entity.maxPrice,
        min: entity.minPrice,
        token: entity.token,
      }

      seed.latestPrice[entity.token] = oraclePrice
      

      if (seed.blockMetrics.timestamp === 0n) {
        return seed
      }


      for (const key in PRICEFEED_INTERVAL) {
        storeCandle(seed, oraclePrice, PRICEFEED_INTERVAL[key])
      }

      return seed
    },
  },

  {
    source: gmxLog.positionIncrease,
    // queryBlockRange: 100000n,
    step(seed, value) {
      const update = getEventType<IPositionIncrease>('PositionIncrease', value, seed.blockMetrics.timestamp)


      const mirrorSlotRequest = seed.mirrorPositionRequest[update.positionKey]
      if (!mirrorSlotRequest) {
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
        puppets: mirrorSlotRequest.puppets,
        // feeUpdates: [],
        orderKey: update.orderKey,
        routeTypeKey: mirrorSlotRequest.routeTypeKey,
        route: ADDRESS_ZERO,
        trader: mirrorSlotRequest.trader,
        shares: [],
        shareSupply: 0n,
        traderShare: 0n,
        transactionHash: value.transactionHash,
        blockTimestamp: update.blockTimestamp,
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
      // TODO: remove
      if (!seed.routeMap['0xa437f95c9cee26945f76bc090c3491ffa4e8feb32fd9f4fefbe32c06a7184ff3']) { 
        seed.routeMap['0xa437f95c9cee26945f76bc090c3491ffa4e8feb32fd9f4fefbe32c06a7184ff3'] =  {
          marketSalt: '0x00000000000000000000000082af49447d8a07e3bd95bd0d56f35241523fbab1000000000000000000000000af88d065e77c8cc2239327c5edb3a432268e5831000000000000000000000000af88d065e77c8cc2239327c5edb3a432268e583100000000000000000000000082af49447d8a07e3bd95bd0d56f35241523fbab100000000000000000000000000000000000000000000000000000000000000004bd5869a01440a9ac6d7bf7aa7004f402b52b845f20e2cec925101e13d84d075',
          indexToken: GMX.ARBITRUM_ADDRESS.NATIVE_TOKEN,
          collateralToken: GMX.ARBITRUM_ADDRESS.USDC,
          isLong: false,
          routeTypeKey: '0xa437f95c9cee26945f76bc090c3491ffa4e8feb32fd9f4fefbe32c06a7184ff3'
        }
      }

      const update = getEventType<IPositionDecrease>('PositionDecrease', value, seed.blockMetrics.timestamp)
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
          blockTimestamp: Number(seed.blockMetrics.timestamp),
          transactionHash: value.transactionHash,
          __typename: 'PositionSettled',
        } as const)

        delete seed.mirrorPositionSlot[update.positionKey]
        delete seed.mirrorPositionRequest[update.positionKey]
      }


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

      seed.mirrorPositionRequest[args.positionKey] ??= {
        ...args,
      }


      return seed
    },
  },
  {
    source: puppetLog.subscribeRoute,
    step(seed, value) {
      const args = value.args
      const puppetSubscriptionKey = getPuppetSubscriptionKey(args.puppet, args.trader, args.routeTypeKey)
      const subsc = seed.subscription.find(s => s.puppetSubscriptionKey === puppetSubscriptionKey)


      if (subsc) {
        Object.assign(subsc, args)
      } else {
        seed.subscription.push({
          allowance: args.allowance,
          puppet: args.puppet,
          trader: args.trader,
          puppetSubscriptionKey,
          routeTypeKey: args.routeTypeKey,
          subscribe: args.subscribe,
          subscriptionExpiry: args.subscriptionExpiry,
        })
      }


      return seed
    },
  },
)


function storeCandle(seed: IGmxProcessState, oraclePrice: IOraclePrice, interval: IntervalTime) {
  const id = getIntervalIdentifier(oraclePrice.token, interval)

  seed.pricefeed[id] ??= {}

  const candleSlot = Math.floor(oraclePrice.timestamp / interval)
  const time = candleSlot * interval
  const price = oraclePrice.min

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

export const getEventType = <T extends ILogTxType<any>>(typeName: string, log: IEventLog1Args, blockTimestamp: bigint): T => {
  const initObj = {
    blockTimestamp: Number(blockTimestamp),
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


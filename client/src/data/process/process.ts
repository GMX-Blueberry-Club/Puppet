import { map } from "@most/core"
import { Stream } from "@most/types"
import { ADDRESS_ZERO, BASIS_POINTS_DIVISOR, BYTES32_ZERO, IntervalTime, MarketEvent, OracleEvent, PositionEvent, TIME_INTERVAL_MAP, TOKEN_ADDRESS_DESCRIPTION_MAP } from "gmx-middleware-const"
import {
  IEventLog1Args,
  ILogTxType,
  IPositionSlot, IPriceInterval,
  IPriceIntervalIdentity, Market, MarketPoolValueInfo, OraclePrice, PositionDecrease,
  PositionIncrease, createPricefeedCandle,
  div,
  getIntervalIdentifier,
  getMappedValue,
  getTokenUsd,
  importGlobal, switchMap, unixTimestampNow
} from "gmx-middleware-utils"
import { getRouteTypeKey } from "puppet-middleware-const"
import { IPositionMirrorSettled, IPositionMirrorSlot, IPuppetRouteSubscritpion } from "puppet-middleware-utils"
import * as viem from "viem"
import { arbitrum } from "viem/chains"
import { IProcessEnvironmentMode, IProcessedStore, IProcessedStoreConfig, defineProcess, validateSeed } from "../../utils/indexer/processor"
import { transformBigints } from "../../utils/storage/storeScope"
import * as gmxLog from "../scope/gmx"
import { rootStoreScope } from "../store/store"


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
  latestPrice: Record<viem.Address, OraclePrice>
  marketPoolInfo: Record<viem.Address, MarketPoolValueInfo>
  approximatedTimestamp: number

  // mirrorPositionRequest: Record<viem.Hex, IPositionRequest>
  mirrorPositionSlot: Record<viem.Hex, IPositionMirrorSlot>
  mirrorPositionSettled: IPositionMirrorSettled[]
  subscription: IPuppetRouteSubscritpion[]

  // mirrorPositionSlotV2: Record<viem.Hex, IPositionMirrorSlotV2>
  // mirrorPositionSettledV2: IAccountToRouteMap<IPositionMirrorSettled[]>
  markets: Record<viem.Address, Market>
}



const state: IGmxProcessState = {
  marketPoolInfo: {},
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

  // mirrorPositionRequest: {},
  mirrorPositionSlot: {},
  mirrorPositionSettled: [],
  subscription: [],

  // V2
  // mirrorPositionSlotV2: {},
  // mirrorPositionSettledV2: {},
  markets: {},
}

const config: IProcessedStoreConfig = {
  startBlock: 107745255n,
  endBlock: 125227192n,
  chainId: arbitrum.id,
}


export const seedFile: Stream<IProcessedStore<IGmxProcessState>> = importGlobal(async () => {
  const req = await (await fetch('/db/sha256-S_e2UoUnYhp4tlj89MW5jodeFZlKEFgIO3Y4PRE7bnU=.json')).json()
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
  },
  {
    source: gmxLog.requestIncreasePosition,
    queryBlockRange: 100000n,
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
    source: gmxLog.marketCreated,
    step(seed, value) {
      const entity = getEventType<Market>('Market', value, seed.approximatedTimestamp)
      seed.markets[entity.marketToken] = entity
      return seed
    },
  },
  {
    source: gmxLog.oraclePrice,
    queryBlockRange: 100000n,
    step(seed, value) {
      const entity = getEventdata<OraclePrice>(value)


      seed.latestPrice[entity.token] = entity

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
    queryBlockRange: 100000n,
    step(seed, value) {
      const adjustment = getEventType<PositionIncrease>('PositionIncrease', value, seed.approximatedTimestamp)

      const market = seed.markets[adjustment.market]

      const slot = seed.mirrorPositionSlot[adjustment.positionKey] ??= {
        ...createPositionSlot(unixTimestampNow(), value.transactionHash, market.indexToken, adjustment, adjustment.orderKey),
        puppets: [],
        requestKey: BYTES32_ZERO,
        routeTypeKey: getRouteTypeKey(adjustment.collateralToken, adjustment.market, adjustment.isLong),
        route: ADDRESS_ZERO,
        trader: adjustment.account,
        shares: [],
        shareSupply: 0n,
        traderShare: 0n,
        positionKey: adjustment.positionKey,
      }

      slot.updates.push(adjustment)
      slot.cumulativeFee += adjustment.fundingFeeAmountPerSize

      slot.cumulativeSizeUsd += adjustment.sizeDeltaUsd
      slot.cumulativeSizeToken += adjustment.sizeDeltaInTokens

      if (adjustment.sizeInTokens > slot.maxSizeToken) {
        slot.maxSizeToken = adjustment.sizeInTokens
      }
      if (adjustment.sizeInUsd > slot.maxSizeUsd) {
        slot.maxSizeUsd = adjustment.sizeInUsd
      }

      if (adjustment.collateralAmount > slot.maxCollateralToken) {
        slot.maxCollateralToken = adjustment.collateralAmount
      }

      // const collateralTokenDescription = getMappedValue(TOKEN_ADDRESS_DESCRIPTION_MAP, adjustment.collateralToken)
      // const collateralUsd = getTokenUsd(adjustment.collateralAmount, adjustment["collateralTokenPrice.min"], collateralTokenDescription.decimals)

      const collateralUsd = adjustment.collateralAmount * adjustment["collateralTokenPrice.min"]
      

      if (collateralUsd > slot.maxCollateralUsd) {
        slot.maxCollateralUsd = collateralUsd
      }

      return seed
    },
  },
  {
    source: gmxLog.positionDecrease,
    queryBlockRange: 100000n,
    step(seed, value) {
      const adjustment = getEventType<PositionDecrease>('PositionDecrease', value, seed.approximatedTimestamp)
      const slot = seed.mirrorPositionSlot[adjustment.positionKey]

      if (!slot) return seed

      // const decimals = getMappedValue(TOKEN_ADDRESS_DESCRIPTION_MAP, adjustment.collateralToken).decimals
      // const newLocal = getTokenUsd(adjustment.collateralAmount, adjustment["collateralTokenPrice.min"], decimals)
      // debugger
      // slot.collateral += newLocal
      slot.realisedPnl += adjustment.basePnlUsd
                
      slot.updates.push(adjustment)
      slot.cumulativeFee += adjustment.fundingFeeAmountPerSize

      slot.cumulativeSizeUsd += adjustment.sizeDeltaUsd
      slot.cumulativeSizeToken += adjustment.sizeDeltaInTokens

      if (adjustment.sizeInTokens > slot.maxSizeToken) {
        slot.maxSizeToken = adjustment.sizeInTokens
      }
      if (adjustment.sizeInUsd > slot.maxSizeUsd) {
        slot.maxSizeUsd = adjustment.sizeInUsd
      }

      if (adjustment.collateralAmount > slot.maxCollateralUsd) {
        slot.maxCollateralUsd = adjustment.collateralAmount
      }


      if (adjustment.collateralAmount === 0n) {
        seed.mirrorPositionSettled.push({
          ...slot,
          openBlockTimestamp: slot.blockTimestamp,
          isLiquidated: false,
          settlement: adjustment,
          blockTimestamp: seed.approximatedTimestamp,
          transactionHash: value.transactionHash,
          __typename: 'PositionSettled',
        } as const)
      }

      delete seed.mirrorPositionSlot[adjustment.positionKey]


      return seed
    },
  },
  // {
  //   source: gmxLog.V2eventLog1,
  //   step(seed, value) {
  //     const args = value.args
  //     const eventName = args.eventName

  //     if (eventName === MarketEvent.MarketPoolValueInfo)  {
  //       const entity = getEventType<MarketPoolValueInfo>('MarketPoolValueInfo', value, seed.approximatedTimestamp)
  //       seed.marketPoolInfo[entity.market] = entity
  //     }

  //     // if (eventName === MarketEvent.ClaimableCollateralUpdated)  {
  //     //   const entity = getEventdata<OraclePrice>(value)
  //     //   console.log(entity)
  //     // }
  //     // if (eventName === MarketEvent.ClaimableCollateralUpdated)  {
  //     //   const entity = getEventdata<OraclePrice>('OraclePrice', value, seed.approximatedTimestamp)
  //     //   console.log(entity)
  //     // }
  //     // if (eventName === MarketEvent.ClaimableFundingUpdated)  {
  //     //   const entity = getEventdata<OraclePrice>(value, seed.approximatedTimestamp)
  //     //   console.log(entity)
  //     // }

  //     if (eventName === OracleEvent.OraclePriceUpdate)  {

  //     }


  //     if (eventName === PositionEvent.PositionIncrease)  {

  //     }

  //     if (eventName === PositionEvent.PositionDecrease)  {

          

  //       }


  //       // settledPosition.puppets.forEach(puppet => {
  //       //   const subscKey = getPuppetSubscriptionKey(puppet, settledPosition.trader, settledPosition.routeTypeKey)
  //       //   const subsc = seed.subscription.find(s => s.puppetSubscriptionKey === subscKey)!

  //       //   subsc.settled.push(settledPosition)

  //       //   const removeIdx = subsc.open.findIndex(pos => pos.positionKey === positionSlot.positionKey)
  //       //   subsc.open.splice(removeIdx, 1)
  //       // })

  //       delete seed.mirrorPositionSlot[adjustment.orderKey]
  //       // delete seed.mirrorPositionRequest[args.key]

  //       return seed
  //     }

  //     // if (eventName === PositionEvent.PositionFeesCollected)  {
  //     //   const entity = getEventdata<PositionFeesInfo>(value)
  //     //   const slot = seed.mirrorPositionSlot[entity.positionKey]

  //     //   if (!slot) return seed

  //     //   slot.feeList.push(entity)
  //     // }


  //     return seed
  //   }
  // },
  
  // {
  //   source: gmxLog.liquidateEvents,
  //   step(seed, value) {
  //     const args = value.args
  //     const positionSlot = seed.mirrorPositionSlot[args.key]

  //     if (!positionSlot) {
  //       return seed
  //       // throw new Error('position not found')
  //     }


  //     const realisedPnl = -args.collateral

  //     seed.mirrorPositionSettled[positionSlot.trader] ??= {}
  //     seed.mirrorPositionSettled[positionSlot.trader][positionSlot.routeTypeKey] ??= []
  //     const newSettledPosition: IPositionMirrorSettled = {
  //       ...positionSlot,
  //       realisedPnl: realisedPnl,
  //       settlePrice: args.markPrice,
  //       isLiquidated: false,
  //       openBlockTimestamp: positionSlot.blockTimestamp,
  //       settlement: {
  //         ...args,
  //         transactionHash: value.transactionHash,
  //         blockTimestamp: seed.approximatedTimestamp,
  //         __typename: 'LiquidatePosition',
  //       },
  //       __typename: 'PositionMirrorSettled',
  //     } as const
  //     seed.mirrorPositionSettled[positionSlot.trader][positionSlot.routeTypeKey].push(newSettledPosition)

  //     positionSlot.puppets.forEach(puppet => {
  //       const subscKey = getPuppetSubscriptionKey(puppet, positionSlot.trader, positionSlot.routeTypeKey)
  //       const subsc = seed.subscription.find(s => s.puppetSubscriptionKey === subscKey)!

  //       subsc.settled.push(newSettledPosition)

  //       const removeIdx = subsc.open.findIndex(pos => pos.positionKey === positionSlot.positionKey)
  //       subsc.open.splice(removeIdx, 1)
  //     })

  //     delete seed.mirrorPositionSlot[args.key]
  //     delete seed.mirrorPositionRequest[args.key]

  //     return seed
  //   },
  // },
  // {
  //   source: puppetLog.shareIncrease,
  //   step(seed, value) {
  //     const args = value.args
  //     const positionSlot = seed.mirrorPositionSlot[args.positionKey]

  //     if (!positionSlot) {
  //       return seed
  //       // throw new Error('position not found')
  //     }

  //     positionSlot.shares = args.puppetsShares
  //     positionSlot.traderShare = args.traderShares
  //     positionSlot.shareSupply = args.totalSupply

  //     // positionSlot.position.cumulativeFee += args.fee
  //     // positionSlot.position.link.decreaseList.push({ ...value.args, blockTimestamp: seed.approximatedTimestamp, transactionHash: value.transactionHash, __typename: 'DecreasePosition' })

  //     return seed
  //   },
  // },
  // // puppet
  // {
  //   source: puppetLog.openPosition,
  //   step(seed, value) {
  //     const args = value.args


  //     // TODO better hook this up with the position slot
  //     seed.mirrorPositionSlot[args.positionKey] ??= {
  //       ...seed.mirrorPositionSlot[args.positionKey],
  //       requestKey: args.positionKey,
  //       puppets: args.puppets,
  //       shares: [],
  //       traderShare: 0n,
  //       trader: args.trader,
  //       shareSupply: 0n,
  //       routeTypeKey: args.routeTypeKey,
  //       positionKey: args.positionKey,
  //       route: args.route,
  //     }


  //     return seed
  //   },
  // },
  // {
  //   source: puppetLog.subscribeRoute,
  //   step(seed, value) {
  //     const args = value.args
  //     const subscKey = getPuppetSubscriptionKey(args.puppet, args.trader, args.routeTypeKey)

  //     let subsc = seed.subscription.find(subsc => subsc.puppetSubscriptionKey === subscKey)

  //     if (!subsc) {
  //       subsc = {
  //         allowance: 0n,
  //         puppet: args.puppet,
  //         trader: args.trader,
  //         puppetSubscriptionKey: subscKey,
  //         routeTypeKey: args.routeTypeKey,
  //         subscribed: args.subscribe,
  //         expiry: 0n,
  //         settled: [],
  //         open: []
  //       }

  //       seed.subscription.push(subsc)
  //     }

      

  //     subsc.subscribed = args.subscribe

  //     return seed
  //   },
  // },
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

export function createPositionSlot(blockTimestamp: number, transactionHash: viem.Hex, indexToken: viem.Address, event: PositionIncrease, requestKey: viem.Hex): IPositionSlot {
  return {
    market: event.market,
    requestKey,
    key: event.positionKey,
    account: event.account,
    collateralToken: event.collateralToken,
    indexToken,
    isLong: event.isLong,
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

    __typename: "PositionSlot",
    transactionHash: transactionHash,
    blockTimestamp: blockTimestamp,
  }
}





export const latestTokenPrice = (process: Stream<IGmxProcessState>, tokenEvent: Stream<viem.Address>) => {
  return switchMap(token => map(seed => seed.latestPrice[token], process), tokenEvent)
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


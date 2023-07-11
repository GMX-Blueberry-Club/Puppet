import * as GMX from "gmx-middleware-const"
import * as viem from "viem"
import { rootStoreScope } from "../rootStore"
import { IAccountSummary, IPositionSettled, IPositionSlot } from "gmx-middleware-utils"
import { processSources } from "../utils/indexer/processor"
import * as store from "../utils/indexer/rpc"

const subgraph = `https://gateway-arbitrum.network.thegraph.com/api/${import.meta.env.THE_GRAPH}/subgraphs/id/DJ4SBqiG8A8ytcsNJSuUU2gDTLFXxxPrAN8Aags84JH2`

const replayConfig = {
  ...GMX.CONTRACT[42161].Vault,
  subgraph,
  startBlock: 108193808n,
  parentScope: rootStoreScope,
} as const

export const increaseEvents = store.createRpcLogEventScope({
  eventName: 'IncreasePosition',
  ...replayConfig
})

export const decreaseEvents = store.createRpcLogEventScope({
  ...replayConfig,
  eventName: 'DecreasePosition',
})

export const closeEvents = store.createRpcLogEventScope({
  ...replayConfig,
  eventName: 'ClosePosition',
})

export const liquidateEvents = store.createRpcLogEventScope({
  ...replayConfig,
  eventName: 'LiquidatePosition',
})


export const updateEvents = store.createRpcLogEventScope({
  ...replayConfig,
  eventName: 'UpdatePosition',
})


export interface IStoredPositionMap {
  positionSlots: Record<viem.Hex, IPositionSlot>
  positionsSettled: Record<`0x${string}:${number}`, IPositionSettled>
  leaderboard: Record<viem.Address, IAccountSummary>
  countId: number
}


export const positionList = processSources(
  rootStoreScope,
  {
    countId: 0,
    positionSlots: {},
    positionsSettled: {},
    leaderboard: {}
  } as IStoredPositionMap,
  108193808n,
  {
    source: increaseEvents,
    step(seed, value) {

      const args = value.args

      const positionSlot = seed.positionSlots[args.key] ??= {
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
          __typename: 'PositionLink',
          // id: args.key,
          decreaseList: [],
          increaseList: [],
          updateList: [],
        }
      }

      positionSlot.idCount = seed.countId
      positionSlot.cumulativeCollateral += args.collateralDelta
      positionSlot.cumulativeSize += args.sizeDelta
      positionSlot.cumulativeFee += args.fee

      positionSlot.link.increaseList.push({ ...value.args, __typename: 'IncreasePosition' })


      return seed
    },
  },
  {
    source: decreaseEvents,
    step(seed, value) {
      const args = value.args
      const positionSlot = seed.positionSlots[args.key]

      if (!positionSlot) {
        return seed
        // throw new Error('position not found')
      }

      positionSlot.cumulativeFee += args.fee
      positionSlot.link.decreaseList.push({ ...value.args, __typename: 'DecreasePosition' })

      return seed
    },
  },
  {
    source: updateEvents,
    step(seed, value) {
      const args = value.args
      const positionSlot = seed.positionSlots[args.key]

      if (!positionSlot) {
        return seed
        // throw new Error('position not found')
      }

      positionSlot.link.updateList.push({ ...value.args, __typename: 'UpdatePosition' })

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
    source: closeEvents,
    step(seed, value) {
      const args = value.args
      const positionSlot = seed.positionSlots[args.key]

      if (!positionSlot) {
        return seed
        // throw new Error('position not found')
      }

      const settleId = `${args.key}:${seed.countId}` as const

      seed.positionsSettled[settleId] = {
        ...positionSlot,
        realisedPnl: args.realisedPnl,
        settlePrice: args.averagePrice,
        isLiquidated: false,
        __typename: 'PositionSettled',
      }

      delete seed.positionSlots[args.key]
 

      seed.countId++

      return seed
    },
  },
  {
    source: liquidateEvents,
    step(seed, value) {
      const args = value.args
      const positionSlot = seed.positionSlots[args.key]

      if (!positionSlot) {
        return seed
        // throw new Error('position not found')
      }


      const settleId = `${args.key}:${seed.countId}` as const

      seed.positionsSettled[settleId] = {
        ...positionSlot,
        realisedPnl: args.realisedPnl,
        settlePrice: args.markPrice,
        isLiquidated: true,
        __typename: 'PositionSettled',
      }

      delete seed.positionSlots[args.key]
 

      seed.countId++

      return seed
    },
  },
)


// function getStoredPositionCounterId(seed: IStoredPositionMap, key: viem.Hex): viem.Hex {
//   return `${key}-${seed.countId}`
// }

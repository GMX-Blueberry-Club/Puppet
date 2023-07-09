import * as GMX from "gmx-middleware-const"
import * as viem from "viem"
import { rootStoreScope } from "../rootStore"
import { IPositionSettled, IPositionSlot } from "gmx-middleware-utils"
import { processSources } from "../utils/indexer/processor"
import * as store from "../utils/indexer/rpc"

const subgraph = `https://gateway-arbitrum.network.thegraph.com/api/${import.meta.env.THE_GRAPH}/subgraphs/id/DJ4SBqiG8A8ytcsNJSuUU2gDTLFXxxPrAN8Aags84JH2`

const replayConfig = {
  ...GMX.CONTRACT[42161].Vault,
  subgraph,
  startBlock: 108793808n,
  parentStoreScope: rootStoreScope,
}

export const increaseEvents = store.replayRpcLog({
  eventName: 'IncreasePosition',
  ...replayConfig
})

export const decreaseEvents = store.replayRpcLog({
  ...replayConfig,
  eventName: 'DecreasePosition',
})

export const closeEvents = store.replayRpcLog({
  ...replayConfig,
  eventName: 'ClosePosition',
})

export const liquidateEvents = store.replayRpcLog({
  ...replayConfig,
  eventName: 'LiquidatePosition',
})

export const updateEvents = store.replayRpcLog({
  ...replayConfig,
  eventName: 'UpdatePosition',
})


export interface IStoredPositionMap {
  positions: Record<viem.Hex, IPositionSlot>
  positionsSettled: Record<viem.Hex, IPositionSettled>
  countId: number
}


export const rpcTradeList = processSources(
  rootStoreScope,
  {
    countId: 0,
    positions: {},
    positionsSettled: {},
  } as IStoredPositionMap,
  {
    source: increaseEvents,
    step(seed, value) {
      const key = getStoredPositionCounterId(seed, value.key)
      

      seed.positions[key] ??= {
        
        key: value.key,
        account: value.account,
        collateralToken: value.collateralToken,
        indexToken: value.indexToken,
        isLong: value.isLong,
        // updateList: [],
        // decreaseList: [],
        // increaseList: [],
        maxCollateral: value.collateralDelta,
        maxSize: value.sizeDelta,
      }

      seed.positions[key].increaseList.push(value)

      return seed
    },
  },
  {
    source: decreaseEvents,
    step(seed, value) {
      const key = getStoredPositionCounterId(seed, value.key)
      if (!seed.positions[key]) {
        throw new Error('position not found')
      }

      seed.positions[key].decreaseList.push(value)

      return seed
    },
  },
  {
    source: updateEvents,
    step(seed, value) {
      const key = getStoredPositionCounterId(seed, value.key)

      if (!seed.positions[key]) {
        throw new Error('position not found')
      }

      const trade = seed.positions[key]

      trade.updateList.push(value as any)
      trade.maxCollateral = value.collateral > trade.maxCollateral ? value.collateral : trade.maxCollateral
      trade.maxSize = value.size > trade.maxSize ? value.size : trade.maxSize

      return seed
    },
  },
  {
    source: closeEvents,
    step(seed, value) {
      const key = getStoredPositionCounterId(seed, value.key)

      if (!seed.positions[key]) {
        throw new Error('position not found')
      }

      const trade = seed.positions[key]

      delete seed.positions[key]


      seed.positionsSettled[key] = {
        ...trade,
        isLiquidated: false,
        settlement: value
      }

      seed.countId++

      return seed
    },
  },
  {
    source: liquidateEvents,
    step(seed, value) {
      const key = getStoredPositionCounterId(seed, value.key)

      if (!seed.positions[key]) {
        throw new Error('position not found')
      }

      const trade = seed.positions[key]

      delete seed.positions[key]

      seed.positionsSettled[key] = {
        ...trade,
        isLiquidated: false,
        settlement: value
      }

      seed.countId++

      return seed
    },
  },
)


function getStoredPositionCounterId(seed: IStoredPositionMap, key: viem.Hex): viem.Hex {
  return `${key}-${seed.countId}`
}

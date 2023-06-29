import * as GMX from "gmx-middleware-const"
import { ITrade, ITradeSettled } from "gmx-middleware-utils"
import * as viem from "viem"
import { rootStoreScope } from "../data"
import { processSources, replaySubgraphEvent } from "../logic/indexer"



export const increaseEvents = replaySubgraphEvent({
  ...GMX.CONTRACT[42161].Vault,
  eventName: 'IncreasePosition',
  parentStoreScope: rootStoreScope,
})

export const decreaseEvents = replaySubgraphEvent({
  ...GMX.CONTRACT[42161].Vault,
  eventName: 'DecreasePosition',
  parentStoreScope: rootStoreScope
})

export const closeEvents = replaySubgraphEvent({
  ...GMX.CONTRACT[42161].Vault,
  eventName: 'ClosePosition',
  parentStoreScope: rootStoreScope,
})
export const liquidateEvents = replaySubgraphEvent({
  ...GMX.CONTRACT[42161].Vault,
  eventName: 'LiquidatePosition',
  parentStoreScope: rootStoreScope,
})

export const updateEvents = replaySubgraphEvent({
  ...GMX.CONTRACT[42161].Vault,
  eventName: 'UpdatePosition',
  parentStoreScope: rootStoreScope,
})


export interface IStoredPositionMap {
  positions: Record<viem.Hex, ITrade>
  positionsSettled: Record<viem.Hex, ITradeSettled>
  countId: number
}


export const getTraderData = (trader: viem.Address) => {

  const data = processSources(
    rootStoreScope,
    {
      countId: 0,
      positions: {},
      positionsSettled: {},
    } as IStoredPositionMap,
    {
      source: increaseEvents({ account: trader }),
      step(seed, value) {
        const key = getStoredPositionCounterId(seed, value.key)

        seed.positions[key] ??= {
          key: value.key,
          account: value.account,
          collateralToken: value.collateralToken,
          indexToken: value.indexToken,
          isLong: value.isLong,
          updateList: [],
          decreaseList: [],
          increaseList: [],
          maxCollateral: value.collateralDelta,
          maxSize: value.sizeDelta,
        }

        seed.positions[key].increaseList.push(value)

        return seed
      },
    },
    {
      source: decreaseEvents({ account: trader }),
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
      source: updateEvents({ account: trader }),
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
      source: closeEvents({ account: trader }),
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
      source: liquidateEvents({ account: trader }),
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

  return data
}



function getStoredPositionCounterId(seed: IStoredPositionMap, key: viem.Hex): viem.Hex {
  return `${key}-${seed.countId}`
}

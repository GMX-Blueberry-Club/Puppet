import { IAccountSummary, IPositionSettled, IPositionSlot, IPricefeed } from "gmx-middleware-utils"
import * as viem from "viem"
import { rootStoreScope } from "../../rootStore"
import { processSources } from "../../utils/indexer/processor"
import { vaultPriceEvents } from "../scope/tradeList"





export interface IStoredPositionMap {
  positionSlots: Record<viem.Hex, IPositionSlot>
  positionsSettled: Record<`0x${string}:${number}`, IPositionSettled>
  leaderboard: Record<viem.Address, IAccountSummary>
  countId: number
  pricefeed: Record<viem.Address, IPricefeed>
  latestPrice: Record<viem.Address, bigint>
}


const seedData: IStoredPositionMap = {
  countId: 0,
  positionSlots: {},
  positionsSettled: {},
  leaderboard: {},
  pricefeed: {},
  latestPrice: {},
}


export const positionList = processSources({
  initialSeed: seedData,
  parentStoreScope: rootStoreScope,
  startBlock: 110710000n
},
{
  source: vaultPriceEvents,
  step(seed, value) {
    const args = value.args
    seed.latestPrice[args.token] = args.refPrice

    return seed
  },
}
  // rootStoreScope,
  // seedData,
  // scopeConfig.startBlock,
  // ,
  // {
  //   source: increaseEvents,
  //   step(seed, value) {

  //     const args = value.args

  //     const positionSlot = seed.positionSlots[args.key] ??= {
  //       // id: args.key,
  //       idCount: 0,
  //       key: args.key,
  //       account: args.account,
  //       collateralToken: args.collateralToken,
  //       indexToken: args.indexToken,
  //       isLong: args.isLong,

  //       averagePrice: 0n,
  //       collateral: 0n,
  //       cumulativeCollateral: 0n,
  //       cumulativeFee: 0n,
  //       cumulativeSize: 0n,
  //       entryFundingRate: 0n,
  //       maxCollateral: 0n,
  //       reserveAmount: 0n,
  //       size: 0n,
  //       maxSize: 0n,
  //       realisedPnl: 0n,
  //       __typename: 'PositionSlot',
  //       link: {
  //         __typename: 'PositionLink',
  //         // id: args.key,
  //         decreaseList: [],
  //         increaseList: [],
  //         updateList: [],
  //       }
  //     }

  //     positionSlot.idCount = seed.countId
  //     positionSlot.cumulativeCollateral += args.collateralDelta
  //     positionSlot.cumulativeSize += args.sizeDelta
  //     positionSlot.cumulativeFee += args.fee

  //     positionSlot.link.increaseList.push({ ...value.args, __typename: 'IncreasePosition' })


  //     return seed
  //   },
  // },
  // {
  //   source: decreaseEvents,
  //   step(seed, value) {
  //     const args = value.args
  //     const positionSlot = seed.positionSlots[args.key]

  //     if (!positionSlot) {
  //       return seed
  //       // throw new Error('position not found')
  //     }

  //     positionSlot.cumulativeFee += args.fee
  //     positionSlot.link.decreaseList.push({ ...value.args, __typename: 'DecreasePosition' })

  //     return seed
  //   },
  // },
  // {
  //   source: updateEvents,
  //   step(seed, value) {
  //     const args = value.args
  //     const positionSlot = seed.positionSlots[args.key]

  //     if (!positionSlot) {
  //       return seed
  //       // throw new Error('position not found')
  //     }

  //     positionSlot.link.updateList.push({ ...value.args, __typename: 'UpdatePosition' })

  //     positionSlot.collateral = args.collateral
  //     positionSlot.realisedPnl = args.realisedPnl
  //     positionSlot.averagePrice = args.averagePrice
  //     positionSlot.size = args.size
  //     positionSlot.reserveAmount = args.reserveAmount
  //     positionSlot.entryFundingRate = args.entryFundingRate
  //     positionSlot.maxCollateral = args.collateral > positionSlot.maxCollateral ? args.collateral : positionSlot.maxCollateral
  //     positionSlot.maxSize = args.size > positionSlot.maxSize ? args.size : positionSlot.maxSize

  //     return seed
  //   },
  // },
  // {
  //   source: closeEvents,
  //   step(seed, value) {
  //     const args = value.args
  //     const positionSlot = seed.positionSlots[args.key]

  //     if (!positionSlot) {
  //       return seed
  //       // throw new Error('position not found')
  //     }

  //     const settleId = `${args.key}:${seed.countId}` as const

  //     seed.positionsSettled[settleId] = {
  //       ...positionSlot,
  //       realisedPnl: args.realisedPnl,
  //       settlePrice: args.averagePrice,
  //       isLiquidated: false,
  //       __typename: 'PositionSettled',
  //     }

  //     delete seed.positionSlots[args.key]
 

  //     seed.countId++

  //     return seed
  //   },
  // },
  // {
  //   source: liquidateEvents,
  //   step(seed, value) {
  //     const args = value.args
  //     const positionSlot = seed.positionSlots[args.key]

  //     if (!positionSlot) {
  //       return seed
  //       // throw new Error('position not found')
  //     }


  //     const settleId = `${args.key}:${seed.countId}` as const

  //     seed.positionsSettled[settleId] = {
  //       ...positionSlot,
  //       realisedPnl: args.realisedPnl,
  //       settlePrice: args.markPrice,
  //       isLiquidated: true,
  //       __typename: 'PositionSettled',
  //     }

  //     delete seed.positionSlots[args.key]
 

  //     seed.countId++

  //     return seed
  //   },
  // },
)

import { combineArray, map } from "@most/core"
import { Stream } from "@most/types"
import { factor, getPositionPnlUsd, lst } from "gmx-middleware-utils"
import * as viem from "viem"
import { latestPriceMap } from "./graph.js"
import { IMirrorPosition, IMirrorPositionListSummary, IMirrorPositionOpen, IMirrorPositionSettled } from "./types.js"


// export function extractPricefeedFromPositionList(
//   positionList: (IMirrorPositionOpen | IMirrorPositionSettled)[]
// ): IPricetickListMap {
//   const pricefeedMap: IPricetickListMap = {}

//   for (const mp of positionList) {
//     const indexToken = mp.position.indexToken

//     const adjustmentList = [...mp.position.link.increaseList, ...mp.position.link.decreaseList]
//     for (const update of adjustmentList) {
//       pricefeedMap[indexToken] ??= []
//       pricefeedMap[indexToken].push({ 
//         timestamp: Number(update.blockTimestamp),
//         price: update.indexTokenPriceMin,
//         token: indexToken
//       })
//     }
//   }

//   return pricefeedMap
// }

export function accountSettledPositionListSummary(
  tradeList: (IMirrorPositionSettled | IMirrorPositionOpen)[],
  puppet?: viem.Address,
): IMirrorPositionListSummary {


  const seedAccountSummary: IMirrorPositionListSummary = {
    size: 0n,
    collateral: 0n,
    cumulativeLeverage: 0n,
    puppets: [],

    avgCollateral: 0n,
    avgSize: 0n,

    fee: 0n,
    lossCount: 0,
    pnl: 0n,
    winCount: 0,
  }

  const summary = tradeList.reduce((seed, next, idx): IMirrorPositionListSummary => {
    const idxBn = BigInt(idx) + 1n

    const size = seed.size + getParticiapntMpPortion(next, next.position.maxSizeUsd, puppet)
    const collateral = seed.collateral + getParticiapntMpPortion(next, next.position.maxCollateralUsd, puppet)
    const cumulativeLeverage = seed.cumulativeLeverage + getParticiapntMpPortion(next, factor(next.position.maxSizeUsd, next.position.maxCollateralUsd), puppet)

    const avgSize = size / idxBn
    const avgCollateral = collateral / idxBn

    const lstFeeUpdate = lst(next.position.link.feeUpdateList)

    const fee = seed.fee + getParticiapntMpPortion(next, lstFeeUpdate.totalCostAmount, puppet)
    const pnl = seed.pnl + getParticiapntMpPortion(next, next.position.realisedPnlUsd, puppet)

    const winCount = seed.winCount + (next.position.realisedPnlUsd > 0n ? 1 : 0)
    const lossCount = seed.lossCount + (next.position.realisedPnlUsd <= 0n ? 1 : 0)

    const puppets = [...seed.puppets, ...next.puppets.filter(x => !seed.puppets.includes(x))]

    return {
      size,
      collateral,
      cumulativeLeverage,
      avgCollateral,
      avgSize,
      fee,
      lossCount,
      pnl,
      winCount,
      puppets,
    }
  }, seedAccountSummary)


  return summary
}

export function openPositionListPnl(
  tradeList: IMirrorPositionOpen[],
  puppet?: viem.Address,
): Stream<bigint> {

  const pnlList = tradeList.map(mp => {
    return map(pm => {
      const markPrice = pm[mp.position.indexToken].max
      const pnl = getMpSlotPnL(mp, markPrice, puppet)
      return pnl
    }, latestPriceMap)
  })

  return combineArray((...pl) => {
    return pl.reduce((seed, next) => seed + next, 0n)
  }, pnlList)
}

export function getPuppetShare(shares: readonly bigint[], puppets: readonly viem.Address[], puppet: viem.Address): bigint {
  const idx = puppets.indexOf(puppet)

  if (idx == -1) throw new Error("Puppet not found")

  const share = shares[idx]

  if (share === undefined) throw new Error("Puppet share not found")

  return share
}

export function getParticiapntMpShare(mp: IMirrorPosition, puppet?: viem.Address): bigint {
  if (!puppet) return mp.traderShares
  if (mp.puppets.indexOf(puppet) === -1) throw new Error("Account is not a participant")

  return getPuppetShare(mp.puppetsShares, mp.puppets, puppet)
}

export function getParticiapntMpPortion(mp: IMirrorPosition, amount: bigint, puppet?: viem.Address): bigint {
  const share = getParticiapntMpShare(mp, puppet)

  return getPortion(mp.totalSupply, share, amount)
}


export function getMpSlotPnL(mp: IMirrorPositionOpen, markPrice: bigint, puppet?: viem.Address): bigint {
  const delta = getPositionPnlUsd(mp.position.isLong,  mp.position.sizeInUsd, mp.position.sizeInTokens, markPrice)
  const openPnl = getParticiapntMpPortion(mp, delta, puppet)

  return openPnl
}


export function getPortion(supply: bigint, share: bigint, amount: bigint): bigint {
  if (supply === 0n || amount == 0n) return amount

  if (share == 0n) {
    return amount
  } else {
    return amount * share / supply
  }
}


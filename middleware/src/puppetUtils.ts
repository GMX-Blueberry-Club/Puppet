import { IPricetickListMap, factor, getPositionPnlUsd, hashData, lst } from "gmx-middleware-utils"
import * as viem from "viem"
import { IMirrorPosition, IMirrorPositionListSummary, IMirrorPositionOpen, IMirrorPositionSettled } from "./types.js"


export function extractPricefeedFromPositionList(
  positionList: (IMirrorPositionOpen | IMirrorPositionSettled)[]
): IPricetickListMap {
  const pricefeedMap: IPricetickListMap = {}

  for (const mp of positionList) {
    const indexToken = mp.position.indexToken

    const adjustmentList = [...mp.position.link.increaseList, ...mp.position.link.decreaseList]
    for (const update of adjustmentList) {
      pricefeedMap[indexToken] ??= []
      pricefeedMap[indexToken].push({ 
        timestamp: Number(update.blockTimestamp),
        price: update.indexTokenPriceMin,
        token: indexToken
      })
    }
  }

  return pricefeedMap
}

export function accountSettledPositionListSummary<T extends IMirrorPosition>(
  tradeList: T[],
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
    realisedPnl: 0n,
    openPnl: 0n,
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
    const realisedPnl = seed.pnl + getParticiapntMpPortion(next, next.position.realisedPnlUsd, puppet)
    const openPnl = next.__typename === 'MirrorPositionSettled' ? seed.openPnl : 0n + seed.openPnl
    // const openPnl = next.__typename === 'MirrorPositionSettled' ? seed.openPnl : getMpSlotPnL(next, getMappedValue(priceLatestMap, next.position.market), puppet) + seed.openPnl
    const pnl = realisedPnl + openPnl


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
      openPnl,
      realisedPnl,
      winCount,
      puppets,
    }
  }, seedAccountSummary)


  return summary
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
  if (supply === 0n) return amount
  if (amount == 0n) throw new Error("amount cannot be 0")

  if (share == 0n) {
    return amount
  } else {
    return amount * share / supply
  }
}

export function hashNamedValue(name: string, value: viem.Hex): viem.Hex {
  return hashData(
    ["string", "bytes"],
    [name, value]
  )
}



export function getRouteTypeKey(collateralToken: viem.Address, indexToken: viem.Address, isLong: boolean, data: viem.Hex): viem.Hex {
  return hashData(
    ["address", "address", "bool", "bytes"],
    [collateralToken, indexToken, isLong, data ]
  )
}


export function getTradeRouteKey(trader: viem.Address, tradeRouteTypeKey: viem.Hex): viem.Hex {
  return hashData(
    ["address", "bytes"],
    [trader, tradeRouteTypeKey]
  )
}

export function getPuppetSubscriptionKey(puppet: viem.Address, trader: viem.Address, routeTypeKey: viem.Hex): viem.Hex {
  return hashData(
    ["address", "address", "bytes32"],
    [puppet, trader, routeTypeKey]
  )
}


export function getPuppetDepositAccountKey(puppet: viem.Address, asset: viem.Address): viem.Hex {
  return hashData(
    ["string", "address", "address"],
    ["PUPPET_DEPOSIT_ACCOUNT", puppet, asset]
  )
}





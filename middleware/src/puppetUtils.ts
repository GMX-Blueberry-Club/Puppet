import { IOraclePrice, IPriceLatestMap, factor, getMappedValue, getPositionPnlUsd, hashData, isPositionSettled, lst } from "gmx-middleware-utils"
import * as viem from "viem"
import { IMirrorPositionListSummary, IPositionMirrorSettled, IPositionMirrorSlot } from "./types.js"


export function accountSettledTradeListSummary(
  tradeList: (IPositionMirrorSlot | IPositionMirrorSettled)[],
  priceLatestMap: IPriceLatestMap,
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


    const size = seed.size + getParticiapntMpPortion(next, next.maxSizeUsd, puppet)
    const collateral = seed.collateral + getParticiapntMpPortion(next, next.maxCollateralUsd, puppet)
    const cumulativeLeverage = seed.cumulativeLeverage + getParticiapntMpPortion(next, factor(next.maxSizeUsd, next.maxCollateralUsd), puppet)

    const avgSize = size / idxBn
    const avgCollateral = collateral / idxBn

    const fee = seed.fee + getParticiapntMpPortion(next, next.cumulativeFee, puppet)
    const realisedPnl = seed.pnl + getParticiapntMpPortion(next, next.realisedPnl, puppet)
    const openPnl = isPositionSettled(next) ? seed.openPnl : getMpSlotPnL(next, getMappedValue(priceLatestMap, next.indexToken), puppet) + seed.openPnl
    const pnl = realisedPnl + openPnl


    const winCount = seed.winCount + (next.realisedPnl > 0n ? 1 : 0)
    const lossCount = seed.lossCount + (next.realisedPnl <= 0n ? 1 : 0)

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

export function getParticiapntMpShare(mp: IPositionMirrorSettled | IPositionMirrorSlot, puppet?: viem.Address): bigint {
  if (!puppet) return mp.traderShare
  if (mp.puppets.indexOf(puppet) === -1) throw new Error("Account is not a participant")

  return getPuppetShare(mp.shares, mp.puppets, puppet)
}

export function getParticiapntMpPortion(mp: IPositionMirrorSettled | IPositionMirrorSlot, amount: bigint, puppet?: viem.Address): bigint {
  const share = getParticiapntMpShare(mp, puppet)

  return getPortion(mp.shareSupply, share, amount)
}


export function getMpSlotPnL(mp: IPositionMirrorSlot, markPrice: IOraclePrice, puppet?: viem.Address): bigint {
  const update = lst(mp.updates)
  const delta = getPositionPnlUsd(mp.isLong,  update.sizeInUsd, update.sizeInTokens, markPrice.min)
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





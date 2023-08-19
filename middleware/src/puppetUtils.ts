import { IPositionListSummary, div, getPnL } from "gmx-middleware-utils"
import * as viem from "viem"
import { IMirrorPositionListSummary, IPositionMirrorSettled, IPositionMirrorSlot } from "./types.js"


export function summariesMirrorTrader(settledTradeList: IPositionMirrorSettled[], shareTarget?: viem.Address): IMirrorPositionListSummary {

  const seedAccountSummary: IMirrorPositionListSummary = {
    size: 0n,
    collateral: 0n,
    leverage: 0n,
    puppets: [],

    avgLeverage: 0n,
    avgCollateral: 0n,
    avgSize: 0n,

    fee: 0n,
    lossCount: 0,
    pnl: 0n,
    winCount: 0,
  }

  const summary = settledTradeList.reduce((seed, next, idx): IMirrorPositionListSummary => {
    const idxBn = BigInt(idx) + 1n


    const size = seed.size + getParticiapntMpPortion(next, next.maxSize, shareTarget)
    const collateral = seed.collateral + getParticiapntMpPortion(next, next.maxCollateral, shareTarget)
    const leverage = seed.leverage + getParticiapntMpPortion(next, div(next.maxSize, next.maxCollateral), shareTarget)

    const avgSize = size / idxBn
    const avgCollateral = collateral / idxBn
    const avgLeverage = leverage / idxBn


    const fee = seed.fee + getParticiapntMpPortion(next, next.cumulativeFee, shareTarget)
    const pnl = seed.pnl + getParticiapntMpPortion(next, next.realisedPnl, shareTarget)


    const winCount = seed.winCount + (next.realisedPnl > 0n ? 1 : 0)
    const lossCount = seed.lossCount + (next.realisedPnl <= 0n ? 1 : 0)

    const puppets = [...seed.puppets, ...next.puppets.filter(x => !seed.puppets.includes(x))]

    return {
      size,
      collateral,
      leverage,
      avgLeverage,
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


export function getPuppetShare(shares: readonly bigint[], puppets: readonly viem.Address[], puppet: viem.Address): bigint {
  const idx = puppets.indexOf(puppet)

  if (idx == -1) throw new Error("Puppet not found")

  return shares[idx]
}

export function getParticiapntMpShare(mp: IPositionMirrorSettled | IPositionMirrorSlot, shareTarget?: viem.Address): bigint {
  if (!shareTarget || mp.puppets.indexOf(shareTarget) === -1) return mp.traderShare

  return getPuppetShare(mp.shares, mp.puppets, shareTarget)
}

export function getParticiapntMpPortion(mp: IPositionMirrorSettled | IPositionMirrorSlot, amount: bigint, shareTarget?: viem.Address): bigint {
  const share = getParticiapntMpShare(mp, shareTarget)

  return getPortion(mp.shareSupply, share, amount)
}


export function getMpPnL(mp: IPositionMirrorSettled | IPositionMirrorSlot, markPrice: bigint, shareTarget?: viem.Address): bigint {
  const delta = getPnL(mp.isLong, mp.averagePrice, markPrice, mp.size)
  const openPnl = getParticiapntMpPortion(mp, delta, shareTarget)

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

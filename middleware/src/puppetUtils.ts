import { div, getPnL, groupArrayMany } from "gmx-middleware-utils"
import * as viem from "viem"
import { IAccountToRouteMap, IMirrorTraderSummary, IPositionMirrorSettled, IPositionMirrorSlot } from "./types.js"


export function summariesMirrorTrader(settledTradeList: IPositionMirrorSettled[], shareTarget?: viem.Address): IMirrorTraderSummary {
  const account = settledTradeList[0].trader
  const route = settledTradeList[0].route

  const seedAccountSummary: IMirrorTraderSummary = {
    route: route,
    account,
    size: 0n,
    collateral: 0n,
    leverage: 0n,

    puppets: [],
    settledTradeList,

    avgLeverage: 0n,
    avgCollateral: 0n,
    avgSize: 0n,

    fee: 0n,
    lossCount: 0,
    pnl: 0n,
    winCount: 0,
  }

  return settledTradeList.reduce((seed, next, idx): IMirrorTraderSummary => {
    const idxBn = BigInt(idx) + 1n

    const position = next.position

    const share = getParticiapntMpShare(next, shareTarget)


    const size = seed.size + getParticiapntMpPortion(next, position.maxSize, shareTarget)
    const collateral = seed.collateral + getParticiapntMpPortion(next, position.maxCollateral, shareTarget)
    const leverage = seed.leverage + getParticiapntMpPortion(next, div(position.maxSize, position.maxCollateral), shareTarget)

    const avgSize = size / idxBn
    const avgCollateral = collateral / idxBn
    const avgLeverage = leverage / idxBn


    const fee = seed.fee + getParticiapntMpPortion(next, position.cumulativeFee, shareTarget)
    const pnl = seed.pnl + getParticiapntMpPortion(next, position.realisedPnl, shareTarget)


    const winCount = seed.winCount + (position.realisedPnl > 0n ? 1 : 0)
    const lossCount = seed.lossCount + (position.realisedPnl <= 0n ? 1 : 0)

    const puppets = [...seed.puppets, ...next.puppets.filter(x => !seed.puppets.includes(x))]

    return {
      route: seed.route,
      account,
      size,
      collateral,
      leverage,
      settledTradeList,
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
  const position = mp.position
  const delta = getPnL(position.isLong, position.averagePrice, markPrice, position.size)
  const openPnl = getParticiapntMpPortion(mp, delta, shareTarget)

  return openPnl
}


export function leaderboardMirrorTrader(positionMap: IAccountToRouteMap<IPositionMirrorSettled[]>): IMirrorTraderSummary[] {
  const flattenMapMap = Object.values(positionMap).flatMap(x => Object.values(x).flat())
  const tradeListMap = groupArrayMany(flattenMapMap, a => a.trader)
  const tradeListEntries = Object.values(tradeListMap)

  return tradeListEntries.map(settledTradeList => summariesMirrorTrader(settledTradeList))
}

export function getPortion(supply: bigint, share: bigint, amount: bigint): bigint {
  if (amount == 0n) throw new Error("amount cannot be 0")

  if (share == 0n) {
    return amount
  } else {
    return amount * share / supply
  }
}

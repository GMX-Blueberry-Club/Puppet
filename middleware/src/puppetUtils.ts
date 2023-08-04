import { div, groupArrayMany } from "gmx-middleware-utils"
import * as viem from "viem"
import { IAccountToRouteMap, IMirrorTraderSummary, IPositionMirrorSettled, IPositionMirrorSlot } from "./types.js"


export function summariesMirrorTrader(settledTradeList: IPositionMirrorSettled[]): IMirrorTraderSummary {
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

    const size = seed.size + position.maxSize
    const collateral = seed.collateral + position.maxCollateral
    const leverage = seed.leverage + div(position.maxSize, position.maxCollateral)

    const avgSize = size / idxBn
    const avgCollateral = collateral / idxBn
    const avgLeverage = leverage / idxBn


    const fee = seed.fee + position.cumulativeFee
    const pnl = seed.fee + position.realisedPnl


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


export function getPuppetPosition<T extends IPositionMirrorSlot | IPositionMirrorSettled>(trade: T, puppet: viem.Address): T['position'] {
  const share = getPuppetShare(trade.shares, trade.puppets, puppet) 
  const size = getPortion(trade.position.size, trade.shareSupply, share)
  const collateral = getPortion(trade.position.collateral, trade.shareSupply, share)

  return {
    ...trade.position,
    size,
    collateral
  }
}

export function leaderboardMirrorTrader(positionMap: IAccountToRouteMap<IPositionMirrorSettled[]>): IMirrorTraderSummary[] {
  const flattenMapMap = Object.values(positionMap).flatMap(x => Object.values(x).flat())
  const tradeListMap = groupArrayMany(flattenMapMap, a => a.trader)
  const tradeListEntries = Object.values(tradeListMap)

  return tradeListEntries.map(settledTradeList => summariesMirrorTrader(settledTradeList))
}

export function getPortion(pool: bigint, supply: bigint, amount: bigint): bigint {
  if (amount == 0n) throw new Error("ZeroAmount")

  if (pool == 0n) {
    return amount
  } else {
    return amount * pool / supply
  }
}

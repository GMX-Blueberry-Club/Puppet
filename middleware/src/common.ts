import { groupArrayMany, div } from "gmx-middleware-utils"
import * as viem from "viem"
import { IMirrorTraderSummary, IPositionMirrorSettled } from "./types.js"


export function getRouteTypeKey(collateralToken: viem.Address, indexToken: viem.Address, isLong: boolean) {
  return viem.keccak256(viem.encodePacked(
    ["address", "address", "bool"],
    [collateralToken, indexToken, isLong]
  ))
}

export function getRouteKey(trader: viem.Address, collateralToken: viem.Address, indexToken: viem.Address, isLong: boolean) {
  return viem.keccak256(viem.encodePacked(
    ["address", "address", "address", "bool"],
    [trader, collateralToken, indexToken, isLong]
  ))
}



export function summariesMirrorTrader(positionMap: Record<viem.Hex, IPositionMirrorSettled>): IMirrorTraderSummary[] {
  const tradeListMap = groupArrayMany(Object.values(positionMap), a => a.trader)
  const tradeListEntries = Object.entries(tradeListMap) as [viem.Address, IPositionMirrorSettled[]][]

  const summaryList = tradeListEntries.map(([account, settledTradeList]) => {

    const seedAccountSummary: IMirrorTraderSummary = {
      route: settledTradeList[0].route,
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


    const summary = settledTradeList.reduce((seed, mpos, idx): IMirrorTraderSummary => {
      const idxBn = BigInt(idx) + 1n

      const position = mpos.position

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

      const puppets = [...seed.puppets, ...mpos.puppets.filter(x => !seed.puppets.includes(x))]

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


    return summary
  })

  return summaryList
}


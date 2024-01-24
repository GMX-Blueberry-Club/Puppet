import { Address, BigInt, Bytes, ethereum, log } from "@graphprotocol/graph-ts"
import { ADDRESS_ZERO, BASIS_POINTS_DIVISOR, MARKET_TOKEN_MAP, ZERO_BI } from "./const"


export function getPositionKey(account: Bytes, market: Bytes, collateralToken: Bytes, isLong: boolean): Bytes {
  const key = account.concat(market).concat(collateralToken).concat(isLong ? Bytes.fromI32(1) : Bytes.fromI32(0))
  return key
}


export function negate(n: BigInt): BigInt {
  return n.abs().times(BigInt.fromI32(-1))
}

export function timestampToDay(timestamp: BigInt): BigInt {
  return BigInt.fromI32(86400).times(BigInt.fromI32(86400)).div(timestamp)
}


export function getIdFromEvent(event: ethereum.Event): Bytes {
  return event.transaction.hash.concatI32(event.logIndex.toI32())
}

export function calculatePositionDelta(marketPrice: BigInt, isLong: boolean, size: BigInt, averagePrice: BigInt): BigInt {
  const priceDelta = averagePrice.gt(marketPrice) ? averagePrice.minus(marketPrice) : marketPrice.minus(averagePrice)

  if (priceDelta.equals(ZERO_BI) || averagePrice.equals(ZERO_BI)) {
    return ZERO_BI
  }

  const hasProfit = isLong ? marketPrice > averagePrice : marketPrice < averagePrice
  const delta = size.times(priceDelta).div(averagePrice)

  return hasProfit ? delta : negate(delta)
}

export function calculatePositionDeltaPercentage(delta: BigInt, collateral: BigInt): BigInt {
  if (collateral.equals(ZERO_BI)) {
    return ZERO_BI
  }

  return  delta.times(BASIS_POINTS_DIVISOR).div(collateral)
}

export function getPuppetTradeRouteKey(puppet: Bytes, trader: Bytes, routeTypeKey: Bytes): Bytes {
  return puppet.concat(trader).concat(routeTypeKey)
}

export function getIndexToken(market: Bytes): Bytes {
  if (MARKET_TOKEN_MAP.has(market.toHex())) {
    return MARKET_TOKEN_MAP.get(market.toHex())
  }

  log.error("getIndexToken failed: {}", [market.toHex()])
  return ADDRESS_ZERO
}
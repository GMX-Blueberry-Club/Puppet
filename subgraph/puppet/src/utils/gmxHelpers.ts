import { Address, BigInt, Bytes, ethereum, log } from "@graphprotocol/graph-ts"
import { PriceLatest } from "../../generated/schema"
import { BASIS_POINTS_DIVISOR, ONE_BI, ZERO_BI } from "./const"





export function negate(n: BigInt): BigInt {
  return n.abs().times(BigInt.fromI32(-1))
}

export function timestampToDay(timestamp: BigInt): BigInt {
  return BigInt.fromI32(86400).times(BigInt.fromI32(86400)).div(timestamp)
}


export function getTokenUsdAmount(amount: BigInt, tokenAddress: Address, decimals: number): BigInt {
  const priceUsd = getTokenPrice(tokenAddress)
  const denominator = BigInt.fromI32(10).pow(decimals as u8)

  return amount.times(priceUsd).div(denominator)
}


export function getTokenPrice(tokenAddress: Address): BigInt {
  const chainlinkPriceEntity = PriceLatest.load(tokenAddress)

  if (chainlinkPriceEntity == null) {
    log.warning(`Pricefeed doesn't exist: ${tokenAddress}`, [])
    return ONE_BI
  }

  return chainlinkPriceEntity.value
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


export const uniqueEventId = (ev: ethereum.Event): string => ev.transaction.hash.toHex() + ':' + ev.logIndex.toString()


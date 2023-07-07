import { BigInt, Bytes, ethereum } from "@graphprotocol/graph-ts"



export const getUniqueEventId = (ev: ethereum.Event): Bytes => {
  return ev.transaction.hash.concatI32(ev.logIndex.toI32())
}

export const getPositionKey = (collateralToken: Bytes, indexToken: Bytes, isLong: boolean): Bytes =>
  collateralToken.concat(indexToken).concatI32(isLong ? 1 : 0)

  
export function getIntervalIdentifier(event: ethereum.Event, name: string, interval: intervalUnixTime): string {
  const intervalID = getIntervalId(interval, event)
  return name + ":" + interval.toString() + ':' + intervalID.toString()
}

export function getIntervalId(interval: intervalUnixTime, event: ethereum.Event): i32 {
  return event.block.timestamp.toI32() / interval
}

export function getHourlyId(event: ethereum.Event): i32 {
  return getIntervalId(3600, event)
}

export function getDailyId(event: ethereum.Event): i32 {
  return getIntervalId(86400, event)
}

export function getWeeklyId(event: ethereum.Event): i32 {
  return getIntervalId(604800, event)
}

export const ADDRESS_ZERO = '0x0000000000000000000000000000000000000000'
export const ZERO_BYTES32 = "0x0000000000000000000000000000000000000000000000000000000000000000"

export const BASIS_POINTS_DIVISOR = BigInt.fromI32(10000)
export const FUNDING_RATE_PRECISION = BigInt.fromI32(1000000)
export const MARGIN_FEE_BASIS_POINTS = BigInt.fromI32(10)


export const ZERO_BI = BigInt.fromI32(0)
export const ONE_BI = BigInt.fromI32(1)
export const BI_18 = BigInt.fromI32(18)
export const BI_10 = BigInt.fromI32(10)

export const BI_12_PRECISION = BigInt.fromI32(10).pow(12)
export const BI_18_PRECISION = BigInt.fromI32(10).pow(18)
export const BI_22_PRECISION = BigInt.fromI32(10).pow(22)


export enum TokenDecimals {
  USDC = 6,
  USDT = 6,
  BTC = 8,
  WETH = 18,
  LINK = 18,
  UNI = 18,
  MIM = 18,
  SPELL = 18,
  SUSHI = 18,
  AVAX = 18,
  FRAX = 18,
  DAI = 18,
  GMX = 18,
  GLP = 18,
}


export enum intervalUnixTime {
  SEC = 1,
  SEC60 = 60,
  MIN5 = 300,
  MIN15 = 900,
  MIN30 = 1800,
  MIN60 = 3600,
  HR2 = 7200,
  HR4 = 14400,
  HR8 = 28800,
  HR24 = 86400,
  DAY7 = 604800,
  MONTH = 2628000,
  MONTH2 = 5256000
}



export function negate(n: BigInt): BigInt {
  return n.abs().times(BigInt.fromI32(-1))
}

export function timestampToDay(timestamp: BigInt): BigInt {
  return BigInt.fromI32(86400).times(BigInt.fromI32(86400)).div(timestamp)
}





export function getIdFromEvent(event: ethereum.Event): string {
  return event.transaction.hash.toHexString() + ':' + event.logIndex.toString()
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



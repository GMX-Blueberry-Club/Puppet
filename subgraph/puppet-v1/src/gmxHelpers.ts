import {  BigInt, Bytes, ethereum, log } from "@graphprotocol/graph-ts"
// import { AddLiquidity, RemoveLiquidity } from "../generated/GlpManager/GlpManager"
// import { Transfer, Pricefeed, PriceLatest, Claim } from "../generated/schema"
import { getIntervalId, getIntervalIdentifier } from "./interval"
import * as erc20 from "../generated/transferGmx/ERC20"
import { ONE_BI, ZERO_BI, BASIS_POINTS_DIVISOR, BI_18_PRECISION, BI_12_PRECISION } from "./const"




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


export function getTokenUsdAmount(amount: BigInt, tokenAddress: string, decimals: TokenDecimals): BigInt {
  const priceUsd = getTokenPrice(tokenAddress)
  const denominator = BigInt.fromI32(10).pow(decimals as u8)

  return amount.times(priceUsd).div(denominator)
}


export function getTokenPrice(tokenAddress: string): BigInt {
  const chainlinkPriceEntity = PriceLatest.load(tokenAddress)

  if (chainlinkPriceEntity == null) {
    log.warning(`Pricefeed doesn't exist: ${tokenAddress}`, [])
    return ONE_BI
  }

  return chainlinkPriceEntity.value
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

export function _storePriceLatest(tokenAddress: string, price: BigInt, event: ethereum.Event): PriceLatest {
  let entity = PriceLatest.load(tokenAddress)
  if (entity === null) {
    entity = new PriceLatest(tokenAddress)
  }

  entity.timestamp = event.block.timestamp.toI32()
  entity.value = price
  entity.save()

  return entity
}

export function _storePricefeed(event: ethereum.Event, token: string, interval: intervalUnixTime, price: BigInt): void {
  const intervalID = getIntervalId(interval, event)
  const id = getIntervalIdentifier(event, token, interval)

  let entity = Pricefeed.load(id)
  if (entity == null) {
    entity = new Pricefeed(id)

    entity.interval = '_' + interval.toString()
    entity.tokenAddress = '_' + token
    entity.timestamp = intervalID * interval
    entity.o = price
    entity.h = price
    entity.l = price
  }

  if (price > entity.h) {
    entity.h = price
  }

  if (price < entity.l) {
    entity.l = price
  }

  entity.c = price

  entity.save()
}

export function _storeGlpAddLiqPricefeed(priceFeed: string, event: AddLiquidity): void {
  const price = event.params.aumInUsdg.equals(ZERO_BI)
    ? ONE_BI :
    event.params.aumInUsdg.times(BI_18_PRECISION).div(event.params.glpSupply).times(BI_12_PRECISION)

  _storeDefaultPricefeed(priceFeed, event, price)
}

export function _storeGlpRemoveLiqPricefeed(priceFeed: string, event: RemoveLiquidity): void {
  const price = event.params.aumInUsdg.equals(ZERO_BI)
    ? ONE_BI :
    event.params.aumInUsdg.times(BI_18_PRECISION).div(event.params.glpSupply).times(BI_12_PRECISION)

  _storeDefaultPricefeed(priceFeed, event, price)
}

export function _storeDefaultPricefeed(tokenAddress: string, event: ethereum.Event, price: BigInt): void {
  _storePriceLatest(tokenAddress, price, event)

  _storePricefeed(event, tokenAddress, intervalUnixTime.MIN5, price)
  _storePricefeed(event, tokenAddress, intervalUnixTime.MIN15, price)
  _storePricefeed(event, tokenAddress, intervalUnixTime.MIN60, price)
  _storePricefeed(event, tokenAddress, intervalUnixTime.HR4, price)
  _storePricefeed(event, tokenAddress, intervalUnixTime.HR24, price)
  _storePricefeed(event, tokenAddress, intervalUnixTime.DAY7, price)
}

export const uniqueEventId = (ev: ethereum.Event): string => ev.transaction.hash.toHex() + ':' + ev.logIndex.toString()


export function _storeERC20Transfer(token: string, event: ethereum.Event, from: Bytes, to: Bytes, amount: BigInt, amountUsd: BigInt): void {
  const id = uniqueEventId(event)

  const transfer = new erc20.Transfer(id)
  transfer.token = token
  transfer.from = from
  transfer.to = to
  transfer.amount = amount
  transfer.amountUsd = amountUsd
  transfer.timestamp = event.block.timestamp

  transfer.save()
}



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
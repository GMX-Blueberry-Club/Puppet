import { Address, log, store } from "@graphprotocol/graph-ts"
import { EventLog1 } from "../generated/EventEmitter/EventEmitter"
import { PositionLink, PositionOpen, PriceCandle, PriceCandleSeed } from "../generated/schema"
import * as dto from "./dto"
import { IntervalUnixTime, ZERO_BI } from "./utils/const"
import { getAddressItem, getBytes32Item, getUintItem } from "./utils/datastore"


export function handleEventLog1(event: EventLog1): void {
  if (event.params.eventName == "OraclePriceUpdate") {
    onOraclePriceUpdate(event)
  } else if (event.params.eventName == "PositionIncrease") {
    onPositionIncrease(event)
  } else if (event.params.eventName == "PositionDecrease") {
    onPositionDecrease(event)
  } else if (event.params.eventName == "PositionFeesCollected") {
    onPositionFeesInfo(event)
  } else if (event.params.eventName == "PositionFeesInfo") {
    onPositionFeesInfo(event)
  } else if (event.params.eventName == "MarketCreated") {
    const marketCreated = dto.createMarketCreated(event)
    marketCreated.save()
  }
}


function onPositionIncrease (event: EventLog1): void {
  const positionIncrease = dto.createPositionIncrease(event)
  let openSlot = PositionOpen.load(positionIncrease.positionKey.toHex())

  if (openSlot === null) {
    openSlot = dto.initPositionOpen(positionIncrease)
  }

  positionIncrease.link = openSlot.link

  let positionLink = PositionLink.load(openSlot.link)

  if (positionLink === null) {
    positionLink = dto.createPositionLink(event, openSlot)
    positionLink.save()
  }


  const collateralUsd = positionIncrease.collateralAmount.times(positionIncrease.collateralTokenPriceMax)

  openSlot.sizeInUsd = positionIncrease.sizeInUsd
  openSlot.sizeInTokens = positionIncrease.sizeInTokens
  openSlot.collateralAmount = positionIncrease.collateralAmount

  openSlot.cumulativeSizeUsd = openSlot.cumulativeSizeUsd.plus(positionIncrease.sizeDeltaUsd)
  openSlot.cumulativeSizeToken = openSlot.cumulativeSizeToken.plus(positionIncrease.sizeDeltaInTokens)
  openSlot.cumulativeCollateralUsd = openSlot.cumulativeCollateralUsd.plus(collateralUsd)
  openSlot.cumulativeCollateralToken = openSlot.cumulativeCollateralToken.plus(positionIncrease.collateralAmount)

  openSlot.maxSizeUsd = openSlot.maxSizeUsd.gt(openSlot.sizeInUsd) ? openSlot.maxSizeUsd : openSlot.sizeInUsd
  openSlot.maxSizeToken = openSlot.maxSizeToken.gt(openSlot.maxSizeToken) ? openSlot.maxSizeToken : openSlot.maxSizeToken
  openSlot.maxCollateralToken = openSlot.maxCollateralToken.gt(openSlot.collateralAmount) ? openSlot.maxCollateralToken : openSlot.collateralAmount
  openSlot.maxCollateralUsd = openSlot.maxCollateralUsd.gt(collateralUsd) ? openSlot.maxCollateralUsd : collateralUsd

  positionIncrease.save()
  openSlot.save()
}

function onPositionDecrease(event: EventLog1): void {
  const positionDecrease = dto.createPositionDecrease(event)
  const positionKey = getBytes32Item(event.params.eventData, 1)
  const openPosition = PositionOpen.load(positionKey.toHex())

  if (openPosition === null) {
    log.warning("PositionOpen not found", [])
    return
  }

  positionDecrease.link = openPosition.link


  if (positionDecrease.sizeInTokens.gt(ZERO_BI)) {
    openPosition.sizeInUsd = positionDecrease.sizeInUsd
    openPosition.sizeInTokens = positionDecrease.sizeInTokens
    openPosition.collateralAmount = positionDecrease.collateralAmount
    openPosition.realisedPnlUsd = openPosition.realisedPnlUsd.plus(positionDecrease.basePnlUsd)
    openPosition.save()
  } else {
    const positionSettled = dto.createPositionSettled(event, openPosition)
    openPosition.realisedPnlUsd = openPosition.realisedPnlUsd.plus(positionDecrease.basePnlUsd)

    positionSettled.save()

    store.remove("PositionOpen", openPosition.id)
  }


  positionDecrease.save()
}

function onPositionFeesInfo(event: EventLog1): void {
  const positionFeeUpdate = dto.createPositionFeeUpdate(event)
  const existingLink = PositionLink.load(positionFeeUpdate.orderKey)

  positionFeeUpdate.link = existingLink === null ? positionFeeUpdate.orderKey : existingLink.id
  positionFeeUpdate.save()
}

function divideAndFloor(a: i32, b: i32): i32 {
  if (b === 0) {
    throw new Error("Division by zero")
  }
  return a / b
}


export const PRICEFEED_INTERVAL = [
  IntervalUnixTime.MIN5,
  IntervalUnixTime.MIN15,
  IntervalUnixTime.MIN60,
  IntervalUnixTime.HR6,
  IntervalUnixTime.HR24,
  IntervalUnixTime.DAY7,
  IntervalUnixTime.MONTH,
]

function onOraclePriceUpdate(event: EventLog1): void {
  const token = getAddressItem(event.params.eventData, 0)
  const price = getUintItem(event.params.eventData, 1)
  const timestamp = getUintItem(event.params.eventData, 2).toI32()
  

  for (let index = 0; index < PRICEFEED_INTERVAL.length; index++) {
    const interval = PRICEFEED_INTERVAL[index]
    const nextSlot = divideAndFloor(timestamp, interval)
    const nextTimeSlot = nextSlot * interval
    const latestId = `${token.toHex()}:${interval}`

    let latest = PriceCandleSeed.load(latestId)
    
    // initialize latest price
    if (latest === null) {
      latest = new PriceCandleSeed(latestId)
      latest.timestamp = nextTimeSlot
      latest.token = token
      latest.interval = interval
      latest.o = price
      latest.h = price
      latest.l = price
      latest.c = price
      latest.save()
      
      return
    }
    

    if (nextTimeSlot > latest.timestamp) {
      // store previous candle and initialize next candle
      const candleId = `${latest.token.toHex()}:${interval}:${latest.timestamp}`
      const candle = new PriceCandle(candleId)

      candle.token = latest.token
      candle.interval = latest.interval
      candle.timestamp = latest.timestamp
      candle.o = latest.o
      candle.h = latest.h
      candle.l = latest.l
      candle.c = latest.c
      candle.save()

      // next candle
      latest.timestamp = nextTimeSlot as i32
      latest.o = price
      latest.h = price
      latest.l = price
    } else {
      if (price.gt(latest.h)) {
        latest.h = price
      } else if (price.lt(latest.l)) {
        latest.l = price
      }
    }

    latest.c = price

    latest.save()
  }
}
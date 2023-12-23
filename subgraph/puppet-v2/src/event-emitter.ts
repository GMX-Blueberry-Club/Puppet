import { log, store } from "@graphprotocol/graph-ts"
import { EventLog1 } from "../generated/EventEmitter/EventEmitter"
import { PositionLink, PositionOpen, PriceCandle, PriceCandleLatest } from "../generated/schema"
import * as dto from "./dto"
import { IntervalUnixTime, ZERO_BI } from "./utils/const"
import { getAddressItem, getBytes32Item, getUintItem } from "./utils/datastore"


export function handleEventLog1(event: EventLog1): void {
  switch (event.params.eventName) {
  case "PositionFeesInfo": onPositionFeesInfo(event)
    break
  case "MarketCreated": dto.createMarketCreated(event).save()
    break
  case "PositionIncrease": onPositionIncrease(event)
    break
  case "PositionDecrease": onPositionDecrease(event)
    break
  case "OraclePriceUpdate": onOraclePriceUpdate(event)
    break
  }
}


function onPositionIncrease (event: EventLog1): void {
  const positionKey = getBytes32Item(event.params.eventData, 1)
  let openSlot = PositionOpen.load(positionKey.toHex())

  if (openSlot === null) {
    openSlot = dto.createPositionOpen(event)
  }

  let positionLink = PositionLink.load(openSlot.link)

  if (positionLink === null) {
    positionLink = dto.createPositionLink(event, openSlot)
    positionLink.save()
  }

  const positionIncrease = dto.createPositionIncrease(event, openSlot.link)


  openSlot.sizeInUsd = positionIncrease.sizeInUsd
  openSlot.sizeInTokens = positionIncrease.sizeInTokens
  openSlot.collateralAmount = positionIncrease.collateralAmount

  openSlot.cumulativeSizeUsd = openSlot.cumulativeSizeUsd.plus(positionIncrease.sizeDeltaUsd)
  openSlot.cumulativeSizeToken = openSlot.cumulativeSizeToken.plus(positionIncrease.sizeDeltaInTokens)

  openSlot.maxSizeUsd = openSlot.maxSizeUsd.gt(openSlot.sizeInUsd) ? openSlot.maxSizeUsd : openSlot.sizeInUsd
  openSlot.maxSizeToken = openSlot.maxSizeToken.gt(openSlot.maxSizeToken) ? openSlot.maxSizeToken : openSlot.maxSizeToken

  openSlot.save()
  positionIncrease.save()

}

function onPositionDecrease(event: EventLog1): void {
  const positionKey = getBytes32Item(event.params.eventData, 1)
  const openPosition = PositionOpen.load(positionKey.toHex())

  if (openPosition === null) {
    log.error("PositionOpen not found", [])
    return
  }


  const entity = dto.createPositionDecrease(event, openPosition.link)
  entity.save()

  if (entity.sizeInTokens.gt(ZERO_BI)) {
    openPosition.sizeInUsd = entity.sizeInUsd
    openPosition.sizeInTokens = entity.sizeInTokens
    openPosition.collateralAmount = entity.collateralAmount
    openPosition.realisedPnlUsd = openPosition.realisedPnlUsd.plus(entity.basePnlUsd)
    openPosition.save()
  } else {
    const positionSettled = dto.createPositionSettled(event, openPosition)
    positionSettled.save()

    store.remove("PositionOpen", openPosition.link)
  }

}

function onPositionFeesInfo(event: EventLog1): void {
  const openPosition = PositionOpen.load(getBytes32Item(event.params.eventData, 1).toHex())

  if (openPosition) {
    dto.createPositionFeeUpdate(event, openPosition.link).save()
  }
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
    const nextSlot = timestamp / interval
    const nextTimeSlot = nextSlot * interval
    const latestId = `${token.toHex()}:${interval}`

    let latest = PriceCandleLatest.load(latestId)
    
    if (latest === null) {
      latest = new PriceCandleLatest(latestId)
      latest.timestamp = nextTimeSlot as i32
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
      const candleId = `${latest.token.toHex()}:${interval}:${latest.timestamp}`

      log.warning(candleId, [])
      const candle = new PriceCandle(candleId)

      candle.token = latest.token
      candle.interval = latest.interval
      candle.timestamp = latest.timestamp
      candle.o = latest.o
      candle.h = latest.h
      candle.l = latest.l
      candle.c = latest.c
      candle.save()

      latest.timestamp = nextTimeSlot as i32
    }


    if (price.gt(latest.h)) {
      latest.h = price
    } else if (price.lt(latest.l)) {
      latest.l = price
    }

    latest.c = price

    latest.save()
  }
}
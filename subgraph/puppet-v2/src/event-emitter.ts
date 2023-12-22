import { store } from "@graphprotocol/graph-ts"
import { EventLog1 } from "../generated/EventEmitter/EventEmitter"
import { PositionLink, PositionOpen, PriceLatest } from "../generated/schema"
import * as dto from "./dto"
import { IntervalUnixTime, ZERO_BI } from "./utils/const"
import { getAddressItem, getBytes32Item, getUintItem } from "./utils/datastore"


export function handleEventLog1(event: EventLog1): void {
  if (event.params.eventName == "PositionFeeUpdate") {
    onPositionFeeUpdate(event)
  } else if (event.params.eventName == "MarketCreated") {
    dto.createMarketCreated(event).save()
  } else if (event.params.eventName == "PositionIncrease") {
    onPositionIncrease(event)
  } else if (event.params.eventName == "PositionDecrease") {
    onPositionDecrease(event)
  } else if (event.params.eventName == "PriceInterval") {
    onPriceInterval(event)
  }
}


function onPositionIncrease (event: EventLog1): void {
  const positionKey = getBytes32Item(event.params.eventData, 1)
  let openSlot = PositionOpen.load(positionKey)

  if (openSlot === null) {
    openSlot = dto.createPositionOpen(event)
  }

  const entity = dto.createPositionIncrease(event, openSlot.link)
  entity.save()

  openSlot.sizeInUsd = getUintItem(event.params.eventData, 0)
  openSlot.sizeInTokens = getUintItem(event.params.eventData, 1)
  openSlot.collateralAmount = getUintItem(event.params.eventData, 2)

  openSlot.cumulativeSizeUsd = openSlot.cumulativeSizeUsd.plus(getUintItem(event.params.eventData, 4))
  openSlot.cumulativeSizeToken = openSlot.cumulativeSizeToken.plus(getUintItem(event.params.eventData, 5))
  openSlot.cumulativeFeeUsd = openSlot.cumulativeFeeUsd.plus(getUintItem(event.params.eventData, 6))

  openSlot.maxSizeUsd = openSlot.maxSizeUsd.gt(openSlot.sizeInUsd) ? openSlot.maxSizeUsd : openSlot.sizeInUsd
  openSlot.maxSizeToken = openSlot.maxSizeToken.gt(openSlot.maxSizeToken) ? openSlot.maxSizeToken : openSlot.maxSizeToken

  openSlot.save()

  if (PositionLink.load(openSlot.link) === null) {
    const positionLink = dto.createPositionLink(event, openSlot)
    positionLink.save()
  }
}

function onPositionDecrease(event: EventLog1): void {
  const positionKey = getBytes32Item(event.params.eventData, 1)
  const openPosition = PositionOpen.load(positionKey)

  if (openPosition === null) {
    return
    // log.error("PositionOpen not found", [])
    // throw new Error("PositionOpen not found")
  }
  
  const entity = dto.createPositionDecrease(event, openPosition.link)
  entity.save()

  if (openPosition.sizeInTokens.equals(ZERO_BI)) {
    store.remove("PositionOpen", openPosition.link.toString())
  } else {
    openPosition.sizeInUsd = entity.sizeInUsd
    openPosition.sizeInTokens = entity.sizeInTokens
    openPosition.collateralAmount = entity.collateralAmount
    openPosition.realisedPnlUsd = openPosition.realisedPnlUsd.plus(entity.basePnlUsd)

    openPosition.save()
  }
  
}

function onPositionFeeUpdate(event: EventLog1): void {
  const openPosition = PositionOpen.load(getBytes32Item(event.params.eventData, 1))

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

function onPriceInterval(event: EventLog1): void {
  const token = getAddressItem(event.params.eventData, 0)
  let latestPrice = PriceLatest.load(token)

  if (latestPrice === null) {
    latestPrice = new PriceLatest(token)
  }

  latestPrice.value = getUintItem(event.params.eventData, 1)
  latestPrice.timestamp = getUintItem(event.params.eventData, 2).toI32()

  for (let index = 0; index < PRICEFEED_INTERVAL.length; index++) {
    const interval = PRICEFEED_INTERVAL[index]
    const slot = latestPrice.timestamp / interval
    const timeSlot = slot * interval

    const candle = dto.createPriceLatest(latestPrice, interval, timeSlot)

    candle.save()
  }


}
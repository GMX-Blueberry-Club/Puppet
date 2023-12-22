import { Bytes } from "@graphprotocol/graph-ts"
import { EventLog } from "../generated/EventEmitter/EventEmitter"
import { MarketCreated, PositionDecrease, PositionFeeUpdate, PositionIncrease, PositionLink, PositionOpen, PriceCandle, PriceLatest } from "../generated/schema"
import { getAddressItem, getBoolItem, getBytes32Item, getIntItem, getUintItem } from "./utils/datastore"
import { getIdFromEvent } from "./utils/gmxHelpers"
import { IntervalUnixTime } from "./utils/const"



export function createMarketCreated<T extends EventLog>(event: T): MarketCreated {
  const eventId = getIdFromEvent(event)
  const dto = new MarketCreated(eventId)

  dto.marketToken = getAddressItem(event.params.eventData, 0)
  dto.indexToken = getAddressItem(event.params.eventData, 1)
  dto.longToken = getAddressItem(event.params.eventData, 2)
  dto.shortToken = getAddressItem(event.params.eventData, 3)
  dto.salt = getBytes32Item(event.params.eventData, 0)

  return dto
}

export function createPositionIncrease<T extends EventLog>(event: T, linkId: Bytes): PositionIncrease {
  const eventId = getIdFromEvent(event)
  const dto = new PositionIncrease(eventId)

  dto.link = linkId

  dto.account = getAddressItem(event.params.eventData, 0)
  dto.market = getAddressItem(event.params.eventData, 1)
  dto.collateralToken = getAddressItem(event.params.eventData, 2)

  dto.sizeInUsd = getUintItem(event.params.eventData, 0)
  dto.sizeInTokens = getUintItem(event.params.eventData, 1)
  dto.collateralAmount = getUintItem(event.params.eventData, 2)
  dto.borrowingFactor = getUintItem(event.params.eventData, 3)
  dto.fundingFeeAmountPerSize = getUintItem(event.params.eventData, 4)
  dto.longTokenClaimableFundingAmountPerSize = getUintItem(event.params.eventData, 5)
  dto.shortTokenClaimableFundingAmountPerSize = getUintItem(event.params.eventData, 6)
  dto.executionPrice = getUintItem(event.params.eventData, 7)
  dto.indexTokenPriceMax = getUintItem(event.params.eventData, 8)
  dto.indexTokenPriceMin = getUintItem(event.params.eventData, 9)
  dto.collateralTokenPriceMax = getUintItem(event.params.eventData, 10)
  dto.collateralTokenPriceMin = getUintItem(event.params.eventData, 11)
  dto.sizeDeltaUsd = getUintItem(event.params.eventData, 12)
  dto.sizeDeltaInTokens = getUintItem(event.params.eventData, 13)
  dto.orderType = getUintItem(event.params.eventData, 14)

  dto.collateralDeltaAmount = getIntItem(event.params.eventData, 0)
  dto.priceImpactUsd = getIntItem(event.params.eventData, 1)
  dto.priceImpactAmount = getIntItem(event.params.eventData, 2)

  dto.isLong = getBoolItem(event.params.eventData, 0)

  dto.orderKey = getBytes32Item(event.params.eventData, 0)
  dto.positionKey = getBytes32Item(event.params.eventData, 1)

  dto.blockNumber = event.block.number
  dto.blockTimestamp = event.block.timestamp
  dto.transactionHash = event.transaction.hash
  dto.transactionIndex = event.transaction.index
  dto.logIndex = event.logIndex

  return dto
}

export function createPositionFeeUpdate<T extends EventLog>(event: T, linkId: Bytes): PositionFeeUpdate {
  const eventId = getIdFromEvent(event)
  const dto = new PositionFeeUpdate(eventId)

  dto.link = linkId

  dto.orderKey = getBytes32Item(event.params.eventData, 0)
  dto.positionKey = getBytes32Item(event.params.eventData, 1)
  dto.referralCode = getBytes32Item(event.params.eventData, 2)

  dto.market = getAddressItem(event.params.eventData, 0)
  dto.collateralToken = getAddressItem(event.params.eventData, 1)
  dto.affiliate = getAddressItem(event.params.eventData, 2)
  dto.trader = getAddressItem(event.params.eventData, 3)
  dto.uiFeeReceiver = getAddressItem(event.params.eventData, 4)

  dto.collateralTokenPriceMin = getUintItem(event.params.eventData, 0)
  dto.collateralTokenPriceMax = getUintItem(event.params.eventData, 1)
  dto.tradeSizeUsd = getUintItem(event.params.eventData, 2)
  dto.totalRebateFactor = getUintItem(event.params.eventData, 3)
  dto.traderDiscountFactor = getUintItem(event.params.eventData, 4)
  dto.totalRebateAmount = getUintItem(event.params.eventData, 5)
  dto.traderDiscountAmount = getUintItem(event.params.eventData, 6)
  dto.affiliateRewardAmount = getUintItem(event.params.eventData, 7)
  dto.fundingFeeAmount = getUintItem(event.params.eventData, 8)
  dto.claimableLongTokenAmount = getUintItem(event.params.eventData, 9)
  dto.claimableShortTokenAmount = getUintItem(event.params.eventData, 10)
  dto.latestFundingFeeAmountPerSize = getUintItem(event.params.eventData, 11)
  dto.latestLongTokenClaimableFundingAmountPerSize = getUintItem(event.params.eventData, 12)
  dto.latestShortTokenClaimableFundingAmountPerSize = getUintItem(event.params.eventData, 13)
  dto.borrowingFeeUsd = getUintItem(event.params.eventData, 14)
  dto.borrowingFeeAmount = getUintItem(event.params.eventData, 15)
  dto.borrowingFeeReceiverFactor = getUintItem(event.params.eventData, 16)
  dto.borrowingFeeAmountForFeeReceiver = getUintItem(event.params.eventData, 17)
  dto.positionFeeFactor = getUintItem(event.params.eventData, 18)
  dto.protocolFeeAmount = getUintItem(event.params.eventData, 19)
  dto.positionFeeReceiverFactor = getUintItem(event.params.eventData, 20)
  dto.feeReceiverAmount = getUintItem(event.params.eventData, 21)
  dto.feeAmountForPool = getUintItem(event.params.eventData, 22)
  dto.positionFeeAmountForPool = getUintItem(event.params.eventData, 23)
  dto.positionFeeAmount = getUintItem(event.params.eventData, 24)
  dto.totalCostAmount = getUintItem(event.params.eventData, 25)
  dto.uiFeeReceiverFactor = getUintItem(event.params.eventData, 26)
  dto.uiFeeAmount = getUintItem(event.params.eventData, 27)

  dto.isIncrease = getBoolItem(event.params.eventData, 0)

  dto.blockNumber = event.block.number
  dto.blockTimestamp = event.block.timestamp
  dto.transactionHash = event.transaction.hash
  dto.transactionIndex = event.transaction.index
  dto.logIndex = event.logIndex

  return dto
}

export function createPositionDecrease<T extends EventLog>(event: T, linkId: Bytes): PositionDecrease {
  const eventId = getIdFromEvent(event)
  const dto = new PositionDecrease(eventId)

  dto.link = linkId

  dto.account = getAddressItem(event.params.eventData, 0)
  dto.market = getAddressItem(event.params.eventData, 1)
  dto.collateralToken = getAddressItem(event.params.eventData, 2)

  dto.sizeInUsd = getUintItem(event.params.eventData, 0)
  dto.sizeInTokens = getUintItem(event.params.eventData, 1)
  dto.collateralAmount = getUintItem(event.params.eventData, 2)
  dto.borrowingFactor = getUintItem(event.params.eventData, 3)
  dto.fundingFeeAmountPerSize = getUintItem(event.params.eventData, 4)
  dto.longTokenClaimableFundingAmountPerSize = getUintItem(event.params.eventData, 5)
  dto.shortTokenClaimableFundingAmountPerSize = getUintItem(event.params.eventData, 6)
  dto.executionPrice = getUintItem(event.params.eventData, 7)
  dto.indexTokenPriceMax = getUintItem(event.params.eventData, 8)
  dto.indexTokenPriceMin = getUintItem(event.params.eventData, 9)
  dto.collateralTokenPriceMax = getUintItem(event.params.eventData, 10)
  dto.collateralTokenPriceMin = getUintItem(event.params.eventData, 11)
  dto.sizeDeltaUsd = getUintItem(event.params.eventData, 12)
  dto.sizeDeltaInTokens = getUintItem(event.params.eventData, 13)
  dto.collateralDeltaAmount = getUintItem(event.params.eventData, 14)
  dto.valuesPriceImpactDiffUsd = getUintItem(event.params.eventData, 15)
  dto.orderType = getUintItem(event.params.eventData, 16)

  dto.priceImpactUsd = getIntItem(event.params.eventData, 0)
  dto.basePnlUsd = getIntItem(event.params.eventData, 1)
  dto.uncappedBasePnlUsd = getIntItem(event.params.eventData, 2)

  dto.isLong = getBoolItem(event.params.eventData, 0)

  dto.orderKey = getBytes32Item(event.params.eventData, 0)
  dto.positionKey = getBytes32Item(event.params.eventData, 1)

  dto.blockNumber = event.block.number
  dto.blockTimestamp = event.block.timestamp
  dto.transactionHash = event.transaction.hash
  dto.transactionIndex = event.transaction.index
  dto.logIndex = event.logIndex

  return dto
}

export function createPositionLink<T extends EventLog>(event: T, openSlot: PositionOpen): PositionLink {
  const dto = new PositionLink(openSlot.link)
  dto.key = openSlot.key

  dto.account = openSlot.account
  dto.market = openSlot.market
  dto.collateralToken = openSlot.collateralToken

  dto.isLong = openSlot.isLong

  dto.blockNumber = event.block.number
  dto.blockTimestamp = event.block.timestamp
  dto.transactionHash = event.transaction.hash
  dto.transactionIndex = event.transaction.index
  dto.logIndex = event.logIndex

  return dto
}

export function createPositionOpen<T extends EventLog>(event: T): PositionOpen {
  const eventId = getIdFromEvent(event)
  const dto = new PositionOpen(eventId)

  dto.key = getBytes32Item(event.params.eventData, 1)
  dto.link = Bytes.fromUTF8('PositionLink').concat(eventId)

  dto.account = getAddressItem(event.params.eventData, 0)
  dto.market = getAddressItem(event.params.eventData, 1)
  dto.collateralToken = getAddressItem(event.params.eventData, 2)

  dto.sizeInUsd = getUintItem(event.params.eventData, 0)
  dto.sizeInTokens = getUintItem(event.params.eventData, 1)
  dto.collateralAmount = getUintItem(event.params.eventData, 2)
  dto.realisedPnlUsd = getUintItem(event.params.eventData, 3)

  dto.cumulativeSizeUsd = getUintItem(event.params.eventData, 4)
  dto.cumulativeSizeToken = getUintItem(event.params.eventData, 5)
  dto.cumulativeFeeUsd = getUintItem(event.params.eventData, 6)

  dto.maxSizeUsd = getUintItem(event.params.eventData, 7)
  dto.maxSizeToken = getUintItem(event.params.eventData, 8)

  dto.isLong = getBoolItem(event.params.eventData, 0)
  
  dto.blockNumber = event.block.number
  dto.blockTimestamp = event.block.timestamp
  dto.transactionHash = event.transaction.hash
  dto.transactionIndex = event.transaction.index
  dto.logIndex = event.logIndex

  return dto
}

export function createPriceLatest(latestPrice: PriceLatest, interval: IntervalUnixTime, timeSlot: number): PriceCandle {
  const id = `${latestPrice.id}:${interval}:${timeSlot}`

  let candle = PriceCandle.load(id)

  if (candle) {
    if (latestPrice.value.gt(candle.h)) {
      candle.h = latestPrice.value
    }
    if (latestPrice.value.lt(candle.l)) {
      candle.l = latestPrice.value
    }
    candle.c = latestPrice.value
  } else {
    candle = new PriceCandle(id)
    candle.token = latestPrice.id
    candle.interval = interval
    candle.o = latestPrice.value
    candle.h = latestPrice.value
    candle.l = latestPrice.value
    candle.c = latestPrice.value
  }

  return candle
}



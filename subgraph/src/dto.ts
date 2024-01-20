import { Bytes, ethereum, log } from "@graphprotocol/graph-ts"
import { EventLog } from "../generated/EventEmitter/EventEmitter"
import { MarketCreated, OrderCreated, OrderStatus, PositionDecrease, PositionFeesCollected, PositionIncrease, PositionOpen, PositionSettled } from "../generated/schema"
import { MARKET_TOKEN_MAP, OrderExecutionStatus, ZERO_BI } from "./utils/const"
import { getAddressItem, getBoolItem, getBytes32Item, getIntItem, getUintItem } from "./utils/datastore"
import { getIdFromEvent } from "./utils/utils"



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

export function createOrderStatus<T extends EventLog>(event: T, order: OrderCreated, orderId: Bytes, statusType: OrderExecutionStatus, message: string = ""): OrderStatus {
  let uniqueOrderId = orderId
  const existingOrderStatus = OrderStatus.load(orderId)
  if (existingOrderStatus) {
    log.error("OrderStatus already exists for order: {}", [orderId.toHex()])
    uniqueOrderId = getIdFromEvent(event)
  }

  const orderStatus = new OrderStatus(uniqueOrderId)
  orderStatus.orderType = order.orderType
  orderStatus.order = order.id
  orderStatus.statusType = statusType
  orderStatus.message = message

  orderStatus.blockNumber = event.block.number
  orderStatus.blockTimestamp = event.block.timestamp
  orderStatus.transactionHash = event.transaction.hash
  orderStatus.logIndex = event.logIndex

  return orderStatus
}

export function createPositionIncrease<T extends EventLog>(event: T, orderStatus: OrderStatus): PositionIncrease {
  const eventId = getIdFromEvent(event)
  const positionIncrease = new PositionIncrease(eventId)

  positionIncrease.order = orderStatus.id
  positionIncrease.feeCollected = orderStatus.id

  positionIncrease.account = getAddressItem(event.params.eventData, 0)
  positionIncrease.market = getAddressItem(event.params.eventData, 1)
  positionIncrease.collateralToken = getAddressItem(event.params.eventData, 2)

  positionIncrease.sizeInUsd = getUintItem(event.params.eventData, 0)
  positionIncrease.sizeInTokens = getUintItem(event.params.eventData, 1)
  positionIncrease.collateralAmount = getUintItem(event.params.eventData, 2)
  positionIncrease.borrowingFactor = getUintItem(event.params.eventData, 3)
  positionIncrease.fundingFeeAmountPerSize = getUintItem(event.params.eventData, 4)
  positionIncrease.longTokenClaimableFundingAmountPerSize = getUintItem(event.params.eventData, 5)
  positionIncrease.shortTokenClaimableFundingAmountPerSize = getUintItem(event.params.eventData, 6)
  positionIncrease.executionPrice = getUintItem(event.params.eventData, 7)
  positionIncrease.indexTokenPriceMax = getUintItem(event.params.eventData, 8)
  positionIncrease.indexTokenPriceMin = getUintItem(event.params.eventData, 9)
  positionIncrease.collateralTokenPriceMax = getUintItem(event.params.eventData, 10)
  positionIncrease.collateralTokenPriceMin = getUintItem(event.params.eventData, 11)
  positionIncrease.sizeDeltaUsd = getUintItem(event.params.eventData, 12)
  positionIncrease.sizeDeltaInTokens = getUintItem(event.params.eventData, 13)
  positionIncrease.orderType = getUintItem(event.params.eventData, 14).toI32()

  positionIncrease.collateralDeltaAmount = getIntItem(event.params.eventData, 0)
  positionIncrease.priceImpactUsd = getIntItem(event.params.eventData, 1)
  positionIncrease.priceImpactAmount = getIntItem(event.params.eventData, 2)

  positionIncrease.isLong = getBoolItem(event.params.eventData, 0)

  positionIncrease.orderKey = getBytes32Item(event.params.eventData, 0)
  positionIncrease.positionKey = getBytes32Item(event.params.eventData, 1)

  positionIncrease.blockNumber = event.block.number
  positionIncrease.blockTimestamp = event.block.timestamp
  positionIncrease.transactionHash = event.transaction.hash
  // dto.transactionIndex = event.transaction.index
  positionIncrease.logIndex = event.logIndex


  return positionIncrease
}

export function createPositionDecrease<T extends EventLog>(event: T, orderStatus: OrderStatus): PositionDecrease {
  const eventId = getIdFromEvent(event)
  const positionDecrease = new PositionDecrease(eventId)

  positionDecrease.order = orderStatus.id
  positionDecrease.feeCollected = orderStatus.id

  positionDecrease.account = getAddressItem(event.params.eventData, 0)
  positionDecrease.market = getAddressItem(event.params.eventData, 1)
  positionDecrease.collateralToken = getAddressItem(event.params.eventData, 2)

  positionDecrease.sizeInUsd = getUintItem(event.params.eventData, 0)
  positionDecrease.sizeInTokens = getUintItem(event.params.eventData, 1)
  positionDecrease.collateralAmount = getUintItem(event.params.eventData, 2)
  positionDecrease.borrowingFactor = getUintItem(event.params.eventData, 3)
  positionDecrease.fundingFeeAmountPerSize = getUintItem(event.params.eventData, 4)
  positionDecrease.longTokenClaimableFundingAmountPerSize = getUintItem(event.params.eventData, 5)
  positionDecrease.shortTokenClaimableFundingAmountPerSize = getUintItem(event.params.eventData, 6)
  positionDecrease.executionPrice = getUintItem(event.params.eventData, 7)
  positionDecrease.indexTokenPriceMax = getUintItem(event.params.eventData, 8)
  positionDecrease.indexTokenPriceMin = getUintItem(event.params.eventData, 9)
  positionDecrease.collateralTokenPriceMax = getUintItem(event.params.eventData, 10)
  positionDecrease.collateralTokenPriceMin = getUintItem(event.params.eventData, 11)
  positionDecrease.sizeDeltaUsd = getUintItem(event.params.eventData, 12)
  positionDecrease.sizeDeltaInTokens = getUintItem(event.params.eventData, 13)
  positionDecrease.collateralDeltaAmount = getUintItem(event.params.eventData, 14)
  positionDecrease.valuesPriceImpactDiffUsd = getUintItem(event.params.eventData, 15)
  positionDecrease.orderType = getUintItem(event.params.eventData, 16).toI32()

  positionDecrease.priceImpactUsd = getIntItem(event.params.eventData, 0)
  positionDecrease.basePnlUsd = getIntItem(event.params.eventData, 1)
  positionDecrease.uncappedBasePnlUsd = getIntItem(event.params.eventData, 2)

  positionDecrease.isLong = getBoolItem(event.params.eventData, 0)

  positionDecrease.orderKey = getBytes32Item(event.params.eventData, 0)
  positionDecrease.positionKey = getBytes32Item(event.params.eventData, 1)

  positionDecrease.blockNumber = event.block.number
  positionDecrease.blockTimestamp = event.block.timestamp
  positionDecrease.transactionHash = event.transaction.hash
  // dto.transactionIndex = event.transaction.index
  positionDecrease.logIndex = event.logIndex


  return positionDecrease
}

export function createPositionFeesCollected<T extends EventLog>(event: T): PositionFeesCollected {
  const orderKey = getBytes32Item(event.params.eventData, 0)
  const dto = new PositionFeesCollected(orderKey)
  
  dto.orderKey = orderKey
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
  // dto.transactionIndex = event.transaction.index
  dto.logIndex = event.logIndex

  return dto
}

export function initPositionOpen(event: ethereum.Event, positionIncrease: PositionIncrease): PositionOpen {
  const dto = new PositionOpen(positionIncrease.positionKey.toHex())

  dto.link = positionIncrease.orderKey
  dto.key = positionIncrease.positionKey

  dto.account = positionIncrease.account
  dto.market = positionIncrease.market
  dto.collateralToken = positionIncrease.collateralToken
  dto.indexToken = MARKET_TOKEN_MAP.get(positionIncrease.market.toHex())

  dto.cumulativeSizeUsd = ZERO_BI
  dto.cumulativeSizeToken = ZERO_BI
  dto.cumulativeCollateralUsd = ZERO_BI
  dto.cumulativeCollateralToken = ZERO_BI

  dto.maxSizeUsd = ZERO_BI
  dto.maxSizeToken = ZERO_BI
  dto.maxCollateralToken = ZERO_BI
  dto.maxCollateralUsd = ZERO_BI

  dto.isLong = positionIncrease.isLong

  dto.realisedPnlUsd = ZERO_BI
  
  dto.blockNumber = event.block.number
  dto.blockTimestamp = event.block.timestamp
  dto.transactionHash = event.block.hash
  // dto.transactionIndex = orderCreated.transactionIndex
  dto.logIndex = event.logIndex

  return dto
}

export function createPositionSettled<T extends EventLog>(event: T, openPosition: PositionOpen, id: Bytes): PositionSettled {
  const dto = new PositionSettled(id)

  dto.link = openPosition.link
  dto.key = openPosition.key

  dto.account = openPosition.account
  dto.market = openPosition.market
  dto.collateralToken = openPosition.collateralToken
  dto.indexToken = openPosition.indexToken

  dto.sizeInUsd = openPosition.sizeInUsd
  dto.sizeInTokens = openPosition.sizeInTokens
  dto.collateralAmount = openPosition.collateralAmount
  dto.realisedPnlUsd = openPosition.realisedPnlUsd

  dto.cumulativeSizeUsd = openPosition.cumulativeSizeUsd
  dto.cumulativeSizeToken = openPosition.cumulativeSizeToken
  dto.cumulativeCollateralUsd = openPosition.cumulativeCollateralUsd
  dto.cumulativeCollateralToken = openPosition.cumulativeCollateralToken

  dto.maxSizeUsd = openPosition.maxSizeUsd
  dto.maxSizeToken = openPosition.maxSizeToken
  dto.maxCollateralToken = openPosition.maxCollateralToken
  dto.maxCollateralUsd = openPosition.maxCollateralUsd

  dto.isLong = openPosition.isLong

  dto.realisedPnlUsd = openPosition.realisedPnlUsd

  dto.blockNumber = event.block.number
  dto.blockTimestamp = event.block.timestamp
  dto.transactionHash = event.transaction.hash
  // dto.transactionIndex = event.transaction.index
  dto.logIndex = event.logIndex

  return dto
}


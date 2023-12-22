import { Bytes, BigInt, log } from "@graphprotocol/graph-ts"

import { EventLog, EventLog1, EventLog2, EventLogEventDataStruct } from "../generated/EventEmitter/EventEmitter"
import { Transfer } from "../generated/templates/MarketTokenTemplate/MarketToken"
import { MarketTokenTemplate } from "../generated/templates"
import { ClaimRef, DepositRef, MarketInfo, Order } from "../generated/schema"
import { BatchSend } from "../generated/BatchSender/BatchSender"
import { SellUSDG } from "../generated/Vault/Vault"

import {
  saveClaimableFundingFeeInfo as handleClaimableFundingUpdated,
  handleCollateralClaimAction,
  isFundingFeeSettleOrder,
  saveClaimActionOnOrderCancelled,
  saveClaimActionOnOrderCreated,
  saveClaimActionOnOrderExecuted
} from "./entities/claims"
import { getIdFromEvent, getOrCreateTransaction } from "./entities/common"
import {
  getSwapActionByFeeType,
  handlePositionImpactPoolDistributed,
  saveCollectedMarketFees,
  savePositionFeesInfo,
  savePositionFeesInfoWithPeriod,
  saveSwapFeesInfo,
  saveSwapFeesInfoWithPeriod
} from "./entities/fees"
import { getMarketInfo, saveMarketInfo, saveMarketInfoTokensSupply } from "./entities/markets"
import {
  orderTypes,
  saveOrder,
  saveOrderCancelledState,
  saveOrderCollateralAutoUpdate,
  saveOrderExecutedState,
  saveOrderFrozenState,
  saveOrderSizeDeltaAutoUpdate,
  saveOrderUpdate
} from "./entities/orders"
import { savePositionDecrease, savePositionIncrease } from "./entities/positions"
import { getTokenPrice, handleOraclePriceUpdate } from "./entities/prices"
import { handleSwapInfo as saveSwapInfo } from "./entities/swaps"
import {
  saveOrderCancelledTradeAction,
  saveOrderCreatedTradeAction,
  saveOrderFrozenTradeAction,
  saveOrderUpdatedTradeAction,
  savePositionDecreaseExecutedTradeAction,
  savePositionIncreaseExecutedTradeAction,
  saveSwapExecutedTradeAction
} from "./entities/trades"
import { savePositionVolumeInfo, saveSwapVolumeInfo, saveVolumeInfo } from "./entities/volume"
import { EventData } from "./utils/eventData"
import { saveUserStat } from "./entities/user"
import {
  saveLiquidityProviderIncentivesStat,
  saveMarketIncentivesStat,
  saveUserGlpGmMigrationStatGlpData,
  saveUserGlpGmMigrationStatGmData,
  saveUserMarketInfo
} from "./entities/incentives/liquidityIncentives"
import { saveDistribution } from "./entities/distributions"
import { getMarketPoolValueFromContract } from "./contracts/getMarketPoolValueFromContract"
import { saveUserGmTokensBalanceChange } from "./entities/userBalance"
import { getMarketTokensSupplyFromContract } from "./contracts/getMarketTokensSupplyFromContract"
import { saveTradingIncentivesStat } from "./entities/incentives/tradingIncentives"

const ADDRESS_ZERO = "0x0000000000000000000000000000000000000000"

export function handleSellUSDG(event: SellUSDG): void {
  saveUserGlpGmMigrationStatGlpData(
    event.params.account.toHexString(),
    event.block.timestamp.toI32(),
    event.params.usdgAmount,
    event.params.feeBasisPoints
  )
}

export function handleBatchSend(event: BatchSend): void {
  const typeId = event.params.typeId
  const token = event.params.token.toHexString()
  const receivers = event.params.accounts
  const amounts = event.params.amounts
  for (let i = 0; i < event.params.accounts.length; i++) {
    const receiver = receivers[i].toHexString()
    saveDistribution(
      receiver,
      token,
      amounts[i],
      typeId.toI32(),
      event.transaction.hash.toHexString(),
      event.block.number.toI32(),
      event.block.timestamp.toI32()
    )
  }
}

export function handleMarketTokenTransfer(event: Transfer): void {
  const marketAddress = event.address.toHexString()
  const from = event.params.from.toHexString()
  const to = event.params.to.toHexString()
  const value = event.params.value

  // `from` user redeems or transfers out GM tokens
  if (from != ADDRESS_ZERO) {
    // LiquidityProviderIncentivesStat *should* be updated before UserMarketInfo
    saveLiquidityProviderIncentivesStat(from, marketAddress, "1w", value.neg(), event.block.timestamp.toI32())
    saveUserMarketInfo(from, marketAddress, value.neg())
    const transaction = getOrCreateTransaction(event)
    saveUserGmTokensBalanceChange(from, marketAddress, value.neg(), transaction, event.logIndex)
  }

  // `to` user receives GM tokens
  if (to != ADDRESS_ZERO) {
    // LiquidityProviderIncentivesStat *should* be updated before UserMarketInfo
    saveLiquidityProviderIncentivesStat(to, marketAddress, "1w", value, event.block.timestamp.toI32())
    saveUserMarketInfo(to, marketAddress, value)
    const transaction = getOrCreateTransaction(event)
    saveUserGmTokensBalanceChange(to, marketAddress, value, transaction, event.logIndex)
  }

  if (from == ADDRESS_ZERO) {
    saveMarketInfoTokensSupply(marketAddress, value)
  }

  if (to == ADDRESS_ZERO) {
    saveMarketInfoTokensSupply(marketAddress, value.neg())
  }
}

export function handleEventLog(event: EventLog): void {
  const eventName = event.params.eventName
  const eventData = new EventData(event.params.eventData as EventLogEventDataStruct)

  if (eventName == "DepositExecuted") {
    handleDepositExecuted(event as EventLog2, eventData)
    return
  }
}

function handleEventLog1(event: EventLog1, network: string): void {
  const eventName = event.params.eventName
  const eventData = new EventData(event.params.eventData as EventLogEventDataStruct)
  const eventId = getIdFromEvent(event)

  event.params.eventData.addressItems.items[0].value

  if (eventName == "MarketCreated") {
    saveMarketInfo(eventData)
    MarketTokenTemplate.create(eventData.getAddressItem("marketToken")!)
    return
  }

  if (eventName == "DepositCreated") {
    handleDepositCreated(event as EventLog2, eventData)
    return
  }

  if (eventName == "WithdrawalCreated") {
    const transaction = getOrCreateTransaction(event)
    const account = eventData.getAddressItemString("account")!
    saveUserStat("withdrawal", account, transaction.timestamp)
    return
  }

  if (eventName == "OrderExecuted") {
    const transaction = getOrCreateTransaction(event)
    const order = saveOrderExecutedState(eventData, transaction)

    if (order == null) {
      return
    }

    if (order.orderType == orderTypes.get("MarketSwap") || order.orderType == orderTypes.get("LimitSwap")) {
      saveSwapExecutedTradeAction(eventId, order as Order, transaction)
    } else if (
      order.orderType == orderTypes.get("MarketIncrease") ||
      order.orderType == orderTypes.get("LimitIncrease")
    ) {
      savePositionIncreaseExecutedTradeAction(eventId, order as Order, transaction)
    } else if (
      order.orderType == orderTypes.get("MarketDecrease") ||
      order.orderType == orderTypes.get("LimitDecrease") ||
      order.orderType == orderTypes.get("StopLossDecrease") ||
      order.orderType == orderTypes.get("Liquidation")
    ) {
      savePositionDecreaseExecutedTradeAction(eventId, order as Order, transaction)
    }
    return
  }

  if (eventName == "OrderCancelled") {
    const transaction = getOrCreateTransaction(event)
    const order = saveOrderCancelledState(eventData, transaction)
    if (order !== null) {
      saveOrderCancelledTradeAction(
        eventId,
        order as Order,
        order.cancelledReason as string,
        order.cancelledReasonBytes as Bytes,
        transaction
      )
    }

    return
  }

  if (eventName == "OrderUpdated") {
    const transaction = getOrCreateTransaction(event)
    const order = saveOrderUpdate(eventData)
    if (order !== null) {
      saveOrderUpdatedTradeAction(eventId, order as Order, transaction)
    }

    return
  }

  if (eventName == "OrderFrozen") {
    const transaction = getOrCreateTransaction(event)
    const order = saveOrderFrozenState(eventData)

    if (order == null) {
      return
    }

    saveOrderFrozenTradeAction(
      eventId,
      order as Order,
      order.frozenReason as string,
      order.frozenReasonBytes as Bytes,
      transaction
    )
    return
  }

  if (eventName == "OrderSizeDeltaAutoUpdated") {
    saveOrderSizeDeltaAutoUpdate(eventData)
    return
  }

  if (eventName == "OrderCollateralDeltaAmountAutoUpdated") {
    saveOrderCollateralAutoUpdate(eventData)
    return
  }

  if (eventName == "SwapInfo") {
    const transaction = getOrCreateTransaction(event)
    const tokenIn = eventData.getAddressItemString("tokenIn")!
    const tokenOut = eventData.getAddressItemString("tokenOut")!
    const amountIn = eventData.getUintItem("amountIn")!
    const tokenInPrice = eventData.getUintItem("tokenInPrice")!
    const volumeUsd = amountIn!.times(tokenInPrice!)
    const receiver = eventData.getAddressItemString("receiver")!

    saveSwapInfo(eventData, transaction)
    saveSwapVolumeInfo(transaction.timestamp, tokenIn, tokenOut, volumeUsd)
    saveUserStat("swap", receiver, transaction.timestamp)
    return
  }

  if (eventName == "SwapFeesCollected") {
    const transaction = getOrCreateTransaction(event)
    const swapFeesInfo = saveSwapFeesInfo(eventData, eventId, transaction)
    const tokenPrice = eventData.getUintItem("tokenPrice")!
    const feeReceiverAmount = eventData.getUintItem("feeReceiverAmount")!
    const feeAmountForPool = eventData.getUintItem("feeAmountForPool")!
    const amountAfterFees = eventData.getUintItem("amountAfterFees")!
    const action = getSwapActionByFeeType(swapFeesInfo.swapFeeType)
    const totalAmountIn = amountAfterFees.plus(feeAmountForPool).plus(feeReceiverAmount)
    const volumeUsd = totalAmountIn.times(tokenPrice)
    const poolValue = getMarketPoolValueFromContract(swapFeesInfo.marketAddress, network, transaction)
    // only deposits and withdrawals affect marketTokensSupply, for others we may use cached value
    // be aware: getMarketTokensSupplyFromContract returns value by block number, i.e. latest value in block
    const marketTokensSupply = isDepositOrWithdrawalAction(action)
      ? getMarketTokensSupplyFromContract(swapFeesInfo.marketAddress)
      : getMarketInfo(swapFeesInfo.marketAddress).marketTokensSupply

    saveCollectedMarketFees(
      transaction,
      swapFeesInfo.marketAddress,
      poolValue,
      swapFeesInfo.feeUsdForPool,
      marketTokensSupply
    )
    saveVolumeInfo(action, transaction.timestamp, volumeUsd)
    saveSwapFeesInfoWithPeriod(feeAmountForPool, feeReceiverAmount, tokenPrice, transaction.timestamp)
    return
  }

  // Only for liquidations if remaining collateral is not sufficient to pay the fees
  if (eventName == "PositionFeesInfo") {
    const transaction = getOrCreateTransaction(event)
    savePositionFeesInfo(eventData, "PositionFeesInfo", transaction)

    return
  }

  if (eventName == "PositionFeesCollected") {
    const transaction = getOrCreateTransaction(event)
    const positionFeeAmount = eventData.getUintItem("positionFeeAmount")!
    const positionFeeAmountForPool = eventData.getUintItem("positionFeeAmountForPool")!
    const collateralTokenPriceMin = eventData.getUintItem("collateralTokenPrice.min")!
    const borrowingFeeUsd = eventData.getUintItem("borrowingFeeUsd")!
    const positionFeesInfo = savePositionFeesInfo(eventData, "PositionFeesCollected", transaction)
    const poolValue = getMarketPoolValueFromContract(positionFeesInfo.marketAddress, network, transaction)
    const marketInfo = getMarketInfo(positionFeesInfo.marketAddress)

    saveCollectedMarketFees(
      transaction,
      positionFeesInfo.marketAddress,
      poolValue,
      positionFeesInfo.feeUsdForPool,
      marketInfo.marketTokensSupply
    )
    savePositionFeesInfoWithPeriod(
      positionFeeAmount,
      positionFeeAmountForPool,
      borrowingFeeUsd,
      collateralTokenPriceMin,
      transaction.timestamp
    )

    saveTradingIncentivesStat(
      eventData.getAddressItemString("trader")!,
      event.block.timestamp.toI32(),
      positionFeeAmount,
      collateralTokenPriceMin
    )
    return
  }

  if (eventName == "PositionIncrease") {
    const transaction = getOrCreateTransaction(event)
    const collateralToken = eventData.getAddressItemString("collateralToken")!
    const marketToken = eventData.getAddressItemString("market")!
    const sizeDeltaUsd = eventData.getUintItem("sizeDeltaUsd")!
    const account = eventData.getAddressItemString("account")!

    savePositionIncrease(eventData, transaction)
    saveVolumeInfo("margin", transaction.timestamp, sizeDeltaUsd)
    savePositionVolumeInfo(transaction.timestamp, collateralToken, marketToken, sizeDeltaUsd)
    saveUserStat("margin", account, transaction.timestamp)
    return
  }

  if (eventName == "PositionDecrease") {
    const transaction = getOrCreateTransaction(event)
    const collateralToken = eventData.getAddressItemString("collateralToken")!
    const marketToken = eventData.getAddressItemString("market")!
    const sizeDeltaUsd = eventData.getUintItem("sizeDeltaUsd")!
    const account = eventData.getAddressItemString("account")!

    savePositionDecrease(eventData, transaction)
    saveVolumeInfo("margin", transaction.timestamp, sizeDeltaUsd)
    savePositionVolumeInfo(transaction.timestamp, collateralToken, marketToken, sizeDeltaUsd)
    saveUserStat("margin", account, transaction.timestamp)
    return
  }

  if (eventName == "FundingFeesClaimed") {
    const transaction = getOrCreateTransaction(event)
    handleCollateralClaimAction("ClaimFunding", eventData, transaction)
    return
  }

  if (eventName == "CollateralClaimed") {
    const transaction = getOrCreateTransaction(event)
    handleCollateralClaimAction("ClaimPriceImpactFee", eventData, transaction)
    return
  }

  if (eventName == "ClaimableFundingUpdated") {
    const transaction = getOrCreateTransaction(event)
    handleClaimableFundingUpdated(eventData, transaction)
    return
  }

  if (eventName == "MarketPoolValueUpdated") {
    // `saveMarketIncentivesStat should be called before `MarketPoolInfo` entity is updated
    saveMarketIncentivesStat(eventData, event)
    return
  }

  if (eventName == "PositionImpactPoolDistributed") {
    const transaction = getOrCreateTransaction(event)
    handlePositionImpactPoolDistributed(eventData, transaction, network)
    return
  }

  if (eventName == "OraclePriceUpdate") {
    handleOraclePriceUpdate(eventData)
    return
  }
}

function handleEventLog2(event: EventLog2, network: string): void {
  const eventName = event.params.eventName
  const eventData = new EventData(event.params.eventData as EventLogEventDataStruct)
  const eventId = getIdFromEvent(event)

  if (eventName == "OrderCreated") {
    const transaction = getOrCreateTransaction(event)
    const order = saveOrder(eventData, transaction)
    if (isFundingFeeSettleOrder(order)) {
      saveClaimActionOnOrderCreated(transaction, eventData)
    } else {
      saveOrderCreatedTradeAction(eventId, order, transaction)
    }
    return
  }

  if (eventName == "DepositCreated") {
    handleDepositCreated(event, eventData)
    return
  }

  if (eventName == "DepositExecuted") {
    handleDepositExecuted(event, eventData)
    return
  }

  if (eventName == "WithdrawalCreated") {
    const transaction = getOrCreateTransaction(event)
    const account = eventData.getAddressItemString("account")!
    saveUserStat("withdrawal", account, transaction.timestamp)
    return
  }

  if (eventName == "OrderExecuted") {
    const transaction = getOrCreateTransaction(event)
    const order = saveOrderExecutedState(eventData, transaction)

    if (order == null) {
      return
    }

    if (order.orderType == orderTypes.get("MarketSwap") || order.orderType == orderTypes.get("LimitSwap")) {
      saveSwapExecutedTradeAction(eventId, order as Order, transaction)
    } else if (
      order.orderType == orderTypes.get("MarketIncrease") ||
      order.orderType == orderTypes.get("LimitIncrease")
    ) {
      savePositionIncreaseExecutedTradeAction(eventId, order as Order, transaction)
    } else if (
      order.orderType == orderTypes.get("MarketDecrease") ||
      order.orderType == orderTypes.get("LimitDecrease") ||
      order.orderType == orderTypes.get("StopLossDecrease") ||
      order.orderType == orderTypes.get("Liquidation")
    ) {
      if (ClaimRef.load(order.id)) {
        saveClaimActionOnOrderExecuted(transaction, eventData)
      } else {
        savePositionDecreaseExecutedTradeAction(eventId, order as Order, transaction)
      }
    }
    return
  }

  if (eventName == "OrderCancelled") {
    const transaction = getOrCreateTransaction(event)
    const order = saveOrderCancelledState(eventData, transaction)
    if (order !== null) {
      if (ClaimRef.load(order.id)) {
        saveClaimActionOnOrderCancelled(transaction, eventData)
      } else {
        saveOrderCancelledTradeAction(
          eventId,
          order!,
          order.cancelledReason as string,
          order.cancelledReasonBytes as Bytes,
          transaction
        )
      }
    }

    return
  }

  if (eventName == "OrderUpdated") {
    const transaction = getOrCreateTransaction(event)
    const order = saveOrderUpdate(eventData)
    if (order !== null) {
      saveOrderUpdatedTradeAction(eventId, order as Order, transaction)
    }

    return
  }

  if (eventName == "OrderFrozen") {
    const transaction = getOrCreateTransaction(event)
    const order = saveOrderFrozenState(eventData)

    if (order == null) {
      return
    }

    saveOrderFrozenTradeAction(
      eventId,
      order as Order,
      order.frozenReason as string,
      order.frozenReasonBytes as Bytes,
      transaction
    )
    return
  }
}

function isDepositOrWithdrawalAction(action: string): boolean {
  return action == "deposit" || action == "withdrawal"
}

function handleDepositCreated(event: EventLog2, eventData: EventData): void {
  const transaction = getOrCreateTransaction(event)
  const account = eventData.getAddressItemString("account")!
  saveUserStat("deposit", account, transaction.timestamp)

  const depositRef = new DepositRef(eventData.getBytes32Item("key")!.toHexString())
  depositRef.marketAddress = eventData.getAddressItemString("market")!

  // old DepositCreated event does not contain "account"
  depositRef.account = eventData.getAddressItemString("account")!
  depositRef.save()
}

function handleDepositExecuted(event: EventLog2, eventData: EventData): void {
  const key = eventData.getBytes32Item("key")!.toHexString()
  const depositRef = DepositRef.load(key)!
  const marketInfo = MarketInfo.load(depositRef.marketAddress)!

  const longTokenAmount = eventData.getUintItem("longTokenAmount")!
  const longTokenPrice = getTokenPrice(marketInfo.longToken)!

  const shortTokenAmount = eventData.getUintItem("shortTokenAmount")!
  const shortTokenPrice = getTokenPrice(marketInfo.shortToken)!

  const depositUsd = longTokenAmount.times(longTokenPrice).plus(shortTokenAmount.times(shortTokenPrice))
  saveUserGlpGmMigrationStatGmData(depositRef.account, event.block.timestamp.toI32(), depositUsd)
}

export function handleEventLog1Arbitrum(event: EventLog1): void {
  handleEventLog1(event, "arbitrum")
}

export function handleEventLog1Goerli(event: EventLog1): void {
  handleEventLog1(event, "goerli")
}

export function handleEventLog1Avalanche(event: EventLog1): void {
  handleEventLog1(event, "avalanche")
}

export function handleEventLog1Fuji(event: EventLog1): void {
  handleEventLog1(event, "fuji")
}

export function handleEventLog2Arbitrum(event: EventLog2): void {
  handleEventLog2(event, "arbitrum")
}

export function handleEventLog2Goerli(event: EventLog2): void {
  handleEventLog2(event, "goerli")
}

export function handleEventLog2Avalanche(event: EventLog2): void {
  handleEventLog2(event, "avalanche")
}

export function handleEventLog2Fuji(event: EventLog2): void {
  handleEventLog2(event, "fuji")
}

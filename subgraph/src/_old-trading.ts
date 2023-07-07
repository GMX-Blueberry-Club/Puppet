import { Address, Bytes } from "@graphprotocol/graph-ts"
import * as vault from "../generated/Vault/Vault"
import * as vaultPricefeed from "../generated/Vault/VaultPricefeed"
import * as positionRouter from "../generated/PositionRouter/PositionRouter"
import * as orchestrator from "../generated/Orchestrator/Orchestrator"

import {
  PositionAdjustment,
  PositionAdjustmentRequestExecution,
  PositionSettled,
  PositionSlot,
  PositionUpdate,
  PositionLink,
} from "../generated/schema"

import { getEventOrderIdentifier, getUniqueEventId, ZERO_BI } from "./helpers"

const referralStorageAddress = Address.fromString("0xe6fab3F0c7199b0d34d7FbE83394fc0e0D06e99d")
const vaultPricefeedAddress = Address.fromString("0x2d68011bcA022ed0E474264145F46CC4de96a002")




const getPositionLinkId = (id: i32, key: Bytes): Bytes => {
  return Bytes.fromUTF8('PositionLink')
    .concatI32(id)
    .concat(key)
}





export function handleIncreasePosition(event: vault.IncreasePosition): void {
  const key = event.params.key

  let positionSlot = PositionSlot.load(key)

  // init slot
  if (positionSlot === null) {
    positionSlot = new PositionSlot(key)

    positionSlot.account = event.params.account
    positionSlot.collateralToken = event.params.collateralToken
    positionSlot.indexToken = event.params.indexToken
    positionSlot.isLong = event.params.isLong
    positionSlot.key = key

    _resetPositionSlot(positionSlot)
  }

  const countId = positionSlot.size.equals(ZERO_BI) ? positionSlot.idCount + 1 : positionSlot.idCount
  const PositionLinkId = getPositionLinkId(countId, event.params.key)

  // positionSlot.link = PositionLinkId
  positionSlot.idCount = countId
  positionSlot.collateral = positionSlot.collateral.plus(event.params.collateralDelta)
  positionSlot.size = positionSlot.size.plus(event.params.sizeDelta)
  positionSlot.cumulativeCollateral = positionSlot.size.plus(event.params.collateralDelta)
  positionSlot.cumulativeSize = positionSlot.size.plus(event.params.sizeDelta)
  positionSlot.cumulativeFee = positionSlot.cumulativeFee.plus(event.params.fee)


  const PositionLink = new PositionLink(PositionLinkId)

  PositionLink.account = event.params.account
  PositionLink.collateralToken = event.params.collateralToken
  PositionLink.indexToken = event.params.indexToken
  PositionLink.isLong = event.params.isLong
  PositionLink.key = key

  PositionLink.blockTimestamp = event.block.timestamp
  PositionLink.blockNumber = event.block.number
  PositionLink.transactionHash = event.transaction.hash


  const positionAdjustment = new PositionAdjustment(getUniqueEventId(event))

  positionAdjustment.isIncrease = true
  positionAdjustment.account = event.params.account
  positionAdjustment.collateralToken = event.params.collateralToken
  positionAdjustment.indexToken = event.params.indexToken
  positionAdjustment.isLong = event.params.isLong
  positionAdjustment.key = key

  positionAdjustment.blockTimestamp = event.block.timestamp
  positionAdjustment.blockNumber = event.block.number
  positionAdjustment.transactionHash = event.transaction.hash

  positionAdjustment.collateralDelta = event.params.collateralDelta
  positionAdjustment.sizeDelta = event.params.sizeDelta
  positionAdjustment.price = event.params.price
  positionAdjustment.fee = event.params.fee
  positionAdjustment.trade = PositionLinkId


  PositionLink.save()
  positionAdjustment.save()
  positionSlot.save()
}

export function handleDecreasePosition(event: vault.DecreasePosition): void {
  const positionSlot = PositionSlot.load(event.params.key)

  if (positionSlot === null) {
    return
    // throw new Error("PositionLink is null")
  }

  const PositionLinkId = getPositionLinkId(positionSlot.idCount, event.params.key)
  const adjustPosition = new PositionAdjustment(getUniqueEventId(event))
  adjustPosition.trade = PositionLinkId
  adjustPosition.account = event.params.account

  adjustPosition.collateralToken = event.params.collateralToken
  adjustPosition.indexToken = event.params.indexToken
  adjustPosition.isLong = event.params.isLong
  adjustPosition.key = event.params.key
  adjustPosition.isIncrease = true

  adjustPosition.collateralDelta = event.params.collateralDelta
  adjustPosition.sizeDelta = event.params.sizeDelta
  adjustPosition.price = event.params.price
  adjustPosition.fee = event.params.fee

  adjustPosition.blockTimestamp = event.block.timestamp
  adjustPosition.blockNumber = event.block.number
  adjustPosition.transactionHash = event.transaction.hash

  adjustPosition.save()

}

export function handleUpdatePosition(event: vault.UpdatePosition): void {
  const positionSlot = PositionSlot.load(event.params.key)

  if (positionSlot === null) {
    return
  }

  const PositionLinkId = getPositionLinkId(positionSlot.idCount, event.params.key)

  const positionUpdate = new PositionUpdate(getUniqueEventId(event))
  positionUpdate.trade = PositionLinkId

  positionUpdate.key = event.params.key

  positionUpdate.size = event.params.size
  positionUpdate.collateral = event.params.collateral

  positionUpdate.reserveAmount = event.params.reserveAmount
  positionUpdate.realisedPnl = event.params.realisedPnl
  positionUpdate.averagePrice = event.params.averagePrice
  positionUpdate.entryFundingRate = event.params.entryFundingRate
  positionUpdate.markPrice = vaultPricefeed.VaultPricefeed.bind(vaultPricefeedAddress).getPrimaryPrice(Address.fromBytes(positionSlot.indexToken), false)

  positionUpdate.blockTimestamp = event.block.timestamp
  positionUpdate.blockNumber = event.block.number
  positionUpdate.transactionHash = event.transaction.hash

  positionSlot.collateral = positionUpdate.collateral
  positionSlot.realisedPnl = positionUpdate.realisedPnl
  positionSlot.averagePrice = positionUpdate.averagePrice
  positionSlot.size = positionUpdate.size
  positionSlot.maxCollateral = positionUpdate.collateral > positionSlot.collateral ? positionUpdate.collateral : positionSlot.maxCollateral
  positionSlot.maxSize = positionUpdate.size > positionSlot.maxSize ? positionUpdate.size : positionSlot.maxSize



  positionSlot.save()
  positionUpdate.save()
}

export function handleClosePosition(event: vault.ClosePosition): void {
  const positionSlot = PositionSlot.load(event.params.key)

  if (positionSlot === null) {
    return
    // throw new Error("PositionLink is null")
  }


  const positionSettled = new PositionSettled(getUniqueEventId(event))
  positionSettled.idCount = positionSlot.idCount
  positionSettled.link = positionSlot.link

  positionSettled.account = positionSlot.account
  positionSettled.collateralToken = positionSlot.collateralToken
  positionSettled.indexToken = positionSlot.indexToken
  positionSettled.isLong = positionSlot.isLong
  positionSettled.key = positionSlot.key

  positionSettled.collateral = positionSlot.collateral
  positionSettled.size = positionSlot.size
  positionSettled.averagePrice = positionSlot.averagePrice
  positionSettled.entryFundingRate = positionSlot.entryFundingRate
  positionSettled.realisedPnl = event.params.realisedPnl
  positionSettled.reserveAmount = event.params.reserveAmount

  positionSettled.cumulativeCollateral = positionSlot.cumulativeCollateral
  positionSettled.cumulativeSize = positionSlot.cumulativeSize
  positionSettled.cumulativeFee = positionSlot.cumulativeFee

  positionSettled.maxCollateral = positionSlot.maxCollateral
  positionSettled.maxSize = positionSlot.maxSize

  positionSettled.markPrice = vaultPricefeed.VaultPricefeed.bind(vaultPricefeedAddress).getPrimaryPrice(Address.fromBytes(positionSlot.indexToken), false)
  positionSettled.isLiquidated = false

  positionSettled.blockTimestamp = event.block.timestamp
  positionSettled.blockNumber = event.block.number
  positionSettled.transactionHash = event.transaction.hash

  _resetPositionSlot(positionSlot)

  positionSettled.save()
  positionSlot.save()
}

export function handleLiquidatePosition(event: vault.LiquidatePosition): void {
  const positionSlot = PositionSlot.load(event.params.key)

  if (positionSlot === null) {
    return
    // throw new Error("PositionLink is null")
  }



  const positionSettled = new PositionSettled(getUniqueEventId(event))
  positionSettled.idCount = positionSlot.idCount
  positionSettled.link = positionSlot.link

  positionSettled.account = positionSlot.account
  positionSettled.collateralToken = positionSlot.collateralToken
  positionSettled.indexToken = positionSlot.indexToken
  positionSettled.isLong = positionSlot.isLong
  positionSettled.key = positionSlot.key

  positionSettled.collateral = positionSlot.collateral
  positionSettled.size = positionSlot.size
  positionSettled.averagePrice = positionSlot.averagePrice
  positionSettled.entryFundingRate = positionSlot.entryFundingRate
  positionSettled.realisedPnl = event.params.realisedPnl
  positionSettled.reserveAmount = event.params.reserveAmount

  positionSettled.cumulativeCollateral = positionSlot.cumulativeCollateral
  positionSettled.cumulativeSize = positionSlot.cumulativeSize
  positionSettled.cumulativeFee = positionSlot.cumulativeFee

  positionSettled.maxCollateral = positionSlot.maxCollateral
  positionSettled.maxSize = positionSlot.maxSize

  positionSettled.markPrice = event.params.markPrice
  positionSettled.isLiquidated = true

  positionSettled.blockTimestamp = event.block.timestamp
  positionSettled.blockNumber = event.block.number
  positionSettled.transactionHash = event.transaction.hash

  _resetPositionSlot(positionSlot)

  positionSettled.save()
  positionSlot.save()

}




function _resetPositionSlot(positionSlot: PositionSlot): PositionSlot {

  positionSlot.collateral = ZERO_BI
  positionSlot.size = ZERO_BI
  positionSlot.averagePrice = ZERO_BI
  positionSlot.entryFundingRate = ZERO_BI
  positionSlot.realisedPnl = ZERO_BI

  positionSlot.cumulativeCollateral = ZERO_BI
  positionSlot.cumulativeSize = ZERO_BI
  positionSlot.cumulativeFee = ZERO_BI

  positionSlot.maxCollateral = ZERO_BI
  positionSlot.maxSize = ZERO_BI

  return positionSlot
}



import { newMockEvent } from "matchstick-as"
import { ethereum, Address, Bytes, BigInt } from "@graphprotocol/graph-ts"
import {
  AdjustPosition,
  AdjustTargetLeverage,
  AuthorityUpdated,
  CreditPlatform,
  CreditPuppet,
  DebitPuppet,
  Deposit,
  ExecutePosition,
  Initialize,
  LiquidatePosition,
  OpenPosition,
  OwnershipTransferred,
  Pause,
  RegisterRouteAccount,
  RescueRouteFunds,
  SetFees,
  SetFeesRecipient,
  SetRouteType,
  SetThrottleLimit,
  SharesIncrease,
  SubscribeRoute,
  TransferRouteFunds,
  UpdateKeeper,
  UpdateMultiSubscriber,
  UpdateOpenTimestamp,
  UpdateReferralCode,
  UpdateRouteFactory,
  UpdateScoreGauge,
  Withdraw,
  WithdrawPlatformFees
} from "../generated/Contract/Contract"

export function createAdjustPositionEvent(
  trader: Address,
  route: Address,
  isIncrease: boolean,
  requestKey: Bytes,
  routeTypeKey: Bytes,
  positionKey: Bytes
): AdjustPosition {
  let adjustPositionEvent = changetype<AdjustPosition>(newMockEvent())

  adjustPositionEvent.parameters = new Array()

  adjustPositionEvent.parameters.push(
    new ethereum.EventParam("trader", ethereum.Value.fromAddress(trader))
  )
  adjustPositionEvent.parameters.push(
    new ethereum.EventParam("route", ethereum.Value.fromAddress(route))
  )
  adjustPositionEvent.parameters.push(
    new ethereum.EventParam(
      "isIncrease",
      ethereum.Value.fromBoolean(isIncrease)
    )
  )
  adjustPositionEvent.parameters.push(
    new ethereum.EventParam(
      "requestKey",
      ethereum.Value.fromFixedBytes(requestKey)
    )
  )
  adjustPositionEvent.parameters.push(
    new ethereum.EventParam(
      "routeTypeKey",
      ethereum.Value.fromFixedBytes(routeTypeKey)
    )
  )
  adjustPositionEvent.parameters.push(
    new ethereum.EventParam(
      "positionKey",
      ethereum.Value.fromFixedBytes(positionKey)
    )
  )

  return adjustPositionEvent
}

export function createAdjustTargetLeverageEvent(
  route: Address,
  requestKey: Bytes,
  routeKey: Bytes,
  positionKey: Bytes
): AdjustTargetLeverage {
  let adjustTargetLeverageEvent = changetype<AdjustTargetLeverage>(
    newMockEvent()
  )

  adjustTargetLeverageEvent.parameters = new Array()

  adjustTargetLeverageEvent.parameters.push(
    new ethereum.EventParam("route", ethereum.Value.fromAddress(route))
  )
  adjustTargetLeverageEvent.parameters.push(
    new ethereum.EventParam(
      "requestKey",
      ethereum.Value.fromFixedBytes(requestKey)
    )
  )
  adjustTargetLeverageEvent.parameters.push(
    new ethereum.EventParam("routeKey", ethereum.Value.fromFixedBytes(routeKey))
  )
  adjustTargetLeverageEvent.parameters.push(
    new ethereum.EventParam(
      "positionKey",
      ethereum.Value.fromFixedBytes(positionKey)
    )
  )

  return adjustTargetLeverageEvent
}

export function createAuthorityUpdatedEvent(
  user: Address,
  newAuthority: Address
): AuthorityUpdated {
  let authorityUpdatedEvent = changetype<AuthorityUpdated>(newMockEvent())

  authorityUpdatedEvent.parameters = new Array()

  authorityUpdatedEvent.parameters.push(
    new ethereum.EventParam("user", ethereum.Value.fromAddress(user))
  )
  authorityUpdatedEvent.parameters.push(
    new ethereum.EventParam(
      "newAuthority",
      ethereum.Value.fromAddress(newAuthority)
    )
  )

  return authorityUpdatedEvent
}

export function createCreditPlatformEvent(
  amount: BigInt,
  asset: Address,
  puppet: Address,
  caller: Address,
  isWithdraw: boolean
): CreditPlatform {
  let creditPlatformEvent = changetype<CreditPlatform>(newMockEvent())

  creditPlatformEvent.parameters = new Array()

  creditPlatformEvent.parameters.push(
    new ethereum.EventParam("amount", ethereum.Value.fromUnsignedBigInt(amount))
  )
  creditPlatformEvent.parameters.push(
    new ethereum.EventParam("asset", ethereum.Value.fromAddress(asset))
  )
  creditPlatformEvent.parameters.push(
    new ethereum.EventParam("puppet", ethereum.Value.fromAddress(puppet))
  )
  creditPlatformEvent.parameters.push(
    new ethereum.EventParam("caller", ethereum.Value.fromAddress(caller))
  )
  creditPlatformEvent.parameters.push(
    new ethereum.EventParam(
      "isWithdraw",
      ethereum.Value.fromBoolean(isWithdraw)
    )
  )

  return creditPlatformEvent
}

export function createCreditPuppetEvent(
  amount: BigInt,
  asset: Address,
  puppet: Address,
  caller: Address
): CreditPuppet {
  let creditPuppetEvent = changetype<CreditPuppet>(newMockEvent())

  creditPuppetEvent.parameters = new Array()

  creditPuppetEvent.parameters.push(
    new ethereum.EventParam("amount", ethereum.Value.fromUnsignedBigInt(amount))
  )
  creditPuppetEvent.parameters.push(
    new ethereum.EventParam("asset", ethereum.Value.fromAddress(asset))
  )
  creditPuppetEvent.parameters.push(
    new ethereum.EventParam("puppet", ethereum.Value.fromAddress(puppet))
  )
  creditPuppetEvent.parameters.push(
    new ethereum.EventParam("caller", ethereum.Value.fromAddress(caller))
  )

  return creditPuppetEvent
}

export function createDebitPuppetEvent(
  amount: BigInt,
  asset: Address,
  puppet: Address,
  caller: Address
): DebitPuppet {
  let debitPuppetEvent = changetype<DebitPuppet>(newMockEvent())

  debitPuppetEvent.parameters = new Array()

  debitPuppetEvent.parameters.push(
    new ethereum.EventParam("amount", ethereum.Value.fromUnsignedBigInt(amount))
  )
  debitPuppetEvent.parameters.push(
    new ethereum.EventParam("asset", ethereum.Value.fromAddress(asset))
  )
  debitPuppetEvent.parameters.push(
    new ethereum.EventParam("puppet", ethereum.Value.fromAddress(puppet))
  )
  debitPuppetEvent.parameters.push(
    new ethereum.EventParam("caller", ethereum.Value.fromAddress(caller))
  )

  return debitPuppetEvent
}

export function createDepositEvent(
  amount: BigInt,
  asset: Address,
  caller: Address,
  puppet: Address
): Deposit {
  let depositEvent = changetype<Deposit>(newMockEvent())

  depositEvent.parameters = new Array()

  depositEvent.parameters.push(
    new ethereum.EventParam("amount", ethereum.Value.fromUnsignedBigInt(amount))
  )
  depositEvent.parameters.push(
    new ethereum.EventParam("asset", ethereum.Value.fromAddress(asset))
  )
  depositEvent.parameters.push(
    new ethereum.EventParam("caller", ethereum.Value.fromAddress(caller))
  )
  depositEvent.parameters.push(
    new ethereum.EventParam("puppet", ethereum.Value.fromAddress(puppet))
  )

  return depositEvent
}

export function createExecutePositionEvent(
  performanceFeePaid: BigInt,
  route: Address,
  requestKey: Bytes,
  isExecuted: boolean,
  isIncrease: boolean
): ExecutePosition {
  let executePositionEvent = changetype<ExecutePosition>(newMockEvent())

  executePositionEvent.parameters = new Array()

  executePositionEvent.parameters.push(
    new ethereum.EventParam(
      "performanceFeePaid",
      ethereum.Value.fromUnsignedBigInt(performanceFeePaid)
    )
  )
  executePositionEvent.parameters.push(
    new ethereum.EventParam("route", ethereum.Value.fromAddress(route))
  )
  executePositionEvent.parameters.push(
    new ethereum.EventParam(
      "requestKey",
      ethereum.Value.fromFixedBytes(requestKey)
    )
  )
  executePositionEvent.parameters.push(
    new ethereum.EventParam(
      "isExecuted",
      ethereum.Value.fromBoolean(isExecuted)
    )
  )
  executePositionEvent.parameters.push(
    new ethereum.EventParam(
      "isIncrease",
      ethereum.Value.fromBoolean(isIncrease)
    )
  )

  return executePositionEvent
}

export function createInitializeEvent(
  keeper: Address,
  platformFeeRecipient: Address,
  routeFactory: Address,
  gauge: Address,
  routeSetter: Address
): Initialize {
  let initializeEvent = changetype<Initialize>(newMockEvent())

  initializeEvent.parameters = new Array()

  initializeEvent.parameters.push(
    new ethereum.EventParam("keeper", ethereum.Value.fromAddress(keeper))
  )
  initializeEvent.parameters.push(
    new ethereum.EventParam(
      "platformFeeRecipient",
      ethereum.Value.fromAddress(platformFeeRecipient)
    )
  )
  initializeEvent.parameters.push(
    new ethereum.EventParam(
      "routeFactory",
      ethereum.Value.fromAddress(routeFactory)
    )
  )
  initializeEvent.parameters.push(
    new ethereum.EventParam("gauge", ethereum.Value.fromAddress(gauge))
  )
  initializeEvent.parameters.push(
    new ethereum.EventParam(
      "routeSetter",
      ethereum.Value.fromAddress(routeSetter)
    )
  )

  return initializeEvent
}

export function createLiquidatePositionEvent(
  route: Address,
  routeKey: Bytes,
  positionKey: Bytes
): LiquidatePosition {
  let liquidatePositionEvent = changetype<LiquidatePosition>(newMockEvent())

  liquidatePositionEvent.parameters = new Array()

  liquidatePositionEvent.parameters.push(
    new ethereum.EventParam("route", ethereum.Value.fromAddress(route))
  )
  liquidatePositionEvent.parameters.push(
    new ethereum.EventParam("routeKey", ethereum.Value.fromFixedBytes(routeKey))
  )
  liquidatePositionEvent.parameters.push(
    new ethereum.EventParam(
      "positionKey",
      ethereum.Value.fromFixedBytes(positionKey)
    )
  )

  return liquidatePositionEvent
}

export function createOpenPositionEvent(
  puppets: Array<Address>,
  trader: Address,
  route: Address,
  isIncrease: boolean,
  requestKey: Bytes,
  routeTypeKey: Bytes,
  positionKey: Bytes
): OpenPosition {
  let openPositionEvent = changetype<OpenPosition>(newMockEvent())

  openPositionEvent.parameters = new Array()

  openPositionEvent.parameters.push(
    new ethereum.EventParam("puppets", ethereum.Value.fromAddressArray(puppets))
  )
  openPositionEvent.parameters.push(
    new ethereum.EventParam("trader", ethereum.Value.fromAddress(trader))
  )
  openPositionEvent.parameters.push(
    new ethereum.EventParam("route", ethereum.Value.fromAddress(route))
  )
  openPositionEvent.parameters.push(
    new ethereum.EventParam(
      "isIncrease",
      ethereum.Value.fromBoolean(isIncrease)
    )
  )
  openPositionEvent.parameters.push(
    new ethereum.EventParam(
      "requestKey",
      ethereum.Value.fromFixedBytes(requestKey)
    )
  )
  openPositionEvent.parameters.push(
    new ethereum.EventParam(
      "routeTypeKey",
      ethereum.Value.fromFixedBytes(routeTypeKey)
    )
  )
  openPositionEvent.parameters.push(
    new ethereum.EventParam(
      "positionKey",
      ethereum.Value.fromFixedBytes(positionKey)
    )
  )

  return openPositionEvent
}

export function createOwnershipTransferredEvent(
  user: Address,
  newOwner: Address
): OwnershipTransferred {
  let ownershipTransferredEvent = changetype<OwnershipTransferred>(
    newMockEvent()
  )

  ownershipTransferredEvent.parameters = new Array()

  ownershipTransferredEvent.parameters.push(
    new ethereum.EventParam("user", ethereum.Value.fromAddress(user))
  )
  ownershipTransferredEvent.parameters.push(
    new ethereum.EventParam("newOwner", ethereum.Value.fromAddress(newOwner))
  )

  return ownershipTransferredEvent
}

export function createPauseEvent(paused: boolean): Pause {
  let pauseEvent = changetype<Pause>(newMockEvent())

  pauseEvent.parameters = new Array()

  pauseEvent.parameters.push(
    new ethereum.EventParam("paused", ethereum.Value.fromBoolean(paused))
  )

  return pauseEvent
}

export function createRegisterRouteAccountEvent(
  trader: Address,
  route: Address,
  routeTypeKey: Bytes
): RegisterRouteAccount {
  let registerRouteAccountEvent = changetype<RegisterRouteAccount>(
    newMockEvent()
  )

  registerRouteAccountEvent.parameters = new Array()

  registerRouteAccountEvent.parameters.push(
    new ethereum.EventParam("trader", ethereum.Value.fromAddress(trader))
  )
  registerRouteAccountEvent.parameters.push(
    new ethereum.EventParam("route", ethereum.Value.fromAddress(route))
  )
  registerRouteAccountEvent.parameters.push(
    new ethereum.EventParam(
      "routeTypeKey",
      ethereum.Value.fromFixedBytes(routeTypeKey)
    )
  )

  return registerRouteAccountEvent
}

export function createRescueRouteFundsEvent(
  amount: BigInt,
  token: Address,
  receiver: Address,
  route: Address
): RescueRouteFunds {
  let rescueRouteFundsEvent = changetype<RescueRouteFunds>(newMockEvent())

  rescueRouteFundsEvent.parameters = new Array()

  rescueRouteFundsEvent.parameters.push(
    new ethereum.EventParam("amount", ethereum.Value.fromUnsignedBigInt(amount))
  )
  rescueRouteFundsEvent.parameters.push(
    new ethereum.EventParam("token", ethereum.Value.fromAddress(token))
  )
  rescueRouteFundsEvent.parameters.push(
    new ethereum.EventParam("receiver", ethereum.Value.fromAddress(receiver))
  )
  rescueRouteFundsEvent.parameters.push(
    new ethereum.EventParam("route", ethereum.Value.fromAddress(route))
  )

  return rescueRouteFundsEvent
}

export function createSetFeesEvent(
  managmentFee: BigInt,
  withdrawalFee: BigInt,
  performanceFee: BigInt
): SetFees {
  let setFeesEvent = changetype<SetFees>(newMockEvent())

  setFeesEvent.parameters = new Array()

  setFeesEvent.parameters.push(
    new ethereum.EventParam(
      "managmentFee",
      ethereum.Value.fromUnsignedBigInt(managmentFee)
    )
  )
  setFeesEvent.parameters.push(
    new ethereum.EventParam(
      "withdrawalFee",
      ethereum.Value.fromUnsignedBigInt(withdrawalFee)
    )
  )
  setFeesEvent.parameters.push(
    new ethereum.EventParam(
      "performanceFee",
      ethereum.Value.fromUnsignedBigInt(performanceFee)
    )
  )

  return setFeesEvent
}

export function createSetFeesRecipientEvent(
  recipient: Address
): SetFeesRecipient {
  let setFeesRecipientEvent = changetype<SetFeesRecipient>(newMockEvent())

  setFeesRecipientEvent.parameters = new Array()

  setFeesRecipientEvent.parameters.push(
    new ethereum.EventParam("recipient", ethereum.Value.fromAddress(recipient))
  )

  return setFeesRecipientEvent
}

export function createSetRouteTypeEvent(
  routeTypeKey: Bytes,
  collateral: Address,
  index: Address,
  isLong: boolean
): SetRouteType {
  let setRouteTypeEvent = changetype<SetRouteType>(newMockEvent())

  setRouteTypeEvent.parameters = new Array()

  setRouteTypeEvent.parameters.push(
    new ethereum.EventParam(
      "routeTypeKey",
      ethereum.Value.fromFixedBytes(routeTypeKey)
    )
  )
  setRouteTypeEvent.parameters.push(
    new ethereum.EventParam(
      "collateral",
      ethereum.Value.fromAddress(collateral)
    )
  )
  setRouteTypeEvent.parameters.push(
    new ethereum.EventParam("index", ethereum.Value.fromAddress(index))
  )
  setRouteTypeEvent.parameters.push(
    new ethereum.EventParam("isLong", ethereum.Value.fromBoolean(isLong))
  )

  return setRouteTypeEvent
}

export function createSetThrottleLimitEvent(
  puppet: Address,
  routeType: Bytes,
  throttleLimit: BigInt
): SetThrottleLimit {
  let setThrottleLimitEvent = changetype<SetThrottleLimit>(newMockEvent())

  setThrottleLimitEvent.parameters = new Array()

  setThrottleLimitEvent.parameters.push(
    new ethereum.EventParam("puppet", ethereum.Value.fromAddress(puppet))
  )
  setThrottleLimitEvent.parameters.push(
    new ethereum.EventParam(
      "routeType",
      ethereum.Value.fromFixedBytes(routeType)
    )
  )
  setThrottleLimitEvent.parameters.push(
    new ethereum.EventParam(
      "throttleLimit",
      ethereum.Value.fromUnsignedBigInt(throttleLimit)
    )
  )

  return setThrottleLimitEvent
}

export function createSharesIncreaseEvent(
  puppetsShares: Array<BigInt>,
  traderShares: BigInt,
  totalSupply: BigInt,
  positionKey: Bytes
): SharesIncrease {
  let sharesIncreaseEvent = changetype<SharesIncrease>(newMockEvent())

  sharesIncreaseEvent.parameters = new Array()

  sharesIncreaseEvent.parameters.push(
    new ethereum.EventParam(
      "puppetsShares",
      ethereum.Value.fromUnsignedBigIntArray(puppetsShares)
    )
  )
  sharesIncreaseEvent.parameters.push(
    new ethereum.EventParam(
      "traderShares",
      ethereum.Value.fromUnsignedBigInt(traderShares)
    )
  )
  sharesIncreaseEvent.parameters.push(
    new ethereum.EventParam(
      "totalSupply",
      ethereum.Value.fromUnsignedBigInt(totalSupply)
    )
  )
  sharesIncreaseEvent.parameters.push(
    new ethereum.EventParam(
      "positionKey",
      ethereum.Value.fromFixedBytes(positionKey)
    )
  )

  return sharesIncreaseEvent
}

export function createSubscribeRouteEvent(
  allowance: BigInt,
  subscriptionExpiry: BigInt,
  trader: Address,
  puppet: Address,
  route: Address,
  routeTypeKey: Bytes,
  subscribe: boolean
): SubscribeRoute {
  let subscribeRouteEvent = changetype<SubscribeRoute>(newMockEvent())

  subscribeRouteEvent.parameters = new Array()

  subscribeRouteEvent.parameters.push(
    new ethereum.EventParam(
      "allowance",
      ethereum.Value.fromUnsignedBigInt(allowance)
    )
  )
  subscribeRouteEvent.parameters.push(
    new ethereum.EventParam(
      "subscriptionExpiry",
      ethereum.Value.fromUnsignedBigInt(subscriptionExpiry)
    )
  )
  subscribeRouteEvent.parameters.push(
    new ethereum.EventParam("trader", ethereum.Value.fromAddress(trader))
  )
  subscribeRouteEvent.parameters.push(
    new ethereum.EventParam("puppet", ethereum.Value.fromAddress(puppet))
  )
  subscribeRouteEvent.parameters.push(
    new ethereum.EventParam("route", ethereum.Value.fromAddress(route))
  )
  subscribeRouteEvent.parameters.push(
    new ethereum.EventParam(
      "routeTypeKey",
      ethereum.Value.fromFixedBytes(routeTypeKey)
    )
  )
  subscribeRouteEvent.parameters.push(
    new ethereum.EventParam("subscribe", ethereum.Value.fromBoolean(subscribe))
  )

  return subscribeRouteEvent
}

export function createTransferRouteFundsEvent(
  amount: BigInt,
  asset: Address,
  receiver: Address,
  caller: Address
): TransferRouteFunds {
  let transferRouteFundsEvent = changetype<TransferRouteFunds>(newMockEvent())

  transferRouteFundsEvent.parameters = new Array()

  transferRouteFundsEvent.parameters.push(
    new ethereum.EventParam("amount", ethereum.Value.fromUnsignedBigInt(amount))
  )
  transferRouteFundsEvent.parameters.push(
    new ethereum.EventParam("asset", ethereum.Value.fromAddress(asset))
  )
  transferRouteFundsEvent.parameters.push(
    new ethereum.EventParam("receiver", ethereum.Value.fromAddress(receiver))
  )
  transferRouteFundsEvent.parameters.push(
    new ethereum.EventParam("caller", ethereum.Value.fromAddress(caller))
  )

  return transferRouteFundsEvent
}

export function createUpdateKeeperEvent(keeper: Address): UpdateKeeper {
  let updateKeeperEvent = changetype<UpdateKeeper>(newMockEvent())

  updateKeeperEvent.parameters = new Array()

  updateKeeperEvent.parameters.push(
    new ethereum.EventParam("keeper", ethereum.Value.fromAddress(keeper))
  )

  return updateKeeperEvent
}

export function createUpdateMultiSubscriberEvent(
  multiSubscriber: Address
): UpdateMultiSubscriber {
  let updateMultiSubscriberEvent = changetype<UpdateMultiSubscriber>(
    newMockEvent()
  )

  updateMultiSubscriberEvent.parameters = new Array()

  updateMultiSubscriberEvent.parameters.push(
    new ethereum.EventParam(
      "multiSubscriber",
      ethereum.Value.fromAddress(multiSubscriber)
    )
  )

  return updateMultiSubscriberEvent
}

export function createUpdateOpenTimestampEvent(
  puppets: Array<Address>,
  routeType: Bytes
): UpdateOpenTimestamp {
  let updateOpenTimestampEvent = changetype<UpdateOpenTimestamp>(newMockEvent())

  updateOpenTimestampEvent.parameters = new Array()

  updateOpenTimestampEvent.parameters.push(
    new ethereum.EventParam("puppets", ethereum.Value.fromAddressArray(puppets))
  )
  updateOpenTimestampEvent.parameters.push(
    new ethereum.EventParam(
      "routeType",
      ethereum.Value.fromFixedBytes(routeType)
    )
  )

  return updateOpenTimestampEvent
}

export function createUpdateReferralCodeEvent(
  referralCode: Bytes
): UpdateReferralCode {
  let updateReferralCodeEvent = changetype<UpdateReferralCode>(newMockEvent())

  updateReferralCodeEvent.parameters = new Array()

  updateReferralCodeEvent.parameters.push(
    new ethereum.EventParam(
      "referralCode",
      ethereum.Value.fromFixedBytes(referralCode)
    )
  )

  return updateReferralCodeEvent
}

export function createUpdateRouteFactoryEvent(
  routeFactory: Address
): UpdateRouteFactory {
  let updateRouteFactoryEvent = changetype<UpdateRouteFactory>(newMockEvent())

  updateRouteFactoryEvent.parameters = new Array()

  updateRouteFactoryEvent.parameters.push(
    new ethereum.EventParam(
      "routeFactory",
      ethereum.Value.fromAddress(routeFactory)
    )
  )

  return updateRouteFactoryEvent
}

export function createUpdateScoreGaugeEvent(
  scoreGauge: Address
): UpdateScoreGauge {
  let updateScoreGaugeEvent = changetype<UpdateScoreGauge>(newMockEvent())

  updateScoreGaugeEvent.parameters = new Array()

  updateScoreGaugeEvent.parameters.push(
    new ethereum.EventParam(
      "scoreGauge",
      ethereum.Value.fromAddress(scoreGauge)
    )
  )

  return updateScoreGaugeEvent
}

export function createWithdrawEvent(
  amount: BigInt,
  asset: Address,
  receiver: Address,
  puppet: Address
): Withdraw {
  let withdrawEvent = changetype<Withdraw>(newMockEvent())

  withdrawEvent.parameters = new Array()

  withdrawEvent.parameters.push(
    new ethereum.EventParam("amount", ethereum.Value.fromUnsignedBigInt(amount))
  )
  withdrawEvent.parameters.push(
    new ethereum.EventParam("asset", ethereum.Value.fromAddress(asset))
  )
  withdrawEvent.parameters.push(
    new ethereum.EventParam("receiver", ethereum.Value.fromAddress(receiver))
  )
  withdrawEvent.parameters.push(
    new ethereum.EventParam("puppet", ethereum.Value.fromAddress(puppet))
  )

  return withdrawEvent
}

export function createWithdrawPlatformFeesEvent(
  amount: BigInt,
  asset: Address,
  caller: Address,
  platformFeeRecipient: Address
): WithdrawPlatformFees {
  let withdrawPlatformFeesEvent = changetype<WithdrawPlatformFees>(
    newMockEvent()
  )

  withdrawPlatformFeesEvent.parameters = new Array()

  withdrawPlatformFeesEvent.parameters.push(
    new ethereum.EventParam("amount", ethereum.Value.fromUnsignedBigInt(amount))
  )
  withdrawPlatformFeesEvent.parameters.push(
    new ethereum.EventParam("asset", ethereum.Value.fromAddress(asset))
  )
  withdrawPlatformFeesEvent.parameters.push(
    new ethereum.EventParam("caller", ethereum.Value.fromAddress(caller))
  )
  withdrawPlatformFeesEvent.parameters.push(
    new ethereum.EventParam(
      "platformFeeRecipient",
      ethereum.Value.fromAddress(platformFeeRecipient)
    )
  )

  return withdrawPlatformFeesEvent
}

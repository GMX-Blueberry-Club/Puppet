import { newMockEvent } from "matchstick-as"
import { ethereum, Address, Bytes, BigInt } from "@graphprotocol/graph-ts"
import {
  ApprovePlugin,
  AuthorityUpdated,
  Callback,
  CreditPuppet,
  DebitPuppet,
  DecreaseSize,
  Deposit,
  FreezeRoute,
  Keeper,
  Liquidate,
  OwnershipTransferred,
  Pause,
  RegisterRoute,
  RequestPositionAdjustment,
  Rescue,
  RouteRescue,
  Send,
  SetGMXUtils,
  SetReferralCode,
  SetRouteFactory,
  SetRouteType,
  SetThrottleLimit,
  Subscribe,
  UpdateOpenTimestamp,
  Withdraw
} from "../generated/Contract/Contract"

export function createApprovePluginEvent(
  caller: Address,
  routeTypeKey: Bytes
): ApprovePlugin {
  let approvePluginEvent = changetype<ApprovePlugin>(newMockEvent())

  approvePluginEvent.parameters = new Array()

  approvePluginEvent.parameters.push(
    new ethereum.EventParam("caller", ethereum.Value.fromAddress(caller))
  )
  approvePluginEvent.parameters.push(
    new ethereum.EventParam(
      "routeTypeKey",
      ethereum.Value.fromFixedBytes(routeTypeKey)
    )
  )

  return approvePluginEvent
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

export function createCallbackEvent(
  route: Address,
  requestKey: Bytes,
  isExecuted: boolean,
  isIncrease: boolean
): Callback {
  let callbackEvent = changetype<Callback>(newMockEvent())

  callbackEvent.parameters = new Array()

  callbackEvent.parameters.push(
    new ethereum.EventParam("route", ethereum.Value.fromAddress(route))
  )
  callbackEvent.parameters.push(
    new ethereum.EventParam(
      "requestKey",
      ethereum.Value.fromFixedBytes(requestKey)
    )
  )
  callbackEvent.parameters.push(
    new ethereum.EventParam(
      "isExecuted",
      ethereum.Value.fromBoolean(isExecuted)
    )
  )
  callbackEvent.parameters.push(
    new ethereum.EventParam(
      "isIncrease",
      ethereum.Value.fromBoolean(isIncrease)
    )
  )

  return callbackEvent
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

export function createDecreaseSizeEvent(
  requestKey: Bytes,
  routeKey: Bytes
): DecreaseSize {
  let decreaseSizeEvent = changetype<DecreaseSize>(newMockEvent())

  decreaseSizeEvent.parameters = new Array()

  decreaseSizeEvent.parameters.push(
    new ethereum.EventParam(
      "requestKey",
      ethereum.Value.fromFixedBytes(requestKey)
    )
  )
  decreaseSizeEvent.parameters.push(
    new ethereum.EventParam("routeKey", ethereum.Value.fromFixedBytes(routeKey))
  )

  return decreaseSizeEvent
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

export function createFreezeRouteEvent(
  route: Address,
  freeze: boolean
): FreezeRoute {
  let freezeRouteEvent = changetype<FreezeRoute>(newMockEvent())

  freezeRouteEvent.parameters = new Array()

  freezeRouteEvent.parameters.push(
    new ethereum.EventParam("route", ethereum.Value.fromAddress(route))
  )
  freezeRouteEvent.parameters.push(
    new ethereum.EventParam("freeze", ethereum.Value.fromBoolean(freeze))
  )

  return freezeRouteEvent
}

export function createKeeperEvent(keeper: Address): Keeper {
  let keeperEvent = changetype<Keeper>(newMockEvent())

  keeperEvent.parameters = new Array()

  keeperEvent.parameters.push(
    new ethereum.EventParam("keeper", ethereum.Value.fromAddress(keeper))
  )

  return keeperEvent
}

export function createLiquidateEvent(routeKey: Bytes): Liquidate {
  let liquidateEvent = changetype<Liquidate>(newMockEvent())

  liquidateEvent.parameters = new Array()

  liquidateEvent.parameters.push(
    new ethereum.EventParam("routeKey", ethereum.Value.fromFixedBytes(routeKey))
  )

  return liquidateEvent
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

export function createRegisterRouteEvent(
  trader: Address,
  route: Address,
  routeTypeKey: Bytes
): RegisterRoute {
  let registerRouteEvent = changetype<RegisterRoute>(newMockEvent())

  registerRouteEvent.parameters = new Array()

  registerRouteEvent.parameters.push(
    new ethereum.EventParam("trader", ethereum.Value.fromAddress(trader))
  )
  registerRouteEvent.parameters.push(
    new ethereum.EventParam("route", ethereum.Value.fromAddress(route))
  )
  registerRouteEvent.parameters.push(
    new ethereum.EventParam(
      "routeTypeKey",
      ethereum.Value.fromFixedBytes(routeTypeKey)
    )
  )

  return registerRouteEvent
}

export function createRequestPositionAdjustmentEvent(
  caller: Address,
  route: Address,
  requestKey: Bytes,
  routeTypeKey: Bytes
): RequestPositionAdjustment {
  let requestPositionAdjustmentEvent = changetype<RequestPositionAdjustment>(
    newMockEvent()
  )

  requestPositionAdjustmentEvent.parameters = new Array()

  requestPositionAdjustmentEvent.parameters.push(
    new ethereum.EventParam("caller", ethereum.Value.fromAddress(caller))
  )
  requestPositionAdjustmentEvent.parameters.push(
    new ethereum.EventParam("route", ethereum.Value.fromAddress(route))
  )
  requestPositionAdjustmentEvent.parameters.push(
    new ethereum.EventParam(
      "requestKey",
      ethereum.Value.fromFixedBytes(requestKey)
    )
  )
  requestPositionAdjustmentEvent.parameters.push(
    new ethereum.EventParam(
      "routeTypeKey",
      ethereum.Value.fromFixedBytes(routeTypeKey)
    )
  )

  return requestPositionAdjustmentEvent
}

export function createRescueEvent(
  amount: BigInt,
  token: Address,
  receiver: Address
): Rescue {
  let rescueEvent = changetype<Rescue>(newMockEvent())

  rescueEvent.parameters = new Array()

  rescueEvent.parameters.push(
    new ethereum.EventParam("amount", ethereum.Value.fromUnsignedBigInt(amount))
  )
  rescueEvent.parameters.push(
    new ethereum.EventParam("token", ethereum.Value.fromAddress(token))
  )
  rescueEvent.parameters.push(
    new ethereum.EventParam("receiver", ethereum.Value.fromAddress(receiver))
  )

  return rescueEvent
}

export function createRouteRescueEvent(
  amount: BigInt,
  token: Address,
  receiver: Address,
  route: Address
): RouteRescue {
  let routeRescueEvent = changetype<RouteRescue>(newMockEvent())

  routeRescueEvent.parameters = new Array()

  routeRescueEvent.parameters.push(
    new ethereum.EventParam("amount", ethereum.Value.fromUnsignedBigInt(amount))
  )
  routeRescueEvent.parameters.push(
    new ethereum.EventParam("token", ethereum.Value.fromAddress(token))
  )
  routeRescueEvent.parameters.push(
    new ethereum.EventParam("receiver", ethereum.Value.fromAddress(receiver))
  )
  routeRescueEvent.parameters.push(
    new ethereum.EventParam("route", ethereum.Value.fromAddress(route))
  )

  return routeRescueEvent
}

export function createSendEvent(
  amount: BigInt,
  asset: Address,
  receiver: Address,
  caller: Address
): Send {
  let sendEvent = changetype<Send>(newMockEvent())

  sendEvent.parameters = new Array()

  sendEvent.parameters.push(
    new ethereum.EventParam("amount", ethereum.Value.fromUnsignedBigInt(amount))
  )
  sendEvent.parameters.push(
    new ethereum.EventParam("asset", ethereum.Value.fromAddress(asset))
  )
  sendEvent.parameters.push(
    new ethereum.EventParam("receiver", ethereum.Value.fromAddress(receiver))
  )
  sendEvent.parameters.push(
    new ethereum.EventParam("caller", ethereum.Value.fromAddress(caller))
  )

  return sendEvent
}

export function createSetGMXUtilsEvent(
  gmxRouter: Address,
  gmxVault: Address,
  gmxPositionRouter: Address
): SetGMXUtils {
  let setGmxUtilsEvent = changetype<SetGMXUtils>(newMockEvent())

  setGmxUtilsEvent.parameters = new Array()

  setGmxUtilsEvent.parameters.push(
    new ethereum.EventParam("gmxRouter", ethereum.Value.fromAddress(gmxRouter))
  )
  setGmxUtilsEvent.parameters.push(
    new ethereum.EventParam("gmxVault", ethereum.Value.fromAddress(gmxVault))
  )
  setGmxUtilsEvent.parameters.push(
    new ethereum.EventParam(
      "gmxPositionRouter",
      ethereum.Value.fromAddress(gmxPositionRouter)
    )
  )

  return setGmxUtilsEvent
}

export function createSetReferralCodeEvent(
  referralCode: Bytes
): SetReferralCode {
  let setReferralCodeEvent = changetype<SetReferralCode>(newMockEvent())

  setReferralCodeEvent.parameters = new Array()

  setReferralCodeEvent.parameters.push(
    new ethereum.EventParam(
      "referralCode",
      ethereum.Value.fromFixedBytes(referralCode)
    )
  )

  return setReferralCodeEvent
}

export function createSetRouteFactoryEvent(factory: Address): SetRouteFactory {
  let setRouteFactoryEvent = changetype<SetRouteFactory>(newMockEvent())

  setRouteFactoryEvent.parameters = new Array()

  setRouteFactoryEvent.parameters.push(
    new ethereum.EventParam("factory", ethereum.Value.fromAddress(factory))
  )

  return setRouteFactoryEvent
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

export function createSubscribeEvent(
  traders: Array<Address>,
  allowances: Array<BigInt>,
  puppet: Address,
  routeTypeKey: Bytes,
  subscribe: boolean
): Subscribe {
  let subscribeEvent = changetype<Subscribe>(newMockEvent())

  subscribeEvent.parameters = new Array()

  subscribeEvent.parameters.push(
    new ethereum.EventParam("traders", ethereum.Value.fromAddressArray(traders))
  )
  subscribeEvent.parameters.push(
    new ethereum.EventParam(
      "allowances",
      ethereum.Value.fromUnsignedBigIntArray(allowances)
    )
  )
  subscribeEvent.parameters.push(
    new ethereum.EventParam("puppet", ethereum.Value.fromAddress(puppet))
  )
  subscribeEvent.parameters.push(
    new ethereum.EventParam(
      "routeTypeKey",
      ethereum.Value.fromFixedBytes(routeTypeKey)
    )
  )
  subscribeEvent.parameters.push(
    new ethereum.EventParam("subscribe", ethereum.Value.fromBoolean(subscribe))
  )

  return subscribeEvent
}

export function createUpdateOpenTimestampEvent(
  puppet: Address,
  routeType: Bytes,
  timestamp: BigInt
): UpdateOpenTimestamp {
  let updateOpenTimestampEvent = changetype<UpdateOpenTimestamp>(newMockEvent())

  updateOpenTimestampEvent.parameters = new Array()

  updateOpenTimestampEvent.parameters.push(
    new ethereum.EventParam("puppet", ethereum.Value.fromAddress(puppet))
  )
  updateOpenTimestampEvent.parameters.push(
    new ethereum.EventParam(
      "routeType",
      ethereum.Value.fromFixedBytes(routeType)
    )
  )
  updateOpenTimestampEvent.parameters.push(
    new ethereum.EventParam(
      "timestamp",
      ethereum.Value.fromUnsignedBigInt(timestamp)
    )
  )

  return updateOpenTimestampEvent
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

import {
  AdjustPosition as AdjustPositionEvent,
  AdjustTargetLeverage as AdjustTargetLeverageEvent,
  AuthorityUpdated as AuthorityUpdatedEvent,
  CreditPlatform as CreditPlatformEvent,
  CreditPuppet as CreditPuppetEvent,
  DebitPuppet as DebitPuppetEvent,
  Deposit as DepositEvent,
  ExecutePosition as ExecutePositionEvent,
  Initialize as InitializeEvent,
  LiquidatePosition as LiquidatePositionEvent,
  OpenPosition as OpenPositionEvent,
  OwnershipTransferred as OwnershipTransferredEvent,
  Pause as PauseEvent,
  RegisterRouteAccount as RegisterRouteAccountEvent,
  RescueRouteFunds as RescueRouteFundsEvent,
  SetFees as SetFeesEvent,
  SetFeesRecipient as SetFeesRecipientEvent,
  SetRouteType as SetRouteTypeEvent,
  SetThrottleLimit as SetThrottleLimitEvent,
  SharesIncrease as SharesIncreaseEvent,
  SubscribeRoute as SubscribeRouteEvent,
  TransferRouteFunds as TransferRouteFundsEvent,
  UpdateKeeper as UpdateKeeperEvent,
  UpdateMultiSubscriber as UpdateMultiSubscriberEvent,
  UpdateOpenTimestamp as UpdateOpenTimestampEvent,
  UpdateReferralCode as UpdateReferralCodeEvent,
  UpdateRouteFactory as UpdateRouteFactoryEvent,
  UpdateScoreGauge as UpdateScoreGaugeEvent,
  Withdraw as WithdrawEvent,
  WithdrawPlatformFees as WithdrawPlatformFeesEvent
} from "../generated/Contract/Contract"
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
} from "../generated/schema"

export function handleAdjustPosition(event: AdjustPositionEvent): void {
  let entity = new AdjustPosition(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.trader = event.params.trader
  entity.route = event.params.route
  entity.isIncrease = event.params.isIncrease
  entity.requestKey = event.params.requestKey
  entity.routeTypeKey = event.params.routeTypeKey
  entity.positionKey = event.params.positionKey

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()
}

export function handleAdjustTargetLeverage(
  event: AdjustTargetLeverageEvent
): void {
  let entity = new AdjustTargetLeverage(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.route = event.params.route
  entity.requestKey = event.params.requestKey
  entity.routeKey = event.params.routeKey
  entity.positionKey = event.params.positionKey

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()
}

export function handleAuthorityUpdated(event: AuthorityUpdatedEvent): void {
  let entity = new AuthorityUpdated(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.user = event.params.user
  entity.newAuthority = event.params.newAuthority

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()
}

export function handleCreditPlatform(event: CreditPlatformEvent): void {
  let entity = new CreditPlatform(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.amount = event.params.amount
  entity.asset = event.params.asset
  entity.puppet = event.params.puppet
  entity.caller = event.params.caller
  entity.isWithdraw = event.params.isWithdraw

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()
}

export function handleCreditPuppet(event: CreditPuppetEvent): void {
  let entity = new CreditPuppet(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.amount = event.params.amount
  entity.asset = event.params.asset
  entity.puppet = event.params.puppet
  entity.caller = event.params.caller

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()
}

export function handleDebitPuppet(event: DebitPuppetEvent): void {
  let entity = new DebitPuppet(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.amount = event.params.amount
  entity.asset = event.params.asset
  entity.puppet = event.params.puppet
  entity.caller = event.params.caller

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()
}

export function handleDeposit(event: DepositEvent): void {
  let entity = new Deposit(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.amount = event.params.amount
  entity.asset = event.params.asset
  entity.caller = event.params.caller
  entity.puppet = event.params.puppet

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()
}

export function handleExecutePosition(event: ExecutePositionEvent): void {
  let entity = new ExecutePosition(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.performanceFeePaid = event.params.performanceFeePaid
  entity.route = event.params.route
  entity.requestKey = event.params.requestKey
  entity.isExecuted = event.params.isExecuted
  entity.isIncrease = event.params.isIncrease

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()
}

export function handleInitialize(event: InitializeEvent): void {
  let entity = new Initialize(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.keeper = event.params.keeper
  entity.platformFeeRecipient = event.params.platformFeeRecipient
  entity.routeFactory = event.params.routeFactory
  entity.gauge = event.params.gauge
  entity.routeSetter = event.params.routeSetter

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()
}

export function handleLiquidatePosition(event: LiquidatePositionEvent): void {
  let entity = new LiquidatePosition(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.route = event.params.route
  entity.routeKey = event.params.routeKey
  entity.positionKey = event.params.positionKey

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()
}

export function handleOpenPosition(event: OpenPositionEvent): void {
  let entity = new OpenPosition(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.puppets = event.params.puppets
  entity.trader = event.params.trader
  entity.route = event.params.route
  entity.isIncrease = event.params.isIncrease
  entity.requestKey = event.params.requestKey
  entity.routeTypeKey = event.params.routeTypeKey
  entity.positionKey = event.params.positionKey

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()
}

export function handleOwnershipTransferred(
  event: OwnershipTransferredEvent
): void {
  let entity = new OwnershipTransferred(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.user = event.params.user
  entity.newOwner = event.params.newOwner

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()
}

export function handlePause(event: PauseEvent): void {
  let entity = new Pause(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.paused = event.params.paused

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()
}

export function handleRegisterRouteAccount(
  event: RegisterRouteAccountEvent
): void {
  let entity = new RegisterRouteAccount(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.trader = event.params.trader
  entity.route = event.params.route
  entity.routeTypeKey = event.params.routeTypeKey

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()
}

export function handleRescueRouteFunds(event: RescueRouteFundsEvent): void {
  let entity = new RescueRouteFunds(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.amount = event.params.amount
  entity.token = event.params.token
  entity.receiver = event.params.receiver
  entity.route = event.params.route

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()
}

export function handleSetFees(event: SetFeesEvent): void {
  let entity = new SetFees(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.managmentFee = event.params.managmentFee
  entity.withdrawalFee = event.params.withdrawalFee
  entity.performanceFee = event.params.performanceFee

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()
}

export function handleSetFeesRecipient(event: SetFeesRecipientEvent): void {
  let entity = new SetFeesRecipient(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.recipient = event.params.recipient

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()
}

export function handleSetRouteType(event: SetRouteTypeEvent): void {
  let entity = new SetRouteType(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.routeTypeKey = event.params.routeTypeKey
  entity.collateral = event.params.collateral
  entity.index = event.params.index
  entity.isLong = event.params.isLong

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()
}

export function handleSetThrottleLimit(event: SetThrottleLimitEvent): void {
  let entity = new SetThrottleLimit(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.puppet = event.params.puppet
  entity.routeType = event.params.routeType
  entity.throttleLimit = event.params.throttleLimit

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()
}

export function handleSharesIncrease(event: SharesIncreaseEvent): void {
  let entity = new SharesIncrease(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.puppetsShares = event.params.puppetsShares
  entity.traderShares = event.params.traderShares
  entity.totalSupply = event.params.totalSupply
  entity.positionKey = event.params.positionKey

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()
}

export function handleSubscribeRoute(event: SubscribeRouteEvent): void {
  let entity = new SubscribeRoute(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.allowance = event.params.allowance
  entity.subscriptionExpiry = event.params.subscriptionExpiry
  entity.trader = event.params.trader
  entity.puppet = event.params.puppet
  entity.route = event.params.route
  entity.routeTypeKey = event.params.routeTypeKey
  entity.subscribe = event.params.subscribe

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()
}

export function handleTransferRouteFunds(event: TransferRouteFundsEvent): void {
  let entity = new TransferRouteFunds(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.amount = event.params.amount
  entity.asset = event.params.asset
  entity.receiver = event.params.receiver
  entity.caller = event.params.caller

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()
}

export function handleUpdateKeeper(event: UpdateKeeperEvent): void {
  let entity = new UpdateKeeper(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.keeper = event.params.keeper

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()
}

export function handleUpdateMultiSubscriber(
  event: UpdateMultiSubscriberEvent
): void {
  let entity = new UpdateMultiSubscriber(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.multiSubscriber = event.params.multiSubscriber

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()
}

export function handleUpdateOpenTimestamp(
  event: UpdateOpenTimestampEvent
): void {
  let entity = new UpdateOpenTimestamp(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.puppets = event.params.puppets
  entity.routeType = event.params.routeType

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()
}

export function handleUpdateReferralCode(event: UpdateReferralCodeEvent): void {
  let entity = new UpdateReferralCode(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.referralCode = event.params.referralCode

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()
}

export function handleUpdateRouteFactory(event: UpdateRouteFactoryEvent): void {
  let entity = new UpdateRouteFactory(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.routeFactory = event.params.routeFactory

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()
}

export function handleUpdateScoreGauge(event: UpdateScoreGaugeEvent): void {
  let entity = new UpdateScoreGauge(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.scoreGauge = event.params.scoreGauge

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()
}

export function handleWithdraw(event: WithdrawEvent): void {
  let entity = new Withdraw(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.amount = event.params.amount
  entity.asset = event.params.asset
  entity.receiver = event.params.receiver
  entity.puppet = event.params.puppet

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()
}

export function handleWithdrawPlatformFees(
  event: WithdrawPlatformFeesEvent
): void {
  let entity = new WithdrawPlatformFees(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.amount = event.params.amount
  entity.asset = event.params.asset
  entity.caller = event.params.caller
  entity.platformFeeRecipient = event.params.platformFeeRecipient

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()
}

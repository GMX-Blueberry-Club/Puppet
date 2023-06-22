import {
  AuthorityUpdated as AuthorityUpdatedEvent,
  Deposited as DepositedEvent,
  FundsSent as FundsSentEvent,
  GMXUtilsSet as GMXUtilsSetEvent,
  KeeperSet as KeeperSetEvent,
  LastPositionOpenedTimestampUpdated as LastPositionOpenedTimestampUpdatedEvent,
  OwnershipTransferred as OwnershipTransferredEvent,
  Paused as PausedEvent,
  PositionRequestCreated as PositionRequestCreatedEvent,
  PuppetAccountCredited as PuppetAccountCreditedEvent,
  PuppetAccountDebited as PuppetAccountDebitedEvent,
  ReferralCodeSet as ReferralCodeSetEvent,
  RouteFrozen as RouteFrozenEvent,
  RouteRegistered as RouteRegisteredEvent,
  RouteTokensRescued as RouteTokensRescuedEvent,
  RouteTypeSet as RouteTypeSetEvent,
  RoutesSubscriptionUpdated as RoutesSubscriptionUpdatedEvent,
  ThrottleLimitSet as ThrottleLimitSetEvent,
  TokensRescued as TokensRescuedEvent,
  Withdrawn as WithdrawnEvent
} from "../generated/Orchestrator/Orchestrator"
import {
  AuthorityUpdated,
  Deposited,
  FundsSent,
  GMXUtilsSet,
  KeeperSet,
  LastPositionOpenedTimestampUpdated,
  OwnershipTransferred,
  Paused,
  PositionRequestCreated,
  PuppetAccountCredited,
  PuppetAccountDebited,
  ReferralCodeSet,
  RouteFrozen,
  RouteRegistered,
  RouteTokensRescued,
  RouteTypeSet,
  RoutesSubscriptionUpdated,
  ThrottleLimitSet,
  TokensRescued,
  Withdrawn
} from "../generated/schema"

export function handleAuthorityUpdated(event: AuthorityUpdatedEvent): void {
  const entity = new AuthorityUpdated(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.user = event.params.user
  entity.newAuthority = event.params.newAuthority

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()
}

export function handleDeposited(event: DepositedEvent): void {
  const entity = new Deposited(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity._amount = event.params._amount
  entity._asset = event.params._asset
  entity._caller = event.params._caller
  entity._puppet = event.params._puppet

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()
}

export function handleFundsSent(event: FundsSentEvent): void {
  const entity = new FundsSent(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity._amount = event.params._amount
  entity._asset = event.params._asset
  entity._receiver = event.params._receiver
  entity._caller = event.params._caller

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()
}

export function handleGMXUtilsSet(event: GMXUtilsSetEvent): void {
  const entity = new GMXUtilsSet(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity._gmxRouter = event.params._gmxRouter
  entity._gmxVault = event.params._gmxVault
  entity._gmxPositionRouter = event.params._gmxPositionRouter

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()
}

export function handleKeeperSet(event: KeeperSetEvent): void {
  const entity = new KeeperSet(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity._keeper = event.params._keeper

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()
}

export function handleLastPositionOpenedTimestampUpdated(
  event: LastPositionOpenedTimestampUpdatedEvent
): void {
  const entity = new LastPositionOpenedTimestampUpdated(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity._puppet = event.params._puppet
  entity._routeType = event.params._routeType
  entity._timestamp = event.params._timestamp

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()
}

export function handleOwnershipTransferred(
  event: OwnershipTransferredEvent
): void {
  const entity = new OwnershipTransferred(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.user = event.params.user
  entity.newOwner = event.params.newOwner

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()
}

export function handlePaused(event: PausedEvent): void {
  const entity = new Paused(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity._paused = event.params._paused

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()
}

export function handlePositionRequestCreated(
  event: PositionRequestCreatedEvent
): void {
  const entity = new PositionRequestCreated(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity._requestKey = event.params._requestKey
  entity._route = event.params._route
  entity._isIncrease = event.params._isIncrease

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()
}

export function handlePuppetAccountCredited(
  event: PuppetAccountCreditedEvent
): void {
  const entity = new PuppetAccountCredited(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity._amount = event.params._amount
  entity._asset = event.params._asset
  entity._puppet = event.params._puppet
  entity._caller = event.params._caller

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()
}

export function handlePuppetAccountDebited(
  event: PuppetAccountDebitedEvent
): void {
  const entity = new PuppetAccountDebited(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity._amount = event.params._amount
  entity._asset = event.params._asset
  entity._puppet = event.params._puppet
  entity._caller = event.params._caller

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()
}

export function handleReferralCodeSet(event: ReferralCodeSetEvent): void {
  const entity = new ReferralCodeSet(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity._referralCode = event.params._referralCode

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()
}

export function handleRouteFrozen(event: RouteFrozenEvent): void {
  const entity = new RouteFrozen(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity._route = event.params._route
  entity._freeze = event.params._freeze

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()
}

export function handleRouteRegistered(event: RouteRegisteredEvent): void {
  const entity = new RouteRegistered(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity._trader = event.params._trader
  entity._route = event.params._route
  entity._routeTypeKey = event.params._routeTypeKey

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()
}

export function handleRouteTokensRescued(event: RouteTokensRescuedEvent): void {
  const entity = new RouteTokensRescued(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity._amount = event.params._amount
  entity._token = event.params._token
  entity._receiver = event.params._receiver
  entity._route = event.params._route

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()
}

export function handleRouteTypeSet(event: RouteTypeSetEvent): void {
  const entity = new RouteTypeSet(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity._routeTypeKey = event.params._routeTypeKey
  entity._collateral = event.params._collateral
  entity._index = event.params._index
  entity._isLong = event.params._isLong

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()
}

export function handleRoutesSubscriptionUpdated(
  event: RoutesSubscriptionUpdatedEvent
): void {
  const entity = new RoutesSubscriptionUpdated(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  // entity._traders = event.params._traders
  entity._allowances = event.params._allowances
  entity._puppet = event.params._puppet
  entity._routeTypeKey = event.params._routeTypeKey
  entity._subscribe = event.params._subscribe

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()
}

export function handleThrottleLimitSet(event: ThrottleLimitSetEvent): void {
  const entity = new ThrottleLimitSet(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity._puppet = event.params._puppet
  entity._routeType = event.params._routeType
  entity._throttleLimit = event.params._throttleLimit

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()
}

export function handleTokensRescued(event: TokensRescuedEvent): void {
  const entity = new TokensRescued(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity._amount = event.params._amount
  entity._token = event.params._token
  entity._receiver = event.params._receiver

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()
}

export function handleWithdrawn(event: WithdrawnEvent): void {
  const entity = new Withdrawn(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity._amount = event.params._amount
  entity._asset = event.params._asset
  entity._receiver = event.params._receiver
  entity._puppet = event.params._puppet

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()
}

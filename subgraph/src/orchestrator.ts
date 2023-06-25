import { Bytes } from "@graphprotocol/graph-ts"
import {
  ApprovePlugin as ApprovePluginEvent,
  AuthorityUpdated as AuthorityUpdatedEvent,
  Callback as CallbackEvent,
  CreditPuppet as CreditPuppetEvent,
  DebitPuppet as DebitPuppetEvent,
  DecreaseSize as DecreaseSizeEvent,
  Deposit as DepositEvent,
  Liquidate as LiquidateEvent,
  RegisterRoute as RegisterRouteEvent,
  RequestPositionAdjustment as RequestPositionAdjustmentEvent,
  Send as SendEvent,
  SetRouteType as SetRouteTypeEvent,
  Subscribe as SubscribeEvent,
  Withdraw as WithdrawEvent
} from "../generated/Orchestrator/Orchestrator"
import * as routeFactory from "../generated/RouteFactory/RouteFactory"
import {
  ApprovePlugin,
  AuthorityUpdated,
  CreditPuppet,
  DebitPuppet,
  DecreaseSize,
  Deposit,
  Liquidate,
  PuppetCallback,
  RegisterRoute,
  RequestPositionAdjustment,
  Route,
  Send,
  SetRouteType,
  Subscribe,
  Withdraw
} from "../generated/schema"

export function handleRouteCreated(event: routeFactory.RouteCreated): void {
  const entity = new Route(event.params.route)

  const routeTypeKey = event.params.collateralToken.concat(event.params.indexToken).concatI32(event.params.isLong ? 1 : 0)
  entity.routeTypeKey = routeTypeKey
  entity.trader = event.params.trader
  entity.address = event.params.route

  entity.collateralToken = event.params.collateralToken
  entity.indexToken = event.params.indexToken
  entity.isLong = event.params.isLong

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash
  entity.transactionIndex = event.transaction.index
  entity.logIndex = event.logIndex

  entity.save()
}


export function handleApprovePlugin(event: ApprovePluginEvent): void {
  const entity = new ApprovePlugin(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.caller = event.params.caller
  entity.routeTypeKey = event.params.routeTypeKey

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash
  entity.transactionIndex = event.transaction.index
  entity.logIndex = event.logIndex

  entity.save()
}

export function handleAuthorityUpdated(event: AuthorityUpdatedEvent): void {
  const entity = new AuthorityUpdated(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.user = event.params.user
  entity.newAuthority = event.params.newAuthority

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash
  entity.transactionIndex = event.transaction.index
  entity.logIndex = event.logIndex

  entity.save()
}

export function handleCallback(event: CallbackEvent): void {
  const entity = new PuppetCallback(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.route = event.params.route
  entity.requestKey = event.params.requestKey
  entity.isExecuted = event.params.isExecuted
  entity.isIncrease = event.params.isIncrease

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash
  entity.transactionIndex = event.transaction.index
  entity.logIndex = event.logIndex

  entity.save()
}

export function handleCreditPuppet(event: CreditPuppetEvent): void {
  const entity = new CreditPuppet(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.amount = event.params.amount
  entity.asset = event.params.asset
  entity.puppet = event.params.puppet
  entity.caller = event.params.caller

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash
  entity.transactionIndex = event.transaction.index
  entity.logIndex = event.logIndex

  entity.save()
}

export function handleDebitPuppet(event: DebitPuppetEvent): void {
  const entity = new DebitPuppet(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.amount = event.params.amount
  entity.asset = event.params.asset
  entity.puppet = event.params.puppet
  entity.caller = event.params.caller

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash
  entity.transactionIndex = event.transaction.index
  entity.logIndex = event.logIndex

  entity.save()
}

export function handleDecreaseSize(event: DecreaseSizeEvent): void {
  const entity = new DecreaseSize(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.requestKey = event.params.requestKey
  entity.routeKey = event.params.routeKey

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash
  entity.transactionIndex = event.transaction.index
  entity.logIndex = event.logIndex

  entity.save()
}

export function handleDeposit(event: DepositEvent): void {
  const entity = new Deposit(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.amount = event.params.amount
  entity.asset = event.params.asset
  entity.caller = event.params.caller
  entity.puppet = event.params.puppet

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash
  entity.transactionIndex = event.transaction.index
  entity.logIndex = event.logIndex

  entity.save()
}


export function handleLiquidate(event: LiquidateEvent): void {
  const entity = new Liquidate(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.routeKey = event.params.routeKey

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash
  entity.transactionIndex = event.transaction.index
  entity.logIndex = event.logIndex

  entity.save()
}

export function handleRegisterRoute(event: RegisterRouteEvent): void {
  const entity = new RegisterRoute(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.trader = event.params.trader
  entity.route = event.params.route
  entity.routeTypeKey = event.params.routeTypeKey

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash
  entity.transactionIndex = event.transaction.index
  entity.logIndex = event.logIndex

  entity.save()
}

export function handleRequestPositionAdjustment(
  event: RequestPositionAdjustmentEvent
): void {
  const entity = new RequestPositionAdjustment(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.caller = event.params.caller
  entity.route = event.params.route
  entity.requestKey = event.params.requestKey
  entity.routeTypeKey = event.params.routeTypeKey

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash
  entity.transactionIndex = event.transaction.index
  entity.logIndex = event.logIndex

  entity.save()
}
export function handleSend(event: SendEvent): void {
  const entity = new Send(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.amount = event.params.amount
  entity.asset = event.params.asset
  entity.receiver = event.params.receiver
  entity.caller = event.params.caller

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash
  entity.transactionIndex = event.transaction.index
  entity.logIndex = event.logIndex

  entity.save()
}


export function handleSetRouteType(event: SetRouteTypeEvent): void {
  const entity = new SetRouteType(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.routeTypeKey = event.params.routeTypeKey
  entity.collateral = event.params.collateral
  entity.index = event.params.index
  entity.isLong = event.params.isLong

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash
  entity.transactionIndex = event.transaction.index
  entity.logIndex = event.logIndex

  entity.save()
}

export function handleSubscribe(event: SubscribeEvent): void {
  const entity = new Subscribe(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.traders = event.params.traders.map<Bytes>((e: Bytes) => e)
  entity.allowances = event.params.allowances
  entity.puppet = event.params.puppet
  entity.routeTypeKey = event.params.routeTypeKey
  entity.subscribe = event.params.subscribe

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash
  entity.transactionIndex = event.transaction.index
  entity.logIndex = event.logIndex

  entity.save()
}



export function handleWithdraw(event: WithdrawEvent): void {
  const entity = new Withdraw(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.amount = event.params.amount
  entity.asset = event.params.asset
  entity.receiver = event.params.receiver
  entity.puppet = event.params.puppet

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash
  entity.transactionIndex = event.transaction.index
  entity.logIndex = event.logIndex

  entity.save()
}

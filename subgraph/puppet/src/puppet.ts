import { Value, log, store } from "@graphprotocol/graph-ts"
import {
  AdjustPosition as AdjustPositionEvent,
  Deposit as DepositEvent,
  ExecutePosition as ExecutePositionEvent,
  OpenPosition as OpenPositionEvent,
  SetRouteType as SetRouteTypeEvent,
  SharesIncrease as SharesIncreaseEvent,
  SubscribeRoute as SubscribeRouteEvent,
  Withdraw as WithdrawEvent,
} from "../generated/Orchestrator/Orchestrator"
import {
  AdjustPosition,
  Deposit,
  ExecutePosition,
  MirrorPositionLink,
  MirrorPositionOpen,
  MirrorPositionSettled,
  PositionOpen,
  PuppetPositionOpen,
  PuppetPositionSettled,
  PuppetTradeRoute,
  RequestMirrorPosition,
  SetRouteType,
  SharesIncrease,
  SubscribeTradeRoute,
  Withdraw,
} from "../generated/schema"
import { ZERO_BI } from "./utils/const"

export function handleOpenPosition(event: OpenPositionEvent): void {
  const requestMirrorPosition = new RequestMirrorPosition(event.params.requestKey)

  requestMirrorPosition.puppets = Value.fromAddressArray(event.params.puppets).toBytesArray()
  requestMirrorPosition.trader = event.params.trader
  requestMirrorPosition.tradeRoute = event.params.route
  requestMirrorPosition.isIncrease = event.params.isIncrease
  requestMirrorPosition.requestKey = event.params.requestKey
  requestMirrorPosition.routeTypeKey = event.params.routeTypeKey
  requestMirrorPosition.positionKey = event.params.positionKey

  requestMirrorPosition.blockNumber = event.block.number
  requestMirrorPosition.blockTimestamp = event.block.timestamp
  requestMirrorPosition.transactionHash = event.transaction.hash

  requestMirrorPosition.save()
}


export function handleExecutePosition(event: ExecutePositionEvent): void {
  const executePosition = new ExecutePosition(event.params.requestKey)
  executePosition.performanceFeePaid = event.params.performanceFeePaid
  executePosition.tradeRoute = event.params.route
  executePosition.requestKey = event.params.requestKey
  executePosition.isExecuted = event.params.isExecuted
  executePosition.isIncrease = event.params.isIncrease

  executePosition.blockNumber = event.block.number
  executePosition.blockTimestamp = event.block.timestamp
  executePosition.transactionHash = event.transaction.hash

  executePosition.save()

  if (!event.params.isExecuted) {
    return
  }

  if (event.params.isIncrease) {
    const requestMirrorPosition = RequestMirrorPosition.load(executePosition.requestKey)

    if (requestMirrorPosition !== null) {
      let mirrorPositionOpen = MirrorPositionOpen.load(executePosition.tradeRoute.toHex())

      if (mirrorPositionOpen !== null) {
        log.error("MirrorPositionOpen already exists", [])
        return
      }

      const mirrorPositionLink = new MirrorPositionLink(executePosition.requestKey)
      mirrorPositionOpen = new MirrorPositionOpen(executePosition.tradeRoute.toHex())

      mirrorPositionOpen.link = executePosition.requestKey
      mirrorPositionOpen.position = requestMirrorPosition.positionKey.toHex()

      mirrorPositionOpen.trader = requestMirrorPosition.trader
      mirrorPositionOpen.tradeRoute = requestMirrorPosition.tradeRoute
      mirrorPositionOpen.puppets = requestMirrorPosition.puppets

      mirrorPositionOpen.puppetsShares = []
      mirrorPositionOpen.traderShares = ZERO_BI
      mirrorPositionOpen.totalSupply = ZERO_BI

      mirrorPositionOpen.routeTypeKey = requestMirrorPosition.routeTypeKey
      mirrorPositionOpen.tradeRouteKey = requestMirrorPosition.trader.concat(requestMirrorPosition.routeTypeKey)

      mirrorPositionOpen.blockNumber = event.block.number
      mirrorPositionOpen.blockTimestamp = event.block.timestamp
      mirrorPositionOpen.transactionHash = event.transaction.hash

      for (let i = 0; i < mirrorPositionOpen.puppets.length; i++) {
        const puppet = mirrorPositionOpen.puppets[i]
        const puppetTradeRouteKey = puppet.concat(mirrorPositionOpen.trader).concat(mirrorPositionOpen.routeTypeKey)
        const puppetPositionOpen = new PuppetPositionOpen(puppetTradeRouteKey)

        puppetPositionOpen.position = mirrorPositionOpen.id
        puppetPositionOpen.puppetTradeRoute = puppetTradeRouteKey

        puppetPositionOpen.blockNumber = event.block.number
        puppetPositionOpen.blockTimestamp = event.block.timestamp
        puppetPositionOpen.transactionHash = event.transaction.hash

        puppetPositionOpen.save()
      }

      mirrorPositionLink.save()
      mirrorPositionOpen.save()

      return
    }
  } else {
    const mirrorPositionOpen = MirrorPositionOpen.load(executePosition.tradeRoute.toHex()) 

    if (mirrorPositionOpen === null) {
      log.error("MirrorPositionOpen not found", [])
      return
    }

    if (PositionOpen.load(mirrorPositionOpen.position) !== null) {
      log.error("PositionOpen exists", [])
      return
    }


    for (let i = 0; i < mirrorPositionOpen.puppets.length; i++) {
      const puppet = mirrorPositionOpen.puppets[i]
      const puppetPositionSettled = new PuppetPositionSettled(executePosition.id.concatI32(i))
      const puppetTradeRouteKey = puppet.concat(mirrorPositionOpen.trader).concat(mirrorPositionOpen.routeTypeKey)

      puppetPositionSettled.position = executePosition.id
      puppetPositionSettled.puppetTradeRoute = puppetTradeRouteKey
    
      puppetPositionSettled.blockNumber = event.block.number
      puppetPositionSettled.blockTimestamp = event.block.timestamp
      puppetPositionSettled.transactionHash = event.transaction.hash

      puppetPositionSettled.save()
      store.remove("PuppetPositionOpen", puppetTradeRouteKey.toHex())
    }

    const settledMirrorPosition = new MirrorPositionSettled(executePosition.id)
    settledMirrorPosition.merge([mirrorPositionOpen])
    settledMirrorPosition.id = executePosition.id
    settledMirrorPosition.save()

    store.remove("MirrorPositionOpen", mirrorPositionOpen.id)
  }

}


// function onIncreaseMirrorPosition(executePosition: ExecutePosition): void {

// }

// function onDecreaseMirrorPosition(executePosition: ExecutePosition): void {

// }

export function handleSetRouteType(event: SetRouteTypeEvent): void {
  const entity = new SetRouteType(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.routeTypeKey = event.params.routeTypeKey
  entity.collateralToken = event.params.collateral
  entity.indexToken = event.params.index
  entity.isLong = event.params.isLong
  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()
}

export function handleSharesIncrease(event: SharesIncreaseEvent): void {
  const entity = new SharesIncrease(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )

  entity.puppetsShares = event.params.puppetsShares
  entity.traderShares = event.params.traderShares
  entity.totalSupply = event.params.totalSupply
  entity.requestKey = event.params.requestKey
  entity.tradeRoute = event.params.route

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  const openPosition = MirrorPositionOpen.load(entity.tradeRoute.toHex())

  if (openPosition === null) {
    log.error("MirrorPositionOpen not found", [])
    return
  }

  entity.link = openPosition.link

  if (openPosition) {
    openPosition.puppetsShares = entity.puppetsShares
    openPosition.traderShares = entity.traderShares
    openPosition.totalSupply = entity.totalSupply

    openPosition.save()
  } 
 
  entity.save()
}

export function handleSubscribeRoute(event: SubscribeRouteEvent): void {
  const entity = new SubscribeTradeRoute(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  const puppetTradeRouteKey = event.params.puppet.concat(event.params.trader).concat(event.params.routeTypeKey)
  entity.puppetTradeRoute = puppetTradeRouteKey
  entity.allowance = event.params.allowance
  entity.subscriptionExpiry = event.params.subscriptionExpiry
  entity.trader = event.params.trader
  entity.puppet = event.params.puppet
  entity.tradeRoute = event.params.route
  entity.routeTypeKey = event.params.routeTypeKey
  entity.subscribe = event.params.subscribe

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash


  if (PuppetTradeRoute.load(puppetTradeRouteKey) === null) {
    const puppetTradeRoute = new PuppetTradeRoute(puppetTradeRouteKey)
    puppetTradeRoute.routeTypeKey = entity.routeTypeKey
    puppetTradeRoute.trader = entity.trader
    puppetTradeRoute.puppet = entity.puppet
    puppetTradeRoute.tradeRoute = event.params.route

    puppetTradeRoute.save()
  }

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

  entity.save()
}

export function handleAdjustPosition(event: AdjustPositionEvent): void {
  const entity = new AdjustPosition(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.trader = event.params.trader
  entity.tradeRoute = event.params.route
  entity.isIncrease = event.params.isIncrease
  entity.requestKey = event.params.requestKey
  entity.routeTypeKey = event.params.routeTypeKey

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()
}

// export function handleAdjustTargetLeverage(
//   event: AdjustTargetLeverageEvent
// ): void {
//   const entity = new AdjustTargetLeverage(
//     event.transaction.hash.concatI32(event.logIndex.toI32())
//   )
//   entity.route = event.params.route
//   entity.requestKey = event.params.requestKey
//   entity.routeKey = event.params.routeKey
//   entity.positionKey = event.params.positionKey

//   entity.blockNumber = event.block.number
//   entity.blockTimestamp = event.block.timestamp
//   entity.transactionHash = event.transaction.hash

//   entity.save()
// }

// export function handleAuthorityUpdated(event: AuthorityUpdatedEvent): void {
//   const entity = new AuthorityUpdated(
//     event.transaction.hash.concatI32(event.logIndex.toI32())
//   )
//   entity.user = event.params.user
//   entity.newAuthority = event.params.newAuthority

//   entity.blockNumber = event.block.number
//   entity.blockTimestamp = event.block.timestamp
//   entity.transactionHash = event.transaction.hash

//   entity.save()
// }

// export function handleCreditPlatform(event: CreditPlatformEvent): void {
//   const entity = new CreditPlatform(
//     event.transaction.hash.concatI32(event.logIndex.toI32())
//   )
//   entity.amount = event.params.amount
//   entity.asset = event.params.asset
//   entity.puppet = event.params.puppet
//   entity.caller = event.params.caller
//   entity.isWithdraw = event.params.isWithdraw

//   entity.blockNumber = event.block.number
//   entity.blockTimestamp = event.block.timestamp
//   entity.transactionHash = event.transaction.hash

//   entity.save()
// }

// export function handleCreditPuppet(event: CreditPuppetEvent): void {
//   const entity = new CreditPuppet(
//     event.transaction.hash.concatI32(event.logIndex.toI32())
//   )
//   entity.amount = event.params.amount
//   entity.asset = event.params.asset
//   entity.puppet = event.params.puppet
//   entity.caller = event.params.caller

//   entity.blockNumber = event.block.number
//   entity.blockTimestamp = event.block.timestamp
//   entity.transactionHash = event.transaction.hash

//   entity.save()
// }

// export function handleDebitPuppet(event: DebitPuppetEvent): void {
//   const entity = new DebitPuppet(
//     event.transaction.hash.concatI32(event.logIndex.toI32())
//   )
//   entity.amount = event.params.amount
//   entity.asset = event.params.asset
//   entity.puppet = event.params.puppet
//   entity.caller = event.params.caller

//   entity.blockNumber = event.block.number
//   entity.blockTimestamp = event.block.timestamp
//   entity.transactionHash = event.transaction.hash

//   entity.save()
// }


// export function handleInitialize(event: InitializeEvent): void {
//   const entity = new Initialize(
//     event.transaction.hash.concatI32(event.logIndex.toI32())
//   )
//   entity.keeper = event.params.keeper
//   entity.platformFeeRecipient = event.params.platformFeeRecipient
//   entity.routeFactory = event.params.routeFactory
//   entity.gauge = event.params.gauge
//   entity.routeSetter = event.params.routeSetter

//   entity.blockNumber = event.block.number
//   entity.blockTimestamp = event.block.timestamp
//   entity.transactionHash = event.transaction.hash

//   entity.save()
// }

// export function handleLiquidatePosition(event: LiquidatePositionEvent): void {
//   const entity = new LiquidatePosition(
//     event.transaction.hash.concatI32(event.logIndex.toI32())
//   )
//   entity.route = event.params.route
//   entity.routeKey = event.params.routeKey
//   entity.positionKey = event.params.positionKey

//   entity.blockNumber = event.block.number
//   entity.blockTimestamp = event.block.timestamp
//   entity.transactionHash = event.transaction.hash

//   entity.save()
// }


// export function handleRescueRouteFunds(event: RescueRouteFundsEvent): void {
//   const entity = new RescueRouteFunds(
//     event.transaction.hash.concatI32(event.logIndex.toI32())
//   )
//   entity.amount = event.params.amount
//   entity.token = event.params.token
//   entity.receiver = event.params.receiver
//   entity.route = event.params.route

//   entity.blockNumber = event.block.number
//   entity.blockTimestamp = event.block.timestamp
//   entity.transactionHash = event.transaction.hash

//   entity.save()
// }

// export function handleSetFees(event: SetFeesEvent): void {
//   const entity = new SetFees(
//     event.transaction.hash.concatI32(event.logIndex.toI32())
//   )
//   entity.managmentFee = event.params.managmentFee
//   entity.withdrawalFee = event.params.withdrawalFee
//   entity.performanceFee = event.params.performanceFee

//   entity.blockNumber = event.block.number
//   entity.blockTimestamp = event.block.timestamp
//   entity.transactionHash = event.transaction.hash

//   entity.save()
// }

// export function handleSetFeesRecipient(event: SetFeesRecipientEvent): void {
//   const entity = new SetFeesRecipient(
//     event.transaction.hash.concatI32(event.logIndex.toI32())
//   )
//   entity.recipient = event.params.recipient

//   entity.blockNumber = event.block.number
//   entity.blockTimestamp = event.block.timestamp
//   entity.transactionHash = event.transaction.hash

//   entity.save()
// }

// export function handleSetThrottleLimit(event: SetThrottleLimitEvent): void {
//   const entity = new SetThrottleLimit(
//     event.transaction.hash.concatI32(event.logIndex.toI32())
//   )
//   entity.puppet = event.params.puppet
//   entity.routeType = event.params.routeType
//   entity.throttleLimit = event.params.throttleLimit

//   entity.blockNumber = event.block.number
//   entity.blockTimestamp = event.block.timestamp
//   entity.transactionHash = event.transaction.hash

//   entity.save()
// }


// export function handleRegisterRouteAccount(
//   event: RegisterRouteAccountEvent
// ): void {
//   const entity = new RegisterRouteAccount(
//     event.transaction.hash.concatI32(event.logIndex.toI32())
//   )
//   entity.trader = event.params.trader
//   entity.route = event.params.route
//   entity.routeTypeKey = event.params.routeTypeKey

//   entity.blockNumber = event.block.number
//   entity.blockTimestamp = event.block.timestamp
//   entity.transactionHash = event.transaction.hash

//   entity.save()
// }

// export function handleWithdrawPlatformFees(
//   event: WithdrawPlatformFeesEvent
// ): void {
//   const entity = new WithdrawPlatformFees(
//     event.transaction.hash.concatI32(event.logIndex.toI32())
//   )
//   entity.amount = event.params.amount
//   entity.asset = event.params.asset
//   entity.caller = event.params.caller
//   entity.platformFeeRecipient = event.params.platformFeeRecipient

//   entity.blockNumber = event.block.number
//   entity.blockTimestamp = event.block.timestamp
//   entity.transactionHash = event.transaction.hash

//   entity.save()
// }

// export function handleOwnershipTransferred(
//   event: OwnershipTransferredEvent
// ): void {
//   const entity = new OwnershipTransferred(
//     event.transaction.hash.concatI32(event.logIndex.toI32())
//   )
//   entity.user = event.params.user
//   entity.newOwner = event.params.newOwner

//   entity.blockNumber = event.block.number
//   entity.blockTimestamp = event.block.timestamp
//   entity.transactionHash = event.transaction.hash

//   entity.save()
// }

// export function handlePause(event: PauseEvent): void {
//   const entity = new Pause(
//     event.transaction.hash.concatI32(event.logIndex.toI32())
//   )
//   entity.paused = event.params.paused

//   entity.blockNumber = event.block.number
//   entity.blockTimestamp = event.block.timestamp
//   entity.transactionHash = event.transaction.hash

//   entity.save()
// }



// export function handleTransferRouteFunds(event: TransferRouteFundsEvent): void {
//   const entity = new TransferRouteFunds(
//     event.transaction.hash.concatI32(event.logIndex.toI32())
//   )
//   entity.amount = event.params.amount
//   entity.asset = event.params.asset
//   entity.receiver = event.params.receiver
//   entity.caller = event.params.caller

//   entity.blockNumber = event.block.number
//   entity.blockTimestamp = event.block.timestamp
//   entity.transactionHash = event.transaction.hash

//   entity.save()
// }

// export function handleUpdateKeeper(event: UpdateKeeperEvent): void {
//   const entity = new UpdateKeeper(
//     event.transaction.hash.concatI32(event.logIndex.toI32())
//   )
//   entity.keeper = event.params.keeper

//   entity.blockNumber = event.block.number
//   entity.blockTimestamp = event.block.timestamp
//   entity.transactionHash = event.transaction.hash

//   entity.save()
// }

// export function handleUpdateMultiSubscriber(
//   event: UpdateMultiSubscriberEvent
// ): void {
//   const entity = new UpdateMultiSubscriber(
//     event.transaction.hash.concatI32(event.logIndex.toI32())
//   )
//   entity.multiSubscriber = event.params.multiSubscriber

//   entity.blockNumber = event.block.number
//   entity.blockTimestamp = event.block.timestamp
//   entity.transactionHash = event.transaction.hash

//   entity.save()
// }

// export function handleUpdateOpenTimestamp(
//   event: UpdateOpenTimestampEvent
// ): void {
//   const entity = new UpdateOpenTimestamp(
//     event.transaction.hash.concatI32(event.logIndex.toI32())
//   )
//   entity.puppets = Value.fromAddressArray(event.params.puppets).toBytesArray()
//   entity.routeType = event.params.routeType

//   entity.blockNumber = event.block.number
//   entity.blockTimestamp = event.block.timestamp
//   entity.transactionHash = event.transaction.hash

//   entity.save()
// }

// export function handleUpdateReferralCode(event: UpdateReferralCodeEvent): void {
//   const entity = new UpdateReferralCode(
//     event.transaction.hash.concatI32(event.logIndex.toI32())
//   )
//   entity.referralCode = event.params.referralCode

//   entity.blockNumber = event.block.number
//   entity.blockTimestamp = event.block.timestamp
//   entity.transactionHash = event.transaction.hash

//   entity.save()
// }

// export function handleUpdateRouteFactory(event: UpdateRouteFactoryEvent): void {
//   const entity = new UpdateRouteFactory(
//     event.transaction.hash.concatI32(event.logIndex.toI32())
//   )
//   entity.routeFactory = event.params.routeFactory

//   entity.blockNumber = event.block.number
//   entity.blockTimestamp = event.block.timestamp
//   entity.transactionHash = event.transaction.hash

//   entity.save()
// }

// export function handleUpdateScoreGauge(event: UpdateScoreGaugeEvent): void {
//   const entity = new UpdateScoreGauge(
//     event.transaction.hash.concatI32(event.logIndex.toI32())
//   )
//   entity.scoreGauge = event.params.scoreGauge

//   entity.blockNumber = event.block.number
//   entity.blockTimestamp = event.block.timestamp
//   entity.transactionHash = event.transaction.hash

//   entity.save()
// }
// import { Address } from "@graphprotocol/graph-ts"
// import * as orchestrator from "../generated/Orchestrator/Orchestrator"
// import * as routeFactory from "../generated/RouteFactory/RouteFactory"
// import {
//   Route, RequestPositionAdjustment, PositionSlot, MirrorPositionSlot, ExecuteAdjustment
// } from "../generated/schema"
// import { getPositionKey, getUniqueEventId } from "./helpers"

// const orchestratorAddress = Address.fromString("0x92A3f7796f05305600864F38A77DF3812f664Df8")
// const Orchestrator = orchestrator.Orchestrator.bind(orchestratorAddress)


// export function handleCallback(event: orchestrator.Callback): void {
//   const route = Route.load(event.params.route)

//   if (route == null) {
//     throw new Error("Route not found")
//   }

//   const positionKey = getPositionKey(route.collateralToken, route.indexToken, route.isLong)
//   const positionSlot = PositionSlot.load(positionKey)

//   if (positionSlot == null) {
//     throw new Error("PositionSlot not found")
//   }

//   const executeAdjustment = new ExecuteAdjustment(event.params.requestKey)
//   const mirrorPosition = new MirrorPositionSlot(positionKey)

//   mirrorPosition.positionSlot = positionSlot.id
//   mirrorPosition.link = positionSlot.link

//   executeAdjustment.keeperExecution = event.params.route
//   executeAdjustment.route = event.params.route
//   executeAdjustment.requestKey = event.params.requestKey
//   executeAdjustment.isExecuted = event.params.isExecuted
//   executeAdjustment.isIncrease = event.params.isIncrease

//   executeAdjustment.blockNumber = event.block.number
//   executeAdjustment.blockTimestamp = event.block.timestamp
//   executeAdjustment.transactionHash = event.transaction.hash

//   executeAdjustment.save()
// }


// export function handleRequestPositionAdjustment(event: orchestrator.RequestPositionAdjustment): void {
//   const entity = new RequestPositionAdjustment(getUniqueEventId(event))
//   entity.caller = event.params.caller
//   entity.route = event.params.route
//   entity.requestKey = event.params.requestKey
//   entity.routeTypeKey = event.params.routeTypeKey

//   entity.blockNumber = event.block.number
//   entity.blockTimestamp = event.block.timestamp
//   entity.transactionHash = event.transaction.hash

//   entity.save()
// }






// // export function handleSubscribe(event: orchestrator.Subscribe): void {
// //   const entity = new Subscribe(getUniqueEventId(event))
// //   entity.traders = event.params.traders
// //   entity.allowances = event.params.allowances
// //   entity.puppet = event.params.puppet
// //   entity.routeTypeKey = event.params.routeTypeKey
// //   entity.subscribe = event.params.subscribe

// //   entity.blockNumber = event.block.number
// //   entity.blockTimestamp = event.block.timestamp
// //   entity.transactionHash = event.transaction.hash

// //   entity.save()
// // }



// // export function handleWithdraw(event: orchestrator.Withdraw): void {
// //   const entity = new Transfer(getUniqueEventId(event))
// //   entity.token = event.params.asset
// //   entity.to = event.params.receiver
// //   entity.from = event.params.puppet
// //   entity.amount = event.params.amount
// //   entity.amountUsd = event.params.amount
// //   entity.timestamp = event.block.timestamp
// //   entity.transactionHash = event.transaction.hash

// //   entity.save()
// // }





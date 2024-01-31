import {
  AddRewards as AddRewardsEvent,
  Exercise as ExerciseEvent,
  Mint as MintEvent,
  Refund as RefundEvent,
  SetDiscount as SetDiscountEvent
} from "../generated/OptionPuppet/OptionPuppet"
import {
  AddRewards,
  Exercise,
  Mint,
  Refund,
  SetDiscount
} from "../generated/schema"

export function handleAddRewards(event: AddRewardsEvent): void {
  const entity = new AddRewards(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.amount = event.params.amount
  entity.gauge = event.params.gauge

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()
}


export function handleExercise(event: ExerciseEvent): void {
  const entity = new Exercise(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.amount = event.params.amount
  entity.strike = event.params.strike
  entity.OptionPuppet_id = event.params.id
  entity.receiver = event.params.receiver
  entity.sender = event.params.sender

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()
}

export function handleMint(event: MintEvent): void {
  const entity = new Mint(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.price = event.params.price
  entity.amount = event.params.amount
  entity.strike = event.params.strike
  entity.expiry = event.params.expiry
  entity.OptionPuppet_id = event.params.id
  entity.gauge = event.params.gauge
  entity.receiver = event.params.receiver

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()
}


export function handleRefund(event: RefundEvent): void {
  const entity = new Refund(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.sender = event.params.sender
  entity.receiver = event.params.receiver
  entity.amount = event.params.amount
  entity.strike = event.params.strike
  entity.OptionPuppet_id = event.params.id

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()
}

export function handleSetDiscount(event: SetDiscountEvent): void {
  const entity = new SetDiscount(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.discount = event.params.discount

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()
}




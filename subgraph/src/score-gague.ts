import {
  Claim as ClaimEvent,
  DepositRewards as DepositRewardsEvent,
  WeightsUpdate as WeightsUpdateEvent
} from "../generated/ScoreGague/ScoreGague"
import {
  Claim,
  DepositRewards,
  WeightsUpdate
} from "../generated/schema"


export function handleClaim(event: ClaimEvent): void {
  const entity = new Claim(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.epoch = event.params.epoch
  entity.userReward = event.params.userReward
  entity.user = event.params.user
  entity.receiver = event.params.receiver

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()
}

export function handleDepositRewards(event: DepositRewardsEvent): void {
  const entity = new DepositRewards(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.amount = event.params.amount

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()
}

export function handleWeightsUpdate(event: WeightsUpdateEvent): void {
  const entity = new WeightsUpdate(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.profitWeight = event.params.profitWeight
  entity.volumeWeight = event.params.volumeWeight

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()
}

// export function handleUserScoreUpdate(event: UserScoreUpdateEvent): void {
//   const entity = new UserScoreUpdate(
//     event.transaction.hash.concatI32(event.logIndex.toI32())
//   )
//   entity.user = event.params.user
//   entity.volume = event.params.volume
//   entity.profit = event.params.profit

//   entity.blockNumber = event.block.number
//   entity.blockTimestamp = event.block.timestamp
//   entity.transactionHash = event.transaction.hash

//   entity.save()
// }


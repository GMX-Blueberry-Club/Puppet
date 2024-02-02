import { getMappedValue } from "common-utils"
import * as PUPPET from "puppet-middleware-const"
import { Address } from "viem"
import * as walletLink from "wallet"





export async function readEpochInfo(
  provider: walletLink.IClient,
  epoch = 0n,
  contractDefs = getMappedValue(PUPPET.CONTRACT, provider.chain.id)
) {
  const [
    profitRewards, volumeRewards, totalProfit, totalVolume, profitWeight, volumeWeight,
  ] = await walletLink.readContract({
    ...contractDefs.ScoreGaugeV1,
    provider,
    functionName: 'epochInfo',
    args: [epoch]
  })

  return {
    profitRewards,
    volumeRewards,
    totalProfit,
    totalVolume,
    profitWeight,
    volumeWeight,
  }
}

export async function readClaimableRewards(
  provider: walletLink.IClient,
  contractDefs = getMappedValue(PUPPET.CONTRACT, provider.chain.id),
  epoch: bigint,
  user: Address,
) {
  return walletLink.readContract({
    ...contractDefs.ScoreGaugeV1,
    provider,
    functionName: 'claimableRewards',
    args: [epoch, user]
  })
}


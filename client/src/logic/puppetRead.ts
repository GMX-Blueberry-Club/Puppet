
import { getMappedValue } from "common-utils"
import * as GMX from "gmx-middleware-const"
import * as PUPPET from "puppet-middleware-const"
import {
  getPuppetAllowancesKey, getPuppetDepositAccountKey,
  getPuppetSubscriptionExpiryKey, getTradeRouteKey
} from "puppet-middleware-utils"
import * as viem from "viem"
import { readContract } from "viem/actions"
import * as walletLink from "wallet"


export async function readPuppetSubscriptionExpiry(
  provider: walletLink.IClient,
  puppet: viem.Address,
  trader: viem.Address,
  collateralToken: viem.Address,
  indexToken: viem.Address,
  isLong: boolean,
  contractDefs = getMappedValue(PUPPET.CONTRACT, provider.chain.id),
) {
  const routeKey = getTradeRouteKey(trader, collateralToken, indexToken, isLong)
  const puppetSubscriptionExpiryKey = getPuppetSubscriptionExpiryKey(puppet, routeKey)

  return walletLink.readContract({
    ...contractDefs.Datastore,
    provider,
    functionName: 'getUint',
    args: [puppetSubscriptionExpiryKey],
  }).catch(err => {
    return 0n
  })
}

export async function readPuppetDepositAmount(
  provider: walletLink.IClient,
  address: viem.Address,
  tokenAddress = GMX.ARBITRUM_ADDRESS.USDC,
  contractDefs = getMappedValue(PUPPET.CONTRACT, provider.chain.id),
) {
  return walletLink.readContract({
    ...contractDefs.Datastore,
    provider,
    functionName: 'getUint',
    args: [getPuppetDepositAccountKey(address, tokenAddress)],
  }).catch(err => {
    return 0n
  })
}

export async function readPuppetAllowance(
  provider: walletLink.IClient,
  puppet: viem.Address,
  tradeRoute: viem.Address,
  contractDefs = getMappedValue(PUPPET.CONTRACT, provider.chain.id),
) {
  
  const [exists, factor] = await readContract(provider, {
    ...contractDefs.Datastore,
    functionName: 'tryGetAddressToUintFor',
    args: [getPuppetAllowancesKey(puppet), tradeRoute]
  })

  return exists ? factor : 0n
}

export async function readUserLockDetails(
  provider: walletLink.IClient,
  address: viem.Address,
  contractDefs = getMappedValue(PUPPET.CONTRACT, provider.chain.id),
) {
  
  const [amount, end] = await readContract(provider, {
    ...contractDefs.VotingEscrow,
    functionName: 'locked',
    args: [address]
  })

  return { amount, end }
}

export async function readLockSupply(
  provider: walletLink.IClient,
  contractDefs = getMappedValue(PUPPET.CONTRACT, provider.chain.id),
) {
  
  const supply = await readContract(provider, {
    ...contractDefs.VotingEscrow,
    functionName: 'supply',
    args: []
  })

  return supply
}

export async function readTotalEmitted(
  provider: walletLink.IClient,
  contractDefs = getMappedValue(PUPPET.CONTRACT, provider.chain.id),
) {
  
  const puppetSupply = await readContract(provider, {
    ...contractDefs.PuppetToken,
    functionName: 'totalEmitted',
    args: []
  })

  return puppetSupply
}

export async function readPuppetSupply(
  provider: walletLink.IClient,
  contractDefs = getMappedValue(PUPPET.CONTRACT, provider.chain.id),
) {
  
  const puppetSupply = await readContract(provider, {
    ...contractDefs.PuppetToken,
    functionName: 'totalSupply',
    args: []
  })

  return puppetSupply
}

export async function readClaimablePuppetAmount(
  provider: walletLink.IClient,
  contractDefs = getMappedValue(PUPPET.CONTRACT, provider.chain.id),
  address: viem.Address,
) {
  
  const puppetSupply = await readContract(provider, {
    ...contractDefs.RewardLogic,
    functionName: 'getAccountGeneratedRevenue',
    args: [contractDefs.RewardLogic.address, address]
  })

  return puppetSupply
}

export async function readPuppetPriceInUsd(
  provider: walletLink.IClient,
  contractDefs = getMappedValue(PUPPET.CONTRACT, provider.chain.id)
) {

  const wntUsdSourceList = ['0xc6962004f452be9203591991d15f6b388e09e8d0', '0xC31E54c7a869B9FcBEcc14363CF510d1c41fa443', '0x641C00A822e8b671738d32a431a4Fb6074E5c79d' ] as const
  const balancerVault = '0xBA12222222228d8Ba445958a75a0704d566BF2C8'
  const poolId = '0xc6295e969be65560d1cb8ce06b1b20e62337625c00020000000000000000050f'
  
  const puppetSupply = await readContract(provider, {
    ...contractDefs.OracleLogic,
    functionName: 'getPuppetExchangeRateInUsdc',
    args: [wntUsdSourceList, balancerVault, poolId, 20]
  })

  return puppetSupply
}


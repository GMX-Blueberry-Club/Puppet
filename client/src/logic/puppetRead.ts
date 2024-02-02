
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
): Promise<bigint> {
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
): Promise<bigint> {
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
): Promise<bigint> {
  
  const [exists, factor] = await readContract(provider, {
    ...contractDefs.Datastore,
    functionName: 'tryGetAddressToUintFor',
    args: [getPuppetAllowancesKey(puppet), tradeRoute]
  })

  return exists ? factor : 0n
}
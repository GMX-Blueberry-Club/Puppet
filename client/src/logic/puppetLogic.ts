
import * as wagmi from "@wagmi/core"
import * as PUPPET from "puppet-middleware-const"
import { getPuppetAllowancesKey, getPuppetDepositAccountKey, getPuppetSubscriptionExpiryKey, getTradeRouteKey } from "puppet-middleware-utils"
import * as viem from "viem"
import { } from "viem"
import { arbitrum } from "viem/chains"
import * as GMX from "gmx-middleware-const"
import { wagmiConfig } from "../wallet/walletLink"
import { walletLink } from "../wallet"

export async function getPuppetSubscriptionExpiry(
  puppet: viem.Address,
  trader: viem.Address,
  collateralToken: viem.Address,
  indexToken: viem.Address,
  isLong: boolean,
  chainId = arbitrum.id
): Promise<bigint> {

  const puppetContractMap = PUPPET.CONTRACT[chainId]
  const routeKey = getTradeRouteKey(trader, collateralToken, indexToken, isLong)
  const puppetSubscriptionExpiryKey = getPuppetSubscriptionExpiryKey(puppet, routeKey)
  
  return wagmi.readContract(wagmiConfig, {
    ...puppetContractMap.Datastore,
    functionName: 'getUint',
    args: [puppetSubscriptionExpiryKey],
  })
}

export async function getPuppetDepositAmount(
  address: viem.Address,
  chainId = arbitrum.id,
  tokenAddress = GMX.ARBITRUM_ADDRESS.USDC
): Promise<bigint> {

  const puppetContractMap = PUPPET.CONTRACT[chainId]

  return wagmi.readContract(wagmiConfig, {
    ...puppetContractMap.Datastore,
    functionName: 'getUint',
    args: [getPuppetDepositAccountKey(address, tokenAddress)],
  })
}


export async function getPuppetAllowance(
  puppet: viem.Address,
  tradeRoute: viem.Address,
  chainId = arbitrum.id
): Promise<bigint> {

  const puppetContractMap = PUPPET.CONTRACT[chainId]

  const [exists, factor] = await wagmi.readContract(walletLink.wagmiConfig, {
    ...puppetContractMap.Datastore,
    functionName: 'tryGetAddressToUintFor',
    args: [getPuppetAllowancesKey(puppet), tradeRoute]
  })

  return exists ? factor : 0n
}


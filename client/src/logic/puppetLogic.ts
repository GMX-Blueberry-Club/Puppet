
import * as wagmi from "@wagmi/core"
import * as PUPPET from "puppet-middleware-const"
import { getPuppetDepositAccountKey, getPuppetSubscriptionExpiryKey, getTradeRouteKey } from "puppet-middleware-utils"
import * as viem from "viem"
import { } from "viem"
import { arbitrum } from "viem/chains"
import * as GMX from "gmx-middleware-const"
import { wagmiConfig } from "../wallet/walletLink"

export async function getPuppetSubscriptionExpiry(
  puppet: viem.Address,
  collateralToken: viem.Address,
  indexToken: viem.Address,
  isLong: boolean,
  chainId = arbitrum.id
): Promise<bigint> {

  const puppetContractMap = PUPPET.CONTRACT[chainId]
  const routeKey = getTradeRouteKey(puppet, collateralToken, indexToken, isLong)

  return wagmi.readContract(wagmiConfig, {
    ...puppetContractMap.Datastore,
    functionName: 'getUint',
    args: [getPuppetSubscriptionExpiryKey(puppet, routeKey)],
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
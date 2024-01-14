
import * as wagmi from "@wagmi/core"
import * as PUPPET from "puppet-middleware-const"
import { getPuppetSubscriptionExpiryKey, getTradeRouteKey } from "puppet-middleware-utils"
import * as viem from "viem"
import { } from "viem"
import { arbitrum } from "viem/chains"


export async function getPuppetSubscriptionExpiry(
  puppet: viem.Address,
  collateralToken: viem.Address,
  indexToken: viem.Address,
  isLong: boolean,
  chainId = arbitrum.id
): Promise<bigint> {

  const puppetContractMap = PUPPET.CONTRACT[chainId]
  const routeKey = getTradeRouteKey(puppet, collateralToken, indexToken, isLong)

  return wagmi.readContract({
    ...puppetContractMap.Datastore,
    functionName: 'getUint',
    args: [getPuppetSubscriptionExpiryKey(puppet, routeKey)],
  })
}

import * as PUPPET from "puppet-middleware-const"
import { getPuppetSubscriptionExpiryKey, getTradeRouteKey } from "puppet-middleware-utils"
import * as viem from "viem"
import { } from "viem"
import { arbitrum } from "viem/chains"
import { contractReader } from "./common"

export function getPuppetSubscriptionExpiry(
  puppet: viem.Address,
  collateralToken: viem.Address,
  indexToken: viem.Address,
  isLong: boolean,
  chainId = arbitrum.id
) {
  const puppetContractMap = PUPPET.CONTRACT[chainId]
  const datastoreReader = contractReader(puppetContractMap.Datastore) 
  const routeKey = getTradeRouteKey(puppet, collateralToken, indexToken, isLong)
  return datastoreReader('getUint', getPuppetSubscriptionExpiryKey(puppet, routeKey))
}
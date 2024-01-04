
import { now } from "@most/core"
import {
  switchMap
} from "gmx-middleware-utils"
import * as PUPPET from "puppet-middleware-const"
import { getPuppetSubscriptionExpiryKey, getTradeRouteKey } from "puppet-middleware-utils"
import * as viem from "viem"
import { } from "viem"
import { arbitrum } from "viem/chains"
import { wallet } from "../wallet/walletLink.js"
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
  
  return switchMap(w3p => {
    if (!w3p) {
      return now(0n)
    }

    const routeKey = getTradeRouteKey(puppet, collateralToken, indexToken, isLong)

    return w3p ? datastoreReader('getUint', getPuppetSubscriptionExpiryKey(w3p.account.address, routeKey)) : now(0n)
  }, wallet)
}
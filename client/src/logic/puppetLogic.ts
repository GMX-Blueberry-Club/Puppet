
import { getMappedValue } from "common-utils"
import * as GMX from "gmx-middleware-const"
import * as PUPPET from "puppet-middleware-const"
import { 
  getPuppetAllowancesKey, getPuppetDepositAccountKey,
  getPuppetSubscriptionExpiryKey, getTradeRouteKey
} from "puppet-middleware-utils"
import * as viem from "viem"
import { } from "viem"
import { readContract } from "viem/actions"
import { IWalletClient } from "../wallet/walletLink"

export async function getPuppetSubscriptionExpiry(
  wallet: IWalletClient,
  puppet: viem.Address,
  trader: viem.Address,
  collateralToken: viem.Address,
  indexToken: viem.Address,
  isLong: boolean,
): Promise<bigint> {

  const puppetContractMap = getMappedValue(PUPPET.CONTRACT, wallet.chain.id)
  const routeKey = getTradeRouteKey(trader, collateralToken, indexToken, isLong)
  const puppetSubscriptionExpiryKey = getPuppetSubscriptionExpiryKey(puppet, routeKey)
  
  return readContract(wallet, {
    ...puppetContractMap.Datastore,
    
    functionName: 'getUint',
    args: [puppetSubscriptionExpiryKey],
  })
}

export async function getPuppetDepositAmount(
  wallet: IWalletClient,
  address: viem.Address,
  tokenAddress = GMX.ARBITRUM_ADDRESS.USDC
): Promise<bigint> {
  const puppetContractMap = getMappedValue(PUPPET.CONTRACT, wallet.chain.id)

  return readContract(wallet, {
    ...puppetContractMap.Datastore,
    functionName: 'getUint',
    args: [getPuppetDepositAccountKey(address, tokenAddress)],
  })
}

export async function getPuppetAllowance(
  wallet: IWalletClient,
  puppet: viem.Address,
  tradeRoute: viem.Address,
): Promise<bigint> {

  const puppetContractMap = getMappedValue(PUPPET.CONTRACT, wallet.chain.id)
  
  const [exists, factor] = await readContract(wallet, {
    ...puppetContractMap.Datastore,
    functionName: 'tryGetAddressToUintFor',
    args: [getPuppetAllowancesKey(puppet), tradeRoute]
  })

  return exists ? factor : 0n
}


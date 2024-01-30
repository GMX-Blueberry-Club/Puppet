
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
import * as walletLink from "wallet"
import { IWriteContractReturnQuery, writeContract } from "./commonLogic"
import { IChangeSubscription } from "../components/portfolio/$RouteSubscriptionEditor"

export async function getPuppetSubscriptionExpiry(
  wallet: walletLink.IWalletClient,
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
  }).catch(err => {
    return 0n
  })
}

export async function getPuppetDepositAmount(
  wallet: walletLink.IWalletClient,
  address: viem.Address,
  tokenAddress = GMX.ARBITRUM_ADDRESS.USDC
): Promise<bigint> {
  const puppetContractMap = getMappedValue(PUPPET.CONTRACT, wallet.chain.id)

  return readContract(wallet, {
    ...puppetContractMap.Datastore,
    functionName: 'getUint',
    args: [getPuppetDepositAccountKey(address, tokenAddress)],
  }).catch(err => {
    return 0n
  })
}

export async function getPuppetAllowance(
  wallet: walletLink.IWalletClient,
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

export type IDepositFundsReturnType = IWriteContractReturnQuery<typeof PUPPET['CONTRACT']['42161']['Orchestrator']['abi'], 'Deposit'>
export async function depositFunds(
  wallet: walletLink.IWalletClient,
  token: viem.Address,
  amount: bigint,
  receiver = wallet.account.address,
): IDepositFundsReturnType {
  const puppetContractMap = getMappedValue(PUPPET.CONTRACT, wallet.chain.id)
  return writeContract(wallet, {
    ...puppetContractMap.Orchestrator,
    functionName: 'deposit',
    eventName: 'Deposit',
    args: [amount, token, receiver] as const
  })
}

export type IWithdrawFundsReturnType = IWriteContractReturnQuery<typeof PUPPET['CONTRACT']['42161']['Orchestrator']['abi'], 'Withdraw'>
export async function withdrawFunds(
  wallet: walletLink.IWalletClient,
  token: viem.Address,
  amount: bigint,
  receiver = wallet.account.address,
  isEth = false,
): IWithdrawFundsReturnType {
  const puppetContractMap = getMappedValue(PUPPET.CONTRACT, wallet.chain.id)
  return writeContract(wallet, {
    ...puppetContractMap.Orchestrator,
    functionName: 'withdraw',
    eventName: 'Withdraw',
    args: [amount, token, receiver, isEth]
  })
}

export type IBatchSubscribeReturnType = IWriteContractReturnQuery<typeof PUPPET['CONTRACT']['42161']['Orchestrator']['abi'], 'Subscribe'>
export async function batchSubscribe(
  wallet: walletLink.IWalletClient,
  subscribeParamList: IChangeSubscription[],
): IBatchSubscribeReturnType {
  const puppetContractMap = getMappedValue(PUPPET.CONTRACT, wallet.chain.id)

  const allowances = subscribeParamList.map(x => x.allowance)
  const expiries = subscribeParamList.map(x => x.expiry)
  const traders = subscribeParamList.map(a => a.trader)
  const routeTypeKeys = subscribeParamList.map(x => x.routeTypeKey)

  return writeContract(wallet, {
    ...puppetContractMap.Orchestrator,
    functionName: 'batchSubscribe',
    eventName: 'Subscribe',
    args: [wallet.account.address, allowances, expiries, traders, routeTypeKeys]
  })
}
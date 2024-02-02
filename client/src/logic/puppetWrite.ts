
import { getMappedValue } from "common-utils"
import * as PUPPET from "puppet-middleware-const"
import {
  getPuppetAllowancesKey
} from "puppet-middleware-utils"
import * as viem from "viem"
import { } from "viem"
import { readContract } from "viem/actions"
import * as walletLink from "wallet"
import { IChangeSubscription } from "../components/portfolio/$RouteSubscriptionEditor.js"




export type IDepositFundsReturnType = ReturnType<typeof writeDepositFunds>
export async function writeDepositFunds(
  walletClient: walletLink.IWalletClient,
  token: viem.Address,
  amount: bigint,
  receiver = walletClient.account.address,
  contractDefs = getMappedValue(PUPPET.CONTRACT, walletClient.chain.id),
): walletLink.IWriteContractReturn<typeof contractDefs['Orchestrator']['abi'], 'Deposit'> {
  return walletLink.writeContract({
    ...contractDefs.Orchestrator,
    walletClient,
    functionName: 'deposit',
    eventName: 'Deposit',
    args: [amount, token, receiver] as const
  })
}

export type IWithdrawFundsReturnType = ReturnType<typeof writeWithdrawFunds>
export async function writeWithdrawFunds(
  walletClient: walletLink.IWalletClient,
  token: viem.Address,
  amount: bigint,
  receiver = walletClient.account.address,
  isEth = false,
  contractDefs = getMappedValue(PUPPET.CONTRACT, walletClient.chain.id),
): walletLink.IWriteContractReturn<typeof contractDefs['Orchestrator']['abi'], 'Withdraw'> {
  return walletLink.writeContract({
    ...contractDefs.Orchestrator,
    walletClient,
    functionName: 'withdraw',
    eventName: 'Withdraw',
    args: [amount, token, receiver, isEth]
  })
}

export type IBatchSubscribeReturnType = ReturnType<typeof writeBatchSubscribe>
export async function writeBatchSubscribe(
  walletClient: walletLink.IWalletClient,
  subscribeParamList: IChangeSubscription[],
  contractDefs = getMappedValue(PUPPET.CONTRACT, walletClient.chain.id),
): walletLink.IWriteContractReturn<typeof contractDefs['Orchestrator']['abi'], 'Subscribe'> {
  const allowances = subscribeParamList.map(x => x.allowance)
  const expiries = subscribeParamList.map(x => x.expiry)
  const traders = subscribeParamList.map(a => a.trader)
  const routeTypeKeys = subscribeParamList.map(x => x.routeTypeKey)

  return walletLink.writeContract({
    ...contractDefs.Orchestrator,
    walletClient,
    functionName: 'batchSubscribe',
    eventName: 'Subscribe',
    args: [walletClient.account.address, allowances, expiries, traders, routeTypeKeys]
  })
}
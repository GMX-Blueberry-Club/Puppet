
import * as abitype from "abitype"
import { getMappedValue } from "common-utils"
import * as viem from "viem"
import { waitForTransactionReceipt } from "viem/actions"
import { arbitrum } from "viem/chains"
import * as walletLink from "wallet"
import * as PUPPET from "puppet-middleware-const"



export type IWriteContractReturnQuery<
  TAbi extends abitype.Abi = viem.Abi,
  TEventName extends | viem.ContractEventName<TAbi> | viem.ContractEventName<TAbi>[] | undefined = undefined,
> = Promise<{
  transactionReceipt: viem.TransactionReceipt<typeof arbitrum>
  events: viem.ParseEventLogsReturnType<TAbi, TEventName, true>
}>

export const writeContract = async <
  const TAbi extends abitype.Abi,
  TFunctionName extends viem.ContractFunctionName<TAbi, 'nonpayable' | 'payable'>,
  TArgs extends viem.ContractFunctionArgs<TAbi, 'nonpayable' | 'payable', TFunctionName>,
  TChain extends viem.Chain,
  TEventName extends | viem.ContractEventName<TAbi> | viem.ContractEventName<TAbi>[] | undefined = undefined,
>(
  walletClient: walletLink.IWalletClient,
  writeParams: Omit<viem.WriteContractParameters<TAbi, TFunctionName, TArgs, TChain>, 'account'> & { eventName?: TEventName }
): IWriteContractReturnQuery<TAbi, TEventName> => {
  const hash = await walletClient.writeContract({ ...writeParams, account: walletClient.account } as any)
  const transactionReceipt: viem.TransactionReceipt<typeof arbitrum> = await waitForTransactionReceipt(walletClient, { hash })
  const events = viem.parseEventLogs({
    eventName: writeParams.eventName,
    abi: writeParams.abi,
    logs: transactionReceipt.logs as any,
  })
  
  
  return { events, transactionReceipt }
}


export type IApproveSpendReturnType = IWriteContractReturnQuery<typeof viem.erc20Abi, 'Approval'>

export async function approveSpend(
  wallet: walletLink.IWalletClient,
  token: viem.Address,
  amount = 2n ** 256n - 1n,
  spender = getMappedValue(PUPPET.CONTRACT, wallet.chain.id).Orchestrator.address,
): IApproveSpendReturnType {
  return writeContract(wallet, {
    address: token,
    abi: viem.erc20Abi,
    eventName: 'Approval',
    functionName: 'approve',
    args: [spender, amount]
  })
}
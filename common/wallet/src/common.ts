
import * as abitype from "abitype"
import { 
  readContract as viemReadContract, writeContract as viemWriteContract,
  WriteContractParameters, simulateContract, waitForTransactionReceipt
} from "viem/actions"
import { Chain, arbitrum } from "viem/chains"
import { IClient, IWalletClient } from "./connect.js"
import { Abi, ContractEventName, TransactionReceipt, ParseEventLogsReturnType, ContractFunctionName, ContractFunctionArgs, parseEventLogs, ReadContractParameters, ReadContractReturnType } from "viem"


export type IWriteContractReturn<
  TAbi extends abitype.Abi = Abi,
  TEventName extends | ContractEventName<TAbi> | ContractEventName<TAbi>[] | undefined = undefined,
> = Promise<{
  transactionReceipt: TransactionReceipt
  events: ParseEventLogsReturnType<TAbi, TEventName, true>
}>


export type IWriteContractParams<
  TAbi extends abitype.Abi,
  TFunctionName extends ContractFunctionName<TAbi, 'nonpayable' | 'payable'>,
  TArgs extends ContractFunctionArgs<TAbi, 'nonpayable' | 'payable', TFunctionName>,
  TChain extends Chain,
  TEventName extends | ContractEventName<TAbi> | ContractEventName<TAbi>[] | undefined = undefined,
> = Omit<WriteContractParameters<TAbi, TFunctionName, TArgs, TChain>, 'account'> & {eventName?: TEventName, walletClient: IWalletClient}
export async function writeContract <
  const TAbi extends abitype.Abi,
  TFunctionName extends ContractFunctionName<TAbi, 'nonpayable' | 'payable'>,
  TArgs extends ContractFunctionArgs<TAbi, 'nonpayable' | 'payable', TFunctionName>,
  TChain extends Chain,
  TEventName extends | ContractEventName<TAbi> | ContractEventName<TAbi>[] | undefined = undefined,
>(writeParams: IWriteContractParams<TAbi, TFunctionName, TArgs, TChain, TEventName>,): IWriteContractReturn<TAbi, TEventName> {

  try {
    const walletClient = writeParams.walletClient
    const sim = await simulateContract(writeParams.walletClient, { ...writeParams, account: walletClient.account } as any)
    const hash = await viemWriteContract(writeParams.walletClient, sim.request)
    const transactionReceipt = await waitForTransactionReceipt(walletClient, { hash })
    const events = parseEventLogs({
      eventName: writeParams.eventName,
      abi: writeParams.abi,
      logs: transactionReceipt.logs as any,
    })
  
    return { events, transactionReceipt } 
  } catch (error) {
    console.error(error)
    throw error
  }
}

export async function readContract <
  TAbi extends abitype.Abi,
  TFunctionName extends ContractFunctionName<TAbi, 'view'>,
  TArgs extends ContractFunctionArgs<TAbi, 'view', TFunctionName>
>(parameters: ReadContractParameters<TAbi, TFunctionName, TArgs> & { provider: IClient }): Promise<ReadContractReturnType<TAbi, TFunctionName, TArgs>> {
  return viemReadContract(parameters.provider, parameters as any)
}
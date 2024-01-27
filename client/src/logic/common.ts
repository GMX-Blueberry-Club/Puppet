
import * as abitype from "abitype"
import * as viem from "viem"

import { getTransactionReceipt } from "viem/actions"
import { IWalletClient } from "../wallet/walletLink"



export const writeContract = async <
  const TAbi extends abitype.Abi,
  TFunctionName extends viem.ContractFunctionName<TAbi, 'nonpayable' | 'payable'>,
  TArgs extends viem.ContractFunctionArgs<TAbi, 'nonpayable' | 'payable', TFunctionName>,
  TChain extends viem.Chain,
>(
  walletClient: IWalletClient,
  writeParams: Omit<viem.WriteContractParameters<TAbi, TFunctionName, TArgs, TChain>, 'account'>
): Promise<viem.FormattedTransactionReceipt<TChain>> => {
  const hash = await walletClient.writeContract({ ...writeParams, account: walletClient.account } as any)
  const recpt = await getTransactionReceipt(walletClient, { hash })
  
  return recpt as any
}




import { Address } from "abitype"
import { getMappedValue } from "common-utils"
import * as PUPPET from "puppet-middleware-const"
import { erc20Abi } from "viem"
import * as walletLink from "wallet"



export type IApproveSpendReturn = ReturnType<typeof writeApproveSpend>
export type IMinterMintReturn = ReturnType<typeof writeMinterMint>
export async function writeMinterMint(
  walletClient: walletLink.IWalletClient,
  contractDefs = getMappedValue(PUPPET.CONTRACT, walletClient.chain.id),
  gauge = contractDefs.ScoreGaugeV1.address,
): walletLink.IWriteContractReturn<typeof contractDefs['Minter']['abi'], 'Minted'> {
  return walletLink.writeContract({
    ...contractDefs.Minter,
    walletClient,
    eventName: 'Minted',
    functionName: 'mint',
    args: [gauge]
  })
}

export type IWriteAdvanceEpochReturn = ReturnType<typeof writeAdvanceEpoch>
export async function writeAdvanceEpoch(
  walletClient: walletLink.IWalletClient,
  contractDefs = getMappedValue(PUPPET.CONTRACT, walletClient.chain.id),
): walletLink.IWriteContractReturn<typeof contractDefs['GaugeController']['abi'], 'AdvanceEpoch'> {

  return walletLink.writeContract({
    ...contractDefs.GaugeController,
    walletClient,
    eventName: 'AdvanceEpoch',
    functionName: 'advanceEpoch',
    args: []
  })
}

export async function writeApproveSpend(
  walletClient: walletLink.IWalletClient,
  token: Address,
  amount = 2n ** 256n - 1n,
  contractDefs = getMappedValue(PUPPET.CONTRACT, walletClient.chain.id),
  spender = contractDefs.Orchestrator.address
): walletLink.IWriteContractReturn<typeof erc20Abi, 'Approval'> {
  return walletLink.writeContract({
    walletClient,
    address: token,
    abi: erc20Abi,
    eventName: 'Approval',
    functionName: 'approve',
    args: [spender, amount]
  })
}

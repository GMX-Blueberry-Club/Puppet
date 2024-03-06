
import { erc20Abi } from "abitype/abis"
import { getMappedValue } from "common-utils"
import { Address } from "viem"
import { readContract } from "viem/actions"
import * as walletLink from "wallet"
import * as PUPPET from "puppet-middleware-const"



export async function readBalanceOf(
  wallet: walletLink.IClient,
  token: Address,
  address: Address
): Promise<bigint> {

  return walletLink.readContract({
    address: token,
    abi: erc20Abi,
    provider: wallet,
    functionName: 'balanceOf',
    args: [address],
  })
}

// export async function readRouterConfig(
//   provider: walletLink.IClient,
//   contractDefs = getMappedValue(PUPPET.CONTRACT, provider.chain.id),
// ) {
  
//   const puppetSupply = await readContract(provider, {
//     ...contractDefs.RewardRouter,
//     functionName: 'owner',
//     args: []
//   })

//   return puppetSupply
// }
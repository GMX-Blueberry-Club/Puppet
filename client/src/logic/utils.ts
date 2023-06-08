import { AddressZero, CHAIN, CHAIN_ADDRESS_MAP, TOKEN_ADDRESS_TO_SYMBOL } from "gmx-middleware-const"
import { ITokenInput, ITokenTrade, getSafeMappedValue } from "gmx-middleware-utils"



export function resolveAddress(chain: CHAIN, indexToken: ITokenInput): ITokenTrade {
  if (indexToken === AddressZero) {
    return getSafeMappedValue(CHAIN_ADDRESS_MAP, chain, CHAIN.ARBITRUM).NATIVE_TOKEN
  }

  const contractAddressMap = getSafeMappedValue(TOKEN_ADDRESS_TO_SYMBOL, indexToken, indexToken)

  if (contractAddressMap === null) {
    throw new Error(`Token ${indexToken} does not exist`)
  }

  return indexToken
}

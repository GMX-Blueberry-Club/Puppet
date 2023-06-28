import { Stream } from "@most/types"
import { AddressZero, CHAIN, CHAIN_ADDRESS_MAP, TOKEN_ADDRESS_TO_SYMBOL } from "gmx-middleware-const"
import { StreamInputArray, getSafeMappedValue } from "gmx-middleware-utils"
import { zipArray as zipArrayMost } from "@most/core"
import * as viem from "viem"


export function resolveAddress(chain: CHAIN, indexToken: viem.Address): viem.Address {
  if (indexToken === AddressZero) {
    return getSafeMappedValue(CHAIN_ADDRESS_MAP, chain, CHAIN.ARBITRUM).NATIVE_TOKEN
  }

  const contractAddressMap = getSafeMappedValue(TOKEN_ADDRESS_TO_SYMBOL, indexToken, indexToken as any)

  if (contractAddressMap === null) {
    throw new Error(`Token ${indexToken} does not exist`)
  }

  return indexToken
}

export function zipArray<A extends any[], B>(cb: (...args: A) => B, ...streamList: StreamInputArray<A>): Stream<B> {
  return zipArrayMost(cb, streamList)
}
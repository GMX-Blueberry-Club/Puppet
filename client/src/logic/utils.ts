import { Stream } from "@most/types"
import { ADDRESS_ZERO, CHAIN, CHAIN_ADDRESS_MAP, TOKEN_ADDRESS_DESCRIPTION_MAP, mapArrayBy } from "gmx-middleware-const"
import { StreamInputArray, getSafeMappedValue } from "gmx-middleware-utils"
import { zipArray as zipArrayMost } from "@most/core"
import * as viem from "viem"
import { ROUTE_DESCRIPTION } from "puppet-middleware-const"
import { getRouteTypeKey } from "puppet-middleware-utils"


export function resolveAddress(chain: CHAIN, indexToken: viem.Address): viem.Address {
  if (indexToken === ADDRESS_ZERO) {
    return getSafeMappedValue(CHAIN_ADDRESS_MAP, chain, CHAIN.ARBITRUM).NATIVE_TOKEN
  }

  const contractAddressMap = getSafeMappedValue(TOKEN_ADDRESS_DESCRIPTION_MAP, indexToken, indexToken as any)

  if (contractAddressMap === null) {
    throw new Error(`Token ${indexToken} does not exist`)
  }

  return indexToken
}

export function zipArray<A extends any[], B>(cb: (...args: A) => B, ...streamList: StreamInputArray<A>): Stream<B> {
  return zipArrayMost(cb, streamList)
}

export const ROUTE_DESCRIPTIN_MAP = mapArrayBy(ROUTE_DESCRIPTION, r => getRouteTypeKey(r.collateralToken, r.indexToken, r.isLong), r => r)

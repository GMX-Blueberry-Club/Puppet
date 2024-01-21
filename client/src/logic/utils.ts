import { zipArray as zipArrayMost } from "@most/core"
import { Stream } from "@most/types"
import { mapArrayBy } from "gmx-middleware-const"
import { StreamInputArray } from "gmx-middleware-utils"
import { ROUTE_DESCRIPTION } from "puppet-middleware-const"
import { getRouteTypeKey } from "puppet-middleware-utils"




export function zipArray<A extends any[], B>(cb: (...args: A) => B, ...streamList: StreamInputArray<A>): Stream<B> {
  return zipArrayMost(cb, streamList)
}

export const ROUTE_DESCRIPTIN_MAP = mapArrayBy(ROUTE_DESCRIPTION, r => getRouteTypeKey(r.collateralToken, r.indexToken, r.isLong, '0x'), r => r)

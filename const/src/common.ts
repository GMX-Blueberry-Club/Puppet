import { ARBITRUM_ADDRESS, mapArrayBy } from "gmx-middleware-const"
import { getRouteTypeKey } from "./mapUtils.js"

export const ROUTE_DESCRIPTION = [
  {
    collateralToken: ARBITRUM_ADDRESS.NATIVE_TOKEN,
    indexToken: ARBITRUM_ADDRESS.NATIVE_TOKEN,
    isLong: true
  },
  {
    collateralToken: ARBITRUM_ADDRESS.USDC,
    indexToken: ARBITRUM_ADDRESS.NATIVE_TOKEN,
    isLong: true
  },
]

export const ROUTE_TYPE_DESCRIPTIN = mapArrayBy(ROUTE_DESCRIPTION, r => getRouteTypeKey(r.collateralToken, r.indexToken, r.isLong), r => r)

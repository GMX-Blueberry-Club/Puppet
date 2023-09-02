import { ARBITRUM_ADDRESS } from "gmx-middleware-const"

export const ROUTE_DESCRIPTION = [
  {
    collateralToken: ARBITRUM_ADDRESS.NATIVE_TOKEN,
    indexToken: ARBITRUM_ADDRESS.NATIVE_TOKEN,
    isLong: true
  },
  {
    collateralToken: ARBITRUM_ADDRESS.USDC,
    indexToken: ARBITRUM_ADDRESS.NATIVE_TOKEN,
    isLong: false
  },
]


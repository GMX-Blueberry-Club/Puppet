import { IntervalTime } from "common-utils"
import { ARBITRUM_ADDRESS, TOKEN_SYMBOL } from "gmx-middleware-const"

export const PUPPET_TOKEN_DESCRIPTION = {
  name: "PUPPET",
  symbol: TOKEN_SYMBOL.PUPPET,
  decimals: 18,
  denominator: 10n ** 18n,
  isUsd: false,
}

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

export const START_EPOCH_TIME = 1709164800 // The date of the first epoch
export const EPOCH_DURATION = 604800 // Duration in seconds of each epoch
export const EMISSION_PERIOD_IN_EPOCHS = 2600 // Approx. 50 years in epochs

export const MAX_SUPPLY = 100_000_000 // Total supply of PUPPET tokens
export const INITIAL_SUPPLY = 30_000_000 // The initial supply of PUPPET tokens
export const WEEKLY_EMISSIONS = (MAX_SUPPLY - INITIAL_SUPPLY) / EMISSION_PERIOD_IN_EPOCHS // Tokens to be emitted each epoch

export const MAX_LOCKUP_SCHEDULE = IntervalTime.YEAR * 2 // Maximum lockup schedule in seconds


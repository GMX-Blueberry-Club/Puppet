/* eslint-disable @typescript-eslint/no-duplicate-enum-values */

import { BigInt } from "@graphprotocol/graph-ts"

export const ADDRESS_ZERO = '0x0000000000000000000000000000000000000000'
export const ZERO_BYTES32 = "0x0000000000000000000000000000000000000000000000000000000000000000"

export const BASIS_POINTS_DIVISOR = BigInt.fromI32(10000)
export const FUNDING_RATE_PRECISION = BigInt.fromI32(1000000)
export const MARGIN_FEE_BASIS_POINTS = BigInt.fromI32(10)


export const ZERO_BI = BigInt.fromI32(0)
export const ONE_BI = BigInt.fromI32(1)
export const BI_18 = BigInt.fromI32(18)
export const BI_10 = BigInt.fromI32(10)

export const BI_12_PRECISION = BigInt.fromI32(10).pow(12)
export const BI_18_PRECISION = BigInt.fromI32(10).pow(18)
export const BI_22_PRECISION = BigInt.fromI32(10).pow(22)





export enum TokenDecimals {
  USDC = 6,
  USDT = 6,
  BTC = 8,
  WETH = 18,
  LINK = 18,
  UNI = 18,
  MIM = 18,
  SPELL = 18,
  SUSHI = 18,
  AVAX = 18,
  FRAX = 18,
  DAI = 18,
  GMX = 18,
  GLP = 18,
}


export enum IntervalUnixTime {
  SEC = 1,
  SEC60 = 60,
  MIN5 = 300,
  MIN15 = 900,
  MIN30 = 1800,
  MIN60 = 3600,
  HR2 = 7200,
  HR4 = 14400,
  HR6 = 21600,
  HR8 = 28800,
  HR24 = 86400,
  DAY7 = 604800,
  MONTH = 2628000,
  MONTH2 = 5256000,
  YEAR = 31536000,
}

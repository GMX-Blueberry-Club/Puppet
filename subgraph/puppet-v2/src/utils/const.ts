/* eslint-disable @typescript-eslint/no-duplicate-enum-values */

import { Address, BigInt, Bytes } from "@graphprotocol/graph-ts"

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


export const MARKET_TOKEN_MAP = new Map<string, Bytes>()
MARKET_TOKEN_MAP.set(Address.fromHexString("0x47c031236e19d024b42f8AE6780E44A573170703").toHex(), Address.fromHexString("0x47904963fc8b2340414262125aF798B9655E58Cd"))
MARKET_TOKEN_MAP.set(Address.fromHexString("0x70d95587d40A2caf56bd97485aB3Eec10Bee6336").toHex(), Address.fromHexString("0x82aF49447D8a07e3bd95BD0d56f35241523fBab1"))
MARKET_TOKEN_MAP.set(Address.fromHexString("0x6853EA96FF216fAb11D2d930CE3C508556A4bdc4").toHex(), Address.fromHexString("0xC4da4c24fd591125c3F47b340b6f4f76111883d8"))
MARKET_TOKEN_MAP.set(Address.fromHexString("0x09400D9DB990D5ed3f35D7be61DfAEB900Af03C9").toHex(), Address.fromHexString("0x2bcC6D6CdBbDC0a4071e48bb3B969b06B3330c07"))
MARKET_TOKEN_MAP.set(Address.fromHexString("0xD9535bB5f58A1a75032416F2dFe7880C30575a41").toHex(), Address.fromHexString("0xB46A094Bc4B0adBD801E14b9DB95e05E28962764"))
MARKET_TOKEN_MAP.set(Address.fromHexString("0xc7Abb2C5f3BF3CEB389dF0Eecd6120D451170B50").toHex(), Address.fromHexString("0xFa7F8980b0f1E64A2062791cc3b0871572f1F7f0"))
MARKET_TOKEN_MAP.set(Address.fromHexString("0x7f1fa204bb700853D36994DA19F830b6Ad18455C").toHex(), Address.fromHexString("0xf97f4df75117a78c1A5a0DBb814Af92458539FB4"))
MARKET_TOKEN_MAP.set(Address.fromHexString("0xC25cEf6061Cf5dE5eb761b50E4743c1F5D7E5407").toHex(), Address.fromHexString("0x912CE59144191C1204E64559FE8253a0e49E6548"))
MARKET_TOKEN_MAP.set(Address.fromHexString("0x9C2433dFD71096C435Be9465220BB2B189375eA7").toHex(), Address.fromHexString("0x0000000000000000000000000000000000000000"))
MARKET_TOKEN_MAP.set(Address.fromHexString("0xB686BcB112660343E6d15BDb65297e110C8311c4").toHex(), Address.fromHexString("0x0000000000000000000000000000000000000000"))
MARKET_TOKEN_MAP.set(Address.fromHexString("0xe2fEDb9e6139a182B98e7C2688ccFa3e9A53c665").toHex(), Address.fromHexString("0x0000000000000000000000000000000000000000"))
MARKET_TOKEN_MAP.set(Address.fromHexString("0x0CCB4fAa6f1F1B30911619f1184082aB4E25813c").toHex(), Address.fromHexString("0xc14e065b0067dE91534e032868f5Ac6ecf2c6868"))


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

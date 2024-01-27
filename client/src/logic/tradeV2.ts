import * as wagmi from "@wagmi/core"
import * as GMX from "gmx-middleware-const"
import { hashData, IMarket, IMarketConfig, IMarketFees, IMarketInfo, IMarketPool, IMarketPrice, IMarketUsageInfo } from "gmx-middleware-utils"
import { factor, getMappedValue } from "common-utils"
import * as viem from 'viem'



export function hashKey(key: string) {
  return hashData(["string"], [key])
}

const POSITION_IMPACT_FACTOR_KEY = "POSITION_IMPACT_FACTOR"
const MAX_POSITION_IMPACT_FACTOR_KEY = "MAX_POSITION_IMPACT_FACTOR"
const POSITION_IMPACT_EXPONENT_FACTOR_KEY = "POSITION_IMPACT_EXPONENT_FACTOR"
const POSITION_FEE_FACTOR_KEY = "POSITION_FEE_FACTOR"
const OPEN_INTEREST_KEY = "OPEN_INTEREST"
const OPEN_INTEREST_IN_TOKENS_KEY = "OPEN_INTEREST_IN_TOKENS"
const RESERVE_FACTOR_KEY = "RESERVE_FACTOR"
const OPEN_INTEREST_RESERVE_FACTOR_KEY = "OPEN_INTEREST_RESERVE_FACTOR"
const MAX_PNL_FACTOR_KEY = "MAX_PNL_FACTOR"
const MAX_PNL_FACTOR_FOR_TRADERS_KEY = "MAX_PNL_FACTOR_FOR_TRADERS"
const MAX_POSITION_IMPACT_FACTOR_FOR_LIQUIDATIONS_KEY = "MAX_POSITION_IMPACT_FACTOR_FOR_LIQUIDATION"
const POSITION_IMPACT_POOL_AMOUNT_KEY = "POSITION_IMPACT_POOL_AMOUNT"
const MIN_COLLATERAL_FACTOR_KEY = "MIN_COLLATERAL_FACTOR"
const INCREASE_ORDER_GAS_LIMIT_KEY = "INCREASE_ORDER_GAS_LIMIT"
const ESTIMATED_GAS_FEE_BASE_AMOUNT = "ESTIMATED_GAS_FEE_BASE_AMOUNT"
const ESTIMATED_GAS_FEE_MULTIPLIER_FACTOR = "ESTIMATED_GAS_FEE_MULTIPLIER_FACTOR"



export async function getMarketPoolUsage(
  chain: viem.Chain,
  market: IMarket
): Promise<IMarketUsageInfo> {
  const datastoreContract = getMappedValue(GMX.CONTRACT, chain.id).Datastore
  // const v2Reader = contractReader(readerV2)


  // const isDisabled = wagmi.readContract(wagmiConfig, {
  //   ...datastoreContract,
  //   functionName: 'getBool',
  //   args: [hashData(["bytes32", "address"], [hashKey(IS_MARKET_DISABLED_KEY), market.marketToken])],
  // })

  // const longPoolAmount = wagmi.readContract(wagmiConfig, {
  //   ...datastoreContract,
  //   functionName: 'getUint',
  //   args: [hashData(["bytes32", "address", "address"], [hashKey(POOL_AMOUNT_KEY), market.marketToken, market.longToken])],
  // })


  // const shortPoolAmount = wagmi.readContract(wagmiConfig, {
  //   ...datastoreContract,
  //   functionName: 'getUint',
  //   args: [hashData(["bytes32", "address", "address"], [hashKey(POOL_AMOUNT_KEY), market.marketToken, market.shortToken])],
  // })


  // const maxLongPoolAmount = wagmi.readContract(wagmiConfig, {
  //   ...datastoreContract,
  //   functionName: 'getUint',
  //   args: [hashData(["bytes32", "address", "address"], [hashKey(MAX_POOL_AMOUNT_KEY), market.marketToken, market.longToken])],
  // })

  // const maxShortPoolAmount = wagmi.readContract(wagmiConfig, {
  //   ...datastoreContract,
  //   functionName: 'getUint',
  //   args: [hashData(["bytes32", "address", "address"], [hashKey(MAX_POOL_AMOUNT_KEY), market.marketToken, market.shortToken])],
  // })

  // const longPoolAmountAdjustment = wagmi.readContract(wagmiConfig, {
  //   ...datastoreContract,
  //   functionName: 'getUint',
  //   args: [hashData(["bytes32", "address", "address"], [hashKey(POOL_AMOUNT_ADJUSTMENT_KEY), market.marketToken, market.longToken])],
  // })
  
  // const shortPoolAmountAdjustment = wagmi.readContract(wagmiConfig, {
  //   ...datastoreContract,
  //   functionName: 'getUint',
  //   args: [hashData(["bytes32", "address", "address"], [hashKey(POOL_AMOUNT_ADJUSTMENT_KEY), market.marketToken, market.shortToken])],
  // })

  // const reserveFactorLong = wagmi.readContract(wagmiConfig, {
  //   ...datastoreContract,
  //   functionName: 'getUint',
  //   args: [hashData(["bytes32", "address", "bool"], [hashKey(RESERVE_FACTOR_KEY), market.marketToken, true])],
  // })

  // const reserveFactorShort = wagmi.readContract(wagmiConfig, {
  //   ...datastoreContract,
  //   functionName: 'getUint',
  //   args: [hashData(["bytes32", "address", "bool"], [hashKey(RESERVE_FACTOR_KEY), market.marketToken, false])],
  // })

  // const openInterestReserveFactorLong = wagmi.readContract(wagmiConfig, {
  //   ...datastoreContract,
  //   functionName: 'getUint',
  //   args: [hashData(["bytes32", "address", "bool"], [hashKey(OPEN_INTEREST_RESERVE_FACTOR_KEY), market.marketToken, true])],
  // })

  // const openInterestReserveFactorShort = wagmi.readContract(wagmiConfig, {
  //   ...datastoreContract,
  //   functionName: 'getUint',
  //   args: [hashData(["bytes32", "address", "bool"], [hashKey(OPEN_INTEREST_RESERVE_FACTOR_KEY), market.marketToken, false])],
  // })

  const positionImpactPoolAmount = wagmi.readContract(wagmiConfig, {
    ...datastoreContract,
    functionName: 'getUint',
    args: [hashData(["bytes32", "address"], [hashKey(POSITION_IMPACT_POOL_AMOUNT_KEY), market.marketToken])],
  })

  // const swapImpactPoolAmountLong = wagmi.readContract(wagmiConfig, {
  //   ...datastoreContract,
  //   functionName: 'getUint',
  //   args: [hashData(["bytes32", "address", "address"], [hashKey(SWAP_IMPACT_POOL_AMOUNT_KEY), market.marketToken, market.longToken])],
  // })

  // const swapImpactPoolAmountShort = wagmi.readContract(wagmiConfig, {
  //   ...datastoreContract,
  //   functionName: 'getUint',
  //   args: [hashData(["bytes32", "address", "address"], [hashKey(SWAP_IMPACT_POOL_AMOUNT_KEY), market.marketToken, market.shortToken])],
  // })

  // const borrowingFactorLong = wagmi.readContract(wagmiConfig, {
  //   ...datastoreContract,
  //   functionName: 'getUint',
  //   args: [hashData(["bytes32", "address", "bool"], [hashKey(BORROWING_FACTOR_KEY), market.marketToken, true])],
  // })

  // const borrowingFactorShort = wagmi.readContract(wagmiConfig, {
  //   ...datastoreContract,
  //   functionName: 'getUint',
  //   args: [hashData(["bytes32", "address", "bool"], [hashKey(BORROWING_FACTOR_KEY), market.marketToken, false])],
  // })

  // const borrowingExponentFactorLong = wagmi.readContract(wagmiConfig, {
  //   ...datastoreContract,
  //   functionName: 'getUint',
  //   args: [hashData(["bytes32", "address", "bool"], [hashKey(BORROWING_EXPONENT_FACTOR_KEY), market.marketToken, true])],
  // })

  // const borrowingExponentFactorShort = wagmi.readContract(wagmiConfig, {
  //   ...datastoreContract,
  //   functionName: 'getUint',
  //   args: [hashData(["bytes32", "address", "bool"], [hashKey(BORROWING_EXPONENT_FACTOR_KEY), market.marketToken, false])],
  // })

  // const fundingFactor = wagmi.readContract(wagmiConfig, {
  //   ...datastoreContract,
  //   functionName: 'getUint',
  //   args: [hashData(["bytes32", "address"], [hashKey(FUNDING_FACTOR_KEY), market.marketToken])],
  // })

  // const fundingExponentFactor = wagmi.readContract(wagmiConfig, {
  //   ...datastoreContract,
  //   functionName: 'getUint',
  //   args: [hashData(["bytes32", "address"], [hashKey(FUNDING_EXPONENT_FACTOR_KEY), market.marketToken])],
  // })

  // const maxPnlFactorForTradersLong = wagmi.readContract(wagmiConfig, {
  //   ...datastoreContract,
  //   functionName: 'getUint',
  //   args: [hashData(["bytes32", "bytes32", "address", "bool"], [hashKey(MAX_PNL_FACTOR_KEY), hashKey(MAX_PNL_FACTOR_FOR_TRADERS_KEY), market.marketToken, true])],
  // })

  // const maxPnlFactorForTradersShort = wagmi.readContract(wagmiConfig, {
  //   ...datastoreContract,
  //   functionName: 'getUint',
  //   args: [hashData(["bytes32", "bytes32", "address", "bool"], [hashKey(MAX_PNL_FACTOR_KEY), hashKey(MAX_PNL_FACTOR_FOR_TRADERS_KEY), market.marketToken, false])],
  // })

  // const positionFeeFactorForPositiveImpact = wagmi.readContract(wagmiConfig, {
  //   ...datastoreContract,
  //   functionName: 'getUint',
  //   args: [hashData(["bytes32", "address", "bool"], [hashKey(POSITION_FEE_FACTOR_KEY), market.marketToken, true])],
  // })

  // const positionFeeFactorForNegativeImpact = wagmi.readContract(wagmiConfig, {
  //   ...datastoreContract,
  //   functionName: 'getUint',
  //   args: [hashData(["bytes32", "address", "bool"], [hashKey(POSITION_FEE_FACTOR_KEY), market.marketToken, false])],
  // })

  // const positionImpactFactorPositive = wagmi.readContract(wagmiConfig, {
  //   ...datastoreContract,
  //   functionName: 'getUint',
  //   args: [hashData(["bytes32", "address", "bool"], [hashKey(POSITION_IMPACT_FACTOR_KEY), market.marketToken, true])],
  // })

  // const positionImpactFactorNegative = wagmi.readContract(wagmiConfig, {
  //   ...datastoreContract,
  //   functionName: 'getUint',
  //   args: [hashData(["bytes32", "address", "bool"], [hashKey(POSITION_IMPACT_FACTOR_KEY), market.marketToken, false])],
  // })

  // const maxPositionImpactFactorPositive = wagmi.readContract(wagmiConfig, {
  //   ...datastoreContract,
  //   functionName: 'getUint',
  //   args: [hashData(["bytes32", "address", "bool"], [hashKey(MAX_POSITION_IMPACT_FACTOR_KEY), market.marketToken, true])],
  // })

  // const maxPositionImpactFactorNegative = wagmi.readContract(wagmiConfig, {
  //   ...datastoreContract,
  //   functionName: 'getUint',
  //   args: [hashData(["bytes32", "address", "bool"], [hashKey(MAX_POSITION_IMPACT_FACTOR_KEY), market.marketToken, false])],
  // })

  // const maxPositionImpactFactorForLiquidations = wagmi.readContract(wagmiConfig, {
  //   ...datastoreContract,
  //   functionName: 'getUint',
  //   args: [hashData(["bytes32", "address"], [hashKey(MAX_POSITION_IMPACT_FACTOR_FOR_LIQUIDATIONS_KEY), market.marketToken])],
  // })

  // const minCollateralFactor = wagmi.readContract(wagmiConfig, {
  //   ...datastoreContract,
  //   functionName: 'getUint',
  //   args: [hashData(["bytes32", "address"], [hashKey(MIN_COLLATERAL_FACTOR_KEY), market.marketToken])],
  // })

  // const minCollateralFactorForOpenInterestLong = wagmi.readContract(wagmiConfig, {
  //   ...datastoreContract,
  //   functionName: 'getUint',
  //   args: [hashData(["bytes32", "address", "bool"], [hashKey(MIN_COLLATERAL_FACTOR_FOR_OPEN_INTEREST_MULTIPLIER_KEY), market.marketToken, true])],
  // })

  // const minCollateralFactorForOpenInterestShort = wagmi.readContract(wagmiConfig, {
  //   ...datastoreContract,
  //   functionName: 'getUint',
  //   args: [hashData(["bytes32", "address", "bool"], [hashKey(MIN_COLLATERAL_FACTOR_FOR_OPEN_INTEREST_MULTIPLIER_KEY), market.marketToken, false])],
  // })

  // const positionImpactExponentFactor = wagmi.readContract(wagmiConfig, {
  //   ...datastoreContract,
  //   functionName: 'getUint',
  //   args: [hashData(["bytes32", "address"], [hashKey(POSITION_IMPACT_EXPONENT_FACTOR_KEY), market.marketToken])],
  // })

  // const swapFeeFactorForPositiveImpact = wagmi.readContract(wagmiConfig, {
  //   ...datastoreContract,
  //   functionName: 'getUint',
  //   args: [hashData(["bytes32", "address", "bool"], [hashKey(SWAP_FEE_FACTOR_KEY), market.marketToken, true])],
  // })

  // const swapFeeFactorForNegativeImpact = wagmi.readContract(wagmiConfig, {
  //   ...datastoreContract,
  //   functionName: 'getUint',
  //   args: [hashData(["bytes32", "address", "bool"], [hashKey(SWAP_FEE_FACTOR_KEY), market.marketToken, false])],
  // })

  // const swapImpactFactorPositive = wagmi.readContract(wagmiConfig, {
  //   ...datastoreContract,
  //   functionName: 'getUint',
  //   args: [hashData(["bytes32", "address", "bool"], [hashKey(SWAP_IMPACT_FACTOR_KEY), market.marketToken, true])],
  // })

  // const swapImpactFactorNegative = wagmi.readContract(wagmiConfig, {
  //   ...datastoreContract,
  //   functionName: 'getUint',
  //   args: [hashData(["bytes32", "address", "bool"], [hashKey(SWAP_IMPACT_FACTOR_KEY), market.marketToken, false])],
  // })

  // const swapImpactExponentFactor = wagmi.readContract(wagmiConfig, {
  //   ...datastoreContract,
  //   functionName: 'getUint',
  //   args: [hashData(["bytes32", "address"], [hashKey(SWAP_IMPACT_EXPONENT_FACTOR_KEY), market.marketToken])],
  // })

  const longInterestUsingLongToken = wagmi.readContract(wagmiConfig, {
    ...datastoreContract,
    functionName: 'getUint',
    args: [hashData(["bytes32", "address", "address", "bool"], [hashKey(OPEN_INTEREST_KEY), market.marketToken, market.longToken, true])],
  })

  const longInterestUsingShortToken = wagmi.readContract(wagmiConfig, {
    ...datastoreContract,
    functionName: 'getUint',
    args: [hashData(["bytes32", "address", "address", "bool"], [hashKey(OPEN_INTEREST_KEY), market.marketToken, market.shortToken, true])],
  })

  const shortInterestUsingLongToken = wagmi.readContract(wagmiConfig, {
    ...datastoreContract,
    functionName: 'getUint',
    args: [hashData(["bytes32", "address", "address", "bool"], [hashKey(OPEN_INTEREST_KEY), market.marketToken, market.longToken, false])],
  })

  const shortInterestUsingShortToken = wagmi.readContract(wagmiConfig, {
    ...datastoreContract,
    functionName: 'getUint',
    args: [hashData(["bytes32", "address", "address", "bool"], [hashKey(OPEN_INTEREST_KEY), market.marketToken, market.shortToken, false])],
  })

  const longInterestInTokensUsingLongToken = wagmi.readContract(wagmiConfig, {
    ...datastoreContract,
    functionName: 'getUint',
    args: [hashData(["bytes32", "address", "address", "bool"], [hashKey(OPEN_INTEREST_IN_TOKENS_KEY), market.marketToken, market.longToken, true])],
  })

  const longInterestInTokensUsingShortToken = wagmi.readContract(wagmiConfig, {
    ...datastoreContract,
    functionName: 'getUint',
    args: [hashData(["bytes32", "address", "address", "bool"], [hashKey(OPEN_INTEREST_IN_TOKENS_KEY), market.marketToken, market.shortToken, true])],
  })

  const shortInterestInTokensUsingLongToken = wagmi.readContract(wagmiConfig, {
    ...datastoreContract,
    functionName: 'getUint',
    args: [hashData(["bytes32", "address", "address", "bool"], [hashKey(OPEN_INTEREST_IN_TOKENS_KEY), market.marketToken, market.longToken, false])],
  })

  const shortInterestInTokensUsingShortToken = wagmi.readContract(wagmiConfig, {
    ...datastoreContract,
    functionName: 'getUint',
    args: [hashData(["bytes32", "address", "address", "bool"], [hashKey(OPEN_INTEREST_IN_TOKENS_KEY), market.marketToken, market.shortToken, false])],
  })

  const newLocal = {
    longInterestInTokens: await longInterestInTokensUsingLongToken + await longInterestInTokensUsingShortToken,
    shortInterestInTokens: await shortInterestInTokensUsingLongToken + await shortInterestInTokensUsingShortToken,

    longInterestUsd: await longInterestUsingLongToken + await longInterestUsingShortToken,
    shortInterestUsd: await shortInterestUsingLongToken + await shortInterestUsingShortToken,

    longInterestInTokensUsingLongToken: await longInterestInTokensUsingLongToken,
    longInterestInTokensUsingShortToken: await longInterestInTokensUsingShortToken,
    shortInterestInTokensUsingLongToken: await shortInterestInTokensUsingLongToken,
    shortInterestInTokensUsingShortToken: await shortInterestInTokensUsingShortToken,
    positionImpactPoolAmount: await positionImpactPoolAmount,
  }
  // const virtualMarketId = wagmi.readContract(wagmiConfig, {
  //   ...datastoreContract,
  //   functionName: 'getBytes32',
  //   args: [hashData(["bytes32", "address"], [hashKey(VIRTUAL_MARKET_ID_KEY), market.marketToken])],
  // })

  // const virtualLongTokenId = wagmi.readContract(wagmiConfig, {
  //   ...datastoreContract,
  //   functionName: 'getBytes32',
  //   args: [hashData(["bytes32", "address"], [hashKey(VIRTUAL_TOKEN_ID_KEY), market.longToken])],
  // })

  // const virtualShortTokenId = wagmi.readContract(wagmiConfig, {
  //   ...datastoreContract,
  //   functionName: 'getBytes32',
  //   args: [hashData(["bytes32", "address"], [hashKey(VIRTUAL_TOKEN_ID_KEY), market.shortToken])],
  // })



  // debugger
  return newLocal
}

export async function getMarketConfig(
  chain: viem.Chain,
  market: IMarket,
): Promise<IMarketConfig> {
  const datastoreContract = getMappedValue(GMX.CONTRACT, chain.id).Datastore
 

  const reserveFactorLong = wagmi.readContract(wagmiConfig, {
    ...datastoreContract,
    functionName: 'getUint',
    args: [hashData(["bytes32", "address", "bool"], [hashKey(RESERVE_FACTOR_KEY), market.marketToken, true])],
  })

  const reserveFactorShort = wagmi.readContract(wagmiConfig, {
    ...datastoreContract,
    functionName: 'getUint',
    args: [hashData(["bytes32", "address", "bool"], [hashKey(RESERVE_FACTOR_KEY), market.marketToken, false])],
  })

  const openInterestReserveFactorLong = wagmi.readContract(wagmiConfig, {
    ...datastoreContract,
    functionName: 'getUint',
    args: [hashData(["bytes32", "address", "bool"], [hashKey(OPEN_INTEREST_RESERVE_FACTOR_KEY), market.marketToken, true])],
  })

  const openInterestReserveFactorShort = wagmi.readContract(wagmiConfig, {
    ...datastoreContract,
    functionName: 'getUint',
    args: [hashData(["bytes32", "address", "bool"], [hashKey(OPEN_INTEREST_RESERVE_FACTOR_KEY), market.marketToken, false])],
  })


  const maxPnlFactorForTradersLong = wagmi.readContract(wagmiConfig, {
    ...datastoreContract,
    functionName: 'getUint',
    args: [hashData(["bytes32", "bytes32", "address", "bool"], [hashKey(MAX_PNL_FACTOR_KEY), hashKey(MAX_PNL_FACTOR_FOR_TRADERS_KEY), market.marketToken, true])],
  })

  const maxPnlFactorForTradersShort = wagmi.readContract(wagmiConfig, {
    ...datastoreContract,
    functionName: 'getUint',
    args: [hashData(["bytes32", "bytes32", "address", "bool"], [hashKey(MAX_PNL_FACTOR_KEY), hashKey(MAX_PNL_FACTOR_FOR_TRADERS_KEY), market.marketToken, false])],
  })

  const positionFeeFactorForPositiveImpact = wagmi.readContract(wagmiConfig, {
    ...datastoreContract,
    functionName: 'getUint',
    args: [hashData(["bytes32", "address", "bool"], [hashKey(POSITION_FEE_FACTOR_KEY), market.marketToken, true])],
  })

  const positionFeeFactorForNegativeImpact = wagmi.readContract(wagmiConfig, {
    ...datastoreContract,
    functionName: 'getUint',
    args: [hashData(["bytes32", "address", "bool"], [hashKey(POSITION_FEE_FACTOR_KEY), market.marketToken, false])],
  })

  const positionImpactFactorPositive = wagmi.readContract(wagmiConfig, {
    ...datastoreContract,
    functionName: 'getUint',
    args: [hashData(["bytes32", "address", "bool"], [hashKey(POSITION_IMPACT_FACTOR_KEY), market.marketToken, true])],
  })

  const positionImpactFactorNegative = wagmi.readContract(wagmiConfig, {
    ...datastoreContract,
    functionName: 'getUint',
    args: [hashData(["bytes32", "address", "bool"], [hashKey(POSITION_IMPACT_FACTOR_KEY), market.marketToken, false])],
  })

  const maxPositionImpactFactorPositive = wagmi.readContract(wagmiConfig, {
    ...datastoreContract,
    functionName: 'getUint',
    args: [hashData(["bytes32", "address", "bool"], [hashKey(MAX_POSITION_IMPACT_FACTOR_KEY), market.marketToken, true])],
  })


  const maxPositionImpactFactorForLiquidations = wagmi.readContract(wagmiConfig, {
    ...datastoreContract,
    functionName: 'getUint',
    args: [hashData(["bytes32", "address"], [hashKey(MAX_POSITION_IMPACT_FACTOR_FOR_LIQUIDATIONS_KEY), market.marketToken])],
  })

  const minCollateralFactor = wagmi.readContract(wagmiConfig, {
    ...datastoreContract,
    functionName: 'getUint',
    args: [hashData(["bytes32", "address"], [hashKey(MIN_COLLATERAL_FACTOR_KEY), market.marketToken])],
  })



  const positionImpactExponentFactor = wagmi.readContract(wagmiConfig, {
    ...datastoreContract,
    functionName: 'getUint',
    args: [hashData(["bytes32", "address"], [hashKey(POSITION_IMPACT_EXPONENT_FACTOR_KEY), market.marketToken])],
  })

  

  return {
    maxPnlFactorForTradersLong: await maxPnlFactorForTradersLong,
    maxPnlFactorForTradersShort: await maxPnlFactorForTradersShort,

    reserveFactorLong: await reserveFactorLong,
    reserveFactorShort: await reserveFactorShort,

    openInterestReserveFactorLong: await openInterestReserveFactorLong,
    openInterestReserveFactorShort: await openInterestReserveFactorShort,


    positionFeeFactorForPositiveImpact: await positionFeeFactorForPositiveImpact,
    positionFeeFactorForNegativeImpact: await positionFeeFactorForNegativeImpact,
    minCollateralFactor: await minCollateralFactor,

    maxPositionImpactFactorForLiquidations: await maxPositionImpactFactorForLiquidations,

    positionImpactFactorPositive: await positionImpactFactorPositive,
    positionImpactFactorNegative: await positionImpactFactorNegative,
    positionImpactExponentFactor: await positionImpactExponentFactor,
    // maxPositionImpactFactorNegative: await maxPositionImpactFactorNegative,

    maxPositionImpactFactorPositive: await maxPositionImpactFactorPositive,

  }
}

export async function getFullMarketInfo(chain: viem.Chain, market: IMarket, price: IMarketPrice): Promise<IMarketInfo> {

  const gmxContractMap = getMappedValue(GMX.CONTRACT, chain.id)
  const datastoreContract = gmxContractMap.Datastore
  const usageQuery: Promise<IMarketUsageInfo> = getMarketPoolUsage(chain, market)
  const configQuery: Promise<IMarketConfig> = getMarketConfig(chain, market)
  const poolQuery: Promise<IMarketPool> = wagmi.readContract(wagmiConfig, {
    ...gmxContractMap.ReaderV2,
    functionName: 'getMarketTokenPrice',
    args: [
      datastoreContract.address,
      market,
      price.indexTokenPrice,
      price.longTokenPrice,
      price.shortTokenPrice,
      hashKey("MAX_PNL_FACTOR_FOR_TRADERS"),
      true
    ] as any
    
  }).then(([res, pool]) => pool)

  const feesQuery: Promise<IMarketFees> = wagmi.readContract(wagmiConfig, {
    ...gmxContractMap.ReaderV2,
    functionName: 'getMarketInfo',
    args: [
      gmxContractMap.Datastore.address,
      price,
      market.marketToken
    ] as any
  })

  const [usage, config, pool, fees] = await Promise.all([usageQuery, configQuery, poolQuery, feesQuery])

  return { market, price, usage, config, pool, fees }
}

export async function getPositionOrderGasLimit(chain: viem.Chain) {
  const datastoreContract = GMX.CONTRACT[chain.id].Datastore

  const increaseGasLimit =  wagmi.readContract(wagmiConfig, {
    ...datastoreContract,
    functionName: 'getUint',
    args: [hashKey(INCREASE_ORDER_GAS_LIMIT_KEY)],
  })
  const decreaseGasLimit =  wagmi.readContract(wagmiConfig, {
    ...datastoreContract,
    functionName: 'getUint',
    args: [hashKey(INCREASE_ORDER_GAS_LIMIT_KEY)],
  })

  return { increaseGasLimit, decreaseGasLimit }
}

export async function getExecuteGasFee(chain: viem.Chain) {
  const datastoreContract = GMX.CONTRACT[chain.id].Datastore

  const estimatedFeeBaseGasLimit =  wagmi.readContract(wagmiConfig, {
    ...datastoreContract,
    functionName: 'getUint',
    args: [hashKey('ESTIMATED_GAS_FEE_BASE_AMOUNT')],
  })
  const estimatedFeeMultiplierFactor =  wagmi.readContract(wagmiConfig, {
    ...datastoreContract,
    functionName: 'getUint',
    args: [hashKey('ESTIMATED_GAS_FEE_MULTIPLIER_FACTOR')],
  })

  const increaseGasLimit =  wagmi.readContract(wagmiConfig, {
    ...datastoreContract,
    functionName: 'getUint',
    args: [hashKey('INCREASE_ORDER_GAS_LIMIT')],
  })
  const decreaseGasLimit =  wagmi.readContract(wagmiConfig, {
    ...datastoreContract,
    functionName: 'getUint',
    args: [hashKey('DECREASE_ORDER_GAS_LIMIT')],
  })


  return {
    increaseGasLimit: await increaseGasLimit,
    decreaseGasLimit: await decreaseGasLimit,
    estimatedFeeMultiplierFactor: await estimatedFeeMultiplierFactor,
    estimatedFeeBaseGasLimit: await estimatedFeeBaseGasLimit
  }
}


export function getExecutionFee(
  estimatedFeeBaseGasLimit: bigint,
  estimatedFeeMultiplierFactor: bigint,
  estimatedGasLimit: bigint,
  gasPrice: bigint
): bigint {

  const adjustedGasLimit = estimatedFeeBaseGasLimit + factor(estimatedGasLimit, estimatedFeeMultiplierFactor)
  const feeTokenAmount = adjustedGasLimit * gasPrice

  return feeTokenAmount
}

// export function estimateExecuteIncreaseOrderGasLimit(
//   gasLimits: GasLimitsConfig,
//   order: { swapPath?: string[]; callbackGasLimit?: BigNumber }
// ) {
//   const swapsCount = order.swapPath?.length || 0

//   return gasLimits.increaseOrder.add(gasLimits.singleSwap.mul(swapsCount)).add(order.callbackGasLimit || 0)
// }

// export function estimateExecuteDecreaseOrderGasLimit(
//   gasLimits: GasLimitsConfig,
//   order: { swapPath?: string[]; callbackGasLimit?: BigNumber }
// ) {
//   const swapsCount = order.swapPath?.length || 0

//   return gasLimits.decreaseOrder.add(gasLimits.singleSwap.mul(swapsCount)).add(order.callbackGasLimit || 0)
// }
import { getMappedValue } from "common-utils"
import * as GMX from "gmx-middleware-const"
import { IMarket, IMarketConfig, IMarketFees, IMarketInfo, IMarketPool, IMarketPrice, IMarketUsageInfo, hashData } from "gmx-middleware-utils"
import { readContract } from "viem/actions"
import * as walletLink from "wallet"



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



export async function readMarketPoolUsage(
  provider: walletLink.IClient,
  market: IMarket,
  contractDefs = getMappedValue(GMX.CONTRACT, provider.chain.id),
): Promise<IMarketUsageInfo> {
  const datastoreContract = contractDefs.Datastore
  // const v2Reader = contractReader(readerV2)


  // const isDisabled = readContract(wallet, {
  //   ...datastoreContract,
  //   functionName: 'getBool',
  //   args: [hashData(["bytes32", "address"], [hashKey(IS_MARKET_DISABLED_KEY), market.marketToken])],
  // })

  // const longPoolAmount = readContract(wallet, {
  //   ...datastoreContract,
  //   functionName: 'getUint',
  //   args: [hashData(["bytes32", "address", "address"], [hashKey(POOL_AMOUNT_KEY), market.marketToken, market.longToken])],
  // })


  // const shortPoolAmount = readContract(wallet, {
  //   ...datastoreContract,
  //   functionName: 'getUint',
  //   args: [hashData(["bytes32", "address", "address"], [hashKey(POOL_AMOUNT_KEY), market.marketToken, market.shortToken])],
  // })


  // const maxLongPoolAmount = readContract(wallet, {
  //   ...datastoreContract,
  //   functionName: 'getUint',
  //   args: [hashData(["bytes32", "address", "address"], [hashKey(MAX_POOL_AMOUNT_KEY), market.marketToken, market.longToken])],
  // })

  // const maxShortPoolAmount = readContract(wallet, {
  //   ...datastoreContract,
  //   functionName: 'getUint',
  //   args: [hashData(["bytes32", "address", "address"], [hashKey(MAX_POOL_AMOUNT_KEY), market.marketToken, market.shortToken])],
  // })

  // const longPoolAmountAdjustment = readContract(wallet, {
  //   ...datastoreContract,
  //   functionName: 'getUint',
  //   args: [hashData(["bytes32", "address", "address"], [hashKey(POOL_AMOUNT_ADJUSTMENT_KEY), market.marketToken, market.longToken])],
  // })
  
  // const shortPoolAmountAdjustment = readContract(wallet, {
  //   ...datastoreContract,
  //   functionName: 'getUint',
  //   args: [hashData(["bytes32", "address", "address"], [hashKey(POOL_AMOUNT_ADJUSTMENT_KEY), market.marketToken, market.shortToken])],
  // })

  // const reserveFactorLong = readContract(wallet, {
  //   ...datastoreContract,
  //   functionName: 'getUint',
  //   args: [hashData(["bytes32", "address", "bool"], [hashKey(RESERVE_FACTOR_KEY), market.marketToken, true])],
  // })

  // const reserveFactorShort = readContract(wallet, {
  //   ...datastoreContract,
  //   functionName: 'getUint',
  //   args: [hashData(["bytes32", "address", "bool"], [hashKey(RESERVE_FACTOR_KEY), market.marketToken, false])],
  // })

  // const openInterestReserveFactorLong = readContract(wallet, {
  //   ...datastoreContract,
  //   functionName: 'getUint',
  //   args: [hashData(["bytes32", "address", "bool"], [hashKey(OPEN_INTEREST_RESERVE_FACTOR_KEY), market.marketToken, true])],
  // })

  // const openInterestReserveFactorShort = readContract(wallet, {
  //   ...datastoreContract,
  //   functionName: 'getUint',
  //   args: [hashData(["bytes32", "address", "bool"], [hashKey(OPEN_INTEREST_RESERVE_FACTOR_KEY), market.marketToken, false])],
  // })

  const positionImpactPoolAmount = readContract(provider, {
    ...datastoreContract,
    functionName: 'getUint',
    args: [hashData(["bytes32", "address"], [hashKey(POSITION_IMPACT_POOL_AMOUNT_KEY), market.marketToken])],
  })

  // const swapImpactPoolAmountLong = readContract(wallet, {
  //   ...datastoreContract,
  //   functionName: 'getUint',
  //   args: [hashData(["bytes32", "address", "address"], [hashKey(SWAP_IMPACT_POOL_AMOUNT_KEY), market.marketToken, market.longToken])],
  // })

  // const swapImpactPoolAmountShort = readContract(wallet, {
  //   ...datastoreContract,
  //   functionName: 'getUint',
  //   args: [hashData(["bytes32", "address", "address"], [hashKey(SWAP_IMPACT_POOL_AMOUNT_KEY), market.marketToken, market.shortToken])],
  // })

  // const borrowingFactorLong = readContract(wallet, {
  //   ...datastoreContract,
  //   functionName: 'getUint',
  //   args: [hashData(["bytes32", "address", "bool"], [hashKey(BORROWING_FACTOR_KEY), market.marketToken, true])],
  // })

  // const borrowingFactorShort = readContract(wallet, {
  //   ...datastoreContract,
  //   functionName: 'getUint',
  //   args: [hashData(["bytes32", "address", "bool"], [hashKey(BORROWING_FACTOR_KEY), market.marketToken, false])],
  // })

  // const borrowingExponentFactorLong = readContract(wallet, {
  //   ...datastoreContract,
  //   functionName: 'getUint',
  //   args: [hashData(["bytes32", "address", "bool"], [hashKey(BORROWING_EXPONENT_FACTOR_KEY), market.marketToken, true])],
  // })

  // const borrowingExponentFactorShort = readContract(wallet, {
  //   ...datastoreContract,
  //   functionName: 'getUint',
  //   args: [hashData(["bytes32", "address", "bool"], [hashKey(BORROWING_EXPONENT_FACTOR_KEY), market.marketToken, false])],
  // })

  // const fundingFactor = readContract(wallet, {
  //   ...datastoreContract,
  //   functionName: 'getUint',
  //   args: [hashData(["bytes32", "address"], [hashKey(FUNDING_FACTOR_KEY), market.marketToken])],
  // })

  // const fundingExponentFactor = readContract(wallet, {
  //   ...datastoreContract,
  //   functionName: 'getUint',
  //   args: [hashData(["bytes32", "address"], [hashKey(FUNDING_EXPONENT_FACTOR_KEY), market.marketToken])],
  // })

  // const maxPnlFactorForTradersLong = readContract(wallet, {
  //   ...datastoreContract,
  //   functionName: 'getUint',
  //   args: [hashData(["bytes32", "bytes32", "address", "bool"], [hashKey(MAX_PNL_FACTOR_KEY), hashKey(MAX_PNL_FACTOR_FOR_TRADERS_KEY), market.marketToken, true])],
  // })

  // const maxPnlFactorForTradersShort = readContract(wallet, {
  //   ...datastoreContract,
  //   functionName: 'getUint',
  //   args: [hashData(["bytes32", "bytes32", "address", "bool"], [hashKey(MAX_PNL_FACTOR_KEY), hashKey(MAX_PNL_FACTOR_FOR_TRADERS_KEY), market.marketToken, false])],
  // })

  // const positionFeeFactorForPositiveImpact = readContract(wallet, {
  //   ...datastoreContract,
  //   functionName: 'getUint',
  //   args: [hashData(["bytes32", "address", "bool"], [hashKey(POSITION_FEE_FACTOR_KEY), market.marketToken, true])],
  // })

  // const positionFeeFactorForNegativeImpact = readContract(wallet, {
  //   ...datastoreContract,
  //   functionName: 'getUint',
  //   args: [hashData(["bytes32", "address", "bool"], [hashKey(POSITION_FEE_FACTOR_KEY), market.marketToken, false])],
  // })

  // const positionImpactFactorPositive = readContract(wallet, {
  //   ...datastoreContract,
  //   functionName: 'getUint',
  //   args: [hashData(["bytes32", "address", "bool"], [hashKey(POSITION_IMPACT_FACTOR_KEY), market.marketToken, true])],
  // })

  // const positionImpactFactorNegative = readContract(wallet, {
  //   ...datastoreContract,
  //   functionName: 'getUint',
  //   args: [hashData(["bytes32", "address", "bool"], [hashKey(POSITION_IMPACT_FACTOR_KEY), market.marketToken, false])],
  // })

  // const maxPositionImpactFactorPositive = readContract(wallet, {
  //   ...datastoreContract,
  //   functionName: 'getUint',
  //   args: [hashData(["bytes32", "address", "bool"], [hashKey(MAX_POSITION_IMPACT_FACTOR_KEY), market.marketToken, true])],
  // })

  // const maxPositionImpactFactorNegative = readContract(wallet, {
  //   ...datastoreContract,
  //   functionName: 'getUint',
  //   args: [hashData(["bytes32", "address", "bool"], [hashKey(MAX_POSITION_IMPACT_FACTOR_KEY), market.marketToken, false])],
  // })

  // const maxPositionImpactFactorForLiquidations = readContract(wallet, {
  //   ...datastoreContract,
  //   functionName: 'getUint',
  //   args: [hashData(["bytes32", "address"], [hashKey(MAX_POSITION_IMPACT_FACTOR_FOR_LIQUIDATIONS_KEY), market.marketToken])],
  // })

  // const minCollateralFactor = readContract(wallet, {
  //   ...datastoreContract,
  //   functionName: 'getUint',
  //   args: [hashData(["bytes32", "address"], [hashKey(MIN_COLLATERAL_FACTOR_KEY), market.marketToken])],
  // })

  // const minCollateralFactorForOpenInterestLong = readContract(wallet, {
  //   ...datastoreContract,
  //   functionName: 'getUint',
  //   args: [hashData(["bytes32", "address", "bool"], [hashKey(MIN_COLLATERAL_FACTOR_FOR_OPEN_INTEREST_MULTIPLIER_KEY), market.marketToken, true])],
  // })

  // const minCollateralFactorForOpenInterestShort = readContract(wallet, {
  //   ...datastoreContract,
  //   functionName: 'getUint',
  //   args: [hashData(["bytes32", "address", "bool"], [hashKey(MIN_COLLATERAL_FACTOR_FOR_OPEN_INTEREST_MULTIPLIER_KEY), market.marketToken, false])],
  // })

  // const positionImpactExponentFactor = readContract(wallet, {
  //   ...datastoreContract,
  //   functionName: 'getUint',
  //   args: [hashData(["bytes32", "address"], [hashKey(POSITION_IMPACT_EXPONENT_FACTOR_KEY), market.marketToken])],
  // })

  // const swapFeeFactorForPositiveImpact = readContract(wallet, {
  //   ...datastoreContract,
  //   functionName: 'getUint',
  //   args: [hashData(["bytes32", "address", "bool"], [hashKey(SWAP_FEE_FACTOR_KEY), market.marketToken, true])],
  // })

  // const swapFeeFactorForNegativeImpact = readContract(wallet, {
  //   ...datastoreContract,
  //   functionName: 'getUint',
  //   args: [hashData(["bytes32", "address", "bool"], [hashKey(SWAP_FEE_FACTOR_KEY), market.marketToken, false])],
  // })

  // const swapImpactFactorPositive = readContract(wallet, {
  //   ...datastoreContract,
  //   functionName: 'getUint',
  //   args: [hashData(["bytes32", "address", "bool"], [hashKey(SWAP_IMPACT_FACTOR_KEY), market.marketToken, true])],
  // })

  // const swapImpactFactorNegative = readContract(wallet, {
  //   ...datastoreContract,
  //   functionName: 'getUint',
  //   args: [hashData(["bytes32", "address", "bool"], [hashKey(SWAP_IMPACT_FACTOR_KEY), market.marketToken, false])],
  // })

  // const swapImpactExponentFactor = readContract(wallet, {
  //   ...datastoreContract,
  //   functionName: 'getUint',
  //   args: [hashData(["bytes32", "address"], [hashKey(SWAP_IMPACT_EXPONENT_FACTOR_KEY), market.marketToken])],
  // })

  const longInterestUsingLongToken = readContract(provider, {
    ...datastoreContract,
    functionName: 'getUint',
    args: [hashData(["bytes32", "address", "address", "bool"], [hashKey(OPEN_INTEREST_KEY), market.marketToken, market.longToken, true])],
  })

  const longInterestUsingShortToken = readContract(provider, {
    ...datastoreContract,
    functionName: 'getUint',
    args: [hashData(["bytes32", "address", "address", "bool"], [hashKey(OPEN_INTEREST_KEY), market.marketToken, market.shortToken, true])],
  })

  const shortInterestUsingLongToken = readContract(provider, {
    ...datastoreContract,
    functionName: 'getUint',
    args: [hashData(["bytes32", "address", "address", "bool"], [hashKey(OPEN_INTEREST_KEY), market.marketToken, market.longToken, false])],
  })

  const shortInterestUsingShortToken = readContract(provider, {
    ...datastoreContract,
    functionName: 'getUint',
    args: [hashData(["bytes32", "address", "address", "bool"], [hashKey(OPEN_INTEREST_KEY), market.marketToken, market.shortToken, false])],
  })

  const longInterestInTokensUsingLongToken = readContract(provider, {
    ...datastoreContract,
    functionName: 'getUint',
    args: [hashData(["bytes32", "address", "address", "bool"], [hashKey(OPEN_INTEREST_IN_TOKENS_KEY), market.marketToken, market.longToken, true])],
  })

  const longInterestInTokensUsingShortToken = readContract(provider, {
    ...datastoreContract,
    functionName: 'getUint',
    args: [hashData(["bytes32", "address", "address", "bool"], [hashKey(OPEN_INTEREST_IN_TOKENS_KEY), market.marketToken, market.shortToken, true])],
  })

  const shortInterestInTokensUsingLongToken = readContract(provider, {
    ...datastoreContract,
    functionName: 'getUint',
    args: [hashData(["bytes32", "address", "address", "bool"], [hashKey(OPEN_INTEREST_IN_TOKENS_KEY), market.marketToken, market.longToken, false])],
  })

  const shortInterestInTokensUsingShortToken = readContract(provider, {
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
  // const virtualMarketId = readContract(wallet, {
  //   ...datastoreContract,
  //   functionName: 'getBytes32',
  //   args: [hashData(["bytes32", "address"], [hashKey(VIRTUAL_MARKET_ID_KEY), market.marketToken])],
  // })

  // const virtualLongTokenId = readContract(wallet, {
  //   ...datastoreContract,
  //   functionName: 'getBytes32',
  //   args: [hashData(["bytes32", "address"], [hashKey(VIRTUAL_TOKEN_ID_KEY), market.longToken])],
  // })

  // const virtualShortTokenId = readContract(wallet, {
  //   ...datastoreContract,
  //   functionName: 'getBytes32',
  //   args: [hashData(["bytes32", "address"], [hashKey(VIRTUAL_TOKEN_ID_KEY), market.shortToken])],
  // })



  // debugger
  return newLocal
}

export async function readMarketConfig(
  provider: walletLink.IPublicProvider,
  market: IMarket,
): Promise<IMarketConfig> {
  const datastoreContract = getMappedValue(GMX.CONTRACT, provider.chain.id).Datastore
 

  const reserveFactorLong = readContract(provider, {
    ...datastoreContract,
    functionName: 'getUint',
    args: [hashData(["bytes32", "address", "bool"], [hashKey(RESERVE_FACTOR_KEY), market.marketToken, true])],
  })

  const reserveFactorShort = readContract(provider, {
    ...datastoreContract,
    functionName: 'getUint',
    args: [hashData(["bytes32", "address", "bool"], [hashKey(RESERVE_FACTOR_KEY), market.marketToken, false])],
  })

  const openInterestReserveFactorLong = readContract(provider, {
    ...datastoreContract,
    functionName: 'getUint',
    args: [hashData(["bytes32", "address", "bool"], [hashKey(OPEN_INTEREST_RESERVE_FACTOR_KEY), market.marketToken, true])],
  })

  const openInterestReserveFactorShort = readContract(provider, {
    ...datastoreContract,
    functionName: 'getUint',
    args: [hashData(["bytes32", "address", "bool"], [hashKey(OPEN_INTEREST_RESERVE_FACTOR_KEY), market.marketToken, false])],
  })


  const maxPnlFactorForTradersLong = readContract(provider, {
    ...datastoreContract,
    functionName: 'getUint',
    args: [hashData(["bytes32", "bytes32", "address", "bool"], [hashKey(MAX_PNL_FACTOR_KEY), hashKey(MAX_PNL_FACTOR_FOR_TRADERS_KEY), market.marketToken, true])],
  })

  const maxPnlFactorForTradersShort = readContract(provider, {
    ...datastoreContract,
    functionName: 'getUint',
    args: [hashData(["bytes32", "bytes32", "address", "bool"], [hashKey(MAX_PNL_FACTOR_KEY), hashKey(MAX_PNL_FACTOR_FOR_TRADERS_KEY), market.marketToken, false])],
  })

  const positionFeeFactorForPositiveImpact = readContract(provider, {
    ...datastoreContract,
    functionName: 'getUint',
    args: [hashData(["bytes32", "address", "bool"], [hashKey(POSITION_FEE_FACTOR_KEY), market.marketToken, true])],
  })

  const positionFeeFactorForNegativeImpact = readContract(provider, {
    ...datastoreContract,
    functionName: 'getUint',
    args: [hashData(["bytes32", "address", "bool"], [hashKey(POSITION_FEE_FACTOR_KEY), market.marketToken, false])],
  })

  const positionImpactFactorPositive = readContract(provider, {
    ...datastoreContract,
    functionName: 'getUint',
    args: [hashData(["bytes32", "address", "bool"], [hashKey(POSITION_IMPACT_FACTOR_KEY), market.marketToken, true])],
  })

  const positionImpactFactorNegative = readContract(provider, {
    ...datastoreContract,
    functionName: 'getUint',
    args: [hashData(["bytes32", "address", "bool"], [hashKey(POSITION_IMPACT_FACTOR_KEY), market.marketToken, false])],
  })

  const maxPositionImpactFactorPositive = readContract(provider, {
    ...datastoreContract,
    functionName: 'getUint',
    args: [hashData(["bytes32", "address", "bool"], [hashKey(MAX_POSITION_IMPACT_FACTOR_KEY), market.marketToken, true])],
  })


  const maxPositionImpactFactorForLiquidations = readContract(provider, {
    ...datastoreContract,
    functionName: 'getUint',
    args: [hashData(["bytes32", "address"], [hashKey(MAX_POSITION_IMPACT_FACTOR_FOR_LIQUIDATIONS_KEY), market.marketToken])],
  })

  const minCollateralFactor = readContract(provider, {
    ...datastoreContract,
    functionName: 'getUint',
    args: [hashData(["bytes32", "address"], [hashKey(MIN_COLLATERAL_FACTOR_KEY), market.marketToken])],
  })



  const positionImpactExponentFactor = readContract(provider, {
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

export async function readFullMarketInfo(provider: walletLink.IPublicProvider, market: IMarket, price: IMarketPrice): Promise<IMarketInfo> {
  const gmxContractMap = getMappedValue(GMX.CONTRACT, provider.chain.id)
  const datastoreContract = gmxContractMap.Datastore
  const usageQuery: Promise<IMarketUsageInfo> = readMarketPoolUsage(provider, market)
  const configQuery: Promise<IMarketConfig> = readMarketConfig(provider, market)
  const poolQuery: Promise<IMarketPool> = readContract(provider, {
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

  const feesQuery: Promise<IMarketFees> = readContract(provider, {
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

export async function readPositionOrderGasLimit(provider: walletLink.IPublicProvider) {
  const datastoreContract = getMappedValue(GMX.CONTRACT, provider.chain.id).Datastore
  const increaseGasLimit =  readContract(provider, {
    ...datastoreContract,
    functionName: 'getUint',
    args: [hashKey(INCREASE_ORDER_GAS_LIMIT_KEY)],
  })
  const decreaseGasLimit =  readContract(provider, {
    ...datastoreContract,
    functionName: 'getUint',
    args: [hashKey(INCREASE_ORDER_GAS_LIMIT_KEY)],
  })

  return { increaseGasLimit, decreaseGasLimit }
}

export async function readExecuteGasFee(provider: walletLink.IPublicProvider) {
  const datastoreContract = getMappedValue(GMX.CONTRACT, provider.chain.id).Datastore

  const estimatedFeeBaseGasLimit = readContract(provider, {
    ...datastoreContract,
    functionName: 'getUint',
    args: [hashKey('ESTIMATED_GAS_FEE_BASE_AMOUNT')],
  })
  const estimatedFeeMultiplierFactor = readContract(provider, {
    ...datastoreContract,
    functionName: 'getUint',
    args: [hashKey('ESTIMATED_GAS_FEE_MULTIPLIER_FACTOR')],
  })

  const increaseGasLimit = readContract(provider, {
    ...datastoreContract,
    functionName: 'getUint',
    args: [hashKey('INCREASE_ORDER_GAS_LIMIT')],
  })
  const decreaseGasLimit = readContract(provider, {
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



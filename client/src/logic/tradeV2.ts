import * as wagmi from "@wagmi/core"
import * as GMX from "gmx-middleware-const"
import { IMarket, IMarketInfo, IMarketPrice, factor, hashData, switchMap } from "gmx-middleware-utils"
import * as viem from "viem"
import { ISupportedChain } from "../wallet/walletLink.js"
import { contractReader } from "./common.js"
import { combineObject } from "@aelea/core"
import { map } from "@most/core"
import { Stream } from "@most/types"



export function hashKey(key: string) {
  return hashData(["string"], [key])
}

const POSITION_IMPACT_FACTOR_KEY = "POSITION_IMPACT_FACTOR"
const MAX_POSITION_IMPACT_FACTOR_KEY = "MAX_POSITION_IMPACT_FACTOR"
const POSITION_IMPACT_EXPONENT_FACTOR_KEY = "POSITION_IMPACT_EXPONENT_FACTOR"
const POSITION_FEE_FACTOR_KEY = "POSITION_FEE_FACTOR"
const SWAP_IMPACT_FACTOR_KEY = "SWAP_IMPACT_FACTOR"
const SWAP_IMPACT_EXPONENT_FACTOR_KEY = "SWAP_IMPACT_EXPONENT_FACTOR"
const SWAP_FEE_FACTOR_KEY = "SWAP_FEE_FACTOR"
const FEE_RECEIVER_DEPOSIT_FACTOR_KEY = "FEE_RECEIVER_DEPOSIT_FACTOR"
const BORROWING_FEE_RECEIVER_FACTOR_KEY = "BORROWING_FEE_RECEIVER_FACTOR"
const FEE_RECEIVER_WITHDRAWAL_FACTOR_KEY = "FEE_RECEIVER_WITHDRAWAL_FACTOR"
const FEE_RECEIVER_SWAP_FACTOR_KEY = "FEE_RECEIVER_SWAP_FACTOR"
const FEE_RECEIVER_POSITION_FACTOR_KEY = "FEE_RECEIVER_POSITION_FACTOR"
const OPEN_INTEREST_KEY = "OPEN_INTEREST"
const OPEN_INTEREST_IN_TOKENS_KEY = "OPEN_INTEREST_IN_TOKENS"
const POOL_AMOUNT_KEY = "POOL_AMOUNT"
const MAX_POOL_AMOUNT_KEY = "MAX_POOL_AMOUNT"
const RESERVE_FACTOR_KEY = "RESERVE_FACTOR"
const OPEN_INTEREST_RESERVE_FACTOR_KEY = "OPEN_INTEREST_RESERVE_FACTOR"
const NONCE_KEY = "NONCE"
const BORROWING_FACTOR_KEY = "BORROWING_FACTOR"
const BORROWING_EXPONENT_FACTOR_KEY = "BORROWING_EXPONENT_FACTOR"
const CUMULATIVE_BORROWING_FACTOR_KEY = "CUMULATIVE_BORROWING_FACTOR"
const TOTAL_BORROWING_KEY = "TOTAL_BORROWING"
const FUNDING_FACTOR_KEY = "FUNDING_FACTOR"
const FUNDING_EXPONENT_FACTOR_KEY = "FUNDING_EXPONENT_FACTOR"
const MAX_PNL_FACTOR_KEY = "MAX_PNL_FACTOR"
const MAX_PNL_FACTOR_FOR_WITHDRAWALS_KEY = "MAX_PNL_FACTOR_FOR_WITHDRAWALS"
const MAX_PNL_FACTOR_FOR_DEPOSITS_KEY = "MAX_PNL_FACTOR_FOR_DEPOSITS"
const MAX_PNL_FACTOR_FOR_TRADERS_KEY = "MAX_PNL_FACTOR_FOR_TRADERS"
const MAX_POSITION_IMPACT_FACTOR_FOR_LIQUIDATIONS_KEY = "MAX_POSITION_IMPACT_FACTOR_FOR_LIQUIDATION"
const POSITION_IMPACT_POOL_AMOUNT_KEY = "POSITION_IMPACT_POOL_AMOUNT"
const SWAP_IMPACT_POOL_AMOUNT_KEY = "SWAP_IMPACT_POOL_AMOUNT"
const MIN_COLLATERAL_USD_KEY = "MIN_COLLATERAL_USD"
const MIN_COLLATERAL_FACTOR_KEY = "MIN_COLLATERAL_FACTOR"
const MIN_COLLATERAL_FACTOR_FOR_OPEN_INTEREST_MULTIPLIER_KEY = "MIN_COLLATERAL_FACTOR_FOR_OPEN_INTEREST_MULTIPLIER"
const MIN_POSITION_SIZE_USD_KEY = "MIN_POSITION_SIZE_USD"
const MAX_LEVERAGE_KEY = "MAX_LEVERAGE"
const DEPOSIT_GAS_LIMIT_KEY = "DEPOSIT_GAS_LIMIT"
const WITHDRAWAL_GAS_LIMIT_KEY = "WITHDRAWAL_GAS_LIMIT"
const INCREASE_ORDER_GAS_LIMIT_KEY = "INCREASE_ORDER_GAS_LIMIT"
const DECREASE_ORDER_GAS_LIMIT_KEY = "DECREASE_ORDER_GAS_LIMIT"
const SWAP_ORDER_GAS_LIMIT_KEY = "SWAP_ORDER_GAS_LIMIT"
const SINGLE_SWAP_GAS_LIMIT_KEY = "SINGLE_SWAP_GAS_LIMIT"
const TOKEN_TRANSFER_GAS_LIMIT_KEY = "TOKEN_TRANSFER_GAS_LIMIT"
const NATIVE_TOKEN_TRANSFER_GAS_LIMIT_KEY = "NATIVE_TOKEN_TRANSFER_GAS_LIMIT"
const ESTIMATED_GAS_FEE_BASE_AMOUNT = "ESTIMATED_GAS_FEE_BASE_AMOUNT"
const ESTIMATED_GAS_FEE_MULTIPLIER_FACTOR = "ESTIMATED_GAS_FEE_MULTIPLIER_FACTOR"
const MARKET_LIST_KEY = "MARKET_LIST"
const POSITION_LIST_KEY = "POSITION_LIST"
const ACCOUNT_POSITION_LIST_KEY = "ACCOUNT_POSITION_LIST"
const ORDER_LIST_KEY = "ORDER_LIST"
const ACCOUNT_ORDER_LIST_KEY = "ACCOUNT_ORDER_LIST"
const CLAIMABLE_FUNDING_AMOUNT = "CLAIMABLE_FUNDING_AMOUNT"
const VIRTUAL_TOKEN_ID_KEY = "VIRTUAL_TOKEN_ID"
const VIRTUAL_MARKET_ID_KEY = "VIRTUAL_MARKET_ID"
const VIRTUAL_INVENTORY_FOR_POSITIONS_KEY = "VIRTUAL_INVENTORY_FOR_POSITIONS"
const VIRTUAL_INVENTORY_FOR_SWAPS_KEY = "VIRTUAL_INVENTORY_FOR_SWAPS"
const POOL_AMOUNT_ADJUSTMENT_KEY = "POOL_AMOUNT_ADJUSTMENT"
const AFFILIATE_REWARD_KEY = "AFFILIATE_REWARD"
const IS_MARKET_DISABLED_KEY = "IS_MARKET_DISABLED"



export async function getMarketPoolInfo(
  chain: ISupportedChain,
  market: IMarket,
  price: IMarketPrice
): Promise<IMarketInfo> {
  const datastoreContract = GMX.CONTRACT[chain.id].Datastore
  const readerV2 = GMX.CONTRACT[chain.id].ReaderV2
  // const v2Reader = contractReader(readerV2)


  const priceInfo = wagmi.readContract({
    ...readerV2,
    functionName: 'getMarketTokenPrice',
    args: [datastoreContract.address, market, price.indexTokenPrice, price.longTokenPrice, price.shortTokenPrice, hashKey(MAX_PNL_FACTOR_FOR_TRADERS_KEY), true],
  })
  const Info = wagmi.readContract({
    ...readerV2,
    functionName: 'getMarketInfo',
    args: [datastoreContract.address, price, market.marketToken],
  })
  

  // const isDisabled = wagmi.readContract({
  //   ...datastoreContract,
  //   functionName: 'getBool',
  //   args: [hashData(["bytes32", "address"], [hashKey(IS_MARKET_DISABLED_KEY), market.marketToken])],
  // })

  // const longPoolAmount = wagmi.readContract({
  //   ...datastoreContract,
  //   functionName: 'getUint',
  //   args: [hashData(["bytes32", "address", "address"], [hashKey(POOL_AMOUNT_KEY), market.marketToken, market.longToken])],
  // })


  // const shortPoolAmount = wagmi.readContract({
  //   ...datastoreContract,
  //   functionName: 'getUint',
  //   args: [hashData(["bytes32", "address", "address"], [hashKey(POOL_AMOUNT_KEY), market.marketToken, market.shortToken])],
  // })


  const maxLongPoolAmount = wagmi.readContract({
    ...datastoreContract,
    functionName: 'getUint',
    args: [hashData(["bytes32", "address", "address"], [hashKey(MAX_POOL_AMOUNT_KEY), market.marketToken, market.longToken])],
  })

  const maxShortPoolAmount = wagmi.readContract({
    ...datastoreContract,
    functionName: 'getUint',
    args: [hashData(["bytes32", "address", "address"], [hashKey(MAX_POOL_AMOUNT_KEY), market.marketToken, market.shortToken])],
  })

  const longPoolAmountAdjustment = wagmi.readContract({
    ...datastoreContract,
    functionName: 'getUint',
    args: [hashData(["bytes32", "address", "address"], [hashKey(POOL_AMOUNT_ADJUSTMENT_KEY), market.marketToken, market.longToken])],
  })
  
  const shortPoolAmountAdjustment = wagmi.readContract({
    ...datastoreContract,
    functionName: 'getUint',
    args: [hashData(["bytes32", "address", "address"], [hashKey(POOL_AMOUNT_ADJUSTMENT_KEY), market.marketToken, market.shortToken])],
  })

  const reserveFactorLong = wagmi.readContract({
    ...datastoreContract,
    functionName: 'getUint',
    args: [hashData(["bytes32", "address", "bool"], [hashKey(RESERVE_FACTOR_KEY), market.marketToken, true])],
  })

  const reserveFactorShort = wagmi.readContract({
    ...datastoreContract,
    functionName: 'getUint',
    args: [hashData(["bytes32", "address", "bool"], [hashKey(RESERVE_FACTOR_KEY), market.marketToken, false])],
  })

  const openInterestReserveFactorLong = wagmi.readContract({
    ...datastoreContract,
    functionName: 'getUint',
    args: [hashData(["bytes32", "address", "bool"], [hashKey(OPEN_INTEREST_RESERVE_FACTOR_KEY), market.marketToken, true])],
  })

  const openInterestReserveFactorShort = wagmi.readContract({
    ...datastoreContract,
    functionName: 'getUint',
    args: [hashData(["bytes32", "address", "bool"], [hashKey(OPEN_INTEREST_RESERVE_FACTOR_KEY), market.marketToken, false])],
  })

  const positionImpactPoolAmount = wagmi.readContract({
    ...datastoreContract,
    functionName: 'getUint',
    args: [hashData(["bytes32", "address"], [hashKey(POSITION_IMPACT_POOL_AMOUNT_KEY), market.marketToken])],
  })

  const swapImpactPoolAmountLong = wagmi.readContract({
    ...datastoreContract,
    functionName: 'getUint',
    args: [hashData(["bytes32", "address", "address"], [hashKey(SWAP_IMPACT_POOL_AMOUNT_KEY), market.marketToken, market.longToken])],
  })

  const swapImpactPoolAmountShort = wagmi.readContract({
    ...datastoreContract,
    functionName: 'getUint',
    args: [hashData(["bytes32", "address", "address"], [hashKey(SWAP_IMPACT_POOL_AMOUNT_KEY), market.marketToken, market.shortToken])],
  })

  const borrowingFactorLong = wagmi.readContract({
    ...datastoreContract,
    functionName: 'getUint',
    args: [hashData(["bytes32", "address", "bool"], [hashKey(BORROWING_FACTOR_KEY), market.marketToken, true])],
  })

  const borrowingFactorShort = wagmi.readContract({
    ...datastoreContract,
    functionName: 'getUint',
    args: [hashData(["bytes32", "address", "bool"], [hashKey(BORROWING_FACTOR_KEY), market.marketToken, false])],
  })

  const borrowingExponentFactorLong = wagmi.readContract({
    ...datastoreContract,
    functionName: 'getUint',
    args: [hashData(["bytes32", "address", "bool"], [hashKey(BORROWING_EXPONENT_FACTOR_KEY), market.marketToken, true])],
  })

  const borrowingExponentFactorShort = wagmi.readContract({
    ...datastoreContract,
    functionName: 'getUint',
    args: [hashData(["bytes32", "address", "bool"], [hashKey(BORROWING_EXPONENT_FACTOR_KEY), market.marketToken, false])],
  })

  const fundingFactor = wagmi.readContract({
    ...datastoreContract,
    functionName: 'getUint',
    args: [hashData(["bytes32", "address"], [hashKey(FUNDING_FACTOR_KEY), market.marketToken])],
  })

  const fundingExponentFactor = wagmi.readContract({
    ...datastoreContract,
    functionName: 'getUint',
    args: [hashData(["bytes32", "address"], [hashKey(FUNDING_EXPONENT_FACTOR_KEY), market.marketToken])],
  })

  const maxPnlFactorForTradersLong = wagmi.readContract({
    ...datastoreContract,
    functionName: 'getUint',
    args: [hashData(["bytes32", "bytes32", "address", "bool"], [hashKey(MAX_PNL_FACTOR_KEY), hashKey(MAX_PNL_FACTOR_FOR_TRADERS_KEY), market.marketToken, true])],
  })

  const maxPnlFactorForTradersShort = wagmi.readContract({
    ...datastoreContract,
    functionName: 'getUint',
    args: [hashData(["bytes32", "bytes32", "address", "bool"], [hashKey(MAX_PNL_FACTOR_KEY), hashKey(MAX_PNL_FACTOR_FOR_TRADERS_KEY), market.marketToken, false])],
  })

  const positionFeeFactorForPositiveImpact = wagmi.readContract({
    ...datastoreContract,
    functionName: 'getUint',
    args: [hashData(["bytes32", "address", "bool"], [hashKey(POSITION_FEE_FACTOR_KEY), market.marketToken, true])],
  })

  const positionFeeFactorForNegativeImpact = wagmi.readContract({
    ...datastoreContract,
    functionName: 'getUint',
    args: [hashData(["bytes32", "address", "bool"], [hashKey(POSITION_FEE_FACTOR_KEY), market.marketToken, false])],
  })

  const positionImpactFactorPositive = wagmi.readContract({
    ...datastoreContract,
    functionName: 'getUint',
    args: [hashData(["bytes32", "address", "bool"], [hashKey(POSITION_IMPACT_FACTOR_KEY), market.marketToken, true])],
  })

  const positionImpactFactorNegative = wagmi.readContract({
    ...datastoreContract,
    functionName: 'getUint',
    args: [hashData(["bytes32", "address", "bool"], [hashKey(POSITION_IMPACT_FACTOR_KEY), market.marketToken, false])],
  })

  const maxPositionImpactFactorPositive = wagmi.readContract({
    ...datastoreContract,
    functionName: 'getUint',
    args: [hashData(["bytes32", "address", "bool"], [hashKey(MAX_POSITION_IMPACT_FACTOR_KEY), market.marketToken, true])],
  })

  const maxPositionImpactFactorNegative = wagmi.readContract({
    ...datastoreContract,
    functionName: 'getUint',
    args: [hashData(["bytes32", "address", "bool"], [hashKey(MAX_POSITION_IMPACT_FACTOR_KEY), market.marketToken, false])],
  })

  const maxPositionImpactFactorForLiquidations = wagmi.readContract({
    ...datastoreContract,
    functionName: 'getUint',
    args: [hashData(["bytes32", "address"], [hashKey(MAX_POSITION_IMPACT_FACTOR_FOR_LIQUIDATIONS_KEY), market.marketToken])],
  })

  const minCollateralFactor = wagmi.readContract({
    ...datastoreContract,
    functionName: 'getUint',
    args: [hashData(["bytes32", "address"], [hashKey(MIN_COLLATERAL_FACTOR_KEY), market.marketToken])],
  })

  const minCollateralFactorForOpenInterestLong = wagmi.readContract({
    ...datastoreContract,
    functionName: 'getUint',
    args: [hashData(["bytes32", "address", "bool"], [hashKey(MIN_COLLATERAL_FACTOR_FOR_OPEN_INTEREST_MULTIPLIER_KEY), market.marketToken, true])],
  })

  const minCollateralFactorForOpenInterestShort = wagmi.readContract({
    ...datastoreContract,
    functionName: 'getUint',
    args: [hashData(["bytes32", "address", "bool"], [hashKey(MIN_COLLATERAL_FACTOR_FOR_OPEN_INTEREST_MULTIPLIER_KEY), market.marketToken, false])],
  })

  const positionImpactExponentFactor = wagmi.readContract({
    ...datastoreContract,
    functionName: 'getUint',
    args: [hashData(["bytes32", "address"], [hashKey(POSITION_IMPACT_EXPONENT_FACTOR_KEY), market.marketToken])],
  })

  const swapFeeFactorForPositiveImpact = wagmi.readContract({
    ...datastoreContract,
    functionName: 'getUint',
    args: [hashData(["bytes32", "address", "bool"], [hashKey(SWAP_FEE_FACTOR_KEY), market.marketToken, true])],
  })

  const swapFeeFactorForNegativeImpact = wagmi.readContract({
    ...datastoreContract,
    functionName: 'getUint',
    args: [hashData(["bytes32", "address", "bool"], [hashKey(SWAP_FEE_FACTOR_KEY), market.marketToken, false])],
  })

  const swapImpactFactorPositive = wagmi.readContract({
    ...datastoreContract,
    functionName: 'getUint',
    args: [hashData(["bytes32", "address", "bool"], [hashKey(SWAP_IMPACT_FACTOR_KEY), market.marketToken, true])],
  })

  const swapImpactFactorNegative = wagmi.readContract({
    ...datastoreContract,
    functionName: 'getUint',
    args: [hashData(["bytes32", "address", "bool"], [hashKey(SWAP_IMPACT_FACTOR_KEY), market.marketToken, false])],
  })

  const swapImpactExponentFactor = wagmi.readContract({
    ...datastoreContract,
    functionName: 'getUint',
    args: [hashData(["bytes32", "address"], [hashKey(SWAP_IMPACT_EXPONENT_FACTOR_KEY), market.marketToken])],
  })

  const longInterestUsingLongToken = wagmi.readContract({
    ...datastoreContract,
    functionName: 'getUint',
    args: [hashData(["bytes32", "address", "address", "bool"], [hashKey(OPEN_INTEREST_KEY), market.marketToken, market.longToken, true])],
  })

  const longInterestUsingShortToken = wagmi.readContract({
    ...datastoreContract,
    functionName: 'getUint',
    args: [hashData(["bytes32", "address", "address", "bool"], [hashKey(OPEN_INTEREST_KEY), market.marketToken, market.shortToken, true])],
  })

  const shortInterestUsingLongToken = wagmi.readContract({
    ...datastoreContract,
    functionName: 'getUint',
    args: [hashData(["bytes32", "address", "address", "bool"], [hashKey(OPEN_INTEREST_KEY), market.marketToken, market.longToken, false])],
  })

  const shortInterestUsingShortToken = wagmi.readContract({
    ...datastoreContract,
    functionName: 'getUint',
    args: [hashData(["bytes32", "address", "address", "bool"], [hashKey(OPEN_INTEREST_KEY), market.marketToken, market.shortToken, false])],
  })

  const longInterestInTokensUsingLongToken = wagmi.readContract({
    ...datastoreContract,
    functionName: 'getUint',
    args: [hashData(["bytes32", "address", "address", "bool"], [hashKey(OPEN_INTEREST_IN_TOKENS_KEY), market.marketToken, market.longToken, true])],
  })

  const longInterestInTokensUsingShortToken = wagmi.readContract({
    ...datastoreContract,
    functionName: 'getUint',
    args: [hashData(["bytes32", "address", "address", "bool"], [hashKey(OPEN_INTEREST_IN_TOKENS_KEY), market.marketToken, market.shortToken, true])],
  })

  const shortInterestInTokensUsingLongToken = wagmi.readContract({
    ...datastoreContract,
    functionName: 'getUint',
    args: [hashData(["bytes32", "address", "address", "bool"], [hashKey(OPEN_INTEREST_IN_TOKENS_KEY), market.marketToken, market.longToken, false])],
  })

  const shortInterestInTokensUsingShortToken = wagmi.readContract({
    ...datastoreContract,
    functionName: 'getUint',
    args: [hashData(["bytes32", "address", "address", "bool"], [hashKey(OPEN_INTEREST_IN_TOKENS_KEY), market.marketToken, market.shortToken, false])],
  })

  const virtualMarketId = wagmi.readContract({
    ...datastoreContract,
    functionName: 'getBytes32',
    args: [hashData(["bytes32", "address"], [hashKey(VIRTUAL_MARKET_ID_KEY), market.marketToken])],
  })

  const virtualLongTokenId = wagmi.readContract({
    ...datastoreContract,
    functionName: 'getBytes32',
    args: [hashData(["bytes32", "address"], [hashKey(VIRTUAL_TOKEN_ID_KEY), market.longToken])],
  })

  const virtualShortTokenId = wagmi.readContract({
    ...datastoreContract,
    functionName: 'getBytes32',
    args: [hashData(["bytes32", "address"], [hashKey(VIRTUAL_TOKEN_ID_KEY), market.shortToken])],
  })


  
  

  return {
    ...(await priceInfo)[1],
    maxPnlFactorForTradersLong: await maxPnlFactorForTradersLong,
    maxPnlFactorForTradersShort: await maxPnlFactorForTradersShort,

    // netPnlMax, netPnlMin, pnlLongMax, pnlLongMin, pnlShortMax, pnlShortMin,
    // poolValueMax, poolValueMin, shortInterestInTokens,
    // totalBorrowingFees,
    // claimableFundingAmountLong, claimableFundingAmountShort,
    // longPoolAmount: await longPoolAmount,
    // shortPoolAmount: await shortPoolAmount,
    // maxLongPoolAmount: await maxLongPoolAmount,
    // maxShortPoolAmount: await maxShortPoolAmount,
    // longPoolAmountAdjustment: await longPoolAmountAdjustment,
    // shortPoolAmountAdjustment: await shortPoolAmountAdjustment,

    reserveFactorLong: await reserveFactorLong,
    reserveFactorShort: await reserveFactorShort,

    openInterestReserveFactorLong: await openInterestReserveFactorLong,
    openInterestReserveFactorShort: await openInterestReserveFactorShort,

    longInterestInTokensUsingLongToken: await longInterestInTokensUsingLongToken,
    longInterestInTokensUsingShortToken: await longInterestInTokensUsingShortToken,
    shortInterestInTokensUsingLongToken: await shortInterestInTokensUsingLongToken,
    shortInterestInTokensUsingShortToken: await shortInterestInTokensUsingShortToken,

    longInterestInTokens: await longInterestInTokensUsingLongToken + await longInterestInTokensUsingShortToken,
    shortInterestInTokens: await shortInterestInTokensUsingLongToken + await shortInterestInTokensUsingShortToken,

    // longInterestUsd: await longInterestUsingLongToken + await longInterestUsingShortToken,
    shortInterestUsd: await shortInterestUsingLongToken + await shortInterestUsingShortToken,

    // swapImpactPoolAmountLong: await swapImpactPoolAmountLong,
    // swapImpactPoolAmountShort: await swapImpactPoolAmountShort,
    // borrowingFactorLong: await borrowingFactorLong,
    // borrowingFactorShort: await borrowingFactorShort,
    // borrowingExponentFactorLong: await borrowingExponentFactorLong,
    // borrowingExponentFactorShort: await borrowingExponentFactorShort,
    // fundingFactor: await fundingFactor,
    // fundingExponentFactor: await fundingExponentFactor,

    positionFeeFactorForPositiveImpact: await positionFeeFactorForPositiveImpact,
    positionFeeFactorForNegativeImpact: await positionFeeFactorForNegativeImpact,
    minCollateralFactor: await minCollateralFactor,




    maxPositionImpactFactorForLiquidations: await maxPositionImpactFactorForLiquidations,

    positionImpactFactorPositive: await positionImpactFactorPositive,
    positionImpactFactorNegative: await positionImpactFactorNegative,
    positionImpactExponentFactor: await positionImpactExponentFactor,
    // maxPositionImpactFactorNegative: await maxPositionImpactFactorNegative,
    

    ...await Info,

    positionImpactPoolAmount: await positionImpactPoolAmount,
    maxPositionImpactFactorPositive: await maxPositionImpactFactorPositive,

  }
}


export async function getPositionOrderGasLimit(chain: ISupportedChain) {
  const datastoreContract = GMX.CONTRACT[chain.id].Datastore

  const increaseGasLimit =  wagmi.readContract({
    ...datastoreContract,
    functionName: 'getUint',
    args: [hashKey(INCREASE_ORDER_GAS_LIMIT_KEY)],
  })
  const decreaseGasLimit =  wagmi.readContract({
    ...datastoreContract,
    functionName: 'getUint',
    args: [hashKey(INCREASE_ORDER_GAS_LIMIT_KEY)],
  })

  return { increaseGasLimit, decreaseGasLimit }
}

export async function getExecuteGasFee(chain: ISupportedChain) {
  const datastoreContract = GMX.CONTRACT[chain.id].Datastore

  const estimatedFeeBaseGasLimit =  wagmi.readContract({
    ...datastoreContract,
    functionName: 'getUint',
    args: [hashKey(ESTIMATED_GAS_FEE_BASE_AMOUNT)],
  })
  const estimatedFeeMultiplierFactor =  wagmi.readContract({
    ...datastoreContract,
    functionName: 'getUint',
    args: [hashKey(ESTIMATED_GAS_FEE_MULTIPLIER_FACTOR)],
  })

  const increaseGasLimit =  wagmi.readContract({
    ...datastoreContract,
    functionName: 'getUint',
    args: [hashKey(INCREASE_ORDER_GAS_LIMIT_KEY)],
  })
  const decreaseGasLimit =  wagmi.readContract({
    ...datastoreContract,
    functionName: 'getUint',
    args: [hashKey(INCREASE_ORDER_GAS_LIMIT_KEY)],
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
import { Behavior, O, combineArray, combineObject, replayLatest } from "@aelea/core"
import { $node, $text, component, style, styleBehavior } from "@aelea/dom"
import { $column, $icon, $row, layoutSheet, screenUtils } from "@aelea/ui-components"
import {
  IMarket,
  IMarketPrice,
  IPositionDecrease,
  IPositionIncrease,
  IPositionSlot,
  PositionInfo,
  StateStream,
  abs,
  filterNull, formatFixed,
  getAdjustedDelta, getDenominator,
  getFeeBasisPoints, getFundingFee, getIntervalIdentifier,
  getLiquidationPrice, getMappedValue,
  getMarginFee,
  getMarginFees,
  getNativeTokenDescription,
  getPnL,
  getPositionKey,
  getPriceImpactForPosition,
  getTokenAmount,
  getTokenDescription,
  getTokenUsd,
  readableDate,
  readableFixedUSD30,
  readablePercentage,
  readableUnitAmount, resolveAddress, safeDiv, switchMap,
  timeSince,
  unixTimestampNow
} from "gmx-middleware-utils"

import { colorAlpha, pallete } from "@aelea/ui-components-theme"
import { awaitPromises, debounce, empty, fromPromise, map, mergeArray, multicast, now, scan, skipRepeats, skipRepeatsWith, snapshot, startWith, switchLatest, tap, zip } from "@most/core"
import { Stream } from "@most/types"
import { readContract } from "@wagmi/core"
import { erc20Abi } from "abitype/test"
import * as GMX from "gmx-middleware-const"
import { $ButtonToggle, $CandleSticks, $infoLabel, $infoLabeledValue, $target, $txHashRef } from "gmx-middleware-ui-components"
import { CandlestickData, Coordinate, LineStyle, LogicalRange, MouseEventParams, Time } from "lightweight-charts"
import * as PUPPET from "puppet-middleware-const"
import * as viem from "viem"
import { $midContainer } from "../common/$common"
import { $IntermediateConnectButton } from "../components/$ConnectAccount"
import { $CardTable } from "../components/$common"
import { $ButtonSecondary } from "../components/form/$Button"
import { $Dropdown } from "../components/form/$Dropdown"
import { $PositionDetailsPanel, IRequestTrade } from "../components/trade/$PositionDetailsPanel"
import { $PositionEditor, IPositionEditorAbstractParams, ITradeConfig, ITradeFocusMode, ITradeParams } from "../components/trade/$PositionEditor"
import { latestTokenPrice } from "../data/process/process"
import { rootStoreScope } from "../data/store/store"
import { $caretDown } from "../elements/$icons"
import { connectContract, contractReader } from "../logic/common"
import * as trade from "../logic/trade"
import { getExecuteGasFee, getExecutionFee, getMarketPoolInfo, hashKey } from "../logic/tradeV2"
import * as indexDB from "../utils/storage/indexDB"
import * as storage from "../utils/storage/storeScope"
import { walletLink } from "../wallet"
import { gasPrice, wallet } from "../wallet/walletLink"
import { $seperator2 } from "./common"


export type ITradeComponent = IPositionEditorAbstractParams



const TIME_INTERVAL_LABEL_MAP = {
  [GMX.TIME_INTERVAL_MAP.SEC]: '1s',
  [GMX.TIME_INTERVAL_MAP.MIN]: '1m',
  [GMX.TIME_INTERVAL_MAP.MIN5]: '5m',
  [GMX.TIME_INTERVAL_MAP.MIN15]: '15m',
  [GMX.TIME_INTERVAL_MAP.MIN30]: '30m',
  [GMX.TIME_INTERVAL_MAP.MIN60]: '1h',
  [GMX.TIME_INTERVAL_MAP.HR2]: '2h',
  [GMX.TIME_INTERVAL_MAP.HR4]: '4h',
  [GMX.TIME_INTERVAL_MAP.HR8]: '8h',
  [GMX.TIME_INTERVAL_MAP.HR24]: '1d',
  [GMX.TIME_INTERVAL_MAP.DAY7]: '1w',
  [GMX.TIME_INTERVAL_MAP.MONTH]: '1mo',
  [GMX.TIME_INTERVAL_MAP.MONTH2]: '2mo',
  [GMX.TIME_INTERVAL_MAP.YEAR]: '2yr',
} as const



export const $Trade = (config: ITradeComponent) => component((
  [selectTimeFrame, selectTimeFrameTether]: Behavior<GMX.IntervalTime>,
  [changeRoute, changeRouteTether]: Behavior<string>,

  [changePrimaryToken, changePrimaryTokenTether]: Behavior<viem.Address>,
  [changeMarket, changeMarketTether]: Behavior<IMarket>,
  [changeIsUsdCollateralToken, changeIsUsdCollateralTokenTether]: Behavior<boolean>,

  [switchFocusMode, switchFocusModeTether]: Behavior<ITradeFocusMode>,
  [switchIsLong, switchIsLongTether]: Behavior<boolean>,
  [switchIsIncrease, switchIsIncreaseTether]: Behavior<boolean>,

  [changeCollateralDeltaUsd, changeCollateralDeltaUsdTether]: Behavior<bigint>,
  [changeSizeDeltaUsd, changeSizeDeltaUsdTether]: Behavior<bigint>,

  // [requestAccountTradeList, requestAccountTradeListTether]: Behavior<IAccountTradeListParamApi, IAccountTradeListParamApi>,
  [changeLeverage, changeLeverageTether]: Behavior<bigint>,
  [changeSlippage, changeSlippageTether]: Behavior<string>,

  [changeInputTokenApproved, changeInputTokenApprovedTether]: Behavior<boolean>,

  [enableTrading, enableTradingTether]: Behavior<boolean>,

  [switchTrade, switchTradeTether]: Behavior<IPositionSlot>,
  [requestTrade, requestTradeTether]: Behavior<IRequestTrade>,

  // [focusPriceAxisPoint, focusPriceAxisPointTether]: Behavior<Coordinate | null>,
  [chartClick, chartClickTether]: Behavior<MouseEventParams>,
  // [chartCrosshairMove, chartCrosshairMoveTether]: Behavior<MouseEventParams, MouseEventParams>,

  [changeYAxisCoords, changeYAxisCoordsTether]: Behavior<Coordinate>,
  [changefocusPrice, changefocusPriceTether]: Behavior<number | null>,
  [changeIsFocused, changeIsFocusedTether]: Behavior<boolean>,

  
  [chartVisibleLogicalRangeChange, chartVisibleLogicalRangeChangeTether]: Behavior<LogicalRange | null>,

  [clickResetPosition, clickResetPositionTether]: Behavior<null>,

) => {

  const markets = map(data => Object.values(data.markets), config.processData)
  const processData = config.processData

  const chainId = config.chain.id
  const nativeToken = GMX.CHAIN_ADDRESS_MAP[chainId].NATIVE_TOKEN
  const gmxContractMap = GMX.CONTRACT[config.chain.id]
  const datastore = GMX.CONTRACT[config.chain.id].Datastore
  const puppetContractMap = PUPPET.CONTRACT[config.chain.id]

  const tradeReader = trade.connectTrade(config.chain)

  // const vaultReader = contractReader(vaultConfig)
  
  const vault = connectContract(gmxContractMap.Vault)
  const usdg = connectContract(gmxContractMap.USDG)

  const v2Reader = contractReader(gmxContractMap.ReaderV2)
  const datastoreReader = contractReader(gmxContractMap.Datastore) 
  const referralStorage = connectContract(gmxContractMap.ReferralStorage)
  const positionRouter = connectContract(gmxContractMap.PositionRouter)
  const orchestrator = connectContract(puppetContractMap.Orchestrator)
  const router = connectContract(GMX.CONTRACT[config.chain.id].Router)


  

  const tradingStore = storage.createStoreScope(rootStoreScope, 'tradeBox' as const)


  const chartInterval = storage.replayWrite(tradingStore, GMX.TIME_INTERVAL_MAP.MIN15, selectTimeFrame, 'chartInterval')
  const isTradingEnabled = storage.replayWrite(tradingStore, false, enableTrading, 'isTradingEnabled')
  const isLong = storage.replayWrite(tradingStore, true, switchIsLong, 'isLong')
  const isIncrease = storage.replayWrite(tradingStore, true, switchIsIncrease, 'isIncrease')
  const focusMode = storage.replayWrite(tradingStore, ITradeFocusMode.collateral, switchFocusMode, 'focusMode')
  const slippage = storage.replayWrite(tradingStore, '0.35', changeSlippage, 'slippage')
  const primaryToken = storage.replayWrite(tradingStore, GMX.ADDRESS_ZERO, changePrimaryToken, 'inputToken')
  const isUsdCollateralToken = storage.replayWrite(tradingStore, false, changeIsUsdCollateralToken, 'shortCollateralToken')
  const leverage = mergeArray([
    changeLeverage,
    storage.replayWrite(tradingStore, GMX.MAX_LEVERAGE_FACTOR / 4n, debounce(100, changeLeverage), 'leverage'),
  ])

  const executeGasLimit = fromPromise(getExecuteGasFee(config.chain))
  const executionFee = map(params => {
    const estGasLimit = params.isIncrease ? params.executeGasLimit.increaseGasLimit : params.executeGasLimit.decreaseGasLimit
    
    return getExecutionFee(params.executeGasLimit.estimatedFeeBaseGasLimit, params.executeGasLimit.estimatedFeeMultiplierFactor, estGasLimit, params.gasPrice)
  }, combineObject({ executeGasLimit, isIncrease, gasPrice }))


  const executionFeeUsd = map(params => {   
    return getTokenUsd(params.processData.latestPrice[nativeToken].min, params.executionFee)
  }, combineObject({ executionFee, processData }))
  
  // storage.replayWrite(tradingStore, GMX.ADDRESS_ZERO, changeInputToken, 'inputToken')

  const market = mergeArray([
    map(params => {
      const stored = params.stored
      if (stored === undefined) {
        return params.markets[1]
      }

      return params.markets.find(m => m.marketToken === stored.marketToken) || params.markets[0]
    }, combineObject({ stored: indexDB.get(tradingStore, 'market') as Stream<IMarket | undefined>, markets })),
    multicast(storage.write(tradingStore, changeMarket, 'market')),
  ])

  const collateralDeltaUsd = replayLatest(changeCollateralDeltaUsd, 0n)
  const sizeDeltaUsd = replayLatest(changeSizeDeltaUsd, 0n)


  const collateralToken: Stream<viem.Address> = map(params => {
    return params.isUsdCollateralToken ? params.market.shortToken : params.market.longToken
  }, combineObject({ isLong, market, isUsdCollateralToken, switchTrade: startWith(null, switchTrade) }))


  const walletBalance = replayLatest(multicast(switchMap(params => {
    if (!params.wallet) {
      return now(0n)
    }

    return trade.getErc20Balance(config.chain, params.primaryToken, params.wallet.account.address)
  }, combineObject({ primaryToken, wallet }))))


  
  const collateralPrice = latestTokenPrice(config.processData, collateralToken)

  const marketPrice = map((params): IMarketPrice => {
    const longTokenPrice = params.processData.latestPrice[params.market.longToken]
    const shortTokenPrice = params.processData.latestPrice[params.market.shortToken]
    const indexTokenPrice = params.processData.latestPrice[params.market.indexToken]

    return { longTokenPrice, shortTokenPrice, indexTokenPrice }
  }, combineObject({ market, processData }))


  const indexPrice = switchMap(market => {
    const marketUpdatePrice = map(params => {
      if (params.isUsdCollateralToken)  {
        return params.processData.latestPrice[market.shortToken].min
      }
      
      return params.processData.latestPrice[market.longToken].min
    }, combineObject({ processData, isUsdCollateralToken }))

    return marketUpdatePrice
  }, market)

  const primaryPrice = map(params => {
    const token = resolveAddress(config.chain, params.primaryToken)
    return params.processData.latestPrice[token].min
  }, combineObject({ processData, primaryToken }))



  const marketInfo = replayLatest(multicast(switchMap(params => {
    return fromPromise(getMarketPoolInfo(config.chain, params.market, params.marketPrice))
  }, combineObject({ market, marketPrice }))))



  const route = map(params => {
    const w3p = params.wallet
    if (w3p === null) {
      return GMX.ADDRESS_ZERO
    }

    return w3p.account.address
  }, combineObject({ wallet }))

  // const route = replayLatest(multicast(switchMap(params => {
  //   const w3p = params.wallet
  //   if (w3p === null) {
  //     return now(GMX.ADDRESS_ZERO)
  //   }

  //   const key = getRouteKey(w3p.account.address, params.collateralToken, params.indexToken, params.isLong)
  //   const storedRouteKey = storage.get(tradingStore, GMX.ADDRESS_ZERO as viem.Address, key)
  //   const fallbackGetRoute = switchMap(address => {

  //     if (address === GMX.ADDRESS_ZERO) {
  //       return switchMap(res => {
  //         return address === GMX.ADDRESS_ZERO ? now(res) : indexDB.set(tradingStore, res, key)
  //       }, orchestrator.read('getRoute', key))
  //     }

  //     return now(address)
  //   }, storedRouteKey)

  //   return fallbackGetRoute
  // }, combineObject({ wallet, collateralToken, indexToken, isLong }))))



  const _positionKeyArgs = map(params => {
    const address = params.route || GMX.ADDRESS_ZERO
    const key = getPositionKey(address, params.market.marketToken, params.collateralToken, params.isLong)

    return { ...params, key, account: address }
  }, combineObject({ route, market, collateralToken, isLong, isUsdCollateralToken }))

  const positionKeyArgs = skipRepeatsWith((prev, next) => prev.key === next.key, _positionKeyArgs)


  const position: Stream<IPositionSlot | null> = map((params) => {
    const existingSlot = params.processData.mirrorPositionSlot[params.positionKeyArgs.key]

    if (!existingSlot) return null

    return existingSlot
    // return { ...initPartialPositionSlot, ...params.positionKeyArgs, blockTimestamp: unixTimestampNow(), orderKey: GMX.BYTES32_ZERO, market: GMX.ADDRESS_ZERO, transactionHash: GMX.BYTES32_ZERO }
  }, combineObject({ processData: config.processData, positionKeyArgs }))



  const stableFundingRateFactor = replayLatest(multicast(vault.read('stableFundingRateFactor')))
  const fundingRateFactor = replayLatest(multicast(vault.read('fundingRateFactor')))

  const inputTokenWeight = vault.read('tokenWeights', primaryToken)
  const inputTokenDebtUsd = vault.read('usdgAmounts', primaryToken)

  const primaryDescription = combineArray((network, token) => {
    if (token === GMX.ADDRESS_ZERO) {
      return getNativeTokenDescription(network.id)
    }

    return getTokenDescription(token)
  }, walletLink.chain, primaryToken)

  const indexDescription = map(mkt => getTokenDescription(mkt.indexToken), market)
  const collateralDescription = map((address) => getTokenDescription(address), collateralToken)


  // const positionInfo: Stream<PositionInfo | null> = switchMap(params => {
  //   if (params.position === null) return now(null)

  //   return v2Reader('getPositionInfo', gmxContractMap.Datastore.address, gmxContractMap.ReferralStorage.address, params.position.key, params.marketPrice, params.position.latestUpdate.sizeInUsd, GMX.ADDRESS_ZERO, true)
  // }, combineObject({ position, marketPrice }))


  // const positionInfo = snapshot((params, posInfo) => {
  //   const positionSlot = params.position
  //   if (positionSlot === null || posInfo === null) return null


  //   const markPrice = getMarkPrice(params.marketPrice.indexTokenPrice, false, positionSlot.isLong)
  //   const entryPrice = getEntryPrice(positionSlot.latestUpdate.sizeInTokens, positionSlot.latestUpdate.sizeInUsd, positionSlot.indexToken)
      
  //   const pendingFundingFeesUsd = getTokenUsd(
  //     posInfo.fees.funding.fundingFeeAmount,
  //     params.collateralTokenPrice
  //   )

    
  //   const marketLongTokenDescription = getTokenDescription(params.marketInfo.market.longToken)

  //   const pendingClaimableFundingFeesLongUsd = getTokenUsd(
  //     params.marketPrice.longTokenPrice.min,
  //     posInfo.fees.funding.claimableLongTokenAmount,
  //   )

  //   const marketShortTokenDescription = getTokenDescription(params.marketInfo.market.shortToken)

  //   const pendingClaimableFundingFeesShortUsd = getTokenUsd(
  //     params.marketPrice.shortTokenPrice.min,
  //     posInfo.fees.funding.claimableShortTokenAmount,
  //   )

  //   const pendingClaimableFundingFeesUsd = pendingClaimableFundingFeesLongUsd + pendingClaimableFundingFeesShortUsd
    


  //   const totalPendingFeesUsd = posInfo.fees.borrowing.borrowingFeeUsd + pendingFundingFeesUsd



  // const positionFeeInfo = getPositionFee(
  //   params.marketPoolInfo,
  //   positionSlot.latestUpdate.sizeInUsd,
  //   closingPriceImpactDeltaUsd > 0n,
  //   posInfo.fees.referral
  // )

  //   const closingFeeUsd = positionFeeInfo.positionFeeUsd
  //   const collateralUsd = getTokenUsd(
  //     params.collateralTokenPrice,
  //     positionSlot.latestUpdate.collateralAmount
  //   )

  //   const remainingCollateralUsd = collateralUsd - totalPendingFeesUsd
  //   const remainingCollateralAmount = getTokenAmount(params.collateralTokenPrice, remainingCollateralUsd)

  //   const pnl = getPositionPnlUsd(params.marketInfo, params.marketPoolInfo, params.marketPrice, positionSlot.latestUpdate.isLong, positionSlot.latestUpdate.sizeInUsd, positionSlot.latestUpdate.sizeInTokens, markPrice)

  //   const pnlPercentageFactor = factor(pnl, collateralUsd) // getBasisPoints(pnl, collateralUsd) : BigNumber.from(0)

  //   const netValue = getPositionNetValue(
  //     collateralUsd,
  //     pendingFundingFeesUsd,
  //     posInfo.fees.borrowing.borrowingFeeUsd,
  //     pnl,
  //     closingFeeUsd,
  //   )

  //   const pnlAfterFees = pnl - totalPendingFeesUsd - closingFeeUsd
  //   const pnlAfterFeesPercentage = collateralUsd <= 0n ? 0n : factor(pnlAfterFees, collateralUsd + closingFeeUsd)


  //   const leverage = getLeverage(
  //     positionSlot.latestUpdate.sizeInUsd,
  //     collateralUsd,
  //     pnl,
  //     posInfo.fees.borrowing.borrowingFeeUsd,
  //     pendingFundingFeesUsd
  //   )

  //   const hasLowCollateral = leverage > GMX.MAX_LEVERAGE_FACTOR || false


  //   const liquidationPrice = getLiquidationPrice(
  //     positionSlot.collateralToken,
  //     positionSlot.indexToken,
  //     positionSlot.latestUpdate.sizeInUsd,
  //     positionSlot.latestUpdate.sizeInTokens,
  //     positionSlot.latestUpdate.collateralAmount,
  //     collateralUsd,
  //     params.marketInfo,
  //     params.marketPoolInfo,
  //     pendingFundingFeesUsd,
  //     posInfo.fees.borrowing.borrowingFeeUsd,
  //     0n,
  //     positionSlot.isLong,
  //     posInfo.fees.referral
  //   )

    

  //   return liquidationPrice
  // }, combineObject({ position, marketInfo, marketPoolInfo, marketPrice, collateralToken, collateralTokenDescription, collateralTokenPrice }), datastoreVaultInfo)


  const collateralTokenPoolInfo = replayLatest(multicast(tradeReader.getTokenPoolInfo(collateralToken)))


  const collateralDelta = map(params => {
    return getTokenAmount(params.primaryPrice, params.collateralDeltaUsd)
  }, combineObject({ primaryPrice, inputTokenDescription: primaryDescription, collateralDeltaUsd }))

  const sizeDelta = map(params => {
    return getTokenAmount(params.marketPrice.indexTokenPrice.min, params.sizeDeltaUsd)
  }, combineObject({ indexTokenDescription: indexDescription, marketPrice, sizeDeltaUsd }))


  const swapFee = replayLatest(multicast(skipRepeats(map((params) => {

    const inputAndIndexStable = params.inputTokenDescription.isUsd && params.indexTokenDescription.isUsd
    const swapFeeBasisPoints = inputAndIndexStable ? GMX.STABLE_SWAP_FEE_BASIS_POINTS : GMX.SWAP_FEE_BASIS_POINTS
    const taxBasisPoints = inputAndIndexStable ? GMX.STABLE_TAX_BASIS_POINTS : GMX.TAX_BASIS_POINTS

    const rsolvedInputAddress = resolveAddress(config.chain, params.primaryToken)
    if (rsolvedInputAddress === params.collateralToken) {
      return 0n
    }


    let amountUsd = abs(params.collateralDeltaUsd)

    if (params.position && !params.isIncrease) {
      const pnl = getPnL(params.isLong, params.position.averagePrice, params.marketPrice.indexTokenPrice.min, params.position.latestUpdate.sizeInUsd)
      const adjustedDelta = getAdjustedDelta(params.position.latestUpdate.sizeInUsd, abs(params.sizeDeltaUsd), pnl)

      if (adjustedDelta > 0n) {
        amountUsd = amountUsd + adjustedDelta
      }
    }


    const usdgAmount = amountUsd * getDenominator(params.inputTokenDescription.decimals) / GMX.PERCISION

    const feeBps0 = getFeeBasisPoints(
      params.inputTokenDebtUsd,
      params.inputTokenWeight,
      usdgAmount,
      swapFeeBasisPoints,
      taxBasisPoints,
      true,
      params.usdgSupply,
      params.totalTokenWeight
    )
    const feeBps1 = getFeeBasisPoints(
      params.collateralTokenPoolInfo.usdgAmounts,
      params.collateralTokenPoolInfo.tokenWeights,
      usdgAmount,
      swapFeeBasisPoints,
      taxBasisPoints,
      false,
      params.usdgSupply,
      params.totalTokenWeight
    )

    const feeBps = feeBps0 > feeBps1 ? feeBps0 : feeBps1
    const addedSwapFee = feeBps ? amountUsd * feeBps / GMX.PERCISION : 0n

    return addedSwapFee
  }, combineObject({
    collateralToken, primaryToken, isIncrease, sizeDeltaUsd, isLong, collateralDeltaUsd, network: walletLink.chain,
    collateralTokenPoolInfo, usdgSupply: usdg.read('totalSupply'), totalTokenWeight: vault.read('totalTokenWeights'),
    position, inputTokenDescription: primaryDescription, inputTokenWeight, inputTokenDebtUsd, indexTokenDescription: indexDescription, marketPrice
  })))))


  const priceImpactUsd = map(params => {
    return getPriceImpactForPosition(
      params.marketInfo,
      params.sizeDeltaUsd,
      params.isLong,
    )
  }, combineObject({ position, marketInfo, sizeDeltaUsd, isLong }))


  const marginFee = map(params => {
    return -getMarginFee(
      params.marketInfo,
      params.priceImpact > 0n,
      params.sizeDeltaUsd,
    )
  }, combineObject({ marketInfo, sizeDeltaUsd, isLong, priceImpact: priceImpactUsd }))


  const totalNextFeesUsd = map(params => params.marginFee + params.swapFee + params.priceImpact, combineObject({ swapFee, marginFee, priceImpact: priceImpactUsd }))


  const fundingFee = map(params => {
    if (!params.position) return 0n

    return getFundingFee(params.position.entryFundingRate, params.collateralTokenPoolInfo.cumulativeRate, params.position.size)
  }, combineObject({ collateralTokenPoolInfo, position }))


  // [config]
  const tradeConfig: StateStream<ITradeConfig> = {
    marketInfo,
    market,
    focusMode,
    slippage,
    isLong,
    isIncrease,
    primaryToken,
    collateralToken,
    isUsdCollateralToken,
    leverage,
    collateralDelta,
    sizeDelta,
    collateralDeltaUsd,
    sizeDeltaUsd 
  }



  const positionList = map(params => {
    const walletAddress = params.wallet?.account.address
    if (!walletAddress) return []

    const filtered = Object.values(params.processData.mirrorPositionSlot).filter(pos => pos.account === viem.getAddress(walletAddress))
    return filtered
  }, combineObject({ processData: config.processData, wallet }))


  

  const averagePrice = map(params => {
    return 0n
    // if (params.position) {
    //   const pnl = getPnL(params.isLong, params.position.averagePrice, params.indexTokenPrice, params.position.size)

    //   return getNextAveragePrice(params.isLong, params.position.sizeInUsd, params.indexTokenPrice, pnl, params.sizeDeltaUsd)
    // }

    // if (params.sizeDeltaUsd === 0n) {
    //   return 0n
    // }

    // return getEntryPrice(params.indexToken, params.position.sizeInTokens, params.position.sizeInUsd)
  }, combineObject({ position, isIncrease, marketPrice, sizeDeltaUsd, isLong }))

  const liquidationPrice = skipRepeats(map(params => {
    return 0n
    // if (!params.position) {
    //   if (params.sizeDeltaUsd === 0n) return 0n

    //   return getLiquidationPrice(params.isLong, params.collateralDeltaUsd, params.sizeDeltaUsd, params.indexTokenPrice) * getDenominator(params.indexTokenDescription.decimals)
    // }

    // const pnl = getPnL(params.isLong, params.position.averagePrice, params.indexTokenPrice, params.position.size)
    
    // const price = getNextLiquidationPrice(
    //   params.isLong, params.position.size, params.position.collateral, params.position.averagePrice,
    //   params.position.entryFundingRate, params.collateralTokenPoolInfo.cumulativeRate,
    //   pnl, params.sizeDeltaUsd, params.collateralDeltaUsd
    // )

    // return price
  }, combineObject({ position, isIncrease, collateralDeltaUsd, collateralTokenPoolInfo, sizeDeltaUsd, averagePrice, marketPrice, indexDescription, isLong })))




  const requestTradeRow = map(res => {
    return [res]
  }, requestTrade)


  const isPrimaryApproved = replayLatest(multicast(mergeArray([
    changeInputTokenApproved,
    awaitPromises(snapshot(async (collateralDeltaUsd, params) => {
      if (!params.wallet) {
        console.warn(new Error('No wallet connected'))
        return false
      }


      if (params.inputToken === GMX.ADDRESS_ZERO || !params.isIncrease) {
        return true
      }

      const contractAddress = getMappedValue(GMX.TRADE_CONTRACT_MAPPING, chainId).Router

      if (params.route === null || contractAddress === null || !params.wallet) {
        return false
      }

      try {
        const allowedSpendAmount = await readContract({
          address: params.inputToken,
          abi: erc20Abi,
          functionName: 'allowance',
          args: [params.wallet.account.address, params.route]
        })

        return allowedSpendAmount > collateralDeltaUsd
      } catch (err) {
        console.warn(err)
        return false
      }

    }, collateralDeltaUsd, combineObject({ wallet, inputToken: primaryToken, isIncrease, route }))),
  ])))

  const availableIndexLiquidityUsd =  now(0n)// tradeReader.getAvailableLiquidityUsd(market, collateralToken)



  const openPositionList: Stream<IPositionSlot[]> = mergeArray([
    combineArray((pos, posList) => {
      if (posList.length === 0) {
        return []
      }

      if (pos === null)  {
        return posList
      }

      const trade = posList.find(t => t.key === pos.key) || null

      if (trade === null) {
        return posList
      }

      return posList.filter(t => t.key !== pos.key)
    }, position, positionList)
  ])

  const activePosition = zip((tradeList, pos) => {
    const trade = tradeList.find(t => t.key === pos.key) || null
    return { trade, positionId: pos }
  }, openPositionList, positionKeyArgs)


  const pricefeed = map(params => {
    const feed = getIntervalIdentifier(params.market.indexToken, params.timeframe)
    const candleFeed = Object.values(params.processData.pricefeed[feed])

    return candleFeed
  }, combineObject({ timeframe: chartInterval, market, processData: config.processData }))


  const focusPrice = replayLatest(multicast(changefocusPrice), null)
  const yAxisCoords = replayLatest(multicast(changeYAxisCoords), null)
  const isFocused = replayLatest(multicast(changeIsFocused), false)


  const tradeState: StateStream<ITradeParams> = {
    markets,
    route,

    position,
    isTradingEnabled,
    isPrimaryApproved,

    marketPrice,
    collateralPrice,
    primaryPrice,
    indexPrice,

    availableIndexLiquidityUsd,
    walletBalance,

    executionFee,
    executionFeeUsd,
    fundingFee,
    marginFee,
    swapFee,
    priceImpactUsd,
    totalNextFeesUsd,

    primaryDescription,
    indexDescription,
    collateralDescription,

    averagePrice,
    liquidationPrice,

    stableFundingRateFactor,
    fundingRateFactor,

    collateralTokenPoolInfo,
  }

  const $tradebox = $PositionEditor({
    ...config,
    openPositionList,
    tradeConfig,
    tradeState,
    tradeActions: {
      requestReset: clickResetPosition
    },
    $container: $column
  })({
    leverage: changeLeverageTether(),
    switchIsIncrease: switchIsIncreaseTether(),
    changeCollateralDeltaUsd: changeCollateralDeltaUsdTether(),
    changeSizeDeltaUsd: changeSizeDeltaUsdTether(),
    changeInputToken: changePrimaryTokenTether(),
    isUsdCollateralToken: changeIsUsdCollateralTokenTether(),
    changeIndexToken: changeMarketTether(tap(xxx => console.log('changeIndexToken', xxx))),
    switchIsLong: switchIsLongTether(),
    changeSlippage: changeSlippageTether(),
    switchFocusMode: switchFocusModeTether(),
    // switchFocusMode: 
  })

  const CONTAINER_WIDTH = 1240
  const $tradeMidContainer = $column(layoutSheet.spacing, style({ flex: 1, margin: '0 auto', width: '100%', position: 'relative', maxWidth: `${CONTAINER_WIDTH}px` }))


  return [
    $column(screenUtils.isDesktopScreen ? style({  flex: 1 }) : style({  }))(


      // filterNull(map(info => {

      //   console.log('info', info)

      //   return null
      // }, positionInfo)) as any,

      $column(
        screenUtils.isDesktopScreen
          ? style({ 
            // paddingLeft: '26px'
          })
          : style({}),
        style({ minHeight: '460px', flex: 1, maxHeight: '65vh', position: 'relative', backgroundColor: pallete.background }),
        // screenUtils.isDesktopScreen
        //   ? style({ height: '500px' })
        //   : style({ height: '500px' })
      )(



        $tradeMidContainer(
          screenUtils.isDesktopScreen
            ? style({ pointerEvents: 'none', flexDirection: 'row', marginTop: '12px', zIndex: 20, placeContent: 'space-between', alignItems: 'flex-start' })
            : style({ pointerEvents: 'none', flex: 0, flexDirection: 'row', zIndex: 20, margin: '8px', alignItems: 'flex-start' })
        )(
          screenUtils.isDesktopScreen
            ? style({ pointerEvents: 'all' })(
              $ButtonToggle({
                selected: chartInterval,
                options: [
                  GMX.TIME_INTERVAL_MAP.MIN5,
                  GMX.TIME_INTERVAL_MAP.MIN15,
                  GMX.TIME_INTERVAL_MAP.MIN60,
                  GMX.TIME_INTERVAL_MAP.HR4,
                  GMX.TIME_INTERVAL_MAP.HR24,
                // GMX.TIME_INTERVAL_MAP.DAY7,
                ],
                $$option: map(option => {
                  const timeframeLabel = TIME_INTERVAL_LABEL_MAP[option]

                  return $text(timeframeLabel)
                })
              })({ select: selectTimeFrameTether() })
            )
            : $Dropdown({
              $selection: switchLatest(map((option) => {
                const timeframeLabel = TIME_INTERVAL_LABEL_MAP[option]

                return style({ padding: '8px', alignSelf: 'center' })(
                  $ButtonSecondary({
                    $content: $row(
                      $text(timeframeLabel),
                      $icon({ $content: $caretDown, width: '14px', viewBox: '0 0 32 32' })
                    )
                  })({})
                )
              }, chartInterval)),
              selector: {
                value: chartInterval,
                $$option: map((option) => {
                  const timeframeLabel = TIME_INTERVAL_LABEL_MAP[option]

                  return $text(style({ fontSize: '.85rem' }))(timeframeLabel)
                }),
                list: [
                  GMX.TIME_INTERVAL_MAP.MIN5,
                  GMX.TIME_INTERVAL_MAP.MIN15,
                  GMX.TIME_INTERVAL_MAP.MIN60,
                  GMX.TIME_INTERVAL_MAP.HR4,
                  GMX.TIME_INTERVAL_MAP.HR24,
                  // GMX.TIME_INTERVAL_MAP.DAY7,
                ],
              }
            })({
              select: selectTimeFrameTether()
            }),
          $row(layoutSheet.spacing)(
            $column(layoutSheet.spacingSmall)(
              $infoLabel('Borrow Rate'),
              $row(style({ whiteSpace: 'pre' }))(
                $text(map(params => {
                  const rateFactor = params.isLong ? params.fundingRateFactor : params.stableFundingRateFactor
                  const rate = safeDiv(rateFactor * params.collateralTokenPoolInfo.reservedAmount, params.collateralTokenPoolInfo.poolAmounts)
                  return readablePercentage(rate)
                }, combineObject({ isLong, collateralTokenPoolInfo, stableFundingRateFactor, fundingRateFactor }))),
                $text(style({ color: pallete.foreground }))(' / hr')
              )
            ),
            $column(layoutSheet.spacingSmall)(
              $infoLabel('Available Liquidity'),
              $text(map(amountUsd => 'readableFixedUSD30(amountUsd)', availableIndexLiquidityUsd))
            )
          ),

          screenUtils.isDesktopScreen
            ? $column(style({ position: 'absolute', pointerEvents: 'all', zIndex: 20, bottom: '40px', width: '440px', left: '0' }))(
              $tradebox,
            ) : empty(),
        ),

        switchLatest(snapshot((params, feed) => {

          const tf = params.timeframe
          const fst = feed[feed.length - 1]

          const initialTick = {
            open: formatFixed(fst.o * getDenominator(params.indexTokenDescription.decimals), 30),
            high: formatFixed(fst.h * getDenominator(params.indexTokenDescription.decimals), 30),
            low: formatFixed(fst.l * getDenominator(params.indexTokenDescription.decimals), 30),
            close: formatFixed(fst.c * getDenominator(params.indexTokenDescription.decimals), 30),
            time: fst.blockTimestamp as Time
          }

          const rightOffset = ((document.body.clientWidth - CONTAINER_WIDTH) / 2) / 8

          return $CandleSticks({
            $content: $row(
              $row(
                styleBehavior(map(state => {
                  return { border: `1px solid ${state ? pallete.primary : pallete.horizon}` }
                }, isFocused)),
                style({
                  backgroundColor: pallete.background,
                  transition: 'border-color .15s ease-in-out',
                  fontSize: '.85rem',
                  padding: '6px 8px',
                  borderRadius: '30px',
                })
              )(

                switchMap(state => {
                  if (!state) {
                    return empty()
                  }

                  return $row(layoutSheet.spacingSmall)(
                    $infoLabeledValue('Size', $text(map(value => `${readableFixedUSD30(value)}`, sizeDeltaUsd))),
                    $infoLabeledValue('Collateral', $text(map(value => `${readableFixedUSD30(value)}`, collateralDeltaUsd))),
                  )
                }, isFocused),
                $icon({ $content: $target, width: '16px', svgOps: style({ margin: '0 6px' }), viewBox: '0 0 32 32' }),

                $text(map(ev => {
                  return readableUnitAmount(ev)
                }, filterNull(focusPrice)))
              )
            ),
            data: feed.map(({ o, h, l, c, blockTimestamp }) => {
              const open = formatFixed(o * getDenominator(params.indexTokenDescription.decimals), 30)
              const high = formatFixed(h * getDenominator(params.indexTokenDescription.decimals), 30)
              const low = formatFixed(l * getDenominator(params.indexTokenDescription.decimals), 30)
              const close = formatFixed(c * getDenominator(params.indexTokenDescription.decimals), 30)

              return { open, high, low, close, time: Number(blockTimestamp) as Time }
            }),
            seriesConfig: {
              priceLineColor: pallete.foreground,
              baseLineStyle: LineStyle.SparseDotted,

              upColor: pallete.foreground,
              borderUpColor: pallete.foreground,
              wickUpColor: pallete.foreground,

              downColor: 'transparent',
              borderDownColor: colorAlpha(pallete.foreground, .5),
              wickDownColor: colorAlpha(pallete.foreground, .5),
            },
            priceLines: [
              map(val => {
                if (val === 0n) {
                  return null
                }

                return {
                  price: formatFixed(val, 30),
                  color: pallete.foreground,
                  lineVisible: true,
                  // axisLabelColor: '#fff',
                  // axisLabelTextColor: 'red',
                  // axisLabelVisible: true,
                  lineWidth: 1,
                  title: `Entry`,
                  lineStyle: LineStyle.SparseDotted,
                }
              }, averagePrice),
              map(val => {
                if (val === 0n) {
                  return null
                }

                return {
                  price: formatFixed(val, 30),
                  color: pallete.negative,
                  lineVisible: true,
                  // axisLabelColor: 'red',
                  // axisLabelVisible: true,
                  // axisLabelTextColor: 'red',
                  lineWidth: 1,
                  title: `Liquidation`,
                  lineStyle: LineStyle.SparseDotted,
                }
              }, liquidationPrice)

            ],
            appendData: scan((prev: CandlestickData, next): CandlestickData => {
              const marketPrice = formatFixed(next.marketPrice.indexTokenPrice.min * getDenominator(params.indexTokenDescription.decimals), GMX.USD_DECIMALS)
              
              const timeNow = unixTimestampNow()

              const prevTimeSlot = Math.floor(prev.time as number / tf)
              const nextTimeSlot = Math.floor(timeNow / tf)
              const time = nextTimeSlot * tf as Time

              const isNext = nextTimeSlot > prevTimeSlot

              document.title = `${next.indexTokenDescription.symbol} ${readableUnitAmount(marketPrice)}`

              if (isNext) {
                return {
                  open: marketPrice,
                  high: marketPrice,
                  low: marketPrice,
                  close: marketPrice,
                  time
                }
              }

              return {
                open: prev.open,
                high: marketPrice > prev.high ? marketPrice : prev.high,
                low: marketPrice < prev.low ? marketPrice : prev.low,
                close: marketPrice,
                time
              }
            }, initialTick, combineObject({ marketPrice, indexTokenDescription: indexDescription })),
            containerOp: style({ position: 'absolute', inset: 0, borderRadius: '20px', overflow: 'hidden' }),
            chartConfig: {
              rightPriceScale: {
                visible: true,
                autoScale: true,
                entireTextOnly: true,
                borderVisible: false,
                scaleMargins: {
                  top: 0.15,
                  bottom: 0.15
                }
              },
              timeScale: {
                timeVisible: true,
                secondsVisible: false,
                borderVisible: false,
                rightOffset: rightOffset,
                shiftVisibleRangeOnNewBar: true,
              }
            },
            yAxisState: {
              price: focusPrice,
              isFocused: isFocused,
              coords: yAxisCoords
            }
          })({
            yAxisCoords: changeYAxisCoordsTether(),
            focusPrice: changefocusPriceTether(),
            isFocused: changeIsFocusedTether(),
            // crosshairMove: chartCrosshairMoveTether(),
            click: chartClickTether(),
            visibleLogicalRangeChange: chartVisibleLogicalRangeChangeTether(),
          })

              
        }, combineObject({ timeframe: chartInterval, indexToken: market, indexTokenDescription: indexDescription }), pricefeed)),




        screenUtils.isDesktopScreen
          ? $node(style({
            background: `linear-gradient(to right, ${pallete.background} 0%, ${colorAlpha(pallete.background, .9)} 32%, transparent 45%)`,
            position: 'absolute',
            inset: 0,
            margin: `0px -100px`,
            zIndex: 10,
            pointerEvents: 'none',
          }))()
          : empty(),
      ),

      // screenUtils.isMobileScreen
      //   ? $midContainer(style({ }))(
      //     $tradebox,
      //   )
      //   : empty(),

      $tradeMidContainer(layoutSheet.spacingSmall)(
        $IntermediateConnectButton({
          $$display: map(w3p => {
            return $column(style({ flex: 1 }))(
              switchMap(params => {

                const route = params.isLong ? `Long-${params.indexTokenDescription.symbol}` : `Short-${params.indexTokenDescription.symbol}/${params.indexTokenDescription.symbol}`
              

                return $row(layoutSheet.spacing, style({ flex: 1 }))(
              
                  $PositionDetailsPanel({
                    ...config,
                    chain: config.chain,
                    openPositionList,
                    parentRoute: config.parentRoute,
                    pricefeed,
                    tradeConfig,
                    wallet: w3p,
                    tradeState,
                    $container: $column(style({ width: '440px' }))
                  })({
                    clickResetPosition: clickResetPositionTether(),
                    approvePrimaryToken: changeInputTokenApprovedTether(),
                    enableTrading: enableTradingTether(),
                    requestTrade: requestTradeTether(),
                    switchTrade: switchTradeTether(),
                    // leverage: changeLeverageTether(),
                    // changeCollateralDeltaUsd: changeCollateralDeltaUsdTether(),
                    // changeSizeDeltaUsd: changeSizeDeltaUsdTether(),
                  }),

                  $seperator2,

                  params.position
                    ? $CardTable({
                    // $rowContainer: screenUtils.isDesktopScreen
                    //   ? $row(layoutSheet.spacing, style({ padding: `2px 26px` }))
                    //   : $row(layoutSheet.spacingSmall, style({ padding: `2px 10px` })),
                    // headerCellOp: style({ padding: screenUtils.isDesktopScreen ? '15px 15px' : '6px 4px' }),
                    // cellOp: style({ padding: screenUtils.isDesktopScreen ? '4px 15px' : '6px 4px' }),
                      dataSource: mergeArray([
                        now(params.position.updates) as Stream<(IRequestTrade | IPositionIncrease | IPositionDecrease)[]>,
                        // constant(initalList, periodic(3000)),
                        requestTradeRow
                      ]),
                      // $container: $defaultTableContainer(screenUtils.isDesktopScreen ? style({ flex: '1 1 0', minHeight: '100px' }) : style({})),
                      scrollConfig: {
                        insertAscending: true
                      },
                      columns: [
                        {
                          $head: $text('Time'),
                          columnOp: O(style({ maxWidth: '100px' })),

                          $$body: map((req) => {
                            const isKeeperReq = 'slippage' in req

                            const timestamp = isKeeperReq ? unixTimestampNow() : req.blockTimestamp

                            return $column(layoutSheet.spacingTiny, style({ fontSize: '.85rem' }))(
                              $text(timeSince(timestamp) + ' ago'),
                              $text(readableDate(timestamp)),
                            )
                          })
                        },
                        {
                          $head: $text('Action'),
                          columnOp: O(style({ flex: 1 })),

                          $$body: map((pos) => {
                            const $requestRow = $row(style({ alignItems: 'center' }))

                            if ('key' in pos) {
                              const direction = pos.__typename === 'IncreasePosition' ? '↑' : '↓'
                              return $row(layoutSheet.spacingSmall)(
                                $txHashRef(pos.transactionHash, w3p.chain.id, $text(`${direction} ${readableFixedUSD30(pos.price)}`))
                              )
                            }

                            return $row(layoutSheet.spacingSmall)(
                            // switchMap(req => {
                            //   const activePositionAdjustment = take(1, filter(ev => {
                            //     const key = getPositionKey(ev.args.account, pos.isIncrease ? ev.args.path.slice(-1)[0] : ev.args.path[0], ev.args.indexToken, ev.args.isLong)

                              //     return key === getPositionKey(pos.route, pos.collateralToken, pos.indexToken, pos.isLong)
                              //   }, adjustPosition))

                              //   return $row(layoutSheet.spacingSmall)(
                              //     switchLatest(mergeArray([
                              //       now($spinner),
                              //       map(req => {
                              //         const isRejected = req.eventName === 'CancelIncreasePosition' // || req.eventName === 'CancelDecreasePosition'

                              //         const message = $text(`${isRejected ? `✖ ${readableFixedUSD30(req.args.acceptablePrice)}` : `✔ ${readableFixedUSD30(req.args.acceptablePrice)}`}`)

                            //         return $requestRow(
                            //           $txHashRef(req.transactionHash!, w3p.chain.id, message),
                            //           $infoTooltip('transaction was sent, keeper will execute the request, the request will either be executed or rejected'),
                            //         )
                            //       }, activePositionAdjustment),
                            //     ])),
                            //     $txHashRef(
                            //       req.transactionHash, w3p.chain.id,
                            //       $text(`${isIncrease ? '↑' : '↓'} ${readableFixedUSD30(pos.acceptablePrice)} ${isIncrease ? '<' : '>'}`)
                            //     ),
                            //   ) 
                            // }, fromPromise(pos.request)),
                            )

                          })
                        },
                        ...screenUtils.isDesktopScreen
                          ? [
                            {
                              $head: $text('PnL Realised'),
                              columnOp: O(style({ flex: .5, placeContent: 'flex-end', textAlign: 'right', alignItems: 'center' })),
                              $$body: map((req: IRequestTrade | IPositionIncrease | IPositionDecrease) => {
                                const fee = -getMarginFees('request' in req ? req.sizeDeltaUsd : req.fee)

                                if ('request' in req) {
                                  return $text(readableFixedUSD30(fee))
                                }

                                return $text(readableFixedUSD30(-req.fee))
                              })
                            }
                          ] : [],
                        {
                          $head: $text('Collateral change'),
                          columnOp: O(style({ flex: .7, placeContent: 'flex-end', textAlign: 'right', alignItems: 'center' })),

                          $$body: map((req) => {
                            const isKeeperReq = 'request' in req
                            const delta = isKeeperReq
                              ? req.isIncrease
                                ? req.collateralDeltaUsd : -req.collateralDeltaUsd : req.__typename === 'IncreasePosition'
                                ? req.collateralDelta : -req.collateralDelta

                            return $text(readableFixedUSD30(delta))
                          })
                        },
                        {
                          $head: $text('Size change'),
                          columnOp: O(style({ flex: .7, placeContent: 'flex-end', textAlign: 'right', alignItems: 'center' })),
                          $$body: map((req) => {
                            const isKeeperReq = 'request' in req
                            const delta = isKeeperReq
                              ? req.isIncrease
                                ? req.sizeDeltaUsd : -req.sizeDeltaUsd : req.__typename === 'IncreasePosition'
                                ? req.sizeDelta : -req.sizeDelta

                            return $text(readableFixedUSD30(delta))
                          })
                        },
                      ]
                    })({})
                    : $column(layoutSheet.spacingSmall, style({ flex: 1, alignItems: 'center', placeContent: 'center' }))(
                      $text(style({ fontSize: '1.5rem' }))('Trade History'),
                      $text(style({ color: pallete.foreground }))(
                        `No active ${route} position`
                      )
                    )
                )
              }, combineObject({ position, indexTokenDescription: indexDescription, isLong }))
            )
          })
        })({})
      )

    ),

    {
      changeRoute,
    }
  ]
})


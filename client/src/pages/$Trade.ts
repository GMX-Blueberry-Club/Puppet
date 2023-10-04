import { Behavior, combineArray, combineObject, replayLatest } from "@aelea/core"
import { $node, $text, component, style, styleBehavior } from "@aelea/dom"
import { $column, $icon, $row, layoutSheet, observer, screenUtils } from "@aelea/ui-components"
import {
  IMarket,
  IMarketInfo,
  IMarketPrice,
  IPositionSlot,
  PositionInfo,
  StateStream,
  formatFixed,
  getAvailableReservedUsd, getBorrowingFactorPerInterval, getCappedPositionPnlUsd, getDenominator,
  getFundingFactorPerInterval, getFundingFactorPerInterval2,
  getIntervalIdentifier,
  getLiquidationPrice,
  getMappedValue,
  getMarginFee,
  getNativeTokenAddress,
  getNativeTokenDescription,
  getPositionKey,
  getPriceImpactForPosition,
  getTokenAmount,
  getTokenDenominator,
  getTokenDescription,
  getTokenUsd,
  readableFactorPercentage,
  readableFixedUSD30,
  readableUnitAmount, resolveAddress,
  switchMap,
  unixTimestampNow
} from "gmx-middleware-utils"

import { colorAlpha, pallete } from "@aelea/ui-components-theme"
import { awaitPromises, constant, debounce, empty, fromPromise, map, mergeArray, multicast, now, scan, skipRepeats, skipRepeatsWith, snapshot, startWith, switchLatest, tap, zip } from "@most/core"
import { Stream } from "@most/types"
import { readContract } from "@wagmi/core"
import { erc20Abi } from "abitype/test"
import * as GMX from "gmx-middleware-const"
import { $ButtonToggle, $CandleSticks, $infoLabel, $infoLabeledValue, $target } from "gmx-middleware-ui-components"
import { CandlestickData, Coordinate, LineStyle, LogicalRange, MouseEventParams, Time } from "lightweight-charts"
import * as PUPPET from "puppet-middleware-const"
import { IPositionMirrorSlot } from "puppet-middleware-utils"
import * as viem from "viem"
import { $midContainer } from "../common/$common.js"
import { $caretDown } from "../common/elements/$icons.js"
import { $IntermediateConnectButton } from "../components/$ConnectAccount.js"
import { $ButtonSecondary } from "../components/form/$Button.js"
import { $Dropdown } from "../components/form/$Dropdown.js"
import { $PositionAdjustmentDetails } from "../components/trade/$PositionAdjustmentDetails"
import { $PositionDetails } from "../components/trade/$PositionDetails.js"
import { $PositionEditor, IPositionEditorAbstractParams, ITradeConfig, ITradeFocusMode, ITradeParams } from "../components/trade/$PositionEditor.js"
import { $PositionListDetails, IRequestTrade } from "../components/trade/$PositionListDetails.js"
import { latestTokenPrice } from "../data/process/process.js"
import { rootStoreScope } from "../data/store/store.js"
import { connectContract, contractReader } from "../logic/common.js"
import * as trade from "../logic/trade.js"
import { exchangesWebsocketPriceSource } from "../logic/trade.js"
import { getExecuteGasFee, getExecutionFee, getFullMarketInfo } from "../logic/tradeV2.js"
import * as indexDB from "../utils/storage/indexDB.js"
import * as storage from "../utils/storage/storeScope.js"
import { walletLink } from "../wallet/index.js"
import { gasPrice, wallet } from "../wallet/walletLink.js"
import { $seperator2 } from "./common.js"


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

  [switchPosition, switchPositionTether]: Behavior<IPositionSlot>,
  [requestTrade, requestTradeTether]: Behavior<IRequestTrade>,

  // [focusPriceAxisPoint, focusPriceAxisPointTether]: Behavior<Coordinate | null>,
  [chartClick, chartClickTether]: Behavior<MouseEventParams>,
  // [chartCrosshairMove, chartCrosshairMoveTether]: Behavior<MouseEventParams, MouseEventParams>,

  [changeYAxisCoords, changeYAxisCoordsTether]: Behavior<Coordinate>,
  [changefocusPrice, changefocusPriceTether]: Behavior<number | null>,
  [changeIsFocused, changeIsFocusedTether]: Behavior<boolean>,
  
  [changeBorrowRateIntervalDisplay, changeBorrowRateIntervalDisplayTether]: Behavior<GMX.IntervalTime>,
  [changeFundingRateIntervalDisplay, changeFundingRateIntervalDisplayTether]: Behavior<GMX.IntervalTime>,

  
  [chartVisibleLogicalRangeChange, chartVisibleLogicalRangeChangeTether]: Behavior<LogicalRange | null>,

  [clickResetPosition, clickResetPositionTether]: Behavior<null>,

) => {

  const markets = map(data => Object.values(data.markets), config.processData)
  const processData = config.processData

  const chainId = config.chain.id
  const nativeToken = getNativeTokenAddress(config.chain)
  const gmxContractMap = GMX.CONTRACT[config.chain.id]
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
  const borrowRateIntervalDisplay = storage.replayWrite(tradingStore, GMX.TIME_INTERVAL_MAP.MIN60, changeBorrowRateIntervalDisplay, 'borrowRateIntervalDisplay')
  const fundingRateIntervalDisplay = storage.replayWrite(tradingStore, GMX.TIME_INTERVAL_MAP.MIN60, changeFundingRateIntervalDisplay, 'fundingRateIntervalDisplay')
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
    storage.write(tradingStore, changeMarket, 'market'),
  ])

  const collateralDeltaUsd = replayLatest(changeCollateralDeltaUsd, 0n)
  const sizeDeltaUsd = replayLatest(changeSizeDeltaUsd, 0n)


  const collateralToken: Stream<viem.Address> = map(params => {
    return params.isUsdCollateralToken ? params.market.shortToken : params.market.longToken
  }, combineObject({ isLong, market, isUsdCollateralToken }))


  const walletBalance = replayLatest(multicast(switchMap(params => {
    if (!params.wallet) {
      return now(0n)
    }

    return trade.getErc20Balance(config.chain, params.primaryToken, params.wallet.account.address)
  }, combineObject({ primaryToken, wallet }))))


  
  const collateralPrice = switchMap(token => latestTokenPrice(config.processData, token), collateralToken)

  const marketPrice = map((params): IMarketPrice => {
    const longTokenPrice = params.processData.latestPrice[params.market.longToken]
    const shortTokenPrice = params.processData.latestPrice[params.market.shortToken]
    const indexTokenPrice = params.processData.latestPrice[params.market.indexToken]

    return { longTokenPrice, shortTokenPrice, indexTokenPrice }
  }, combineObject({ market, processData }))




  const indexToken = map(params => {
    return params.market.indexToken
  }, combineObject({ market }))

  const latestPriceSocketSource = multicast(switchMap(token => {
    return observer.duringWindowActivity(exchangesWebsocketPriceSource(token))
  }, indexToken))


  const indexPrice = mergeArray([
    // latestPriceSocketSource,
    map(params => {
      return params.processData.latestPrice[params.indexToken].min
    }, combineObject({ processData, indexToken }))
  ])

  const primaryPrice = map(params => {
    const token = resolveAddress(config.chain, params.primaryToken)
    return params.processData.latestPrice[token].min
  }, combineObject({ processData, primaryToken }))


  // const marketPoolUsage = replayLatest(multicast(switchMap(params => {
  //   const poolInfo = fromPromise(getMarketPoolUsage(config.chain, params.market))

  //   return poolInfo
  // }, combineObject({ market, marketPrice }))))

  // const marketConfig = replayLatest(multicast(switchMap(params => {
  //   const poolInfo = fromPromise(getMarketConfig(config.chain, params.market))

  //   return poolInfo
  // }, combineObject({ market, marketPrice }))))

  // const marketPool: Stream<IMarketPool> = replayLatest(multicast(switchMap(params => {
  //   const data = v2Reader(
  //     'getMarketTokenPrice',
  //     gmxContractMap.Datastore.address,
  //     params.market,
  //     params.marketPrice.indexTokenPrice,
  //     params.marketPrice.longTokenPrice,
  //     params.marketPrice.shortTokenPrice,
  //     hashKey("MAX_PNL_FACTOR_FOR_TRADERS"),
  //     true
  //   )

  //   return map(res => res[1], data)
  // }, combineObject({ market, marketPrice }))))

  const marketInfo: Stream<IMarketInfo> = replayLatest(multicast(switchMap(params => {
    const query = getFullMarketInfo(config.chain, params.market, params.marketPrice)
    return map(res => {

      return { ...res, market: params.market, price: params.marketPrice }
    }, query)
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

  const position: Stream<IPositionMirrorSlot | null> = mergeArray([
    map((params) => {
      const existingSlot = params.processData.mirrorPositionSlot[params.positionKeyArgs.key]

      if (!existingSlot) return null

      return existingSlot
    // return { ...initPartialPositionSlot, ...params.positionKeyArgs, blockTimestamp: unixTimestampNow(), orderKey: GMX.BYTES32_ZERO, market: GMX.ADDRESS_ZERO, transactionHash: GMX.BYTES32_ZERO }
    }, combineObject({ processData: config.processData, positionKeyArgs })),
    switchPosition
  ])


  const positionFees: Stream<PositionInfo | null> = switchMap(params => {
    if (params.position === null) return now(null)

    const positionFeeInfo = v2Reader('getPositionInfo', gmxContractMap.Datastore.address, gmxContractMap.ReferralStorage.address, params.position.key, params.marketPrice, params.position.maxSizeUsd, GMX.ADDRESS_ZERO, false)

    return positionFeeInfo
  }, combineObject({ position, marketPrice }))

  const stableFundingRateFactor = replayLatest(multicast(vault.read('stableFundingRateFactor')))
  const fundingRateFactor = replayLatest(multicast(vault.read('fundingRateFactor')))

  const inputTokenWeight = vault.read('tokenWeights', primaryToken)
  const inputTokenDebtUsd = vault.read('usdgAmounts', primaryToken)

  const primaryDescription = combineArray((chain, token) => {
    if (token === GMX.ADDRESS_ZERO) {
      return getNativeTokenDescription(chain)
    }

    return getTokenDescription(token)
  }, walletLink.chain, primaryToken)

  const indexDescription = map(token => getTokenDescription(token), indexToken)
  const collateralDescription = map((address) => getTokenDescription(address), collateralToken)



  const collateralTokenPoolInfo = replayLatest(multicast(tradeReader.getTokenPoolInfo(collateralToken)))




  const swapFee = replayLatest(multicast(skipRepeats(map((params) => {

    const inputAndIndexStable = params.inputTokenDescription.isUsd && params.indexTokenDescription.isUsd
    const swapFeeBasisPoints = inputAndIndexStable ? GMX.STABLE_SWAP_FEE_BASIS_POINTS : GMX.SWAP_FEE_BASIS_POINTS
    const taxBasisPoints = inputAndIndexStable ? GMX.STABLE_TAX_BASIS_POINTS : GMX.TAX_BASIS_POINTS

    return 0n

    // const rsolvedInputAddress = resolveAddress(config.chain, params.primaryToken)
    // if (rsolvedInputAddress === params.collateralToken) {
    //   return 0n
    // }


    // let amountUsd = abs(params.collateralDeltaUsd)

    // if (params.position && !params.isIncrease) {
    //   const pnl = getPnL(params.isLong, params.position.averagePrice, params.marketPrice.indexTokenPrice.min, params.position.latestUpdate.sizeInUsd)
    //   const adjustedDelta = getAdjustedDelta(params.position.latestUpdate.sizeInUsd, abs(params.sizeDeltaUsd), pnl)

    //   if (adjustedDelta > 0n) {
    //     amountUsd = amountUsd + adjustedDelta
    //   }
    // }


    // const usdgAmount = amountUsd * getDenominator(params.inputTokenDescription.decimals) / GMX.PRECISION

    // const feeBps0 = getFeeBasisPoints(
    //   params.inputTokenDebtUsd,
    //   params.inputTokenWeight,
    //   usdgAmount,
    //   swapFeeBasisPoints,
    //   taxBasisPoints,
    //   true,
    //   params.usdgSupply,
    //   params.totalTokenWeight
    // )
    // const feeBps1 = getFeeBasisPoints(
    //   params.collateralTokenPoolInfo.usdgAmounts,
    //   params.collateralTokenPoolInfo.tokenWeights,
    //   usdgAmount,
    //   swapFeeBasisPoints,
    //   taxBasisPoints,
    //   false,
    //   params.usdgSupply,
    //   params.totalTokenWeight
    // )

    // const feeBps = feeBps0 > feeBps1 ? feeBps0 : feeBps1
    // const addedSwapFee = feeBps ? amountUsd * feeBps / GMX.PRECISION : 0n

    // return addedSwapFee
  }, combineObject({
    collateralToken, primaryToken, isIncrease, sizeDeltaUsd, isLong,
    collateralTokenPoolInfo, usdgSupply: usdg.read('totalSupply'), totalTokenWeight: vault.read('totalTokenWeights'),
    position, inputTokenDescription: primaryDescription, inputTokenWeight, inputTokenDebtUsd, indexTokenDescription: indexDescription, marketPrice
  })))))


  const priceImpactUsd = map(params => {
    if (params.sizeDeltaUsd === 0n) return 0n

    const longInterestUsd = getTokenUsd(params.marketPrice.longTokenPrice.max, params.marketInfo.usage.longInterestInTokens)
    const shortInterestUsd = getTokenUsd(params.marketPrice.longTokenPrice.max, params.marketInfo.usage.shortInterestInTokens)

    return getPriceImpactForPosition(
      params.marketInfo,
      longInterestUsd,
      shortInterestUsd,
      params.sizeDeltaUsd,
      params.isLong,
    )
  }, combineObject({ position, marketInfo, marketPrice, sizeDeltaUsd, isLong }))

  const marginFeeUsd = map(params => {
    return getMarginFee(
      params.marketInfo,
      params.priceImpactUsd > 0n,
      params.sizeDeltaUsd,
    )
  }, combineObject({ marketInfo, sizeDeltaUsd, isLong, priceImpactUsd }))

  const adjustmentFeeUsd = map(params => {
    return params.marginFeeUsd + params.swapFee // + params.priceImpactUsd
    return params.marginFeeUsd + params.swapFee + params.priceImpactUsd
  }, combineObject({ swapFee, marginFeeUsd, priceImpactUsd }))

  const collateralDelta = map(params => {
    return getTokenAmount(params.primaryPrice, params.collateralDeltaUsd)
  }, combineObject({ primaryPrice, collateralDeltaUsd }))

  const sizeDelta = map(params => {
    return getTokenAmount(params.marketPrice.indexTokenPrice.min, params.sizeDeltaUsd)
  }, combineObject({ indexDescription, marketPrice, sizeDeltaUsd }))

  const netPositionValueUsd = zip((params, positionSlot) => {
    if (positionSlot === null) {
      return 0n
    }

    const fees = params.positionFees!.fees
    
    const pendingFundingFeesUsd = getTokenUsd(
      params.collateralPrice.max,
      fees.funding.fundingFeeAmount,
    )


    const latestUpdate = positionSlot.latestUpdate
    const collateralUsd = getTokenUsd(params.collateralPrice.max, latestUpdate.collateralAmount)
    const pnl = getCappedPositionPnlUsd(params.marketPrice, params.marketInfo, latestUpdate.isLong, latestUpdate.sizeInUsd, latestUpdate.sizeInTokens, params.indexPrice)
    const netValue = collateralUsd - fees.borrowing.borrowingFeeUsd - pendingFundingFeesUsd

    return netValue
  }, combineObject({ marketPrice, marketInfo, positionFees, indexPrice, collateralPrice, collateralDescription }), position)

  const focusPrice = replayLatest(multicast(changefocusPrice), null)
  const yAxisCoords = replayLatest(multicast(changeYAxisCoords), null)

  const isFocused = mergeArray([
    constant(false, clickResetPosition),
    replayLatest(multicast(changeIsFocused), false)
  ])

  // [config]
  const tradeConfig: StateStream<ITradeConfig> = {
    focusPrice: switchMap(focus => focus ? focusPrice : now(null), isFocused),
    marketInfo,
    market,
    indexToken,
    focusMode,
    slippage,
    isLong,
    isIncrease,
    primaryToken,
    collateralToken,
    isUsdCollateralToken,
    leverage,
    sizeDelta,
    sizeDeltaUsd,
    collateralDelta,
    collateralDeltaUsd,
  }

  const positionList = map(params => {
    const walletAddress = params.wallet?.account.address
    if (!walletAddress) return []

    const filtered = Object.values(params.processData.mirrorPositionSlot).filter(pos => pos.account === viem.getAddress(walletAddress))
    return filtered
  }, combineObject({ processData: config.processData, wallet }))


  

  const averagePrice = map(params => {
    if (params.position === null) return 0n
    
    const size = params.position.latestUpdate.sizeInUsd + params.sizeDeltaUsd
    const sizeInTokens = params.position.latestUpdate.sizeInTokens + params.sizeDelta
    const avg = (size / sizeInTokens) * getTokenDenominator(params.indexToken)

    return avg
  }, combineObject({ collateralPrice, indexToken, indexPrice, position, sizeDeltaUsd, sizeDelta }))

  const liquidationPrice = skipRepeats(map(params => {

    const positionSizeUsd = params.position ? params.position.latestUpdate.sizeInUsd : 0n
    const positionSizeInTokens = params.position ? params.position.latestUpdate.sizeInTokens : 0n

    const positionCollateral = params.position ? getTokenUsd(params.collateralPrice.max, params.position.latestUpdate.collateralAmount) : 0n
    const positionCollateralInTokens = params.position ? params.position.latestUpdate.collateralAmount : 0n

    const size = positionSizeInTokens + params.sizeDelta
    const sizeUsd = positionSizeUsd + params.sizeDeltaUsd

    const collateral = positionCollateralInTokens + params.collateralDelta
    const collateralUsd = positionCollateral + params.collateralDeltaUsd

    const lp = getLiquidationPrice(params.marketPrice, params.marketInfo, params.isLong, params.collateralToken, params.indexToken, size, sizeUsd, collateral, collateralUsd)
    
    return lp
  }, combineObject({ position, positionFees, sizeDeltaUsd, sizeDelta, isLong, marketPrice, marketInfo, collateralDeltaUsd, collateralDelta, collateralToken, collateralPrice, indexToken })))







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

  const availableIndexLiquidityUsd =  map(params => {
    return getAvailableReservedUsd(params.marketInfo, params.marketPrice, params.isLong)
  }, combineObject({ marketInfo, marketPrice, isLong })) // tradeReader.getAvailableLiquidityUsd(market, collateralToken)

  const borrowRatePerInterval = map(params => {
    return getBorrowingFactorPerInterval(params.marketInfo.fees, params.isLong, params.borrowRateIntervalDisplay)
  }, combineObject({ marketInfo, isLong, borrowRateIntervalDisplay }))

  const fundingRatePerInterval  = map(params => {
    const newLocal = getFundingFactorPerInterval(params.marketPrice, params.marketInfo.usage, params.marketInfo.fees, params.fundingRateIntervalDisplay)
    const newLocal2 = getFundingFactorPerInterval2(params.marketPrice, params.marketInfo.usage, params.marketInfo.fees, params.isLong, params.fundingRateIntervalDisplay)

    return newLocal
  }, combineObject({ marketPrice, marketInfo, isLong, fundingRateIntervalDisplay }))



  const openPositionList: Stream<IPositionMirrorSlot[]> = mergeArray([
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

      return posList //.filter(t => t.key !== pos.key)
    }, position, positionList)
  ])


  const pricefeed = map(params => {
    const feed = getIntervalIdentifier(params.indexToken, params.chartInterval)
    const candleFeed = Object.values(params.processData.pricefeed[feed])

    return candleFeed
  }, combineObject({ chartInterval, indexToken, processData: config.processData }))




  const tradeState: StateStream<ITradeParams> = {
    markets,
    route,

    position,
    netPositionValueUsd,

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
    marginFeeUsd,
    swapFee,
    priceImpactUsd,
    adjustmentFeeUsd,

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
    changeMarket: changeMarketTether(),
    switchIsLong: switchIsLongTether(),
    changeSlippage: changeSlippageTether(),
    switchFocusMode: switchFocusModeTether(),
    // switchFocusMode: 
  })

  const CONTAINER_WIDTH = 1240
  const $tradeMidContainer = $column(layoutSheet.spacing, style({ flex: 1, margin: '0 auto', width: '100%', position: 'relative', maxWidth: `${CONTAINER_WIDTH}px` }))


  return [
    $column(screenUtils.isDesktopScreen ? style({  flex: 1 }) : style({  }))(

      screenUtils.isMobileScreen
        ? $midContainer(style({ padding: '26px 12px 26px' }))(
          $tradebox,
        )
        : empty(),

      $column(
        screenUtils.isDesktopScreen
          ? style({ 
            // paddingLeft: '26px'
          })
          : style({}),
        style({ height: '45vh', minHeight: '460px', position: 'relative', backgroundColor: pallete.background }),
        // screenUtils.isDesktopScreen
        //   ? style({ height: '500px' })
        //   : style({ height: '500px' })
      )(



        $tradeMidContainer(
          screenUtils.isDesktopScreen
            ? style({ pointerEvents: 'none', flexDirection: 'row', marginTop: '12px', zIndex: 20, placeContent: 'space-between', alignItems: 'flex-start' })
            : style({ pointerEvents: 'none', flex: 0, flexDirection: 'row', zIndex: 20, margin: '8px', alignItems: 'flex-start' })
        )(
          $row(layoutSheet.spacingBig, style({ pointerEvents: 'all' }))(
            $column(layoutSheet.spacingSmall)(
              $infoLabel('Borrow Rate'),
              $row(style({ whiteSpace: 'pre' }))(
                switchMap(rate => $text(style({ color: rate ? pallete.negative : '' }))(readableFactorPercentage(-rate)), borrowRatePerInterval),
                $text(style({ color: pallete.foreground }))(' / hr')
              )
            ),
            $column(layoutSheet.spacingSmall)(
              $infoLabel('Funding Rate'),
              $row(style({ whiteSpace: 'pre' }))(
                switchMap(params => {
                  const isPositive = params.isLong
                    ? params.fundingRatePerInterval < 0n
                    : params.fundingRatePerInterval > 0n
                  const color = isPositive ? pallete.positive : pallete.negative
                  const label = isPositive ? '+' : ''
                  return $text(style({ color }))(label + readableFactorPercentage(params.fundingRatePerInterval))
                }, combineObject({ fundingRatePerInterval, isLong })),
                $text(style({ color: pallete.foreground }))(' / hr')
              )
            ),
            $column(layoutSheet.spacingSmall)(
              $infoLabel('Available Liquidity'),
              $text(map(amountUsd => readableFixedUSD30(amountUsd), availableIndexLiquidityUsd))
            )
          ),

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
          

          screenUtils.isDesktopScreen
            ? $column(style({ position: 'absolute', pointerEvents: 'all', zIndex: 20, bottom: '40px', width: '500px', left: '0' }))(
              $tradebox,
            ) : empty(),
        ),

        switchLatest(snapshot((params, feed) => {

          const tf = params.chartInterval
          const fst = feed[feed.length - 1]

          const initialTick = {
            open: formatFixed(fst.o * getDenominator(params.indexDescription.decimals), 30),
            high: formatFixed(fst.h * getDenominator(params.indexDescription.decimals), 30),
            low: formatFixed(fst.l * getDenominator(params.indexDescription.decimals), 30),
            close: formatFixed(fst.c * getDenominator(params.indexDescription.decimals), 30),
            time: fst.blockTimestamp as Time
          }
          const rightOffset = screenUtils.isDesktopScreen ? ((document.body.clientWidth - CONTAINER_WIDTH) / 2) / 14 : 5

          return $CandleSticks({
            $content: $row(
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
                return ev ? readableUnitAmount(ev) : ''
              }, focusPrice))
            ),
            data: feed.map(({ o, h, l, c, blockTimestamp }) => {
              const open = formatFixed(o * getDenominator(params.indexDescription.decimals), 30)
              const high = formatFixed(h * getDenominator(params.indexDescription.decimals), 30)
              const low = formatFixed(l * getDenominator(params.indexDescription.decimals), 30)
              const close = formatFixed(c * getDenominator(params.indexDescription.decimals), 30)

              return { open, high, low, close, time: Number(blockTimestamp) as Time }
            }),
            seriesConfig: {
              priceLineColor: pallete.foreground,
              baseLineStyle: LineStyle.SparseDotted,

              upColor: '#27a69a',
              borderUpColor: '#27a69a',
              wickUpColor: '#27a69a',

              downColor: '#fd534f',
              borderDownColor: '#fd534f',
              wickDownColor: '#fd534f',
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
              const marketPrice = formatFixed(next.indexPrice * getDenominator(params.indexDescription.decimals), GMX.USD_DECIMALS)
              
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
            }, initialTick, combineObject({ indexPrice, indexTokenDescription: indexDescription })),
            containerOp: style({ position: 'absolute', inset: 0, borderRadius: '20px', overflow: 'hidden' }),
            chartConfig: {

              rightPriceScale: {
                borderColor: 'yellow',
                visible: true,
                entireTextOnly: true,
                borderVisible: false,
                scaleMargins: {
                  top: 0.1,
                  bottom: 0.05
                }
              },
              timeScale: {
                timeVisible: true,
                secondsVisible: false,
                borderVisible: false,
                // fixLeftEdge: true,
                // rightOffset: 100,
                rightOffset: rightOffset,
                // fixRightEdge: true,
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

              
        }, combineObject({ chartInterval, indexDescription }), pricefeed)),




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


      $tradeMidContainer(layoutSheet.spacingSmall, style({ padding: screenUtils.isMobileScreen ? '0 12px' : '' }))(
        $node(layoutSheet.spacing, style({ flex: 1, display: 'flex', flexDirection: screenUtils.isDesktopScreen ? 'row' : 'column' }))(

          $column(layoutSheet.spacing, style({ padding: '20px 0', flex: 1, maxWidth: '500px' }))(
            $PositionAdjustmentDetails({
              processData: config.processData,
              chain: config.chain,
              openPositionList,
              pricefeed,
              tradeConfig,
              tradeState,
              wallet,
              $container: $column
            })({
              clickResetPosition: clickResetPositionTether(),
              approvePrimaryToken: changeInputTokenApprovedTether(),
              enableTrading: enableTradingTether(),
              requestTrade: requestTradeTether(),
              leverage: changeLeverageTether(),
            }),

            $PositionListDetails({
              processData: config.processData,
              chain: config.chain,
              openPositionList,
              pricefeed,
              tradeConfig,
              tradeState,
              wallet,
              $container: $column
            })({
              switchPosition: switchPositionTether(),
              changeMarket: changeMarketTether(),
              switchIsLong: switchIsLongTether(),
              switchIsIncrease: switchIsIncreaseTether(),
              changeIsUsdCollateralToken: changeIsUsdCollateralTokenTether(),
            }),
                    
          ),

          $seperator2,

          $PositionDetails({
            chain: config.chain,
            openPositionList,
            pricefeed,
            tradeConfig,
            tradeState,
            wallet,
            $container: $column(style({ padding: '20px 0', flex: 1 }))
          })({
          })
                  
                  
        )

        // switchMap(params => {
        //   return $column(style({ flex: 1 }))(
        //     $IntermediateConnectButton({
        //       $$display: map(w3p => {

        //         return 
        //       })
        //     })({})
        //   ) 
        // }, combineObject({ position })),
      ),
        
    ),

    {
      changeRoute,
    }
  ]
})


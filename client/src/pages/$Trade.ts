import { Behavior, combineArray, combineObject, replayLatest } from "@aelea/core"
import { $node, $text, component, style, styleBehavior } from "@aelea/dom"
import { $column, $icon, $row, layoutSheet, observer, screenUtils } from "@aelea/ui-components"
import {
  IMarket, IMarketInfo, IMarketPrice, IPositionSlot, PositionInfo, StateStream, applyFactor, div, factor, filterNull, formatFixed, getAvailableReservedUsd, getBorrowingFactorPerInterval, getCappedPositionPnlUsd, getDenominator,
  getFundingFactorPerInterval,
  getIntervalIdentifier, getLiquidationPrice, getMappedValue, getMarginFee, getNativeTokenAddress, getNativeTokenDescription,
  getPositionKey, getPriceImpactForPosition, getTokenAmount, getTokenDenominator, getTokenDescription, getTokenUsd, lst, readableFactorPercentage, readableFixedUSD30, readableUnitAmount, resolveAddress, switchMap, unixTimestampNow, zipState
} from "gmx-middleware-utils"

import { colorAlpha, pallete } from "@aelea/ui-components-theme"
import { awaitPromises, constant, debounce, empty, fromPromise, map, mergeArray, multicast, now, scan, skipRepeats, skipRepeatsWith, snapshot, switchLatest, tap, throttle, zip } from "@most/core"
import { Stream } from "@most/types"
import { readContract } from "@wagmi/core"
import { erc20Abi } from "abitype/abis"
import * as GMX from "gmx-middleware-const"
import { $ButtonToggle, $CandleSticks, $infoLabel, $infoLabeledValue, $target } from "gmx-middleware-ui-components"
import { CandlestickData, Coordinate, LineStyle, LogicalRange, MouseEventParams, Time } from "lightweight-charts"
import * as PUPPET from "puppet-middleware-const"
import { IPositionMirrorSlot, getRouteKey, getRouteTypeKey } from "puppet-middleware-utils"
import * as viem from "viem"
import { $midContainer } from "../common/$common.js"
import { $caretDown } from "../common/elements/$icons.js"
import { $ButtonSecondary } from "../components/form/$Button.js"
import { $Dropdown } from "../components/form/$Dropdown.js"
import { $PositionAdjustmentDetails } from "../components/trade/$PositionAdjustmentDetails"
import { $PositionDetails } from "../components/trade/$PositionDetails.js"
import { $PositionEditor, IPositionEditorAbstractParams, ITradeConfig, ITradeFocusMode, ITradeParams } from "../components/trade/$PositionEditor.js"
import { $PositionListDetails, IRequestTrade } from "../components/trade/$PositionListDetails.js"
import { getEventdata, latestTokenPrice } from "../data/process/process.js"
import { rootStoreScope } from "../data/store/store.js"
import { combineState, connectContract, contractReader, listenContract } from "../logic/common.js"
import * as trade from "../logic/trade.js"
import { exchangesWebsocketPriceSource } from "../logic/trade.js"
import { getExecuteGasFee, getExecutionFee, getFullMarketInfo } from "../logic/tradeV2.js"
import * as indexDB from "../utils/storage/indexDB.js"
import * as storage from "../utils/storage/storeScope.js"
import { walletLink } from "../wallet/index.js"
import { estimatedGasPrice, gasPrice, wallet } from "../wallet/walletLink.js"
import { $seperator2 } from "./common.js"
import * as wagmi from "@wagmi/core"




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

  [changeSlippage, changeSlippageTether]: Behavior<bigint>,
  [changeExecutionFeeBuffer, changeExecutionFeeBufferTether]: Behavior<bigint>,

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

  [clickResetPosition, clickResetPositionTether]: Behavior<IPositionSlot | null>,

) => {

  const marketList = map(data => Object.values(data.marketMap), config.processData)
  const processData = config.processData

  const chainId = config.chain.id
  const gmxContractMap = GMX.CONTRACT[config.chain.id]
  const puppetContractMap = PUPPET.CONTRACT[config.chain.id]


  // const vaultReader = contractReader(vaultConfig)
  
  const vault = connectContract(gmxContractMap.Vault)
  const usdg = connectContract(gmxContractMap.USDG)

  const v2Reader = contractReader(gmxContractMap.ReaderV2)
  const orchestratorReader = contractReader(puppetContractMap.OrchestratorReader) 
  const datastoreReader = contractReader(gmxContractMap.Datastore) 
  const referralStorage = connectContract(gmxContractMap.ReferralStorage)
  const positionRouter = connectContract(gmxContractMap.PositionRouter)
  const orchestrator = connectContract(puppetContractMap.Orchestrator)
  const router = connectContract(GMX.CONTRACT[config.chain.id].Router)
  const client = wagmi.getPublicClient()
  // client.watchContractEvent({
  //   eventName: 'EventLog2',
  //   strict: true,
  //   abi: gmxContractMap.EventEmitter.abi,
  //   address: gmxContractMap.EventEmitter.address,
  //   args: { eventNameHash: GMX.OrderEvent.OrderCancelled },
  //   onLogs: (logs) => {
  //     console.log(logs)
  //   },
  // })

  const orderCancelled = listenContract({
    abi: gmxContractMap.EventEmitter.abi,
    address: gmxContractMap.EventEmitter.address
  })('EventLog2', { eventNameHash: GMX.OrderEvent.OrderCancelled })

  const tradingStore = storage.createStoreScope(rootStoreScope, 'tradeBox' as const)


  const chartInterval = storage.replayWrite(tradingStore, GMX.TIME_INTERVAL_MAP.MIN15, selectTimeFrame, 'chartInterval')
  const isTradingEnabled = storage.replayWrite(tradingStore, false, enableTrading, 'isTradingEnabled')
  const isLong = storage.replayWrite(tradingStore, true, switchIsLong, 'isLong')
  const focusMode = replayLatest(switchFocusMode, ITradeFocusMode.collateral) // storage.replayWrite(tradingStore, ITradeFocusMode.collateral, switchFocusMode, 'focusMode')
  const slippage = storage.replayWrite(tradingStore, 30n, changeSlippage, 'slippage')
  const executionFeeBuffer = storage.replayWrite(tradingStore, 3000n, changeExecutionFeeBuffer, 'executionFeeBuffer')
  const primaryToken = storage.replayWrite(tradingStore, GMX.ADDRESS_ZERO, changePrimaryToken, 'inputToken')
  const isUsdCollateralToken = storage.replayWrite(tradingStore, true, changeIsUsdCollateralToken, 'shortCollateralToken')
  const borrowRateIntervalDisplay = storage.replayWrite(tradingStore, GMX.TIME_INTERVAL_MAP.MIN60, changeBorrowRateIntervalDisplay, 'borrowRateIntervalDisplay')
  const fundingRateIntervalDisplay = storage.replayWrite(tradingStore, GMX.TIME_INTERVAL_MAP.MIN60, changeFundingRateIntervalDisplay, 'fundingRateIntervalDisplay')

  const isIncrease = mergeArray([
    constant(true, clickResetPosition),
    replayLatest(switchIsIncrease, true),
  ])

  
  // storage.replayWrite(tradingStore, GMX.ADDRESS_ZERO, changeInputToken, 'inputToken')

  const market = replayLatest(multicast(mergeArray([
    map(params => {
      const stored = params.stored
      if (stored === undefined) {
        return params.marketList[1]
      }

      return params.marketList.find(m => m.marketToken === stored.marketToken) || params.marketList[0]
    }, combineObject({ stored: indexDB.get(tradingStore, 'market') as Stream<IMarket | undefined>, marketList })),
    // snapshot((params, posSlot) => {
    //   const update = lst(posSlot.updates)
    //   const market = params.markets.find(m => m.marketToken === update.market)
    //   if (!market) throw new Error(`Market not found for ${update.market}`)

    //   return market
    // }, combineObject({ markets }), switchPosition),
    storage.write(tradingStore, changeMarket, 'market'),
  ])))

  const collateralDeltaUsd = replayLatest(changeCollateralDeltaUsd, 0n)
  const sizeDeltaUsd = replayLatest(changeSizeDeltaUsd, 0n)


  const collateralToken: Stream<viem.Address> = map(params => {
    return params.isUsdCollateralToken ? params.market.shortToken : params.market.longToken
  }, combineObject({ market, isUsdCollateralToken }))


  const walletBalance = replayLatest(multicast(switchMap(params => {
    if (!params.wallet) {
      return now(0n)
    }

    return trade.getWalletErc20Balance(config.chain, params.primaryToken, params.wallet.account.address)
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
    latestPriceSocketSource,
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

  const routeTypeKey = replayLatest(multicast(map(params => {
    // abi.encode(_longToken, _shortToken, _weth, _weth, true, _marketType)

    const getRouteTypeKeyArgs = [
      params.collateralToken, params.indexToken, params.isLong,
      '0x00000000000000000000000082af49447d8a07e3bd95bd0d56f35241523fbab1000000000000000000000000af88d065e77c8cc2239327c5edb3a432268e583100000000000000000000000082af49447d8a07e3bd95bd0d56f35241523fbab100000000000000000000000082af49447d8a07e3bd95bd0d56f35241523fbab100000000000000000000000000000000000000000000000000000000000000014bd5869a01440a9ac6d7bf7aa7004f402b52b845f20e2cec925101e13d84d075'
    ] as const

    const key = getRouteTypeKey(...getRouteTypeKeyArgs)
    return key
  }, combineObject({ collateralToken, indexToken, isLong }))))

  const marketInfo: Stream<IMarketInfo> = replayLatest(multicast(switchMap(params => {
    const query = getFullMarketInfo(config.chain, params.market, params.marketPrice)
    return map(res => {

      return { ...res, market: params.market, price: params.marketPrice }
    }, query)
  }, combineObject({ market, marketPrice }))))

  // const route = map(params => {
  //   const w3p = params.wallet
  //   if (w3p === null) {
  //     return GMX.ADDRESS_ZERO
  //   }

  //   return w3p.account.address
  // }, combineObject({ wallet }))

  // const value = viem.decodeErrorResult({
  //   abi: gmxContractMap.CustomError.abi,
  //   data: '0xe09ad0e90000000000000000000000000000000000000000000000000006bbb25d552d780000000000000000000000000000000000000000000000000006b9f80e1be100'
  // })


  const route = replayLatest(multicast(switchMap(params => {
    const w3p = params.wallet
    if (w3p === null) {
      return now(GMX.ADDRESS_ZERO)
    }

    const routeKey = getRouteKey(w3p.account.address, params.routeTypeKey)
    const storedRouteKey = storage.get(tradingStore, GMX.ADDRESS_ZERO as viem.Address, routeKey)
    const fallbackGetRoute = switchMap(address => {
      const routeAddressArgs = [w3p.account.address, params.collateralToken, params.indexToken, params.isLong, '0x00000000000000000000000082af49447d8a07e3bd95bd0d56f35241523fbab1000000000000000000000000af88d065e77c8cc2239327c5edb3a432268e583100000000000000000000000082af49447d8a07e3bd95bd0d56f35241523fbab100000000000000000000000082af49447d8a07e3bd95bd0d56f35241523fbab100000000000000000000000000000000000000000000000000000000000000014bd5869a01440a9ac6d7bf7aa7004f402b52b845f20e2cec925101e13d84d075'] as const

      if (address === GMX.ADDRESS_ZERO) {
        return switchMap(res => {
          return address === GMX.ADDRESS_ZERO ? now(res) : indexDB.set(tradingStore, res, routeKey)
        }, orchestratorReader('routeAddress', ...routeAddressArgs))
        // }, orchestratorReader('routeAddress', routeKey))
      }

      return now(address)
    }, storedRouteKey)

    return fallbackGetRoute
  }, combineObject({ wallet, collateralToken, indexToken, isLong, routeTypeKey }))))



  const positionKeyArgs = map(params => {
    const address = params.route || GMX.ADDRESS_ZERO
    const key = getPositionKey(address, params.market.marketToken, params.collateralToken, params.isLong)

    return { ...params, key, account: address }
  }, combineObject({ route, market, collateralToken, isLong, isUsdCollateralToken }))

  // const positionKeyArgs = skipRepeatsWith((prev, next) => prev.key === next.key, _positionKeyArgs)

  const position: Stream<IPositionMirrorSlot | null> = replayLatest(multicast(mergeArray([
    map((params) => {
      const existingSlot = params.processData.mirrorPositionSlot[params.positionKeyArgs.key]
      console.log(existingSlot)

      if (!existingSlot) {
        return null
      }

      return existingSlot
    }, combineObject({ processData: config.processData, positionKeyArgs })),
    switchPosition,
    clickResetPosition
  ])))


  const positionFees: Stream<PositionInfo | null> = multicast(replayLatest(switchMap(params => {
    if (params.position === null) {
      return now(null)
    }

    const positionFeeInfo = v2Reader(
      'getPositionInfo', gmxContractMap.Datastore.address, gmxContractMap.ReferralStorage.address,
      params.position.key, params.marketPrice, params.position.maxSizeUsd, GMX.ADDRESS_ZERO, false
    )

    return positionFeeInfo
  }, zipState({ position, marketPrice }))))

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



  // const collateralTokenPoolInfo = replayLatest(multicast(tradeReader.getTokenPoolInfo(collateralToken)))




  // const swapFee = replayLatest(multicast(skipRepeats(map((params) => {
  //   const inputAndIndexStable = params.primaryDescription.isUsd && params.indexDescription.isUsd
  //   const swapFeeBasisPoints = inputAndIndexStable ? GMX.STABLE_SWAP_FEE_BASIS_POINTS : GMX.SWAP_FEE_BASIS_POINTS
  //   const taxBasisPoints = inputAndIndexStable ? GMX.STABLE_TAX_BASIS_POINTS : GMX.TAX_BASIS_POINTS

  //   return 0n
  //   // const rsolvedInputAddress = resolveAddress(config.chain, params.primaryToken)
  //   // if (rsolvedInputAddress === params.collateralToken) {
  //   //   return 0n
  //   // }


  //   // let amountUsd = abs(params.collateralDeltaUsd)

  //   // if (params.position && !params.isIncrease) {
  //   //   const pnl = getPnL(params.isLong, params.position.averagePrice, params.marketPrice.indexTokenPrice.min, params.position.latestUpdate.sizeInUsd)
  //   //   const adjustedDelta = getAdjustedDelta(params.position.latestUpdate.sizeInUsd, abs(params.sizeDeltaUsd), pnl)

  //   //   if (adjustedDelta > 0n) {
  //   //     amountUsd = amountUsd + adjustedDelta
  //   //   }
  //   // }


  //   // const usdgAmount = amountUsd * getDenominator(params.inputTokenDescription.decimals) / GMX.PRECISION

  //   // const feeBps0 = getFeeBasisPoints(
  //   //   params.inputTokenDebtUsd,
  //   //   params.inputTokenWeight,
  //   //   usdgAmount,
  //   //   swapFeeBasisPoints,
  //   //   taxBasisPoints,
  //   //   true,
  //   //   params.usdgSupply,
  //   //   params.totalTokenWeight
  //   // )
  //   // const feeBps1 = getFeeBasisPoints(
  //   //   params.collateralTokenPoolInfo.usdgAmounts,
  //   //   params.collateralTokenPoolInfo.tokenWeights,
  //   //   usdgAmount,
  //   //   swapFeeBasisPoints,
  //   //   taxBasisPoints,
  //   //   false,
  //   //   params.usdgSupply,
  //   //   params.totalTokenWeight
  //   // )

  //   // const feeBps = feeBps0 > feeBps1 ? feeBps0 : feeBps1
  //   // const addedSwapFee = feeBps ? amountUsd * feeBps / GMX.PRECISION : 0n

  //   // return addedSwapFee
  // }, combineObject({
  //   usdgSupply: usdg.read('totalSupply'), totalTokenWeight: vault.read('totalTokenWeights'),
  //   collateralToken, primaryToken, isIncrease, sizeDeltaUsd, isLong, collateralTokenPoolInfo,
  //   position, primaryDescription, inputTokenWeight, inputTokenDebtUsd, indexDescription, marketPrice
  // })))))


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
    const newLocal = getMarginFee(
      params.marketInfo,
      params.priceImpactUsd > 0n,
      params.sizeDeltaUsd
    )

    return newLocal
  }, combineObject({ marketInfo, sizeDeltaUsd, isLong, priceImpactUsd }))

  const adjustmentFeeUsd = map(params => {
    return params.marginFeeUsd // + params.priceImpactUsd
    // return params.marginFeeUsd + params.swapFee + params.priceImpactUsd
  }, combineObject({ marginFeeUsd, priceImpactUsd }))

  const collateralDelta = map(params => {
    return getTokenAmount(params.primaryPrice, params.collateralDeltaUsd)
  }, combineObject({ primaryPrice, collateralDeltaUsd }))

  const sizeDelta = map(params => {
    return getTokenAmount(params.marketPrice.indexTokenPrice.min, params.sizeDeltaUsd)
  }, combineObject({ indexDescription, marketPrice, sizeDeltaUsd }))

  const netPositionValueUsd = replayLatest(multicast(zip((params, positionParams) => {
    if (positionParams.position === null) {
      return 0n
    }

    const fees = positionParams.positionFees!.fees
    
    const pendingFundingFeesUsd = getTokenUsd(
      params.collateralPrice.max,
      fees.funding.fundingFeeAmount,
    )


    const latestUpdate = lst(positionParams.position.updates)
    const collateralUsd = getTokenUsd(params.collateralPrice.max, latestUpdate.collateralAmount)
    const netValue = collateralUsd - fees.borrowing.borrowingFeeUsd - pendingFundingFeesUsd

    // const pnl = getCappedPositionPnlUsd(params.marketPrice, params.marketInfo, latestUpdate.isLong, latestUpdate.sizeInUsd, latestUpdate.sizeInTokens, params.indexPrice)

    console.log(netValue)
    return netValue
  }, combineObject({ marketPrice, marketInfo, indexPrice, collateralPrice, collateralDescription }), zipState({ position, positionFees }))))

  const focusPrice = replayLatest(multicast(changefocusPrice), null)
  const yAxisCoords = replayLatest(multicast(changeYAxisCoords), null)

  const isFocused = mergeArray([
    // constant(false, clickResetPosition),
    replayLatest(multicast(changeIsFocused), false)
  ])

  const leverage = replayLatest(multicast(mergeArray([
    changeLeverage,
    storage.replayWrite(tradingStore, GMX.MAX_LEVERAGE_FACTOR / 4n, debounce(50, changeLeverage), 'leverage'),
    filterNull(snapshot((netPosValue, posSlot) => {
      if (posSlot === null) return null
      return div(lst(posSlot.updates).sizeInUsd, netPosValue)
    }, netPositionValueUsd, mergeArray([position, clickResetPosition])))
  ])))

  // [config]
  const tradeConfig: StateStream<ITradeConfig> = {
    focusPrice: switchMap(focus => focus ? focusPrice : now(null), isFocused),
    marketInfo,
    market,
    indexToken,
    focusMode,
    slippage,
    executionFeeBuffer,
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
    if (!params.route) return []

    const filtered = Object.values(params.processData.mirrorPositionSlot).filter(pos => pos.account === viem.getAddress(params.route))
    return filtered
  }, combineObject({ processData: config.processData, route }))


  const averagePrice = map(params => {
    if (params.position === null) return 0n
    
    const update = lst(params.position.updates)
    const size = update.sizeInUsd + params.sizeDeltaUsd
    const sizeInTokens = update.sizeInTokens + params.sizeDelta
    const avg = (size / sizeInTokens) * getTokenDenominator(params.indexToken)

    return avg
  }, combineObject({ collateralPrice, indexToken, indexPrice, position, sizeDeltaUsd, sizeDelta }))

  const liquidationPrice = multicast(map(params => {
    const update = params.position ? lst(params.position.updates) : null

    const positionSizeUsd = update?.sizeInUsd || 0n
    const positionSizeInTokens = update?.sizeInTokens || 0n

    const positionCollateral = update ? getTokenUsd(params.collateralPrice.max, update.collateralAmount) : 0n
    const positionCollateralInTokens = update ? update.collateralAmount : 0n

    const size = positionSizeInTokens + params.sizeDelta
    const sizeUsd = positionSizeUsd + params.sizeDeltaUsd

    const collateral = positionCollateralInTokens + params.collateralDelta
    const collateralUsd = positionCollateral + params.collateralDeltaUsd

    const lp = getLiquidationPrice(params.marketPrice, params.marketInfo, params.isLong, params.collateralToken, params.indexToken, size, sizeUsd, collateral, collateralUsd)
    
    return lp
  }, combineObject({ position, positionFees, sizeDeltaUsd, sizeDelta, isLong, marketPrice, marketInfo, collateralDeltaUsd, collateralDelta, collateralToken, collateralPrice, indexToken, chartInterval })))



  const isPrimaryApproved = mergeArray([
    changeInputTokenApproved,
    skipRepeats(awaitPromises(snapshot(async (collateralDeltaUsd, params) => {
      if (!params.wallet) {
        console.warn(new Error('No wallet connected'))
        return false
      }


      if (params.primaryToken === GMX.ADDRESS_ZERO || !params.isIncrease) {
        return true
      }

      const contractAddress = getMappedValue(GMX.TRADE_CONTRACT_MAPPING, chainId).Router

      if (params.route === null || contractAddress === null || !params.wallet) {
        return false
      }

      try {
        const allowedSpendAmount = await readContract({
          address: params.primaryToken,
          abi: erc20Abi,
          functionName: 'allowance',
          args: [params.wallet.account.address, PUPPET.CONTRACT[config.chain.id].Orchestrator.address]
        })

        return allowedSpendAmount > collateralDeltaUsd
      } catch (err) {
        console.warn(err)
        return false
      }

    }, collateralDeltaUsd, combineObject({ wallet, primaryToken, isIncrease, route }))))
  ])

  const availableIndexLiquidityUsd =  map(params => {
    return getAvailableReservedUsd(params.marketInfo, params.marketPrice, params.isLong)
  }, combineObject({ marketInfo, marketPrice, isLong })) // tradeReader.getAvailableLiquidityUsd(market, collateralToken)

  const borrowRatePerInterval = map(params => {
    return getBorrowingFactorPerInterval(params.marketInfo.fees, params.isLong, params.borrowRateIntervalDisplay)
  }, combineObject({ marketInfo, isLong, borrowRateIntervalDisplay }))

  const fundingRatePerInterval  = map(params => {
    const value = getFundingFactorPerInterval(params.marketPrice, params.marketInfo.usage, params.marketInfo.fees, params.fundingRateIntervalDisplay)

    return value
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


  const pricefeed = replayLatest(multicast(map(params => {
    const feed = getIntervalIdentifier(params.indexToken, params.chartInterval)
    const candleFeed = Object.values(params.processData.pricefeed[feed])

    return candleFeed
  }, combineObject({ chartInterval, indexToken, processData: config.processData }))))

  const executeGasLimit = fromPromise(getExecuteGasFee(config.chain))

  const executionFee = replayLatest(multicast(map(params => {
    const estGasLimit = params.isIncrease ? params.executeGasLimit.increaseGasLimit : params.executeGasLimit.decreaseGasLimit

    const adjustedGasLimit = params.executeGasLimit.estimatedFeeBaseGasLimit + applyFactor(estGasLimit, params.executeGasLimit.estimatedFeeMultiplierFactor)
    const feeTokenAmount = adjustedGasLimit * params.estimatedGasPrice.maxFeePerGas!

    return feeTokenAmount
    
    // return getExecutionFee(params.executeGasLimit.estimatedFeeBaseGasLimit, params.executeGasLimit.estimatedFeeMultiplierFactor, estGasLimit, params.gasPrice)
  }, combineObject({ executeGasLimit, isIncrease, estimatedGasPrice, gasPrice }))))




  const tradeState: StateStream<ITradeParams> = {
    marketList,
    route,
    routeTypeKey,

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
    marginFeeUsd,
    // swapFee,
    priceImpactUsd,
    adjustmentFeeUsd,

    primaryDescription,
    indexDescription,
    collateralDescription,

    averagePrice,
    liquidationPrice,

    stableFundingRateFactor,
    fundingRateFactor,
    // collateralTokenPoolInfo,
  }

  const $tradebox = $PositionEditor({
    ...config,
    openPositionList,
    tradeConfig,
    tradeState,
    resetAdjustments: clickResetPosition, 
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
    changeExecutionFeeBuffer: changeExecutionFeeBufferTether(),
    switchFocusMode: switchFocusModeTether(),
    // switchFocusMode: 
  })

  const CONTAINER_WIDTH = 1240
  const $tradeMidContainer = $column(layoutSheet.spacing, style({ flex: 1, margin: '0 auto', width: '100%', position: 'relative', maxWidth: `${CONTAINER_WIDTH}px` }))


  return [
    $column(screenUtils.isDesktopScreen ? style({  flex: 1 }) : style({  }))(


      // filterNull(
      //   map(logs => {
      //     const entity = getEventdata(logs)
      //     console.log(logs, logs.args.eventName)
      //     console.log(entity)

      //     return null
      //   }, orderCancelled)
      // ) as any,

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
                  top: 0.15,
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
              // leverage: changeLeverageTether(),
              // isIncrease: switchIsIncreaseTether(),
              // collateralDeltaUsd: changeCollateralDeltaUsdTether(),
              // collateralSizeUsd: changeSizeDeltaUsdTether(),
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
              changeLeverage: changeLeverageTether(),
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


import { Behavior, combineObject, replayLatest } from "@aelea/core"
import { $node, $text, component, style, styleBehavior } from "@aelea/dom"
import { $column, $icon, $row, layoutSheet, observer, screenUtils } from "@aelea/ui-components"
import { colorAlpha, pallete } from "@aelea/ui-components-theme"
import { awaitPromises, constant, debounce, empty, fromPromise, map, mergeArray, multicast, now, scan, skipRepeats, snapshot, switchLatest } from "@most/core"
import { Stream } from "@most/types"
import * as wagmi from "@wagmi/core"
import { erc20Abi } from "abitype/abis"
import * as GMX from "gmx-middleware-const"
import { USD_DECIMALS } from "gmx-middleware-const"
import { $ButtonToggle, $CandleSticks, $infoLabel, $infoLabeledValue, $target, intermediateMessage } from "gmx-middleware-ui-components"
import {
  IMarketInfo, IMarketPrice,
  StateStream,
  TEMP_MARKET_LIST, TEMP_MARKET_TOKEN_MARKET_MAP, applyFactor, div,
  filterNull, formatFixed, getAvailableReservedUsd, getBorrowingFactorPerInterval,
  getFundingFactorPerInterval,
  getLiquidationPrice, getMappedValue, getMarginFee,
  getNativeTokenDescription,
  getPositionKey, getPriceImpactForPosition, getTokenAmount, getTokenDenominator, getTokenDescription, getTokenUsd,
  readableAccountingAmount,
  readableFactorPercentage, readableFixedUSD30, readableTokenPrice,
  resolveAddress, switchMap, unixTimestampNow, zipState
} from "gmx-middleware-utils"
import { CandlestickData, Coordinate, LineStyle, LogicalRange, MouseEventParams, Time } from "lightweight-charts"
import * as PUPPET from "puppet-middleware-const"
import { IMirrorPositionOpen, getLastAdjustment, latestPriceMap, queryLatestTokenPriceFeed, queryTraderPositionOpen } from "puppet-middleware-utils"
import * as viem from "viem"
import { $midContainer } from "../common/$common.js"
import { $responsiveFlex } from "../common/elements/$common"
import { $caretDown } from "../common/elements/$icons.js"
import { $ButtonSecondary } from "../components/form/$Button.js"
import { $Dropdown } from "../components/form/$Dropdown.js"
import { $PositionAdjustmentDetails } from "../components/trade/$PositionAdjustmentDetails"
import { $PositionDetails } from "../components/trade/$PositionDetails.js"
import { $PositionEditor, IPositionEditorAbstractParams, ITradeConfig, ITradeParams } from "../components/trade/$PositionEditor.js"
import { $PositionListDetails, IRequestTrade } from "../components/trade/$PositionListDetails.js"
import { store } from "../data/store/store.js"
import { ITradeFocusMode } from "../data/type"
import { contractReader, listenContract } from "../logic/common.js"
import { getExecuteGasFee, getFullMarketInfo } from "../logic/tradeV2.js"
import * as trade from "../logic/traderLogic.js"
import { exchangesWebsocketPriceSource, getTraderTradeRoute } from "../logic/traderLogic.js"
import * as storage from "../utils/storage/storeScope.js"
import { estimatedGasPrice, gasPrice, wallet } from "../wallet/walletLink.js"
import { $seperator2 } from "./common.js"



export type ITradeComponent = IPositionEditorAbstractParams


const TIME_INTERVAL_LABEL_MAP = {
  [GMX.IntervalTime.SEC]: '1s',
  [GMX.IntervalTime.MIN]: '1m',
  [GMX.IntervalTime.MIN5]: '5m',
  [GMX.IntervalTime.MIN15]: '15m',
  [GMX.IntervalTime.MIN30]: '30m',
  [GMX.IntervalTime.MIN60]: '1h',
  [GMX.IntervalTime.HR2]: '2h',
  [GMX.IntervalTime.HR4]: '4h',
  [GMX.IntervalTime.HR6]: '6h',
  [GMX.IntervalTime.HR8]: '8h',
  [GMX.IntervalTime.HR24]: '1d',
  [GMX.IntervalTime.DAY7]: '1w',
  [GMX.IntervalTime.MONTH]: '1mo',
  [GMX.IntervalTime.MONTH2]: '2mo',
  [GMX.IntervalTime.YEAR]: '2yr',
} as const


export const $Trade = (config: ITradeComponent) => component((
  [selectTimeFrame, selectTimeFrameTether]: Behavior<GMX.IntervalTime>,
  [changeRoute, changeRouteTether]: Behavior<string>,

  [changePrimaryToken, changePrimaryTokenTether]: Behavior<viem.Address>,

  [changeMarketToken, changeMarketTokenTether]: Behavior<viem.Address>,
  [changeIsUsdCollateralToken, changeIsUsdCollateralTokenTether]: Behavior<boolean>,
  [switchFocusMode, switchFocusModeTether]: Behavior<ITradeFocusMode>,
  [switchIsLong, switchIsLongTether]: Behavior<boolean>,
  [switchIsIncrease, switchIsIncreaseTether]: Behavior<boolean>,
  [changeTradeRoute, changeTradeRouteTether]: Behavior<viem.Address | null>,

  [changeCollateralDeltaUsd, changeCollateralDeltaUsdTether]: Behavior<bigint>,
  [changeSizeDeltaUsd, changeSizeDeltaUsdTether]: Behavior<bigint>,

  // [requestAccountTradeList, requestAccountTradeListTether]: Behavior<IAccountTradeListParamApi, IAccountTradeListParamApi>,
  [changeLeverage, changeLeverageTether]: Behavior<bigint>,

  [changeSlippage, changeSlippageTether]: Behavior<bigint>,
  [changeExecutionFeeBuffer, changeExecutionFeeBufferTether]: Behavior<bigint>,

  [changeInputTokenApproved, changeInputTokenApprovedTether]: Behavior<boolean>,

  [enableTrading, enableTradingTether]: Behavior<boolean>,

  [switchPosition, switchPositionTether]: Behavior<IMirrorPositionOpen>,
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

  [clickResetPositionQuery, clickResetPositionTether]: Behavior<IMirrorPositionOpen | null>,

) => {

  const { routeTypeListQuery } = config
  
  const marketList = now(TEMP_MARKET_LIST)
  const chainId = config.chain.id
  const gmxContractMap = GMX.CONTRACT[config.chain.id]
  const puppetContractMap = PUPPET.CONTRACT[config.chain.id]

  const v2Reader = contractReader(gmxContractMap.ReaderV2)
  const datastoreReader = contractReader(puppetContractMap.Datastore) 

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
  const focusMode = replayLatest(switchFocusMode, ITradeFocusMode.collateral)

  const chartInterval = storage.replayWrite(store.tradeBox, selectTimeFrame, 'chartInterval')
  const isTradingEnabled = storage.replayWrite(store.tradeBox, enableTrading, 'isTradingEnabled')
  const isLong = storage.replayWrite(store.tradeBox, switchIsLong, 'isLong')
  const slippage = storage.replayWrite(store.tradeBox, changeSlippage, 'slippage')
  const executionFeeBuffer = storage.replayWrite(store.tradeBox, changeExecutionFeeBuffer, 'executionFeeBuffer')
  const primaryToken = storage.replayWrite(store.tradeBox, changePrimaryToken, 'primaryToken')
  const isUsdCollateralToken = storage.replayWrite(store.tradeBox, changeIsUsdCollateralToken, 'isUsdCollateralToken')
  const feeDisplayRate = storage.replayWrite(store.tradeBox, changeFundingRateIntervalDisplay, 'feeRateIntervalDisplay')
  const marketToken: Stream<viem.Address> = storage.replayWrite(store.tradeBox, changeMarketToken, 'marketToken')

  const isIncrease = mergeArray([
    constant(true, clickResetPositionQuery),
    replayLatest(switchIsIncrease, true),
  ])


  const market = map(token => getMappedValue(TEMP_MARKET_TOKEN_MARKET_MAP, token), marketToken)

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

  
  const collateralPrice = map(params => {
    const token = params.latestPriceMap[params.collateralToken].min

    return token
  },  combineObject({ collateralToken, latestPriceMap }))


  const marketPrice: Stream<IMarketPrice> = map(params => {
    const indexTokenPrice = params.latestPriceMap[params.market.indexToken]
    const longTokenPrice = params.latestPriceMap[params.market.longToken]
    const shortTokenPrice = params.latestPriceMap[params.market.shortToken]

    return { indexTokenPrice, longTokenPrice, shortTokenPrice }
  }, zipState({ market, latestPriceMap }))


  const indexToken = map(params => {
    return params.market.indexToken
  }, combineObject({ market }))

  const latestPriceSocketSource = multicast(switchMap(token => {
    return observer.duringWindowActivity(exchangesWebsocketPriceSource(token))
  }, indexToken))

  const indexPrice = mergeArray([
    latestPriceSocketSource,
    map(params => {
      return params.latestPriceMap[params.indexToken].min
    }, combineObject({ latestPriceMap, indexToken }))
  ])

  const primaryPrice = map(params => {
    const token = resolveAddress(config.chain, params.primaryToken)
    return params.latestPriceMap[token].min
  }, combineObject({ latestPriceMap, primaryToken }))

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

  const routeTypeKey = replayLatest(multicast(awaitPromises(map(async params => {
    const getRouteTypeKeyArgs = (await params.routeTypeListQuery).find(srt =>
      srt.collateralToken === params.collateralToken && srt.indexToken === params.indexToken && srt.isLong === params.isLong
    )
    if (!getRouteTypeKeyArgs) {
      throw new Error(`Route type not found for ${params.collateralToken} ${params.indexToken} ${params.isLong}`)
    }
    
    return getRouteTypeKeyArgs.routeTypeKey
  }, combineObject({ collateralToken, indexToken, isLong, routeTypeListQuery })))))

  const marketInfoQuery = map(params => {
    return getFullMarketInfo(config.chain, params.market, params.marketPrice)
  }, combineObject({ market, marketPrice }))

  const marketInfo: Stream<IMarketInfo> = replayLatest(multicast(awaitPromises(marketInfoQuery)))

  const tradeRoute: Stream<viem.Address | null> = switchMap(params => {
    const w3p = params.wallet
    if (w3p === null) {
      return now(null)
    }

    return getTraderTradeRoute(w3p.account.address, params.collateralToken, params.indexToken, params.isLong, config.chain)
  }, combineObject({ collateralToken, wallet, indexToken, isLong }))


  const openPositionListQuery = multicast(replayLatest(switchMap(w3p => {
    if (w3p === null) {
      return now(Promise.resolve([] as IMirrorPositionOpen[]))
    }

    return queryTraderPositionOpen({ address: w3p.account.address })
  }, wallet)))



  const mirrorPosition: Stream<IMirrorPositionOpen | null> = replayLatest(multicast(mergeArray([
    awaitPromises(switchLatest(map(query => {
      return map(async params => {
        if (params.tradeRoute === null) {
          return null
        }

        const address = params.tradeRoute
        const key = getPositionKey(address, params.market.marketToken, params.collateralToken, params.isLong)
        const mp = (await query).find(slot => slot.position.key === key)

        if (!mp) {
          return null
        }

        return mp
      }, combineObject({ tradeRoute, market, collateralToken, isLong, isUsdCollateralToken }))
    }, openPositionListQuery))),
    switchPosition,
    // clickResetPosition
  ])))
  // const mirrorPositionQuery: Stream<Promise<IMirrorPositionOpen | null>> = replayLatest(multicast(mergeArray([
  //   map(async params => {
  //     const posKeyParams = params.positionKeyParams
  //     if (posKeyParams === null) {
  //       return null
  //     }

  //     const existingSlot = (await params.openPositionListQuery).find(slot => slot.position.key === posKeyParams.key)

  //     if (!existingSlot) {
  //       return null
  //     }

  //     return existingSlot
  //   }, combineObject({ openPositionListQuery, positionKeyParams })),
  //   switchPosition,
  //   // clickResetPosition
  // ])))

  // const positionInfoQuery: Stream<Promise<{ info: IPositionInfo | null, mp: IMirrorPositionOpen } | null>> = multicast(replayLatest(map(async params => {
  //   if (params.positionKeyParams === null) {
  //     return null
  //   }

  //   try {
  //     const info = wagmi.readContract({
  //       ...gmxContractMap.ReaderV2,
  //       functionName: 'getPositionInfo',
  //       args: [
  //         gmxContractMap.Datastore.address,
  //         gmxContractMap.ReferralStorage.address,
  //         params.positionKeyParams.key,
  //         params.marketPrice,
  //         0n,
  //         GMX.ADDRESS_ZERO,
  //         false
  //       ]
  //     })
  //     return info
  //   } catch (err) {
  //     console.error(err)
  //     return null
  //   }
  // }, zipState({ positionKeyParams, marketPrice, mirrorPositionQuery }))))





  const primaryDescription = map((token) => {
    if (token === GMX.ADDRESS_ZERO) {
      return getNativeTokenDescription(config.chain)
    }

    return getTokenDescription(token)
  }, primaryToken)

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

    return getPriceImpactForPosition(
      params.marketInfo,
      params.sizeDeltaUsd,
      params.isLong,
    )
  }, combineObject({ marketInfo, sizeDeltaUsd, isLong }))

  const marginFeeUsd = map(params => {
    return getMarginFee(
      params.marketInfo,
      params.priceImpactUsd > 0n,
      params.sizeDeltaUsd
    )
  }, combineObject({ marketInfo, priceImpactUsd, sizeDeltaUsd }))

  const adjustmentFeeUsd = map(params => {
    return params.marginFeeUsd // + params.priceImpactUsd
    // return params.marginFeeUsd + params.swapFee + params.priceImpactUsd
  }, combineObject({ marginFeeUsd, priceImpactUsd }))

  const collateralDelta = map(params => {
    return getTokenAmount(params.primaryPrice, params.collateralDeltaUsd)
  }, combineObject({ primaryPrice, collateralDeltaUsd }))

  const sizeDelta = map(params => {
    return getTokenAmount(params.indexPrice, params.sizeDeltaUsd)
  }, combineObject({ indexDescription, indexPrice, sizeDeltaUsd }))

  const netPositionValueUsd = replayLatest(multicast(map(params => {
    const mirroredPosition = params.mirrorPosition

    if (mirroredPosition === null) {
      return 0n
    }

    const lstAdjustment = getLastAdjustment(mirroredPosition)
    const collateralPriceMax = lstAdjustment.collateralTokenPriceMax
    const totalCostAmount = getTokenUsd(
      collateralPriceMax,
      lstAdjustment.feeCollected.totalCostAmount,
    )

    const collateralUsd = getTokenUsd(collateralPriceMax, lstAdjustment.collateralAmount)
    const netValue = collateralUsd - totalCostAmount

    return netValue
  }, combineObject({ mirrorPosition }))))

  // const netPositionValueUsd = replayLatest(multicast(switchMap(posInfo => {
  //   return map((params) => {
  //     if (posInfo === null) {
  //       return 0n
  //     }
    
  //     const totalCostAmount = getTokenUsd(
  //       params.collateralPrice,
  //       posInfo.fees.totalCostAmount,
  //     )

  //     const collateralUsd = getTokenUsd(params.collateralPrice, posInfo.position.numbers.collateralAmount)
  //     const netValue = collateralUsd - totalCostAmount

  //     return netValue
  //   }, combineObject({ positionInfo, collateralPrice }))
  // }, positionInfo)))

  const focusPrice = replayLatest(multicast(changefocusPrice), null)
  const yAxisCoords = replayLatest(multicast(changeYAxisCoords), null)

  const isFocused = mergeArray([
    // constant(false, clickResetPosition),
    replayLatest(multicast(changeIsFocused), false)
  ])
  
  const leverage = replayLatest(multicast(mergeArray([
    changeLeverage,
    storage.replayWrite(store.tradeBox, debounce(50, changeLeverage), 'leverage'),
    filterNull(map(params => {
      if (params.mirrorPosition === null) return null

      const initialLeverage = div(params.mirrorPosition.position.sizeInUsd, params.netPositionValueUsd)

      return initialLeverage
    }, zipState({ netPositionValueUsd, mirrorPosition })))
  ])))

  // [config]
  const tradeConfig: StateStream<ITradeConfig> = {
    focusPrice: switchMap(focus => focus ? focusPrice : now(null), isFocused),
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
  
  const averagePrice = multicast(map(params => {
    if (params.mirrorPosition === null) return 0n
    
    const totalSize = params.mirrorPosition.position.sizeInUsd + params.sizeDeltaUsd
    const totalSizeInTokens = params.mirrorPosition.position.sizeInTokens + params.sizeDelta
    const avg = (totalSize / totalSizeInTokens) * getTokenDenominator(params.indexToken)

    return avg
  }, combineObject({ mirrorPosition, collateralPrice, indexToken, indexPrice, sizeDeltaUsd, sizeDelta })))

  const liquidationPrice = multicast(map(params => {
    const lstAdjustment = params.mirrorPosition ? getLastAdjustment(params.mirrorPosition) : null

    const positionSizeUsd = lstAdjustment?.sizeInUsd || 0n
    const positionSizeInTokens = lstAdjustment?.sizeInTokens || 0n

    const positionCollateral = lstAdjustment ? getTokenUsd(params.collateralPrice, lstAdjustment.collateralAmount) : 0n
    const positionCollateralInTokens = lstAdjustment ? lstAdjustment.collateralAmount : 0n

    const size = positionSizeInTokens + params.sizeDelta
    const sizeUsd = positionSizeUsd + params.sizeDeltaUsd

    const collateral = positionCollateralInTokens + params.collateralDelta
    const collateralUsd = positionCollateral + params.collateralDeltaUsd

    const lp = getLiquidationPrice(params.marketInfo, params.isLong, params.collateralToken, params.indexToken, size, sizeUsd, collateral, collateralUsd)
    
    return lp
  }, zipState({ sizeDeltaUsd, sizeDelta, isLong, collateralDeltaUsd, collateralDelta, collateralToken, collateralPrice, indexToken, mirrorPosition, marketInfo })))

  const isPrimaryApproved = mergeArray([
    changeInputTokenApproved,
    skipRepeats(awaitPromises(snapshot(async (collDeltaUsd, params) => {
      if (!params.wallet) {
        console.warn(new Error('No wallet connected'))
        return false
      }


      if (params.primaryToken === GMX.ADDRESS_ZERO || !params.isIncrease) {
        return true
      }

      const contractAddress = getMappedValue(GMX.TRADE_CONTRACT_MAPPING, chainId).Router

      if (contractAddress === null || !params.wallet) {
        return false
      }

      try {
        const allowedSpendAmount = await wagmi.readContract({
          address: params.primaryToken,
          abi: erc20Abi,
          functionName: 'allowance',
          args: [params.wallet.account.address, PUPPET.CONTRACT[config.chain.id].Orchestrator.address]
        })

        return allowedSpendAmount > collDeltaUsd
      } catch (err) {
        console.warn(err)
        return false
      }

    }, collateralDeltaUsd, combineObject({ wallet, primaryToken, isIncrease, tradeRoute }))))
  ])

  const marketAvailableLiquidityUsdQuery = replayLatest(multicast(map(async params => {
    const mktInfo = await params.marketInfoQuery

    return getAvailableReservedUsd(mktInfo, params.marketPrice, params.isLong)
  }, combineObject({ marketInfoQuery, marketPrice, isLong, feeDisplayRate }))))

  const marketBorrowRateQuery =  replayLatest(multicast(map(async params => {
    const mktInfo = await params.marketInfoQuery

    return getBorrowingFactorPerInterval(mktInfo.fees, params.isLong, params.feeDisplayRate)
  }, combineObject({ isLong, feeDisplayRate, marketInfoQuery }))))

  const marketFundingRateQuery =  replayLatest(multicast(map(async params => {
    const mktInfo = await params.marketInfoQuery

    return getFundingFactorPerInterval(mktInfo.usage, mktInfo.fees, params.feeDisplayRate)
  }, combineObject({ feeDisplayRate, marketInfoQuery }))))


  // const openPositionList: Stream<IPositionMirrorOpen[]> = mergeArray([
  //   combineArray((pos, posList) => {
  //     if (posList.length === 0) {
  //       return []
  //     }

  //     if (pos === null)  {
  //       return posList
  //     }

  //     const trade = posList.find(t => t.key === pos.key) || null

  //     if (trade === null) {
  //       return posList
  //     }

  //     return posList //.filter(t => t.key !== pos.key)
  //   }, mirroredPosition, positionList)
  // ])


  const pricefeed = replayLatest(multicast(awaitPromises(map(async params => {
    return queryLatestTokenPriceFeed({
      token: params.indexToken,
      interval: params.chartInterval,
    })
  }, combineObject({ chartInterval, indexToken })))))

  const executeGasLimit = fromPromise(getExecuteGasFee(config.chain))

  const executionFee = replayLatest(multicast(map(params => {
    const estGasLimit = params.isIncrease ? params.executeGasLimit.increaseGasLimit : params.executeGasLimit.decreaseGasLimit

    const adjustedGasLimit = params.executeGasLimit.estimatedFeeBaseGasLimit + applyFactor(estGasLimit, params.executeGasLimit.estimatedFeeMultiplierFactor)
    const feeTokenAmount = adjustedGasLimit * params.estimatedGasPrice.maxFeePerGas!

    return feeTokenAmount
    
    // return getExecutionFee(params.executeGasLimit.estimatedFeeBaseGasLimit, params.executeGasLimit.estimatedFeeMultiplierFactor, estGasLimit, params.gasPrice)
  }, combineObject({ executeGasLimit, isIncrease, estimatedGasPrice, gasPrice }))))




  const tradeState: StateStream<ITradeParams> = {
    tradeRoute,
    routeTypeKey,

    position: mirrorPosition,
    netPositionValueUsd,

    isTradingEnabled,
    isPrimaryApproved,

    marketPrice,
    collateralPrice,
    primaryPrice,
    indexPrice,

    marketAvailableLiquidityUsd: awaitPromises(marketAvailableLiquidityUsdQuery),
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

    // collateralTokenPoolInfo,
  }

  const $tradebox = $PositionEditor({
    tradeConfig,
    routeTypeListQuery: config.routeTypeListQuery,
    chain: config.chain,
    parentRoute: config.parentRoute,
    referralCode: config.referralCode,
    tradeState,
    resetAdjustments: clickResetPositionQuery, 
    $container: $column
  })({
    changeLeverage: changeLeverageTether(),
    changeCollateralDeltaUsd: changeCollateralDeltaUsdTether(),
    changeSizeDeltaUsd: changeSizeDeltaUsdTether(),
    changePrimaryToken: changePrimaryTokenTether(),
    // isUsdCollateralToken: changeIsUsdCollateralTokenTether(),
    changeMarketToken: changeMarketTokenTether(),
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
          $row(layoutSheet.spacingBig, style({ pointerEvents: 'all', alignItems: 'center' }))(
            $column(layoutSheet.spacingSmall)(
              $infoLabel('Borrow Rate'),
              $row(style({ whiteSpace: 'pre' }))(
                switchMap(rateQuery => {
                  return $text(styleBehavior(map(rate => ({ color: rate ? pallete.negative : '' }), fromPromise(rateQuery))))(
                    intermediateMessage(rateQuery, rate => readableFixedUSD30(-rate))
                  )
                }, marketBorrowRateQuery),
                $text(style({ color: pallete.foreground }))(' / hr')
              )
            ),
            $column(layoutSheet.spacingSmall)(
              $infoLabel('Funding Rate'),
              $row(style({ whiteSpace: 'pre' }))(
                switchMap(params => {
                  return $text(
                    styleBehavior(map(frate => {
                      const isPositive = params.isLong ? frate < 0n : frate > 0n
                      return { color: isPositive ? pallete.positive : pallete.negative }
                    }, fromPromise(params.marketFundingRateQuery)))
                  )(
                    intermediateMessage(params.marketFundingRateQuery, frate => {
                      const isPositive = params.isLong ? frate < 0n : frate > 0n
                      const label = isPositive ? '+' : ''
                      return label + readableFactorPercentage(frate)
                    })
                  )
                }, combineObject({ marketFundingRateQuery, isLong })),
                $text(style({ color: pallete.foreground }))(' / hr')
              )
            ),
            $column(layoutSheet.spacingSmall)(
              $infoLabel('Available Liquidity'),
              switchMap(query => {
                return $text(intermediateMessage(query, readableFixedUSD30))
              }, marketAvailableLiquidityUsdQuery),
            ),
            screenUtils.isDesktopScreen
              ? style({ pointerEvents: 'all' })(
                $ButtonToggle({
                  selected: chartInterval,
                  options: [
                    GMX.IntervalTime.MIN5,
                    GMX.IntervalTime.MIN15,
                    GMX.IntervalTime.MIN60,
                    GMX.IntervalTime.HR6,
                    GMX.IntervalTime.HR24,
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
                    GMX.IntervalTime.MIN5,
                    GMX.IntervalTime.MIN15,
                    GMX.IntervalTime.MIN60,
                    GMX.IntervalTime.HR6,
                    GMX.IntervalTime.HR24,
                  // GMX.TIME_INTERVAL_MAP.DAY7,
                  ],
                }
              })({
                select: selectTimeFrameTether()
              }),
          ),

          screenUtils.isDesktopScreen
            ? $column(style({ position: 'absolute', pointerEvents: 'all', zIndex: 20, bottom: '40px', width: '460px', left: '0' }))(
              $tradebox,
            ) : empty(),
        ),

        switchLatest(snapshot((params, feed) => {

          const tf = params.chartInterval
          const fst = feed[feed.length - 1]

          const initialTick = {
            open: formatFixed(fst.o, 30 - params.indexDescription.decimals),
            high: formatFixed(fst.h, 30 - params.indexDescription.decimals),
            low: formatFixed(fst.l, 30 - params.indexDescription.decimals),
            close: formatFixed(fst.c, 30 - params.indexDescription.decimals),
            time: fst.timestamp as Time
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
                return ev ? readableAccountingAmount(ev) : ''
              }, focusPrice))
            ),
            data: feed.map(({ o, h, l, c, timestamp }) => {
              const open = formatFixed(o, 30 - params.indexDescription.decimals)
              const high = formatFixed(h, 30 - params.indexDescription.decimals)
              const low = formatFixed(l, 30 - params.indexDescription.decimals)
              const close = formatFixed(c, 30 - params.indexDescription.decimals)

              return { open, high, low, close, time: timestamp as Time }
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
              const marketPrice = formatFixed(next.indexPrice, USD_DECIMALS - params.indexDescription.decimals)
              
              const timeNow = unixTimestampNow()
              const nextTimeSlot = Math.floor(timeNow / tf)
              const nextTime = nextTimeSlot * tf
              const isNext = nextTime > (prev.time as number)
 
              document.title = `${next.indexTokenDescription.symbol} ${readableTokenPrice(params.indexDescription.decimals, next.indexPrice)}`

              if (isNext) {
                return {
                  open: marketPrice,
                  high: marketPrice,
                  low: marketPrice,
                  close: marketPrice,
                  time: nextTime as Time
                }
              }

              return {
                open: prev.open,
                high: marketPrice > prev.high ? marketPrice : prev.high,
                low: marketPrice < prev.low ? marketPrice : prev.low,
                close: marketPrice,
                time: prev.time as Time
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
        $responsiveFlex(style({ flex: 1, display: 'flex' }))(

          $column(layoutSheet.spacing, style({ padding: '25px', flex: 1, maxWidth: '460px' }))(
            $PositionAdjustmentDetails({
              chain: config.chain,
              pricefeed,
              tradeConfig,
              tradeState,
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
              chain: config.chain,
              openPositionListQuery,
              tradeConfig,
              tradeState,
              wallet,
              $container: $column
            })({
              switchPosition: switchPositionTether(),
              changeMarketToken: changeMarketTokenTether(),
              switchIsLong: switchIsLongTether(),
              switchIsIncrease: switchIsIncreaseTether(),
              changeLeverage: changeLeverageTether(),
              changeIsUsdCollateralToken: changeIsUsdCollateralTokenTether(),
            }),
                    
          ),

          $seperator2,

          $PositionDetails({
            chain: config.chain,
            pricefeed,
            tradeConfig,
            tradeState,
            wallet,
            $container: $column(style({ flex: 1 }))
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


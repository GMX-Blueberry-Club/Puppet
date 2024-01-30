import { Behavior, combineObject, replayLatest } from "@aelea/core"
import { $node, $text, component, style, styleBehavior } from "@aelea/dom"
import { $column, $icon, $row, layoutSheet, observer, screenUtils } from "@aelea/ui-components"
import { colorAlpha, pallete } from "@aelea/ui-components-theme"
import { awaitPromises, constant, debounce, empty, map, mergeArray, multicast, now, scan, skipRepeats, snapshot, switchLatest } from "@most/core"
import { Stream } from "@most/types"
import {
  ADDRESS_ZERO, IntervalTime, StateStreamStrict, USD_DECIMALS, applyFactor, div, filterNull, formatFixed, getMappedValue,
  getTokenAmount, getTokenDenominator, getTokenUsd,
  readableAccountingAmount, readableFactorPercentage, readableTokenAmountLabel, readableTokenPrice, readableUsd, switchMap, unixTimestampNow, zipState
} from "common-utils"
import {
  IMarketInfo, IMarketPrice, TEMP_MARKET_TOKEN_MARKET_MAP,
  getAvailableReservedUsd, getBorrowingFactorPerInterval, getFundingFactorPerInterval, getLiquidationPrice, getMarginFee, getNativeTokenDescription,
  getPositionKey, getPriceImpactForPosition, getTokenDescription, resolveAddress,
} from "gmx-middleware-utils"
import { CandlestickData, Coordinate, LineStyle, Time } from "lightweight-charts"
import { EIP6963ProviderDetail } from "mipd"
import * as PUPPET from "puppet-middleware-const"
import { IMirrorPositionOpen, getLastAdjustment, latestPriceMap, queryLatestTokenPriceFeed, queryTraderPositionOpen } from "puppet-middleware-utils"
import { $ButtonToggle, $CandleSticks, $infoLabel, $infoLabeledValue, $intermediate$node, $intermediateMessage, $target } from "ui-components"
import { indexDb, uiStorage } from "ui-storage"
import * as viem from "viem"
import * as walletLink from "wallet"
import { $midContainer } from "../common/$common.js"
import { $responsiveFlex } from "../common/elements/$common"
import { $caretDown } from "../common/elements/$icons.js"
import { $ButtonSecondary } from "../components/form/$Button.js"
import { $Dropdown } from "../components/form/$Dropdown.js"
import { $PositionAdjustmentDetails, IRequestTrade } from "../components/trade/$PositionAdjustmentDetails"
import { $PositionDetails } from "../components/trade/$PositionDetails.js"
import { $PositionEditor, IPositionEditorAbstractParams, ITradeConfig, ITradeParams } from "../components/trade/$PositionEditor.js"
import { $PositionListDetails } from "../components/trade/$PositionListDetails.js"
import { store } from "../const/store.js"
import { getExecuteGasFee, getFullMarketInfo } from "../logic/tradeV2.js"
import * as trade from "../logic/traderLogic.js"
import { exchangesWebsocketPriceSource, getTokenSpendAmount, getTraderTradeRoute } from "../logic/traderLogic.js"
import { $seperator2 } from "./common.js"
import { ITradeFocusMode } from "./type.js"



export type ITradeComponent = IPositionEditorAbstractParams


const TIME_INTERVAL_LABEL_MAP = {
  [IntervalTime.SEC]: '1s',
  [IntervalTime.MIN]: '1m',
  [IntervalTime.MIN5]: '5m',
  [IntervalTime.MIN15]: '15m',
  [IntervalTime.MIN30]: '30m',
  [IntervalTime.MIN60]: '1h',
  [IntervalTime.HR2]: '2h',
  [IntervalTime.HR4]: '4h',
  [IntervalTime.HR6]: '6h',
  [IntervalTime.HR8]: '8h',
  [IntervalTime.HR24]: '1d',
  [IntervalTime.DAY7]: '1w',
  [IntervalTime.MONTH]: '1mo',
  [IntervalTime.MONTH2]: '2mo',
  [IntervalTime.YEAR]: '2yr',
} as const


export const $Trade = (config: ITradeComponent) => component((
  [selectTimeFrame, selectTimeFrameTether]: Behavior<IntervalTime>,
  [changeWallet, changeWalletTether]: Behavior<EIP6963ProviderDetail>,
  [changePrimaryToken, changePrimaryTokenTether]: Behavior<viem.Address>,

  [changeMarketToken, changeMarketTokenTether]: Behavior<viem.Address>,
  [changeIsUsdCollateralToken, changeIsUsdCollateralTokenTether]: Behavior<boolean>,
  [switchFocusMode, switchFocusModeTether]: Behavior<ITradeFocusMode>,
  [switchIsLong, switchIsLongTether]: Behavior<boolean>,
  [switchIsIncrease, switchIsIncreaseTether]: Behavior<boolean>,

  [changeCollateralDeltaAmount, changeCollateralDeltaAmountTether]: Behavior<bigint>,
  [changeSizeDeltaUsd, changeSizeDeltaUsdTether]: Behavior<bigint>,

  [changeLeverage, changeLeverageTether]: Behavior<bigint>,
  [changeSlippage, changeSlippageTether]: Behavior<bigint>,
  [changeExecutionFeeBuffer, changeExecutionFeeBufferTether]: Behavior<bigint>,

  [approvePrimarySpendAmount, approvePrimarySpendAmountTether]: Behavior<bigint | null>,

  [enableTrading, enableTradingTether]: Behavior<boolean>,

  [switchPosition, switchPositionTether]: Behavior<IMirrorPositionOpen>,
  [requestTrade, requestTradeTether]: Behavior<IRequestTrade>,

  [changeYAxisCoords, changeYAxisCoordsTether]: Behavior<Coordinate>,
  [changefocusPrice, changefocusPriceTether]: Behavior<number | null>,
  [changeIsFocused, changeIsFocusedTether]: Behavior<boolean>,
  
  [changeFeeDisplayRate, changeFeeDisplayRateTether]: Behavior<IntervalTime>,

  [clickResetPositionQuery, clickResetPositionTether]: Behavior<IMirrorPositionOpen | null>,

) => {

  const { routeTypeListQuery, walletClientQuery, chain, publicProviderQuery, parentRoute, referralCode } = config
  

  const focusMode = replayLatest(switchFocusMode, ITradeFocusMode.collateral)

  const chartInterval = uiStorage.replayWrite(store.tradeBox, selectTimeFrame, 'chartInterval')
  const isTradingEnabled = uiStorage.replayWrite(store.tradeBox, enableTrading, 'isTradingEnabled')
  const isLong = uiStorage.replayWrite(store.tradeBox, switchIsLong, 'isLong')
  const slippage = uiStorage.replayWrite(store.tradeBox, changeSlippage, 'slippage')
  const executionFeeBuffer = uiStorage.replayWrite(store.tradeBox, changeExecutionFeeBuffer, 'executionFeeBuffer')
  const primaryToken = uiStorage.replayWrite(store.tradeBox, changePrimaryToken, 'primaryToken')
  const isUsdCollateralToken = uiStorage.replayWrite(store.tradeBox, changeIsUsdCollateralToken, 'isUsdCollateralToken')
  const feeDisplayRate = uiStorage.replayWrite(store.tradeBox, changeFeeDisplayRate, 'feeRateIntervalDisplay')
  const marketToken: Stream<viem.Address> = uiStorage.replayWrite(store.tradeBox, changeMarketToken, 'marketToken')

  const isIncrease = mergeArray([
    constant(true, clickResetPositionQuery),
    replayLatest(switchIsIncrease, true),
  ])


  const market = map(token => getMappedValue(TEMP_MARKET_TOKEN_MARKET_MAP, token), marketToken)

  const collateralDeltaAmount = replayLatest(changeCollateralDeltaAmount, 0n)
  const sizeDeltaUsd = replayLatest(changeSizeDeltaUsd, 0n)


  const collateralToken: Stream<viem.Address> = map(params => {
    return params.isUsdCollateralToken ? params.market.shortToken : params.market.longToken
  }, combineObject({ market, isUsdCollateralToken }))


  const walletBalance = replayLatest(multicast(switchMap(async params => {
    const wallet = await params.walletClientQuery

    if (wallet === null) {
      return 0n
    }

    return trade.getAddressTokenBalance(wallet, params.primaryToken, wallet.account.address)
  }, combineObject({ primaryToken, walletClientQuery }))))

  
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

  const routeTypeKey = replayLatest(multicast(awaitPromises(map(async params => {
    const getRouteTypeKeyArgs = (await params.routeTypeListQuery).find(srt =>
      srt.collateralToken === params.collateralToken && srt.indexToken === params.indexToken && srt.isLong === params.isLong
    )
    if (!getRouteTypeKeyArgs) {
      throw new Error(`Route type not found for ${params.collateralToken} ${params.indexToken} ${params.isLong}`)
    }
    
    return getRouteTypeKeyArgs.routeTypeKey
  }, combineObject({ collateralToken, indexToken, isLong, routeTypeListQuery })))))

  const marketInfoQuery = map(async params => {
    const provider = await params.publicProviderQuery
    return getFullMarketInfo(provider, params.market, params.marketPrice)
  }, combineObject({ market, marketPrice, publicProviderQuery }))

  const marketInfo: Stream<IMarketInfo> = replayLatest(multicast(awaitPromises(marketInfoQuery)))

  const tradeRoute: Stream<viem.Address | null> = replayLatest(multicast(switchMap(async params => {
    const wallet = await params.walletClientQuery
    if (wallet === null) {
      return null
    }

    const storedRouteKeyMap = await indexDb.get(store.tradeBox, 'traderRouteMap')
    const address = wallet.account.address
    const routeAddress = storedRouteKeyMap[address]

    if (routeAddress) {
      return routeAddress
    }

    const res = await getTraderTradeRoute(wallet, address, params.collateralToken, params.indexToken, params.isLong)

    if (res !== null) {
      storedRouteKeyMap[address] = res
    }
  
    await indexDb.set(store.tradeBox, 'traderRouteMap', storedRouteKeyMap)

    return res
  }, combineObject({ collateralToken, walletClientQuery, indexToken, isLong }))))


  const openPositionListQuery = multicast(replayLatest(switchMap(wallet => {
    if (wallet === null) {
      return now(Promise.resolve([] as IMirrorPositionOpen[]))
    }

    return queryTraderPositionOpen({ address: wallet.account.address  })
  }, awaitPromises(walletClientQuery))))


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


  const primaryDescription = map((token) => {
    if (token === ADDRESS_ZERO) {
      return getNativeTokenDescription(config.chain)
    }

    return getTokenDescription(token)
  }, primaryToken)

  const indexDescription = map(token => getTokenDescription(token), indexToken)
  const collateralDescription = map((address) => getTokenDescription(address), collateralToken)


  const priceImpactUsd = map(params => {
    if (params.sizeDeltaUsd === 0n) return 0n

    return getPriceImpactForPosition(
      params.marketInfo,
      params.sizeDeltaUsd,
      params.isLong,
    )
  }, combineObject({ marketInfo, sizeDeltaUsd, isLong }))

  const marginFeeUsd = map(params => {
    const fee = getMarginFee(
      params.marketInfo,
      params.priceImpactUsd > 0n,
      params.sizeDeltaUsd
    )
    return fee
  }, combineObject({ marketInfo, priceImpactUsd, sizeDeltaUsd }))

  const adjustmentFeeUsd = map(params => {
    return -params.marginFeeUsd // + params.priceImpactUsd
    // return params.marginFeeUsd + params.swapFee + params.priceImpactUsd
  }, combineObject({ marginFeeUsd, priceImpactUsd }))

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

  const focusPrice = replayLatest(multicast(changefocusPrice), null)
  const yAxisCoords = replayLatest(multicast(changeYAxisCoords), null)

  const isFocused = mergeArray([
    // constant(false, clickResetPosition),
    replayLatest(multicast(changeIsFocused), false)
  ])
  
  const leverage = replayLatest(multicast(mergeArray([
    changeLeverage,
    uiStorage.replayWrite(store.tradeBox, debounce(50, changeLeverage), 'leverage'),
    filterNull(map(params => {
      if (params.mirrorPosition === null) return null

      const initialLeverage = div(params.mirrorPosition.position.sizeInUsd, params.netPositionValueUsd)

      return initialLeverage
    }, zipState({ netPositionValueUsd, mirrorPosition })))
  ])))

  // [config]
  const tradeConfig: StateStreamStrict<ITradeConfig> = {
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
    sizeDeltaUsd,
    // collateralDelta,
    collateralDeltaAmount,
  }
  
  const averagePrice = multicast(map(params => {
    if (params.mirrorPosition === null) return 0n
    
    const totalSize = params.mirrorPosition.position.sizeInUsd + params.sizeDeltaUsd
    const totalSizeInTokens = params.mirrorPosition.position.sizeInTokens + getTokenAmount(params.indexPrice, params.sizeDeltaUsd)
    const avg = (totalSize / totalSizeInTokens) * getTokenDenominator(params.indexDescription)

    return avg
  }, combineObject({ mirrorPosition, collateralPrice, indexToken, indexDescription, indexPrice, sizeDeltaUsd })))

  const liquidationPrice = multicast(map(params => {
    const lstAdjustment = params.mirrorPosition ? getLastAdjustment(params.mirrorPosition) : null

    const positionSizeUsd = lstAdjustment?.sizeInUsd || 0n
    const positionSizeInTokens = lstAdjustment?.sizeInTokens || 0n

    const positionCollateral = lstAdjustment ? getTokenUsd(params.collateralPrice, lstAdjustment.collateralAmount) : 0n
    const positionCollateralInTokens = lstAdjustment ? lstAdjustment.collateralAmount : 0n

    const size = positionSizeInTokens + getTokenAmount(params.indexPrice, params.sizeDeltaUsd)
    const sizeUsd = positionSizeUsd + params.sizeDeltaUsd

    const collateral = positionCollateralInTokens + params.collateralDeltaAmount
    const collateralUsd = positionCollateral + getTokenUsd(params.collateralPrice, params.collateralDeltaAmount)

    const lp = getLiquidationPrice(params.marketInfo, params.isLong, params.collateralToken, params.indexToken, size, sizeUsd, collateral, collateralUsd)
    
    return lp
  }, zipState({ mirrorPosition, collateralPrice, indexPrice, sizeDeltaUsd, collateralDeltaAmount, marketInfo, isLong, collateralToken, indexToken })))

  const primarySpendAmount = mergeArray([
    approvePrimarySpendAmount,
    skipRepeats(switchMap(async params => {
      if (!params.isTradingEnabled || params.primaryToken === ADDRESS_ZERO || !params.isIncrease) {
        return null
      }

      const wallet = await params.walletClientQuery

      if (wallet === null) {
        return null
      }

      const orchestratorAddress = getMappedValue(PUPPET.CONTRACT, wallet.chain.id).Orchestrator

      try {
        const allowedSpendAmount = await getTokenSpendAmount(wallet, params.primaryToken, orchestratorAddress.address, wallet.account.address)

        return allowedSpendAmount
      } catch (err) {
        return null
      }
    }, combineObject({ walletClientQuery, isTradingEnabled, primaryToken, isIncrease })))
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

  const pricefeed = replayLatest(multicast(awaitPromises(map(async params => {
    return queryLatestTokenPriceFeed({
      token: params.indexToken,
      interval: params.chartInterval,
    })
  }, combineObject({ chartInterval, indexToken })))))


  const gasPrice = walletLink.getGasPrice(publicProviderQuery)
  const estimatedGasPrice = walletLink.getEstimatedGasPrice(publicProviderQuery)
  const executeGasLimit = switchMap(async provider => getExecuteGasFee(await provider), publicProviderQuery)

  const executionFee = replayLatest(multicast(map(params => {
    const keerperGasLimit = params.isIncrease ? params.executeGasLimit.increaseGasLimit : params.executeGasLimit.decreaseGasLimit

    const adjustedGasLimit = params.executeGasLimit.estimatedFeeBaseGasLimit + applyFactor(keerperGasLimit, params.executeGasLimit.estimatedFeeMultiplierFactor)
    const feeTokenAmount = adjustedGasLimit * params.estimatedGasPrice.maxFeePerGas!

    return -feeTokenAmount
  }, combineObject({ walletClientQuery, executeGasLimit, isIncrease, estimatedGasPrice, gasPrice }))))
  // const executionFee = replayLatest(multicast(switchMap(async params => {
  //   const provider = await params.publicProviderQuery

  //   if (provider === null) {
  //     return 0n
  //   }

  //   const estGasLimit = await getMinExecutionFee(provider)

  //   return -estGasLimit
  // }, combineObject({ publicProviderQuery }))))




  const tradeState: StateStreamStrict<ITradeParams> = {
    tradeRoute,
    routeTypeKey,

    mirrorPosition,
    netPositionValueUsd,

    isTradingEnabled,
    primarySpendAmount,

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

    marketInfo,
  }

  const $tradebox = $PositionEditor({
    publicProviderQuery,
    walletClientQuery,
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
    changeCollateralDeltaAmount: changeCollateralDeltaAmountTether(),
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
        style({ height: '45vh', minHeight: '480px', position: 'relative', backgroundColor: pallete.background }),
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
                $intermediate$node(
                  map(async brateQuery => {
                    const brate = await brateQuery
                    const isPositive = brate > 0n
                    const label = isPositive ? '+' : ''
                    return $text(style({ color: isPositive ? pallete.positive : pallete.negative }))(
                      label + readableFactorPercentage(brate)
                    )
                  }, marketBorrowRateQuery)
                ),
                $text(style({ color: pallete.foreground }))(' / hr')
              )
            ),
            $column(layoutSheet.spacingSmall)(
              $infoLabel('Funding Rate'),
              $row(style({ whiteSpace: 'pre' }))(
                $intermediate$node(
                  map(async frateQuery => {
                    const frate = await frateQuery
                    const isPositive = frate > 0n
                    const label = isPositive ? '+' : ''
                    return $text(style({ color: isPositive ? pallete.positive : pallete.negative }))(
                      label + readableFactorPercentage(frate)
                    )
                  }, marketFundingRateQuery)
                ),

                $text(style({ color: pallete.foreground }))(' / hr')
              )
            ),
            $column(layoutSheet.spacingSmall)(
              $infoLabel('Available Liquidity'),
              $intermediateMessage(map(async query => {
                const value = await query
                return readableUsd(value)
              }, marketAvailableLiquidityUsdQuery))
            ),
            screenUtils.isDesktopScreen
              ? style({ pointerEvents: 'all' })(
                $ButtonToggle({
                  selected: chartInterval,
                  options: [
                    IntervalTime.MIN5,
                    IntervalTime.MIN15,
                    IntervalTime.MIN60,
                    IntervalTime.HR6,
                    IntervalTime.HR24,
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
                    IntervalTime.MIN5,
                    IntervalTime.MIN15,
                    IntervalTime.MIN60,
                    IntervalTime.HR6,
                    IntervalTime.HR24,
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
          const rightOffset = screenUtils.isDesktopScreen ? ((document.body.clientWidth - CONTAINER_WIDTH) / 2) / 6.5 : 5

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
                  $infoLabeledValue('Size', $text(map(value => readableUsd(value), sizeDeltaUsd))),
                  $infoLabeledValue('Collateral', $text(map(params => {
                    return readableTokenAmountLabel(params.primaryDescription, params.collateralDeltaAmount)
                  }, combineObject({ collateralDeltaAmount, primaryDescription })))),
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
            // click: chartClickTether(),
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
          $seperator2,

          $column(layoutSheet.spacing, style({ padding: '25px', flex: 1, maxWidth: '460px' }))(
            $PositionAdjustmentDetails({
              walletClientQuery,
              chain: config.chain,
              pricefeed,
              tradeConfig,
              tradeState,
              $container: $column
            })({
              changeWallet: changeWalletTether(),
              clickResetPosition: clickResetPositionTether(),
              primarySpendAmount: approvePrimarySpendAmountTether(),
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
              tradeState,
              mirrorPosition,
              requestTrade,
              $container: $column
            })({
              switchPosition: switchPositionTether(),
              changeMarketToken: changeMarketTokenTether(),
              switchIsLong: switchIsLongTether(),
              switchIsIncrease: switchIsIncreaseTether(),
              changeLeverage: changeLeverageTether(),
            }),
                    
          ),

          $seperator2,

          $column(style({ flex: 1 }))(
            $PositionDetails({
              walletClientQuery,
              chain: config.chain,
              pricefeed,
              mirrorPosition,
              tradeConfig,
              tradeState,
            })({})
          ),

          $seperator2,
                  
  
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

    { changeWallet, }
  ]
})


import { Behavior, O, combineArray, combineObject, replayLatest } from "@aelea/core"
import { $node, $text, component, style, styleBehavior } from "@aelea/dom"
import { $column, $icon, $row, layoutSheet, screenUtils } from "@aelea/ui-components"
import {
  IPositionDecrease, IPositionIncrease, IPositionSlot, abs, filterNull, formatFixed,
  getAdjustedDelta, getDenominator, getFeeBasisPoints, getFundingFee, getIntervalIdentifier, getLiquidationPrice, getMappedValue,
  getMarginFees, getNativeTokenDescription, getNextAveragePrice, getNextLiquidationPrice, getPnL, getPositionKey,
  getTokenAmount, getTokenDescription, readableDate, readableFixedBsp, readableFixedUSD30, readableUnitAmount, safeDiv, switchMap, timeSince, unixTimestampNow
} from "gmx-middleware-utils"

import { colorAlpha, pallete } from "@aelea/ui-components-theme"
import { awaitPromises, combine, debounce, empty, map, mergeArray, multicast, now, scan, skipRepeats, skipRepeatsWith, snapshot, startWith, switchLatest, zip } from "@most/core"
import { Stream } from "@most/types"
import { readContract } from "@wagmi/core"
import { erc20Abi } from "abitype/test"
import * as GMX from "gmx-middleware-const"
import { $ButtonToggle, $CandleSticks, $infoLabel, $infoLabeledValue, $target, $txHashRef } from "gmx-middleware-ui-components"
import { CandlestickData, Coordinate, LineStyle, LogicalRange, MouseEventParams, Time } from "lightweight-charts"
import * as PUPPET from "puppet-middleware-const"
import { getRouteKey } from "puppet-middleware-const"
import * as viem from "viem"
import { $midContainer } from "../common/$common"
import { $IntermediateConnectButton } from "../components/$ConnectAccount"
import { $CardTable } from "../components/$common"
import { $ButtonSecondary } from "../components/form/$Button"
import { $Dropdown } from "../components/form/$Dropdown"
import { $PositionDetailsPanel, IRequestTrade } from "../components/trade/$PositionDetailsPanel"
import { $PositionEditor, IPositionEditorAbstractParams, ITradeFocusMode } from "../components/trade/$PositionEditor"
import { createPositionSlot, latestTokenPrice } from "../data/process/process"
import { $caretDown } from "../elements/$icons"
import { connectContract } from "../logic/common"
import * as trade from "../logic/trade"
import { resolveAddress } from "../logic/utils"
import { rootStoreScope } from "../rootStore"
import * as indexDB from "../utils/storage/indexDB"
import * as store from "../utils/storage/storeScope"
import { walletLink } from "../wallet"
import { wallet } from "../wallet/walletLink"


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

  [changeInputToken, changeInputTokenTether]: Behavior<viem.Address>,
  [changeIndexToken, changeIndexTokenTether]: Behavior<viem.Address>,
  [changeShortCollateralToken, changeShortCollateralTokenTether]: Behavior<viem.Address>,

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

  const chainId = config.chain.id
  const nativeToken = GMX.CHAIN_ADDRESS_MAP[chainId].NATIVE_TOKEN
  const gmxContractMap = GMX.CONTRACT[config.chain.id]
  const puppetContractMap = PUPPET.CONTRACT[config.chain.id]

  const tradeReader = trade.connectTrade(config.chain)

  // const vaultReader = contractReader(vaultConfig)
  const vault = connectContract(gmxContractMap.Vault)
  const positionRouter = connectContract(gmxContractMap.PositionRouter)
  const usdg = connectContract(gmxContractMap.USDG)
  const orchestrator = connectContract(puppetContractMap.Orchestrator)
  const router = connectContract(GMX.CONTRACT[config.chain.id].Router)
  

  const executionFee = replayLatest(multicast(positionRouter.read('minExecutionFee')))
  const tradingStore = store.createStoreScope(rootStoreScope, 'tradeBox' as const)


  const chartInterval = store.replayWrite(tradingStore, GMX.TIME_INTERVAL_MAP.MIN15, selectTimeFrame, 'chartInterval')
  const isTradingEnabled = store.replayWrite(tradingStore, false, enableTrading, 'isTradingEnabled')
  const isLong = store.replayWrite(tradingStore, true, switchIsLong, 'isLong')
  const isIncrease = store.replayWrite(tradingStore, true, switchIsIncrease, 'isIncrease')
  const focusMode = store.replayWrite(tradingStore, ITradeFocusMode.collateral, switchFocusMode, 'focusMode')
  const slippage = store.replayWrite(tradingStore, '0.35', changeSlippage, 'slippage')
  const inputToken = store.replayWrite(tradingStore, GMX.ADDRESS_ZERO, changeInputToken, 'inputToken')
  const indexToken = store.replayWrite(tradingStore, nativeToken, changeIndexToken, 'indexToken')
  const shortCollateralToken = store.replayWrite(tradingStore, GMX.ARBITRUM_ADDRESS.USDC as viem.Address | null, changeShortCollateralToken, 'shortCollateralToken')
  const leverage = mergeArray([
    changeLeverage,
    store.replayWrite(tradingStore, GMX.LIMIT_LEVERAGE / 4n, debounce(100, changeLeverage), 'leverage'),
  ])


  const collateralDeltaUsd = replayLatest(changeCollateralDeltaUsd, 0n)
  const sizeDeltaUsd = replayLatest(changeSizeDeltaUsd, 0n)



  const collateralToken: Stream<viem.Address> = map(params => {
    return params.isLong ? params.indexToken : params.shortCollateralToken
  }, combineObject({ isLong, indexToken, shortCollateralToken, switchTrade: startWith(null, switchTrade) }))


  const walletBalance = replayLatest(multicast(switchMap(params => {
    if (!params.wallet) {
      return now(0n)
    }

    return trade.getErc20Balance(config.chain, params.inputToken, params.wallet.account.address)
  }, combineObject({ inputToken, wallet }))))


  const inputTokenPrice = latestTokenPrice(config.processData, map(address => resolveAddress(config.chain.id, address), inputToken))
  const indexTokenPrice = mergeArray([
    latestTokenPrice(config.processData, indexToken),
    multicast(switchMap(address => trade.exchangesWebsocketPriceSource(config.chain, address), indexToken))
  ])
  const collateralTokenPrice = latestTokenPrice(config.processData, collateralToken)


  const route = replayLatest(multicast(switchMap(params => {
    const w3p = params.wallet
    if (w3p === null) {
      return now(GMX.ADDRESS_ZERO)
    }

    const key = getRouteKey(w3p.account.address, params.collateralToken, params.indexToken, params.isLong)
    const storedRouteKey = store.get(tradingStore, GMX.ADDRESS_ZERO as viem.Address, key)
    const fallbackGetRoute = switchMap(address => {

      if (address === GMX.ADDRESS_ZERO) {
        return switchMap(res => {
          return address === GMX.ADDRESS_ZERO ? now(res) : indexDB.set(tradingStore, res, key)
        }, orchestrator.read('getRoute', key))
      }

      return now(address)
    }, storedRouteKey)

    return fallbackGetRoute
  }, combineObject({ wallet, collateralToken, indexToken, isLong }))))



  const positionKeyAbs = map(params => {
    const resolvedCollateralToken = params.isLong ? params.indexToken : params.collateralToken
    const address = params.route || GMX.ADDRESS_ZERO
    const key = getPositionKey(address, resolvedCollateralToken, params.indexToken, params.isLong)

    return { ...params, key, account: address, isLong: params.isLong, collateralToken: resolvedCollateralToken }
  }, combineObject({ route, indexToken, collateralToken, isLong }))

  const positionKey = skipRepeatsWith((prev, next) => prev.key === next.key, positionKeyAbs)


  const keeperExecuteIncrease = positionRouter.listen('ExecuteIncreasePosition')
  const keeperDecreaseIncrease = positionRouter.listen('ExecuteDecreasePosition')
  const keeperCancelIncrease = positionRouter.listen('CancelIncreasePosition')
  const keeperCancelDecrease = positionRouter.listen('CancelDecreasePosition')




  const adjustPosition = multicast(mergeArray([
    keeperExecuteIncrease,
    keeperDecreaseIncrease,
    keeperCancelIncrease,
    keeperCancelDecrease,
  ]))

  const positions = vault.read('positions', map(pos => pos.key, positionKey))

  const positionChange: Stream<trade.IPositionGetter> = multicast(map(params => {
    const [size, collateral, averagePrice, entryFundingRate, reserveAmount, realisedPnl, lastIncreasedTime] = params.positions
    const lastIncreasedTimeBn = lastIncreasedTime

    const ret: trade.IPositionGetter = {
      account: params.positionKey.account,
      isLong: params.positionKey.isLong,
      key: params.positionKey.key,
      indexToken: params.positionKey.indexToken,
      collateralToken: params.positionKey.collateralToken,
      size: size,
      collateral: collateral,
      averagePrice: averagePrice,
      entryFundingRate: entryFundingRate,
      reserveAmount: reserveAmount,
      realisedPnl: realisedPnl,
      lastIncreasedTime: lastIncreasedTimeBn,
    }
    return ret
  }, combineObject({ positionKey, positions })))


  const updatePostion = filterNull(snapshot(
    (pos, update) => {
      if (pos.key !== update.args.key) {
        return null
      }

      return { ...pos, ...update }
    },
    positionChange,
    vault.listen('UpdatePosition')
    // tradeReader.positionUpdateEvent
  ))


  const position = replayLatest(multicast(mergeArray([
    positionChange,
    updatePostion,
    filterNull(snapshot(
      (pos, update): trade.IPositionGetter | null => {
        if (pos.key !== update.args.key) {
          return null
        }

        return {
          ...pos,
          size: 0n,
          collateral: 0n,
          averagePrice: 0n,
          entryFundingRate: 0n,
          reserveAmount: 0n,
          realisedPnl: 0n,
          lastIncreasedTime: 0n,
        }
      },
      positionChange,
      mergeArray([vault.listen('ClosePosition'), vault.listen('LiquidatePosition')])
      // mergeArray([tradeReader.positionCloseEvent, tradeReader.positionLiquidateEvent])
    ))
  ])))

  const stableFundingRateFactor = replayLatest(multicast(vault.read('stableFundingRateFactor')))
  const fundingRateFactor = replayLatest(multicast(vault.read('fundingRateFactor')))

  const inputTokenWeight = vault.read('tokenWeights', inputToken)
  const inputTokenDebtUsd = vault.read('usdgAmounts', inputToken)

  const inputTokenDescription = combineArray((network, token) => {
    if (token === GMX.ADDRESS_ZERO) {
      return getNativeTokenDescription(network.id)
    }

    return getTokenDescription(token)
  }, walletLink.chain, inputToken)
  const indexTokenDescription = map((address) => getTokenDescription(address), indexToken)
  const collateralTokenDescription = map((address) => getTokenDescription(address), collateralToken)


  const collateralTokenPoolInfo = replayLatest(multicast(tradeReader.getTokenPoolInfo(collateralToken)))


  const collateralDelta = map(params => {
    return getTokenAmount(params.collateralDeltaUsd, params.inputTokenPrice, params.inputTokenDescription.decimals)
  }, combineObject({ inputTokenPrice, inputTokenDescription, collateralDeltaUsd }))

  const sizeDelta = map(params => {
    return getTokenAmount(params.sizeDeltaUsd, params.indexTokenPrice, params.indexTokenDescription.decimals)
  }, combineObject({ indexTokenDescription, indexTokenPrice, sizeDeltaUsd }))


  const swapFee = replayLatest(multicast(skipRepeats(map((params) => {
    const inputAndIndexStable = params.inputTokenDescription.isStable && params.indexTokenDescription.isStable
    const swapFeeBasisPoints = inputAndIndexStable ? GMX.STABLE_SWAP_FEE_BASIS_POINTS : GMX.SWAP_FEE_BASIS_POINTS
    const taxBasisPoints = inputAndIndexStable ? GMX.STABLE_TAX_BASIS_POINTS : GMX.TAX_BASIS_POINTS

    const rsolvedInputAddress = resolveAddress(chainId, params.inputToken)
    if (rsolvedInputAddress === params.collateralToken) {
      return 0n
    }


    let amountUsd = abs(params.collateralDeltaUsd)

    if (!params.isIncrease) {
      const pnl = getPnL(params.isLong, params.position.averagePrice, params.indexTokenPrice, params.position.size)
      const adjustedDelta = getAdjustedDelta(params.position.size, abs(params.sizeDeltaUsd), pnl)

      if (adjustedDelta > 0n) {
        amountUsd = amountUsd + adjustedDelta
      }
    }


    const usdgAmount = amountUsd * getDenominator(params.inputTokenDescription.decimals) / GMX.USD_PERCISION

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
    const addedSwapFee = feeBps ? amountUsd * feeBps / GMX.BASIS_POINTS_DIVISOR : 0n

    return addedSwapFee
  }, combineObject({
    collateralToken, inputToken, isIncrease, sizeDeltaUsd, isLong, collateralDeltaUsd, network: walletLink.chain,
    collateralTokenPoolInfo, usdgSupply: usdg.read('totalSupply'), totalTokenWeight: vault.read('totalTokenWeights'),
    position, inputTokenDescription, inputTokenWeight, inputTokenDebtUsd, indexTokenDescription, indexTokenPrice
  })))))

  const marginFee = map(size => getMarginFees(abs(size)), sizeDeltaUsd)
  const fundingFee = map(params => {
    return getFundingFee(params.position.entryFundingRate, params.collateralTokenPoolInfo.cumulativeRate, params.position.size)
  }, combineObject({ collateralTokenPoolInfo, position }))


  // [config]
  const tradeConfig = { focusMode, slippage, isLong, isIncrease, inputToken, collateralToken, indexToken, leverage, collateralDelta, sizeDelta, collateralDeltaUsd, sizeDeltaUsd }



  const averagePrice = map(params => {
    if (params.position.averagePrice === 0n) {
      return 0n
    }

    if (params.sizeDeltaUsd === 0n) {
      return params.position.averagePrice
    }

    const pnl = getPnL(params.isLong, params.position.averagePrice, params.indexTokenPrice, params.position.size)
    // const adjustedPnlDelta = pnl < 0n ? params.sizeDeltaUsd * pnl / stake.size : pnl

    return getNextAveragePrice(params.isLong, params.position.size, params.indexTokenPrice, pnl, params.sizeDeltaUsd)
  }, combineObject({ position, isIncrease, indexTokenPrice, sizeDeltaUsd, isLong }))

  const liquidationPrice = skipRepeats(map(params => {
    const stake = params.position
    if (params.position.averagePrice === 0n) {
      if (params.sizeDeltaUsd === 0n) {
        return 0n
      }
      return getLiquidationPrice(params.isLong, params.collateralDeltaUsd, params.sizeDeltaUsd, params.indexTokenPrice)
    }

    const pnl = getPnL(params.isLong, stake.averagePrice, params.indexTokenPrice, stake.size)
    const entryPrice = stake.averagePrice
    const price = getNextLiquidationPrice(params.isLong, stake.size, stake.collateral, entryPrice, stake.entryFundingRate, params.collateralTokenPoolInfo.cumulativeRate, pnl, params.sizeDeltaUsd, params.collateralDeltaUsd)

    return price
  }, combineObject({ position, isIncrease, collateralDeltaUsd, collateralTokenPoolInfo, sizeDeltaUsd, averagePrice, indexTokenPrice, indexTokenDescription, isLong })))




  const requestTradeRow = map(res => {
    return [res]
  }, requestTrade)


  const isInputTokenApproved = replayLatest(multicast(mergeArray([
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

    }, collateralDeltaUsd, combineObject({ wallet, inputToken, isIncrease, route }))),
  ])))

  const availableIndexLiquidityUsd = tradeReader.getAvailableLiquidityUsd(indexToken, collateralToken)


  const accountOpenTradeList = map(params => {
    return Object.values(params.processData.mirrorPositionSlot).filter(pos => pos.route === params.route).map(p => p.position)
  }, combineObject({ processData: config.processData, route }))

  // const position = map(params => {
  //   return params.processData.mirrorPositionSlot[params.positionKey.key]
  // }, combineObject({ processData: config.processData, positionKey }))

  const openPositionList: Stream<IPositionSlot[]> = mergeArray([
    combineArray((pos, posList) => {

      if (pos.averagePrice === 0n || posList.length === 0) {
        return []
      }

      const trade = posList.find(t => t.key === pos.key) || null

      if (pos.averagePrice > 0n && trade === null) {
        const posSlot = createPositionSlot(unixTimestampNow(), '0x0' as const, pos as any, '0x00')

        return [posSlot, ...posList]
      }

      return pos.averagePrice === 0n
        ? posList.filter(t => t.key !== pos.key)
        : posList
    }, position, accountOpenTradeList)
  ])

  const activePosition = zip((tradeList, pos) => {
    const trade = tradeList.find(t => t.key === pos.key) || null
    return { trade, positionId: pos }
  }, openPositionList, positionKey)


  const pricefeed = map(params => {
    const feed = getIntervalIdentifier(params.indexToken, params.timeframe)

    return Object.values(params.processData.pricefeed[feed])
  }, combineObject({ timeframe: chartInterval, indexToken, processData: config.processData }))


  const focusPrice = replayLatest(multicast(changefocusPrice), null)
  const yAxisCoords = replayLatest(multicast(changeYAxisCoords), null)
  const isFocused = replayLatest(multicast(changeIsFocused), false)


  const tradeState = {
    route,

    position,
    collateralTokenPoolInfo,
    isTradingEnabled,
    isInputTokenApproved,
    availableIndexLiquidityUsd,

    inputTokenPrice,
    indexTokenPrice,
    collateralTokenPrice,
    collateralTokenDescription,
    indexTokenDescription,
    inputTokenDescription,
    fundingFee,
    marginFee,
    swapFee,
    averagePrice,
    liquidationPrice,
    executionFee,
    walletBalance,

    stableFundingRateFactor,
    fundingRateFactor,

    requestReset: clickResetPosition,
  }
  const $tradebox = $PositionEditor({
    ...config,
    openPositionList,
    tradeConfig,
    tradeState,
    $container: $column 
  })({
    leverage: changeLeverageTether(),
    switchIsIncrease: switchIsIncreaseTether(),
    changeCollateralDeltaUsd: changeCollateralDeltaUsdTether(),
    changeSizeDeltaUsd: changeSizeDeltaUsdTether(),
    changeInputToken: changeInputTokenTether(),
    changeCollateralToken: changeShortCollateralTokenTether(),
    changeIndexToken: changeIndexTokenTether(),
    switchIsLong: switchIsLongTether(),
    changeSlippage: changeSlippageTether(),
    switchFocusMode: switchFocusModeTether(),
    // switchFocusMode: 
  })


  const CONTAINER_WIDTH = 1240

  const $tradeMidContainer = $midContainer(layoutSheet.spacing, style({ flex: 1, maxWidth: `${CONTAINER_WIDTH}px` }))


  return [
    $column(screenUtils.isDesktopScreen ? style({  flex: 1 }) : style({  }))(

      $column(
        screenUtils.isDesktopScreen
          ? style({ 
            // paddingLeft: '26px'
          })
          : style({}),
        style({ height: 'min(650px, 60vh)', position: 'relative', backgroundColor: pallete.background }),
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
              value: {
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
                  return readableFixedBsp(rate)
                }, combineObject({ isLong, collateralTokenPoolInfo, stableFundingRateFactor, fundingRateFactor }))),
                $text(style({ color: pallete.foreground }))(' / hr')
              )
            ),
            $column(layoutSheet.spacingSmall)(
              $infoLabel('Available Liquidity'),
              $text(map(amountUsd => readableFixedUSD30(amountUsd), availableIndexLiquidityUsd))
            )
          ),

          screenUtils.isDesktopScreen
            ? $column(style({ position: 'absolute', pointerEvents: 'all', zIndex: 20, bottom: '40px', width: '440px', left: '0' }))(
              $tradebox,
            ) : empty(),
        ),

        switchLatest(snapshot( (params, pricefeed) => {

          const tf = params.timeframe

          const fst = pricefeed[pricefeed.length - 1]
          const initialTick = {
            open: formatFixed(fst.o, 30),
            high: formatFixed(fst.h, 30),
            low: formatFixed(fst.l, 30),
            close: formatFixed(fst.c, 30),
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
            data: pricefeed.map(({ o, h, l, c, blockTimestamp }) => {
              const open = formatFixed(o, 30)
              const high = formatFixed(h, 30)
              const low = formatFixed(l, 30)
              const close = formatFixed(c, 30)

              return { open, high, low, close, time: Number(blockTimestamp) as Time }
            }),
            seriesConfig: {
              priceLineColor: pallete.foreground,
              baseLineStyle: LineStyle.SparseDotted,

              upColor: pallete.middleground,
              borderUpColor: pallete.middleground,
              wickUpColor: pallete.middleground,

              downColor: 'transparent',
              borderDownColor: colorAlpha(pallete.middleground, .5),
              wickDownColor: colorAlpha(pallete.middleground, .5),
            },
            priceLines: [
              map(val => {
                if (val === 0n) {
                  return null
                }

                return {
                  price: formatFixed(val, 30),
                  color: pallete.middleground,
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
              const marketPrice = formatFixed(next.indexTokenPrice, 30)
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
            }, initialTick, combineObject({ indexTokenPrice, indexTokenDescription })),
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

              
        }, combineObject({ timeframe: chartInterval, indexToken }), pricefeed)),




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

      screenUtils.isMobileScreen
        ? $midContainer(style({ }))(
          $tradebox,
        )
        : empty(),

      $tradeMidContainer(layoutSheet.spacingSmall)(
        $IntermediateConnectButton({
          $$display: combine((params, w3p) => {

            const tokenDesc = getTokenDescription(params.activeTrade.positionId.indexToken)
            const route = params.activeTrade.positionId.isLong ? `Long-${tokenDesc.symbol}` : `Short-${tokenDesc.symbol}/${getTokenDescription(params.activeTrade.positionId.collateralToken).symbol}`

              
            const $notrade = !params.activeTrade.trade && $column(layoutSheet.spacingSmall, style({ flex: 1, alignItems: 'center', placeContent: 'center' }))(
              $text(style({ fontSize: '1.5rem' }))('Trade History'),
              $text(style({ color: pallete.foreground }))(
                `No active ${route} position`
              )
            )
              
              

            return $row(style({ flex: 1 }))(
              
              $PositionDetailsPanel({
                ...config,
                chain: config.chain,
                openPositionList,
                parentRoute: config.parentRoute,
                pricefeed,
                tradeConfig,
                wallet: w3p,
                tradeState,
                $container: $column(style({ width: '440px', borderRight: `1px solid ${colorAlpha(pallete.foreground, .20)}` }))
              })({
                clickResetPosition: clickResetPositionTether(),
                approveInputToken: changeInputTokenApprovedTether(),
                enableTrading: enableTradingTether(),
                requestTrade: requestTradeTether(),
                switchTrade: switchTradeTether(),
                leverage: changeLeverageTether(),
                // changeCollateralDeltaUsd: changeCollateralDeltaUsdTether(),
                // changeSizeDeltaUsd: changeSizeDeltaUsdTether(),
              }),
              $notrade || $CardTable({
                // $rowContainer: screenUtils.isDesktopScreen
                //   ? $row(layoutSheet.spacing, style({ padding: `2px 26px` }))
                //   : $row(layoutSheet.spacingSmall, style({ padding: `2px 10px` })),
                // headerCellOp: style({ padding: screenUtils.isDesktopScreen ? '15px 15px' : '6px 4px' }),
                // cellOp: style({ padding: screenUtils.isDesktopScreen ? '4px 15px' : '6px 4px' }),
                dataSource: mergeArray([
                  now(params.activeTrade ? [...params.activeTrade.trade.link.increaseList, ...params.activeTrade.trade.link.decreaseList] : []) as Stream<(IRequestTrade | IPositionIncrease | IPositionDecrease)[]>,
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
            )

          }, combineObject({ activeTrade: activePosition }))
        })({})
      )

    ),

    {
      changeRoute,
    }
  ]
})


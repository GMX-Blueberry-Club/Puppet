import { Behavior, combineArray, combineObject, O, replayLatest } from "@aelea/core"
import { $element, $node, $text, attr, component, INode, motion, MOTION_NO_WOBBLE, nodeEvent, style, styleBehavior, styleInline, stylePseudo } from "@aelea/dom"
import { Route } from "@aelea/router"
import { $column, $icon, $NumberTicker, $row, layoutSheet, screenUtils } from "@aelea/ui-components"
import { colorAlpha, pallete } from "@aelea/ui-components-theme"
import {
  awaitPromises, constant, delay, empty, map, merge, mergeArray,
  multicast, now, sample, skipRepeats, skipRepeatsWith, snapshot, startWith, switchLatest, zip
} from "@most/core"
import { Stream } from "@most/types"
import { erc20Abi } from "abitype/test"
import * as GMX from "gmx-middleware-const"
import {
  $alert, $alertTooltip, $anchor, $bear, $bull,
  $hintNumChange, $infoLabel, $infoLabeledValue, $infoTooltipLabel, $IntermediatePromise,
  $spinner, $tokenIconMap, $tokenLabelFromSummary
} from "gmx-middleware-ui-components"
import {
  abs, bnDiv, div, filterNull,
  formatBps,
  formatFixed,
  getAdjustedDelta, getDenominator,
  getNativeTokenDescription, getPnL, getTokenAmount, getTokenDescription, getTokenUsd,
  IPositionSlot, IPriceInterval,
  ITokenDescription,
  parseFixed, parseReadableNumber,
  readableFixedBsp,
  readableFixedUSD30,
  readableNumber,
  readableUnitAmount,
  safeDiv, StateStream, switchMap, zipState
} from "gmx-middleware-utils"
import { MouseEventParams } from "lightweight-charts"
import * as PUPPET from "puppet-middleware-const"
import * as viem from "viem"
import { arbitrum } from "viem/chains"
import { $IntermediateConnectButton } from "../$ConnectAccount"
import { $Popover } from "../$Popover"
import { $Slider } from "../$Slider"
import { $entry, $openPositionPnlBreakdown, $pnlValue, $sizeAndLiquidation } from "../../common/$common"
import { $card } from "../../elements/$common"
import { $caretDown } from "../../elements/$icons"
import { connectContract, wagmiWriteContract } from "../../logic/common"
import * as trade from "../../logic/trade"
import { resolveAddress } from "../../logic/utils"
import { account, IWalletClient } from "../../wallet/walletLink"
import { $ButtonPrimary, $ButtonPrimaryCtx, $ButtonSecondary, $defaultButtonPrimary, $defaultMiniButtonSecondary } from "../form/$Button"
import { $defaultSelectContainer, $Dropdown } from "../form/$Dropdown"
import { $TradePnlHistory } from "./$TradePnlHistory"
import { IGmxProcessSeed, latestTokenPrice } from "../../data/process/process"
import { getRouteTypeKey } from "puppet-middleware-const"
import { IPositionMirrorSlot } from "puppet-middleware-utils"



export enum ITradeFocusMode {
  collateral,
  size,
}

export interface ITradeParams {
  route: viem.Address | null

  position: trade.IPositionGetter
  isTradingEnabled: boolean
  isInputTokenApproved: boolean

  inputTokenPrice: bigint
  collateralTokenPrice: bigint
  availableIndexLiquidityUsd: bigint
  indexTokenPrice: bigint
  walletBalance: bigint

  executionFee: bigint
  swapFee: bigint
  marginFee: bigint
  fundingFee: bigint

  inputTokenDescription: ITokenDescription
  indexTokenDescription: ITokenDescription
  collateralTokenDescription: ITokenDescription

  averagePrice: bigint | null
  liquidationPrice: bigint | null

  collateralTokenPoolInfo: trade.ITokenPoolInfo
}

export interface ITradeConfig {
  isLong: boolean

  inputToken: viem.Address
  indexToken: viem.Address
  collateralToken: viem.Address

  isIncrease: boolean
  focusMode: ITradeFocusMode

  leverage: bigint

  collateralDelta: bigint
  sizeDelta: bigint

  sizeDeltaUsd: bigint
  collateralDeltaUsd: bigint

  slippage: string
}


export interface ITradeState extends ITradeConfig, ITradeParams {

}

export interface ITradeBoxParams {
  referralCode: viem.Hex
  tokenIndexMap: Partial<Record<number, viem.Address[]>>
  tokenStableMap: Partial<Record<number, viem.Address[]>>
  parentRoute: Route
  chain: typeof arbitrum
  processData: Stream<IGmxProcessSeed>
}

interface ITradeBox extends ITradeBoxParams {
  openTradeListQuery: Stream<Promise<IPositionSlot[]>>

  pricefeed: Stream<IPriceInterval[]>
  tradeConfig: StateStream<ITradeConfig> // ITradeParams
  tradeState: StateStream<ITradeParams>

  trade: Stream<Promise<IPositionSlot | null>>
}

export type IRequestTradeParams = ITradeConfig & { wallet: IWalletClient }
export type IRequestTrade = IRequestTradeParams & {
  executionFee: bigint,
  indexTokenPrice: bigint,
  acceptablePrice: bigint,
  swapRoute: string[],
  request: Promise<viem.TransactionReceipt>,
}

const BOX_SPACING = 20
const LIMIT_LEVERAGE_NORMAL = formatBps(GMX.LIMIT_LEVERAGE)
const MIN_LEVERAGE_NORMAL = formatBps(GMX.MIN_LEVERAGE) / LIMIT_LEVERAGE_NORMAL

export const $TradeBox = (config: ITradeBox) => component((
  [openEnableTradingPopover, openEnableTradingPopoverTether]: Behavior<any, any>,

  [enableTradingPlugin, enableTradingPluginTether]: Behavior<PointerEvent, PointerEvent>,
  [approveTrading, approveTradingTether]: Behavior<PointerEvent, true>,

  [clickApproveInputToken, clickApproveInputTokenTether]: Behavior<PointerEvent, { route: viem.Address, inputToken: viem.Address }>,

  [dismissEnableTradingOverlay, dismissEnableTradingOverlayTether]: Behavior<false, false>,

  [switchIsLong, switchIsLongTether]: Behavior<boolean, boolean>,

  [switchFocusMode, switchFocusModeTether]: Behavior<any, ITradeFocusMode>,

  [inputCollateralDeltaUsd, inputCollateralDeltaTetherUsd]: Behavior<INode, bigint>,
  [inputSizeDeltaUsd, inputSizeDeltaTetherUsd]: Behavior<INode, bigint>,

  [changeInputToken, changeInputTokenTether]: Behavior<viem.Address, viem.Address>,
  [changeIndexToken, changeIndexTokenTether]: Behavior<viem.Address, viem.Address>,
  [changeCollateralToken, changeCollateralTokenTether]: Behavior<viem.Address>,

  [switchIsIncrease, switchisIncreaseTether]: Behavior<boolean, boolean>,
  [slideLeverage, slideLeverageTether]: Behavior<number, bigint>,
  [changeSlippage, changeSlippageTether]: Behavior<string, string>,

  [clickProposeTrade, clickProposeTradeTether]: Behavior<PointerEvent, IWalletClient>,

  [crosshairMove, crosshairMoveTether]: Behavior<MouseEventParams, MouseEventParams>,
  [clickResetTradeMode, clickResetTradeModeTether]: Behavior<any, any>,
  [clickMax, clickMaxTether]: Behavior<PointerEvent, any>,
  [clickClose, clickCloseTether]: Behavior<PointerEvent, bigint>,
  [changeRoute, changeRouteTether]: Behavior<string, string>,

  [switchTrade, switchTradeTether]: Behavior<any, IPositionSlot>,


) => {


  const tradeReader = trade.connectTrade(config.chain)
  const pricefeed = connectContract(GMX.CONTRACT[config.chain.id].VaultPriceFeed)
  const router = connectContract(GMX.CONTRACT[config.chain.id].Router)
  const vault = connectContract(GMX.CONTRACT[config.chain.id].Vault)


  const positionRouterAddress = GMX.CONTRACT[config.chain.id].PositionRouter.address

  const { collateralDeltaUsd, collateralToken, collateralDelta, sizeDelta, focusMode, indexToken, inputToken, isIncrease, isLong, leverage, sizeDeltaUsd, slippage } = config.tradeConfig
  const {
    availableIndexLiquidityUsd, averagePrice, collateralTokenDescription,
    collateralTokenPoolInfo, collateralTokenPrice, executionFee, fundingFee,
    indexTokenDescription, indexTokenPrice, inputTokenDescription, inputTokenPrice,
    isInputTokenApproved, isTradingEnabled, liquidationPrice, marginFee, route,
    position, swapFee, walletBalance
  } = config.tradeState


  const walletBalanceUsd = skipRepeats(combineArray(params => {
    const amountUsd = getTokenUsd(params.walletBalance, params.inputTokenPrice, params.inputTokenDescription.decimals)

    return params.inputToken === GMX.AddressZero ? amountUsd - GMX.DEDUCT_USD_FOR_GAS : amountUsd
  }, combineObject({ walletBalance, inputTokenPrice, inputToken, inputTokenDescription })))



  const validationError = skipRepeats(map((state) => {

    if (state.leverage > GMX.LIMIT_LEVERAGE) {
      return `Leverage exceeds ${formatBps(GMX.LIMIT_LEVERAGE)}x`
    }

    if (state.isIncrease) {
      if (state.sizeDeltaUsd > state.availableIndexLiquidityUsd) {
        return `Not enough liquidity. current capcity ${readableFixedUSD30(state.availableIndexLiquidityUsd)}`
      }

      if (state.isIncrease ? state.collateralDelta > state.walletBalance : state.collateralDeltaUsd > state.walletBalanceUsd) {
        return `Not enough ${state.inputTokenDescription.symbol} in connected account`
      }

      if (state.leverage < GMX.MIN_LEVERAGE) {
        return `Leverage below 1.1x`
      }

      if (state.position.averagePrice === 0n && state.collateralDeltaUsd < 10n ** 30n * 10n) {
        return `Min 10 Collateral required`
      }
    } else {

      if (state.position.averagePrice > 0n && state.inputToken !== state.collateralToken) {
        const delta = getPnL(state.isLong, state.position.averagePrice, state.indexTokenPrice, -state.sizeDeltaUsd)
        const adjustedSizeDelta = safeDiv(abs(state.sizeDeltaUsd) * delta, state.position.size)
        const fees = state.swapFee + state.marginFee
        const collateralDelta = -state.sizeDeltaUsd === state.position.size
          ? state.position.collateral - state.fundingFee
          : -state.collateralDeltaUsd

        const totalOut = collateralDelta + adjustedSizeDelta - fees

        const nextUsdgAmount = totalOut * getDenominator(GMX.USDG_DECIMALS) / GMX.USD_PERCISION
        if (state.collateralTokenPoolInfo.usdgAmounts + nextUsdgAmount > state.collateralTokenPoolInfo.maxUsdgAmounts) {
          return `${state.collateralTokenDescription.symbol} pool exceeded, you cannot receive ${state.inputTokenDescription.symbol}, switch to ${state.collateralTokenDescription.symbol} in the first input token switcher`
        }
      }

    }

    if (!state.isIncrease && state.position.averagePrice === 0n) {
      return `No ${state.indexTokenDescription.symbol} position to reduce`
    }

    if (state.position.averagePrice > 0n && state.liquidationPrice && (state.isLong ? state.liquidationPrice > state.indexTokenPrice : state.liquidationPrice < state.indexTokenPrice)) {
      return `Exceeding liquidation price`
    }

    return null
  }, combineObject({
    leverage, position, swapFee, marginFee, fundingFee, liquidationPrice, walletBalance,
    walletBalanceUsd, isIncrease, indexTokenPrice, collateralDelta, collateralDeltaUsd, inputTokenDescription,
    collateralToken, sizeDeltaUsd, availableIndexLiquidityUsd, inputToken, collateralTokenPoolInfo,
    collateralTokenDescription, indexTokenDescription, isLong,
  })))



  const pnlCrossHairTimeChange = replayLatest(multicast(startWith(null, skipRepeatsWith(((xsx, xsy) => xsx.time === xsy.time), crosshairMove))))

  const pnlCrossHairTime = map((cross: MouseEventParams) => {
    if (cross) {
      return cross.seriesData.values().next().value
    }

    return null
  }, pnlCrossHairTimeChange)

  const resetTrade = constant(0n, mergeArray([delay(50, config.tradeState.position), clickResetTradeMode]))


  const clickMaxCollateralUsd = snapshot(state => {
    if (state.isIncrease) {
      return state.walletBalanceUsd
    }

    if (state.position.averagePrice === 0n) {
      return 0n
    }

    const collateral = div(state.position.size, GMX.LIMIT_LEVERAGE)
    const deltaUsd = collateral - state.position.collateral - state.position.entryFundingRate

    return deltaUsd
  }, combineObject({ isIncrease, walletBalanceUsd, position }), clickMax)


  const inTradeMode = replayLatest(multicast(skipRepeats(combineArray((sizeDeltaUsd, collateralDeltaUsd) => {
    if (sizeDeltaUsd === 0n && collateralDeltaUsd === 0n) {
      return false
    }

    return true
  }, config.tradeConfig.sizeDeltaUsd, config.tradeConfig.collateralDeltaUsd))))

  const inputTokenChange = snapshot((collateralDeltaUsd, params) => {
    return collateralDeltaUsd
  }, config.tradeConfig.collateralDeltaUsd, zipState({ inputDesc: config.tradeState.inputTokenDescription, price: config.tradeState.inputTokenPrice }))


  const effectCollateral = switchLatest(map((focus) => {
    if (focus === ITradeFocusMode.collateral) {
      return empty()
    }

    const effects = mergeArray([config.tradeConfig.leverage, config.tradeState.inputTokenPrice])
    return sample(config.tradeConfig.sizeDeltaUsd, effects)
  }, config.tradeConfig.focusMode))


  const autoFillCollateralUsd = mergeArray([
    clickMaxCollateralUsd,
    resetTrade,
    skipRepeats(snapshot((state, sizeDeltaUsd) => {
      const size = sizeDeltaUsd + state.position.size
      const collateral = div(size, state.leverage)
      const positionCollateral = state.position.collateral - state.fundingFee
      const collateralDelta = collateral - positionCollateral


      if (state.position.size > 0n) {
        const currentMultiplier = div(size, positionCollateral)
        const nextMultiplier = div(size, positionCollateral + collateralDelta)

        const multiplierDelta = state.isIncrease ? currentMultiplier - nextMultiplier : nextMultiplier - currentMultiplier

        if (multiplierDelta < 100n) {
          return 0n
        }
      }

      const totalCollateral = collateralDelta + state.swapFee + state.marginFee

      // if (state.isIncrease && totalCollateral > state.walletBalanceUsd) {
      //   return state.walletBalanceUsd
      // }

      return totalCollateral
    }, combineObject({ position, leverage, fundingFee, walletBalanceUsd, isIncrease, swapFee, marginFee }), mergeArray([inputSizeDeltaUsd, effectCollateral])))
  ])


  const effectSize = switchLatest(map((focus) => {
    if (focus === ITradeFocusMode.size) {
      return empty()
    }

    const effects = mergeArray([config.tradeConfig.leverage, config.tradeState.indexTokenPrice])
    return sample(config.tradeConfig.collateralDeltaUsd, effects)
  }, config.tradeConfig.focusMode))

  const autoFillSizeUsd = mergeArray([
    resetTrade,
    skipRepeats(filterNull(snapshot((state, collateralDeltaUsd) => {
      const positionCollateral = state.position.collateral - state.fundingFee

      const totalCollateral = collateralDeltaUsd + positionCollateral - state.swapFee
      const delta = (totalCollateral * state.leverage / GMX.BASIS_POINTS_DIVISOR - state.position.size) * GMX.BASIS_POINTS_DIVISOR


      if (state.position.size > 0n) {
        const minMultiplier = div(state.position.size, totalCollateral)
        const multiplierDelta = state.isIncrease ? state.leverage - minMultiplier : minMultiplier - state.leverage

        if (multiplierDelta < 100n) {
          return 0n
        }
      }


      if (!state.isIncrease && state.leverage <= GMX.MIN_LEVERAGE) {
        return -state.position.size
      }

      const toNumerator = delta * GMX.BASIS_POINTS_DIVISOR
      const toDenominator = GMX.MARGIN_FEE_BASIS_POINTS * state.leverage + GMX.BASIS_POINTS_DIVISOR * GMX.BASIS_POINTS_DIVISOR

      const deltaAfterFees = toNumerator / toDenominator
      return deltaAfterFees
    }, combineObject({ leverage, position, fundingFee, swapFee, isIncrease }), mergeArray([inputCollateralDeltaUsd, effectSize, clickMaxCollateralUsd]))))
  ])

  const autoFillCollateralToken = snapshot((state, amountUsd) => {
    return getTokenAmount(amountUsd, state.inputTokenPrice, state.inputTokenDescription.decimals)
  }, combineObject({ inputTokenDescription, inputTokenPrice }), autoFillCollateralUsd)

  const autoFillSizeToken = snapshot((state, amountUsd) => {
    return getTokenAmount(amountUsd, state.indexTokenPrice, state.indexTokenDescription.decimals)
  }, combineObject({ indexTokenDescription, indexTokenPrice }), autoFillSizeUsd)


  const $defualtSelectContainer = $row(
    style({ width: '95px', cursor: 'pointer', position: 'relative', alignSelf: 'center', border: `1px solid ${pallete.middleground}`, borderRadius: '12px' }),
    stylePseudo(':hover', { borderColor: `${pallete.primary}` })
  )
  const $defaultSelectionContainer = $row(layoutSheet.spacingTiny, style({ alignItems: 'center', flex: 1, padding: '6px 10px' }))

  const requestTradeParams = snapshot((config, wallet): IRequestTradeParams => {
    return { ...config, wallet }
  }, combineObject(config.tradeConfig), clickProposeTrade)


  const requestTrade: Stream<IRequestTrade> = multicast(snapshot((params, req) => {

    const resolvedInputAddress = resolveAddress(config.chain.id, req.inputToken)
    const from = req.isIncrease ? resolvedInputAddress : req.isLong ? req.indexToken : req.collateralToken
    const to = req.isIncrease ? req.isLong ? req.indexToken : req.collateralToken : resolvedInputAddress

    const swapRoute = from === to ? [to] : [from, to]

    const slippageN = BigInt(Number(req.slippage) * 100)
    const allowedSlippage = req.isLong
      ? req.isIncrease
        ? slippageN : -slippageN
      : req.isIncrease
        ? -slippageN : slippageN

    const priceBasisPoints = GMX.BASIS_POINTS_DIVISOR + allowedSlippage

    const acceptablePrice = params.indexTokenPrice * priceBasisPoints / GMX.BASIS_POINTS_DIVISOR

    const isNative = req.inputToken === GMX.AddressZero


    const swapParams = {
      amount: req.collateralDelta,
      minOut: 0n,
      path: swapRoute
    }
    const tradeParams = {
      acceptablePrice,
      amountIn: 0n,
      collateralDelta: req.collateralDelta,
      minOut: 0n,
      sizeDelta: abs(req.sizeDeltaUsd)
    }

    const value = isNative ? params.executionFee + req.collateralDelta : params.executionFee

    const request = params.route
      ? wagmiWriteContract({
        ...PUPPET.CONTRACT[config.chain.id].Orchestrator,
        functionName: 'requestPosition',
        value,
        args: [
          tradeParams,
          swapParams,
          getRouteTypeKey(req.collateralToken, req.indexToken, req.isLong),
          params.executionFee,
          req.isIncrease
        ]
      })
      : wagmiWriteContract({
        ...PUPPET.CONTRACT[config.chain.id].Orchestrator,
        value,
        functionName: 'registerRouteAndRequestPosition',
        args: [
          tradeParams,
          swapParams,
          params.executionFee,
          req.collateralToken,
          req.indexToken,
          req.isLong
        ]
      })


    return { ...params, ...req, acceptablePrice, request, swapRoute }
  }, combineObject({ executionFee, indexTokenPrice, route }), requestTradeParams))

  const requestTradeError = filterNull(awaitPromises(map(async req => {
    try {
      await req.request
      return null
    } catch (err) {

      if (err instanceof viem.ContractFunctionExecutionError && err.cause instanceof viem.ContractFunctionRevertedError) {
        return String(err.cause.reason)
      }

      return null
    }
  }, requestTrade)))


  const requestEnablePlugin = multicast(map(async () => {
    const recpt = wagmiWriteContract({
      ...GMX.CONTRACT[config.chain.id].Router,
      functionName: 'approvePlugin',
      args: [positionRouterAddress],
      value: undefined
    })
    return recpt
  }, enableTradingPlugin))

  const requestApproveSpend = multicast(map(params => {
    const recpt = wagmiWriteContract({
      address: params.inputToken,
      abi: erc20Abi,
      functionName: 'approve',
      args: [params.route, 2n ** 256n - 1n]
    })
    return recpt
  }, clickApproveInputToken))

  return [
    $card(style({ backgroundColor: 'transparent', flexDirection: screenUtils.isDesktopScreen ? 'column' : 'column-reverse', padding: 0, gap: 0 }))(
      // $row(
      //   // styleInline(map(isIncrease => isIncrease ? { borderColor: 'none' } : {}, config.tradeConfig.isIncrease)),
      //   style({
      //     padding: '0 16px 15px',
      //     marginBottom: `-${BOX_SPACING}px`,
      //     paddingBottom: `${BOX_SPACING}px`,
      //     placeContent: 'space-between',
      //     alignItems: 'center',
      //     // backgroundColor: pallete.horizon,
      //     border: `1px solid ${colorAlpha(pallete.foreground, .20)}`,
      //     // borderTop: 'none',
      //     borderRadius: `${BOX_SPACING}px ${BOX_SPACING}px 0px 0px`,
      //   })
      // )(



      //   // $row(layoutSheet.spacingSmall, style({ alignItems: 'center' }))(
      //   //   style({ padding: '2px', fontSize: '.85rem' })(
      //   //     $ButtonSecondary({
      //   //       $content: $icon({ $content: $xCross, width: '24px', svgOps: style({ padding: '4px' }), viewBox: '0 0 32 32' })
      //   //     })({
      //   //       click: clickResetTradeModeTether()
      //   //     })
      //   //   ),
      //   //   $text(style({ fontWeight: 'bold' }))(map(state => {
      //   //     if (state.position.averagePrice > 0n) {
      //   //       return state.isIncrease ? 'Increase' : 'Decrease'
      //   //     }

      //   //     return 'Open'
      //   //   }, combineObject({ position, isIncrease }))),
      //   // ),

      //   // $Popover({
      //   //   $target: $row(clickOpenTradeConfigTether(nodeEvent('click')), style({ padding: '6px 12px', border: `2px solid ${pallete.horizon}`, borderRadius: '30px' }))(
      //   //     $text('Advanced'),
      //   //     $icon({ $content: $caretDown, width: '14px', svgOps: style({ marginRight: '-5px' }), viewBox: '0 0 32 32' }),
      //   //   ),
      //   //   $popContent: map((_) => {
      //   //     return $text('fff')
      //   //   }, clickOpenTradeConfig),
      //   // })({
      //   //   // overlayClick: clickPopoverClaimTether()
      //   // })

      //   $ButtonToggle({
      //     $container: $row(layoutSheet.spacingSmall),
      //     selected: config.tradeConfig.isLong,
      //     options: [
      //       true,
      //       false,
      //     ],
      //     $$option: map(isLong => {
      //       return $row(layoutSheet.spacingTiny, style({ alignItems: 'center' }))(
      //         $icon({ $content: isLong ? $bull : $bear, width: '18px', viewBox: '0 0 32 32' }),
      //         $text(isLong ? 'Long' : 'Short'),
      //       )
      //     })
      //   })({ select: switchIsLongTether() }),

      //   $ButtonToggle({
      //     $container: $row(layoutSheet.spacingSmall),
      //     selected: config.tradeConfig.isIncrease,
      //     options: [
      //       true,
      //       false,
      //     ],
      //     $$option: map(option => {
      //       return $text(style({}))(option ? 'Deposit' : 'Withdraw')
      //     })
      //   })({ select: switchisIncreaseTether() }),

      // ),

      $column(style({ backgroundColor: pallete.background, borderRadius: `${BOX_SPACING}px` }))(
        $column(layoutSheet.spacingSmall, style({ padding: '16px', borderRadius: '20px 20px 0 0', border: `1px solid ${colorAlpha(pallete.foreground, .20)}` }),
          styleInline(now({ borderBottom: 'none' })),
          styleInline(combineArray((focus, isIncrease) => {
            return focus === ITradeFocusMode.collateral ? { borderColor: isIncrease ? `${pallete.middleground}` : `${pallete.indeterminate}` } : { borderColor: '' }
          }, config.tradeConfig.focusMode, config.tradeConfig.isIncrease))
        )(
          $row(layoutSheet.spacingSmall, style({ placeContent: 'space-between' }))(
            // $row(
            //   layoutSheet.spacingTiny,
            //   clickMaxTether(nodeEvent('click'))
            // )(
            //   style({ flexDirection: 'row-reverse' })($hintNumChange({
            //     label: `Wallet`,
            //     change: map(state => {
            //       const change = state.walletBalance + -state.collateralDelta
            //       return readableNumber(formatFixed(change, state.inputTokenDescription.decimals)) + (screenUtils.isDesktopScreen ? ` ${state.inputTokenDescription.symbol}` : '')
            //     }, tradeState),
            //     isIncrease: map(isIncrease => !isIncrease, config.tradeConfig.isIncrease),
            //     val: zip((tokenDesc, balance) => {
            //       return readableNumber(formatFixed(balance, tokenDesc.decimals)) + (screenUtils.isDesktopScreen ? ` ${tokenDesc.symbol}` : '')
            //     }, config.tradeState.inputTokenDescription, config.tradeState.walletBalance)
            //   })),
            // ),
            $row(layoutSheet.spacingSmall, style({ alignItems: 'center' }))(
              $infoLabel(`Wallet`),
              $text(
                map(params => {
                  const newLocal = formatFixed(params.walletBalance, params.inputTokenDescription.decimals)
                  const newLocal_1 = readableNumber({})(newLocal)
                  
                  return newLocal_1 + ' ' + params.inputTokenDescription.symbol
                }, combineObject({ inputToken, walletBalance, inputTokenDescription }))
              ),
            ),
            $hintNumChange({
              label: screenUtils.isDesktopScreen ? `Collateral` : undefined,
              change: combineArray(state => {
                const posCollateral = state.position.collateral - state.fundingFee
                const totalCollateral = posCollateral + state.collateralDeltaUsd - state.swapFee - state.marginFee

                if (state.isIncrease) {
                  return readableFixedUSD30(totalCollateral)
                }

                if (state.position.averagePrice === 0n) {
                  return readableFixedUSD30(0n)
                }

                const pnl = getPnL(state.isLong, state.position.averagePrice, state.indexTokenPrice, state.position.size)

                if (state.position.size === abs(state.sizeDeltaUsd)) {
                  return 0n
                }

                const adjustedPnlDelta = pnl < 0n && !state.isIncrease
                  ? getAdjustedDelta(state.position.size, abs(state.sizeDeltaUsd), pnl)
                  : 0n

                const netCollateral = totalCollateral + adjustedPnlDelta

                return readableFixedUSD30(netCollateral)
              }, combineObject({ sizeDeltaUsd, position, indexTokenPrice, isIncrease, collateralDeltaUsd, swapFee, marginFee, isLong, fundingFee })),
              isIncrease: config.tradeConfig.isIncrease,
              tooltip: 'The amount deposited to maintain a leverage position',
              val: combineArray((pos, fundingFee) => readableFixedUSD30(pos.collateral - fundingFee), config.tradeState.position, config.tradeState.fundingFee),
            }),
          ),
          $row(layoutSheet.spacingSmall, style({ alignItems: 'center' }))(

            $Dropdown({
              $container: $defualtSelectContainer,
              $selection: switchLatest(combineArray((isIncrease) => {
                return $defaultSelectionContainer(
                  // $icon({
                  //   $content: $bagOfCoins,
                  //   svgOps: styleBehavior(map(isIncrease => ({ fill: isIncrease ? pallete.message : pallete.indeterminate }), config.tradeConfig.isIncrease)),
                  //   width: '18px', viewBox: '0 0 32 32'
                  // }),
                  $text(style({ flex: 1 }))(isIncrease ? 'Increase' : 'Decrease'),
                  // $WalletLogoMap[wallet?.walletName || IWalletName.none],
                  // $icon({ $content: isIncrease ? $walletConnectLogo : $walletConnectLogo, width: '18px', viewBox: '0 0 32 32' }),

                  $icon({ $content: $caretDown, width: '14px', viewBox: '0 0 32 32' }),
                )
              }, config.tradeConfig.isIncrease)),
              value: {
                value: config.tradeConfig.isIncrease,
                $$option: map((isIncrease) => {
                  return $text(style({ fontSize: '.85rem' }))(isIncrease ? 'Increase' : 'Decrease')
                }),
                list: [
                  true,
                  false,
                ],
              }
            })({
              select: switchisIncreaseTether()
            }),
            switchLatest(map(params => {

              const address = params.account.address
              if (!config.chain.id || !address) {
                return empty()
              }

              const chainId = config.chain.id

              return $Dropdown({
                $container: $row(style({ position: 'relative', alignSelf: 'center' })),
                $selection: switchLatest(map(option => {
                  return $row(layoutSheet.spacingTiny, style({ alignItems: 'center', cursor: 'pointer' }))(
                    $icon({
                      $content: $tokenIconMap[option.symbol],
                      svgOps: styleBehavior(map(isIncrease => ({ fill: isIncrease ? pallete.message : pallete.indeterminate }), config.tradeConfig.isIncrease)),
                      width: '34px', viewBox: '0 0 32 32'
                    }),
                    // $text(option.symbol),
                    $icon({ $content: $caretDown, width: '14px', svgOps: style({ marginTop: '3px' }), viewBox: '0 0 32 32' }),
                  )
                }, config.tradeState.inputTokenDescription)),
                value: {
                  value: config.tradeConfig.inputToken,
                  $container: $defaultSelectContainer(style({ minWidth: '290px', left: 0 })),
                  $$option: map(option => {
                    const token = resolveAddress(chainId, option)
                    const balanceAmount = trade.getErc20Balance(config.chain, option, address)
                    const price = pricefeed.read('getPrimaryPrice', token, false)
                    const tokenDesc = option === GMX.AddressZero ? getNativeTokenDescription(chainId) : getTokenDescription(option)

                    return $row(style({ placeContent: 'space-between', flex: 1 }))(
                      $tokenLabelFromSummary(tokenDesc),
                      $column(style({ alignItems: 'flex-end' }))(
                        $text(style({ whiteSpace: 'nowrap' }))(map(bn => readableUnitAmount(formatFixed(bn, tokenDesc.decimals)) + ` ${tokenDesc.symbol}`, balanceAmount)),
                        $text(style({}))(combineArray((bn, price) => {
                          return readableFixedUSD30(getTokenUsd(bn, price, tokenDesc.decimals))
                        }, balanceAmount, price)),
                      )
                    )
                  }),
                  list: [
                    GMX.AddressZero,
                    ...config.tokenIndexMap[chainId] || [],
                    ...config.tokenStableMap[chainId] || [],
                  ],
                }
              })({
                select: changeInputTokenTether()
              })
            }, combineObject({ account }))),

            switchMap(isIncrease => {

              if (isIncrease) {
                return $ButtonSecondary({
                  $content: $text('Max'),
                  $container: $defaultMiniButtonSecondary(
                    styleBehavior(
                      map(params => {
                        if (params.collateralDelta > 0n || params.sizeDelta > 0n) {
                          return { display: 'none' }
                        }

                        return null
                      }, combineObject({ collateralDelta, sizeDelta }))
                    )
                  )
                })({
                  click: clickMaxTether(
                    delay(10)
                  )
                })
              }

              return $ButtonSecondary({
                $content: $text('Close'),
                $container: $defaultMiniButtonSecondary(
                  styleBehavior(
                    map(params => {
                      if (abs(params.sizeDeltaUsd) === params.position.size) {
                        return { display: 'none' }
                      }

                      return null
                    }, combineObject({ sizeDeltaUsd, position }))
                  )
                )
              })({
                click: clickCloseTether(
                  delay(10),
                  constant(0n)
                )
              })
            }, isIncrease),

            // $ButtonToggle({
            //   $container: $row(layoutSheet.spacingSmall),
            //   selected: config.tradeConfig.isIncrease,
            //   options: [
            //     true,
            //     false,
            //   ],
            //   $$option: map(option => {
            //     return $text(style({}))(option ? 'Deposit' : 'Withdraw')
            //   })
            // })({ select: switchisIncreaseTether() }),

            $field(
              O(
                map(node =>
                  merge(
                    now(node),
                    filterNull(snapshot((state, val) => {
                      if (val === 0n) {
                        node.element.value = ''
                      } else {
                        const formatted = formatFixed(val, state.inputTokenDescription.decimals)

                        node.element.value = readableUnitAmount(formatted)
                      }

                      return null
                    }, combineObject({ inputTokenDescription }), autoFillCollateralToken))
                  )
                ),
                switchLatest
              ),
              styleInline(map(focus => focus === ITradeFocusMode.collateral ? { color: pallete.message } : { color: pallete.foreground }, config.tradeConfig.focusMode)),
              switchFocusModeTether(nodeEvent('focus'), constant(ITradeFocusMode.collateral)),
              inputCollateralDeltaTetherUsd(nodeEvent('input'), src => snapshot((state, inputEvent) => {
                const target = inputEvent.target

                if (!(target instanceof HTMLInputElement)) {
                  console.warn(new Error('Target is not type of input'))
                  return 0n
                }

                if (target.value === '') {
                  return 0n
                }

                const val = parseReadableNumber(target.value)
                const parsedInput = parseFixed(val, state.inputTokenDescription.decimals)
                return getTokenUsd(parsedInput, state.inputTokenPrice, state.inputTokenDescription.decimals)
              }, combineObject({ inputTokenDescription, inputTokenPrice }), src)),
            )(),
          ),
        ),

        $column(style({ height: `2px`, placeContent: 'center' }))(
          $Slider({
            value: map(leverage => {
              if (leverage === null) {
                return 0
              }

              const multiplier = bnDiv(leverage, GMX.LIMIT_LEVERAGE)

              return multiplier
            }, config.tradeConfig.leverage),
            // disabled: map(state => {

            //   if (state.trade === null) {
            //     return !state.isIncrease || state.collateralDelta === 0n
            //   }

            //   return false
            // }, tradeState),
            color: map(isIncrease => isIncrease ? pallete.middleground : pallete.indeterminate, config.tradeConfig.isIncrease),
            min: map((state) => {
              if (state.isIncrease) {
                if (state.position.averagePrice > 0n) {

                  if (state.focusMode === ITradeFocusMode.size) {
                    const ratio = div(state.position.size + state.sizeDeltaUsd, state.walletBalanceUsd + state.position.collateral - state.fundingFee)
                    return bnDiv(ratio, GMX.LIMIT_LEVERAGE)
                  }
                  const totalCollateral = state.collateralDeltaUsd + state.position.collateral - state.fundingFee

                  return Math.max(MIN_LEVERAGE_NORMAL, bnDiv(div(state.position.size, totalCollateral), GMX.LIMIT_LEVERAGE))
                }

                return MIN_LEVERAGE_NORMAL
              }

              if (state.focusMode === ITradeFocusMode.size) {
                const totalSize = state.sizeDeltaUsd + state.position.size

                if (state.position.averagePrice > 0n) {
                  return bnDiv(div(totalSize, state.position.collateral - state.fundingFee), GMX.LIMIT_LEVERAGE)
                }

                return 0
              }



              return 0
            }, combineObject({ sizeDeltaUsd, walletBalanceUsd, position, collateralDeltaUsd, fundingFee, focusMode, isIncrease })),
            max: map(state => {

              if (state.position.averagePrice === 0n) {
                return 1
              }


              const totalSize = state.position.size + state.sizeDeltaUsd

              if (state.isIncrease) {
                if (state.focusMode === ITradeFocusMode.size) {

                  // return 1
                  const ratio = div(totalSize, state.position.collateral - state.fundingFee)
                  const newLocal = bnDiv(ratio, GMX.LIMIT_LEVERAGE)
                  return Math.min(1, newLocal)
                }

                return 1
              } else {
                if (state.focusMode === ITradeFocusMode.collateral) {
                  const totalCollateral = state.position.collateral - state.fundingFee + state.collateralDeltaUsd
                  const ratio = div(state.position.size, totalCollateral)

                  return Math.min(1, bnDiv(ratio, GMX.LIMIT_LEVERAGE))
                }
              }

              return 1
            }, combineObject({ position, fundingFee, collateralDeltaUsd, sizeDeltaUsd, focusMode, isIncrease })),
            thumbText: map(n => (n === 1 ? '100' : formatLeverageNumber.format(n * LIMIT_LEVERAGE_NORMAL)) + '\nx')
          })({
            change: slideLeverageTether(
              map(leverage => {
                const leverageRatio = BigInt(Math.round(Math.abs(leverage) * Number(GMX.LIMIT_LEVERAGE)))

                return leverageRatio
              }),
              multicast,
              skipRepeats
            )
          }),
        ),


        $column(layoutSheet.spacingSmall, style({ padding: '16px', borderRadius: '0 0 20px 20px', border: `1px solid ${colorAlpha(pallete.foreground, .20)}` }),
          styleInline(now({ borderTopStyle: 'none' })),
          // style({ backgroundColor: pallete.horizon, padding: '12px', border: `1px solid ${colorAlpha(pallete.foreground, .20)}` }),

          styleInline(map(params => {
            const borderColor = params.focusMode === ITradeFocusMode.size
              ? params.isIncrease
                ? `${pallete.middleground}`
                : `${pallete.indeterminate}`
              : ''
            return { borderColor }
          }, combineObject({ focusMode, isIncrease })))
        )(
          $row(layoutSheet.spacingSmall, style({ alignItems: 'center' }))(


            $Dropdown({
              $container: $defualtSelectContainer,
              $selection: switchLatest(map(isLong => {
                return $defaultSelectionContainer(
                  $icon({ $content: isLong ? $bull : $bear, width: '18px', svgOps: style({ padding: '2px' }), viewBox: '0 0 32 32' }),
                  $text(style({ flex: 1 }))(isLong ? 'Long' : 'Short'),
                  $icon({ $content: $caretDown, width: '14px', viewBox: '0 0 32 32' }),
                )
              }, config.tradeConfig.isLong)),
              value: {
                value: config.tradeConfig.isLong,
                $$option: map((isLong) => {
                  return $row(layoutSheet.spacingSmall, style({ alignItems: 'center' }))(
                    $icon({ $content: isLong ? $bull : $bear, width: '18px', viewBox: '0 0 32 32' }),
                    $text(isLong ? 'Long' : 'Short'),
                  )
                }),
                list: [
                  true,
                  false,
                ],
              }
            })({
              select: switchIsLongTether()
            }),

            $Dropdown({
              $container: $row(style({ position: 'relative', alignSelf: 'center' })),
              $selection: switchLatest(map(option => {
                const tokenDesc = getTokenDescription(option)

                return $row(layoutSheet.spacingTiny, style({ alignItems: 'center', cursor: 'pointer' }))(
                  $icon({ $content: $tokenIconMap[tokenDesc.symbol], width: '34px', viewBox: '0 0 32 32' }),
                  $icon({ $content: $caretDown, width: '14px', svgOps: style({ marginTop: '3px' }), viewBox: '0 0 32 32' }),
                )
              }, config.tradeConfig.indexToken)),
              value: {
                value: config.tradeConfig.indexToken,
                $container: $defaultSelectContainer(style({ minWidth: '290px', right: 0 })),
                $$option: map((option) => {
                  const tokenDesc = getTokenDescription(option)
                  const liquidity = tradeReader.getAvailableLiquidityUsd(now(option), config.tradeConfig.collateralToken)
                  const poolInfo = tradeReader.getTokenPoolInfo(now(option))

                  return $row(style({ placeContent: 'space-between', flex: 1 }))(
                    $tokenLabelFromSummary(tokenDesc),

                    $column(layoutSheet.spacingTiny, style({ alignItems: 'flex-end', placeContent: 'center' }))(
                      $text(map(amountUsd => readableFixedUSD30(amountUsd), liquidity)),
                      $row(style({ whiteSpace: 'pre' }))(
                        $text(map(info => readableFixedBsp(info.rate), poolInfo)),
                        $text(style({ color: pallete.foreground }))(' / hr')
                      ),
                    )
                  )
                }),
                list: config.tokenIndexMap[config.chain.id] || [],
              }
            })({
              select: changeIndexTokenTether()
            }),


            $field(
              O(
                map(node =>
                  merge(
                    now(node),
                    filterNull(snapshot((state, value) => {
                      if (value === 0n) {
                        node.element.value = ''
                      } else {
                        node.element.value = readableUnitAmount(formatFixed(value, state.indexTokenDescription.decimals))
                      }

                      return null
                    }, combineObject({ indexTokenDescription }), autoFillSizeToken))
                  )
                ),
                switchLatest
              ),
              styleInline(map(focus => focus === ITradeFocusMode.size ? { color: pallete.message } : { color: pallete.foreground }, config.tradeConfig.focusMode)),
              switchFocusModeTether(nodeEvent('focus'), constant(ITradeFocusMode.size)),
              inputSizeDeltaTetherUsd(nodeEvent('input'), src => snapshot((state, inputEvent) => {
                const target = inputEvent.currentTarget

                if (!(target instanceof HTMLInputElement)) {
                  console.warn(new Error('Target is not type of input'))

                  return 0n
                }

                if (target.value === '') {
                  return 0n
                }

                const parsedInput = parseFixed(parseReadableNumber(target.value), state.indexTokenDescription.decimals)

                return getTokenUsd(parsedInput, state.indexTokenPrice, state.indexTokenDescription.decimals)
              }, combineObject({ indexTokenDescription, indexTokenPrice }), src))
            )(),
          ),

          $row(layoutSheet.spacingSmall, style({ placeContent: 'space-between' }))(
            switchLatest(combineArray((isLong, indexToken) => {
              if (isLong) {
                const tokenDesc = getTokenDescription(indexToken)

                return $row(layoutSheet.spacingSmall, style({ alignItems: 'center', flexDirection: 'row-reverse' }))(
                  $row(layoutSheet.spacingTiny, style({ alignItems: 'center', fontSize: '.85rem' }))(
                    $icon({ $content: $tokenIconMap[tokenDesc.symbol], width: '14px', viewBox: '0 0 32 32' }),
                    $text(tokenDesc.symbol)
                  ),

                  $infoTooltipLabel(
                    `${tokenDesc.symbol} will be deposited & borrowed to maintain a Long Position`,
                    screenUtils.isDesktopScreen ? 'Indexed' : undefined
                  ),
                )
              }

              return $row(layoutSheet.spacingSmall)(
                $infoTooltipLabel(
                  $text(map(token => `${getTokenDescription(token).symbol} will be borrowed to maintain a Short Position. you can switch with other USD tokens to receive it later`, config.tradeConfig.collateralToken)),
                  screenUtils.isDesktopScreen ? 'Indexed' : undefined,
                ),
                switchLatest(map(params => {

                  const address = params.account.address
                  if (!address) {
                    return empty()
                  }

                  return $Dropdown({
                    $container: $row(style({ position: 'relative', alignSelf: 'center' })),
                    $selection: $row(style({ alignItems: 'center', cursor: 'pointer' }))(
                      switchLatest(combineArray((collateralToken) => {
                        const tokenDesc = getTokenDescription(collateralToken)

                        return $row(layoutSheet.spacingTiny, style({ alignItems: 'center' }))(
                          $icon({ $content: $tokenIconMap[tokenDesc.symbol], width: '14px', viewBox: '0 0 32 32' }),
                          $text(tokenDesc.symbol)
                        )
                      }, config.tradeConfig.collateralToken)),
                      $icon({ $content: $caretDown, width: '14px', viewBox: '0 0 32 32' })
                    ),
                    value: {
                      value: config.tradeConfig.collateralToken,
                      $container: $defaultSelectContainer(style({ minWidth: '290px', right: 0 })),
                      $$option: map(option => {
                        const tokenDesc = getTokenDescription(option)
                        const liquidity = tradeReader.getAvailableLiquidityUsd(config.tradeConfig.indexToken, now(option))
                        const poolInfo = tradeReader.getTokenPoolInfo(now(option))


                        return $row(style({ placeContent: 'space-between', flex: 1 }))(
                          $tokenLabelFromSummary(tokenDesc),

                          $column(layoutSheet.spacingTiny, style({ alignItems: 'flex-end', placeContent: 'center' }))(
                            $text(map(amountUsd => readableFixedUSD30(amountUsd), liquidity)),
                            $row(style({ whiteSpace: 'pre' }))(
                              $text(map(info => readableFixedBsp(info.rate), poolInfo)),
                              $text(style({ color: pallete.foreground }))(' / hr')
                            ),
                          )
                        )
                      }),
                      list: config.tokenStableMap[config.chain.id] || [],
                    }
                  })({
                    select: changeCollateralTokenTether()
                  })
                }, combineObject({ account })))

              )
            }, config.tradeConfig.isLong, config.tradeConfig.indexToken)),

            $hintNumChange({
              label: screenUtils.isDesktopScreen ? `Size` : undefined,
              change: map((params) => {
                const totalSize = params.sizeDeltaUsd + (params.position.size)

                return readableFixedUSD30(totalSize)
              }, combineObject({ sizeDeltaUsd, position })),
              isIncrease: config.tradeConfig.isIncrease,
              tooltip: $column(layoutSheet.spacingSmall)(
                $text('Size amplified by deposited Collateral and Leverage chosen'),
                $text('Higher Leverage increases Liquidation Risk'),
              ),
              val: map(pos => readableFixedUSD30(pos ? pos.size : 0n), config.tradeState.position)
            }),
          ),
        ),
      ),

      $column(
        screenUtils.isDesktopScreen
          ? style({
            marginTop: `-${BOX_SPACING - 5}px`,
            paddingTop: `${BOX_SPACING - 5}px`,
            minHeight: '140px',
            placeContent: 'center',
            // backgroundColor: pallete.horizon,
            border: `1px solid ${colorAlpha(pallete.foreground, .20)}`,
            borderTop: 'none',
            borderRadius: `0px 0px ${BOX_SPACING}px ${BOX_SPACING}px`,
          })
          : style({
            marginBottom: `-${BOX_SPACING - 5}px`,
            paddingBottom: `${BOX_SPACING - 5}px`,
            minHeight: '140px',
            placeContent: 'center',
            // backgroundColor: pallete.horizon,
            border: `1px solid ${colorAlpha(pallete.foreground, .20)}`,
            borderBottom: 'none',
            borderRadius: `${BOX_SPACING}px ${BOX_SPACING}px 0px 0px `,
          })
      )(
        $IntermediateConnectButton({
          primaryButtonConfig: {
            $container: $defaultButtonPrimary(style({ margin: 'auto', alignSelf: 'center', placeSelf: 'center' })),
            // $content: $row(layoutSheet.spacingSmall, style({ alignItems: 'center' }))(
            //   $text('Connect To Trade'),
            //   $icon({ $content: $caretDown, viewBox: '0 0 32 32', width: '16px', fill: pallete.background, svgOps: style({ marginTop: '2px' }) }),
            // )
          },
          // $button: style({
          //   alignSelf: 'center'
          // })($ButtonPrimary({
          //   $content: $row(layoutSheet.spacingSmall, style({ alignItems: 'center' }))(
          //     $text('Connect To Trade'),
          //     $icon({ $content: $caretDown, viewBox: '0 0 32 32', width: '16px', fill: pallete.background, svgOps: style({ marginTop: '2px' }) }),
          //   )
          // })({})),
          $$display: map(w3p => {
            const getIsPluginEnabled = (address: viem.Address) => router.read(
              'approvedPlugins',
              address,
              GMX.CONTRACT[config.chain.id].PositionRouter.address
            )

            return $column(style({ minHeight: '140px', flexDirection: screenUtils.isDesktopScreen ? 'column' : 'column-reverse' }))(
              $column(style({ padding: '16px', margin: 'auto 0', placeContent: 'space-between' }), styleInline(map(mode => ({ height: '140px', display: mode ? 'flex' : 'none' }), inTradeMode)))(
                $column(layoutSheet.spacingSmall)(
                  // $TextField({
                  //   label: 'Slippage %',
                  //   labelStyle: { flex: 1 },
                  //   value: config.tradeConfig.slippage,
                  //   inputOp: style({ width: '60px', maxWidth: '60px', textAlign: 'right', fontWeight: 'normal' }),
                  //   validation: map(n => {
                  //     const val = Number(n)
                  //     const valid = val >= 0
                  //     if (!valid) {
                  //       return 'Invalid Basis point'
                  //     }

                  //     if (val > 5) {
                  //       return 'Slippage should be less than 5%'
                  //     }

                  //     return null
                  //   }),
                  // })({
                  //   change: changeSlippageTether()
                  // }),

                  $row(style({ placeContent: 'space-between' }))(
                    $infoTooltipLabel(
                      $column(layoutSheet.spacingSmall)(
                        $text('Collateral deducted upon your deposit including Borrow fee at the start of every hour. the rate changes based on utilization, it is calculated as (assets borrowed) / (total assets in pool) * 0.01%'),

                        switchLatest(map(params => {
                          const depositTokenNorm = resolveAddress(config.chain.id, params.inputToken)
                          const outputToken = params.isLong ? params.indexToken : params.collateralToken
                          const totalSizeUsd = params.position.size + params.sizeDeltaUsd
                          const nextSize = totalSizeUsd * params.collateralTokenPoolInfo.rate / GMX.BASIS_POINTS_DIVISOR / 100n

                          return $column(
                            depositTokenNorm !== outputToken ? $row(layoutSheet.spacingTiny)(
                              $text(style({ color: pallete.foreground }))('Swap'),
                              $text(style({ color: pallete.indeterminate }))(readableFixedUSD30(params.swapFee))
                            ) : empty(),
                            $infoLabeledValue('Margin', $text(style({ color: pallete.indeterminate }))(readableFixedUSD30(params.marginFee))),
                            $infoLabeledValue(
                              'Borrow Fee',
                              $row(layoutSheet.spacingTiny)(
                                $text(style({ color: pallete.indeterminate }))(readableFixedUSD30(nextSize) + ' '),
                                $text(` / 1hr`)
                              )
                            )
                          )
                        }, combineObject({ sizeDeltaUsd, collateralToken, indexToken, swapFee, collateralTokenPoolInfo, position, isLong, inputToken, marginFee })))

                      ),
                      'Fees'
                    ),
                    $text(style({ color: pallete.indeterminate }))(
                      map(params => readableFixedUSD30(params.marginFee + params.swapFee), combineObject({ swapFee, marginFee }))
                    ),
                  ),
                  switchLatest(map(isIncrease => {

                    if (isIncrease) {
                      return $row(style({ placeContent: 'space-between' }))(
                        $infoTooltipLabel(
                          $column(layoutSheet.spacingTiny)(
                            $text('BLUEBERRY Payback(Referral) code is used to provide a 10% payback'),
                            $text('Payback accumulates every time you trade and is distributed once every week back to your account in ETH or AVAX.'),
                            $row(layoutSheet.spacingTiny)(
                              $text(style({ color: pallete.foreground }))('Open + Close Payback'),
                              $text(style({ color: pallete.positive }))(map(params => readableFixedUSD30(params.marginFee * 2000n / GMX.BASIS_POINTS_DIVISOR), combineObject({ marginFee })))
                            ),
                            $text(style({ color: pallete.positive }))('Trading Competition'),
                            $node(
                              $text('Monthly trading competition to top traders in the end '),
                              $anchor(attr({ href: '/app/leaderboard' }))($text(' Leaderboard'))
                            ),
                            $row(layoutSheet.spacingTiny)(
                              $text(style({ color: pallete.foreground }))('Your added contribution'),
                              $text(style({ color: pallete.positive }))(map(params => readableFixedUSD30(params.marginFee * 2500n / GMX.BASIS_POINTS_DIVISOR), combineObject({ marginFee })))
                            ),
                          ),
                          'Payback'
                        ),
                        $text(style({ color: pallete.positive }))(map(params => readableFixedUSD30(params.marginFee * 1000n / GMX.BASIS_POINTS_DIVISOR), combineObject({ marginFee })))
                      )
                    }

                    return $row(style({ placeContent: 'space-between' }))(
                      $infoTooltipLabel(
                        $column(layoutSheet.spacingTiny)(
                          $text('BLUEBERRY Payback(Referral) code is used to provide a 10% payback'),
                          $text('Payback accumulates every time you trade and is distributed once every week back to your account in ETH or AVAX.'),
                        ),
                        'Receive'
                      ),
                      $text(style({ whiteSpace: 'pre-wrap' }))(map(params => {

                        if (params.position.averagePrice === 0n) {
                          return 0n
                        }

                        const delta = getPnL(params.isLong, params.position.averagePrice, params.indexTokenPrice, -params.sizeDeltaUsd)
                        const adjustedSizeDelta = safeDiv(-params.sizeDeltaUsd * delta, params.position.size)
                        const fees = params.swapFee + params.marginFee
                        const collateralDelta = -params.sizeDeltaUsd === params.position.size
                          ? params.position.collateral - params.fundingFee
                          : -params.collateralDeltaUsd

                        const total = collateralDelta + adjustedSizeDelta - fees
                        const totalOut = total > 0n ? total : 0n
                        const tokenAmount = getTokenAmount(totalOut, params.inputTokenPrice, params.inputTokenDescription.decimals)

                        return `${readableUnitAmount(formatFixed(tokenAmount, params.inputTokenDescription.decimals))} ${params.inputTokenDescription.symbol} (${readableFixedUSD30(totalOut)})`
                      }, combineObject({ sizeDeltaUsd, position, collateralDeltaUsd, inputTokenDescription, inputTokenPrice, marginFee, swapFee, indexTokenPrice, isLong, fundingFee })))
                    )
                  }, config.tradeConfig.isIncrease))


                ),

                $column(layoutSheet.spacingSmall)(
                  switchLatest(map(params => {
                    if (!params.isPluginEnabled || !params.isTradingEnabled) {
                      return $Popover({
                        $target: $row(style({ placeContent: 'flex-end' }))(
                          $ButtonSecondary({
                            $content: $text('Enable GMX'),
                            disabled: mergeArray([
                              dismissEnableTradingOverlay,
                              openEnableTradingPopover
                            ])
                          })({
                            click: openEnableTradingPopoverTether()
                          })
                        ),
                        $popContent: map(() => {

                          return $column(layoutSheet.spacing, style({ maxWidth: '400px' }))(
                            $text(style({ fontWeight: 'bold', fontSize: '1em' }))(`By using GBC Trading, I agree to the following Disclaimer`),
                            $text(style({}))(`By accessing, I agree that ${document.location.href} is an interface that interacts with external GMX smart contracts, and does not have access to my funds.`),

                            $alert(
                              $node(
                                $text('This beta version may contain bugs. Feedback and issue reports are greatly appreciated.'),
                                $anchor(attr({ href: 'https://discord.com/channels/941356283234250772/1068946527021695168' }))($text('discord'))
                              )
                            ),

                            $node(
                              $text(style({ whiteSpace: 'pre-wrap' }))(`By clicking Agree you accept the `),
                              $anchor(attr({ href: '/app/trading-terms-and-conditions' }))($text('Terms & Conditions'))
                            ),

                            params.isPluginEnabled
                              ? $ButtonPrimary({
                                $content: $text('Agree')
                              })({
                                click: approveTradingTether(constant(true))
                              })
                              : $ButtonPrimaryCtx({
                                request: requestEnablePlugin,
                                $content: $text('Enable GMX & Agree')
                              })({
                                click: enableTradingPluginTether()
                              })
                          )
                        }, openEnableTradingPopover),
                      })({
                        overlayClick: dismissEnableTradingOverlayTether(constant(false))
                      })
                    }

                    if (params.route && !params.isInputTokenApproved) {

                      return $ButtonPrimaryCtx({
                        request: requestApproveSpend,
                        $content: $text(`Approve ${params.inputTokenDescription.symbol}`)
                      })({
                        click: clickApproveInputTokenTether(
                          constant({ route: params.route, inputToken: params.inputToken })
                        )
                      })
                    }

                    const disableButtonVlidation = map((error) => {
                      if (error) {
                        return true
                      }

                      return false
                    }, validationError)
                    return $row(layoutSheet.spacingSmall, style({ alignItems: 'center', flex: 1 }))(
                      $row(style({ flex: 1, minWidth: 0 }))(
                        switchLatest(map(error => {
                          if (error === null) {
                            return empty()
                          }

                          return $alertTooltip(
                            $text(error)
                          )
                        }, mergeArray([requestTradeError, validationError])))
                      ),
                      style({ padding: '8px', alignSelf: 'center' })(
                        $ButtonSecondary({ $content: $text('Reset') })({
                          click: clickResetTradeModeTether()
                        })
                      ),
                      $ButtonPrimaryCtx({
                        request: map(req => req.request, requestTrade),
                        disabled: combineArray((isDisabled) => isDisabled, disableButtonVlidation),
                        $content: $text(map(params => {
                          let modLabel: string

                          if (params.position.averagePrice > 0n) {
                            if (params.isIncrease) {
                              modLabel = 'Increase'
                            } else {
                              modLabel = (params.sizeDeltaUsd + params.position.size === 0n) ? 'Close' : 'Reduce'
                            }
                          } else {
                            modLabel = 'Open'
                          }

                          return modLabel
                        }, combineObject({ position, sizeDeltaUsd, isIncrease })))
                      })({
                        click: clickProposeTradeTether(
                          constant(w3p)
                        )
                      })
                    )
                  }, combineObject({ isPluginEnabled: getIsPluginEnabled(w3p.account.address), isInputTokenApproved, route, isTradingEnabled, inputToken, inputTokenDescription })))
                ),
              ),

              styleInline(map(mode => ({ height: '140px', display: mode ? 'none' : 'flex' }), inTradeMode))(
                $IntermediatePromise({
                  $loader: $row(
                    $spinner
                  ),
                  query: combineArray((a, b) => Promise.all([a, b]), config.pricefeed, config.trade),
                  $$done: zip((params, [pricefeed, pos]) => {
                    if (pos === null) {
                      const tokenDesc = getTokenDescription(params.position.indexToken)
                      const route = params.position.isLong ? `Long-${tokenDesc.symbol}` : `Short-${tokenDesc.symbol}/${getTokenDescription(params.position.collateralToken).symbol}`

                      return $row(style({ placeContent: 'center', alignItems: 'center' }))(
                        $text(style({ color: pallete.foreground }))(`No active ${route} position`)
                      )
                    }

                    const hoverChartPnl = switchLatest(map((chartCxChange) => {
                      if (Number.isFinite(chartCxChange)) {
                        return now(chartCxChange)
                      }


                      return map(price => {
                        const delta = getPnL(pos.isLong, pos.averagePrice, price, pos.size)
                        const val = formatFixed(delta + pos.realisedPnl - pos.cumulativeFee, 30)

                        return val
                      }, config.tradeState.indexTokenPrice)

                    }, pnlCrossHairTime))


                    const nextSize = params.position.size * params.collateralTokenPoolInfo.rate / GMX.BASIS_POINTS_DIVISOR / 100n


                    return $column(style({ position: 'relative' }))(
                      $row(
                        style({
                          display: 'flex',
                          alignItems: 'center',
                          lineHeight: 1,
                          height: '1px',
                          zIndex: 10,
                          position: 'absolute',
                          placeContent: 'space-between',
                          inset: '18px 16px',
                        })
                      )(
                        $infoLabeledValue(
                          'Borrow Fee',
                          $row(layoutSheet.spacingTiny)(
                            $text(style({ color: pallete.indeterminate }))(readableFixedUSD30(nextSize) + ' '),
                            $text(` / 1hr`)
                          )
                        ),
                        $infoTooltipLabel(
                          $openPositionPnlBreakdown(pos, now(params.collateralTokenPoolInfo.cumulativeRate)),
                          $NumberTicker({
                            textStyle: {
                              fontSize: '1.25em',
                              fontWeight: 'bold',
                            },
                            value$: map(hoverValue => {
                              const newLocal2 = readableUnitAmount(hoverValue)
                              const newLocal = parseReadableNumber(newLocal2)
                              return newLocal
                            }, motion({ ...MOTION_NO_WOBBLE, precision: 15, stiffness: 210 }, 0, hoverChartPnl)),
                            incrementColor: pallete.positive,
                            decrementColor: pallete.negative
                          }),
                        ),
                      ),
                      $TradePnlHistory({
                        $container: $column(style({ flex: 1, overflow: 'hidden', borderRadius: '20px' })),
                        position: pos,
                        chain: config.chain.id,
                        pricefeed,
                        chartConfig: {
                          leftPriceScale: {
                            scaleMargins: {
                              top: 0.38,
                              bottom: 0,
                            }
                          },
                          // timeScale: {
                          //   visible: false
                          // }
                        },
                        latestPrice: config.tradeState.indexTokenPrice
                      })({
                        crosshairMove: crosshairMoveTether(),
                        // requestPricefeed: requestTradePricefeedTether()
                      })
                    )
                  }, combineObject({ position, collateralTokenPoolInfo }))
                })({})
              ),

              $IntermediatePromise({
                query: config.openTradeListQuery,
                $$done: map(res => {
                  if (res.length === 0) {
                    return empty()
                  }

                  return $column(style({ flex: 1 }))(
                    ...res.map(pos => {

                      const positionMarkPrice = latestTokenPrice(config.processData, now(pos.indexToken))
                      const cumulativeFee = vault.read('cumulativeFundingRates', pos.collateralToken)
                      const pnl = map(params => {
                        const delta = getPnL(pos.isLong, pos.averagePrice, params.positionMarkPrice, pos.size)

                        return pos.realisedPnl + delta - pos.cumulativeFee
                      }, combineObject({ positionMarkPrice, cumulativeFee }))


                      return switchLatest(map(vpos => {
                        if (vpos.key === pos.key) {
                          return empty()
                        }

                        return $row(layoutSheet.spacing,
                          style({
                            [screenUtils.isDesktopScreen ? 'borderTop' : 'borderBottom']: `1px solid ${colorAlpha(pallete.foreground, .20)}`,
                            padding: '16px', placeContent: 'space-between', borderRadius: '20px', backgroundColor: pallete.background,
                          })
                        )(
                          $ButtonPrimary({
                            $content: $entry(pos),
                            $container: $defaultMiniButtonSecondary
                          })({
                            click: switchTradeTether(
                              constant(pos)
                            )
                          }),
                          $sizeAndLiquidation(pos.isLong, pos.size, pos.collateral, pos.averagePrice, positionMarkPrice),
                          $infoTooltipLabel(
                            $openPositionPnlBreakdown(pos, cumulativeFee),
                            $pnlValue(pnl)
                          ),
                        )
                      }, position))
                    })
                  )

                })
              })({})
            )
          })
        })({
        }),
      )

    ),

    {
      switchIsLong,
      changeInputToken,
      changeIndexToken,
      changeRoute,
      switchTrade,
      switchFocusMode: mergeArray([
        constant(ITradeFocusMode.collateral, mergeArray([clickClose, clickMax])),
        switchFocusMode,
      ]),
      leverage: mergeArray([
        filterNull(snapshot(state => {
          if (state.position.size === 0n) {
            return null
          }

          return div(state.position.size, state.position.collateral - state.fundingFee)
        }, combineObject({ position, fundingFee }), resetTrade)),
        filterNull(zip((params, stake) => {
          if (stake.averagePrice > 0n) {
            return div(stake.size + params.sizeDeltaUsd, stake.collateral + params.collateralDeltaUsd - params.fundingFee)
          }

          return null
        }, combineObject({ collateralDeltaUsd, sizeDeltaUsd, fundingFee }), position)),
        mergeArray([clickClose, slideLeverage]),
      ]),
      switchIsIncrease,
      changeCollateralToken,
      changeCollateralDeltaUsd: mergeArray([
        inputCollateralDeltaUsd,
        autoFillCollateralUsd
      ]),
      changeSizeDeltaUsd: mergeArray([
        autoFillSizeUsd,
        inputSizeDeltaUsd,
      ]),
      changeSlippage,
      enableTrading: mergeArray([
        approveTrading,
        filterNull(awaitPromises(map(async (ctx) => {
          try {
            await ctx
            return true
          } catch (err) {
            return null
          }
        }, requestEnablePlugin)))
      ]),
      approveInputToken: filterNull(awaitPromises(map(async (ctx) => {
        try {
          await ctx
          return true
        } catch (err) {
          return null
        }
      }, requestApproveSpend))),
      requestTrade

    }
  ]
})


const formatLeverageNumber = new Intl.NumberFormat("en-US", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1
})



const $field = $element('input')(attr({ placeholder: '0.0', type: 'text' }), style({ width: '100%', textAlign: 'right', lineHeight: '34px', margin: '14px 0', minWidth: '0', transition: 'background 500ms ease-in', flex: 1, fontSize: '1.5em', background: 'transparent', border: 'none', outline: 'none', color: pallete.message }))




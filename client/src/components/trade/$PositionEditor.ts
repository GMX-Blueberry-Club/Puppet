import { Behavior, combineObject, O } from "@aelea/core"
import { $element, $Node, $text, attr, component, INode, NodeComposeFn, nodeEvent, style, styleBehavior, styleInline } from "@aelea/dom"
import { Route } from "@aelea/router"
import { $column, $icon, $row, layoutSheet, screenUtils } from "@aelea/ui-components"
import { colorAlpha, pallete } from "@aelea/ui-components-theme"
import {
  constant, delay, empty, map, merge,
  mergeArray,
  multicast, now, sample, skipRepeats,
  snapshot,
  switchLatest, zip
} from "@most/core"
import { Stream } from "@most/types"
import * as GMX from "gmx-middleware-const"
import {
  $bear, $bull,
  $ButtonToggle,
  $hintNumChange, $infoLabel,
  $infoTooltipLabel,
  $tokenIconMap, $tokenLabelFromSummary
} from "gmx-middleware-ui-components"
import {
  abs,
  div,
  filterNull,
  formatDiv,
  formatFixed,
  getAdjustedDelta,
  getNativeTokenDescription, getPnL,
  getTokenDescription, getTokenUsd,
  IMarket,
  IPositionSlot,
  ITokenDescription,
  parseFixed, parseReadableNumber,
  readableFixedUSD30,
  readableLeverage,
  readableNumber,
  readablePercentage,
  readableTokenAmount,
  readableTokenUsd,
  readableUnitAmount,
  resolveAddress,
  StateStream, switchMap
} from "gmx-middleware-utils"
import * as viem from "viem"
import { arbitrum } from "viem/chains"
import { $Slider } from "../$Slider.js"
import { $heading2 } from "../../common/$text"
import { IGmxProcessState } from "../../data/process/process.js"
import { $caretDown } from "../../elements/$icons.js"
import { connectContract } from "../../logic/common.js"
import * as trade from "../../logic/trade.js"
import { account } from "../../wallet/walletLink.js"
import { $ButtonSecondary, $defaultMiniButtonSecondary } from "../form/$Button.js"
import { $defaultSelectContainer, $Dropdown } from "../form/$Dropdown.js"



export enum ITradeFocusMode {
  collateral,
  size,
}

export interface ITradeParams {
  markets: IMarket[]
  route: viem.Address | null

  position: IPositionSlot | null
  isTradingEnabled: boolean
  isInputTokenApproved: boolean

  inputTokenPrice: bigint
  collateralTokenPrice: bigint
  availableIndexLiquidityUsd: bigint
  indexTokenPrice: bigint
  walletBalance: bigint

  executionFee: bigint
  executionFeeUsd: bigint
  swapFee: bigint
  marginFee: bigint
  fundingFee: bigint
  priceImpactUsd: bigint
  totalNextFeesUsd: bigint

  inputTokenDescription: ITokenDescription
  indexTokenDescription: ITokenDescription
  collateralTokenDescription: ITokenDescription

  averagePrice: bigint | null
  liquidationPriceUsd: bigint | null

  stableFundingRateFactor: bigint
  fundingRateFactor: bigint

  collateralTokenPoolInfo: trade.ITokenPoolInfo
}

export interface ITradeActions {
  requestReset: null
}


export interface ITradeConfig {
  isLong: boolean
  inputToken: viem.Address
  market: IMarket
  isUsdCollateralToken: boolean
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


export interface IPositionEditorAbstractParams {
  referralCode: viem.Hex
  tokenIndexMap: Partial<Record<number, viem.Address[]>>
  tokenStableMap: Partial<Record<number, viem.Address[]>>
  parentRoute: Route
  chain: typeof arbitrum
  processData: Stream<IGmxProcessState>
}

interface IPositionEditorConfig extends IPositionEditorAbstractParams {
  openPositionList: Stream<IPositionSlot[]>

  tradeConfig: StateStream<ITradeConfig> // ITradeParams
  tradeState: StateStream<ITradeParams>
  tradeActions: StateStream<ITradeActions>

  $container: NodeComposeFn<$Node>
}



const BOX_SPACING = 24
const LIMIT_LEVERAGE_NORMAL = formatFixed(GMX.MAX_LEVERAGE_FACTOR, 4)
const MIN_LEVERAGE_NORMAL = formatFixed(GMX.MIN_LEVERAGE_FACTOR, 4) / LIMIT_LEVERAGE_NORMAL

export const $PositionEditor = (config: IPositionEditorConfig) => component((

  [switchIsLong, switchIsLongTether]: Behavior<boolean, boolean>,

  [switchFocusMode, switchFocusModeTether]: Behavior<any, ITradeFocusMode>,

  [inputPrimaryAmount, inputPrimaryAmountTether]: Behavior<INode, bigint>,
  [inputSizeDeltaUsd, inputSizeDeltaTetherUsd]: Behavior<INode, bigint>,

  [changeInputToken, changeInputTokenTether]: Behavior<viem.Address, viem.Address>,
  [changeMarket, changeMarketTether]: Behavior<IMarket>,
  [changeIsUsdCollateralToken, changeIsUsdCollateralTokenTether]: Behavior<boolean>,

  [switchIsIncrease, switchisIncreaseTether]: Behavior<boolean, boolean>,
  [slideLeverage, slideLeverageTether]: Behavior<number, bigint>,
  [changeSlippage, changeSlippageTether]: Behavior<string, string>,


  [clickMax, clickMaxTether]: Behavior<PointerEvent, any>,
  [clickClose, clickCloseTether]: Behavior<PointerEvent, bigint>,

) => {


  const tradeReader = trade.connectTrade(config.chain)
  const pricefeed = connectContract(GMX.CONTRACT[config.chain.id].VaultPriceFeed)





  const { 
    collateralDeltaUsd, collateralToken, collateralDelta, sizeDelta, focusMode,
    market, inputToken, isIncrease, isLong, leverage, sizeDeltaUsd, slippage, isUsdCollateralToken
  } = config.tradeConfig
  const {
    availableIndexLiquidityUsd, averagePrice, 
    collateralTokenPoolInfo, collateralTokenDescription, collateralTokenPrice, executionFee, fundingFee,

    indexTokenDescription, indexTokenPrice,
    inputTokenDescription, inputTokenPrice,

    isInputTokenApproved, isTradingEnabled, liquidationPriceUsd, marginFee, route,
    position, swapFee, walletBalance, markets
  } = config.tradeState


  const maxWalletBalance = skipRepeats(map(params => {
    const amount = params.walletBalance

    return params.inputToken === GMX.ADDRESS_ZERO ? amount - 0n : amount
  }, combineObject({ walletBalance, inputToken })))

  // const maxWalletBalanceUsd = skipRepeats(map(params => {
  //   const amountUsd = getTokenUsd(params.inputTokenDescription.decimals, params.inputTokenPrice, params.maxWalletBalance)

  //   return params.inputToken === GMX.ADDRESS_ZERO ? amountUsd - 0n : amountUsd
  // }, combineObject({ maxWalletBalance, inputTokenPrice, inputToken, inputTokenDescription })))


  const clickMaxCollateral = snapshot(params => {
    if (params.isIncrease) return params.maxWalletBalance
    if (!params.position) return 0n

    const maxCollateral = div(params.position.latestUpdate.sizeInUsd, GMX.MAX_LEVERAGE_FACTOR)
    const positionCollateralUsd = params.position.latestUpdate.collateralAmount * params.collateralTokenPrice
    const deltaUsd = maxCollateral - positionCollateralUsd

    return deltaUsd
  }, combineObject({ isIncrease, maxWalletBalance, position, indexTokenPrice, inputTokenDescription }), clickMax)


  const primaryEffects = mergeArray([
    inputSizeDeltaUsd,
    switchLatest(map((focus) => {
      if (focus === ITradeFocusMode.collateral) return empty()

      const effects = mergeArray([config.tradeConfig.leverage, config.tradeState.inputTokenPrice])
      return sample(config.tradeConfig.sizeDeltaUsd, effects)
    }, config.tradeConfig.focusMode))
  ])

  const secondaryEffects = mergeArray([
    inputPrimaryAmount,
    clickMaxCollateral,
    switchLatest(map((focus) => {
      if (focus === ITradeFocusMode.size) {
        return empty()
      }

      const effects = mergeArray([config.tradeConfig.leverage, config.tradeState.indexTokenPrice])
      return sample(config.tradeConfig.collateralDeltaUsd, effects)
    }, config.tradeConfig.focusMode)),
  ])


  const autoFillPrimaryAmount = multicast(mergeArray([
    clickMaxCollateral,
    constant(0n, config.tradeActions.requestReset),
    skipRepeats(snapshot((state, sizeDeltaFx) => {
      const size = state.position ? sizeDeltaFx + state.position.sizeDeltaUsd : sizeDeltaUsd
      const collateral = div(size, state.leverage)
      const positionCollateral = state.position ? state.position.collateralAmount - state.fundingFee : 0n
      const collateralDelta = collateral - positionCollateral


      if (state.position) {
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
    }, combineObject({ position, leverage, fundingFee, walletBalance, isIncrease, swapFee, marginFee }), primaryEffects))
  ]))

  const autoFillSecondary = multicast(mergeArray([
    constant(0n, config.tradeActions.requestReset),
    snapshot((params, collateralDeltaFx) => {
      const positionCollateralUsd = params.position ? getTokenUsd(params.collateralTokenPrice, params.position.latestUpdate.collateralAmount) - params.fundingFee : 0n

      const primaryDeltaUsd = getTokenUsd(params.inputTokenPrice, collateralDeltaFx)
      const positionSizeUsd = params.position ? params.position.latestUpdate.sizeInUsd : 0n

      const totalCollateral = primaryDeltaUsd + positionCollateralUsd - params.swapFee
      const delta = (totalCollateral * params.leverage / GMX.BASIS_POINTS_DIVISOR - positionSizeUsd) * GMX.BASIS_POINTS_DIVISOR


      if (params.position) {
        const minMultiplier = div(params.position.latestUpdate.sizeInUsd, totalCollateral)
        const multiplierDelta = params.isIncrease ? params.leverage - minMultiplier : minMultiplier - params.leverage

        if (multiplierDelta < 100n) {
          return 0n
        }
      }

      if (params.position && !params.isIncrease && params.leverage <= GMX.MIN_LEVERAGE_FACTOR) {
        return -positionSizeUsd
      }

      const toNumerator = delta * GMX.BASIS_POINTS_DIVISOR
      const toDenominator = GMX.MARGIN_FEE_BASIS_POINTS * params.leverage + GMX.BASIS_POINTS_DIVISOR * GMX.BASIS_POINTS_DIVISOR

      const deltaAfterFees = toNumerator / toDenominator

      return deltaAfterFees
    }, combineObject({ leverage, position, fundingFee, swapFee, isIncrease, collateralTokenPrice, inputTokenPrice, inputTokenDescription }), secondaryEffects)
  ]))




  return [
    config.$container(
      $row(
        // styleInline(map(isIncrease => isIncrease ? { borderColor: 'none' } : {}, config.tradeConfig.isIncrease)),
        style({
          padding: '12px',
          marginBottom: `-${BOX_SPACING}px`,
          paddingBottom: `${BOX_SPACING + 12}px`,
          placeContent: 'space-between',
          alignItems: 'center',
          backgroundColor: pallete.background,
          border: `1px solid ${colorAlpha(pallete.foreground, .20)}`,
          borderBottom: 'none',
          // borderTop: 'none',
          borderRadius: `${BOX_SPACING}px ${BOX_SPACING}px 0px 0px`,
        })
      )(


        // $Popover({
        //   $target: $row(clickOpenTradeConfigTether(nodeEvent('click')), style({ padding: '6px 12px', border: `2px solid ${pallete.horizon}`, borderRadius: '30px' }))(
        //     $text('Advanced'),
        //     $icon({ $content: $caretDown, width: '14px', svgOps: style({ marginRight: '-5px' }), viewBox: '0 0 32 32' }),
        //   ),
        //   $popContent: map((_) => {
        //     return $text('fff')
        //   }, clickOpenTradeConfig),
        // })({
        //   // overlayClick: clickPopoverClaimTether()
        // })

        $ButtonToggle({
          $container: $row(layoutSheet.spacingSmall),
          selected: config.tradeConfig.isLong,
          options: [
            true,
            false,
          ],
          $$option: map(isLong => {
            return $row(layoutSheet.spacingTiny, style({ alignItems: 'center' }))(
              $icon({ $content: isLong ? $bull : $bear, width: '18px', viewBox: '0 0 32 32' }),
              $text(isLong ? 'Long' : 'Short'),
            )
          })
        })({ select: switchIsLongTether() }),

        $ButtonToggle({
          $container: $row(layoutSheet.spacingSmall),
          selected: config.tradeConfig.isIncrease,
          options: [
            true,
            false,
          ],
          $$option: map(option => {
            return $text(style({}))(option ? 'Increase' : 'Decrease')
          })
        })({ select: switchisIncreaseTether() }),

      ),

      $column(style({ borderRadius: `${BOX_SPACING}px`, backgroundColor: pallete.middleground }))(
        $column(layoutSheet.spacingSmall, style({ padding: '24px', borderRadius: '20px 20px 0 0', border: `1px solid ${colorAlpha(pallete.foreground, .20)}` }),
          styleInline(now({ borderBottom: 'none' })),
          styleInline(map(params => {
            return params.focusMode === ITradeFocusMode.collateral ? { borderColor: params.isIncrease ? `${pallete.primary}` : `${pallete.indeterminate}` } : { borderColor: '' }
          }, combineObject({ focusMode, isIncrease })))
        )(
          $row(layoutSheet.spacingSmall, style({ placeContent: 'space-between' }))(
            style({ flexDirection: 'row-reverse' })(
              $hintNumChange({
                label: screenUtils.isDesktopScreen ? `Collateral` : undefined,
                change: map(params => {
                  if (params.position === null) {
                    return readableFixedUSD30(getTokenUsd(params.inputTokenPrice, params.collateralDeltaUsd))
                  }

                  const posCollateral = params.position.latestUpdate.collateralAmount - params.fundingFee
                  const totalCollateral = posCollateral + params.collateralDeltaUsd - params.swapFee - params.marginFee

                  if (params.isIncrease) {
                    return readableFixedUSD30(totalCollateral)
                  }

                  const pnl = params.position ? getPnL(params.isLong, params.position.averagePrice, params.indexTokenPrice, params.position.size) : 0n

                  if (params.position?.latestUpdate.sizeDeltaUsd === abs(params.sizeDeltaUsd)) {
                    return 0n
                  }

                  const adjustedPnlDelta = params.position && pnl < 0n && !params.isIncrease
                    ? getAdjustedDelta(params.position.size, abs(params.sizeDeltaUsd), pnl)
                    : 0n

                  const netCollateral = totalCollateral + adjustedPnlDelta

                  return readableFixedUSD30(netCollateral)
                }, combineObject({ sizeDeltaUsd, position, inputTokenPrice, isIncrease, collateralDeltaUsd, swapFee, marginFee, isLong, fundingFee })),
                isIncrease: config.tradeConfig.isIncrease,
                tooltip: 'The amount deposited to maintain a leverage position',
                val: map(params => {
                  return params.position ? readableTokenUsd(params.inputTokenPrice, params.position.latestUpdate.collateralAmount - params.fundingFee) : null
                }, combineObject({ position, fundingFee, inputTokenPrice })),
              })
            ),

            $row(layoutSheet.spacingSmall, style({ alignItems: 'center' }))(
              $infoLabel(`Balance`),
              $text(
                map(params => {
                  const newLocal = formatFixed(params.walletBalance, params.inputTokenDescription.decimals)
                  const newLocal_1 = readableNumber({})(newLocal)
                  
                  return newLocal_1 + ' ' + params.inputTokenDescription.symbol
                }, combineObject({ inputToken, walletBalance, inputTokenDescription }))
              ),
            ),
          ),
          $row(layoutSheet.spacingSmall, style({ alignItems: 'center' }))(


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
                    }, combineObject({ inputTokenDescription, inputTokenPrice }), autoFillPrimaryAmount))
                  )
                ),
                switchLatest
              ),
              styleInline(map(focus => focus === ITradeFocusMode.collateral ? { color: pallete.message } : { color: pallete.foreground }, config.tradeConfig.focusMode)),
              switchFocusModeTether(nodeEvent('focus'), constant(ITradeFocusMode.collateral)),
              inputPrimaryAmountTether(nodeEvent('input'), src => snapshot((state, inputEvent) => {
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

                return parsedInput
                // return getTokenUsd(state.inputTokenDescription.decimals, state.inputTokenPrice, parsedInput)
              }, combineObject({ inputTokenDescription, inputTokenPrice }), src)),
            )(),

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
                      if (params.position && abs(params.sizeDeltaUsd) === params.position.size) {
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

            switchLatest(map(params => {
              const address = params.account.address
              if (!config.chain.id || !address) {
                return empty()
              }

              const chainId = config.chain.id

              return $Dropdown({
                $container: $row(style({ position: 'relative', alignSelf: 'center' })),
                $selection: switchLatest(map(tokenDesc => {
                  // const tokenDesc = getTokenDescription(option)

                  return $row(layoutSheet.spacingTiny, style({ alignItems: 'center', cursor: 'pointer' }))(
                    $icon({ $content: $tokenIconMap[tokenDesc.symbol], width: '34px', svgOps: style({ paddingRight: '4px' }), viewBox: '0 0 32 32' }),
                    $heading2(tokenDesc.symbol),
                    $icon({ $content: $caretDown, width: '14px', viewBox: '0 0 32 32' }),
                  )
                }, inputTokenDescription)),
                // $selection: switchLatest(map(option => {
                //   return $row(layoutSheet.spacingTiny, style({ alignItems: 'center', cursor: 'pointer' }))(
                //     $icon({
                //       $content: $tokenIconMap[option.symbol],
                //       svgOps: styleBehavior(map(isIncrease => ({ fill: isIncrease ? pallete.message : pallete.indeterminate }), config.tradeConfig.isIncrease)),
                //       width: '34px', viewBox: '0 0 32 32'
                //     }),
                //     // $text(option.symbol),
                //     $icon({ $content: $caretDown, width: '14px', svgOps: style({ marginTop: '3px' }), viewBox: '0 0 32 32' }),
                //   )
                // }, config.tradeState.inputTokenDescription)),
                selector: {
                  value: config.tradeConfig.inputToken,
                  $container: $defaultSelectContainer(style({ minWidth: '290px', left: 0 })),
                  $$option: map(option => {
                    const token = resolveAddress(config.chain, option)
                    const balanceAmount = trade.getErc20Balance(config.chain, option, address)
                    const price = pricefeed.read('getPrimaryPrice', token, false)
                    const tokenDesc = option === GMX.ADDRESS_ZERO ? getNativeTokenDescription(chainId) : getTokenDescription(option)

                    return $row(style({ placeContent: 'space-between', flex: 1 }))(
                      $tokenLabelFromSummary(tokenDesc),
                      $column(style({ alignItems: 'flex-end' }))(
                        $text(style({ whiteSpace: 'nowrap' }))(map(bn => readableUnitAmount(formatFixed(bn, tokenDesc.decimals)) + ` ${tokenDesc.symbol}`, balanceAmount)),
                        $text(
                          map(params => {
                            return getTokenUsd(params.price, params.balanceAmount).toString()
                          }, combineObject({ balanceAmount, price }))
                        ),
                      )
                    )
                  }),
                  list: [
                    GMX.ADDRESS_ZERO,
                    ...config.tokenIndexMap[chainId] || [],
                    ...config.tokenStableMap[chainId] || [],
                  ],
                }
              })({
                select: changeInputTokenTether()
              })
            }, combineObject({ account }))),

            


          ),
        ),

        $column(style({ height: `2px`, placeContent: 'center' }))(
          $Slider({
            value: map(leverage => {
              if (leverage === null) {
                return 0
              }

              const multiplier = formatDiv(leverage, GMX.MAX_LEVERAGE_FACTOR)

              return multiplier
            }, config.tradeConfig.leverage),
            // disabled: map(state => {

            //   if (state.trade === null) {
            //     return !state.isIncrease || state.collateralDelta === 0n
            //   }

            //   return false
            // }, tradeState),
            color: map(isIncrease => isIncrease ? pallete.foreground : pallete.indeterminate, config.tradeConfig.isIncrease),
            min: map((state) => {
              if (state.isIncrease) {
                if (state.position) {
                  if (state.focusMode === ITradeFocusMode.size) {
                    const ratio = div(state.position.size + state.sizeDeltaUsd, state.walletBalanceUsd + state.position.collateral - state.fundingFee)
                    return formatDiv(ratio, GMX.MAX_LEVERAGE_FACTOR)
                  }
                  const totalCollateral = state.collateralDeltaUsd + state.position.collateral - state.fundingFee

                  return Math.max(MIN_LEVERAGE_NORMAL, formatDiv(div(state.position.size, totalCollateral), GMX.MAX_LEVERAGE_FACTOR))
                }

                return MIN_LEVERAGE_NORMAL
              }

              if (state.focusMode === ITradeFocusMode.size) {
                const totalSize = state.position ? state.sizeDeltaUsd + state.position.size : state.sizeDeltaUsd

                if (state.position) {
                  return formatDiv(div(totalSize, state.position.collateral - state.fundingFee), GMX.MAX_LEVERAGE_FACTOR)
                }

                return 0
              }



              return 0
            }, combineObject({ sizeDeltaUsd, walletBalance, position, collateralDeltaUsd, fundingFee, focusMode, isIncrease })),
            max: map(state => {
              if (state.position === null) {
                return 1
              }

              const totalSize = state.position.size + state.sizeDeltaUsd

              if (state.isIncrease) {
                if (state.focusMode === ITradeFocusMode.size) {

                  // return 1
                  const ratio = div(totalSize, state.position.collateral - state.fundingFee)
                  const newLocal = formatDiv(ratio, GMX.MAX_LEVERAGE_FACTOR)
                  return Math.min(1, newLocal)
                }

                return 1
              } else {
                if (state.focusMode === ITradeFocusMode.collateral) {
                  const totalCollateral = state.position.collateral - state.fundingFee + state.collateralDeltaUsd
                  const ratio = div(state.position.size, totalCollateral)

                  return Math.min(1, formatDiv(ratio, GMX.MAX_LEVERAGE_FACTOR))
                }
              }

              return 1
            }, combineObject({ position, fundingFee, collateralDeltaUsd, sizeDeltaUsd, focusMode, isIncrease })),
            thumbText: map(n => (n === 1 ? '100' : formatLeverageNumber.format(n * LIMIT_LEVERAGE_NORMAL)) + '\nx')
          })({
            change: slideLeverageTether(
              map(leverage => {
                const leverageRatio = BigInt(Math.round(Math.abs(leverage) * Number(GMX.MAX_LEVERAGE_FACTOR)))

                return leverageRatio
              }),
              multicast,
              skipRepeats
            )
          }),
        ),


        $column(layoutSheet.spacingSmall, style({ padding: '24px', borderRadius: '0 0 20px 20px', border: `1px solid ${colorAlpha(pallete.foreground, .20)}` }),
          styleInline(now({ borderTopStyle: 'none' })),
          // style({ backgroundColor: pallete.horizon, padding: '12px', border: `1px solid ${colorAlpha(pallete.foreground, .20)}` }),

          styleInline(map(params => {
            const borderColor = params.focusMode === ITradeFocusMode.size
              ? params.isIncrease
                ? `${pallete.primary}`
                : `${pallete.indeterminate}`
              : ''
            return { borderColor }
          }, combineObject({ focusMode, isIncrease })))
        )(
          $row(layoutSheet.spacingSmall, style({ alignItems: 'center' }))(

            $field(
              O(
                map(node =>
                  merge(
                    now(node),
                    filterNull(snapshot((params, value) => {
                      if (value === 0n) {
                        node.element.value = ''
                      } else {
                        node.element.value = readableTokenAmount(params.inputTokenDescription.decimals, params.inputTokenPrice, value)
                      }

                      return null
                    }, combineObject({ indexTokenDescription, indexTokenPrice, inputTokenDescription, inputTokenPrice, }), autoFillSecondary))
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

                return getTokenUsd(state.indexTokenPrice, parsedInput)
              }, combineObject({ indexTokenDescription, indexTokenPrice }), src))
            )(),


            switchMap(list => {
              return $Dropdown({
                $container: $row(style({ position: 'relative', alignSelf: 'center' })),
                $selection: switchLatest(map(option => {
                  const tokenDesc = getTokenDescription(option.indexToken)

                  return $row(layoutSheet.spacingTiny, style({ alignItems: 'center', cursor: 'pointer' }))(
                    $icon({ $content: $tokenIconMap[tokenDesc.symbol], width: '34px', svgOps: style({ paddingRight: '4px' }), viewBox: '0 0 32 32' }),
                    $heading2(tokenDesc.symbol),
                    $icon({ $content: $caretDown, width: '14px', viewBox: '0 0 32 32' }),
                  )
                }, config.tradeConfig.market)),
                selector: {
                  value: config.tradeConfig.market,
                  $container: $defaultSelectContainer(style({ minWidth: '290px', right: 0 })),
                  $$option: map(option => {
                    const tokenDesc = getTokenDescription(option.indexToken)
                    const liquidity = tradeReader.getAvailableLiquidityUsd(now(option.indexToken), config.tradeConfig.collateralToken)
                    const poolInfo = tradeReader.getTokenPoolInfo(now(option.indexToken))

                    return $row(style({ placeContent: 'space-between', flex: 1 }))(
                      $tokenLabelFromSummary(tokenDesc),

                      $column(layoutSheet.spacingTiny, style({ alignItems: 'flex-end', placeContent: 'center' }))(
                        $text(map(amountUsd => readableFixedUSD30(amountUsd), liquidity)),
                        $row(style({ whiteSpace: 'pre' }))(
                          // $text(map(info => readableFixedBsp(info.rate), poolInfo)),
                          $text(style({ color: pallete.foreground }))(' / hr')
                        ),
                      )
                    )
                  }),
                  list: list,
                }
              })({
                select: changeMarketTether()
              })
            }, markets),


          ),

          $row(layoutSheet.spacingSmall, style({ placeContent: 'space-between' }))(
            style({ flexDirection: 'row-reverse' })(
              $hintNumChange({
                label: screenUtils.isDesktopScreen ? `Size` : undefined,
                change: map((params) => {
                  const totalSize = params.position ? params.sizeDeltaUsd + params.position.latestUpdate.sizeInUsd : params.sizeDeltaUsd

                  return readableFixedUSD30(totalSize)
                }, combineObject({ sizeDeltaUsd, position })),
                isIncrease: config.tradeConfig.isIncrease,
                tooltip: $column(layoutSheet.spacingSmall)(
                  $text('Size amplified by deposited Collateral and Leverage chosen'),
                  $text('Higher Leverage increases Liquidation Risk'),
                ),
                val: map(pos => pos ? readableFixedUSD30(pos.latestUpdate.sizeInUsd) : null, config.tradeState.position)
              })
            ),

            $row(layoutSheet.spacingSmall, style({ alignItems: 'center' }))(
              $infoTooltipLabel(
                `will be deposited & borrowed to maintain a Position`,
                screenUtils.isDesktopScreen ? 'Collateral In' : undefined
              ),

              switchMap(params => {
                const token = params.isUsdCollateralToken ? params.market.shortToken : params.market.longToken
                const tokenDesc = getTokenDescription(token)

                return $Dropdown({
                  $container: $row(style({ position: 'relative', alignSelf: 'center' })),
                  $selection: $row(style({ alignItems: 'center', cursor: 'pointer' }))(
                    $row(layoutSheet.spacingTiny, style({ alignItems: 'center' }))(
                      $icon({ $content: $tokenIconMap[tokenDesc.symbol], width: '14px', viewBox: '0 0 32 32' }),
                      $text(tokenDesc.symbol)
                    ),
                    $icon({ $content: $caretDown, width: '14px', viewBox: '0 0 32 32' })
                  ),
                  selector: {
                    value: now(params.isUsdCollateralToken),
                    $container: $defaultSelectContainer(style({ minWidth: '290px', right: 0 })),
                    $$option: map(option => {
                      const token = option ? params.market.shortToken : params.market.longToken
                      const desc = getTokenDescription(token)
                      const liquidity = tradeReader.getAvailableLiquidityUsd(now(token), now(option))
                      const poolInfo = tradeReader.getTokenPoolInfo(now(token))


                      return $row(style({ placeContent: 'space-between', flex: 1 }))(
                        $tokenLabelFromSummary(desc),

                        $column(layoutSheet.spacingTiny, style({ alignItems: 'flex-end', placeContent: 'center' }))(
                          $text(map(amountUsd => readableFixedUSD30(amountUsd), liquidity)),
                          $row(style({ whiteSpace: 'pre' }))(
                            $text(map(info => readablePercentage(info.rate), poolInfo)),
                            $text(style({ color: pallete.foreground }))(' / hr')
                          ),
                        )
                      )
                    }),
                    list: [
                      false,
                      true
                    ],
                  }
                })({
                  select: changeIsUsdCollateralTokenTether()
                })
              }, combineObject({ market, isUsdCollateralToken })),
              
            ),
          ),
        ),
      )

    ),

    {
      switchIsLong,
      changeInputToken,
      changeIndexToken: changeMarket,
      switchFocusMode: mergeArray([
        constant(ITradeFocusMode.collateral, mergeArray([clickClose, clickMax])),
        switchFocusMode,
      ]),
      leverage: mergeArray([
        filterNull(zip((params, positionSlot) => {
          if (positionSlot) {
            // const pnl = getPositionPnlUsd(
            //   marketInfo,
            //   marketPoolInfo,
            //   sizeInUsd: position.sizeInUsd,
            //   sizeInTokens: position.sizeInTokens,
            //   markPrice,
            //   isLong: position.isLong,
            // )
            // const collateralUsd = getTokenUsd(
            //   params.collateralTokenDescription.decimals,
            //   params.collateralTokenPrice,
            //   positionSlot.latestUpdate.collateralAmount
            // )

            // const nextSizeUsd = positionSlot..sizeInUsd.sub(sizeDeltaUsd) : BigNumber.from(0)

            // // const nextCollateralUsd = existingPosition
            // //   ? existingPosition.collateralUsd.sub(collateralDeltaUsd).sub(payedRemainingCollateralUsd)
            // //   : BigNumber.from(0)

            // return getLeverage(
            //   positionSlot.latestUpdate.sizeInUsd,
            //   collateralUsd,
            //   pnl,
            //   posInfo.fees.borrowing.borrowingFeeUsd,
            //   pendingFundingFeesUsd
            // )
            return div(stake.latestUpdate.sizeInUsd + params.sizeDeltaUsd, stake.collateral + params.collateralDeltaUsd - params.fundingFee)
          }

          return null
        }, combineObject({ collateralTokenDescription, collateralTokenPrice, collateralDeltaUsd, sizeDeltaUsd, fundingFee }), position)),
        mergeArray([clickClose, slideLeverage]),
      ]),
      switchIsIncrease,
      isUsdCollateralToken: changeIsUsdCollateralToken,
      changeCollateralDeltaUsd: mergeArray([
        inputPrimaryAmount,
        autoFillPrimaryAmount
      ]),
      changeSizeDeltaUsd: mergeArray([
        autoFillSecondary,
        inputSizeDeltaUsd,
      ]),
      changeSlippage,

    }
  ]
})


const formatLeverageNumber = new Intl.NumberFormat("en-US", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1
})



const $field = $element('input')(attr({ placeholder: '0.0', type: 'text' }), style({ width: '100%', lineHeight: '34px', margin: '14px 0', minWidth: '0', transition: 'background 500ms ease-in', flex: 1, fontSize: '1.85rem', background: 'transparent', border: 'none', outline: 'none', color: pallete.message }))




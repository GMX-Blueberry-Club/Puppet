import { Behavior, combineObject, O } from "@aelea/core"
import { $element, $Node, $text, attr, component, INode, NodeComposeFn, nodeEvent, style, styleInline } from "@aelea/dom"
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
  delta,
  div,
  filterNull,
  formatDiv,
  formatFixed,
  getAdjustedDelta,
  getBasisPoints,
  getNativeTokenDescription, getPnL,
  getTokenAmount,
  getTokenDescription, getTokenUsd,
  IMarket,
  IMarketInfo,
  IMarketPrice,
  IOraclePrice,
  IPositionSlot,
  ITokenDescription,
  parseFixed, parseReadableNumber,
  readableFixedUSD30,
  readableNumber,
  readablePercentage,
  readableTokenAmount,
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
  netPositionValueUsd: bigint
  isTradingEnabled: boolean
  isPrimaryApproved: boolean


  marketPrice: IMarketPrice
  collateralPrice: IOraclePrice
  primaryPrice: bigint
  indexPrice: bigint

  availableIndexLiquidityUsd: bigint
  walletBalance: bigint

  executionFee: bigint
  executionFeeUsd: bigint
  swapFee: bigint
  marginFeeUsd: bigint
  priceImpactUsd: bigint
  totalFeeUsd: bigint

  primaryDescription: ITokenDescription
  indexDescription: ITokenDescription
  collateralDescription: ITokenDescription

  averagePrice: bigint | null
  liquidationPrice: bigint | null

  stableFundingRateFactor: bigint
  fundingRateFactor: bigint

  collateralTokenPoolInfo: trade.ITokenPoolInfo
}

export interface ITradeActions {
  requestReset: null
}


export interface ITradeConfig {
  focusPrice: number | null
  market: IMarket
  marketInfo: IMarketInfo
  isLong: boolean
  primaryToken: viem.Address
  isUsdCollateralToken: boolean
  collateralToken: viem.Address
  isIncrease: boolean
  focusMode: ITradeFocusMode
  leverage: bigint
  sizeDelta: bigint
  sizeDeltaUsd: bigint
  collateralDelta: bigint
  collateralDeltaUsd: bigint
  // collateralDeltaAfterFeesUsd: bigint
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


  [clickPrimary, clickPrimaryTether]: Behavior<any>,

) => {

  const tradeReader = trade.connectTrade(config.chain)
  const pricefeed = connectContract(GMX.CONTRACT[config.chain.id].VaultPriceFeed)


  const { 
    collateralToken, collateralDelta, collateralDeltaUsd, sizeDelta, focusMode,
    market, marketInfo, primaryToken, isIncrease, isLong, leverage, sizeDeltaUsd, slippage, isUsdCollateralToken
  } = config.tradeConfig
  const {
    availableIndexLiquidityUsd, averagePrice, 
    collateralTokenPoolInfo, collateralDescription, collateralPrice, totalFeeUsd, executionFeeUsd, executionFee,

    indexDescription, marketPrice,
    primaryDescription, primaryPrice, indexPrice,

    isPrimaryApproved, isTradingEnabled, liquidationPrice, marginFeeUsd, route,
    position, swapFee, walletBalance, markets, netPositionValueUsd
  } = config.tradeState


  // const maxWalletBalanceUsd = skipRepeats(map(params => {
  //   const amountUsd = getTokenUsd(params.inputTokenDescription.decimals, params.inputTokenPrice, params.maxWalletBalance)

  //   return params.inputToken === GMX.ADDRESS_ZERO ? amountUsd - 0n : amountUsd
  // }, combineObject({ maxWalletBalance, inputTokenPrice, inputToken, inputTokenDescription })))


  const clickMaxPrimary = snapshot(params => {
    const marginGasFee = params.primaryToken === GMX.ADDRESS_ZERO ? params.executionFee * 4n : 0n
    const balance = params.walletBalance - marginGasFee

    if (params.isIncrease) return balance
    if (!params.position) return 0n

    const maxCollateral = div(params.position.latestUpdate.sizeInUsd, GMX.MAX_LEVERAGE_FACTOR)
    const positionCollateralUsd = params.position.latestUpdate.collateralAmount * params.marketPrice.indexTokenPrice.min
    const deltaUsd = maxCollateral - positionCollateralUsd

    return deltaUsd
  }, combineObject({ isIncrease, primaryToken, walletBalance, position, marketPrice, executionFee }), clickPrimary)


  const primaryEffects = mergeArray([
    inputSizeDeltaUsd,
    switchLatest(map((focus) => {
      if (focus === ITradeFocusMode.collateral) return empty()

      const effects = mergeArray([config.tradeConfig.leverage, config.tradeState.primaryPrice])
      return sample(config.tradeConfig.sizeDeltaUsd, effects)
    }, config.tradeConfig.focusMode))
  ])

  const autoFillPrimaryAmount = multicast(mergeArray([
    constant(0n, config.tradeActions.requestReset),
    clickMaxPrimary,
    skipRepeats(snapshot((params, sizeDeltaUsdFx) => {
      const positionSizeUsd = params.position ? params.position.latestUpdate.sizeInUsd : 0n
      const nextFeeUsd = abs(params.totalFeeUsd * params.leverage / GMX.BASIS_POINTS_DIVISOR)
      const totalSize = sizeDeltaUsdFx + positionSizeUsd
      const nextCollateralUsd = div(totalSize + nextFeeUsd, params.leverage)
      const nextCollateralTokenAmount = getTokenAmount(params.indexPrice, nextCollateralUsd)

      if (params.position) {
        const positionMultiplier = div(totalSize, params.netPositionValueUsd)
        const deltaMultiplier = delta(positionMultiplier, params.leverage)  // params.isIncrease ? positionMultiplier - nextMultiplier : nextMultiplier - positionMultiplier
        
        if (deltaMultiplier < 300n) {
          if (!params.isIncrease && params.leverage <= GMX.MIN_LEVERAGE_FACTOR) {
            return -params.position.latestUpdate.sizeInUsd
          }

          return 0n
        } 
      }

      const nextCollateralDeltaAmount = nextCollateralTokenAmount - getTokenAmount(params.collateralPrice.max, params.netPositionValueUsd)

      return nextCollateralDeltaAmount
    }, combineObject({ position, leverage, walletBalance, indexPrice, isIncrease, totalFeeUsd, collateralPrice, netPositionValueUsd }), primaryEffects))
  ]))


  const secondaryEffects = mergeArray([
    inputPrimaryAmount,
    clickMaxPrimary,
    switchLatest(map((focus) => {
      if (focus === ITradeFocusMode.size) {
        return empty()
      }

      const effects = mergeArray([config.tradeConfig.leverage, config.tradeState.indexPrice])
      return sample(config.tradeConfig.collateralDelta, effects)
    }, config.tradeConfig.focusMode)),
  ])

  const autoFillSecondary = multicast(mergeArray([
    constant(0n, config.tradeActions.requestReset),
    snapshot((params, collateralDeltaAmount) => {
      const nextCollateralDeltaUsdAfterFees = getTokenUsd(params.primaryPrice, collateralDeltaAmount) + params.totalFeeUsd
      const positionSizeUsd = params.position ? params.position.latestUpdate.sizeInUsd : 0n
      const totalCollateral = nextCollateralDeltaUsdAfterFees + params.netPositionValueUsd
     
      if (params.position) {
        const positionMultiplier = div(params.position.latestUpdate.sizeInUsd, totalCollateral)
        const deltaMultiplier = delta(positionMultiplier, params.leverage) // params.isIncrease ? params.leverage - positionMultiplier : positionMultiplier - params.leverage

        if (deltaMultiplier < 200n) {
          return 0n
        }

        if (!params.isIncrease && params.leverage <= GMX.MIN_LEVERAGE_FACTOR) {
          return -positionSizeUsd
        }
      }

      const nextSize = totalCollateral * params.leverage / GMX.BASIS_POINTS_DIVISOR
      return nextSize - positionSizeUsd
    }, combineObject({ leverage, position, totalFeeUsd, isIncrease, netPositionValueUsd, collateralPrice, primaryPrice, primaryDescription }), secondaryEffects)
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
                  if (params.position === null) return null

                  return readableFixedUSD30(params.netPositionValueUsd + params.collateralDeltaUsd)
                }, combineObject({ sizeDeltaUsd, position, primaryPrice, marketPrice, isIncrease, netPositionValueUsd, collateralDeltaUsd, collateralPrice, swapFee, marginFeeUsd, isLong, totalFeeUsd })),
                isIncrease: config.tradeConfig.isIncrease,
                tooltip: 'The amount deposited after fees to maintain a leverage position',
                val: map(params => {
                  return readableFixedUSD30(params.netPositionValueUsd || params.collateralDeltaUsd)
                }, combineObject({ collateralDeltaUsd, netPositionValueUsd })),
              })
            ),

            $row(layoutSheet.spacingSmall, style({ alignItems: 'center' }))(
              $infoLabel(`Balance`),
              $text(
                map(params => {
                  const newLocal = formatFixed(params.walletBalance, params.primaryDescription.decimals)
                  const newLocal_1 = readableNumber({})(newLocal)
                  
                  return newLocal_1 + ' ' + params.primaryDescription.symbol
                }, combineObject({ primaryToken, walletBalance, primaryDescription }))
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
                        const formatted = formatFixed(val, state.primaryDescription.decimals)
                        node.element.value = readableUnitAmount(formatted)
                      }

                      return null
                    }, combineObject({ primaryDescription, primaryPrice }), autoFillPrimaryAmount))
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
                const parsedInput = parseFixed(val, state.primaryDescription.decimals)

                return parsedInput
                // return getTokenUsd(state.inputTokenDescription.decimals, state.inputTokenPrice, parsedInput)
              }, combineObject({ primaryDescription, primaryPrice }), src)),
            )(),


            $ButtonSecondary({
              $content: switchMap(params => params.isIncrease ? $text('Max') : $text('Close'), combineObject({ isIncrease })),
              disabled: map(params => {

                if (
                  params.walletBalance === 0n
                  || getBasisPoints(params.collateralDelta, params.walletBalance) > 9000n
                  // || params.sizeDelta > 0n
                  || !params.isIncrease && params.position === null
                ) {
                  return true
                }

                return false
              }, combineObject({ isIncrease, collateralDelta, sizeDelta, walletBalance, position })),
              $container: $defaultMiniButtonSecondary
            })({
              click: clickPrimaryTether(delay(10))
            }),


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
                }, primaryDescription)),
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
                  value: config.tradeConfig.primaryToken,
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
            min: map(params => {
              if (params.position === null) {
                return MIN_LEVERAGE_NORMAL
              } 

              if (params.isIncrease) {
                if (params.position) {
                  if (params.focusMode === ITradeFocusMode.size) {
                    const walletBalanceUsd = getTokenUsd(params.primaryPrice, params.walletBalance)
                    const ratio = div(params.position.latestUpdate.sizeInUsd + params.sizeDeltaUsd, walletBalanceUsd + params.netPositionValueUsd + params.totalFeeUsd)
                    return formatDiv(ratio, GMX.MAX_LEVERAGE_FACTOR)
                  }

                  
                  // const totalCollateral = params.collateralDeltaUsd + params.netPositionValueUsd + params.totalFeeUsd
                  const totalCollateral = params.collateralDeltaUsd + params.netPositionValueUsd

                  return Math.max(MIN_LEVERAGE_NORMAL, formatDiv(div(params.position.latestUpdate.sizeInUsd, totalCollateral), GMX.MAX_LEVERAGE_FACTOR))
                }

                return MIN_LEVERAGE_NORMAL
              }

              if (params.focusMode === ITradeFocusMode.size) {
                const totalSize = params.position ? params.sizeDeltaUsd + params.position.latestUpdate.sizeInUsd : params.sizeDeltaUsd

                if (params.position) {
                  return Math.max(MIN_LEVERAGE_NORMAL, formatDiv(div(totalSize, params.netPositionValueUsd + params.totalFeeUsd), GMX.MAX_LEVERAGE_FACTOR))

                  // formatDiv(div(totalSize, params.collateralDeltaUsd - params.netPositionValueUsd), GMX.MAX_LEVERAGE_FACTOR)
                }

                return 0
              }



              return 0
            }, combineObject({ sizeDeltaUsd, walletBalance, collateralDeltaUsd, netPositionValueUsd, totalFeeUsd, position, primaryPrice, focusMode, isIncrease })),
            max: map(params => {
              if (params.position === null) {
                return 1
              }

              const totalSize = params.position.latestUpdate.sizeInUsd + params.sizeDeltaUsd

              if (params.isIncrease) {
                if (params.focusMode === ITradeFocusMode.size) {

                  // return 1
                  const ratio = div(totalSize, params.netPositionValueUsd - params.totalFeeUsd)
                  const newLocal = formatDiv(ratio, GMX.MAX_LEVERAGE_FACTOR)
                  return Math.min(1, newLocal)
                }

                return 1
              } else  {
                if (params.focusMode === ITradeFocusMode.collateral) {
                  const totalCollateral = params.netPositionValueUsd + params.collateralDeltaUsd
                  const ratio = div(params.position.latestUpdate.sizeInUsd, totalCollateral)

                  return Math.min(1, formatDiv(ratio, GMX.MAX_LEVERAGE_FACTOR))
                }
              }

              return 1
            }, combineObject({ position, totalFeeUsd, collateralDeltaUsd, netPositionValueUsd, sizeDeltaUsd, focusMode, isIncrease, walletBalance })),
            thumbText: map(n => (n === 1 ? LIMIT_LEVERAGE_NORMAL : formatLeverageNumber.format(n * LIMIT_LEVERAGE_NORMAL)))
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
                        node.element.value = readableTokenAmount(params.primaryDescription.decimals, params.primaryPrice, value)
                      }

                      return null
                    }, combineObject({ primaryDescription, primaryPrice, }), autoFillSecondary))
                  )
                ),
                switchLatest
              ),
              styleInline(map(focus => focus === ITradeFocusMode.size ? { color: pallete.message } : { color: pallete.foreground }, config.tradeConfig.focusMode)),
              switchFocusModeTether(nodeEvent('focus'), constant(ITradeFocusMode.size)),
              inputSizeDeltaTetherUsd(nodeEvent('input'), src => snapshot((params, inputEvent) => {
                const target = inputEvent.currentTarget

                if (!(target instanceof HTMLInputElement)) {
                  console.warn(new Error('Target is not type of input'))

                  return 0n
                }

                if (target.value === '') {
                  return 0n
                }

                const parsedInput = parseFixed(parseReadableNumber(target.value), params.indexDescription.decimals)

                return getTokenUsd(params.marketPrice.indexTokenPrice.min, parsedInput)
              }, combineObject({ indexDescription, marketPrice }), src))
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
                }, market)),
                selector: {
                  value: market,
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
                  if (params.position === null) return null
                  const totalSize = params.sizeDeltaUsd + params.position.latestUpdate.sizeInUsd

                  return readableFixedUSD30(totalSize)
                }, combineObject({ sizeDeltaUsd, position })),
                isIncrease: config.tradeConfig.isIncrease,
                tooltip: $column(layoutSheet.spacingSmall)(
                  $text('Size amplified by deposited Collateral and Leverage chosen'),
                  $text('Higher Leverage increases Liquidation Risk'),
                ),
                val: map(params => {
                  const valueUsd = params.position ? params.position.latestUpdate.sizeInUsd : params.sizeDeltaUsd

                  return readableFixedUSD30(valueUsd)
                }, combineObject({ sizeDeltaUsd, position })),
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
      changeMarket,
      switchFocusMode: mergeArray([
        constant(ITradeFocusMode.collateral, clickPrimary),
        switchFocusMode,
      ]),
      leverage: mergeArray([
        filterNull(zip((params, positionSlot) => {
          if (positionSlot === null) return null

          const newLocal = div(positionSlot.latestUpdate.sizeInUsd, params.netPositionValueUsd)

          if (newLocal === 0n) {
            debugger
          }

          return newLocal
        }, combineObject({ netPositionValueUsd }), position)),
        slideLeverage,
        switchMap(ii=> ii ? empty() : clickPrimary, isIncrease)
      ]),
      switchIsIncrease,
      isUsdCollateralToken: changeIsUsdCollateralToken,
      changeCollateralDelta: mergeArray([
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




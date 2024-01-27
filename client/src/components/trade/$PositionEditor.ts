import { Behavior, combineObject, O } from "@aelea/core"
import { $element, $node, $Node, $text, attr, component, INode, NodeComposeFn, nodeEvent, style, styleInline } from "@aelea/dom"
import { Route } from "@aelea/router"
import { $column, $icon, $row, layoutSheet, screenUtils } from "@aelea/ui-components"
import { colorAlpha, pallete } from "@aelea/ui-components-theme"
import {
  constant, delay, empty, map, merge,
  mergeArray,
  multicast, now,
  skipRepeats,
  snapshot,
  switchLatest
} from "@most/core"
import { Stream } from "@most/types"
import { ADDRESS_ZERO, BASIS_POINTS_DIVISOR, delta, div, filterNull, formatDiv, formatFixed, getBasisPoints, getTokenAmount, getTokenUsd, ITokenDescription, parseBps, parseFixed, parseReadableNumber, readableNumber, readableTokenAmountFromUsdAmount, readableTokenUsd, readableUnitAmount, readableUsd, StateStream, switchMap } from "common-utils"
import * as GMX from "gmx-middleware-const"
import { getNativeTokenAddress, getNativeTokenDescription, getTokenDescription, IMarket, IMarketInfo, IMarketPrice, resolveAddress, TEMP_MARKET_LIST } from "gmx-middleware-utils"
import { IMirrorPositionOpen, IMirrorPositionSettled, ISetRouteType, latestPriceMap } from "puppet-middleware-utils"
import {
  $bear, $bull,
  $ButtonToggle,
  $defaultTableRowContainer,
  $hintNumChange, $infoLabel,
  $infoTooltipLabel,
  $moreDots,
  $tokenIconMap, $tokenLabelFromSummary
} from "ui-components"
import * as viem from "viem"
import { $MarketInfoList } from "../$MarketList"
import { $Popover } from "../$Popover"
import { $Slider } from "../$Slider.js"
import { $gmxLogo } from "../../common/$icons"
import { $heading2 } from "../../common/$text.js"
import { $TextField } from "../../common/$TextField"
import { boxShadow } from "../../common/elements/$common"
import { $caretDown } from "../../common/elements/$icons.js"
import { ITradeFocusMode } from "../../const/type.js"
import * as trade from "../../logic/traderLogic.js"
import { walletLink } from "../../wallet"
import { ISupportedChain } from "../../wallet/walletLink.js"
import { $ButtonCircular, $ButtonSecondary, $defaultMiniButtonSecondary } from "../form/$Button.js"
import { $defaultSelectContainer, $Dropdown } from "../form/$Dropdown.js"



export interface ITradeParams {
  tradeRoute: viem.Address | null
  routeTypeKey: viem.Hex

  position: IMirrorPositionOpen | null
  netPositionValueUsd: bigint
  isTradingEnabled: boolean
  isPrimaryApproved: boolean

  marketPrice: IMarketPrice
  collateralPrice: bigint
  primaryPrice: bigint
  indexPrice: bigint

  marketAvailableLiquidityUsd: bigint
  walletBalance: bigint

  executionFee: bigint
  // swapFee: bigint
  marginFeeUsd: bigint
  priceImpactUsd: bigint
  adjustmentFeeUsd: bigint

  primaryDescription: ITokenDescription
  indexDescription: ITokenDescription
  collateralDescription: ITokenDescription

  averagePrice: bigint | null
  liquidationPrice: bigint | null

  marketInfo: IMarketInfo
}




export interface ITradeConfig {
  focusPrice: number | null
  market: IMarket
  isLong: boolean
  indexToken: viem.Address
  primaryToken: viem.Address
  isUsdCollateralToken: boolean
  collateralToken: viem.Address
  isIncrease: boolean
  focusMode: ITradeFocusMode
  leverage: bigint
  sizeDeltaUsd: bigint
  collateralDeltaAmount: bigint
  slippage: bigint
  executionFeeBuffer: bigint
}


export interface IPositionEditorAbstractParams {
  referralCode: viem.Hex
  routeTypeListQuery: Stream<Promise<ISetRouteType[]>>
  parentRoute: Route
  chain: ISupportedChain
}


interface IPositionEditorConfig extends IPositionEditorAbstractParams {
  tradeConfig: StateStream<ITradeConfig> // ITradeParams
  tradeState: StateStream<ITradeParams>
  resetAdjustments: Stream<any>
  $container: NodeComposeFn<$Node>
}



const BOX_SPACING = 24
const LIMIT_LEVERAGE_NORMAL = formatFixed(GMX.MAX_LEVERAGE_FACTOR, 4)
const MIN_LEVERAGE_NORMAL = formatFixed(GMX.MIN_LEVERAGE_FACTOR, 4) / LIMIT_LEVERAGE_NORMAL

export const $PositionEditor = (config: IPositionEditorConfig) => component((
  [clickSettingsPopover, clickSettingsPopoverTether]: Behavior<any, boolean>,
  [switchIsLong, switchIsLongTether]: Behavior<boolean>,

  [switchFocusMode, switchFocusModeTether]: Behavior<any, ITradeFocusMode>,

  [inputPrimaryAmount, inputPrimaryAmountTether]: Behavior<INode, bigint>,
  [inputSizeDeltaUsd, inputSizeDeltaTetherUsd]: Behavior<INode, bigint>,

  [changePrimaryToken, changePrimaryTokenTether]: Behavior<viem.Address, viem.Address>,
  [changeMarketToken, changeMarketTokenTether]: Behavior<any, viem.Address>,
  [clickChooseMarketPopover, clickChooseMarketPopoverTether]: Behavior<any>,
  // [changeIsUsdCollateralToken, changeIsUsdCollateralTokenTether]: Behavior<boolean>,

  [changeLeverage, changeLeverageTether]: Behavior<number, bigint>,
  [changeSlippage, changeSlippageTether]: Behavior<string, bigint>,
  [changeExecutionFeeBuffer, changeExecutionFeeBufferTether]: Behavior<string, bigint>,

  [clickPrimary, clickPrimaryTether]: Behavior<any>,
) => {


  const {
    collateralToken, collateralDeltaAmount, focusMode, indexToken,
    market, primaryToken, isIncrease, isLong, leverage, sizeDeltaUsd, slippage, isUsdCollateralToken
  } = config.tradeConfig
  const {
    marketAvailableLiquidityUsd, averagePrice, 
    collateralDescription, collateralPrice, adjustmentFeeUsd, executionFee,

    indexDescription, marketPrice,
    primaryDescription, primaryPrice, indexPrice,

    isPrimaryApproved, isTradingEnabled, liquidationPrice, marginFeeUsd, tradeRoute,
    position, walletBalance, netPositionValueUsd, priceImpactUsd, routeTypeKey
  } = config.tradeState


  const clickMaxPrimary = snapshot(params => {
    const marginGasFee = params.primaryToken === ADDRESS_ZERO ? params.executionFee * 4n : 0n
    const balance = params.walletBalance - marginGasFee

    if (params.isIncrease) {
      return balance
    }

    if (!params.position) return 0n

    const maxCollateral = div(params.position.position.sizeInUsd, GMX.MAX_LEVERAGE_FACTOR)
    const positionCollateralUsd = params.position.position.collateralAmount * params.marketPrice.indexTokenPrice.min
    const deltaUsd = maxCollateral - positionCollateralUsd

    return deltaUsd
  }, combineObject({ focusMode, isIncrease, primaryToken, walletBalance, primaryPrice, position, marketPrice, executionFee }), clickPrimary)


  const collateralEffects = mergeArray([
    inputSizeDeltaUsd,
    switchLatest(map(focus => {
      if (focus === ITradeFocusMode.collateral) return empty()
      
      return mergeArray([
        config.tradeConfig.leverage,
        config.tradeState.primaryPrice
      ])
    }, config.tradeConfig.focusMode))
  ])


  const autoChangeCollateralAmount = multicast(mergeArray([
    constant(0n, config.resetAdjustments),
    clickMaxPrimary,
    skipRepeats(snapshot(params => {
      const positionSizeUsd = params.position ? params.position.position.sizeInUsd : 0n
      const nextFeeUsd = params.adjustmentFeeUsd * params.leverage / BASIS_POINTS_DIVISOR
      const totalSize = params.sizeDeltaUsd + positionSizeUsd
      const nextCollateralUsd = div(totalSize - nextFeeUsd, params.leverage)

      if (params.position) {
        const positionMultiplier = div(totalSize, params.netPositionValueUsd)
        const deltaMultiplier = delta(positionMultiplier, params.leverage)  // params.isIncrease ? positionMultiplier - nextMultiplier : nextMultiplier - positionMultiplier
        
        if (deltaMultiplier < 500n) {
          if (!params.isIncrease && params.leverage <= GMX.MIN_LEVERAGE_FACTOR) {
            return -params.position.position.sizeInUsd
          }

          return 0n
        } 
      }

      const nextCollateralDeltaUsd = nextCollateralUsd - params.netPositionValueUsd
      const nextCollateralDeltaAmount = getTokenAmount(params.collateralPrice, nextCollateralDeltaUsd)
      return nextCollateralDeltaAmount
    }, combineObject({ position, leverage, walletBalance, sizeDeltaUsd, indexPrice, isIncrease, adjustmentFeeUsd, collateralPrice, netPositionValueUsd }), collateralEffects))
  ]))

  const sizeEffects = mergeArray([
    inputPrimaryAmount,
    clickMaxPrimary,
    switchLatest(map(focus => {
      if (focus === ITradeFocusMode.size) {
        return empty()
      }

      return mergeArray([
        config.tradeState.primaryPrice,
        config.tradeConfig.leverage
      ])
    }, config.tradeConfig.focusMode)),
  ])

  const autoChangeSize = multicast(mergeArray([
    constant(0n, config.resetAdjustments),
    snapshot((params) => {
      const positionSizeUsd = params.position ? params.position.position.sizeInUsd : 0n
      const collateralDeltaUsd = params.collateralDeltaAmount * params.primaryPrice
      const totalCollateral = collateralDeltaUsd + params.netPositionValueUsd + params.adjustmentFeeUsd
     
      if (params.position) {
        const positionMultiplier = div(params.position.position.sizeInUsd, totalCollateral)
        const deltaMultiplier = delta(positionMultiplier, params.leverage) // params.isIncrease ? params.leverage - positionMultiplier : positionMultiplier - params.leverage

        if (deltaMultiplier < 500n) {
          return 0n
        }

        if (!params.isIncrease && params.leverage <= GMX.MIN_LEVERAGE_FACTOR) {
          return -positionSizeUsd
        }
      }

      const nextSize = totalCollateral * params.leverage / BASIS_POINTS_DIVISOR

      return nextSize - positionSizeUsd
    }, combineObject({ leverage, position, adjustmentFeeUsd, isIncrease, netPositionValueUsd, primaryPrice, collateralDeltaAmount }), sizeEffects)
  ]))




  return [
    config.$container(style({
      boxShadow: boxShadow
    }))(
      $row(
        layoutSheet.spacing,
        // styleInline(map(isIncrease => isIncrease ? { borderColor: 'none' } : {}, config.tradeConfig.isIncrease)),
        style({
          padding: '12px',
          marginBottom: `-${BOX_SPACING}px`,
          paddingBottom: `${BOX_SPACING + 12}px`,
          alignItems: 'center',
          backgroundColor: pallete.background,
          border: `1px solid ${colorAlpha(pallete.foreground, .20)}`,
          borderBottom: 'none',
          // borderTop: 'none',
          borderRadius: `${BOX_SPACING}px ${BOX_SPACING}px 0px 0px`,
        })
      )(

        
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
        })({
          select: switchIsLongTether()
        }),



        // $ButtonToggle({
        //   $container: $row(layoutSheet.spacingSmall),
        //   selected: config.tradeConfig.isIncrease,
        //   options: [
        //     true,
        //     false,
        //   ],
        //   $$option: map(option => { 
        //     return $text(style({}))(option ? 'Increase' : 'Decrease')
        //   })
        // })({ select: switchisIncreaseTether() }),

        $node(style({ flex: 1 }))(),

        $ButtonSecondary({
          disabled: now(true),
          $content: $row(layoutSheet.spacingTiny, style({ alignItems: 'center', cursor: 'pointer' }))(
            $icon({ $content: $gmxLogo, width: '18px', viewBox: '0 0 32 32' }),
            $text('GMX V2'),
            $icon({ $content: $caretDown, width: '14px', viewBox: '0 0 32 32' }),
          ),
          $container: $defaultMiniButtonSecondary(style({ borderColor: pallete.foreground, backgroundColor: 'transparent' })),
        })({}),

        $Popover({
          open: constant(
            $column(layoutSheet.spacing, style({ width: '300px' }))(

              $TextField({
                label: 'Slippage %',
                value: map(x => formatFixed(x, 4) * 100, config.tradeConfig.slippage),
                hint: 'the difference between the expected price of the trade and the execution price',
                // inputOp: style({ width: '60px', maxWidth: '60px', textAlign: 'right', fontWeight: 'normal' }),
                validation: map(n => {
                  const val = Number(n)
                  const valid = val >= 0
                  if (!valid) {
                    return 'Invalid Basis point'
                  }
                  if (val > 5) {
                    return 'Slippage should be less than 5%'
                  }
                  return null
                }),
              })({
                change: changeSlippageTether(
                  map(x => parseBps(Number(x) / 100))
                )
              }),

              $TextField({
                label: 'Execution Fee Buffer %',
                value: map(x => formatFixed(x, 4) * 100, config.tradeConfig.executionFeeBuffer),
                hint: 'higher value to handle potential increases in gas price during order execution',
                // inputOp: style({ width: '60px', maxWidth: '60px', textAlign: 'right', fontWeight: 'normal' }),
                validation: map(n => {
                  const val = Number(n)
                  const valid = val >= 0
                  if (!valid) {
                    return 'Invalid Basis point'
                  }
                  return null
                }),
              })({
                change: changeExecutionFeeBufferTether(
                  map(x => parseBps(Number(x) / 100))
                )
              }),
            ),
            clickSettingsPopover
          ),
          $target: $ButtonCircular({
            // disabled: clickSettingsPopover,
            $iconPath: $moreDots,
          })({ click: clickSettingsPopoverTether() }),
        })({
          // overlayClick: clickSettingsPopoverTether()
        }),

      ),

      $column(style({ borderRadius: `${BOX_SPACING}px`, backgroundColor: pallete.middleground }))(
        $column(layoutSheet.spacingSmall, style({ padding: `${BOX_SPACING}px`, borderRadius: `${BOX_SPACING}px ${BOX_SPACING}px 0 0`, border: `1px solid ${colorAlpha(pallete.foreground, .20)}` }),
          styleInline(now({ borderBottom: 'none' })),
          styleInline(map(params => {
            return params.focusMode === ITradeFocusMode.collateral ? { borderColor: params.isIncrease ? `${pallete.primary}` : `${pallete.indeterminate}` } : { borderColor: '' }
          }, combineObject({ focusMode, isIncrease })))
        )(
          $row(layoutSheet.spacingSmall, style({ placeContent: 'space-between' }))(
            $row(layoutSheet.spacingSmall, style({ alignItems: 'center' }))(
              $infoLabel(`Balance`),
              $text(
                map(params => {
                  const newLocal = formatFixed(params.walletBalance, params.primaryDescription.decimals)
                  const newLocal_1 = readableNumber({})(newLocal)

                  return newLocal_1 + ' ' + params.primaryDescription.symbol
                }, combineObject({ walletBalance, primaryDescription }))
              ),
            ),
            $hintNumChange({
              label: screenUtils.isDesktopScreen ? `Collateral` : undefined,
              change: map(params => {
                if (params.position === null) return null
                const collateralDeltaUsd = params.collateralDeltaAmount * params.primaryPrice

                return readableUsd(params.netPositionValueUsd + collateralDeltaUsd)
              }, combineObject({ position, primaryPrice, collateralDeltaAmount, netPositionValueUsd })),
              isIncrease: config.tradeConfig.isIncrease,
              tooltip: 'The amount deposited after fees to maintain a leverage position',
              val: map(params => {
                const collateralDeltaUsd = params.collateralDeltaAmount * params.primaryPrice
                return readableUsd(params.netPositionValueUsd || collateralDeltaUsd)
              }, combineObject({ collateralDeltaAmount, primaryPrice, netPositionValueUsd })),
            }),
          ),
          $row(layoutSheet.spacingSmall, style({ alignItems: 'center' }))(

            $Dropdown({
              $container: $row(style({ position: 'relative', alignSelf: 'center' })),
              $selection: switchLatest(map(token => {
                const tokenDesc = token === ADDRESS_ZERO
                  ? getNativeTokenDescription(config.chain)
                  : getTokenDescription(resolveAddress(config.chain, token))

                return $ButtonSecondary({
                  $content: $row(layoutSheet.spacingTiny, style({ alignItems: 'center', cursor: 'pointer' }))(
                    $icon({ $content: $tokenIconMap[tokenDesc.symbol], width: '34px', svgOps: style({ paddingRight: '4px' }), viewBox: '0 0 32 32' }),
                    $heading2(tokenDesc.symbol),
                    $icon({ $content: $caretDown, width: '14px', viewBox: '0 0 32 32' }),
                  ),
                  $container: $defaultMiniButtonSecondary(style({ borderColor: colorAlpha(pallete.foreground, .2), backgroundColor: 'transparent' })),
                })({})
              }, primaryToken)),
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
                $container: $defaultSelectContainer(style({ minWidth: '290px', right: 0, left: 'auto' })),
                $$option: snapshot((w3p, option) => {
                  const address = w3p?.account.address
                  const token = resolveAddress(config.chain, option)
                  const balanceAmount = address ? trade.getWalletErc20Balance(config.chain, option, address) : now(0n)
                  const tokenDesc = option === ADDRESS_ZERO ? getNativeTokenDescription(config.chain) : getTokenDescription(option)

                  return $row(style({ placeContent: 'space-between', flex: 1 }))(
                    $tokenLabelFromSummary(tokenDesc),
                    $column(style({ alignItems: 'flex-end' }))(
                      $text(style({ whiteSpace: 'nowrap' }))(map(bn => readableUnitAmount(formatFixed(bn, tokenDesc.decimals)) + ` ${tokenDesc.symbol}`, balanceAmount)),
                      $text(
                        map(params => {
                          const price = params.latestPriceMap[token]

                          return readableTokenUsd(price.min, params.balanceAmount)
                        }, combineObject({ balanceAmount, latestPriceMap }))
                      ),
                    )
                  )
                }, walletLink.wallet),
                list: [
                  ADDRESS_ZERO,
                  ...TEMP_MARKET_LIST.map(m => m.indexToken),
                  TEMP_MARKET_LIST[0].shortToken,
                  // params.market.longToken,
                  // params.market.shortToken,
                  // ...params.markets.map(m => m.indexToken)
                ],
              }
            })({
              select: changePrimaryTokenTether()
            }),


            $ButtonSecondary({
              $content: $text('Max'),
              disabled: map(params => {

                if (params.walletBalance === 0n || !params.isIncrease && params.position === null) {
                  return true
                }

                const primaryCollateralThreshold = getBasisPoints(params.collateralDeltaAmount, params.walletBalance)

                if (primaryCollateralThreshold > 9000n && primaryCollateralThreshold <= 10000n) {
                  return true
                }

                return false
              }, combineObject({ walletBalance, collateralDeltaAmount, position, isIncrease })),
              $container: $defaultMiniButtonSecondary
            })({
              click: clickPrimaryTether(delay(10))
            }),

            $field(
              O(
                map(node =>
                  merge(
                    now(node),
                    filterNull(snapshot((params, tokenAmount) => {
                      if (tokenAmount === 0n) {
                        node.element.value = ''
                      } else {
                        const formatted = formatFixed(tokenAmount, params.primaryDescription.decimals)
                        node.element.value = readableUnitAmount(formatted)
                      }

                      return null
                    }, combineObject({ primaryDescription, primaryPrice }), autoChangeCollateralAmount))
                  )
                ),
                switchLatest
              ),
              styleInline(map(focus => focus === ITradeFocusMode.collateral ? { color: pallete.message } : { color: pallete.foreground }, config.tradeConfig.focusMode)),
              switchFocusModeTether(
                nodeEvent('focus'),
                constant(ITradeFocusMode.collateral),
                // multicast
              ),
              inputPrimaryAmountTether(
                nodeEvent('input'),
                src => snapshot((state, inputEvent) => {
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
                }, combineObject({ primaryDescription, primaryPrice }), src),
                // multicast
              ),
            )(),


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
            color: map(isIncrease => {
              return isIncrease ? pallete.foreground : pallete.indeterminate
            }, config.tradeConfig.isIncrease),
            min: map(params => {
              if (params.position === null) {
                return MIN_LEVERAGE_NORMAL
              }

              if (params.isIncrease) {
                if (params.position) {
                  if (params.focusMode === ITradeFocusMode.size) {
                    const walletBalanceUsd = getTokenUsd(params.primaryPrice, params.walletBalance)
                    const ratio = div(params.position.position.sizeInUsd + params.sizeDeltaUsd, walletBalanceUsd + params.netPositionValueUsd + params.adjustmentFeeUsd)
                    return formatDiv(ratio, GMX.MAX_LEVERAGE_FACTOR)
                  }

                  
                  const collateralDeltaUsd = params.collateralDeltaAmount * params.primaryPrice
                  const totalCollateral = params.netPositionValueUsd + collateralDeltaUsd

                  return Math.max(MIN_LEVERAGE_NORMAL, formatDiv(div(params.position.position.sizeInUsd, totalCollateral), GMX.MAX_LEVERAGE_FACTOR))
                }

                return MIN_LEVERAGE_NORMAL
              }

              if (params.focusMode === ITradeFocusMode.size) {
                const totalSize = params.position ? params.sizeDeltaUsd + params.position.position.sizeInUsd : params.sizeDeltaUsd

                if (params.position) {
                  return Math.max(MIN_LEVERAGE_NORMAL, formatDiv(div(totalSize, params.netPositionValueUsd + params.adjustmentFeeUsd), GMX.MAX_LEVERAGE_FACTOR))
                }

                return 0
              }

              return 0
            }, combineObject({ position, isIncrease, focusMode, sizeDeltaUsd, walletBalance, collateralDeltaAmount, netPositionValueUsd, adjustmentFeeUsd, primaryPrice })),
            max: map(params => {
              if (params.position === null) {
                return 1
              }

              const totalSize = params.position.position.sizeInUsd + params.sizeDeltaUsd

              if (params.isIncrease) {
                if (params.focusMode === ITradeFocusMode.size) {

                  // return 1
                  const ratio = div(totalSize, params.netPositionValueUsd + params.adjustmentFeeUsd)
                  const newLocal = formatDiv(ratio, GMX.MAX_LEVERAGE_FACTOR)
                  return Math.min(1, newLocal)
                }

                return 1
              } else  {
                if (params.focusMode === ITradeFocusMode.collateral) {
                  const collateralDeltaUsd = params.collateralDeltaAmount * params.primaryPrice
                  const totalCollateral = params.netPositionValueUsd + collateralDeltaUsd
                  const ratio = div(params.position.position.sizeInUsd, totalCollateral)

                  return Math.min(1, formatDiv(ratio, GMX.MAX_LEVERAGE_FACTOR))
                }
              }

              return 1
            }, combineObject({ sizeDeltaUsd, walletBalance, collateralDeltaAmount, netPositionValueUsd, adjustmentFeeUsd, position, primaryPrice, focusMode, isIncrease })),
            thumbText: map(n => (n === 1 ? LIMIT_LEVERAGE_NORMAL : formatLeverageNumber.format(n * LIMIT_LEVERAGE_NORMAL)))
          })({
            change: changeLeverageTether(
              map(leverage => {
                const leverageRatio = BigInt(Math.round(Math.abs(leverage) * Number(GMX.MAX_LEVERAGE_FACTOR)))

                return leverageRatio
              }),
              multicast,
              skipRepeats
            )
          }),
        ),


        $column(layoutSheet.spacingSmall, style({ padding: `${BOX_SPACING}px`, borderRadius: `0 0 ${BOX_SPACING}px ${BOX_SPACING}px`, border: `1px solid ${colorAlpha(pallete.foreground, .20)}` }),
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

            $Popover({
              open: constant(
                $MarketInfoList({
                  chain: config.chain,
                  $rowCallback: map(params => {
                    return $defaultTableRowContainer(style({ borderTop: `1px solid ${colorAlpha(pallete.foreground, .20)}` }))(
                      changeMarketTokenTether(
                        nodeEvent('click'),
                        constant(params.market.marketToken),
                      )
                    )
                  })
                })({
                // changeMarket: changeMarketTether(),
                }),
                clickChooseMarketPopover
              ),
              $target: switchLatest(map(token => {
                const nativeToken = getNativeTokenAddress(config.chain)
                const tokenDesc = token === nativeToken
                  ? getNativeTokenDescription(config.chain)
                  : getTokenDescription(resolveAddress(config.chain, token))

                return $ButtonSecondary({
                  $container: $defaultMiniButtonSecondary(style({ borderColor: colorAlpha(pallete.foreground, .2) })),
                  $content: $row(layoutSheet.spacingTiny, style({ alignItems: 'center', cursor: 'pointer' }))(
                    $icon({ $content: $tokenIconMap[tokenDesc.symbol], width: '34px', svgOps: style({ paddingRight: '4px' }), viewBox: '0 0 32 32' }),
                    $heading2(tokenDesc.symbol),
                    $icon({ $content: $caretDown, width: '14px', viewBox: '0 0 32 32' }),
                  )
                })({
                  click: clickChooseMarketPopoverTether()
                })
              }, indexToken)),
            })({
              // overlayClick: clickPopoverClaimTether()
            }),

            $field(
              O(
                map(node =>
                  merge(
                    now(node),
                    filterNull(snapshot((params, value) => {
                      if (value === 0n) {
                        node.element.value = ''
                      } else {
                        node.element.value = readableTokenAmountFromUsdAmount(params.indexDescription.decimals, params.indexPrice, value)
                      }

                      return null
                    }, combineObject({ indexDescription, indexPrice, }), autoChangeSize))
                  )
                ),
                switchLatest
              ),
              styleInline(map(focus => focus === ITradeFocusMode.size ? { color: pallete.message } : { color: pallete.foreground }, config.tradeConfig.focusMode)),
              switchFocusModeTether(
                nodeEvent('focus'),
                constant(ITradeFocusMode.size),
                // multicast
              ),
              inputSizeDeltaTetherUsd(
                nodeEvent('input'),
                src => snapshot((params, inputEvent) => {
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
                }, combineObject({ indexDescription, marketPrice }), src),
                // multicast
              )
            )(),

          ),

          $row(layoutSheet.spacingSmall, style({ placeContent: 'space-between' }))(
            $row(layoutSheet.spacingSmall, style({ alignItems: 'center' }))(
              $infoTooltipLabel(
                `will be deposited & borrowed to maintain a Position`,
                screenUtils.isDesktopScreen ? 'Collateral in' : undefined
              ),

              switchMap(params => {
                const token = params.isUsdCollateralToken ? params.market.shortToken : params.market.longToken
                const tokenDesc = getTokenDescription(token)


                return $row(layoutSheet.spacingTiny, style({ alignItems: 'center' }))(
                  $icon({ $content: $tokenIconMap[tokenDesc.symbol], width: '14px', viewBox: '0 0 32 32' }),
                  $text(tokenDesc.symbol)
                )
                // return $Dropdown({
                //   $container: $row(style({ position: 'relative', alignSelf: 'center' })),
                //   $selection: $row(style({ alignItems: 'center', cursor: 'pointer' }))(
                //     $row(layoutSheet.spacingTiny, style({ alignItems: 'center' }))(
                //       $icon({ $content: $tokenIconMap[tokenDesc.symbol], width: '14px', viewBox: '0 0 32 32' }),
                //       $text(tokenDesc.symbol)
                //     ),
                //     $icon({ $content: $caretDown, width: '14px', viewBox: '0 0 32 32' })
                //   ),
                //   selector: {
                //     value: now(params.isUsdCollateralToken),
                //     $container: $defaultSelectContainer(style({ minWidth: '290px', right: 0 })),
                //     $$option: map(option => {
                //       const token = option ? params.market.shortToken : params.market.longToken
                //       const desc = getTokenDescription(token)
                //       // const liquidity = tradeReader.getAvailableLiquidityUsd(now(token), now(option))
                //       // const poolInfo = tradeReader.getTokenPoolInfo(now(token))


                //       return $row(style({ placeContent: 'space-between', flex: 1 }))(
                //         $tokenLabelFromSummary(desc),

                //         // $column(layoutSheet.spacingTiny, style({ alignItems: 'flex-end', placeContent: 'center' }))(
                //         //   $text(map(amountUsd => readableFixedUSD30(amountUsd), liquidity)),
                //         //   $row(style({ whiteSpace: 'pre' }))(
                //         //     $text(map(info => readablePercentage(info.rate), poolInfo)),
                //         //     $text(style({ color: pallete.foreground }))(' / hr')
                //         //   ),
                //         // )
                //       )
                //     }),
                //     list: [
                //       false,
                //       true
                //     ],
                //   }
                // })({
                //   select: changeIsUsdCollateralTokenTether()
                // })
              }, combineObject({ market, isUsdCollateralToken })),
              
            ),
            
            $hintNumChange({
              label: screenUtils.isDesktopScreen ? `Size` : undefined,
              change: map((params) => {
                if (params.position === null) return null
                const totalSize = params.sizeDeltaUsd + params.position.position.sizeInUsd

                return readableUsd(totalSize)
              }, combineObject({ sizeDeltaUsd, position })),
              isIncrease: config.tradeConfig.isIncrease,
              tooltip: $column(layoutSheet.spacingSmall)(
                $text('Size amplified by deposited Collateral and Leverage chosen'),
                $text('Higher Leverage increases Liquidation Risk'),
              ),
              val: map(params => {
                const valueUsd = params.position ? params.position.position.sizeInUsd : params.sizeDeltaUsd

                return readableUsd(valueUsd)
              }, combineObject({ sizeDeltaUsd, position })),
            }),
          ),
        ),
      )

    ),

    {
      switchIsLong,
      changePrimaryToken,
      changeMarketToken,
      switchFocusMode,
      changeLeverage,
      // isUsdCollateralToken: changeIsUsdCollateralToken,
      changeCollateralDeltaAmount: mergeArray([
        inputPrimaryAmount,
        autoChangeCollateralAmount
      ]),
      changeSizeDeltaUsd: mergeArray([
        autoChangeSize,
        inputSizeDeltaUsd,
      ]),
      changeSlippage,
      changeExecutionFeeBuffer,
    }
  ]
})


const formatLeverageNumber = new Intl.NumberFormat("en-US", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1
})



const $field = $element('input')(attr({ placeholder: '0.0', type: 'text' }), style({ textAlign: 'right', width: '100%', lineHeight: '34px', margin: '14px 0', minWidth: '0', transition: 'background 500ms ease-in', flex: 1, fontSize: '1.85rem', background: 'transparent', border: 'none', outline: 'none', color: pallete.message }))




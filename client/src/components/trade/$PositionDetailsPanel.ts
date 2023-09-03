import { Behavior, combineArray, combineObject, replayLatest } from "@aelea/core"
import { $Node, $node, $text, MOTION_NO_WOBBLE, NodeComposeFn, attr, component, motion, style, styleInline } from "@aelea/dom"
import { $NumberTicker, $column, $row, layoutSheet, screenUtils } from "@aelea/ui-components"
import { colorAlpha, pallete } from "@aelea/ui-components-theme"
import {
  awaitPromises, constant, delay, empty, map,
  mergeArray,
  multicast, now,
  skipRepeats,
  skipRepeatsWith,
  snapshot,
  startWith,
  switchLatest
} from "@most/core"
import { Stream } from "@most/types"
import { erc20Abi } from "abitype/test"
import * as GMX from "gmx-middleware-const"
import {
  $alert,
  $alertTooltip,
  $anchor,
  $infoLabeledValue,
  $infoTooltipLabel
} from "gmx-middleware-ui-components"
import {
  DecreasePositionSwapType,
  IPositionSlot, IPriceInterval,
  OrderType,
  StateStream,
  abs,
  div,
  filterNull,
  getBasisPoints,
  getDenominator,
  getPnL, getTokenDescription,
  parseReadableNumber,
  readableFixedUSD30,
  readablePercentage,
  readableUnitAmount,
  resolveAddress,
  safeDiv,
  switchMap
} from "gmx-middleware-utils"
import { MouseEventParams } from "lightweight-charts"
import * as PUPPET from "puppet-middleware-const"
import { getRouteTypeKey } from "puppet-middleware-utils"
import * as viem from "viem"
import { $Popover } from "../$Popover"
import { $entry, $openPositionPnlBreakdown, $pnlValue, $sizeAndLiquidation } from "../../common/$common"
import { $heading2 } from "../../common/$text"
import { latestTokenPrice } from "../../data/process/process.js"
import { connectContract, wagmiWriteContract } from "../../logic/common.js"
import { IWalletClient } from "../../wallet/walletLink.js"
import { $ButtonPrimary, $ButtonPrimaryCtx, $ButtonSecondary, $defaultMiniButtonSecondary } from "../form/$Button.js"
import { IPositionEditorAbstractParams, ITradeConfig, ITradeParams } from "./$PositionEditor"
import { BLUEBERRY_REFFERAL_CODE } from "@gambitdao/gbc-middleware"


export enum ITradeFocusMode {
  collateral,
  size,
}




interface IPositionDetailsPanel extends IPositionEditorAbstractParams {
  wallet: IWalletClient
  openPositionList: Stream<IPositionSlot[]>

  pricefeed: Stream<IPriceInterval[]>
  tradeConfig: StateStream<ITradeConfig> // ITradeParams
  tradeState: StateStream<ITradeParams>

  $container: NodeComposeFn<$Node>
}

export type IRequestTradeParams = ITradeConfig & { wallet: IWalletClient }
export type IRequestTrade = IRequestTradeParams & {
  // key: viem.Hex
  executionFee: bigint
  indexTokenPrice: bigint
  acceptablePrice: bigint
  swapRoute: string[]
  request: Promise<viem.TransactionReceipt>
}




export const $PositionDetailsPanel = (config: IPositionDetailsPanel) => component((

  [openEnableTradingPopover, openEnableTradingPopoverTether]: Behavior<any, any>,
  [dismissEnableTradingOverlay, dismissEnableTradingOverlayTether]: Behavior<false, false>,
  [crosshairMove, crosshairMoveTether]: Behavior<MouseEventParams, MouseEventParams>,

  [enableTradingPlugin, enableTradingPluginTether]: Behavior<PointerEvent, PointerEvent>,
  [approveTrading, approveTradingTether]: Behavior<PointerEvent, true>,

  [clickApproveInputToken, clickApproveInputTokenTether]: Behavior<PointerEvent, { route: viem.Address, inputToken: viem.Address }>,

  [clickResetPosition, clickResetPositionTether]: Behavior<any, null>,

  [clickProposeTrade, clickProposeTradeTether]: Behavior<PointerEvent, IWalletClient>,
  [switchTrade, switchTradeTether]: Behavior<any, IPositionSlot>,

) => {

  const gmxContractMap = GMX.CONTRACT[config.chain.id]


  const vault = connectContract(gmxContractMap.Vault)
  const router = connectContract(gmxContractMap.Router)

              
  const positionRouterAddress = GMX.CONTRACT[config.chain.id].PositionRouter.address


  const getIsPluginEnabled = (address: viem.Address) => router.read(
    'approvedPlugins',
    address,
    positionRouterAddress
  )

  const { 
    collateralDeltaUsd, collateralToken, collateralDelta, market, isUsdCollateralToken, sizeDelta, focusMode,
    inputToken, isIncrease, isLong, leverage, sizeDeltaUsd, slippage 
  } = config.tradeConfig
  const {
    availableIndexLiquidityUsd, averagePrice, collateralTokenDescription,
    collateralTokenPoolInfo, collateralTokenPrice, stableFundingRateFactor, fundingRateFactor, executionFee, executionFeeUsd, fundingFee,
    indexTokenDescription, indexTokenPrice, inputTokenDescription, inputTokenPrice,
    isInputTokenApproved, isTradingEnabled, liquidationPriceUsd, marginFee, route,
    position, swapFee, walletBalance, markets, priceImpactUsd, totalNextFeesUsd
  } = config.tradeState


  const walletBalanceUsd = skipRepeats(combineArray(params => {
    const amountUsd = params.walletBalance * params.inputTokenPrice

    return params.inputToken === GMX.ADDRESS_ZERO ? amountUsd - GMX.DEDUCT_USD_FOR_GAS : amountUsd
  }, combineObject({ walletBalance, inputTokenPrice, inputToken, inputTokenDescription })))




  const inTradeMode = replayLatest(multicast(skipRepeats(combineArray((sizeDeltaUsd, collateralDeltaUsd) => {
    if (sizeDeltaUsd === 0n && collateralDeltaUsd === 0n) {
      return false
    }

    return true
  }, sizeDeltaUsd, collateralDeltaUsd))))


  const pnlCrossHairTimeChange = replayLatest(multicast(startWith(null, skipRepeatsWith(((xsx, xsy) => xsx.time === xsy.time), crosshairMove))))

  const pnlCrossHairTime = map((cross: MouseEventParams) => {
    if (cross) {
      return cross.seriesData.values().next().value
    }

    return null
  }, pnlCrossHairTimeChange)

  const validationError = skipRepeats(map((state) => {

    if (state.leverage > GMX.MAX_LEVERAGE_FACTOR) {
      return `Leverage exceeds ${readablePercentage(GMX.MAX_LEVERAGE_FACTOR)}x`
    }

    if (state.isIncrease) {
      if (state.sizeDeltaUsd > state.availableIndexLiquidityUsd) {
        return `Not enough liquidity. current capcity ${readableFixedUSD30(state.availableIndexLiquidityUsd)}`
      }

      if (state.isIncrease ? state.collateralDelta > state.walletBalance : state.collateralDeltaUsd > state.walletBalanceUsd) {
        return `Not enough ${state.inputTokenDescription.symbol} in connected account`
      }

      if (state.leverage < GMX.MIN_LEVERAGE_FACTOR) {
        return `Leverage below 1.1x`
      }

      // if (state.position === null && state.collateralDeltaUsd < 10n ** 30n * 10n) {
      //   return `Min 10 Collateral required`
      // }
    } else {

      if (state.position && state.inputToken !== state.collateralToken) {
        const delta = getPnL(state.isLong, state.position.averagePrice, state.indexTokenPrice, -state.sizeDeltaUsd)
        const adjustedSizeDelta = safeDiv(abs(state.sizeDeltaUsd) * delta, state.position.size)
        const fees = state.swapFee + state.marginFee
        const collateralDelta = -state.sizeDeltaUsd === state.position.size
          ? state.position.collateral - state.fundingFee
          : -state.collateralDeltaUsd

        const totalOut = collateralDelta + adjustedSizeDelta - fees

        const nextUsdgAmount = totalOut * getDenominator(GMX.USDG_DECIMALS) / GMX.PERCISION
        if (state.collateralTokenPoolInfo.usdgAmounts + nextUsdgAmount > state.collateralTokenPoolInfo.maxUsdgAmounts) {
          return `${state.collateralTokenDescription.symbol} pool exceeded, you cannot receive ${state.inputTokenDescription.symbol}, switch to ${state.collateralTokenDescription.symbol} in the first input token switcher`
        }
      }

    }

    if (!state.isIncrease && state.position === null) {
      return `No ${state.indexTokenDescription.symbol} position to reduce`
    }

    if (state.position && state.liquidationPrice && (state.isLong ? state.liquidationPrice > state.indexTokenPrice : state.liquidationPrice < state.indexTokenPrice)) {
      return `Exceeding liquidation price`
    }

    return null
  }, combineObject({
    leverage, position, swapFee, marginFee, fundingFee, liquidationPrice: liquidationPriceUsd, walletBalance,
    walletBalanceUsd, isIncrease, indexTokenPrice, collateralDelta, collateralDeltaUsd, inputTokenDescription,
    collateralToken, sizeDeltaUsd, availableIndexLiquidityUsd, inputToken, collateralTokenPoolInfo,
    collateralTokenDescription, indexTokenDescription, isLong,
  })))








  const requestTradeParams = snapshot((config, wallet): IRequestTradeParams => {
    return { ...config, wallet }
  }, combineObject(config.tradeConfig), clickProposeTrade)


  const requestTrade: Stream<IRequestTrade> = multicast(snapshot((params, req) => {

    const resolvedInputAddress = resolveAddress(config.chain, req.inputToken)
    const from = req.isIncrease ? resolvedInputAddress : req.isLong ? req.market.indexToken : req.collateralToken
    const to = req.isIncrease ? req.isLong ? req.market.indexToken : req.collateralToken : resolvedInputAddress

    const swapRoute = from === to ? [to] : [from, to]

    const slippageN = BigInt(Number(req.slippage) * 100)
    const allowedSlippage = req.isLong
      ? req.isIncrease
        ? slippageN : -slippageN
      : req.isIncrease
        ? -slippageN : slippageN

    const priceBasisPoints = GMX.PERCISION + allowedSlippage

    const acceptablePrice = params.indexTokenPrice * priceBasisPoints / GMX.PERCISION

    const isNative = req.inputToken === GMX.ADDRESS_ZERO


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

    const addresses = {
      receiver: config.wallet.account.address,
      callbackContract: GMX.ADDRESS_ZERO,
      uiFeeReceiver: '0x189b21eda0cff16461913d616a0a4f711cd986cb',
      market: req.market.marketToken,
      initialCollateralToken: req.collateralToken,
      swapPath: swapRoute
    } as const
    const numbers = {
      sizeDeltaUsd: req.sizeDeltaUsd,
      initialCollateralDeltaAmount: req.collateralDelta,
      acceptablePrice: acceptablePrice,
      triggerPrice: acceptablePrice,
      executionFee: params.executionFee,
      callbackGasLimit: 0n,
      minOutputAmount: 0n,
    } as const


    const request = wagmiWriteContract({
      ...GMX.CONTRACT[config.chain.id].ExchangeRouter,
      value,
      functionName: 'createOrder',
      args: [
        {
          addresses, numbers,
          decreasePositionSwapType: DecreasePositionSwapType.NoSwap,
          isLong: req.isLong,
          orderType: OrderType.MarketIncrease,
          referralCode: BLUEBERRY_REFFERAL_CODE,
          shouldUnwrapNativeToken: false,
        }
      ]
    })

    // const request = params.route === GMX.ADDRESS_ZERO
    //   ? wagmiWriteContract({
    //     ...PUPPET.CONTRACT[config.chain.id].Orchestrator,
    //     value,
    //     functionName: 'registerRouteAccountAndRequestPosition',
    //     args: [
    //       tradeParams,
    //       swapParams,
    //       params.executionFee,
    //       req.collateralToken,
    //       req.market.indexToken,
    //       req.isLong
    //     ]
    //   })
    //   : wagmiWriteContract({
    //     ...PUPPET.CONTRACT[config.chain.id].Orchestrator,
    //     functionName: 'requestPosition',
    //     value,
    //     args: [
    //       tradeParams,
    //       swapParams,
    //       getRouteTypeKey(req.collateralToken, req.market.indexToken, req.isLong),
    //       params.executionFee,
    //       req.isIncrease
    //     ]
    //   })


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
    config.$container(
      $column(style({ padding: '16px 0', placeContent: 'space-between' }), styleInline(map(mode => ({ height: '140px', display: mode ? 'flex' : 'none' }), inTradeMode)))(
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

          $column(
            // switchLatest(map(params => {
            //   const totalSizeUsd = params.position ? params.position.latestUpdate.sizeInUsd + params.sizeDeltaUsd : params.sizeDeltaUsd

            //   const rateFactor = params.fundingRateFactor
            //   const rate = safeDiv(rateFactor * params.collateralTokenPoolInfo.reservedAmount, params.collateralTokenPoolInfo.poolAmounts)
            //   const nextSize = totalSizeUsd * rate / GMX.BASIS_POINTS_DIVISOR / 100n

            //   return $column(
            //     $infoLabeledValue(
            //       'Borrow Fee',
            //       $row(layoutSheet.spacingTiny)(
            //         $text(style({ color: pallete.indeterminate }))(readableFixedUSD30(nextSize) + ' '),
            //         $text(` / 1hr`)
            //       )
            //     )
            //   )
            // }, combineObject({ ...config.tradeState, sizeDeltaUsd }))),
            $infoLabeledValue('Swap', $text(style({ color: pallete.indeterminate, placeContent: 'space-between' }))(map(readableFixedUSD30, swapFee))),
            $infoLabeledValue('Margin', $text(style({ color: pallete.indeterminate, placeContent: 'space-between' }))(map(readableFixedUSD30, marginFee))),
            $infoLabeledValue('Price Impact', $text(style({ color: pallete.indeterminate, placeContent: 'space-between' }))(map(params => `${readablePercentage(getBasisPoints(params.priceImpactUsd, params.sizeDeltaUsd))} ${readableFixedUSD30(params.priceImpactUsd)}`, combineObject({ priceImpactUsd, sizeDeltaUsd })))),
            $infoLabeledValue('Execution Fee', $text(style({ color: pallete.indeterminate, placeContent: 'space-between' }))(map(fee => `${readableFixedUSD30(fee)}`, executionFeeUsd))),
          ),
          $row(style({ placeContent: 'space-between' }))(

            $infoTooltipLabel(
              $column(layoutSheet.spacingSmall)(
                $text('Collateral deducted upon your deposit including Borrow fee at the start of every hour. the rate changes based on utilization, it is calculated as (assets borrowed) / (total assets in pool) * 0.01%'),
              ),
              'Total Fees'
            ),
            $text(style({ color: pallete.indeterminate }))(
              map(total => readableFixedUSD30(total), totalNextFeesUsd)
            ),
          ),



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
                    $heading2(`By using Puppet, I agree to the following Disclaimer`),
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
                  click: clickResetPositionTether(constant(null))
                })
              ),
              $ButtonPrimaryCtx({
                request: map(req => req.request, requestTrade),
                disabled: combineArray((isDisabled) => isDisabled, disableButtonVlidation),
                $content: $text(map(params => {
                  let modLabel: string

                  if (params.position) {
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
                  constant(config.wallet)
                )
              })
            )
          }, combineObject({ isPluginEnabled: getIsPluginEnabled(config.wallet.account.address), isInputTokenApproved, route, isTradingEnabled, inputToken, inputTokenDescription })))
        ),
      ),

      styleInline(map(mode => ({ height: '140px', display: mode ? 'none' : 'flex' }), inTradeMode))(
        switchMap(params => {
          const pos = params.position
          if (pos === null) {
            const tokenDesc = getTokenDescription(params.market.indexToken)
            const route = params.isLong ? `Long-${tokenDesc.symbol}` : `Short-${tokenDesc.symbol}/${getTokenDescription(params.collateralToken).symbol}`

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
              // const val = formatFixed(delta + pos.realisedPnl - pos.cumulativeFee, 30)
              const val = 0

              return val
            }, indexTokenPrice)

          }, pnlCrossHairTime))

          const rateFactor = params.isLong ? params.fundingRateFactor : params.stableFundingRateFactor
          const rate = safeDiv(rateFactor * params.collateralTokenPoolInfo.reservedAmount, params.collateralTokenPoolInfo.poolAmounts)
          const nextSize = pos.size * rate / GMX.PERCISION / 100n


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
                // $openPositionPnlBreakdown(pos, now(params.collateralTokenPoolInfo.cumulativeRate)),
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
            // $TradePnlHistory({
            //   $container: $column(style({ flex: 1, overflow: 'hidden', borderRadius: '20px' })),
            //   position: pos,
            //   chain: config.chain.id,
            //   pricefeed,
            //   chartConfig: {
            //     leftPriceScale: {
            //       scaleMargins: {
            //         top: 0.38,
            //         bottom: 0,
            //       }
            //     },
            //     // timeScale: {
            //     //   visible: false
            //     // }
            //   },
            //   latestPrice: indexTokenPrice
            // })({
            //   crosshairMove: crosshairMoveTether(),
            //   // requestPricefeed: requestTradePricefeedTether()
            // })
          )
        }, combineObject({ position, collateralTokenPoolInfo, fundingRateFactor, stableFundingRateFactor, isLong, market, collateralToken,  }))
      ),

      switchMap(posList => {
        if (posList.length === 0) {
          return empty()
        }

        return $column(style({ flex: 1 }))(
          ...posList.map(pos => {

            const positionMarkPrice = latestTokenPrice(config.processData, now(pos.indexToken))
            const cumulativeFee = vault.read('cumulativeFundingRates', pos.collateralToken)
            const pnl = map(params => {
              const delta = getPnL(pos.isLong, pos.averagePrice, params.positionMarkPrice, pos.size)

              return pos.realisedPnl + delta - pos.cumulativeFee
            }, combineObject({ positionMarkPrice, cumulativeFee }))


            return switchLatest(map(currentPost => {
              if (currentPost === null || currentPost.positionKey === pos.key) {
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

      }, config.openPositionList)
    ),

    {
      switchTrade,
      clickResetPosition,
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

      leverage: filterNull(snapshot(state => {
        if (state.position === null) {
          return null
        }

        return div(state.position.size, state.position.collateral - state.fundingFee)
      }, combineObject({ position, fundingFee }), delay(50, clickResetPosition))),
      requestTrade

    }
  ]
})




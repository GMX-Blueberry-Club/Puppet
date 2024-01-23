import { Behavior, combineObject, replayLatest } from "@aelea/core"
import { $Node, $node, $text, NodeComposeFn, attr, component, style } from "@aelea/dom"
import { $column, $row, layoutSheet } from "@aelea/ui-components"
import { pallete } from "@aelea/ui-components-theme"
import { awaitPromises, constant, empty, map, mergeArray, multicast, sample, skipRepeats, snapshot, startWith, switchLatest } from "@most/core"
import { Stream } from "@most/types"
import { erc20Abi } from "abitype/abis"
import * as GMX from "gmx-middleware-const"
import { $alert, $alertTooltip, $anchor, $infoLabeledValue, $infoTooltipLabel } from "ui-components"
import * as PUPPET from "puppet-middleware-const"
import { IMirrorPositionOpen, latestPriceMap } from "puppet-middleware-utils"
import * as viem from "viem"
import { $Popover } from "../$Popover.js"
import { $pnlDisplay } from "../../common/$common"
import { $heading2 } from "../../common/$text.js"
import { wagmiWriteContract } from "../../logic/common.js"
import { ISupportedChain, IWalletClient } from "../../wallet/walletLink.js"
import { $ButtonPrimary, $ButtonPrimaryCtx, $ButtonSecondary } from "../form/$Button.js"
import { ITradeConfig, ITradeParams } from "./$PositionEditor.js"
import { StateStream, abs, filterNull, readablePercentage, readableUsd, getDenominator, getTokenUsd, zipState, readableTokenAmountLabel, readablePnl, getBasisPoints, readableFactorPercentage, readableUnitAmount, ADDRESS_ZERO, BASIS_POINTS_DIVISOR } from "common-utils"
import { IPriceCandle, resolveAddress, OrderType, getTokenDescription, getNativeTokenAddress, getNativeTokenDescription } from "gmx-middleware-utils"
import { walletLink } from "../../wallet"





export type IRequestTradeParams = ITradeConfig & { wallet: IWalletClient }
export type IRequestTrade = IRequestTradeParams & {
  executionFee: bigint
  indexPrice: bigint
  acceptablePrice: bigint
  swapRoute: string[]
  request: Promise<viem.TransactionReceipt>
}





interface IPositionAdjustmentDetails {
  chain: ISupportedChain
  pricefeed: Stream<IPriceCandle[]>
  tradeConfig: StateStream<ITradeConfig> // ITradeParams
  tradeState: StateStream<ITradeParams>
  $container: NodeComposeFn<$Node>
}

export const $PositionAdjustmentDetails = (config: IPositionAdjustmentDetails) => component((
  [openEnableTradingPopover, openEnableTradingPopoverTether]: Behavior<any, any>,
  [dismissEnableTradingOverlay, dismissEnableTradingOverlayTether]: Behavior<any, false>,

  [approveTrading, approveTradingTether]: Behavior<PointerEvent, true>,
  [clickApproveprimaryToken, clickApproveprimaryTokenTether]: Behavior<IWalletClient, { wallet: IWalletClient, route: viem.Address, primaryToken: viem.Address }>,
  [clickResetPosition, clickResetPositionTether]: Behavior<any, IMirrorPositionOpen | null>,
  [clickProposeTrade, clickProposeTradeTether]: Behavior<IWalletClient>,

) => {

  const {
    collateralDeltaAmount, collateralToken, market, isUsdCollateralToken, focusMode,
    primaryToken, isIncrease, isLong, leverage, sizeDeltaUsd, slippage, focusPrice, indexToken, executionFeeBuffer
  } = config.tradeConfig
  const {
    averagePrice, collateralDescription, collateralPrice, executionFee,
    indexDescription, indexPrice, primaryPrice, primaryDescription, isPrimaryApproved, marketPrice,
    isTradingEnabled, liquidationPrice, marginFeeUsd, tradeRoute, marketInfo,
    position, walletBalance, priceImpactUsd, adjustmentFeeUsd, routeTypeKey
  } = config.tradeState




  const requestTrade: Stream<IRequestTrade> = multicast(snapshot((params, wallet) => {
    const resolvedPrimaryAddress = resolveAddress(config.chain, params.primaryToken)
    const from = params.isIncrease ? resolvedPrimaryAddress : params.isLong ? params.market.indexToken : params.collateralToken
    const to = params.isIncrease ? params.isLong ? params.market.indexToken : params.collateralToken : resolvedPrimaryAddress

    const swapRoute = from === to ? [to] : [from, to]

    const allowedSlippage = params.isLong
      ? params.isIncrease
        ? params.slippage : -params.slippage
      : params.isIncrease
        ? -params.slippage : params.slippage

    
    const acceptablePrice = params.indexPrice * (allowedSlippage + BASIS_POINTS_DIVISOR) / BASIS_POINTS_DIVISOR
    const isNative = params.primaryToken === ADDRESS_ZERO


    // const swapParams = {
    //   amount: req.collateralDelta,
    //   minOut: 0n,
    //   path: swapRoute
    // }
    // const tradeParams = {
    //   acceptablePrice,
    //   amountIn: 0n,
    //   collateralDelta: req.collateralDelta,
    //   minOut: 0n,
    //   sizeDelta: abs(req.sizeDeltaUsd)
    // }

    const executionFeeAfterBuffer = abs(params.executionFee * (params.executionFeeBuffer + BASIS_POINTS_DIVISOR) / BASIS_POINTS_DIVISOR) // params.executionFee
    const orderVaultAddress = GMX.CONTRACT[config.chain.id].OrderVault.address
    const wntCollateralAmount = isNative ? params.collateralDeltaAmount : 0n
    const totalWntAmount = wntCollateralAmount + executionFeeAfterBuffer
    const orderType = params.isIncrease
      ? params.focusPrice ? OrderType.LimitIncrease : OrderType.MarketIncrease
      : params.focusPrice ? OrderType.LimitDecrease : OrderType.MarketDecrease


    const request = params.tradeRoute
      ? wagmiWriteContract( walletLink.wagmiConfig, {
        ...PUPPET.CONTRACT[config.chain.id].Orchestrator,
        value: totalWntAmount,
        functionName: 'requestPosition',
        args: [
          {
            acceptablePrice,
            collateralDelta: abs(params.collateralDeltaAmount),
            sizeDelta: abs(params.sizeDeltaUsd),
          },
          {
            amount: params.collateralDeltaAmount,
            path: params.collateralDeltaAmount ? [params.collateralToken] : [params.collateralToken],
            minOut: 0n,
          },
          params.routeTypeKey,
          executionFeeAfterBuffer,
          params.isIncrease
        ]
      })
      : wagmiWriteContract(walletLink.wagmiConfig, {
        ...PUPPET.CONTRACT[config.chain.id].Orchestrator,
        value: totalWntAmount,
        functionName: 'registerRouteAndRequestPosition',
        args: [
          {
            acceptablePrice,
            collateralDelta: params.collateralDeltaAmount,
            sizeDelta: abs(params.sizeDeltaUsd),
          },
          {
            amount: params.collateralDeltaAmount,
            path: params.collateralDeltaAmount ? [params.collateralToken] : [],
            minOut: 0n,
          },
          executionFeeAfterBuffer,
          params.routeTypeKey,
        ]
      })


    return { ...params, acceptablePrice, request, swapRoute, wallet }
  }, combineObject({ ...config.tradeConfig, executionFee, indexPrice, tradeRoute, routeTypeKey }), clickProposeTrade))

  const requestApproveSpend = multicast(map(params => {
    const recpt = wagmiWriteContract(walletLink.wagmiConfig, {
      address: params.primaryToken,
      abi: erc20Abi,
      functionName: 'approve',
      args: [PUPPET.CONTRACT[config.chain.id].Orchestrator.address, 2n ** 256n - 1n]
    })
    return recpt
  }, clickApproveprimaryToken))

  const requestTradeError = filterNull(awaitPromises(map(async req => {
    try {
      await req.request
      return null
    } catch (err) {

      if (err instanceof viem.ContractFunctionExecutionError && err.cause instanceof viem.ContractFunctionRevertedError) {
        return String(err.cause.reason || err.shortMessage || err.message)
      }

      return null
    }
  }, requestTrade)))



  const validationError = replayLatest(
    skipRepeats(map(state => {
      if (state.leverage > GMX.MAX_LEVERAGE_FACTOR) {
        return `Leverage exceeds ${readablePercentage(GMX.MAX_LEVERAGE_FACTOR)}x`
      }

      if (state.isIncrease) {
        if (state.sizeDeltaUsd > state.marketAvailableLiquidityUsd) {
          return `Not enough liquidity. current capcity ${readableUsd(state.marketAvailableLiquidityUsd)}`
        }

        if (state.isIncrease ? state.collateralDeltaAmount > state.walletBalance : state.collateralDeltaAmount > state.walletBalance) {
          return `Not enough ${state.primaryDescription.symbol} in connected account`
        }

        if (state.leverage < GMX.MIN_LEVERAGE_FACTOR) {
          return `Leverage below 1.1x`
        }

      // if (state.position === null && state.collateralDeltaUsd < 10n ** 30n * 10n) {
      //   return `Min 10 Collateral required`
      // }
      }
      // else {
      //   if (state.position && state.primaryToken !== state.collateralToken) {
      //     const delta = getPnL(state.isLong, state.position.averagePrice, state.indexPrice, -state.sizeDeltaUsd)
      //     const adjustedSizeDelta = safeDiv(abs(state.sizeDeltaUsd) * delta, state.position.latestUpdate.sizeInUsd)
      //     const fees = state.swapFee + state.marginFeeUsd
      //     const collateralDelta = -state.sizeDeltaUsd === state.position.latestUpdate.sizeInUsd
      //       ? state.position.collateral - state.totalFeeUsd
      //       : -state.collateralDeltaUsd

      //     const totalOut = collateralDelta + adjustedSizeDelta - fees

      //     const nextUsdgAmount = totalOut * getDenominator(GMX.USDG_DECIMALS) / GMX.PRECISION
      //     if (state.collateralTokenPoolInfo.usdgAmounts + nextUsdgAmount > state.collateralTokenPoolInfo.maxUsdgAmounts) {
      //       return `${state.collateralDescription.symbol} pool exceeded, you cannot receive ${state.primaryDescription.symbol}, switch to ${state.collateralDescription.symbol} in the first input token switcher`
      //     }
      //   }
      // }

      if (!state.isIncrease && state.position === null) {
        return `No ${state.indexDescription.symbol} position to reduce`
      }

      const indexPriceUsd = state.indexPrice * getDenominator(getTokenDescription(state.market.indexToken).decimals)

      if (state.position && state.liquidationPrice && (state.isLong ? state.liquidationPrice > indexPriceUsd : state.liquidationPrice < indexPriceUsd)) {
        return `Exceeding liquidation price`
      }

      return null
    }, combineObject({ ...config.tradeState, ...config.tradeConfig }))),
    null
  )


  const latestWntPrice = map(priceMap => {
    const nativeToken = getNativeTokenAddress(config.chain)
    const price = priceMap[nativeToken]

    if (!price) {
      throw new Error(`Price not found for ${nativeToken}`)
    }

    return price.min
  }, latestPriceMap)

  const executionFeeAfterBuffer = map(params => {
    return params.executionFee * (params.executionFeeBuffer + BASIS_POINTS_DIVISOR) / BASIS_POINTS_DIVISOR
  }, combineObject({ executionFee, executionFeeBuffer }))

  const executionFeeAfterBufferUsd = map(params => {
    return getTokenUsd(params.latestWntPrice, params.executionFeeAfterBuffer)
  }, zipState({ latestWntPrice, executionFeeAfterBuffer }))

  const totalFeeUsd = map(params => {
    return params.executionFeeAfterBufferUsd + params.marginFeeUsd + params.priceImpactUsd
  }, combineObject({ adjustmentFeeUsd, executionFeeAfterBufferUsd, marginFeeUsd, priceImpactUsd }))



  const isPriceFactorPositive = skipRepeats(map(amountUsd => amountUsd > 0n, priceImpactUsd))
  const positionFeeFactor = map(params => {
    return params.isPriceFactorPositive ? params.marketInfo.config.positionFeeFactorForPositiveImpact : params.marketInfo.config.positionFeeFactorForNegativeImpact
  }, combineObject({ isPriceFactorPositive, marketInfo }))

  return [
    config.$container(layoutSheet.spacing)(
      $column(layoutSheet.spacingTiny)(
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
        // $infoLabeledValue('Swap', $text(style({ color: pallete.indeterminate, placeContent: 'space-between' }))(map(readableFixedUSD30, swapFee))),
        style({ placeContent: 'space-between' })(
          $infoLabeledValue(
            'Max Gas Fee',
            $row(layoutSheet.spacingSmall)(
              $text(style({ color: pallete.foreground }))(map(params => {
                return `${readableTokenAmountLabel(getNativeTokenDescription(config.chain), params.executionFeeAfterBuffer)}`
              }, combineObject({ executionFeeAfterBufferUsd, executionFeeAfterBuffer }))),
              $text(style({ color: pallete.negative, alignSelf: 'flex-end' }))(map(params => {
                return readablePnl(params.executionFeeAfterBufferUsd)
              }, combineObject({ executionFeeAfterBufferUsd, executionFeeAfterBuffer })))
            )
          )
        ),
        style({ placeContent: 'space-between' })(
          // $infoLabeledValue('Price Impact', $text(style({ color: pallete.negative }))(map(params => {
          //   return `${readablePercentage(getBasisPoints(params.priceImpactUsd, params.sizeDeltaUsd))} ${readablePnl(params.priceImpactUsd)}`
          // }, combineObject({ priceImpactUsd, sizeDeltaUsd })))),
          $infoLabeledValue(
            'Price Impact',
            $row(layoutSheet.spacingSmall)(
              $text(style({ color: pallete.foreground }))(map(params => {
                return `(${readablePercentage(getBasisPoints(params.priceImpactUsd, params.sizeDeltaUsd))} size)`
              }, combineObject({ priceImpactUsd, sizeDeltaUsd }))),
              $pnlDisplay(priceImpactUsd, false)
            )
          )
        ),
        style({ placeContent: 'space-between' })(
          $infoLabeledValue(
            'Margin',
            $row(layoutSheet.spacingSmall)(
              $text(style({ color: pallete.foreground }))(map(factor => {
                return `(${readableFactorPercentage(factor)} size)`
              }, positionFeeFactor)),
              $pnlDisplay(marginFeeUsd, false)
            )
          )
        ),
        style({ placeContent: 'space-between' })(
          $infoLabeledValue(
            'Min Puppet Reward',
            $row(layoutSheet.spacingSmall)(
              $text(style({ color: pallete.foreground }))(map(factor => {
                return `(${readableFactorPercentage(factor)} size)`
              }, positionFeeFactor)),
              $pnlDisplay(0n, false)
            )
          )
        )
      ),
      style({ placeContent: 'space-between' })(
        $infoLabeledValue(
          $infoTooltipLabel(
            $column(layoutSheet.spacingSmall)(
              $text('Collateral deducted upon your deposit including Borrow fee at the start of every hour. the rate changes based on utilization, it is calculated as (assets borrowed) / (total assets in pool) * 0.01%')
            ),
            'Total Fees'
          ),
          $pnlDisplay(totalFeeUsd, false)
        )
      ),

      $row(layoutSheet.spacingSmall, style({ alignItems: 'center', flex: 1 }))(
        $row(style({ flex: 1, minWidth: 0 }))(
          switchLatest(map(error => {
            if (error === null) {
              return empty()
            }

            return $alertTooltip(
              $text(style({ whiteSpace: 'pre-wrap' }))(error)
            )
          }, mergeArray([requestTradeError, validationError, constant(null, clickResetPosition)])))
        ),
        style({ padding: '8px', alignSelf: 'center' })(
          $ButtonSecondary({ 
            $content: $text('Reset'),
            disabled: map(params => {
              return params.sizeDeltaUsd === 0n && params.collateralDeltaAmount === 0n && params.isIncrease
            }, combineObject({ sizeDeltaUsd, collateralDeltaAmount, isIncrease }))
          })({
            click: clickResetPositionTether(
              sample(position)
            )
          })
        ),
        switchLatest(map(params => {
          const isTokenEnabled = params.isPrimaryApproved
          const $primary = !params.isTradingEnabled
            ? $Popover({
              open: constant(
                $column(layoutSheet.spacing, style({ maxWidth: '400px' }))(
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
                  $ButtonPrimary({
                    $content: $text('Approve T&C'),
                  })({
                    click: approveTradingTether(constant(true))
                  })
                ),
                openEnableTradingPopover
              ),
              $target: $row(style({ placeContent: 'flex-end' }))(
                $ButtonSecondary({
                  $content: $text('Enable Trading'),
                  disabled: startWith(false, mergeArray([
                    dismissEnableTradingOverlay,
                    openEnableTradingPopover
                  ]))
                })({
                  click: openEnableTradingPopoverTether()
                })
              ),
            })({
              overlayClick: dismissEnableTradingOverlayTether(constant(false))
            })
            : isTokenEnabled
              ? $ButtonPrimaryCtx({
                request: map(req => req.request, requestTrade),
                disabled: map(params => {
                  const newLocal = !!params.validationError || params.sizeDeltaUsd === 0n && params.collateralDeltaAmount === 0n
                  return newLocal
                }, combineObject({ validationError, sizeDeltaUsd, collateralDeltaAmount })),
                $content: $text(
                  map(_params => {
                    let modLabel: string

                    if (_params.position) {
                      if (_params.isIncrease) {
                        modLabel = 'Increase'
                      } else {
                        modLabel = (_params.sizeDeltaUsd + _params.position.position.sizeInUsd === 0n) ? 'Close' : 'Reduce'
                      }
                    } else {
                      modLabel = 'Open'
                    }

                    const focusPriceLabel = _params.focusPrice ? ` @ ${readableUnitAmount(_params.focusPrice)}` : ''

                    return modLabel + focusPriceLabel
                  }, combineObject({ position, sizeDeltaUsd, isIncrease, focusPrice }))
                )
              })({
                click: clickProposeTradeTether()
              })
              : $ButtonPrimaryCtx({
                request: requestApproveSpend,
                $content: $text(`Approve ${params.primaryDescription.symbol}`)
              })({
                click: clickApproveprimaryTokenTether(
                  map(wallet => ({ wallet, route: params.tradeRoute, primaryToken: params.primaryToken }))
                )
              })

          return $row(
            $primary
          )
        }, combineObject({ isPrimaryApproved, tradeRoute, isTradingEnabled, primaryToken, primaryDescription })))
      ),
    ),

    {
      requestTrade,
      clickResetPosition,
      enableTrading: mergeArray([
        approveTrading,
        // filterNull(awaitPromises(map(async (ctx) => {
        //   try {
        //     await ctx
        //     return true
        //   } catch (err) {
        //     return null
        //   }
        // }, requestEnablePlugin)))
      ]),
      approvePrimaryToken: filterNull(awaitPromises(map(async (ctx) => {
        try {
          await ctx
          return true
        } catch (err) {
          return null
        }
      }, requestApproveSpend))),

      // collateralDeltaUsd: constant(0n, clickResetPosition),
      // collateralSizeUsd: constant(0n, clickResetPosition),

      // isIncrease: constant(true, clickResetPosition),

      // leverage: filterNull(snapshot((params) => {
      //   if (params.position === null) return null
      //   return div(params.position.latestUpdate.sizeInUsd, params.netPositionValueUsd)
      // }, combineObject({ netPositionValueUsd, position }), clickResetPosition)),

    }
  ]
})




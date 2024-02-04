import { Behavior, combineObject, replayLatest } from "@aelea/core"
import { $Node, $node, $text, NodeComposeFn, attr, component, style } from "@aelea/dom"
import { $column, $row, layoutSheet } from "@aelea/ui-components"
import { pallete } from "@aelea/ui-components-theme"
import { awaitPromises, constant, empty, map, mergeArray, multicast, sample, skipRepeats, snapshot, startWith, switchLatest } from "@most/core"
import { Stream } from "@most/types"
import { ADDRESS_ZERO, BASIS_POINTS_DIVISOR, StateStreamStrict, abs, filterNull, getBasisPoints, getDenominator, getMappedValue, getTokenUsd, readableFactorPercentage, readablePercentage, readablePnl, readableTokenAmountLabel, readableUnitAmount, readableUsd, switchMap, zipState } from "common-utils"
import * as GMX from "gmx-middleware-const"
import { IPriceCandle, OrderType, getNativeTokenAddress, getNativeTokenDescription, getTokenDescription, resolveAddress } from "gmx-middleware-utils"
import { EIP6963ProviderDetail } from "mipd"
import * as PUPPET from "puppet-middleware-const"
import { IMirrorPositionOpen, latestPriceMap } from "puppet-middleware-utils"
import { $alert, $alertTooltip, $anchor, $infoLabeledValue, $infoTooltipLabel } from "ui-components"
import * as viem from "viem"
import * as walletLink from "wallet"
import { $Popover } from "../$Popover.js"
import { $pnlDisplay } from "../../common/$common"
import { $heading3 } from "../../common/$text.js"
import { IApproveSpendReturn } from "../../logic/commonWrite.js"
import { writeApproveSpend } from "../../logic/commonWrite.js"
import { $seperator2 } from "../../pages/common"
import { IWalletPageParams } from "../../pages/type.js"
import { $ButtonPrimary, $ButtonSecondary, $Submit } from "../form/$Button.js"
import { $SubmitBar } from "../form/$Form"
import { ITradeConfig, ITradeParams } from "./$PositionEditor.js"



export type IRequestTrade = ITradeConfig & {
  walletClient: walletLink.IWalletClient
  executionFee: bigint
  indexPrice: bigint
  acceptablePrice: bigint
  swapRoute: string[]
  request: walletLink.IWriteContractReturn<typeof PUPPET['CONTRACT']['42161']['Orchestrator']['abi']>
}



interface IPositionAdjustmentDetails extends IWalletPageParams {
  chain: viem.Chain
  pricefeed: Stream<IPriceCandle[]>
  tradeConfig: StateStreamStrict<ITradeConfig> // ITradeParams
  tradeState: StateStreamStrict<ITradeParams>
  $container: NodeComposeFn<$Node>
}

export const $PositionAdjustmentDetails = (config: IPositionAdjustmentDetails) => component((
  [openEnableTradingPopover, openEnableTradingPopoverTether]: Behavior<any, any>,
  [dismissEnableTradingOverlay, dismissEnableTradingOverlayTether]: Behavior<any, false>,

  [approveTrading, approveTradingTether]: Behavior<PointerEvent, true>,
  [requestTokenSpend, requestTokenSpendTether]: Behavior<walletLink.IWalletClient, IApproveSpendReturn>,
  [clickResetPosition, clickResetPositionTether]: Behavior<any, IMirrorPositionOpen | null>,
  [clickProposeTrade, clickProposeTradeTether]: Behavior<walletLink.IWalletClient>,
  [changeWallet, changeWalletTether]: Behavior<EIP6963ProviderDetail>,

) => {

  const { walletClientQuery } = config

  const {
    collateralDeltaAmount, collateralToken, market, isUsdCollateralToken, focusMode,
    primaryToken, isIncrease, isLong, leverage, sizeDeltaUsd, slippage, focusPrice, indexToken, executionFeeBuffer
  } = config.tradeConfig
  const {
    averagePrice, collateralDescription, collateralPrice, executionFee,
    indexDescription, indexPrice, primaryPrice, primaryDescription, primarySpendAmount, marketPrice,
    isTradingEnabled, liquidationPrice, marginFeeUsd, tradeRoute, marketInfo,
    mirrorPosition, walletBalance, priceImpactUsd, adjustmentFeeUsd, routeTypeKey
  } = config.tradeState

  const requestTrade: Stream<IRequestTrade> = multicast(snapshot((params, walletClient) => {
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

    const executionFeeAfterBuffer = abs(params.executionFee * (params.executionFeeBuffer + BASIS_POINTS_DIVISOR) / BASIS_POINTS_DIVISOR) // params.executionFee
    const wntCollateralAmount = isNative ? params.collateralDeltaAmount : 0n
    const totalWntAmount = wntCollateralAmount + executionFeeAfterBuffer
    const orderType = params.isIncrease
      ? params.focusPrice ? OrderType.LimitIncrease : OrderType.MarketIncrease
      : params.focusPrice ? OrderType.LimitDecrease : OrderType.MarketDecrease

      
    const contractDefs = getMappedValue(PUPPET.CONTRACT, config.chain.id).Orchestrator

    const request = params.tradeRoute
      ? walletLink.writeContract({
        ...contractDefs,
        walletClient,
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
      : walletLink.writeContract({
        ...contractDefs,
        walletClient,
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


    return { ...params, acceptablePrice, request, swapRoute, walletClient }
  }, combineObject({ ...config.tradeConfig, executionFee, indexPrice, tradeRoute, routeTypeKey }), clickProposeTrade))


  const displayTokenApproval = skipRepeats(map(params => {
    if (params.primarySpendAmount === null) {
      return true
    }

    if (params.collateralDeltaAmount === 0n) {
      return true
    }

    return params.primarySpendAmount > params.collateralDeltaAmount
  }, combineObject({ primarySpendAmount, collateralDeltaAmount, walletBalance })))

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

      if (!state.isIncrease && state.mirrorPosition === null) {
        return `No ${state.indexDescription.symbol} position to reduce`
      }

      const indexPriceUsd = state.indexPrice * getDenominator(getTokenDescription(state.market.indexToken).decimals)

      if (state.mirrorPosition && state.liquidationPrice && (state.isLong ? state.liquidationPrice > indexPriceUsd : state.liquidationPrice < indexPriceUsd)) {
        return `Exceeding liquidation price`
      }

      if (state.primarySpendAmount && state.primarySpendAmount < state.collateralDeltaAmount) {
        // show a message that shows the current primary spend amount and the collateral required
        return `The approved amount ${readableTokenAmountLabel(state.primaryDescription, state.primarySpendAmount)} is less than the required collateral ${readableTokenAmountLabel(state.collateralDescription, state.collateralDeltaAmount)}`
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


  const isPriceFactorPositive = skipRepeats(map(amountUsd => amountUsd > 0n, priceImpactUsd))
  const positionFeeFactor = map(params => {
    return params.isPriceFactorPositive ? params.marketInfo.config.positionFeeFactorForPositiveImpact : params.marketInfo.config.positionFeeFactorForNegativeImpact
  }, combineObject({ isPriceFactorPositive, marketInfo }))

  return [
    config.$container(layoutSheet.spacing)(
      $column(layoutSheet.spacingSmall)(
        style({ placeContent: 'space-between' })(
          $infoLabeledValue(
            'Price Impact',
            $row(layoutSheet.spacingSmall, style({ alignItems: 'center' }))(
              $text(style({ color: pallete.foreground, fontSize: '.75rem' }))(map(params => {
                return `(${readablePercentage(getBasisPoints(params.priceImpactUsd, params.sizeDeltaUsd))} size)`
              }, combineObject({ priceImpactUsd, sizeDeltaUsd }))),
              $pnlDisplay(priceImpactUsd, false)
            )
          )
        ),
        $seperator2,
        style({ placeContent: 'space-between' })(
          $infoLabeledValue(
            'Est Reward',
            $row(layoutSheet.spacingSmall, style({ alignItems: 'center' }))(
              $text(style({ color: pallete.foreground, fontSize: '.75rem' }))(map(factor => {
                return `(${readableFactorPercentage(factor)} size)`
              }, positionFeeFactor)),
              $text('WIP')
            )
          )
        )
      ),
      style({ placeContent: 'space-between' })(
        $infoLabeledValue(
          $infoTooltipLabel(
            $column(layoutSheet.spacingSmall)(
              style({ placeContent: 'space-between' })(
                $infoLabeledValue(
                  'Network cost',
                  $row(layoutSheet.spacingSmall, style({ alignItems: 'center' }))(
                    $text(style({ color: pallete.foreground, fontSize: '.75rem' }))(map(params => {
                      return `${readableTokenAmountLabel(getNativeTokenDescription(config.chain), params.executionFeeAfterBuffer)}`
                    }, combineObject({ executionFeeAfterBuffer }))),
                    $text(style({ color: pallete.negative, alignSelf: 'flex-end', }))(map(params => {
                      return readablePnl(params.executionFeeAfterBufferUsd)
                    }, combineObject({ executionFeeAfterBufferUsd, executionFeeAfterBuffer })))
                  )
                ), 
              ),
              $seperator2,
              style({ placeContent: 'space-between' })(
                $infoLabeledValue(
                  'Margin',
                  $row(layoutSheet.spacingSmall, style({ alignItems: 'center' }))(
                    $text(style({ color: pallete.foreground, fontSize: '.75rem' }))(map(factor => {
                      return `(${readableFactorPercentage(factor)} Position size)`
                    }, positionFeeFactor)),
                    $pnlDisplay(marginFeeUsd, false)
                  )
                )
              ),
              $seperator2,
              $text('Collateral deducted from deposit including Borrow fee at the start of every hour. the rate changes based on utilization, it is calculated as (assets borrowed) / (total assets in pool) * 0.01%')
            ),
            'Total Fees'
          ),
          $pnlDisplay(
            map(params => {
              return params.executionFeeAfterBufferUsd + params.marginFeeUsd + params.priceImpactUsd
            }, combineObject({ adjustmentFeeUsd, executionFeeAfterBufferUsd, marginFeeUsd, priceImpactUsd })),
            false
          )
        )
      ),

      switchLatest(map(isEnabled => {
        if (isEnabled) {
          return $column(layoutSheet.spacingSmall)(
            switchMap(params => {
              const isDisplay = params.displayTokenApproval

              return isDisplay
                ? empty()
                : $Submit({
                  walletClientQuery,
                  txQuery: requestTokenSpend,
                  $content: $text(`Approve ${params.primaryDescription.symbol}`)
                })({
                  changeWallet: changeWalletTether(),
                  click: requestTokenSpendTether(
                    map(async wallet => {
                      const amount = writeApproveSpend(wallet, params.primaryToken) 

                      return amount
                    })
                  )
                })
            }, combineObject({ displayTokenApproval, primaryToken, primaryDescription })),
            $SubmitBar({
              walletClientQuery,
              alert: mergeArray([validationError, constant(null, clickResetPosition)]),
              $barContent: style({ padding: '8px', alignSelf: 'center' })(
                $ButtonSecondary({ 
                  $content: $text('Reset'),
                  disabled: map(params => {
                    return params.sizeDeltaUsd === 0n && params.collateralDeltaAmount === 0n && params.isIncrease
                  }, combineObject({ sizeDeltaUsd, collateralDeltaAmount, isIncrease }))
                })({
                  click: clickResetPositionTether(
                    sample(mirrorPosition)
                  )
                })
              ),
              txQuery: map(req => req.request, requestTrade),
              disabled: map(params => {
                const newLocal = !!params.validationError || params.sizeDeltaUsd === 0n && params.collateralDeltaAmount === 0n
                return newLocal
              }, combineObject({ validationError, sizeDeltaUsd, collateralDeltaAmount })),
              $content: $text(
                map(_params => {
                  let modLabel: string

                  if (_params.mirrorPosition) {
                    if (_params.isIncrease) {
                      modLabel = 'Increase'
                    } else {
                      modLabel = (_params.sizeDeltaUsd + _params.mirrorPosition.position.sizeInUsd === 0n) ? 'Close' : 'Reduce'
                    }
                  } else {
                    modLabel = 'Open'
                  }

                  const focusPriceLabel = _params.focusPrice ? ` @ ${readableUnitAmount(_params.focusPrice)}` : ''

                  return modLabel + focusPriceLabel
                }, combineObject({ mirrorPosition, sizeDeltaUsd, isIncrease, focusPrice }))
              )
            })({
              changeWallet: changeWalletTether(),
              click: clickProposeTradeTether()
            })
          )
        }

        return $Popover({
          open: constant(
            $column(layoutSheet.spacing, style({ maxWidth: '380px' }))(
              $heading3(`Dsclaimer & Risk Warning`),
              $text(`Puppet is an experimental protocol and is provided “as is” without any warranty of any kind. The protocol is in beta and may contain bugs that may result in unexpected loss of funds.`),
              $alert(
                $node(
                  $text('Feedback and issue reports are greatly appreciated.'),
                  $anchor(attr({ href: 'https://discord.com/channels/941356283234250772/1068946527021695168' }))($text('discord'))
                )
              ),
              $row(style({ placeContent: 'space-between', alignItems: 'center' }))(
                $node(
                  $text('By using Puppet, i agree to the '),
                  $anchor(attr({ href: '/app/terms-and-conditions' }))($text('Terms & Conditions'))
                ),
                $ButtonPrimary({
                  $content: $text('Agree'),
                })({
                  click: approveTradingTether(constant(true))
                })
              )
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
            

          
      }, isTradingEnabled)),
    ),

    {
      changeWallet,
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
      primarySpendAmount: awaitPromises(map(async (ctx) => {
        try {
          const amount = await ctx
          return amount.events.filter(e => e.eventName === 'Approval')[0].args.value || null
        } catch (err) {
          return null
        }
      }, requestTokenSpend)),

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




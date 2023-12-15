import { Behavior, combineObject } from "@aelea/core"
import { $Node, $node, $text, NodeComposeFn, attr, component, style } from "@aelea/dom"
import { $column, $row, layoutSheet } from "@aelea/ui-components"
import { pallete } from "@aelea/ui-components-theme"
import { BLUEBERRY_REFFERAL_CODE } from "@gambitdao/gbc-middleware"
import { awaitPromises, constant, empty, map, mergeArray, multicast, sample, skipRepeats, snapshot, switchLatest } from "@most/core"
import { Stream } from "@most/types"
import { erc20Abi } from "abitype/abis"
import * as GMX from "gmx-middleware-const"
import * as PUPPET from "puppet-middleware-const"
import { $alert, $alertTooltip, $anchor, $infoLabeledValue, $infoTooltipLabel } from "gmx-middleware-ui-components"
import {
  DecreasePositionSwapType,
  IPositionSlot, IPriceInterval,
  OrderType,
  StateStream,
  abs,
  filterNull,
  getBasisPoints,
  getDenominator,
  getNativeTokenAddress,
  getTokenDescription,
  getTokenUsd,
  lst,
  readableFixedUSD30,
  readablePercentage,
  readableUnitAmount,
  resolveAddress
} from "gmx-middleware-utils"
import * as viem from "viem"
import { $Popover } from "../$Popover.js"
import { $heading2 } from "../../common/$text.js"
import { IGmxProcessState } from "../../data/process/process"
import { connectContract, wagmiWriteContract } from "../../logic/common.js"
import { ISupportedChain, IWalletClient } from "../../wallet/walletLink.js"
import { $ButtonPrimary, $ButtonPrimaryCtx, $ButtonSecondary } from "../form/$Button.js"
import { ITradeConfig, ITradeParams } from "./$PositionEditor.js"
import { getRouteTypeKey } from "puppet-middleware-utils"


export enum ITradeFocusMode {
  collateral,
  size,
}




interface IPositionAdjustmentHistory {
  processData: Stream<IGmxProcessState>
  chain: ISupportedChain
  openPositionList: Stream<IPositionSlot[]>

  pricefeed: Stream<IPriceInterval[]>
  tradeConfig: StateStream<ITradeConfig> // ITradeParams
  tradeState: StateStream<ITradeParams>

  $container: NodeComposeFn<$Node>
}

export type IRequestTradeParams = ITradeConfig & { wallet: IWalletClient }
export type IRequestTrade = IRequestTradeParams & {
  executionFee: bigint
  indexPrice: bigint
  acceptablePrice: bigint
  swapRoute: string[]
  request: Promise<viem.TransactionReceipt>
}




export const $PositionAdjustmentDetails = (config: IPositionAdjustmentHistory) => component((
  [openEnableTradingPopover, openEnableTradingPopoverTether]: Behavior<any, any>,
  [dismissEnableTradingOverlay, dismissEnableTradingOverlayTether]: Behavior<any, false>,

  [approveTrading, approveTradingTether]: Behavior<PointerEvent, true>,
  [clickApproveprimaryToken, clickApproveprimaryTokenTether]: Behavior<IWalletClient, { wallet: IWalletClient, route: viem.Address, primaryToken: viem.Address }>,
  [clickResetPosition, clickResetPositionTether]: Behavior<any, IPositionSlot | null>,
  [clickProposeTrade, clickProposeTradeTether]: Behavior<IWalletClient>,

) => {

  const gmxContractMap = GMX.CONTRACT[config.chain.id]

  const vault = connectContract(gmxContractMap.Vault)
  const router = connectContract(gmxContractMap.Router)
  const positionRouterAddress = GMX.CONTRACT[config.chain.id].PositionRouter.address


  const { 
    collateralDeltaUsd, collateralToken, collateralDelta, marketInfo, market, isUsdCollateralToken, sizeDelta, focusMode,
    primaryToken, isIncrease, isLong, leverage, sizeDeltaUsd, slippage, focusPrice, indexToken, executionFeeBuffer
  } = config.tradeConfig
  const {
    availableIndexLiquidityUsd, averagePrice, collateralDescription,
    collateralPrice, stableFundingRateFactor, fundingRateFactor, executionFee,
    indexDescription, indexPrice, primaryPrice, primaryDescription, isPrimaryApproved, marketPrice,
    isTradingEnabled, liquidationPrice, marginFeeUsd, route, netPositionValueUsd,
    position, walletBalance, marketList, priceImpactUsd, adjustmentFeeUsd, routeTypeKey
  } = config.tradeState



  const requestTradeParams = snapshot((config, wallet): IRequestTradeParams => {
    return { ...config, wallet }
  }, combineObject(config.tradeConfig), clickProposeTrade)

  const requestTrade: Stream<IRequestTrade> = multicast(snapshot((params, req) => {

    if (!params.route) {
      throw new Error('Route is not defined')
    }

    const resolvedPrimaryAddress = resolveAddress(config.chain, req.primaryToken)
    const from = req.isIncrease ? resolvedPrimaryAddress : req.isLong ? req.market.indexToken : req.collateralToken
    const to = req.isIncrease ? req.isLong ? req.market.indexToken : req.collateralToken : resolvedPrimaryAddress

    const swapRoute = from === to ? [to] : [from, to]

    const allowedSlippage = req.isLong
      ? req.isIncrease
        ? req.slippage : -req.slippage
      : req.isIncrease
        ? -req.slippage : req.slippage

    
    const acceptablePrice = params.indexPrice * (allowedSlippage + GMX.BASIS_POINTS_DIVISOR) / GMX.BASIS_POINTS_DIVISOR
    const isNative = req.primaryToken === GMX.ADDRESS_ZERO


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

    const executionFeeAfterBuffer = params.executionFee * (req.executionFeeBuffer + GMX.BASIS_POINTS_DIVISOR) / GMX.BASIS_POINTS_DIVISOR // params.executionFee
    const orderVaultAddress = GMX.CONTRACT[config.chain.id].OrderVault.address
    const wntCollateralAmount = isNative ? req.collateralDelta : 0n
    const totalWntAmount = wntCollateralAmount + executionFeeAfterBuffer
    const orderType = req.isIncrease
      ? req.focusPrice ? OrderType.LimitIncrease : OrderType.MarketIncrease
      : req.focusPrice ? OrderType.LimitDecrease : OrderType.MarketDecrease


    const request = params.route === GMX.ADDRESS_ZERO
      ? wagmiWriteContract({
        ...PUPPET.CONTRACT[config.chain.id].Orchestrator,
        value: totalWntAmount,
        functionName: 'registerRouteAccountAndRequestPosition',
        args: [
          {
            acceptablePrice,
            collateralDelta: abs(0n),
            sizeDelta: abs(req.sizeDeltaUsd),
          },
          {
            amount: req.collateralDelta,
            path: req.collateralDelta ? [req.collateralToken] : [],
            minOut: 0n,
          },
          executionFeeAfterBuffer,
          req.collateralToken,
          req.indexToken,
          req.isLong,
          '0x00000000000000000000000082af49447d8a07e3bd95bd0d56f35241523fbab1000000000000000000000000af88d065e77c8cc2239327c5edb3a432268e5831000000000000000000000000af88d065e77c8cc2239327c5edb3a432268e583100000000000000000000000082af49447d8a07e3bd95bd0d56f35241523fbab100000000000000000000000000000000000000000000000000000000000000004bd5869a01440a9ac6d7bf7aa7004f402b52b845f20e2cec925101e13d84d075',
        ]
      })
      : wagmiWriteContract({
        ...PUPPET.CONTRACT[config.chain.id].Orchestrator,
        value: totalWntAmount,
        functionName: 'requestPosition',
        args: [
          {
            acceptablePrice,
            collateralDelta: abs(req.collateralDelta),
            sizeDelta: abs(req.sizeDeltaUsd),
          },
          {
            amount: req.collateralDelta,
            path: req.collateralDelta ? [req.collateralToken] : [],
            minOut: 0n,
          },
          '0xa437f95c9cee26945f76bc090c3491ffa4e8feb32fd9f4fefbe32c06a7184ff3',
          executionFeeAfterBuffer,
          req.isIncrease
        ]
      })


    // GMX V2 ExchangeRouter
    // const request = wagmiWriteContract({
    //   ...GMX.CONTRACT[config.chain.id].ExchangeRouter,
    //   value: totalWntAmount,
    //   functionName: 'multicall',
    //   args: [[
    //     viem.encodeFunctionData({
    //       abi: GMX.CONTRACT[config.chain.id].ExchangeRouter.abi,
    //       functionName: 'sendWnt',
    //       args: [orderVaultAddress, totalWntAmount]
    //     }),
    //     ...req.isIncrease && !isNative ? [
    //       viem.encodeFunctionData({
    //         abi: GMX.CONTRACT[config.chain.id].ExchangeRouter.abi,
    //         functionName: 'sendTokens',
    //         args: [resolvedPrimaryAddress, orderVaultAddress, req.collateralDelta]
    //       })
    //     ] : [],
    //     viem.encodeFunctionData({
    //       abi: GMX.CONTRACT[config.chain.id].ExchangeRouter.abi,
    //       functionName: 'createOrder',
    //       args: [
    //         {
    //           addresses: {
    //             receiver: params.route,
    //             callbackContract: GMX.ADDRESS_ZERO,
    //             uiFeeReceiver: GMX.ADDRESS_ZERO,
    //             market: req.market.marketToken,
    //             initialCollateralToken: req.collateralToken,
    //             swapPath: req.collateralDelta ? [req.market.marketToken] : []
    //           },
    //           numbers: {
    //             sizeDeltaUsd: abs(req.sizeDeltaUsd),
    //             initialCollateralDeltaAmount: 0n,
    //             acceptablePrice: acceptablePrice,
    //             triggerPrice: 0n,
    //             executionFee: executionFeeAfterBuffer,
    //             callbackGasLimit: 0n,
    //             minOutputAmount: 0n,
    //           },
    //           orderType,
    //           decreasePositionSwapType: DecreasePositionSwapType.NoSwap,
    //           isLong: req.isLong,
    //           shouldUnwrapNativeToken: isNative && req.collateralDelta > 0n,
    //           referralCode: BLUEBERRY_REFFERAL_CODE,
    //         }
    //       ]
    //     }),
    //   ]]
    // })


    return { ...params, ...req, acceptablePrice, request, swapRoute }
  }, combineObject({ executionFee, indexPrice, route, routeTypeKey }), requestTradeParams))

  const requestTradeRow = map(res => {
    return [res]
  }, requestTrade)
  
  

  const requestApproveSpend = multicast(map(params => {
    const recpt = wagmiWriteContract({
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



  const validationError = skipRepeats(map((state) => {

    if (state.leverage > GMX.MAX_LEVERAGE_FACTOR) {
      return `Leverage exceeds ${readablePercentage(GMX.MAX_LEVERAGE_FACTOR)}x`
    }

    if (state.isIncrease) {
      if (state.sizeDeltaUsd > state.availableIndexLiquidityUsd) {
        return `Not enough liquidity. current capcity ${readableFixedUSD30(state.availableIndexLiquidityUsd)}`
      }

      if (state.isIncrease ? state.collateralDelta > state.walletBalance : state.collateralDeltaUsd > state.walletBalance) {
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
  }, combineObject({ ...config.tradeState, ...config.tradeConfig })))

  const disableButtonValidation = map((error) => {
    if (error) return true

    return false
  }, validationError)

  const executionFeeAfterBuffer = map(params => {
    const nativeToken = getNativeTokenAddress(config.chain)
    const executionFeeAfterBuffer = params.executionFee * (params.executionFeeBuffer + GMX.BASIS_POINTS_DIVISOR) / GMX.BASIS_POINTS_DIVISOR // params.executionFee
    const feeUsd = getTokenUsd(params.processData.latestPrice[nativeToken].min, executionFeeAfterBuffer)

    return feeUsd
  }, combineObject({ executionFee, processData: config.processData, executionFeeBuffer }))

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
          $infoLabeledValue('Execution Fee', $text(style({ color: pallete.indeterminate, alignSelf: 'flex-end' }))(map(feeUsd => {
            return `${readableFixedUSD30(feeUsd)}`
          }, executionFeeAfterBuffer)))
        ),
        style({ placeContent: 'space-between' })(
          $infoLabeledValue('Price Impact', $text(style({ color: pallete.indeterminate }))(map(params => `${readablePercentage(getBasisPoints(params.priceImpactUsd, params.sizeDeltaUsd))} ${readableFixedUSD30(params.priceImpactUsd)}`, combineObject({ priceImpactUsd, sizeDeltaUsd }))))
        ),
        style({ placeContent: 'space-between' })(
          $infoLabeledValue('Margin', $text(style({ color: pallete.indeterminate }))(map(readableFixedUSD30, marginFeeUsd)))
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
          $text(style({ color: pallete.indeterminate }))(
            map(total => readableFixedUSD30(total), adjustmentFeeUsd)
          )
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
              return params.sizeDelta === 0n && params.collateralDelta === 0n && params.isIncrease
            }, combineObject({ sizeDelta, collateralDelta, isIncrease }))
          })({
            click: clickResetPositionTether(
              sample(position)
            )
          })
        ),
        switchLatest(map(params => {
          const $primary = !params.isTradingEnabled
            ? $Popover({
              open: openEnableTradingPopover,
              $target: $row(style({ placeContent: 'flex-end' }))(
                $ButtonSecondary({
                  $content: $text('Enable Trading'),
                  disabled: mergeArray([
                    dismissEnableTradingOverlay,
                    openEnableTradingPopover
                  ])
                })({
                  click: openEnableTradingPopoverTether()
                })
              ),
              $content: $column(layoutSheet.spacing, style({ maxWidth: '400px' }))(
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
            })({
              overlayClick: dismissEnableTradingOverlayTether(constant(false))
            })
            : params.route && !params.isPrimaryApproved
              ? $ButtonPrimaryCtx({
                request: requestApproveSpend,
                $content: $text(`Approve ${params.primaryDescription.symbol}`)
              })({
                click: clickApproveprimaryTokenTether(
                  map(wallet => ({ wallet, route: params.route, primaryToken: params.primaryToken }))
                )
              })
              : $ButtonPrimaryCtx({
                request: map(req => req.request, requestTrade),
                disabled: map(params => {
                  const newLocal = params.disableButtonValidation || params.sizeDelta === 0n && params.collateralDelta === 0n
                  return newLocal
                }, combineObject({ disableButtonValidation, sizeDelta, collateralDelta })),
                $content: $text(
                  map(_params => {
                    let modLabel: string

                    if (_params.position) {
                      if (_params.isIncrease) {
                        modLabel = 'Increase'
                      } else {
                        modLabel = (_params.sizeDeltaUsd + lst(_params.position.updates).sizeInUsd === 0n) ? 'Close' : 'Reduce'
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

          return $primary
        }, combineObject({ isPrimaryApproved, route, isTradingEnabled, primaryToken, primaryDescription })))
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




import { Behavior, combineObject } from "@aelea/core"
import { $Node, $node, $text, NodeComposeFn, attr, component, style } from "@aelea/dom"
import { $column, $row, layoutSheet } from "@aelea/ui-components"
import { colorAlpha, pallete } from "@aelea/ui-components-theme"
import { BLUEBERRY_REFFERAL_CODE } from "@gambitdao/gbc-middleware"
import {
  awaitPromises, constant,
  empty, map,
  mergeArray,
  multicast,
  skipRepeats,
  snapshot,
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
  getTokenDescription,
  readableFixedUSD30,
  readablePercentage,
  readableUnitAmount,
  resolveAddress,
  switchMap
} from "gmx-middleware-utils"
import { MouseEventParams } from "lightweight-charts"
import { IPositionMirrorSlot } from "puppet-middleware-utils"
import * as viem from "viem"
import { $Popover } from "../$Popover.js"
import { $entry, $openPnl, $sizeAndLiquidation } from "../../common/$common.js"
import { $heading2 } from "../../common/$text.js"
import { latestTokenPrice } from "../../data/process/process.js"
import { $card2 } from "../../common/elements/$common.js"
import { wagmiWriteContract } from "../../logic/common.js"
import { IWalletClient } from "../../wallet/walletLink.js"
import { $ButtonPrimary, $ButtonPrimaryCtx, $ButtonSecondary, $defaultMiniButtonSecondary } from "../form/$Button.js"
import { IPositionEditorAbstractParams, ITradeConfig, ITradeParams } from "./$PositionEditor.js"


export enum ITradeFocusMode {
  collateral,
  size,
}




interface IPositionDetailsPanel extends IPositionEditorAbstractParams {
  wallet: IWalletClient
  position: IPositionMirrorSlot | null
  openPositionList: Stream<IPositionMirrorSlot[]>

  pricefeed: Stream<IPriceInterval[]>
  tradeConfig: StateStream<ITradeConfig> // ITradeParams
  tradeState: StateStream<ITradeParams>

  $container: NodeComposeFn<$Node>
}

export type IRequestTradeParams = ITradeConfig & { wallet: IWalletClient }
export type IRequestTrade = IRequestTradeParams & {
  // key: viem.Hex
  executionFee: bigint
  indexPrice: bigint
  acceptablePrice: bigint
  swapRoute: string[]
  request: Promise<viem.TransactionReceipt>
}


// setting up a limit orders clicking on the chart
// optional, setting up multiple on single tx
// open/adjust position in a single trade box
// faster pricefeed by subscribing to multiple sources
// 

export const $PositionListDetails = (config: IPositionDetailsPanel) => component((
  [switchTrade, switchTradeTether]: Behavior<any, IPositionSlot>,
) => {

  const { 
    collateralDeltaUsd, collateralToken, collateralDelta, marketInfo, market, isUsdCollateralToken, sizeDelta, focusMode,
    primaryToken, isIncrease, isLong, leverage, sizeDeltaUsd, slippage, focusPrice
  } = config.tradeConfig
  const {
    availableIndexLiquidityUsd, averagePrice, collateralDescription,
    collateralTokenPoolInfo, collateralPrice, stableFundingRateFactor, fundingRateFactor, executionFee, executionFeeUsd,
    indexDescription, indexPrice, primaryPrice, primaryDescription, isPrimaryApproved, marketPrice,
    isTradingEnabled, liquidationPrice, marginFeeUsd, route, netPositionValueUsd,
    position, swapFee, walletBalance, markets, priceImpactUsd, adjustmentFeeUsd
  } = config.tradeState










  return [
    config.$container(
      switchMap(posList => {
        return $card2(layoutSheet.spacing, style({ flex: 1 }))(

          ...posList.map(pos => {

            const positionMarkPrice = latestTokenPrice(config.processData, pos.indexToken)
            // const cumulativeFee = vault.read('cumulativeFundingRates', pos.collateralToken)
            // const pnl = map(params => {
            //   const delta = getPnL(pos.isLong, pos.averagePrice, params.positionMarkPrice.min, pos.size)

            //   return pos.realisedPnl + delta - pos.cumulativeFee
            // }, combineObject({ positionMarkPrice, cumulativeFee }))


            return switchLatest(map(activePositionSlot => {
              const isActive = activePositionSlot?.key === pos.key


              return $column(layoutSheet.spacing)(
                
                $row(style({ placeContent: 'space-between', alignItems: 'center' }))(
                  $ButtonPrimary({
                    $content: $entry(pos.isLong, pos.indexToken, pos.averagePrice),
                    $container: $defaultMiniButtonSecondary(style({ borderRadius: '20px', borderColor: isActive ? pallete.primary : colorAlpha(pallete.foreground, .20) }))
                  })({
                    click: switchTradeTether(
                      constant(pos)
                    )
                  }),
                  $sizeAndLiquidation(pos, positionMarkPrice),
                  $openPnl(config.processData, pos),
                ),

                // isActive
                //   ? $column(layoutSheet.spacing, styleInline(map(mode => ({ display: mode ? 'flex' : 'none' }), inTradeMode)))(
                //     $seperator2,
                //     $adjustmentDetails,
                //   )
                //   : empty(),

                // $infoTooltipLabel(
                //   $openPositionPnlBreakdown(pos, cumulativeFee),
                //   $pnlValue(pnl)
                // ),
              )
            }, position))
          })
        )

      }, config.openPositionList)
    ),

    {
      switchTrade
    }
  ]
})




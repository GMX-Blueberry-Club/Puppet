import { Behavior, combineObject } from "@aelea/core"
import { $Node, $text, NodeComposeFn, component, style, styleBehavior } from "@aelea/dom"
import { $column, $row, layoutSheet, screenUtils } from "@aelea/ui-components"
import { pallete } from "@aelea/ui-components-theme"
import {
  combine,
  constant,
  map,
  mergeArray,
  snapshot,
  switchLatest,
  tap
} from "@most/core"
import { Stream } from "@most/types"
import {
  IMarket,
  IPositionSlot, IPriceInterval,
  StateStream,
  lst,
  switchMap
} from "gmx-middleware-utils"
import { IPositionMirrorSlot } from "puppet-middleware-utils"
import * as viem from "viem"
import { $entry, $openPnl, $sizeAndLiquidation } from "../../common/$common.js"
import { IGmxProcessState, latestTokenPrice } from "../../data/process/process.js"
import { $seperator2 } from "../../pages/common"
import { ISupportedChain, IWalletClient } from "../../wallet/walletLink.js"
import { $ButtonPrimary, $ButtonSecondary, $defaultMiniButtonSecondary } from "../form/$Button.js"
import { IPositionEditorAbstractParams, ITradeConfig, ITradeParams } from "./$PositionEditor.js"


export enum ITradeFocusMode {
  collateral,
  size,
}




interface IPositionDetailsPanel {
  processData: Stream<IGmxProcessState>
  chain: ISupportedChain
  wallet: Stream<IWalletClient>
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
  [switchPosition, switchPositionTether]: Behavior<any, IPositionSlot>,
  [clickClose, clickCloseTeter]: Behavior<any, IPositionSlot>,

  [changeMarket, changeMarketTether]: Behavior<IMarket>,
  [switchIsLong, switchIsLongTether]: Behavior<boolean>,
  [switchIsIncrease, switchIsIncreaseTether]: Behavior<boolean>,

) => {

  const { 
    collateralDeltaUsd, collateralToken, collateralDelta, marketInfo, market, isUsdCollateralToken, sizeDelta, focusMode,
    primaryToken, isIncrease, isLong, leverage, sizeDeltaUsd, slippage, focusPrice
  } = config.tradeConfig
  const {
    availableIndexLiquidityUsd, averagePrice, collateralDescription,
    collateralTokenPoolInfo, collateralPrice, stableFundingRateFactor, fundingRateFactor, executionFee,
    indexDescription, indexPrice, primaryPrice, primaryDescription, isPrimaryApproved, marketPrice,
    isTradingEnabled, liquidationPrice, marginFeeUsd, route, netPositionValueUsd,
    swapFee, walletBalance, markets, position, priceImpactUsd, adjustmentFeeUsd, 
  } = config.tradeState










  return [
    config.$container(
      switchMap(posList => {
        return $column(layoutSheet.spacing, style({ flex: 1 }))(

          ...posList.map(pos => {

            const positionMarkPrice = latestTokenPrice(config.processData, pos.indexToken)
            // const cumulativeFee = vault.read('cumulativeFundingRates', pos.collateralToken)
            // const pnl = map(params => {
            //   const delta = getPnL(pos.isLong, pos.averagePrice, params.positionMarkPrice.min, pos.size)

            //   return pos.realisedPnl + delta - pos.cumulativeFee
            // }, combineObject({ positionMarkPrice, cumulativeFee }))



            return $column(layoutSheet.spacing)(
              style({ marginRight: screenUtils.isDesktopScreen ? '-16px' : '' })($seperator2),
                
              $row(style({ placeContent: 'space-between', alignItems: 'center' }))(
                $ButtonPrimary({
                  $content: $entry(pos.isLong, pos.indexToken, pos.averagePrice),
                  $container: $defaultMiniButtonSecondary(
                    styleBehavior(map(activePositionSlot => ({ backgroundColor: activePositionSlot?.key === pos.key ? pallete.primary : pallete.middleground }), position)),
                    style({ borderRadius: '20px', borderColor: 'transparent',  })
                  )
                })({
                  click: switchPositionTether(
                    constant(pos),
                  )
                }),
                $sizeAndLiquidation(pos, positionMarkPrice),
                $openPnl(config.processData, pos),

                $ButtonSecondary({
                  $content: $text('Close'),
                  $container: $defaultMiniButtonSecondary
                })({
                  click: clickCloseTeter(
                    constant(pos),
                  )
                })
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
          })
        )

      }, config.openPositionList)
    ),

    {
      switchPosition: mergeArray([
        switchPosition,
        clickClose
      ]),
      changeMarket: snapshot((params, posSlot) => {
        const update = lst(posSlot.updates)
        const market = params.markets.find(m => m.marketToken === update.market)
        if (!market) throw new Error(`Market not found for ${update.market}`)

        return market
      }, combineObject({ markets }), switchPosition),
      switchIsLong: map(params => lst(params.switchPosition.updates).isLong, combineObject({ switchPosition })),
      switchIsIncrease: mergeArray([
        constant(true, switchPosition),
        constant(false, clickClose)
      ]),
      changeLeverage: constant(0n, clickClose),
      changeIsUsdCollateralToken: snapshot((params, posSlot) => {
        const update = lst(posSlot.updates)

        return params.market.shortToken === update.collateralToken
      }, combineObject({ market }), switchPosition),
    }
  ]
})




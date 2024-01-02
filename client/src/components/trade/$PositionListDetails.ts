import { Behavior, combineObject } from "@aelea/core"
import { $Node, $text, NodeComposeFn, component, style, styleBehavior } from "@aelea/dom"
import { $column, $row, layoutSheet, screenUtils } from "@aelea/ui-components"
import { pallete } from "@aelea/ui-components-theme"
import {
  constant,
  map,
  mergeArray,
  snapshot
} from "@most/core"
import { Stream } from "@most/types"
import {
  IMarket,
  IPriceLatestMap,
  IPriceOracleMap,
  StateStream,
  TEMP_MARKET_TOKEN_MARKET_MAP,
  filterNull,
  switchMap
} from "gmx-middleware-utils"
import { IMirrorPositionOpen, latestPriceMap } from "puppet-middleware-utils"
import * as viem from "viem"
import { $entry, $openPnl, $sizeAndLiquidation } from "../../common/$common.js"
import { $seperator2 } from "../../pages/common"
import { ISupportedChain, IWalletClient } from "../../wallet/walletLink.js"
import { $ButtonPrimary, $ButtonSecondary, $defaultMiniButtonSecondary } from "../form/$Button.js"
import { ITradeConfig, ITradeParams } from "./$PositionEditor.js"

export enum ITradeFocusMode {
  collateral,
  size,
}




interface IPositionDetailsPanel {
  chain: ISupportedChain
  wallet: Stream<IWalletClient>
  openPositionList: Stream<IMirrorPositionOpen[]>
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

export const $PositionListDetails = (config: IPositionDetailsPanel) => component((
  [switchPosition, switchPositionTether]: Behavior<any, IMirrorPositionOpen>,
  [clickClose, clickCloseTeter]: Behavior<any, IMirrorPositionOpen>,

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
    collateralPrice, executionFee,
    indexDescription, indexPrice, primaryPrice, primaryDescription, isPrimaryApproved, marketPrice,
    isTradingEnabled, liquidationPrice, marginFeeUsd, route, netPositionValueUsd,
    walletBalance, marketList, position, priceImpactUsd, adjustmentFeeUsd, 
  } = config.tradeState


  return [
    config.$container(
      switchMap(posList => {
        return $column(layoutSheet.spacing, style({ flex: 1 }))(

          ...posList.map(mp => {

            const positionMarkPrice = map(pm => pm[mp.position.indexToken].min, latestPriceMap)
            // const cumulativeFee = vault.read('cumulativeFundingRates', pos.collateralToken)
            // const pnl = map(params => {
            //   const delta = getPnL(pos.isLong, pos.averagePrice, params.positionMarkPrice.min, pos.size)

            //   return pos.realisedPnl + delta - pos.cumulativeFee
            // }, combineObject({ positionMarkPrice, cumulativeFee }))



            return $column(layoutSheet.spacing)(
              style({ marginRight: screenUtils.isDesktopScreen ? '-16px' : '' })($seperator2),

              $row(style({ placeContent: 'space-between', alignItems: 'center' }))(
                $ButtonPrimary({
                  $content: $entry(mp),
                  $container: $defaultMiniButtonSecondary(
                    styleBehavior(map(activePositionSlot => ({ backgroundColor: activePositionSlot.position.key === mp.position.key ? pallete.primary : pallete.middleground }), filterNull(position))),
                    style({ borderRadius: '20px', borderColor: 'transparent',  })
                  )
                })({
                  click: switchPositionTether(
                    constant(mp),
                  )
                }),
                $sizeAndLiquidation(mp, positionMarkPrice),
                $openPnl(positionMarkPrice, mp),

                $ButtonSecondary({
                  $content: $text('Close'),
                  $container: $defaultMiniButtonSecondary
                })({
                  click: clickCloseTeter(
                    constant(mp),
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
        // clickClose
      ]),
      changeMarket: snapshot((params, posSlot) => {
        const mm = params.marketList.find(m => m.marketToken === posSlot.position.market)
        if (!mm) throw new Error(`Market not found for ${posSlot.position.market}`)

        return mm
      }, combineObject({ marketList }), switchPosition),
      switchIsLong: map(params => params.switchPosition.position.isLong, combineObject({ switchPosition })),
      switchIsIncrease: mergeArray([
        constant(true, switchPosition),
        constant(false, clickClose)
      ]),
      changeLeverage: constant(0n, clickClose),
      changeIsUsdCollateralToken: snapshot((params, posSlot) => {
        return params.market.shortToken === posSlot.position.collateralToken
      }, combineObject({ market }), switchPosition),
    }
  ]
})




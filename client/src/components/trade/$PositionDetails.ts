import { O, combineObject } from "@aelea/core"
import { $Node, $text, NodeComposeFn, component, style } from "@aelea/dom"
import { $column, $row, layoutSheet, screenUtils } from "@aelea/ui-components"
import {
  map,
  now
} from "@most/core"
import { Stream } from "@most/types"
import * as GMX from "gmx-middleware-const"
import {
  $Table,
  $infoLabel,
  $txHashRef
} from "gmx-middleware-ui-components"
import {
  IPositionDecrease,
  IPositionIncrease,
  IPriceCandle,
  StateStream,
  getTokenUsd,
  readableDate,
  readableFixedUSD30,
  switchMap,
  timeSince,
  unixTimestampNow
} from "gmx-middleware-utils"
import { IPositionMirrorOpen } from "puppet-middleware-utils"
import * as viem from "viem"
import { connectContract } from "../../logic/common.js"
import { ISupportedChain, IWalletClient } from "../../wallet/walletLink.js"
import { ITradeConfig, ITradeParams } from "./$PositionEditor.js"


export enum ITradeFocusMode {
  collateral,
  size,
}




interface IPositionAdjustmentHistory {
  chain: ISupportedChain
  wallet: Stream<IWalletClient>
  openPositionList: Stream<IPositionMirrorOpen[]>

  pricefeed: Stream<IPriceCandle[]>
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




export const $PositionDetails = (config: IPositionAdjustmentHistory) => component((
) => {

  const gmxContractMap = GMX.CONTRACT[config.chain.id]

  const vault = connectContract(gmxContractMap.Vault)
  const router = connectContract(gmxContractMap.Router)
  const positionRouterAddress = GMX.CONTRACT[config.chain.id].PositionRouter.address


  const { 
    collateralDeltaUsd, collateralToken, indexToken, collateralDelta, marketInfo, market, isUsdCollateralToken, sizeDelta, focusMode,
    primaryToken, isIncrease, isLong, leverage, sizeDeltaUsd, slippage, focusPrice
  } = config.tradeConfig
  const {
    availableIndexLiquidityUsd, averagePrice, collateralDescription,
    collateralPrice, stableFundingRateFactor, fundingRateFactor, executionFee,
    indexDescription, indexPrice, primaryPrice, primaryDescription, isPrimaryApproved, marketPrice,
    isTradingEnabled, liquidationPrice, marginFeeUsd, route, netPositionValueUsd,
    position, walletBalance, marketList, priceImpactUsd, adjustmentFeeUsd, routeTypeKey
  } = config.tradeState


  const dataSource = switchMap(pos => {
    console.log('pos', pos)
    return pos
      ? now([...pos.position.link.increaseList, ...pos.position.link.decreaseList].sort((a, b) => b.blockTimestamp - a.blockTimestamp ))
      : now([])
  }, position)

  




  return [
    $Table({
      $container: config.$container(layoutSheet.spacingSmall, style({ flex: 1 })),
      // $rowContainer: screenUtils.isDesktopScreen
      //   ? $row(layoutSheet.spacing, style({ padding: `2px 26px` }))
      //   : $row(layoutSheet.spacingSmall, style({ padding: `2px 10px` })),
      // headerCellOp: style({ padding: screenUtils.isDesktopScreen ? '15px 15px' : '6px 4px' }),
      // cellOp: style({ padding: screenUtils.isDesktopScreen ? '4px 15px' : '6px 4px' }),
      dataSource: dataSource,
      // $container: $defaultTableContainer(screenUtils.isDesktopScreen ? style({ flex: '1 1 0', minHeight: '100px' }) : style({})),
      scrollConfig: {
        insertAscending: true,
        $emptyMessage: switchMap(params => {
          return $row(layoutSheet.spacingSmall, style({ placeContent: 'center' }))(
            // $route(params),
            $infoLabel(`No active position`),
          )
        }, combineObject({ isIncrease, isLong, collateralToken, indexToken }))
      },
      columns: [
        {
          $head: $text('Time'),
          columnOp: O(style({ maxWidth: '100px' })),

          $bodyCallback: map((req) => {
            const isKeeperReq = 'slippage' in req

            const timestamp = isKeeperReq ? unixTimestampNow() : req.blockTimestamp

            return $column(layoutSheet.spacingTiny, style({ fontSize: '.85rem' }))(
              $text(timeSince(timestamp) + ' ago'),
              $text(readableDate(timestamp)),
            )
          })
        },
        {
          $head: $text('Action'),
          columnOp: O(style({ flex: 1 })),
          $bodyCallback: map((pos) => {
            const $requestRow = $row(style({ alignItems: 'center' }))

            if ('key' in pos) {
              const direction = pos.__typename === 'PositionIncrease' ? '↑' : '↓'
              return $row(layoutSheet.spacingSmall)(
                $txHashRef(pos.transactionHash, w3p.chain.id, $text(`${direction} ${readableFixedUSD30(pos.price)}`))
              )
            }

            return $row(layoutSheet.spacingSmall)(
              // switchMap(req => {
              //   const activePositionAdjustment = take(1, filter(ev => {
              //     const key = getPositionKey(ev.args.account, pos.isIncrease ? ev.args.path.slice(-1)[0] : ev.args.path[0], ev.args.indexToken, ev.args.isLong)

              //     return key === getPositionKey(pos.route, pos.collateralToken, pos.indexToken, pos.isLong)
              //   }, adjustPosition))

              //   return $row(layoutSheet.spacingSmall)(
              //     switchLatest(mergeArray([
              //       now($spinner),
              //       map(req => {
              //         const isRejected = req.eventName === 'CancelIncreasePosition' // || req.eventName === 'CancelDecreasePosition'

              //         const message = $text(`${isRejected ? `✖ ${readableFixedUSD30(req.args.acceptablePrice)}` : `✔ ${readableFixedUSD30(req.args.acceptablePrice)}`}`)

              //         return $requestRow(
              //           $txHashRef(req.transactionHash!, w3p.chain.id, message),
              //           $infoTooltip('transaction was sent, keeper will execute the request, the request will either be executed or rejected'),
              //         )
              //       }, activePositionAdjustment),
              //     ])),
              //     $txHashRef(
              //       req.transactionHash, w3p.chain.id,
              //       $text(`${isIncrease ? '↑' : '↓'} ${readableFixedUSD30(pos.acceptablePrice)} ${isIncrease ? '<' : '>'}`)
              //     ),
              //   ) 
              // }, fromPromise(pos.request)),
            )

          })
        },
        ...screenUtils.isDesktopScreen
          ? [
            {
              $head: $text('PnL Realised'),
              columnOp: O(style({ flex: .5, placeContent: 'flex-end', textAlign: 'right', alignItems: 'center' })),
              $bodyCallback: map((req: IRequestTrade | IPositionIncrease | IPositionDecrease) => {
                if ('request' in req) {
                  return $text('')
                }

                const pnl = req.priceImpactUsd

                return $text(readableFixedUSD30(pnl))
              })
            }
          ] : [],
        {
          $head: $text('Collateral change'),
          columnOp: O(style({ flex: .7, placeContent: 'flex-end', textAlign: 'right', alignItems: 'center' })),

          $bodyCallback: map((req) => {
            const isKeeperReq = 'request' in req
            const delta = isKeeperReq
              ? req.isIncrease
                ? req.collateralDeltaUsd : -req.collateralDeltaUsd : getTokenUsd(req["collateralTokenPrice.min"], req.collateralAmount)

            return $text(readableFixedUSD30(delta))
          })
        },
        {
          $head: $text('Size change'),
          columnOp: O(style({ flex: .7, placeContent: 'flex-end', textAlign: 'right', alignItems: 'center' })),
          $bodyCallback: map((req) => {
            const isKeeperReq = 'request' in req
            const delta = isKeeperReq
              ? req.isIncrease
                ? req.sizeDeltaUsd : -req.sizeDeltaUsd : req.sizeDeltaUsd

            return $text(readableFixedUSD30(delta))
          })
        },
      ]
    })({}),

    // switchMap(tradeParams => {
    //   if (params.position === null) {
    //     const intent = tradeParams.isLong ? `Long-${tradeParams.indexDescription.symbol}` : `Short-${tradeParams.indexDescription.symbol}/${tradeParams.indexDescription.symbol}`

    //     $column(layoutSheet.spacingSmall, style({ flex: 1, alignItems: 'center', placeContent: 'center' }))(
    //       $text(style({ fontSize: '1.5rem' }))('Trade History'),
    //       $text(style({ color: pallete.foreground }))(
    //         `No active ${intent} position`
    //       )
    //     )
    //   }

    //   return 
    // }, combineObject({ indexDescription, isLong })),

    {


      // leverage: filterNull(snapshot(state => {
      //   if (state.position === null) {
      //     return null
      //   }

      //   return div(state.position.size, state.position.collateral - state.fundingFee)
      // }, combineObject({ position, fundingFee }), delay(50, clickResetPosition))),
      

    }
  ]
})




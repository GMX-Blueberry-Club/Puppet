import { O } from "@aelea/core"
import { $Node, $node, $text, NodeComposeFn, component, style } from "@aelea/dom"
import { $column, $row, layoutSheet, screenUtils } from "@aelea/ui-components"
import { colorAlpha, pallete } from "@aelea/ui-components-theme"
import { map, now } from "@most/core"
import { Stream } from "@most/types"
import { IMirrorPositionOpen } from "puppet-middleware-utils"
import { $Table, $infoLabel, $txHashRef } from "ui-components"
import * as viem from "viem"
import { ISupportedChain, IWalletClient } from "../../wallet/walletLink.js"
import { ITradeConfig, ITradeParams } from "./$PositionEditor.js"
import { StateStream, switchMap, unixTimestampNow, getTimeSince, readableDate, getMappedValue, readableTokenPrice, readableUsd, getTokenUsd } from "common-utils"
import { IPriceCandle, IPositionIncrease, IPositionDecrease, TEMP_MARKET_TOKEN_MARKET_MAP, getTokenDescription } from "gmx-middleware-utils"



interface IPositionAdjustmentHistory {
  chain: ISupportedChain
  wallet: Stream<IWalletClient>
  pricefeed: Stream<IPriceCandle[]>
  tradeConfig: StateStream<ITradeConfig> // ITradeParams
  tradeState: StateStream<ITradeParams>
  $container: NodeComposeFn<$Node>
  mirrorPosition: Stream<IMirrorPositionOpen | null>
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

  const { chain, wallet, pricefeed, tradeConfig, tradeState, $container, mirrorPosition } = config

  return [
    switchMap(pos => {
      const dataSource: Stream<(IPositionIncrease | IPositionDecrease)[]> = pos
        ? now([...pos.position.link.increaseList, ...pos.position.link.decreaseList].sort((a, b) => Number(b.blockTimestamp - a.blockTimestamp) ))
        : now([])

      return $Table({
        $container: config.$container(style({ flex: 1 })),
        $headerContainer: $node(layoutSheet.spacingSmall, style({ display: 'grid', padding: `12px`, borderBottom: `1px solid ${colorAlpha(pallete.foreground, .20)}` })),
        $rowContainer: $node(layoutSheet.spacingSmall, style({ padding: `12px` })),
        // headerCellOp: style({ padding: screenUtils.isDesktopScreen ? '15px 15px' : '6px 4px' }),
        // cellOp: style({ padding: screenUtils.isDesktopScreen ? '4px 15px' : '6px 4px' }),
        dataSource: dataSource,
        // $container: $defaultTableContainer(screenUtils.isDesktopScreen ? style({ flex: '1 1 0', minHeight: '100px' }) : style({})),
        scrollConfig: {
          insertAscending: true,
          $emptyMessage: style({ alignSelf: 'center', padding: '26px' })(
            $infoLabel(`No active position`)
          )
        },
        columns: [
          {
            $head: $text('Time'),
            columnOp: O(style({ maxWidth: '100px' })),

            $bodyCallback: map((req) => {
              const isKeeperReq = 'slippage' in req
              const timestamp = isKeeperReq ? unixTimestampNow() : Number(req.blockTimestamp)

              return $column(layoutSheet.spacingTiny, style({ fontSize: '.85rem' }))(
                $text(getTimeSince(timestamp)),
                $text(readableDate(timestamp)),
              )
            })
          },
          {
            $head: $text('Action'),
            columnOp: O(style({ flex: 1 })),
            $bodyCallback: map((pos) => {
              const direction = pos.__typename === 'PositionIncrease' ? '↑' : '↓'
              const marketIndexToken = getMappedValue(TEMP_MARKET_TOKEN_MARKET_MAP, pos.market)
              const tokendescription = getTokenDescription(marketIndexToken.indexToken)

              return $row(layoutSheet.spacingSmall)(
                $txHashRef(pos.transactionHash, config.chain),
                $text(`${direction} ${readableTokenPrice(tokendescription.decimals, pos.executionPrice)}`)
              )

              // return $row(layoutSheet.spacingSmall)(
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
              // )

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

                  return $text(readableUsd(pnl))
                })
              }
            ] : [],
          {
            $head: $text('Collateral'),
            columnOp: O(style({ flex: .7, placeContent: 'flex-end', textAlign: 'right', alignItems: 'center' })),

            $bodyCallback: map(req => {
              const amount = req.__typename === 'PositionIncrease' ? req.collateralAmount : -req.collateralAmount
              const delta = getTokenUsd(req.collateralTokenPriceMax, amount)

              return $text(readableUsd(delta))
            })
          },
          {
            $head: $text('Size'),
            columnOp: O(style({ flex: .7, placeContent: 'flex-end', textAlign: 'right', alignItems: 'center' })),
            $bodyCallback: map((req) => {
            
              const delta = req.__typename === 'PositionIncrease'
                ? req.sizeDeltaUsd : -req.sizeDeltaUsd

              return $text(readableUsd(delta))
            })
          },
        ]
      })({})
    }, mirrorPosition),

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




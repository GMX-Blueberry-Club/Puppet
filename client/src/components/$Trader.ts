import { Behavior, O, combineObject } from "@aelea/core"
import { $node, $text, component, style } from "@aelea/dom"
import * as router from '@aelea/router'
import { $column, $row, layoutSheet } from "@aelea/ui-components"
import { colorAlpha, pallete } from "@aelea/ui-components-theme"
import { constant, empty, map, now } from "@most/core"
import { Stream } from "@most/types"
import { $Table, $infoLabel, $infoTooltipLabel } from "gmx-middleware-ui-components"
import { IRequestAccountTradeListApi, formatBps, leverageLabel, readableDate, readableUnitAmount, switchMap, timeSince } from "gmx-middleware-utils"
import { ITraderSubscritpion, summariesMirrorTrader } from "puppet-middleware-utils"
import * as viem from 'viem'
import { $TradePnl, $entry, $openPositionPnlBreakdown, $pnlValue, $puppets, $riskLiquidator, $sizeDisplay } from "../common/$common"
import { IGmxProcessSeed, latestTokenPrice } from "../data/process/process"
import { $card, $card2 } from "../elements/$common"
import { $discoverAvatar, $discoverIdentityDisplay } from "./$AccountProfile"
import { $defaultBerry } from "./$DisplayBerry"
import { $ProfilePerformanceCard } from "./trade/$ProfilePerformanceCard"
import { $seperator2 } from "../pages/common"
import { $ButtonSecondary, $defaultMiniButtonSecondary } from "./form/$Button"
import { wallet } from "../wallet/walletLink"
import { ARBITRUM_ADDRESS } from "gmx-middleware-const"
import { getRouteTypeKey, getPuppetSubscriptionKey } from "puppet-middleware-const"



export interface ITraderProfile {
  route: router.Route
  address: viem.Address
  processData: Stream<IGmxProcessSeed>
}




export const $TraderProfile = (config: ITraderProfile) => component((
  [changeRoute, changeRouteTether]: Behavior<string, string>,
  [requestAccountTradeList, requestAccountTradeListTether]: Behavior<number, IRequestAccountTradeListApi>,

  [subscribeTreader, subscribeTreaderTether]: Behavior<PointerEvent, ITraderSubscritpion>,

) => {

  const openTrades = map(seed => {
    const newLocal = Object.values(seed.mirrorPositionSlot).filter(pos => pos.trader.toLowerCase() === config.address.toLowerCase())
    return newLocal
  }, config.processData)

  const settledTrades = map(seed => {
    const list = Object.values(seed.mirrorPositionSettled[config.address]).flat().reverse()
    return list
  }, config.processData)

  const summary = map(list => {
    return summariesMirrorTrader(list)
  }, settledTrades)

  const subscribers = map(seed => {
    const newLocal = seed.subscription.filter((sub) => sub.trader === config.address).map(s => s.puppet)
    return newLocal
  }, config.processData)


  const $itemListRow = $row(layoutSheet.spacingBig, style({ placeContent: 'space-between' }))

  return [
    $column(layoutSheet.spacingBig, style({ width: '100%', margin: '0 auto', alignItems: 'center' }))(

      $row(style({ gap: '45px', alignItems: 'center' }))(

        $card2(style({ padding: 0, position: 'relative' }))(
          $row(layoutSheet.spacing, style({ marginBottom: '-20px', position: 'absolute', bottom: '100%', left: '20px' }))(
            $discoverIdentityDisplay({
              address: config.address,
              $container: $row(
                style({ minWidth: '120px', })
              ),
              $profileContainer: $defaultBerry(style({ width: '100px', }))
            }),

            // switchMap(params => {
            //   if (params.wallet === null || params.subscriptionList.find(s => s.trader === pos.account) !== undefined) {
            //     return empty()
            //   }

            //   const routeTypeKey = getRouteTypeKey(ARBITRUM_ADDRESS.NATIVE_TOKEN, ARBITRUM_ADDRESS.NATIVE_TOKEN, true)
            //   const puppetSubscriptionKey = getPuppetSubscriptionKey(params.wallet.account.address, pos.account, routeTypeKey)

            //   const newLocal: ITraderSubscritpion = {
            //     trader: pos.account,
            //     puppet: params.wallet.account.address,
            //     allowance: 1000n,
            //     routeTypeKey,
            //     puppetSubscriptionKey,
            //     subscribed: params.subscription.find(x => x.indexOf(pos.route) > -1) === undefined,
            //   }

            //   return $ButtonSecondary({ $content: $text('Copy'), $container: $defaultMiniButtonSecondary })({
            //     click: subscribeTreaderTether(constant(newLocal))
            //   }) 
            // }, combineObject({ wallet, subscription: config.subscription, subscriptionList: config.subscribeList }))
          ),
          $ProfilePerformanceCard({
            $container: $column(style({ width: '700px', height: '200px', padding: 0 })),
            processData: config.processData,
            trader: config.address,
          })({ }),
        ),

        $column(layoutSheet.spacingBig, style({  }))(
          $itemListRow(
            $infoLabel('Puppets'),
            $row(style({ alignItems: 'center' }))(
              switchMap(puppets => {
                return $row(style({ flex: 1 }))(
                  ...puppets.map(address => {
                    return $discoverAvatar({ address, $profileContainer: $defaultBerry(style({ minWidth: '30px', maxWidth: '30px' })) })
                  })
                )
              }, subscribers)
            ),
          ),

          $seperator2,

          $itemListRow(
            $infoLabel('Win / Loss'),
            $text(map(seed => {
              return `${seed.winCount} / ${seed.lossCount}`
            }, summary))
          ),

          $seperator2,

          $itemListRow(
            $infoLabel(
              $text('Avg Leverage')
            ),
            $row(style({ minHeight: '20px', alignItems: 'center' }))(
              $text(map(seed => {
                return leverageLabel(seed.avgLeverage)
              }, summary))
            )
          ),
        ),
      ),

      $node(),

      $card(layoutSheet.spacingBig, style({ flex: 1, width: '100%' }))(
        $column(
          $text('Open Positions'),
          $Table({
            dataSource: openTrades,
            columns: [
              {
                $head: $text('Open Time'),
                columnOp: style({ maxWidth: '130px' }),
                $$body: map((pos) => {

                  const timestamp = pos.blockTimestamp

                  return $column(layoutSheet.spacingTiny)(
                    $text(readableDate(timestamp)),
                    $text(style({ fontSize: '.75rem' }))(timeSince(timestamp) + ' ago'),
                  )
                })
              },
              {
                $head: $text('Entry'),
                columnOp: O(style({ maxWidth: '100px' }), layoutSheet.spacingTiny),
                $$body: map((pos) => {
                  return $entry(pos.position)
                })
              },
              {
                $head: $text('Puppets'),
                columnOp: O(layoutSheet.spacingTiny, style({ flex: 1 })),
                $$body: map((pos) => {
                  // const positionMarkPrice = tradeReader.getLatestPrice(now(pos.indexToken))
                  // const cumulativeFee = tradeReader.vault.read('cumulativeFundingRates', pos.collateralToken)

                  return $puppets(pos.puppets, empty())
                })
              },
              {
                $head: $column(style({ textAlign: 'right' }))(
                  $text('Size'),
                  $text(style({ fontSize: '.75rem' }))('Leverage'),
                ),
                columnOp: O(layoutSheet.spacingTiny, style({ flex: 1.2, placeContent: 'flex-end' })),
                $$body: map(pos => {
                  const positionMarkPrice = latestTokenPrice(config.processData, now(pos.position.indexToken))

                  return $riskLiquidator(pos.position, positionMarkPrice)
                })
              },
              {
                $head: $text('PnL'),
                columnOp: O(layoutSheet.spacingTiny, style({ flex: 1, placeContent: 'flex-end' })),
                $$body: map((pos) => {
                  const positionMarkPrice = latestTokenPrice(config.processData, now(pos.position.indexToken))
                  const cumulativeFee = now(0n)

                  return style({ flexDirection: 'row-reverse' })(
                    $infoTooltipLabel(
                      $openPositionPnlBreakdown(pos.position, cumulativeFee),
                      $TradePnl(pos.position, positionMarkPrice)
                    )
                  )
                })
              },
            ],
          })({}),
        ),

        $node(),

        $column(
          $text('Settled Positions'),
          $Table({
            dataSource: settledTrades,
            columns: [
              {
                $head: $text('Settle Time'),
                columnOp: style({ maxWidth: '130px' }),
                $$body: map((pos) => {

                  const timestamp = pos.blockTimestamp

                  return $column(layoutSheet.spacingTiny)(
                    $text(readableDate(timestamp)),
                    $text(style({ fontSize: '.75rem' }))(timeSince(timestamp) + ' ago'),
                  )
                })
              },
              {
                $head: $text('Entry'),
                columnOp: O(style({ maxWidth: '100px' }), layoutSheet.spacingTiny),
                $$body: map((pos) => {
                  return $entry(pos.position)
                })
              },
              {
                $head: $text('Puppets'),
                columnOp: O(layoutSheet.spacingTiny, style({ flex: 1 })),
                $$body: map((pos) => {
                  // const positionMarkPrice = tradeReader.getLatestPrice(now(pos.indexToken))
                  // const cumulativeFee = tradeReader.vault.read('cumulativeFundingRates', pos.collateralToken)

                  return $puppets(pos.puppets, empty())
                })
              },
              {
                $head: $column(style({ textAlign: 'right' }))(
                  $text('Size'),
                  $text(style({ fontSize: '.75rem' }))('Leverage'),
                ),
                columnOp: O(layoutSheet.spacingTiny, style({ flex: 1.2, placeContent: 'flex-end' })),
                $$body: map(pos => {
                  return $sizeDisplay(pos.position.size, pos.position.collateral)
                })
              },
              {
                $head: $text('PnL'),
                columnOp: O(layoutSheet.spacingTiny, style({ flex: 1, placeContent: 'flex-end' })),
                $$body: map((pos) => {
                  return $pnlValue(pos.position.realisedPnl - pos.position.cumulativeFee)
                })
              },
            ],
          })({})
        ),
      )

      
      // $row(layoutSheet.spacingSmall, style({ }))(
      //   $text(config.address),
      //   switchMap(params => {
      //     if (params.wallet === null) {
      //       return empty()
      //     }

      //     const routeTypeKey = getRouteTypeKey(GMX.ARBITRUM_ADDRESS.NATIVE_TOKEN, GMX.ARBITRUM_ADDRESS.NATIVE_TOKEN, true)

      //     const newLocal: ITraderSubscritpion = {
      //       trader: config.address,
      //       puppet: params.wallet.account.address,
      //       allowance: 1000n,
      //       routeTypeKey,
      //       subscribed: true,
      //     }

      //     return $ButtonSecondary({ $content: $text('Copy'), $container: $defaultMiniButtonSecondary })({
      //       click: subscribeTreaderTether(constant(newLocal))
      //     }) 
      //   }, combineObject({ wallet }))
      // ),



      // $text('Settled Positions'),
      // $card({
      //   dataSource: trades,
      //   columns: [
      //     {
      //       $head: $text('Settle Time'),
      //       columnOp: O(style({ maxWidth: '100px' })),

      //       $$body: map((req) => {
      //         const isKeeperReq = 'ctx' in req

      //         // const timestamp = isKeeperReq ? unixTimestampNow() : req.settlement.blockTimestamp

      //         return $column(layoutSheet.spacingTiny)(
      //           // $text(timeSince(timestamp) + ' ago'),
      //           // $text(style({ fontSize: '.75rem' }))(readableDate(timestamp)),
      //         )
      //       })
      //     },
      //     {
      //       $head: $column(style({ textAlign: 'right' }))(
      //         $text('Entry'),
      //         $text(style({ fontSize: '.75rem' }))('Price'),
      //       ),
      //       columnOp: O(style({ maxWidth: '100px' }), layoutSheet.spacingTiny),
      //       $$body: map((pos) => {
      //         return $entry(pos)
      //       })
      //     },
      //     {
      //       $head: $column(style({ textAlign: 'right' }))(
      //         $text('Max Size'),
      //         $text(style({ fontSize: '.75rem' }))('Leverage / Liquidation'),
      //       ),
      //       columnOp: O(layoutSheet.spacingTiny, style({ flex: 1.2, placeContent: 'flex-end' })),
      //       $$body: map(pos => {
      //         return $settledSizeDisplay(pos)
      //       })
      //     },
      //     {
      //       $head: $text('PnL'),
      //       columnOp: O(layoutSheet.spacingTiny, style({ flex: 1, placeContent: 'flex-end' })),
      //       $$body: map((pos) => {
      //         return $pnlValue(pos.realisedPnl - pos.cumulativeFee)
      //       })
      //     },
      //   ],
      // })({
      //   // scrollIndex: requestAccountTradeListTether(
      //   //   zip((wallet, pageIndex) => {
      //   //     if (!wallet || wallet.chain === null) {
      //   //       return null
      //   //     }

      //   //     return {
      //   //       status: TradeStatus.CLOSED,
      //   //       account: wallet.account.address,
      //   //       chain: wallet.chain.id,
      //   //       offset: pageIndex * 20,
      //   //       pageSize: 20,
      //   //     }
      //   //   }, walletLink.wallet),
      //   //   filterNull
      //   // )
      // }),

      
      
      
    ),
    {
      changeRoute, subscribeTreader
    }
  ]
})



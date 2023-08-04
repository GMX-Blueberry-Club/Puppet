import { Behavior } from "@aelea/core"
import { $node, $text, component, style } from "@aelea/dom"
import * as router from '@aelea/router'
import { $column, $row, layoutSheet } from "@aelea/ui-components"
import { pallete } from "@aelea/ui-components-theme"
import { map } from "@most/core"
import { Stream } from "@most/types"
import { $Table } from "gmx-middleware-ui-components"
import { IRequestAccountTradeListApi, leverageLabel, switchMap } from "gmx-middleware-utils"
import { ITraderSubscritpion, summariesMirrorTrader } from "puppet-middleware-utils"
import * as viem from 'viem'
import { $discoverAvatar, $discoverIdentityDisplay } from "../$AccountProfile"
import { $defaultBerry } from "../$DisplayBerry"
import { $traderDisplay } from "../../common/$common"
import { IGmxProcessSeed } from "../../data/process/process"
import { $card, $card2 } from "../../elements/$common"
import { $seperator2 } from "../../pages/common"
import { entryColumn, pnlSlotColumn, settledPnlColumn, settledSizeColumn, settledTimeColumn, slotSizeColumn, timeSlotColumn } from "../table/$TableColumn"
import { $ProfilePerformanceCard } from "../trade/$ProfilePerformanceCard"



export interface ITraderProfile {
  route: router.Route
  address: viem.Address
  processData: Stream<IGmxProcessSeed>
}




export const $PuppetProfile = (config: ITraderProfile) => component((
  [changeRoute, changeRouteTether]: Behavior<string, string>,
  [requestAccountTradeList, requestAccountTradeListTether]: Behavior<number, IRequestAccountTradeListApi>,
  [subscribeTreader, subscribeTreaderTether]: Behavior<PointerEvent, ITraderSubscritpion>,

) => {

  const openTrades = map(seed => {
    const list = seed.subscription.find(s => s.trader)?.open.reverse() || []
    return list
  }, config.processData)

  const settledTrades = map(seed => {
    const list = seed.subscription.find(s => s.trader)?.settled.sort((a, b) => b.blockTimestamp - a.blockTimestamp) || []
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

  const $metricRow = $column(style({ placeContent: 'center', alignItems: 'center' }))
  const $metricLabel = $row(style({ color: pallete.foreground, letterSpacing: '1px', fontSize: '.85rem' }))
  const $metricValue = $row(style({ fontWeight: 900, letterSpacing: '1px', fontSize: '1.75rem' }))

  const $heading = $text(style({ fontSize: '1.15rem', fontWeight: '900', marginBottom: '6px', letterSpacing: '1px', marginLeft: '-13px', color: pallete.foreground }))


  return [
    $column(layoutSheet.spacingBig, style({ width: '100%', margin: '0 auto', alignItems: 'center' }))(

      $row(style({ gap: '45px', alignItems: 'center' }))(

        $card2(style({ padding: 0, position: 'relative' }))(
          $row(layoutSheet.spacing, style({ marginBottom: '-10px', flex: 1, placeContent: 'space-between', position: 'absolute', bottom: '100%', left: '20px', right: 0 }))(
            $row(
              $discoverIdentityDisplay({
                address: config.address,
                $container: $row(
                  style({ minWidth: '120px', })
                ),
                $profileContainer: $defaultBerry(style({ width: '100px', }))
              })
            ),

            $row(layoutSheet.spacingBig, style({ alignItems: 'flex-end', paddingBottom: '32px' }))(
              $metricRow(
                $metricValue(
                  switchMap(puppets => {
                    return $row(style({ flex: 1, padding: '2px 0 4px' }))(
                      ...puppets.map(address => {
                        return $discoverAvatar({ address, $profileContainer: $defaultBerry(style({ minWidth: '30px', maxWidth: '30px' })) })
                      })
                    )
                  }, subscribers)
                ),
                $metricLabel($text('Puppets')),
              ),

              // $seperator2,

              $metricRow(
                $metricValue(
                  $text(map(seed => {
                    return `${seed.winCount} / ${seed.lossCount}`
                  }, summary))
                ),
                $metricLabel($text('Win / Loss')),
              ),

              // $seperator2,

              $metricRow(
                $metricValue(
                  $text(map(seed => {
                    return leverageLabel(seed.avgLeverage)
                  }, summary))
                ),
                $metricLabel($text('Avg Leverage')),
              ),
            ),

          ),
          $ProfilePerformanceCard({
            $container: $column(style({ width: '700px', height: '200px', padding: 0 })),
            processData: config.processData,
            trader: config.address,
            targetShare: config.address,
          })({ }),
        ),

        
      ),

      $node(),

      $card(layoutSheet.spacingBig, style({ flex: 1, width: '100%' }))(
        $column(
          $heading('Open Positions'),
          $Table({
            dataSource: openTrades,
            columns: [
              timeSlotColumn,
              entryColumn,
              {
                $head: $text('Trader'),
                columnOp: style({ minWidth: '120px', flex: 2, alignItems: 'center' }),
                $$body: map((pos) => {
                  return $traderDisplay(config.route, pos, changeRouteTether)
                })
              },
              slotSizeColumn(config.processData, config.address),
              pnlSlotColumn(config.processData),
            ],
          })({}),
        ),

        $seperator2,

        $column(
          $heading('Settled Positions'),
          $Table({
            dataSource: settledTrades,
            columns: [
              settledTimeColumn,
              entryColumn,
              {
                $head: $text('Trader'),
                columnOp: style({ minWidth: '120px', flex: 2, alignItems: 'center' }),
                $$body: map((pos) => {
                  return $traderDisplay(config.route, pos, changeRouteTether)
                })
              },
              settledSizeColumn(config.processData, config.address),
              settledPnlColumn(config.address),
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
      //           // $text(style({ fontSize: '.85rem' }))(readableDate(timestamp)),
      //         )
      //       })
      //     },
      //     {
      //       $head: $column(style({ textAlign: 'right' }))(
      //         $text('Entry'),
      //         $text(style({ fontSize: '.85rem' }))('Price'),
      //       ),
      //       columnOp: O(style({ maxWidth: '100px' }), layoutSheet.spacingTiny),
      //       $$body: map((pos) => {
      //         return $entry(pos)
      //       })
      //     },
      //     {
      //       $head: $column(style({ textAlign: 'right' }))(
      //         $text('Max Size'),
      //         $text(style({ fontSize: '.85rem' }))('Leverage / Liquidation'),
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
      changeRoute
    }
  ]
})


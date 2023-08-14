import { Behavior, combineObject } from "@aelea/core"
import { $node, $text, component, style } from "@aelea/dom"
import * as router from '@aelea/router'
import { $column, $row, layoutSheet, screenUtils } from "@aelea/ui-components"
import { pallete } from "@aelea/ui-components-theme"
import { map } from "@most/core"
import { Stream } from "@most/types"
import * as GMX from 'gmx-middleware-const'
import { $Table } from "gmx-middleware-ui-components"
import { leverageLabel, switchMap, unixTimestampNow } from "gmx-middleware-utils"
import { IPuppetRouteSubscritpion, summariesMirrorTrader } from "puppet-middleware-utils"
import * as viem from 'viem'
import { $profileAvatar, $profileDisplay } from "../$AccountProfile"
import { $heading2, $heading3 } from "../../common/$text"
import { IGmxProcessState } from "../../data/process/process"
import { $card, $card2 } from "../../elements/$common"
import { $seperator2 } from "../../pages/common"
import { entryColumn, pnlSlotColumn, positionTimeColumn, puppetsColumn, settledPnlColumn, settledSizeColumn, slotSizeColumn } from "../table/$TableColumn"
import { $ProfilePerformanceCard } from "../trade/$ProfilePerformanceCard"



export interface ITraderProfile {
  route: router.Route
  address: viem.Address
  processData: Stream<IGmxProcessState>
  activityTimeframe: Stream<GMX.IntervalTime>;}




export const $TraderProfile = (config: ITraderProfile) => component((
  [changeRoute, changeRouteTether]: Behavior<string, string>,
  [subscribeTreader, subscribeTreaderTether]: Behavior<PointerEvent, IPuppetRouteSubscritpion>,

) => {

  const openTrades = map(seed => {
    const newLocal = Object.values(seed.mirrorPositionSlot).filter(pos => pos.trader.toLowerCase() === config.address.toLowerCase())
    return newLocal
  }, config.processData)

  const settledTrades = map(seed => {
    const list = Object.values(seed.mirrorPositionSettled[config.address] || {}).flat().reverse()
    return list
  }, config.processData)




  const $metricRow = $column(style({ placeContent: 'center', alignItems: 'center' }))
  const $metricLabel = $row(style({ color: pallete.foreground, letterSpacing: '1px', fontSize: '.85rem' }))
  const $metricValue = $row(style({ fontWeight: 900, letterSpacing: '1px', fontSize: '1.75rem' }))


  return [
    $column(layoutSheet.spacingBig, style({ width: '100%', margin: '0 auto' }))(

      switchMap(params => {
        const filterStartTime = unixTimestampNow() - params.activityTimeframe

        const traderPos = Object.values(params.processData.mirrorPositionSettled[config.address] || {}).flat().filter(pos => pos.position.blockTimestamp > filterStartTime)
        const openList = Object.values(params.processData.mirrorPositionSlot).filter(pos => pos.trader === config.address).filter(pos => pos.position.blockTimestamp > filterStartTime)
        const allPositions = [...traderPos, ...openList]

        const summary = summariesMirrorTrader(traderPos)
        const subscribedPuppets = params.processData.subscription.filter((sub) => sub.puppet === config.address).map(s => s.trader)

        return $column(
          $row(layoutSheet.spacing, style({ marginBottom: screenUtils.isDesktopScreen ? '-20px' : '-4px', zIndex: 10, placeContent: 'space-between', alignItems: 'center', padding: '0 8px' }))(
            $row(
              $profileDisplay({
                address: config.address,
                labelSize: '30px',
                profileSize: screenUtils.isDesktopScreen ? 130 : 70
              })
            ),
            $row(layoutSheet.spacingBig, style({ alignItems: 'flex-end' }))(
              $metricRow(
                $metricValue(
                  ...subscribedPuppets.map(address => {
                    return $profileAvatar({ address, profileSize: 30 })
                  })
                ),
                $metricLabel($text('Puppets')),
              ),
              $metricRow(
                $heading2(summary.size ? `${summary.winCount} / ${summary.lossCount}` : '-'),
                $metricLabel($text('Win / Loss')),
              ),
              $metricRow(
                $heading2(summary.size ? leverageLabel(summary.avgLeverage) : '-'),
                $metricLabel($text('Avg Leverage')),
              ),
            ),
          ),
        
          $card2(style({ padding: 0, position: 'relative' }))(
          
            $ProfilePerformanceCard({
              $container: $column(style({ width: '100%', height: '200px', padding: 0 })),
              processData: params.processData,
              activityTimeframe: params.activityTimeframe,
              width: 300,
              positionList: allPositions
            // trader: config.address,
            })({ }),
          )
        )
      }, combineObject({ processData: config.processData, activityTimeframe: config.activityTimeframe })),

      $node(),

      $card(layoutSheet.spacingBig, style({ flex: 1, width: '100%' }))(
        $column(
          $heading3('Open Positions'),
          $Table({
            dataSource: openTrades,
            columns: [
              ...screenUtils.isDesktopScreen ? [positionTimeColumn] : [],
              entryColumn,
              puppetsColumn,
              slotSizeColumn(config.processData),
              pnlSlotColumn(config.processData),
            ],
          })({}),
        ),

        $seperator2,

        $column(
          $heading3('Settled Positions'),
          $Table({
            dataSource: settledTrades,
            columns: [
              ...screenUtils.isDesktopScreen ? [positionTimeColumn] : [],
              entryColumn,
              puppetsColumn,
              settledSizeColumn(config.processData),
              settledPnlColumn(),
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
      changeRoute, subscribeTreader
    }
  ]
})



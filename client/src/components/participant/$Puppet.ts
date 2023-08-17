import { Behavior, combineObject } from "@aelea/core"
import { $node, $text, component, style } from "@aelea/dom"
import * as router from '@aelea/router'
import { $column, $row, layoutSheet, screenUtils } from "@aelea/ui-components"
import { pallete } from "@aelea/ui-components-theme"
import { map } from "@most/core"
import { Stream } from "@most/types"
import { $Link, $Table, $arrowRight, $icon, $infoLabel } from "gmx-middleware-ui-components"
import { getMappedValue, groupArrayMany, leverageLabel, switchMap, unixTimestampNow } from "gmx-middleware-utils"
import { ROUTE_DESCRIPTIN_MAP } from "puppet-middleware-const"
import { IPuppetRouteSubscritpion, summariesMirrorTrader } from "puppet-middleware-utils"
import * as viem from 'viem'
import { $profileAvatar, $profileDisplay } from "../$AccountProfile"
import { $TraderDisplay, $pnlValue, $route } from "../../common/$common"
import { $heading2, $heading3 } from "../../common/$text"
import { IGmxProcessState } from "../../data/process/process"
import { $card, $card2 } from "../../elements/$common"
import { $seperator2 } from "../../pages/common"
import { entryColumn, pnlSlotColumn, positionTimeColumn, settledPnlColumn, settledSizeColumn, slotSizeColumn } from "../table/$TableColumn"
import { $ProfilePerformanceCard, $ProfilePerformanceGraph } from "../trade/$ProfilePerformanceCard"
import * as GMX from 'gmx-middleware-const'
import { $metricValue } from "./profileUtils"
import { $LastAtivity } from "../../pages/components/$LastActivity"



export interface ITraderProfile {
  route: router.Route
  address: viem.Address
  processData: Stream<IGmxProcessState>
  activityTimeframe: Stream<GMX.IntervalTime>
  subscriptionList: Stream<IPuppetRouteSubscritpion[]>

}


export const $PuppetProfile = (config: ITraderProfile) => component((
  [changeRoute, changeRouteTether]: Behavior<string, string>,
  [changeActivityTimeframe, changeActivityTimeframeTether]: Behavior<any, GMX.IntervalTime>,
) => {

  const openTrades = map(seed => {
    const list = seed.subscription.find(s => s.trader)?.open.reverse() || []
    return list
  }, config.processData)

  const settledTrades = map(processData => {
    const tradeList = processData.subscription.filter(s => s.puppet === config.address)
      .flatMap(trade => trade.settled)
      .reverse()
    return tradeList
  }, config.processData)




  const $metricRow = $column(style({ placeContent: 'center', alignItems: 'center' }))
  const $metricLabel = $row(style({ color: pallete.foreground, letterSpacing: '1px', fontSize: '.85rem' }))



  return [

    $column(
      $column(style({ gap: '46px', width: '100%', margin: '0 auto' }))(

        $column(layoutSheet.spacing, style({ minHeight: '90px' }))(
          switchMap(params => {
            const filterStartTime = unixTimestampNow() - params.activityTimeframe
            const traderPos = Object.values(params.processData.mirrorPositionSettled[config.address] || {}).flat().filter(pos => pos.position.blockTimestamp > filterStartTime)
            const openList = Object.values(params.processData.mirrorPositionSlot).filter(pos => pos.trader === config.address).filter(pos => pos.position.blockTimestamp > filterStartTime)
            const allPositions = [...traderPos, ...openList]

            const summary = map(list => {
              if (list.length === 0) {
                return null
              }

              return summariesMirrorTrader(list)
            }, settledTrades)
            const subscribedPuppets = params.processData.subscription.filter((sub) => sub.puppet === config.address).map(s => s.trader)



            return $node(style({ display: 'flex', flexDirection: screenUtils.isDesktopScreen ? 'row' : 'column', gap: screenUtils.isDesktopScreen ? '76px' : '26px', zIndex: 10, placeContent: 'center', alignItems: 'center', padding: '0 8px' }))(
              $row(
                $profileDisplay({
                  address: config.address,
                  labelSize: '22px',
                  profileSize: screenUtils.isDesktopScreen ? 90 : 90
                })
              ),
              $row(layoutSheet.spacingBig, style({ alignItems: 'flex-end' }))(
                $metricRow(
                  $metricValue(style({ paddingBottom: '5px' }))(
                    ...subscribedPuppets.map(address => {
                      return $profileAvatar({ address, profileSize: 26 })
                    })
                  ),
                  $metricLabel($text('Puppets'))
                ),
                $metricRow(
                  $heading2(summary.size ? `${summary.winCount} / ${summary.lossCount}` : '-'),
                  $metricLabel($text('Win / Loss'))
                ),
                $metricRow(
                  $heading2(summary.size ? leverageLabel(summary.avgLeverage) : '-'),
                  $metricLabel($text('Avg Leverage'))
                )
              ),
            )
          }, combineObject({ processData: config.processData, activityTimeframe: config.activityTimeframe })),
        ),


        $column(layoutSheet.spacing)(
          $row(style({ placeContent: 'space-between' }))(
            $Link({
              $content: $row(layoutSheet.spacingSmall, style({ alignItems: 'center', cursor: 'pointer' }))(
                $icon({
                  $content: $arrowRight,
                  svgOps: style({ width: '16px', height: '16px', transform: 'rotate(180deg)' }),
                }),
                $text(style({ color: pallete.message }))(`Leaderboard`)
              ),
              url: `/app/leaderboard/settled`,
              route: config.route,
            })({
              click: changeRouteTether()
            }),
            $LastAtivity(config.activityTimeframe)({
              changeActivityTimeframe: changeActivityTimeframeTether()
            })
          ),
     
        
          $card(layoutSheet.spacingBig, style({ flex: 1, width: '100%' }))(
            $card2(style({ padding: 0, height: screenUtils.isDesktopScreen ? '200px' : '200px', position: 'relative', margin: screenUtils.isDesktopScreen ? `-36px -36px 0` : `-12px -12px 0px` }))(
              switchMap(params => {
                const filterStartTime = unixTimestampNow() - params.activityTimeframe
                const traderPos = Object.values(params.processData.mirrorPositionSettled[config.address] || {}).flat().filter(pos => pos.position.blockTimestamp > filterStartTime)
                const openList = Object.values(params.processData.mirrorPositionSlot).filter(pos => pos.trader === config.address).filter(pos => pos.position.blockTimestamp > filterStartTime)
                const allPositions = [...traderPos, ...openList]


                return $ProfilePerformanceCard({
                  $container: $column(style({ width: '100%', padding: 0, height: '200px' })),
                  processData: params.processData,
                  activityTimeframe: params.activityTimeframe,
                  width: 300,
                  positionList: allPositions
                // trader: config.address,
                })({ })
              }, combineObject({ processData: config.processData, activityTimeframe: config.activityTimeframe })),
            ),
            $column(

              $column(
                $heading3('Open Positions'),
                $Table({
                  dataSource: openTrades,
                  columns: [
                    ...screenUtils.isDesktopScreen ? [positionTimeColumn] : [],
                    entryColumn,
                    slotSizeColumn(config.processData),
                    pnlSlotColumn(config.processData),
                  ],
                })({}),
              ),
              $heading3('Settled Positions'),
              $Table({
                dataSource: settledTrades,
                columns: [
                  ...screenUtils.isDesktopScreen ? [positionTimeColumn] : [],
                  entryColumn,
                  settledSizeColumn(config.processData),
                  settledPnlColumn(),
                ],
              })({})
            ),
          )
        )
            
      ),

      // $column(layoutSheet.spacingBig)(

      //   switchMap(params => {

      //     const tradeList = params.processData.subscription.filter(s => s.puppet === config.address)
      //       .flatMap(trade => {
      //         return [...trade.settled, ...trade.open]
      //       }) // .slice(-1)

      //     return $card2(style({ padding: 0, position: 'relative' }))(
      //       $row(layoutSheet.spacing, style({ marginBottom: '-10px', flex: 1, placeContent: 'space-between', position: 'absolute', bottom: '100%', left: '20px', right: 0 }))(
      //         $row(
      //           $profileDisplay({
      //             address: config.address,
      //             $container: $row(
      //               style({ minWidth: '120px', })
      //             ),
      //             profileSize: 100
      //           })
      //         ),

      //         $row(layoutSheet.spacingBig, style({ alignItems: 'flex-end', paddingBottom: '32px' }))(
      //           // $metricRow(
      //           //   $metricValue(
      //           //     switchMap(puppets => {
      //           //       return $row(style({ flex: 1, padding: '2px 0 4px' }))(
      //           //         ...puppets.map(address => {
      //           //           return $discoverAvatar({ address, $profileContainer: $defaultBerry(style({ minWidth: '30px', maxWidth: '30px' })) })
      //           //         })
      //           //       )
      //           //     }, subscribedTraders)
      //           //   ),
      //           //   $metricLabel($text('Traders')),
      //           // ),

      //           // $seperator2,

      //           $metricRow(
      //             $heading2(map(seed => {
      //               if (seed === null) return '-'

      //               return `${seed.winCount} / ${seed.lossCount}`
      //             }, summary)),
      //             $metricLabel($text('Win / Loss')),
      //           ),

      //           // $seperator2,

      //           $metricRow(
      //             $heading2(map(seed => {
      //               if (seed === null) return '-'

      //               return leverageLabel(seed.avgLeverage)
      //             }, summary)),
      //             $metricLabel($text('Avg Leverage')),
      //           ),
      //         ),

      //       ),
      //       $ProfilePerformanceCard({
      //         $container: $column(style({ height: '200px', padding: 0 })),
      //         processData: params.processData,
      //         positionList: tradeList,
      //         width: 300,
      //         targetShare: config.address,
      //         activityTimeframe: params.activityTimeframe,
      //       })({ }),
      //     )
      //   }, combineObject({ processData: config.processData, activityTimeframe: config.activityTimeframe })),

      //   $node(),

      //   $card(layoutSheet.spacingBig, style({ flex: 1, width: '100%' }))(
      //     $heading3('Routes'),

      //     switchMap(params => {

      //       const subscList = params.processData.subscription.filter(s => s.puppet === config.address)
      //       const group = Object.entries(groupArrayMany(subscList, s => s.routeTypeKey))

      //       return $column(layoutSheet.spacingBig, style({ width: '100%' }))(
      //         ...group.map(([key, list]) => {

      //           const route = getMappedValue(ROUTE_DESCRIPTIN_MAP, key)

      //           return $column(layoutSheet.spacing)(
      //             $route(route),

      //             // $RouteDepositInfo({
      //             //   routeDescription: route,
      //             //   wallet: w3p
      //             // })({}),

      //             $row(style({ paddingLeft: '15px' }), layoutSheet.spacing)(
      //               $seperator2,

      //               $column(layoutSheet.spacing, style({ flex: 1 }))(
      //                 ...list.map(sub => {
      //                   const settledList = [...sub.settled, ...sub.open] //.slice(-1)

      //                   if (settledList.length === 0) {
      //                     return $row(layoutSheet.spacing, style({ alignItems: 'center' }))(
      //                       $TraderDisplay({
      //                         route: config.route,
      //                         subscriptionList: config.subscriptionList,
      //                         trader: sub.trader,
      //                       })({}),
      //                       $infoLabel($text('No trades yet'))
      //                     )
      //                   }


      //                   const summary = summariesMirrorTrader(sub.settled, config.address)

      //                   return $row(layoutSheet.spacing, style({ alignItems: 'center' }))(
      //                     $TraderDisplay({
      //                       route: config.route,
      //                       subscriptionList: config.subscriptionList,
      //                       trader: sub.trader,
      //                     })({}),

      //                     $node(style({ flex: 1 }))(),

      //                     $ProfilePerformanceGraph({
      //                       processData: params.processData,
      //                       positionList: settledList,
      //                       width: 250,
      //                       activityTimeframe: params.activityTimeframe
      //                     })({}),

      //                     $pnlValue(summary.pnl)
      //                   )
      //                 })
      //               ),
      //             ),
                

      //           )
      //         })
      //       )
      //     }, combineObject({ processData: config.processData, activityTimeframe: config.activityTimeframe })),

      //   ),

      //   $card(layoutSheet.spacingBig, style({ flex: 1, width: '100%' }))(

      //     $column(
      //       $heading3('Open Positions'),
      //       $Table({
      //         dataSource: openTrades,
      //         columns: [
      //           positionTimeColumn,
      //           entryColumn,
      //           {
      //             $head: $text('Trader'),
      //             columnOp: style({ minWidth: '120px', flex: 2, alignItems: 'center' }),
      //             $$body: map((pos) => {
      //               return $TraderDisplay({
      //                 route: config.route,
      //                 subscriptionList: config.subscriptionList,
      //                 trader: sub.trader,
      //               })({})
      //             })
      //           },
      //           slotSizeColumn(config.processData, config.address),
      //           pnlSlotColumn(config.processData),
      //         ],
      //       })({}),
      //     ),
              
      //     $column(
      //       $heading3('Settled Positions'),
      //       $Table({
      //         dataSource: settledTrades,
      //         columns: [
      //           positionTimeColumn,
      //           entryColumn,
      //           {
      //             $head: $text('Trader'),
      //             columnOp: style({ minWidth: '120px', flex: 2, alignItems: 'center' }),
      //             $$body: map((pos) => {
      //               return $TraderDisplay({
      //                 route: config.route,
      //                 subscriptionList: config.subscriptionList,
      //                 trader: sub.trader,
      //               })({})
      //             })
      //           },
      //           settledSizeColumn(config.processData, config.address),
      //           settledPnlColumn(config.address),
      //         ],
      //       })({})
      //     ),
      //   ),
     
      
      // ),
    ),
    
    {
      changeRoute, changeActivityTimeframe
    }
  ]
})



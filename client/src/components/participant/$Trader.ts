import { Behavior, combineObject } from "@aelea/core"
import { $node, $text, component, style } from "@aelea/dom"
import * as router from '@aelea/router'
import { $column, $row, layoutSheet, screenUtils } from "@aelea/ui-components"
import { pallete } from "@aelea/ui-components-theme"
import { empty, map, now } from "@most/core"
import { Stream } from "@most/types"
import * as GMX from 'gmx-middleware-const'
import { $Link, $Table, $arrowDown, $arrowRight, $icon } from "gmx-middleware-ui-components"
import { leverageLabel, pagingQuery, switchMap, unixTimestampNow } from "gmx-middleware-utils"
import { IPuppetRouteSubscritpion, summariesMirrorTrader } from "puppet-middleware-utils"
import * as viem from 'viem'
import { $profileAvatar, $profileDisplay } from "../$AccountProfile"
import { $heading2, $heading3 } from "../../common/$text"
import { IGmxProcessState } from "../../data/process/process"
import { $card, $card2 } from "../../elements/$common"
import { $seperator2 } from "../../pages/common"
import { entryColumn, pnlSlotColumn, positionTimeColumn, puppetsColumn, settledPnlColumn, settledSizeColumn, slotSizeColumn } from "../table/$TableColumn"
import { $ProfilePerformanceCard } from "../trade/$ProfilePerformanceCard"
import { $LastAtivity } from "../../pages/components/$LastActivity"
import * as storage from "../../utils/storage/storeScope"
import * as store from "../../data/store/store"
import { $metricLabel, $metricRow, $metricValue } from "./profileUtils"



export interface ITraderProfile {
  route: router.Route
  address: viem.Address
  processData: Stream<IGmxProcessState>
  activityTimeframe: Stream<GMX.IntervalTime>;}




export const $TraderProfile = (config: ITraderProfile) => component((
  [changeRoute, changeRouteTether]: Behavior<string, string>,
  [subscribeTreader, subscribeTreaderTether]: Behavior<PointerEvent, IPuppetRouteSubscritpion>,
  [changeActivityTimeframe, changeActivityTimeframeTether]: Behavior<any, GMX.IntervalTime>,
  [changePageIndex, changePageIndexTether]: Behavior<number, number>,

) => {


  
  const summary = map(params => {
    const list = Object.values(params.processData.mirrorPositionSettled[config.address] || {}).flat().reverse()
    const subscribedPuppets = params.processData.subscription.filter((sub) => sub.puppet === config.address).map(s => s.trader)

    return {
      stats: summariesMirrorTrader(list),
      subscribedPuppets
    }
  }, combineObject({ processData: config.processData }))


  const settledTrades = map(params => {
    const filterStartTime = unixTimestampNow() - params.activityTimeframe
    const list = Object.values(params.processData.mirrorPositionSettled[config.address] || {}).flat().filter(pos => pos.position.blockTimestamp > filterStartTime)
    return list
  }, combineObject({ processData: config.processData, activityTimeframe: config.activityTimeframe }))

  const openTrades = map(params => {
    const filterStartTime = unixTimestampNow() - params.activityTimeframe

    const list = Object.values(params.processData.mirrorPositionSlot).filter(pos => pos.trader === config.address).filter(pos => pos.position.blockTimestamp > filterStartTime)
    return list
  }, combineObject({ processData: config.processData, activityTimeframe: config.activityTimeframe }))




  return [

    $column(style({ gap: '46px', width: '100%', margin: '0 auto' }))(
        

      $column(layoutSheet.spacing, style({ minHeight: '90px' }))(
        switchMap(params => {
          const metrics = params.summary.stats

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
                  ...params.summary.subscribedPuppets.map(address => {
                    return $profileAvatar({ address, profileSize: 26 })
                  })
                ),
                $metricLabel($text('Puppets'))
              ),
              $metricRow(
                $heading2(metrics.size ? `${metrics.winCount} / ${metrics.lossCount}` : '-'),
                $metricLabel($text('Win / Loss'))
              ),
              $metricRow(
                $heading2(metrics.size ? leverageLabel(metrics.avgLeverage) : '-'),
                $metricLabel($text('Avg Leverage'))
              )
            ),
          )
        }, combineObject({ summary })),
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
          $column(layoutSheet.spacingBig)(

            switchMap(params => {
              if (params.openTrades.length === 0) {
                return empty()
                // return $column(
                //   $text(style({ color: pallete.foreground }))('No open positions')
                // )
              }

              return $column(layoutSheet.spacingSmall)(
                $heading3('Open Positions'),
                $Table({
                  dataSource: now(params.openTrades),
                  columns: [
                    ...screenUtils.isDesktopScreen ? [positionTimeColumn] : [],
                    entryColumn,
                    puppetsColumn,
                    slotSizeColumn(config.processData),
                    pnlSlotColumn(config.processData),
                  ],
                })({
                  // scrollIndex: changePageIndexTether()
                })
              )
            }, combineObject({ openTrades })),
            
            switchMap(params => {
              return $column(layoutSheet.spacingSmall)(
                $heading3('Settled Positions'),
                $Table({
                  dataSource: map(pageIndex => {
                    return pagingQuery({ offset: pageIndex * 20, pageSize: 20 }, params.settledTrades)
                  }, changePageIndex),
                  columns: [
                    ...screenUtils.isDesktopScreen ? [positionTimeColumn] : [],
                    entryColumn,
                    puppetsColumn,
                    settledSizeColumn(config.processData),
                    settledPnlColumn(),
                  ],
                })({
                  scrollIndex: changePageIndexTether()
                })
              )
            }, combineObject({ settledTrades }))
            
          ),
        )
      )
      
      
    ),
    {
      changeRoute, subscribeTreader, changeActivityTimeframe
    }
  ]
})



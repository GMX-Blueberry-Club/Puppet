import { Behavior, groupByMap } from "@aelea/core"
import { $node, $text, component, style } from "@aelea/dom"
import * as router from '@aelea/router'
import { $column, $row, layoutSheet } from "@aelea/ui-components"
import { pallete } from "@aelea/ui-components-theme"
import { map } from "@most/core"
import { Stream } from "@most/types"
import { $Table, $infoLabel } from "gmx-middleware-ui-components"
import { IRequestAccountTradeListApi, getMappedValue, groupArrayMany, leverageLabel, switchMap } from "gmx-middleware-utils"
import { IPuppetRouteTrades, IPuppetRouteSubscritpion, summariesMirrorTrader } from "puppet-middleware-utils"
import * as viem from 'viem'
import { $discoverAvatar, $discoverIdentityDisplay } from "../$AccountProfile"
import { $defaultBerry } from "../$DisplayBerry"
import { $pnlValue, $route, $tokenIcon, $traderDisplay } from "../../common/$common"
import { IGmxProcessSeed } from "../../data/process/process"
import { $card, $card2 } from "../../elements/$common"
import { $seperator2 } from "../../pages/common"
import { entryColumn, pnlSlotColumn, settledPnlColumn, settledSizeColumn, positionTimeColumn, slotSizeColumn, positionTimeColumn } from "../table/$TableColumn"
import { $ProfilePerformanceCard, $ProfilePerformanceGraph } from "../trade/$ProfilePerformanceCard"
import { $heading1, $heading2 } from "../../common/$text"
import { ROUTE_TYPE_DESCRIPTIN } from "puppet-middleware-const"
import { $RouteDepositInfo } from "../$common"



export interface ITraderProfile {
  route: router.Route
  address: viem.Address
  processData: Stream<IGmxProcessSeed>
}


export const $PuppetProfile = (config: ITraderProfile) => component((
  [changeRoute, changeRouteTether]: Behavior<string, string>,
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

  const summary = map(list => {
    if (list.length === 0) {
      return null
    }

    return summariesMirrorTrader(list)
  }, settledTrades)


  const $itemListRow = $row(layoutSheet.spacingBig, style({ placeContent: 'space-between' }))

  const $metricRow = $column(style({ placeContent: 'center', alignItems: 'center' }))
  const $metricLabel = $row(style({ color: pallete.foreground, letterSpacing: '1px', fontSize: '.85rem' }))
  const $metricValue = $row(style({ fontWeight: 900, letterSpacing: '1px', fontSize: '1.75rem' }))



  return [
    $column(layoutSheet.spacingBig)(

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
            // $metricRow(
            //   $metricValue(
            //     switchMap(puppets => {
            //       return $row(style({ flex: 1, padding: '2px 0 4px' }))(
            //         ...puppets.map(address => {
            //           return $discoverAvatar({ address, $profileContainer: $defaultBerry(style({ minWidth: '30px', maxWidth: '30px' })) })
            //         })
            //       )
            //     }, subscribedTraders)
            //   ),
            //   $metricLabel($text('Traders')),
            // ),

            // $seperator2,

            $metricRow(
              $metricValue(
                $text(map(seed => {
                  if (seed === null) return '-'

                  return `${seed.winCount} / ${seed.lossCount}`
                }, summary))
              ),
              $metricLabel($text('Win / Loss')),
            ),

            // $seperator2,

            $metricRow(
              $metricValue(
                $text(map(seed => {
                  if (seed === null) return '-'

                  return leverageLabel(seed.avgLeverage)
                }, summary))
              ),
              $metricLabel($text('Avg Leverage')),
            ),
          ),

        ),
        $ProfilePerformanceCard({
          $container: $column(style({ height: '200px', padding: 0 })),
          processData: config.processData,
          positionList: map(processData => {
            const tradeList = processData.subscription.filter(s => s.puppet === config.address)
              .flatMap(trade => {
                return [...trade.settled, ...trade.open]
              }) // .slice(-1)

            return tradeList
          }, config.processData),
          targetShare: config.address,
        })({ }),
      ),

      $node(),

      $card(layoutSheet.spacingBig, style({ flex: 1, width: '100%' }))(
        $heading2('Routes'),

        switchMap(processData => {

          const subscList = processData.subscription.filter(s => s.puppet === config.address)
          const group = Object.entries(groupArrayMany(subscList, s => s.routeTypeKey))

          return $column(layoutSheet.spacingBig, style({ width: '100%' }))(
            ...group.map(([key, list]) => {

              const route = getMappedValue(ROUTE_TYPE_DESCRIPTIN, key)

              return $column(layoutSheet.spacing)(
                $route(route),

                // $RouteDepositInfo({
                //   routeDescription: route,
                //   wallet: w3p
                // })({}),

                $row(style({ paddingLeft: '15px' }), layoutSheet.spacing)(
                  $seperator2,

                  $column(layoutSheet.spacing, style({ flex: 1 }))(
                    ...list.map(sub => {
                      const settledList = [...sub.settled, ...sub.open] //.slice(-1)

                      if (settledList.length === 0) return $row(layoutSheet.spacing, style({ alignItems: 'center' }))(
                        $traderDisplay(config.route, sub.trader, changeRouteTether),
                        $infoLabel($text('No trades yet'))
                      )


                      const summary = summariesMirrorTrader(sub.settled, config.address)

                      return $row(layoutSheet.spacing, style({ alignItems: 'center' }))(
                        $traderDisplay(config.route, sub.trader, changeRouteTether),

                        $node(style({ flex: 1 }))(),

                        $ProfilePerformanceGraph({
                          processData,
                          positionList: settledList,
                          width: 250,
                        })({}),

                        $pnlValue(summary.pnl)
                      )
                    })
                  ),
                ),
                

              )
            })
          )
        }, config.processData),

      ),

      $card(layoutSheet.spacingBig, style({ flex: 1, width: '100%' }))(

        $column(
          $heading2('Open Positions'),
          $Table({
            dataSource: openTrades,
            columns: [
              positionTimeColumn,
              entryColumn,
              {
                $head: $text('Trader'),
                columnOp: style({ minWidth: '120px', flex: 2, alignItems: 'center' }),
                $$body: map((pos) => {
                  return $traderDisplay(config.route, pos.trader, changeRouteTether)
                })
              },
              slotSizeColumn(config.processData, config.address),
              pnlSlotColumn(config.processData),
            ],
          })({}),
        ),
              
        $column(
          $heading2('Settled Positions'),
          $Table({
            dataSource: settledTrades,
            columns: [
              positionTimeColumn,
              entryColumn,
              {
                $head: $text('Trader'),
                columnOp: style({ minWidth: '120px', flex: 2, alignItems: 'center' }),
                $$body: map((pos) => {
                  return $traderDisplay(config.route, pos.trader, changeRouteTether)
                })
              },
              settledSizeColumn(config.processData, config.address),
              settledPnlColumn(config.address),
            ],
          })({})
        ),
      ),


      
      
      
    ),
    {
      changeRoute
    }
  ]
})



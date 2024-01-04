import { Behavior, combineObject, replayLatest } from "@aelea/core"
import { $node, $text, MOTION_NO_WOBBLE, component, motion, style } from "@aelea/dom"
import * as router from '@aelea/router'
import { $NumberTicker, $column, $row, layoutSheet, screenUtils } from "@aelea/ui-components"
import { colorAlpha, pallete } from "@aelea/ui-components-theme"
import { awaitPromises, empty, map, multicast, now, skipRepeatsWith, startWith } from "@most/core"
import { Stream } from "@most/types"
import * as GMX from 'gmx-middleware-const'
import { $Baseline, $Link, $Table, $arrowRight, $icon, $infoTooltipLabel, IMarker, ScrollRequest } from "gmx-middleware-ui-components"
import { IPriceTickListMap, filterNull, getMappedValue, pagingQuery, parseReadableNumber, readableFixedUSD30, readableUnitAmount, switchMap } from "gmx-middleware-utils"
import { BaselineData, MouseEventParams, Time } from "lightweight-charts"
import { getTraderPositionSettled, queryTraderPositionOpen } from "puppet-middleware-utils"
import * as viem from 'viem'
import { $heading3 } from "../../common/$text.js"
import { $card, $card2 } from "../../common/elements/$common.js"
import { subgraphClient } from "../../data/subgraph/client"
import { $LastAtivity, LAST_ACTIVITY_LABEL_MAP } from "../../pages/components/$LastActivity.js"
import { IChangeSubscription } from "../portfolio/$RouteSubscriptionEditor"
import { entryColumn, pnlSlotColumn, positionTimeColumn, puppetsColumn, settledPnlColumn, settledSizeColumn, slotSizeColumn } from "../table/$TableColumn.js"
import { performanceTimeline } from "../trade/$ProfilePerformanceGraph.js"
import { $TraderProfileSummary } from "./$Summary"



export interface ITraderProfile {
  route: router.Route
  address: viem.Address
  activityTimeframe: Stream<GMX.IntervalTime>
  priceTickMap: Stream<IPriceTickListMap>
}




export const $TraderPortfolio = (config: ITraderProfile) => component((
  [changeRoute, changeRouteTether]: Behavior<any, string>,
  [modifySubscriber, modifySubscriberTether]: Behavior<IChangeSubscription>,
  [changeActivityTimeframe, changeActivityTimeframeTether]: Behavior<any, GMX.IntervalTime>,
  [scrollRequest, scrollRequestTether]: Behavior<ScrollRequest>,
  [crosshairMove, crosshairMoveTether]: Behavior<MouseEventParams>

) => {

  const settledTradeList = awaitPromises(map(async params => {
    const positionList = await getTraderPositionSettled(subgraphClient, { trader: config.address, blockTimestamp_gte: params.activityTimeframe })
    return positionList
  }, combineObject({ activityTimeframe: config.activityTimeframe })))

  const openTrades = awaitPromises(map(async params => {
    const positionList = await queryTraderPositionOpen(subgraphClient, { trader: config.address })
    return positionList
  }, combineObject({ activityTimeframe: config.activityTimeframe })))



  return [
    $column(layoutSheet.spacingBig)(
      $card(layoutSheet.spacingBig, style({ flex: 1, width: '100%' }))(
        $card2(style({ padding: 0, height: screenUtils.isDesktopScreen ? '200px' : '200px', position: 'relative', margin: screenUtils.isDesktopScreen ? `-36px -36px 0` : `-12px -12px 0px` }))(
          switchMap(params => {
            const allPositions = [...params.settledTradeList, ...params.openTrades]

            const $container = $column(style({ width: '100%', padding: 0, height: '200px' }))
            const timeline = performanceTimeline({ positionList: allPositions, pricefeedMap: params.priceTickMap, tickCount: 100, activityTimeframe: params.activityTimeframe })
            const pnlCrossHairTimeChange = replayLatest(multicast(startWith(null, skipRepeatsWith(((xsx, xsy) => xsx.time === xsy.time), crosshairMove))))


            const hoverChartPnl = filterNull(map(params => {
              if (params.pnlCrossHairTimeChange?.point) {
                const value = params.pnlCrossHairTimeChange.seriesData.values().next().value.value
                return value
              }

              const data = timeline
              const value = data[data.length - 1]?.value
              return value || null
            }, combineObject({ pnlCrossHairTimeChange })))



            const markerList = allPositions.map((pos): IMarker => {
              const isSettled = 'settlement' in pos
              const position = pos.position.realisedPnlUsd > 0n ? 'aboveBar' as const : 'belowBar' as const
              const time = Number(pos.blockTimestamp) as Time

              return {
                position, time,
                text: readableFixedUSD30(pos.position.realisedPnlUsd),
                color: colorAlpha(pallete.message, .25),
                size: 0.1,
                shape: !isSettled ? 'arrowUp' as const : 'circle' as const,
              }
            }).sort((a, b) => Number(a.time) - Number(b.time))


            return allPositions.length > 0 ? $container(
              $row(style({ position: 'absolute', placeContent: 'center',  top: '10px', alignSelf: 'center', zIndex: 11, alignItems: 'center', placeSelf: 'center' }))(
                $column(style({ alignItems: 'center' }))(
                  $NumberTicker({
                    textStyle: {
                      fontSize: '1.85rem',
                      fontWeight: '900',
                    },
                    // background: `radial-gradient(${colorAlpha(invertColor(pallete.message), .7)} 9%, transparent 63%)`,
                    value$: map(hoverValue => {
                      const newLocal2 = readableUnitAmount(hoverValue)
                      const newLocal = parseReadableNumber(newLocal2)
                      return newLocal
                    }, motion({ ...MOTION_NO_WOBBLE, precision: 15, stiffness: 210 }, 0, hoverChartPnl)),
                    incrementColor: pallete.positive,
                    decrementColor: pallete.negative
                  }),
                  $infoTooltipLabel('The total combined settled and open trades', $text(style({ fontSize: '.85rem' }))('PnL'))
                ),
              ),
              $Baseline({
                markers: now(markerList),
                chartConfig: {
                  leftPriceScale: {
                    autoScale: true,
                    ticksVisible: true,
                    scaleMargins: {
                      top: 0.35,
                      bottom: 0,
                    }
                  },
                },
                baselineOptions: {
                  baseLineColor: pallete.message,
                  baseLineVisible: true,
                  lineWidth: 2,
                  baseValue: {
                    price: 0,
                    type: 'price',
                  },
                },
                // appendData: scan((prev, next) => {
                //   const marketPrice = formatFixed(next.indexTokenPrice, 30)
                //   const timeNow = unixTimestampNow()
                //   const prevTimeSlot = Math.floor(prev.time as number / tf)
                //   const nextTimeSlot = Math.floor(timeNow / tf)
                //   const time = nextTimeSlot * tf as Time
                //   const isNext = nextTimeSlot > prevTimeSlot

                //   return {
                //     value: marketPrice,
                //     time
                //   }
                // }, data[data.length - 1], config.processData),
                data: timeline as any as BaselineData[],
              })({
                crosshairMove: crosshairMoveTether(
                  skipRepeatsWith((a, b) => a.point?.x === b.point?.x)
                )
              })
            ) : $container(style({ placeContent: 'center', alignItems: 'center' }))(
              $node(
                $text(style({ 
                  color: pallete.foreground, textAlign: 'center',
                }))('No activity within last '),
                $text(getMappedValue(LAST_ACTIVITY_LABEL_MAP, params.activityTimeframe) )
              )
            )

            // return $ProfilePerformanceCard({
            //   account: config.address,
            //   $container: $column(style({ width: '100%', padding: 0, height: '200px' })),
            //   pricefeed: params.pricefeed,
            //   tickCount: 100,
            //   activityTimeframe: params.activityTimeframe,
            //   positionList: allPositions,
            //   // trader: config.address,
            // })({ })
          }, combineObject({ settledTradeList, openTrades, activityTimeframe: config.activityTimeframe, priceTickMap: config.priceTickMap })),
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
                  puppetsColumn(changeRouteTether),
                  slotSizeColumn(),
                  pnlSlotColumn(),
                ],
              })({
                // scrollIndex: changePageIndexTether()
              })
            )
          }, combineObject({ openTrades })),
            
          switchMap(params => {
            const paging = startWith({ offset: 0, pageSize: 20 }, scrollRequest)
            const dataSource = map(req => {
              return pagingQuery(req, params.settledTradeList)
            }, paging)

            return $column(layoutSheet.spacingSmall)(
              $heading3('Settled Positions'),
              $Table({
                dataSource,
                columns: [
                  ...screenUtils.isDesktopScreen ? [positionTimeColumn] : [],
                  entryColumn,
                  puppetsColumn(changeRouteTether),
                  settledSizeColumn(),
                  settledPnlColumn(),
                ],
              })({
                scrollRequest: scrollRequestTether()
              })
            )
          }, combineObject({ settledTradeList }))
            
        ),
      ),
      
      
    ),
    {
      changeRoute, modifySubscriber, changeActivityTimeframe
    }
  ]
})

export const $TraderProfile = (config: ITraderProfile) => component((
  [changeRoute, changeRouteTether]: Behavior<any, string>,
  [modifySubscriber, modifySubscriberTether]: Behavior<IChangeSubscription>,
  [changeActivityTimeframe, changeActivityTimeframeTether]: Behavior<any, GMX.IntervalTime>,
  [scrollRequest, scrollRequestTether]: Behavior<ScrollRequest>,

) => {


  const settledTradeList = awaitPromises(map(async params => {
    const positionList = await getTraderPositionSettled(subgraphClient, { trader: config.address, blockTimestamp_gte: params.activityTimeframe })
    return positionList
  }, combineObject({ activityTimeframe: config.activityTimeframe })))


  return [
    $column(layoutSheet.spacingBig)(
      $TraderProfileSummary({
        address: config.address, settledTradeList,
        route: config.route,
      })({}),

      $column(layoutSheet.spacingTiny)(
        $row(style({ placeContent: 'space-between', alignItems: 'center' }))(
          $Link({
            $content: $row(layoutSheet.spacingSmall, style({ alignItems: 'center', cursor: 'pointer' }))(
              $icon({
                $content: $arrowRight,
                svgOps: style({ width: '16px', height: '16px', transform: 'rotate(180deg)' }),
              }),
              $text(style({ color: pallete.message }))(`Leaderboard`)
            ),
            url: `/app/leaderboard`,
            route: config.route,
          })({
            click: changeRouteTether()
          }),
          $LastAtivity(config.activityTimeframe)({
            changeActivityTimeframe: changeActivityTimeframeTether()
          })
        ),
        $TraderPortfolio({ ...config })({
          modifySubscriber: modifySubscriberTether(),
          changeRoute: changeRouteTether(),
          changeActivityTimeframe: changeActivityTimeframeTether(),
        })
      ),
    ),
    {
      changeRoute, modifySubscriber, changeActivityTimeframe
    }
  ]
})



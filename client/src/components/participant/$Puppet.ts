import { Behavior, combineObject, replayLatest } from "@aelea/core"
import { $node, $text, MOTION_NO_WOBBLE, component, motion, style } from "@aelea/dom"
import * as router from '@aelea/router'
import { $NumberTicker, $column, $row, layoutSheet, screenUtils } from "@aelea/ui-components"
import { colorAlpha, pallete } from "@aelea/ui-components-theme"
import { awaitPromises, map, multicast, now, skipRepeatsWith, startWith } from "@most/core"
import { Stream } from "@most/types"
import * as GMX from 'gmx-middleware-const'
import { $Baseline, $Link, $arrowRight, $icon, $infoTooltipLabel, IMarker } from "gmx-middleware-ui-components"
import { IPriceTickListMap, filterNull, getMappedValue, groupArrayMany, parseReadableNumber, readableFixedUSD30, readableUnitAmount, switchMap, zipState } from "gmx-middleware-utils"
import { BaselineData, MouseEventParams, Time } from "lightweight-charts"
import { IPuppetTradeRoute, ISetRouteType, accountSettledPositionListSummary, openPositionListPnl, queryPuppetTradeRoute } from "puppet-middleware-utils"
import * as viem from "viem"
import { $TraderDisplay, $TraderRouteDisplay, $pnlValue, $route } from "../../common/$common.js"
import { $heading3 } from "../../common/$text.js"
import { $card, $card2 } from "../../common/elements/$common.js"
import { $seperator2 } from "../../pages/common.js"
import { $LastAtivity, LAST_ACTIVITY_LABEL_MAP } from "../../pages/components/$LastActivity.js"
import { IChangeSubscription } from "../portfolio/$RouteSubscriptionEditor"
import { $ProfilePerformanceGraph, getPerformanceTimeline } from "../trade/$ProfilePerformanceGraph.js"
import { $PuppetProfileSummary } from "./$Summary"


export interface ITraderProfile {
  route: router.Route
  address: viem.Address
  activityTimeframe: Stream<GMX.IntervalTime>
  priceTickMap: Stream<IPriceTickListMap>
  routeTypeList: Stream<ISetRouteType[]>
}

export interface IPuppetPortfolio extends ITraderProfile {
  puppetTradeRouteList: Stream<IPuppetTradeRoute[]>
}

export const $PuppetPortfolio = (config: IPuppetPortfolio) => component((
  [changeRoute, changeRouteTether]: Behavior<string, string>,
  [changeActivityTimeframe, changeActivityTimeframeTether]: Behavior<any, GMX.IntervalTime>,
  [modifySubscriber, modifySubscriberTether]: Behavior<IChangeSubscription>,
  [crosshairMove, crosshairMoveTether]: Behavior<MouseEventParams>

) => {
  
  const { activityTimeframe, address, priceTickMap, puppetTradeRouteList, route, routeTypeList } = config

  return [

    $column(layoutSheet.spacingBig)(
      $card(layoutSheet.spacingBig, style({ flex: 1, width: '100%' }))(
        $card2(style({ padding: 0, height: screenUtils.isDesktopScreen ? '200px' : '200px', position: 'relative', margin: screenUtils.isDesktopScreen ? `-36px -36px 0` : `-12px -12px 0px` }))(
          switchMap(params => {
            const settledPositionList = params.puppetTradeRouteList.flatMap(x => x.settledList).map(x => x.position)
            const openPositionList = params.puppetTradeRouteList.flatMap(x => x.openList).map(x => x.position)
            const allPositions = [...settledPositionList, ...openPositionList]
            const $container = $column(style({ width: '100%', padding: 0, height: '200px' }))
            const timeline = getPerformanceTimeline({ 
              puppet: config.address,
              openPositionList, settledPositionList,
              priceTickMap: params.priceTickMap, tickCount: 100, activityTimeframe: params.activityTimeframe
            })
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
          }, zipState({ puppetTradeRouteList, activityTimeframe, priceTickMap })),
        ),

        $column(layoutSheet.spacing)(
          $heading3('Trade Routes'),
          switchMap(params => {

            if (params.puppetTradeRouteList.length === 0) {
              return $text('No active trade routes')
            }


            const tradeRouteList = Object.entries(groupArrayMany(params.puppetTradeRouteList, x => x.routeTypeKey)) as [viem.Address, IPuppetTradeRoute[]][]

            return $column(layoutSheet.spacingBig, style({ width: '100%' }))(
              ...tradeRouteList.map(([routeTypeKey, traderPuppetTradeRouteList]) => {
                const routeType = params.routeTypeList.find(route => route.routeTypeKey === routeTypeKey)!

                return $column(layoutSheet.spacing)(
                  $route(routeType),

                  $column(style({ paddingLeft: '16px' }))(
                    $row(layoutSheet.spacing)(
                      $seperator2,

                      $column(layoutSheet.spacing, style({ flex: 1 }))( 
                        ...traderPuppetTradeRouteList.map(puppetTradeRoute => {
                            
                          const settledPositionList = puppetTradeRoute.settledList.map(x => x.position)
                          const openPositionList = puppetTradeRoute.openList.map(x => x.position)
   

                          const summary = accountSettledPositionListSummary([...settledPositionList, ...openPositionList], puppetTradeRoute.puppet)
                          const pnl = map(openPnl => summary.pnl + openPnl, openPositionListPnl(openPositionList, puppetTradeRoute.puppet))

                          return $row(layoutSheet.spacing, style({ alignItems: 'center', padding: '10px 0' }))(
                            $TraderDisplay({
                              route: config.route,
                              trader: puppetTradeRoute.trader,
                            })({
                              clickTrader: changeRouteTether(),
                              modifySubscribeList: modifySubscriberTether(),
                            }),
                            $TraderRouteDisplay({
                              positionParams: routeType,
                              trader: puppetTradeRoute.trader,
                              routeTypeKey: routeTypeKey,
                              tradeRoute: puppetTradeRoute.tradeRoute,
                              summary,
                              // subscriptionList: config.subscriptionList,
                            })({
                              modifySubscribeList: modifySubscriberTether()
                            }),


                            $ProfilePerformanceGraph({
                              puppet: config.address,
                              $container: $column(style({ width: '100%', padding: 0, height: '75px', position: 'relative', margin: '-16px 0' })),
                              priceTickMap: params.priceTickMap,
                              openPositionList,
                              settledPositionList,
                              tickCount: 100,
                              activityTimeframe: params.activityTimeframe
                            })({}),

                            $pnlValue(pnl)
                          )
                        })
                      ),
                    ),
                    $seperator2,
                  ),
                )
              })
            )
          }, combineObject({ puppetTradeRouteList, priceTickMap, activityTimeframe, routeTypeList })),
        ),
      ),
    ),
    
    {
      changeRoute, changeActivityTimeframe, modifySubscriber
    }
  ]
})


export const $PuppetProfile = (config: ITraderProfile) => component((
  [changeRoute, changeRouteTether]: Behavior<string, string>,
  [changeActivityTimeframe, changeActivityTimeframeTether]: Behavior<any, GMX.IntervalTime>,
  [modifySubscriber, modifySubscriberTether]: Behavior<IChangeSubscription>,
) => {

  const { activityTimeframe, address, priceTickMap, route, routeTypeList } = config

  const puppetTradeRouteList = awaitPromises(map(params => {
    return queryPuppetTradeRoute({ puppet: config.address, activityTimeframe: params.activityTimeframe })
  }, combineObject({ activityTimeframe })))

  const settledPositionList = map(trList => {
    const tradeList = trList.flatMap(p => p.settledList.map(x => x.position))
    return tradeList
  }, puppetTradeRouteList)

  const openPositionList = map(trList => {
    const tradeList = trList.flatMap(p => p.openList.map(x => x.position))
    return tradeList
  }, puppetTradeRouteList)


  return [

    $column(layoutSheet.spacingBig)(
      $PuppetProfileSummary({
        settledPositionList,
        openPositionList,
        address: config.address,
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
            route: config.route.create({ fragment: 'baseRoute' }),
          })({
            click: changeRouteTether()
          }),
          $LastAtivity(config.activityTimeframe)({
            changeActivityTimeframe: changeActivityTimeframeTether()
          })
        ),
        $PuppetPortfolio({
          ...config,
          puppetTradeRouteList,
        })({
          changeRoute: changeRouteTether(),
          changeActivityTimeframe: changeActivityTimeframeTether(),
          modifySubscriber: modifySubscriberTether()
        }),
      ),
   
    ),
    
    {
      changeRoute, changeActivityTimeframe, modifySubscriber
    }
  ]
})


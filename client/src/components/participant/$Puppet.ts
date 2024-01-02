import { Behavior, combineObject, replayLatest } from "@aelea/core"
import { $node, $text, MOTION_NO_WOBBLE, component, motion, style } from "@aelea/dom"
import * as router from '@aelea/router'
import { $NumberTicker, $column, $row, layoutSheet, screenUtils } from "@aelea/ui-components"
import { colorAlpha, pallete } from "@aelea/ui-components-theme"
import { awaitPromises, map, multicast, now, skipRepeatsWith, startWith } from "@most/core"
import { Stream } from "@most/types"
import * as GMX from 'gmx-middleware-const'
import { $Baseline, $Link, $arrowRight, $icon, $infoTooltipLabel, IMarker, ScrollRequest } from "gmx-middleware-ui-components"
import { IPriceTickListMap, filterNull, getMappedValue, groupArrayMany, parseReadableNumber, readableFixedUSD30, readableUnitAmount, switchMap } from "gmx-middleware-utils"
import { BaselineData, MouseEventParams, Time } from "lightweight-charts"
import { IMirrorPositionOpen, IMirrorPositionSettled, IPuppetSubscritpion, IPuppetTradeRoute, accountSettledPositionListSummary, queryPuppetTradeRoute } from "puppet-middleware-utils"
import * as viem from "viem"
import { $TraderDisplay, $TraderRouteDisplay, $pnlValue, $route } from "../../common/$common.js"
import { $heading3 } from "../../common/$text.js"
import { $card, $card2 } from "../../common/elements/$common.js"
import { subgraphClient } from "../../data/subgraph/client"
import { $seperator2 } from "../../pages/common.js"
import { $LastAtivity, LAST_ACTIVITY_LABEL_MAP } from "../../pages/components/$LastActivity.js"
import { $ProfilePerformanceGraph, performanceTimeline } from "../trade/$ProfilePerformanceGraph.js"
import { $PuppetProfileSummary } from "./$Summary"


export interface ITraderProfile {
  route: router.Route
  address: viem.Address
  activityTimeframe: Stream<GMX.IntervalTime>
  // subscriptionList: Stream<IPuppetSubscritpion[]>
  priceTickMap: Stream<IPriceTickListMap>
}

export interface ITraderPortfolio extends ITraderProfile {
  puppetTradeRouteList: Stream<IPuppetTradeRoute[]>
  settledTradeList: Stream<IMirrorPositionSettled[]>
  openTradeList: Stream<IMirrorPositionOpen[]>
}


export const $PuppetPortfolio = (config: ITraderPortfolio) => component((
  [changeRoute, changeRouteTether]: Behavior<string, string>,
  [changeActivityTimeframe, changeActivityTimeframeTether]: Behavior<any, GMX.IntervalTime>,
  [scrollRequest, scrollRequestTether]: Behavior<ScrollRequest>,
  [modifySubscriber, modifySubscriberTether]: Behavior<IPuppetSubscritpion>,
  [crosshairMove, crosshairMoveTether]: Behavior<MouseEventParams>

) => {
  

  return [

    $column(layoutSheet.spacingBig)(
      $card(layoutSheet.spacingBig, style({ flex: 1, width: '100%' }))(
        $card2(style({ padding: 0, height: screenUtils.isDesktopScreen ? '200px' : '200px', position: 'relative', margin: screenUtils.isDesktopScreen ? `-36px -36px 0` : `-12px -12px 0px` }))(
          switchMap(params => {
            const allPositions = [...params.settledTradeList, ...params.openTradeList]
            const $container = $column(style({ width: '100%', padding: 0, height: '200px' }))
            const timeline = performanceTimeline({ puppet: config.address, positionList: allPositions, pricefeedMap: params.priceTickMap, tickCount: 100, activityTimeframe: params.activityTimeframe })
            const pnlCrossHairTimeChange = replayLatest(multicast(startWith(null, skipRepeatsWith(((xsx, xsy) => xsx.time === xsy.time), crosshairMove))))


            // console.log(params)
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
            //   activityTimeframe: params.activityTimeframe,
            //   tickCount: 100,
            //   positionList: allPositions,
            //   // trader: config.address,
            // })({ })
          }, combineObject({ 
            tradeRouteList: config.puppetTradeRouteList,
            activityTimeframe: config.activityTimeframe,
            openTradeList: config.openTradeList,
            settledTradeList: config.settledTradeList,
            priceTickMap: config.priceTickMap
          })),
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
                const fstPosition = traderPuppetTradeRouteList[0].puppetPositionSettledList[0].position.position

                return $column(layoutSheet.spacing)(
                  $route(fstPosition),

                  // $RouteDepositInfo({
                  //   routeDescription: route,
                  //   wallet: w3p
                  // })({}),

                  $column(style({ paddingLeft: '16px' }))(
                    $row(layoutSheet.spacing)(
                      $seperator2,

                      $column(layoutSheet.spacing, style({ flex: 1 }))( 
                        ...traderPuppetTradeRouteList.map(puppetTradeRoute => {

                            
                          // if (params.settledTrades.length === 0) {
                          //   return $row(layoutSheet.spacing, style({ alignItems: 'center', padding: '10px 0' }))(
                          //     $Link({
                          //       $content: $profileDisplay({
                          //         address: sub.trader,
                          //       }),
                          //       route: config.route.create({ fragment: 'baseRoute' }),
                          //       url: `/app/profile/${sub.trader}/${IProfileActiveTab.TRADER.toLowerCase()}`
                          //     })({ click: changeRouteTether() }),
                          //     $infoLabel($text('No trades yet')),

                          //     $infoLabeledValue('Expiration', readableDate(Number(sub.subscriptionExpiry)), true),
                          //     $infoLabeledValue('Allow', $text(`${readablePercentage(sub.allowance)}`), true),
                          //   )
                          // }

                          const traderTradeList = [
                            ...puppetTradeRoute.puppetPositionSettledList.map(x => x.position),
                            ...puppetTradeRoute.puppetPositionOpenList.map(x => x.position)
                          ]

                          const summary = accountSettledPositionListSummary(traderTradeList, puppetTradeRoute.puppet)

                          return $row(layoutSheet.spacing, style({ alignItems: 'center', padding: '10px 0' }))(
                            $TraderDisplay({
                              route: config.route,
                              trader: puppetTradeRoute.trader,
                            })({
                              clickTrader: changeRouteTether(),
                              modifySubscribeList: modifySubscriberTether(),
                            }),
                            $TraderRouteDisplay({
                              positionParams: fstPosition,
                              trader: puppetTradeRoute.trader,
                              routeTypeKey: "0xa437f95c9cee26945f76bc090c3491ffa4e8feb32fd9f4fefbe32c06a7184ff3",
                              // subscriptionList: config.subscriptionList,
                            })({
                              modifySubscribeList: modifySubscriberTether()
                            }),


                            $ProfilePerformanceGraph({
                              puppet: config.address,
                              $container: $column(style({ width: '100%', padding: 0, height: '75px', position: 'relative', margin: '-16px 0' })),
                              pricefeedMap: params.priceTickMap,
                              positionList: traderTradeList,
                              tickCount: 100,
                              activityTimeframe: params.activityTimeframe
                            })({}),

                            $pnlValue(summary.realisedPnl)
                          )
                        })
                      ),
                    ),
                    $seperator2,
                  ),
                )
              })
            )
          }, combineObject({ puppetTradeRouteList: config.puppetTradeRouteList, priceTickMap: config.priceTickMap, activityTimeframe: config.activityTimeframe })),
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
  [modifySubscriber, modifySubscriberTether]: Behavior<IPuppetSubscritpion>,
) => {

  const puppetTradeRouteList = awaitPromises(map(activityTimeframe => {
    return queryPuppetTradeRoute(subgraphClient, { puppet: config.address })
  }, config.activityTimeframe))

  const settledTradeList = map(trList => {
    const tradeList = trList.flatMap(p => p.puppetPositionSettledList.map(x => x.position))
    return tradeList
  }, puppetTradeRouteList)

  const openTradeList = map(trList => {
    const tradeList = trList.flatMap(p => p.puppetPositionOpenList.map(x => x.position))
    return tradeList
  }, puppetTradeRouteList)


  return [

    $column(layoutSheet.spacingBig)(
      $PuppetProfileSummary({
        settledTradeList,
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
          openTradeList, puppetTradeRouteList, settledTradeList, priceTickMap: config.priceTickMap,
          activityTimeframe: config.activityTimeframe,
          address: config.address,
          route: config.route,
          subscriptionList: config.subscriptionList,
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


import { Behavior, combineObject } from "@aelea/core"
import { $element, $node, $text, MOTION_NO_WOBBLE, component, motion, style } from "@aelea/dom"
import { $NumberTicker, $column, $row, layoutSheet } from "@aelea/ui-components"
import { colorAlpha, pallete } from "@aelea/ui-components-theme"
import { awaitPromises, empty, map, multicast, now, skipRepeatsWith, snapshot, startWith, switchLatest } from "@most/core"
import { IntervalTime, filterNull, parseReadableNumber, readableUnitAmount, unixTimestampNow } from "common-utils"
import { BaselineData, MouseEventParams, Time } from "lightweight-charts"
import { ISetRouteType } from "puppet-middleware-utils"
import { $Baseline, $IntermediatePromise, $infoTooltipLabel, IMarker } from "ui-components"
import * as viem from "viem"
import { $LastAtivity } from "../$LastActivity.js"
import { $labelDisplay } from "../../common/$TextField.js"
import { $route } from "../../common/$common.js"
import { IPositionActivityParams, IUserActivityParams, IUserPositionPageParams } from "../../pages/type.js"
import { $DropMultiSelect } from "../form/$Dropdown.js"
import { getPerformanceTimeline } from "../trade/$ProfilePerformanceGraph.js"

export const $ProfilePeformanceTimeline = (config: IPositionActivityParams & IUserActivityParams & { puppet?: viem.Address }) => component((
  [crosshairMove, crosshairMoveTether]: Behavior<MouseEventParams>,
  [selectTradeRouteList, selectTradeRouteListTether]: Behavior<ISetRouteType[]>,
  [changeActivityTimeframe, changeActivityTimeframeTether]: Behavior<any, IntervalTime>,
) => {

  const { activityTimeframe, selectedTradeRouteList, puppet, priceTickMapQuery, routeTypeListQuery, settledPositionListQuery, openPositionListQuery } = config

  const positionParams = multicast(snapshot(async (params, sampleParams) => {
    const settledPositionList = await sampleParams.settledPositionListQuery
    const openPositionList = await params.openPositionListQuery

    const timeline = getPerformanceTimeline({ 
      ...params,
      puppet, settledPositionList, openPositionList,
      tickCount: 100,
      activityTimeframe: params.activityTimeframe,
      priceTickMap: await params.priceTickMapQuery
    })

    return { timeline, openPositionList, settledPositionList }
  }, combineObject({ activityTimeframe, routeTypeListQuery, priceTickMapQuery, openPositionListQuery }), combineObject({ settledPositionListQuery })))


  return [
    $column(style({ width: '100%', padding: 0, height: '200px', placeContent: 'center' }))(
      $row(style({ position: 'absolute', top: '10px', left: '16px', right: '16px', alignSelf: 'center', zIndex: 11, alignItems: 'flex-start' }))(
        $row(style({ flex: 1 }))(
          $DropMultiSelect({
            // $container: $row(layoutSheet.spacingTiny, style({ display: 'flex', position: 'relative' })),
            $input: $element('input')(style({ width: '100px' })),
            $label: $labelDisplay(style({ color: pallete.foreground }))('Routes'),
            placeholder: 'All / Select',
            getId: item => item.routeTypeKey,
            $$chip: map(rt => $route(rt, false)),
            selector: {
              list: awaitPromises(routeTypeListQuery),
              $$option: map(rt => {
                return style({
                  padding: '8px'
                }, $route(rt))
              })
            },
            value: selectedTradeRouteList
          })({
            select: selectTradeRouteListTether()
          }),
        ),
        switchLatest(awaitPromises(map(async paramsQuery => {
          const params = await paramsQuery
          const positionCount = params.settledPositionList.length + params.openPositionList.length

          if (positionCount === 0) {
            return empty()
          }

          const pnlCrossHairTimeChange = startWith(null, skipRepeatsWith(((xsx, xsy) => xsx.time === xsy.time), crosshairMove))
          const hoverChartPnl = filterNull(map(cross => {
            if (cross?.point) {
              const value = cross.seriesData.values().next().value?.value || 0
              return value
            }

            const data = params.timeline
            const value = data[data.length - 1]?.value
            return value || null
          }, pnlCrossHairTimeChange))

          return $column(style({ flex: 1, alignItems: 'center', }))(
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
          )
        }, positionParams))),
        $row(style({ flex: 1 }))(
          $node(style({ flex: 1 }))(),
          $LastAtivity(config.activityTimeframe)({
            changeActivityTimeframe: changeActivityTimeframeTether()
          }),
        ),
      ),
      $IntermediatePromise({
        query: positionParams,
        $$done: map(params => {
          const positionCount = params.settledPositionList.length + params.openPositionList.length

          if (positionCount === 0) {
            return $row(layoutSheet.spacingTiny, style({ textAlign: 'center', placeSelf: 'center', }))(
              $text(style({ color: pallete.foreground }))('No activity found')
            )
          }

          const openMarkerList = params.openPositionList.map((pos): IMarker => {
            const pnl = params.timeline[params.timeline.length - 1].value
            return {
              position: 'inBar',
              color: pnl < 0n ? pallete.negative : pallete.positive,
              time: unixTimestampNow() as Time,
              size: 1.5,
              shape: 'circle'
            }
          })
          const settledMarkerList = params.settledPositionList.flatMap(pos => pos.position.link.decreaseList).map((pos): IMarker => {
            return {
              position: 'inBar',
              color: colorAlpha(pallete.message, .5),
              time: Number(pos.blockTimestamp) as Time,
              size: 0.1,
              shape: 'circle'
            }
          })

          const allMarkerList = [...settledMarkerList, ...openMarkerList].sort((a, b) => Number(a.time) - Number(b.time))

          return $Baseline({
            markers: now(allMarkerList),
            chartConfig: {
              leftPriceScale: {
                autoScale: true,
                ticksVisible: true,
                scaleMargins: {
                  top: 0.4,
                  bottom: 0,
                }
              },
              // timeScale: {}
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
            data: params.timeline as any as BaselineData[],
          })({
            crosshairMove: crosshairMoveTether(
              skipRepeatsWith((a, b) => a.point?.x === b.point?.x)
            )
          })
        })
      })({}),
    ),

    { selectTradeRouteList, changeActivityTimeframe }
  ]
})
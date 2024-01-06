import { Behavior, combineObject, replayLatest } from "@aelea/core"
import { $Node, $text, MOTION_NO_WOBBLE, NodeComposeFn, component, motion, style } from "@aelea/dom"
import { $NumberTicker, $column, $icon, $row, layoutSheet, screenUtils } from "@aelea/ui-components"
import { colorAlpha, pallete } from "@aelea/ui-components-theme"
import { empty, map, multicast, now, skipRepeatsWith, startWith } from "@most/core"
import { Stream } from "@most/types"
import { $Baseline, $bear, $bull, $infoTooltipLabel, IMarker } from "gmx-middleware-ui-components"
import { filterNull, parseReadableNumber, readableFixedUSD30, readableUnitAmount } from "gmx-middleware-utils"
import { BaselineData, ChartOptions, DeepPartial, MouseEventParams, Time } from "lightweight-charts"
import { IMirrorPositionSettled, IMirrorPositionOpen } from "puppet-middleware-utils"
import { IPerformanceTimeline, getPerformanceTimeline } from "./$ProfilePerformanceGraph.js"


export interface ITradeCardPreview extends Omit<IPerformanceTimeline, 'positionList'> {
  mp: IMirrorPositionSettled | IMirrorPositionOpen,
  $container?: NodeComposeFn<$Node>,
  chartConfig?: DeepPartial<ChartOptions>
  latestPrice: Stream<bigint>
  animatePnl?: boolean
}



export const $TradeCardPreview = (config: ITradeCardPreview) => component((
  [accountPreviewClick, accountPreviewClickTether]: Behavior<string, string>,
  [crosshairMove, crosshairMoveTether]: Behavior<MouseEventParams, MouseEventParams>,
) => {
  const openPositionList = config.mp.__typename === 'MirrorPositionOpen' ? [config.mp] : []
  const settledPositionList = config.mp.__typename === 'MirrorPositionSettled' ? [config.mp] : []
  const $container = config.$container || $column(style({ height: '80px', minWidth: '100px' }))
  const timeline = getPerformanceTimeline({ ...config, openPositionList, settledPositionList })
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


  const allAdjustments = [...config.mp.position.link.increaseList, ...config.mp.position.link.decreaseList]

  const markerList = allAdjustments.map((pos): IMarker => {
    const isSettled = 'settlement' in pos
    const position = pos.collateralTokenPriceMax > 0n ? 'aboveBar' as const : 'belowBar' as const

    return {
      position,
      text: pos.__typename === 'PositionDecrease' ? readableFixedUSD30(pos.basePnlUsd) : '',
      color: colorAlpha(pallete.message, .25),
      time: Number(pos.blockTimestamp) as Time,
      size: 0.1,
      shape: !isSettled ? 'arrowUp' as const : 'circle' as const,
    }
  }).sort((a, b) => Number(a.time) - Number(b.time))

  const tickerStyle = style({
    lineHeight: 1,
    fontWeight: "bold",
    zIndex: 10,
    position: 'relative'
  })




  return [
    $container(


      $column(
        $row(screenUtils.isDesktopScreen ? layoutSheet.spacingBig : layoutSheet.spacing, style({ placeContent: 'center', alignItems: 'center', fontFamily: 'Moderat', padding: screenUtils.isDesktopScreen ? '25px 35px 0px' : '35px 35px 0px', zIndex: 11 }))(
          $row(style({ fontFamily: 'ModeratMono', alignItems: 'center', placeContent: 'space-evenly' }))(
            $row(layoutSheet.spacing, style({ alignItems: 'center' }))(
              $row(
                style({ borderRadius: '2px', padding: '4px', backgroundColor: pallete.message, })(
                  $icon({
                    $content: config.mp.position.isLong ? $bull : $bear,
                    width: '38px',
                    fill: pallete.background,
                    viewBox: '0 0 32 32',
                  })
                )
              ),
              $column(style({ gap: '6px' }))(
                $row(layoutSheet.spacingTiny, style({ alignItems: 'center' }))(
                  // $icon({
                  //   $content: newLocal,
                  //   viewBox: '0 0 32 32',
                  //   width: '18px'
                  // }),
                  // $text(readableFixedUSD30(config.position.averagePrice))
                ),
                // $row(layoutSheet.spacingSmall, style({ color: isSettled ? '' : pallete.indeterminate, fontSize: '.85rem' }))(
                //   $text(tradeTitle(mirroredPosition)),
                //   $row(style({ gap: '3px', alignItems: 'baseline' }))(
                //     $icon({
                //       $content: $target,
                //       width: '10px',
                //       fill: isSettled ? '' : pallete.indeterminate,
                //       viewBox: '0 0 32 32'
                //     }),
                //     $text(style(isSettled ? {} : { color: pallete.indeterminate }))(
                //       merge(
                //         now('Loading...'),
                //         map(price => {
                //           return readableNumber(formatFixed(price, 30))
                //         }, latestPrice)
                //       )
                //     )
                //   )
                // ),
              )
            ),
          ),

          // style({ alignSelf: 'stretch' }, $seperator),

          // !isSettled
          //   ? $RiskLiquidator(mirroredPosition, latestPrice)({})
          //   : $column(layoutSheet.spacingTiny, style({ textAlign: 'center' }))(
          //     $text(readableUSD(mirroredPosition.size)),
          //     $seperator,
          //     style({ textAlign: 'center', fontSize: '.85rem' }, $text(style({ fontWeight: 'bold' }))(`${readableNumber(bnDiv(mirroredPosition.size, mirroredPosition.collateral))}x`)),
          //   ),


          // $row(style({ flex: 1 }))(),

          // switchLatest(map(cMap => {
          //   return $AccountPreview({ ...accountPreview, chain, address: trade.account, claim: cMap[trade.account.toLowerCase()] })({
          //     profileClick: accountPreviewClickTether()
          //   })
          // }, claimMap)),


        ),

        $container(
          $row(style({ position: 'absolute', placeContent: 'center',  top: '10px', alignSelf: 'center', zIndex: 11, alignItems: 'center', placeSelf: 'center' }))(
            !config.mp
              ? $text(style({ 
                fontSize: '.85rem', color: pallete.foreground, textAlign: 'center',
              }))('No trades yet')
              : empty(),
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
        )

        // $row(layoutSheet.spacing, style({ alignItems: 'baseline', placeContent: 'center', pointerEvents: 'none' }))(
        //   $row(style({ fontSize: '2.25em', alignItems: 'baseline', paddingTop: '26px', paddingBottom: '26px' }))(
        //     animatePnl
        //       ? style({
        //         lineHeight: 1,
        //         fontWeight: "bold",
        //         zIndex: 10,
        //         position: 'relative'
        //       })(
        //         $NumberTicker({
        //           value$: map(Math.round, motion({ ...MOTION_NO_WOBBLE, precision: 15, stiffness: 210 }, 0, chartRealisedPnl)),
        //           incrementColor: pallete.positive,
        //           decrementColor: pallete.negative
        //         })
        //       )
        //       : $text(tickerStyle, styleBehavior(map(pnl => ({ color: pnl > 0 ? pallete.positive : pallete.negative }), chartRealisedPnl)))(map(O(Math.floor, x => `${x > 0 ? '+' : ''}` + x.toLocaleString()), chartRealisedPnl)),
        //     $text(style({ fontSize: '.85rem', color: pallete.foreground }))('$'),
        //   ),
        //   // $liquidationSeparator(liqPercentage),
        //   $row(style({ fontSize: '1.85rem', alignItems: 'baseline' }))(
        //     $text(style({ color: pallete.foreground }))('('),
        //     animatePnl
        //       ? tickerStyle(
        //         $NumberTicker({
        //           value$: map(Math.round, skip(1, motion({ ...MOTION_NO_WOBBLE, precision: 15, stiffness: 210 }, 0, chartPnlPercentage))),
        //           incrementColor: pallete.positive,
        //           decrementColor: pallete.negative
        //         })
        //       )
        //       : $text(tickerStyle, styleBehavior(map(pnl => ({ color: pnl > 0 ? pallete.positive : pallete.negative }), chartPnlPercentage)))(map(O(Math.floor, n => `${n > 0 ? '+' : ''}` + n), chartPnlPercentage)),
        //     $text(tickerStyle, style({ color: pallete.foreground }))('%'),
        //     $text(style({ color: pallete.foreground }))(')'),
        //   ),
        // ),

        // $TradePnlHistory({ trade, latestPrice, pricefeed })({
        //   // pnlCrossHairChange: pnlCrosshairMoveTether(),
        //   // requestTradePricefeed: requestTradePricefeedTether(),
        //   crosshairMove: crosshairMoveTether()
        // })
      ),

    ),

    {
      accountPreviewClick
    }
  ]
})



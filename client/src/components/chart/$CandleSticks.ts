import { Behavior, combineArray, combineObject, fromCallback, O, Op } from "@aelea/core"
import { $Node, $wrapNativeElement, component, INode, style, styleInline } from "@aelea/dom"
import { $row, observer } from '@aelea/ui-components'
import { colorAlpha, pallete } from '@aelea/ui-components-theme'
import { filterNull } from "gmx-middleware-utils"
import { empty, filter, map, mergeArray, multicast, now, scan, snapshot, tap } from '@most/core'
import { disposeWith } from '@most/disposable'
import { Stream } from '@most/types'
import {
  CandlestickSeriesPartialOptions, ChartOptions, Coordinate, createChart, CrosshairMode, DeepPartial,
  IChartApi,
  IPriceLine, ISeriesApi, LineStyle, LogicalRange, MouseEventParams, PriceLineOptions, SeriesDataItemTypeMap, SeriesMarker,
  Time, TimeRange
} from 'lightweight-charts'

export interface IMarker extends SeriesMarker<Time> {

}


export interface ISeries {

  seriesConfig: CandlestickSeriesPartialOptions

  data: Array<SeriesDataItemTypeMap["Candlestick"]>

  appendData?: Stream<SeriesDataItemTypeMap["Candlestick"]>
  priceLines?: Stream<Partial<PriceLineOptions> & Pick<PriceLineOptions, "price"> | null>[]
  drawMarkers?: Stream<IMarker[]>
}

interface ICHartAxisChange {
  coords: Stream<Coordinate | null>
  isFocused: Stream<boolean>
  price: Stream<number | null>
}

export interface ICandlesticksChart {
  chartConfig?: DeepPartial<ChartOptions>
  containerOp?: Op<INode, INode>
  series: ISeries

  $content?: $Node

  yAxisState?: ICHartAxisChange

}

export interface IInitCandlesticksChart {
  chartApi: IChartApi
  seriesApi: ISeriesApi<"Candlestick">
}


export const $CandleSticks = ({ chartConfig, series, containerOp = O(), $content = empty(),
  yAxisState,
}: ICandlesticksChart) => {
  const containerEl = document.createElement('chart')



  return component((
    [containerDimension, sampleContainerDimension]: Behavior<INode, ResizeObserverEntry[]>,

    // [sampleChartCrosshair, sampleChartCrosshairTether]: Behavior<MouseEventParams, MouseEventParams>,
    // [focusAxis, focusAxisTether]: Behavior<Coordinate | null, Coordinate | null>,
  ) => {


    const chartApi = createChart(containerEl, {
      grid: {
        horzLines: {
          color: '#eee',
          visible: false,
        },
        vertLines: {
          color: 'transparent',
          visible: false
        },
      },
      overlayPriceScales: {
        borderColor: pallete.indeterminate,
        borderVisible: false,
      },
      layout: {
        background: {
          color: 'transparent'
        },
        textColor: pallete.message,
        fontFamily: 'Moderat',
        fontSize: 12
      },
      timeScale: {
        rightOffset: 0,
        secondsVisible: true,
        timeVisible: true,
        lockVisibleTimeRangeOnResize: true,
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        horzLine: {
          visible: false,
          labelVisible: false,
          labelBackgroundColor: pallete.foreground,
          color: colorAlpha(pallete.foreground, .20),
          width: 1,
          style: LineStyle.Solid
        },
        vertLine: {
          // visible: false,
          // labelVisible: false,
          labelBackgroundColor: pallete.indeterminate,
          color: colorAlpha(pallete.indeterminate, .20),
          width: 1,
          style: LineStyle.Solid,
        }
      },

      ...chartConfig
    })

    const seriesApi: ISeriesApi<"Candlestick"> = chartApi.addCandlestickSeries(series.seriesConfig)

    seriesApi.setData(series.data)

    const crosshairMove = fromCallback<MouseEventParams>(
      cb => {
        chartApi.subscribeCrosshairMove(cb)
        return disposeWith(handler => chartApi.unsubscribeCrosshairMove(handler), cb)
      }
    )


    const click = multicast(
      fromCallback<MouseEventParams>(cb => {
        chartApi.subscribeClick(cb)
        return disposeWith(handler => chartApi.unsubscribeClick(handler), cb)
      })
    )

    const timeScale = chartApi.timeScale()


    const visibleLogicalRangeChange: Stream<LogicalRange | null> = multicast(
      fromCallback(cb => {
        timeScale.subscribeVisibleLogicalRangeChange(cb)
        return disposeWith(handler => timeScale.subscribeVisibleLogicalRangeChange(handler), cb)
      })
    )

    const visibleTimeRangeChange = multicast(
      fromCallback<TimeRange | null>(cb => {
        timeScale.subscribeVisibleTimeRangeChange(cb)
        return disposeWith(handler => timeScale.unsubscribeVisibleTimeRangeChange(handler), cb)
      })
    )




    const ignoreAll = filter(() => false)

    const priceLineConfigList = series.priceLines || []




    return [
      $wrapNativeElement(containerEl)(
        style({ position: 'relative', minHeight: '30px', flex: 1, width: '100%' }),
        sampleContainerDimension(observer.resize()),
        containerOp,
      )(
        yAxisState
          ? $row(
            style({
              placeContent: 'flex-end', alignItems: 'center', height: '1px',
              zIndex: 10, pointerEvents: 'none', width: '100%', position: 'absolute'
            }),
            styleInline(
              map(params => {
                if (params.coords === null) {
                  return { display: 'none' }
                }

                return {
                  background: colorAlpha(params.isFocused ? pallete.primary : pallete.indeterminate, .5),
                  top: params.coords + 'px',
                  display: 'flex'
                }
              }, combineObject(yAxisState))
            )
          )(
            $content
          ) : empty(),
        ignoreAll(mergeArray([
          mergeArray([
            series.appendData
              ? tap(next => {
                if (next && next.time) {
                  seriesApi.update(next)
                }

              }, series.appendData)
              : empty(),
            ...priceLineConfigList.map(lineStreamConfig => {
              return scan((prev, params) => {
                if (prev && params === null) {
                  seriesApi.removePriceLine(prev)
                }

                if (params) {
                  if (prev) {
                    prev.applyOptions(params)
                    return prev
                  } else {
                    return seriesApi.createPriceLine(params)
                  }
                }

                return null
              }, null as IPriceLine | null, lineStreamConfig)
            }),
            tap(next => {
              seriesApi.setMarkers(next)
            }, series.drawMarkers || empty()),
          ]),
          combineArray(([containerDimension]) => {
            // debugger

            const { width, height } = containerDimension.contentRect
            chartApi.resize(width, height)
            timeScale.resetTimeScale()


            return empty()
          }, containerDimension),
        ]))
      ),

      {
        yAxisCoords: yAxisState
          ? mergeArray([
            filterNull(map(coords => {
              if (coords.isFocused) {
                return null
              }

              return coords.crosshairMove?.point?.y || null
            }, combineObject({ crosshairMove, isFocused: yAxisState.isFocused }))),
            snapshot((params, range) => {
              if (!params.isFocused || params.coords === null || !params.price) {
                return null
              }

              return seriesApi.priceToCoordinate(params.price)
            }, combineObject(yAxisState), visibleLogicalRangeChange),

          ]) : empty(),
        focusPrice: yAxisState
          ? filterNull(mergeArray([
            snapshot((params, ev) => {
              if (params.isFocused) {
                return null
              }

              return ev.point ? seriesApi.coordinateToPrice(ev.point.y) : null
            }, combineObject(yAxisState), click),
            snapshot((params, coords) => {
              if (params.isFocused) {
                return null
              }

              return coords ? seriesApi.coordinateToPrice(coords) : null
            }, combineObject(yAxisState), yAxisState.coords)
          ])) : empty(),
        isFocused: yAxisState ? snapshot((focused) => !focused, yAxisState.isFocused, click) : empty(),
        initChart: now({ chartApi, seriesApi } as IInitCandlesticksChart),
        crosshairMove,
        click,
        visibleLogicalRangeChange,
        visibleTimeRangeChange,
        containerDimension
      }
    ]
  })
}



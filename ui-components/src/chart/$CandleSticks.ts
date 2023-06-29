import { colorAlpha, pallete } from '@aelea/ui-components-theme'
import {
  ChartOptions, CrosshairMode, DeepPartial, LineStyle
} from 'lightweight-charts'
import { $Chart, IChartConfig } from "./$Chart.js"


export interface ICandlesticksChart extends IChartConfig<'Candlestick'> {
}


export const $CandleSticks = (config: ICandlesticksChart) => {

  const chartConfig: DeepPartial<ChartOptions> = {
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

    ...config.chartConfig
  }

  return $Chart({ ...config, chartConfig, getSeriesApi: api => api.addCandlestickSeries(config.seriesConfig) })
}



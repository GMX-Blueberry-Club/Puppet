import { colorAlpha, pallete } from '@aelea/ui-components-theme'
import {
  ChartOptions, CrosshairMode, DeepPartial, LineStyle
} from 'lightweight-charts'
import { $Chart, IChartConfig } from "./$Chart.js"


export interface ICandlesticksChart extends IChartConfig<'Candlestick'> {
}


export const $CandleSticks = (config: ICandlesticksChart) => {

  const chartConfig: DeepPartial<ChartOptions> = {
    overlayPriceScales: {
      borderColor: pallete.indeterminate,
      borderVisible: false,
    },
    leftPriceScale: {
      visible: false
    },
    rightPriceScale: {
      borderColor: 'yellow',
      autoScale: true,
      visible: false,
      scaleMargins: {
        top: 0.4,
        bottom: 0,
      }
    },
    timeScale: {
      
      fixLeftEdge: true,
      fixRightEdge: true,
      rightOffset: 0,
      rightBarStaysOnScroll: true,
      secondsVisible: true,
      timeVisible: true,
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



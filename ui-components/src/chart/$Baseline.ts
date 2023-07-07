import { pallete } from '@aelea/ui-components-theme'
import {
  BarPrice,
  BaselineSeriesPartialOptions,
  CandlestickSeriesPartialOptions,
  ChartOptions,
  DeepPartial,
  LineStyle
} from 'lightweight-charts'
import { $Chart, IChartConfig } from "./$Chart.js"
import { readableNumber, readableUnitAmount } from 'gmx-middleware-utils'


export interface IBaselineChart extends IChartConfig<'Baseline'> {
}


export const $Baseline = (config: IBaselineChart) => {

  const chartConfig: DeepPartial<ChartOptions> = {
    layout: {
      background: {
        color: 'transparent'
      },
      textColor: pallete.foreground,
      fontFamily: 'Moderat',
      fontSize: 10
    },
    leftPriceScale: {
      scaleMargins: {
        top: 0.15,
        bottom: 0.05,
      }
    },
    // rightPriceScale: {
    //   // mode: PriceScaleMode.Logarithmic,
    //   autoScale: true,
    //   visible: true,
    //   scaleMargins: {
    //     top: 0.4,
    //     bottom: 0,
    //   }
    // },
    handleScale: false,
    handleScroll: false,
    timeScale: {
      // rightOffset: 110,
      secondsVisible: false,
      timeVisible: true,
      shiftVisibleRangeOnNewBar: true,
      rightOffset: 0,
      fixLeftEdge: true,
      fixRightEdge: true,
      borderVisible: false,
      // visible: false,
      // rightBarStaysOnScroll: true,
    },
    ...config.chartConfig || {}
  }

  return $Chart({
    ...config,
    chartConfig,
    getSeriesApi: api => api.addBaselineSeries({
      // topFillColor1: pallete.positive,
      // topFillColor2: pallete.positive,
      priceFormat: {
        type: 'custom',
        formatter: (priceValue: BarPrice) => readableUnitAmount(priceValue.valueOf())
      },
      topLineColor: pallete.positive,
      bottomLineColor: pallete.negative,
      baseValue: {
        type: 'price',
        price: 0,
      },
      baseLineStyle: LineStyle.Dashed,
      lineWidth: 2,
      baseLineColor: 'red',
      baseLineVisible: true,
      lastValueVisible: false,
      priceLineVisible: false,
    })
  })
}



import { Behavior, combineArray, combineObject, replayLatest } from "@aelea/core"
import { $Node, $text, INode, MOTION_NO_WOBBLE, NodeComposeFn, component, motion, style } from "@aelea/dom"
import { $NumberTicker, $column, $row, observer } from "@aelea/ui-components"
import { map, multicast, now, scan, skipRepeatsWith, startWith, switchLatest } from "@most/core"
import { Stream } from "@most/types"
import { $Baseline, $infoTooltipLabel } from "gmx-middleware-ui-components"
import {
  filterNull,
  formatFixed,
  getPnL,
  getSlotNetPnL,
  intervalListFillOrderMap,
  parseReadableNumber,
  readableNumber,
  readableUnitAmount,
  switchMap,
  unixTimestampNow
} from "gmx-middleware-utils"
import { BaselineData, ChartOptions, DeepPartial, MouseEventParams } from "lightweight-charts"
import * as viem from "viem"
import { IGmxProcessSeed, PRICEFEED_INTERVAL, latestTokenPrice } from "../../data/process/process"
import { pallete } from "@aelea/ui-components-theme"

interface IProfilePerformanceCard {
  processData: Stream<IGmxProcessSeed>
  trader: viem.Address
  // pricefeed: IPriceInterval[]
  // chain: CHAIN
  // mp: Array<IPositionMirrorSettled | IPositionMirrorSlot>
  // latestPrice: Stream<bigint>

  $container?: NodeComposeFn<$Node>
  chartConfig?: DeepPartial<ChartOptions>
  pixelsPerBar?: number

}

export interface IPerformanceTick {
  time: number
  value: number
}


function findClosest<T extends readonly number[]> (arr: T, chosen: number): T[number] {
  return arr.reduce((a, b) => b - chosen < a - chosen ? b : a)
}


export const $ProfilePerformanceCard = (config: IProfilePerformanceCard) => component((
  [containerDimension, sampleContainerDimension]: Behavior<INode, ResizeObserverEntry[]>,
  [crosshairMove, crosshairMoveTether]: Behavior<MouseEventParams, MouseEventParams>,
) => {

  const processData = map(seed => {
    const settled = Object.values(seed.mirrorPositionSettled[config.trader]).flat() //.flatMap(t => t.flatMap(t => [...t.position.link.updateList, t.position ]))
    const open = Object.values(seed.mirrorPositionSlot).filter(pos => pos.trader === config.trader) //.flatMap(t => t.position.link.updateList)

    const pricefeed = seed.pricefeed
    // const latestPrice = seed.latestPrice
    return { open, settled, pricefeed }
  }, config.processData)

  const pixelsPerBar = config.pixelsPerBar || 5
  const displayColumnCount = map(([container]) => container.contentRect.width / pixelsPerBar, containerDimension)

  const historicPnL = multicast(map(params => {
    const openList = params.processData.open
    const settledList = params.processData.settled

    const startTime = settledList[0].blockTimestamp
    const endtime = openList.length ? unixTimestampNow() : settledList[settledList.length - 1].blockTimestamp
    const timeRange = endtime - startTime
    const interval = findClosest(PRICEFEED_INTERVAL, timeRange / params.displayColumnCount)


    const initialTick: IPerformanceTick = {
      time: startTime,
      value: 0
    }


    const data = intervalListFillOrderMap({
      source: [
        ...settledList,
        ...openList,
        {
          blockTimestamp: unixTimestampNow()
        }
      ],
      // source: [...feed.filter(tick => tick.timestamp > initialTick.time), ...trade.updateList, ...trade.increaseList, ...trade.decreaseList],
      interval,
      seed: initialTick,
      getTime: x => x.blockTimestamp,
      fillMap: (prev, next) => {
        // const time = next.blockTimestamp
        // if (next.__typename === 'UpdatePosition') {
        //   const pnl = getPnL(config.mp.position.isLong, next.averagePrice, next.markPrice, next.size)
        //   const realisedPnl = next.realisedPnl
        //   const pnlPercentage = getDeltaPercentage(pnl, next.collateral)

        //   const averagePrice = next.averagePrice
        //   const size = next.size
        //   const collateral = next.collateral

        //   return { ...prev, pnl, pnlPercentage, time, realisedPnl, size, collateral, averagePrice }
        // }


        if (!('position' in next)) {
          return prev
        }
        
        const value = prev.value + formatFixed(next.position.realisedPnl, 30)

        // const seedValue = data[data.length - 1].value
        // const nextValue = params.allTrades.open.reduce((seed, pos) => {
        //   const pnl = getSlotNetPnL(pos.position, params.allTrades.latestPrice[pos.position.indexToken])
        //   return seed + formatFixed(pnl, 30)
        // }, 0)
        // const value = seedValue + nextValue
        // const time = unixTimestampNow()
        // const pnlPercentage = getDeltaPercentage(pnl, prev.collateral)
        

        return { value }

      }
    })
    


    return { data, interval }
  }, combineObject({ displayColumnCount, processData })))


  const $container = config.$container || $column(style({ height: '80px', minWidth: '100px' }))


  const pnlCrossHairTimeChange = replayLatest(multicast(startWith(null, skipRepeatsWith(((xsx, xsy) => xsx.time === xsy.time), crosshairMove))))

  const pnlCrossHairTime = map((cross: MouseEventParams) => {

  }, pnlCrossHairTimeChange)

  const hoverChartPnl = filterNull(map(params => {
    if (params.pnlCrossHairTimeChange?.point) {
      const value = params.pnlCrossHairTimeChange.seriesData.values().next().value.value
      return value
    }

    const data = params.historicPnL.data
    const value = data[data.length - 1].value
    return value || null
  }, combineObject({ pnlCrossHairTimeChange, historicPnL })))



  return [

    $container(sampleContainerDimension(observer.resize()))(
      $row(style({ position: 'absolute', placeContent: 'center',  top: '10px', alignSelf: 'center', zIndex: 11, alignItems: 'center', placeSelf: 'center' }))(
        $column(style({ alignItems: 'center' }))(
          $NumberTicker({
            textStyle: {
              fontSize: '1.75rem',
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
      ),
      switchLatest(
        combineArray(({ data, interval }) => {

          return $Baseline({
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
            data: data as BaselineData[],
          })({
            crosshairMove: crosshairMoveTether(
              skipRepeatsWith((a, b) => a.point?.x === b.point?.x)
            )
          })
        }, historicPnL)
      )
    ),

    {
      crosshairMove,
      // requestPricefeed
    }
  ]
})
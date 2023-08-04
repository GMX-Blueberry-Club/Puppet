import { Behavior, combineArray } from "@aelea/core"
import { $Node, INode, NodeComposeFn, component, style } from "@aelea/dom"
import { $column, observer } from "@aelea/ui-components"
import { map, multicast, skipRepeatsWith, switchLatest } from "@most/core"
import { Stream } from "@most/types"
import { CHAIN } from "gmx-middleware-const"
import { $Baseline } from "gmx-middleware-ui-components"
import {
  IPositionSlot,
  IPriceInterval,
  formatFixed, getDeltaPercentage, getPnL,
  createTimeline, isPositionSettled,
  unixTimestampNow
} from "gmx-middleware-utils"
import { ChartOptions, DeepPartial, MouseEventParams, Time } from "lightweight-charts"
import { IPositionMirrorSettled, IPositionMirrorSlot } from "puppet-middleware-utils"

interface ITradePnlPreview {
  $container: NodeComposeFn<$Node>
  mp: IPositionMirrorSettled | IPositionMirrorSlot
  latestPrice: Stream<bigint>
  chartConfig?: DeepPartial<ChartOptions>
  pixelsPerBar?: number
  pricefeed: IPriceInterval[]
  chain: CHAIN
}

export interface IPricefeedTick {
  time: number
  price: bigint
  fee: bigint
  size: bigint
  collateral: bigint
  averagePrice: bigint
  realisedPnl: bigint
  pnl: bigint
  pnlPercentage: bigint
}


export const $TradePnlHistory = (config: ITradePnlPreview) => component((
  [crosshairMove, crosshairMoveTether]: Behavior<MouseEventParams, MouseEventParams>,
  [containerDimension, sampleContainerDimension]: Behavior<INode, ResizeObserverEntry[]>
) => {

  const pixelsPerBar = config.pixelsPerBar || 5
  const displayColumnCount = map(([container]) => container.contentRect.width / pixelsPerBar, containerDimension)

  const historicPnL = multicast(combineArray((displayColumnCount) => {

    const startPrice = config.mp.position.link.updateList[0].averagePrice
    const startTime = config.mp.blockTimestamp
    const endtime = isPositionSettled(config.mp.position) ? config.mp.position.settledBlockTimestamp : unixTimestampNow()
    const timeRange = endtime - startTime
    const interval = Math.floor(timeRange / displayColumnCount) || 1

    const initalUpdate = config.mp.position.link.updateList[0]

    const initialTick: IPricefeedTick = {
      time: startTime,
      price: startPrice,
      collateral: initalUpdate.collateral,
      size: initalUpdate.size,
      averagePrice: initalUpdate.averagePrice,
      pnl: 0n,
      realisedPnl: 0n,
      fee: 0n,
      pnlPercentage: 0n
    }

    const pricefeedFramed = config.pricefeed.filter(tick => tick.blockTimestamp >= initialTick.time)

    const data = createTimeline({
      source: [
        ...pricefeedFramed,
        ...config.mp.position.link.updateList
      ],
      // source: [...feed.filter(tick => tick.timestamp > initialTick.time), ...trade.updateList, ...trade.increaseList, ...trade.decreaseList],
      interval,
      seed: initialTick,
      getTime: x => x.blockTimestamp,
      seedMap: (prev, next) => {
        const time = next.blockTimestamp

        if (next.__typename === 'UpdatePosition') {
          const pnl = getPnL(config.mp.position.isLong, next.averagePrice, next.markPrice, next.size)
          const realisedPnl = next.realisedPnl
          const pnlPercentage = getDeltaPercentage(pnl, next.collateral)

          const averagePrice = next.averagePrice
          const size = next.size
          const collateral = next.collateral

          return { ...prev, pnl, pnlPercentage, time, realisedPnl, size, collateral, averagePrice }
        }

        const pnl = getPnL(config.mp.position.isLong, prev.averagePrice, next.c, prev.size)
        const pnlPercentage = getDeltaPercentage(pnl, prev.collateral)

        return { ...prev, time, pnl, pnlPercentage }

      }
    })


    const lastChange = data[data.length - 1]

    if (isPositionSettled(config.mp.position)) {
      const pnl = 0n
      const pnlPercentage = getDeltaPercentage(pnl, config.mp.position.maxCollateral)
      const realisedPnl = config.mp.position.realisedPnl

      data.push({ ...lastChange, pnl, realisedPnl, pnlPercentage, time: config.mp.position.settledBlockTimestamp })
    }

    return { data, interval }
  }, displayColumnCount))


  return [

    (config.$container || $column(style({ height: '80px' })))(sampleContainerDimension(observer.resize()))(
      switchLatest(
        combineArray(({ data, interval }) => {

          return $Baseline({
            
            // realtimeSource: isTradeSettled(config.trade)
            //   ? empty()
            //   : map((price): SingleValueData => {
            //     const nextTime = unixTimestampNow()
            //     const nextTimeslot = Math.floor(nextTime / interval)
            //     const lastUpdate = config.trade.updateList[config.trade.updateList.length - 1]

            //     const pnl = getPnL(config.trade.isLong, lastUpdate.averagePrice, price, lastUpdate.size) + lastUpdate.realisedPnl - getTradeTotalFee(config.trade)
            //     const value = formatFixed(pnl, 30)

            //     return {
            //       value,
            //       time: nextTimeslot * interval as Time
            //     }
            //   }, config.latestPrice),
            data: data.map(({ pnl, time, realisedPnl }) => ({ time: time as Time, value: formatFixed(pnl + realisedPnl, 30) })),
            // initializeSeries: map((api) => {
            //   const high = data[data.reduce((seed, b, idx) => b.pnl > data[seed].pnl ? idx : seed, Math.min(6, data.length - 1))]
            //   const low = data[data.reduce((seed, b, idx) => b.pnl <= data[seed].pnl ? idx : seed, 0)]

            //   if (high.pnl > 0 && low.pnl < 0) {
            //     series.createPriceLine({
            //       price: 0,
            //       color: pallete.foreground,
            //       lineWidth: 1,
            //       lineVisible: true,
            //       axisLabelVisible: true,
            //       title: '',
            //       lineStyle: LineStyle.SparseDotted,
            //     })
            //   }
            //   // setTimeout(() => {
            //   //   if (data.length > 10) {
            //   //     if (low.pnl !== high.pnl) {
            //   //       // const increaseList = trade.increaseList
            //   //       // const increaseMarkers = increaseList
            //   //       //   .slice(1)
            //   //       //   .map((ip): SeriesMarker<Time> => {
            //   //       //     return {
            //   //       //       color: pallete.foreground,
            //   //       //       position: "aboveBar",
            //   //       //       shape: "arrowUp",
            //   //       //       time: unixTimeTzOffset(ip.timestamp),
            //   //       //       text: readableUSD(ip.collateralDelta)
            //   //       //     }
            //   //       //   })
            //   //       // const decreaseList = isTradeSettled(trade) ? trade.decreaseList.slice(0, -1) : trade.decreaseList
            //   //       // const decreaseMarkers = decreaseList
            //   //       //   .map((ip): SeriesMarker<Time> => {
            //   //       //     return {
            //   //       //       color: pallete.foreground,
            //   //       //       position: 'belowBar',
            //   //       //       shape: "arrowDown",
            //   //       //       time: unixTimeTzOffset(ip.timestamp),
            //   //       //       text: readableUSD(ip.collateralDelta)
            //   //       //     }
            //   //       //   })

            //   //       // series.setMarkers([...increaseMarkers, ...decreaseMarkers].sort((a, b) => Number(a.time) - Number(b.time)))


            //   //     }
            //   //   }

            //   //   api.timeScale().fitContent()

            //   // }, 90)


            //   return series
            // }),
            
 
          })({
            crosshairMove: crosshairMoveTether(
              skipRepeatsWith((a, b) => a.point?.x === b.point?.x),
              multicast
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
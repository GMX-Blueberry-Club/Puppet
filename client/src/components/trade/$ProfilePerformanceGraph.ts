import { Behavior } from "@aelea/core"
import { $Node, NodeComposeFn, component, style } from "@aelea/dom"
import { colorAlpha, pallete } from "@aelea/ui-components-theme"
import { now, skipRepeatsWith } from "@most/core"
import * as GMX from 'gmx-middleware-const'
import { TIME_INTERVAL_MAP } from "gmx-middleware-const"
import { $Baseline, IMarker } from "gmx-middleware-ui-components"
import {
  IPositionDecrease,
  IPositionIncrease,
  IPriceTickListMap,
  IPricetick,
  createTimeline,
  formatFixed,
  getPositionPnlUsd,
  unixTimestampNow
} from "gmx-middleware-utils"
import { BaselineData, ChartOptions, DeepPartial, LineType, MouseEventParams, Time } from "lightweight-charts"
import { IMirrorPositionOpen, IMirrorPositionSettled, getParticiapntMpPortion } from "puppet-middleware-utils"
import * as viem from "viem"


export const PRICEFEED_INTERVAL = [
  TIME_INTERVAL_MAP.MIN5,
  TIME_INTERVAL_MAP.MIN15,
  TIME_INTERVAL_MAP.MIN60,
  TIME_INTERVAL_MAP.HR4,
  TIME_INTERVAL_MAP.HR24,
] as const

type IPerformanceTickUpdateTick = {
  update: IPositionIncrease | IPositionDecrease
  mp: IMirrorPositionSettled | IMirrorPositionOpen
  timestamp: number
}


type ITimelinePositionOpen = IPerformanceTickUpdateTick & {
  realisedPnl: bigint
  openPnl: bigint
}

export interface IPerformanceTimeline {
  puppet?: viem.Address
  positionList: (IMirrorPositionSettled | IMirrorPositionOpen)[]
  pricefeedMap: IPriceTickListMap
  tickCount: number
  activityTimeframe: GMX.IntervalTime
  chartConfig?: DeepPartial<ChartOptions>
}


interface IGraphPnLTick {
  time: number
  settledPnl: bigint
  value: number
  positionOpen: Record<viem.Hex, ITimelinePositionOpen>
}


function findClosest<T extends readonly number[]> (arr: T, chosen: number): T[number] {
  return arr.reduce((a, b) => b - chosen < chosen - a ? b : a)
}


function getTime(item: IPerformanceTickUpdateTick | IPricetick): number {
  return item.timestamp
}


// interface MirrorPositionPerformanceTimeline {
//   mirrorPosition: IPositionMirrorSettled | IPositionMirrorOpen
//   pricefeed: IPriceCandle[]
//   puppet?: viem.Address
//   tickCount: number
//   activityTimeframe: GMX.IntervalTime
// }

// export function mirrorPositionPerformanceTimeline(config: MirrorPositionPerformanceTimeline) {
//   const updateList = [...config.mirrorPosition.position.link.increaseList, ...config.mirrorPosition.position.link.decreaseList]
//   const interval = findClosest(PRICEFEED_INTERVAL, config.activityTimeframe / config.tickCount)

//   const seed = {
//     time: Number(config.mirrorPosition.blockTimestamp),
//     value: 0,
//     realisedPnl: 0n,
//     openPnl: 0n,
//   }

//   return createTimeline({
//     source: [...updateList, ...config.pricefeed],
//     // source: [...feed.filter(tick => tick.timestamp > initialTick.time), ...trade.updateList, ...trade.increaseList, ...trade.decreaseList],
//     interval,
//     seed,
//     getTime: next => 'c' in next ? next.timestamp : Number(next.blockTimestamp),
//     seedMap: (acc, next) => {
//       if ('c' in next) {
//         const mp = slot.mp
//         const tickerId = `${mp.position.indexToken}:${interval}` as const
//         const tokenPrice = getClosestpricefeedCandle(config.pricefeedMap, tickerId, intervalSlot, 0)

//         const pnl = getPositionPnlUsd(slot.update.isLong, slot.update.sizeInUsd, slot.update.sizeInTokens, tokenPrice.c)
//         const pnlShare = getParticiapntMpPortion(mp, pnl, config.puppet)

//         const value = formatFixed(pnlAcc + pnlShare, 30)

//         return { ...acc, pendingPnl, value }
//         return acc
//       }

//       const key = next.update.positionKey

//       if (next.update.collateralAmount > 0n || next.update.__typename === 'PositionIncrease') {
//         acc.positionOpen[key] ??= {
//           openPnl: 0n,
//           realisedPnl: 0n,
//           ...next
//         }
//         return { ...acc }
//       }
      
//       delete acc.positionOpen[key]

//       const nextSettlePnl = next.update.basePnlUsd
//       const pnlPortion = getParticiapntMpPortion(next.mp, nextSettlePnl, config.puppet)
//       const openPnl = Object.values(acc.positionOpen).reduce((a, b) => a + b.openPnl + b.realisedPnl, 0n)

//       const settledPnl = acc.settledPnl + pnlPortion // - position.cumulativeFee
//       const value = formatFixed(settledPnl + openPnl, 30)

//       return { ...acc, settledPnl, value }
//     }
//   })
// }

export function performanceTimeline(config: IPerformanceTimeline) {
  if (config.positionList.length === 0) return []

  const timeNow = unixTimestampNow()
  const startTime = timeNow - config.activityTimeframe
  const updateList: IPerformanceTickUpdateTick[] = config.positionList
    .flatMap((mp): IPerformanceTickUpdateTick[] => {
      if (mp.__typename === 'MirrorPositionOpen')  {
        const tickList = [...mp.position.link.increaseList, ...mp.position.link.decreaseList].filter(update => Number(update.blockTimestamp) > startTime)

        if (tickList.length === 0) {
          const update = mp.position.link.increaseList[mp.position.link.increaseList.length - 1]

          return [{ update, mp, timestamp: startTime }]
        }

        return tickList.map(update => ({ update, mp, timestamp: Number(update.blockTimestamp) }))
      }

      const tickList: IPerformanceTickUpdateTick[] = [...mp.position.link.increaseList, ...mp.position.link.decreaseList]
        .map(update => ({ update, mp, timestamp: Number(update.blockTimestamp) }))

      return tickList
    })
    // .filter(tick => getTime(tick.update) > startTime)
    // .sort((a, b) => getTime(a.update) - getTime(b.update))

  const interval = findClosest(PRICEFEED_INTERVAL, config.activityTimeframe / config.tickCount)
  const uniqueIndexTokenList = [...new Set(config.positionList.map(mp => mp.position.indexToken))]

  const initialTick: IGraphPnLTick = {
    time: startTime,
    value: 0,
    settledPnl: 0n,
    positionOpen: {}
  }


  const priceUpdateTicks = uniqueIndexTokenList.flatMap(indexToken => config.pricefeedMap[indexToken] ?? []).filter(x => x.timestamp > startTime)
  const source = [...updateList, ...priceUpdateTicks] //.filter(tick => getTime(tick) > startTime)
  // const sortedUpdateList = performanceTickList.sort((a, b) => getTime(a.update) - getTime(b.update))

  const data = createTimeline({
    source,
    // source: [...feed.filter(tick => tick.timestamp > initialTick.time), ...trade.updateList, ...trade.increaseList, ...trade.decreaseList],
    interval,
    seed: initialTick,
    getTime,
    seedMap: (acc, next) => {
      if ('price' in next) {
        const pendingPnl = Object.values(acc.positionOpen).reduce((pnlAcc, slot) => {
          if  (slot.update.collateralAmount === 0n) return pnlAcc
          const pnl = getPositionPnlUsd(slot.update.isLong, slot.update.sizeInUsd, slot.update.sizeInTokens, next.price)
          const pnlShare = getParticiapntMpPortion(slot.mp, pnl, config.puppet)

          return pnlAcc + pnlShare
        }, 0n)

        const value = formatFixed(acc.settledPnl + pendingPnl, 30)

        return { ...acc, pendingPnl, value }
      }

      const key = next.update.positionKey

      if (next.update.collateralAmount > 0n || next.update.__typename === 'PositionIncrease') {
        acc.positionOpen[key] ??= {
          openPnl: 0n,
          realisedPnl: 0n,
          ...next
        }
        return { ...acc }
      }
      
      delete acc.positionOpen[key]

      const nextSettlePnl = next.update.basePnlUsd
      const pnlPortion = getParticiapntMpPortion(next.mp, nextSettlePnl, config.puppet)
      const openPnl = Object.values(acc.positionOpen).reduce((a, b) => a + b.openPnl + b.realisedPnl, 0n)

      const settledPnl = acc.settledPnl + pnlPortion // - position.cumulativeFee
      const value = formatFixed(settledPnl + openPnl, 30)

      return { ...acc, settledPnl, value }
    },
  })
    
  return data
}


export const $ProfilePerformanceGraph = (config: IPerformanceTimeline & { $container: NodeComposeFn<$Node> }) => component((
  [crosshairMove, crosshairMoveTether]: Behavior<MouseEventParams, MouseEventParams>,
) => {


  const timeline = performanceTimeline(config)

  const markerList = config.positionList.map((pos): IMarker => {
    const isSettled = 'settlement' in pos

    return {
      position: 'inBar',
      color: isSettled ? colorAlpha(pallete.message, .15) : colorAlpha(pallete.primary, .15),
      time: Number(pos.blockTimestamp) as Time,
      size: 0.1,
      shape: isSettled ? 'circle' as const : 'circle' as const,
    }
  }).sort((a, b) => Number(a.time) - Number(b.time))


  return [
    config.$container(
      $Baseline({
        containerOp: style({  inset: '0px 0px 0px 0px', position: 'absolute' }),
        markers: now(markerList),
        chartConfig: {
          leftPriceScale: {
            // autoScale: true,
            ticksVisible: true,
            scaleMargins: {
              top: 0,
              bottom: 0,
            }
          },
          crosshair: {
            horzLine: {
              visible: false,
            },
            vertLine: {
              visible: false,
            }
          },
          // height: 150,
          // width: 100,
          timeScale :{
            visible: false
          },
          // ...config.chartConfig
        },
        data: timeline as any as BaselineData[],
        // containerOp: style({  inset: '0px 0px 0px 0px' }),
        baselineOptions: {
          baseValue: {
            price: 0,
            type: 'price',
          },
          lineWidth: 1,
          lineType: LineType.Curved,
        },
      })({
        crosshairMove: crosshairMoveTether(
          skipRepeatsWith((a, b) => a.point?.x === b.point?.x)
        )
      }),
    ),

    {
      crosshairMove,
      // requestPricefeed
    }
  ]
})



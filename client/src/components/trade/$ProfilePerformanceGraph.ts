import { Behavior } from "@aelea/core"
import { $Node, NodeComposeFn, component, style } from "@aelea/dom"
import { colorAlpha, pallete } from "@aelea/ui-components-theme"
import { now, skipRepeatsWith } from "@most/core"
import * as GMX from 'gmx-middleware-const'
import { $Baseline, IMarker } from "ui-components"
import {
  IntervalTime,
  createTimeline,
  formatFixed,
  unixTimestampNow
} from "common-utils"
import { BaselineData, ChartOptions, DeepPartial, LineType, MouseEventParams, Time } from "lightweight-charts"
import { IMirrorPositionOpen, IMirrorPositionSettled, getParticiapntMpPortion } from "puppet-middleware-utils"
import * as viem from "viem"
import { IPositionDecrease, IPositionIncrease, IPriceTickListMap, IPricetick, getPositionPnlUsd } from "gmx-middleware-utils"



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
  openPositionList: IMirrorPositionOpen[]
  settledPositionList: IMirrorPositionSettled[]
  priceTickMap: IPriceTickListMap
  tickCount: number
  activityTimeframe: IntervalTime
  chartConfig?: DeepPartial<ChartOptions>
}


interface IGraphPnLTick {
  realisedPnl: bigint
  value: number
  positionOpen: Record<viem.Hex, ITimelinePositionOpen>
  time: number
}



function getTime(item: IPerformanceTickUpdateTick | IPricetick): number {
  return item.timestamp
}


export function getPerformanceTimeline(config: IPerformanceTimeline) {
  const timeNow = unixTimestampNow()
  const startTime = timeNow - config.activityTimeframe
  const openAdjustList: IPerformanceTickUpdateTick[] = config.openPositionList
    .flatMap((mp): IPerformanceTickUpdateTick[] => {
      const tickList = [...mp.position.link.increaseList, ...mp.position.link.decreaseList].filter(update => Number(update.blockTimestamp) > startTime)

      if (tickList.length === 0) {
        const update = mp.position.link.increaseList[mp.position.link.increaseList.length - 1]

        return [{ update, mp, timestamp: startTime }]
      }

      return tickList.map(update => ({ update, mp, timestamp: Number(update.blockTimestamp) }))
    })

  const settledAdjustList: IPerformanceTickUpdateTick[] = config.settledPositionList.flatMap(mp => {
    return [...mp.position.link.increaseList, ...mp.position.link.decreaseList].filter(update => Number(update.blockTimestamp) > startTime).map(update => ({ update, mp, timestamp: Number(update.blockTimestamp) }))
  })

  const uniqueIndexTokenList = [...new Set([...config.openPositionList.map(mp => mp.position.indexToken), ...config.settledPositionList.map(mp => mp.position.indexToken)])]

  const priceUpdateTicks = uniqueIndexTokenList.flatMap(indexToken => config.priceTickMap[indexToken] ?? [])
  const source = [...openAdjustList, ...settledAdjustList, ...priceUpdateTicks].sort((a, b) => getTime(a) - getTime(b))
  const seed: IGraphPnLTick = {
    value: 0,
    realisedPnl: 0n,
    positionOpen: {},
    time: startTime,
  }
  const data = createTimeline({
    source,
    seed,
    getTime,
    seedMap: (acc, next) => {
      if ('price' in next) {
        const pendingPnl = Object.values(acc.positionOpen).reduce((pnlAcc, slot) => {
          if  (slot.update.collateralAmount === 0n) return pnlAcc
          const pnl = getPositionPnlUsd(slot.update.isLong, slot.update.sizeInUsd, slot.update.sizeInTokens, next.price)
          const pnlShare = getParticiapntMpPortion(slot.mp, pnl, config.puppet)

          return pnlAcc + pnlShare
        }, 0n)

        const value = formatFixed(acc.realisedPnl + pendingPnl, 30)

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

      const settledPnl = acc.realisedPnl + pnlPortion // - position.cumulativeFee
      const value = formatFixed(settledPnl + openPnl, 30)

      return { ...acc, realisedPnl: settledPnl, value }
    },
  })
    
  return data
}


export const $ProfilePerformanceGraph = (config: IPerformanceTimeline & { $container: NodeComposeFn<$Node> }) => component((
  [crosshairMove, crosshairMoveTether]: Behavior<MouseEventParams, MouseEventParams>,
) => {

  const timeline = getPerformanceTimeline(config)

  const openMarkerList = config.openPositionList.map((pos): IMarker => {
    const pnl = timeline[timeline.length - 1].value
    return {
      position: 'inBar',
      color: pnl < 0 ? pallete.negative : pallete.positive,
      time: unixTimestampNow() as Time,
      size: 1.5,
      shape: 'circle'
    }
  })
  const settledMarkerList = config.settledPositionList.flatMap(pos => pos.position.link.decreaseList).map((pos): IMarker => {
    return {
      position: 'inBar',
      color: colorAlpha(pallete.message, .15),
      time: Number(pos.blockTimestamp) as Time,
      size: 0.1,
      shape: 'circle'
    }
  })

  const allMarkerList = [...settledMarkerList, ...openMarkerList].sort((a, b) => Number(a.time) - Number(b.time))


  return [
    config.$container(
      $Baseline({
        containerOp: style({  inset: '0px 0px 0px 0px', position: 'absolute' }),
        markers: now(allMarkerList),
        chartConfig: {
          width: 100,
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



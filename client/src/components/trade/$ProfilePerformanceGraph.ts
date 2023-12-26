import { Behavior, combineObject, replayLatest } from "@aelea/core"
import { $Node, $node, $text, MOTION_NO_WOBBLE, NodeComposeFn, component, motion, style } from "@aelea/dom"
import { $NumberTicker, $column, $row } from "@aelea/ui-components"
import { colorAlpha, pallete } from "@aelea/ui-components-theme"
import { empty, map, multicast, now, skipRepeatsWith, startWith } from "@most/core"
import * as GMX from 'gmx-middleware-const'
import { $Baseline, $infoTooltipLabel, IMarker } from "gmx-middleware-ui-components"
import {
  IPriceCandle,
  IPriceIntervalIdentity,
  IPositionDecrease,
  IPositionIncrease,
  createTimeline,
  filterNull,
  formatFixed,
  getPnL,
  getPositionPnlUsd,
  parseReadableNumber,
  readableFixedUSD30,
  readableUnitAmount,
  unixTimestampNow,
  getMappedValue,
  IPricefeedMap
} from "gmx-middleware-utils"
import { BaselineData, ChartOptions, DeepPartial, LineType, MouseEventParams, Time } from "lightweight-charts"
import { IPositionMirrorSettled, IPositionMirrorOpen, getParticiapntMpPortion } from "puppet-middleware-utils"
import * as viem from "viem"
import { IGmxProcessState, PRICEFEED_INTERVAL } from "../../data/process/process.js"
import { LAST_ACTIVITY_LABEL_MAP } from "../../pages/components/$LastActivity"
import { Stream } from "@most/types"

type IPerformanceTickUpdateTick = {
  update: IPositionIncrease | IPositionDecrease
  source: IPositionMirrorSettled | IPositionMirrorOpen
}


type ITimelinePositionSlot = IPerformanceTickUpdateTick & {
  realisedPnl: bigint
  openPnl: bigint
}

export interface IPerformanceTimeline {
  puppet?: viem.Address
  positionList: (IPositionMirrorSettled | IPositionMirrorOpen)[]
  pricefeedMap: IPricefeedMap
  tickCount: number
  activityTimeframe: GMX.IntervalTime
  chartConfig?: DeepPartial<ChartOptions>
}

interface IParticipantPerformanceGraph extends IPerformanceTimeline {
  $container: NodeComposeFn<$Node>
  chartConfig?: DeepPartial<ChartOptions>
  pixelsPerBar?: number
}




interface IGraphPnLTick {
  time: number
  settledPnl: bigint
  value: number
  positionSlot: Record<viem.Hex, ITimelinePositionSlot>
}


function findClosest<T extends readonly number[]> (arr: T, chosen: number): T[number] {
  return arr.reduce((a, b) => b - chosen < chosen - a ? b : a)
}


function getTime(tickItem: IPositionIncrease | IPositionDecrease): number {
  return Number(tickItem.blockTimestamp)
}




export function performanceTimeline(config: IPerformanceTimeline) {
  if (config.positionList.length === 0) return []

  const performanceTickList = getUpdateTickList(config.positionList)
  const timeNow = unixTimestampNow()
  const startTime = timeNow - config.activityTimeframe
  const interval = findClosest(PRICEFEED_INTERVAL, config.activityTimeframe / config.tickCount)

  const initialTick: IGraphPnLTick = {
    time: startTime,
    value: 0,
    settledPnl: 0n,
    positionSlot: {}
  }

  const endTick = {
    end: true,
    blockTimestamp: timeNow
  }

  const sortedUpdateList = performanceTickList.sort((a, b) => getTime(a.update) - getTime(b.update))

  const data = createTimeline({
    source: [ ...sortedUpdateList, endTick ],
    // source: [...feed.filter(tick => tick.timestamp > initialTick.time), ...trade.updateList, ...trade.increaseList, ...trade.decreaseList],
    interval,
    seed: initialTick,
    getTime: mp => 'update' in mp ? Math.max(getTime(mp.update), startTime) : mp.blockTimestamp,
    seedMap: (acc, next) => {
      if ('end' in next) {
        return { ...acc }
      }

      const key = next.update.positionKey

      if (next.update.collateralAmount > 0n || next.update.__typename === 'PositionIncrease') {
        acc.positionSlot[key] ??= {
          openPnl: 0n,
          realisedPnl: 0n,
          ...next
        }
        return { ...acc }
      }
      
      delete acc.positionSlot[key]

      const nextSettlePnl = next.update.basePnlUsd
      const pnlPortion = getParticiapntMpPortion(next.source, nextSettlePnl, config.puppet)
      const openPnl = Object.values(acc.positionSlot).reduce((a, b) => a + b.openPnl + b.realisedPnl, 0n)

      const settledPnl = acc.settledPnl + pnlPortion // - position.cumulativeFee
      const value = formatFixed(settledPnl + openPnl, 30)

      return { ...acc, settledPnl, value }
    },
    gapMap: (acc, next, intervalSlot) => {
      const pendingPnl = Object.values(acc.positionSlot).reduce((pnlAcc, slot) => {
        if  (slot.update.collateralAmount === 0n) return pnlAcc
        const mp = slot.source
        const tickerId = `${mp.position.indexToken}:${interval}` as const
        const tokenPrice = getClosestpricefeedCandle(config.pricefeedMap, tickerId, intervalSlot, 0)

        const pnl = getPositionPnlUsd(slot.update.isLong, slot.update.sizeInUsd, slot.update.sizeInTokens, tokenPrice.c)
        const pnlShare = getParticiapntMpPortion(mp, pnl, config.puppet)

        return pnlAcc + pnlShare
      }, 0n)

      const value = formatFixed(acc.settledPnl + pendingPnl, 30)

      return { ...acc, pendingPnl, value }
    }
  })
    
  return data
}



function getClosestpricefeedCandle(pricefeed: Record<IPriceIntervalIdentity, Record<string, IPriceCandle>>, tickerId: IPriceIntervalIdentity, intervalSlot: number, offset: number) {

  if (offset > 50) {
    throw new Error('No recent pricefeed data found')
  }

  const price = pricefeed[tickerId][intervalSlot] || pricefeed[tickerId][intervalSlot + offset]

  if (!price) {
    return getClosestpricefeedCandle(pricefeed, tickerId, intervalSlot, offset + 1)
  }

  return price
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


export function getUpdateTickList(list: (IPositionMirrorSettled | IPositionMirrorOpen)[]): IPerformanceTickUpdateTick[] {
  const updateList: IPerformanceTickUpdateTick[] = list
    .flatMap(mp => {
      const tickList = [...mp.position.link.increaseList, ...mp.position.link.decreaseList]
        .sort((a, b) => getTime(a) - getTime(b))
        .map(update => ({ update, source: mp }))

      return tickList
    })
    .sort((a, b) => getTime(a.update) - getTime(b.update))

  return updateList
}

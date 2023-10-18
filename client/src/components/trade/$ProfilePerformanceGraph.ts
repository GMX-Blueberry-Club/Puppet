import { Behavior, combineObject, replayLatest } from "@aelea/core"
import { $Node, $text, MOTION_NO_WOBBLE, NodeComposeFn, component, motion, style } from "@aelea/dom"
import { $NumberTicker, $column, $row } from "@aelea/ui-components"
import { colorAlpha, pallete } from "@aelea/ui-components-theme"
import { empty, map, multicast, now, skipRepeatsWith, startWith } from "@most/core"
import * as GMX from 'gmx-middleware-const'
import { $Baseline, $infoTooltipLabel, IMarker } from "gmx-middleware-ui-components"
import {
  IPriceInterval,
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
  unixTimestampNow
} from "gmx-middleware-utils"
import { BaselineData, ChartOptions, DeepPartial, LineType, MouseEventParams, Time } from "lightweight-charts"
import { IPositionMirrorSettled, IPositionMirrorSlot, getParticiapntMpPortion } from "puppet-middleware-utils"
import * as viem from "viem"
import { IGmxProcessState, PRICEFEED_INTERVAL } from "../../data/process/process.js"

type IPerformanceTickUpdateTick = {
  update: IPositionIncrease | IPositionDecrease
  source: IPositionMirrorSettled | IPositionMirrorSlot
}


type ITimelinePositionSlot = IPerformanceTickUpdateTick & {
  realisedPnl: bigint
  openPnl: bigint
}

export interface IPerformanceTimeline {
  positionList: (IPositionMirrorSettled | IPositionMirrorSlot)[],
  processData: IGmxProcessState,
  tickCount: number,
  activityTimeframe: GMX.IntervalTime,
  targetShare?: viem.Address,
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


function getTime(tickItem: IPositionIncrease | IPositionDecrease) {
  return tickItem.blockTimestamp
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
      const pnlPortion = getParticiapntMpPortion(next.source, nextSettlePnl, config.targetShare)
      const openPnl = Object.values(acc.positionSlot).reduce((a, b) => a + b.openPnl + b.realisedPnl, 0n)

      const settledPnl = acc.settledPnl + pnlPortion // - position.cumulativeFee
      const value = formatFixed(settledPnl + openPnl, 30)

      return { ...acc, settledPnl, value }
    },
    gapMap: (acc, next, intervalSlot) => {
      const pendingPnl = Object.values(acc.positionSlot).reduce((pnlAcc, slot) => {
        if  (slot.update.collateralAmount === 0n) return pnlAcc
        const mp = slot.source
        const tickerId = `${mp.indexToken}:${interval}` as const
        const tokenPrice = getClosestpricefeedCandle(config.processData.pricefeed, tickerId, intervalSlot, 0)

        const pnl = getPositionPnlUsd(slot.update.isLong, slot.update.sizeInUsd, slot.update.sizeInTokens, tokenPrice.c)
        const pnlShare = getParticiapntMpPortion(mp, pnl, config.targetShare)

        return pnlAcc + pnlShare
      }, 0n)

      const value = formatFixed(acc.settledPnl + pendingPnl, 30)

      return { ...acc, pendingPnl, value }
    }
  })
    
  return data
}



function getClosestpricefeedCandle(pricefeed: Record<IPriceIntervalIdentity, Record<string, IPriceInterval>>, tickerId: IPriceIntervalIdentity, intervalSlot: number, offset: number) {

  if (offset > 50) {
    throw new Error('No recent pricefeed data found')
  }

  const price = pricefeed[tickerId][intervalSlot] || pricefeed[tickerId][intervalSlot + offset]

  if (!price) {
    return getClosestpricefeedCandle(pricefeed, tickerId, intervalSlot, offset + 1)
  }

  return price
}

export const $ProfilePerformanceCard = (config: IParticipantPerformanceGraph) => component((
  [crosshairMove, crosshairMoveTether]: Behavior<MouseEventParams>
) => {

  const $container = config.$container
  const timeline = performanceTimeline(config)
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



  const markerList: IMarker[] = config.positionList.map((pos) => {
    const isSettled = 'settlement' in pos
    const position = pos.realisedPnl > 0n ? 'aboveBar' as const : 'belowBar' as const

    return {
      position,
      text: readableFixedUSD30(pos.realisedPnl),
      color: colorAlpha(pallete.message, .25),
      time: pos.blockTimestamp as Time,
      size: 0.1,
      shape: !isSettled ? 'arrowUp' as const : 'circle' as const,
    }
  }).sort((a, b) => Number(a.time) - Number(b.time))



  return [
    $container(
      $row(style({ position: 'absolute', placeContent: 'center',  top: '10px', alignSelf: 'center', zIndex: 11, alignItems: 'center', placeSelf: 'center' }))(
        config.positionList.length === 0
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
    ),

    {
      crosshairMove,
      // requestPricefeed
    }
  ]
})


export const $ProfilePerformanceGraph = (config: IPerformanceTimeline & { $container: NodeComposeFn<$Node> }) => component((
  [crosshairMove, crosshairMoveTether]: Behavior<MouseEventParams, MouseEventParams>,
) => {


  const timeline = performanceTimeline(config)

  const markerList = config.positionList.map((pos): IMarker => {
    const isSettled = 'settlement' in pos

    return {
      position: 'inBar',
      color: isSettled ? colorAlpha(pallete.message, .15) : colorAlpha(pallete.primary, .15),
      time: pos.blockTimestamp as Time,
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
            autoScale: true,
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


export function getUpdateTickList(list: (IPositionMirrorSettled | IPositionMirrorSlot)[]): IPerformanceTickUpdateTick[] {
  const updateList: IPerformanceTickUpdateTick[] = list
    .flatMap(mp => {
      const tickList = mp.updates.map(update => ({ update, source: mp }))

      // if (mp.__typename === 'PositionSettled') {
      //   return [...tickList, { update: mp.settlement, source: mp }]
      // }

      return tickList
    })
    .sort((a, b) => getTime(a.update) - getTime(b.update))

  return updateList
}

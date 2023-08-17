import { Behavior, combineObject, replayLatest } from "@aelea/core"
import { $Node, $text, MOTION_NO_WOBBLE, NodeComposeFn, component, motion, style } from "@aelea/dom"
import { $NumberTicker, $column, $row } from "@aelea/ui-components"
import { colorAlpha, pallete } from "@aelea/ui-components-theme"
import { empty, map, multicast, now, skipRepeatsWith, startWith } from "@most/core"
import * as GMX from 'gmx-middleware-const'
import { $Baseline, $infoTooltipLabel, IMarker } from "gmx-middleware-ui-components"
import {
  IPositionClose,
  IPositionLiquidated,
  IPositionUpdate,
  IPriceInterval,
  IPriceIntervalIdentity,
  createTimeline,
  filterNull,
  formatFixed,
  getPnL,
  isPositionSettled,
  parseReadableNumber,
  readableFixedUSD30,
  readableUSD,
  readableUnitAmount,
  unixTimestampNow
} from "gmx-middleware-utils"
import { BaselineData, ChartOptions, DeepPartial, LineType, MouseEventParams, Time } from "lightweight-charts"
import { IPositionMirrorSettled, IPositionMirrorSlot, getParticiapntMpPortion } from "puppet-middleware-utils"
import * as viem from "viem"
import { IGmxProcessState, PRICEFEED_INTERVAL } from "../../data/process/process"
import { Stream } from "@most/types"


interface IParticipantPerformanceCard {
  width: number
  $container?: NodeComposeFn<$Node>
  chartConfig?: DeepPartial<ChartOptions>
  pixelsPerBar?: number
  positionList: (IPositionMirrorSettled | IPositionMirrorSlot)[]
  processData: IGmxProcessState
  targetShare?: viem.Address
  activityTimeframe: GMX.IntervalTime
}

interface IProfilePerformanceGraph {
  width: number,
  positionList: (IPositionMirrorSettled | IPositionMirrorSlot)[],
  targetShare?: viem.Address
  processData: IGmxProcessState;
  activityTimeframe: GMX.IntervalTime;
}


type IPerformanceTickUpdateTick = {
  update: IPositionUpdate | IPositionClose | IPositionLiquidated
  source: IPositionMirrorSettled | IPositionMirrorSlot
}

type ITimelinePositionSlot = IPerformanceTickUpdateTick & {
  realisedPnl: bigint
  openPnl: bigint
}

interface IPerformanceTick {
  time: number
  settledPnl: bigint
  value: number
  positionSlot: Record<viem.Hex, ITimelinePositionSlot>
}


function findClosest<T extends readonly number[]> (arr: T, chosen: number): T[number] {
  return arr.reduce((a, b) => b - chosen < chosen - a ? b : a)
}


function getTime(tickItem: IPositionUpdate | IPositionClose | IPositionLiquidated) {
  return tickItem.blockTimestamp
}


function performanceTimeline(
  updateList: IPerformanceTickUpdateTick[],
  processData: IGmxProcessState,
  tickCount: number,
  activityTimeframe: GMX.IntervalTime,
  shareTarget?: viem.Address,
) {

  if (updateList.length === 0) return []

  const timeNow = unixTimestampNow()

  const startTime = timeNow - activityTimeframe
  const interval = findClosest(PRICEFEED_INTERVAL, activityTimeframe / tickCount)


  const initialTick: IPerformanceTick = {
    time: startTime,
    value: 0,
    settledPnl: 0n,
    positionSlot: {}
  }

  const endTick = {
    end: true,
    blockTimestamp: timeNow
  }




  const data = createTimeline({
    source: [ ...updateList, endTick ],
    // source: [...feed.filter(tick => tick.timestamp > initialTick.time), ...trade.updateList, ...trade.increaseList, ...trade.decreaseList],
    interval,
    seed: initialTick,
    getTime: mp => 'update' in mp ? getTime(mp.update) : mp.blockTimestamp,
    seedMap: (acc, next) => {
      if ('end' in next) {
        return { ...acc }
      }

      if (next.update.__typename === 'UpdatePosition') {
        acc.positionSlot[next.update.key] ??= {
          openPnl: 0n,
          realisedPnl: 0n,
          ...next
        }
        return { ...acc }
      } else {
        delete acc.positionSlot[next.update.key]
      }

      const nextSettlePnl = next.update.__typename === 'LiquidatePosition' ? -next.update.collateral : next.update.realisedPnl
      const pnlPortion = getParticiapntMpPortion(next.source, nextSettlePnl, shareTarget)
      const openPnl = Object.values(acc.positionSlot).reduce((a, b) => a + b.openPnl + b.realisedPnl, 0n)

      const settledPnl = acc.settledPnl + pnlPortion // - position.cumulativeFee
      const value = formatFixed(settledPnl + openPnl, 30)

      return { ...acc, settledPnl, value }
    },
    gapMap: (acc, next, intervalSlot) => {
      const pendingPnl = Object.values(acc.positionSlot).reduce((pnlAcc, slot) => {

        if  (slot.update.__typename !== 'UpdatePosition') {
          return pnlAcc
        }

        const mp = slot.source
        const tickerId = `${mp.position.indexToken}:${interval}` as const
        const tokenPrice = getClosestpricefeedCandle(processData.pricefeed, tickerId, intervalSlot)
        const pnl = getPnL(mp.position.isLong, slot.update.averagePrice, tokenPrice.c, slot.update.size)
        const openPnl = getParticiapntMpPortion(mp, pnl, shareTarget)

        return pnlAcc + openPnl
      }, 0n)

      const value = formatFixed(acc.settledPnl + pendingPnl, 30)

      return { ...acc, pendingPnl, value }
    }
  })
    
  return data
}



function getClosestpricefeedCandle(pricefeed: Record<IPriceIntervalIdentity, Record<string, IPriceInterval>>, tickerId: IPriceIntervalIdentity, intervalSlot: number) {
  const price = pricefeed[tickerId][intervalSlot] || pricefeed[tickerId][intervalSlot + 1]

  if (!price) {
    return getClosestpricefeedCandle(pricefeed, tickerId, intervalSlot - 1)
  }

  return price
}

export const $ProfilePerformanceCard = (config: IParticipantPerformanceCard) => component((
  [crosshairMove, crosshairMoveTether]: Behavior<MouseEventParams>
) => {

  const pixelsPerBar = config.pixelsPerBar || 5
  const $container = config.$container || $column(style({ height: '80px', minWidth: '100px' }))
  const tickCount = config.width / pixelsPerBar
  const updateList: IPerformanceTickUpdateTick[] = config.positionList
    .flatMap(mp => {
      const list = mp.position.link.updateList.map(update => ({ update, source: mp }))

      if ('settlement' in mp.position) {
        return [...list, { update: mp.position.settlement, source: mp }]
      }

      return list
    })
    .sort((a, b) => getTime(a.update) - getTime(b.update))

  const timeline = performanceTimeline(updateList, config.processData, tickCount, config.activityTimeframe, config.targetShare)
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
    const isSettled = 'settlement' in pos.position
    const position = pos.position.realisedPnl > 0n ? 'aboveBar' as const : 'belowBar' as const

    return {
      position,
      text: readableFixedUSD30(pos.position.realisedPnl),
      color: colorAlpha(pallete.message, .25),
      time: pos.blockTimestamp as Time,
      size: 1,
      shape: !isSettled ? 'arrowUp' as const : 'circle' as const,
    }
  }).sort((a, b) => Number(a.time) - Number(b.time))


  // const markerList = updateList.map((pos): IMarker => {
  //   const isUpdate = pos.update.__typename === 'UpdatePosition'
  //   const isLiquidated = !isUpdate && pos.update.__typename === 'LiquidatePosition'


  //   return {
  //     position: isUpdate ? 'aboveBar' : 'belowBar',
  //     color: isUpdate ? pallete.message : isLiquidated ? pallete.negative : colorAlpha(pallete.foreground, .25),
  //     time: getTime(pos.update) as Time,
  //     size: 1,
  //     shape: isUpdate ? 'circle' : 'square',
  //   }
  // })


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


export const $ProfilePerformanceGraph = (config: IProfilePerformanceGraph) => component((
  [crosshairMove, crosshairMoveTether]: Behavior<MouseEventParams, MouseEventParams>,
) => {

  const $container = $row(style({  width: `${config.width}px`,  }))
  const tickCount = config.width / 5
  const updateList: IPerformanceTickUpdateTick[] = config.positionList
    .flatMap(mp => {
      const updateList = mp.position.link.updateList.map(update => ({ update, source: mp }))
      if ('settlement' in mp.position) {
        return [...updateList, { update: mp.position.settlement, source: mp }]
      }

      return updateList
    })
    .sort((a, b) => getTime(a.update) - getTime(b.update))
  const timeline = performanceTimeline(updateList, config.processData, tickCount, config.activityTimeframe, config.targetShare)

  return [
    $container(
      $Baseline({
        chartConfig: {
          crosshair: {
            horzLine: {
              visible: false,
            },
            vertLine: {
              visible: false,
            }
          },
          height: 40,
          width: config.width,
          timeScale :{
            visible: false
          }
        },
        data: timeline as any as BaselineData[],
        containerOp: style({  inset: '0px 0px 0px 0px' }),
        baselineOptions: {
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
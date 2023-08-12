import { Behavior, combineObject, replayLatest } from "@aelea/core"
import { $Node, $text, MOTION_NO_WOBBLE, NodeComposeFn, component, motion, style } from "@aelea/dom"
import { $NumberTicker, $column, $row } from "@aelea/ui-components"
import { pallete } from "@aelea/ui-components-theme"
import { empty, map, multicast, skipRepeatsWith, startWith } from "@most/core"
import * as GMX from 'gmx-middleware-const'
import { $Baseline, $infoTooltipLabel } from "gmx-middleware-ui-components"
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
  parseReadableNumber,
  readableUnitAmount,
  unixTimestampNow
} from "gmx-middleware-utils"
import { BaselineData, ChartOptions, DeepPartial, LineType, MouseEventParams } from "lightweight-charts"
import { IPositionMirrorSettled, IPositionMirrorSlot, getParticiapntMpPortion } from "puppet-middleware-utils"
import * as viem from "viem"
import { IGmxProcessState, PRICEFEED_INTERVAL } from "../../data/process/process"


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


type IPerformanceTickUpdateTick = IPositionUpdate & { mp: IPositionMirrorSettled | IPositionMirrorSlot }

type ITimelinePositionSlot = {
  realisedPnl: bigint
  openPnl: bigint
  update: IPerformanceTickUpdateTick
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


function getTime(tickItem: (IPositionClose | IPositionLiquidated | IPositionUpdate) & { mp: IPositionMirrorSettled | IPositionMirrorSlot }) {
  return tickItem.blockTimestamp
}


function performanceTimeline(
  positionList: (IPositionMirrorSettled | IPositionMirrorSlot)[],
  processData: IGmxProcessState,
  tickCount: number,
  activityTimeframe: GMX.IntervalTime,
  shareTarget?: viem.Address,
) {

  if (positionList.length === 0) return []

  // const pricefeed = processData.pricefeed

  const now = unixTimestampNow()

  const sourceList = positionList.flatMap(mp => {
    const updateList = mp.position.link.updateList.map(update => ({ ...update, mp }))
    if ('settlement' in mp.position) {
      return [...updateList, { ...mp.position.settlement, mp }]
    }

    return updateList
  }).sort((a, b) => getTime(a) - getTime(b))
    

  const startTime = now - activityTimeframe
  const interval = findClosest(PRICEFEED_INTERVAL, activityTimeframe / tickCount)


  const initialTick: IPerformanceTick = {
    time: startTime,
    value: 0,
    settledPnl: 0n,
    positionSlot: {}
  }

  const endTick = {
    end: true,
    blockTimestamp: now
  }




  const data = createTimeline({
    source: [ ...sourceList, endTick ],
    // source: [...feed.filter(tick => tick.timestamp > initialTick.time), ...trade.updateList, ...trade.increaseList, ...trade.decreaseList],
    interval,
    seed: initialTick,
    getTime: mp => getTime(mp as any),
    seedMap: (acc, next) => {
      if ('end' in next) {
        return { ...acc }
      }

      if (next.__typename === 'UpdatePosition') {
        acc.positionSlot[next.key] ??= {
          openPnl: 0n,
          realisedPnl: 0n,
          update: next
        }
        return { ...acc }
      } else {
        delete acc.positionSlot[next.key]
      }

      const nextSettlePnl = next.__typename === 'LiquidatePosition' ? -next.collateral : next.realisedPnl
      const pnlPortion = getParticiapntMpPortion(next.mp, nextSettlePnl, shareTarget)
      const openPnl = Object.values(acc.positionSlot).reduce((a, b) => a + b.openPnl + b.realisedPnl, 0n)

      const settledPnl = acc.settledPnl + pnlPortion // - position.cumulativeFee
      const value = formatFixed(settledPnl + openPnl, 30)

      return { ...acc, settledPnl, value }
    },
    gapMap: (acc, next, intervalSlot) => {
      const pendingPnl = Object.values(acc.positionSlot).reduce((pnlAcc, slot) => {
        const mp = slot.update.mp
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
  const timeline = performanceTimeline(config.positionList, config.processData, tickCount, config.activityTimeframe, config.targetShare,)
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
        chartConfig: {
          leftPriceScale: {
            autoScale: true,
            ticksVisible: true,
            scaleMargins: {
              top: 0.35,
              bottom: 0.05,
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
  const timeline = performanceTimeline(config.positionList, config.processData, tickCount, config.activityTimeframe, config.targetShare)

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
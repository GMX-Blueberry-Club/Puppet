import { Behavior, combineArray, combineObject, replayLatest } from "@aelea/core"
import { $Node, $text, INode, MOTION_NO_WOBBLE, NodeComposeFn, component, motion, style } from "@aelea/dom"
import { $NumberTicker, $column, $row, observer } from "@aelea/ui-components"
import { pallete } from "@aelea/ui-components-theme"
import { map, multicast, skipRepeatsWith, startWith, switchLatest } from "@most/core"
import { Stream } from "@most/types"
import { $Baseline, $infoTooltipLabel } from "gmx-middleware-ui-components"
import {
  ILogTxType,
  IPositionSettled,
  IPositionUpdate,
  createTimeline,
  filterNull,
  formatFixed,
  getPnL,
  parseReadableNumber,
  readableUnitAmount,
  switchMap,
  unixTimestampNow
} from "gmx-middleware-utils"
import { BaselineData, ChartOptions, DeepPartial, LineType, MouseEventParams } from "lightweight-charts"
import { IPositionMirrorSettled, getPortion, getPuppetShare } from "puppet-middleware-utils"
import * as viem from "viem"
import { IGmxProcessSeed, PRICEFEED_INTERVAL } from "../../data/process/process"


interface IProfilePerformanceCard {
  $container?: NodeComposeFn<$Node>
  chartConfig?: DeepPartial<ChartOptions>
  pixelsPerBar?: number
  processData: Stream<IGmxProcessSeed>
  trader: viem.Address
  puppet?: viem.Address
}

type ITimelinePositionSlot = {
  realisedPnl: bigint
  openPnl: bigint
  update: IPositionUpdate
}

interface IPerformanceTick {
  time: number
  pendingPnl: bigint
  settledPnl: bigint
  value: number
  positionSlot: Record<viem.Hex, ITimelinePositionSlot>
}


function findClosest<T extends readonly number[]> (arr: T, chosen: number): T[number] {
  return arr.reduce((a, b) => b - chosen < chosen - a ? b : a)
}

function getTime(tickItem: IPositionMirrorSettled | IPositionUpdate & ILogTxType<'UpdatePosition'> | {end: boolean, blockTimestamp: number}) {
  if ('__typename' in  tickItem && tickItem.__typename === 'PositionMirrorSettled') return tickItem.position.settledBlockTimestamp

  return tickItem.blockTimestamp
}


function performanceTimeline(
  processData: IGmxProcessSeed,
  trader: viem.Address,
  tickCount: number,
  puppet?: viem.Address,
) {
  const settledList = Object.values(processData.mirrorPositionSettled[trader]).flat() //.slice(-1)
  const openList = Object.values(processData.mirrorPositionSlot).filter(pos => pos.trader === trader) //.flatMap(t => t.position.link.updateList)
  // const pricefeed = processData.pricefeed

  const now = unixTimestampNow()

  const sourceList = [
    ...settledList.flatMap(mp => mp.position.link.updateList.map(update => ({ ...update, mp }))),
    ...settledList,
    {
      end: true,
      blockTimestamp: now
    }
  ].sort((a, b) => getTime(a) - getTime(b))

  const startTime = sourceList[0].blockTimestamp
  const timeRange = now - startTime
  const interval = findClosest(PRICEFEED_INTERVAL, timeRange / tickCount)


  const initialTick: IPerformanceTick = {
    time: startTime - interval,
    value: 0,
    pendingPnl: 0n,
    settledPnl: 0n,
    positionSlot: {}
  }



  const data = createTimeline({
    source: sourceList,
    // source: [...feed.filter(tick => tick.timestamp > initialTick.time), ...trade.updateList, ...trade.increaseList, ...trade.decreaseList],
    interval,
    seed: initialTick,
    getTime: mp => getTime(mp as any),
    seedMap: (acc, next, intervalSlot) => {
      if ('end' in next) {
        return { ...acc }
      }

      if (next.__typename === 'UpdatePosition') {
        const tickerId = `${next.mp.position.indexToken}:${interval}` as const
        const tokenPrice = processData.pricefeed[tickerId][intervalSlot]

        if (!tokenPrice) {
          return { ...acc }
        }

        acc.positionSlot[next.key] ??= {
          openPnl: 0n,
          realisedPnl: next.realisedPnl,
          update: next
        }

        const pendingPnl = Object.values(acc.positionSlot).reduce((a, b) => a + b.openPnl + b.realisedPnl, 0n)
        const value = formatFixed(acc.settledPnl + acc.pendingPnl, 30)

        return { ...acc, pendingPnl, value }
      }


      const position = next.position as IPositionSettled
      const settledPnl = acc.settledPnl + position.realisedPnl // - position.cumulativeFee

      const positionPnL = { ...acc.positionSlot }
      delete positionPnL[next.position.key]

      const pendingPnl = Object.values(positionPnL).reduce((a, b) => a + b.openPnl + b.realisedPnl, 0n)
      const value = formatFixed(settledPnl + pendingPnl, 30)

      return { ...acc, settledPnl, pendingPnl, value, positionSlot: positionPnL }

    },
    gapMap: (acc, next, intervalSlot) => {
      if ('end' in next) {
        return acc
      }

      const position = next.__typename === 'PositionMirrorSettled' ? next.position : next.mp.position
      const mp = next.__typename === 'PositionMirrorSettled' ? next : next.mp

        
      const tickerId = `${position.indexToken}:${interval}` as const
      const tokenPrice = processData.pricefeed[tickerId][intervalSlot]

      if (!acc.positionSlot[position.key] || !tokenPrice) {
        return { ...acc }
      }

      const share = puppet ? getPuppetShare(mp.shares, mp.puppets, puppet) : mp.traderShare

      const slot = acc.positionSlot[position.key]
      const pnl = getPnL(position.isLong, slot.update.averagePrice, tokenPrice.c, slot.update.size)
      const pnlPortion = getPortion(pnl, mp.shareSupply, share)
      slot.openPnl = pnlPortion

      const pendingPnl = Object.values(acc.positionSlot).reduce((a, b) => a + b.openPnl + b.realisedPnl, 0n)
      const value = formatFixed(acc.settledPnl + acc.pendingPnl, 30)


      return { ...acc, pendingPnl, value }
    }
  })
    
  return { data, interval }
}

export const $ProfilePerformanceCard = (config: IProfilePerformanceCard) => component((
  [containerDimension, sampleContainerDimension]: Behavior<INode, ResizeObserverEntry[]>,
  [crosshairMove, crosshairMoveTether]: Behavior<MouseEventParams, MouseEventParams>,
) => {

  const pixelsPerBar = config.pixelsPerBar || 5
  const tickCount = map(([container]) => container.contentRect.width / pixelsPerBar, containerDimension)
  const timeline = map(
    params => {

      return performanceTimeline(params.processData, config.trader, params.tickCount)
    },
    combineObject({ processData: config.processData, tickCount })
  )

  const $container = config.$container || $column(style({ height: '80px', minWidth: '100px' }))
  const pnlCrossHairTimeChange = replayLatest(multicast(startWith(null, skipRepeatsWith(((xsx, xsy) => xsx.time === xsy.time), crosshairMove))))


  const hoverChartPnl = filterNull(map(params => {
    if (params.pnlCrossHairTimeChange?.point) {
      const value = params.pnlCrossHairTimeChange.seriesData.values().next().value.value
      return value
    }

    const data = params.timeline.data
    const value = data[data.length - 1].value
    return value || null
  }, combineObject({ pnlCrossHairTimeChange, timeline })))


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
            data: data as any as BaselineData[],
          })({
            crosshairMove: crosshairMoveTether(
              skipRepeatsWith((a, b) => a.point?.x === b.point?.x)
            )
          })
        }, timeline)
      )
    ),

    {
      crosshairMove,
      // requestPricefeed
    }
  ]
})


export const $ProfilePerformanceGraph = (config: {
  processData: Stream<IGmxProcessSeed>
  trader: viem.Address
  width: number
}) => component((
  [crosshairMove, crosshairMoveTether]: Behavior<MouseEventParams, MouseEventParams>,
) => {

  const tickCount = config.width / 5
  const timeline = map(
    params => performanceTimeline(params.processData, config.trader, tickCount),
    combineObject({ processData: config.processData })
  )

  const $container = $row(style({   }))
  // const pnlCrossHairTimeChange = replayLatest(multicast(startWith(null, skipRepeatsWith(((xsx, xsy) => xsx.time === xsy.time), crosshairMove))))


  // const hoverChartPnl = filterNull(map(params => {
  //   if (params.pnlCrossHairTimeChange?.point) {
  //     const value = params.pnlCrossHairTimeChange.seriesData.values().next().value.value
  //     return value
  //   }

  //   const data = params.timeline.data
  //   const value = data[data.length - 1].value
  //   return value || null
  // }, combineObject({ pnlCrossHairTimeChange, timeline })))


  return [
    $container(
      switchMap(({ data, interval }) => {
        return  $Baseline({
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
          data: data as any as BaselineData[],
          containerOp: style({  inset: '0px 0px 0px 0px' }),
          baselineOptions: {
            lineWidth: 1,
            lineType: LineType.Curved,
          },
        })({
          crosshairMove: crosshairMoveTether(
            skipRepeatsWith((a, b) => a.point?.x === b.point?.x)
          )
        })
      }, timeline),
    ),

    {
      crosshairMove,
      // requestPricefeed
    }
  ]
})
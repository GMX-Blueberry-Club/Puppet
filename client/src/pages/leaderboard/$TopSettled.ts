import { Behavior, combineObject, replayLatest } from "@aelea/core"
import { $element, $text, component, style } from "@aelea/dom"
import * as router from '@aelea/router'
import { $column, $row, layoutSheet, screenUtils } from "@aelea/ui-components"
import { empty, map, mergeArray, now, startWith } from "@most/core"
import { Stream } from "@most/types"
import * as GMX from 'gmx-middleware-const'
import { $Table, ISortBy, ScrollRequest, TableColumn } from "gmx-middleware-ui-components"
import { IAbstractRouteIdentity, IPositionListSummary, div, getMappedValue, groupArrayMany, pagingQuery, readableFixedBsp, switchMap, unixTimestampNow } from "gmx-middleware-utils"
import { IMirrorPositionListSummary, IPositionMirrorSettled, IPuppetRouteSubscritpion, summariesMirrorTrader } from "puppet-middleware-utils"
import * as viem from "viem"
import { $TraderDisplay, $pnlValue, $route, $size } from "../../common/$common"
import { puppetsColumn } from "../../components/table/$TableColumn"
import { $ProfilePerformanceGraph, getUpdateTickList } from "../../components/trade/$ProfilePerformanceGraph"
import { IGmxProcessState } from "../../data/process/process"
import * as store from "../../data/store/store"
import { $card } from "../../elements/$common"
import * as storage from "../../utils/storage/storeScope"
import { $seperator2 } from "../common"
import { $LastAtivity, LAST_ACTIVITY_LABEL_MAP } from "../components/$LastActivity"
import { $DropMultiSelect, $Dropdown } from "../../components/form/$Dropdown"
import { ROUTE_DESCRIPTIN_MAP, ROUTE_DESCRIPTION, getRouteTypeKey } from "puppet-middleware-const"
import { rootStoreScope } from "../../data/store/store"
import { pallete } from "@aelea/ui-components-theme"
import { $labelDisplay } from "../../common/$TextField"




export type ITopSettled = {
  route: router.Route
  processData: Stream<IGmxProcessState>
  subscriptionList: Stream<IPuppetRouteSubscritpion[]>
}

type FilterTable =  { activityTimeframe: GMX.IntervalTime } | null

export const $TopSettled = (config: ITopSettled) => component((
  [routeTypeChange, routeTypeChangeTether]: Behavior<IAbstractRouteIdentity[]>,
  [routeChange, routeChangeTether]: Behavior<string, string>,
  [modifySubscriber, modifySubscriberTether]: Behavior<IPuppetRouteSubscritpion>,
  
  [scrollRequest, scrollRequestTether]: Behavior<ScrollRequest>,
  [sortByChange, sortByChangeTether]: Behavior<ISortBy<IPositionListSummary>>,
  [changeActivityTimeframe, changeActivityTimeframeTether]: Behavior<GMX.IntervalTime>,

) => {


  const exploreStore = storage.createStoreScope(rootStoreScope, 'topSettled' as const)
  const sortBy = storage.replayWrite(exploreStore, { direction: 'desc', selector: 'pnl' } as ISortBy<IPositionListSummary>, sortByChange, 'sortBy')
  const routeList = map(list => list.map(rt => {
    const matchedMemType = ROUTE_DESCRIPTION.find(rtd => getRouteTypeKey(rt.collateralToken, rt.indexToken, rt.isLong) === getRouteTypeKey(rtd.collateralToken, rtd.indexToken, rtd.isLong))

    if (!matchedMemType) {
      throw new Error(`Route type not found for ${rt.collateralToken} ${rt.indexToken} ${rt.isLong}`)
    }

    return matchedMemType
  }), storage.replayWrite(exploreStore, [] as IAbstractRouteIdentity[], routeTypeChange, 'filterRouteList'))

  const activityTimeframe = storage.replayWrite(store.activityTimeframe, GMX.TIME_INTERVAL_MAP.MONTH, changeActivityTimeframe)



  const pageParms = map(params => {
    const requestPage = { ...params.sortBy, offset: 0, pageSize: 20 }
    const paging = startWith(requestPage, scrollRequest)

    const dataSource =  map(req => {
      const filterStartTime = unixTimestampNow() - params.activityTimeframe

      const flattenMapMap = Object
        .values(params.data.mirrorPositionSettled)
        .flatMap(x => Object.values(x).flat())
        .filter(x => {
          const routeLength = params.routeList.length
          if (routeLength && params.routeList.findIndex(rt => getRouteTypeKey(rt.collateralToken, rt.indexToken, rt.isLong) === x.routeTypeKey) === -1) {
            return false
          }

          return x.blockTimestamp > filterStartTime
        })
      const tradeListMap = groupArrayMany(flattenMapMap, a => a.trader)
      const tradeListEntries = Object.values(tradeListMap)
      const filterestPosList = tradeListEntries.map(settledTradeList => {

        return { trader: settledTradeList[0].trader, settledTradeList, ...summariesMirrorTrader(settledTradeList) }
      })

      return pagingQuery({ ...params.sortBy, ...req }, filterestPosList)
    }, paging)


    return { ...params, dataSource }
  }, combineObject({ data: config.processData, sortBy, activityTimeframe, routeList }))



  return [
    $column(style({ width: '100%' }))(


      $card(layoutSheet.spacingBig, style({ flex: 1 }))(
      

        $row(style({ placeContent: 'space-between' }))(
          $row(
            $DropMultiSelect({
              $label: $labelDisplay(style({ color: pallete.foreground }))('Route'),
              $input: $element('input')(style({ maxWidth: '80px' })),
              placeholder: 'All / Select',
              $$chip: map(rt => {
                return $route(rt)
              }),
              selector: {
                list: ROUTE_DESCRIPTION,
                $$option: map(route => {
                  return style({
                    padding: '8px'
                  }, $route(route))
                })
              },
              value: routeList
            })({
              select: routeTypeChangeTether()
            }),
          ),
          $LastAtivity(activityTimeframe)({
            changeActivityTimeframe: changeActivityTimeframeTether()
          }),
        ),
    
        switchMap(params => {


          const columns: TableColumn<IMirrorPositionListSummary & { trader: viem.Address, settledTradeList: IPositionMirrorSettled[] }>[] = [
            {
              $head: $text('Trader'),
              gridTemplate: 'minmax(140px, 180px)',
              columnOp: style({ alignItems: 'center' }),
              $$body: map(pos => {

                return $TraderDisplay({
                  route: config.route,
                  // changeSubscriptionList: config.changeSubscriptionList,
                  subscriptionList: config.subscriptionList,
                  trader: pos.trader,
                })({ 
                  modifySubscribeList: modifySubscriberTether(),
                  clickTrader: routeChangeTether()
                })
              })
            },
          
            ...screenUtils.isDesktopScreen
              ? [
                {
                  $head: $text('Win / Loss'),
                  // gridTemplate: 'minmax(110px, 120px)',
                  columnOp: style({ alignItems: 'center', placeContent: 'center' }),
                  $$body: map((pos: IMirrorPositionListSummary) => {
                    return $row(
                      $text(`${pos.winCount} / ${pos.lossCount}`)
                    )
                  })
                },
                puppetsColumn,
              ]
              : [],
            {
              $head: $column(style({ textAlign: 'right' }))(
                $text('Size'),
                $text(style({ fontSize: '.85rem' }))('Leverage'),
              ),
              sortBy: 'size',
              columnOp: style({ placeContent: 'flex-end' }),
              $$body: map((pos) => {
                return $size(pos.size, pos.collateral)
              })
            },
            {
              $head: $column(style({ textAlign: 'right' }))(
                $text('PnL $'),
                $text(style({ fontSize: '.85rem' }))('Return %'),
              ),
              sortBy: 'pnl',
              gridTemplate: '90px',
              columnOp: style({ placeContent: 'flex-end' }),
              $$body: map(pos => {

                return $column(layoutSheet.spacingTiny, style({ textAlign: 'right' }))(
                  $pnlValue(pos.pnl),
                  $seperator2,
                  $text(style({ fontSize: '.85rem' }))(readableFixedBsp(div(pos.pnl, pos.collateral) * 100n)),
                )
              })
            },
            ...screenUtils.isDesktopScreen
              ? [
                {
                  $head: $text(`Last ${getMappedValue(LAST_ACTIVITY_LABEL_MAP, params.activityTimeframe)} activity`),
                  gridTemplate: '160px',
                  columnOp: style({ alignItems: 'center', placeContent: 'center' }),
                  $$body: map((pos: IMirrorPositionListSummary & { trader: viem.Address, settledTradeList: IPositionMirrorSettled[]}) => {
                    
                    return screenUtils.isDesktopScreen
                      ? $ProfilePerformanceGraph({
                        $container: $row(style({ position: 'relative',  width: `160px`, height: `80px`, margin: '-16px 0' })),
                        tickCount: 50,
                        processData: params.data,
                        positionList: pos.settledTradeList,
                        activityTimeframe: params.activityTimeframe,
                      })({})
                      : empty()
                  })
                },
              ]
              : [],
          ]

          return $Table({
            sortBy: params.sortBy,
            dataSource: params.dataSource,
            columns,
          })({
            sortBy: sortByChangeTether(),
            scrollRequest: scrollRequestTether(),
          })
        }, pageParms),

      
      )
    ),

    {
      routeChange,
      modifySubscriber,
      // unSubscribeSelectedTraders: snapshot((params, trader) => {
      //   const selectedIdx = params.selection.indexOf(trader)
      //   selectedIdx === -1 ? params.selection.push(trader) : params.selection.splice(selectedIdx, 1)
      //   return params.selection
      // }, combineObject({ selection: config.selectedTraders, subscription: config.subscription }), selectTrader),
    }
  ]
})






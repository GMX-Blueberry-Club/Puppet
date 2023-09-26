import { Behavior, combineObject } from "@aelea/core"
import { $element, $node, $text, attr, component, style } from "@aelea/dom"
import * as router from '@aelea/router'
import { $column, $row, layoutSheet, screenUtils } from "@aelea/ui-components"
import { pallete } from "@aelea/ui-components-theme"
import { empty, map, startWith } from "@most/core"
import { Stream } from "@most/types"
import * as GMX from 'gmx-middleware-const'
import { $Table, $icon, $infoLabel, ISortBy, ScrollRequest, TableColumn } from "gmx-middleware-ui-components"
import { IAbstractPositionParams, IPositionListSummary, factor, getMappedValue, groupArrayMany, pagingQuery, readableLeverage, readablePercentage, switchMap, unixTimestampNow } from "gmx-middleware-utils"
import { ROUTE_DESCRIPTION } from "puppet-middleware-const"
import { IMirrorPositionListSummary, IPositionMirrorSettled, IPuppetRouteSubscritpion, getRouteTypeKey, summariesMirrorTrader } from "puppet-middleware-utils"
import * as viem from "viem"
import { $labelDisplay } from "../../common/$TextField.js"
import { $TraderDisplay, $pnlValue, $route, $size } from "../../common/$common.js"
import { $DropMultiSelect } from "../../components/form/$Dropdown.js"
import { puppetsColumn } from "../../components/table/$TableColumn.js"
import { $ProfilePerformanceGraph } from "../../components/trade/$ProfilePerformanceGraph.js"
import { IGmxProcessState } from "../../data/process/process.js"
import * as store from "../../data/store/store.js"
import { rootStoreScope } from "../../data/store/store.js"
import { $card } from "../../common/elements/$common.js"
import * as storage from "../../utils/storage/storeScope.js"
import { $seperator2 } from "../common.js"
import { $LastAtivity, LAST_ACTIVITY_LABEL_MAP } from "../components/$LastActivity.js"
import { $puppetLogo } from "../../common/$icons"




export type ITopSettled = {
  route: router.Route
  processData: Stream<IGmxProcessState>
  subscriptionList: Stream<IPuppetRouteSubscritpion[]>
}

type FilterTable =  { activityTimeframe: GMX.IntervalTime } | null

export const $TopSettled = (config: ITopSettled) => component((
  [routeTypeChange, routeTypeChangeTether]: Behavior<IAbstractPositionParams[]>,
  [modifySubscriber, modifySubscriberTether]: Behavior<IPuppetRouteSubscritpion>,
  
  [scrollRequest, scrollRequestTether]: Behavior<ScrollRequest>,
  [sortByChange, sortByChangeTether]: Behavior<ISortBy<IPositionListSummary>>,
  [changeActivityTimeframe, changeActivityTimeframeTether]: Behavior<GMX.IntervalTime>,
  [routeChange, routeChangeTether]: Behavior<any, string>,

  [openFilterPopover, openFilterPopoverTether]: Behavior<any>,

) => {


  const exploreStore = storage.createStoreScope(rootStoreScope, 'topSettled' as const)
  const sortBy = storage.replayWrite(exploreStore, { direction: 'desc', selector: 'pnl' } as ISortBy<IPositionListSummary>, sortByChange, 'sortBy')
  const routeList = map(list => list.map(rt => {
    const matchedMemType = ROUTE_DESCRIPTION.find(rtd => getRouteTypeKey(rt.collateralToken, rt.indexToken, rt.isLong) === getRouteTypeKey(rtd.collateralToken, rtd.indexToken, rtd.isLong))

    if (!matchedMemType) {
      throw new Error(`Route type not found for ${rt.collateralToken} ${rt.indexToken} ${rt.isLong}`)
    }

    return matchedMemType
  }), storage.replayWrite(exploreStore, [] as IAbstractPositionParams[], routeTypeChange, 'filterRouteList'))

  const activityTimeframe = storage.replayWrite(store.activityTimeframe, GMX.TIME_INTERVAL_MAP.MONTH, changeActivityTimeframe)

  const pageParms = map(params => {
    const requestPage = { ...params.sortBy, offset: 0, pageSize: 20 }
    const paging = startWith(requestPage, scrollRequest)

    const dataSource =  map(req => {
      const filterStartTime = unixTimestampNow() - params.activityTimeframe

      const flattenMapMap = params.data.mirrorPositionSettled
        .filter(pos => {
          // if (pos.route === GMX.ADDRESS_ZERO) {
          //   return false
          // }

          const routeLength = params.routeList.length
          if (routeLength && params.routeList.findIndex(rt => getRouteTypeKey(rt.collateralToken, rt.indexToken, rt.isLong) === pos.routeTypeKey) === -1) {
            return false
          }

          return pos.blockTimestamp > filterStartTime
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
    $column(


      $card(layoutSheet.spacingBig, style({ flex: 1 }))(

        $row(layoutSheet.spacingBig, style({ placeContent: 'space-between', alignItems: 'center' }))(

          $element('a')(
            layoutSheet.spacingSmall,
            attr({ href: 'https://x.com/PuppetCopy' }),
            style({ display: 'flex', alignItems: 'center', color: pallete.message, textDecoration: 'none' })
          )(
            $infoLabel('Powered by '),
            $row(layoutSheet.spacingTiny, style({ alignItems: 'center' }))(
              $icon({ $content: $puppetLogo, width: '25px', viewBox: '0 0 32 32' }),
              $text('Puppet')
            ),
          ),
          // $DropMultiSelect({
          //   // $container: $row(layoutSheet.spacingTiny, style({ display: 'flex', position: 'relative' })),
          //   $input: $element('input')(style({ width: '100px' })),
          //   $label: $labelDisplay(style({ color: pallete.foreground }))('Markets'),
          //   placeholder: 'All / Select',
          //   $$chip: map(rt => $route(rt)),
          //   selector: {
          //     list: ROUTE_DESCRIPTION,
          //     $$option: map(route => {
          //       return style({
          //         padding: '8px'
          //       }, $route(route))
          //     })
          //   },
          //   value: routeList
          // })({
          //   select: routeTypeChangeTether()
          // }),

          // $Popover({
          //   $target: $ButtonSecondary({
          //     $container: $defaultMiniButtonSecondary,
          //     $content: $text('Filter'),
          //   })({
          //     click: openFilterPopoverTether()
          //   }),
          //   $popContent: map(() => {

          //     return $column(layoutSheet.spacingBig, style({ width: '410px' }))(
          //       $row(
          //         $DropMultiSelect({
          //           $label: $labelDisplay(style({ color: pallete.foreground }))('Route'),
          //           placeholder: 'All / Select',
          //           $$chip: map(rt => {
          //             return $route(rt)
          //           }),
          //           selector: {
          //             list: ROUTE_DESCRIPTION,
          //             $$option: map(route => {
          //               return style({
          //                 padding: '8px'
          //               }, $route(route))
          //             })
          //           },
          //           value: routeList
          //         })({
          //           select: routeTypeChangeTether()
          //         }),
          //       )
          //     )
          //   }, openFilterPopover)
          // })({}),
          
          style({ flexDirection: screenUtils.isDesktopScreen ? 'row': 'column' })(
            $LastAtivity(activityTimeframe)({
              changeActivityTimeframe: changeActivityTimeframeTether()
            })
          ),
        ),
    
        switchMap(params => {


          const columns: TableColumn<IMirrorPositionListSummary & { trader: viem.Address, settledTradeList: IPositionMirrorSettled[] }>[] = [
            {
              $head: $text('Trader'),
              gridTemplate: '150px',
              columnOp: style({ alignItems: 'center' }),
              $bodyCallback: map(pos => {

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
                  $bodyCallback: map((pos: IMirrorPositionListSummary) => {
                    return $row(
                      $text(`${pos.winCount} / ${pos.lossCount}`)
                    )
                  })
                },
                // puppetsColumn(routeChangeTether),
              ]
              : [],
            {
              $head: $column(style({ textAlign: 'right' }))(
                $text('Size'),
                $text(style({ fontSize: '.85rem' }))('Leverage'),
              ),
              sortBy: 'size',
              columnOp: style({ placeContent: 'flex-end' }),
              $bodyCallback: map((pos) => {
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
              $bodyCallback: map(pos => {

                return $column(layoutSheet.spacingTiny, style({ textAlign: 'right' }))(
                  $pnlValue(pos.pnl),
                  $seperator2,
                  $text(style({ fontSize: '.85rem' }))(
                    readableLeverage(pos.size, pos.collateral)
                  ),
                )
              })
            },
            ...screenUtils.isDesktopScreen
              ? [
                {
                  $head: $text(`Last ${getMappedValue(LAST_ACTIVITY_LABEL_MAP, params.activityTimeframe)} activity`),
                  gridTemplate: '160px',
                  columnOp: style({ alignItems: 'center', placeContent: 'center' }),
                  $bodyCallback: map((pos: IMirrorPositionListSummary & { trader: viem.Address, settledTradeList: IPositionMirrorSettled[]}) => {
                    
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






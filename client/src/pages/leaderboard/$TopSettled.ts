import { Behavior, combineObject } from "@aelea/core"
import { $element, $text, component, style } from "@aelea/dom"
import * as router from '@aelea/router'
import { $column, $row, layoutSheet, screenUtils } from "@aelea/ui-components"
import { pallete } from "@aelea/ui-components-theme"
import { empty, map, startWith } from "@most/core"
import { Stream } from "@most/types"
import * as GMX from 'gmx-middleware-const'
import { $ButtonToggle, $Table, $bear, $bull, $icon, $marketLabel, ISortBy, ScrollRequest, TableColumn, TablePageResponse } from "gmx-middleware-ui-components"
import { IMarketCreatedEvent, IPositionListSummary, getBasisPoints, getMappedValue, groupArrayMany, pagingQuery, readablePercentage, switchMap, unixTimestampNow } from "gmx-middleware-utils"
import { IMirrorPositionListSummary, IPositionMirrorSettled, IPuppetRouteSubscritpion, summariesMirrorTrader } from "puppet-middleware-utils"
import * as viem from "viem"
import { $labelDisplay } from "../../common/$TextField.js"
import { $TraderDisplay, $TraderRouteDisplay, $pnlValue, $size } from "../../common/$common.js"
import { $card } from "../../common/elements/$common.js"
import { $DropMultiSelect } from "../../components/form/$Dropdown.js"
import { $tableHeader } from "../../components/table/$TableColumn.js"
import { $ProfilePerformanceGraph } from "../../components/trade/$ProfilePerformanceGraph.js"
import { IGmxProcessState } from "../../data/process/process.js"
import { rootStoreScope } from "../../data/store/store.js"
import * as storage from "../../utils/storage/storeScope.js"
import { $seperator2 } from "../common.js"
import { $LastAtivity, LAST_ACTIVITY_LABEL_MAP } from "../components/$LastActivity.js"




export type ITopSettled = {
  route: router.Route
  processData: Stream<IGmxProcessState>
  subscriptionList: Stream<IPuppetRouteSubscritpion[]>
}

type FilterTable =  { activityTimeframe: GMX.IntervalTime } | null

export const $TopSettled = (config: ITopSettled) => component((
  [modifySubscriber, modifySubscriberTether]: Behavior<IPuppetRouteSubscritpion>,
  
  [scrollRequest, scrollRequestTether]: Behavior<ScrollRequest>,
  [sortByChange, sortByChangeTether]: Behavior<ISortBy<IPositionListSummary>>,
  [changeActivityTimeframe, changeActivityTimeframeTether]: Behavior<GMX.IntervalTime>,
  [routeChange, routeChangeTether]: Behavior<any, string>,
  [changeMarket, changeMarketTether]: Behavior<IMarketCreatedEvent[]>,
  [switchIsLong, switchIsLongTether]: Behavior<boolean | null>,

  [openFilterPopover, openFilterPopoverTether]: Behavior<any>,
) => {

  const marketList = map(pd => Object.values(pd.marketMap).filter(market => market.indexToken !== GMX.ADDRESS_ZERO), config.processData)

  const exploreStore = storage.createStoreScope(rootStoreScope, 'topSettled' as const)
  const sortBy = storage.replayWrite(exploreStore, { direction: 'desc', selector: 'pnl' } as ISortBy<IPositionListSummary>, sortByChange, 'sortBy')
  const filterMarketMarketList = storage.replayWrite(exploreStore, [], changeMarket, 'filterMarketMarketList')
  const isLong = storage.replayWrite(exploreStore, null, switchIsLong, 'isLong')
  const activityTimeframe = storage.replayWrite(exploreStore, GMX.TIME_INTERVAL_MAP.MONTH, changeActivityTimeframe, 'activityTimeframe')

  const pageParms = map(params => {
    const requestPage = { ...params.sortBy, offset: 0, pageSize: 20 }
    const paging = startWith(requestPage, scrollRequest)

    const dataSource: Stream<TablePageResponse<IMirrorPositionListSummary>> =  map(req => {
      const filterStartTime = unixTimestampNow() - params.activityTimeframe

      const flattenMapMap = params.data.mirrorPositionSettled.filter(pos => {
        if (params.isLong !== null && params.isLong !== pos.isLong) {
          return false
        }

        if (params.filterMarketMarketList.length && params.filterMarketMarketList.findIndex(rt => rt.indexToken === pos.indexToken) === -1) {
          return false
        }

        return pos.blockTimestamp > filterStartTime
      })
      const tradeListMap = groupArrayMany(flattenMapMap, a => a.routeTypeKey)
      const tradeListEntries = Object.values(tradeListMap)
      const filterestPosList = tradeListEntries.map(settledTradeList => {
        return summariesMirrorTrader(settledTradeList)
      })

      return pagingQuery({ ...params.sortBy, ...req }, filterestPosList)
    }, paging)


    return { ...params, dataSource }
  }, combineObject({ data: config.processData, sortBy, activityTimeframe, filterMarketMarketList, isLong }))



  return [
    $column(style({ width: '100%' }))(


      $card(layoutSheet.spacingBig, style({ flex: 1 }))(

        $row(layoutSheet.spacingBig, style({ placeContent: 'space-between', alignItems: 'flex-start' }))(
          switchMap(params => {

            return $DropMultiSelect({
            // $container: $row(layoutSheet.spacingTiny, style({ display: 'flex', position: 'relative' })),
              $input: $element('input')(style({ width: '100px' })),
              $label: $labelDisplay(style({ color: pallete.foreground }))('Markets'),
              placeholder: 'All / Select',
              $$chip: map(rt => $marketLabel(rt, false)),
              selector: {
                list: params.marketList,
                $$option: map(mkt => {
                  return style({
                    padding: '8px'
                  }, $marketLabel(mkt))
                })
              },
              value: filterMarketMarketList
            })({
              select: changeMarketTether()
            })
          }, combineObject({ marketList })),

          $ButtonToggle({
            // $container: $row(layoutSheet.spacingSmall),
            selected: isLong,
            options: [
              null,
              true,
              false,
            ],
            $$option: map(il => {
              return $row(layoutSheet.spacingTiny, style({ alignItems: 'center' }))(
                il === null
                  ? empty()
                  : $icon({ $content: il ? $bull : $bear, width: '18px', viewBox: '0 0 32 32' }),
                $text(il === null ? 'All' : il ? 'Long' : 'Short'),
              )
            })
          })({
            select: switchIsLongTether()
          }),

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



          const columns: TableColumn<IMirrorPositionListSummary>[] = [
            {
              $head: $text('Trade Route'),
              gridTemplate: '144px',
              // columnOp: style({ placeContent: 'flex-end' }),
              $bodyCallback: map(pos => {

                return $TraderRouteDisplay({
                  positionParams: pos.settledTradeList[0],
                  trader: pos.trader,
                  routeTypeKey: "0x93cb002897c6c7abbfb8c989a4a7ff330281ef970b11063800469e7ea87f063d",
                  subscriptionList: config.subscriptionList,
                })({
                  modifySubscribeList: modifySubscriberTether()
                })
              })
            },
            {
              $head: $text('Trader'),
              gridTemplate: 'minmax(95px, 100px)',
              columnOp: style({ alignItems: 'center' }),
              $bodyCallback: map(pos => {

                return $TraderDisplay({
                  route: config.route,
                  trader: pos.trader,
                })({ 
                  clickTrader: routeChangeTether()
                })
              })
            },
            
            
            ...screenUtils.isDesktopScreen
              ? [
                
                {
                  $head: $text('Win / Loss'),
                  gridTemplate: '90px',
                  columnOp: style({ alignItems: 'center', placeContent: 'center' }),
                  $bodyCallback: map((pos: IMirrorPositionListSummary) => {
                    return $row(
                      $text(`${pos.winCount} / ${pos.lossCount}`)
                    )
                  })
                },
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
              $head: $tableHeader('PnL $', 'ROI %'),
              gridTemplate: '90px',
              sortBy: 'pnl',
              columnOp: style({ placeContent: 'flex-end' }),
              $bodyCallback: map(mp => {

                return $column(layoutSheet.spacingTiny, style({ textAlign: 'right' }))(
                  $pnlValue(mp.pnl),
                  $seperator2,
                  $text(style({ fontSize: '.85rem' }))(readablePercentage(getBasisPoints(mp.pnl, mp.collateral))),
                )
              })
            },
            
            ...screenUtils.isDesktopScreen
              ? [
                {
                  columnOp: style({ placeContent: 'flex-end' }),
                  $head: $text(`Last ${getMappedValue(LAST_ACTIVITY_LABEL_MAP, params.activityTimeframe)} activity`),
                  gridTemplate: '140px',
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






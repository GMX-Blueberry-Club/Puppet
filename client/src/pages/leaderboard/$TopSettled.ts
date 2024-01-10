import { Behavior, combineObject } from "@aelea/core"
import { $element, $text, component, style } from "@aelea/dom"
import * as router from '@aelea/router'
import { $column, $row, layoutSheet, screenUtils } from "@aelea/ui-components"
import { pallete } from "@aelea/ui-components-theme"
import { awaitPromises, empty, map, now, startWith, take } from "@most/core"
import { Stream } from "@most/types"
import * as GMX from 'gmx-middleware-const'
import { $ButtonToggle, $Table, $bear, $bull, $icon, $marketLabel, ISortBy, ScrollRequest, TableColumn, TablePageResponse } from "gmx-middleware-ui-components"
import { IMarketCreatedEvent, IPriceTickListMap, TEMP_MARKET_LIST, getBasisPoints, getMappedValue, groupArrayMany, pagingQuery, querySignedPrices, readablePercentage, switchMap, unixTimestampNow } from "gmx-middleware-utils"
import { IMirrorPositionListSummary, IMirrorPositionOpen, IMirrorPositionSettled, accountSettledPositionListSummary, latestPriceMap, openPositionListPnl, queryLatestPriceTick, queryOpenPositionList, querySettledPositionList } from "puppet-middleware-utils"
import * as viem from "viem"
import { $labelDisplay } from "../../common/$TextField.js"
import { $TraderDisplay, $TraderRouteDisplay, $pnlValue, $puppets, $size } from "../../common/$common.js"
import { $card, $responsiveFlex } from "../../common/elements/$common.js"
import { $DropMultiSelect } from "../../components/form/$Dropdown.js"
import { IChangeSubscription } from "../../components/portfolio/$RouteSubscriptionEditor"
import { $tableHeader } from "../../components/table/$TableColumn.js"
import { $ProfilePerformanceGraph } from "../../components/trade/$ProfilePerformanceGraph.js"
import * as storage from "../../utils/storage/storeScope.js"
import { $seperator2 } from "../common.js"
import { $LastAtivity, LAST_ACTIVITY_LABEL_MAP } from "../components/$LastActivity.js"
import * as storeDb from "../../data/store/store.js"


export type ITopSettled = {
  route: router.Route
}


type ITableRow = {
  summary: IMirrorPositionListSummary
  account: viem.Address
  openPositionList: IMirrorPositionOpen[]
  settledPositionList: IMirrorPositionSettled[]
  positionList: (IMirrorPositionSettled | IMirrorPositionOpen)[]
  pricefeedMap: IPriceTickListMap
}

export const $TopSettled = (config: ITopSettled) => component((
  [modifySubscriber, modifySubscriberTether]: Behavior<IChangeSubscription>,
  
  [scrollRequest, scrollRequestTether]: Behavior<ScrollRequest>,
  [sortByChange, sortByChangeTether]: Behavior<ISortBy>,
  [changeActivityTimeframe, changeActivityTimeframeTether]: Behavior<GMX.IntervalTime>,
  [routeChange, routeChangeTether]: Behavior<any, string>,
  [changeMarket, changeMarketTether]: Behavior<IMarketCreatedEvent[]>,
  [switchIsLong, switchIsLongTether]: Behavior<boolean | null>,

  [openFilterPopover, openFilterPopoverTether]: Behavior<any>,
) => {

  const marketList = now(TEMP_MARKET_LIST)

  const activityTimeframe = storage.replayWrite(storeDb.store.global, changeActivityTimeframe, 'activityTimeframe')

  const sortBy = storage.replayWrite(storeDb.store.leaderboard, sortByChange, 'sortBy')
  const filterMarketMarketList = storage.replayWrite(storeDb.store.leaderboard, changeMarket, 'filterMarketMarketList')
  const isLong = storage.replayWrite(storeDb.store.leaderboard, switchIsLong, 'isLong')


  const pageParms = map(params => {
    const requestPage = { ...params.sortBy, offset: 0, pageSize: 20 }
    const paging = startWith(requestPage, scrollRequest)

    const dataSource: Stream<TablePageResponse<ITableRow>> = awaitPromises(map(async req => {
      const latestPriceTickQuery = queryLatestPriceTick({ activityTimeframe: params.activityTimeframe })
      const openPositionListQuery = queryOpenPositionList()
      const settledPositionListQuery = querySettledPositionList()
      const openPositionList = await openPositionListQuery
      const settledPositionList = await settledPositionListQuery
      const pricefeedMap = await latestPriceTickQuery
      const allPositionList = [...openPositionList, ...settledPositionList]
      const filterStartTime = unixTimestampNow() - params.activityTimeframe

      const filteredList = allPositionList.filter(mp => {
        if (params.isLong !== null && params.isLong !== mp.position.isLong) {
          return false
        }

        if (params.filterMarketMarketList.length && params.filterMarketMarketList.findIndex(rt => rt.indexToken === mp.position.indexToken) === -1) {
          return false
        }

        if (mp.__typename === 'MirrorPositionOpen') {
          return true
        }

        return mp.blockTimestamp > filterStartTime
      })
      const tradeListMap = groupArrayMany(filteredList, a => a.tradeRouteKey)
      const tradeListEntries = Object.values(tradeListMap)
      const filterestPosList: ITableRow[] = tradeListEntries.map(positionList => {
        const summary = accountSettledPositionListSummary(positionList)

        return { account: positionList[0].trader, summary, openPositionList, settledPositionList, positionList, pricefeedMap }
      })

      return pagingQuery({ ...params.sortBy, ...req }, filterestPosList)
    }, paging))


    return { ...params, dataSource }
  }, combineObject({ sortBy, activityTimeframe, filterMarketMarketList, isLong, latestPriceMap: take(1, latestPriceMap) }))



  return [
    $column(style({ width: '100%' }))(


      $card(layoutSheet.spacingBig, style({ flex: 1 }))(

        $responsiveFlex(layoutSheet.spacingBig, style({ placeContent: 'space-between', alignItems: 'flex-start' }))(
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
          
          $LastAtivity(activityTimeframe)({
            changeActivityTimeframe: changeActivityTimeframeTether()
          }),
        ),
    
        switchMap(params => {

          const columns: TableColumn<ITableRow>[] = [
            {
              $head: $text('Trade Route'),
              gridTemplate: screenUtils.isDesktopScreen ? '114px' : '114px',
              // columnOp: style({ placeContent: 'flex-end' }),
              $bodyCallback: map(pos => {

                return $TraderRouteDisplay({
                  summary: pos.summary,
                  trader: pos.account,
                  tradeRoute: pos.positionList[0].tradeRoute,
                  positionParams: pos.positionList[0].position,
                  routeTypeKey: pos.positionList[0].routeTypeKey,
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
                  trader: pos.account,
                })({ 
                  clickTrader: routeChangeTether()
                })
              })
            },
            
            
            ...screenUtils.isDesktopScreen
              ? [
                // {
                //   $head: $text('Puppets'),
                //   gridTemplate: '90px',
                //   $bodyCallback: map((pos: ITableRow) => {
                //     return $puppets(pos.summary.puppets, routeChangeTether)
                //   })
                // },
                {
                  $head: $text('Win / Loss'),
                  gridTemplate: '90px',
                  columnOp: style({ alignItems: 'center', placeContent: 'center' }),
                  $bodyCallback: map((pos: ITableRow) => {
                    return $row(
                      $text(`${pos.summary.winCount} / ${pos.summary.lossCount}`)
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
                return $size(pos.summary.size, pos.summary.collateral)
              })
            },
            
            {
              $head: $tableHeader('PnL $', 'ROI %'),
              gridTemplate: screenUtils.isDesktopScreen ? '120px' : '80px',
              sortBy: 'pnl',
              columnOp: style({ placeContent: 'flex-end' }),
              $bodyCallback: map(tr => {
                const pnl = map(openPnl => tr.summary.pnl + openPnl, openPositionListPnl(tr.openPositionList))

                return $column(layoutSheet.spacingTiny, style({ textAlign: 'right' }))(
                  $pnlValue(pnl),
                  $seperator2,
                  $text(style({ fontSize: '.85rem' }))(
                    map(pnl => {
                      return readablePercentage(getBasisPoints(pnl, tr.summary.collateral))
                    }, pnl)
                  ),
                )
              })
            },
            
            ...screenUtils.isDesktopScreen
              ? [
                {
                  columnOp: style({ placeContent: 'flex-end' }),
                  $head: $text(`Last ${getMappedValue(LAST_ACTIVITY_LABEL_MAP, params.activityTimeframe)} activity`),
                  gridTemplate: '140px',
                  $bodyCallback: map((pos: ITableRow) => {
                    
                    return screenUtils.isDesktopScreen
                      ? $ProfilePerformanceGraph({
                        $container: $row(style({ position: 'relative',  width: `180px`, height: `80px`, margin: '-16px 0' })),
                        tickCount: 50,
                        priceTickMap: pos.pricefeedMap,
                        openPositionList: pos.openPositionList,
                        settledPositionList: pos.settledPositionList,
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






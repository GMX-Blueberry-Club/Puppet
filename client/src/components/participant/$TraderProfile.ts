import { Behavior, combineObject } from "@aelea/core"
import { $text, component, style } from "@aelea/dom"
import { $column, layoutSheet, screenUtils } from "@aelea/ui-components"
import { map, startWith } from "@most/core"
import { IntervalTime, pagingQuery } from "common-utils"
import { ISetRouteType } from "puppet-middleware-utils"
import { $IntermediatePromise, $Table, $infoLabel, ScrollRequest } from "ui-components"
import { $card, $card2 } from "../../common/elements/$common.js"
import { IPageUserParams } from "../../const/type.js"
import { IChangeSubscription } from "../portfolio/$RouteSubscriptionEditor"
import { entryColumn, pnlColumn, positionTimeColumn, puppetsColumn, settledSizeColumn } from "../table/$TableColumn.js"
import { $ProfilePeformanceTimeline } from "./$ProfilePeformanceTimeline.js"


export const $TraderProfile = (
  config: IPageUserParams
) => component((
  [changeRoute, changeRouteTether]: Behavior<any, string>,
  [scrollRequest, scrollRequestTether]: Behavior<ScrollRequest>,

  [changeActivityTimeframe, changeActivityTimeframeTether]: Behavior<any, IntervalTime>,
  [selectTradeRouteList, selectTradeRouteListTether]: Behavior<ISetRouteType[]>,

  [modifySubscribeList, modifySubscribeListTether]: Behavior<IChangeSubscription>,
  [popRouteSubscriptionEditor, popRouteSubscriptionEditorTether]: Behavior<any, bigint>,

) => {

  const { activityTimeframe, selectedTradeRouteList, address, priceTickMapQuery, route, routeTypeListQuery, settledPositionListQuery, openPositionListQuery } = config


  const positionListQuery = map(async (params) => {
    const openPositionList = await params.openPositionListQuery
    const settledPositionList = await params.settledPositionListQuery
    const allPositions = [...openPositionList, ...settledPositionList]
    const routeTypeList = await params.routeTypeListQuery

    return { allPositions, openPositionList, settledPositionList, routeTypeList }
  }, combineObject({ settledPositionListQuery, openPositionListQuery, routeTypeListQuery }))

  return [
    $column(layoutSheet.spacingBig)(
      $card(layoutSheet.spacingBig, style({ flex: 1, width: '100%' }))(
        $card2(style({ padding: 0, height: screenUtils.isDesktopScreen ? '200px' : '200px', position: 'relative', margin: screenUtils.isDesktopScreen ? `-36px -36px 0` : `-12px -12px 0px` }))(
          $ProfilePeformanceTimeline(config)({
            selectTradeRouteList: selectTradeRouteListTether(),
            changeActivityTimeframe: changeActivityTimeframeTether(),
          })
        ),

        $IntermediatePromise({
          query: positionListQuery,
          $$done: map(params => {
            if (params.allPositions.length === 0) {
              // const fstRouteType = params.routeTypeList[0]
              // const tradeRoute = getTradeRouteKey(address, fstRouteType.collateralToken, fstRouteType.indexToken, fstRouteType.isLong)

              return $column(layoutSheet.spacingSmall)(
                $text('No active positions found'),
                $infoLabel(`Try changing the timeframe or selecting a different trade route`),
                
                // $Popover({
                //   open: map((expiry) => {
                //     return  $RouteSubscriptionEditor({ expiry: 0n, trader: address, tradeRoute: tradeRoute, routeTypeList: params.routeTypeList, routeTypeKey: params.routeTypeList[0].routeTypeKey })({
                //       modifySubscribeList: modifySubscribeListTether()
                //     }) 
                //   }, popRouteSubscriptionEditor),
                //   dismiss: modifySubscribeList,
                //   $target: $column(
                //     $text('You can still subscribe to this trader to mirror their trades in the future'),
                //     $ButtonSecondary({
                //       $content: $row(layoutSheet.spacingTiny, style({ alignItems: 'center' }))(
                //         $text('Mirror'),
                //         $icon({ $content: $puppetLogo, width: '26px', svgOps: style({ backgroundColor: pallete.background, borderRadius: '50%', padding: '4px', border: `1px solid ${pallete.message}`, marginRight: '-18px' }), viewBox: '0 0 32 32' }),
                //       ),
                //       $container: $defaultMiniButtonSecondary(style({ borderRadius: '16px' })) 
                //     })({
                //       click: popRouteSubscriptionEditorTether()
                //     })
                //   )
                // })({}),
              )
            }

            const paging = startWith({ offset: 0, pageSize: 20 }, scrollRequest)
            const dataSource = map(req => {
              return pagingQuery(req, params.allPositions)
            }, paging)

            return $Table({
              dataSource,
              columns: [
                ...screenUtils.isDesktopScreen ? [positionTimeColumn] : [],
                entryColumn,
                puppetsColumn(changeRouteTether),
                settledSizeColumn(),
                pnlColumn(),
              ],
            })({
              scrollRequest: scrollRequestTether()
            })
          })
        })({}),
        // $column(layoutSheet.spacingBig)(
        //   $column(layoutSheet.spacingSmall)(
        //     $heading3('Open Positions'),


        //     switchLatest(awaitPromises(
        //       map(async params => {
        //         const openPositionList = await params.openPositionListQuery
        //         if (openPositionList.length === 0) {
        //           return $column(
        //             $text(style({ color: pallete.foreground }))('No open positions')
        //           )
        //         }

        //         return $Table({
        //           dataSource: now(openPositionList),
        //           columns: [
        //             ...screenUtils.isDesktopScreen ? [positionTimeColumn] : [],
        //             entryColumn,
        //             puppetsColumn(changeRouteTether),
        //             slotSizeColumn(),
        //             pnlSlotColumn(),
        //           ],
        //         })({
        //           // scrollIndex: changePageIndexTether()
        //         })
        //       }, combineObject({ openPositionListQuery }))
        //     ))
        //   ),

        //   $column(layoutSheet.spacingSmall)(
        //     $heading3('Positions'),

       
            
        //   )
        // ),
      ),
    ),
    { changeRoute, changeActivityTimeframe, selectTradeRouteList, modifySubscribeList }
  ]
})



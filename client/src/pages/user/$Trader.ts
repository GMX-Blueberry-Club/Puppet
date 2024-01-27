import { Behavior, combineObject } from "@aelea/core"
import { $text, component, style } from "@aelea/dom"
import { $column, layoutSheet, screenUtils } from "@aelea/ui-components"
import { map, startWith } from "@most/core"
import { IntervalTime, pagingQuery } from "common-utils"
import { ISetRouteType } from "puppet-middleware-utils"
import { $IntermediatePromise, $Table, $infoLabel, ScrollRequest } from "ui-components"
import { $card, $card2 } from "../../common/elements/$common.js"
import { IUserUserParams } from "../../const/type.js"
import { IChangeSubscription } from "../../components/portfolio/$RouteSubscriptionEditor.js"
import { entryColumn, pnlColumn, positionTimeColumn, puppetsColumn, settledSizeColumn } from "../../components/table/$TableColumn.js"
import { $ProfilePeformanceTimeline } from "../../components/participant/$ProfilePeformanceTimeline.js"


export const $TraderPage = (
  config: IUserUserParams
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
          $ProfilePeformanceTimeline({ ...config })({
            selectTradeRouteList: selectTradeRouteListTether(),
            changeActivityTimeframe: changeActivityTimeframeTether(),
          })
        ),

        $IntermediatePromise({
          query: positionListQuery,
          $$done: map(params => {
            if (params.allPositions.length === 0) {
              return $column(layoutSheet.spacingSmall)(
                $text('No active positions found'),
                $infoLabel(`Try changing the timeframe or selecting a different trade route`),
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
      ),
    ),
    { changeRoute, changeActivityTimeframe, selectTradeRouteList, modifySubscribeList }
  ]
})



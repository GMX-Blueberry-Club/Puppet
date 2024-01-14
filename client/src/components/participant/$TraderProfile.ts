import { Behavior, combineObject } from "@aelea/core"
import { $text, component, style } from "@aelea/dom"
import { $column, layoutSheet, screenUtils } from "@aelea/ui-components"
import { pallete } from "@aelea/ui-components-theme"
import { awaitPromises, map, now, startWith, switchLatest } from "@most/core"
import * as GMX from 'gmx-middleware-const'
import { $Table, ScrollRequest } from "gmx-middleware-ui-components"
import { pagingQuery } from "gmx-middleware-utils"
import { MouseEventParams } from "lightweight-charts"
import { ISetRouteType } from "puppet-middleware-utils"
import { $heading3 } from "../../common/$text.js"
import { $card, $card2 } from "../../common/elements/$common.js"
import { IPageUserParams } from "../../data/type.js"
import { entryColumn, pnlSlotColumn, positionTimeColumn, puppetsColumn, settledPnlColumn, settledSizeColumn, slotSizeColumn } from "../table/$TableColumn.js"
import { $PositionListPerformance } from "./$PositionListPerformance.js"


export const $TraderProfile = (
  config: IPageUserParams
) => component((
  [changeRoute, changeRouteTether]: Behavior<any, string>,
  [scrollRequest, scrollRequestTether]: Behavior<ScrollRequest>,
  [crosshairMove, crosshairMoveTether]: Behavior<MouseEventParams>,

  [changeActivityTimeframe, changeActivityTimeframeTether]: Behavior<any, GMX.IntervalTime>,
  [selectTradeRouteList, selectTradeRouteListTether]: Behavior<ISetRouteType[]>,
) => {

  const { activityTimeframe, selectedTradeRouteList, address, priceTickMapQuery, route, routeTypeListQuery, settledPositionListQuery, openPositionListQuery } = config


  return [
    $column(layoutSheet.spacingBig)(
      $card(layoutSheet.spacingBig, style({ flex: 1, width: '100%' }))(
        $card2(style({ padding: 0, height: screenUtils.isDesktopScreen ? '200px' : '200px', position: 'relative', margin: screenUtils.isDesktopScreen ? `-36px -36px 0` : `-12px -12px 0px` }))(
          $PositionListPerformance(config)({
            selectTradeRouteList: selectTradeRouteListTether(),
            changeActivityTimeframe: changeActivityTimeframeTether(),
          })
        ),
        $column(layoutSheet.spacingBig)(
          $column(layoutSheet.spacingSmall)(
            $heading3('Open Positions'),

            switchLatest(awaitPromises(
              map(async params => {
                const openPositionList = await params.openPositionListQuery
                if (openPositionList.length === 0) {
                  return $column(
                    $text(style({ color: pallete.foreground }))('No open positions')
                  )
                }

                return $Table({
                  dataSource: now(openPositionList),
                  columns: [
                    ...screenUtils.isDesktopScreen ? [positionTimeColumn] : [],
                    entryColumn,
                    puppetsColumn(changeRouteTether),
                    slotSizeColumn(),
                    pnlSlotColumn(),
                  ],
                })({
                  // scrollIndex: changePageIndexTether()
                })
              }, combineObject({ openPositionListQuery }))
            ))
          ),

          $column(layoutSheet.spacingSmall)(
            $heading3('Settled Positions'),

            switchLatest(awaitPromises(map(async params => {
              const settledPositionList = await params.settledPositionListQuery

              if (settledPositionList.length === 0) {
                return $text(style({ color: pallete.foreground }))(`no settled positions found`)
              }

              const paging = startWith({ offset: 0, pageSize: 20 }, scrollRequest)
              const dataSource = map(req => {
                return pagingQuery(req, settledPositionList)
              }, paging)

              return $Table({
                dataSource,
                columns: [
                  ...screenUtils.isDesktopScreen ? [positionTimeColumn] : [],
                  entryColumn,
                  puppetsColumn(changeRouteTether),
                  settledSizeColumn(),
                  settledPnlColumn(),
                ],
              })({
                scrollRequest: scrollRequestTether()
              })
            }, combineObject({ settledPositionListQuery, activityTimeframe }))))
            
          )

        ),
      ),
    ),
    { changeRoute, changeActivityTimeframe, selectTradeRouteList }
  ]
})



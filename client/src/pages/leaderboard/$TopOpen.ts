import { Behavior, O, combineObject } from "@aelea/core"
import { $element, $text, component, style } from "@aelea/dom"
import * as router from '@aelea/router'
import { $column, $row, layoutSheet } from "@aelea/ui-components"
import { pallete } from "@aelea/ui-components-theme"
import { map, startWith } from "@most/core"
import { Stream } from "@most/types"
import * as GMX from 'gmx-middleware-const'
import { $Table, ISortBy, ScrollRequest } from "gmx-middleware-ui-components"
import { IAbstractRouteIdentity, getSlotNetPnL, pagingQuery, switchMap } from "gmx-middleware-utils"
import { ROUTE_DESCRIPTION, getRouteTypeKey } from "puppet-middleware-const"
import { IPositionMirrorSlot, IPuppetRouteSubscritpion } from "puppet-middleware-utils"
import { $labelDisplay } from "../../common/$TextField"
import { $TraderDisplay, $route, $size } from "../../common/$common"
import { $DropMultiSelect } from "../../components/form/$Dropdown"
import { pnlSlotColumn, puppetsColumn, slotSizeColumn } from "../../components/table/$TableColumn"
import { IGmxProcessState } from "../../data/process/process"
import { rootStoreScope } from "../../data/store/store"
import { $card } from "../../elements/$common"
import * as storage from "../../utils/storage/storeScope"



  type IPositionOpen = IPositionMirrorSlot & {
    pnl: bigint
  }

export type ITopOpen = {
  route: router.Route
  subscriptionList: Stream<IPuppetRouteSubscritpion[]>
  processData: Stream<IGmxProcessState>
}


export const $TopOpen = (config: ITopOpen) => component((
  [routeChange, routeChangeTether]: Behavior<string, string>,
  [modifySubscriber, modifySubscriberTether]: Behavior<IPuppetRouteSubscritpion>,
  [sortByChange, sortByChangeTether]: Behavior<ISortBy<IPositionOpen>>,
  [scrollRequest, scrollRequestTether]: Behavior<ScrollRequest>,
  [routeTypeChange, routeTypeChangeTether]: Behavior<IAbstractRouteIdentity[]>,

) => {

  const exploreStore = storage.createStoreScope(rootStoreScope, 'topOpen' as const)


  const sortBy = storage.replayWrite(exploreStore, { direction: 'desc', selector: 'pnl' } as ISortBy<IPositionOpen>, sortByChange, 'sortBy')
  const routeList = map(list => list.map(rt => {
    const matchedMemType = ROUTE_DESCRIPTION.find(rtd => getRouteTypeKey(rt.collateralToken, rt.indexToken, rt.isLong) === getRouteTypeKey(rtd.collateralToken, rtd.indexToken, rtd.isLong))

    if (!matchedMemType) {
      throw new Error(`Route type not found for ${rt.collateralToken} ${rt.indexToken} ${rt.isLong}`)
    }

    return matchedMemType
  }), storage.replayWrite(exploreStore, [] as IAbstractRouteIdentity[], routeTypeChange, 'filterRouteList'))


  const pageParms = map(params => {
    const requestPage = { ...params.sortBy, offset: 0, pageSize: 20 }
    const paging = startWith(requestPage, scrollRequest)

    const dataSource =  map(req => {

      const flattenMapMap = Object.values(params.processData.mirrorPositionSlot)
        .filter(pos => {
          if (pos.route === GMX.ADDRESS_ZERO) {
            return false
          }

          const routeLength = params.routeList.length
          if (routeLength && params.routeList.findIndex(rt => getRouteTypeKey(rt.collateralToken, rt.indexToken, rt.isLong) === pos.routeTypeKey) === -1) {
            return false
          }

          return true
        })
        .map(pos => {
          const marketPrice = params.processData.latestPrice[pos.indexToken]
          const pnl = getSlotNetPnL(pos, marketPrice)

          return { ...pos, pnl }
        })

      return pagingQuery({ ...params.sortBy, ...req }, flattenMapMap as IPositionOpen[])
    }, paging)


    return { ...params, dataSource }
  }, combineObject({ processData: config.processData, sortBy, routeList }))


  return [
    $column(layoutSheet.spacingBig)(


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
          
        ),

        switchMap(params => {


          return $Table({
            dataSource: params.dataSource,
            sortBy: params.sortBy,
            columns: [
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
              puppetsColumn<IPositionOpen>(),
              {
                ...slotSizeColumn(config.processData),
                sortBy: 'size'
              },
              {
                sortBy: 'pnl',
                ...pnlSlotColumn(config.processData),
              },
            ],
          })({
            sortBy: sortByChangeTether(),
            scrollRequest: scrollRequestTether()
          })
        }, pageParms),
    
      ),

      
    ),

    {
      routeChange, modifySubscriber,
    }
  ]
})






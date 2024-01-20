import { Behavior } from "@aelea/core"
import { $node, $text, component, style } from "@aelea/dom"
import { $column, layoutSheet } from "@aelea/ui-components"
import { map } from "@most/core"
import * as GMX from "gmx-middleware-const"
import { $ButtonToggle, $defaulButtonToggleContainer } from "ui-components"
import { switchMap } from "gmx-middleware-utils"
import { ISetRouteType, queryPuppetTradeRoute, queryTraderPositionOpen, queryTraderPositionSettled } from "puppet-middleware-utils"
import { $PuppetPortfolio } from "../components/participant/$PuppetPortfolio"
import { $TraderProfile } from "../components/participant/$TraderProfile.js"
import { IChangeSubscription } from "../components/portfolio/$RouteSubscriptionEditor.js"
import * as storeDb from "../const/store.js"
import { IPageGlobalParams, IProfileMode } from "../const/type.js"
import * as uiStorage from "ui-storage"
import { IWalletClient } from "../wallet/walletLink.js"
import * as router from '@aelea/router'


const optionDisplay = {
  [IProfileMode.PUPPET]: {
    label: 'Puppet',
    url: '/puppet'
  },
  [IProfileMode.TRADER]: {
    label: 'Trader',
    url: '/trader'
  },
}


export const $Wallet = (config: IPageGlobalParams & { wallet: IWalletClient, route: router.Route }) => component((
  [changeRoute, changeRouteTether]: Behavior<string, string>,
  [selectProfileMode, selectProfileModeTether]: Behavior<IProfileMode>,
  [modifySubscriber, modifySubscriberTether]: Behavior<IChangeSubscription>,

  [changeActivityTimeframe, changeActivityTimeframeTether]: Behavior<any, GMX.IntervalTime>,
  [selectTradeRouteList, selectTradeRouteListTether]: Behavior<ISetRouteType[]>,
) => {

  const { wallet, routeTypeListQuery, activityTimeframe, selectedTradeRouteList, priceTickMapQuery } = config

  const profileMode = uiStorage.replayWrite(storeDb.store.wallet, selectProfileMode, 'selectedTab')






  return [

    $column(layoutSheet.spacingBig)(
      $node(),

      $ButtonToggle({
        $container: $defaulButtonToggleContainer(style({ alignSelf: 'center', })),
        selected: profileMode,
        options: [IProfileMode.PUPPET, IProfileMode.TRADER],
        $$option: map(option => {
          return $text(optionDisplay[option].label)
        })
      })({ select: selectProfileModeTether() }),

      switchMap(mode => {
        const address = wallet.account.address
        if (mode === IProfileMode.PUPPET) {
          const puppetTradeRouteListQuery = queryPuppetTradeRoute({ address, activityTimeframe })
          const settledPositionListQuery = map(async tradeRoute => {
            return (await tradeRoute).map(x => x.settledList).flatMap(pp => pp.map(x => x.position))
          }, puppetTradeRouteListQuery)
          const openPositionListQuery = map(async tradeRoute => {
            return (await tradeRoute).map(x => x.openList).flatMap(pp => pp.map(x => x.position))
          }, puppetTradeRouteListQuery)

          return $PuppetPortfolio({
            ...config,
            priceTickMapQuery, openPositionListQuery, settledPositionListQuery, puppetTradeRouteListQuery,
            address, activityTimeframe, selectedTradeRouteList, routeTypeListQuery,
            route: config.route,
          })({
            changeRoute: changeRouteTether(),
            modifySubscriber: modifySubscriberTether(),
            changeActivityTimeframe: changeActivityTimeframeTether(),
            selectTradeRouteList: selectTradeRouteListTether(),
          })
        }
        const settledPositionListQuery = queryTraderPositionSettled({ activityTimeframe, selectedTradeRouteList, address })
        const openPositionListQuery = queryTraderPositionOpen({ address, selectedTradeRouteList })

        return $column(layoutSheet.spacingTiny)(
          $TraderProfile({
            priceTickMapQuery, openPositionListQuery, settledPositionListQuery,
            address, activityTimeframe, selectedTradeRouteList, routeTypeListQuery,
            route: config.route,
          })({

            
            changeActivityTimeframe: changeActivityTimeframeTether(),
          })
        ) 
      }, profileMode)


    ),

    {
      modifySubscriber, changeActivityTimeframe, selectTradeRouteList, changeRoute
    }
  ]
})



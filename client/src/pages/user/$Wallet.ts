import { Behavior, combineObject } from "@aelea/core"
import { $node, $text, component, style } from "@aelea/dom"
import * as router from '@aelea/router'
import { $column, $row, layoutSheet } from "@aelea/ui-components"
import { awaitPromises, map } from "@most/core"
import { disconnect } from "@wagmi/core"
import { ADDRESS_ZERO, IntervalTime, ignoreAll, switchMap } from "common-utils"
import { ISetRouteType, queryPuppetTradeRoute, queryTraderPositionOpen, queryTraderPositionSettled } from "puppet-middleware-utils"
import { $ButtonToggle, $defaulButtonToggleContainer } from "ui-components"
import * as uiStorage from "ui-storage"
import { $IntermediateConnectButton } from "../../components/$ConnectAccount.js"
import { $ButtonSecondary } from "../../components/form/$Button.js"
import { $PuppetPage } from "./$Puppet.js"
import { IChangeSubscription } from "../../components/portfolio/$RouteSubscriptionEditor.js"
import * as storeDb from "../../const/store.js"
import { IPageGlobalParams, IUserType } from "../../const/type.js"
import { walletLink } from "../../wallet/index.js"
import { $TraderPage } from "./$Trader.js"


const optionDisplay = {
  [IUserType.PUPPET]: {
    label: 'Puppet',
    url: '/puppet'
  },
  [IUserType.TRADER]: {
    label: 'Trader',
    url: '/trader'
  },
}


export const $WalletPage = (config: IPageGlobalParams & { route: router.Route }) => component((
  [walletChange, walletChangeTether]: Behavior<any, any>,

  [changeRoute, changeRouteTether]: Behavior<string, string>,
  [selectProfileMode, selectProfileModeTether]: Behavior<IUserType>,
  [modifySubscriber, modifySubscriberTether]: Behavior<IChangeSubscription>,

  [changeActivityTimeframe, changeActivityTimeframeTether]: Behavior<any, IntervalTime>,
  [selectTradeRouteList, selectTradeRouteListTether]: Behavior<ISetRouteType[]>,
) => {

  const { route, routeTypeListQuery, activityTimeframe, selectedTradeRouteList, priceTickMapQuery } = config

  const profileMode = uiStorage.replayWrite(storeDb.store.wallet, selectProfileMode, 'selectedTab')






  return [

    $column(layoutSheet.spacingBig)(
      $node(),

      $row(
        $node(style({ flex: 1 }))(),
        $ButtonToggle({
          $container: $defaulButtonToggleContainer(style({ alignSelf: 'center', })),
          selected: profileMode,
          options: [IUserType.PUPPET, IUserType.TRADER],
          $$option: map(option => {
            return $text(optionDisplay[option].label)
          })
        })({ select: selectProfileModeTether() }),
        $row(style({ flex: 1, placeContent: 'flex-end' }))(
          ignoreAll(walletChange),
          $IntermediateConnectButton({
            $$display: map(wallet => {
              return $ButtonSecondary({
                $content: $text('Disconnect')
              })({
                click: walletChangeTether(
                  map(async xx => {
                    await disconnect(walletLink.wagmiConfig)
                  }),
                  awaitPromises
                )
              })
            })
          })({}),
        ),
      ),

      switchMap(params => {
        const address = params.wallet?.account?.address || ADDRESS_ZERO
        if (params.profileMode === IUserType.PUPPET) {
          const puppetTradeRouteListQuery = queryPuppetTradeRoute({ address, activityTimeframe })
          const settledPositionListQuery = map(async tradeRoute => {
            return (await tradeRoute).map(x => x.settledList).flatMap(pp => pp.map(x => x.position))
          }, puppetTradeRouteListQuery)
          const openPositionListQuery = map(async tradeRoute => {
            return (await tradeRoute).map(x => x.openList).flatMap(pp => pp.map(x => x.position))
          }, puppetTradeRouteListQuery)

          return $PuppetPage({
            route, priceTickMapQuery, openPositionListQuery, settledPositionListQuery, puppetTradeRouteListQuery,
            address, activityTimeframe, selectedTradeRouteList, routeTypeListQuery,
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
          $TraderPage({ ...config, openPositionListQuery, settledPositionListQuery, address })({ 
            changeActivityTimeframe: changeActivityTimeframeTether(),
          })
        ) 
      }, combineObject({ profileMode, wallet: walletLink.wallet }))


    ),

    {
      modifySubscriber, changeActivityTimeframe, selectTradeRouteList, changeRoute
    }
  ]
})



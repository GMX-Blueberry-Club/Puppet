import { Behavior, combineObject } from "@aelea/core"
import { $node, $text, component, style } from "@aelea/dom"
import * as router from '@aelea/router'
import { $column, $row, layoutSheet } from "@aelea/ui-components"
import { constant, map } from "@most/core"
import { IntervalTime, switchMap } from "common-utils"
import { EIP6963ProviderDetail } from "mipd"
import { ISetRouteType, queryPuppetTradeRoute, queryTraderPositionOpen, queryTraderPositionSettled } from "puppet-middleware-utils"
import { $ButtonToggle, $defaulButtonToggleContainer } from "ui-components"
import { uiStorage } from "ui-storage"
import { $IntermediateConnectButton } from "../../components/$ConnectWallet.js"
import { $ButtonSecondary } from "../../components/form/$Button.js"
import { IChangeSubscription } from "../../components/portfolio/$RouteSubscriptionEditor.js"
import * as storeDb from "../../const/store.js"
import { IPageParams, IUserType } from "../../const/type.js"
import { $PuppetPage } from "./$Puppet.js"
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


export const $WalletPage = (config: IPageParams & { route: router.Route }) => component((
  [changeRoute, changeRouteTether]: Behavior<string, string>,
  [selectProfileMode, selectProfileModeTether]: Behavior<IUserType>,
  [modifySubscriber, modifySubscriberTether]: Behavior<IChangeSubscription>,

  [changeActivityTimeframe, changeActivityTimeframeTether]: Behavior<any, IntervalTime>,
  [selectTradeRouteList, selectTradeRouteListTether]: Behavior<ISetRouteType[]>,

  [changeWallet, changeWalletTether]: Behavior<any, EIP6963ProviderDetail | null>,
) => {

  const { route, walletClientQuery, routeTypeListQuery, activityTimeframe, selectedTradeRouteList, priceTickMapQuery } = config

  const profileMode = uiStorage.replayWrite(storeDb.store.wallet, selectProfileMode, 'selectedTab')



  return [

    $column(layoutSheet.spacingBig)(
      $node(),

      $row(style({ flex: 1, placeContent: 'center' }))(
        $IntermediateConnectButton({
          walletClientQuery,
          $$display: map(wallet => {
            return $ButtonSecondary({
              $content: $text('Disconnect')
            })({
              click: changeWalletTether(constant(null))
            })
          })
        })({
          changeWallet: changeWalletTether()
        }),
      ),

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
        $node(style({ flex: 1 }))(),
      ),

      switchMap(params => {
        const address = switchMap(async walletQuery => {
          return (await walletQuery)?.account.address || null
        }, walletClientQuery)

        if (params.profileMode === IUserType.PUPPET) {
          const puppetTradeRouteListQuery = queryPuppetTradeRoute({ address, activityTimeframe, selectedTradeRouteList })
          
          const settledPositionListQuery = map(async tradeRoute => {
            return (await tradeRoute).map(x => x.settledList).flatMap(pp => pp.map(x => x.position))
          }, puppetTradeRouteListQuery)
          const openPositionListQuery = map(async tradeRoute => {
            return (await tradeRoute).map(x => x.openList).flatMap(pp => pp.map(x => x.position))
          }, puppetTradeRouteListQuery)

          return $PuppetPage({
            walletClientQuery, route, priceTickMapQuery, openPositionListQuery, settledPositionListQuery, puppetTradeRouteListQuery,
            activityTimeframe, selectedTradeRouteList, routeTypeListQuery,
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
          $TraderPage({ ...config, openPositionListQuery, settledPositionListQuery })({ 
            changeActivityTimeframe: changeActivityTimeframeTether(),
          })
        ) 
      }, combineObject({ profileMode }))


    ),

    {
      modifySubscriber, changeActivityTimeframe, selectTradeRouteList, changeRoute, changeWallet
    }
  ]
})



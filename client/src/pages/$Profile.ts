import { Behavior, O } from "@aelea/core"
import { $Node, $text, component, style } from "@aelea/dom"
import { Route } from "@aelea/router"
import { $column, layoutSheet } from "@aelea/ui-components"
import { map, mergeArray, multicast, now } from "@most/core"
import { Chain } from "@wagmi/core"
import { $ButtonToggle, $defaulButtonToggleContainer, $infoTooltipLabel } from "gmx-middleware-ui-components"
import {
  IRequestAccountTradeListApi, readableDate, timeSince
} from "gmx-middleware-utils"
import { Address } from "viem"
import { $TradePnl, $entry, $openPositionPnlBreakdown, $pnlValue, $riskLiquidator, $settledSizeDisplay } from "../common/$common"
import { $CardTable } from "../components/$common"
import { connectTrade } from "../logic/trade"
import { gmxData } from "../data/process"
import { ISupportedChain } from "../wallet/walletLink"
import * as router from '@aelea/router'
import { $PuppetPortfolio } from "./$PuppetPortfolio"



export enum IProfileActiveTab {
  BERRIES = 'Trader',
  TRADING = 'Puppet',
}

export interface IProfile {
  account: Address
  parentUrl: string
  parentRoute: Route
  chain: ISupportedChain
  route: router.Route

  $accountDisplay: $Node
}

const $title = $text(style({ fontWeight: 'bold', fontSize: '1.35em' }))

type IRouteOption = {
  label: string
  url: string
}



export const $Profile = (config: IProfile) => component((
  [changeRoute, changeRouteTether]: Behavior<string, string>,
  [selectProfileMode, selectProfileModeTether]: Behavior<IRouteOption, IRouteOption>,
  [requestAccountTradeList, requestAccountTradeListTether]: Behavior<number, IRequestAccountTradeListApi>,
) => {


  const mcP = multicast(gmxData.trading)

  const openTrades = map(list => {
    const newLocal = Object.values(list.positionSlot).filter(p => p.account === config.account)
    return newLocal
  }, mcP)

  const options: IRouteOption[] = [
    {
      label: 'Puppet',
      url: '/profile/puppet'
    },
    {
      label: 'Open',
      url: '/profile/trader'
    }
  ]


  const trades = map(list => {
    const newLocal = Object.values(list.positionsSettled).filter(p => p.account === config.account)
    return newLocal
  }, mcP)

  const puppetRoute = config.route.create({ fragment: 'puppet', title: 'Puppet' })
  const traderRoute = config.route.create({ fragment: 'trader', title: 'Trader' })


  const tradeReader = connectTrade(config.chain)


  return [

    $column(layoutSheet.spacingBig, style({ width: '100%', maxWidth: '550px', margin: '0 auto', alignItems: 'center' }))(
      config.$accountDisplay,

      $ButtonToggle({
        $container: $defaulButtonToggleContainer(style({ alignSelf: 'center', })),
        selected: mergeArray([
          router.match<IRouteOption>(puppetRoute)(now(options[1])),
          router.match<IRouteOption>(traderRoute)(now(options[0])),
        ]),        options,
        $$option: map(option => {
          return $text(option.label)
        })
      })({ select: selectProfileModeTether() }),


      // router.match(puppetRoute)(
      //   $PuppetPortfolio({ ...config })({
      //     routeChange: routeChangeTether()
      //   })
      // ),
      

    ),

    {
      changeRoute: mergeArray([
        changeRoute,
        map(mode => {
          const pathName = config.parentUrl + mode.toLowerCase()
          if (location.pathname !== pathName) {
            history.pushState(null, '', pathName)
          }

          return pathName
        }, selectProfileMode)
      ])
    }
  ]
})



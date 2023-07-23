import { Behavior, combineObject, replayLatest } from "@aelea/core"
import { $text, component, style } from "@aelea/dom"
import * as router from '@aelea/router'
import { $column, layoutSheet } from "@aelea/ui-components"
import { map, mergeArray, multicast, now } from "@most/core"
import { $ButtonToggle, $defaulButtonToggleContainer } from "gmx-middleware-ui-components"
import {
  IRequestAccountTradeListApi
} from "gmx-middleware-utils"
import { gmxData } from "../data/process"
import { IWalletClient } from "../wallet/walletLink"
import * as PUPPET from "puppet-middleware-const"
import * as viem from "viem"
import { connectContract } from "../logic/common"
import { ARBITRUM_ADDRESS } from "gmx-middleware-const"
import { IPositionMirrorSettled, IPositionMirrorSlot } from "puppet-middleware-utils"

export enum IProfileActiveTab {
  BERRIES = 'Trader',
  TRADING = 'Puppet',
}

export interface IProfile {
  wallet: IWalletClient
  route: router.Route
}

const $title = $text(style({ fontWeight: 'bold', fontSize: '1.35em' }))

type IRouteOption = {
  label: string
  url: string
}





export const $Wallet = (config: IProfile) => component((
  [changeRoute, changeRouteTether]: Behavior<string, string>,
  [selectProfileMode, selectProfileModeTether]: Behavior<IRouteOption, IRouteOption>,
  [requestAccountTradeList, requestAccountTradeListTether]: Behavior<number, IRequestAccountTradeListApi>,
) => {

  const processData = multicast(gmxData.trading)
  const orchestrator = connectContract(PUPPET.CONTRACT[42161].Orchestrator)
  const subscription = orchestrator.read('puppetSubscriptions', config.wallet.account.address)

  const routeTrader = replayLatest(multicast(map(params => {
    const routeTraderMapping: IRouteTraderTrade = {}

    for (const prop in params.subscription) {
      const object = params.processData.mirrorPositionSettled[prop as viem.Hex]

      routeTraderMapping[object.route] ??= {}
      routeTraderMapping[object.route][object.trader] ??= { settled: [], open: [] }
      routeTraderMapping[object.route][object.trader].settled.push(object)
    }

    for (const prop in params.processData.mirrorPositionSettled) {
      const object = params.processData.mirrorPositionSettled[prop as viem.Hex]

      routeTraderMapping[object.route] ??= {}
      routeTraderMapping[object.route][object.trader] ??= { settled: [], open: [] }
      routeTraderMapping[object.route][object.trader].settled.push(object)
    }

    for (const prop in params.processData.mirrorPositionSlot) {
      const object = params.processData.mirrorPositionSlot[prop as viem.Hex]

      routeTraderMapping[object.route] ??= {}
      routeTraderMapping[object.route][object.trader] ??= { settled: [], open: [] }
      routeTraderMapping[object.route][object.trader].open.push(object)
    }

    return routeTraderMapping
  }, combineObject({ processData, subscription }))))



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
  }, processData)



  return [

    $column(layoutSheet.spacingBig, style({ paddingTop: '30px', maxWidth: '550px', margin: '0 auto', alignItems: 'center' }))(
      $ButtonToggle({
        $container: $defaulButtonToggleContainer(style({ alignSelf: 'center', })),
        selected: mergeArray([selectProfileMode, now(options[0])]),
        options,
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
      changeRoute
    }
  ]
})



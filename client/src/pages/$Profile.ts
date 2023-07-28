import { Behavior } from "@aelea/core"
import { $Node, $node, $text, component, style } from "@aelea/dom"
import * as router from '@aelea/router'
import { $column, layoutSheet } from "@aelea/ui-components"
import { map, mergeArray, multicast, now } from "@most/core"
import { Stream } from "@most/types"
import { $ButtonToggle, $defaulButtonToggleContainer } from "gmx-middleware-ui-components"
import {
  ETH_ADDRESS_REGEXP,
  IRequestAccountTradeListApi
} from "gmx-middleware-utils"
import { Address } from "viem"
import { gmxData } from "../data/process"
import { IGmxProcessSeed } from "../data/process/process"
import { connectTrade } from "../logic/trade"
import * as viem from 'viem'
import { $TraderProfile } from "../components/$Trader"
import { ITraderSubscritpion } from "puppet-middleware-utils"

export enum IProfileActiveTab {
  TRADER = 'Trader',
  PUPPET = 'Puppet',
}

export interface IProfile {
  route: router.Route
  processData: Stream<IGmxProcessSeed>
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

  [subscribeTreader, subscribeTreaderTether]: Behavior<ITraderSubscritpion>,
) => {

  const profileAddressRoute = config.route.create({ title: 'Profile', fragment: ETH_ADDRESS_REGEXP })
  const traderRoute = profileAddressRoute.create({ fragment: 'trader', title: 'Trader' })
  const puppetRoute = profileAddressRoute.create({ fragment: 'puppet', title: 'Puppet' })

  const urlFragments = document.location.pathname.split('/')
  const address = urlFragments[urlFragments.length - 2] as viem.Address


  const options: IRouteOption[] = [
    {
      label: 'Trader',
      url: '/profile/puppet'
    },
    {
      label: 'Puppet',
      url: '/profile/trader'
    }
  ]



  return [

    $column(layoutSheet.spacingBig, style({ margin: '0 auto', alignItems: 'center' }))(

      $ButtonToggle({
        $container: $defaulButtonToggleContainer(style({ alignSelf: 'center', })),
        selected: mergeArray([
          router.match<IRouteOption>(traderRoute)(now(options[0])),
          router.match<IRouteOption>(puppetRoute)(now(options[1])),
        ]),
        options,
        $$option: map(option => {
          return $text(option.label)
        })
      })({ select: selectProfileModeTether() }),

      $node(),
      $node(),
      $node(),
      $node(),

      router.match(traderRoute)(
        $TraderProfile({ ...config, address })({
          subscribeTreader: subscribeTreaderTether()
        })
      ),
      

    ),

    { changeRoute, subscribeTreader }
  ]
})



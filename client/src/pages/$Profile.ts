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
import { IGmxProcessState } from "../data/process/process"
import { connectTrade } from "../logic/trade"
import * as viem from 'viem'
import { $TraderProfile } from "../components/participant/$Trader"
import { IPuppetRouteSubscritpion } from "puppet-middleware-utils"
import { $PuppetProfile } from "../components/participant/$Puppet"

export enum IProfileActiveTab {
  TRADER = 'Trader',
  PUPPET = 'Puppet',
}

export interface IProfile {
  route: router.Route
  processData: Stream<IGmxProcessState>
}

const $title = $text(style({ fontWeight: 'bold', fontSize: '1.35em' }))

type IRouteOption = {
  label: string
  fragment: string
}



export const $Profile = (config: IProfile) => component((
  [changeRoute, changeRouteTether]: Behavior<string, string>,
  [selectProfileMode, selectProfileModeTether]: Behavior<IRouteOption, IRouteOption>,
  [requestAccountTradeList, requestAccountTradeListTether]: Behavior<number, IRequestAccountTradeListApi>,

  [subscribeTreader, subscribeTreaderTether]: Behavior<IPuppetRouteSubscritpion>,
) => {

  const profileAddressRoute = config.route.create({ title: 'Profile', fragment: ETH_ADDRESS_REGEXP })
  const traderRoute = profileAddressRoute.create({ fragment: 'trader', title: 'Trader' })
  const puppetRoute = profileAddressRoute.create({ fragment: 'puppet', title: 'Puppet' })



  const options: IRouteOption[] = [
    {
      label: 'Trader',
      fragment: 'trader'
    },
    {
      label: 'Puppet',
      fragment: 'puppet'
    }
  ]



  return [

    $column(layoutSheet.spacingBig)(

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

      router.match(traderRoute)(
        {
          run(sink, scheduler) {
            const urlFragments = document.location.pathname.split('/')
            const address = urlFragments[urlFragments.length - 2] as viem.Address

            return $TraderProfile({ ...config, address })({
              subscribeTreader: subscribeTreaderTether()
            }).run(sink, scheduler)
          },
        }
      ),
      router.match(puppetRoute)(
        {
          run(sink, scheduler) {
            const urlFragments = document.location.pathname.split('/')
            const address = urlFragments[urlFragments.length - 2] as viem.Address

            return $PuppetProfile({ ...config, address })({
              changeRoute: changeRouteTether(),
            }).run(sink, scheduler)
          },
        }
      ),
      
      $node(),
      $node(),
      $node(),

    ),

    {
      changeRoute: mergeArray([
        changeRoute,
        map(option => {
          const urlFragments = document.location.pathname.split('/')
          const address = urlFragments[urlFragments.length - 2] as viem.Address
          const url = `/app/profile/${address}/${option.fragment}`
          history.pushState({}, '', url)
          return url
        }, selectProfileMode)
      ]),
      subscribeTreader
    }
  ]
})



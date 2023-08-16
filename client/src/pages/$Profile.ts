import { Behavior } from "@aelea/core"
import { $node, $text, component, style } from "@aelea/dom"
import * as router from '@aelea/router'
import { $column, $row, layoutSheet } from "@aelea/ui-components"
import { map, mergeArray, now } from "@most/core"
import { Stream } from "@most/types"
import * as GMX from 'gmx-middleware-const'
import { $ButtonToggle, $defaulButtonToggleContainer } from "gmx-middleware-ui-components"
import {
  ETH_ADDRESS_REGEXP,
  IRequestAccountTradeListApi
} from "gmx-middleware-utils"
import { IPuppetRouteSubscritpion } from "puppet-middleware-utils"
import * as viem from 'viem'
import { $PuppetProfile } from "../components/participant/$Puppet"
import { $TraderProfile } from "../components/participant/$Trader"
import { IGmxProcessState } from "../data/process/process"
import * as store from "../data/store/store"
import * as storage from "../utils/storage/storeScope"
import { $LastAtivity } from "./components/$LastActivity"


export enum IProfileActiveTab {
  TRADER = 'Trader',
  PUPPET = 'Puppet',
}

export interface IProfile {
  route: router.Route
  processData: Stream<IGmxProcessState>
  subscriptionList: Stream<IPuppetRouteSubscritpion[]>
}

const $title = $text(style({ fontWeight: 'bold', fontSize: '1.35em' }))

type IRouteOption = {
  label: string
  fragment: string
}



export const $Profile = (config: IProfile) => component((
  [changeRoute, changeRouteTether]: Behavior<string, string>,
  [selectProfileMode, selectProfileModeTether]: Behavior<IRouteOption, IRouteOption>,
  [modifySubscriber, modifySubscriberTether]: Behavior<IPuppetRouteSubscritpion>,
  [changeActivityTimeframe, changeActivityTimeframeTether]: Behavior<any, GMX.IntervalTime>,
) => {

  const profileAddressRoute = config.route.create({ title: 'Profile', fragment: ETH_ADDRESS_REGEXP })
  const traderRoute = profileAddressRoute.create({ fragment: 'trader', title: 'Trader' })
  const puppetRoute = profileAddressRoute.create({ fragment: 'puppet', title: 'Puppet' })

  const activityTimeframe = storage.replayWrite(store.activityTimeframe, GMX.TIME_INTERVAL_MAP.MONTH, changeActivityTimeframe)

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

    $column(layoutSheet.spacingBig, style({ paddingTop: '50px', }))(

      $column(layoutSheet.spacingBig, style({ alignItems: 'center', placeContent: 'center' }))(
        

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
      ),

      

      router.match(traderRoute)(
        {
          run(sink, scheduler) {
            const urlFragments = document.location.pathname.split('/')
            const address = urlFragments[urlFragments.length - 2] as viem.Address

            return $TraderProfile({ ...config, address, activityTimeframe })({
              subscribeTreader: modifySubscriberTether(),
              changeRoute: changeRouteTether(),
              changeActivityTimeframe: changeActivityTimeframeTether(),
            }).run(sink, scheduler)
          },
        }
      ),
      router.match(puppetRoute)(
        {
          run(sink, scheduler) {
            const urlFragments = document.location.pathname.split('/')
            const address = urlFragments[urlFragments.length - 2] as viem.Address

            return $PuppetProfile({ ...config, address, activityTimeframe })({
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
      modifySubscriber
    }
  ]
})



import { Behavior, combineObject } from "@aelea/core"
import { $node, $text, component, style } from "@aelea/dom"
import * as router from '@aelea/router'
import { $column, layoutSheet } from "@aelea/ui-components"
import { fromPromise, map, mergeArray, now } from "@most/core"
import { Stream } from "@most/types"
import * as GMX from 'gmx-middleware-const'
import { $ButtonToggle, $defaulButtonToggleContainer } from "gmx-middleware-ui-components"
import { ETH_ADDRESS_REGEXP, findClosest, switchMap } from "gmx-middleware-utils"
import { ISubscribeTradeRouteDto, queryLatestPriceTicks } from "puppet-middleware-utils"
import * as viem from 'viem'
import { $PuppetProfile } from "../components/participant/$Puppet.js"
import { $TraderProfile } from "../components/participant/$Trader.js"
import * as store from "../data/store/store.js"
import * as storage from "../utils/storage/storeScope.js"
import { subgraphClient } from "../data/subgraph/client"
import { IChangeSubscription } from "../components/portfolio/$RouteSubscriptionEditor"


export enum IProfileActiveTab {
  TRADER = 'Trader',
  PUPPET = 'Puppet',
}

export interface IProfile {
  route: router.Route
  // processData: Stream<IGmxProcessState>
  // subscriptionList: Stream<IPuppetSubscritpion[]>
}

const $title = $text(style({ fontWeight: 'bold', fontSize: '1.35em' }))

type IRouteOption = {
  label: string
  fragment: string
}



export const $Profile = (config: IProfile) => component((
  [changeRoute, changeRouteTether]: Behavior<string, string>,
  [selectProfileMode, selectProfileModeTether]: Behavior<IRouteOption, IRouteOption>,
  [modifySubscriber, modifySubscriberTether]: Behavior<IChangeSubscription>,
  [changeActivityTimeframe, changeActivityTimeframeTether]: Behavior<any, GMX.IntervalTime>,
  
) => {

  const profileAddressRoute = config.route.create({ title: 'Profile', fragment: ETH_ADDRESS_REGEXP })
  const traderRoute = profileAddressRoute.create({ fragment: 'trader', title: 'Trader' })
  const puppetRoute = profileAddressRoute.create({ fragment: 'puppet', title: 'Puppet' })

  const activityTimeframe = storage.replayWrite(store.activityTimeframe, GMX.TIME_INTERVAL_MAP.MONTH, changeActivityTimeframe)
  const priceTickMap = switchMap(params => {
    const interval = findClosest(GMX.PRICEFEED_INTERVAL, params.activityTimeframe / 20)
    return fromPromise(queryLatestPriceTicks(subgraphClient, { interval: interval }))
  }, combineObject({ activityTimeframe: activityTimeframe }))
  
  const options: IRouteOption[] = [
    {
      label: 'Puppet',
      fragment: 'puppet'
    },
    {
      label: 'Trader',
      fragment: 'trader'
    },
  ]



  return [

    $column(layoutSheet.spacingBig)(

      $node(),

      $column(layoutSheet.spacingBig, style({ alignItems: 'center', placeContent: 'center' }))(
        $ButtonToggle({
          $container: $defaulButtonToggleContainer(style({ alignSelf: 'center', })),
          selected: mergeArray([
            router.match<IRouteOption>(puppetRoute)(now(options[0])),
            router.match<IRouteOption>(traderRoute)(now(options[1])),
          ]),
          options,
          $$option: map(option => {
            return $text(option.label)
          })
        })({ select: selectProfileModeTether() }),
      ),

      

     
      {
        run(sink, scheduler) {
          const urlFragments = document.location.pathname.split('/')
          const address = viem.getAddress(urlFragments[urlFragments.length - 2])

          // const settledTradeList = map(params => {
          //   const filterStartTime = unixTimestampNow() - params.activityTimeframe
          //   const list = params.processData.mirrorPositionSettled.filter(pos => pos.trader === address && pos.blockTimestamp > filterStartTime).reverse()
          //   return list
          // }, combineObject({ processData: config.processData, activityTimeframe }))

          return  $column(
            router.match(traderRoute)(
              $TraderProfile({ priceTickMap, route: config.route, address, activityTimeframe })({
                modifySubscriber: modifySubscriberTether(),
                changeRoute: changeRouteTether(),
                changeActivityTimeframe: changeActivityTimeframeTether(),
              })
            ),
            router.match(puppetRoute)(
              $PuppetProfile({ 
                address, activityTimeframe, priceTickMap,
                route: config.route,
                // subscriptionList: config.subscriptionList,
              })({
                changeRoute: changeRouteTether(),
                changeActivityTimeframe: changeActivityTimeframeTether(),
                modifySubscriber: modifySubscriberTether()
              })
            ),
          ).run(sink, scheduler)
        },
      },
      
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



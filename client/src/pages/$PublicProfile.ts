import { Behavior, combineObject } from "@aelea/core"
import { $node, $text, component, style } from "@aelea/dom"
import * as router from '@aelea/router'
import { $column, layoutSheet } from "@aelea/ui-components"
import { map, mergeArray, now } from "@most/core"
import * as GMX from 'gmx-middleware-const'
import { $ButtonToggle, $defaulButtonToggleContainer } from "gmx-middleware-ui-components"
import { ETH_ADDRESS_REGEXP, switchMap } from "gmx-middleware-utils"
import { ISetRouteType, queryTraderPositionSettled, queryPuppetTradeRoute, queryTraderPositionOpen } from "puppet-middleware-utils"
import * as viem from 'viem'
import { $PuppetProfile } from "../components/participant/$PuppetProfile.js"
import { $PuppetProfileSummary, $TraderProfileSummary } from "../components/participant/$Summary"
import { $TraderProfile } from "../components/participant/$TraderProfile.js"
import { IChangeSubscription } from "../components/portfolio/$RouteSubscriptionEditor.js"
import { IPageGlobalParams } from "../data/type"


export enum IProfileActiveTab {
  TRADER = 'Trader',
  PUPPET = 'Puppet',
}

export interface IProfile extends IPageGlobalParams {
}


type IRouteOption = {
  label: string
  fragment: string
}


export const $PublicProfile = (config: IProfile) => component((
  [changeRoute, changeRouteTether]: Behavior<string, string>,
  [selectProfileMode, selectProfileModeTether]: Behavior<IRouteOption, IRouteOption>,
  [modifySubscriber, modifySubscriberTether]: Behavior<IChangeSubscription>,
  [changeActivityTimeframe, changeActivityTimeframeTether]: Behavior<any, GMX.IntervalTime>,
  [selectTradeRouteList, selectTradeRouteListTether]: Behavior<ISetRouteType[]>,

) => {

  const { route, routeTypeListQuery, activityTimeframe, selectedTradeRouteList, priceTickMapQuery, } = config

  const profileAddressRoute = config.route
  const traderRoute = profileAddressRoute.create({ fragment: 'trader' }).create({ title: 'Trader', fragment: ETH_ADDRESS_REGEXP })
  const puppetRoute = profileAddressRoute.create({ fragment: 'puppet' }).create({ title: 'Puppet', fragment: ETH_ADDRESS_REGEXP })

  
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

      $column(
        router.match(traderRoute)(
          {
            run(sink, scheduler) {
              const urlFragments = document.location.pathname.split('/')
              const address = viem.getAddress(urlFragments[urlFragments.length - 1])

              const settledPositionListQuery = queryTraderPositionSettled({ address, activityTimeframe, selectedTradeRouteList })
              const openPositionListQuery = queryTraderPositionOpen({ address, selectedTradeRouteList })

              return $column(layoutSheet.spacingBig)(
                $TraderProfileSummary({ ...config, address, settledPositionListQuery, openPositionListQuery })({}),

                $TraderProfile({ ...config, address, settledPositionListQuery, openPositionListQuery, })({
                  selectTradeRouteList: selectTradeRouteListTether(),
                  changeRoute: changeRouteTether(),
                  changeActivityTimeframe: changeActivityTimeframeTether(),
                })
              ).run(sink, scheduler)
            },
          }
        ),
        router.match(puppetRoute)(
          {
            run(sink, scheduler) {
              const urlFragments = document.location.pathname.split('/')
              const address = viem.getAddress(urlFragments[urlFragments.length - 1])
              const puppetTradeRouteListQuery = queryPuppetTradeRoute({ address, activityTimeframe, selectedTradeRouteList })

              const settledPositionListQuery = map(async trList => {
                const tradeList = (await trList).flatMap(p => p.settledList.map(x => x.position))
                return tradeList
              }, puppetTradeRouteListQuery)

              const openPositionListQuery = map(async trList => {
                const tradeList = (await trList).flatMap(p => p.openList.map(x => x.position))
                return tradeList
              }, puppetTradeRouteListQuery)

              return  $column(layoutSheet.spacingBig)(
                $PuppetProfileSummary({
                  settledPositionListQuery,
                  openPositionListQuery,
                  address,
                  route,
                  puppet: address,
                })({}),

                $column(layoutSheet.spacingTiny)(
                  $PuppetProfile({
                    ...config,
                    address,
                    openPositionListQuery,
                    settledPositionListQuery,
                    puppetTradeRouteListQuery,
                  })({
                    changeRoute: changeRouteTether(),
                    changeActivityTimeframe: changeActivityTimeframeTether(),
                    selectTradeRouteList: selectTradeRouteListTether(),
                    modifySubscriber: modifySubscriberTether()
                  }),
                ),
   
              ).run(sink, scheduler)
            },
          }
        ),
      ),
      
      $node(),
      $node(),

    ),

    {
      selectTradeRouteList, modifySubscriber, changeActivityTimeframe,
      changeRoute: mergeArray([
        changeRoute,
        map(option => {
          const urlFragments = document.location.pathname.split('/')
          const address = urlFragments[urlFragments.length - 1] as viem.Address
          const url = `/app/profile/${option.fragment}/${address}`
          history.pushState({}, '', url)
          return url
        }, selectProfileMode)
      ]),
    }
  ]
})



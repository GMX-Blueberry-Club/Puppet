import { Behavior } from "@aelea/core"
import { $node, $text, component, style } from "@aelea/dom"
import * as router from '@aelea/router'
import { $column, layoutSheet } from "@aelea/ui-components"
import { map, mergeArray, now } from "@most/core"
import { ETH_ADDRESS_REGEXP, IntervalTime } from "common-utils"
import { ISetRouteType, queryPuppetTradeRoute, queryTraderPositionOpen, queryTraderPositionSettled } from "puppet-middleware-utils"
import { $ButtonToggle, $defaulButtonToggleContainer } from "ui-components"
import * as viem from 'viem'
import { $PuppetProfile } from "./$PuppetProfile.js"
import { $PuppetSummary, $TraderSummary } from "../../components/participant/$Summary.js"
import { IChangeSubscription } from "../../components/portfolio/$RouteSubscriptionEditor.js"
import { IPageParams, IUserActivityPageParams, IUserPositionPageParams } from "../type.js"
import { $TraderPage } from "./$Trader.js"



export interface IProfile extends IPageParams {
  route: router.Route
}


type IRouteOption = {
  label: string
  fragment: string
}


export const $PublicUserPage = (config: IUserActivityPageParams) => component((
  [changeRoute, changeRouteTether]: Behavior<string, string>,
  [selectProfileMode, selectProfileModeTether]: Behavior<IRouteOption, IRouteOption>,
  [modifySubscriber, modifySubscriberTether]: Behavior<IChangeSubscription>,
  [changeActivityTimeframe, changeActivityTimeframeTether]: Behavior<any, IntervalTime>,
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
                $TraderSummary({ ...config, address, settledPositionListQuery, openPositionListQuery })({}),

                $TraderPage({ ...config, settledPositionListQuery, openPositionListQuery, })({
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
                $PuppetSummary({ ...config, address, puppet: address, openPositionListQuery, settledPositionListQuery })({}),

                $column(layoutSheet.spacingTiny)(
                  $PuppetProfile({
                    ...config,
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



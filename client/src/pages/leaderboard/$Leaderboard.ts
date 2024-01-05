import { Behavior } from "@aelea/core"
import { component, style } from "@aelea/dom"
import * as router from '@aelea/router'
import { $column, layoutSheet } from "@aelea/ui-components"
import { map, mergeArray } from "@most/core"
import { IChangeSubscription } from "../../components/portfolio/$RouteSubscriptionEditor"
import { $TopSettled } from "./$TopSettled.js"



export type ILeaderboard = {
  route: router.Route
  // subscriptionList: Stream<IPuppetSubscritpion[]>
}

type IRouteOption = {
  label: string
  url: string
}

export const $Leaderboard = (config: ILeaderboard) => component((
  [changeTab, changeTabTether]: Behavior<IRouteOption, string>,
  [routeChange, routeChangeTether]: Behavior<string, string>,
  [modifySubscriber, modifySubscriberTether]: Behavior<IChangeSubscription>,

) => {

  // const settledRoute = config.route.create({ fragment: 'settled', title: 'Leaderboard' })
  // const topOpenRoute = config.route.create({ fragment: 'open', title: 'Leaderboard' })

  const routeChangeState = map(url => {
    history.pushState(null, '', url)
    return url
  }, mergeArray([changeTab]))

  const options: IRouteOption[] = [
    {
      label: 'Aggregated',
      url: '/app/leaderboard'
    },
    {
      label: 'Open',
      url: '/app/leaderboard/open'
    }
  ]







  return [
    $column(
      layoutSheet.spacingBig,
      style({ alignItems: 'center', paddingTop: '50px', flex: 1 })
    )(

      $TopSettled({
        route: config.route,
      })({
        routeChange: routeChangeTether(),
        modifySubscriber: modifySubscriberTether()
      })
      

      // $row(layoutSheet.spacing, style({ alignItems: 'center' }))(
      //   $ButtonToggle({
      //     options,
      //     $container: $defaulButtonToggleContainer(style({ zIndex: 0 })),
      //     selected: mergeArray([
      //       router.match<IRouteOption>(topOpenRoute)(now(options[1])),
      //       router.match<IRouteOption>(settledRoute)(now(options[0])),
      //     ]),
      //     $$option: map(option => $text(option.label)),
      //   })({
      //     select: changeTabTether(
      //       map(option => {
      //         return option.url
      //       })
      //     )
      //   }),
      // ),



    ),

    {
      routeChange: mergeArray([routeChange, routeChangeState]),
      modifySubscriber,
    }
  ]
})






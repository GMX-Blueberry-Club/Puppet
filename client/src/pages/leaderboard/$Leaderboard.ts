import { Behavior } from "@aelea/core"
import { $text, component, style } from "@aelea/dom"
import * as router from '@aelea/router'
import { $column, $row, layoutSheet } from "@aelea/ui-components"
import { empty, map, mergeArray, multicast, now, switchLatest } from "@most/core"
import { Stream } from "@most/types"
import { $ButtonToggle } from "gmx-middleware-ui-components"
import { IPuppetRouteTrades, IPuppetRouteSubscritpion } from "puppet-middleware-utils"
import { IGmxProcessState } from "../../data/process/process"
import { $card } from "../../elements/$common"
import { wallet } from "../../wallet/walletLink"
import { $TopOpen } from "./$TopOpen"
import { $TopSettled } from "./$TopSettled"
import * as GMX from "gmx-middleware-const"
import { $LastAtivity } from "../components/$LastActivity"



export type ILeaderboard = {
  route: router.Route
  processData: Stream<IGmxProcessState>
  subscriptionList: Stream<IPuppetRouteSubscritpion[]>
}

type IRouteOption = {
  label: string
  url: string
}

export const $Leaderboard = (config: ILeaderboard) => component((
  [changeTab, changeTabTether]: Behavior<IRouteOption, string>,
  [routeChange, routeChangeTether]: Behavior<string, string>,
  [modifySubscriber, modifySubscriberTether]: Behavior<IPuppetRouteSubscritpion>,

) => {

  const settledRoute = config.route.create({ fragment: 'settled', title: 'Leaderboard' })
  const topOpenRoute = config.route.create({ fragment: 'open', title: 'Leaderboard' })

  const routeChangeState = map(url => {
    history.pushState(null, '', url)
    return url
  }, mergeArray([changeTab]))

  const options: IRouteOption[] = [
    {
      label: 'Aggregated',
      url: '/app/leaderboard/settled'
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

      $row(layoutSheet.spacing, style({ alignItems: 'center' }))(
        $ButtonToggle({
          options,
          // $container: $row,
          selected: mergeArray([
            router.match<IRouteOption>(topOpenRoute)(now(options[1])),
            router.match<IRouteOption>(settledRoute)(now(options[0])),
          ]),
          $$option: map(option => $text(option.label)),
        })({
          select: changeTabTether(
            map(option => {
              return option.url
            })
          )
        }),
      ),


      $card(style({ width: '100%' }))(
        router.match(topOpenRoute)(
          $TopOpen({ ...config })({
            routeChange: routeChangeTether()
          })
        ),
        router.match(settledRoute)(
          $TopSettled({
            ...config,
          })({
            routeChange: routeChangeTether(),
            modifySubscriber: modifySubscriberTether()
          })
        )
      ),

    ),

    {
      routeChange: mergeArray([routeChange, routeChangeState]),
      modifySubscriber,
    }
  ]
})






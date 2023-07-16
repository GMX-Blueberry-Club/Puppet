import { Behavior } from "@aelea/core"
import { $text, component, style } from "@aelea/dom"
import * as router from '@aelea/router'
import { $column, layoutSheet } from "@aelea/ui-components"
import { map, mergeArray, now } from "@most/core"
import { $ButtonToggle } from "gmx-middleware-ui-components"
import { $TopOpen } from "./$TopOpen"
import { $TopSettled } from "./$TopSettled"




export type ILeaderboard = {
  route: router.Route
}

type IRouteOption = {
  label: string
  url: string
}

export const $Leaderboard = (config: ILeaderboard) => component((
  [changeTab, changeTabTether]: Behavior<IRouteOption, string>,
  [routeChange, routeChangeTether]: Behavior<string, string>,
) => {
  const settledRoute = config.route.create({ fragment: 'settled', title: 'Leaderboard' })
  const topOpenRoute = config.route.create({ fragment: 'open', title: 'Leaderboard' })

  const routeChangeState = map(url => {
    history.pushState(null, '', url)
    return url
  }, mergeArray([changeTab, routeChange]))

  const options: IRouteOption[] = [
    {
      label: 'Settled',
      url: '/app/leaderboard/settled'
    },
    {
      label: 'Open',
      url: '/app/leaderboard/open'
    }
  ]


  return [
    $column(style({ alignItems: 'center' }), layoutSheet.spacingBig)(

      $ButtonToggle({
        options,
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


      router.match(topOpenRoute)(
        $TopOpen({ ...config })({
          routeChange: routeChangeTether()
        })
      ),
      router.match(settledRoute)(
        $TopSettled({ ...config })({
          routeChange: routeChangeTether()
        })
      )
    ),

    {
      routeChange: routeChangeState,
    }
  ]
})






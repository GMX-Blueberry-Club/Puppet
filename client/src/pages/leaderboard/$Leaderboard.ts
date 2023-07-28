import { Behavior, replayLatest } from "@aelea/core"
import { $text, component, style } from "@aelea/dom"
import * as router from '@aelea/router'
import { $column, layoutSheet } from "@aelea/ui-components"
import { empty, map, mergeArray, multicast, now, switchLatest } from "@most/core"
import { Stream } from "@most/types"
import { $ButtonToggle } from "gmx-middleware-ui-components"
import { ITraderSubscritpion } from "puppet-middleware-utils"
import * as viem from "viem"
import { $SubscriberDrawer } from "../../components/$SubscriberDrawer"
import { IGmxProcessSeed } from "../../data/process/process"
import { $card } from "../../elements/$common"
import { wallet } from "../../wallet/walletLink"
import { $TopOpen } from "./$TopOpen"
import { $TopSettled } from "./$TopSettled"




export type ILeaderboard = {
  route: router.Route
  processData: Stream<IGmxProcessSeed>

  subscribeList: Stream<ITraderSubscritpion[]>
}

type IRouteOption = {
  label: string
  url: string
}

export const $Leaderboard = (config: ILeaderboard) => component((
  [changeTab, changeTabTether]: Behavior<IRouteOption, string>,
  [routeChange, routeChangeTether]: Behavior<string, string>,
  [subscribeTrader, subscribeTraderTether]: Behavior<ITraderSubscritpion>,
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






  const subscription: Stream<viem.Address[]> = switchLatest(map(w3p => {
    if (!w3p) {
      return empty()
    }

    return map(data => {
      return data.subscription.filter(s => s.trader === w3p.account.address)
    }, config.processData)
  }, wallet))
  

  


  return [
    $column(style({ alignItems: 'center',
      paddingTop: '50px',
      flex: 1,
      // margin: '0 -50vw', backgroundColor: pallete.background
    }), layoutSheet.spacingBig)(

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


      $column(style({ flex: 1 }))(
        $card(style({ padding: "12px", gap: 0, borderRadius: '0' }))(
     
          router.match(topOpenRoute)(
            $TopOpen({ ...config })({
              routeChange: routeChangeTether()
            })
          ),
          router.match(settledRoute)(
            $TopSettled({
              ...config,
              subscribeList: config.subscribeList,
              subscription,
            })({
              routeChange: routeChangeTether(),
              subscribeTrader: subscribeTraderTether(multicast)
            })
          )
        ),
      ),


    ),

    {
      routeChange: mergeArray([routeChange, routeChangeState]), changeSubscribeList: subscribeTrader
    }
  ]
})






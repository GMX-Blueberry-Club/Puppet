import { Behavior, replayLatest } from "@aelea/core"
import { $text, component, style } from "@aelea/dom"
import * as router from '@aelea/router'
import { $column, $row, layoutSheet } from "@aelea/ui-components"
import { chain, empty, map, mergeArray, multicast, never, now, snapshot, switchLatest } from "@most/core"
import { $ButtonToggle, $Table, $defaulButtonToggleContainer, $tokenIconMap } from "gmx-middleware-ui-components"
import { $TopOpen } from "./$TopOpen"
import { $TopSettled } from "./$TopSettled"
import { $card } from "../../elements/$common"
import { colorAlpha, pallete } from "@aelea/ui-components-theme"
import { connectContract, wagmiWriteContract } from "../../logic/common"
import * as PUPPET from "puppet-middleware-const"
import { wallet } from "../../wallet/walletLink"
import * as viem from "viem"
import { Stream } from "@most/types"
import { $ButtonPrimaryCtx } from "../../components/form/$Button"
import { $IntermediateConnectButton } from "../../components/$ConnectAccount"
import { IPuppetSubscription, getRouteTypeKey } from "puppet-middleware-utils"
import { ARBITRUM_ADDRESS } from "gmx-middleware-const"
import { formatBps, readableFixedBsp, readablePercentage, switchMap } from "gmx-middleware-utils"
import { $accountPreview } from "../../components/$AccountProfile"
import { $route, $tokenIcon } from "../../common/$common"




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

  [requestChangeSubscription, requestChangeSubscriptionTether]: Behavior<PointerEvent, Promise<viem.TransactionReceipt>>,
  [changeSubscribeList, changeSubscribeListTether]: Behavior<IPuppetSubscription[], IPuppetSubscription[]>,

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

  const orchestrator = connectContract(PUPPET.CONTRACT[42161].Orchestrator)





  const subscription: Stream<viem.Address[]> = switchLatest(map(w3p => {
    if (!w3p) {
      return empty()
    }

    return orchestrator.read('puppetSubscriptions', w3p.account.address)
  }, wallet))
  

  const subscribeList = replayLatest(changeSubscribeList, [] as IPuppetSubscription[])
  


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
              subscribeList: subscribeList,
              subscription,
            })({
              routeChange: routeChangeTether(),
              changeSubscribeList: changeSubscribeListTether()
            })
          )
        ),
      ),


      $row(style({ border: `1px solid ${colorAlpha(pallete.foreground, .20)}`, borderBottom: 'none', padding: '16px', borderRadius: '20px 20px 0 0' }))(
        $Table({
          dataSource: subscribeList,
          columns: [
            {
              $head: $text('Trader'),
              columnOp: style({ minWidth: '120px', flex: 2, alignItems: 'center' }),
              $$body: map(sbusc => {
                return $accountPreview({ address: sbusc.account })
              })
            },
            {
              $head: $text('Action'),
              columnOp: style({ minWidth: '120px', flex: 2, alignItems: 'center' }),
              $$body: map(subsc => {
                return $text(subsc.subscribe ? 'Subscribe' : 'Unsubscribe')
              })
            },
            {
              $head: $text('Route'),
              columnOp: style({ minWidth: '120px', flex: 2, alignItems: 'center' }),
              $$body: map(subsc => {
                return $route(subsc)
              })
            },
            {
              $head: $text('Allowance'),
              columnOp: style({ minWidth: '120px', flex: 2, alignItems: 'center' }),
              $$body: map(subsc => {
                return $text(readableFixedBsp(subsc.allowance))
              })
            },
          ]
        })({}),

        $IntermediateConnectButton({
          $$display: map(w3p => {
              
            return $ButtonPrimaryCtx({
              $content: $text('Save'),
              request: requestChangeSubscription
            })({
              click: requestChangeSubscriptionTether(
                snapshot(list => {

                  const allowance = list.map(x => x.allowance) // 1%
                  const traders = list.map(a => a.account)
                  const routeTypes = list.map(x => getRouteTypeKey(x.collateralToken, x.indexToken, x.isLong))
                  const subscribe = list.map(x => x.subscribe)

                  return wagmiWriteContract({
                    ...PUPPET.CONTRACT[42161].Orchestrator,
                    functionName: 'batchSubscribeRoute',
                    args: [allowance, traders, routeTypes, subscribe]
                  })
                }, subscribeList),
                multicast
              )
            })
          })
        })({})
      ),

    ),

    {
      routeChange: routeChangeState,
    }
  ]
})






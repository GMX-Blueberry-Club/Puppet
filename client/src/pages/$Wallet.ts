import { Behavior, combineObject, replayLatest } from "@aelea/core"
import { $text, component, style } from "@aelea/dom"
import * as router from '@aelea/router'
import { $column, layoutSheet } from "@aelea/ui-components"
import { map, mergeArray, multicast, now } from "@most/core"
import { $ButtonToggle, $defaulButtonToggleContainer } from "gmx-middleware-ui-components"
import {
  IRequestAccountTradeListApi, groupArrayMany, switchMap
} from "gmx-middleware-utils"
import { gmxData } from "../data/process"
import { IWalletClient } from "../wallet/walletLink"
import * as GMX from "gmx-middleware-const"
import * as PUPPET from "puppet-middleware-const"
import * as viem from "viem"
import { connectContract } from "../logic/common"
import { ARBITRUM_ADDRESS } from "gmx-middleware-const"
import { IPositionMirrorSettled, IPositionMirrorSlot, IPuppetSubscritpion } from "puppet-middleware-utils"
import { Stream } from "@most/types"
import { IGmxProcessSeed } from "../data/process/process"

export enum IProfileActiveTab {
  BERRIES = 'Trader',
  TRADING = 'Puppet',
}

export interface IProfile {
  wallet: IWalletClient
  route: router.Route
  processData: Stream<IGmxProcessSeed>
}

const $title = $text(style({ fontWeight: 'bold', fontSize: '1.35em' }))

type IRouteOption = {
  label: string
  url: string
}





export const $Wallet = (config: IProfile) => component((
  [changeRoute, changeRouteTether]: Behavior<string, string>,
  [selectProfileMode, selectProfileModeTether]: Behavior<IRouteOption, IRouteOption>,
  [requestAccountTradeList, requestAccountTradeListTether]: Behavior<number, IRequestAccountTradeListApi>,
) => {

  // const orchestrator = connectContract(PUPPET.CONTRACT[42161].Orchestrator)
  // const subscription = orchestrator.read('puppetSubscriptions', config.wallet.account.address)

  const routeTrades = replayLatest(multicast(map(params => {
    if (!(config.wallet.account.address in params.processData.subscription)) {
      return []
    }

    return params.processData.subscription.filter(s => s.puppet === config.wallet.account.address) || []
  }, combineObject({ processData: config.processData }))))



  const options: IRouteOption[] = [
    {
      label: 'Puppet',
      url: '/profile/puppet'
    },
    {
      label: 'Trader',
      url: '/profile/trader'
    }
  ]


  // const trades = map(list => {
  //   const newLocal = Object.values(list.positionsSettled).filter(p => p.account === config.account)
  //   return newLocal
  // }, processData)



  return [

    $column(layoutSheet.spacingBig, style({ paddingTop: '30px', maxWidth: '550px', margin: '0 auto', alignItems: 'center' }))(
      $ButtonToggle({
        $container: $defaulButtonToggleContainer(style({ alignSelf: 'center', })),
        selected: mergeArray([selectProfileMode, now(options[0])]),
        options,
        $$option: map(option => {
          return $text(option.label)
        })
      })({ select: selectProfileModeTether() }),



      switchMap(subscList => {

        return $column(
          ...subscList.map((subsc) => {
            const routeType = PUPPET.ROUTE_TYPE_DESCRIPTIN[subsc.routeTypeKey]

            return $text(routeType.indexToken)
          })
        )
      }, routeTrades)
      


      // router.match(puppetRoute)(
      //   $PuppetPortfolio({ ...config })({
      //     routeChange: routeChangeTether()
      //   })
      // ),
      

    ),

    {
      changeRoute
    }
  ]
})



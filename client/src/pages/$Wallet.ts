import { Behavior, combineObject, replayLatest } from "@aelea/core"
import { $node, $text, component, style } from "@aelea/dom"
import * as router from '@aelea/router'
import { $column, $row, layoutSheet } from "@aelea/ui-components"
import { empty, map, multicast } from "@most/core"
import { Stream } from "@most/types"
import * as GMX from "gmx-middleware-const"
import { $ButtonToggle, $Link, $arrowRight, $defaulButtonToggleContainer, $icon } from "gmx-middleware-ui-components"
import {
  IRequestAccountTradeListApi,
  switchMap,
  unixTimestampNow
} from "gmx-middleware-utils"
import { IPuppetSubscritpion } from "puppet-middleware-utils"
import { $PuppetPortfolio } from "../components/participant/$Puppet"
import { IGmxProcessState } from "../data/process/process.js"
import * as store from "../data/store/store.js"
import { ROUTE_DESCRIPTIN_MAP } from "../logic/utils.js"
import * as storage from "../utils/storage/storeScope.js"
import { IWalletClient } from "../wallet/walletLink.js"
import { $TraderProfileSummary } from "../components/participant/$Summary"
import { $TraderPortfolio, $TraderProfile } from "../components/participant/$Trader"
import { pallete } from "@aelea/ui-components-theme"
import { $LastAtivity } from "./components/$LastActivity"


export interface IProfile {
  wallet: IWalletClient
  route: router.Route
  processData: Stream<IGmxProcessState>
  subscriptionList: Stream<IPuppetSubscritpion[]>
}

enum IProfileMode {
  TRADER = 'Trader',
  PUPPET = 'Puppet',
}


const optionDisplay = {
  [IProfileMode.PUPPET]: {
    label: 'Puppet',
    url: '/puppet'
  },
  [IProfileMode.TRADER]: {
    label: 'Trader',
    url: '/trader'
  },
}


export const $Wallet = (config: IProfile) => component((
  [changeRoute, changeRouteTether]: Behavior<string, string>,
  [selectProfileMode, selectProfileModeTether]: Behavior<IProfileMode>,
  [changeActivityTimeframe, changeActivityTimeframeTether]: Behavior<any, GMX.IntervalTime>,
  [modifySubscriber, modifySubscriberTether]: Behavior<IPuppetSubscritpion>,
) => {

  // const orchestrator = connectContract(PUPPET.CONTRACT[42161].Orchestrator)
  // const subscription = orchestrator.read('puppetSubscriptions', config.wallet.account.address)

  const activityTimeframe = storage.replayWrite(store.activityTimeframe, GMX.TIME_INTERVAL_MAP.MONTH, changeActivityTimeframe)
  const profileMode = storage.replayWrite(store.walletProfileMode, IProfileMode.PUPPET, selectProfileMode)


  const routeTrades = replayLatest(multicast(map(params => {
    if (!(config.wallet.account.address in params.processData.subscription)) {
      return []
    }

    return params.processData.subscription.filter(s => s.puppet === config.wallet.account.address) || []
  }, combineObject({ processData: config.processData }))))




  return [

    $column(layoutSheet.spacingBig)(
      $node(),

      $ButtonToggle({
        $container: $defaulButtonToggleContainer(style({ alignSelf: 'center', })),
        selected: profileMode,
        options: [IProfileMode.PUPPET, IProfileMode.TRADER],
        $$option: map(option => {
          return $text(optionDisplay[option].label)
        })
      })({ select: selectProfileModeTether() }),

      $row(style({ placeContent: 'space-between', alignItems: 'center', marginBottom: '-20px' }))(
        $node(),
        $LastAtivity(activityTimeframe)({
          changeActivityTimeframe: changeActivityTimeframeTether()
        })
      ),


      switchMap(mode => {
        const address = config.wallet.account.address
        if (mode === IProfileMode.PUPPET) {
          return $PuppetPortfolio({
            address, activityTimeframe,
            processData: config.processData,
            route: config.route,
            subscriptionList: config.subscriptionList,
          })({
            changeActivityTimeframe: changeActivityTimeframeTether(),
            changeRoute: changeRouteTether(),
            modifySubscriber: modifySubscriberTether(),
          }) 
        }

        return $TraderPortfolio({
          address, activityTimeframe,
          processData: config.processData,
          route: config.route,
        })({
          modifySubscriber: modifySubscriberTether(),
          changeRoute: changeRouteTether(),
          changeActivityTimeframe: changeActivityTimeframeTether(),
        })
      }, profileMode)


    ),

    {
      modifySubscriber,
      changeRoute
    }
  ]
})



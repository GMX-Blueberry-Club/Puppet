import { Behavior, combineObject } from "@aelea/core"
import { $node, $text, component, style } from "@aelea/dom"
import { $column, $row, layoutSheet } from "@aelea/ui-components"
import { pallete } from "@aelea/ui-components-theme"
import { empty, map } from "@most/core"
import { ADDRESS_ZERO, IntervalTime, factor, readableFactorPercentage, readableTokenAmount, readableUnitAmount, switchMap } from "common-utils"
import { EIP6963ProviderDetail } from "mipd"
import * as PUPPET from "puppet-middleware-const"
import { ISetRouteType, queryPuppetTradeRoute, queryTraderPositionOpen, queryTraderPositionSettled } from "puppet-middleware-utils"
import { $ButtonToggle, $defaulButtonToggleContainer, $infoLabeledValue, $infoTooltipLabel, $intermediateMessage } from "ui-components"
import { uiStorage } from "ui-storage"
import { $heading3 } from "../../common/$text"
import { $card, $responsiveFlex } from "../../common/elements/$common"
import { $IntermediateConnectButton } from "../../components/$ConnectWallet.js"
import { $VestingDetails } from "../../components/$VestingDetails"
import { IChangeSubscription } from "../../components/portfolio/$RouteSubscriptionEditor.js"
import * as storeDb from "../../const/store.js"
import { readLockSupply, readPuppetSupply } from "../../logic/puppetRead"
import { $seperator2 } from "../common"
import { IPageParams, IUserActivityParams, IWalletTab } from "../type.js"
import { $TraderPage } from "./$Trader.js"
import { $WalletPuppet } from "./$WalletPuppet.js"

const optionDisplay = {
  [IWalletTab.EARN]: {
    label: 'Earn',
    url: '/earn'
  },
  [IWalletTab.PUPPET]: {
    label: 'Puppet',
    url: '/puppet'
  },
  [IWalletTab.TRADER]: {
    label: 'Trader',
    url: '/trader'
  },
}


export const $WalletPage = (config: IPageParams & IUserActivityParams) => component((
  [changeRoute, changeRouteTether]: Behavior<string, string>,
  [selectProfileMode, selectProfileModeTether]: Behavior<IWalletTab>,
  [modifySubscriber, modifySubscriberTether]: Behavior<IChangeSubscription>,

  [changeActivityTimeframe, changeActivityTimeframeTether]: Behavior<any, IntervalTime>,
  [selectTradeRouteList, selectTradeRouteListTether]: Behavior<ISetRouteType[]>,

  [changeWallet, changeWalletTether]: Behavior<any, EIP6963ProviderDetail>,
) => {

  const { route, walletClientQuery, routeTypeListQuery, providerClientQuery, activityTimeframe, selectedTradeRouteList, priceTickMapQuery } = config

  const profileMode = uiStorage.replayWrite(storeDb.store.wallet, selectProfileMode, 'selectedTab')



  return [

    $column(layoutSheet.spacingBig)(
      $node(),

      $row(style({ flex: 1, placeContent: 'center' }))(
        $IntermediateConnectButton({
          walletClientQuery,
          $$display: map(wallet => {
            return empty()
            // return $ButtonSecondary({
            //   $content: $text('Disconnect')
            // })({
            //   click: changeWalletTether(constant(null))
            // })
          })
        })({
          changeWallet: changeWalletTether()
        }),
      ),

      $row(
        $node(style({ flex: 1 }))(),
        $ButtonToggle({
          $container: $defaulButtonToggleContainer(style({ alignSelf: 'center', })),
          selected: profileMode,
          options: [IWalletTab.EARN, IWalletTab.PUPPET, IWalletTab.TRADER],
          $$option: map(option => {
            return $text(optionDisplay[option].label)
          })
        })({ select: selectProfileModeTether() }),
        $node(style({ flex: 1 }))(),
      ),

      switchMap(params => {
        const address = switchMap(async walletQuery => {
          return (await walletQuery)?.account.address || ADDRESS_ZERO
        }, walletClientQuery)

        if (params.profileMode === IWalletTab.PUPPET) {
          const puppetTradeRouteListQuery = queryPuppetTradeRoute({ address, activityTimeframe, selectedTradeRouteList })
          
          const settledPositionListQuery = map(async tradeRoute => {
            return (await tradeRoute).map(x => x.settledList).flatMap(pp => pp.map(x => x.position))
          }, puppetTradeRouteListQuery)
          const openPositionListQuery = map(async tradeRoute => {
            return (await tradeRoute).map(x => x.openList).flatMap(pp => pp.map(x => x.position))
          }, puppetTradeRouteListQuery)

          return $WalletPuppet({
            walletClientQuery, route, priceTickMapQuery, openPositionListQuery, settledPositionListQuery, puppetTradeRouteListQuery,
            activityTimeframe, selectedTradeRouteList, routeTypeListQuery, providerClientQuery,
          })({
            changeRoute: changeRouteTether(),
            modifySubscriber: modifySubscriberTether(),
            changeActivityTimeframe: changeActivityTimeframeTether(),
            selectTradeRouteList: selectTradeRouteListTether(),
          })
        } else if (params.profileMode === IWalletTab.TRADER) {
          const settledPositionListQuery = queryTraderPositionSettled({ activityTimeframe, selectedTradeRouteList, address })
          const openPositionListQuery = queryTraderPositionOpen({ address, selectedTradeRouteList })

          return $column(layoutSheet.spacingTiny)(
            $TraderPage({ ...config, openPositionListQuery, settledPositionListQuery })({ 
              changeActivityTimeframe: changeActivityTimeframeTether(),
            })
          ) 
        }


        return $card(layoutSheet.spacingBig)(
          
          $responsiveFlex(layoutSheet.spacingBig)(

            $column(layoutSheet.spacing, style({ flex: 1 }))(
              $heading3('Vesting Details'),
              $VestingDetails({ ...config })({})
            ),
            $seperator2,
            $column(layoutSheet.spacing, style({ flex: 1 }))(
              $heading3('Protocol Flywheel'),
              style({ placeContent: 'space-between' })(
                $infoLabeledValue(
                  'Price',
                  $text(`$1`)
                )
              ),
              style({ placeContent: 'space-between' })(
                $infoLabeledValue(
                  $infoTooltipLabel('Weekly emissions mean giving out a fixed number of tokens every week, planned to last for 50 years', 'Weekly Emissions'),
                  $row(layoutSheet.spacingSmall, style({ alignItems: 'center' }))(
                    $text(style({ color: pallete.foreground, fontSize: '.75rem' }))(`(${readableUnitAmount(PUPPET.WEEKLY_EMISSIONS)} PUPPET)`),
                    $text(readableUnitAmount(PUPPET.WEEKLY_EMISSIONS))
                  ),
                )
              ),
              style({ placeContent: 'space-between' })(
                $infoLabeledValue(
                  $infoTooltipLabel('This week revenue amount that will be distributed anyone who locked their PUPPET', 'Current Revenue'),
                  $row(layoutSheet.spacingSmall, style({ alignItems: 'center' }))(
                    $text(style({ color: pallete.foreground, fontSize: '.75rem' }))(`($36,137)`),
                    $text(`21,383 / Week`)
                  ),
                )
              ),
              style({ placeContent: 'space-between' })(
                $infoLabeledValue(
                  $infoTooltipLabel('Total amount of PUPPET that has been emitted over the lifetime of the protocol. Each subsequent year, the number of new tokens minted will decrease by about 16%,', 'Total Emissions'),
                  $intermediateMessage(
                    map(async providerQuery => {
                      const provider = await providerQuery
                      const puppetSupply = readPuppetSupply(provider)

                      return readableTokenAmount(PUPPET.PUPPET_TOKEN_DESCRIPTION, await puppetSupply)
                    }, providerClientQuery)
                  ),
                )
              ),
              // style({ placeContent: 'space-between' })(
              //   $infoLabeledValue(
              //     $infoTooltipLabel('The total value of all PUPPET in circulation', 'Market Cap'),
              //     $text('10,000,000'),
              //   )
              // ),
              $seperator2,
              style({ placeContent: 'space-between' })(
                $infoLabeledValue(
                  $text('Average lock time'),
                  $intermediateMessage(
                    map(async providerQuery => {
                      const provider = await providerQuery
                      const puppetSupply = readPuppetSupply(provider)
                      const lockedSupply = readLockSupply(provider)

                      return readableFactorPercentage(factor(await lockedSupply, await puppetSupply))
                    }, providerClientQuery)
                  ),
                )
              ),
              style({ placeContent: 'space-between' })(
                $infoLabeledValue(
                  $text('Exit / Lock'),
                  $row(layoutSheet.spacingSmall, style({ alignItems: 'center' }))(
                    $text(style({ color: pallete.foreground, fontSize: '.75rem' }))(`(66% Lock)`),
                    $text(`14,112 / 28,654`)
                  ),
                )
              ),
            ),
            
          ),
        )
      }, combineObject({ profileMode }))


    ),

    {
      modifySubscriber, changeActivityTimeframe, selectTradeRouteList, changeRoute, changeWallet
    }
  ]
})



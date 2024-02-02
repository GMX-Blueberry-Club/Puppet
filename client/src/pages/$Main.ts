import { Behavior, fromCallback, replayLatest } from "@aelea/core"
import { $element, $node, $text, component, eventElementTarget, style, styleBehavior } from "@aelea/dom"
import * as router from '@aelea/router'
import { $column, $row, designSheet, layoutSheet } from '@aelea/ui-components'
import { colorAlpha, pallete } from "@aelea/ui-components-theme"
import { BLUEBERRY_REFFERAL_CODE } from "@gambitdao/gbc-middleware"
import { awaitPromises, constant, empty, map, merge, mergeArray, multicast, now, skipRepeats, startWith, switchLatest, take, tap } from '@most/core'
import { Stream } from "@most/types"
import { IntervalTime, filterNull, getTimeSince, readableUnitAmount, switchMap, unixTimestampNow, zipState } from "common-utils"
import { EIP6963ProviderDetail } from "mipd"
import { ISetRouteType, queryLatestPriceTick, queryRouteTypeList, subgraphStatus } from "puppet-middleware-utils"
import { $Tooltip, $alertPositiveContainer, $infoLabeledValue } from "ui-components"
import { indexDb, uiStorage } from "ui-storage"
import * as viem from "viem"
import { arbitrum } from "viem/chains"
import { $midContainer } from "../common/$common.js"
import { mipdStore } from "../components/$ConnectWallet"
import { $MainMenu, $MainMenuMobile } from '../components/$MainMenu.js'
import { $ButtonSecondary, $defaultMiniButtonSecondary } from "../components/form/$Button"
import { $RouteSubscriptionDrawer } from "../components/portfolio/$RouteSubscriptionDrawer.js"
import { IChangeSubscription } from "../components/portfolio/$RouteSubscriptionEditor"
import * as storeDb from "../const/store.js"
import { store } from "../const/store.js"
import { newUpdateInvoke } from "../sw/swUtils"
import { fadeIn } from "../transitions/enter.js"
import * as walletLink from "wallet"
import { $Home } from "./$Home.js"
import { $Trade } from "./$Trade.js"
import { $rootContainer } from "./common"
import { $Leaderboard } from "./leaderboard/$Leaderboard.js"
import { $PublicUserPage } from "./user/$PublicUser.js"
import { $WalletPage } from "./user/$Wallet.js"
import { $heading2 } from "../common/$text"
import { $Admin } from "./$Admin"

const popStateEvent = eventElementTarget('popstate', window)
const initialLocation = now(document.location)
const requestRouteChange = merge(initialLocation, popStateEvent)
const locationChange = map((location) => {
  return location
}, requestRouteChange)

interface IApp {
  baseRoute?: string
}


const chains = [ arbitrum ] as const


// const storage = createStorage({ storage: window.localStorage, key: 'walletLink' })
const projectId = import.meta.env.VITE_WC_PROJECT_ID || 'fdc797f2e6a68e01b9e17843c939673e'
// const llamaRpc = import.meta.env.VITE_LLAMANODES_PROJECT_ID || '01HCB0CBBH06TE3XSM6ZE4YYAD'

export const publicTransportMap = {
  [arbitrum.id]: viem.fallback([
    viem.webSocket('wss://arb-mainnet.g.alchemy.com/v2/RBsflxWv6IhITsLxAWcQlhCqSuxV7Low'),
    viem.http('https://arb1.arbitrum.io/rpc')
  ]),
  // [CHAIN.AVALANCHE]: avaGlobalProvider,
}


const metadata = {
  name: '__APP_NAME__',
  description: '__APP_DESC_SHORT__',
  url: '__WEBSITE__',
  icons: ['https://imagedelivery.net/_aTEfDRm7z3tKgu9JhfeKA/5a7df101-00dc-4856-60a9-921b2879e200/lg']
}


export const $Main = ({ baseRoute = '' }: IApp) => component((
  [routeChanges, changeRouteTether]: Behavior<any, string>,
  [modifySubscriptionList, modifySubscriptionListTether]: Behavior<IChangeSubscription[]>,
  [modifySubscriber, modifySubscriberTether]: Behavior<IChangeSubscription>,
  [clickUpdateVersion, clickUpdateVersionTether]: Behavior<any, bigint>,

  [changeActivityTimeframe, changeActivityTimeframeTether]: Behavior<IntervalTime>,
  [selectTradeRouteList, selectTradeRouteListTether]: Behavior<ISetRouteType[]>,

  [changeWallet, changeWalletTether]: Behavior<EIP6963ProviderDetail>,
) => {

  const changes = merge(locationChange, multicast(routeChanges))
  const fragmentsChange = map(() => {
    const trailingSlash = /\/$/
    const relativeUrl = location.href.replace(trailingSlash, '').split(document.baseURI.replace(trailingSlash, ''))[1]
    const frags = relativeUrl.split('/')
    frags.splice(0, 1, baseRoute)
    return frags
  }, changes)


  const rootRoute = router.create({ fragment: baseRoute, title: 'Puppet', fragmentsChange })
  const appRoute = rootRoute.create({ fragment: 'app', title: '' })

  const profileRoute = appRoute.create({ fragment: 'profile' })
  const walletRoute = appRoute.create({ fragment: 'wallet', title: 'Portfolio' })
  const tradeRoute = appRoute.create({ fragment: 'trade' })
  const tradeTermsAndConditions = appRoute.create({ fragment: 'terms-and-conditions' })

  const leaderboardRoute = appRoute.create({ fragment: 'leaderboard' })
  const adminRoute = appRoute.create({ fragment: 'admin' })

  const opengraph = rootRoute.create({ fragment: 'og' })

  const $liItem = $element('li')(style({ marginBottom: '14px' }))

  const isDesktopScreen = skipRepeats(map(() => document.body.clientWidth > 1040 + 280, startWith(null, eventElementTarget('resize', window))))

  const activityTimeframe = uiStorage.replayWrite(storeDb.store.global, changeActivityTimeframe, 'activityTimeframe')
  const selectedTradeRouteList = replayLatest(multicast(uiStorage.replayWrite(storeDb.store.global, selectTradeRouteList, 'selectedTradeRouteList')))

  const routeTypeListQuery = now(queryRouteTypeList())
  const priceTickMapQuery = replayLatest(queryLatestPriceTick({ activityTimeframe, selectedTradeRouteList }, 50))

  const subgraphBeaconStatusColor = map(status => {
    const timestampDelta = unixTimestampNow() - status.block.timestamp

    const color = timestampDelta > 60 ? pallete.negative : timestampDelta > 10 ? pallete.indeterminate : pallete.positive
    return color
  }, subgraphStatus)
  const subgraphStatusColorOnce = take(1, subgraphBeaconStatusColor)

  //  fromPromise(indexDb.get(store.global, 'wallet'))


  const changeWalletProviderRdns = map(detail => {
    return detail ? detail.info.rdns : null
  }, changeWallet)


  const walletRdnsStore = uiStorage.replayWrite(storeDb.store.global, changeWalletProviderRdns, 'wallet')
  const initWalletProvider: Stream<EIP6963ProviderDetail | null> = map(rdns => rdns ? mipdStore.findProvider({ rdns }) || null : null, walletRdnsStore)


  // hanlde disconnect and account change
  const walletProvider = map(d => d?.provider || null, mergeArray([initWalletProvider, changeWallet]))


  const chainIdQuery = indexDb.get(store.global, 'chain')
  const chainQuery: Stream<Promise<viem.Chain>> = now(chainIdQuery.then(id => chains.find(c => c.id === id) || arbitrum))

  const { providerQuery, publicProviderQuery, walletClientQuery } = walletLink.initWalletLink({ publicTransportMap, chainQuery, walletProvider })

  const block = switchMap(async query => (await query).getBlockNumber(), providerQuery)
  const latestBlock: Stream<bigint> = switchLatest(switchMap(async query => {
    const provider = await query
    const blockChange = fromCallback(cb => provider.watchBlockNumber({
      onBlockNumber: bn => {
        return cb(bn)
      }
    }))
    return mergeArray([blockChange, block])
  }, providerQuery))


  return [
    $column(
      switchMap(cb => {
        return fadeIn(
          $alertPositiveContainer(style({ backgroundColor: pallete.horizon }))(
            filterNull(constant(null, clickUpdateVersion)) as any,

            $text('New version Available'),
            $ButtonSecondary({
              $container: $defaultMiniButtonSecondary,
              $content: $text('Update'),
            })({
              click: clickUpdateVersionTether(
                tap(cb)
              )
            })
          )
              
        )
      }, newUpdateInvoke),
      router.contains(appRoute)(
        $rootContainer(
          $column(style({ flex: 1, position: 'relative' }))(

            $column(
              designSheet.customScroll,
              style({ flex: 1, position: 'absolute', inset: 0, overflowY: 'scroll', overflowX: 'hidden' })
            )(
              switchMap(isDesktop => {
                if (isDesktop) {
                  return $MainMenu({ route: appRoute, walletClientQuery, providerQuery })({
                    routeChange: changeRouteTether()
                  })
                }

                return $MainMenuMobile({ route: rootRoute, walletClientQuery, providerQuery })({
                  routeChange: changeRouteTether(),
                })
              }, isDesktopScreen),
              router.contains(walletRoute)(
                $midContainer(
                  $WalletPage({ route: walletRoute, routeTypeListQuery, providerQuery, activityTimeframe, selectedTradeRouteList, priceTickMapQuery, walletClientQuery })({
                    changeWallet: changeWalletTether(),
                    modifySubscriber: modifySubscriberTether(),
                    changeRoute: changeRouteTether(),
                    changeActivityTimeframe: changeActivityTimeframeTether(),
                    selectTradeRouteList: selectTradeRouteListTether(),
                  })
                )
              ),
              router.match(leaderboardRoute)(
                $midContainer(
                  fadeIn($Leaderboard({ route: leaderboardRoute, providerQuery, activityTimeframe, walletClientQuery, selectedTradeRouteList, priceTickMapQuery, routeTypeListQuery })({
                    changeActivityTimeframe: changeActivityTimeframeTether(),
                    selectTradeRouteList: selectTradeRouteListTether(),
                    routeChange: changeRouteTether(),
                    modifySubscriber: modifySubscriberTether(),
                  }))
                )
              ),
              router.contains(profileRoute)(
                $midContainer(
                  fadeIn($PublicUserPage({ route: profileRoute,  walletClientQuery, routeTypeListQuery, priceTickMapQuery, activityTimeframe, selectedTradeRouteList, providerQuery })({
                    modifySubscriber: modifySubscriberTether(),
                    changeActivityTimeframe: changeActivityTimeframeTether(),
                    selectTradeRouteList: selectTradeRouteListTether(),
                    changeRoute: changeRouteTether(),
                  }))
                )
              ),
              router.contains(adminRoute)(
                $Admin({ walletClientQuery, providerQuery })({
                  changeWallet: changeWalletTether(),
                })
              ),
              router.match(tradeTermsAndConditions)(
                fadeIn(
                  $midContainer(layoutSheet.spacing, style({ maxWidth: '680px', alignSelf: 'center' }))(
                    $heading2(style({ fontSize: '3em', textAlign: 'center' }))('Puppet DAO'),
                    $node(),
                    $text(style({ fontSize: '1.5rem', textAlign: 'center', fontWeight: 'bold' }))('Terms And Conditions'),
                    $text(style({ whiteSpace: 'pre-wrap' }))(`By accessing, I agree that ${document.location.host} is not responsible for any loss of funds, and I agree to the following terms and conditions:`),
                    $element('ul')(layoutSheet.spacing, style({  }))(
                      $liItem(
                        $text(`I am not a United States person or entity;`),
                      ),
                      $liItem(
                        $text(`I am not a resident, national, or agent of any country to which the United States, the United Kingdom, the United Nations, or the European Union embargoes goods or imposes similar sanctions, including without limitation the U.S. Office of Foreign Asset Control, Specifically Designated Nationals and Blocked Person List;`),
                      ),
                      $liItem(
                        $text(`I am legally entitled to access the Interface under the laws of the jurisdiction where I am located;`),
                      ),
                      $liItem(
                        $text(`I am responsible for the risks using the Interface, including, but not limited to, the following: (i) the use of Puppet smart contracts; (ii) leverage trading, the risk may result in the total loss of my deposit.`),
                      ),
                    ),
                    $node(style({ height: '100px' }))(),
                  )
                ),
              ),
              router.match(tradeRoute)(
                switchMap(chain => {
                  return $Trade({
                    providerQuery,
                    walletClientQuery,
                    routeTypeListQuery,
                    chain: chain, referralCode: BLUEBERRY_REFFERAL_CODE, parentRoute: tradeRoute
                  })({
                    changeWallet: changeWalletTether(),
                  })
                }, awaitPromises(chainQuery))  
              ),
              $row(layoutSheet.spacing, style({ position: 'fixed', zIndex: 100, right: '16px', bottom: '16px' }))(
                $row(
                  $Tooltip({
                    $content: switchMap(params => {
                      const blocksBehind = $text(readableUnitAmount(Math.max(0, Number(params.latestBlock) - params.subgraphStatus.block.number)))
                      const timeSince = getTimeSince(Number(params.subgraphStatus.block.timestamp))
                      

                      return $column(layoutSheet.spacingTiny)(
                        $text('Subgraph Status'),
                        $column(
                          params.subgraphStatus.hasIndexingErrors
                            ? $alertPositiveContainer($text('Indexing has experienced errors')) : empty(),
                          $infoLabeledValue('Latest Sync', timeSince), 
                          $infoLabeledValue('blocks behind', blocksBehind),
                        )
                      )
                    }, zipState({ subgraphStatus, latestBlock })),
                    $anchor: $row(
                      style({ width: '8px', height: '8px', borderRadius: '50%', outlineOffset: '4px', padding: '6px' }),
                      styleBehavior(map(color => {
                        return { backgroundColor: colorAlpha(color, .5), outlineColor: color }
                      }, subgraphStatusColorOnce))
                    )(
                      $node(
                        style({
                          position: 'absolute', top: 'calc(50% - 20px)', left: 'calc(50% - 20px)', width: '40px', height: '40px',
                          borderRadius: '50%', border: `1px solid rgba(74, 180, 240, 0.12)`, opacity: 0,
                          animationName: 'signal', animationDuration: '2s',
                          animationTimingFunction: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)'
                        }),
                        styleBehavior(map(color => {
                          return { backgroundColor: colorAlpha(color, .5), animationIterationCount: color === pallete.negative ? 'infinite' : 1 }
                        }, subgraphStatusColorOnce))
                      )()
                    ),
                  })({}),
                ),

              ),
            )
          ),

          $column(style({ maxWidth: '1000px', margin: '0 auto', width: '100%', zIndex: 10 }))(
            $RouteSubscriptionDrawer({
              providerQuery,
              walletClientQuery,
              routeTypeListQuery,
              modifySubscriptionList: replayLatest(modifySubscriptionList, []),
              modifySubscriber,
            })({
              changeWallet: changeWalletTether(),
              modifySubscriptionList: modifySubscriptionListTether()
            })
          )
        )
      ),

      router.match(rootRoute)(
        $rootContainer(
          designSheet.customScroll,
          style({
            scrollSnapType: 'y mandatory',
            fontSize: '1.15rem',
            overflow: 'hidden scroll',
            maxHeight: '100vh',
            margin: '0 auto', width: '100%'
          })
        )(
          $Home({
            parentRoute: rootRoute,
          })({ routeChanges: changeRouteTether() })
        )
      ),

      // router.contains(opengraph)(
      //   $Opengraph(opengraph)({
      //     changeRoute: changeRouteTether()
      //   })
      // )

    )

  ]
})


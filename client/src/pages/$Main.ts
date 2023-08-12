import { Behavior, combineObject, replayLatest } from "@aelea/core"
import { $element, $node, $text, component, eventElementTarget, nodeEvent, style, styleBehavior } from "@aelea/dom"
import * as router from '@aelea/router'
import { $column, $row, designSheet, layoutSheet, screenUtils } from '@aelea/ui-components'
import { colorAlpha, pallete } from "@aelea/ui-components-theme"
import { BLUEBERRY_REFFERAL_CODE } from "@gambitdao/gbc-middleware"
import { constant, empty, fromPromise, join, map, merge, mergeArray, multicast, now, skipRepeats, snapshot, startWith, switchLatest, tap } from '@most/core'
import { ARBITRUM_ADDRESS, AVALANCHE_ADDRESS, CHAIN, IntervalTime, TIME_INTERVAL_MAP } from "gmx-middleware-const"
import { ETH_ADDRESS_REGEXP, switchMap, timeSince, unixTimestampNow } from "gmx-middleware-utils"
import { $IntermediateConnectButton } from "../components/$ConnectAccount"
import { $MainMenu, $MainMenuMobile } from '../components/$MainMenu'
import { fadeIn } from "../transitions/enter"
import { $Admin } from "./$Admin"
import { $Home } from "./$Home"
import { $Trade } from "./$Trade"
import { $Wallet } from "./$Wallet"
import { $Leaderboard } from "./leaderboard/$Leaderboard"
import { gmxProcess } from "../data/process/process"
import { syncProcess } from "../utils/indexer/processor"
import { publicClient, block, blockCache, chain, IWalletClient, blockChange, wallet } from "../wallet/walletLink"
import { getBlockNumberCache } from "viem/public"
import * as wagmi from "@wagmi/core"
import { $Profile } from "./$Profile"
import * as viem from 'viem'
import { $RouteSubscriptionDrawer } from "../components/$RouteSubscription"
import { IPuppetRouteSubscritpion, IPuppetRouteTrades } from "puppet-middleware-utils"
import { rootStoreScope } from "../data/store/store"
import * as store from "../utils/storage/storeScope"
import { $midContainer } from "../common/$common"
import { $heading2, $heading3 } from "../common/$text"
import { $alert, $anchor, $defaultVScrollLoader, $spinner } from "gmx-middleware-ui-components"
import * as GMX from "gmx-middleware-const"
import { Stream } from "@most/types"

const popStateEvent = eventElementTarget('popstate', window)
const initialLocation = now(document.location)
const requestRouteChange = merge(initialLocation, popStateEvent)
const locationChange = map((location) => {
  return location
}, requestRouteChange)

interface Website {
  baseRoute?: string
}





export const $Main = ({ baseRoute = '' }: Website) => component((
  [routeChanges, linkClickTether]: Behavior<any, string>,
  [subscribeTrader, subscribeTraderTether]: Behavior<IPuppetRouteSubscritpion>,
  [changeSubscribeList, changeSubscribeListTether]: Behavior<IPuppetRouteSubscritpion[]>,
  [clickCloseSubscPanel, clickCloseSubscPanelTether]: Behavior<any>,
  [syncProcessData, syncProcessDataTether]: Behavior<any, bigint>,

) => {


  const syncProcessEvent = multicast(switchMap(params => {
    if (params.syncProcessData > params.seed.endBlock) {
      return syncProcess({ ...gmxProcess, publicClient: params.publicClient, syncBlock: params.syncProcessData })
    }

    return now(params.seed)
  }, combineObject({ publicClient, seed: gmxProcess.seed, syncProcessData })))

  const process = mergeArray([gmxProcess.seed, syncProcessEvent])
  const processData = map(p => p.state, process)


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
  const adminRoute = appRoute.create({ fragment: 'admin', title: 'Admin Utilities' })
  const TRADEURL = 'trade'
  const tradeRoute = appRoute.create({ fragment: TRADEURL })
  const tradeTermsAndConditions = appRoute.create({ fragment: 'trading-terms-and-conditions' })

  const leaderboardRoute = appRoute.create({ fragment: 'leaderboard' })


  const $liItem = $element('li')(style({ marginBottom: '14px' }))
  const $rootContainer = $column(
    designSheet.main,
    style({
      color: pallete.message,
      fill: pallete.message,
      // position: 'relative',
      // backgroundImage: `radial-gradient(570% 71% at 50% 15vh, ${pallete.background} 0px, ${pallete.horizon} 100%)`,
      backgroundColor: pallete.horizon,
      fontSize: '1rem',
      // fontSize: screenUtils.isDesktopScreen ? '1.15rem' : '1rem',
      minHeight: '100vh',
      fontWeight: 400,
      overflowX: 'hidden',
      flexDirection: 'row',
    }),

    screenUtils.isMobileScreen
      ? style({ userSelect: 'none' })
      : style({}),
  )
  const isMobileScreen = skipRepeats(map(() => document.body.clientWidth > 1040 + 280, startWith(null, eventElementTarget('resize', window))))

  
  const subscribeList = replayLatest(changeSubscribeList, [] as IPuppetRouteSubscritpion[])



  return [

    mergeArray([
      router.match(rootRoute)(
        $rootContainer(
          style({
            scrollSnapType: 'y mandatory',
            fontSize: '1.15rem',
            margin: '0 auto', width: '100%'
          })
        )(
          $Home({
            parentRoute: rootRoute,
          })({ routeChanges: linkClickTether() })

        )
      ),
      router.contains(appRoute)(
        $rootContainer(
          styleBehavior(map(isMobile => ({ flexDirection: isMobile ? 'row' : 'column' }), isMobileScreen)),
          screenUtils.isDesktopScreen
            ? style({
              display: 'flex', flexDirection: 'row',
            })
            : style({
              display: 'flex', flexDirection: 'column',
              gap: '35px',
            })
        )(
          switchMap(isMobile => {
            return isMobile
              ? $MainMenu({ parentRoute: appRoute, chainList: [CHAIN.ARBITRUM, CHAIN.AVALANCHE] })({
                routeChange: linkClickTether()
              })
              : $MainMenuMobile({ parentRoute: rootRoute, chainList: [CHAIN.ARBITRUM, CHAIN.AVALANCHE] })({
                routeChange: linkClickTether(),
              })
          }, isMobileScreen),


          switchMap(chainEvent => {
            return $column(style({ flex: 1, position: 'relative', padding: '0 8px' }))(

              router.contains(walletRoute)(
                $IntermediateConnectButton({
                  $$display: map(wallet => {
                    return $midContainer(
                      $Wallet({
                        route: walletRoute,
                        processData,
                        wallet: wallet,
                      })({
                        changeRoute: linkClickTether(),
                      }))
                  })
                })({})
              ),
              router.contains(leaderboardRoute)(
                $midContainer(
                  fadeIn($Leaderboard({
                    subscribeList,
                    route: leaderboardRoute,
                    processData
                  })({
                    routeChange: linkClickTether(
                      tap(console.log)
                    ),
                    subscribeTrader: subscribeTraderTether(),
                    changeSubscribeList: changeSubscribeListTether(),
                  }))
                )
              ),
              router.contains(profileRoute)(
                $midContainer(
                  fadeIn($Profile({
                    route: profileRoute,
                    processData
                  })({
                    subscribeTreader: subscribeTraderTether(),
                    changeRoute: linkClickTether()
                  }))
                )
              ),
            
              router.match(tradeTermsAndConditions)(
                $midContainer(layoutSheet.spacing, style({ maxWidth: '680px', alignSelf: 'center' }))(
                  $text(style({ fontSize: '3em', textAlign: 'center' }))('GBC Trading'),
                  $node(),
                  $text(style({ fontSize: '1.5rem', textAlign: 'center', fontWeight: 'bold' }))('Terms And Conditions'),
                  $text(style({ whiteSpace: 'pre-wrap' }))(`By accessing, I agree that ${document.location.host + '/app/' + TRADEURL} is an interface (hereinafter the "Interface") to interact with external GMX smart contracts, and does not have access to my funds. I represent and warrant the following:`),
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
                      $text(`I am responsible for the risks using the Interface, including, but not limited to, the following: (i) the use of GMX smart contracts; (ii) leverage trading, the risk may result in the total loss of my deposit.`),
                    ),
                  ),

                  $node(style({ height: '100px' }))(),
                ),

              ),
              router.match(adminRoute)(
                $midContainer(
                  $Admin({})
                ),
              ),
              router.match(tradeRoute)(
                $Trade({
                  chain: chainEvent,
                  processData,
                  referralCode: BLUEBERRY_REFFERAL_CODE,
                  tokenIndexMap: {
                    [CHAIN.ARBITRUM]: [
                      ARBITRUM_ADDRESS.NATIVE_TOKEN,
                      ARBITRUM_ADDRESS.WBTC,
                      ARBITRUM_ADDRESS.LINK,
                      ARBITRUM_ADDRESS.UNI,
                    ],
                    [CHAIN.AVALANCHE]: [
                      AVALANCHE_ADDRESS.NATIVE_TOKEN,
                      AVALANCHE_ADDRESS.WETHE,
                      AVALANCHE_ADDRESS.WBTCE,
                      AVALANCHE_ADDRESS.BTCB,
                    ]
                  },
                  tokenStableMap: {
                    [CHAIN.ARBITRUM]: [
                      ARBITRUM_ADDRESS.USDC,
                      ARBITRUM_ADDRESS.USDT,
                      ARBITRUM_ADDRESS.DAI,
                      ARBITRUM_ADDRESS.FRAX,
                    // ARBITRUM_ADDRESS.MIM,
                    ],
                    [CHAIN.AVALANCHE]: [
                      AVALANCHE_ADDRESS.USDC,
                      AVALANCHE_ADDRESS.USDCE,
                    // AVALANCHE_ADDRESS.MIM,
                    ]
                  },
                  parentRoute: tradeRoute
                })({
                  changeRoute: linkClickTether()
                })
              ),
            

              switchMap(params => {
                const mode = (import.meta as any).env.MODE
                const refreshThreshold = mode === 'development' ? 550 : 50
                const blockDelta = params.syncBlock - params.process.endBlock


                const lastUpdate = timeSince(params.process.state.approximatedTimestamp) + ' old'
                if (blockDelta < refreshThreshold) {
                  return empty()
                }


                return switchLatest(mergeArray([
                  now(
                    fadeIn($row(
                      style({ position: 'absolute', bottom: '18px', left: `50%` }),
                      syncProcessDataTether(
                        constant(params.syncBlock)
                      )
                    )(
                      style({  transform: 'translateX(-50%)' })(
                        $column(layoutSheet.spacingTiny, style({
                          border: `1px solid`,
                          padding: '20px',
                          animation: `borderRotate var(--d) linear infinite forwards`,
                          borderImage: `conic-gradient(from var(--angle), ${colorAlpha(pallete.indeterminate, .25)}, ${pallete.indeterminate} 0.1turn, ${pallete.indeterminate} 0.15turn, ${colorAlpha(pallete.indeterminate, .25)} 0.25turn) 30`
                        }))(
                          $text(`Syncing Blockchain Data....`),
                          $text(style({ color: pallete.foreground, fontSize: '.75rem' }))(`${lastUpdate} data is displayed`),
                        )
                      )
                    ))
                  ),
                // map(seed => empty(), syncProcess({ ...gmxProcess, publicClient: params.publicClient, syncBlock: params.syncBlock }))
                ]))
              }, combineObject({ process, syncBlock: block })),

              $RouteSubscriptionDrawer({
                subscribeList,
                subscribeTrader
              })({
                // clickClose: clickCloseSubscPanelTether(),
                changeSubscribeList: changeSubscribeListTether()
              }),
            )
          }, chain),
          
        )
      ),
    ])

  ]
})


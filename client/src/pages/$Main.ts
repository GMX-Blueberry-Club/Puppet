import { Behavior, combineObject, replayLatest } from "@aelea/core"
import { $element, $node, $text, component, eventElementTarget, style } from "@aelea/dom"
import * as router from '@aelea/router'
import { $column, designSheet, layoutSheet, screenUtils } from '@aelea/ui-components'
import { pallete } from "@aelea/ui-components-theme"
import { BLUEBERRY_REFFERAL_CODE } from "@gambitdao/gbc-middleware"
import { fromPromise, map, merge, mergeArray, multicast, now, skipRepeats, startWith, tap } from '@most/core'
import { ARBITRUM_ADDRESS, AVALANCHE_ADDRESS, CHAIN, TIME_INTERVAL_MAP } from "gmx-middleware-const"
import { ETH_ADDRESS_REGEXP, switchMap, unixTimestampNow } from "gmx-middleware-utils"
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
import { publicClient, block, blockCache } from "../wallet/walletLink"
import { getBlockNumberCache } from "viem/public"
import * as wagmi from "@wagmi/core"
import { $Profile } from "./$Profile"
import * as viem from 'viem'
import { $SubscriberDrawer } from "../components/$SubscriberDrawer"
import { ITraderSubscritpion } from "puppet-middleware-utils"
import { rootStoreScope } from "../rootStore"
import * as store from "../utils/storage/storeScope"


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
  [subscribeTrader, subscribeTraderTether]: Behavior<ITraderSubscritpion>,
  [toggleMenu, toggleMenuTether]: Behavior<boolean>,

  // [resizeScreen, resizeScreenTether]: Behavior<any, ResizeObserverEntry[]>,
) => {

  const tradingStore = store.createStoreScope(rootStoreScope, 'tradeBox' as const)
  const isMenuOpen = store.replayWrite(tradingStore, true, toggleMenu, 'isLong')

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
      fontSize: '1.15rem',
      minHeight: '100vh',
      fontWeight: 400,
      overflowX: 'hidden',
      flexDirection: 'row',
    })
  )

  const isMobileScreen = skipRepeats(map(() => document.body.clientWidth > 1040 + 280, startWith(null, eventElementTarget('resize', window))))

  const processData = replayLatest(multicast(switchMap(seed => {
    const refreshThreshold = import.meta.env.MODE === 'development' ? TIME_INTERVAL_MAP.MIN5 : TIME_INTERVAL_MAP.MIN / 6
    const timeNow = unixTimestampNow()

    if (timeNow - seed.approximatedTimestamp > refreshThreshold) {
      return replayLatest(multicast(switchMap(params => {
        return map(seedState => seedState.seed, syncProcess({ ...gmxProcess, publicClient: params.publicClient, endBlock: params.block }))
      }, combineObject({ publicClient, block: blockCache }))))
    }

    return now(seed)
  }, gmxProcess.seed)))

  const subscribeList = replayLatest(map(l => [l], subscribeTrader), [] as ITraderSubscritpion[])


  return [

    mergeArray([
      router.match(rootRoute)(
        $rootContainer(
          style({
            scrollSnapType: 'y mandatory',
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
          screenUtils.isDesktopScreen
            ? style({
              display: 'flex', flexDirection: 'row',
            })
            : style({
              display: 'flex', flexDirection: 'column',
              gap: '35px',
            })
        )(
          $text(map(x => '', processData)),
          switchMap(isMobile => {
            return isMobile
              ? $MainMenu({ isMenuOpen, parentRoute: appRoute, chainList: [CHAIN.ARBITRUM, CHAIN.AVALANCHE] })({
                routeChange: linkClickTether(),
                toggleMenu: toggleMenuTether()
              })
              : $MainMenuMobile({ isMenuOpen, parentRoute: rootRoute, chainList: [CHAIN.ARBITRUM, CHAIN.AVALANCHE] })({
                routeChange: linkClickTether(),
              })
          }, isMobileScreen),
          
          $column(
            // styleBehavior(map(isMobile => ({ flexDirection: isMobile ? 'row' : 'column' }), isMobileScreen)),
            style({
              margin: '0 auto', maxWidth: '1240px', position: 'relative', gap: screenUtils.isDesktopScreen ? '50px' : '50px', width: '100%', padding: '45px 15px 15px',
              flex: 1, 
            }),
          )(

            router.contains(walletRoute)(
              $IntermediateConnectButton({
                $$display: map(wallet => {
                  return $Wallet({
                    route: walletRoute,
                    processData,
                    wallet: wallet,
                  })({
                    changeRoute: linkClickTether(),
                  })
                })
              })({})
            ),
            router.contains(leaderboardRoute)(
              fadeIn($Leaderboard({
                subscribeList,
                route: leaderboardRoute,
                processData
              })({
                routeChange: linkClickTether(
                  tap(console.log)
                ),
                changeSubscribeList: subscribeTraderTether()
              }))
            ),
            router.contains(profileRoute)(
              fadeIn($Profile({
                route: profileRoute,
                processData
              })({
                subscribeTreader: subscribeTraderTether(),
                changeRoute: linkClickTether()
              }))
            ),
            router.match(tradeRoute)(
              $IntermediateConnectButton({
                $$display: map(wallet => {
                  return $Trade({
                    chain: wallet.chain,
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
                })
              })({})
            ),
            router.match(tradeTermsAndConditions)(
              $column(layoutSheet.spacing, style({ maxWidth: '680px', alignSelf: 'center' }))(
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
              $Admin({}),
            ),

            $SubscriberDrawer({
              subscribeList,
              subscribeTrader
            })({
              
            }),

          ),
          
        )
      ),
    ])

  ]
})


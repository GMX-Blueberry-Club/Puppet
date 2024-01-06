import { Behavior, replayLatest } from "@aelea/core"
import { $element, $node, $text, component, eventElementTarget, style } from "@aelea/dom"
import * as router from '@aelea/router'
import { $column, designSheet, layoutSheet, screenUtils } from '@aelea/ui-components'
import { pallete } from "@aelea/ui-components-theme"
import { BLUEBERRY_REFFERAL_CODE } from "@gambitdao/gbc-middleware"
import { constant, fromPromise, map, merge, multicast, now, skipRepeats, startWith, tap } from '@most/core'
import { CHAIN } from "gmx-middleware-const"
import { $alertContainer } from "gmx-middleware-ui-components"
import { filterNull, switchMap } from "gmx-middleware-utils"
import { queryRouteTypeList } from "puppet-middleware-utils"
import { $midContainer } from "../common/$common.js"
import { $IntermediateConnectButton } from "../components/$ConnectAccount.js"
import { $MainMenu, $MainMenuMobile } from '../components/$MainMenu.js'
import { $ButtonSecondary, $defaultMiniButtonSecondary } from "../components/form/$Button"
import { $RouteSubscriptionDrawer } from "../components/portfolio/$RouteSubscriptionDrawer.js"
import { IChangeSubscription } from "../components/portfolio/$RouteSubscriptionEditor"
import { subgraphClient } from "../data/subgraph/client"
import { newUpdateInvoke } from "../sw/swUtils"
import { fadeIn } from "../transitions/enter.js"
import { chain } from "../wallet/walletLink.js"
import { $Home } from "./$Home.js"
import { $Profile } from "./$Profile.js"
import { $Trade } from "./$Trade.js"
import { $Wallet } from "./$Wallet.js"
import { $Leaderboard } from "./leaderboard/$Leaderboard.js"


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
  [modifySubscriptionList, modifySubscriptionListTether]: Behavior<IChangeSubscription[]>,
  [modifySubscriber, modifySubscriberTether]: Behavior<IChangeSubscription>,
  [clickUpdateVersion, clickUpdateVersionTether]: Behavior<any, bigint>,

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

  const $liItem = $element('li')(style({ marginBottom: '14px' }))
  const $rootContainer = $column(
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
      // flexDirection: 'row',
    }),

    screenUtils.isMobileScreen
      ? style({ userSelect: 'none' })
      : style({}),
  )
  const isDesktopScreen = skipRepeats(map(() => document.body.clientWidth > 1040 + 280, startWith(null, eventElementTarget('resize', window))))
  const routeTypeList = fromPromise(queryRouteTypeList(subgraphClient))


  return [
    $column(
      switchMap((cb) => {
        return fadeIn(
          $alertContainer(style({ backgroundColor: pallete.horizon }))(
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
            switchMap(chainEvent => {
              return $column(
                designSheet.customScroll,
                style({
                  flex: 1, position: 'absolute', inset: 0,
                  overflowY: 'scroll', overflowX: 'hidden'
                })
              )(
                switchMap(isDesktop => {
                  if (isDesktop) {
                    return $MainMenu({ parentRoute: appRoute, chainList: [CHAIN.ARBITRUM, CHAIN.AVALANCHE] })({
                      routeChange: linkClickTether()
                    })
                  }

                  return $MainMenuMobile({ parentRoute: rootRoute, chainList: [CHAIN.ARBITRUM, CHAIN.AVALANCHE] })({
                    routeChange: linkClickTether(),
                  })
                }, isDesktopScreen),

                router.contains(walletRoute)(
                  $IntermediateConnectButton({
                    $$display: map(wallet => {
                      return $midContainer(
                        $Wallet({
                          routeTypeList,
                          route: walletRoute,
                          wallet: wallet,
                        })({
                          modifySubscriber: modifySubscriberTether(),
                          changeRoute: linkClickTether(),
                        }))
                    })
                  })({})
                ),
                router.match(leaderboardRoute)(
                  $midContainer(
                    fadeIn($Leaderboard({
                      // subscriptionList,
                      route: leaderboardRoute,
                    })({
                      routeChange: linkClickTether(
                        tap(console.log)
                      ),
                      modifySubscriber: modifySubscriberTether(),
                    }))
                  )
                ),
                router.contains(profileRoute)(
                  $midContainer(
                    fadeIn($Profile({
                      route: profileRoute, routeTypeList,
                    })({
                      modifySubscriber: modifySubscriberTether(),
                      changeRoute: linkClickTether(),
                    }))
                  )
                ),
                router.match(tradeTermsAndConditions)(
                  fadeIn(
                    $midContainer(layoutSheet.spacing, style({ maxWidth: '680px', alignSelf: 'center' }))(
                      $text(style({ fontSize: '3em', textAlign: 'center' }))('GBC Trading'),
                      $node(),
                      $text(style({ fontSize: '1.5rem', textAlign: 'center', fontWeight: 'bold' }))('Terms And Conditions'),
                      $text(style({ whiteSpace: 'pre-wrap' }))(`By accessing, I agree that ${document.location.host} is an interface (hereinafter the "Interface") to interact with external GMX smart contracts, and does not have access to my funds. I represent and warrant the following:`),
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
                    )
                  ),
                ),
                router.match(tradeRoute)(
                  $Trade({
                    routeTypeList,
                    chain: chainEvent,
                    referralCode: BLUEBERRY_REFFERAL_CODE,
                    parentRoute: tradeRoute
                  })({
                    changeRoute: linkClickTether()
                  })
                ),

                
              )
            }, chain)
          ),

          $column(style({ maxWidth: '1000px', margin: '0 auto', width: '100%', zIndex: 10 }))(
            $RouteSubscriptionDrawer({
              routeTypeList,
              modifySubscriptionList: replayLatest(modifySubscriptionList, []),
              modifySubscriber,
            })({
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
          })({ routeChanges: linkClickTether() })
        )
      ),

    )

  ]
})


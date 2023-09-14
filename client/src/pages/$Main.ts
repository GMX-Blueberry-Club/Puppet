import { Behavior, combineObject, replayLatest } from "@aelea/core"
import { $element, $node, $text, component, eventElementTarget, nodeEvent, style, styleBehavior } from "@aelea/dom"
import * as router from '@aelea/router'
import { $column, $row, designSheet, layoutSheet, screenUtils } from '@aelea/ui-components'
import { colorAlpha, pallete } from "@aelea/ui-components-theme"
import { BLUEBERRY_REFFERAL_CODE } from "@gambitdao/gbc-middleware"
import { constant, empty, fromPromise, join, map, merge, mergeArray, multicast, now, skipRepeats, snapshot, startWith, switchLatest, take, tap } from '@most/core'
import { ARBITRUM_ADDRESS, AVALANCHE_ADDRESS, CHAIN, IntervalTime, TIME_INTERVAL_MAP } from "gmx-middleware-const"
import { ETH_ADDRESS_REGEXP, filterNull, switchMap, timeSince, unixTimestampNow } from "gmx-middleware-utils"
import { $IntermediateConnectButton } from "../components/$ConnectAccount.js"
import { $MainMenu, $MainMenuMobile } from '../components/$MainMenu.js'
import { fadeIn } from "../transitions/enter.js"
import { $Admin } from "./$Admin.js"
import { $Home } from "./$Home.js"
import { $Trade } from "./$Trade.js"
import { $Wallet } from "./$Wallet.js"
import { $Leaderboard } from "./leaderboard/$Leaderboard.js"
import { gmxProcess } from "../data/process/process.js"
import { syncProcess } from "../utils/indexer/processor.js"
import { publicClient, block, blockCache, chain, IWalletClient, blockChange, wallet } from "../wallet/walletLink.js"
import { getBlockNumberCache } from "viem/public"
import * as wagmi from "@wagmi/core"
import { $Profile } from "./$Profile.js"
import * as viem from 'viem'
import { $RouteSubscriptionDrawer } from "../components/$RouteSubscription.js"
import { IPuppetRouteSubscritpion } from "puppet-middleware-utils"
import { rootStoreScope } from "../data/store/store.js"
import * as store from "../utils/storage/storeScope.js"
import { $midContainer } from "../common/$common.js"
import { $heading2, $heading3 } from "../common/$text.js"
import { $alert, $alertContainer, $anchor, $defaultVScrollLoader, $spinner } from "gmx-middleware-ui-components"
import * as GMX from "gmx-middleware-const"
import { Stream } from "@most/types"
import { newUpdateInvoke } from "../sw/swUtils.js"
import { $ButtonPrimary, $ButtonSecondary, $defaultMiniButtonSecondary } from "../components/form/$Button.js"
import { contractReader, helloRpc } from "../logic/common.js"

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
  [modifySubscriptionList, modifySubscriptionListTether]: Behavior<IPuppetRouteSubscritpion[]>,
  [modifySubscriber, modifySubscriberTether]: Behavior<IPuppetRouteSubscritpion>,
  [syncProcessData, syncProcessDataTether]: Behavior<any, bigint>,
  [clickUpdateVersion, clickUpdateVersionTether]: Behavior<any, bigint>,

) => {

  const syncProcessEvent = multicast(switchMap(params => {
    if (params.syncProcessData > params.seed.config.endBlock) {
      return syncProcess({ ...gmxProcess, publicClient: params.publicClient, syncBlock: params.syncProcessData })
    }

    return now(params.seed)
  }, combineObject({ publicClient, seed: gmxProcess.seed, syncProcessData })))

  const process = replayLatest(multicast(mergeArray([gmxProcess.seed, syncProcessEvent])))
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
  const adminRoute = rootRoute.create({ fragment: 'admin', title: 'Admin Utilities' })

  const profileRoute = appRoute.create({ fragment: 'profile' })
  const walletRoute = appRoute.create({ fragment: 'wallet', title: 'Portfolio' })
  const tradeRoute = appRoute.create({ fragment: 'trade' })
  const positionRoute = appRoute.create({ fragment: /^trade:0x([A-Fa-f0-9]{64})$/i })
  const tradeTermsAndConditions = appRoute.create({ fragment: 'terms-and-conditions' })

  const leaderboardRoute = appRoute.create({ fragment: 'leaderboard' })

  const gmxContractMap = GMX.CONTRACT['42161']

  const v2Reader = contractReader(gmxContractMap.ReaderV2)

  // const marketInfo: Stream<IMarketInfo> = switchMap(params => {
  //   const info = v2Reader('getMarketInfo', gmxContractMap.Datastore.address, params.marketPrice, params.market.marketToken)
  //   return info
  // }, combineObject({ market, marketPrice }))
  
  // const clientApi = helloRpc(gmxContractMap, {
  //   marketInfo: now({
  //     functionName: 'getMarketInfo',
  //     args: ['0x0000000', {}]
  //   })
  // })


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

  

  const subscriptionList: Stream<IPuppetRouteSubscritpion[]> = replayLatest(multicast(switchLatest(map(w3p => {
    if (!w3p) {
      return now([])
    }

    return map(data => {
      return data.subscription.filter(s => s.puppet === w3p.account.address)
    }, processData)
  }, wallet))))
  

  return [
    mergeArray([
      router.contains(appRoute)(
        $rootContainer(
          $column(style({ flex: 1, position: 'relative' }))(
            // $node(style({ height: 0 }))(
            //   $node(style({
            //     background: pallete.middleground,
            //     inset: 0,
            //     height: '400px',
            //     margin: `0 -50vw 0`,
            //     display: 'block',
            //     // position: 'absolute',
            //     pointerEvents: 'none',
            //   }))()
            // ),
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
                      subscriptionList,
                      route: leaderboardRoute,
                      processData
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
                      route: profileRoute,
                      processData,
                      subscriptionList
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
                  const refreshThreshold = SW_DEV ? 150 : 50
                  const blockDelta = params.syncBlock  - params.process.blockNumber

                  if (blockDelta < refreshThreshold) {
                    return empty()
                  }

                  return fadeIn($row(
                    style({ position: 'absolute', bottom: '18px', left: `50%` }),
                    syncProcessDataTether(
                      constant(params.syncBlock)
                    )
                  )(
                    style({  transform: 'translateX(-50%)' })(
                      $column(layoutSheet.spacingTiny, style({
                        backgroundColor: pallete.horizon,
                        border: `1px solid`,
                        padding: '20px',
                        animation: `borderRotate var(--d) linear infinite forwards`,
                        borderImage: `conic-gradient(from var(--angle), ${colorAlpha(pallete.indeterminate, .25)}, ${pallete.indeterminate} 0.1turn, ${pallete.indeterminate} 0.15turn, ${colorAlpha(pallete.indeterminate, .25)} 0.25turn) 30`
                      }))(
                        $text(`Syncing Blockchain Data....`),
                        $text(style({ color: pallete.foreground, fontSize: '.85rem' }))(
                          params.process.state.approximatedTimestamp === 0
                            ? `Indexing for the first time, this may take a minute or two.`
                            : `${timeSince(params.process.state.approximatedTimestamp)} old data is displayed`
                        ),
                      )
                    )
                  ))
                }, combineObject({ process, syncBlock: take(1, block) })),
                
              )
            }, chain)
          ),

          switchMap((cb) => {
            return fadeIn(
              $row(style({ position: 'absolute', zIndex: 100, right: '10px', bottom: '10px' }))(
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
            )
          }, newUpdateInvoke),
              
          $column(style({ maxWidth: '850px', margin: '0 auto', width: '100%', zIndex: 10 }))(
            $RouteSubscriptionDrawer({
              modifySubscriptionList: replayLatest(modifySubscriptionList, [] as IPuppetRouteSubscritpion[]),
              modifySubscriber,
              subscriptionList
            })({
              modifySubscriptionList: modifySubscriptionListTether()
              // clickClose: clickCloseSubscPanelTether(),
              // changeSubscribeList: modifySubscriberTether()
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

      router.match(adminRoute)(
        $rootContainer(style({ overflowY: 'auto', height: '100vh' }))(
          $midContainer(
            $Admin({})
          )
        ),
      ),


    ])

  ]
})


import { Behavior, combineObject, replayLatest } from "@aelea/core"
import { $element, $node, $text, component, eventElementTarget, style, styleBehavior } from "@aelea/dom"
import * as router from '@aelea/router'
import { $column, $row, designSheet, layoutSheet, screenUtils } from '@aelea/ui-components'
import { colorAlpha, pallete } from "@aelea/ui-components-theme"
import { BLUEBERRY_REFFERAL_CODE } from "@gambitdao/gbc-middleware"
import { constant, empty, map, merge, multicast, now, skipRepeats, startWith, take, tap } from '@most/core'
import * as GMX from 'gmx-middleware-const'
import { CHAIN } from "gmx-middleware-const"
import { $Tooltip, $alertContainer, $infoLabeledValue } from "ui-components"
import { filterNull, getTimeSince, readableUnitAmount, switchMap, unixTimestampNow } from "gmx-middleware-utils"
import { ISetRouteType, queryLatestPriceTick, queryRouteTypeList, subgraphStatus } from "puppet-middleware-utils"
import { $midContainer } from "../common/$common.js"
import { $IntermediateConnectButton } from "../components/$ConnectAccount.js"
import { $MainMenu, $MainMenuMobile } from '../components/$MainMenu.js'
import { $ButtonSecondary, $defaultMiniButtonSecondary } from "../components/form/$Button"
import { $RouteSubscriptionDrawer } from "../components/portfolio/$RouteSubscriptionDrawer.js"
import { IChangeSubscription } from "../components/portfolio/$RouteSubscriptionEditor"
import * as storeDb from "../const/store.js"
import { newUpdateInvoke } from "../sw/swUtils"
import { fadeIn } from "../transitions/enter.js"
import * as uiStorage from "ui-storage"
import { blockChange, chain } from "../wallet/walletLink.js"
import { $Home } from "./$Home.js"
import { $PublicProfile } from "./$PublicProfile.js"
import { $Trade } from "./$Trade.js"
import { $Wallet } from "./$Wallet.js"
import { $Leaderboard } from "./leaderboard/$Leaderboard.js"
import { $Opengraph } from "../opengraph/$Opengraph"
import { $rootContainer } from "./common"


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

  [changeActivityTimeframe, changeActivityTimeframeTether]: Behavior<GMX.IntervalTime>,
  [selectTradeRouteList, selectTradeRouteListTether]: Behavior<ISetRouteType[]>,
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

  const opengraph = rootRoute.create({ fragment: 'og' })

  const $liItem = $element('li')(style({ marginBottom: '14px' }))

  const isDesktopScreen = skipRepeats(map(() => document.body.clientWidth > 1040 + 280, startWith(null, eventElementTarget('resize', window))))

  const activityTimeframe = uiStorage.replayWrite(storeDb.store.global, changeActivityTimeframe, 'activityTimeframe')
  const selectedTradeRouteList = replayLatest(multicast(uiStorage.replayWrite(storeDb.store.global, selectTradeRouteList, 'selectedTradeRouteList')))

  const routeTypeListQuery = now(queryRouteTypeList())
  const priceTickMapQuery = replayLatest(queryLatestPriceTick({ activityTimeframe, selectedTradeRouteList }, 50))

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
              const subgraphBeaconStatusColor = map(status => {
                const timestampDelta = unixTimestampNow() - status.block.timestamp

                const color = timestampDelta > 60 ? pallete.negative : timestampDelta > 10 ? pallete.indeterminate : pallete.positive
                return color
              }, subgraphStatus)

              const newLocal = take(1, subgraphBeaconStatusColor)

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
                        $Wallet({ route: walletRoute, routeTypeListQuery, wallet, activityTimeframe, selectedTradeRouteList, priceTickMapQuery, })({
                          modifySubscriber: modifySubscriberTether(),
                          changeRoute: linkClickTether(),
                          changeActivityTimeframe: changeActivityTimeframeTether(),
                          selectTradeRouteList: selectTradeRouteListTether(),
                        }))
                    })
                  })({})
                ),
                router.match(leaderboardRoute)(
                  $midContainer(
                    fadeIn($Leaderboard({ route: leaderboardRoute, activityTimeframe, selectedTradeRouteList, priceTickMapQuery, routeTypeListQuery })({
                      changeActivityTimeframe: changeActivityTimeframeTether(),
                      selectTradeRouteList: selectTradeRouteListTether(),
                      routeChange: linkClickTether(),
                      modifySubscriber: modifySubscriberTether(),
                    }))
                  )
                ),
                router.contains(profileRoute)(
                  $midContainer(
                    fadeIn($PublicProfile({ route: profileRoute, routeTypeListQuery, priceTickMapQuery, activityTimeframe, selectedTradeRouteList })({
                      modifySubscriber: modifySubscriberTether(),
                      changeActivityTimeframe: changeActivityTimeframeTether(),
                      selectTradeRouteList: selectTradeRouteListTether(),
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
                  $Trade({ routeTypeListQuery, chain: chainEvent, referralCode: BLUEBERRY_REFFERAL_CODE, parentRoute: tradeRoute })({
                    // changeRoute: linkClickTether()
                  })
                ),

                $row(layoutSheet.spacing, style({ position: 'fixed', zIndex: 100, right: '16px', bottom: '16px' }))(
                  $row(
                    $Tooltip({
                      // $dropContainer: $defaultDropContainer,
                      $content: switchMap(params => {
                        const blocksBehind = Math.max(0, Number(params.blockChange) - params.subgraphStatus.block.number)
                        const timeSince = getTimeSince(Number(params.subgraphStatus.block.timestamp))

                        return $column(layoutSheet.spacingTiny)(
                          $text('Subgraph Status'),
                          $column(
                            params.subgraphStatus.hasIndexingErrors
                              ? $alertContainer($text('Indexing has experienced errors')) : empty(),
                            $infoLabeledValue('Latest Sync', timeSince), 
                            $infoLabeledValue('blocks behind', readableUnitAmount(blocksBehind)),
                          )
                        )
                      }, combineObject({ subgraphStatus, blockChange })),
                      $anchor: $row(
                        style({ width: '8px', height: '8px', borderRadius: '50%', outlineOffset: '4px', padding: '6px' }),
                        styleBehavior(map(color => {
                          return { backgroundColor: colorAlpha(color, .5), outlineColor: color }
                        }, newLocal))
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
                          }, newLocal))
                        )()
                      ),
                    })({}),
                  ),
            
                  // switchMap(params => {
                  //   const refreshThreshold = import.meta.env.DEV ? 150 : 50
                  //   const blockDelta = params.syncBlock ? params.syncBlock - params.process.blockNumber : null

                  //   if (blockDelta === null || blockDelta < refreshThreshold) return empty()

                  //   return fadeIn($row(style({ position: 'fixed', bottom: '18px', left: `50%` }))(
                  //     style({ transform: 'translateX(-50%)' })(
                  //       $column(layoutSheet.spacingTiny, style({
                  //         backgroundColor: pallete.horizon,
                  //         border: `1px solid`,
                  //         padding: '20px',
                  //         animation: `borderRotate var(--d) linear infinite forwards`,
                  //         borderImage: `conic-gradient(from var(--angle), ${colorAlpha(pallete.indeterminate, .25)}, ${pallete.indeterminate} 0.1turn, ${pallete.indeterminate} 0.15turn, ${colorAlpha(pallete.indeterminate, .25)} 0.25turn) 30`
                  //       }))(
                  //         $text(`Syncing blocks of data: ${readableUnitAmount(Number(blockDelta))}`),
                  //         $text(style({ color: pallete.foreground, fontSize: '.85rem' }))(
                  //           params.process.state.blockMetrics.timestamp === 0n
                  //             ? `Indexing for the first time, this may take a minute or two.`
                  //             : `${timeSince(Number(params.process.state.blockMetrics.timestamp))} old data is displayed`
                  //         ),
                  //       )
                  //     )
                  //   ))
                  // }, combineObject({ blockChange, subgraphStatus })),
                ),
                
              )
            }, chain)
          ),

          $column(style({ maxWidth: '1000px', margin: '0 auto', width: '100%', zIndex: 10 }))(
            $RouteSubscriptionDrawer({
              routeTypeListQuery,
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

      router.contains(opengraph)(
        $Opengraph(opengraph)({})
      )

    )

  ]
})


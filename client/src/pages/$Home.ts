import { Behavior, fromCallback } from "@aelea/core"
import { $element, $node, $text, attr, component, eventElementTarget, style, styleInline } from "@aelea/dom"
import { Route } from "@aelea/router"
import { $column, $icon, $row, designSheet, layoutSheet, screenUtils } from "@aelea/ui-components"
import { pallete } from "@aelea/ui-components-theme"
import { empty, map, now, tap } from "@most/core"
import { $Link, $anchor } from "gmx-middleware-ui-components"
import { $gmxLogo, $puppetLogo } from "../common/$icons.js"
import { $ButtonSecondary } from "../components/form/$Button.js"
import { filterNull, switchMap } from "gmx-middleware-utils"
import { Stream } from "@most/types"
import { $seperator2 } from "./common.js"
import { $labeledDivider } from "../common/elements/$common.js"
import { $heading1 } from "../common/$text"



export interface ITreasury {
  parentRoute: Route
}

const styleEl = document.createElement('style')
document.getElementsByTagName('head')[0].appendChild(styleEl)

function createAnimationKeyframe(keyframes: string) {
  const animationId = 'anim' + (Math.random() + 1).toString(36).substring(7)

  const kframes = `@keyframes ${animationId} {${keyframes}}`
  styleEl.innerHTML = `${styleEl.innerHTML}${kframes}`

  return animationId
}


const installUserChoice: Stream<any> = fromCallback(cb => {
  return window.addEventListener('beforeinstallprompt', cb)
})




export const $Home = (config: ITreasury) => component((
  [routeChanges, linkClickTether]: Behavior<any, any>,
  [clickDownloadBtn, clickDownloadBtnTether]: Behavior<any, any>,
) => {

  const wheelClockwise = createAnimationKeyframe(`
	0% {
    transform: rotate(0deg);
	}
	100% {
		transform: rotate(360deg);
	}
`)

  const wheelCounterClockwise = createAnimationKeyframe(`
  0% {
		transform: rotate(0deg);
	}
	100% {
		transform: rotate(-360deg);
	}
  `)



  const $snapSection = $column(style({ alignItems: 'center', gap: '26px', scrollSnapAlign: 'start', minHeight: '100vh', placeContent: 'center' }))

  const $wheelWrapper = $node(style({
    pointerEvents: 'none',
    position: 'absolute',
    width: `100vw`,
    height: `100vw`,
    top: '50%',
    transform: 'translateY(-50%) rotateX(17deg)',
  }))
  const $wheel = $node(style({
    border: '1px solid #4d4d4d',
    borderRadius: '50%',
    inset: '0',
    position: 'absolute',

  }))
  const $cabin = $node(style({
    // zIndex: 1,
    display: 'block',
    backgroundColor: pallete.background,
    borderRadius: '50%',
    width: '70px',
    height: '70px',
    transform: 'translateX(-50%)',
    border: '1px solid #4d4d4d',
    position: 'absolute',
  }))

  const bodyPointerMove = eventElementTarget('pointermove', document.body)

  return [
    $column(layoutSheet.spacingBig, style({ flex: 1 }))(

      // translateY(-100px) translateZ(100px) rotateX(40deg)
      $snapSection(
        style({
          placeSelf: 'center',
          maxWidth: '600px',
          position: 'relative',
          top: 0,
          height: `100vh`,
          paddingBottom: '30vh'
        })
      )(
        $row(style({ flex: 1, perspective: '680px', position: 'absolute', bottom: 0 }))(
          $element('video')(
            attr({
              playsinline: '',
              width: '100%',
              height: '100%',
              loop: '',
              autoplay: '',
            }),
            style({
              willChange: 'transform, opacity',
              transform: 'translateY(0px) translateZ(0) rotateX(40deg)',
            })
          )(
            $element('source')(attr({ type: 'video/mp4', src: '/video/leaderboard-pick-traders.mp4' }))()
          )
        ),

        $column(layoutSheet.spacingBig, style({ alignItems: 'center' }))(
          $column(style({ textAlign: 'center' }))(
            $text(style({ fontWeight: 'bold', fontSize: screenUtils.isDesktopScreen ? '2.5em' : '1.85rem', whiteSpace: 'pre-wrap', letterSpacing: '2px' }))('Matching top Traders\nwith Investors'),
          ),
          $text(style({ whiteSpace: 'pre-wrap', textAlign: 'center', maxWidth: '878px' }))(`Traders earn more by trading as usual, while Puppets pick top traders to copy and manage`),

          $node(),

          $column(layoutSheet.spacing, style({ minWidth: '250px' }))(
            screenUtils.isMobileScreen ? $text(style({ textAlign: 'center' }))('< Comming Soon (tm) >') : empty(),

            $row(layoutSheet.spacing, style({ alignItems: 'center' }))(
              $Link({
                $content: $anchor(
                  $ButtonSecondary({
                    disabled: now(true),
                    $content: $row(layoutSheet.spacingSmall, style({ alignItems: 'center' }))(
                      $icon({ $content: $puppetLogo, width: '24px', height: '24px', viewBox: '0 0 32 32' }),
                      $text('Puppet'),
                      $node(
                        styleInline(map(move => {
                          const shalf = document.body.clientWidth / 2
                          const alpha = (shalf - move.clientX) / shalf

                          return { opacity: alpha }
                        }, bodyPointerMove)),
                        style({
                          pointerEvents: 'none',
                          background: pallete.negative,
                          filter: 'blur(1em)',
                          width: '100%',
                          height: '100%',
                          left: '0px',
                          top: '120%',
                          position: 'absolute',
                          content: '. ',
                          transform: 'perspective(1em) rotateX(40deg) scale(1, 0.35)'
                        })
                      )()
                    ),
                    $container: $element('button')(
                      designSheet.btn,
                      style({ position: 'relative', borderRadius: '30px' })
                    )
                  })({})
                ),
                url: '/app/leaderboard/settled', route: config.parentRoute.create({ fragment: 'fefe' })
              })({
                click: linkClickTether()
              }),

              screenUtils.isDesktopScreen ? $text('< Comming Soon (tm) >') : empty(),

              $Link({
                $content: $anchor(
                  $ButtonSecondary({
                    disabled: now(true),
                    $content: $row(layoutSheet.spacingSmall, style({ alignItems: 'center' }))(
                      $icon({ $content: $gmxLogo, width: '24px', height: '24px', viewBox: '0 0 32 32' }),
                      $text('Trader'),
                      $node(
                        styleInline(map(move => {
                          const shalf = document.body.clientWidth / 2
                          const alpha = (shalf - move.clientX) / shalf

                          return { opacity: alpha > 0 ? 0 : Math.abs(alpha) }
                        }, bodyPointerMove)),
                        style({
                          pointerEvents: 'none',
                          background: pallete.positive,
                          filter: 'blur(1em)',
                          width: '100%',
                          height: '100%',
                          left: '0px',
                          top: '120%',
                          position: 'absolute',
                          content: '. ',
                          transform: 'perspective(1em) rotateX(40deg) scale(1, 0.35)'
                        })
                      )()
                    ),

                    $container: $element('button')(
                      designSheet.btn,
                      style({ position: 'relative', borderRadius: '30px' })
                    )
                  })({})
                ),
                url: '/app/trade', route: config.parentRoute.create({ fragment: 'fefe' })
              })({
                click: linkClickTether()
              }),
            ),


            screenUtils.isMobileScreen
              ? switchMap(deferredPrompt => {
                return $column(layoutSheet.spacing)(
                  filterNull(map(req => {
                    req.then(console.log)

                    return null
                  }, clickDownloadBtn)) as any,

                  $node(),
                  $node(),

                  $column(
                    $labeledDivider('Add to Home Screen'),
                  ),

                  $node(),

                  $Link({
                    anchorOp: style({ alignSelf: 'center' }),
                    $content: $anchor(
                      $ButtonSecondary({
                        disabled: now(true),
                        $content: $row(layoutSheet.spacingSmall, style({ alignItems: 'center' }))(
                          $icon({ $content: $puppetLogo, width: '24px', height: '24px', viewBox: '0 0 32 32' }),
                          $text('Download'),
                          $icon({ $content: $gmxLogo, width: '24px', height: '24px', viewBox: '0 0 32 32' }),
                        ),
                        $container: $element('button')(
                          designSheet.btn,
                          style({ position: 'relative', borderRadius: '30px' })
                        )
                      })({})
                    ),
                    url: '/app/leaderboard/settled', route: config.parentRoute.create({ fragment: 'fefe' })
                  })({
                    click: clickDownloadBtnTether(
                      map(() => deferredPrompt.prompt())
                    )
                  })
                )
              }, installUserChoice) 
              : empty(),
          ),
          $text(style({ color: pallete.foreground, position: 'absolute', bottom: '50px', left: '50%', transform: 'translateX(-50%)' }))('Learn More'),

        )
        

        // $wheelWrapper(style({
        //   right: 'calc(100% + 3vw)',
        // }))(
        //   $wheel(style({ animation: `${wheelClockwise} 55s linear infinite` }))(
        //     $cabin(style({ left: '50%', top: '-35px', animation: `${wheelCounterClockwise} 55s linear infinite` }))(
        //     ),
        //     $cabin(style({ left: '50%', bottom: '-35px', animation: `${wheelCounterClockwise} 55s linear infinite` }))(
        //     ),
        //     $cabin(style({ top: '50%', left: '-35px', animation: `${wheelCounterClockwise} 55s linear infinite` }))(
        //     ),
        //     $cabin(style({ top: '50%', right: '-35px', animation: `${wheelCounterClockwise} 55s linear infinite` }))(
        //     ),
        //   )
        // ),
        // $wheelWrapper(style({
        //   left: 'calc(100% + 3vw)',
        // }))(
        //   $wheel(style({ animation: `${wheelClockwise} 35s linear infinite` }))(
        //     $cabin(style({ left: '50%', top: '-35px', animation: `${wheelCounterClockwise} 35s linear infinite` }))(
        //     ),
        //     $cabin(style({ left: '50%', bottom: '-35px', animation: `${wheelCounterClockwise} 35s linear infinite` }))(
        //     ),
        //     $cabin(style({ top: '50%', left: '-35px', animation: `${wheelCounterClockwise} 35s linear infinite` }))(
        //     ),
        //     $cabin(style({ top: '50%', right: '-35px', animation: `${wheelClockwise} 35s linear infinite` }))(
        //     ),

        //   )
        // ),

      ),


      $snapSection(style({ margin: '0 auto', maxWidth: '1240px', flexDirection: 'row', gap: '70px' }))(
        $column(layoutSheet.spacing, style({ flex: 1 }))(
          $heading1('Pick Top Traders to Copy'),
          $text(`Explore the leaderboard to find traders. pick ones you like. define rules to better protect your deposit.`),
          $text(`every time each trader open or maintain a position, a percentage of your deposit is used to copy the position.`),
        ),
        $row(style({ flex: 1 }))(
          $element('video')(attr({
            playsinline: '',
            width: '100%',
            height: '100%',
            loop: '',
            autoplay: '',
          }))(
            $element('source')(attr({ type: 'video/mp4', src: '/video/leaderboard-pick-traders.mp4' }))()
          )
        )
      ),

      $snapSection(style({ margin: '0 auto', maxWidth: '1240px', flexDirection: 'row', gap: '70px' }))(
        $column(layoutSheet.spacing, style({ flex: 1 }))(
          $heading1('Traders Earn More'),
          $text('Traders earn more by having more puppets copying their trades.'),
          $text('Trading done seamlessly with their own funds and without directly knowing or managing puppets funds.'),
        ),
        $row(style({ flex: 1 }))(
          $element('video')(attr({
            playsinline: '',
            width: '100%',
            height: '100%',
            loop: '',
            autoplay: '',
          }))(
            $element('source')(attr({ type: 'video/mp4', src: '/video/trade-adjust.mp4' }))()
          )
        )
      ),



      //       $snapSection(

      //         $column(style({ textAlign: 'center' }))(
      //           $text(style({ fontWeight: 'bold', fontSize: screenUtils.isDesktopScreen ? '2.5em' : '1.85rem' }))('Matching top Traders with Investors'),
      //         ),
      //         $text(style({ whiteSpace: 'pre-wrap', maxWidth: '878px' }))(` A Copy Trading Platform for Simplified and Reduced-Risk-Managed Portfolio

      // Puppet, is a Copy Trading platform built on top of the GMX leveraging trading platform. It offers investors, known as Puppets, the opportunity to actively manage their portfolios by copying the trades of multiple high-performing traders, all with a single deposit. This reduces risk and streamlines the investment process. Puppet is a key component of the GBC ecosystem and can be accessed at https://blueberry.club/ until perfected and released fully with it's own tokenomics and revenue flywheel on https://puppet.finance/.

      // Puppet is designed for two types of participants: Traders and Puppets.

      // Traders execute trades using their own collateral, inheriting the same risks as trading on GMX to have seamless experience. They are not responsible for managing Puppets' funds directly and may be unaware of the funds copying their trades. When traders generate profits, they receive a fraction of the Puppets profits. Each trader has a public profile page displaying their historical performance and social circle.

      // Puppets actively manage their portfolios by:

      // Utilizing the leaderboard to find traders. Puppets have access to a platform-wide trading activity overview, complete with historical and track record screenings. This allows them to choose traders whose strategies are likely to yield profits.
      // Depositing funds into routed pools based on intent (e.g., [ETH => ETH-long], [USDC => ETH-short]) and assigning traders to use these funds. When a trader opens a trade, a configurable tiny percentage is used to maintain a copied position pool. The goal is to have multiple traders utilizing the same intended pools.
      // Maintaining a high-performance portfolio. Puppets can view each trader's historical performance graph in their portfolio, which helps them avoid underperforming traders over time.
      // Projects like https://gmx.house/ and https://blueberry.club/app/trade are integral parts of Puppet. To make it work, an active community of traders is essential. The GBC Foundation plans to roll out GBC Trading soon to maintain an active trader community, offering a better user experience and higher trading discounts to incentivize traders to switch from gmx.io to the new interface.`),

      //         $node(),

      //       ),



    ),

    {
      routeChanges
    }
  ]
})






import { Behavior, O, combineArray } from "@aelea/core"
import { $Branch, $Node, $element, $text, StyleCSS, attr, component, nodeEvent, style, styleBehavior } from "@aelea/dom"
import { $RouterAnchor, IAnchor, Route } from '@aelea/router'
import { $column, $row, layoutSheet } from '@aelea/ui-components'
import { colorAlpha, pallete } from "@aelea/ui-components-theme"
import { awaitPromises, constant, empty, map, multicast, snapshot, switchLatest } from '@most/core'
import { Stream } from "@most/types"
import { $Link, $anchor, $discord, $gitbook, $github, $icon, $instagram, $moreDots, $twitter } from "ui-components"
import { $bagOfCoinsCircle, $fileCheckCircle, $gmxLogo, $puppetLogo } from "../common/$icons.js"
import { $stackedCoins, $trophy } from "../common/elements/$icons.js"
import { dark, light } from "../common/theme.js"
import { IPageParams } from "../pages/type.js"
import { $Popover } from "./$Popover.js"
import { $Picker } from "./$ThemePicker.js"
import { $walletProfileDisplay } from "./$WalletProfileDisplay.js"
import { $ButtonSecondary } from "./form/$Button.js"



interface MainMenu extends IPageParams {
  route: Route
  showAccount?: boolean
}



export const $MainMenu = (config: MainMenu) => component((
  [routeChange, routeChangeTether]: Behavior<string, string>,
  [clickPopoverClaim, clickPopoverClaimTether]: Behavior<any, any>,
  [walletChange, walletChangeTether]: Behavior<any, any>,
) => {

  const { route, showAccount, walletClientQuery } = config




  const $circleButtonAnchor = $anchor(
    style({ padding: '0 4px', border: `2px solid ${pallete.horizon}`, display: 'flex', borderRadius: '50%', alignItems: 'center', placeContent: 'center', height: '42px', width: '42px' })
  )

  const $extraMenuPopover = $Popover({
    open: constant(
      $column(layoutSheet.spacingBig)(
        
        // ...screenUtils.isMobileScreen ? $menuItemList : [],
        // $row(layoutSheet.spacingBig, style({ flexWrap: 'wrap', width: '210px' }))(
        //   $anchor(layoutSheet.displayFlex, style({ padding: '0 4px', border: `2px solid ${pallete.horizon}`, borderRadius: '50%', alignItems: 'center', placeContent: 'center', height: '42px', width: '42px' }), attr({ href: 'https://docs.blueberry.club/' }))(
        //     $icon({ $content: $gitbook, width: '22px', viewBox: `0 0 32 32` })
        //   ),
        //   $anchor(layoutSheet.displayFlex, style({ padding: '0 4px', border: `2px solid ${pallete.horizon}`, borderRadius: '50%', alignItems: 'center', placeContent: 'center', height: '42px', width: '42px' }), attr({ href: 'https://discord.com/invite/7ZMmeU3z9j' }))(
        //     $icon({ $content: $discord, width: '22px', viewBox: `0 0 32 32` })
        //   ),
        //   $anchor(layoutSheet.displayFlex, style({ padding: '0 4px', border: `2px solid ${pallete.horizon}`, borderRadius: '50%', alignItems: 'center', placeContent: 'center', height: '42px', width: '42px' }), attr({ href: 'https://twitter.com/PuppetFinance' }))(
        //     $icon({ $content: $twitter, width: '22px', viewBox: `0 0 24 24` })
        //   ),
        //   $anchor(layoutSheet.displayFlex, style({ padding: '0 4px', border: `2px solid ${pallete.horizon}`, borderRadius: '50%', alignItems: 'center', placeContent: 'center', height: '42px', width: '42px' }), attr({ href: 'https://www.instagram.com/blueberryclub.eth' }))(
        //     $icon({ $content: $instagram, width: '18px', viewBox: `0 0 32 32` })
        //   ),
        //   $anchor(layoutSheet.displayFlex, style({ padding: '0 4px', border: `2px solid ${pallete.horizon}`, borderRadius: '50%', alignItems: 'center', placeContent: 'center', height: '42px', width: '42px' }), attr({ href: 'https://github.com/nissoh/blueberry-club' }))(
        //     $icon({ $content: $github, width: '22px', viewBox: `0 0 32 32` })
        //   ),
        // ),

        $ButtonSecondary({
          $content: $Picker([light, dark])({})
        })({}),


        switchLatest(snapshot((_, walletQuery) => {
          if (walletQuery === null) {
            return empty()
          }

          return $ButtonSecondary({
            $content: $text('Disconnect Wallet')
          })({
            click: walletChangeTether(
              map(async xx => {

                // Check if connection is already established
                // await disconnect(wagmiConfig)

              }),
              awaitPromises
            )
          })
        }, walletChange, walletClientQuery)),

      ),
      clickPopoverClaim
    ),
    dismiss: routeChange,
    $target: $circleButtonAnchor(
      $icon({
        svgOps: O(
          clickPopoverClaimTether(nodeEvent('click')),
          style({
            padding: '6px',
            cursor: 'pointer',
            alignSelf: 'center',
            transform: 'rotate(90deg)',
          })
        ),
        width: '32px',
        $content: $moreDots,
        viewBox: '0 0 32 32'
      }),
    )
  })({
    // overlayClick: clickPopoverClaimTether()
  })


  return [

    $row(
      // styleBehavior(map(isOpen => ({ width: isOpen ? '210px' : '78px' }), isMenuOpen)),
      layoutSheet.spacingBig,
      style({
        transition: 'width .3s ease-in-out', overflow: 'hidden',
        zIndex: 22, padding: '18px 12px', maxHeight: '100vh', flexShrink: 0,
        placeContent: 'space-between' })
    )(

 
      $column(layoutSheet.spacingBig, style({ flex: 1, alignItems: 'flex-start' }))(
        $RouterAnchor({
          url: '/',
          route: route,
          $anchor: $element('a')(style({ padding: '8px', margin: '8px' }))($icon({ $content: $puppetLogo, width: '45px', viewBox: '0 0 32 32' }))
        })({
          click: routeChangeTether()
        })
      ),

      $row(layoutSheet.spacingBig, style({ flex: 1, alignItems: 'center', placeContent: 'center' }))(
        style({ padding: 0 })(
          $pageLink({
            route: route.create({ fragment: 'wallet', title: 'Portfolio' }),
            // anchorOp: style({  }),
            url: `/app/wallet`,
            $content: $walletProfileDisplay({ walletClientQuery })
          })({
            click: routeChangeTether(),
          })
        ),
        $pageLink({
          $content: $row(layoutSheet.spacing, style({ alignItems: 'center', cursor: 'pointer',  borderRadius: '50px', pointerEvents: 'none' }))(
            $icon({ $content: $trophy, svgOps: style({ width: '28px', aspectRatio: `1 / 1` }), viewBox: '0 0 32 32' }),
            $text(style({ fontSize: '1.15rem' }))('Leaderboard')
          ),
          route: route.create({ fragment: 'leaderboard' }),
          url: '/app/leaderboard',
        })({
          click: routeChangeTether()
        }),
        $pageLink({
          $content: $row(layoutSheet.spacing, style({ alignItems: 'center', cursor: 'pointer',  borderRadius: '50px', pointerEvents: 'none' }))(
            $icon({ $content: $gmxLogo, svgOps: style({ width: '28px', aspectRatio: `1 / 1` }), viewBox: '0 0 32 32' }),
            $text(style({ fontSize: '1.15rem' }))('Trade')
          ), 
          route: route.create({ fragment: 'trade' }),
          url: '/app/trade',
        })({
          click: routeChangeTether()
        }),
      ),

      $row(layoutSheet.spacingBig, style({ flex: 1, placeContent: 'flex-end', alignItems: 'center' }))(
        // $SwitchNetworkDropdown()({}),
        $extraMenuPopover,
        // $circleButtonAnchor(attr({ href: 'https://docs.blueberry.club/' }))(
        //   $icon({ $content: $gitbook, fill: pallete.middleground, width: '22px', viewBox: `0 0 32 32` })
        // ),
        // $circleButtonAnchor(attr({ href: 'https://discord.com/invite/7ZMmeU3z9j' }))(
        //   $icon({ $content: $discord, fill: pallete.middleground, width: '22px', viewBox: `0 0 32 32` })
        // ),
        $circleButtonAnchor(attr({ href: 'https://twitter.com/PuppetCopy' }))(
          $icon({ $content: $twitter, fill: pallete.foreground, width: '22px', viewBox: `0 0 24 24` })
        ),
      )
    ),

    {
      routeChange,
    }
  ]
})

export const $MainMenuMobile = (config: MainMenu) => component((
  [routeChange, routeChangeTether]: Behavior<string, string>,
  [clickPopoverClaim, clickPopoverClaimTether]: Behavior<any, any>,
  [walletChange, walletChangeTether]: Behavior<any, any>,
) => {

  const { walletClientQuery, route, showAccount = true } = config

  const routeChangeMulticast = multicast(routeChange)


  const $govItem = (label: string, $iconPath: $Node, description: string) => $row(layoutSheet.spacing)(
    $icon({ $content: $iconPath, width: '36px', svgOps: style({ minWidth: '36px' }), viewBox: '0 0 32 32' }),
    $column(layoutSheet.spacingTiny)(
      $text(label),
      $text(style({ color: pallete.foreground, fontSize: '.85rem' }))(description)
    )
  )



  const $popoverPageLink = ($iconPath: $Branch<SVGPathElement>, text: string | Stream<string>) => $row(style({ alignItems: 'center', cursor: 'pointer' }))(
    $icon({ $content: $iconPath, width: '16px', fill: pallete.foreground, svgOps: style({ minWidth: '36px' }), viewBox: '0 0 32 32' }),
    $text(text)
  )


  const $treasuryLinks = [
    $Link({ $content: $govItem('Treasury', $bagOfCoinsCircle, 'GBC Community-Led Portfolio'), url: '/app/treasury', route: route })({
      click: routeChangeTether()
    }),
    $anchor(style({ textDecoration: 'none' }), attr({ href: 'https://snapshot.org/#/gbc-nft.eth' }))(
      $govItem('Governance', $fileCheckCircle, 'Treasury Governance, 1 GBC = 1 Voting Power')
    ),
  ]

  const $circleButtonAnchor = $anchor(
    style({ padding: '0 4px', border: `2px solid ${colorAlpha(pallete.foreground, .25)}`, display: 'flex', borderRadius: '50%', alignItems: 'center', placeContent: 'center', height: '42px', width: '42px' })
  )

  const $extraMenuPopover = $Popover({
    open: constant(
      $column(layoutSheet.spacingBig, style({ marginTop: '-40px' }))(
        $Link({ $content: $popoverPageLink($gmxLogo, 'Trade'), url: '/app/trade', route: route.create({ fragment: 'feefwefwe' }) })({
        // $Link({ $content: $pageLink($gmxLogo, 'Trade'), url: '/app/trade', disabled: now(false), route: parentRoute.create({ fragment: 'feefwefwe' }) })({
          click: routeChangeTether()
        }),
        $Link({ $content: $popoverPageLink($stackedCoins, 'Leaderboard'), url: '/app/leaderboard', route: route.create({ fragment: 'feefwefwe' }) })({
          click: routeChangeTether()
        }),

        // ...screenUtils.isMobileScreen ? $menuItemList : [],
        $row(layoutSheet.spacingBig, style({ flexWrap: 'wrap', width: '210px' }))(
          $anchor(layoutSheet.displayFlex, style({ padding: '0 4px', border: `2px solid ${pallete.horizon}`, borderRadius: '50%', alignItems: 'center', placeContent: 'center', height: '42px', width: '42px' }), attr({ href: 'https://docs.blueberry.club/' }))(
            $icon({ $content: $gitbook, width: '22px', viewBox: `0 0 32 32` })
          ),
          $anchor(layoutSheet.displayFlex, style({ padding: '0 4px', border: `2px solid ${pallete.horizon}`, borderRadius: '50%', alignItems: 'center', placeContent: 'center', height: '42px', width: '42px' }), attr({ href: 'https://discord.com/invite/7ZMmeU3z9j' }))(
            $icon({ $content: $discord, width: '22px', viewBox: `0 0 32 32` })
          ),
          $anchor(layoutSheet.displayFlex, style({ padding: '0 4px', border: `2px solid ${pallete.horizon}`, borderRadius: '50%', alignItems: 'center', placeContent: 'center', height: '42px', width: '42px' }), attr({ href: 'https://twitter.com/PuppetFinance' }))(
            $icon({ $content: $twitter, width: '22px', viewBox: `0 0 24 24` })
          ),
          $anchor(layoutSheet.displayFlex, style({ padding: '0 4px', border: `2px solid ${pallete.horizon}`, borderRadius: '50%', alignItems: 'center', placeContent: 'center', height: '42px', width: '42px' }), attr({ href: 'https://www.instagram.com/blueberryclub.eth' }))(
            $icon({ $content: $instagram, width: '18px', viewBox: `0 0 32 32` })
          ),
          $anchor(layoutSheet.displayFlex, style({ padding: '0 4px', border: `2px solid ${pallete.horizon}`, borderRadius: '50%', alignItems: 'center', placeContent: 'center', height: '42px', width: '42px' }), attr({ href: 'https://github.com/nissoh/blueberry-club' }))(
            $icon({ $content: $github, width: '22px', viewBox: `0 0 32 32` })
          ),
        ),

        $ButtonSecondary({
          $content: $Picker([light, dark])({})
        })({

        }),


        switchLatest(snapshot((_, wallet) => {
          if (wallet === null) {
            return empty()
          }

          return $ButtonSecondary({
            $content: $text('Disconnect Wallet')
          })({
            click: walletChangeTether(
              map(async xx => {

                // Check if connection is already established
                // await disconnect(wagmiConfig)

              }),
              awaitPromises
            )
          })
        }, walletChange, walletClientQuery)),

      ),
      clickPopoverClaim
    ),
    dismiss: routeChangeMulticast,
    $target: $circleButtonAnchor(
      $icon({
        svgOps: O(
          clickPopoverClaimTether(nodeEvent('click')),
          style({
            padding: '6px',
            cursor: 'pointer',
            alignSelf: 'center',
            transform: 'rotate(90deg)',
          })
        ),
        width: '32px',
        $content: $moreDots,
        viewBox: '0 0 32 32'
      }),
    ),
  })({
    // overlayClick: clickPopoverClaimTether()
  })


  return [

    $row(layoutSheet.spacingBig, style({ padding: '14px', flexShrink: 0, alignItems: 'flex-end', borderRadius: '30px', placeContent: 'space-between' }))(
      $row(layoutSheet.spacingBig, style({ alignItems: 'center', flex: 1 }))(
        $RouterAnchor({ url: '/', route: route, $anchor: $element('a')($icon({ $content: $puppetLogo, width: '45px', viewBox: '0 0 32 32' })) })({
          click: routeChangeTether()
        }),
      ),

      $row(layoutSheet.spacing, style({ flex: 1, alignItems: 'center', placeContent: 'center' }))(

        $pageLink({
          route: route.create({ fragment: 'wallet', title: 'Portfolio' }),
          // anchorOp: style({  }),
          url: `/app/wallet`,
          $content: $walletProfileDisplay({ walletClientQuery })
        })({
          click: routeChangeTether(),
        }),
      ),

      $row(layoutSheet.spacingBig, style({ placeContent: 'flex-end', flex: 1 }))(
        $extraMenuPopover,
      )
    ),

    {
      routeChange: routeChangeMulticast,
    }
  ]
})


const $pageLink = (config: Omit<IAnchor, '$anchor'> & { $content: $Node }) => {

  return component((
    [click, clickTether]: Behavior<string, string>,
    [active, containsTether]: Behavior<boolean, boolean>,
    [focus, focusTether]: Behavior<boolean, boolean>,
  ) => {
    const $anchorEl = $anchor(
      style({ borderRadius: '50px', padding: '11px 22px', border: `1px solid ${ colorAlpha(pallete.foreground, .2) }` }),
      styleBehavior(
        combineArray((isActive, isFocus): StyleCSS | null => {
          return isActive ? { backgroundColor: `${pallete.background} !important`, fill: pallete.foreground, borderColor: `${pallete.primary} !important`, cursor: `default  !important` }
            : isFocus ? { backgroundColor: `${pallete.background} !important`, fill: pallete.foreground }
              : null
        }, active, focus)
      ),
      // styleBehavior(map(isDisabled => (isDisabled ?  { pointerEvents: 'none', opacity: .3 } : {}), disabled))
    )(
      config.$content
    )


    return [
      $RouterAnchor({ $anchor: $anchorEl, url: config.url, route: config.route })({
        click: clickTether(),
        focus: focusTether(),
        contains: containsTether()
      }),

      { click, active, focus }
    ]
  }) 
}

  
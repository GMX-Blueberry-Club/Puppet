import { Behavior } from "@aelea/core"
import { $Node, NodeComposeFn, component, style, styleBehavior } from "@aelea/dom"
import { Route } from "@aelea/router"
import { $column, $row } from "@aelea/ui-components"
import { colorAlpha, pallete } from "@aelea/ui-components-theme"
import { map, switchLatest } from "@most/core"
import { $Link } from "ui-components"
import { walletLink } from "../wallet"
import { $disconnectedWalletDisplay, $profileDisplay } from "./$AccountProfile.js"


export interface IWalletDisplay {
  parentRoute: Route,
  $container?: NodeComposeFn<$Node>
}

export const $WalletProfileDisplay = ({ $container = $row, parentRoute }: IWalletDisplay) => component((
  [routeChange, routeChangeTether]: Behavior<any, string>,
  [walletChange, walletChangeTether]: Behavior<any, string>,
  [isActive, isActiveTether]: Behavior<boolean>,
) => {


  const walletRoute = parentRoute.create({ fragment: 'wallet', title: 'Portfolio' })


  return [
    $container(
      styleBehavior(map(active => ({ backgroundColor: active ? pallete.background : 'none' }), isActive)),
      style({ border: `1px solid ${ colorAlpha(pallete.foreground, .2) }`,  borderRadius: '30px', placeContent: 'center', fontFamily: `var(--font-monospace)` })
    )(
      switchLatest(map(wallet => {
        const address = wallet?.account?.address
        const $display = address
          ? style({ paddingRight: '16px' })($profileDisplay({ $labelContainer: $column(style({ padding: '0 8px 0 4px' })), address, $container }))
          : style({ paddingRight: '18px' }, $disconnectedWalletDisplay($container))

        return $Link({
          route: walletRoute,
          // anchorOp: style({  }),
          url: `/app/wallet`,
          $content: $display
        })({
          click: routeChangeTether(),
          active: isActiveTether()
        })
        
        // return  walletChangeTether(
        //   nodeEvent('click'),
        //   map(async () => {
        //     await connect(wagmiConfig, {
        //       connector: wcConnector
        //     }).catch(e => {
        //       console.error(e)
        //     })
        //     return `walletConnect`
        //   }),
        //   awaitPromises
        // )(
        //   style({ paddingRight: '18px', cursor: 'pointer' }, $disconnectedWalletDisplay($container))
        // )
      }, walletLink.wallet))
    ),

    {
      routeChange
    }
  ]
})



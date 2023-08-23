import { Behavior } from "@aelea/core"
import { $Node, NodeComposeFn, component, nodeEvent, style, styleBehavior } from "@aelea/dom"
import { Route } from "@aelea/router"
import { $column, $row } from "@aelea/ui-components"
import { colorAlpha, pallete } from "@aelea/ui-components-theme"
import { awaitPromises, map, mergeArray, now, snapshot, switchLatest } from "@most/core"
import { $Link } from "gmx-middleware-ui-components"
import { account, web3Modal } from "../wallet/walletLink.js"
import { $disconnectedWalletDisplay, $profileDisplay } from "./$AccountProfile.js"
import * as router from '@aelea/router'


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
      style({ border: `1px solid ${ colorAlpha(pallete.foreground, .2) }`, cursor: 'pointer', borderRadius: '30px', placeContent: 'center', fontFamily: `var(--font-monospace)` })
    )(
      switchLatest(snapshot((_, accountResult) => {
        
        return accountResult.address
          ? $Link({
            route: walletRoute,
            // anchorOp: style({  }),
            url: `/app/wallet`,
            $content: style({ paddingRight: '16px' })($profileDisplay({ $labelContainer: $column(style({ padding: '0 8px 0 4px' })), address: accountResult.address, $container }))
          })({
            click: routeChangeTether(),
            active: isActiveTether()
          })
          : walletChangeTether(
            nodeEvent('click'),
            map(async () => {
              await web3Modal.openModal()
              return `walletConnect`
            }),
            awaitPromises
          )(
            style({ paddingRight: '18px', cursor: 'pointer' }, $disconnectedWalletDisplay($container))
          )
      }, mergeArray([now(null), walletChange]), account))
    ),

    {
      routeChange
    }
  ]
})



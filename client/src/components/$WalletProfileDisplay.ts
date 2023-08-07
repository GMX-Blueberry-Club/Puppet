import { Behavior } from "@aelea/core"
import { $Node, $node, NodeComposeFn, component, nodeEvent, style } from "@aelea/dom"
import { Route } from "@aelea/router"
import { $row } from "@aelea/ui-components"
import { pallete } from "@aelea/ui-components-theme"
import { awaitPromises, map, mergeArray, now, snapshot, switchLatest } from "@most/core"
import { $anchor } from "gmx-middleware-ui-components"
import { $seperator2 } from "../pages/common.js"
import { account, web3Modal } from "../wallet/walletLink.js"
import { $disconnectedWalletDisplay, $discoverIdentityDisplay } from "./$AccountProfile.js"
import { $SwitchNetworkDropdown } from "./$ConnectAccount.js"
import { $defaultBerry } from "./$DisplayBerry.js"


export interface IWalletDisplay {
  parentRoute: Route,
  $container?: NodeComposeFn<$Node>
}

export const $WalletProfileDisplay = ({ $container = $row, parentRoute }: IWalletDisplay) => component((
  [profileLinkClick, profileLinkClickTether]: Behavior<any, any>,
  [routeChange, routeChangeTether]: Behavior<any, string>,
  [walletChange, walletChangeTether]: Behavior<any, string>,
) => {



  return [
    $container(style({ backgroundColor: `${pallete.background}`, gap: '8px', borderRadius: '30px', placeContent: 'center' }))(
      $row(style({ flex: 1 }))(
        switchLatest(snapshot((_, accountResult) => {
          return accountResult.address
            ? $anchor(
              style({ flexDirection: 'column' }),
              routeChangeTether(
                nodeEvent('click'),
                map(path => {
                  const newPath = `/app/wallet`

                  if (location.pathname !== newPath) {
                    history.pushState(null, '', newPath)
                  }

                  return newPath
                })
              )
            )(
              $discoverIdentityDisplay({ address: accountResult.address, $container, $profileContainer: $defaultBerry(style({ minWidth: '50px', width: '50px' })) })
            )
            : walletChangeTether(
              nodeEvent('click'),
              map(async () => {
                await web3Modal.openModal()
                return `walletConnect`
              }),
              awaitPromises
            )(
              style({ cursor: 'pointer' }, $disconnectedWalletDisplay($container))
            )


        }, mergeArray([now(null), walletChange]), account))
      ),
      $seperator2,

      $SwitchNetworkDropdown()({}),
      $node(),
    ),

    {
      routeChange,
      profileLinkClick
    }
  ]
})



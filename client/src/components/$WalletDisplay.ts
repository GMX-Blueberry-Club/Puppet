import { Behavior } from "@aelea/core"
import { $Node, $node, NodeComposeFn, component, nodeEvent, style } from "@aelea/dom"
import { Route } from "@aelea/router"
import { $row } from "@aelea/ui-components"
import { pallete } from "@aelea/ui-components-theme"
import { awaitPromises, map, mergeArray, now, snapshot, switchLatest } from "@most/core"
import { $anchor } from "gmx-middleware-ui-components"
import { IProfileActiveTab } from "../pages/$Profile"
import { $seperator2 } from "../pages/common"
import { account, web3Modal } from "../wallet/walletLink"
import { $disconnectedWalletDisplay, $discoverIdentityDisplay } from "./$AccountProfile"
import { $SwitchNetworkDropdown } from "./$ConnectAccount"
import { $defaultBerry } from "./$DisplayBerry"


export interface IWalletDisplay {
  parentRoute: Route,
  $container?: NodeComposeFn<$Node>
}

export const $WalletDisplay = ({ $container = $row, parentRoute }: IWalletDisplay) => component((
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
                  const lastFragment = location.pathname.split('/').slice(-1)[0]
                  const newPath = `/app/wallet/${lastFragment === 'trade' ? IProfileActiveTab.TRADING.toLowerCase() : IProfileActiveTab.BERRIES.toLowerCase()}`

                  if (location.pathname !== newPath) {
                    history.pushState(null, '', newPath)
                  }

                  return newPath
                })
              )
            )(
              $discoverIdentityDisplay({ address: accountResult.address, labelSize: '.75em', $container, $profileContainer: $defaultBerry(style({ minWidth: '38px' })) })
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



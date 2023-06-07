import { Behavior } from "@aelea/core"
import { $Node, $node, NodeComposeFn, component, nodeEvent, style } from "@aelea/dom"
import { $column, $row } from "@aelea/ui-components"
import { pallete } from "@aelea/ui-components-theme"
import { awaitPromises, map, mergeArray, now, snapshot, switchLatest } from "@most/core"
import { $anchor } from "@gambitdao/ui-components"
import { $seperator2 } from "../pages/common"
import { $disconnectedWalletDisplay, $discoverIdentityDisplay } from "./$AccountProfile"
import { Route } from "@aelea/router"
import { IProfileActiveTab } from "../pages/$Profile"
import { $defaultBerry } from "./$DisplayBerry"
import { CHAIN } from "@gambitdao/const"
import { account, web3Modal } from "../wallet/walletLink"
import { $SwitchNetworkDropdown } from "./$ConnectAccount"


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
              $discoverIdentityDisplay({ address: accountResult.address, $profileContainer: $defaultBerry(style({ minWidth: '38px' })) })
            )
            : walletChangeTether(
              nodeEvent('click'),
              map(async () => {
                await web3Modal.openModal()
                return `walletConnect`
              }),
              awaitPromises
            )(
              style({ cursor: 'pointer' }, $disconnectedWalletDisplay())
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



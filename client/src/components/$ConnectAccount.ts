import { Behavior, Op } from "@aelea/core"
import { $Node, $element, $text, attr, component, nodeEvent, style } from "@aelea/dom"
import { $icon, $row, layoutSheet, screenUtils } from "@aelea/ui-components"
import { pallete } from "@aelea/ui-components-theme"
import { CHAIN } from "gmx-middleware-const"
import { $alertContainer, $alertIcon, $walletConnectLogo } from "gmx-middleware-ui-components"
import { awaitPromises, empty, filter, map, mergeArray, now, snapshot, switchLatest, tap } from "@most/core"
import { getNetwork } from "@wagmi/core"
import { IWalletClient, chain, wallet, web3Modal } from "../wallet/walletLink"
import { $ButtonSecondary } from "./form/$Button"
import { IButtonCore } from "./form/$ButtonCore"





export interface IConnectWalletPopover {
  $$display: Op<IWalletClient, $Node>
  primaryButtonConfig?: Partial<IButtonCore>
}


export const $IntermediateConnectButton = (config: IConnectWalletPopover) => component((
  [clickOpenPopover, clickOpenPopoverTether]: Behavior<any, any>,
) => {


  return [
    switchLatest(map(w3p => {
      // no wallet connected, show connection flow
      if (!w3p) {
        return $ConnectWeb3Modal()({
          // walletChange
        })
      }


      if (w3p.chain.id === null) {
        return $SwitchNetworkDropdown(true)({})
      }

      return switchLatest(config.$$display(now(w3p)))


    }, wallet)),

    {
    }
  ]
})


export const $ConnectWeb3Modal = () => component((
  [walletChange, walletChangeTether]: Behavior<PointerEvent, any>,
) => {

  const ignoreAll = filter(() => false)


  return [
    $ButtonSecondary({
      $content: $row(layoutSheet.spacingSmall, style({ alignItems: 'center' }))(
        ignoreAll(walletChange),
        $icon({
          $content: $walletConnectLogo,
          viewBox: '0 0 32 32',
        }),
        $text('WalletConnect'),
      )
    })({
      click: walletChangeTether(
        map(async () => {
          await web3Modal.openModal()

          return 'connectResult'
        }),
        awaitPromises,
      )
    }),

    {
      // walletChange
    }
  ]
})



export const $SwitchNetworkDropdown = (showLabel = false) => component((
  [changeNetwork, changeNetworkTether]: Behavior<any, any>,
) => {

  return [
    switchLatest(snapshot((_, network) => {

      if (network === null || network.unsupported) {
        const $customAlert = $alertContainer(
          changeNetworkTether(
            nodeEvent('click'),
            tap(async () => {
              await web3Modal.openModal({ route: 'SelectNetwork' })

              return CHAIN.BSC
            })
          ),
          style({ cursor: 'pointer', padding: '8px' })
        )
        return $customAlert(
          $icon({
            $content: $alertIcon, viewBox: '0 0 24 24', width: '32px',
            svgOps: style({ fill: pallete.negative, placeSelf: 'center', padding: '3px', filter: 'drop-shadow(black 0px 0px 10px) drop-shadow(black 0px 0px 10px) drop-shadow(black 0px 0px 1px)' })
          }),
          showLabel ? $text(`Switch to supported chain`) : empty()
        )
      }

      const $container = network === null ? $alertContainer : $row

      return $container(
        style({ cursor: 'pointer', placeContent: 'center' }),
        changeNetworkTether(
          nodeEvent('click'),
          tap(async () => {
            await web3Modal.openModal({ route: 'SelectNetwork' })

            return CHAIN.BSC
          }),
        )
      )(
        $element('img')(attr({ src: `/chain/${network.id}.svg` }), style({ width: '32px', margin: screenUtils.isDesktopScreen ? '0px 0px 8px 0px' : '0px 8px 0 0', aspectRatio: '1 / 1', placeSelf: 'center' }))(),
      )

      // return style({ zoom: 1.1 })($alertTooltip($text('www')))

    }, mergeArray([now(null), changeNetwork]), chain)),

    {
    }
  ]
})

import { Behavior, Op } from "@aelea/core"
import { $Node, $element, $text, attr, component, nodeEvent, style } from "@aelea/dom"
import { $icon, $row, layoutSheet } from "@aelea/ui-components"
import { pallete } from "@aelea/ui-components-theme"
import { CHAIN } from "@gambitdao/const"
import { $alertContainer, $alertIcon } from "@gambitdao/ui-components"
import { awaitPromises, empty, map, mergeArray, now, snapshot, switchLatest, tap } from "@most/core"
import { Stream } from "@most/types"
import { getNetwork } from "@wagmi/core"
import { $caretDown } from "../elements/$icons"
import { IWalletConnected, network, wallet, web3Modal } from "../wallet/walletLink"
import { $ButtonPrimary, $ButtonSecondary } from "./form/$Button"
import { IButtonCore } from "./form/$ButtonCore"





export interface IConnectWalletPopover {
  $$display: Op<IWalletConnected, $Node>
  primaryButtonConfig?: Partial<IButtonCore>
}



export const $IntermediateConnectButton = (config: IConnectWalletPopover) => component((
  [clickOpenPopover, clickOpenPopoverTether]: Behavior<any, any>,
) => {


  return [
    switchLatest(map(w3p => {
      const address = w3p.account.address
      // no wallet connected, show connection flow
      if (!address) {
        return $ConnectDropdown(
          $ButtonPrimary({
            $content: $row(layoutSheet.spacingSmall, style({ alignItems: 'center' }))(
              $text('Connect Wallet'),
              $icon({ $content: $caretDown, viewBox: '0 0 32 32', width: '16px', fill: pallete.background, svgOps: style({ marginTop: '2px' }) }),
            ),
            ...config.primaryButtonConfig

          })({
            click: clickOpenPopoverTether()
          }),
          clickOpenPopover
        )({})
      }


      if (w3p.network === null) {
        return $SwitchNetworkDropdown(true)({})
      }

      return switchLatest(config.$$display(now({ address, network: w3p.network })))


    }, wallet)),

    {
    }
  ]
})


export const $SwitchNetworkDropdown = (showLabel = false) => component((
  [changeNetwork, changeNetworkTether]: Behavior<any, any>,
) => {

  return [
    switchLatest(snapshot((_, network) => {

      if (network === null) {
        return $alertContainer(changeNetworkTether(
          nodeEvent('click'),
          tap(async () => {
            await web3Modal.openModal({ route: 'SelectNetwork' })

            return CHAIN.BSC
          }),
        ), style({ padding: '0 8px', cursor: 'pointer' }))(
          $icon({
            $content: $alertIcon, viewBox: '0 0 24 24', width: '26px',
            svgOps: style({ fill: pallete.negative, padding: '3px', filter: 'drop-shadow(black 0px 0px 10px) drop-shadow(black 0px 0px 10px) drop-shadow(black 0px 0px 1px)' })
          }),
          showLabel ? $text(`${getNetwork().chain?.name} is not supported`) : empty()
        )
      }

      const $container = network === null ? $alertContainer : $row

      return $container(changeNetworkTether(
        nodeEvent('click'),
        tap(async () => {
          await web3Modal.openModal({ route: 'SelectNetwork' })

          return CHAIN.BSC
        }),
      ), style({ padding: '0 8px', cursor: 'pointer' }))(
        $element('img')(attr({ src: `/assets/chain/${network.id}.svg` }), style({ width: '26px' }))(),
      )

      // return style({ zoom: 1.1 })($alertTooltip($text('www')))

    }, mergeArray([now(null), changeNetwork]), network)),

    {
    }
  ]
})


export const $ConnectDropdown = ($trigger: $Node, clickOpenPopover: Stream<any>) => component((
  [walletChange, walletChangeTether]: Behavior<PointerEvent, any>,
) => {



  return [
    $ButtonSecondary({
      $content: $row(layoutSheet.spacing, style({ alignItems: 'center' }))(
        // $WalletLogoMap[IWalletName.walletConnect],
        $text('Wallet-Connect'),
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
      walletChange
    }
  ]
})



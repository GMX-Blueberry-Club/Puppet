import { Behavior, Op } from "@aelea/core"
import { $Node, $element, $text, attr, component, style } from "@aelea/dom"
import { $icon, $row, layoutSheet } from "@aelea/ui-components"
import { awaitPromises, map, now, switchLatest } from "@most/core"
import { connect } from "@wagmi/core"
import { ignoreAll, switchMap } from "common-utils"
import { $walletConnectLogo } from "../common/$icons.js"
import { walletLink } from "../wallet/index.js"
import { $ButtonSecondary, $defaultMiniButtonSecondary } from "./form/$Button.js"
import { IButtonCore } from "./form/$ButtonCore.js"
import { $infoLabel } from "ui-components"



export interface IConnectWalletPopover {
  $$display: Op<walletLink.IWalletClient, $Node>
  primaryButtonConfig?: Partial<IButtonCore>
}


export const $IntermediateConnectButton = (config: IConnectWalletPopover) => component((
) => {
  return [
    switchMap(w3p => {
      // no wallet connected, show connection flow
      if (!w3p) {
        return $ConnectChoiceList()({
          // walletChange
        })
      }

      return switchLatest(config.$$display(now(w3p)))
    }, walletLink.wallet),

    {
    }
  ]
})


export const $ConnectChoiceList = () => component((
  [walletChange, walletChangeTether]: Behavior<PointerEvent, any>,
) => {

  


  return [
    $row(layoutSheet.spacingSmall, style({ alignItems: 'center' }))(
      $infoLabel('Connect with'),
      ...walletLink.wagmiConfig.connectors.map(connector => {
        return $ButtonSecondary({
          $container: $defaultMiniButtonSecondary,
          $content: $row(layoutSheet.spacingSmall, style({ alignItems: 'center' }))(
            ignoreAll(walletChange),
            connector.icon ?
              $element('img')(
                style({ width: '24px', height: '24px' }),
                attr({ src: connector.icon })
              )()
              : $icon({
                $content: $walletConnectLogo,
                viewBox: '0 0 32 32',
              }),
            $text(connector.name),
          )
        })({
          click: walletChangeTether(
            map(async () => {
              await connect(walletLink.wagmiConfig, { connector })

              return 'connectResult'
            }),
            awaitPromises,
          )
        })
      })
    ),

    {
      // walletChange
    }
  ]
})



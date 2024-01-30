import { Behavior, Op } from "@aelea/core"
import { $Node, $element, $text, attr, component, style } from "@aelea/dom"
import { $icon, $row, layoutSheet } from "@aelea/ui-components"
import { awaitPromises, join, map, now } from "@most/core"
import { Stream } from "@most/types"
import { ignoreAll, switchMap } from "common-utils"
import { EIP6963ProviderDetail, createStore } from "mipd"
import { $infoLabel } from "ui-components"
import * as walletLink from "wallet"
import { $walletConnectLogo } from "../common/$icons.js"
import { $ButtonSecondary, $defaultMiniButtonSecondary } from "./form/$Button.js"
import { IButtonCore } from "./form/$ButtonCore.js"


// Set up a MIPD Store, and request Providers.
export const mipdStore = createStore()


export interface IConnectWalletPopover {
  $$display: Op<walletLink.IWalletClient, $Node>
  primaryButtonConfig?: Partial<IButtonCore>
  walletClientQuery: Stream<Promise<walletLink.IWalletClient | null>>
}


export const $IntermediateConnectButton = (config: IConnectWalletPopover) => component((
  [changeWallet, changeWalletTether]: Behavior<EIP6963ProviderDetail>,
) => {

  const wallet = awaitPromises(config.walletClientQuery)

  return [
    switchMap(wallet => {
      // no wallet connected, show connection flow
      if (wallet === null) {
        return $ConnectChoiceList()({
          changeWallet: changeWalletTether()
        })
      }

      return join(config.$$display(now(wallet)))
    }, wallet),

    {
      changeWallet
    }
  ]
})


export const $ConnectChoiceList = () => component((
  [changeWallet, changeWalletTether]: Behavior<PointerEvent, EIP6963ProviderDetail>,
) => { 
  const getEthProviderList = mipdStore.getProviders()

  return [
    $row(layoutSheet.spacingSmall, style({ alignItems: 'center' }))(
      $infoLabel('Connect with'),
      ...getEthProviderList.map(providerDetail => {
        return $ButtonSecondary({
          $container: $defaultMiniButtonSecondary,
          $content: $row(layoutSheet.spacingSmall, style({ alignItems: 'center' }))(
            ignoreAll(changeWallet),
            providerDetail.info.icon ?
              $element('img')(
                style({ width: '24px', height: '24px' }),
                attr({ src: providerDetail.info.icon })
              )()
              : $icon({
                $content: $walletConnectLogo,
                viewBox: '0 0 32 32',
              }),
            $text(providerDetail.info.name),
          )
        })({
          click: changeWalletTether(
            // constant(providerDetail)
            map(async () => {
              const provider = providerDetail.provider
              

              const requestAccountList = await provider.request({ method: 'eth_requestAccounts' })
              
              // const accountList = await provider.request({ method: 'eth_requestAccounts' })

              
              return providerDetail
            }),
            awaitPromises,
          )
        })
      })
    ),

    {
      changeWallet
    }
  ]
})



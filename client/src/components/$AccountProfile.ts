import { $Node, $node, $text, NodeComposeFn, style } from "@aelea/dom"
import { $column, $row, layoutSheet } from "@aelea/ui-components"
import { pallete } from "@aelea/ui-components-theme"
import { blueberrySubgraph } from "@gambitdao/gbc-middleware"
import { awaitPromises, empty, now } from "@most/core"
import { IEnsRegistration, switchMap } from "gmx-middleware-utils"
import { Address } from "viem"
import { $jazzicon } from "../common/$avatar"
import { $berryByToken } from "./$common"


export interface IAccountPreview {
  address: Address
  labelSize?: string
  profileSize?: number
}

export interface IProfilePreview extends IAccountPreview {
  $container?: NodeComposeFn<$Node>
  showAddress?: boolean
}





export const $profileDisplay = (config: IProfilePreview) => {
  const { $container = $row, address, showAddress = true, labelSize, profileSize = 50 } = config


  return $container(style({ gap: `${profileSize / 10}px`, alignItems: 'center', textDecoration: 'none' }))(
    $profileAvatar(config),
    showAddress ? $AccountLabel(address, labelSize) : empty(),
    // showAddress
    //   ? profile?.ens?.labelName
    //     ? $ProfileLabel(profile.ens!)
    //     : $AccountLabel(address, labelSize)
    //   : empty()
  )

  // return switchLatest(map(profile => {
  //   return profile
  //     ? $profilePreview({ ...config, profile })
  //     : $accountPreview(config)
  // }, profileEv))
}


export const $profileAvatar = (config: IAccountPreview) => {
  const { address, profileSize = 50 } = config
  const profileEv = awaitPromises(blueberrySubgraph.owner(now({ id: address.toLowerCase() })))

  return $row(style({ width: `${profileSize}px`, borderRadius: '50%', overflow: 'hidden', height: `${profileSize}px` }))(
    switchMap(profile => {
      return profile && profile.profile
        ? $berryByToken(profile.profile) as any
        : $jazzicon(address)
    }, profileEv)
  )
}


export const $disconnectedWalletDisplay = ($container = $row, size = 50) => {
  const $wrapper = $node(style({ width: `${size}px`, aspectRatio: '1 / 1', borderRadius: '50%' }))

  return $container(layoutSheet.spacingSmall, style({ alignItems: 'center', textDecoration: 'none' }))(
    $wrapper(style({ display: 'flex', border: `1px solid ${pallete.foreground}`, placeContent: 'center', alignItems: 'center' }))(
      $text(style({ fontWeight: 800, color: pallete.foreground }))('?')
    ),
    $column(style({ whiteSpace: 'nowrap', fontSize: '.85rem', alignItems: 'center' }))(
      $text(style({  }))('0x----'),
      $text(style({ fontSize: '1.55em', lineHeight: 1 }))('----')
    )
  )
}


export const $AccountLabel = (address: string, fontSize = '1em') => {
  return $column(style({ fontSize, alignItems: 'center' }))(
    $text(style({ fontSize: '64%' }))(address.slice(0, 6)),
    $text(style({  }))(address.slice(address.length - 4, address.length))
  )
}




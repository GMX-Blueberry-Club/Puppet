import { $Node, $node, $text, NodeComposeFn, style } from "@aelea/dom"
import { $column, $row, layoutSheet } from "@aelea/ui-components"
import { pallete } from "@aelea/ui-components-theme"
import { IEnsRegistration } from "gmx-middleware-utils"
import { $jazzicon } from "../common/$avatar"
import { blueberrySubgraph, IOwner } from "@gambitdao/gbc-middleware"
import { awaitPromises, empty, map, now, switchLatest } from "@most/core"
import { Address } from "viem"
import { $berryByToken } from "./$common"


export interface IAccountPreview {
  address: Address
  labelSize?: string
  showAddress?: boolean
  $container?: NodeComposeFn<$Node>
  $profileContainer?: NodeComposeFn<$Node>
}

export interface IProfilePreview {
  profile: IOwner
  $container?: NodeComposeFn<$Node>
  labelSize?: string
  showAddress?: boolean
  $profileContainer?: NodeComposeFn<$Node>
}

export interface IAccountClaim extends IAccountPreview {
}


export const $AccountLabel = (address: string, fontSize = '1em') => {
  return $column(style({ fontSize }))(
    $text(style({ fontSize: '.75rem' }))(address.slice(0, 6)),
    $text(style({ fontSize: '1em', letterSpacing: '1.373px' }))(address.slice(address.length - 4, address.length))
  )
}

export const $ProfileLabel = (ens: IEnsRegistration) => {
  const hasTwitter = ens.domain.resolver?.texts?.find(t => t === 'com.twitter')

  if (hasTwitter) {
    $row(
      $text(style({ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }))(ens.labelName),
      // $text(style({ fontSize: '1em' }))(address.slice(address.length - 4, address.length))
    )
  }

  return $text(style({ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }))(ens.labelName)
}




export const $discoverIdentityDisplay = (config: IAccountPreview) => {
  const { $container, address, showAddress = true } = config

  const profileEv = awaitPromises(blueberrySubgraph.owner(now({ id: address.toLowerCase() })))

  return switchLatest(map(profile => {
    return profile
      ? $profilePreview({ ...config, profile })
      : $accountPreview(config)
  }, profileEv))
}


export const $discoverAvatar = (config: IAccountPreview) => {
  const { $container, address, showAddress = true } = config

  const profileEv = awaitPromises(blueberrySubgraph.owner(now({ id: address.toLowerCase() })))

  return switchLatest(map(profile => {
    return profile?.profile
      ? style({ borderRadius: '50%' }, $berryByToken(profile.profile, config.$profileContainer))
      : $jazzicon({
        address,
        $container: config.$profileContainer
      })
  }, profileEv))
}


export const $accountPreview = ({
  address, showAddress = true, $container = $row, labelSize, $profileContainer
}: IAccountPreview) => {
  return $container(layoutSheet.spacingSmall, style({ alignItems: 'center', placeContent: 'center', textDecoration: 'none' }))(
    $jazzicon({
      address,
      $container: $profileContainer
    }),
    showAddress ? $AccountLabel(address, labelSize) : empty(),
  )
}


export const $profilePreview = ({
  $container = $row, $profileContainer, profile, showAddress = true, labelSize = '16px'
}: IProfilePreview) => {
  return $container(layoutSheet.spacingSmall, style({ alignItems: 'center', textDecoration: 'none' }))(
    profile.profile
      ? style({ borderRadius: '50%' }, $berryByToken(profile.profile, $profileContainer))
      : $jazzicon({
        address: profile.id,
        $container: $profileContainer
      }),
    showAddress
      ? profile?.ens?.labelName
        ? $ProfileLabel(profile.ens!)
        : $AccountLabel(profile.id, labelSize)
      : empty()
  )
}


export const $disconnectedWalletDisplay = ($container = $row) => {
  const sizePx = '38px'
  const $wrapper = $node(style({ width: sizePx, height: sizePx, minWidth: sizePx, minHeight: sizePx, borderRadius: '50%' }))

  return $container(layoutSheet.spacingSmall, style({ alignItems: 'center', textDecoration: 'none' }))(
    $wrapper(style({ display: 'flex', border: `1px solid ${pallete.foreground}`, placeContent: 'center', alignItems: 'center' }))(
      $text(style({ fontWeight: 800, color: pallete.foreground }))('?')
    ),
    $column(style({ whiteSpace: 'nowrap', fontSize: '16px' }))(
      $text(style({ fontSize: '.75rem' }))('0x----'),
      $text(style({ fontSize: '1em' }))('----')
    )
  )
}





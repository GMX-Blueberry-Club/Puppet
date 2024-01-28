import { Behavior } from "@aelea/core"
import { $Node, $text, NodeComposeFn, component, style, styleBehavior } from "@aelea/dom"
import { Route } from "@aelea/router"
import { $column, $row, layoutSheet } from "@aelea/ui-components"
import { colorAlpha, pallete } from "@aelea/ui-components-theme"
import { map, now, switchLatest } from "@most/core"
import { $Link, $infoLabel, $intermediate$node } from "ui-components"
import { walletLink } from "../wallet"
import { $disconnectedWalletDisplay, $profileDisplay } from "./$AccountProfile.js"
import { IWalletPageParams } from "../pages/type"
import { readableTokenAmountLabel, switchMap } from "common-utils"
import { getPuppetDepositAmount } from "../logic/puppetLogic"
import { $seperator2 } from "../pages/common"
import { getTokenDescription } from "gmx-middleware-utils"
import * as GMX from "gmx-middleware-const"

export interface IWalletDisplay extends IWalletPageParams {
}

export const $walletProfileDisplay = (config: IWalletDisplay) => {
  const depositToken = GMX.ARBITRUM_ADDRESS.USDC
  const depositTokenDescription = getTokenDescription(depositToken)
  const { walletClientQuery } = config


  return switchLatest(switchMap(async walletQuery => {
    const wallet = await walletQuery

    if (wallet === null) {
      return $row(layoutSheet.spacingSmall, style({ alignItems: 'center', pointerEvents: 'none', paddingRight: '16px' }))(
        $disconnectedWalletDisplay(),
        $seperator2,
        style({ fontSize: '.85rem', color: pallete.foreground })($infoLabel('Click to Connect'))
      )
    }

    const address = wallet.account.address
    const depositQuery = now(address ? getPuppetDepositAmount(wallet, address) : Promise.resolve(0n))
              
    return $row(layoutSheet.spacingSmall, style({ alignItems: 'center', pointerEvents: 'none', paddingRight: '16px' }))(
      address
        ? $profileDisplay({ address })
        : style({ cursor: 'pointer' }, $disconnectedWalletDisplay()),

      $seperator2,

      $column(
        $infoLabel(
          'Balance'
        ),
        $intermediate$node(
          map(async amount => {
            return $text(style({ whiteSpace: 'nowrap' }))(readableTokenAmountLabel(depositTokenDescription, await amount))
          }, depositQuery)
        ),
      )
    ) 
  }, walletClientQuery))
}



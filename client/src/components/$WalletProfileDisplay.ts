import { $text, style } from "@aelea/dom"
import { $column, $row, layoutSheet } from "@aelea/ui-components"
import { pallete } from "@aelea/ui-components-theme"
import { map, now, switchLatest } from "@most/core"
import { readableTokenAmountLabel, switchMap } from "common-utils"
import * as GMX from "gmx-middleware-const"
import { getTokenDescription } from "gmx-middleware-utils"
import { $infoLabel, $intermediate$node } from "ui-components"
import { $seperator2 } from "../pages/common"
import { IWalletPageParams } from "../pages/type"
import { $disconnectedWalletDisplay, $profileDisplay } from "./$AccountProfile.js"
import { readPuppetDepositAmount } from "../logic/puppetRead.js"

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
    const depositQuery = now(address ? readPuppetDepositAmount(wallet, address) : Promise.resolve(0n))
              
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



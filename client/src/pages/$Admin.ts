import { Behavior } from "@aelea/core"
import { $text, component, style } from "@aelea/dom"
import { $column, layoutSheet } from "@aelea/ui-components"
import { map } from "@most/core"
import { EIP6963ProviderDetail } from "mipd"
import { $infoLabeledValue, $intermediateMessage } from "ui-components"
import * as walletLink from "wallet"
import { $heading1, $heading3 } from "../common/$text.js"
import { $SubmitBar } from "../components/form/$Form"
import { readEpochInfo } from "../logic/daoRead.js"
import { IMinterMintReturn, IWriteAdvanceEpochReturn, writeAdvanceEpoch, writeMinterMint } from "../logic/commonWrite.js"
import { IComponentPageParams, IWalletPageParams } from "./type"

interface IAdminPageParams extends IComponentPageParams {
}

export const $Admin = (config: IAdminPageParams) => component((
  [changeWallet, changeWalletTether]: Behavior<EIP6963ProviderDetail>,
  [requestMint, requestMintTether]: Behavior<walletLink.IWalletClient, IMinterMintReturn>,
  [requestAdvanceEpoch, requestAdvanceEpochTether]: Behavior<walletLink.IWalletClient, IWriteAdvanceEpochReturn>,
) => {

  const { walletClientQuery, providerQuery } = config

  return [
    $column(layoutSheet.spacing, style({ alignSelf: 'center', minWidth: '680px' }))(
      $heading1('Epoch Starter'),


      $column(
        $heading3('Gauge Controller'),

        $infoLabeledValue(
          'Epoch',
          $intermediateMessage(
            map(async providerQuery => {
              const provider = await providerQuery
              const newLocal = await readEpochInfo(provider)
              return JSON.stringify(newLocal)
            }, providerQuery)
          )
        ),
        $SubmitBar({
          walletClientQuery,
          $content: $text('Advance Epoch'),
          txQuery: requestAdvanceEpoch
        })({
          changeWallet: changeWalletTether(),
          click: requestAdvanceEpochTether(
            map(wallet => {
              return writeAdvanceEpoch(wallet)
            })
          )
        }),
      ),
      $column(
        $heading3('Minter'),
        $SubmitBar({
          walletClientQuery,
          $content: $text('Mint'),
          txQuery: requestMint
        })({
          changeWallet: changeWalletTether(),
          click: requestMintTether(
            map(wallet => {
              return writeMinterMint(wallet)
            })
          )
        }),
      )

    ),

    {
      changeWallet
    }
  ]
})

// component((
//   [changeWallet, changeWalletTether]: Behavior<EIP6963ProviderDetail>,
// ) => {




//   return [
//     $column(layoutSheet.spacing, style({ alignSelf: 'center' }))(
//       $heading1('Minter'),

//       $SubmitBar({
//         walletClientQuery,
//         $content: $text('Withdraw'),
//         disabled: map(val => val === 0n, amount),
//         txQuery: requestDepositAsset
//       })({
//         changeWallet: changeWalletTether(),
//         click
//       }),

//     ),

//     {
      
//     }
//   ]
// })





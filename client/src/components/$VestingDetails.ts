import { Behavior } from "@aelea/core"
import { $node, $text, component, style } from "@aelea/dom"
import { $column, $row, layoutSheet } from "@aelea/ui-components"
import { map, now, startWith } from "@most/core"
import { combineState, switchMap } from "common-utils"
import { $ButtonToggle, $Checkbox, $defaulButtonToggleContainer, $infoLabeledValue, $infoTooltipLabel, $label } from "ui-components"
import { uiStorage } from "ui-storage"
import * as walletLink from "wallet"
import { $pnlDisplay } from "../common/$common"
import { store } from "../const/store"
import { $seperator2 } from "../pages/common"
import { IComponentPageParams, VestingLockMode } from "../pages/type"
import { $Popover } from "./$Popover"
import { $Slider } from "./$Slider"
import { $ButtonPrimary, $ButtonSecondary, $defaultMiniButtonSecondary } from "./form/$Button"
import { $SubmitBar } from "./form/$Form"





export const $VestingDetails = (config: IComponentPageParams) => component((
  [overlayClick, overlayClickTether]: Behavior<any>,
  [requestTx, requestTxTether]: Behavior<walletLink.IWalletClient, any>,

  [changeVestingLockMode, changeVestingLockModeTether]: Behavior<VestingLockMode>,
  [toggleClaimTokenReward, toggleClaimTokenRewardTether]: Behavior<boolean>,
  [toggleLockTokenReward, toggleLockTokenRewardTether]: Behavior<boolean>,
  [toggleClaimRevenueReward, toggleClaimRevenueRewardTether]: Behavior<boolean>,
) => {

  const { providerQuery, walletClientQuery } = config

  const aligned = startWith(VestingLockMode.CONTINUOUS, changeVestingLockMode)


  const vestingLockMode = uiStorage.replayWrite(store.wallet, changeVestingLockMode, 'lockingMode')
  const claimTokensReward = uiStorage.replayWrite(store.wallet, toggleClaimTokenReward, 'claimTokens')
  const lockTokensReward = uiStorage.replayWrite(store.wallet, toggleLockTokenReward, 'lockTokens')
  const claimRevenueReward = uiStorage.replayWrite(store.wallet, toggleClaimRevenueReward, 'claimRevenue')

  
  const form = combineState({ lockTokensReward, vestingLockMode, claimTokensReward, claimRevenueReward })


  return [
    $column(layoutSheet.spacing, style({ flex: 1 }))(
      style({ placeContent: 'space-between' })(
        $infoLabeledValue(
          $text('Locked'),
          $text('37'),
        )
      ),
      style({ placeContent: 'space-between' })(
        $infoLabeledValue(
          $text('Locking Mode'),
          $row(layoutSheet.spacingSmall, style({ alignItems: 'center' }))(
            $Popover({
              open: map(params => {

                return $column(layoutSheet.spacing, style({ width: '350px' }))(
                  $text(`Lock your tokens to earn a share of the protocol's revenue, govern its future, and build your reputation within the protocol and our community fueled by users alike.`),

                  $ButtonToggle({
                    $container: $defaulButtonToggleContainer(style({ placeSelf: 'center' })),
                    options: [VestingLockMode.CONTINUOUS, VestingLockMode.SHORT_TERM],
                    selected: aligned,
                    $$option: map(value => $text(String(value))),
                  })({
                    select: changeVestingLockModeTether()
                  }),

                  switchMap(align => {
                    return align === VestingLockMode.CONTINUOUS
                      ? $column(layoutSheet.spacingSmall)(
                        $text('Maintain your tokens continuously locked the maximum 2 years. receiving the maximum rewards and voting power.'),
                        $text('You can stop renewing at any time.'),
                      )
                      : $column(layoutSheet.spacingSmall)(
                        $text('Lock your tokens for up to maxium of 2 years. longer duration yields higher rewards and voting power'),

                        $Slider({
                          thumbText: map(value => value.toFixed(2)),
                          value: now(0.5),
                        })({}),
                      )
                  }, aligned),

                  $ButtonPrimary({
                    $content: $text('Save')
                  })({ })

              
                )
              }, overlayClick),
              $target: $ButtonSecondary({
                $container: $defaultMiniButtonSecondary,
                $content: $text('Change')
              })({
                click: overlayClickTether()
              })
            })({
              // overlayClick: overlayClickTether()
            }),
            $text('Continuous'),
          ),
        )
      ),
      
      $seperator2,


      style({ placeContent: 'space-between' })(
        $infoLabeledValue(
          $infoTooltipLabel(
            $text('Reinvest your rewards to compound your earnings and increase your voting power.'),
            $text('PUPPET Reward')
          ),
          $row(layoutSheet.spacingSmall, style({ alignItems: 'center' }))(
            $row(layoutSheet.spacing, style({ alignItems: 'center' }))(
              $Checkbox({ value: claimTokensReward, label: 'Claim' })({
                check: toggleClaimTokenRewardTether()
              }),
              $Checkbox({
                label: 'Lock',
                value: lockTokensReward,
                disabled: map(isClaim => !isClaim, claimTokensReward)
              })({
                check: toggleLockTokenRewardTether()
              }),
              
              $pnlDisplay(12300000000000000000000000000003n),
            ),
          ),
        ),
      ),

      style({ placeContent: 'space-between' })(
        $infoLabeledValue(
          $text('Revenue Reward'),
          $row(layoutSheet.spacingSmall, style({ alignItems: 'center' }))(
            $Checkbox({ label: 'Claim', value: claimRevenueReward })({
              check: toggleClaimRevenueRewardTether()
            }),
            $pnlDisplay(2300000000000000000000000000003n),
          )
        )
      ),

      $node(),

      $row(layoutSheet.spacingSmall)(
        $node(style({ flex: 1 }))(),

        $SubmitBar({
          disabled: now(true),
          txQuery: requestTx,
          walletClientQuery,
          $content: $text(map(params => {

            const lockLabel = params.claimTokensReward && params.lockTokensReward ? ' & Lock' : ''

            return `Claim${lockLabel}`
          }, form))
        })({
          click: requestTxTether()
        }),
      )


    
    ),

    {
      
    }
  ]
})



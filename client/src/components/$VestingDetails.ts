import { Behavior, replayLatest } from "@aelea/core"
import { $node, $text, component, style } from "@aelea/dom"
import { $column, $row, layoutSheet } from "@aelea/ui-components"
import { colorAlpha, pallete } from "@aelea/ui-components-theme"
import { constant, map, mergeArray, multicast, now, sample } from "@most/core"
import { MAX_UINT256, combineState, readableDate, readableUnitAmount, switchMap, unixTimestampNow } from "common-utils"
import * as PUPPET from "puppet-middleware-const"
import { $ButtonToggle, $Checkbox, $defaulButtonToggleContainer, $infoLabeledValue, $infoTooltipLabel, $intermediateMessage } from "ui-components"
import { uiStorage } from "ui-storage"
import * as walletLink from "wallet"
import { $pnlDisplay } from "../common/$common"
import { store } from "../const/store"
import { readUserLockDetails } from "../logic/puppetRead"
import { $seperator2 } from "../pages/common"
import { IComponentPageParams, VestingLockMode } from "../pages/type"
import { $Popover } from "./$Popover"
import { $Slider } from "./$Slider"
import { $ButtonSecondary, $defaultMiniButtonSecondary } from "./form/$Button"
import { $SubmitBar } from "./form/$Form"


function getVestingLockMode(time: bigint) {
  return time === 0n
    ? VestingLockMode.CONTINUOUS
    : time === MAX_UINT256 ? VestingLockMode.CONTINUOUS
      : VestingLockMode.SHORT_TERM
}


export const $VestingDetails = (config: IComponentPageParams) => component((
  [overlayClick, overlayClickTether]: Behavior<any>,
  [requestTx, requestTxTether]: Behavior<walletLink.IWalletClient, any>,

  [changePopoverLockMode, changePopoverLockModeTether]: Behavior<any, VestingLockMode>,
  [changePopoverLockSchedule, changePopoverLockScheduleTether]: Behavior<number>,
  [changeVestingLockSchedule, changeVestingLockScheduleTether]: Behavior<any, bigint>,

  [toggleClaimTokenReward, toggleClaimTokenRewardTether]: Behavior<boolean>,
  [toggleLockTokenReward, toggleLockTokenRewardTether]: Behavior<boolean>,
  [toggleClaimRevenueReward, toggleClaimRevenueRewardTether]: Behavior<boolean>,
) => {

  const { providerClientQuery, walletClientQuery } = config

  const lockDetails = map(async walletQuery => {
    const wallet = await walletQuery

    if (!wallet) return { amount: 0n, end: 0n }

    return readUserLockDetails(wallet, wallet?.account.address)
  }, walletClientQuery)

  const readVestingLockSchedule = switchMap(async lock => (await lock).end, lockDetails)


  const vestingLockSchedule = replayLatest(multicast(mergeArray([changeVestingLockSchedule, readVestingLockSchedule])))
  // const vestingLockScheduleMode = map(time =>  getVestingLockMode(time), vestingLockSchedule)

  const claimTokensReward = uiStorage.replayWrite(store.wallet, toggleClaimTokenReward, 'claimTokens')
  const lockTokensReward = uiStorage.replayWrite(store.wallet, toggleLockTokenReward, 'lockTokens')
  const claimRevenueReward = uiStorage.replayWrite(store.wallet, toggleClaimRevenueReward, 'claimRevenue')

  const form = combineState({ lockTokensReward, vestingLockSchedule, claimTokensReward, claimRevenueReward })

  // const popoverLockSchedule = multicast(mergeArray([vestingLockSchedule]))


  const MAX_CONTINUOUS_LOCKUP = unixTimestampNow() + PUPPET.MAX_LOCKUP_SCHEDULE

  return [
    $column(layoutSheet.spacing, style({ flex: 1 }))(
      style({ placeContent: 'space-between' })(
        $infoLabeledValue(
          $text('Locked'),
          $intermediateMessage(
            map(async lockQuery => {
              return readableUnitAmount((await lockQuery).amount)
            }, lockDetails)
          ),
        )
      ),
      style({ placeContent: 'space-between' })(
        $infoLabeledValue(
          $text('Locking Schedule'),
          $row(layoutSheet.spacingSmall, style({ alignItems: 'center' }))(
            $Popover({
              open: map(params => {


                const formatSliderSchedule = mergeArray([
                  changePopoverLockSchedule,
                  map(period => {

                    if (period === MAX_UINT256)  {
                      return 1
                    }

                    if (period === 0n) {
                      return 0.5
                    }

                    const newLocal = Number(Number(period) - unixTimestampNow()) / Number(PUPPET.MAX_LOCKUP_SCHEDULE)
                    return newLocal
                  }, vestingLockSchedule)
                ])

                const slideLockupSchedule = mergeArray([
                  map(value => {
                    const period = Math.floor(value * Number(PUPPET.MAX_LOCKUP_SCHEDULE))
                    const newLocal = BigInt(unixTimestampNow() + period)
                    return newLocal
                  }, formatSliderSchedule),
                  vestingLockSchedule
                ])

                const selectedMode = mergeArray([
                  map(getVestingLockMode, vestingLockSchedule),
                  changePopoverLockMode
                ])

                return $column(layoutSheet.spacing, style({ width: '350px' }))(
                  $text(`Lock your tokens to earn a share of the protocol's revenue, govern its future, and build your reputation within the protocol and our community fueled by users alike.`),

                  $ButtonToggle({
                    $container: $defaulButtonToggleContainer(style({ placeSelf: 'center' })),
                    options: [VestingLockMode.CONTINUOUS, VestingLockMode.SHORT_TERM],
                    selected: selectedMode,
                    $$option: map(value => $text(String(value))),
                  })({
                    select: changePopoverLockModeTether()
                  }),

                  switchMap(align => {

                    if (align === VestingLockMode.CONTINUOUS) {
                      return $column(layoutSheet.spacingSmall)(
                        $text('Maintain your tokens continuously locked the maximum 2 years. receiving the maximum rewards and voting power.'),
                        $text('You can stop renewing at any time.'),

                        $row(
                          $node(style({ flex: 1 }))(),
                          $ButtonSecondary({
                            $content: $text('Save')
                          })({ 
                            click: changeVestingLockScheduleTether(constant(MAX_UINT256))
                          }),
                        )
                      )
                    }


                    return $column(layoutSheet.spacingSmall)(
                      $text('Lock your tokens for up to maxium of 2 years. longer duration yields higher rewards and voting power'),

                      $Slider({
                        color: map(val => colorAlpha(pallete.positive, val), formatSliderSchedule),
                        value: formatSliderSchedule,
                      })({
                        change: changePopoverLockScheduleTether(multicast),
                      }),

                      $row(style({ alignItems: 'center' }))(
                        $node(style({ flex: 1 }))(
                          $infoLabeledValue(
                            'End Date:',
                            $text(map(period => {
                              if (period === MAX_UINT256)  {
                                return readableDate(unixTimestampNow() + (PUPPET.MAX_LOCKUP_SCHEDULE))
                              }
                              if (period === 0n) {
                                return readableDate(unixTimestampNow() + (PUPPET.MAX_LOCKUP_SCHEDULE / 2))
                              }

                              return readableDate(Number(period))
                            }, slideLockupSchedule))
                          )
                        ),
                        $ButtonSecondary({
                          $content: $text('Save')
                        })({ 
                          click: changeVestingLockScheduleTether(
                            sample(slideLockupSchedule)
                          )
                        })
                      )
                    )
                  }, selectedMode),
              
                )
              }, overlayClick),
              dismiss: changeVestingLockSchedule,
              $target: $ButtonSecondary({
                $container: $defaultMiniButtonSecondary,
                $content: $text('Change')
              })({
                click: overlayClickTether()
              })
            })({
              // overlayClick: overlayClickTether()
            }),
            switchMap(time => {
              if (time === 0n) {
                return $text(style({ color: pallete.indeterminate }))(VestingLockMode.NONE)
              }

              const mode = getVestingLockMode(time)

              if (mode === VestingLockMode.CONTINUOUS) {
                return $text(VestingLockMode.CONTINUOUS)
              }

              return $text(readableDate(Number(time)))
            }, vestingLockSchedule),
          ),
        )
      ),

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
      })


    
    ),

    {
      
    }
  ]
})



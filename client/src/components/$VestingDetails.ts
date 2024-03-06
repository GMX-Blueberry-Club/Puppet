import { Behavior, replayLatest } from "@aelea/core"
import { $node, $text, component, style } from "@aelea/dom"
import { $column, $row, layoutSheet } from "@aelea/ui-components"
import { colorAlpha, pallete } from "@aelea/ui-components-theme"
import { combine, constant, map, mergeArray, multicast, now, sample, snapshot, take } from "@most/core"
import { Stream } from "@most/types"
import { IntervalTime, combineState, filterNull, getMappedValue, readableDate, readableTokenAmountLabel, readableUnitAmount, switchMap, unixTimestampNow } from "common-utils"
import { ARBITRUM_ADDRESS } from "gmx-middleware-const"
import { getTokenDescription } from "gmx-middleware-utils"
import { EIP6963ProviderDetail } from "mipd"
import * as PUPPET from "puppet-middleware-const"
import { $ButtonToggle, $Checkbox, $defaulButtonToggleContainer, $hintAdjustment, $infoLabeledValue, $infoTooltipLabel, $intermediateMessage } from "ui-components"
import { uiStorage } from "ui-storage"
import * as walletLink from "wallet"
import { $heading3 } from "../common/$text"
import { store } from "../const/store"
import { readUserLockDetails } from "../logic/puppetRead"
import { $seperator2 } from "../pages/common"
import { IComponentPageParams, SelectedOption } from "../pages/type"
import { $Popover } from "./$Popover"
import { $Slider } from "./$Slider"
import { $ButtonSecondary, $defaultMiniButtonSecondary } from "./form/$Button"
import { $SubmitBar } from "./form/$Form"
import * as viem from "viem"




interface IVestingDetails extends IComponentPageParams {
  puppetTokenPriceInUsd: Stream<bigint>
}

// type PopoverState = {
//   maintainSchedule: boolean
//   lockSchedule: number
// }


export const $VestingDetails = (config: IVestingDetails) => component((
  [changeWallet, changeWalletTether]: Behavior<EIP6963ProviderDetail>,

  [overlayClick, overlayClickTether]: Behavior<any>,
  [requestTx, requestTxTether]: Behavior<walletLink.IWalletClient, any>,

  [changePopoverScheduleFactor, changePopoverScheduleFactorTether]: Behavior<any, number>,
  [changePopoverMaintainSchedule, changePopoverMaintainScheduleTether]: Behavior<boolean>,
  [savePopoverLockSchedule, savePopoverLockScheduleTether]: Behavior<any>,

    
  [checkMaintainSchedule, checkMaintainScheduleTether]: Behavior<any, boolean | null>,
  [changeScheduleFactor, changeScheduleFactorTether]: Behavior<number>,
  [changeOptionMode, changeOptionModeTether]: Behavior<SelectedOption>,
  [toggleClaimRevenueReward, toggleClaimRevenueRewardTether]: Behavior<boolean>,
) => {

  const { providerClientQuery, walletClientQuery, puppetTokenPriceInUsd } = config

  const lockDetails = replayLatest(multicast(map(async walletQuery => {
    const wallet = await walletQuery

    if (!wallet) return { amount: 0n, end: 0n }

    return readUserLockDetails(wallet, wallet?.account.address)
  }, walletClientQuery)))

  const readVestingLockSchedule = switchMap(async lock => (await lock).end, lockDetails)
  const lockSchedule = replayLatest(multicast(mergeArray([changeScheduleFactor, readVestingLockSchedule])))

  const maintainSchedule = uiStorage.replayWrite(store.wallet, checkMaintainSchedule, 'maintainSchedule')
  const claimRevenueReward = uiStorage.replayWrite(store.wallet, toggleClaimRevenueReward, 'claimRevenue')
  const option = uiStorage.replayWrite(store.wallet, changeOptionMode, 'option')

  const form = combineState({ maintainSchedule, lockSchedule, claimRevenueReward, option, puppetTokenPriceInUsd })


  return [
    $column(layoutSheet.spacing, style({ flex: 1 }))(
      $heading3('Vesting Schedule'),
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
          $text('Schedule'),
          $row(layoutSheet.spacingSmall, style({ alignItems: 'center' }))(
            $hintAdjustment({
              change: mergeArray([
                filterNull(map(isMax => isMax ? readableDate(unixTimestampNow() + PUPPET.MAX_LOCKUP_SCHEDULE) : null, maintainSchedule)),
                map(val => readableDate(Number(val)), changeScheduleFactor)
              ]),
              val: map(val => {
                if (val === 0n) {
                  return 'None'
                }

                return readableDate(Number(val))
              }, readVestingLockSchedule),
            }),
            
            $Popover({
              open: map(params => {
                const initMaintainState = take(1, map(maintain => maintain || maintain === null, maintainSchedule))
                const popoverMaintainSchedule = mergeArray([initMaintainState, changePopoverMaintainSchedule])

                return $column(layoutSheet.spacing, style({ width: '350px' }))(
                  $ButtonToggle({
                    $container: $defaulButtonToggleContainer(style({ placeSelf: 'center' })),
                    options: [true, false],
                    selected: popoverMaintainSchedule,
                    $$option: map(value => $text(value ? 'Maximize' : 'Short Term')),
                  })({
                    select: changePopoverMaintainScheduleTether()
                  }),
 
                  switchMap(maintain => {
                    if (maintain) {
                      return $column(layoutSheet.spacing)(
                        $text('Maximize your rewards and voting power, this will re-lock your tokens for 2 years every time you claim your rewards.'),
                        $text('You can switch to short term any time.'),

                        $row(layoutSheet.spacing, style({ alignItems: 'center' }))(
                          $node(style({ flex: 1 }))(),
                          $ButtonSecondary({
                            $content: $text('Save')
                          })({ 
                            click: savePopoverLockScheduleTether(
                              checkMaintainScheduleTether(constant(true))
                            )
                          }),
                        )
                      )
                    }

                    const sliderFactor = mergeArray([
                      map(val => {
                        if (val === 0n) {
                          return 0.5
                        }

                        const durationElapsed = unixTimestampNow() - Number(val)

                        return Number(PUPPET.MAX_LOCKUP_SCHEDULE) / durationElapsed
                      }, readVestingLockSchedule),
                      changePopoverScheduleFactor
                    ])

                    const slideDate = map(factor => {
                      const duration = factor * Number(PUPPET.MAX_LOCKUP_SCHEDULE)
                      const time = Math.floor((unixTimestampNow() + duration) / IntervalTime.DAY7) * IntervalTime.DAY7
                      return time
                    }, sliderFactor)

                    return $column(layoutSheet.spacing)(
                      $text('Lock your tokens for up to maxium of 2 years. longer duration yields higher rewards and voting power'),
                      $Slider({
                        color: map(val => colorAlpha(pallete.positive, val), sliderFactor),
                        disabled: map(val => val === true, maintainSchedule),
                        value: sliderFactor,
                      })({
                        change: changePopoverScheduleFactorTether(),
                      }),

                      $row(layoutSheet.spacing, style({ alignItems: 'center' }))(
                        $row(style({ alignItems: 'center' }))(
                          $node(style({ flex: 1 }))(
                            $infoLabeledValue(
                              'End Date:',
                              $text(map(time => readableDate(time), slideDate))
                            )
                          )
                        ),
                        $node(style({ flex: 1 }))(),
                      
                        $ButtonSecondary({
                          $content: $text('Save')
                        })({ 
                          click: savePopoverLockScheduleTether(
                            changeScheduleFactorTether(sample(slideDate)),
                            checkMaintainScheduleTether(constant(false))
                          )
                        }),
                      )
                    )
                  }, popoverMaintainSchedule),

                )
              }, overlayClick),
              dismiss: savePopoverLockSchedule,
              $target: $ButtonSecondary({
                $container: $defaultMiniButtonSecondary,
                $content: switchMap(maintain => {
                  if (maintain === null) {
                    return $text(style({ color: pallete.indeterminate }))('None')
                  }

                  return $text(maintain ? 'Maximize' : 'Short Term')
                }, maintainSchedule)
              })({
                click: overlayClickTether()
              })
            })({
              // overlayClick: overlayClickTether()
            }),
            
          ),
        )
      ),

      style({ placeContent: 'space-between' })(
        $infoLabeledValue(
          $text('Lock Revenue'),
          $row(layoutSheet.spacingSmall, style({ alignItems: 'center' }))(
            $Checkbox({ label: 'Claim', value: claimRevenueReward })({
              check: toggleClaimRevenueRewardTether()
            }),
            $text(style({ color: pallete.positive }))('+' + readableTokenAmountLabel(getTokenDescription(ARBITRUM_ADDRESS.USDC), 23000000n)),
          )
        )
      ),
      
      
      $seperator2,
      $heading3('Generated Rewards'),

      style({ placeContent: 'space-between' })(
        $infoLabeledValue(
          $infoTooltipLabel(
            $text('Reinvest your rewards to compound your earnings and increase your voting power.'),
            $text('Contributed Revenue')
          ),
          $text('0'),
        ),
      ),
      style({ placeContent: 'space-between' })( 
        $infoLabeledValue(
          $infoTooltipLabel(
            $text('Reinvest your rewards to compound your earnings and increase your voting power.'),
            $text('Reward')
          ),
          $ButtonToggle({
            $container: $defaulButtonToggleContainer(style({ flexDirection: 'column', placeSelf: 'center' })),
            options: [SelectedOption.LOCK, SelectedOption.EXIT],
            selected: option,
            $$option: combine((selected, value) => {

              const rewardAmount = readableTokenAmountLabel(PUPPET.PUPPET_TOKEN_DESCRIPTION, 134270000000000000000n)

              return $row(layoutSheet.spacingSmall)(
                $text(String(value)),
                $text(style({ color: pallete.positive, opacity: selected === value ? '' : '.5' }))(
                  rewardAmount
                )
                // $pnlDisplay(10n ** 30n * 15n) : style({ opacity: .25 })($pnlDisplay(10n ** 30n * 15n))
              )
            }, option),
          })({
            select: changeOptionModeTether()
          }),
        ),
      ),


      // $row(layoutSheet.spacingSmall, style({ alignItems: 'center' }))(
      //   $row(layoutSheet.spacing, style({ alignItems: 'center' }))(
      //     $Checkbox({ value: claimTokensReward, label: 'Claim' })({
      //       check: toggleClaimTokenRewardTether()
      //     }),
      //     $Checkbox({
      //       label: 'Lock',
      //       value: lockTokensReward,
      //       disabled: map(isClaim => !isClaim, claimTokensReward)
      //     })({
      //       check: toggleLockTokenRewardTether()
      //     }),
              
          
      //   ),
      // ),

      

      

      // $node(),

      $SubmitBar({
        disabled: now(true),
        txQuery: requestTx,
        walletClientQuery,
        $content: $text(map(params => {
          const lockLabel = params.lockSchedule && params.claimRevenueReward ? ' & Lock' : ''

          return `Claim${lockLabel}`
        }, form))
      })({
        changeWallet: changeWalletTether(),
        click: requestTxTether(
          snapshot((form, wallet) => {

            const contractDefs = getMappedValue(PUPPET.CONTRACT, wallet.chain.id)

            if (form.option === SelectedOption.EXIT) {
              const writeQuery = walletLink.writeContract({
                ...contractDefs.RewardRouter,
                functionName: 'exit',
                args: [form.puppetTokenPriceInUsd],
                walletClient: wallet
              })
              
              return writeQuery
            }



            const lock = form.option === SelectedOption.LOCK
              ? viem.encodeFunctionData({
                ...contractDefs.RewardRouter,
                functionName: 'lock',
                args: []
              })
              : viem.encodeFunctionData({
                ...contractDefs.RewardRouter,
                functionName: 'lock',
                args: [amount, token, receiver, isEth]
              })

            const writeQuery = walletLink.writeContract({
              ...contractDefs.RewardRouter,
              functionName: 'multicall',
              args: [lock] as const,
            })

            return writeQuery
          }, form)
        )
      })


    
    ),

    {
      changeWallet,
    }
  ]
})



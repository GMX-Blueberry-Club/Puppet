import { $node, $text, component, style } from "@aelea/dom"
import * as router from '@aelea/router'
import { $column, $row, layoutSheet, screenUtils } from "@aelea/ui-components"
import { pallete } from "@aelea/ui-components-theme"
import { fromPromise, map, startWith } from "@most/core"
import { Stream } from "@most/types"
import { readableFixedUSD30, readableLeverage, switchMap, zipState } from "gmx-middleware-utils"
import { IMirrorPositionOpen, IMirrorPositionSettled, accountSettledPositionListSummary } from "puppet-middleware-utils"
import * as viem from 'viem'
import { $profileDisplay } from "../$AccountProfile.js"
import { $heading2 } from "../../common/$text.js"
import { intermediateMessage } from "gmx-middleware-ui-components"


export interface IAccountSummary {
  route: router.Route
  address: viem.Address
  settledPositionListQuery: Stream<Promise<IMirrorPositionSettled[]>>
  openPositionListQuery: Stream<Promise<IMirrorPositionOpen[]>>
}




export const $TraderProfileSummary = ({ address, openPositionListQuery, settledPositionListQuery, route }: IAccountSummary) => component((

) => {

  const metrics = map(async params => {
    const allPositions = [...await params.settledPositionListQuery, ...await params.openPositionListQuery]

    return accountSettledPositionListSummary(allPositions)
  }, zipState({ openPositionListQuery, settledPositionListQuery }))

  return [

    $column(layoutSheet.spacing, style({ minHeight: '90px' }))(
      switchMap(summaryQuery => {
        return $node(style({ display: 'flex', flexDirection: screenUtils.isDesktopScreen ? 'row' : 'column', gap: screenUtils.isDesktopScreen ? '76px' : '26px', zIndex: 10, placeContent: 'center', alignItems: 'center', padding: '0 8px' }))(
          $row(
            $profileDisplay({
              address,
              labelSize: '22px',
              profileSize: screenUtils.isDesktopScreen ? 90 : 90
            })
          ),
          $row(layoutSheet.spacingBig, style({ alignItems: 'flex-end' }))(
            // $metricRow(
            //   params.summary.subscribedPuppets.length
            //     ? $metricValue(style({ paddingBottom: '5px' }))(
            //       ...params.summary.subscribedPuppets.map(address => {
            //         return $profileAvatar({ address, profileSize: 26 })
            //       })
            //     )
            //     : $metricValue($text('-')),
            //   $metricLabel($text('Puppets'))
            // ),
            $metricRow(
              $heading2(intermediateMessage(summaryQuery, summary => `${summary.winCount} / ${summary.lossCount}`)),
              $metricLabel($text('Win / Loss'))
            ),
            $metricRow(
              $heading2(intermediateMessage(summaryQuery, summary => readableFixedUSD30(summary.avgCollateral))),
              $metricLabel($text('Avg Collateral'))
            ),
            $metricRow(
              $heading2(intermediateMessage(summaryQuery, summary => readableLeverage(summary.avgSize, summary.avgCollateral))),
              $metricLabel($text('Avg Leverage'))
            )
          ),
        )
      }, metrics)
      // $IntermediatePromise({

      // })({}),
    ),
    {
    }
  ]
})

export const $PuppetProfileSummary = ({ address, openPositionListQuery, settledPositionListQuery, route }: IAccountSummary) => component(() => {

  const metrics = map(async params => {
    const allPositions = [...await params.settledPositionListQuery, ...await params.openPositionListQuery]

    return accountSettledPositionListSummary(allPositions)
  }, zipState({ openPositionListQuery, settledPositionListQuery }))

  return [

    $column(layoutSheet.spacing, style({ minHeight: '90px' }))(
      switchMap(summaryQuery => {

        return $node(style({ display: 'flex', flexDirection: screenUtils.isDesktopScreen ? 'row' : 'column', gap: screenUtils.isDesktopScreen ? '76px' : '26px', zIndex: 10, placeContent: 'center', alignItems: 'center', padding: '0 8px' }))(
          $row(
            $profileDisplay({
              address,
              labelSize: '22px',
              profileSize: screenUtils.isDesktopScreen ? 90 : 90
            })
          ),
          $row(layoutSheet.spacingBig, style({ alignItems: 'flex-end' }))(
            // $metricRow(
            //   params.summary.subscribedPuppets.length
            //     ? $metricValue(style({ paddingBottom: '5px' }))(
            //       ...params.summary.subscribedPuppets.map(address => {
            //         return $profileAvatar({ address, profileSize: 26 })
            //       })
            //     )
            //     : $metricValue($text('-')),
            //   $metricLabel($text('Puppets'))
            // ),
            $metricRow(
              $heading2(intermediateMessage(summaryQuery, summary => `${summary.winCount} / ${summary.lossCount}`)),
              $metricLabel($text('Win / Loss'))
            ),
            $metricRow(
              $heading2(intermediateMessage(summaryQuery, summary => readableFixedUSD30(summary.avgCollateral))),
              $metricLabel($text('Avg Collateral'))
            )
          ),
        )
      }, metrics),
    ),
    {
    }
  ]
})

export const $metricRow = $column(layoutSheet.spacingTiny, style({ placeContent: 'center', alignItems: 'center' }))
export const $metricLabel = $row(style({ color: pallete.foreground, letterSpacing: '1px', fontSize: screenUtils.isDesktopScreen ? '.85rem' : '.85rem' }))
export const $metricValue = $row(style({ fontWeight: 900, letterSpacing: '1px', fontSize: '1.85rem' }))



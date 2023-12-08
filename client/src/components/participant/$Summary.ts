import { combineObject } from "@aelea/core"
import { $node, $text, component, style } from "@aelea/dom"
import * as router from '@aelea/router'
import { $column, $row, layoutSheet, screenUtils } from "@aelea/ui-components"
import { Stream } from "@most/types"
import * as GMX from 'gmx-middleware-const'
import { readableFixedUSD30, readableLeverage, readableNumber, readableUSD, switchMap } from "gmx-middleware-utils"
import { IPositionMirrorSettled, accountSettledTradeListSummary } from "puppet-middleware-utils"
import * as viem from 'viem'
import { $profileDisplay } from "../$AccountProfile.js"
import { $heading2 } from "../../common/$text.js"
import { IGmxProcessState } from "../../data/process/process.js"
import { $metricLabel, $metricRow } from "./profileUtils.js"



export interface IAccountSummary {
  route: router.Route
  address: viem.Address
  settledTradeList: Stream<IPositionMirrorSettled[]>
}


export const $TraderProfileSummary = (config: IAccountSummary) => component((

) => {


  return [

    $column(layoutSheet.spacing, style({ minHeight: '90px' }))(
      switchMap(params => {
        const metrics = accountSettledTradeListSummary(config.address, params.settledTradeList)

        return $node(style({ display: 'flex', flexDirection: screenUtils.isDesktopScreen ? 'row' : 'column', gap: screenUtils.isDesktopScreen ? '76px' : '26px', zIndex: 10, placeContent: 'center', alignItems: 'center', padding: '0 8px' }))(
          $row(
            $profileDisplay({
              address: config.address,
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
              $heading2(metrics.size ? `${metrics.winCount} / ${metrics.lossCount}` : '-'),
              $metricLabel($text('Win / Loss'))
            ),
            $metricRow(
              $heading2(readableFixedUSD30(metrics.avgCollateral)),
              $metricLabel($text('Avg Collateral'))
            ),
            $metricRow(
              $heading2(metrics.size ? readableLeverage(metrics.avgSize, metrics.avgCollateral) : '-'),
              $metricLabel($text('Avg Leverage'))
            )
          ),
        )
      }, combineObject({ settledTradeList: config.settledTradeList })),
    ),
    {
    }
  ]
})

export const $PuppetProfileSummary = (config: IAccountSummary) => component((

) => {


  return [

    $column(layoutSheet.spacing, style({ minHeight: '90px' }))(
      switchMap(params => {
        const metrics = accountSettledTradeListSummary(config.address, params.settledTradeList)

        return $node(style({ display: 'flex', flexDirection: screenUtils.isDesktopScreen ? 'row' : 'column', gap: screenUtils.isDesktopScreen ? '76px' : '26px', zIndex: 10, placeContent: 'center', alignItems: 'center', padding: '0 8px' }))(
          $row(
            $profileDisplay({
              address: config.address,
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
              $heading2(metrics.size ? `${metrics.winCount} / ${metrics.lossCount}` : '-'),
              $metricLabel($text('Win / Loss'))
            ),
            $metricRow(
              $heading2(readableFixedUSD30(metrics.avgCollateral)),
              $metricLabel($text('Avg Collateral'))
            )
          ),
        )
      }, combineObject({ settledTradeList: config.settledTradeList })),
    ),
    {
    }
  ]
})



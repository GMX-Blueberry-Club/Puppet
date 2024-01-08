
import { Behavior, combineObject } from "@aelea/core"
import { $element, $node, $text, attr, component, style, stylePseudo } from "@aelea/dom"
import { $column, $row, layoutSheet } from "@aelea/ui-components"
import { empty, map, mergeArray, now, recoverWith, snapshot, take } from "@most/core"
import { IntervalTime } from "gmx-middleware-const"
import { formatFixed, parseBps, switchMap, unixTimestampNow } from "gmx-middleware-utils"
import * as PUPPET from "puppet-middleware-const"
import { ISubscribeTradeRouteDto, getPuppetAllowancesKey } from "puppet-middleware-utils"
import * as viem from "viem"
import { arbitrum } from "viem/chains"
import { theme } from "../../assignThemeSync.js"
import { $TextField } from "../../common/$TextField.js"
import { contractReader } from "../../logic/common"
import { IWalletClient, wallet } from "../../wallet/walletLink"
import { $ButtonSecondary } from "../form/$Button.js"


interface IRouteSubscriptionEditor {
  // tradeRoute: viem.Address
  // wallet?: IWalletClient
  // routeKey: viem.Hex
  expiry: bigint
  tradeRoute: viem.Hex

  routeTypeKey: viem.Hex
  trader: viem.Address
  // collateralToken: viem.Address
  // indexToken: viem.Address
  // isLong: boolean
  // marketList: Stream<IMarketCreatedEvent[]>
}

export interface IChangeSubscription {
  expiry: bigint
  allowance: bigint
  routeTypeKey: viem.Hex
  trader: viem.Address

  previousSubscriptionExpiry: bigint
}

export const $RouteSubscriptionEditor = (config: IRouteSubscriptionEditor) => component((
  [inputEndDate, inputEndDateTether]: Behavior<any, bigint>,
  [inputAllowance, inputAllowanceTether]: Behavior<any, bigint>,
  [clickUnsubscribe, clickUnsubscribeTether]: Behavior<any, IChangeSubscription>,
  [clickSubmit, clickSubmitTether]: Behavior<any, IChangeSubscription>,

  // [switchIsLong, switchIsLongTether]: Behavior<boolean>,
  // [switchisMarketIndexToken, switchisMarketIndexTokenTether]: Behavior<boolean>,
) => {

  const puppetContractMap = PUPPET.CONTRACT[arbitrum.id]
  const datastoreReader = contractReader(puppetContractMap.Datastore) 
  const allowance = mergeArray([
    switchMap(wallet => {
      if (wallet == null) return now(0n)
      const currentAllowance = map(([aa, bb]) => {
        return aa ? bb : undefined
      }, datastoreReader('tryGetAddressToUintFor', getPuppetAllowancesKey(wallet.account.address), config.tradeRoute))
      return currentAllowance
    }, wallet),
    inputAllowance
  ])

  
  const expiry = mergeArray([
    now(config.expiry ? config.expiry : BigInt(unixTimestampNow() + IntervalTime.YEAR)),
    inputEndDate
  ])
  
  const form = combineObject({
    allowance,
    expiry
  })


  const isSubscribed = config.expiry !== 0n

  return [
    $column(layoutSheet.spacing, style({ maxWidth: '350px' }))(

      $text('The following rules will apply to this trader whenever he opens and maintain a position'),
      // $labeledDivider('Matching Trigger'),

      // $row(layoutSheet.spacingSmall)(
      //   switchMap(params => {
      //     return $infoLabeledValue(
      //       $text(style({ width: '100px' }))('Position'),
      //       $Dropdown({
      //         $container: $row(style({ borderRadius: '30px', backgroundColor: pallete.background, padding: '4px 8px', position: 'relative', border: `1px solid ${colorAlpha(pallete.foreground, .2)}`, cursor: 'pointer' })),
      //         selector: {
      //           list: params.marketList,
      //           $$option: map(market => $marketSmallLabel(market)),
      //           value: market,
      //         },
      //         $selection: switchMap(market => {
      //           return $row(layoutSheet.spacingSmall)(
      //             $marketSmallLabel(market),
      //             $icon({ $content: $caretDown, width: '14px', viewBox: '0 0 32 32' })
      //           )
      //         }, market),
      //       })({
      //         select: selectMarketTether()
      //       })
      //     )
      //   }, combineObject({ marketList })),
      //   $Dropdown({
      //     $container: $row(style({ borderRadius: '30px', backgroundColor: pallete.background, padding: '4px 8px', position: 'relative', border: `1px solid ${colorAlpha(pallete.foreground, .2)}`, cursor: 'pointer' })),
      //     selector: {
      //       list: [
      //         true,
      //         false,
      //       ],
      //       $$option: map(il => {
      //         return $row(layoutSheet.spacingSmall, style({ alignItems: 'center' }))(
      //           $icon({ $content: il ? $bull : $bear, width: '24px', viewBox: '0 0 32 32' }),
      //           $text(il ? 'Long' : 'Short'),
      //         )
      //       }),
      //       value: isLong,
      //     },
      //     $selection: switchLatest(map(il => {
      //       return $row(layoutSheet.spacingSmall, style({ alignItems: 'center' }))(
      //         $icon({ $content: il ? $bull : $bear, width: '24px', viewBox: '0 0 32 32' }),
      //         $text(il ? 'Long' : 'Short'),
      //         $icon({ $content: $caretDown, width: '14px', viewBox: '0 0 32 32' })
      //       )
      //     }, isLong)),
      //   })({
      //     select: switchIsLongTether()
      //   }),
      // ),

      // $infoLabeledValue(
      //   $text(style({ width: '100px' }))('Collateral Token'),
      //   switchMap(params => {

      //     return $Dropdown({
      //       $container: $row(style({ borderRadius: '30px', backgroundColor: pallete.background, padding: '4px 8px', position: 'relative', border: `1px solid ${colorAlpha(pallete.foreground, .2)}`, cursor: 'pointer' })),
      //       $selection: switchMap(isIndexToken => {
      //         const token = isIndexToken ? params.market.shortToken : params.market.longToken
      //         const tokenDesc = getTokenDescription(token)

      //         return $row(layoutSheet.spacingTiny, style({ alignItems: 'center', cursor: 'pointer' }))(
      //           $row(layoutSheet.spacingTiny, style({ alignItems: 'center' }))(
      //             $icon({ $content: $tokenIconMap[tokenDesc.symbol], width: '24px', viewBox: '0 0 32 32' }),
      //             $text(tokenDesc.symbol)
      //           ),
      //           $icon({ $content: $caretDown, width: '14px', viewBox: '0 0 32 32' })
      //         )
      //       }, isMarketIndexToken),
      //       selector: {
      //         value: isMarketIndexToken,
      //         $container: $defaultSelectContainer(style({ minWidth: '290px', right: 0 })),
      //         $$option: map(option => {
      //           const token = option ? params.market.longToken : params.market.shortToken
      //           const desc = getTokenDescription(token)

      //           return $tokenLabelFromSummary(desc)
      //         }),
      //         list: [
      //           false,
      //           true
      //         ],
      //       }
      //     })({
      //       select: switchisMarketIndexTokenTether()
      //     })
      //   }, combineObject({ market })),
      // ),

      // $labeledDivider('Deposit rules'),

      $TextField({
        label: 'Allow %',
        value: map(x => x ? formatFixed(x, 4) * 100 : '', allowance),
        labelWidth: 100,
        hint: `% allocated per adjustment. 1-10% is recommended`,
      })({
        change: inputAllowanceTether(
          map(x => parseBps(x / 100))
        )
      }),

      $TextField({
        label: 'Expiration',
        $input: $element('input')(
          attr({ type: 'date' }),
          stylePseudo('::-webkit-calendar-picker-indicator', { filter: theme.name === 'dark' ? `invert(1)` : '' })
        ),
        hint: 'set a date when this rule will expire, default is 1 year',
        placeholder: 'never',
        labelWidth: 100,
        value: map(time => {
          return new Date(Number(time * 1000n)).toISOString().slice(0, 10)
        }, expiry),
      })({
        change: inputEndDateTether(
          map(x => BigInt(new Date(x).getTime() / 1000))
        )
      }),

      $node(),

      $row(style({ placeContent: 'space-between', alignItems: 'center' }))(
        $ButtonSecondary({
          $content: $text('Unsubscribe'),
          disabled: now(!isSubscribed)
        })({
          click: clickUnsubscribeTether(
            snapshot(params => {
              return { previousSubscriptionExpiry: config.expiry, routeTypeKey: config.routeTypeKey, trader: config.trader, ...params, expiry: 0n,  }
            }, form)
          )
        }),

        $ButtonSecondary({
          $content: $text('Subscribe'),
          disabled: map(params => !params.allowance, form)
        })({
          click: clickSubmitTether(
            snapshot(subsc => {
              return { previousSubscriptionExpiry: config.expiry, routeTypeKey: config.routeTypeKey, trader: config.trader, ...subsc, subscribe: true,  }
            }, form)
          )
        })
          
      )
    ),

    {
      modifySubscribeList: mergeArray([
        clickSubmit,
        clickUnsubscribe
      ]),
    }
  ]
})

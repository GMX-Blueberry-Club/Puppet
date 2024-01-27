
import { Behavior, combineObject } from "@aelea/core"
import { $element, $node, $text, attr, component, style, stylePseudo } from "@aelea/dom"
import { $column, $row, layoutSheet } from "@aelea/ui-components"
import { colorAlpha, pallete } from "@aelea/ui-components-theme"
import { empty, map, mergeArray, now, snapshot, startWith } from "@most/core"
import { IntervalTime, formatFixed, parseBps, switchMap, unixTimestampNow } from "common-utils"
import { ISetRouteType } from "puppet-middleware-utils"
import * as viem from "viem"
import { theme } from "../../assignThemeSync.js"
import { $TextField } from "../../common/$TextField.js"
import { $route } from "../../common/$common"
import { IWalletPageParams } from "../../const/type"
import { getPuppetAllowance } from "../../logic/puppetLogic"
import { $ButtonSecondary } from "../form/$Button.js"
import { $Dropdown } from "../form/$Dropdown"

interface IRouteSubscriptionEditor {
  expiry: bigint
  tradeRoute: viem.Hex
  trader: viem.Address
  routeTypeKey: viem.Hex
  routeTypeList?: ISetRouteType[]
}

export interface IChangeSubscription {
  expiry: bigint
  allowance: bigint
  routeTypeKey: viem.Hex
  trader: viem.Address
  previousSubscriptionExpiry: bigint
}

export const $RouteSubscriptionEditor = (config: IRouteSubscriptionEditor & IWalletPageParams) => component((
  [inputEndDate, inputEndDateTether]: Behavior<any, bigint>,
  [inputAllowance, inputAllowanceTether]: Behavior<any, bigint>,
  [clickUnsubscribe, clickUnsubscribeTether]: Behavior<any, IChangeSubscription>,
  [clickSubmit, clickSubmitTether]: Behavior<any, IChangeSubscription>,
  [changeRouteTypeKey, changeRouteTypeKeyTether]: Behavior<any, viem.Hex>,
) => {

  const { trader, routeTypeList, tradeRoute, walletClientQuery } = config

  const allowance = mergeArray([
    switchMap(async walletQuery => {
      const wallet = await walletQuery
      if (wallet === null) {
        return ''
      }

      const amount = await getPuppetAllowance(wallet, wallet.account.address, config.tradeRoute)
      return amount || ''
    }, walletClientQuery),
    inputAllowance
  ])

  
  const expiry = mergeArray([
    now(config.expiry ? config.expiry : BigInt(unixTimestampNow() + IntervalTime.YEAR)),
    inputEndDate
  ])

  const routeTypeKey = startWith(config.routeTypeKey, changeRouteTypeKey)
  
  const form = combineObject({
    allowance,
    expiry,
    routeTypeKey
  })


  const isSubscribed = config.expiry !== 0n

  
  return [
    $column(layoutSheet.spacing, style({ maxWidth: '350px' }))(
      $text('The following rules will apply to this trader whenever he opens and maintain a position'),

      routeTypeList ? $Dropdown({
        $container: $row(style({ borderRadius: '30px', backgroundColor: pallete.background, padding: '4px 8px', position: 'relative', border: `1px solid ${colorAlpha(pallete.foreground, .2)}`, cursor: 'pointer' })),
        $selection: switchMap(key => {
          const match = routeTypeList.find(route => route.routeTypeKey === key)

          if (!match) {
            throw new Error(`Route type key ${key} not found`)
          }

          return $route(match)
        }, routeTypeKey),
        selector: {
          value: routeTypeKey,
          $$option: map(key => {
            const match = routeTypeList.find(route => route.routeTypeKey === key)!

            return $route(match)
          }),
          list: routeTypeList.map(route => route.routeTypeKey),
        }
      })({
        select: changeRouteTypeKeyTether()
      })
        : empty(),
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
              return { ...params, previousSubscriptionExpiry: config.expiry, trader: config.trader, expiry: 0n,  }
            }, form)
          )
        }),

        $ButtonSecondary({
          $content: $text('Subscribe'),
          disabled: map(params => !params.allowance, form)
        })({
          click: clickSubmitTether(
            snapshot(params => {
              return { ...params, previousSubscriptionExpiry: config.expiry, trader: config.trader,  }
            }, form)
          )
        })
          
      )
    ),

    {
      modifySubscriber: mergeArray([
        clickSubmit,
        clickUnsubscribe
      ]),
    }
  ]
})

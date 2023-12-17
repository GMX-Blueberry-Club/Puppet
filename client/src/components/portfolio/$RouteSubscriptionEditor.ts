
import { Behavior, combineObject } from "@aelea/core"
import { $element, $node, $text, attr, component, style, stylePseudo } from "@aelea/dom"
import { $column, $row, layoutSheet } from "@aelea/ui-components"
import { constant, map, mergeArray, snapshot, startWith, take } from "@most/core"
import { TIME_INTERVAL_MAP } from "gmx-middleware-const"
import { formatFixed, parseBps, unixTimestampNow } from "gmx-middleware-utils"
import { IPuppetSubscritpionParams } from "puppet-middleware-utils"
import { theme } from "../../assignThemeSync.js"
import { $TextField } from "../../common/$TextField.js"
import { $ButtonSecondary } from "../form/$Button.js"



interface IRouteSubscriptionEditor {
  routeSubscription?: IPuppetSubscritpionParams
  // marketList: Stream<IMarketCreatedEvent[]>
}

export const $RouteSubscriptionEditor = (config: IRouteSubscriptionEditor) => component((
  [inputEndDate, inputEndDateTether]: Behavior<any, bigint>,
  [inputAllowance, inputAllowanceTether]: Behavior<any, bigint>,
  [clickUnsubscribe, clickUnsubscribeTether]: Behavior<any, false>,
  [clickSubmit, clickSubmitTether]: Behavior<any>,

  // [switchIsLong, switchIsLongTether]: Behavior<boolean>,
  // [switchisMarketIndexToken, switchisMarketIndexTokenTether]: Behavior<boolean>,
) => {
  const { routeSubscription } = config


  // const collateralToken = replayLatest(switchIsLong, true)
  // const indexToken = replayLatest(switchIsLong, true)
  // const isLong = replayLatest(switchIsLong, true)
  // const isMarketIndexToken = replayLatest(switchisMarketIndexToken, true)

  // const market = mergeArray([
  //   selectMarket,
  //   map(params => {
  //     return params.marketList.find(mkt => mkt.routeTypeKey === config.routeSubscription?.routeTypeKey) || params.marketList[1]
  //   }, combineObject({ marketList, isLong }))
  // ])

  const allowance = startWith(config.routeSubscription?.allowance || 500n, inputAllowance)
  
  // const routeTypeKey = map(params => {
  //   const collateralToken = params.isMarketIndexToken ? params.market.indexToken : params.market.shortToken
  //   const routeTypeKeyData = hashData(['address'], [params.market.marketToken])
    
  //   return getRouteTypeKey(collateralToken, params.market.indexToken, params.isLong, routeTypeKeyData)
  // }, combineObject({ indexToken, isLong, collateralToken }))
  const initEnddate = config.routeSubscription?.subscriptionExpiry ? config.routeSubscription?.subscriptionExpiry : BigInt(unixTimestampNow() + TIME_INTERVAL_MAP.YEAR)
  const subscriptionExpiry = startWith(initEnddate, inputEndDate)
  
  const form = combineObject({
    allowance,
    subscriptionExpiry
  })


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
        value: take(1, map(x => formatFixed(x, 4) * 100, allowance)),
        labelWidth: 100,
        hint: `% allocated per position adjustment. Lower values decrease risk. Helps with easier management if peformance is below expectation`,
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
        }, subscriptionExpiry),
      })({
        change: inputEndDateTether(
          map(x => BigInt(new Date(x).getTime() / 1000))
        )
      }),


      $node(),

      $row(style({ placeContent: 'flex-end', alignItems: 'center' }))(
        
        routeSubscription?.subscribe
          ? $ButtonSecondary({
            $content: $text('Unsubscribe'),
          })({
            click: clickUnsubscribeTether()
          })
          : $ButtonSecondary({
            $content: $text('Subscribe'),
          })({
            click: clickSubmitTether()
          }),
      )
    
    ),

    {
      modifySubscribeList: mergeArray([
        snapshot(subsc => {
          return { ...routeSubscription, ...subsc, subscribe: true }
        }, form, clickSubmit),
        constant({ ...routeSubscription, subscribe: false }, clickUnsubscribe)
      ]),
    }
  ]
})

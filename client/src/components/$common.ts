import { style, $text, stylePseudo, NodeComposeFn, $Node } from "@aelea/dom"
import { $column, layoutSheet, $row } from "@aelea/ui-components"
import { pallete } from "@aelea/ui-components-theme"
import { IAttributeBackground, IAttributeBadge, IAttributeMappings, IBerryDisplayTupleMap, IToken, LAB_CHAIN, getBerryFromItems, getLabItemTupleIndex, tokenIdAttributeTuple } from "@gambitdao/gbc-middleware"
import { $defaultTableRowContainer, $defaultVScrollContainer, $infoLabeledValue, $spinner, $Table, $txHashRef, TableOption } from "@gambitdao/ui-components"
import { $card } from "../elements/$common"
import { $labItem } from "../logic/common"
import { $berry } from "./$DisplayBerry"

export const $berryTileId = (token: IToken, $container?: NodeComposeFn<$Node>) => $column(style({ position: 'relative' }))(
  $berryByToken(token, $container),
  $text(style({ textAlign: 'left', paddingLeft: '3px', paddingTop: '1px', color: '#fff', textShadow: '0px 0px 5px black', fontSize: '.55em', position: 'absolute', fontWeight: 'bold' }))(String(token.id))
)

export const $CardTable = <T, FilterState>(config: TableOption<T, FilterState>) => $Table({
  $container: $card(style({ padding: "0", gap: 0 })),
  scrollConfig: {
    $container: $defaultVScrollContainer(style({ gap: '1px' })),
    //         background: #171b1f;
    //     align-items: center;
    //     flex: 1;
    //     place-content: center;
    // }
    // constructed stylesheet
    // .•62 {
    //     display: flex;
    //     flex-direction: row-reverse;
    //     gap: 4px;
    //     font-size: 13.2px;
    //     padding: 16px 0px;
    //     margin: 0px 1px;
    $loader: style({ placeContent: 'center', borderRadius: '0 0 20px 20px', borderBottom: `1px solid ${pallete.background}`, margin: '0 1px', background: pallete.background, flexDirection: 'row-reverse', padding: '16px 0' })(
      $infoLabeledValue(
        'Loading',
        style({ margin: '' })(
          $spinner
        )
      )
    )
  },
  $bodyRowContainer: $defaultTableRowContainer(
    stylePseudo(':last-child', { borderRadius: '0 0 20px 20px' }),
    style({ background: pallete.background, margin: '0 1px', borderBottom: `1px solid ${pallete.horizon}` })
  ),
  ...config
})

export function $mintDet1ails(txHash: string, berriesAmount: number, ids: number[]) {

  return $column(layoutSheet.spacing)(
    $row(style({ placeContent: 'space-between' }))(
      $text(style({ color: pallete.positive }))(`Minted ${berriesAmount} ${IAttributeMappings[ids[0]]}`),
      $txHashRef(txHash, LAB_CHAIN)
    ),
    $row(style({ flexWrap: 'wrap' }))(...ids.map(tokenId => {
      return $labItem({
        id: tokenId
      })
    })),
  )
}


export const $berryByToken = (token: IToken, $container?: NodeComposeFn<$Node>) => {
  const display = getBerryFromItems(token.labItems.map(li => Number(li.id)))
  const tuple: Partial<IBerryDisplayTupleMap> = [...tokenIdAttributeTuple[token.id - 1]]

  return $berryByLabItems(token.id, display.background, display.custom, display.badge, $container, tuple)
}

export const $berryByLabItems = (
  berryId: number,
  backgroundId: IAttributeBackground,
  labItemId: IAttributeMappings,
  badgeId: IAttributeBadge,
  $container?: NodeComposeFn<$Node>,
  tuple: Partial<IBerryDisplayTupleMap> = [...tokenIdAttributeTuple[berryId - 1]]
) => {

  if (labItemId) {
    const customIdx = getLabItemTupleIndex(labItemId)

    tuple.splice(customIdx, 1, labItemId as any)
  }

  if (badgeId) {
    tuple.splice(6, 1, badgeId)
  }

  if (backgroundId) {
    tuple.splice(0, 1, backgroundId)
  }

  return $berry(tuple, $container)
}


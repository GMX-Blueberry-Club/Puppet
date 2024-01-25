import { style, stylePseudo } from "@aelea/dom"
import { $column } from "@aelea/ui-components"
import { colorAlpha, pallete } from "@aelea/ui-components-theme"
import { IAttributeBackground, IAttributeBadge, IAttributeMappings, IBerryDisplayTupleMap, IToken, getBerryFromItems, getLabItemTupleIndex, tokenIdAttributeTuple } from "@gambitdao/gbc-middleware"
import { $Table, $defaultTableCell, $defaultTableRowContainer, $defaultVScrollContainer, $infoLabeledValue, $spinner, TableOption } from "ui-components"
import { $berry } from "./$DisplayBerry.js"


export interface ICardTable<T> extends TableOption<T> {

}

export const $CardTable = <T>(config: TableOption<T>) => {
  return $Table({
    $container: $column(style({ borderTop: `1px solid ${colorAlpha(pallete.foreground, .2)}` })),
    $cell: $defaultTableCell(style({ padding: '18px 0' })),
    scrollConfig: {
      $container: $defaultVScrollContainer(style({ gap: '2px' })),
      $loader: style({ placeContent: 'center', margin: '0 1px', background: pallete.background, flexDirection: 'row-reverse', padding: '16px 0' })(
        $infoLabeledValue(
          'Loading',
          style({ margin: '' })(
            $spinner
          )
        )
      )
    },
    $headerContainer: $defaultTableRowContainer(style({ background: pallete.background, padding: '8px 18px' })),
    $rowContainer: $defaultTableRowContainer(
      stylePseudo(':last-child', { borderRadius: '0 0 18px 18px', marginBottom: '2px' }),
      style({ background: pallete.background, padding: '0 26px' })
    ),
    // $bodyRowContainer: $defaultTableRowContainer(
    //   style({ margin: '0 1px' })
    // ),
    ...config
  })
}

export const $berryByToken = (token: IToken) => {
  const display = getBerryFromItems(token.labItems.map(li => Number(li.id)))
  const tuple: Partial<IBerryDisplayTupleMap> = [...tokenIdAttributeTuple[token.id - 1]]

  return $berryByLabItems(token.id, display.background, display.custom, display.badge, tuple)
}

export const $berryByLabItems = (
  berryId: number,
  backgroundId: IAttributeBackground,
  labItemId: IAttributeMappings,
  badgeId: IAttributeBadge,
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

  return $berry(tuple)
}


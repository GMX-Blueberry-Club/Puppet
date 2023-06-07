import { $Node, NodeComposeFn, style, stylePseudo } from "@aelea/dom"
import { pallete } from "@aelea/ui-components-theme"
import { IAttributeBackground, IAttributeBadge, IAttributeMappings, IBerryDisplayTupleMap, IToken, getBerryFromItems, getLabItemTupleIndex, tokenIdAttributeTuple } from "@gambitdao/gbc-middleware"
import { $Table, $defaultTableRowContainer, $defaultVScrollContainer, $infoLabeledValue, $spinner, TableOption } from "gmx-middleware-ui-components"
import { $card } from "../elements/$common"
import { $berry } from "./$DisplayBerry"



export const $CardTable = <T, FilterState>(config: TableOption<T, FilterState>) => $Table({
  $container: $card(style({ padding: "0", gap: 0 })),
  scrollConfig: {
    $container: $defaultVScrollContainer(style({ gap: '1px' })),
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


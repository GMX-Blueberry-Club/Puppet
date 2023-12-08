import { style } from "@aelea/dom"
import { pallete } from "@aelea/ui-components-theme"
import { IAttributeBackground, IAttributeBadge, IAttributeMappings, IBerryDisplayTupleMap, IToken, getBerryFromItems, getLabItemTupleIndex, tokenIdAttributeTuple } from "@gambitdao/gbc-middleware"
import { $Table, $defaultVScrollContainer, $infoLabeledValue, $spinner, TableOption } from "gmx-middleware-ui-components"
import { $card } from "../common/elements/$common.js"
import { $berry } from "./$DisplayBerry.js"


export const $CardTable = <T>(config: TableOption<T>) => {
  return $Table({
    $container: $card(style({ padding: "12px", gap: 0, borderRadius: '0' })),
    scrollConfig: {
      $container: $defaultVScrollContainer(style({ gap: '4px' })),
      $loader: style({ placeContent: 'center', margin: '0 1px', background: pallete.background, flexDirection: 'row-reverse', padding: '16px 0' })(
        $infoLabeledValue(
          'Loading',
          style({ margin: '' })(
            $spinner
          )
        )
      )
    },
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



import { Behavior } from '@aelea/core'
import { $Branch, $Node, $custom, $text, IBranch, NodeComposeFn, component, style } from '@aelea/dom'
import { $column, layoutSheet, observer } from "@aelea/ui-components"
import { pallete } from "@aelea/ui-components-theme"
import { filter, join, map, mergeArray, multicast, now, snapshot, startWith, until } from "@most/core"
import { Stream } from '@most/types'


export type ScrollRequest = number

export type IScrollPagable = {
  $items: $Branch[]
  pageSize: number
  offset: number
}


export interface QuantumScroll {
  scrollIndex?: Stream<number>
  insertAscending?: boolean
  dataSource: Stream<IScrollPagable | $Branch[]>
  $container?: NodeComposeFn<$Node>
  $loader?: $Node
  $emptyMessage?: $Node
}


export const $defaultVScrollLoader = $text(style({ color: pallete.foreground, padding: '3px 10px' }))('loading...')
export const $defaultVScrollContainer = $column(layoutSheet.spacing)
const $defaultEmptyMessage = $column(layoutSheet.spacing, style({ padding: '20px' }))(
  $text('No items to display')
)


export const $QuantumScroll = ({
  dataSource,
  $container = $defaultVScrollContainer,
  $emptyMessage = $defaultEmptyMessage,
  $loader = $defaultVScrollLoader,
  insertAscending = false,
  scrollIndex = now(0)
}: QuantumScroll) => component((
  [intersecting, intersectingTether]: Behavior<IBranch, IntersectionObserverEntry>,
) => {


  const intersectedLoader = intersectingTether(
    observer.intersection({ threshold: 1 }),
    map(entryList => entryList[0]),
    filter(entry => {
      return entry.isIntersecting === true
    }),
  )

  const $observerloader = $custom('observer')(intersectedLoader)(
    $loader
  )

  const dataLoadingMc = multicast(dataSource)

  const $itemLoader = snapshot((sidx, nextResponse) => {
    const itemCount = Array.isArray(nextResponse) ? nextResponse.length : nextResponse.$items.length

    if (Array.isArray(nextResponse)) {
      return mergeArray(nextResponse)
    }

    if (itemCount === 0) {
      return $emptyMessage
    }

    const hasMoreItems = nextResponse.pageSize === itemCount

    const $items = hasMoreItems
      ? [...nextResponse.$items, until(dataLoadingMc, $observerloader )]
      : nextResponse.$items


    return mergeArray($items)
  }, scrollIndex, dataLoadingMc)


  return [
    $container(
      map(node => ({ ...node, insertAscending })),
    )(
      join($itemLoader),
    ),

    {
      scrollIndex: startWith(0, snapshot(index => index + 1, scrollIndex, intersecting))
    }
  ]
})
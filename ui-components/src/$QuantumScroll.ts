
import { Behavior, combineObject } from '@aelea/core'
import { $Branch, $custom, $Node, $text, component, IBranch, NodeComposeFn, style } from '@aelea/dom'
import { $column, layoutSheet, observer } from "@aelea/ui-components"
import { pallete } from "@aelea/ui-components-theme"
import { filterNull, switchMap, zipState } from "gmx-middleware-utils"
import { constant, continueWith, empty, filter, join, loop, map, mergeArray, multicast, now, scan, snapshot, switchLatest, until } from "@most/core"
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


  const $itemLoader = multicast(map((state) => {
    const itemCount = Array.isArray(state.dataSource) ? state.dataSource.length : state.dataSource.$items.length

    if (Array.isArray(state.dataSource)) {
      return mergeArray(state.dataSource)
    }

    if (state.scrollIndex === 0 && itemCount === 0) {
      return $emptyMessage
    }

    const hasMoreItems = state.dataSource.pageSize === itemCount

    const $items = hasMoreItems
      ? [...state.dataSource.$items, $observerloader]
      : state.dataSource.$items


    return mergeArray($items)
  }, zipState({ dataSource, scrollIndex })))

  return [
    $container(
      map(node => ({ ...node, insertAscending })),
    )(
      switchLatest(
        mergeArray([
          constant(empty(), $itemLoader),
          constant($loader, scrollIndex),
        ])
      ),
      join($itemLoader)
    ),

    {
      scrollIndex: snapshot(index => index + 1, scrollIndex, intersecting)
    }
  ]
})
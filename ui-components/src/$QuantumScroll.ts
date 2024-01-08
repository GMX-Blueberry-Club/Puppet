
import { Behavior } from '@aelea/core'
import { $Branch, $Node, $custom, $text, NodeComposeFn, component, style } from '@aelea/dom'
import { $column, layoutSheet, observer } from "@aelea/ui-components"
import { pallete } from "@aelea/ui-components-theme"
import { constant, empty, filter, join, map, mergeArray, until } from "@most/core"
import { Stream } from '@most/types'


export type ScrollRequest = {
  pageSize: number
  offset: number
}

export type IScrollPagable = ScrollRequest & {
  $items: $Branch[]
}


export interface QuantumScroll {
  // scrollRequest?: Stream<ScrollRequest>
  insertAscending?: boolean
  dataSource: Stream<IScrollPagable>
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
  // scrollRequest = empty()
}: QuantumScroll) => component((
  [nextScrollRequest, nextScrollRequestTether]: Behavior<any, ScrollRequest>,
) => {


  const $itemLoader = map(nextResponse => {

    if (Array.isArray(nextResponse)) {
      if (nextResponse.length === 0) {
        return $emptyMessage
      }

      return mergeArray(nextResponse)
    }

    const hasMoreItems = nextResponse.pageSize === nextResponse.$items.length


    const $observerloader = $custom('observer')(
      nextScrollRequestTether(
        observer.intersection({ threshold: 1 }),
        filter(([entry]) => {
          return entry.isIntersecting === true
        }),
        constant({ offset: nextResponse.offset + nextResponse.pageSize, pageSize: nextResponse.pageSize })
      )
    )(
      $loader
    )

    const $items = hasMoreItems
      ? [...nextResponse.$items, until(nextScrollRequest, $observerloader)]
      : nextResponse.$items


    return mergeArray($items)
  }, dataSource)


  return [
    $container(
      map(node => ({ ...node, insertAscending })),
    )(
      join(mergeArray([
        // constant(scrollRequest),
        $itemLoader
      ])),
    ),

    {
      scrollRequest: nextScrollRequest
    }
  ]
})
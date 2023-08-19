import { Behavior, combineObject, O, Op } from "@aelea/core"
import { $element, $node, $Node, $svg, attr, component, INode, NodeComposeFn, nodeEvent, style } from '@aelea/dom'
import { $column, $icon, $row, layoutSheet, screenUtils } from "@aelea/ui-components"
import { colorAlpha, pallete } from "@aelea/ui-components-theme"
import { constant, empty, map, now, snapshot, switchLatest } from "@most/core"
import { Stream } from "@most/types"
import { $QuantumScroll, IScrollPagable, QuantumScroll, ScrollRequest } from "./$QuantumScroll.js"



export type TablePageResponse<T> = T[] | Omit<IScrollPagable, '$items'> & { page: T[] }

export interface TableOption<T, FilterState> {

  columns: TableColumn<T>[]
  gridTemplateColumns?: string
  dataSource: Stream<TablePageResponse<T>>

  $between?: $Node
  scrollConfig?: Omit<QuantumScroll, 'dataSource'>

  $container?: NodeComposeFn<$Node>
  $rowContainer?: NodeComposeFn<$Node>
  $headerRowContainer?: NodeComposeFn<$Node>
  $bodyRowContainer?: NodeComposeFn<$Node>

  $cell?: NodeComposeFn<$Node>
  $bodyCell?: NodeComposeFn<$Node>
  $headerCell?: NodeComposeFn<$Node>

  sortBy?: Stream<ISortBy<T> | null>
  filter?: Stream<FilterState | null>
  $sortArrowDown?: $Node
}

export interface TableColumn<T> {
  $head: $Node
  $$body: Op<T, $Node>
  sortBy?: keyof T,

  gridTemplate?: string

  columnOp?: Op<INode, INode>
}

export interface IPageRequest {
  page: ScrollRequest,
  pageSize: number
}

export interface ISortBy<T> {
  direction: 'asc' | 'desc'
  selector: keyof T
}


const $caretDown = $svg('path')(attr({ d: 'M4.616.296c.71.32 1.326.844 2.038 1.163L13.48 4.52a6.105 6.105 0 005.005 0l6.825-3.061c.71-.32 1.328-.84 2.038-1.162l.125-.053A3.308 3.308 0 0128.715 0a3.19 3.19 0 012.296.976c.66.652.989 1.427.989 2.333 0 .906-.33 1.681-.986 2.333L18.498 18.344a3.467 3.467 0 01-1.14.765c-.444.188-.891.291-1.345.314a3.456 3.456 0 01-1.31-.177 2.263 2.263 0 01-1.038-.695L.95 5.64A3.22 3.22 0 010 3.309C0 2.403.317 1.628.95.98c.317-.324.68-.568 1.088-.732a3.308 3.308 0 011.24-.244 3.19 3.19 0 011.338.293z' }))()

export const $defaultTableCell = $row(
  layoutSheet.spacingSmall,
  style({ padding: '6px 0', minWidth: 0, alignItems: 'center', overflowWrap: 'break-word' }),
)

export const $defaultTableHeaderCell = $defaultTableCell(
  style({  alignItems: 'center', color: pallete.foreground, })
)
export const $defaultTableRowContainer = $row(style({ display: 'grid' }), screenUtils.isDesktopScreen ? layoutSheet.spacing : layoutSheet.spacingSmall)



export const $defaultTableContainer = $column(layoutSheet.spacingSmall)

export const $Table = <T, FilterState = never>({
  dataSource, columns, scrollConfig,

  $container = $defaultTableContainer,
  $rowContainer = $defaultTableRowContainer,
  $headerRowContainer = $rowContainer,
  $bodyRowContainer = $rowContainer,
  $cell = $defaultTableCell,
  $bodyCell = $cell,
  $headerCell = $defaultTableHeaderCell,

  sortBy = now(null),
  $between = empty(),
  $sortArrowDown = $caretDown
}: TableOption<T, FilterState>) => component((
  [scrollRequest, scrollRequestTether]: Behavior<ScrollRequest, ScrollRequest>,
  [sortByChange, sortByChangeTether]: Behavior<INode, keyof T>
) => {

  const gridTemplateColumns = columns.map(col => col.gridTemplate || '1fr').join(' ')

  const $header = $headerRowContainer(
    style({ gridTemplateColumns })
  )(
    ...columns.map(col => {

      if (col.sortBy) {
        const behavior = sortByChangeTether(
          nodeEvent('click'),
          constant(col.sortBy)
        )

        return $headerCell(col.columnOp || O(), behavior)(
          style({ cursor: 'pointer' }, col.$head),
          switchLatest(map(param => {
            if (param === null) {
              return empty()
            }

            return $column(
              $icon({
                $content: $sortArrowDown, 
                svgOps: style({ transform: 'rotate(180deg)' }), width: '8px', viewBox: '0 0 32 19.43',
                fill: param.selector === col.sortBy && param.direction === 'desc' ? '' : colorAlpha(pallete.message, 0.3)
              }),
              $icon({ 
                $content: $sortArrowDown,
                fill: param.selector === col.sortBy && param.direction === 'asc' ? '' : colorAlpha(pallete.message, 0.3),
                width: '8px', viewBox: '0 0 32 19.43' })
            )
          }, sortBy))
        )
      }

      const $headCell = $headerCell(col.columnOp || O())(
        col.$head
      )

      return $headCell
    })
  )


  const $body = $QuantumScroll({
    ...scrollConfig,
    dataSource: map((res) => {
      const $items = (Array.isArray(res) ? res : res.page).map(rowData => {

        return $bodyRowContainer(
          style({ gridTemplateColumns, })
        )(
          ...columns.map(col => {
            return $bodyCell(col.columnOp || O())(
              switchLatest(col.$$body(now(rowData)))
            )
          })
        )
      })

      if (Array.isArray(res)) {
        return $items
      } else {
        return {
          $items,
          offset: res.offset,
          pageSize: res.pageSize
        }
      }

    }, dataSource)
  })({
    scrollRequest: scrollRequestTether()
  })

  return [
    $container(
      $header,
      $between,
      $body,
    ),

    {
      scrollRequest,
      sortBy: snapshot((state, selector) => {
        if (state === null) {
          return state
        }

        if (state.selector === selector) {
          const direction = state.direction === 'asc' ? 'desc' : 'asc'

          return { direction, selector }
        }



        return { direction: state.direction, selector }
      }, sortBy, sortByChange),
    }
  ]

})

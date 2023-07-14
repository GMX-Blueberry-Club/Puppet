import { Behavior, O } from "@aelea/core"
import { $node, $text, INode, attrBehavior, component, nodeEvent, style } from "@aelea/dom"
import { $column, layoutSheet } from "@aelea/ui-components"
import { awaitPromises, fromPromise, map, now, take } from "@most/core"
import { $caretDown } from "gmx-middleware-ui-components"
import { switchMap } from "gmx-middleware-utils"
import { $CardTable } from "../components/$common"
import { $iconCircular } from "../elements/$common"
import * as indexDb from "../utils/storage/indexDB"
import { $buttonAnchor } from "../components/form/$Button"
import { gmxLog } from "../data/scope"
import { Stream } from "@most/types"


export const $Admin = component((
  [hoverDownloadBtn, hoverDownloadBtnTether]: Behavior<INode, { href: string, download: string }>,
) => {

  const $title = $text(style({ fontWeight: 'bold', fontSize: '1.55em' }))

  const logList = now(Object.values(gmxLog))

  


  return [
    $column(layoutSheet.spacing, style({ alignSelf: 'center' }))(
      $text(style({ fontSize: '3em', textAlign: 'center' }))('Admin Tools'),
      $node(),
      $CardTable({
        dataSource: logList,
        columns: [
          {
            $head: $text('Name'),
            $$body: map(scope => {
              return $text(scope.eventName)
            })
          },
          {
            columnOp: style({  placeContent: 'center' }),
            $head: $text('Size'),
            $$body: map(log => {

              const newLocal = map(String, indexDb.read(log.scope, store => store.count()))
              return $text(
                newLocal
              )
                
            })
          },
          {
            columnOp: style({ placeContent: 'center' }),
            $head: $text('Block Range'),
            $$body: map(log => {

              const fst = indexDb.cursor(log.scope, null, 'next')
              const lst = indexDb.cursor(log.scope, null, 'prev')
              return $column(
                $text(map(cursor => {
                  if (cursor === null) {
                    return '-'
                  }

                  return cursor ? String(cursor.value.blockNumber) : ''
                }, fst)),
                $text(map(cursor => {
                  if (cursor === null) {
                    return '-'
                  }

                  return cursor ? String(cursor.value.blockNumber) : ''
                }, lst))
              )
            })
          },
          {
            columnOp: style({  placeContent: 'center' }),
            $head: $text('DB File'),
            $$body: map(log => {
              const hoverB = hoverDownloadBtnTether(
                nodeEvent('pointerenter'),
                switchMap(() => downloadUrl(log.scope)),
                map(href => {

                  return { href, download: `DB-${log.eventName}.json` }
                }),
                take(1),
              )

              const attrB = attrBehavior(map(attrs => attrs, hoverDownloadBtn))

              return $buttonAnchor(hoverB, attrB)(
                $iconCircular($caretDown)
              )
                
            })
          },
        ]
      })({}),


    ),

    {
      
    }
  ]
})


function downloadUrl<TName extends string, TOptions extends indexDb.IDbStoreConfig>(
  params: indexDb.IDbParams<TName, TOptions>,
): Stream<string> {
  const openCursor = indexDb.read(params, store => store.getAll())

  return map(data => {
    const jsonContent = JSON.stringify(data, null)
    const blob = new Blob([jsonContent], { type: 'text/json' })
    const url = URL.createObjectURL(blob)
    return url
  }, openCursor)

}

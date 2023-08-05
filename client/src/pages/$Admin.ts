import { Behavior, combineObject, replayLatest } from "@aelea/core"
import { $node, $text, INode, attrBehavior, component, nodeEvent, style } from "@aelea/dom"
import { $TextField, $column, $row, layoutSheet } from "@aelea/ui-components"
import { fromPromise, map, mergeArray, multicast, now, snapshot, switchLatest, take } from "@most/core"
import { Stream } from "@most/types"
import { $caretDown, $infoLabeledValue } from "gmx-middleware-ui-components"
import { readableFileSize, switchMap } from "gmx-middleware-utils"
import { $CardTable } from "../components/$common"
import { $ButtonPrimary, $buttonAnchor, defaultMiniButtonStyle } from "../components/form/$Button"
import { gmxProcess } from "../data/process/process"
import { gmxLog } from "../data/scope"
import { $card, $iconCircular } from "../elements/$common"
import { syncProcess } from "../utils/indexer/processor"
import * as indexDb from "../utils/storage/indexDB"
import { blockChange, publicClient } from "../wallet/walletLink"
import { $seperator2 } from "./common"
import { jsonStringify } from "../utils/storage/storeScope"


export const $Admin = component((
  [hoverDownloadBtn, hoverDownloadBtnTether]: Behavior<INode, { href: string, download: string }>,
  [changeStartBlock, changeStartBlockTether]: Behavior<string, bigint>,
  [clickSyncProcess, clickSyncProcessTether]: Behavior<PointerEvent>,
) => {

  const $title = $text(style({ fontWeight: 'bold', fontSize: '1.55em' }))

  const logList = now(Object.values(gmxLog))

  const changedSyncedProcess = switchLatest(snapshot((params) => {
    return syncProcess({ ...gmxProcess, endBlock: params.changeStartBlock, publicClient: params.publicClient })
  }, combineObject({ changeStartBlock, publicClient }), clickSyncProcess))

  const processState = replayLatest(multicast(mergeArray([
    take(1, gmxProcess.state),
    changedSyncedProcess
  ])))

  // const createGmxTradingProcess = processSeed({
  //   ...gmxTradingProcess,
  //   endBlock
  // })

  


  return [
    $column(layoutSheet.spacing, style({ alignSelf: 'center' }))(
      $text(style({ fontSize: '3em', textAlign: 'center' }))('Admin Tools'),


      $card(
        $column(layoutSheet.spacing)(
          $column(layoutSheet.spacing)(

            $row(layoutSheet.spacing)(
              $text('Stored Processed State'),
              $buttonAnchor(
                defaultMiniButtonStyle, 
                hoverDownloadBtnTether(
                  nodeEvent('pointerover'),
                  switchMap(() => map(blob => URL.createObjectURL(blob), jsonBlob(gmxProcess.state))),
                  map(href => {
                    return { href, download: `${gmxProcess.scopeKey}.json` }
                  }),
                ),
                attrBehavior(map(attrs => attrs, hoverDownloadBtn))
              )($text('Download File')),
            ),
            

             
            $row(layoutSheet.spacing, style({ placeContent:'space-between' }))(
              $infoLabeledValue('Synced', $text(map(s => `${s.startBlock}-${s.blockNumber}`, processState))),
            ),

            $row(layoutSheet.spacing, style({ placeContent:'space-between' }))(
              $infoLabeledValue('size', $text(map(blob => readableFileSize(blob.size), jsonBlob(processState)))),
            ),

            $row(layoutSheet.spacing, style({ placeContent:'space-between' }))(
              $infoLabeledValue('checksum', $text(switchMap(blob => fromPromise(getBlobHash(blob)), jsonBlob(processState)))),
            ),

          ),

          $seperator2,

          $text('Change Process State'),

          switchMap(state => {
            return $row(layoutSheet.spacing)(
              $infoLabeledValue('Synced', $text(String(state.startBlock))),
              $TextField({ 
                value: now(String(state.blockNumber)),
                label: 'End',
                validation: map(s => state.startBlock >= Number(s) ? 'Invalid End block' : null),
              })({
                change: changeStartBlockTether(map(BigInt))
              }),
            )
          }, processState),
          $row(layoutSheet.spacing)(
          ),


          $row(style({ placeContent:'space-between' }))(
            $infoLabeledValue('Latest', $text(map(s => String(s), blockChange))),


            $row(layoutSheet.spacing)(

              $ButtonPrimary({
                $content: $text('Sync'),
              })({
                click: clickSyncProcessTether()
              })
            )
          )
            
        )
      ),

      $node(),
      $node(),

      $text(style({ paddingLeft: '20px', fontSize: '1.15em' }))('Event log sources'),
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
                nodeEvent('pointerover'),
                switchMap(() => {
                  return map(blob => URL.createObjectURL(blob), jsonBlob(gmxProcess.seed))
                }),
                map(href => {
                  return { href, download: `DB-${log.eventName}.json` }
                }),
              )

              const attrB = attrBehavior(map(attrs => attrs, hoverDownloadBtn))

              return $buttonAnchor(hoverB, attrB)(
                $iconCircular($caretDown)
              )
                
            })
          },
        ]
      })({}),

      $node(),

    ),

    {
      
    }
  ]
})


function jsonBlob<TData>(data: Stream<TData>): Stream<Blob> {
  return map(res => {
    const jsonContent = jsonStringify(res)
    const blob = new Blob([jsonContent], { type: "application/json" })
    
    return blob
  }, data)
}

function arrayBufferToBase64(buffer: ArrayBuffer) {
  let binary = ''
  const bytes = new Uint8Array(buffer)
  const len = bytes.byteLength
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return window.btoa(binary)
}

async function getBlobHash(blob: Blob) {
  const data = await blob.arrayBuffer()
  const hash = await window.crypto.subtle.digest('SHA-256', data)
  const hashBase64 = arrayBufferToBase64(hash)
  return 'sha256-' + hashBase64
}

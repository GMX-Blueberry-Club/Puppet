import { Behavior, combineObject } from "@aelea/core"
import { $node, $text, INode, attrBehavior, component, nodeEvent, style } from "@aelea/dom"
import { $column, $row, layoutSheet } from "@aelea/ui-components"
import { awaitPromises, fromPromise, map, mergeArray, now, recoverWith, sample, snapshot } from "@most/core"
import { Stream } from "@most/types"
import { $Table, $alertContainer, $caretDown, $infoLabeledValue } from "gmx-middleware-ui-components"
import { readableFileSize, readableNumber, readableUnitAmount, switchMap } from "gmx-middleware-utils"
import { $heading1, $heading3 } from "../common/$text.js"
import { $ButtonPrimary, $buttonAnchor, defaultMiniButtonStyle } from "../components/form/$Button.js"
import { gmxProcess, seedFile } from "../data/process/process.js"
import { gmxLog } from "../data/scope/index.js"
import { $card, $iconCircular } from "../common/elements/$common.js"
import { IProcessedStore, getBlobHash, syncProcess } from "../utils/indexer/processor.js"
import * as indexDb from "../utils/storage/indexDB.js"
import { jsonStringify } from "../utils/storage/storeScope.js"
import { blockChange, publicClient } from "../wallet/walletLink.js"
import { $seperator2 } from "./common.js"


export const $Admin = component((
  [hoverDownloadBtn, hoverDownloadBtnTether]: Behavior<INode, { href: string, download: string }>,
  [syncBlockNumber, syncBlockNumberTether]: Behavior<PointerEvent, bigint>,
) => {

  const logList = now(Object.values(gmxLog))


  const syncRuntimeSeed = switchMap(params => {
    return syncProcess({ ...gmxProcess, publicClient: params.publicClient, syncBlock: params.syncBlockNumber })
  }, combineObject({ publicClient, seed: gmxProcess.seed, syncBlockNumber }))

  const processState = mergeArray([
    gmxProcess.seed,
    syncRuntimeSeed
  ])


  return [
    $column(layoutSheet.spacing, style({ alignSelf: 'center' }))(
      $heading1('Dev Tools'),


      $card(
        $column(layoutSheet.spacing)(
          $ProcessDetails({ seed: now(gmxProcess.blueprint), title: 'Blueprint' })({}),

          $node(),
          $seperator2,
          $node(),


          $ProcessDetails({ seed: seedFile, title: 'Processed File' })({}),

          
          $node(),
          $seperator2,
          $node(),

          $ProcessDetails({ seed: processState, title: 'Runtime' })({}),

          $node(),
          $seperator2,
          $node(),
          $row(style({ placeContent:'space-between' }))(
            $infoLabeledValue('Latest Block', $text(map(s => String(s), blockChange))),


            $row(layoutSheet.spacing)(

              $ButtonPrimary({
                $content: $text('Sync Runtime'),
              })({
                click: syncBlockNumberTether(sample(blockChange))
              })
            )
          )
            
        )
      ),

      $node(),
      $node(),


      $heading1('Event log sources'),

      $card(
        $Table({
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
                const logCount = indexDb.read(log.scope, store => store.count())

                return $text(
                  map(String, map(readableUnitAmount, logCount))
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
        })({})
      ),

      $node(),

    ),

    {
      
    }
  ]
})


interface IProcessDetails<T> {
  title: string
  seed: Stream<Omit<IProcessedStore<T>, 'orderId' | 'blockNumber'>>
}


export const $ProcessDetails = <T>(config: IProcessDetails<T>) => component((
  [hoverDownloadBtn, hoverDownloadBtnTether]: Behavior<INode, { href: string, download: string }>,
) => {

  const $errorRecoverMsg = recoverWith(err => {
    return $alertContainer(
      $heading3(config.title),
      $text(err.message)
    )
  })

  return [
    $errorRecoverMsg(
      switchMap(seed => {

        const blob = getJsonBlob(seed)

        return $column(layoutSheet.spacing)(

          $row(layoutSheet.spacing, style({ alignItems: 'center' }))(
            $text(config.title),
            $buttonAnchor(
              defaultMiniButtonStyle, 
              hoverDownloadBtnTether(
                nodeEvent('pointerover'),
                map(async () => {

                  return {
                    href: URL.createObjectURL(blob),
                    hash: await getBlobHash(blob)
                  }
                }),
                awaitPromises,
                map(params => {
                  return { href: params.href, download: `${params.hash}.json` }
                }),
              ),
              attrBehavior(map(attrs => attrs, hoverDownloadBtn))
            )($text('Download'))
          ),
             
          $row(layoutSheet.spacing, style({ placeContent:'space-between' }))(
            $infoLabeledValue('Chain', $text(`${seed.config.chainId}`)),
          ),

          $row(layoutSheet.spacing, style({ placeContent:'space-between' }))(
            $infoLabeledValue('Block Range', $text(`${seed.config.startBlock}-${seed.config.endBlock}`)),
          ),

          $row(layoutSheet.spacing, style({ placeContent:'space-between' }))(
            $infoLabeledValue('size', $text(readableFileSize(blob.size))),
          ),

          $row(layoutSheet.spacing, style({ placeContent:'space-between' }))(
            $infoLabeledValue('checksum', $text(fromPromise(getBlobHash(blob)))),
          ),

        )
      }, config.seed)
    )

  ]
})


function getJsonBlob<TData>(data: TData): Blob {
  const jsonContent = jsonStringify(data)
  const blob = new Blob([jsonContent], { type: "application/json" })
    
  return blob
}

function jsonBlob<TData>(data: Stream<TData>): Stream<Blob> {
  return map(getJsonBlob, data)
}


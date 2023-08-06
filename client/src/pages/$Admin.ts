import { Behavior, combineObject, replayLatest } from "@aelea/core"
import { $node, $text, INode, attrBehavior, component, nodeEvent, style } from "@aelea/dom"
import { $TextField, $column, $row, layoutSheet } from "@aelea/ui-components"
import { awaitPromises, fromPromise, map, mergeArray, multicast, now, snapshot, switchLatest, take } from "@most/core"
import { Stream } from "@most/types"
import { $Table, $caretDown, $infoLabeledValue } from "gmx-middleware-ui-components"
import { readableFileSize, switchMap } from "gmx-middleware-utils"
import { $CardTable } from "../components/$common"
import { $ButtonPrimary, $buttonAnchor, defaultMiniButtonStyle } from "../components/form/$Button"
import { gmxProcess, seedFile } from "../data/process/process"
import { gmxLog } from "../data/scope"
import { $card, $iconCircular } from "../elements/$common"
import { IProcessedStore, getBlobHash, syncProcess } from "../utils/indexer/processor"
import * as indexDb from "../utils/storage/indexDB"
import { blockChange, publicClient } from "../wallet/walletLink"
import { $seperator2 } from "./common"
import { jsonStringify } from "../utils/storage/storeScope"
import { $heading1 } from "../common/$text"


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
    take(1, gmxProcess.seed),
    changedSyncedProcess
  ])))

  // const createGmxTradingProcess = processSeed({
  //   ...gmxTradingProcess,
  //   endBlock
  // })

  


  return [
    $column(layoutSheet.spacing, style({ alignSelf: 'center' }))(
      $heading1('Dev Tools'),


      $card(
        $column(layoutSheet.spacing)(


          $ProcessDetails({ seed: gmxProcess.blueprint, title: 'Blueprint' })({}),
          
          $node(),
          $seperator2,
          $node(),
          switchMap(seed => {

            return $ProcessDetails({ seed, title: 'Seed file' })({})
          }, seedFile),

          $node(),
          $seperator2,
          $node(),

          switchMap(seed => {
            return $ProcessDetails({ seed, title: 'Runtime Seed' })({})
          }, gmxProcess.seed),
          $row(layoutSheet.spacing)(
          ),

          $node(),
          $seperator2,
          $node(),
          $row(style({ placeContent:'space-between' }))(
            $infoLabeledValue('Latest', $text(map(s => String(s), blockChange))),


            $row(layoutSheet.spacing)(

              $buttonAnchor(
                defaultMiniButtonStyle, 
                hoverDownloadBtnTether(
                  nodeEvent('pointerover'),
                  switchMap(() => map(async blob => {

                    return {
                      href: URL.createObjectURL(blob),
                      hash: await getBlobHash(blob)
                    }
                  }, jsonBlob(gmxProcess.seed))),
                  awaitPromises,
                  map(params => {
                    return { href: params.href, download: `${params.hash}.json` }
                  }),
                ),
                attrBehavior(map(attrs => attrs, hoverDownloadBtn))
              )($text('Download File')),

              $ButtonPrimary({
                $content: $text('Sync Latest'),
              })({
                click: clickSyncProcessTether()
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
  seed: IProcessedStore<T>
}


export const $ProcessDetails = <T>(config: IProcessDetails<T>) => component((
  [hoverDownloadBtn, hoverDownloadBtnTether]: Behavior<INode, { href: string, download: string }>,
) => {
  const seed = config.seed
  const blob = getJsonBlob(config.seed)


  return [
    $column(layoutSheet.spacing)(

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
        $infoLabeledValue('Chain', $text(`${seed.chainId}`)),
      ),

      $row(layoutSheet.spacing, style({ placeContent:'space-between' }))(
        $infoLabeledValue('Block Range', $text(`${seed.startBlock}-${seed.endBlock}`)),
      ),

      $row(layoutSheet.spacing, style({ placeContent:'space-between' }))(
        $infoLabeledValue('size', $text(readableFileSize(blob.size))),
      ),

      $row(layoutSheet.spacing, style({ placeContent:'space-between' }))(
        $infoLabeledValue('checksum', $text(fromPromise(getBlobHash(blob)))),
      ),

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


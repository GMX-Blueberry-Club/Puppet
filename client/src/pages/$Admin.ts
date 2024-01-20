// import { Behavior, combineObject } from "@aelea/core"
// import { $node, $text, INode, attrBehavior, component, nodeEvent, style } from "@aelea/dom"
// import { $column, $row, layoutSheet } from "@aelea/ui-components"
// import { awaitPromises, empty, fromPromise, map, mergeArray, now, recoverWith, sample, snapshot } from "@most/core"
// import { Stream } from "@most/types"
// import { $Table, $alertContainer, $caretDown, $infoLabeledValue } from "ui-components"
// import { readableFileSize, readableNumber, readableUnitAmount, switchMap } from "gmx-middleware-utils"
// import { $heading1, $heading2, $heading3 } from "../common/$text.js"
// import { $ButtonPrimary, $buttonAnchor, defaultMiniButtonStyle } from "../components/form/$Button.js"
// import { gmxProcess } from "../data/process/process.js"
// import { gmxLog } from "../data/scope/index.js"
// import { $card, $iconCircular, $labeledDivider } from "../common/elements/$common.js"
// import { IProcessedStore, syncProcess, validateConfig } from "../utils/indexer/processor.js"
// import * as indexDb from "../utils/storage/indexDB.js"
// import { jsonStringify } from "../utils/storage/storeScope.js"
// import { blockChange, publicClient } from "../wallet/walletLink.js"
// import { $seperator2 } from "./common.js"


// export const $Admin = component((
//   [hoverDownloadBtn, hoverDownloadBtnTether]: Behavior<INode, { href: string, download: string }>,
//   [syncBlockNumber, syncBlockNumberTether]: Behavior<PointerEvent, bigint>,
// ) => {

//   const logList = now(Object.values(gmxLog))


//   const syncRuntimeSeed = switchMap(params => {
//     return syncProcess({ ...gmxProcess, publicClient: params.publicClient, syncBlock: params.syncBlockNumber }, params.store)
//   }, combineObject({ publicClient, store: gmxProcess.store, syncBlockNumber }))

//   const processState = mergeArray([
//     gmxProcess.store,
//     syncRuntimeSeed
//   ])


//   return [
//     $column(layoutSheet.spacing, style({ alignSelf: 'center' }))(
//       $heading1('Dev Tools'),


//       $card(
//         $column(layoutSheet.spacing)(
//           $ProcessDetails({ seed: now(gmxProcess.blueprint), title: 'Blueprint' })({}),
          
//           $node(),
//           $seperator2,
//           $node(),

//           $ProcessDetails({ seed: processState, title: 'Runtime' })({}),

//           $node(),
 
//           $row(style({ placeContent:'space-between' }))(
//             $infoLabeledValue('Latest Block', $text(map(s => String(s), blockChange))),

//             $row(layoutSheet.spacing)(

//               $ButtonPrimary({
//                 $content: $text('Sync Runtime'),
//               })({
//                 click: syncBlockNumberTether(sample(blockChange))
//               })
//             )
//           ),

//           $node(),
//           $labeledDivider('Dev Processed File'),
//           $node(),

//           switchMap(sf => {
//             const processedFileValidation = validateConfig(gmxProcess.blueprint.config, sf.config)

//             if (processedFileValidation) {
//               return $row(
//                 $alertContainer(
//                   $column(
//                     $text(style({ fontWeight: 'bold' }))(processedFileValidation),
//                     $text('Processed File, use runtime or blueprint to generate a new valid seed processed file'),
//                   )
//                 )
//               )
//             }

//             return empty()
//           }, gmxProcess.seedFile),

//           $ProcessDetails({ seed: gmxProcess.seedFile, title: 'Processed File' })({}),
//         )
//       ),

//       $node(),
//       $node(),


//       $heading1('Event log sources'),

//       $card(
//         $Table({
//           dataSource: logList,
//           columns: [
//             {
//               $head: $text('Name'),
//               $bodyCallback: map(scope => {
//                 return $text(scope.eventName)
//               })
//             },
//             {
//               columnOp: style({  placeContent: 'center' }),
//               $head: $text('Size'),
//               $bodyCallback: map(log => {
//                 const logCount = indexDb.read(log.scope, store => store.count())

//                 return $text(
//                   map(String, map(readableUnitAmount, logCount))
//                 )
                
//               })
//             },
//             {
//               columnOp: style({ placeContent: 'center' }),
//               $head: $text('Block Range'),
//               $bodyCallback: map(log => {

//                 const fst = indexDb.cursor(log.scope, null, 'next')
//                 const lst = indexDb.cursor(log.scope, null, 'prev')
//                 return $column(
//                   $text(map(cursor => {
//                     if (cursor === null) {
//                       return '-'
//                     }

//                     return cursor ? String(cursor.value.blockNumber) : ''
//                   }, fst)),
//                   $text(map(cursor => {
//                     if (cursor === null) {
//                       return '-'
//                     }

//                     return cursor ? String(cursor.value.blockNumber) : ''
//                   }, lst))
//                 )
//               })
//             },
//             {
//               columnOp: style({  placeContent: 'center' }),
//               $head: $text('DB File'),
//               $bodyCallback: map(log => {
//                 const hoverB = hoverDownloadBtnTether(
//                   nodeEvent('pointerover'),
//                   switchMap(() => {
//                     return map(blob => URL.createObjectURL(blob), jsonBlob(gmxProcess.store))
//                   }),
//                   map(href => {
//                     return { href, download: `DB-${log.eventName}.json` }
//                   }),
//                 )

//                 const attrB = attrBehavior(map(attrs => attrs, hoverDownloadBtn))

//                 return $buttonAnchor(hoverB, attrB)(
//                   $iconCircular($caretDown)
//                 )
                
//               })
//             },
//           ]
//         })({})
//       ),

//       $node(),

//     ),

//     {
      
//     }
//   ]
// })


// interface IProcessDetails<T> {
//   title: string
//   seed: Stream<Omit<IProcessedStore<T>, 'orderId' | 'blockNumber'>>
// }


// export const $ProcessDetails = <T>(config: IProcessDetails<T>) => component((
//   [hoverDownloadBtn, hoverDownloadBtnTether]: Behavior<INode, { href: string, download: string }>,
// ) => {

//   const $errorRecoverMsg = recoverWith(err => {
//     return $alertContainer(
//       $heading3(config.title),
//       $text(err.message)
//     )
//   })

//   return [
//     $errorRecoverMsg(
//       switchMap(seed => {

//         const blob = getJsonBlob(seed)

//         return $column(layoutSheet.spacing)(

//           $row(layoutSheet.spacing, style({ alignItems: 'center' }))(
//             $text(config.title),
//             $buttonAnchor(
//               defaultMiniButtonStyle, 
//               hoverDownloadBtnTether(
//                 nodeEvent('pointerover'),
//                 map(async () => {

//                   return {
//                     href: URL.createObjectURL(blob),
//                     hash: await getBlobHash(blob)
//                   }
//                 }),
//                 awaitPromises,
//                 map(params => {
//                   return { href: params.href, download: `${params.hash}.json` }
//                 }),
//               ),
//               attrBehavior(map(attrs => attrs, hoverDownloadBtn))
//             )($text('Download'))
//           ),
             
//           $row(layoutSheet.spacing, style({ placeContent:'space-between' }))(
//             $infoLabeledValue('Chain', $text(`${seed.config.chainId}`)),
//           ),

//           $row(layoutSheet.spacing, style({ placeContent:'space-between' }))(
//             $infoLabeledValue('Block Range', $text(`${seed.config.startBlock}-${seed.config.endBlock}`)),
//           ),

//           $row(layoutSheet.spacing, style({ placeContent:'space-between' }))(
//             $infoLabeledValue('size', $text(readableFileSize(blob.size))),
//           ),

//           $row(layoutSheet.spacing, style({ placeContent:'space-between' }))(
//             $infoLabeledValue('checksum', $text(fromPromise(getBlobHash(blob)))),
//           ),

//         )
//       }, config.seed)
//     )

//   ]
// })


// stringify with bigint support
// export function jsonStringify(obj: any) {
//   return JSON.stringify(obj, (_, v) => typeof v === 'bigint' ? v.toString() + 'n' : v)
// }



// function getJsonBlob<TData>(data: TData): Blob {
//   const jsonContent = jsonStringify(data)
//   const blob = new Blob([jsonContent], { type: "application/json" })
    
//   return blob
// }

// function jsonBlob<TData>(data: Stream<TData>): Stream<Blob> {
//   return map(getJsonBlob, data)
// }


// async function getBlobHash(blob: Blob) {
//   const data = await blob.arrayBuffer()
//   const hash = await window.crypto.subtle.digest('SHA-256', data)

//   let binary = ''
//   const bytes = new Uint8Array(hash)
//   const len = bytes.byteLength
//   for (let i = 0; i < len; i++) {
//     binary += String.fromCharCode(bytes[i])
//   }

//   const hashBase64 = window.btoa(binary)
//   return 'sha256-' + hashBase64
// }



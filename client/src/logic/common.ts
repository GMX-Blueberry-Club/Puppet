import { combineArray, fromCallback, isStream } from "@aelea/core"
import { awaitPromises, map, now } from "@most/core"
import { Stream } from "@most/types"
import * as wagmi from "@wagmi/core"

import type { AbiParametersToPrimitiveTypes, Address, ExtractAbiEvent, ExtractAbiFunction } from 'abitype'
import { ContractClientParams, ContractParams, StreamInput, StreamInputArray } from "gmx-middleware-utils"
import * as viem from "viem"
import * as abitype from "abitype"
import { wagmiConfig, wallet } from "../wallet/walletLink.js"
import { switchMap } from "common-utils"
import { walletLink } from "../wallet"



// interface IContractConnect<TAbi extends viem.Abi> {
//   read<TFunctionName extends string, TArgs extends AbiParametersToPrimitiveTypes<ExtractAbiFunction<TAbi, TFunctionName>['inputs']>>(functionName: abitype.InferFunctionName<TAbi, TFunctionName, 'view' | 'pure'>, ...args_: onlyArray<TArgs> | onlyArray<StreamInputArray<onlyArray<TArgs>>>): Stream<viem.ReadContractReturnType<TAbi, TFunctionName>>
//   listen<TEventName extends string, TLogs = viem.Log<bigint, number, false, ExtractAbiEvent<TAbi, TEventName>, true, TAbi, TEventName>>(eventName: viem.InferEventName<TAbi, TEventName>, args?: viem.GetEventArgs<TAbi, TEventName>): Stream<TLogs>
//   // simulate<TFunctionName extends string, TChainOverride extends viem.Chain | undefined = undefined>(simParams: Omit<viem.SimulateContractParameters<TAbi, TFunctionName, TChain, TChainOverride>, 'address' | 'abi'>): Stream<viem.SimulateContractReturnType<TAbi, TFunctionName, TChain, TChainOverride>>
//   // write<TFunctionName extends string>(simParams: Stream<ContractClientParams<TAbi>>): Stream<wagmi.PrepareWriteContractConfig<TAbi, TFunctionName, TChain['id']>>
// }



// export const connectContract = <
//   TAddress extends Address,
//   TAbi extends viem.Abi,
// >(params: ContractParams<TAbi, TAddress>): IContractConnect<TAbi> => {

//   return {
//     read: contractReader(params),
//     listen: listenContract(params),
//     // simulate: simulateContract(params),
//     // write: writeContract(params),
//   }
// }



// export function combineState<A extends object, K extends keyof A>(state: StreamInput<A>): Stream<A> {
//   const entries = Object.entries(state) as [keyof A, Stream<A[K] | A[K]>][]
//   const streams = entries.map(([_, stream]) => {
//     return isStream(stream) ? stream : now(stream)
//   })

//   const combined = combineArray((...arrgs: A[K][]) => {
//     return arrgs.reduce((seed, val, idx) => {
//       const key = entries[idx][0]
//       seed[key] = val

//       return seed
//     }, {} as A)
//   }, ...streams)

//   return combined
// }

// type onlyArray<T> = T extends readonly any[] ? T : never




// export const listenContract = <
//   TAddress extends Address,
//   TAbi extends viem.Abi,
// >(params_: ContractParams<TAbi, TAddress>) =>
//   <TEventName extends string, TLogs = viem.Log<bigint, number, false, ExtractAbiEvent<TAbi, TEventName>, true, TAbi, TEventName>>(eventName: viem.InferEventName<TAbi, TEventName>, args?: viem.GetEventArgs<TAbi, TEventName>): Stream<TLogs> => {

//     const eventStream = fromCallback(emitCb => {
//       const watchParams = {
//         ...params_,
//         eventName,
//         args: args as any
//       }
//       const listener = wagmi.watchContractEvent<TAbi, TEventName>(
//         watchParams,
//         (logs: any) => {
//           for (const key in logs) {
//             if (Object.prototype.hasOwnProperty.call(logs, key)) {
//               emitCb(logs[key])
//             }
//           }
//         }
//       )

//       return listener
//     })

//     return eventStream
//   }





// export const writeContract = <
//   TAddress extends Address,
//   TAbi extends viem.Abi,
//   TTransport extends viem.Transport,
//   TChain extends viem.Chain,
//   TWalletClient extends wagmi.WalletClient = wagmi.WalletClient
// >(contractParamsEvent: Stream<ContractClientParams<TAbi, TAddress, TTransport, TChain>>) =>
//   <TFunctionName extends string>(simParams: Omit<wagmi.PrepareWriteContractConfig<TAbi, TFunctionName, TChain['id'], TWalletClient>, 'address' | 'abi'>): Stream<viem.WaitForTransactionReceiptReturnType<viem.Chain>> => {

//     const mapState = switchMap(contractParams => {
//       return awaitPromises(map(async walletClient => {
//         if (!walletClient) {
//           throw new Error('Wallet client is not defined')
//         }

//         const simReq = await contractParams.client.simulateContract({ ...contractParams, ...simParams } as any)
//         const hash = await walletClient.writeContract(simReq.request as any)
//         const recpt = await contractParams.client.waitForTransactionReceipt({ hash })

//         return recpt
//       }, wallet))
//     }, contractParamsEvent)

//     return mapState
//   }

export const wagmiWriteContract = async <
  config extends wagmi.Config,
  const abi extends abitype.Abi,
  functionName extends viem.ContractFunctionName<abi, 'nonpayable' | 'payable'>,
  args extends viem.ContractFunctionArgs<abi, 'nonpayable' | 'payable', functionName>,
  chainId extends config['chains'][number]['id'],
>(
  config: config,
  writeParams: wagmi.WriteContractParameters<abi, functionName, args, config, chainId>
): Promise<wagmi.WaitForTransactionReceiptReturnType<config, chainId, typeof walletLink.chains>> => {
  const hash = await wagmi.writeContract(config, writeParams)
  const recpt = await wagmi.waitForTransactionReceipt(wagmiConfig, { hash })
  
  return recpt as any
}



// export const waitForTransactionReceipt = async<
//   TTransport extends viem.Transport,
//   TChain extends viem.Chain,
// >(client: viem.PublicClient<TTransport, TChain>, hash_: Promise<viem.Hash> | viem.Hash): Promise<viem.TransactionReceipt> => {
//   const hash = await hash_
//   const req = client.waitForTransactionReceipt({ hash })
//   return req
// }


// export const contractReader = <
//   TAddress extends Address,
//   TAbi extends viem.Abi,
// >(params_: ContractParams<TAbi, TAddress>) => {
//   return <TFunctionName extends string, TArgs extends AbiParametersToPrimitiveTypes<ExtractAbiFunction<TAbi, TFunctionName>['inputs']>>(functionName: viem.InferFunctionName<TAbi, TFunctionName, 'view' | 'pure'>, ...args_: onlyArray<TArgs> | onlyArray<StreamInputArray<onlyArray<TArgs>>>): Stream<wagmi.ReadContractResult<TAbi, TFunctionName>> => {

//     const resolveArgs: Stream<onlyArray<TArgs>> = isStream(args_[0]) ? combineArray((..._args) => _args, ...args_ as any) : now(args_ as any) as any

//     return map(async args => {
      
//       try {
//         return await wagmi.readContract(wagmiConfig, { ...params_, functionName, args } as any)
//       } catch (error) {
//         console.error(functionName, error)
//         throw error
//       }
//     }, resolveArgs) as any
//   }
// }

// export type IHelloRpcChannels<
//   TAbi extends viem.Abi,
//   TFunctionName extends string
// > = {
//   functionName: viem.InferFunctionName<TAbi, TFunctionName, 'view' | 'pure'>,
//   args: AbiParametersToPrimitiveTypes<ExtractAbiFunction<TAbi, TFunctionName>['inputs']>
// }


// export type AbiInput<
//   TAbi extends viem.Abi,
//   TFunctionName extends viem.InferFunctionName<TAbi, TFunctionName, 'view' | 'pure'>
// > = {
//   functionName: viem.InferFunctionName<TAbi, TFunctionName, 'view' | 'pure'>,
//   args: AbiParametersToPrimitiveTypes<ExtractAbiFunction<TAbi, TFunctionName>['inputs']>
// }

// // export const helloRpc = <
// //   TAddress extends Address,
// //   TAbi extends viem.Abi,
// //   TChannelParamsList extends Record<any, AbiInput<TAbi, any>>,
// // >(
// //   config: ContractParams<TAbi, TAddress>,
// //   messages: { [P in keyof TChannelParamsList]: Stream<AbiInput<TAbi, P>> }
// // ): {[k: string]: Stream<any>}  => {
// //   const entriesInMap = Object.entries(config)
// //   const outMapEntries = entriesInMap.map(([topic, source]) => {
// //     // @ts-ignore
// //     return map(body => ({ topic, body }), source)
// //   }, {} as any)
  
// //   const wss = http.fromWebsocket<ICommunicationMessage<string, OUT>, ICommunicationMessage<string, IN[keyof IN]>>(`wss://${location.host}/api-ws`, mergeArray(outMapEntries))
// //   const multicastConnection = multicast(wss)

// //   const outMap = entriesInMap.reduce((seed, [topic, source]) => {
// //     // @ts-ignore
// //     seed[topic] = O(
// //       filter((data: ICommunicationMessage<string, any>) => {
// //         const isMessageValid = typeof data === 'object' && 'body' in data && 'topic' in data
// //         return isMessageValid && data.topic === topic
// //       }),
// //       map(x => x.body)
// //     )(multicastConnection)

// //     return seed
// //   }, {} as any)
 
// //   return outMap as any
// // }


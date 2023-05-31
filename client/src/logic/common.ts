import { O, combineArray, fromCallback, isStream } from "@aelea/core"
import { $Node, NodeComposeFn, style } from "@aelea/dom"
import { colorAlpha, pallete, theme } from "@aelea/ui-components-theme"
import {
  IAttributeExpression, IAttributeHat,
  IBerryDisplayTupleMap,
  getLabItemTupleIndex, labAttributeTuple
} from "@gambitdao/gbc-middleware"
import { ContractFunctionConfig, StreamInput, StreamInputArray } from "@gambitdao/gmx-middleware"
import { awaitPromises, map, now, snapshot, switchLatest } from "@most/core"
import { Stream } from "@most/types"
import * as wagmi from "@wagmi/core"
import type { Abi, AbiParametersToPrimitiveTypes, Address, ExtractAbiEvent, ExtractAbiFunction } from 'abitype'
import * as viem from "viem"
import { $berry, $defaultBerry } from "../components/$DisplayBerry"
import { publicClient, wallet } from "../wallet/walletLink"
import { WalletClient } from "viem"


interface IContractConnect<TAbi extends Abi, TChain extends viem.Chain = viem.Chain> {
  read<TFunctionName extends string, TArgs extends AbiParametersToPrimitiveTypes<ExtractAbiFunction<TAbi, TFunctionName>['inputs']>>(functionName: viem.InferFunctionName<TAbi, TFunctionName, 'view' | 'pure'>, ...args_: onlyArray<TArgs> | onlyArray<StreamInputArray<onlyArray<TArgs>>>): Stream<viem.ReadContractReturnType<TAbi, TFunctionName>>
  listen<TEventName extends string, TLogs = viem.Log<bigint, number, ExtractAbiEvent<TAbi, TEventName>>>(eventName: viem.InferEventName<TAbi, TEventName>, args?: viem.GetEventArgs<TAbi, TEventName>): Stream<TLogs>
  simulate<TFunctionName extends string, TChainOverride extends viem.Chain | undefined = undefined>(simParams: Omit<viem.SimulateContractParameters<TAbi, TFunctionName, TChain, TChainOverride>, 'address' | 'abi'>): Stream<viem.SimulateContractReturnType<TAbi, TFunctionName, TChain, TChainOverride>>
  write<TFunctionName extends string>(simParams: Stream<Omit<wagmi.PrepareWriteContractConfig<TAbi, TFunctionName, TChain['id'], WalletClient>, 'address' | 'abi'>>): Stream<wagmi.PrepareWriteContractConfig<TAbi, TFunctionName, TChain['id']>>
}


export const getMappedContractAddress = <
  TDeepMap extends Record<number, { [k: string]: Address }>,
  TKey1 extends keyof TDeepMap,
  TKey2 extends keyof TDeepMap[TKey1],
  TAddress extends TDeepMap[TKey1][TKey2],
>(contractMap: TDeepMap, contractName: TKey2): Stream<TDeepMap[TKey1][TKey2]> => {
  const newLocal = map(client => {
    const contractAddressMap = contractMap[client.chain.id as TKey1]

    if (!contractAddressMap) {
      throw new Error(`Contract address not found for chain ${client.chain.id}`)
    }

    const address = contractMap[client.chain.id as TKey1][contractName] as TAddress
    return address
  }, publicClient)
  return newLocal
}


export const connectMappedContractConfig = <
  TDeepMap extends Record<number, { [k: string]: Address }>,
  TKey1 extends keyof TDeepMap,
  TKey2 extends keyof TDeepMap[TKey1],
  TAddress extends TDeepMap[TKey1][TKey2],
  TAbi extends Abi,
>(contractMap: TDeepMap, contractName: TKey2, abi: TAbi) => {

  const config = map(client => {
    const contractAddressMap = contractMap[client.chain.id as TKey1]

    if (!contractAddressMap) {
      throw new Error(`Contract address not found for chain ${client.chain.id}`)
    }

    const address = contractMap[client.chain.id as TKey1][contractName] as TAddress
    return { client, address, abi }
  }, fromStream(publicClient))

  return config
}

export const connectMappedContract = <
  TDeepMap extends Record<number, { [k: string]: Address }>,
  TKey1 extends keyof TDeepMap,
  TKey2 extends keyof TDeepMap[TKey1],
  TAbi extends Abi,
>(contractMap: TDeepMap, contractName: TKey2, abi: TAbi) => {
  const config = map(client => {
    const contractAddressMap = contractMap[client.chain.id as TKey1]

    if (!contractAddressMap) {
      throw new Error(`Contract address not found for chain ${client.chain.id}`)
    }

    const address = contractMap[client.chain.id as TKey1][contractName] as Address
    return { client, address, abi }
  }, publicClient)


  return {
    read: contractReader(config),
    listen: listenContract(config),
    simulate: simulateContract(config),
    write: writeContract(config),
  }
}

export const connectContract = <
  TAddress extends Address,
  TAbi extends Abi,
>(address_: TAddress | Stream<TAddress>, abi: TAbi): IContractConnect<TAbi> => {
  const config = combineArray((client, address) => {
    return { client, address, abi }
  }, publicClient, fromStream(address_))
  return {
    read: contractReader(config),
    listen: listenContract(config),
    simulate: simulateContract(config),
    write: writeContract(config),
  }
}


function fromStream<T>(maybeStream: T | Stream<T>): Stream<T> {
  return isStream(maybeStream) ? maybeStream : now(maybeStream)
}


export function combineState<A extends object, K extends keyof A>(state: StreamInput<A>): Stream<A> {
  const entries = Object.entries(state) as [keyof A, Stream<A[K] | A[K]>][]
  const streams = entries.map(([_, stream]) => {
    return isStream(stream) ? stream : now(stream)
  })

  const combined = combineArray((...arrgs: A[K][]) => {
    return arrgs.reduce((seed, val, idx) => {
      const key = entries[idx][0]
      seed[key] = val

      return seed
    }, {} as A)
  }, ...streams)

  return combined
}

type onlyArray<T> = T extends readonly any[] ? T : never


export const contractReader = <
  TAddress extends Address,
  TTransport extends viem.Transport,
  TChain extends viem.Chain,
  TIncludeActions extends true,
  TPublicClient extends viem.PublicClient<TTransport, TChain, TIncludeActions>,
  TAbi extends Abi,
>(params_: Stream<ContractFunctionConfig<TAddress, TAbi, TTransport, TChain, TIncludeActions, TPublicClient>>) =>
  <TFunctionName extends string, TArgs extends AbiParametersToPrimitiveTypes<ExtractAbiFunction<TAbi, TFunctionName>['inputs']>>(functionName: viem.InferFunctionName<TAbi, TFunctionName, 'view' | 'pure'>, ...args_: onlyArray<TArgs> | onlyArray<StreamInputArray<onlyArray<TArgs>>>): Stream<viem.ReadContractReturnType<TAbi, TFunctionName>> => {

    const mapState = switchLatest(map(({ abi, address, client }) => {
      const resolveArgs: Stream<onlyArray<TArgs>> = isStream(args_[0]) ? combineArray((..._args) => _args, ...args_ as any) : now(args_ as any) as any
      return awaitPromises(map(args => {
        return wagmi.readContract({ abi, address, functionName, args } as any)
      }, resolveArgs))
    }, params_))

    return mapState
  }


export const listenContract = <
  TAddress extends Address,
  TAbi extends Abi,
  TTransport extends viem.Transport,
  TChain extends viem.Chain,
  TIncludeActions extends true,
  TPublicClient extends viem.PublicClient<TTransport, TChain, TIncludeActions>,
>(params_: Stream<ContractFunctionConfig<TAddress, TAbi, TTransport, TChain, TIncludeActions, TPublicClient>>) =>
  <TEventName extends string, TLogs = viem.Log<bigint, number, ExtractAbiEvent<TAbi, TEventName>>>(eventName: viem.InferEventName<TAbi, TEventName>, args?: viem.GetEventArgs<TAbi, TEventName>): Stream<TLogs> => {

    const mapState = switchLatest(map(({ abi, address, client }) => {
      const eventStream = fromCallback(emitCb => {
        const listener = client.watchContractEvent<TAbi, TEventName>({
          abi, address,
          eventName, args,
          onLogs: logs => {
            for (const key in logs) {
              if (Object.prototype.hasOwnProperty.call(logs, key)) {
                emitCb(logs[key])
              }
            }
          }
        })

        return listener
      })

      return eventStream
    }, params_))

    return mapState
  }



export const simulateContract = <
  TAddress extends Address,
  TAbi extends Abi,
  TTransport extends viem.Transport,
  TChain extends viem.Chain,
  TIncludeActions extends true,
  TPublicClient extends viem.PublicClient<TTransport, TChain, TIncludeActions>,
>(params_: Stream<ContractFunctionConfig<TAddress, TAbi, TTransport, TChain, TIncludeActions, TPublicClient>>) =>
  <TFunctionName extends string, TChainOverride extends viem.Chain | undefined = undefined>(simParams: Omit<viem.SimulateContractParameters<TAbi, TFunctionName, TChain, TChainOverride>, 'address' | 'abi'>): Stream<viem.SimulateContractReturnType<TAbi, TFunctionName, TChain, TChainOverride>> => {

    const mapState = awaitPromises(map(({ abi, address, client }) => {

      const sim = client.simulateContract({ address, abi, ...simParams } as any)
      return sim
    }, params_))

    return mapState as any
  }

export const writeContract = <
  TAddress extends Address,
  TAbi extends Abi,
  TTransport extends viem.Transport,
  TChain extends viem.Chain,
  TIncludeActions extends true,
  TPublicClient extends viem.PublicClient<TTransport, TChain, TIncludeActions>,
  TWalletClient extends wagmi.WalletClient = wagmi.WalletClient
>(params_: Stream<ContractFunctionConfig<TAddress, TAbi, TTransport, TChain, TIncludeActions, TPublicClient>>) =>
  <TFunctionName extends string>(simParams: Omit<wagmi.PrepareWriteContractConfig<TAbi, TFunctionName, TChain['id'], TWalletClient>, 'address' | 'abi'>): Stream<wagmi.PrepareWriteContractConfig<TAbi, TFunctionName, TChain['id']>> => {

    const mapState = awaitPromises(snapshot(async (walletClient, params) => {
      if (!walletClient) {
        throw new Error('Wallet client is not defined')
      }

      const simReq = await params.client.simulateContract({ address: params.address, abi: params.abi, ...simParams } as any)

      const request = walletClient.writeContract(simReq.request)
      return request
    }, wallet, params_))

    return mapState as any
  }



export const waitForTransactionReceipt = async<
  TTransport extends viem.Transport,
  TChain extends viem.Chain,
>(client: viem.PublicClient<TTransport, TChain>, hash_: Promise<viem.Hash> | viem.Hash): Promise<viem.TransactionReceipt> => {
  const hash = await hash_
  const req = client.waitForTransactionReceipt({ hash })
  return req
}



export const $defaultLabItem = $defaultBerry(
  style({ placeContent: 'center', overflow: 'hidden' })
)

export const $defaultLabItemMedium = $defaultLabItem(
  style({ width: '70px', height: '70px' })
)

export const $defaultLabItemBig = $defaultLabItem(
  style({ width: '250px', height: '250px' })
)

export const $defaultLabItemHuge = $defaultLabItem(
  style({ width: '460px', height: '460px' })
)

export interface ILabItemDisplay {
  id: number
  $container?: NodeComposeFn<$Node>
  background?: boolean
  showFace?: boolean
}

const tupleLength = labAttributeTuple.length

export const $labItem = ({ id, $container = $defaultLabItem, background = true, showFace = false }: ILabItemDisplay): $Node => {
  const tupleIdx = getLabItemTupleIndex(id)
  const localTuple = Array(tupleLength).fill(undefined) as IBerryDisplayTupleMap
  localTuple.splice(tupleIdx, 1, id)

  if (tupleIdx !== 5) {
    localTuple.splice(5, 1, IAttributeHat.NUDE)
  }

  if (tupleIdx !== 3 && showFace) {
    localTuple.splice(3, 1, IAttributeExpression.HAPPY)
  }


  const $csContainer = $container(
    background
      ? style({ backgroundColor: tupleIdx === 0 ? '' : colorAlpha(pallete.message, theme.name === 'light' ? .12 : .92) })
      : O()
  )
  return $berry(localTuple, $csContainer)
}



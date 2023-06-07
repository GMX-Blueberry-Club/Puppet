import { combineArray, fromCallback, isStream } from "@aelea/core"
import { ContractFunctionConfig, StreamInput, StreamInputArray, switchMap } from "gmx-middleware-utils"
import { awaitPromises, map, now, switchLatest } from "@most/core"
import { Stream } from "@most/types"
import * as wagmi from "@wagmi/core"
import type { Abi, AbiParametersToPrimitiveTypes, Address, ExtractAbiEvent, ExtractAbiFunction } from 'abitype'
import * as viem from "viem"
import { IWalletClient, publicClient, wallet } from "../wallet/walletLink"


interface IContractConnect<TAbi extends Abi, TChain extends viem.Chain = viem.Chain> {
  read<TFunctionName extends string, TArgs extends AbiParametersToPrimitiveTypes<ExtractAbiFunction<TAbi, TFunctionName>['inputs']>>(functionName: viem.InferFunctionName<TAbi, TFunctionName, 'view' | 'pure'>, ...args_: onlyArray<TArgs> | onlyArray<StreamInputArray<onlyArray<TArgs>>>): Stream<viem.ReadContractReturnType<TAbi, TFunctionName>>
  listen<TEventName extends string, TLogs = viem.Log<bigint, number, ExtractAbiEvent<TAbi, TEventName>>>(eventName: viem.InferEventName<TAbi, TEventName>, args?: viem.GetEventArgs<TAbi, TEventName>): Stream<TLogs>
  simulate<TFunctionName extends string, TChainOverride extends viem.Chain | undefined = undefined>(simParams: Omit<viem.SimulateContractParameters<TAbi, TFunctionName, TChain, TChainOverride>, 'address' | 'abi'>): Stream<viem.SimulateContractReturnType<TAbi, TFunctionName, TChain, TChainOverride>>
  write<TFunctionName extends string>(simParams: Stream<Omit<wagmi.PrepareWriteContractConfig<TAbi, TFunctionName, TChain['id'], IWalletClient>, 'address' | 'abi'>>): Stream<wagmi.PrepareWriteContractConfig<TAbi, TFunctionName, TChain['id']>>
}


export const getMappedValue2 = <
  TDeepMap extends Record<number, { [k: string]: Address }>,
  TKey1 extends keyof TDeepMap,
  TKey2 extends keyof TDeepMap[TKey1]
>(mapOfMap: TDeepMap, map1Key: TKey1, map2Key: TKey2): TDeepMap[TKey1][TKey2] => {
  const contractAddressMap = mapOfMap[map1Key]

  if (!contractAddressMap) {
    throw new Error(`map1Key[${String(map1Key)}] not found in map`)
  }

  const address = contractAddressMap[map2Key]

  if (!address) {
    throw new Error(`map2Key[${String(map2Key)}] not found in map`)
  }

  return address
}

export const getMappedContractAddress = <
  TDeepMap extends Record<number, { [k: string]: Address }>,
  TKey1 extends keyof TDeepMap,
  TKey2 extends keyof TDeepMap[TKey1],
>(contractMap: TDeepMap, contractName: TKey2): Stream<TDeepMap[TKey1][TKey2]> => {
  return map(client => getMappedValue2(contractMap, client.chain.id as TKey1, contractName), publicClient)
}


export const connectMappedContractConfig = <
  TDeepMap extends Record<number, { [k: string]: Address }>,
  TKey1 extends keyof TDeepMap,
  TKey2 extends keyof TDeepMap[TKey1],
  TAbi extends Abi,
>(contractMap: TDeepMap, contractName: TKey2, abi: TAbi) => {

  const config = map(client => {
    const address = getMappedValue2(contractMap, client.chain.id as TKey1, contractName)
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
  <TEventName extends string, TLogs = viem.Log<bigint, number, ExtractAbiEvent<TAbi, TEventName>, true>>(eventName: viem.InferEventName<TAbi, TEventName>, args?: viem.GetEventArgs<TAbi, TEventName>): Stream<TLogs> => {

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
  <TFunctionName extends string>(simParams: Omit<wagmi.PrepareWriteContractConfig<TAbi, TFunctionName, TChain['id'], TWalletClient>, 'address' | 'abi'>): Stream<viem.WaitForTransactionReceiptReturnType<viem.Chain>> => {

    const mapState = switchMap(params => {
      return awaitPromises(map(async walletClient => {
        if (!walletClient) {
          throw new Error('Wallet client is not defined')
        }

        const simReq = await params.client.simulateContract({ address: params.address, abi: params.abi, ...simParams } as any)
        const hash = await walletClient.writeContract(simReq.request)
        const recpt = await params.client.waitForTransactionReceipt({ hash })

        return recpt
      }, wallet))
    }, params_)

    return mapState
  }

export const wagmiWriteContract = async <
  TAbi extends Abi,
  TFunctionName extends string,

  // TTransport extends viem.Transport,
  // TChain extends viem.Chain,
  // TIncludeActions extends true,
  // TWalletClient extends wagmi.WalletClient = wagmi.WalletClient
  >(simParams: wagmi.PrepareWriteContractConfig<TAbi, TFunctionName>): Promise<viem.TransactionReceipt> => {

  const client = wagmi.getPublicClient()
  const simReq = await wagmi.prepareWriteContract(simParams as any)
  const writeResults = await wagmi.writeContract(simReq.request)
  const recpt = await client.waitForTransactionReceipt(writeResults)

  return recpt

}



export const waitForTransactionReceipt = async<
  TTransport extends viem.Transport,
  TChain extends viem.Chain,
>(client: viem.PublicClient<TTransport, TChain>, hash_: Promise<viem.Hash> | viem.Hash): Promise<viem.TransactionReceipt> => {
  const hash = await hash_
  const req = client.waitForTransactionReceipt({ hash })
  return req
}


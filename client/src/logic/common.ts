import { combineArray, fromCallback, isStream } from "@aelea/core"
import { ContractClientParams, ContractParams, StreamInput, StreamInputArray, switchMap } from "gmx-middleware-utils"
import { awaitPromises, map, now, switchLatest } from "@most/core"
import { Stream } from "@most/types"
import * as wagmi from "@wagmi/core"
import type { AbiParametersToPrimitiveTypes, Address, ExtractAbiEvent, ExtractAbiFunction } from 'abitype'
import * as viem from "viem"
import { publicClient, wallet } from "../wallet/walletLink"


interface IContractConnect<TAbi extends viem.Abi, TChain extends viem.Chain = viem.Chain> {
  read<TFunctionName extends string, TArgs extends AbiParametersToPrimitiveTypes<ExtractAbiFunction<TAbi, TFunctionName>['inputs']>>(functionName: viem.InferFunctionName<TAbi, TFunctionName, 'view' | 'pure'>, ...args_: onlyArray<TArgs> | onlyArray<StreamInputArray<onlyArray<TArgs>>>): Stream<viem.ReadContractReturnType<TAbi, TFunctionName>>
  listen<TEventName extends string, TLogs = viem.Log<bigint, number, ExtractAbiEvent<TAbi, TEventName>, true>>(eventName: viem.InferEventName<TAbi, TEventName>, args?: viem.GetEventArgs<TAbi, TEventName>): Stream<TLogs>
  simulate<TFunctionName extends string, TChainOverride extends viem.Chain | undefined = undefined>(simParams: Omit<viem.SimulateContractParameters<TAbi, TFunctionName, TChain, TChainOverride>, 'address' | 'abi'>): Stream<viem.SimulateContractReturnType<TAbi, TFunctionName, TChain, TChainOverride>>
  write<TFunctionName extends string>(simParams: Stream<ContractClientParams<TAbi>>): Stream<wagmi.PrepareWriteContractConfig<TAbi, TFunctionName, TChain['id']>>
}


export const getMappedValue2 = <
  T,
  TMap1,
  TMap2,
  TMapMap extends { [p in keyof TMap1]: { [P in keyof TMap2]: T } },
>(mapOfMap: TMapMap, map1Key: keyof TMap1, map2Key: keyof TMap2): T => {
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



// export const connectMappedContractConfig = <
//   TAddress extends viem.Address,
//   TAbi extends viem.Abi,
//   // TTransport extends viem.Transport,
//   // TChain extends viem.Chain,
//   // TIncludeActions extends boolean,
//   // TPublicClient extends viem.PublicClient<TTransport, TChain, TIncludeActions>,
//   TDeepMap extends Record<number, Record<string, ContractParams<TAbi, TAddress>>>,
//   TKey1 extends keyof TDeepMap,
//   TKey2 extends keyof TDeepMap[TKey1],
// >(contractMap: TDeepMap, contractName: TKey2): Stream<ContractClientParams<TAbi, TAddress>> => {

//   const config = map(client => {
//     const contract = getMappedValue2(contractMap, client.chain.id as TKey1, contractName)


//     return { ...contract, client }
//   }, fromStream(publicClient))

//   return config
// }

export const connectMappedContract = <
  TAbi extends viem.Abi,
  TAddress extends viem.Address,
>(contractMap: ContractParams<TAbi, TAddress>) => {


  return {
    read: contractReader(contractMap),
    listen: listenContract(contractMap),
    simulate: simulateContract(contractMap),
    write: writeContract(contractMap),
  }
}

export const connectContract = <
  TAddress extends Address,
  TAbi extends viem.Abi,
>(params: ContractParams<TAbi, TAddress>): IContractConnect<TAbi> => {

  return {
    read: contractReader(params),
    listen: listenContract(params),
    simulate: simulateContract(params),
    write: writeContract(params),
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
  TAbi extends viem.Abi,
>(params_: ContractParams<TAbi, TAddress>) =>
  <TFunctionName extends string, TArgs extends AbiParametersToPrimitiveTypes<ExtractAbiFunction<TAbi, TFunctionName>['inputs']>>(functionName: viem.InferFunctionName<TAbi, TFunctionName, 'view' | 'pure'>, ...args_: onlyArray<TArgs> | onlyArray<StreamInputArray<onlyArray<TArgs>>>): Stream<viem.ReadContractReturnType<TAbi, TFunctionName>> => {

    const resolveArgs: Stream<onlyArray<TArgs>> = isStream(args_[0]) ? combineArray((..._args) => _args, ...args_ as any) : now(args_ as any) as any

    return awaitPromises(map(async args => {

      try {
        return await wagmi.readContract({ ...params_, functionName, args } as any)
      } catch (error) {
        console.error(error)
        throw error
      }

      
    }, resolveArgs))
  }


export const listenContract = <
  TAddress extends Address,
  TAbi extends viem.Abi,
>(params_: ContractParams<TAbi, TAddress>) =>
  <TEventName extends string, TLogs = viem.Log<bigint, number, ExtractAbiEvent<TAbi, TEventName>, true>>(eventName: viem.InferEventName<TAbi, TEventName>, args?: viem.GetEventArgs<TAbi, TEventName>): Stream<TLogs> => {

    const eventStream = fromCallback(emitCb => {
      const listener = wagmi.watchContractEvent<TAbi, TEventName>(
        {
          ...params_,
          eventName,
          args: args as any
        },
        logs => {
          for (const key in logs) {
            if (Object.prototype.hasOwnProperty.call(logs, key)) {
              emitCb(logs[key])
            }
          }
        }
      )

      return listener
    })

    return eventStream
  }



export const simulateContract = <
  TAddress extends Address,
  TAbi extends viem.Abi,
  TChain extends viem.Chain,
>(params_: ContractParams<TAbi, TAddress>) =>
  <TFunctionName extends string, TChainOverride extends viem.Chain | undefined = undefined>(simParams: Omit<viem.SimulateContractParameters<TAbi, TFunctionName, TChain, TChainOverride>, 'address' | 'abi'>): Stream<viem.SimulateContractReturnType<TAbi, TFunctionName, TChain, TChainOverride>> => {

    const mapState = awaitPromises(map(({ abi, address, client }) => {

      const sim = client.simulateContract({ ...params_, ...simParams } as any)
      return sim
    }, params_))

    return mapState as any
  }

export const writeContract = <
  TAddress extends Address,
  TAbi extends viem.Abi,
  TTransport extends viem.Transport,
  TChain extends viem.Chain,
  TIncludeActions extends true,
  TPublicClient extends viem.PublicClient<TTransport, TChain, TIncludeActions>,
  TWalletClient extends wagmi.WalletClient = wagmi.WalletClient
>(contractParamsEvent: Stream<ContractClientParams<TAbi, TAddress, TTransport, TChain, TIncludeActions, TPublicClient>>) =>
  <TFunctionName extends string>(simParams: Omit<wagmi.PrepareWriteContractConfig<TAbi, TFunctionName, TChain['id'], TWalletClient>, 'address' | 'abi'>): Stream<viem.WaitForTransactionReceiptReturnType<viem.Chain>> => {

    const mapState = switchMap(contractParams => {
      return awaitPromises(map(async walletClient => {
        if (!walletClient) {
          throw new Error('Wallet client is not defined')
        }

        const simReq = await contractParams.client.simulateContract({ ...contractParams, ...simParams } as any)
        const hash = await walletClient.writeContract(simReq.request as any)
        const recpt = await contractParams.client.waitForTransactionReceipt({ hash })

        return recpt
      }, wallet))
    }, contractParamsEvent)

    return mapState
  }

export const wagmiWriteContract = async <
  TAbi extends viem.Abi,
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


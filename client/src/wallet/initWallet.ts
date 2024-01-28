import { combineObject, fromCallback, replayLatest } from "@aelea/core"
import { map, multicast } from "@most/core"
import { disposeWith } from "@most/disposable"
import { Stream } from "@most/types"
import { EthereumProvider } from "@walletconnect/ethereum-provider"
import * as viem from 'viem'
import { IWalletClient } from "./walletLink"
import { EIP1193Provider } from "mipd"
import { switchMap } from "common-utils"

export type IPublicProvider = viem.PublicClient<viem.Transport, viem.Chain>

export interface IWalletLink {
  publicProviderQuery: Stream<Promise<IPublicProvider>>
  providerQuery: Stream<Promise<IPublicProvider>>
  walletClientQuery: Stream<Promise<IWalletClient | null>>
}



interface IWalletLinkConfig {
  publicTransportMap: Partial<Record<number, viem.Transport>>
  walletProvider: Stream<EIP1193Provider | null>,
  chainQuery: Stream<Promise<viem.Chain>>,
}


export function initWalletLink(config: IWalletLinkConfig): IWalletLink {
  const { chainQuery, walletProvider, publicTransportMap } = config

  const providerList = Object.values(publicTransportMap)
  if (providerList.length === 0) {
    throw new Error('no global provider map')
  }


  const publicTransportParamsQuery = replayLatest(multicast(map(async params => {
    const chain = await params.chainQuery
    const transport = getPublicTransport(publicTransportMap, chain)
    return { transport, chain }
  }, combineObject({ chainQuery }))))

  const providerQuery = replayLatest(multicast(map(async params => {
    const { chain, transport } = await params.publicTransportParamsQuery

    return viem.createPublicClient({ chain, transport })
  }, combineObject({ publicTransportParamsQuery }))))

  const walletClientQuery: Stream<Promise<IWalletClient | null>> = replayLatest(multicast(map(async params => {
    const walletProvider = params.walletProvider
    const { chain, transport } = await params.publicTransportParamsQuery

    if (walletProvider === null) {
      return null
    }

    const accountList = await walletProvider.request({ method: 'eth_accounts' })

    if (accountList.length === 0) {
      return null
    }

    const walletClient: IWalletClient = viem.createWalletClient({
      account: viem.getAddress(accountList[0]),
      chain,
      transport: viem.fallback([viem.custom(walletProvider), transport]),
    }) as any

    const addressList = await walletClient.getAddresses()

    if (addressList.length === 0) {
      return null
    }

    return walletClient
  }, combineObject({ walletProvider, publicTransportParamsQuery }))))


  const publicProviderQuery = replayLatest(multicast(map(async params => {
    const { chain, transport } = await params.publicTransportParamsQuery

    return viem.createPublicClient({ chain, transport })
  }, combineObject({ publicTransportParamsQuery }))))


  return { walletClientQuery, providerQuery, publicProviderQuery }
}


export function getPublicTransport(
  publicTransportMap: Partial<Record<number, viem.Transport>>,
  chain: viem.Chain
): viem.Transport {
  const providerList = Object.values(publicTransportMap)

  if (providerList.length === 0) {
    throw new Error('no global provider map')
  }


  const matchedPublicTransport = publicTransportMap[chain.id]

  if (!matchedPublicTransport) {
    console.error(`no provider for chain ${chain.name || chain.id}`)
  }

  const publicTransport = matchedPublicTransport || providerList[0]!

  return publicTransport
}

export async function getPublicClient(
  publicTransportQuery: Promise<viem.Transport>,
  walletProviderQuery: Promise<EIP1193Provider | null>,
  chainQuery: Promise<viem.Chain>
) {

  const walletProvider = await walletProviderQuery
  const publicTransport = await publicTransportQuery
  const chain = await chainQuery

  const transport = walletProvider ? [viem.custom(walletProvider), publicTransport] : [publicTransport]
  return viem.createPublicClient({
    chain,
    transport: viem.fallback(transport)
  })
}

export async function walletConnectConnector(chainList: viem.Chain[], projectId: string) {
  const ethereumProvider = await EthereumProvider.init({
    chains: chainList.map(chain => chain.id) as any,
    projectId,
    showQrModal: true,
  })

  await ethereumProvider.connect()

  const accounts = ethereumProvider.accounts

  if (accounts.length === 0) {
    return null
  }

  return ethereumProvider
}


type EthereumProvider = { request(...args: any): Promise<any>, name: string }


export const getInjectedProviderList = (): EthereumProvider[] => {
  const providerList: EthereumProvider[] = (window as any)?.ethereum?.providers
  if (!providerList) {
    return []
  }

  return providerList
}

export const getInjectedTransport = (name: string) => {
  const providerList: EthereumProvider[] = (window as any)?.ethereum?.providers

  if (!providerList) {
    return null
  }

  const match = providerList.find(provider => provider.name === name)

  if (!match) {
    return null
  }

  return viem.custom(match)
}


export const eip1193ProviderEventFn = <TEvent extends keyof viem.EIP1193EventMap>(provider: EIP1193Provider, eventName: TEvent) => fromCallback<any, any>(
  (cb) => {
    provider.on(eventName as any, cb)
    return disposeWith(() => provider.removeListener(eventName, cb), null)
  },
  a => {
    return a
  }
)

export const getGasPrice = (clientQuerySource: Stream<Promise<viem.PublicClient>>) => {
  return switchMap(async (clientQuery) => {
    return (await clientQuery).getGasPrice()
  }, clientQuerySource)
}

export const getEstimatedGasPrice = (clientQuerySource: Stream<Promise<viem.PublicClient>>) => {
  return switchMap(async (clientQuery) => {
    return (await clientQuery).estimateFeesPerGas()
  }, clientQuerySource)
}


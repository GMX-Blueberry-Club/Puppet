import { fromCallback, replayLatest } from "@aelea/core"
import { awaitPromises, fromPromise, map, mergeArray, multicast, now, startWith } from "@most/core"
import { Stream } from "@most/types"
import { walletConnect } from '@wagmi/connectors'
import { Connection, GetAccountReturnType, createConfig, createStorage, getBlockNumber, getPublicClient, getWalletClient, http, reconnect, watchAccount, watchBlockNumber, watchChainId, watchPublicClient } from "@wagmi/core"
import { arbitrum } from "@wagmi/core/chains"
import { switchMap } from "common-utils"
import * as viem from 'viem'
// import { arbitrum } from "viem/chains"

export const chains = [
  arbitrum, // avalanche
  // mainnet, sepolia,
] as const

export type ISupportedChain = typeof chains[number]


export type IWalletClient = viem.WalletClient<viem.Transport, ISupportedChain, viem.Account>

const storage = createStorage({ storage: window.localStorage })
const projectId = import.meta.env.VITE_WC_PROJECT_ID || 'fdc797f2e6a68e01b9e17843c939673e'
const llamaRpc = import.meta.env.VITE_LLAMANODES_PROJECT_ID || '01HCB0CBBH06TE3XSM6ZE4YYAD'


const metadata = {
  name: '__APP_NAME__',
  description: '__APP_DESC_SHORT__',
  url: '__WEBSITE__',
  icons: ['https://imagedelivery.net/_aTEfDRm7z3tKgu9JhfeKA/5a7df101-00dc-4856-60a9-921b2879e200/lg']
}

export const wcConnector = walletConnect({
  showQrModal: true,
  projectId, metadata,
  isNewChainsStale: true,
  // qrModalOptions: {
  //   themeVariables: {
  //     // "--w3m-color-mix": "red",
  //     // "--w3m-color-mix-strength": 0,
  //     // "--w3m-border-radius-master": "0px",
  //     // '--w3m-font-family': 'var(--font)',
  //     // '--w3m-accent': pallete.primary,
  //     "--wcm-accent-color": pallete.primary,
  //     "--wcm-font-family": 'var(--font)',
  //     "--wcm-background-color": pallete.background,
  //   }
  // }
})


export const wagmiConfig = createConfig({
  storage: storage,
  syncConnectedChain: true,
  batch: {
    multicall: true
  },
  chains,
  // storage,
  connectors: [
    // injected(),
    // coinbaseWallet({ appName: 'Create Wagmi' }),
    wcConnector,
  ],
  transports: {
    [arbitrum.id]: http()
  },
})

const reconnectQuery: Stream<Connection | null> = map(connectionArray => {
  if (connectionArray.length === 0) {
    return null
  }

  return connectionArray[0]
}, fromPromise(reconnect(wagmiConfig)))



export const chain: Stream<ISupportedChain> = switchMap(connection =>  {
  const initalChain = connection ? chains.find(c => c.id === connection.chainId) : chains[0]
  const change = fromCallback(cb => {
    const watcher = watchChainId(wagmiConfig, {
      onChange(res) {
        const match = chains.find(chain => chain.id == res) || chains[0]
        cb(match)
      }
    })
  
    return watcher
  })
  return startWith(initalChain, change)
}, reconnectQuery)


export const account: Stream<GetAccountReturnType> = replayLatest(multicast(switchMap(connection => {
  return fromCallback(cb => watchAccount(wagmiConfig, {
    onChange(res) {
      return cb(res)
    }
  }))
}, reconnectQuery))) 



const intialPublicClient = getPublicClient(wagmiConfig)

const publicClientChange = fromCallback(cb => {
  return watchPublicClient(wagmiConfig, {
    onChange(res) {
      return cb(res)
    }
  })
})

export const publicClient: Stream<viem.PublicClient> = replayLatest(multicast(startWith(intialPublicClient, publicClientChange)))


export const wallet: Stream<IWalletClient | null> = replayLatest(multicast(mergeArray([
  awaitPromises(map(connection => connection ? getWalletClient(wagmiConfig) : null, reconnectQuery)),
  switchMap(async connection => {
    if (connection.status === 'connected') {
      const wClient = await getWalletClient(wagmiConfig)
      return wClient
    }

    return null
  }, account)
])))


// export const nativeBalance = switchMap(async params => {
//   if (params.wallet === null) return 0n

//   return params.publicClient.getBalance({ address: params.wallet.account.address })
// }, combineObject({ publicClient, wallet }))

export const gasPrice = awaitPromises(map(pc => pc.getGasPrice(), publicClient))
export const estimatedGasPrice = awaitPromises(map(pc => pc.estimateFeesPerGas({ chain: arbitrum }), publicClient))

export const block = awaitPromises(map(n => getBlockNumber(wagmiConfig), now(null)))
export const blockChange: Stream<bigint> = fromCallback(cb => {
  return watchBlockNumber(wagmiConfig, 
    { 
      onBlockNumber(bn) {
        cb(bn)
      }
    }
  )
})





import { createClient, fetchExchange } from '@urql/core'
import { cacheExchange, offlineExchange } from '@urql/exchange-graphcache'
import { makeDefaultStorage } from '@urql/exchange-graphcache/default-storage'


const storage = makeDefaultStorage({
  idbName: 'graphcache-v3', // The name of the IndexedDB database
  maxAge: 7, // The maximum age of the persisted data in days
})


const cache = offlineExchange({
  // schema,
  storage,
  updates: {
    /* ... */
  },
  optimistic: {
    /* ... */
  },
})



export const subgraphClient = createClient({
  url: 'https://api.studio.thegraph.com/query/112/puppet/v0.0.58',
  exchanges: [cache, fetchExchange],
  requestPolicy: 'cache-first',
})



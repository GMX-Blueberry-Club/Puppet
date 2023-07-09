import { now } from '@most/core'
import * as store from './utils/storage/storeScope'
import * as indexDB from './utils/storage/indexDB'



export const rootStoreScope: store.IStoreconfig<'root'> = {
  name: 'root',
} as const


const sndScope = store.createStoreScope(rootStoreScope, 'trading')
const lev = store.replayWrite(sndScope, 'fwefe', 'world' as const, now('fef' as const) )

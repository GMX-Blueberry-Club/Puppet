import { now } from '@most/core'
import * as store from './utils/storage/storeScope'
import * as indexDB from './utils/storage/indexDB'



export const rootStoreScope: store.IStoreconfig<'root'> = {
  name: 'root',
} as const


import * as store from '../../utils/storage/storeScope.js'


export const rootStoreScope: store.IStoreconfig<'root'> = {
  name: 'root',
} as const


export const mainMenuOpen = store.createStoreScope(rootStoreScope, 'mainMenuOpen')
export const activityTimeframe = store.createStoreScope(rootStoreScope, 'activityTimeframe')
export const trade = store.createStoreScope(rootStoreScope, 'tradeBox' as const)


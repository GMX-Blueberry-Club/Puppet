import * as database from './utils/storage/browserDatabaseScope'
import * as indexDB from './utils/storage/indexDB'


export const rootStoreScope: database.IStoreScopeConfig<'_BROWSER_SCOPE'> = {
  dbParams: indexDB.openDb('_BROWSER_SCOPE'),
  key: '_BROWSER_SCOPE',
}



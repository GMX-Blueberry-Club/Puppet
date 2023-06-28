import * as database from './logic/browserDatabaseScope'


export const rootStoreScope = database.createStoreScope(
  {
    key: 'rootScope',
    db: database.initDbStore('rootScope')
  },
  {
    version: '0.0.1-alpha',
  }
)



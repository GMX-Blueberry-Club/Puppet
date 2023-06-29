import * as database from './logic/browserDatabaseScope'

export const rootStoreScope = database.createGenesisStore({
  version: '0.0.1-alpha',
})



import * as database from './logic/database'


export const rootStoreScope = database.createStoreScope(
    {
        key: 'parentScope.key',
        db: database.initDbStore('rootDb')
    },
    {
        ddwd: 'childScope.key',
    }
)



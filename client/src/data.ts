import { empty } from '@most/core'
import * as database from './logic/database'


export const rootStore = database.createStoreScope(
    {
        key: 'parentScope.key',
        db: database.initDbStore('rootDb')
    },
    {
        ddwd: 'childScope.key',
    }
)

export const rootStoreScope = rootStore(empty())


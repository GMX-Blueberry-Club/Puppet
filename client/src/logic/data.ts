import { empty } from '@most/core'
import * as database from './database'

export type IRootScope = database.IScopeConfig<{ version: number; }>

export const rootScope: IRootScope = {
    key: 'parentScope.key',
    initialState: {
        version: 1
    },
    db: database.initDbStore('rootDb'),
}




import { fromPromise } from "@most/core"
import { Stream } from "@most/types"
import { AbiType } from "abitype"
import { request } from "graphql-request"
import { getMappedValue, parseTypeFnMap } from "gmx-middleware-utils"

export type GqlType<T extends string> = { __typename: T }

export type ISchema<T extends GqlType<any>> = {
  [P in keyof T]: T[P] extends any[] ? ISchema<T[P][number]> : T[P] extends GqlType<any> ? ISchema<T[P]> : P extends `__typename` ? string : AbiType
}

export type ISchemaQuery<TSchema, TQuery> = {
  [P in keyof TQuery]: TQuery[P] extends any[]
    ? P extends keyof TSchema ? ISchemaQuery<TSchema[P], TQuery[P]> : never : TQuery[P] extends object
      ? P extends keyof TSchema ? ISchemaQuery<TSchema[P], TQuery[P]> : never : P extends keyof TSchema
        ? TSchema[P] : never
}

export type PrettifyReturn<T> = {
  [K in keyof T]: T[K];
} & {};



export interface IQuerySubgraphConfig {
  subgraph: string
  startBlock?: bigint
}



export const querySubgraph = <Type extends GqlType<any>, TQuery>(
  config: IQuerySubgraphConfig,
  schema: ISchema<Type>,
  query: TQuery
): Stream<PrettifyReturn<ISchemaQuery<Type, TQuery>>[]> => {

  const typeName = schema.__typename as string
  const whereClause = parseWhereClause(query)
  const fieldStructure = parseQueryObject(query)
  const graphDocumentIdentifier = `${typeName.charAt(0).toLowerCase() + typeName.slice(1)}s`

  const entry = `${graphDocumentIdentifier}(first: 1000,where: { _change_block: { number_gte: ${config.startBlock}, ${whereClause} } }) { ${fieldStructure} }`


  const newLogsFilter = fromPromise(
    request({
      document: `{ ${entry} }`,
      url: config.subgraph
    })
      .then((x: any) => {

        if (!(graphDocumentIdentifier in x)) {
          throw new Error(`No ${graphDocumentIdentifier} found in subgraph response`)
        }

        const list: PrettifyReturn<ISchemaQuery<Type, TQuery>>[] = x[graphDocumentIdentifier]

        if (list instanceof Array) {
          return list.map(item => parseResults(item, schema))
        }

        throw new Error(`No ${graphDocumentIdentifier} found in subgraph response`)
      })
  )

  return newLogsFilter
}


// recursively parse a json object to query result
function parseResults(json: any, schema: any) {
  const entity: any = {}
  Object.entries(json).forEach(([key, value]) => {
    const schemaField = schema[key]

    if (typeof value === 'string') {
      const abiType = schemaField
      const parseFn = getMappedValue(parseTypeFnMap, abiType)

      if (key === '__typename') {
        entity[key] = value
        return
      }

      entity[key] = parseFn(value)
    } else if(value instanceof Array) {
      entity[key] = value.map((item, i) => parseResults(item, schemaField))
    } else if(value instanceof Object) {
      entity[key] = parseResults(value, schemaField )
    }

  })
  return entity
}

function parseQueryObject(query: any) {
  const fields: string[] = []
  Object.entries(query).forEach(([key, value]) => {

    if (value instanceof Object) {
      fields.push(`${key} { ${parseQueryObject(value)} }`)
    } else {
      fields.push(key)
    }

  })
  return fields.join(' ')
}

function parseWhereClause(query: any) {
  const where: string[] = []

  Object.entries(query).forEach(([key, value]) => {
    if (typeof value === 'string' || typeof value === 'number') {
      where.push(`${key}: "${value}"`)
    }
  })

  return where.join(', ')
}


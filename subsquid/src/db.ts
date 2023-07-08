import { Database, createDest } from '@subsquid/file-store'
import { Table } from '@subsquid/file-store-json'


// export const db = new TypeormDatabase()
export const db = new Database({
  tables: {
    TransfersTable: new Table<{
      from: string,
      to: string,
      value: bigint
    }>('transfers.jsonl', { lines: true })
  },
  dest: createDest('./data')
})


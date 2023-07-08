import { contract } from './mapping'
import { processor } from './processor'
import { db } from './db'
import { EntityBuffer } from './entityBuffer'
import { Block, Transaction } from './model'

processor.run(db, async (ctx) => {
  for (const block of ctx.blocks) {
    EntityBuffer.add(
      new Block({
        id: block.header.id,
        number: block.header.height,
        timestamp: new Date(block.header.timestamp),
      })
    )

    for (const log of block.logs) {
      if (log.address === '0x489ee077994b6658eafa855c308275ead8097c4a') {
        contract.parseEvent(ctx, log)
      }
    }

    for (const transaction of block.transactions) {
      if (transaction.to === '0x489ee077994b6658eafa855c308275ead8097c4a') {
        contract.parseFunction(ctx, transaction)
      }

      EntityBuffer.add(
        new Transaction({
          id: transaction.id,
          blockNumber: block.header.height,
          blockTimestamp: new Date(block.header.timestamp),
          hash: transaction.hash,
          to: transaction.to,
          from: transaction.from,
          status: transaction.status,
        })
      )
    }
  }

  for (const entities of EntityBuffer.flush()) {
    await ctx.store.insert(entities)
  }
})

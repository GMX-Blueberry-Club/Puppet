import {
  assert,
  describe,
  test,
  clearStore,
  beforeAll,
  afterAll
} from "matchstick-as/assembly/index"
import { Address, Bytes } from "@graphprotocol/graph-ts"
import { EventLog } from "../generated/schema"
import { EventLog as EventLogEvent } from "../generated/EventEmitter/EventEmitter"
import { handleEventLog } from "../src/event-emitter"
import { createEventLogEvent } from "./event-emitter-utils"

// Tests structure (matchstick-as >=0.5.0)
// https://thegraph.com/docs/en/developer/matchstick/#tests-structure-0-5-0

describe("Describe entity assertions", () => {
  beforeAll(() => {
    let msgSender = Address.fromString(
      "0x0000000000000000000000000000000000000001"
    )
    let eventName = "Example string value"
    let eventNameHash = "Example string value"
    let eventData = "ethereum.Tuple Not implemented"
    let newEventLogEvent = createEventLogEvent(
      msgSender,
      eventName,
      eventNameHash,
      eventData
    )
    handleEventLog(newEventLogEvent)
  })

  afterAll(() => {
    clearStore()
  })

  // For more test scenarios, see:
  // https://thegraph.com/docs/en/developer/matchstick/#write-a-unit-test

  test("EventLog created and stored", () => {
    assert.entityCount("EventLog", 1)

    // 0xa16081f360e3847006db660bae1c6d1b2e17ec2a is the default address used in newMockEvent() function
    assert.fieldEquals(
      "EventLog",
      "0xa16081f360e3847006db660bae1c6d1b2e17ec2a-1",
      "msgSender",
      "0x0000000000000000000000000000000000000001"
    )
    assert.fieldEquals(
      "EventLog",
      "0xa16081f360e3847006db660bae1c6d1b2e17ec2a-1",
      "eventName",
      "Example string value"
    )
    assert.fieldEquals(
      "EventLog",
      "0xa16081f360e3847006db660bae1c6d1b2e17ec2a-1",
      "eventNameHash",
      "Example string value"
    )
    assert.fieldEquals(
      "EventLog",
      "0xa16081f360e3847006db660bae1c6d1b2e17ec2a-1",
      "eventData",
      "ethereum.Tuple Not implemented"
    )

    // More assert options:
    // https://thegraph.com/docs/en/developer/matchstick/#asserts
  })
})

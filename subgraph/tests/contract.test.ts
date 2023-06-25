import {
  assert,
  describe,
  test,
  clearStore,
  beforeAll,
  afterAll
} from "matchstick-as/assembly/index"
import { Address, Bytes, BigInt } from "@graphprotocol/graph-ts"
import { ApprovePlugin } from "../generated/schema"
import { ApprovePlugin as ApprovePluginEvent } from "../generated/Contract/Contract"
import { handleApprovePlugin } from "../src/orchestrator"
import { createApprovePluginEvent } from "./contract-utils"

// Tests structure (matchstick-as >=0.5.0)
// https://thegraph.com/docs/en/developer/matchstick/#tests-structure-0-5-0

describe("Describe entity assertions", () => {
  beforeAll(() => {
    let caller = Address.fromString(
      "0x0000000000000000000000000000000000000001"
    )
    let routeTypeKey = Bytes.fromI32(1234567890)
    let newApprovePluginEvent = createApprovePluginEvent(caller, routeTypeKey)
    handleApprovePlugin(newApprovePluginEvent)
  })

  afterAll(() => {
    clearStore()
  })

  // For more test scenarios, see:
  // https://thegraph.com/docs/en/developer/matchstick/#write-a-unit-test

  test("ApprovePlugin created and stored", () => {
    assert.entityCount("ApprovePlugin", 1)

    // 0xa16081f360e3847006db660bae1c6d1b2e17ec2a is the default address used in newMockEvent() function
    assert.fieldEquals(
      "ApprovePlugin",
      "0xa16081f360e3847006db660bae1c6d1b2e17ec2a-1",
      "caller",
      "0x0000000000000000000000000000000000000001"
    )
    assert.fieldEquals(
      "ApprovePlugin",
      "0xa16081f360e3847006db660bae1c6d1b2e17ec2a-1",
      "routeTypeKey",
      "1234567890"
    )

    // More assert options:
    // https://thegraph.com/docs/en/developer/matchstick/#asserts
  })
})

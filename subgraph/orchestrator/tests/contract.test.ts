import {
  assert,
  describe,
  test,
  clearStore,
  beforeAll,
  afterAll
} from "matchstick-as/assembly/index"
import { Address, Bytes, BigInt } from "@graphprotocol/graph-ts"
import { AdjustPosition } from "../generated/schema"
import { AdjustPosition as AdjustPositionEvent } from "../generated/Contract/Contract"
import { handleAdjustPosition } from "../src/contract"
import { createAdjustPositionEvent } from "./contract-utils"

// Tests structure (matchstick-as >=0.5.0)
// https://thegraph.com/docs/en/developer/matchstick/#tests-structure-0-5-0

describe("Describe entity assertions", () => {
  beforeAll(() => {
    let trader = Address.fromString(
      "0x0000000000000000000000000000000000000001"
    )
    let route = Address.fromString("0x0000000000000000000000000000000000000001")
    let isIncrease = "boolean Not implemented"
    let requestKey = Bytes.fromI32(1234567890)
    let routeTypeKey = Bytes.fromI32(1234567890)
    let positionKey = Bytes.fromI32(1234567890)
    let newAdjustPositionEvent = createAdjustPositionEvent(
      trader,
      route,
      isIncrease,
      requestKey,
      routeTypeKey,
      positionKey
    )
    handleAdjustPosition(newAdjustPositionEvent)
  })

  afterAll(() => {
    clearStore()
  })

  // For more test scenarios, see:
  // https://thegraph.com/docs/en/developer/matchstick/#write-a-unit-test

  test("AdjustPosition created and stored", () => {
    assert.entityCount("AdjustPosition", 1)

    // 0xa16081f360e3847006db660bae1c6d1b2e17ec2a is the default address used in newMockEvent() function
    assert.fieldEquals(
      "AdjustPosition",
      "0xa16081f360e3847006db660bae1c6d1b2e17ec2a-1",
      "trader",
      "0x0000000000000000000000000000000000000001"
    )
    assert.fieldEquals(
      "AdjustPosition",
      "0xa16081f360e3847006db660bae1c6d1b2e17ec2a-1",
      "route",
      "0x0000000000000000000000000000000000000001"
    )
    assert.fieldEquals(
      "AdjustPosition",
      "0xa16081f360e3847006db660bae1c6d1b2e17ec2a-1",
      "isIncrease",
      "boolean Not implemented"
    )
    assert.fieldEquals(
      "AdjustPosition",
      "0xa16081f360e3847006db660bae1c6d1b2e17ec2a-1",
      "requestKey",
      "1234567890"
    )
    assert.fieldEquals(
      "AdjustPosition",
      "0xa16081f360e3847006db660bae1c6d1b2e17ec2a-1",
      "routeTypeKey",
      "1234567890"
    )
    assert.fieldEquals(
      "AdjustPosition",
      "0xa16081f360e3847006db660bae1c6d1b2e17ec2a-1",
      "positionKey",
      "1234567890"
    )

    // More assert options:
    // https://thegraph.com/docs/en/developer/matchstick/#asserts
  })
})

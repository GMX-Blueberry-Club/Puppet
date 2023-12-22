import { Address, BigInt, Bytes } from "@graphprotocol/graph-ts"
import { EventLogEventDataStruct } from "../../generated/EventEmitter/EventEmitter"



export function getAddressItem<T extends EventLogEventDataStruct>(logStruct: T, idx: number): Address {
  return logStruct.addressItems.items[idx as i32].value
}

export function getUintItem<T extends EventLogEventDataStruct>(logStruct: T, idx: number): BigInt {
  return logStruct.uintItems.items[idx as i32].value
}

export function getIntItem<T extends EventLogEventDataStruct>(logStruct: T, idx: number): BigInt {
  return logStruct.intItems.items[idx as i32].value
}

export function getBoolItem<T extends EventLogEventDataStruct>(logStruct: T, idx: number): boolean {
  return logStruct.boolItems.items[idx as i32].value
}

export function getBytesItem<T extends EventLogEventDataStruct>(logStruct: T, idx: number): Bytes {
  return logStruct.bytesItems.items[idx as i32].value
}

export function getBytes32Item<T extends EventLogEventDataStruct>(logStruct: T, idx: number): Bytes {
  return logStruct.bytes32Items.items[idx as i32].value
}
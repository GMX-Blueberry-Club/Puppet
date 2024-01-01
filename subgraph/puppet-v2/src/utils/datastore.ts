import { Address, BigInt, Bytes, ethereum } from "@graphprotocol/graph-ts"
import { EventLogEventDataStruct } from "../../generated/EventEmitter/EventEmitter"

export class EventLogEventDataAddressItemsArrayItemsStruct extends ethereum.Tuple {
  get key(): string {
    return this[0].toString()
  }

  get value(): Array<Address> {
    return this[1].toAddressArray()
  }
}


export function getAddressItem<T extends EventLogEventDataStruct>(logStruct: T, idx: number): Address {
  return logStruct.addressItems.items[idx as i32].value
}

export function getAddressItemList<T extends EventLogEventDataStruct>(logStruct: T, idx: number): Address[] {
  return logStruct.addressItems.arrayItems[idx as i32].value
}

export function getUintItem<T extends EventLogEventDataStruct>(logStruct: T, idx: number): BigInt {
  return logStruct.uintItems.items[idx as i32].value
}

export function getUintItemList<T extends EventLogEventDataStruct>(logStruct: T, idx: number): BigInt[] {
  return logStruct.uintItems.arrayItems[idx as i32].value
}

export function getStringItem<T extends EventLogEventDataStruct>(logStruct: T, idx: number): string {
  return logStruct.stringItems.items[idx as i32].value
}

export function getStringItemList<T extends EventLogEventDataStruct>(logStruct: T, idx: number): Array<string> {
  return logStruct.stringItems.arrayItems[idx as i32].value
}

export function getIntItem<T extends EventLogEventDataStruct>(logStruct: T, idx: number): BigInt {
  return logStruct.intItems.items[idx as i32].value
}

export function getIntItemList<T extends EventLogEventDataStruct>(logStruct: T, idx: number): BigInt[] {
  return logStruct.intItems.arrayItems[idx as i32].value
}

export function getBoolItem<T extends EventLogEventDataStruct>(logStruct: T, idx: number): boolean {
  return logStruct.boolItems.items[idx as i32].value
}

export function getBoolItemList<T extends EventLogEventDataStruct>(logStruct: T, idx: number): Array<boolean> {
  return logStruct.boolItems.arrayItems[idx as i32].value
}

export function getBytesItem<T extends EventLogEventDataStruct>(logStruct: T, idx: number): Bytes {
  return logStruct.bytesItems.items[idx as i32].value
}

export function getBytesItemList<T extends EventLogEventDataStruct>(logStruct: T, idx: number): Bytes[] {
  return logStruct.bytesItems.arrayItems[idx as i32].value
}

export function getBytes32Item<T extends EventLogEventDataStruct>(logStruct: T, idx: number): Bytes {
  return logStruct.bytes32Items.items[idx as i32].value
}

export function getBytes32ItemList<T extends EventLogEventDataStruct>(logStruct: T, idx: number): Bytes[] {
  return logStruct.bytes32Items.arrayItems[idx as i32].value
}
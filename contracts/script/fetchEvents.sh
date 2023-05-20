#!/bin/bash

# API_KEY="YOUR_API_KEY"
CONTRACT_ADDRESS="0xb87a436B93fFE9D75c5cFA7bAcFff96430b09868"
EVENT_SIGNATURE_HASH="0xfbabc02389290a451c6e600d05bf9887b99bfad39d8e1237e4e3df042e4941fe" # SetPositionKeeper event signature hash

fetch_logs() {
  JSON_RPC_ENDPOINT="https://arb-mainnet.g.alchemy.com/v2/e3nMHrnIg6XHvR2tOsZ4y3S88ZbW4Ljk"
  
  curl -s -X POST \
    --header "Content-Type: application/json" \
    --data '{"jsonrpc":"2.0","id":1,"method":"eth_getLogs","params":[{"fromBlock": "0x1", "toBlock": "latest", "address": "'$CONTRACT_ADDRESS'", "topics": ["'$EVENT_SIGNATURE_HASH'"]}]}' \
    $JSON_RPC_ENDPOINT
}

fetch_logs | jq '.result | map({logIndex: .logIndex, transactionHash: .transactionHash, data: .data, topics: .topics[1:]})'

# keeper (https://arbiscan.io/address/0xb87a436B93fFE9D75c5cFA7bAcFff96430b09868#readContract) - 0x11D62807dAE812a0F1571243460Bf94325F43BB7
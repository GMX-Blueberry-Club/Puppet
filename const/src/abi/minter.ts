export default [
  {
    inputs: [
      {
        internalType: "address",
        name: "_tokenAddr",
        type: "address"
      },
      {
        internalType: "address",
        name: "_controllerAddr",
        type: "address"
      }
    ],
    stateMutability: "nonpayable",
    type: "constructor"
  },
  {
    inputs: [],
    name: "AlreadyMinted",
    type: "error"
  },
  {
    inputs: [],
    name: "EpochNotEnded",
    type: "error"
  },
  {
    inputs: [],
    name: "GaugeIsKilled",
    type: "error"
  },
  {
    inputs: [],
    name: "GaugeNotAdded",
    type: "error"
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "gauge",
        type: "address"
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "minted",
        type: "uint256"
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "epoch",
        type: "uint256"
      }
    ],
    name: "Minted",
    type: "event"
  },
  {
    inputs: [],
    name: "controller",
    outputs: [
      {
        internalType: "address",
        name: "",
        type: "address"
      }
    ],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "_gauge",
        type: "address"
      }
    ],
    name: "mint",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [
      {
        internalType: "address[]",
        name: "_gauges",
        type: "address[]"
      }
    ],
    name: "mintMany",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256"
      },
      {
        internalType: "address",
        name: "",
        type: "address"
      }
    ],
    name: "minted",
    outputs: [
      {
        internalType: "bool",
        name: "",
        type: "bool"
      }
    ],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [],
    name: "token",
    outputs: [
      {
        internalType: "address",
        name: "",
        type: "address"
      }
    ],
    stateMutability: "view",
    type: "function"
  }
] as const
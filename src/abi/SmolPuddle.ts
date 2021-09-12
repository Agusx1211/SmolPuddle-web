export const SmolPuddleAbi = [
  {
    "inputs": [
      {
        "internalType": "bytes32",
        "name": "",
        "type": "bytes32"
      }
    ],
    "name": "cancel",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      },
      {
        "internalType": "bytes32",
        "name": "",
        "type": "bytes32"
      }
    ],
    "name": "status",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "components": [
          {
            "type": 'address',
            "name": 'seller'
          },
          {
            "type": 'uint256',
            "name": 'orderType'
          },
          {
            "type": 'address',
            "name": 'askToken'
          },
          {
            "type": 'address',
            "name": 'sellToken'
          },
          {
            "type": 'uint256',
            "name": 'askTokenIdOrAmount'
          },
          {
            "type": 'uint256',
            "name": 'sellTokenIdOrAmount'
          },
          {
            "type": 'address[]',
            "name": 'feeRecipients'
          },
          {
            "type": 'uint256[]',
            "name": 'feeAmountsOrIds'
          },
          {
            "type": 'uint256',
            "name": 'expiration'
          },
          {
            "type": 'bytes32',
            "name": 'salt'
          }
        ],
        "type": 'tuple'
      },
      {
        "internalType": "bytes",
        "name": "",
        "type": "bytes"
      }
    ],
    "name": "swap",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  }
]

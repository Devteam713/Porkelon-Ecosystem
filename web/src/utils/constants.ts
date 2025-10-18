export const POLYGON_RPC = 'https://rpc-amoy.polygon.technology/';
export const CHAIN_ID = 80002; // Amoy testnet (use 137 for mainnet)
export const PRESALE_CONTRACT = '0xYourPresaleContractAddressHere'; // Replace with actual address
export const TOKEN_CONTRACT = '0x7f024bd81c22dafae5ecca46912acd94511210d8';
export const PRICE_PER_PORK = 0.00005; // MATIC per PORK
export const ABI = [
  {
    inputs: [{ internalType: 'uint256', name: 'amount', type: 'uint256' }],
    name: 'buyTokens',
    outputs: [],
    stateMutability: 'payable',
    type: 'function',
  },
];

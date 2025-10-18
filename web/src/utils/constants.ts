// JSON ABI type for type-safe contract interactions
interface ContractMethod {
  inputs: { internalType: string; name: string; type: string }[];
  name: string;
  outputs: { internalType: string; name: string; type: string }[];
  stateMutability: 'payable' | 'nonpayable' | 'view' | 'pure';
  type: 'function';
}

export const POLYGON_RPC: string = 'https://rpc-amoy.polygon.technology/';
export const CHAIN_ID: number = 80002; // Amoy testnet (use 137 for mainnet)
export const PRESALE_CONTRACT: `0x${string}` = '0xYourPresaleContractAddressHere'; // Replace with actual address
export const TOKEN_CONTRACT: `0x${string}` = '0x7f024bd81c22dafae5ecca46912acd94511210d8';
export const PRICE_PER_PORK: number = 0.00005; // MATIC per PORK
export const ABI: ContractMethod[] = [
  {
    inputs: [{ internalType: 'uint256', name: 'amount', type: 'uint256' }],
    name: 'buyTokens',
    outputs: [],
    stateMutability: 'payable',
    type: 'function',
  },
];

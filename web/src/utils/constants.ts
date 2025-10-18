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
export const PRICE_PER_PORK: number = 0.00005; // MATIC per PORK
export const ABI: ContractMethod[] = [
  {
    inputs: [{ internalType: 'uint256', name: 'amount', type: 'uint256' }],
    name: 'buyTokens',
    outputs: [],
    stateMutability: 'payable',
    type: 'function',
  },
  {
    inputs: [],
    name: 'totalRaised',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
];

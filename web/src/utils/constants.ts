interface ContractMethod {
  inputs: { internalType: string; name: string; type: string }[];
  name: string;
  outputs: { internalType: string; name: string; type: string }[];
  stateMutability: 'payable' | 'nonpayable' | 'view' | 'pure';
  type: 'function';
}

export const POLYGON_RPC: string = 'https://rpc-amoy.polygon.technology/';
export const CHAIN_ID: number = 80002; // Amoy testnet (use 137 for mainnet)
export const PRESALE_CONTRACT: `0x${string}` = '0xYourPresaleContractAddressHere';
export const TOKEN_CONTRACT: `0x${string}` = '0x7f024bd81c22dafae5ecca46912acd94511210d8';
export const STAKING_CONTRACT: `0x${string}` = '0xYourStakingContractAddressHere';
export const LIQUIDITY_CONTRACT: `0x${string}` = '0xYourLiquidityContractAddressHere'; // e.g., Uniswap Router
export const PRICE_PER_PORK: number = 0.00005; // MATIC per PORK
export const ABI: ContractMethod[] = [
  // Presale
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
  // Token
  {
    inputs: [{ internalType: 'uint256', name: 'amount', type: 'uint256' }],
    name: 'mint',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'address', name: 'account', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  // Staking
  {
    inputs: [{ internalType: 'uint256', name: 'amount', type: 'uint256' }],
    name: 'stake',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'address', name: 'account', type: 'address' }],
    name: 'stakedBalance',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  // Liquidity
  {
    inputs: [
      { internalType: 'uint256', name: 'tokenAmount', type: 'uint256' },
      { internalType: 'uint256', name: 'maticAmount', type: 'uint256' },
    ],
    name: 'addLiquidity',
    outputs: [],
    stateMutability: 'payable',
    type: 'function',
  },
];

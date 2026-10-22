/**
 * Porkelon presale frontend constants — Base Sepolia deployment.
 *
 * Payment token: USDC (6 decimals) at 0x036CbD53842c5426634e7929541eC2318f3dCF7e
 * PORK: 18 decimals. Price: 66,666.67 PORK per 1 USDC.
 */
interface ContractMethod {
  inputs: { internalType: string; name: string; type: string }[];
  name: string;
  outputs: { internalType: string; name: string; type: string }[];
  stateMutability: 'payable' | 'nonpayable' | 'view' | 'pure';
  type: 'function';
}

export const BASE_SEPOLIA_RPC: string = 'https://sepolia.base.org';
export const BASE_SEPOLIA_CHAIN_ID: number = 84532;

export const USDC_DECIMALS = 6;
export const PORK_DECIMALS = 18;

/** PORK per 1 USDC (human-readable). */
export const PORK_PER_USDC: number = 66666.67;

/** Presale window (human-readable, America/Chicago). */
export const PRESALE_START_LABEL = 'Thu Oct 22, 2026 10:00 AM CDT';
export const PRESALE_END_LABEL = 'Sat Nov 21, 2026 9:00 AM CST';

/** Minimal ERC20 ABI (USDC approve / balance / allowance). */
export const ERC20_ABI: ContractMethod[] = [
  {
    inputs: [{ internalType: 'address', name: 'account', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'address', name: 'owner', type: 'address' },
      { internalType: 'address', name: 'spender', type: 'address' },
    ],
    name: 'allowance',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'address', name: 'spender', type: 'address' },
      { internalType: 'uint256', name: 'amount', type: 'uint256' },
    ],
    name: 'approve',
    outputs: [{ internalType: 'bool', name: '', type: 'bool' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [],
    name: 'decimals',
    outputs: [{ internalType: 'uint8', name: '', type: 'uint8' }],
    stateMutability: 'view',
    type: 'function',
  },
];

/** PresaleEngine ABI — only the functions the UI needs. */
export const PRESALE_ABI: ContractMethod[] = [
  {
    inputs: [
      { internalType: 'address', name: '_beneficiary', type: 'address' },
      { internalType: 'uint256', name: '_amountIn', type: 'uint256' },
    ],
    name: 'buyTokens',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [],
    name: 'claimTokens',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [],
    name: 'presaleOpen',
    outputs: [{ internalType: 'bool', name: '', type: 'bool' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'getRemainingCap',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'totalCollected',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'address', name: '', type: 'address' }],
    name: 'claimableTokens',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'address', name: '', type: 'address' }],
    name: 'contributions',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'START_TIMESTAMP',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'END_TIMESTAMP',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'HARDCAP',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'SOFTCAP',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
];

// --- Legacy exports (kept so untouched components still compile) ---
export const POLYGON_RPC: string = 'https://rpc-amoy.polygon.technology/';
export const CHAIN_ID: number = 80002;
export const PRESALE_CONTRACT: `0x${string}` = '0xYourPresaleContractAddressHere';
export const TOKEN_CONTRACT: `0x${string}` = '0x7f024bd81c22dafae5ecca46912acd94511210d8';
export const STAKING_CONTRACT: `0x${string}` = '0xYourStakingContractAddressHere';
export const LIQUIDITY_CONTRACT: `0x${string}` = '0xYourLiquidityContractAddressHere';
export const TIMELOCK_CONTRACT: `0x${string}` = '0xYourTimelockContractAddressHere';
export const UNISWAP_ROUTER: `0x${string}` = '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45';
export const PRICE_PER_PORK: number = 0.00005;
export const ABI: ContractMethod[] = [...ERC20_ABI, ...PRESALE_ABI];

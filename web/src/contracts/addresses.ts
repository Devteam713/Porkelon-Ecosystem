// Contract addresses for the Porkelon ecosystem.
// Copy addresses.example.ts to addresses.ts and fill in the real addresses
// after running the deploy script (it writes deployments/amoy.json).
//
// Until then, every address is undefined and the UI shows "coming soon"
// states instead of attempting broken contract calls.

export interface ContractAddresses {
  PorkelonToken?: `0x${string}`;
  PorkelonNFT?: `0x${string}`;
  PorkelonMarketplace?: `0x${string}`;
  StakingRewards?: `0x${string}`;
  LiquidityMining?: `0x${string}`;
  PresaleVesting?: `0x${string}`;
  PresaleEngine?: `0x${string}`;
  MockUSDC?: `0x${string}`;
}

// Filled in after deployment. See addresses.example.ts.
export const AMOY_ADDRESSES: ContractAddresses = {
  PorkelonToken: undefined,
  PorkelonNFT: undefined,
  PorkelonMarketplace: undefined,
  StakingRewards: undefined,
  LiquidityMining: undefined,
  PresaleVesting: undefined,
  PresaleEngine: undefined,
  MockUSDC: undefined,
};

export const AMOY_CHAIN_ID = 80002;
export const AMOY_CHAIN_HEX = '0x13882';

/** Base Sepolia testnet — live deployment (2026-10-19). */
export const BASE_SEPOLIA_ADDRESSES: ContractAddresses = {
  PorkelonToken: '0xbf05B832FDE3cA16d989D422f823BecF8B7d6dB0',
  PorkelonNFT: '0xfDC5BB4e07edEf229EFFaEf3Ba2033ef3F358889',
  PorkelonMarketplace: '0x8A2b46f6D4cb1Fba3cF490bEDafEdD1e053b6DF6',
  StakingRewards: '0x594C38Bf86Cc3912EcDE3bD85b3d82AD71014FC1',
  LiquidityMining: '0xa6a9A968c3010E14F0E95Edf92D40edEC46C60c2',
  PresaleVesting: '0x9205321562Fd10A728826956615fFADB7a5F0dD5',
  PresaleEngine: '0xb6dFd3E2e3474d5A45Db24d36d4e8b07De8d73Fe',
  // Real Circle USDC on Base Sepolia (payment token for the presale).
  MockUSDC: '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
};

export const BASE_SEPOLIA_CHAIN_ID = 84532;
export const BASE_SEPOLIA_CHAIN_HEX = '0x14a34';

/** Polygon mainnet — live PORK token (verified on Polygonscan). */
export const MAINNET_ADDRESSES: ContractAddresses = {
  PorkelonToken: '0xBA4284495CE3B8C029C2CBAbc821526464A93CA9',
};

export const MAINNET_CHAIN_ID = 137;
export const MAINNET_CHAIN_HEX = '0x89';

/** True when the core contracts (token + presale) have addresses configured. */
export const CONTRACTS_DEPLOYED =
  !!BASE_SEPOLIA_ADDRESSES.PorkelonToken && !!BASE_SEPOLIA_ADDRESSES.PresaleEngine;

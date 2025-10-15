// src/hooks/useWagmiContracts.ts
import { useProvider, useSigner, useAccount, useNetwork } from "wagmi";
import { ethers } from "ethers";

// If you generated typechain types in your monorepo, import them:
// import { PorkelonToken, LiquidityMining, StakingRewards, PresaleVesting, PorkelonNFT } from "../../../typechain";

// Fallback: import ABIs (JSON) compiled by Hardhat/artifacts
import PorkABI from "../abis/PorkelonToken.json";
import LiquidityMiningABI from "../abis/LiquidityMining.json";
import StakingABI from "../abis/StakingRewards.json";
import PresaleABI from "../abis/PresaleVesting.json";
import NFTABI from "../abis/PorkelonNFT.json";
import RouterABI from "../abis/Router.json";

const PORK_ADDR = import.meta.env.VITE_APP_PORK_ADDRESS!;
const LIQ_MINING_ADDR = import.meta.env.VITE_APP_LIQUIDITY_MINING!;
const STAKING_ADDR = import.meta.env.VITE_APP_STAKING!;
const PRESALE_ADDR = import.meta.env.VITE_APP_PRESALE!;
const NFT_ADDR = import.meta.env.VITE_APP_NFT!;
const ROUTER_ADDR = import.meta.env.VITE_APP_ROUTER!;

/**
 * Returns ethers.Contract instances wired to signer (if connected) or provider.
 * Prefer TypeChain-generated contract types when available for compile-time safety.
 */
export function useWagmiContracts() {
  const provider = useProvider();
  const signerData = useSigner();
  const signer = signerData.data ?? undefined;
  const { address } = useAccount();
  const { chain } = useNetwork();

  const providerOrSigner = signer ?? provider;

  // If you have TypeChain types, cast like:
  // const pork = new ethers.Contract(PORK_ADDR, PorkABI.abi, providerOrSigner) as unknown as PorkelonToken;
  const pork = new ethers.Contract(PORK_ADDR, PorkABI.abi, providerOrSigner);
  const liquidityMining = new ethers.Contract(LIQU_MINING_ADDR, LiquidityMiningABI.abi, providerOrSigner);
  const staking = new ethers.Contract(STAKING_ADDR, StakingABI.abi, providerOrSigner);
  const presale = new ethers.Contract(PRESALE_ADDR, PresaleABI.abi, providerOrSigner);
  const nft = new ethers.Contract(NFT_ADDR, NFTABI.abi, providerOrSigner);
  const router = new ethers.Contract(ROUTER_ADDR, RouterABI.abi, providerOrSigner);

  return {
    provider,
    signer,
    account: address,
    chain,
    pork,
    liquidityMining,
    staking,
    presale,
    nft,
    router,
  };
}

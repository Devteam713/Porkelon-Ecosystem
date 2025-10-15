import PorkABI from "../abis/PorkelonToken.json";
import LiquidityMiningABI from "../abis/LiquidityMining.json";
import StakingABI from "../abis/StakingRewards.json";
import PresaleABI from "../abis/PresaleVesting.json";
import NFTABI from "../abis/PorkelonNFT.json";
import RouterABI from "../abis/Router.json";
import { useProvider, useSigner } from "wagmi";
import { ethers } from "ethers";

const PORK = import.meta.env.VITE_APP_PORK_ADDRESS!;
const LIQUIDITY_MINING = import.meta.env.VITE_APP_LIQUIDITY_MINING!;
const STAKING = import.meta.env.VITE_APP_STAKING!;
const PRESALE = import.meta.env.VITE_APP_PRESALE!;
const NFT = import.meta.env.VITE_APP_NFT!;
const ROUTER = import.meta.env.VITE_APP_ROUTER!;

export function useContractInstances() {
  const provider = useProvider();
  const signer = useSigner();
  const signerOrProvider = signer.data ?? provider;

  const pork = new ethers.Contract(PORK, PorkABI.abi, signerOrProvider);
  const mining = new ethers.Contract(LIQUIDITY_MINING, LiquidityMiningABI.abi, signerOrProvider);
  const staking = new ethers.Contract(STAKING, StakingABI.abi, signerOrProvider);
  const presale = new ethers.Contract(PRESALE, PresaleABI.abi, signerOrProvider);
  const nft = new ethers.Contract(NFT, NFTABI.abi, signerOrProvider);
  const router = new ethers.Contract(ROUTER, RouterABI.abi, signerOrProvider);

  return { pork, mining, staking, presale, nft, router, provider, signer };
}

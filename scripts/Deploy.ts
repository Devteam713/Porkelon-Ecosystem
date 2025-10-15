import { ethers } from "hardhat";
import * as dotenv from "dotenv";
dotenv.config();

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deployer:", await deployer.getAddress());

  const devWallet = process.env.DEV_WALLET!;
  const usdt = process.env.USDT_ADDRESS!;
  const router = process.env.ROUTER_ADDRESS!;

  // === Deploy Token ===
  const Token = await ethers.getContractFactory("PorkelonToken");
  const token = await Token.deploy(devWallet);
  await token.deployed();
  console.log("PORK:", token.target);

  // === Presale ===
  const now = Math.floor(Date.now() / 1000);
  const Presale = await ethers.getContractFactory("PresaleVesting");
  const pricePerToken = ethers.parseUnits("0.01", 6) * BigInt(10 ** 18);
  const presale = await Presale.deploy(
    token.target,
    usdt,
    pricePerToken,
    now + 60,
    now + 60 * 60 * 24,
    60 * 60 * 24 * 30
  );
  await presale.deployed();
  console.log("Presale:", presale.target);

  // === Staking ===
  const Staking = await ethers.getContractFactory("StakingRewards");
  const staking = await Staking.deploy(token.target, token.target);
  await staking.deployed();
  console.log("Staking:", staking.target);

  // === NFT & Marketplace ===
  const NFT = await ethers.getContractFactory("PorkelonNFT");
  const nft = await NFT.deploy(token.target, 10000, 500);
  await nft.deployed();
  console.log("NFT:", nft.target);

  const Market = await ethers.getContractFactory("PorkelonMarketplace");
  const market = await Market.deploy(await deployer.getAddress());
  await market.deployed();
  console.log("Marketplace:", market.target);

  // Fund presale/staking
  const presaleAmt = ethers.parseUnits("2_000_000_000", 18);
  const stakeAmt = ethers.parseUnits("1_000_000_000", 18);
  await token.transfer(presale.target, presaleAmt);
  await token.transfer(staking.target, stakeAmt);
  console.log("Seeded presale + staking pools");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

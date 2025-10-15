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
// --- after deploying token, presale, staking, nft, market ---
const LiquidityMining = await ethers.getContractFactory("LiquidityMining");
const lpPairAddress = process.env.PAIR_ADDRESS!; // the PORK/WMATIC or PORK/USDT LP token address
const liquidityMining = await LiquidityMining.deploy(lpPairAddress, token.target);
await liquidityMining.deployed();
console.log("LiquidityMining:", liquidityMining.target);

// Fund the liquidity mining reward pool:
// Example: netTotalRewards = 5_000_000 PORK
const netTotal = ethers.parseUnits("5000000", 18);

// compute gross needed on JS side to match TAX_BPS = 100 (1%)
const TAX_BPS = 100n;
const BPS = 10000n;
const NET_DENOM = BPS - TAX_BPS; // 9900
// gross = ceil(netTotal * BPS / NET_DENOM)
const grossNumerator = netTotal * BigInt(BPS);
let gross = grossNumerator / BigInt(NET_DENOM);
if (grossNumerator % BigInt(NET_DENOM) !== 0n) gross = gross + 1n;

console.log("Need to transfer gross PORK:", gross.toString());

// Transfer gross PORK from deployer (deployer must hold enough PORK)
const tokenContract = await ethers.getContractAt("PorkelonToken", token.target);
await (await tokenContract.transfer(liquidityMining.target, gross)).wait();
console.log("Funded LiquidityMining with gross PORK");

// Notify reward amount (net) and duration (e.g., 30 days)
const durationSeconds = 60 * 60 * 24 * 30;
await (await liquidityMining.notifyRewardAmount(netTotal, durationSeconds)).wait();
console.log("LiquidityMining configured to distribute net", netTotal.toString(), "over", durationSeconds, "seconds");

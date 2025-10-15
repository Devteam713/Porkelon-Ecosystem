import { ethers } from "hardhat";
import * as dotenv from "dotenv";
dotenv.config();

/**
 * Small helper to ensure required env vars exist and provide a clear error.
 */
function requireEnv(key: string): string {
  const v = process.env[key];
  if (!v) throw new Error(`Missing required environment variable: ${key}`);
  return v;
}

/**
 * Some contract objects in different hardhat/ethers adapters expose either
 * `.address` or `.target` as the deployed address. Normalize access.
 */
function addressOf(contract: any): string {
  return (contract && (contract.target ?? contract.address)) as string;
}

async function deployToken(devWallet: string) {
  const Factory = await ethers.getContractFactory("PorkelonToken");
  const token = await Factory.deploy(devWallet);
  await token.deployed();
  console.log("PorkelonToken:", addressOf(token));
  return token;
}

async function deployPresale(tokenAddr: string, usdtAddr: string) {
  const now = Math.floor(Date.now() / 1000);
  const Factory = await ethers.getContractFactory("PresaleVesting");

  // USDT typically has 6 decimals, so price is represented in USDT units (6 decimals).
  // Adjust according to your contract's expected units if different.
  const pricePerToken = ethers.parseUnits("0.01", 6); // 0.01 USDT

  const presale = await Factory.deploy(
    tokenAddr,
    usdtAddr,
    pricePerToken,
    now + 60, // start in 1 minute
    now + 60 * 60 * 24, // end in 24 hours
    60 * 60 * 24 * 30 // vesting duration (30 days)
  );
  await presale.deployed();
  console.log("PresaleVesting:", addressOf(presale));
  return presale;
}

async function deployStaking(tokenAddr: string) {
  const Factory = await ethers.getContractFactory("StakingRewards");
  const staking = await Factory.deploy(tokenAddr, tokenAddr);
  await staking.deployed();
  console.log("StakingRewards:", addressOf(staking));
  return staking;
}

async function deployNFTAndMarketplace(tokenAddr: string, deployerAddr: string) {
  const NFTFactory = await ethers.getContractFactory("PorkelonNFT");
  const nft = await NFTFactory.deploy(tokenAddr, 10_000, 500);
  await nft.deployed();
  console.log("PorkelonNFT:", addressOf(nft));

  const MarketFactory = await ethers.getContractFactory("PorkelonMarketplace");
  const market = await MarketFactory.deploy(deployerAddr);
  await market.deployed();
  console.log("PorkelonMarketplace:", addressOf(market));

  return { nft, market };
}

async function deployLiquidityMining(lpPairAddr: string, tokenAddr: string) {
  const Factory = await ethers.getContractFactory("LiquidityMining");
  const lm = await Factory.deploy(lpPairAddr, tokenAddr);
  await lm.deployed();
  console.log("LiquidityMining:", addressOf(lm));
  return lm;
}

/**
 * Fund presale, staking, and liquidity mining reward pool.
 *
 * Note:
 * - All amounts use 18 decimals for PORK (adjust if token has different decimals).
 * - Liquidity mining requires transferring the gross amount such that after tax
 *   the net reward equals netTotal. We compute gross = ceil(netTotal * BPS / (BPS - TAX_BPS))
 */
async function fundEverything(
  tokenContract: any,
  presale: any,
  staking: any,
  liquidityMining: any
) {
  // amounts to seed pools
  const presaleAmt = ethers.parseUnits("2000000000", 18); // 2_000_000_000
  const stakeAmt = ethers.parseUnits("1000000000", 18); // 1_000_000_000

  // Transfers: wait for each tx to be mined and fail fast if any fail.
  console.log("Seeding presale and staking pools...");
  await (await tokenContract.transfer(addressOf(presale), presaleAmt)).wait();
  await (await tokenContract.transfer(addressOf(staking), stakeAmt)).wait();
  console.log("Seeded presale + staking pools");

  // Liquidity mining reward pool
  const netTotal = ethers.parseUnits("5000000", 18); // net rewards: 5_000_000
  const TAX_BPS = 100n; // 1%
  const BPS = 10000n;
  const NET_DENOM = BPS - TAX_BPS; // 9900

  // ethers.parseUnits returns a bigint (v6), ensure all ops use BigInt
  const netTotalBig = BigInt(netTotal.toString());

  // gross = ceil(netTotal * BPS / NET_DENOM)
  const numerator = netTotalBig * BPS;
  let grossBig = numerator / NET_DENOM;
  if (numerator % NET_DENOM !== 0n) grossBig += 1n;

  // convert grossBig back to ethers BigInt representation (it already is)
  const gross = grossBig;

  console.log("Gross PORK required (to cover tax):", gross.toString());

  // Transfer gross tokens to liquidity mining contract
  console.log("Transferring gross PORK to LiquidityMining...");
  await (await tokenContract.transfer(addressOf(liquidityMining), gross)).wait();
  console.log("Funded LiquidityMining with gross PORK");

  // Notify reward amount (net) and duration
  const durationSeconds = 60 * 60 * 24 * 30; // 30 days
  console.log(`Notifying LiquidityMining to distribute net ${netTotal.toString()} over ${durationSeconds}s`);
  await (await liquidityMining.notifyRewardAmount(netTotal, durationSeconds)).wait();
  console.log("LiquidityMining configured");
}

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deployer:", await deployer.getAddress());

  // required env vars
  const devWallet = requireEnv("DEV_WALLET");
  const usdt = requireEnv("USDT_ADDRESS");
  const lpPair = requireEnv("PAIR_ADDRESS");

  // Deploy core contracts (sequentially - safer and easier to reason about on first run)
  const token = await deployToken(devWallet);
  const presale = await deployPresale(addressOf(token), usdt);
  const staking = await deployStaking(addressOf(token));
  const { nft, market } = await deployNFTAndMarketplace(addressOf(token), await deployer.getAddress());
  const liquidityMining = await deployLiquidityMining(lpPair, addressOf(token));

  // Prepare token contract instance for transfers and calls
  const tokenContract = await ethers.getContractAt("PorkelonToken", addressOf(token));

  // Fund presale, staking and liquidity mining
  await fundEverything(tokenContract, presale, staking, liquidityMining);

  console.log("All contracts deployed and configured successfully.");
}

main().catch((err) => {
  console.error("Deployment script failed:", err);
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

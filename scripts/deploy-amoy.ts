/**
 * Porkelon Ecosystem — Polygon Amoy Testnet Deployment
 *
 * Usage:
 *   1. cp .env.example .env
 *   2. Fill in DEPLOYER_PRIVATE_KEY (testnet-only wallet!) in .env
 *   3. npx hardhat run scripts/deploy-amoy.ts --network amoy
 *
 * Output: deployed addresses are written to deployments/amoy.json
 *         (used by the web frontend).
 */
import { ethers, upgrades, run } from "hardhat";
import * as fs from "fs";
import * as path from "path";

// Verify a contract on AmoyScan. Skips gracefully if no API key or already verified.
async function verify(address: string, args: any[], label: string) {
  if (!process.env.POLYGONSCAN_API_KEY) {
    console.log(`   ⏭ Skipping verification for ${label} (no POLYGONSCAN_API_KEY)`);
    return;
  }
  console.log(`   🔍 Verifying ${label}...`);
  try {
    await run("verify:verify", { address, constructorArguments: args });
    console.log(`   ✅ ${label} verified`);
  } catch (err: any) {
    const msg = err?.message || String(err);
    if (msg.includes("Already Verified") || msg.includes("already verified")) {
      console.log(`   ✅ ${label} already verified`);
    } else {
      console.log(`   ⚠ Verification failed for ${label}: ${msg.slice(0, 120)}`);
    }
  }
}

async function main() {
  const [deployer] = await ethers.getSigners();
  const deployerAddr = await deployer.getAddress();
  console.log("Deployer:", deployerAddr);

  const balance = await ethers.provider.getBalance(deployerAddr);
  console.log("Balance:", ethers.formatEther(balance), "MATIC");
  if (balance === 0n) {
    throw new Error("Deployer has no Amoy MATIC. Get some from https://faucet.polygon.technology/");
  }

  const now = Math.floor(Date.now() / 1000);
  const addresses: Record<string, string> = {};

  // Team wallets (override via .env). Provided by Erik 2026-10-14.
  const TEAM_WALLET = process.env.TEAM_WALLET || "0xA0bFf660B20466F11E659dd948e2F18152E185bF";
  const MARKETING_WALLET = process.env.MARKETING_WALLET || "0xA0bFf660B20466F11E659dd948e2F18152E185bF";
  const LIQUIDITY_WALLET = process.env.LIQUIDITY_WALLET || "0x23cE6D1E06D8509A5668e9E1602de1c2b19ba3a2";
  const FUNDS_WALLET = process.env.FUNDS_WALLET || "0xA0bFf660B20466F11E659dd948e2F18152E185bF";
  console.log("Team wallets:");
  console.log("  TEAM:", TEAM_WALLET);
  console.log("  MARKETING:", MARKETING_WALLET);
  console.log("  LIQUIDITY:", LIQUIDITY_WALLET);

  // ── 1. Porkelon Token (UUPS upgradeable) ──────────────────────────
  console.log("\n1/7 Deploying Porkelon token (UUPS proxy)...");
  const Porkelon = await ethers.getContractFactory("Porkelon");
  const porkelon = await upgrades.deployProxy(Porkelon, [deployerAddr], { kind: "uups" });
  await porkelon.waitForDeployment();
  addresses.PorkelonToken = await porkelon.getAddress();
  console.log("   PorkelonToken:", addresses.PorkelonToken);

  // ── 2. Porkelon NFT ───────────────────────────────────────────────
  console.log("\n2/7 Deploying PorkelonNFT...");
  const PorkelonNFT = await ethers.getContractFactory("PorkelonNFT");
  const nft = await PorkelonNFT.deploy(
    "Porkelon",          // name
    "PKLN-NFT",          // symbol
    10000,               // maxSupply
    500,                 // 5% default royalty (bps)
    TEAM_WALLET          // initialOwner
  );
  await nft.waitForDeployment();
  addresses.PorkelonNFT = await nft.getAddress();
  console.log("   PorkelonNFT:", addresses.PorkelonNFT);

  // ── 3. Marketplace ────────────────────────────────────────────────
  console.log("\n3/7 Deploying PorkelonMarketplace...");
  const Marketplace = await ethers.getContractFactory("PorkelonMarketplace");
  const marketplace = await Marketplace.deploy(MARKETING_WALLET); // feeRecipient
  await marketplace.waitForDeployment();
  addresses.PorkelonMarketplace = await marketplace.getAddress();
  console.log("   PorkelonMarketplace:", addresses.PorkelonMarketplace);

  // ── 4. StakingRewards (PORK staking, PORK rewards) ─────────────────
  console.log("\n4/7 Deploying StakingRewards...");
  const StakingRewards = await ethers.getContractFactory("StakingRewards");
  const staking = await StakingRewards.deploy(
    addresses.PorkelonToken, // stakingToken
    addresses.PorkelonToken  // rewardsToken
  );
  await staking.waitForDeployment();
  addresses.StakingRewards = await staking.getAddress();
  console.log("   StakingRewards:", addresses.StakingRewards);

  // ── 5. LiquidityMining ────────────────────────────────────────────
  console.log("\n5/7 Deploying LiquidityMining...");
  const LiquidityMining = await ethers.getContractFactory("LiquidityMining");
  const mining = await LiquidityMining.deploy(addresses.PorkelonToken); // rewardToken
  await mining.waitForDeployment();
  addresses.LiquidityMining = await mining.getAddress();
  console.log("   LiquidityMining:", addresses.LiquidityMining);
  // Note: call setLpToken(lpTokenAddress) after LP token exists.

  // ── 6. PresaleVesting ─────────────────────────────────────────────
  // NOTE: Replace USDC_AMOY with the real Amoy USDC (or a mock) before mainnet.
  const USDC_AMOY = process.env.USDC_AMOY || ethers.ZeroAddress;
  if (USDC_AMOY === ethers.ZeroAddress) {
    console.log("\n   ⚠ USDC_AMOY not set — deploying a MockERC20 as payment token for testnet.");
  }
  let paymentToken = USDC_AMOY;
  if (paymentToken === ethers.ZeroAddress) {
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    const mock = await MockERC20.deploy("Mock USDC", "mUSDC");
    await mock.waitForDeployment();
    paymentToken = await mock.getAddress();
    addresses.MockUSDC = paymentToken;
    console.log("   MockUSDC:", paymentToken);
  }

  console.log("\n6/7 Deploying PresaleVesting...");
  const PresaleVesting = await ethers.getContractFactory("PresaleVesting");
  // Presale pricing: PORK_PER_USDC = how many PORK tokens 1 USDC buys.
  //   e.g. $0.000015/PORK  →  PORK_PER_USDC=66666.67
  //   ⚠ DO NOT set a fractional value like 0.000015 here — that would price
  //   PORK at $66,666 each. The script aborts if PORK_PER_USDC < 1.
  // Override via env: PRESALE_START (unix), PRESALE_DAYS, PORK_PER_USDC.
  const saleStart = parseInt(process.env.PRESALE_START || "1791990000", 10); // 2026-10-14 10:00 CDT
  if (saleStart * 1000 < Date.now()) {
    throw new Error(
      `PRESALE_START (${new Date(saleStart * 1000).toISOString()}) is in the past. ` +
      `Set PRESALE_START to a future unix timestamp.`
    );
  }
  const saleDays = parseInt(process.env.PRESALE_DAYS || "30", 10);
  const saleEnd = saleStart + saleDays * 86400;
  const porkPerUsdc = process.env.PORK_PER_USDC || "66666.67";
  if (parseFloat(porkPerUsdc) < 1) {
    throw new Error(
      `PORK_PER_USDC=${porkPerUsdc} looks inverted (PORK per USDC should be >> 1). ` +
      `For $0.000015/PORK use PORK_PER_USDC=66666.67. ` +
      `Aborting instead of deploying a broken presale price.`
    );
  }
  console.log(`   Sale: ${new Date(saleStart * 1000).toISOString()} → ${new Date(saleEnd * 1000).toISOString()} (${saleDays}d @ ${porkPerUsdc} PORK/USDC)`);
  // pricePerToken = USDC units (6dp) per 1 PORK: (1 / porkPerUsdc) * 1e6
  const pricePerToken = BigInt(Math.round((1 / parseFloat(porkPerUsdc)) * 1e6));
  const vesting = await PresaleVesting.deploy(
    addresses.PorkelonToken,                 // pork
    paymentToken,                            // paymentToken
    pricePerToken,                           // payment per PORK (from PORK_PER_USDC)
    saleStart,
    saleEnd,
    30 * 86400                               // 30-day linear vesting
  );
  await vesting.waitForDeployment();
  addresses.PresaleVesting = await vesting.getAddress();
  console.log("   PresaleVesting:", addresses.PresaleVesting);

  // ── 7. PresaleEngine ──────────────────────────────────────────────
  // NOTE: Replace with the real Amoy DEX router (e.g. QuickSwap/UniswapV2) if testing LP.
  const ROUTER_AMOY = process.env.ROUTER_AMOY || ethers.ZeroAddress;
  console.log("\n7/7 Deploying PresaleEngine...");
  const PresaleEngine = await ethers.getContractFactory("PresaleEngine");
  // PORK_RATE: buyTokens does porkAmount = usdcUnits * PORK_RATE.
  // 1 USDC (1e6 units) → 66666.67 PORK (6.666667e22 wei): PORK_RATE = 6.666667e22 / 1e6 = 6.666667e16
  const porkRate = BigInt(Math.round(parseFloat(porkPerUsdc) * 1e18)) / BigInt(1e6);
  const engine = await PresaleEngine.deploy(
    paymentToken,                            // paymentToken
    addresses.PorkelonToken,                 // porkToken
    ROUTER_AMOY,                             // router (zero = finalize will revert; set for real LP tests)
    porkRate,                                // PORK per USDC (from PORK_PER_USDC)
    saleStart,                               // startTimestamp
    ethers.parseUnits("5000", 6),            // softcap (assumes 6-decimal USDC)
    ethers.parseUnits("50000", 6),           // hardcap
    saleEnd,                                 // endTimestamp
    LIQUIDITY_WALLET                         // lpRecipient
  );
  await engine.waitForDeployment();
  addresses.PresaleEngine = await engine.getAddress();
  console.log("   PresaleEngine:", addresses.PresaleEngine);

  // ── Save ──────────────────────────────────────────────────────────
  const outDir = path.join(__dirname, "..", "deployments");
  fs.mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, "amoy.json");
  fs.writeFileSync(outPath, JSON.stringify({
    network: "polygonAmoy",
    chainId: 80002,
    deployer: deployerAddr,
    deployedAt: new Date().toISOString(),
    contracts: addresses,
  }, null, 2));
  console.log("\n✅ Addresses written to", outPath);

  // ── Verify on AmoyScan ────────────────────────────────────────────
  console.log("\nVerifying contracts on AmoyScan...");
  // Note: proxy contracts verify the implementation; hardhat-verify handles UUPS proxies.
  await verify(addresses.PorkelonToken, [], "PorkelonToken (proxy)");
  await verify(addresses.PorkelonNFT, ["Porkelon", "PKLN-NFT", 10000, 500, TEAM_WALLET], "PorkelonNFT");
  await verify(addresses.PorkelonMarketplace, [MARKETING_WALLET], "PorkelonMarketplace");
  await verify(addresses.StakingRewards, [addresses.PorkelonToken, addresses.PorkelonToken], "StakingRewards");
  await verify(addresses.LiquidityMining, [addresses.PorkelonToken], "LiquidityMining");
  await verify(addresses.PresaleVesting, [
    addresses.PorkelonToken, paymentToken,
    pricePerToken.toString(), saleStart, saleEnd, 30 * 86400,
  ], "PresaleVesting");
  await verify(addresses.PresaleEngine, [
    paymentToken, addresses.PorkelonToken, ROUTER_AMOY,
    porkRate.toString(), saleStart,
    ethers.parseUnits("5000", 6).toString(), ethers.parseUnits("50000", 6).toString(),
    saleEnd, LIQUIDITY_WALLET,
  ], "PresaleEngine");

  console.log("\nNext: copy these into web/src/contracts/addresses.ts (see web/README or addresses.example.ts).");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

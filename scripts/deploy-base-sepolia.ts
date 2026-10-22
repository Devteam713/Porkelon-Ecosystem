/**
 * Porkelon Ecosystem — Base Sepolia Testnet Deployment
 *
 * Usage:
 *   1. cp .env.example .env
 *   2. Fill in DEPLOYER_PRIVATE_KEY (testnet-only wallet!) in .env
 *   3. Fund the deployer with Base Sepolia ETH (faucet)
 *   4. npx hardhat run scripts/deploy-base-sepolia.ts --network baseSepolia
 *
 * Output: deployed addresses are written to deployments/base-sepolia.json
 *         (used by the web frontend).
 */
import { ethers, upgrades, run } from "hardhat";
import * as fs from "fs";
import * as path from "path";

// Verify a contract on Basescan. Skips gracefully if no API key or already verified.
async function verify(address: string, args: any[], label: string) {
  if (!process.env.ETHERSCAN_API_KEY && !process.env.POLYGONSCAN_API_KEY) {
    console.log(`   ⏭ Skipping verification for ${label} (no ETHERSCAN_API_KEY)`);
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

  // Normalize wallet addresses: lowercase first so a bad mixed-case checksum
  // can't fail the deploy, then re-checksum. The 20 address bytes are unchanged.
  const norm = (a: string) => ethers.getAddress(a.toLowerCase());

  const balance = await ethers.provider.getBalance(deployerAddr);
  console.log("Balance:", ethers.formatEther(balance), "ETH (Base Sepolia)");
  if (balance === 0n) {
    throw new Error("Deployer has no Base Sepolia ETH. Get some from a Base Sepolia faucet (e.g. https://www.coinbase.com/faucets/base-ethereum-sepolia-faucet).");
  }

  const now = Math.floor(Date.now() / 1000);
  const addresses: Record<string, string> = {};

  // Team wallets (override via .env). Provided by Erik 2026-10-14.
  const TEAM_WALLET = norm(process.env.TEAM_WALLET || "0xA0bFf660B20466F11E659dd948e2F18152E185bF");
  const MARKETING_WALLET = norm(process.env.MARKETING_WALLET || "0xA0bFf660B20466F11E659dd948e2F18152E185bF");
  const LIQUIDITY_WALLET = norm(process.env.LIQUIDITY_WALLET || "0x23cE6D1E06D8509A5668e9E1602de1c2b19ba3a2");
  const FUNDS_WALLET = norm(process.env.FUNDS_WALLET || "0xA0bFf660B20466F11E659dd948e2F18152E185bF");
  console.log("Team wallets:");
  console.log("  TEAM:", TEAM_WALLET);
  console.log("  MARKETING:", MARKETING_WALLET);
  console.log("  LIQUIDITY:", LIQUIDITY_WALLET);

  // ── 1. Porkelon Token (UUPS upgradeable) ──────────────────────────
  // Resume support: set PORKELON_TOKEN (etc.) in .env to reuse an address
  // from a previous partial run instead of redeploying.
  const reuse = (name: string, envKey: string) => {
    const a = process.env[envKey];
    if (a) console.log(`   ♻ Reusing ${name} from ${envKey}: ${a}`);
    return a ? norm(a) : null;
  };

  console.log("\n1/7 Deploying Porkelon token (UUPS proxy)...");
  let porkelonAddr = reuse("PorkelonToken", "PORKELON_TOKEN");
  if (!porkelonAddr) {
    const Porkelon = await ethers.getContractFactory("Porkelon");
    const porkelon = await upgrades.deployProxy(Porkelon, [deployerAddr], { kind: "uups" });
    await porkelon.waitForDeployment();
    porkelonAddr = await porkelon.getAddress();
  }
  addresses.PorkelonToken = porkelonAddr;
  console.log("   PorkelonToken:", addresses.PorkelonToken);

  // ── 2. Porkelon NFT ───────────────────────────────────────────────
  console.log("\n2/7 Deploying PorkelonNFT...");
  let nftAddr = reuse("PorkelonNFT", "PORKELON_NFT");
  if (!nftAddr) {
    const PorkelonNFT = await ethers.getContractFactory("PorkelonNFT");
    const nft = await PorkelonNFT.deploy(
      "Porkelon",          // name
      "PKLN-NFT",          // symbol
      10000,               // maxSupply
      500,                 // 5% default royalty (bps)
      TEAM_WALLET          // initialOwner
    );
    await nft.waitForDeployment();
    nftAddr = await nft.getAddress();
  }
  addresses.PorkelonNFT = nftAddr;
  console.log("   PorkelonNFT:", addresses.PorkelonNFT);

  // ── 3. Marketplace ────────────────────────────────────────────────
  console.log("\n3/7 Deploying PorkelonMarketplace...");
  let marketplaceAddr = reuse("PorkelonMarketplace", "PORKELON_MARKETPLACE");
  if (!marketplaceAddr) {
    const Marketplace = await ethers.getContractFactory("PorkelonMarketplace");
    const marketplace = await Marketplace.deploy(MARKETING_WALLET); // feeRecipient
    await marketplace.waitForDeployment();
    marketplaceAddr = await marketplace.getAddress();
  }
  addresses.PorkelonMarketplace = marketplaceAddr;
  console.log("   PorkelonMarketplace:", addresses.PorkelonMarketplace);

  // ── 4. StakingRewards (PORK staking, PORK rewards) ─────────────────
  console.log("\n4/7 Deploying StakingRewards...");
  let stakingAddr = reuse("StakingRewards", "STAKING_REWARDS");
  if (!stakingAddr) {
    const StakingRewards = await ethers.getContractFactory("StakingRewards");
    const staking = await StakingRewards.deploy(
      addresses.PorkelonToken, // stakingToken
      addresses.PorkelonToken  // rewardsToken
    );
    await staking.waitForDeployment();
    stakingAddr = await staking.getAddress();
  }
  addresses.StakingRewards = stakingAddr;
  console.log("   StakingRewards:", addresses.StakingRewards);

  // ── 5. LiquidityMining ────────────────────────────────────────────
  console.log("\n5/7 Deploying LiquidityMining...");
  let miningAddr = reuse("LiquidityMining", "LIQUIDITY_MINING");
  if (!miningAddr) {
    const LiquidityMining = await ethers.getContractFactory("LiquidityMining");
    const mining = await LiquidityMining.deploy(addresses.PorkelonToken); // rewardToken
    await mining.waitForDeployment();
    miningAddr = await mining.getAddress();
  }
  addresses.LiquidityMining = miningAddr;
  console.log("   LiquidityMining:", addresses.LiquidityMining);
  // Note: call setLpToken(lpTokenAddress) after LP token exists.

  // ── 6. PresaleVesting ─────────────────────────────────────────────
  // Circle's official USDC on Base Sepolia. Falls back to a mock if the
  // address has no code (e.g. wrong network) or USDC_BASE_SEPOLIA is unset/zero.
  const USDC_BASE_SEPOLIA = norm(process.env.USDC_BASE_SEPOLIA || "0x036CbD53842c5426634e7929541eC2318f3dCF7e");
  let paymentToken = USDC_BASE_SEPOLIA;
  const code = await ethers.provider.getCode(paymentToken).catch(() => "0x");
  if (paymentToken === ethers.ZeroAddress || code === "0x" || code === "0x0") {
    console.log("\n   ⚠ USDC not available — deploying a MockERC20 as payment token for testnet.");
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    const mock = await MockERC20.deploy("Mock USDC", "mUSDC");
    await mock.waitForDeployment();
    paymentToken = await mock.getAddress();
    addresses.MockUSDC = paymentToken;
    console.log("   MockUSDC:", paymentToken);
  } else {
    console.log("\n   Using USDC on Base Sepolia:", paymentToken);
  }

  console.log("\n6/7 Deploying PresaleVesting...");
  const PresaleVesting = await ethers.getContractFactory("PresaleVesting");
  // Presale pricing: PORK_PER_USDC = how many PORK tokens 1 USDC buys.
  //   e.g. $0.000015/PORK  →  PORK_PER_USDC=66666.67
  //   ⚠ DO NOT set a fractional value like 0.000015 here — that would price
  //   PORK at $66,666 each. The script aborts if PORK_PER_USDC < 1.
  // Override via env: PRESALE_START (unix), PRESALE_DAYS, PORK_PER_USDC.
  const saleStart = parseInt(process.env.PRESALE_START || "1792681200", 10); // 2026-10-22 10:00 CDT
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
  // NOTE: Replace with the real Base Sepolia DEX router if testing LP.
  const ROUTER_BASE_SEPOLIA = process.env.ROUTER_BASE_SEPOLIA || ethers.ZeroAddress;
  console.log("\n7/7 Deploying PresaleEngine...");
  const PresaleEngine = await ethers.getContractFactory("PresaleEngine");
  // PORK_RATE: buyTokens does porkAmount = usdcUnits * PORK_RATE.
  // 1 USDC (1e6 units) → 66666.67 PORK (6.666667e22 wei): PORK_RATE = 6.666667e22 / 1e6 = 6.666667e16
  const porkRate = BigInt(Math.round(parseFloat(porkPerUsdc) * 1e18)) / BigInt(1e6);
  const engine = await PresaleEngine.deploy(
    paymentToken,                            // paymentToken
    addresses.PorkelonToken,                 // porkToken
    ROUTER_BASE_SEPOLIA,                     // router (zero = finalize will revert; set for real LP tests)
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
  const outPath = path.join(outDir, "base-sepolia.json");
  fs.writeFileSync(outPath, JSON.stringify({
    network: "baseSepolia",
    chainId: 84532,
    deployer: deployerAddr,
    deployedAt: new Date().toISOString(),
    contracts: addresses,
  }, null, 2));
  console.log("\n✅ Addresses written to", outPath);

  // ── Verify on Basescan ────────────────────────────────────────────
  console.log("\nVerifying contracts on Basescan...");
  // Note: proxy contracts verify the implementation; hardhat-verify handles UUPS proxies.
  await verify(addresses.PorkelonToken, [], "PorkelonToken (proxy)");
  await verify(addresses.PorkelonNFT, ["Porkelon", "PKLN-NFT", 10000, 500, TEAM_WALLET], "PorkelonNFT");
  await verify(addresses.PorkelonMarketplace, [MARKETING_WALLET], "PorkelonMarketplace");
  await verify(addresses.StakingRewards, [addresses.PorkelonToken, addresses.PorkelonToken], "StakingRewards");
  await verify(addresses.LiquidityMining, [addresses.PorkelonToken], "LiquidityMining");
  if (!addresses.MockUSDC) {
    await verify(paymentToken, [], "USDC (already deployed)");
  }
  await verify(addresses.PresaleVesting, [
    addresses.PorkelonToken, paymentToken,
    pricePerToken.toString(), saleStart, saleEnd, 30 * 86400,
  ], "PresaleVesting");
  await verify(addresses.PresaleEngine, [
    paymentToken, addresses.PorkelonToken, ROUTER_BASE_SEPOLIA,
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

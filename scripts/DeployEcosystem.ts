import { ethers, upgrades } from "hardhat";
import * as dotenv from "dotenv";
dotenv.config();

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying with:", deployer.address);

  // ================================================================
  // 1. Deploy Porkelon Token (UUPS Upgradeable)
  // ================================================================
  const PorkelonFactory = await ethers.getContractFactory("Porkelon");
  const porkelon = await upgrades.deployProxy(PorkelonFactory, [
    deployer.address,           // _defaultAdmin (use a Timelock later!)
    deployer.address,           // _teamWallet (1% tax receiver)
    [
      deployer.address,         // [0] Dev wallet (25%)
      deployer.address,         // [1] Staking rewards (10%)
      deployer.address,         // [2] Liquidity (40%)
      deployer.address,         // [3] Marketing (10%)
      deployer.address,         // [4] Airdrops (5%)
      deployer.address          // [5] Presale (10%)
    ]
  ], { initializer: "initialize" });

  await porkelon.waitForDeployment();
  const porkAddress = await porkelon.getAddress();
  console.log("Porkelon deployed to:", porkAddress);

  // ================================================================
  // 2. PresaleVesting (USDC on Polygon)
  // ================================================================
  const USDC = "0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359"; // Native USDC(e)
  const pricePerToken = ethers.parseUnits("0.0005", 18); // 0.0005 USDC per PORK → ~$100k raise at 100B cap
  const start = Math.floor(Date.now() / 1000) + 3600;    // +1 hour
  const end = start + 60 * 60 * 24 * 7;                  // 7 days presale
  const vestingDuration = 60 * 60 * 24 * 90;             // 90 days linear vesting

  const Presale = await ethers.getContractFactory("PresaleVesting");
  const presale = await Presale.deploy(
    porkAddress,
    USDC,
    pricePerToken,
    start,
    end,
    vestingDuration
  );
  await presale.waitForDeployment();
  console.log("PresaleVesting deployed to:", await presale.getAddress());

  // ================================================================
  // 3. LiquidityMining (LP → PORK rewards)
  // ================================================================
  const LiquidityMining = await ethers.getContractFactory("LiquidityMining");
  const liquidityMining = await LiquidityMining.deploy(
    ethers.ZeroAddress, // LP token — will be set later
    porkAddress
  );
  await liquidityMining.waitForDeployment();
  console.log("LiquidityMining deployed to:", await liquidityMining.getAddress());

  // ================================================================
  // 4. StakingRewards (PORK → PORK rewards)
  // ================================================================
  const StakingRewards = await ethers.getContractFactory("StakingRewards");
  const staking = await StakingRewards.deploy(porkAddress, porkAddress);
  await staking.waitForDeployment();
  console.log("StakingRewards deployed to:", await staking.getAddress());

  // ================================================================
  // 5. PorkelonNFT
  // ================================================================
  const NFT = await ethers.getContractFactory("PorkelonNFT");
  const nft = await NFT.deploy("PorkelonNFT", "PNFT", 10000, 500); // 10k supply, 5% royalty
  await nft.waitForDeployment();
  console.log("PorkelonNFT deployed to:", await nft.getAddress());

  // ================================================================
  // 6. Marketplace
  // ================================================================
  const Marketplace = await ethers.getContractFactory("PorkelonMarketplace");
  const marketplace = await Marketplace.deploy(deployer.address); // feeRecipient
  await marketplace.waitForDeployment();
  console.log("PorkelonMarketplace deployed to:", await marketplace.getAddress());

  // ================================================================
  // Final Output
  // ================================================================
  console.log("\n=== DEPLOYMENT ADDRESSES ===");
  console.log("PORK:", porkAddress);
  console.log("Presale:", await presale.getAddress());
  console.log("LiquidityMining:", await liquidityMining.getAddress());
  console.log("StakingRewards:", await staking.getAddress());
  console.log("NFT:", await nft.getAddress());
  console.log("Marketplace:", await marketplace.getAddress());

  console.log("\nNext steps:");
  console.log("1. Verify all contracts on polygonscan.com/verifyContract");
  console.log("2. Add liquidity (see addLiquidity.ts script)");
  console.log("3. Set correct LP token in LiquidityMining (owner call)");
  console.log("4. Fund & notifyRewardAmount on both farming contracts");
  console.log("5. Transfer ownership to Timelock/Multisig");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

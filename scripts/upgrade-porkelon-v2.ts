/**
 * Upgrade the Porkelon UUPS proxy to V2 (adds MINTER_ROLE + mint),
 * then fund the PresaleEngine for the testnet presale.
 *
 *   npx hardhat run scripts/upgrade-porkelon-v2.ts --network baseSepolia
 */
import { ethers, upgrades } from "hardhat";

const PROXY = "0xbf05B832FDE3cA16d989D422f823BecF8B7d6dB0";
const ENGINE = "0xb6dFd3E2e3474d5A45Db24d36d4e8b07De8d73Fe";
// 3.5B PORK — covers the 50k USDC hardcap (3.33B max) with headroom.
const MINT_AMOUNT = ethers.parseUnits("3500000000", 18);

async function main() {
  const [deployer] = await ethers.getSigners();
  const deployerAddr = await deployer.getAddress();
  console.log("Deployer:", deployerAddr);

  const bal = await ethers.provider.getBalance(deployerAddr);
  console.log("Balance:", ethers.formatEther(bal), "ETH");
  if (bal === 0n) throw new Error("Deployer has no ETH.");

  // 1. Deploy V2 implementation + upgrade the proxy.
  console.log("\nUpgrading proxy to PorkelonV2...");
  const PorkelonV2 = await ethers.getContractFactory("PorkelonV2");
  const upgraded = await upgrades.upgradeProxy(PROXY, PorkelonV2);
  await upgraded.waitForDeployment();
  const implAddr = await upgrades.erc1967.getImplementationAddress(PROXY);
  console.log("   New implementation:", implAddr);

  // 2. Grant MINTER_ROLE to the deployer.
  const MINTER_ROLE = await upgraded.MINTER_ROLE();
  console.log("\nGranting MINTER_ROLE to deployer...");
  const tx1 = await upgraded.grantRole(MINTER_ROLE, deployerAddr);
  await tx1.wait();
  console.log("   granted");

  // 3. Mint presale funding to the engine.
  console.log("\nMinting 3.5B PORK to PresaleEngine...");
  const tx2 = await upgraded.mint(ENGINE, MINT_AMOUNT);
  await tx2.wait();
  console.log("   minted");

  // 4. Exclude the engine from the 1% transfer fee so presale payouts are exact.
  console.log("\nExcluding PresaleEngine from transfer fee...");
  const tx3 = await upgraded.setExcludedFromFee(ENGINE, true);
  await tx3.wait();
  console.log("   excluded");

  // 5. Verify.
  const engineBal = await upgraded.balanceOf(ENGINE);
  const totalSupply = await upgraded.totalSupply();
  console.log("\nEngine PORK balance:", ethers.formatUnits(engineBal, 18));
  console.log("Total supply:", ethers.formatUnits(totalSupply, 18));
  console.log("Engine fee-excluded:", await upgraded.isExcludedFromFee(ENGINE));
  console.log("\n✅ Upgrade complete. New implementation:", implAddr);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

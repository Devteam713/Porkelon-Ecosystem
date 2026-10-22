import { ethers, upgrades } from "hardhat";

/**
 * Upgrade the PORK proxy to the renamed Porkelon implementation.
 *
 * What this does:
 *   1. Deploys the new Porkelon implementation (renamed from EssentialToken,
 *      identical logic and storage layout)
 *   2. Calls upgradeTo() on the proxy from the owner wallet
 *   3. Prints the new implementation address for Polygonscan verification
 *
 * Run: npx hardhat run scripts/upgrade-to-porkelon.ts --network polygon
 *
 * Requires in .env:
 *   PRIVATE_KEY=<owner wallet private key>
 *   POLYGON_RPC_URL=https://polygon-rpc.com/
 */

const PROXY_ADDRESS = "0xBA4284495CE3B8C029C2CBAbc821526464A93CA9";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Upgrading with account:", deployer.address);

  // Verify deployer is the proxy owner
  const proxy = await ethers.getContractAt("Porkelon", PROXY_ADDRESS);
  const owner = await proxy.owner();
  console.log("Proxy owner:", owner);
  if (owner.toLowerCase() !== deployer.address.toLowerCase()) {
    throw new Error("Deployer is not the proxy owner. Upgrade would revert.");
  }

  // Deploy new implementation and upgrade
  const Porkelon = await ethers.getContractFactory("PorkelonRenamed");
  console.log("Deploying new implementation...");
  const newImpl = await Porkelon.deploy();
  await newImpl.waitForDeployment();
  const implAddress = await newImpl.getAddress();
  console.log("New implementation deployed:", implAddress);

  console.log("Upgrading proxy...");
  const tx = await proxy.upgradeTo(implAddress);
  await tx.wait();
  console.log("✅ Proxy upgraded!");

  // Verify the upgrade took effect
  const name = await proxy.name();
  const symbol = await proxy.symbol();
  console.log(`Token: ${name} (${symbol})`);
  console.log(`\nNext: verify on Polygonscan:`);
  console.log(`  npx hardhat verify --network polygon ${implAddress}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

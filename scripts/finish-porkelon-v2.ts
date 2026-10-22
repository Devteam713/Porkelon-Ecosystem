/**
 * Finish the Porkelon V2 upgrade: grant MINTER_ROLE, mint presale funding,
 * exclude the engine from fees.
 *
 *   npx hardhat run scripts/finish-porkelon-v2.ts --network baseSepolia
 */
import { ethers } from "hardhat";

const PROXY = "0xbf05B832FDE3cA16d989D422f823BecF8B7d6dB0";
const ENGINE = "0xb6dFd3E2e3474d5A45Db24d36d4e8b07De8d73Fe";
const MINT_AMOUNT = ethers.parseUnits("3500000000", 18);

async function main() {
  const [deployer] = await ethers.getSigners();
  const deployerAddr = await deployer.getAddress();

  const proxy = await ethers.getContractAt("PorkelonV2", PROXY);

  // 1. Grant MINTER_ROLE to the deployer (idempotent).
  const MINTER_ROLE = await proxy.MINTER_ROLE();
  const hasRole = await proxy.hasRole(MINTER_ROLE, deployerAddr);
  if (!hasRole) {
    console.log("Granting MINTER_ROLE to deployer...");
    await (await proxy.grantRole(MINTER_ROLE, deployerAddr)).wait();
    console.log("   granted");
  } else {
    console.log("MINTER_ROLE already granted.");
  }

  // 2. Mint presale funding to the engine (idempotent).
  const engineBal = await proxy.balanceOf(ENGINE);
  if (engineBal < MINT_AMOUNT) {
    console.log("Minting 3.5B PORK to PresaleEngine...");
    await (await proxy.mint(ENGINE, MINT_AMOUNT)).wait();
    console.log("   minted");
  } else {
    console.log("Engine already funded.");
  }

  // 3. Exclude the engine from the 1% fee (idempotent).
  const excluded = await proxy.isExcludedFromFee(ENGINE);
  if (!excluded) {
    console.log("Excluding PresaleEngine from transfer fee...");
    await (await proxy.setExcludedFromFee(ENGINE, true)).wait();
    console.log("   excluded");
  } else {
    console.log("Engine already fee-excluded.");
  }

  // Verify.
  console.log("\nEngine PORK balance:", ethers.formatUnits(await proxy.balanceOf(ENGINE), 18));
  console.log("Total supply:", ethers.formatUnits(await proxy.totalSupply(), 18));
  console.log("Engine fee-excluded:", await proxy.isExcludedFromFee(ENGINE));
  console.log("\n✅ Presale funding complete.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

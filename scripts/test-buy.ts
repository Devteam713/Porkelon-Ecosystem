/**
 * Presale test buy — runs once the sale is live (Oct 22, 2026).
 * Buys 1 USDC worth of PORK through the PresaleEngine and verifies accounting.
 *
 *   npx hardhat run scripts/test-buy.ts --network baseSepolia
 */
import { ethers } from "hardhat";

const ENGINE = "0xb6dFd3E2e3474d5A45Db24d36d4e8b07De8d73Fe";
const USDC = "0x036CbD53842c5426634e7929541eC2318f3dCF7e";
const PORK_PROXY = "0xbf05B832FDE3cA16d989D422f823BecF8B7d6dB0";
const BUY_AMOUNT = ethers.parseUnits("1", 6); // 1 USDC

async function main() {
  const [deployer] = await ethers.getSigners();
  const deployerAddr = await deployer.getAddress();
  console.log("Buyer:", deployerAddr);

  const bal = await ethers.provider.getBalance(deployerAddr);
  console.log("ETH balance:", ethers.formatEther(bal));
  if (bal === 0n) throw new Error("No ETH for gas — fund the deployer first.");

  const engine = await ethers.getContractAt("PresaleEngine", ENGINE);
  const usdc = new ethers.Contract(USDC,
    ["function balanceOf(address) view returns (uint256)",
     "function approve(address,uint256) returns (bool)"],
    deployer);
  const pork = await ethers.getContractAt("PorkelonV2", PORK_PROXY);

  // 0. Sale must be live.
  const now = Math.floor(Date.now() / 1000);
  const start = Number(await engine.START_TIMESTAMP());
  const end = Number(await engine.END_TIMESTAMP());
  console.log("Sale window:", new Date(start * 1000).toISOString(), "->", new Date(end * 1000).toISOString());
  if (now < start) throw new Error("Sale not started yet.");
  if (now > end) throw new Error("Sale already ended.");

  // 1. Check USDC balance.
  const usdcBal = await usdc.balanceOf(deployerAddr);
  console.log("USDC balance:", ethers.formatUnits(usdcBal, 6));
  if (usdcBal < BUY_AMOUNT) throw new Error("Not enough USDC — fund the deployer with testnet USDC first.");

  // 2. Approve.
  console.log("\nApproving 1 USDC to engine...");
  await (await usdc.approve(ENGINE, BUY_AMOUNT)).wait();

  // 3. Buy.
  const enginePorkBefore = await pork.balanceOf(ENGINE);
  const claimableBefore = await engine.claimableTokens(deployerAddr);
  console.log("Buying 1 USDC of PORK...");
  const tx = await engine.buyTokens(deployerAddr, BUY_AMOUNT);
  const receipt = await tx.wait();
  console.log("   tx:", receipt.hash);

  // 4. Verify accounting.
  const claimableAfter = await engine.claimableTokens(deployerAddr);
  const gained = claimableAfter - claimableBefore;
  const expected = BUY_AMOUNT * (await engine.PORK_RATE());
  console.log("\nClaimable PORK gained:", ethers.formatUnits(gained, 18));
  console.log("Expected:", ethers.formatUnits(expected, 18));
  console.log("Total collected:", ethers.formatUnits(await engine.totalCollected(), 6), "USDC");
  console.log("Engine PORK balance:", ethers.formatUnits(await pork.balanceOf(ENGINE), 18));

  if (gained === expected) {
    console.log("\n✅ TEST BUY PASSED — accounting exact.");
  } else {
    console.log("\n❌ ACCOUNTING MISMATCH — investigate.");
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

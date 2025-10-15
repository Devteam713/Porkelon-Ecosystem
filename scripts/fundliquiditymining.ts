import { ethers } from "hardhat";
import * as dotenv from "dotenv";
dotenv.config();

async function main() {
  const [deployer] = await ethers.getSigners();
  const liquidityMiningAddress = process.env.LIQUIDITY_MINING_ADDRESS!;
  const porkAddress = process.env.PORK_ADDRESS!;

  const netTotal = ethers.parseUnits(process.env.NET_REWARD ?? "5000000", 18); // net reward to distribute
  const TAX_BPS = 100n;
  const BPS = 10000n;
  const NET_DENOM = BPS - TAX_BPS;

  const grossNumerator = netTotal * BigInt(BPS);
  let gross = grossNumerator / BigInt(NET_DENOM);
  if (grossNumerator % BigInt(NET_DENOM) !== 0n) gross = gross + 1n;

  const pork = await ethers.getContractAt("PorkelonToken", porkAddress);
  // transfer gross from deployer to liquidity mining contract
  const tx = await pork.transfer(liquidityMiningAddress, gross);
  await tx.wait();
  console.log("Transferred gross PORK:", gross.toString());

  // optionally notify reward amount / duration via LiquidityMining contract (call from owner)
  const liquidity = await ethers.getContractAt("LiquidityMining", liquidityMiningAddress);
  const duration = Number(process.env.DURATION_SECONDS ?? (60 * 60 * 24 * 30)); // default 30 days
  await (await liquidity.notifyRewardAmount(netTotal, duration)).wait();
  console.log("LiquidityMining notified: net", netTotal.toString(), "duration", duration);
}

main().catch((e) => { console.error(e); process.exit(1); });

// src/utils/tx.ts
import { ethers } from "ethers";

export async function waitTx(txPromise: Promise<any>, onHash?: (hash: string) => void) {
  const tx = await txPromise;
  if (tx && tx.hash && onHash) onHash(tx.hash);
  return tx.wait();
}

// small helper to compute gross given net and taxBps
export function grossFromNet(net: bigint, taxBps = 100n): bigint {
  const BPS = 10000n;
  const NET_DENOM = BPS - taxBps;
  const numer = net * BigInt(BPS);
  let gross = numer / NET_DENOM;
  if (numer % NET_DENOM !== 0n) gross += 1n;
  return gross;
}

export const parseUnits = (v: string, decimals = 18) => ethers.parseUnits(v, decimals);
export const formatUnits = (v: any, decimals = 18) => ethers.formatUnits(v, decimals);

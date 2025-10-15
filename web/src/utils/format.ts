import { ethers } from "ethers";

export function fmt(n: bigint | string) {
  try {
    return ethers.formatUnits(n as any, 18);
  } catch {
    return String(n);
  }
}

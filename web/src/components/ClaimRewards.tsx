import React, { useEffect, useState } from "react";
import { useAccount, useSigner } from "wagmi";
import { useContractInstances } from "../hooks/useContracts";
import { ethers } from "ethers";

export default function ClaimRewards() {
  const { address } = useAccount();
  const { mining } = useContractInstances();
  const signerHook = useSigner();
  const signer = signerHook.data;
  const [earned, setEarned] = useState("0");
  const [devBalance, setDevBalance] = useState("0");

  useEffect(() => {
    async function load() {
      if (!address) return;
      try {
        const e = await mining.earned(address);
        setEarned(ethers.formatUnits(e, 18));
      } catch (e) {}
    }
    load();
    const iv = setInterval(load, 8000);
    return () => clearInterval(iv);
  }, [address]);

  async function claim() {
    try {
      if (!signer) throw new Error("connect wallet");
      const tx = await mining.connect(signer).getReward();
      await tx.wait();
      alert("Claimed!");
    } catch (e: any) {
      console.error(e);
      alert("Error: " + e?.message ?? e);
    }
  }

  return (
    <div style={{ marginTop: 12 }}>
      <div>Pending net rewards: {earned} PORK</div>
      <button onClick={claim}>Claim Rewards</button>
    </div>
  );
}

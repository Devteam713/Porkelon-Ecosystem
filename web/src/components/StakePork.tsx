// src/components/StakePORK.tsx
import React, { useEffect, useState } from "react";
import { useWagmiContracts } from "../hooks/useWagmiContracts";
import { useAccount } from "wagmi";
import { parseUnits, formatUnits } from "../utils/tx";

export default function StakePORK() {
  const { staking, pork, signer } = useWagmiContracts();
  const { address } = useAccount();
  const [amount, setAmount] = useState("0");
  const [staked, setStaked] = useState("0");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      if (!address || !staking) return;
      try {
        const bal = await staking.balanceOf(address);
        setStaked(formatUnits(bal, 18));
      } catch (e) {}
    })();
  }, [address, staking]);

  async function stake() {
    try {
      if (!signer) throw new Error("connect wallet");
      setLoading(true);
      const amt = parseUnits(amount, 18);
      const tx1 = await pork.connect(signer).approve(staking.target, amt);
      await tx1.wait();
      const tx2 = await staking.connect(signer).stake(amt);
      await tx2.wait();
      alert("Staked PORK");
    } catch (e: any) {
      console.error(e);
      alert("Error: " + (e?.message ?? e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <div>Currently staked: {staked} PORK</div>
      <input value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Amount PORK" />
      <button onClick={stake} disabled={loading}>{loading ? "Staking..." : "Stake PORK"}</button>
    </div>
  );
}

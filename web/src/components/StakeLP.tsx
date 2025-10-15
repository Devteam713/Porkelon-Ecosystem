// src/components/StakeLP.tsx
import React, { useEffect, useState } from "react";
import { useWagmiContracts } from "../hooks/useWagmiContracts";
import { useAccount } from "wagmi";
import { parseUnits, formatUnits, waitTx } from "../utils/tx";

export default function StakeLP() {
  const { liquidityMining, signer } = useWagmiContracts();
  const { address } = useAccount();
  const [lpAddr, setLpAddr] = useState<string | null>(null);
  const [staked, setStaked] = useState("0");
  const [pending, setPending] = useState("0");
  const [amount, setAmount] = useState("0");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!liquidityMining || !address) return;
    let mounted = true;
    (async () => {
      try {
        const lp = await liquidityMining.lpToken();
        if (mounted) setLpAddr(lp);
        const st = await liquidityMining.balanceOf(address);
        const earned = await liquidityMining.earned(address);
        if (mounted) {
          setStaked(formatUnits(st, 18));
          setPending(formatUnits(earned, 18));
        }
      } catch (err) {
        console.error(err);
      }
    })();
    return () => { mounted = false; };
  }, [liquidityMining, address]);

  async function stake() {
    try {
      if (!signer) throw new Error("connect wallet");
      setLoading(true);
      const lp = new (await import("ethers")).ethers.Contract(lpAddr!, ["function approve(address,uint256) public returns (bool)"], signer);
      const amt = parseUnits(amount, 18);
      await waitTx(lp.approve(liquidityMining.target, amt));
      const tx = await liquidityMining.connect(signer).stake(amt);
      await waitTx(tx);
      alert("Staked!");
      // refresh
      const st = await liquidityMining.balanceOf(address);
      setStaked(formatUnits(st, 18));
    } catch (e: any) {
      console.error(e);
      alert("Error: " + (e?.message ?? e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <div>Staked: {staked} LP</div>
      <div>Pending net rewards: {pending} PORK</div>
      <input value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Amount LP to stake" />
      <button onClick={stake} disabled={loading}>{loading ? "Staking..." : "Stake LP"}</button>
    </div>
  );
}

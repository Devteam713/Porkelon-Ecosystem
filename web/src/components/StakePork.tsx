import React, { useState, useEffect } from "react";
import { useAccount, useSigner } from "wagmi";
import { useContractInstances } from "../hooks/useContracts";
import { ethers } from "ethers";

export default function StakePORK() {
  const { address } = useAccount();
  const { staking, pork } = useContractInstances();
  const signerHook = useSigner();
  const signer = signerHook.data;
  const [amount, setAmount] = useState("0");
  const [staked, setStaked] = useState("0");

  useEffect(() => {
    async function load() {
      if (!address) return;
      try {
        const bal = await staking.balanceOf(address);
        setStaked(ethers.formatUnits(bal, 18));
      } catch {}
    }
    load();
  }, [address]);

  async function stake() {
    try {
      if (!signer) throw new Error("connect wallet");
      const amt = ethers.parseUnits(amount, 18);
      await (await pork.connect(signer).approve(staking.target, amt)).wait();
      await (await staking.connect(signer).stake(amt)).wait();
      alert("Staked PORK!");
    } catch (e: any) {
      console.error(e);
      alert("Error: " + e?.message ?? e);
    }
  }

  return (
    <div>
      <div>Currently staked: {staked} PORK</div>
      <input value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Amount PORK" />
      <button onClick={stake}>Stake</button>
    </div>
  );
}

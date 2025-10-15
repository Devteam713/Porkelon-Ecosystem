import React, { useState, useEffect } from "react";
import { useAccount, useSigner } from "wagmi";
import { useContractInstances } from "../hooks/useContracts";
import { ethers } from "ethers";

export default function StakeLP() {
  const { address } = useAccount();
  const { mining, provider } = useContractInstances();
  const signerHook = useSigner();
  const signer = signerHook.data;
  const [stakeAmount, setStakeAmount] = useState("0");
  const [balance, setBalance] = useState("0");

  // LP token address is mining.lpToken? Not read here; we assume user already has LP tokens
  useEffect(() => {
    async function load() {
      if (!address) return;
      // try to read staking contract balanceOf
      try {
        const bal = await mining.balanceOf(address);
        setBalance(ethers.formatUnits(bal, 18));
      } catch (e) {
        console.error(e);
      }
    }
    load();
  }, [address]);

  async function stake() {
    try {
      if (!signer) throw new Error("connect wallet");
      const signerInstance = signer;
      // get LP token address via mining.lpToken (public), then approve
      const lpAddr = await mining.lpToken();
      const lpAbi = [{ "constant": false, "inputs": [{ "name": "_spender","type":"address" },{ "name":"_value","type":"uint256" }], "name":"approve","outputs":[{"name":"","type":"bool"}],"type":"function" }];
      const lp = new ethers.Contract(lpAddr, lpAbi, signerInstance);
      const amt = ethers.parseUnits(stakeAmount, 18);
      await (await lp.approve(mining.target, amt)).wait();
      const tx = await mining.connect(signerInstance).stake(amt);
      await tx.wait();
      alert("Staked!");
    } catch (e: any) {
      console.error(e);
      alert("Error: " + (e?.message ?? e));
    }
  }

  return (
    <div>
      <div>Staked balance: {balance} LP</div>
      <input value={stakeAmount} onChange={(e) => setStakeAmount(e.target.value)} placeholder="Amount" />
      <button onClick={stake}>Stake LP</button>
    </div>
  );
}

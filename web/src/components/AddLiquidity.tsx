import React, { useState } from "react";
import { useSigner } from "wagmi";
import { useContractInstances } from "../hooks/useContracts";
import { ethers } from "ethers";

export default function AddLiquidity() {
  const { pork, router } = useContractInstances();
  const signer = (useSigner() as any).data;
  const [porkAmount, setPorkAmount] = useState("1000");
  const [maticAmount, setMaticAmount] = useState("1");

  async function add() {
    try {
      if (!signer) throw new Error("connect wallet");
      const porkAmt = ethers.parseUnits(porkAmount, 18);
      await (await pork.connect(signer).approve(router.target, porkAmt)).wait();
      const deadline = Math.floor(Date.now() / 1000) + 1200;
      // addLiquidityETH(router): router.addLiquidityETH(token, amountTokenDesired, amountTokenMin, amountETHMin, to, deadline) payable
      const tx = await router
        .connect(signer)
        .addLiquidityETH(pork.target, porkAmt, 0, 0, await signer.getAddress(), deadline, { value: ethers.parseEther(maticAmount) });
      await tx.wait();
      alert("Liquidity added (PORK/MATIC)");
    } catch (e: any) {
      console.error(e);
      alert("Error: " + (e?.message ?? e));
    }
  }

  return (
    <div>
      <div>
        <input value={porkAmount} onChange={(e) => setPorkAmount(e.target.value)} />
        <input value={maticAmount} onChange={(e) => setMaticAmount(e.target.value)} />
        <button onClick={add}>Add PORK/MATIC Liquidity</button>
      </div>
    </div>
  );
}

import React, { useState } from "react";
import { useAccount, useSigner } from "wagmi";
import { useContractInstances } from "../hooks/useContracts";
import { ethers } from "ethers";

export default function PresaleBuy() {
  const { address } = useAccount();
  const { presale } = useContractInstances();
  const [amount, setAmount] = useState("100"); // payment token units (USDT)
  const [status, setStatus] = useState("");

  async function buy() {
    try {
      setStatus("Approving payment token...");
      const signer = (await (await import("wagmi")).useSigner()).data; // workaround typed import
      // we assume payment token approve step handled in presale contract or front end (update as needed)
      // here we call presale.buy(paymentAmount)
      const paymentAmount = ethers.parseUnits(amount, 6); // USDT decimals=6
      const tx = await presale.connect(signer).buy(paymentAmount);
      setStatus("Waiting for tx...");
      await tx.wait();
      setStatus("Purchase successful!");
    } catch (e: any) {
      console.error(e);
      setStatus("Error: " + (e?.message ?? e));
    }
  }

  return (
    <div>
      <input value={amount} onChange={(e) => setAmount(e.target.value)} />
      <button onClick={buy}>Buy Presale (USDT)</button>
      <div>{status}</div>
    </div>
  );
}

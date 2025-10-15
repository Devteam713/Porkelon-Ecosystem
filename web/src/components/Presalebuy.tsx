// src/components/PresaleBuy.tsx
import React, { useState } from "react";
import { useWagmiContracts } from "../hooks/useWagmiContracts";
import { useAccount } from "wagmi";
import { parseUnits } from "../utils/tx";

export default function PresaleBuy() {
  const { presale, provider, signer, account } = useWagmiContracts();
  const [amount, setAmount] = useState("10"); // USDT units
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");

  // Detect payment token from presale contract (if exposed)
  // NOTE: presale contract in our scaffold expects you to approve the payment token externally (USDT).
  // Here, we attempt to approve USDT (change address if needed).
  const PAYMENT_TOKEN_ADDR = (import.meta.env.VITE_USDT_ADDRESS as string) || "";

  async function approveAndBuy() {
    try {
      if (!signer) throw new Error("Connect wallet");
      setLoading(true);
      setStatus("Approving USDT...");
      // get USDT contract minimal ABI
      const erc20Abi = ["function approve(address,uint256) public returns (bool)"];
      const usdt = new (await import("ethers")).ethers.Contract(PAYMENT_TOKEN_ADDR, erc20Abi, signer);
      const paymentAmt = parseUnits(amount, 6); // USDT decimals 6
      const tx1 = await usdt.approve(presale.target, paymentAmt);
      await tx1.wait();

      setStatus("Buying in presale...");
      const tx2 = await presale.connect(signer).buy(paymentAmt);
      setStatus("Awaiting confirmation...");
      await tx2.wait();
      setStatus("Purchased! Check vesting schedule.");
    } catch (e: any) {
      console.error(e);
      setStatus("Error: " + (e?.message ?? e));
    } finally {
      setLoading(false);
    }
  }

  if (!account) return <div>Please connect wallet to participate in presale.</div>;

  return (
    <div>
      <div>
        <label>USDT amount:</label>
        <input value={amount} onChange={(e) => setAmount(e.target.value)} />
        <button disabled={loading} onClick={approveAndBuy}>
          {loading ? "Processing..." : "Approve & Buy"}
        </button>
      </div>
      <div style={{ marginTop: 8 }}>{status}</div>
    </div>
  );
}

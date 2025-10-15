import React, { useState } from "react";

/*
 Minimal placeholder for minting UI.
 Integrate with wagmi + ethers in production.
 */
export default function MintForm() {
  const [name, setName] = useState("");
  return (
    <div>
      <h2>Mint NFT (placeholder)</h2>
      <input placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} />
      <button onClick={() => alert("Implement wallet + IPFS upload + contract call")}>Mint</button>
    </div>
  );
}

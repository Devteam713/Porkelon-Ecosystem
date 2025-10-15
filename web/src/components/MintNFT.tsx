import React, { useState } from "react";
import { NFTStorage, File } from "nft.storage";
import { useSigner } from "wagmi";
import { useContractInstances } from "../hooks/useContracts";
import { ethers } from "ethers";

export default function MintNFT() {
  const { nft } = useContractInstances();
  const signerHook = useSigner();
  const signer = signerHook.data;
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState("");

  async function uploadAndMint() {
    try {
      const key = import.meta.env.VITE_NFT_STORAGE_KEY;
      if (!key) throw new Error("set VITE_NFT_STORAGE_KEY");
      if (!file) throw new Error("select file");
      setStatus("Uploading to IPFS...");
      const client = new NFTStorage({ token: key as string });
      const cid = await client.store({
        name,
        description: desc,
        image: file
      });
      const uri = cid.url; // ipfs://...
      setStatus("Minting on-chain...");
      const tx = await nft.connect(signer).publicMint(uri, { value: 0 });
      await tx.wait();
      setStatus("Minted!");
    } catch (e: any) {
      console.error(e);
      setStatus("Error: " + (e?.message ?? e));
    }
  }

  return (
    <div>
      <input placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} />
      <br />
      <textarea placeholder="Description" value={desc} onChange={(e) => setDesc(e.target.value)} />
      <br />
      <input type="file" onChange={(e) => setFile((e.target.files && e.target.files[0]) as any)} />
      <br />
      <button onClick={uploadAndMint}>Upload & Mint</button>
      <div>{status}</div>
    </div>
  );
}

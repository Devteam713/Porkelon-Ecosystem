import React from "react";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import PresaleBuy from "./PresaleBuy";
import StakeLP from "./StakeLP";
import StakePORK from "./StakePORK";
import MintNFT from "./MintNFT";
import AddLiquidity from "./AddLiquidity";
import ClaimRewards from "./ClaimRewards";

export default function Dashboard() {
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div />
        <ConnectButton />
      </div>

      <div style={{ marginTop: 16 }} className="container">
        <div className="card">
          <h3>Presale</h3>
          <PresaleBuy />
        </div>

        <div className="card">
          <h3>Mint NFT</h3>
          <MintNFT />
        </div>
      </div>

      <div style={{ marginTop: 16 }} className="container">
        <div className="card">
          <h3>Stake LP (Liquidity Mining)</h3>
          <StakeLP />
          <ClaimRewards />
        </div>

        <div className="card">
          <h3>Stake PORK (StakingRewards)</h3>
          <StakePORK />
        </div>
      </div>

      <div style={{ marginTop: 16 }} className="container">
        <div className="card">
          <h3>Add Liquidity</h3>
          <AddLiquidity />
        </div>
      </div>
    </div>
  );
}

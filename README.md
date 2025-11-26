---
🐷 Porkelon Ecosystem

Token • Presale • Liquidity • Staking • Airdrops • Dashboard

The Porkelon Ecosystem is a complete, modular, upgradeable DeFi infrastructure deployed on Polygon.
It includes the Porkelon Token (upgradeable ERC-20), presale engine, liquidity manager, staking vaults, airdrop distributor, and a full Web3 dashboard application.

This repository contains every component needed to deploy, manage, upgrade, and operate the Porkelon ecosystem end-to-end.


---

🚀 Features

🪙 Porkelon Token (Upgradeable)

UUPS-upgradeable ERC-20

Minting & burning (owner)

Supply control

Pausable & secure

Designed for DeFi integrations


💰 Presale Engine

MATIC → token sale

Rate-based token pricing

Softcap / hardcap

Contribution limits

Token claiming

Owner finalization

Treasury routing


🌊 Liquidity Manager

Token/ETH (MATIC) liquidity injection

Router-agnostic (UniswapV2-compatible)

LP automation

Admin approval tools

Token recovery


📈 Staking Vaults

Stake token → earn token

Time-based reward emissions

Reward per token accounting

Withdraw + claim

Adjustable emission rate


🎁 Airdrop Distributor

Bulk ERC-20 distribution

Owner-controlled

Merkle-drop extensions supported


🖥 Web Dashboard

A React + Vite + Tailwind dApp that provides:

Wallet connection

Token balance & supply view

Presale participation

Staking interface

Claiming airdrops

Live contract reads via Web3



---

📦 Repository Structure

porkelon-ecosystem/
├── contracts/
│   ├── token/
│   ├── presale/
│   ├── staking/
│   ├── liquidity/
│   ├── airdrop/
│   └── utils/
├── scripts/
│   ├── deploy.js
│   ├── upgrade.js
│   └── verify.js
├── frontend/
│   ├── public/
│   └── src/
├── hardhat.config.js
├── package.json
└── README.md


---

🛠 Smart Contract Stack

Solidity ^0.8.20

OpenZeppelin upgradeable contracts

Hardhat

Polygonscan automated verification

UUPS Proxy upgrade pattern

Reentrancy protection

Owner-gated administration



---

⚙️ Setup

1. Install root dependencies

npm install

2. Install frontend dependencies

cd frontend
npm install

3. Environment variables

Create .env in the project root:

PRIVATE_KEY=your_wallet_key
AMOY_RPC=https://amoy-rpc-url
POLYGON_RPC=https://polygon-rpc.com/
ETHERSCAN_API_KEY=polygonscan_key


---

📤 Compile & Test

npm run compile
npm run test


---

🚀 Deployment

Deploy to Amoy

npm run deploy:amoy

Deploy to Polygon Mainnet

npm run deploy:polygon

Upgrade Proxy

npm run upgrade:polygon

Verify Contracts

npm run verify


---

🖥 Frontend

Start local dev:

cd frontend
npm run dev

Build production:

npm run build

Preview build:

npm run preview


---

🔐 Security

Uses OpenZeppelin libraries

Follows upgrade-safe patterns

Reentrancy protected

Owner-controlled administrative functions

LP recovery and token recovery safeguards


Recommended:
Before mainnet deployment, perform a full audit and enable multisig ownership.


---

📚 Extensions (Optional)

Time-vested presale claims

Merkle airdrops

Anti-bot presale gatekeeper

Auto-LP + burner automation

Reward multipliers for staking tiers

Frontend mobile-optimized flows



---

🤝 Contributing

PRs and feature suggestions are welcome.
Open an issue for proposals, bug reports, or improvements.


---

📄 License

MIT — free to use, modify, and commercialize.


---

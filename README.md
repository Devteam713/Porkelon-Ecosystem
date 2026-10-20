# Porkelon Ecosystem

Porkelon is a modular DeFi ecosystem built on Polygon, designed to support token issuance, presale fundraising, staking, liquidity automation, and token distribution in a secure and upgradeable way.

The ecosystem includes:
- UUPS-upgradeable ERC-20 token
- presale engine with caps and claim flow
- liquidity manager for LP automation
- staking vaults with reward accrual
- airdrop distribution system
- React + Vite dashboard for wallet and contract interaction

## Overview

Porkelon Ecosystem provides the core components needed to deploy and operate a DeFi token project end-to-end. Each module is designed to be modular, upgradeable, and compatible with standard Polygon tooling.

This repository includes:
- smart contracts
- deployment and upgrade scripts
- testing setup
- frontend dashboard
- operational documentation

## Architecture

- Token layer: governance and economic base
- Presale layer: fundraising and vesting/claim logic
- Staking layer: reward accrual and token locking
- Liquidity layer: LP management and token routing
- Airdrop layer: token distribution
- Frontend: wallet-driven user interface

## Features

### Token
- UUPS upgradeable ERC-20
- minting and burning controls
- pausable security
- supply management
- DeFi-friendly integration

### Presale
- MATIC-to-token sales
- rate-based pricing
- soft cap and hard cap controls
- contribution limits
- token claiming
- owner finalization
- treasury routing

### Liquidity Manager
- token/MATIC liquidity injection
- router-agnostic liquidity automation
- LP management tools
- admin approvals
- token recovery functions

### Staking
- token staking
- time-based reward emissions
- reward-per-token accounting
- claim + withdraw flow
- adjustable emission rates

### Airdrop
- bulk ERC-20 distribution
- owner-controlled distribution
- Merkle support ready for extension

### Dashboard
- wallet connect
- token balances and supply
- presale participation
- staking actions
- airdrop claiming
- contract reads via Web3

## Repository Structure

```bash
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
├── README.md
└── .env.example

Tech Stack
Solidity ^0.8.20
OpenZeppelin Upgradeable Contracts
Hardhat
Ethers.js
React
Vite
Tailwind CSS
Polygon / Amoy support
Prerequisites
Before starting, ensure you have:

Node.js 18+
npm or yarn
MetaMask or compatible wallet
private key for deployment
RPC endpoint for Polygon or Amoy
Installation
bash
npm install
Frontend dependencies:
```
bash
cd frontend
npm install
Environment Setup
Create a .env file in the project root:
```
env
PRIVATE_KEY=your_wallet_key
AMOY_RPC=https://amoy-rpc-url
POLYGON_RPC=https://polygon-rpc.com/
ETHERSCAN_API_KEY=polygonscan_key
Notes:

Do not commit your private key
Use testnet keys for testing
Use a secure deployment wallet for production
Compile and Test
bash
npm run compile
npm run test
Deployment
Deploy to Amoy
bash
npm run deploy:amoy
Deploy to Polygon Mainnet
bash
npm run deploy:polygon
Upgrade Proxy
bash
npm run upgrade:polygon
Verify Contracts
bash
npm run verify
Frontend
Start the local dashboard:
```
bash
cd frontend
npm run dev
Build production assets:
```
bash
npm run build
Preview the build:
```
bash
npm run preview
Security Considerations
This project uses:

OpenZeppelin libraries
upgrade-safe proxy patterns
reentrancy protection
owner-gated admin controls
Recommended production safeguards:

multisig ownership
full independent audit
formal contract review before mainnet launch
restrict admin privileges where possible
verify all upgrade paths before deployment
Roadmap / Extensions
Possible future additions:

vesting-based presale claims
Merkle airdrop support
anti-bot presale protections
auto-LP and burn automation
tiered staking reward multipliers
mobile-first dashboard UX
Contributing
Pull requests and feature suggestions are welcome. If you want to propose a new feature or report a bug, open an issue with details and reproduction steps.

License
MIT License. Free to use, modify, and commercialize.

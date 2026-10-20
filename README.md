# Porkelon Ecosystem

Porkelon is a modular DeFi ecosystem built on Polygon, designed to support token issuance, presale fundraising, staking, liquidity management, and token distribution in a secure, upgradeable, and developer-friendly architecture.

This repository contains the complete set of components needed to deploy, operate, and extend the Porkelon ecosystem end-to-end, including:
- upgradeable ERC-20 token
- presale engine
- liquidity manager
- staking vaults
- airdrop distributor
- React + Vite dashboard

## Overview

Porkelon Ecosystem is built to provide a full-stack foundation for a token project operating in DeFi. The architecture separates the core economic and operational components into modular smart contracts and exposes them through a modern web dashboard for users and administrators.

The project is designed around:
- upgradeability and maintainability
- secure ownership controls
- DeFi-native workflows
- Polygon deployment compatibility
- extensibility for future incentives and product growth

## Architecture

The ecosystem is organized into a set of functional layers:

- Token Layer: ERC-20 token issuance, supply controls, and upgradeability
- Presale Layer: fundraising flow, pricing logic, caps, claims, and finalization
- Staking Layer: reward accrual, token locks, withdrawals, and emissions
- Liquidity Layer: LP automation and router-compatible liquidity management
- Airdrop Layer: bulk distribution and recipient claim logic
- Frontend Layer: wallet interaction, balance views, staking, presale, and contract reads

## Features

### Token
- UUPS-upgradeable ERC-20
- owner-controlled minting and burning
- pause support
- supply management
- security-focused upgrade pattern
- built for DeFi integration

### Presale Engine
- MATIC-to-token fundraising flow
- rate-based token pricing
- soft cap and hard cap enforcement
- contribution limits
- token claim process
- finalization by owner
- treasury routing

### Liquidity Manager
- token/MATIC liquidity injection
- router-agnostic design for UniswapV2-compatible ecosystems
- LP automation
- admin approval workflows
- token recovery functionality

### Staking Vaults
- stake token to earn rewards
- time-based reward emissions
- reward-per-token accounting
- withdraw and claim flows
- adjustable emission rate

### Airdrop Distributor
- bulk ERC-20 distribution
- owner-controlled operations
- Merkle-drop compatibility for scalable claims

### Web Dashboard
- wallet connection
- token supply and balance views
- presale participation interface
- staking dashboard
- airdrop claiming
- live contract reads via Web3

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
├── .env.example
└── .gitignore
```

## Tech Stack

- Solidity ^0.8.20
- OpenZeppelin upgradeable contracts
- Hardhat
- Ethers.js
- React
- Vite
- Tailwind CSS
- Polygon / Amoy support

## Prerequisites

Before you start, make sure you have:
- Node.js 18+
- npm or yarn
- a wallet such as MetaMask
- a deployment wallet private key
- an RPC endpoint for Polygon or Amoy

## Quick Start

Install root dependencies:

```bash
npm install
```

Install frontend dependencies:

```bash
cd frontend
npm install
```

## Environment Setup

Create a `.env` file in the project root:

```env
PRIVATE_KEY=your_wallet_key
AMOY_RPC=https://amoy-rpc-url
POLYGON_RPC=https://polygon-rpc.com/
ETHERSCAN_API_KEY=polygonscan_key
```

Notes:
- Never commit your private key
- Use testnet keys for local testing
- Use a secure wallet for production deployments

## Compile and Test

Compile contracts:

```bash
npm run compile
```

Run test suite:

```bash
npm run test
```

## Deployment

Deploy to Amoy:

```bash
npm run deploy:amoy
```

Deploy to Polygon mainnet:

```bash
npm run deploy:polygon
```

Upgrade proxy contracts:

```bash
npm run upgrade:polygon
```

Verify deployed contracts:

```bash
npm run verify
```

## Frontend

Start the local development server:

```bash
cd frontend
npm run dev
```

Build production assets:

```bash
npm run build
```

Preview the production build:

```bash
npm run preview
```

## Security Considerations

This project includes:
- OpenZeppelin security libraries
- upgrade-safe proxy patterns
- reentrancy protection
- owner-controlled administrative functions

Recommended production safeguards:
- multisig governance for admin roles
- third-party smart contract audit before mainnet launch
- strict review of upgrade paths
- controlled access to privileged functions
- validation of treasury and reward routing flows

## Roadmap / Extensions

Possible future enhancements include:
- vesting-based presale claims
- Merkle airdrops
- anti-bot presale protections
- auto-LP and burn mechanisms
- tiered staking reward multipliers
- mobile-first dashboard improvements
- analytics and treasury reporting

## Contributing

Contributions are welcome. If you want to propose a feature, fix a bug, or improve the ecosystem, feel free to open an issue or submit a pull request with a clear description of the change.

## License

MIT License. This project is free to use, modify, and commercialize.

---

Porkelon Ecosystem — token, presale, liquidity, staking, airdrops, and dashboard infrastructure for the Polygon ecosystem.
```

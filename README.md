# Porkelon-Ecosystem
Porkelon Token web app
### Install Vite
npm create vite@latest porkelon-presale -- --template react-ts
cd porkelon-presale
npm install
---
### Install Dependencies
npm install web3 tailwindcss postcss autoprefixer @types/web3
---
### File Structure ###
```
porkelon-presale/
├── public/
│   ├── favicon.ico
│   └── manifest.json
├── src/
│   ├── components/
│   │   ├── Header.tsx
│   │   ├── WalletConnect.tsx
│   │   ├── PresaleForm.tsx
│   │   ├── ProgressBar.tsx
│   │   └── Footer.tsx
│   ├── hooks/
│   │   └── useWeb3.ts
│   ├── utils/
│   │   └── constants.ts
│   ├── App.tsx
│   ├── main.tsx
│   ├── index.css
│   └── vite-env.d.ts
├── vite.config.ts
├── tailwind.config.js
├── postcss.config.js
└── package.json
```
---
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
## Setup and Deployment Instructions
### Setup Project:
## Build: npm run build.
## Deploy to Vercel/Netlify: Push to GitHub and link to a static hosting service.
## Ensure CORS and RPC endpoints are accessible.
### Security:
-Audit the presale contract for reentrancy, overflow, and access control issues.
-Add max buy limits and slippage protection in the contract.
-Use HTTPS for deployment to secure wallet interactions.
---
### Setup Instructions ###
---
Initialize Project:
npm create vite@latest porkelon-presale -- --template react-ts
cd porkelon-presale
npm install web3 @types/web3 tailwindcss postcss autoprefixer @rainbow-me/rainbowkit wagmi viem
Replace Files:
Use the provided index.html from previous responses.
Copy the above files into /src and configuration files into the root.
Update Contract Addresses:
Replace PRESALE_CONTRACT, STAKING_CONTRACT, and LIQUIDITY_CONTRACT in constants.ts with your deployed contract addresses.
Update ABI with the full contract interfaces if available.
Test on Amoy:
Deploy contracts to Amoy testnet (CHAIN_ID: 80002) using Remix/Hardhat.
Get test MATIC from Polygon Faucet.
Run: npm run dev.
Mainnet Deployment:
Update CHAIN_ID to 137 and POLYGON_RPC to 'https://polygon-rpc.com/'.
Deploy contracts to Polygon mainnet.
Build and deploy: npm run build and host on Vercel/Netlify.

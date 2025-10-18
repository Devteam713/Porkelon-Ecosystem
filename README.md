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

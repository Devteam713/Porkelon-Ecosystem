# Porkelon Web App 🐷

The frontend for the Porkelon ($PORK) ecosystem on Polygon — marketing landing page plus dApp widgets for presale, minting, staking, and liquidity.

**Live design:** purple/indigo glassmorphism, mobile-responsive.

## What's here

- **Landing page** (`src/components/LandingPage.tsx`) — hero, features, tokenomics (200B supply + allocation bars), 3-phase roadmap, community links (Telegram, X, website)
- **Presale** (`src/components/PresaleForm.tsx` + `ProgressBar.tsx`) — buy $PORK with MATIC on Amoy testnet
- **Ecosystem** — `MintForm.tsx` (mint $PORK), `StakeWidget.tsx` (approve/stake/claim rewards), `AddLiquidity.tsx` (PORK/MATIC pool)
- **Wallet** (`src/components/WalletConnect.tsx`) — handles no-wallet (MetaMask install prompt), wrong-network (switch to Amoy), and connection errors
- **Contract config** (`src/contracts/addresses.ts`) — single source of truth for deployed addresses

## Contract status

The smart contracts are **not deployed yet**. Until `src/contracts/addresses.ts` has real addresses, the presale and ecosystem sections show "coming soon" states instead of broken widgets. Nothing will crash — the app degrades gracefully.

## Run locally

```bash
cd web
npm install
npm run dev
```

Opens at `http://localhost:3000`.

## Configure contract addresses after deployment

1. Deploy the contracts (see the repo root for the Hardhat deploy scripts). The deploy script writes `deployments/amoy.json`.
2. Copy `src/contracts/addresses.example.ts` to `src/contracts/addresses.ts`:

   ```bash
   cp src/contracts/addresses.example.ts src/contracts/addresses.ts
   ```

3. Fill in each address from `deployments/amoy.json`. Use the `0x...` string format, e.g.:

   ```ts
   export const AMOY_ADDRESSES = {
     PorkelonToken: "0xabc...",
     PresaleEngine: "0xdef...",
     // ...
   } as const;
   ```

4. Rebuild. The dApp widgets activate automatically once `PorkelonToken` and `PresaleEngine` are set (`CONTRACTS_DEPLOYED` in `addresses.ts`).

**Never commit `addresses.ts` with real mainnet addresses to a public repo.** The `.gitignore` should cover it, or keep this repo private.

## Deploy to Vercel

1. Push this repo to GitHub (already done: `Devteam713/Porkelon-Ecosystem`).
2. In the [Vercel dashboard](https://vercel.com), import the repo.
3. Set the **root directory** to `web`.
4. Framework preset: **Vite**. Build command: `npm run build`. Output directory: `dist`.
5. Deploy. No environment variables are needed for the frontend alone.

To point the deployed site at real contracts, either commit `addresses.ts` with the Amoy addresses (testnet only) or rebuild locally with the addresses filled in and deploy the `dist/` output.

## Tech stack

- Vite 8 + React 18 + TypeScript
- Tailwind CSS v4 (via `@tailwindcss/postcss`)
- web3.js v4 for wallet + contract interaction
- Target network: Polygon Amoy testnet (chain ID 80002)

## Notes

- `src/legacy/` holds unused wagmi v1-era components (Dashboard, WalletProvider, old hooks). They are excluded from the build and kept for reference only.
- `src/utils/constants.ts` still contains placeholder contract strings (`0xYourPresaleContractAddressHere`) — these are legacy and unused by the active code path, which reads from `src/contracts/addresses.ts`.

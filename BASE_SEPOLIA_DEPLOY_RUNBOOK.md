# Porkelon — Base Sepolia Testnet Deployment Runbook

Deploy all 7 Porkelon contracts to Base Sepolia (testnet). Takes ~15 minutes once
the deployer is funded. Do this BEFORE any mainnet deployment.

**Switched from Polygon Amoy on 2026-10-19** — Amoy funding kept failing on wallet UX,
so the target is now Base Sepolia (chain 84532). The Amoy scripts and runbook remain
in the repo for reference.

## Prerequisites (Erik)

- [ ] Base Sepolia ETH in the deployer wallet `0x96D130846Cbb426051Bc9eB936aEFF278AF98B39`
      (≥ 0.01 ETH) — get it from a faucet:
      - https://www.coinbase.com/faucets/base-ethereum-sepolia-faucet (needs Coinbase account)
      - https://faucet.quicknode.com/base/sepolia
- [ ] Etherscan API key (free at etherscan.io → API Keys) — for contract verification
      (already connected as `custom.etherscan`; set `ETHERSCAN_API_KEY` in `.env`)
- [ ] Confirmed presale price: $0.000015/PORK (`PORK_PER_USDC=66666.67`)

## What happens automatically

The 15-minute watcher (`porkelon-amoy-deploy-watcher` cron, now retargeted) checks the
deployer balance on Base Sepolia. The moment it sees ≥ 0.01 ETH it runs
`scripts/deploy-base-sepolia.ts --network baseSepolia` once and reports all seven
contract addresses.

## Manual deploy (if you prefer)

```bash
cd ~/workspace/porkelon-ecosystem
npx hardhat run scripts/deploy-base-sepolia.ts --network baseSepolia
```

## Post-deploy (still required)

1. Fund the PresaleEngine with PORK from the presale allocation (the deploy script
   does not do this — claims would fail without it).
2. Confirm the token's hardcoded presale wallet matches `0x22874758705f24bfae1F524B590B24217B949088`.
3. Set a real `ROUTER_BASE_SEPOLIA` in `.env` if testing LP flows.
4. Liquidity wallet `0x23cE6D1E06D8509A5668e9E1602de1c2b19ba3a2` was never reconfirmed by Erik.

## Reference

- Deploy script: `scripts/deploy-base-sepolia.ts`
- Watcher: `~/.jarvis/idea-executions/3b55db52-d5e1-4d4c-bedf-771631626142/scratch/watch-and-deploy-base-sepolia.sh`
- Addresses land in: `deployments/base-sepolia.json`
- Old Amoy path: `scripts/deploy-amoy.ts`, `AMOY_DEPLOY_RUNBOOK.md` (kept for reference)

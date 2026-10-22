# Porkelon — Amoy Testnet Deployment Runbook

Deploy all 7 Porkelon contracts to Polygon Amoy (testnet) from a GitHub Codespace.
Takes ~15 minutes. Do this BEFORE any mainnet deployment.

## Prerequisites (Erik)

- [ ] GitHub Codespace opened on `Devteam713/Porkelon-Ecosystem`, branch `feature/porkelon-amoy-deploy`
- [ ] A **fresh testnet-only** wallet (create in MetaMask → new account). Never reuse a mainnet key.
- [ ] Amoy test MATIC in that wallet → https://amoyfaucet.up.railway.app
- [ ] Polygonscan API key (free at polygonscan.com → API-KEYs) — for contract verification
- [ ] Confirmed presale price (see below)

## 1. Setup

```bash
cd ~/workspaces/Porkelon-Ecosystem   # adjust to your Codespace path
git pull origin feature/porkelon-amoy-deploy
npm install
cp .env.example .env
```

## 2. Configure `.env`

Fill in (values below are Erik's confirmed wallets):

```ini
DEPLOYER_PRIVATE_KEY=0x<fresh-testnet-only-key>
POLYGONSCAN_API_KEY=<your-polygonscan-key>

TEAM_WALLET=0xA0bFf660B20466F11E659dd948e2F18152E185bF
MARKETING_WALLET=0xA0bFf660B20466F11E659dd948e2F18152E185bF
LIQUIDITY_WALLET=0x23cE6D1E06D8509A5668e9E1602de1c2b19ba3a2
FUNDS_WALLET=0xA0bFf660B20466F11E659dd948e2F18152E185bF
DEV_WALLET=0xBc2E051f3Dedcd0B9dDCA2078472f513a39df2C6
PRESALE_WALLET=0x22874758705f24bfae1F524B590B24217B949088
AIRDROP_WALLET=0x56e3CEF5C239fB8DF1A2D372ADCC0feDb4BA6E63
STAKING_WALLET=0x4297606399488995d0e29EdB2779E96f8572937E

# Presale timing — MUST be a future unix timestamp. Example: 2026-10-20 10:00 CDT
PRESALE_START=<unix-timestamp-in-future>
PRESALE_DAYS=30

# ⚠ PRICE — PORK_PER_USDC = PORK tokens per 1 USDC (must be >> 1).
# For $0.000015 per PORK:  PORK_PER_USDC=66666.67
# The script ABORTS if this is < 1 (fractional values invert the price).
PORK_PER_USDC=66666.67
```

Get a future timestamp: `date -d "2026-10-20 10:00:00" +%s` (use your intended start).

## 3. Deploy

```bash
npx hardhat run scripts/deploy-amoy.ts --network amoy
```

The script deploys all 7 contracts, writes `deployments/amoy.json`, and verifies
each on AmoyScan. If verification is skipped (no API key), run it later with the
same constructor args printed in the log.

**The script will refuse to run if:**
- `PRESALE_START` is in the past → set a future timestamp
- `PORK_PER_USDC` < 1 → you inverted the price; fix it

## 4. Sanity checks (in the Codespace)

```bash
# 1. All 7 addresses present
cat deployments/amoy.json | python3 -c "import json,sys; d=json.load(sys.stdin); print('\n'.join(f'{k}: {v}' for k,v in d['contracts'].items()))"

# 2. Token has a name/symbol (replace ADDR)
npx hardhat console --network amoy
> const t = await ethers.getContractAt("Porkelon", "<PorkelonToken addr>");
> await t.name(); await t.symbol(); await t.totalSupply().then(String)
```

## 5. Hand back to Flint

Send the full contents of `deployments/amoy.json`. Flint will:
- Wire the addresses into `web/src/contracts/addresses.ts`
- Rebuild + push the web app
- Prepare the mainnet deployment plan

## 6. After Amoy is green → mainnet plan

- Same 7 contracts, same script pattern, against the **live** PORK token
  (`0xBA4284495CE3B8C029C2CBAbc821526464A93CA9`) instead of deploying a new token
- Mainnet deploy uses a separate hardened script (to be prepared after Amoy)
- Real USDC (`0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174`) and a real DEX router
- Fund the mainnet deployer with real POL for gas

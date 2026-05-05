# Task Report — Real Solana Devnet SGL Audit Layer

Date: 2026-05-05

## What Was Demo Before

- SGL balance and debit were simulated in frontend/backend preview flows.
- txSignature and explorer links could be mock values.
- No real Associated Token Account provisioning per user wallet.
- No real SPL mint credit on first access.
- Audit trail depended on local mock records and non-verifiable events.

## What Is Real Now

- Solana connection is real on Devnet via backend services.
- Wallet provisioning endpoint validates public key, creates/uses ATA and mints initial SGL once.
- Initial credit (default 10,000) is minted using mint authority/deployer keypair.
- Balance is read from real SPL Token ATA on Solana Devnet.
- Proof events are registered on-chain via Memo Program with real txSignature and explorer URL.
- Audit trail is persisted in backend local JSON storage with public metadata only.
- Frontend Vault and Audit panels read backend data and show real txSignature/explorerUrl.
- Demo fallback remains only when VITE_ENABLE_MOCK_VAULT=true.

## What Is Still Not Real

- Non-custodial debit transfer finalization is not fully completed end-to-end with user-signed submission in UI.
- Backend now returns unsigned transfer transaction and marks debitStatus=pending_wallet_signature.
- UI does not claim debit confirmation when user signature is still required.

## Required Environment Variables

Backend:

- SOLANA_CLUSTER=devnet
- SOLANA_RPC_URL=https://api.devnet.solana.com
- SGL_NETWORK=solana-devnet
- SGL_MINT_ADDRESS=<devnet_spl_mint>
- SGL_AUTHORITY_WALLET=<mint_authority_pubkey>
- SGL_TREASURY_WALLET=<optional_treasury_pubkey_or_empty>
- SGL_DEPLOYER_KEYPAIR_PATH=/root/.config/solana/singulai/singulai-devnet-deployer.json
- SGL_INITIAL_CREDIT=10000
- SGL_DECIMALS=9
- PUBLIC_APP_URL=https://singulai.live

Frontend:

- VITE_API_BASE_URL=/api/v1
- VITE_ENABLE_MOCK_VAULT=false

## How To Create SGL SPL Token on Devnet

1. Configure Solana CLI to Devnet.
2. Create a new token mint (SPL Token Program).
3. Set mint authority and freeze authority according to project policy.
4. Export mint address and set SGL_MINT_ADDRESS.
5. Ensure deployer keypair has SOL for tx fees on Devnet.

## How To Create/Verify Associated Token Account

1. Call POST /api/v1/wallets/provision with walletAddress.
2. Backend computes ATA for wallet + SGL mint.
3. If ATA does not exist, backend creates ATA.
4. Response includes tokenAccount.
5. Validate ATA in Solana Explorer token account view.

## How To Validate Transactions in Solana Explorer

1. Capture txSignature from API response (wallet provision, debit proof, or audit proof).
2. Open explorerUrl returned by API.
3. Confirm cluster=devnet in URL.
4. Verify Memo payload and transaction status.

## Smoke Test

Script: scripts/smoke-solana-real-layer.sh

Example:

```bash
export API_BASE=http://127.0.0.1:9200/api/v1
export SGL_MINT_ADDRESS=<mint>
export TEST_SOLANA_WALLET_ADDRESS=<wallet>
./scripts/smoke-solana-real-layer.sh
```

Checks:

- Fails when SGL_MINT_ADDRESS is empty.
- Calls wallet provision endpoint.
- Calls balance endpoint.
- Calls audit proof endpoint.
- Validates explorer URL includes explorer.solana.com/tx/.
- Validates txSignature does not start with MOCK.

## Risks and Pending Items

- Pending UI support to sign and submit unsigned debit transfer for confirmed non-custodial debit.
- Local JSON storage is acceptable for MVP/hackathon but not production durability.
- Devnet RPC availability and rate limits can affect UX during demos.
- Deployer keypair file path must exist in runtime environment.

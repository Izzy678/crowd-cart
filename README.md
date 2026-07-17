# CrowdCart

Conditional group purchases on **Monad Testnet**. Friends pool MON toward a target; the organizer withdraws if funded, contributors claim refunds if the deadline passes underfunded.

## Structure

- `contracts/` — Foundry (Solidity) — `CrowdCart.sol`
- `web/` — Next.js app (wagmi + viem)

## Contracts

```bash
cd contracts
forge test
```

### Deploy to Monad Testnet

1. Get testnet MON from https://faucet.monad.xyz
2. Copy `contracts/.env.example` → `contracts/.env` and set `PRIVATE_KEY` (no `0x` prefix or with — Foundry accepts both)
3. Deploy:

```bash
cd contracts
source .env   # or export PRIVATE_KEY=...
forge script script/Deploy.s.sol:Deploy --rpc-url https://testnet-rpc.monad.xyz --broadcast -vvvv
```

4. Copy the logged address into `web/.env.local`:

```
NEXT_PUBLIC_CROWDCART_ADDRESS=0x...
NEXT_PUBLIC_MONAD_RPC_URL=https://testnet-rpc.monad.xyz
```

## Web

```bash
cd web
cp .env.example .env.local   # then set contract address
npm install
npm run dev
```

Open http://localhost:3000

## Demo flow

1. Connect wallet (Monad Testnet)
2. Create a cart
3. Share `/cart/[id]`
4. Contribute from another wallet
5. Withdraw (if funded) or claim refund (if deadline passed underfunded)

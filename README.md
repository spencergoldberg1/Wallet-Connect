# Wallet Connect

Connect a browser wallet through WalletConnect, using the current official SDK,
[Reown AppKit](https://docs.reown.com/appkit/javascript/core/installation) with the
ethers v6 adapter.

The repo contains two things:

1. **A small library** (`src/`, published shape in `dist/lib`) that wraps AppKit with
   connect, disconnect, session restore, chain switching and typed errors. It builds to
   ESM and CJS with type declarations and source maps.
2. **An Express demo server** (`index.js`, `views/`) with pages for EVM (WalletConnect),
   Tron (TronLink / Ledger / WalletConnect), Solana (wallet-adapter) and Cardano (Lucid).
   Page scripts in `public/src/walletconnect/` are bundled by webpack.

## Install

Requires Node.js 20 or newer and npm (the lockfile is `package-lock.json`).

```bash
npm ci
cp .env.example .env   # then fill in the values
```

## Environment variables

| Variable | Used by | Notes |
| --- | --- | --- |
| `WALLET_CONNECT_PROJECT_ID` | EVM and Tron pages | Required. Get a project ID from https://dashboard.reown.com |
| `WALLET_CONNECT_CHAIN_IDS` | EVM page | Optional comma-separated chain IDs. Default `1,42161,137,10,324`. Testnets: `11155111` (Sepolia), `80002` (Polygon Amoy), `84532` (Base Sepolia) |
| `APP_NAME`, `APP_DESCRIPTION`, `APP_URL`, `APP_ICON_URL` | wallet prompts | `APP_URL` must match the origin the page is served from |
| `BLOCKFROST_PROJECT_ID`, `CARDANO_NETWORK` | `/lucid` | Network defaults to `Preprod` (testnet) |
| `BASE_URL`, `XUMM_API_KEY`, `XUMM_API_SECRET` | Xumm OAuth routes | Server-side only |
| `PORT` | server | Default `3000` |

Browser-visible values are rendered into each page by the server
(`lib/client-config.js`). Bundles contain no IDs or keys, so you can build without a
`.env`. The WalletConnect project ID is public by design, since it is sent from the
browser, but keep it out of git anyway so it can be rotated. Restrict allowed origins
in the Reown dashboard.

## Run

```bash
npm run build      # library + page bundles
npm start          # http://localhost:3000
npm run dev        # same, restarting on changes (nodemon)
```

Pages: `/wallet_connect/evm`, `/wallet_connect/tron`, `/wallet_connect/solana`, `/lucid`.

## Build

| Script | Output |
| --- | --- |
| `npm run build:lib` | `dist/lib/index.{mjs,cjs,d.ts,d.mts}` and `dist/lib/utils.*`, with source maps (tsup) |
| `npm run build:web` | `dist/<page>/bundle.js` plus lazy chunks and source maps (webpack), copied to `public/src/wallet_connect/` |
| `npm run size` | raw and gzip size of every emitted JS/WASM file |

The EVM page bundle is about 6 KiB. AppKit (about 1.9 MiB minified, 0.55 MiB gzip)
is loaded as a separate chunk once the page is interactive.

## Library usage

```ts
import { createEvmConnector } from 'wallet-connect';

const wallet = createEvmConnector({
  projectId: config.projectId,      // from your environment, never hardcoded
  chainIds: [11155111],             // Sepolia
  metadata: { name: 'My dapp', url: window.location.origin },
});

wallet.subscribe((state) => console.log(state.status, state.address, state.chainId));
await wallet.restoreSession();      // picks up a previous session, if any
await wallet.connect();             // opens the AppKit modal
await wallet.disconnect();
```

Errors are `WalletConnectError` instances with a `code`: `CONFIG`,
`USER_REJECTED`, `MODAL_CLOSED`, `TIMEOUT`, `UNSUPPORTED_CHAIN` or `UNKNOWN`.

Address helpers (`isEvmAddress`, `isTronAddress`, `isSolanaAddress`,
`shortenAddress`) and config helpers are also available from `wallet-connect/utils`,
which does not import AppKit at all. `@reown/appkit`, `@reown/appkit-adapter-ethers`
and `ethers` are peer dependencies.

## Test and lint

```bash
npm test           # vitest: validation, config, errors, server config, connector (AppKit mocked)
npm run lint       # eslint
npm run typecheck  # tsc --noEmit
```

CI (`.github/workflows/ci.yml`) runs lint, typecheck, tests, build and the size
report on Node 22 and 24.

## Limitations

- The connector tests use a mocked AppKit. The real modal was checked in headless
  Chrome with all external network blocked (it opens, closing it gives
  `MODAL_CLOSED`, and a missing project ID shows a config error). A real pairing with
  a wallet over the WalletConnect relay has **not** been tested: it needs a real
  project ID and a wallet. Try it on a testnet (`WALLET_CONNECT_CHAIN_IDS=11155111`).
- Only the EVM page uses the library. The Tron page still uses
  `@tronweb3/tronwallet-adapters` 1.2.4 directly. Its project ID and metadata now come
  from the environment.
- The XRP page (`/wallet_connect/xrp`, `public/src/walletconnect/xrp_wallet_connect.js`)
  is not built by webpack, so its bundle is missing and the page does not work. The
  file is left unchanged on purpose and is excluded from lint, pending a provenance
  review.
- `lucid-cardano` is marked unsupported on npm. The `/lucid` page is a demo that makes
  a throwaway in-memory wallet. Its seed phrase is never logged or stored.
- The WalletConnect project ID and Blockfrost project ID are visible in the browser by
  nature. Restrict them by origin in their dashboards.
- `npm ci` reports deprecated transitive packages, mostly WalletConnect v1 packages
  pulled in by the Solana and Tron wallet adapters. They are not used by the EVM flow.

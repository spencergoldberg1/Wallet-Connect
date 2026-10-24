// Dependency-free helpers. Import from "wallet-connect/utils" to use them without
// pulling Reown AppKit into the bundle.
export {
  DEFAULT_CHAIN_IDS,
  buildMetadata,
  parseChainIds,
  resolveProjectId,
  selectNetworks,
  type AppMetadata,
} from './config';
export { WalletConnectError, normalizeError, type WalletErrorCode } from './errors';
export { isEvmAddress, isSolanaAddress, isTronAddress, shortenAddress } from './validation';

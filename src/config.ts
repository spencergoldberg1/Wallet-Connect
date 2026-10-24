import { WalletConnectError } from './errors';

/** Chains used when the caller does not choose: Ethereum, Arbitrum, Polygon, Optimism, zkSync Era. */
export const DEFAULT_CHAIN_IDS: readonly number[] = [1, 42161, 137, 10, 324];

export interface AppMetadata {
  name: string;
  description: string;
  url: string;
  icons: string[];
}

// Reown project IDs are 32 lowercase hex characters.
const PROJECT_ID = /^[0-9a-f]{32}$/i;

/**
 * Validate a Reown / WalletConnect project ID taken from configuration.
 * Throws a CONFIG error instead of letting AppKit fail later with a vague relay error.
 */
export function resolveProjectId(value: string | undefined | null): string {
  const projectId = (value ?? '').trim();
  if (!projectId) {
    throw new WalletConnectError(
      'CONFIG',
      'Missing WalletConnect project ID. Set WALLET_CONNECT_PROJECT_ID (get one at https://dashboard.reown.com).',
    );
  }
  if (!PROJECT_ID.test(projectId)) {
    throw new WalletConnectError(
      'CONFIG',
      'WALLET_CONNECT_PROJECT_ID is not a valid project ID (expected 32 hex characters).',
    );
  }
  return projectId;
}

/**
 * Parse a chain ID list such as "1,137, 42161" (from an env var) or an array of numbers.
 * Empty input yields the defaults; duplicates are removed and order is preserved.
 */
export function parseChainIds(
  input: string | readonly number[] | undefined | null,
  defaults: readonly number[] = DEFAULT_CHAIN_IDS,
): number[] {
  const raw = typeof input === 'string' ? input.split(',').map((s) => s.trim()).filter(Boolean) : (input ?? []);
  if (raw.length === 0) return [...defaults];

  const ids: number[] = [];
  for (const item of raw) {
    const id = typeof item === 'number' ? item : Number(item);
    if (!Number.isSafeInteger(id) || id <= 0) {
      throw new WalletConnectError('CONFIG', `Invalid chain ID "${String(item)}".`);
    }
    if (!ids.includes(id)) ids.push(id);
  }
  return ids;
}

/** Pick networks by chain ID from a registry, failing loudly on IDs the registry does not know. */
export function selectNetworks<T extends { id: number | string }>(
  chainIds: readonly number[],
  registry: readonly T[],
): [T, ...T[]] {
  const selected = chainIds.map((id) => {
    const network = registry.find((n) => Number(n.id) === id);
    if (!network) {
      throw new WalletConnectError('UNSUPPORTED_CHAIN', `Chain ID ${id} is not in the supported network list.`);
    }
    return network;
  });
  if (selected.length === 0) {
    throw new WalletConnectError('CONFIG', 'At least one network must be configured.');
  }
  return selected as [T, ...T[]];
}

/**
 * Fill in app metadata shown by wallets. `url` must match the page origin or
 * the WalletConnect Verify API flags the dapp, so it defaults to the current origin.
 */
export function buildMetadata(partial: Partial<AppMetadata> = {}, origin?: string): AppMetadata {
  const url = partial.url ?? origin ?? (typeof window !== 'undefined' ? window.location.origin : '');
  return {
    name: partial.name ?? 'Wallet Connect',
    description: partial.description ?? 'Connect a wallet with WalletConnect',
    url,
    icons: partial.icons ?? [],
  };
}

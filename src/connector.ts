import { createAppKit, type AppKit } from '@reown/appkit';
import { EthersAdapter } from '@reown/appkit-adapter-ethers';
import {
  arbitrum,
  base,
  baseSepolia,
  mainnet,
  optimism,
  polygon,
  polygonAmoy,
  sepolia,
  zksync,
  type AppKitNetwork,
} from '@reown/appkit/networks';
import { buildMetadata, parseChainIds, resolveProjectId, selectNetworks, type AppMetadata } from './config';
import { WalletConnectError, normalizeError } from './errors';

/** Every network this package can be configured with. Pick a subset with `chainIds`. */
export const SUPPORTED_NETWORKS: readonly AppKitNetwork[] = [
  mainnet,
  arbitrum,
  polygon,
  optimism,
  zksync,
  base,
  sepolia,
  polygonAmoy,
  baseSepolia,
];

export type ConnectionStatus = 'disconnected' | 'connecting' | 'reconnecting' | 'connected';

export interface WalletState {
  status: ConnectionStatus;
  isConnected: boolean;
  address?: string;
  chainId?: number | string;
}

export interface EvmConnectorOptions {
  /** Reown / WalletConnect project ID; read it from an environment variable, never hardcode it. */
  projectId: string | undefined;
  /** Chain IDs to offer, as numbers or a comma-separated string. Defaults to DEFAULT_CHAIN_IDS. */
  chainIds?: string | readonly number[];
  /** Chain selected when no session exists. Defaults to the first configured chain. */
  defaultChainId?: number;
  metadata?: Partial<AppMetadata>;
  themeMode?: 'light' | 'dark';
  /** Overrides the analytics setting from the Reown dashboard. */
  analytics?: boolean;
  /** How long restoreSession() waits for AppKit to finish reconnecting. Default 10s. */
  restoreTimeoutMs?: number;
}

export interface EvmConnector {
  /** Opens the AppKit modal; resolves once a wallet is connected, rejects if the modal is closed first. */
  connect(): Promise<WalletState>;
  disconnect(): Promise<void>;
  /** Waits for AppKit to restore a persisted session (if any) and returns the resulting state. */
  restoreSession(): Promise<WalletState>;
  getState(): WalletState;
  subscribe(listener: (state: WalletState) => void): () => void;
  switchChain(chainId: number): Promise<void>;
  /** EIP-1193 provider of the connected wallet, for use with ethers' BrowserProvider. */
  getProvider(): unknown;
  /** Removes this connector's subscriptions. */
  destroy(): void;
  readonly appKit: AppKit;
}

const DEFAULT_RESTORE_TIMEOUT_MS = 10_000;
const MODAL_CLOSE_GRACE_MS = 500;

export function createEvmConnector(options: EvmConnectorOptions): EvmConnector {
  const projectId = resolveProjectId(options.projectId);
  const networks = selectNetworks(parseChainIds(options.chainIds), SUPPORTED_NETWORKS);
  const defaultNetwork = options.defaultChainId
    ? selectNetworks([options.defaultChainId], networks)[0]
    : networks[0];

  const appKit = createAppKit({
    adapters: [new EthersAdapter()],
    networks,
    defaultNetwork,
    projectId,
    metadata: buildMetadata(options.metadata),
    themeMode: options.themeMode,
    // Leave analytics unset unless the caller decides, so the Reown dashboard setting applies.
    ...(options.analytics === undefined ? {} : { features: { analytics: options.analytics } }),
  });

  let state: WalletState = { status: 'disconnected', isConnected: false };
  const listeners = new Set<(state: WalletState) => void>();

  const setState = (next: WalletState) => {
    state = next;
    for (const listener of listeners) listener(state);
  };

  const unsubscribers = [
    appKit.subscribeAccount((account) => {
      const status: ConnectionStatus = account.status ?? (account.isConnected ? 'connected' : 'disconnected');
      setState({
        status,
        isConnected: account.isConnected,
        address: account.isConnected ? account.address : undefined,
        chainId: account.isConnected ? appKit.getChainId() : undefined,
      });
    }, 'eip155'),
    appKit.subscribeNetwork((network) => {
      if (state.isConnected) setState({ ...state, chainId: network.chainId });
    }),
  ];

  // Resolves with the first state accepted by `done`; `onCancel` lets the caller reject early.
  const waitFor = (
    done: (s: WalletState) => boolean,
    timeoutMs?: number,
    onCancel?: (reject: (error: WalletConnectError) => void) => () => void,
  ) =>
    new Promise<WalletState>((resolve, reject) => {
      let timer: ReturnType<typeof setTimeout> | undefined;
      let offCancel = () => {};
      const cleanup = () => {
        if (timer) clearTimeout(timer);
        listeners.delete(onState);
        offCancel();
      };
      const onState = (s: WalletState) => {
        if (done(s)) {
          cleanup();
          resolve(s);
        }
      };
      listeners.add(onState);
      if (timeoutMs !== undefined) {
        timer = setTimeout(() => {
          cleanup();
          reject(new WalletConnectError('TIMEOUT', `Timed out after ${timeoutMs}ms.`));
        }, timeoutMs);
      }
      if (onCancel) {
        offCancel = onCancel((error) => {
          cleanup();
          reject(error);
        });
      }
      onState(state);
    });

  // AppKit closes the modal on success, possibly before the account event arrives,
  // so a close only counts as a cancel if no connection shows up shortly after.
  const rejectOnModalClose = (reject: (error: WalletConnectError) => void) => {
    let opened = false;
    let grace: ReturnType<typeof setTimeout> | undefined;
    const off = appKit.subscribeState((modal) => {
      if (modal.open) {
        opened = true;
        if (grace) clearTimeout(grace);
        return;
      }
      if (!opened || grace) return;
      grace = setTimeout(() => {
        grace = undefined;
        if (!state.isConnected) {
          reject(new WalletConnectError('MODAL_CLOSED', 'The wallet modal was closed before a wallet connected.'));
        }
      }, MODAL_CLOSE_GRACE_MS);
    });
    return () => {
      if (grace) clearTimeout(grace);
      off();
    };
  };

  return {
    appKit,

    async connect() {
      if (state.isConnected) return state;
      try {
        const connected = waitFor((s) => s.isConnected, undefined, rejectOnModalClose);
        await appKit.open({ view: 'Connect' });
        return await connected;
      } catch (error) {
        throw normalizeError(error);
      }
    },

    async disconnect() {
      try {
        await appKit.disconnect();
      } catch (error) {
        throw normalizeError(error);
      }
    },

    async restoreSession() {
      try {
        await appKit.ready();
      } catch (error) {
        throw normalizeError(error);
      }
      if (state.status !== 'reconnecting' && state.status !== 'connecting') return state;
      return waitFor(
        (s) => s.status === 'connected' || s.status === 'disconnected',
        options.restoreTimeoutMs ?? DEFAULT_RESTORE_TIMEOUT_MS,
      );
    },

    getState: () => state,

    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },

    async switchChain(chainId) {
      const [network] = selectNetworks([chainId], networks);
      try {
        await appKit.switchNetwork(network, { throwOnFailure: true });
      } catch (error) {
        throw normalizeError(error);
      }
    },

    getProvider: () => appKit.getWalletProvider(),

    destroy() {
      for (const off of unsubscribers) off();
      listeners.clear();
    },
  };
}

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// A stand-in for the AppKit instance: same subscription surface, driven by the test.
type Account = { address?: string; isConnected: boolean; status?: string };
type Listener<T> = (value: T) => void;

class FakeAppKit {
  accountListeners = new Set<Listener<Account>>();
  stateListeners = new Set<Listener<{ open: boolean }>>();
  networkListeners = new Set<Listener<{ chainId?: number | string }>>();
  modal = { open: false };
  chainId: number | string = 1;

  open = vi.fn(async () => this.setModal(true));
  disconnect = vi.fn(async () => this.emitAccount({ isConnected: false, status: 'disconnected' }));
  ready = vi.fn(async () => {});
  switchNetwork = vi.fn(async (network: { id: number }) => {
    this.chainId = network.id;
    for (const l of this.networkListeners) l({ chainId: network.id });
  });
  getWalletProvider = vi.fn(() => ({ request: vi.fn() }));

  subscribeAccount(listener: Listener<Account>) {
    this.accountListeners.add(listener);
    return () => this.accountListeners.delete(listener);
  }
  subscribeState(listener: Listener<{ open: boolean }>) {
    this.stateListeners.add(listener);
    return () => this.stateListeners.delete(listener);
  }
  subscribeNetwork(listener: Listener<{ chainId?: number | string }>) {
    this.networkListeners.add(listener);
    return () => this.networkListeners.delete(listener);
  }
  getState() {
    return this.modal;
  }
  getChainId() {
    return this.chainId;
  }

  setModal(open: boolean) {
    this.modal = { open };
    for (const l of this.stateListeners) l(this.modal);
  }
  emitAccount(account: Account) {
    for (const l of this.accountListeners) l(account);
  }
}

let fake: FakeAppKit;
// eslint-disable-next-line @typescript-eslint/no-unused-vars -- typed for mock.calls
const createAppKit = vi.fn((_options: Record<string, unknown>) => fake);

vi.mock('@reown/appkit', () => ({ createAppKit: (options: Record<string, unknown>) => createAppKit(options) }));
vi.mock('@reown/appkit-adapter-ethers', () => ({ EthersAdapter: class EthersAdapter {} }));

const { createEvmConnector } = await import('../src/connector');

const PROJECT_ID = '0123456789abcdef0123456789abcdef'; // placeholder, not a real project
const ADDRESS = '0x' + '1'.repeat(40);

beforeEach(() => {
  fake = new FakeAppKit();
  createAppKit.mockClear();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('createEvmConnector configuration', () => {
  it('fails fast with CONFIG and never starts AppKit without a project ID', () => {
    expect(() => createEvmConnector({ projectId: undefined })).toThrow(/WALLET_CONNECT_PROJECT_ID/);
    expect(createAppKit).not.toHaveBeenCalled();
  });

  it('passes the project ID, ethers adapter, networks and metadata to AppKit', () => {
    createEvmConnector({
      projectId: PROJECT_ID,
      chainIds: '137,1',
      metadata: { name: 'Test', url: 'https://app.example' },
    });
    const options = createAppKit.mock.calls[0][0] as {
      projectId: string;
      adapters: unknown[];
      networks: { id: number }[];
      defaultNetwork: { id: number };
      metadata: { name: string; url: string };
      features?: unknown;
    };
    expect(options.projectId).toBe(PROJECT_ID);
    expect(options.adapters).toHaveLength(1);
    expect(options.networks.map((n) => n.id)).toEqual([137, 1]);
    expect(options.defaultNetwork.id).toBe(137);
    expect(options.metadata).toMatchObject({ name: 'Test', url: 'https://app.example' });
    expect(options.features).toBeUndefined();
  });

  it('configures the default chain set when none is given', () => {
    createEvmConnector({ projectId: PROJECT_ID });
    const { networks } = createAppKit.mock.calls[0][0] as { networks: { id: number }[] };
    expect(networks.map((n) => n.id)).toEqual([1, 42161, 137, 10, 324]);
  });

  it('supports testnets such as Sepolia', () => {
    createEvmConnector({ projectId: PROJECT_ID, chainIds: [11155111], defaultChainId: 11155111 });
    const { defaultNetwork } = createAppKit.mock.calls[0][0] as { defaultNetwork: { id: number } };
    expect(defaultNetwork.id).toBe(11155111);
  });

  it('rejects chains it does not know and a default chain outside the list', () => {
    expect(() => createEvmConnector({ projectId: PROJECT_ID, chainIds: [56] })).toThrow(/56/);
    expect(() => createEvmConnector({ projectId: PROJECT_ID, chainIds: [1], defaultChainId: 137 })).toThrow(/137/);
  });
});

describe('connect', () => {
  it('opens the modal and resolves with the connected account', async () => {
    const connector = createEvmConnector({ projectId: PROJECT_ID });
    const pending = connector.connect();
    await Promise.resolve();
    expect(fake.open).toHaveBeenCalledWith({ view: 'Connect' });

    fake.emitAccount({ address: ADDRESS, isConnected: true, status: 'connected' });
    fake.setModal(false);

    await expect(pending).resolves.toEqual({ status: 'connected', isConnected: true, address: ADDRESS, chainId: 1 });
    expect(connector.getState().address).toBe(ADDRESS);
  });

  it('resolves when the modal closes just before the account event arrives', async () => {
    vi.useFakeTimers();
    const connector = createEvmConnector({ projectId: PROJECT_ID });
    const pending = connector.connect();
    await vi.advanceTimersByTimeAsync(0);
    fake.setModal(false);
    await vi.advanceTimersByTimeAsync(100);
    fake.emitAccount({ address: ADDRESS, isConnected: true, status: 'connected' });
    await expect(pending).resolves.toMatchObject({ isConnected: true });
  });

  it('rejects with MODAL_CLOSED when the user closes the modal without connecting', async () => {
    vi.useFakeTimers();
    const connector = createEvmConnector({ projectId: PROJECT_ID });
    const pending = connector.connect();
    const assertion = expect(pending).rejects.toMatchObject({ code: 'MODAL_CLOSED' });
    await vi.advanceTimersByTimeAsync(0);
    fake.setModal(false);
    await vi.advanceTimersByTimeAsync(1000);
    await assertion;
  });

  it('maps a wallet rejection thrown by AppKit to USER_REJECTED', async () => {
    fake.open.mockRejectedValueOnce({ code: 4001, message: 'User rejected' });
    const connector = createEvmConnector({ projectId: PROJECT_ID });
    await expect(connector.connect()).rejects.toMatchObject({ code: 'USER_REJECTED' });
  });

  it('returns immediately when already connected', async () => {
    const connector = createEvmConnector({ projectId: PROJECT_ID });
    fake.emitAccount({ address: ADDRESS, isConnected: true, status: 'connected' });
    await expect(connector.connect()).resolves.toMatchObject({ address: ADDRESS });
    expect(fake.open).not.toHaveBeenCalled();
  });
});

describe('disconnect', () => {
  it('disconnects through AppKit and notifies subscribers', async () => {
    const connector = createEvmConnector({ projectId: PROJECT_ID });
    const seen: unknown[] = [];
    connector.subscribe((s) => seen.push(s));
    fake.emitAccount({ address: ADDRESS, isConnected: true, status: 'connected' });

    await connector.disconnect();

    expect(fake.disconnect).toHaveBeenCalledOnce();
    expect(connector.getState()).toEqual({ status: 'disconnected', isConnected: false, address: undefined, chainId: undefined });
    expect(seen).toHaveLength(2);
  });

  it('normalizes disconnect failures', async () => {
    fake.disconnect.mockRejectedValueOnce(new Error('relay down'));
    const connector = createEvmConnector({ projectId: PROJECT_ID });
    await expect(connector.disconnect()).rejects.toMatchObject({ code: 'UNKNOWN', message: 'relay down' });
  });
});

describe('restoreSession', () => {
  it('returns the disconnected state when there is no stored session', async () => {
    const connector = createEvmConnector({ projectId: PROJECT_ID });
    await expect(connector.restoreSession()).resolves.toMatchObject({ isConnected: false });
    expect(fake.ready).toHaveBeenCalledOnce();
  });

  it('waits for an in-progress reconnect to finish', async () => {
    const connector = createEvmConnector({ projectId: PROJECT_ID });
    fake.emitAccount({ isConnected: false, status: 'reconnecting' });
    const pending = connector.restoreSession();
    await Promise.resolve();
    fake.emitAccount({ address: ADDRESS, isConnected: true, status: 'connected' });
    await expect(pending).resolves.toMatchObject({ status: 'connected', address: ADDRESS });
  });

  it('times out with TIMEOUT if the reconnect never settles', async () => {
    vi.useFakeTimers();
    const connector = createEvmConnector({ projectId: PROJECT_ID, restoreTimeoutMs: 2000 });
    fake.emitAccount({ isConnected: false, status: 'reconnecting' });
    const assertion = expect(connector.restoreSession()).rejects.toMatchObject({ code: 'TIMEOUT' });
    await vi.advanceTimersByTimeAsync(2000);
    await assertion;
  });
});

describe('network and provider', () => {
  it('switches only to configured chains and tracks the new chain ID', async () => {
    const connector = createEvmConnector({ projectId: PROJECT_ID, chainIds: [1, 137] });
    fake.emitAccount({ address: ADDRESS, isConnected: true, status: 'connected' });

    await connector.switchChain(137);
    expect(fake.switchNetwork).toHaveBeenCalledWith(expect.objectContaining({ id: 137 }), { throwOnFailure: true });
    expect(connector.getState().chainId).toBe(137);

    await expect(connector.switchChain(10)).rejects.toMatchObject({ code: 'UNSUPPORTED_CHAIN' });
  });

  it('exposes the wallet provider and stops listening after destroy', () => {
    const connector = createEvmConnector({ projectId: PROJECT_ID });
    expect(connector.getProvider()).toHaveProperty('request');
    const listener = vi.fn();
    connector.subscribe(listener);
    connector.destroy();
    fake.emitAccount({ address: ADDRESS, isConnected: true, status: 'connected' });
    expect(listener).not.toHaveBeenCalled();
    expect(fake.accountListeners.size).toBe(0);
  });
});

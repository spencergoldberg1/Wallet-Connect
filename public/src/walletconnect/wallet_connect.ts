import { isEvmAddress, shortenAddress } from '../../../src/validation';
import type { EvmConnector, WalletState } from '../../../src/connector';

// Injected by the Express view from environment variables (see lib/client-config.js).
declare global {
  interface Window {
    __WALLET_CONFIG__?: {
      projectId?: string;
      chainIds?: string;
      appName?: string;
      appDescription?: string;
      appUrl?: string;
      appIcon?: string;
    };
  }
}

const byId = <T extends HTMLElement>(id: string) => document.getElementById(id) as T | null;

async function start() {
  const connectBtn = byId<HTMLButtonElement>('connectButton');
  const disconnectBtn = byId<HTMLButtonElement>('disconnectButton');
  const statusEl = byId<HTMLElement>('walletStatus');
  const addressInput = byId<HTMLInputElement>('walletAddressInput');
  const submitBtn = byId<HTMLButtonElement>('submitButton');

  const setStatus = (text: string, isError = false) => {
    if (!statusEl) return;
    statusEl.textContent = text;
    statusEl.classList.toggle('error', isError);
  };

  const validate = () => {
    if (submitBtn && addressInput) submitBtn.disabled = !isEvmAddress(addressInput.value);
  };
  addressInput?.addEventListener('input', validate);

  const config = window.__WALLET_CONFIG__ ?? {};
  let connector: EvmConnector;
  try {
    // AppKit is large; load it as a separate chunk so the form is usable immediately.
    const { createEvmConnector } = await import(/* webpackChunkName: "appkit" */ '../../../src/connector');
    connector = createEvmConnector({
      projectId: config.projectId,
      chainIds: config.chainIds,
      metadata: {
        name: config.appName,
        description: config.appDescription,
        url: config.appUrl || undefined,
        icons: config.appIcon ? [config.appIcon] : undefined,
      },
      themeMode: 'dark',
    });
  } catch (error) {
    setStatus((error as Error).message, true);
    if (connectBtn) connectBtn.disabled = true;
    return;
  }

  const render = (state: WalletState) => {
    if (connectBtn) connectBtn.hidden = state.isConnected;
    if (disconnectBtn) disconnectBtn.hidden = !state.isConnected;
    if (state.isConnected && state.address) {
      setStatus(`Connected: ${shortenAddress(state.address)} (chain ${state.chainId ?? '?'})`);
      if (addressInput) addressInput.value = state.address;
    } else if (state.status === 'connecting' || state.status === 'reconnecting') {
      setStatus(state.status === 'reconnecting' ? 'Restoring previous session…' : 'Connecting…');
    } else {
      setStatus('Not connected.');
    }
    validate();
  };
  connector.subscribe(render);

  connectBtn?.addEventListener('click', async () => {
    connectBtn.disabled = true;
    try {
      await connector.connect();
    } catch (error) {
      setStatus((error as Error).message, true);
    } finally {
      connectBtn.disabled = false;
    }
  });

  disconnectBtn?.addEventListener('click', async () => {
    try {
      await connector.disconnect();
      if (addressInput) addressInput.value = '';
      validate();
    } catch (error) {
      setStatus((error as Error).message, true);
    }
  });

  connector
    .restoreSession()
    .then(render)
    .catch((error: Error) => setStatus(error.message, true));
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => void start());
else void start();

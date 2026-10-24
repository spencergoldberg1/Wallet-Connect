import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';

const require = createRequire(import.meta.url);
const { buildClientConfig, serializeForScript } = require('../lib/client-config.js') as {
  buildClientConfig: (env: Record<string, string | undefined>) => Record<string, string>;
  serializeForScript: (value: unknown) => string;
};

describe('buildClientConfig', () => {
  it('maps environment variables to browser config', () => {
    const config = buildClientConfig({
      WALLET_CONNECT_PROJECT_ID: 'pid',
      WALLET_CONNECT_CHAIN_IDS: '1,137',
      APP_NAME: 'Name',
      APP_URL: 'https://app.example',
      BLOCKFROST_PROJECT_ID: 'bf',
      CARDANO_NETWORK: 'Preview',
    });
    expect(config).toMatchObject({
      projectId: 'pid',
      chainIds: '1,137',
      appName: 'Name',
      appUrl: 'https://app.example',
      blockfrostProjectId: 'bf',
      cardanoNetwork: 'Preview',
    });
  });

  it('uses safe defaults, including the Cardano testnet', () => {
    const config = buildClientConfig({});
    expect(config.projectId).toBe('');
    expect(config.cardanoNetwork).toBe('Preprod');
  });

  it('never exposes server-only secrets', () => {
    const config = buildClientConfig({ XUMM_API_KEY: 'k', XUMM_API_SECRET: 's' });
    expect(JSON.stringify(config)).not.toMatch(/"k"|"s"/);
    expect(Object.keys(config).some((key) => /secret|xumm/i.test(key))).toBe(false);
  });
});

describe('serializeForScript', () => {
  it('cannot break out of an inline <script>', () => {
    const out = serializeForScript({ appName: '</script><script>alert(1)</script>&' });
    expect(out).not.toContain('<');
    expect(out).not.toContain('>');
    expect(out).not.toContain('&');
  });

  it('escapes JS line terminators and round-trips through JSON.parse', () => {
    const value = { a: 'line\u2028sep\u2029end', b: '<&>' };
    const out = serializeForScript(value);
    expect(out.includes('\u2028') || out.includes('\u2029')).toBe(false);
    expect(JSON.parse(out)).toEqual(value);
  });
});

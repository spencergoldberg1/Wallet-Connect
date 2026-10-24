import { describe, expect, it } from 'vitest';
import { DEFAULT_CHAIN_IDS, buildMetadata, parseChainIds, resolveProjectId, selectNetworks } from '../src/config';
import { WalletConnectError } from '../src/errors';

const VALID_ID = '0123456789abcdef0123456789abcdef'; // placeholder, not a real project

const codeOf = (fn: () => unknown) => {
  try {
    fn();
  } catch (error) {
    return (error as WalletConnectError).code;
  }
  return undefined;
};

describe('resolveProjectId', () => {
  it('returns a trimmed valid ID', () => {
    expect(resolveProjectId(`  ${VALID_ID} `)).toBe(VALID_ID);
  });

  it.each([undefined, null, '', '   '])('rejects missing value %j with CONFIG', (value) => {
    expect(codeOf(() => resolveProjectId(value))).toBe('CONFIG');
  });

  it('rejects malformed IDs and placeholders', () => {
    expect(codeOf(() => resolveProjectId('YOUR_PROJECT_ID'))).toBe('CONFIG');
    expect(codeOf(() => resolveProjectId(VALID_ID.slice(1)))).toBe('CONFIG');
  });

  it('throws WalletConnectError instances', () => {
    expect(() => resolveProjectId('')).toThrow(WalletConnectError);
  });
});

describe('parseChainIds', () => {
  it('falls back to the defaults for empty input', () => {
    expect(parseChainIds(undefined)).toEqual([...DEFAULT_CHAIN_IDS]);
    expect(parseChainIds('')).toEqual([...DEFAULT_CHAIN_IDS]);
    expect(parseChainIds(' , ')).toEqual([...DEFAULT_CHAIN_IDS]);
    expect(parseChainIds([])).toEqual([...DEFAULT_CHAIN_IDS]);
  });

  it('parses a comma-separated string, trimming, deduplicating and keeping order', () => {
    expect(parseChainIds('137, 1,137 ,10')).toEqual([137, 1, 10]);
  });

  it('accepts number arrays', () => {
    expect(parseChainIds([11155111, 1])).toEqual([11155111, 1]);
  });

  it.each(['abc', '1,-5', '0', '1.5'])('rejects %j', (value) => {
    expect(codeOf(() => parseChainIds(value))).toBe('CONFIG');
  });

  it('returns a copy, not the defaults array', () => {
    const result = parseChainIds(undefined);
    result.push(999);
    expect(DEFAULT_CHAIN_IDS).not.toContain(999);
  });
});

describe('selectNetworks', () => {
  const registry = [{ id: 1 }, { id: 137 }, { id: '10' }];

  it('selects in the requested order, matching numeric and string IDs', () => {
    expect(selectNetworks([10, 1], registry)).toEqual([{ id: '10' }, { id: 1 }]);
  });

  it('fails with UNSUPPORTED_CHAIN for unknown IDs', () => {
    expect(codeOf(() => selectNetworks([1, 56], registry))).toBe('UNSUPPORTED_CHAIN');
  });

  it('fails with CONFIG for an empty selection', () => {
    expect(codeOf(() => selectNetworks([], registry))).toBe('CONFIG');
  });
});

describe('buildMetadata', () => {
  it('defaults the URL to the given origin and fills the other fields', () => {
    expect(buildMetadata({}, 'https://app.example')).toEqual({
      name: 'Wallet Connect',
      description: 'Connect a wallet with WalletConnect',
      url: 'https://app.example',
      icons: [],
    });
  });

  it('keeps explicit values', () => {
    const meta = { name: 'N', description: 'D', url: 'https://x.example', icons: ['https://x.example/i.png'] };
    expect(buildMetadata(meta, 'https://other.example')).toEqual(meta);
  });

  it('returns an empty URL outside the browser when no origin is known', () => {
    expect(buildMetadata().url).toBe('');
  });
});

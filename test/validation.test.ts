import { describe, expect, it } from 'vitest';
import { isEvmAddress, isSolanaAddress, isTronAddress, shortenAddress } from '../src/validation';

const EVM = '0x' + 'aB'.repeat(20);

describe('isEvmAddress', () => {
  it('accepts 0x + 40 hex chars, ignoring surrounding whitespace', () => {
    expect(isEvmAddress(EVM)).toBe(true);
    expect(isEvmAddress(`  ${EVM}\n`)).toBe(true);
  });

  it.each(['', '0x', EVM.slice(0, -1), EVM + '0', EVM.replace('0x', ''), '0x' + 'g'.repeat(40)])(
    'rejects %j',
    (value) => expect(isEvmAddress(value)).toBe(false),
  );
});

describe('isTronAddress', () => {
  it('accepts T + 33 base58 chars', () => {
    expect(isTronAddress('T' + 'A'.repeat(33))).toBe(true);
  });

  it('rejects wrong prefix, length or non-base58 chars (0, O, I, l)', () => {
    expect(isTronAddress('X' + 'A'.repeat(33))).toBe(false);
    expect(isTronAddress('T' + 'A'.repeat(32))).toBe(false);
    expect(isTronAddress('T' + 'A'.repeat(32) + '0')).toBe(false);
    expect(isTronAddress('T' + 'A'.repeat(32) + 'O')).toBe(false);
  });
});

describe('isSolanaAddress', () => {
  it('accepts 32-44 base58 chars', () => {
    expect(isSolanaAddress('1'.repeat(32))).toBe(true);
    expect(isSolanaAddress('z'.repeat(44))).toBe(true);
  });

  it('rejects too short, too long and non-base58 input', () => {
    expect(isSolanaAddress('1'.repeat(31))).toBe(false);
    expect(isSolanaAddress('1'.repeat(45))).toBe(false);
    expect(isSolanaAddress('l'.repeat(32))).toBe(false);
  });
});

describe('shortenAddress', () => {
  it('keeps the 0x prefix plus the leading and trailing characters', () => {
    expect(shortenAddress('0x1234567890abcdef1234567890abcdef12345678')).toBe('0x1234…5678');
  });

  it('respects a custom length and leaves short input unchanged', () => {
    expect(shortenAddress('0x1234567890abcdef', 2)).toBe('0x12…ef');
    expect(shortenAddress('0x12345678')).toBe('0x12345678');
  });
});

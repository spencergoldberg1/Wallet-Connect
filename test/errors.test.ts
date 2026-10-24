import { describe, expect, it } from 'vitest';
import { WalletConnectError, normalizeError } from '../src/errors';

describe('normalizeError', () => {
  it('passes WalletConnectError through unchanged', () => {
    const error = new WalletConnectError('TIMEOUT', 'slow');
    expect(normalizeError(error)).toBe(error);
  });

  it('maps EIP-1193 code 4001 to USER_REJECTED and keeps the cause', () => {
    const cause = { code: 4001, message: 'whatever' };
    const result = normalizeError(cause);
    expect(result.code).toBe('USER_REJECTED');
    expect(result.cause).toBe(cause);
  });

  it.each(['User rejected the request.', 'user denied account access', 'User cancelled'])(
    'maps message %j to USER_REJECTED',
    (message) => expect(normalizeError(new Error(message)).code).toBe('USER_REJECTED'),
  );

  it('keeps the message of other errors as UNKNOWN', () => {
    const result = normalizeError(new Error('relay unavailable'));
    expect(result).toBeInstanceOf(WalletConnectError);
    expect(result.code).toBe('UNKNOWN');
    expect(result.message).toBe('relay unavailable');
  });

  it('handles strings, message-only objects and garbage', () => {
    expect(normalizeError('boom').message).toBe('boom');
    expect(normalizeError({ message: 'plain object' }).message).toBe('plain object');
    expect(normalizeError(undefined).message).toBe('Unknown wallet error');
    expect(normalizeError(42).code).toBe('UNKNOWN');
  });
});

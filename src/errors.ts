export type WalletErrorCode =
  | 'CONFIG'
  | 'USER_REJECTED'
  | 'MODAL_CLOSED'
  | 'TIMEOUT'
  | 'UNSUPPORTED_CHAIN'
  | 'UNKNOWN';

export class WalletConnectError extends Error {
  readonly code: WalletErrorCode;
  readonly cause?: unknown;

  constructor(code: WalletErrorCode, message: string, cause?: unknown) {
    super(message);
    this.name = 'WalletConnectError';
    this.code = code;
    this.cause = cause;
  }
}

// EIP-1193 "user rejected request"
const USER_REJECTED_RPC_CODE = 4001;
const USER_REJECTED_PATTERN = /user (rejected|denied|cancel)/i;

/** Map anything thrown by a wallet, provider or AppKit to a WalletConnectError. */
export function normalizeError(error: unknown): WalletConnectError {
  if (error instanceof WalletConnectError) return error;

  const code = (error as { code?: unknown } | null)?.code;
  const message =
    typeof error === 'string'
      ? error
      : error instanceof Error
        ? error.message
        : typeof (error as { message?: unknown } | null)?.message === 'string'
          ? (error as { message: string }).message
          : 'Unknown wallet error';

  if (code === USER_REJECTED_RPC_CODE || USER_REJECTED_PATTERN.test(message)) {
    return new WalletConnectError('USER_REJECTED', 'The request was rejected in the wallet.', error);
  }
  return new WalletConnectError('UNKNOWN', message, error);
}

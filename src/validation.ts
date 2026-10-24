const BASE58 = '[1-9A-HJ-NP-Za-km-z]';

const EVM_ADDRESS = /^0x[0-9a-fA-F]{40}$/;
const TRON_ADDRESS = new RegExp(`^T${BASE58}{33}$`);
const SOLANA_ADDRESS = new RegExp(`^${BASE58}{32,44}$`);

/** Format check only: does not verify the EIP-55 checksum. */
export function isEvmAddress(value: string): boolean {
  return EVM_ADDRESS.test(value.trim());
}

export function isTronAddress(value: string): boolean {
  return TRON_ADDRESS.test(value.trim());
}

export function isSolanaAddress(value: string): boolean {
  return SOLANA_ADDRESS.test(value.trim());
}

/** "0x1234…abcd" style display form; returns the input unchanged if it is already short. */
export function shortenAddress(address: string, chars = 4): string {
  const prefix = address.startsWith('0x') ? 2 : 0;
  if (address.length <= prefix + chars * 2 + 1) return address;
  return `${address.slice(0, prefix + chars)}…${address.slice(-chars)}`;
}

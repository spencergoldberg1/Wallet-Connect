// Public, browser-safe settings rendered into pages. Only values listed here ever leave
// the server; secrets such as XUMM_API_SECRET must never be added.
function buildClientConfig(env = process.env) {
  return {
    projectId: env.WALLET_CONNECT_PROJECT_ID || "",
    chainIds: env.WALLET_CONNECT_CHAIN_IDS || "",
    appName: env.APP_NAME || "Wallet Connect",
    appDescription: env.APP_DESCRIPTION || "Connect a wallet with WalletConnect",
    appUrl: env.APP_URL || "",
    appIcon: env.APP_ICON_URL || "",
    blockfrostProjectId: env.BLOCKFROST_PROJECT_ID || "",
    cardanoNetwork: env.CARDANO_NETWORK || "Preprod",
  };
}

// JSON that is safe to place inside an inline <script>: no "</script>" breakout, no
// HTML entity tricks, and no JS line terminators.
function serializeForScript(value) {
  return JSON.stringify(value)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
}

module.exports = { buildClientConfig, serializeForScript };

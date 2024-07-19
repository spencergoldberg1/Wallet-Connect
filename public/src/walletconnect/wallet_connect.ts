import { createWeb3Modal, defaultConfig } from "@web3modal/ethers";

// 1. Get projectId from https://cloud.walletconnect.com
const projectId = process.env.WALLET_CONNECT_PROJECT_ID;

// 2. Set chains
const mainnet = {
  chainId: 1,
  name: "Ethereum",
  currency: "ETH",
  explorerUrl: "https://etherscan.io",
  rpcUrl: "https://cloudflare-eth.com",
};

const arbitrum = {
  chainId: 42161,
  name: "Arbitrum One",
  currency: "ETH",
  explorerUrl: "https://arbiscan.io",
  rpcUrl: "https://arb1.arbitrum.io/rpc",
};

const polygon = {
  chainId: 137,
  name: "Polygon",
  currency: "MATIC",
  explorerUrl: "https://polygonscan.com",
  rpcUrl: "https://polygon-rpc.com",
};

const optimism = {
  chainId: 10,
  name: "Optimism",
  currency: "ETH",
  explorerUrl: "https://optimistic.etherscan.io",
  rpcUrl: "https://mainnet.optimism.io",
};

const zkSync = {
  chainId: 324,
  name: "zkSync",
  currency: "ETH",
  explorerUrl: "https://zkscan.io",
  rpcUrl: "https://mainnet.era.zksync.io",
};

// Array of all networks
const allNetworks = [mainnet, arbitrum, polygon, optimism, zkSync];

// 3. Create your application's metadata object
const metadata = {
  name: "My Website",
  description: "My Website description",
  url: "https://mywebsite.com", // url must match your domain & subdomain
  icons: ["https://avatars.mywebsite.com/"],
};

// 4. Create Ethers config
const ethersConfig = defaultConfig({
  /*Required*/
  metadata,
});

// 5. Create a Web3Modal instance
const modal = createWeb3Modal({
  ethersConfig,
  chains: allNetworks,
  projectId,
  enableAnalytics: true,
  enableOnramp: true,
  themeMode: 'dark',  // Set the theme mode explicitly
  themeVariables: {
    '--w3m-font-family': 'Arial, sans-serif',  // Example: Set the base font family
    '--w3m-font-size-master': '12px',         // Base font size
    '--w3m-border-radius-master': '8px',      // Base border radius
    '--w3m-z-index': 1000                     // Z-index for the modal
  }
});

modal.subscribeProvider((e: { address?: string }) => {
  const inputElement = document.getElementById("wallet_address") as HTMLInputElement | null;

  // Check if the input element exists in the DOM
  if (inputElement) {
    inputElement.value = e.address || ""; // Set the value or default to an empty string if address is undefined

    const submitBtn = document.getElementById('submitBtn') as HTMLButtonElement | null;
    
    // Ensure submitBtn is not null before accessing its properties
    if (submitBtn) {
      console.log(submitBtn.value); // This will log the value property of submitBtn if needed
      submitBtn.disabled = !inputElement.value.trim(); // Enable the button only if input is not empty
    }
  }
});
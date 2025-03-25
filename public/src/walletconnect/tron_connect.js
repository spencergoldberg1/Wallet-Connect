import { TronLinkAdapter, LedgerAdapter, WalletConnectAdapter } from '@tronweb3/tronwallet-adapters';

// Safely load the WalletConnect project ID, fallback if not set
const projectId = process.env.WALLET_CONNECT_PROJECT_ID || 'your-fallback-project-id';

if (!projectId) {
  console.error('Error: WalletConnect project ID is not set. Please provide a valid project ID.');
}

// Initialize Tron wallet adapters (TronLink, Ledger, and WalletConnect)
const tronLinkAdapter = new TronLinkAdapter();
const ledgerAdapter = new LedgerAdapter();
const walletConnectAdapter = new WalletConnectAdapter({
  network: 'Mainnet',
  options: { 
    projectId: projectId,
    relayUrl: 'wss://relay.walletconnect.com',
    metadata: {
      name: 'JustLend',
      description: 'JustLend WalletConnect',
      url: 'https://muknweb3ca.mukn.com',
      icons: ['https://app.justlend.org/mainLogo.svg'],
    }
  }
});

// Detect if TronLink is installed in the browser
function isTronLinkInstalled() {
  return typeof window.tronWeb !== 'undefined' && window.tronWeb.defaultAddress;
}

// Handle common wallet errors and fallback
function handleTronLinkError(error) {
  if (error.message.includes('TronLink not found')) {
    openTronLinkInstallPage();
  } else if (error.message.includes('No TronLink accounts found')) {
    return 'Please connect or unlock your TronLink wallet.';
  } else if (error.message.includes('TronLink locked')) {
    return 'Please unlock your TronLink wallet.';
  } else {
    return `Error: ${error.message || error}`;
  }
}

// Fallback to install TronLink (Mobile vs Desktop)
function openTronLinkInstallPage() {
  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
  window.location.href = 'https://www.tronlink.org/';
}

// Function to connect to TronLink wallet
async function connectTronLink() {
  try {
    if (!isTronLinkInstalled()) {
      throw new Error('TronLink not found');
    }

    await tronLinkAdapter.connect();

    const accounts = window.tronWeb ? [window.tronWeb.defaultAddress.base58] : [];
    if (accounts.length === 0) {
      throw new Error('No TronLink accounts found');
    }
    const address = accounts[0];
    console.log(`Connected with TronLink Wallet: ${address}`);
    return address;
  } catch (error) {
    console.error(`Error during TronLink wallet connection: ${error.message || error}`);
    return handleTronLinkError(error);
  }
}

// Function to connect to Ledger wallet
async function connectLedger() {
  try {
    await ledgerAdapter.connect();
    const message = 'Hello Ledger!';
    await ledgerAdapter.signMessage(message);
    console.log('Connected and signed message with Ledger Wallet');
  } catch (error) {
    console.error(`Error during Ledger wallet connection: ${error.message || error}`);
    throw error;
  }
}

// Function to connect to WalletConnect wallet
async function connectWalletConnect() {
  try {
    await walletConnectAdapter.connect();
    const message = 'Hello WalletConnect!';
    await walletConnectAdapter.signMessage(message);
    console.log('Connected and signed message with WalletConnect Wallet');
  } catch (error) {
    console.error(`Error during WalletConnect wallet connection: ${error.message || error}`);
    
    // If WalletConnect fails to launch, show the user what to do next
    if (error.message.includes('Failed to launch') || error.message.includes('scheme does not have a registered handler')) {
      walletStatus.textContent = 'WalletConnect app not detected. Please install a compatible wallet like Trust Wallet or MetaMask.';
      openWalletConnectInstallPage();
    } else {
      throw error;
    }
  }
}

// Redirect to a WalletConnect compatible wallet installation page
function openWalletConnectInstallPage() {
  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
  if (isMobile) {
    // Suggest the user to download Trust Wallet or another compatible wallet
    window.location.href = 'https://trustwallet.com/';
  } else {
    // Redirect to MetaMask or other WalletConnect compatible solutions for desktop
    window.location.href = 'https://metamask.io/download/';
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const walletSelect = document.getElementById('walletSelect');
  const connectWalletButton = document.getElementById('connectWalletButton');
  const tronAddressInput = document.getElementById('tronAddressInput');
  const submitButton = document.getElementById('submitButton');
  const walletStatus = document.getElementById('walletStatus');

  // Enable the Connect button when a wallet is selected
  walletSelect.addEventListener('change', () => {
    if (walletSelect.value) {
      connectWalletButton.disabled = false;
      walletStatus.textContent = 'Ready to connect.';
    } else {
      connectWalletButton.disabled = true;
      walletStatus.textContent = 'Please select a wallet to connect.';
    }
  });

  // Handle connection logic based on the selected wallet
  connectWalletButton.addEventListener('click', async () => {
    walletStatus.textContent = 'Connecting...';

    const selectedWallet = walletSelect.value;
    try {
      let walletAddress = '';

      if (selectedWallet === 'tronlink') {
        walletAddress = await connectTronLink();
      } else if (selectedWallet === 'ledger') {
        await connectLedger();
        walletStatus.textContent = 'Connected and signed with Ledger Wallet.';
        return;
      } else if (selectedWallet === 'walletconnect') {
        await connectWalletConnect();
        walletStatus.textContent = 'Connected with WalletConnect.';
        return;
      }

      if (walletAddress) {
        tronAddressInput.value = walletAddress;
        validateTronAddress(); // Validate address after populating
      }
    } catch (error) {
      walletStatus.textContent = `Error: ${error.message || error}`;
    }
  });

  // Validate the Tron address input
  tronAddressInput.addEventListener('input', validateTronAddress);

  function validateTronAddress() {
    const address = tronAddressInput.value;
    const isValid = /^T[a-zA-Z0-9]{33}$/.test(address); // Simple regex for Tron address format
    submitButton.disabled = !isValid;

    if (isValid) {
      walletStatus.textContent = 'Address is valid. You can now submit.';
    } else if (address.length > 0) {
      walletStatus.textContent = 'Invalid Tron address format.';
    } else {
      walletStatus.textContent = 'Please enter or connect a Tron address.';
    }
  }
});

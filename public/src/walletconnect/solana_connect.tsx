// walletApp.tsx
import React, { FC, useEffect, useState } from 'react';
import ReactDOM from 'react-dom/client';
import { ConnectionProvider, WalletProvider, useWallet } from '@solana/wallet-adapter-react';
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';
import {
    PhantomWalletAdapter,
    SolflareWalletAdapter,
    TorusWalletAdapter,
    LedgerWalletAdapter,
    TrustWalletAdapter,
} from '@solana/wallet-adapter-wallets';
import {
    WalletModalProvider,
    WalletMultiButton,
    WalletDisconnectButton,
} from '@solana/wallet-adapter-react-ui';
import { clusterApiUrl } from '@solana/web3.js';

import '@solana/wallet-adapter-react-ui/styles.css';

declare global {
    interface Window {
        NEEDS_WALLET_NAME: boolean;
    }
}

const WalletDetails: FC = () => {
    const { publicKey, disconnect } = useWallet();
    const [needsWalletName, setNeedsWalletName] = useState<boolean>(false);
    const [walletNameValid, setWalletNameValid] = useState<boolean>(false);
    const [walletAddressValid, setWalletAddressValid] = useState<boolean>(false);

    useEffect(() => {
        // Retrieve the needsWalletName value from the global variable
        if (typeof window !== 'undefined') {
            setNeedsWalletName(window.NEEDS_WALLET_NAME);
        }

        const addressInput = document.getElementById('walletAddressInput') as HTMLInputElement;
        const submitButton = document.getElementById('submitButton') as HTMLButtonElement;

        const handleAddressInput = () => {
            const value = addressInput.value.trim();
            const isValid = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(value);
            setWalletAddressValid(isValid);

            // Enable or disable the submit button based on validation
            if (needsWalletName) {
                const walletNameInput = document.getElementById('walletNameInput') as HTMLInputElement;
                const isWalletNameValid = walletNameInput.value.trim() !== '';
                setWalletNameValid(isWalletNameValid);
                submitButton.disabled = !(isValid && isWalletNameValid);
            } else {
                submitButton.disabled = !isValid;
            }

            // Disconnect if input address does not match the connected wallet
            if (publicKey && value !== publicKey.toBase58()) {
                disconnect().then(() => {
                    addressInput.value = '';
                    setWalletAddressValid(false);
                    submitButton.disabled = true;
                });
            }
        };

        // Add event listener to wallet address input
        addressInput.addEventListener('input', handleAddressInput);

        return () => {
            addressInput.removeEventListener('input', handleAddressInput);
        };
    }, [publicKey, disconnect, needsWalletName]);

    useEffect(() => {
        const addressInput = document.getElementById('walletAddressInput') as HTMLInputElement;
        const submitButton = document.getElementById('submitButton') as HTMLButtonElement;

        // Populate input with connected wallet address
        if (publicKey) {
            const connectedAddress = publicKey.toBase58();
            addressInput.value = connectedAddress;
            setWalletAddressValid(true);
            if (needsWalletName) {
                const walletNameInput = document.getElementById('walletNameInput') as HTMLInputElement;
                const isWalletNameValid = walletNameInput.value.trim() !== '';
                setWalletNameValid(isWalletNameValid);
                submitButton.disabled = !(isWalletNameValid && true);
            } else {
                submitButton.disabled = false;
            }
        } else {
            addressInput.value = '';
            setWalletAddressValid(false);
            if (needsWalletName) {
                const walletNameInput = document.getElementById('walletNameInput') as HTMLInputElement;
                setWalletNameValid(walletNameInput.value.trim() !== '');
                submitButton.disabled = true;
            } else {
                submitButton.disabled = true;
            }
        }
    }, [publicKey, needsWalletName]);

    useEffect(() => {
        if (needsWalletName) {
            const walletNameInput = document.getElementById('walletNameInput') as HTMLInputElement;
            const submitButton = document.getElementById('submitButton') as HTMLButtonElement;

            const handleWalletNameInput = () => {
                const value = walletNameInput.value.trim();
                const isValid = value !== '';
                setWalletNameValid(isValid);

                if (walletAddressValid && isValid) {
                    submitButton.disabled = false;
                } else {
                    submitButton.disabled = true;
                }
            };

            // Add event listener to wallet name input
            walletNameInput.addEventListener('input', handleWalletNameInput);

            return () => {
                walletNameInput.removeEventListener('input', handleWalletNameInput);
            };
        }
    }, [needsWalletName, walletAddressValid]);

    return (
        <div>
            <div className="wallet-buttons">
                {publicKey ? (
                    <WalletDisconnectButton />
                ) : (
                    <WalletMultiButton />
                )}
            </div>
        </div>
    );
};

const WalletApp: FC = () => {
    const network = WalletAdapterNetwork.Devnet;
    const endpoint = clusterApiUrl(network);

    const wallets = [
        new PhantomWalletAdapter(),
        new SolflareWalletAdapter({ network }),
        new TorusWalletAdapter(),
        new LedgerWalletAdapter(),
        new TrustWalletAdapter(),
    ];

    return (
        <ConnectionProvider endpoint={endpoint}>
            <WalletProvider wallets={wallets} autoConnect>
                <WalletModalProvider>
                    <WalletDetails />
                </WalletModalProvider>
            </WalletProvider>
        </ConnectionProvider>
    );
};

// Render the WalletApp component
const container = document.getElementById('wallet-buttons');
if (container) {
    const root = ReactDOM.createRoot(container);
    root.render(<WalletApp />);
}

// Form Validation Logic
document.addEventListener('DOMContentLoaded', () => {
    const needsWalletName = window.NEEDS_WALLET_NAME;
    const walletForm = document.getElementById('walletForm') as HTMLFormElement;
    const walletAddressInput = document.getElementById('walletAddressInput') as HTMLInputElement;
    const submitButton = document.getElementById('submitButton') as HTMLButtonElement;

    let walletNameInput: HTMLInputElement | null = null;
    let walletNameValid = false;

    if (needsWalletName) {
        walletNameInput = document.getElementById('walletNameInput') as HTMLInputElement;
    }

    // Function to validate wallet address
    const validateWalletAddress = (): boolean => {
        const value = walletAddressInput.value.trim();
        const isValid = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(value);
        const walletAddressHelp = document.getElementById('walletAddressHelp') as HTMLDivElement;

        if (isValid) {
            walletAddressInput.classList.remove('invalid');
            walletAddressHelp.style.display = 'none';
        } else {
            walletAddressInput.classList.add('invalid');
            walletAddressHelp.style.display = 'block';
        }

        return isValid;
    };

    // Function to validate wallet name
    const validateWalletName = (): boolean => {
        if (!needsWalletName || !walletNameInput) return true;

        const value = walletNameInput.value.trim();
        const isValid = value !== '';
        const walletNameHelp = document.getElementById('walletNameHelp') as HTMLDivElement;

        if (isValid) {
            walletNameInput.classList.remove('invalid');
            walletNameHelp.style.display = 'none';
        } else {
            walletNameInput.classList.add('invalid');
            walletNameHelp.style.display = 'block';
        }

        return isValid;
    };

    // Function to check form validity
    const checkFormValidity = () => {
        const isAddressValid = validateWalletAddress();
        const isNameValid = validateWalletName();

        if (needsWalletName) {
            submitButton.disabled = !(isAddressValid && isNameValid);
        } else {
            submitButton.disabled = !isAddressValid;
        }
    };

    // Event listeners for inputs
    walletAddressInput.addEventListener('input', checkFormValidity);

    if (needsWalletName && walletNameInput) {
        walletNameInput.addEventListener('input', checkFormValidity);
    }

    // Initial validation check
    checkFormValidity();

    // Optional: Prevent form submission if invalid
    walletForm.addEventListener('submit', (event) => {
        if (!walletForm.checkValidity()) {
            event.preventDefault();
            event.stopPropagation();
            checkFormValidity();
        }
    });
});

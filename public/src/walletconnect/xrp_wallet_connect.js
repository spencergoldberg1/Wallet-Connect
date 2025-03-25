// Import statements
import { listen } from "@ledgerhq/logs";
import AppXrp from "@ledgerhq/hw-app-xrp";
import TransportWebUSB from "@ledgerhq/hw-transport-webusb";
import TransportWebHID from "@ledgerhq/hw-transport-webhid";

// Variables to store state
let allAddresses = [];
let transport;
let lastAccountIndex = 0;
let xummRedirectURL;

// Enum for Wallet Types
const WalletTypes = Object.freeze({
    LEDGER: 'ledger',
    ADDRESS: 'address',
    // XUMM: 'xumm', // Comment out to temporarily disable Xumm support
});

// Attach the initializeScript function to the window object
window.initializeScript = function (passedXummRedirectURL) {
    // Enhanced Error Handling for Missing Parameters
    if (!passedXummRedirectURL) {
        console.error(
            "initializeScript error: 'xummRedirectURL' must be provided."
        );
        alert(
            "Initialization error: Missing required parameter 'xummRedirectURL'. Please ensure it is provided."
        );
        return; // Stop further execution
    }

    xummRedirectURL = passedXummRedirectURL;

    document.addEventListener("DOMContentLoaded", () => {
        setupWalletSelection();
    });
};

// Dynamically generate the wallet dropdown HTML based on supported wallet types
function generateWalletDropdownHTML() {
    const walletTypes = [
        { value: WalletTypes.LEDGER, label: "Ledger" },
        { value: WalletTypes.ADDRESS, label: "Address" },
        // Uncomment the next line to re-enable Xumm wallet support
        // { value: WalletTypes.XUMM, label: "Xumm" }
    ];

    const walletTypeSelect = document.createElement("select");
    walletTypeSelect.classList.add("slds-select");
    walletTypeSelect.id = "wallet-type";

    const defaultOption = document.createElement("option");
    defaultOption.value = "";
    defaultOption.textContent = "Please select...";
    walletTypeSelect.appendChild(defaultOption);

    walletTypes.forEach((walletType) => {
        const option = document.createElement("option");
        option.value = walletType.value;
        option.textContent = walletType.label;
        walletTypeSelect.appendChild(option);
    });

    return walletTypeSelect;
}

// Setup Wallet Selection Dropdown
function setupWalletSelection() {
    const walletTypeContainer = document.querySelector(".slds-form-element__control");
    const walletInfoDiv = document.getElementById("wallet-info");

    // Remove any existing dropdown
    walletTypeContainer.innerHTML = "";

    // Add dynamically generated dropdown
    const walletTypeSelect = generateWalletDropdownHTML();
    walletTypeContainer.appendChild(walletTypeSelect);

    walletTypeSelect.addEventListener("change", function () {
        walletInfoDiv.innerHTML = "";
        switch (this.value) {
            case WalletTypes.LEDGER:
                walletInfoDiv.innerHTML = generateLedgerHTML();
                initializeLedgerActions();
                break;
            case WalletTypes.ADDRESS:
                walletInfoDiv.innerHTML = generateAddressInputHTML();
                initializeAddressActions();
                break;
            // Uncomment this case to re-enable Xumm wallet support
            // case WalletTypes.XUMM:
            //     walletInfoDiv.innerHTML = generateXummHTML();
            //     initializeXummActions();
                break;
            default:
                console.warn("Unknown wallet type selected.");
                break;
        }
    });
}

// Generate HTML for Xumm Wallet Type
function generateXummHTML() {
    if (!xummRedirectURL) {
        console.error(
            "generateXummHTML error: 'xummRedirectURL' is not defined."
        );
        return `<div style="text-align: center; color: red;">
            Error: Unable to generate Xumm HTML due to missing 'xummRedirectURL'.
        </div>`;
    }

    return `<div style="text-align: center;">
        <button id="xummConnectButton" class="slds-button slds-button_brand slds-m-top_small" onclick="window.location.href = '${xummRedirectURL}';">Connect to Xumm</button>
    </div>`;
}

// Initialize Actions for Xumm Wallet Type
function initializeXummActions() {
    const xummConnectButton = document.getElementById("xummConnectButton");

    if (!xummConnectButton) {
        console.error(
            "initializeXummActions error: 'xummConnectButton' element not found."
        );
        alert("Initialization error: Xumm Connect button is missing.");
        return;
    }

    // Enable button by default if there is no wallet name input
    xummConnectButton.disabled = false;
}

// Generate HTML for Address Wallet Type
function generateAddressInputHTML() {
  return `<form method="POST" style="text-align: center; margin-top: 20px;">
      <div class="slds-form-element">
          <label class="slds-form-element__label" for="xrp-address" style="display: block; text-align: left; margin-bottom: 5px;">XRP Address</label>
          <div class="slds-form-element__control">
              <input type="text" id="xrp-address" name="xrpAddress" class="slds-input" placeholder="XRP Address" required>
          </div>
          <button type="submit" class="slds-button slds-button_brand slds-m-top_small" disabled>Submit</button>
      </div>
  </form>`;
}

// Initialize Actions for Address Wallet Type
function initializeAddressActions() {
    const addressInput = document.getElementById("xrp-address");
    const submitButton = document.querySelector("form button[type='submit']");
    const walletNameInput = document.getElementById("wallet_name");

    if (!addressInput || !submitButton) {
        console.error(
            "initializeAddressActions error: Required form elements not found."
        );
        alert(
            "Initialization error: XRP Address input or Submit button is missing."
        );
        return;
    }

    // Function to validate XRP address format
    function isValidXRPAddress(address) {
        return /^r[1-9A-HJ-NP-Za-km-z]{24,34}$/.test(address);
    }

    // Function to update the state of the Submit button
    function updateSubmitButton() {
        const addressIsValid = isValidXRPAddress(addressInput.value.trim());

        // Check if the wallet name input exists
        if (walletNameInput) {
            submitButton.disabled =
                !addressIsValid || !walletNameInput.value.trim();
        } else {
            // Only check the address if no wallet name input exists
            submitButton.disabled = !addressIsValid;
        }
    }

    // Initial button state
    updateSubmitButton();

    // Event listeners for input changes
    addressInput.addEventListener("input", updateSubmitButton);
    if (walletNameInput) {
        walletNameInput.addEventListener("input", updateSubmitButton);
    }
}

// Generate HTML for Ledger Wallet Type
function generateLedgerHTML() {
    return `<div class="container">
        <button id="connectButton" class="slds-button slds-button_brand">Connect Ledger</button>
        <div id="connection-steps" style="display: none;">
            <div class="progress-step"><i class="fas fa-spinner fa-spin"></i> Connecting to device...</div>
            <div class="progress-step hidden"><i class="fas fa-spinner fa-spin"></i> Retrieving account information...</div>
        </div>
        <form method="POST" style="text-align: center;">
            <div id="accounts-page" class="hidden">
                <div id="addresses-container" style="margin-bottom: 10px;"></div>
                <div style="display: flex; justify-content: space-between;">
                    <button id="loadMore" type="button" class="slds-button slds-button_brand submit-button">Load More</button>
                    <input type="hidden" name="xrpAddress" id="selectedAddress">
                    <button id="submitButton" type="submit" class="slds-button slds-button_success submit-button" disabled>Confirm</button>
                </div>
            </div>
        </form>
    </div>`;
}

// Initialize Actions for Ledger Wallet Type
function initializeLedgerActions() {
    const connectButton = document.getElementById("connectButton");
    const loadMoreButton = document.getElementById("loadMore");

    if (!connectButton || !loadMoreButton) {
        console.error(
            "initializeLedgerActions error: 'connectButton' or 'loadMore' element not found."
        );
        alert(
            "Initialization error: Connect Ledger button or Load More button is missing."
        );
        return;
    }

    connectButton.addEventListener("click", startConnection);
    loadMoreButton.addEventListener("click", () => startConnection(true));
}

// Start Connection to Ledger Device
async function startConnection(loadMore = false) {
    const connectButton = document.getElementById("connectButton");
    const connectionSteps = document.getElementById("connection-steps");

    if (!connectButton || !connectionSteps) {
        console.error(
            "startConnection error: 'connectButton' or 'connection-steps' element not found."
        );
        alert(
            "Connection error: Required elements are missing."
        );
        return;
    }

    connectButton.style.display = "none";
    connectionSteps.style.display = "block";

    try {
        transport =
            transport ||
            (await Promise.race([
                TransportWebUSB.create(60000),
                TransportWebHID.create(60000),
            ]));

        const appXrp = new AppXrp(transport);
        await getAccountInfo(appXrp, loadMore);
    } catch (error) {
        console.error("startConnection error:", error.message);
        alert(
            "An error occurred while connecting to the Ledger device. Please ensure your device is connected and try again."
        );
        connectButton.style.display = "block";
        connectionSteps.style.display = "none";
    }
}

// Get Account Information from Ledger Device
async function getAccountInfo(appXrp, loadMore) {
    try {
        const accountInfo = await appXrp.getAddress(
            `44'/144'/0'/0/${lastAccountIndex}`
        );
        if (loadMore) lastAccountIndex++;
        allAddresses.push(accountInfo.address);
        showAccountsPage();
    } catch (error) {
        console.error("getAccountInfo error:", error.message);
        alert(
            "An error occurred while retrieving account information. Please try again."
        );
    }
}

// Show Accounts Page after Successful Retrieval
function showAccountsPage() {
    const accountsPage = document.getElementById("accounts-page");
    const connectionSteps = document.getElementById("connection-steps");

    // Enhanced Error Handling for Missing Elements
    if (!accountsPage || !connectionSteps) {
        console.error(
            "showAccountsPage error: 'accounts-page' or 'connection-steps' element not found."
        );
        alert(
            "Display error: Required elements are missing."
        );
        return;
    }

    connectionSteps.style.display = "none";
    accountsPage.classList.remove("hidden");
    populateAddresses();
}

// Populate Retrieved Addresses into the DOM
function populateAddresses() {
    const container = document.getElementById("addresses-container");
    const submitButton = document.getElementById("submitButton");
    const selectedAddressInput = document.getElementById("selectedAddress");
    const walletNameInput = document.getElementById("wallet_name");

    // Enhanced Error Handling for Missing Elements
    if (!container || !submitButton || !selectedAddressInput) {
        console.error(
            "populateAddresses error: Required elements not found."
        );
        alert(
            "Populate error: Required elements are missing."
        );
        return;
    }

    container.innerHTML = "";

    // Function to update the state of the Submit button
    function updateSubmitButton() {
        if (walletNameInput) {
            submitButton.disabled =
                !selectedAddressInput.value.trim() || !walletNameInput.value.trim();
        } else {
            submitButton.disabled = !selectedAddressInput.value.trim();
        }
    }

    // Initial button state
    updateSubmitButton();

    // Event listener for wallet name input changes
    if (walletNameInput) {
        walletNameInput.addEventListener("input", updateSubmitButton);
    }

    // Populate each address as a radio button with a disabled input field
    allAddresses.forEach((address) => {
        const rowDiv = document.createElement("div");
        rowDiv.className = "slds-form-element";
        rowDiv.style.display = "flex";
        rowDiv.style.alignItems = "center";
        rowDiv.style.marginBottom = "4px";

        const radio = document.createElement("input");
        radio.type = "radio";
        radio.className = "slds-radio";
        radio.value = address;
        radio.name = "xrpAddress";
        radio.addEventListener("change", function () {
            selectedAddressInput.value = this.value;
            updateSubmitButton();
        });

        const input = document.createElement("input");
        input.type = "text";
        input.className = "slds-input";
        input.value = address;
        input.disabled = true;

        rowDiv.appendChild(radio);
        rowDiv.appendChild(input);
        container.appendChild(rowDiv);
    });
}

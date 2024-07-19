import { listen } from "@ledgerhq/logs";
import AppXrp from "@ledgerhq/hw-app-xrp";
import TransportWebUSB from "@ledgerhq/hw-transport-webusb";
import TransportWebHID from "@ledgerhq/hw-transport-webhid";

let allAddresses = [];
let transport;
let lastAccountIndex = 0;

document.addEventListener("DOMContentLoaded", () => {
    setupWalletSelection();
  });
  
  function setupWalletSelection() {
    const walletTypeSelect = document.getElementById("wallet-type");
    const walletInfoDiv = document.getElementById("wallet-info");
  
    walletTypeSelect.addEventListener("change", function () {
      walletInfoDiv.innerHTML = "";
      switch (this.value) {
        case "xumm":
          walletInfoDiv.innerHTML = generateXummHTML();
          break;
        case "address":
          walletInfoDiv.innerHTML = generateAddressInputHTML();
          break;
        case "ledger":
          walletInfoDiv.innerHTML = generateLedgerHTML();
          initializeLedgerActions();
          break;
      }
    });
  }
  
  function generateXummHTML() {
    return `<div style="text-align: center;">
      <button class="slds-button slds-button_brand slds-m-top_small" onclick="window.location.href = '${process.env.XUMM_BASE_URL}/xumm/sign_in';">Connect to Xumm</button>
    </div>`;
  }
  
  function generateAddressInputHTML() {
    // This function returns HTML for a form that posts to the "/address" endpoint.
    // The form includes a single input field for an XRP address and a submit button.
    return `<form action="/address" method="POST" style="text-align: center; margin-top: 20px;">
  <div class="slds-form-element">
    <div class="slds-form-element__control">
      <input type="text" id="xrp-address" name="xrpAddress" class="slds-input" placeholder="XRP Address" required>
    </div>
    <button type="submit" class="slds-button slds-button_brand slds-m-top_small">Submit</button>
  </div>
</form>`;
}
  
  function generateLedgerHTML() {
    return `<div class="container">
      <button id="connectButton" class="slds-button slds-button_brand">Connect Ledger</button>
      <div id="connection-steps" style="display: none;">
        <div class="progress-step"><i class="fas fa-spinner fa-spin"></i> Connecting to device...</div>
        <div class="progress-step hidden"><i class="fas fa-spinner fa-spin"></i> Retrieving account information...</div>
      </div>
      <div id="error-message" class="error-message hidden"></div>
      <form action="/address" method="POST" style="text-align: center;">
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
  
  function initializeLedgerActions() {
    document.getElementById("connectButton").addEventListener("click", startConnection);
    document.getElementById("loadMore").addEventListener("click", () => startConnection(true));
  }
  
  async function startConnection(loadMore = false) {
    const connectButton = document.getElementById("connectButton");
    const connectionSteps = document.getElementById("connection-steps");
    const errorMessage = document.getElementById("error-message");
  
    connectButton.style.display = "none";
    errorMessage.classList.add("hidden");
    connectionSteps.style.display = "block";
  
    try {
      transport = transport || await Promise.race([
        TransportWebUSB.create(60000),
        TransportWebHID.create(60000),
      ]);
      const appXrp = new AppXrp(transport);
      await getAccountInfo(appXrp, loadMore);
    } catch (error) {
      showError(error.message);
    }
  }
  
  async function getAccountInfo(appXrp, loadMore) {
    const accountInfo = await appXrp.getAddress(`44'/144'/0'/0/${lastAccountIndex}`);
    if (loadMore) lastAccountIndex++;
    allAddresses.push(accountInfo.address);
    showAccountsPage();
  }
  
  function showAccountsPage() {
    const accountsPage = document.getElementById("accounts-page");
    const connectionSteps = document.getElementById("connection-steps");
    connectionSteps.style.display = "none";
    accountsPage.classList.remove("hidden");
    populateAddresses();
  }
  
  function populateAddresses() {
    const container = document.getElementById("addresses-container");
    const submitButton = document.getElementById("submitButton");
    const selectedAddressInput = document.getElementById("selectedAddress");
    container.innerHTML = "";
  
    allAddresses.forEach((address, index) => {
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
        submitButton.disabled = false;
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
  
  function showError(message) {
    const errorMessage = document.getElementById("error-message");
    errorMessage.innerHTML = `<i class="fas fa-times-circle"></i> ${message} <button id="retryButton" class="slds-button slds-button_destructive retry-button">Retry</button>`;
    errorMessage.classList.remove("hidden");
  }
// Re-export everything from lucid-cardano
export * from "lucid-cardano";

// Import specific dependencies for our function
import { Blockfrost, Lucid } from "lucid-cardano";

const BLOCKFROST_URLS = {
    Mainnet: "https://cardano-mainnet.blockfrost.io/api/v0",
    Preprod: "https://cardano-preprod.blockfrost.io/api/v0",
    Preview: "https://cardano-preview.blockfrost.io/api/v0",
};

// Define and export the initializeLucid function. Defaults to the Preprod testnet;
// pass "Mainnet" explicitly (with a mainnet Blockfrost project ID) to use mainnet.
export async function initializeLucid(projectId, network = "Preprod") {
    if (!projectId) {
        throw new Error("Missing Blockfrost project ID. Set BLOCKFROST_PROJECT_ID on the server.");
    }
    const url = BLOCKFROST_URLS[network];
    if (!url) {
        throw new Error(`Unsupported Cardano network "${network}".`);
    }
    return Lucid.new(new Blockfrost(url, projectId), network);
}

// Attach Lucid, Blockfrost, and initializeLucid to the global window object
if (typeof window !== "undefined") {
    window.Lucid = Lucid;
    window.Blockfrost = Blockfrost;
    window.initializeLucid = initializeLucid;
}

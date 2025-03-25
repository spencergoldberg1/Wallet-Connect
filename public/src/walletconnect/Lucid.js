// Re-export everything from lucid-cardano
export * from "lucid-cardano";

// Import specific dependencies for our function
import { Blockfrost, Lucid } from "lucid-cardano";

// Define and export the initializeLucid function
export async function initializeLucid(projectId) {
    const lucid = await Lucid.new(
        new Blockfrost("https://cardano-mainnet.blockfrost.io/api/v0", projectId),
        "Mainnet"
    );
    return lucid;
}

// Attach Lucid, Blockfrost, and initializeLucid to the global window object
if (typeof window !== "undefined") {
    window.Lucid = Lucid;
    window.Blockfrost = Blockfrost;
    window.initializeLucid = initializeLucid;
}

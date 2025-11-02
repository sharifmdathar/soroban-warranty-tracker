import {
  isConnected,
  getAddress,
  requestAccess,
} from "@stellar/freighter-api";

export interface WalletConnection {
  publicKey: string | null;
  connected: boolean;
}

/**
 * Check if Freighter wallet is available
 */
export async function isFreighterAvailable(): Promise<boolean> {
  try {
    const result = await isConnected();
    return result.isConnected || false;
  } catch {
    return false;
  }
}

/**
 * Connect to Freighter wallet
 */
export async function connectFreighter(): Promise<string> {
  try {
    // Request access (this will prompt the user if needed)
    const accessResult = await requestAccess();
    if (!accessResult || accessResult.error) {
      throw new Error(
        accessResult?.error || "Access to Freighter wallet was denied"
      );
    }

    // Get address
    const addressResult = await getAddress();
    if (addressResult.error || !addressResult.address) {
      throw new Error(
        addressResult.error || "Failed to get address from Freighter"
      );
    }

    return addressResult.address;
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error(
      "Failed to connect to Freighter wallet. Make sure Freighter is installed and unlocked."
    );
  }
}

/**
 * Get the current connected address from Freighter
 */
export async function getFreighterPublicKey(): Promise<string | null> {
  try {
    const addressResult = await getAddress();
    if (addressResult.error || !addressResult.address) {
      return null;
    }
    return addressResult.address;
  } catch {
    return null;
  }
}

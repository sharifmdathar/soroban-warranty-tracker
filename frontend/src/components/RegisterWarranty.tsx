import { useState, useEffect } from "react";
import { Save, Package, Wallet } from "lucide-react";
import { WarrantyTrackerClient } from "../utils/soroban";
import {
  connectFreighter,
  getFreighterPublicKey,
  isFreighterAvailable,
} from "../utils/wallet";

interface RegisterWarrantyProps {
  contractId: string;
  onSuccess?: (warrantyId: string) => void;
}

export default function RegisterWarranty({
  contractId,
  onSuccess,
}: RegisterWarrantyProps) {
  const [formData, setFormData] = useState({
    productName: "",
    serialNumber: "",
    manufacturer: "",
    purchaseDate: "",
    expirationDate: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [walletAvailable, setWalletAvailable] = useState(false);
  const [connecting, setConnecting] = useState(false);

  // Check if Freighter is available and get connected address on mount
  useEffect(() => {
    const checkWallet = async () => {
      const available = await isFreighterAvailable();
      setWalletAvailable(available);

      if (available) {
        const address = await getFreighterPublicKey();
        setWalletAddress(address);
      }
    };

    checkWallet();
  }, []);

  const handleConnectWallet = async () => {
    setConnecting(true);
    setError(null);

    try {
      const address = await connectFreighter();
      setWalletAddress(address);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to connect wallet. Make sure Freighter is installed and unlocked."
      );
    } finally {
      setConnecting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      // Check if wallet is connected
      if (!walletAddress) {
        setError(
          "Wallet not connected. Please connect your Freighter wallet first."
        );
        setLoading(false);
        return;
      }

      // Create client instance
      const client = new WarrantyTrackerClient({ contractId });

      // Use the connected wallet address as both owner and signer
      const owner = walletAddress;
      const signerAddress = walletAddress;

      const warrantyId = await client.registerWarranty(
        owner,
        formData.productName,
        formData.serialNumber,
        formData.manufacturer,
        formData.purchaseDate,
        formData.expirationDate,
        signerAddress
      );

      setSuccess(`Warranty registered successfully! ID: ${warrantyId}`);

      // Reset form
      setFormData({
        productName: "",
        serialNumber: "",
        manufacturer: "",
        purchaseDate: "",
        expirationDate: "",
      });

      if (onSuccess) {
        onSuccess(warrantyId);
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to register warranty"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center gap-2 mb-6">
        <Package className="w-6 h-6 text-primary-600" />
        <h2 className="text-2xl font-bold text-gray-900">
          Register New Warranty
        </h2>
      </div>

      {/* Wallet Connection Status */}
      {!walletAddress && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Wallet className="w-5 h-5 text-yellow-600" />
              <div>
                <p className="font-medium text-yellow-900">
                  Wallet Not Connected
                </p>
                <p className="text-sm text-yellow-700">
                  {walletAvailable
                    ? "Connect your Freighter wallet to register warranties."
                    : "Freighter wallet not detected. Please install Freighter extension."}
                </p>
              </div>
            </div>
            {walletAvailable && (
              <button
                type="button"
                onClick={handleConnectWallet}
                disabled={connecting}
                className="bg-yellow-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <Wallet className="w-4 h-4" />
                {connecting ? "Connecting..." : "Connect Wallet"}
              </button>
            )}
          </div>
        </div>
      )}

      {walletAddress && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
          <div className="flex items-center gap-2">
            <Wallet className="w-5 h-5 text-green-600" />
            <div>
              <p className="font-medium text-green-900">Wallet Connected</p>
              <p className="text-sm text-green-700 font-mono">
                {walletAddress.slice(0, 8)}...{walletAddress.slice(-8)}
              </p>
            </div>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label
            htmlFor="productName"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Product Name *
          </label>
          <input
            type="text"
            id="productName"
            required
            value={formData.productName}
            onChange={(e) =>
              setFormData({ ...formData, productName: e.target.value })
            }
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            placeholder="e.g., Laptop Pro 2024"
          />
        </div>

        <div>
          <label
            htmlFor="serialNumber"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Serial Number *
          </label>
          <input
            type="text"
            id="serialNumber"
            required
            value={formData.serialNumber}
            onChange={(e) =>
              setFormData({ ...formData, serialNumber: e.target.value })
            }
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            placeholder="e.g., SN123456789"
          />
        </div>

        <div>
          <label
            htmlFor="manufacturer"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Manufacturer *
          </label>
          <input
            type="text"
            id="manufacturer"
            required
            value={formData.manufacturer}
            onChange={(e) =>
              setFormData({ ...formData, manufacturer: e.target.value })
            }
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            placeholder="e.g., TechCorp"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label
              htmlFor="purchaseDate"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Purchase Date *
            </label>
            <input
              type="date"
              id="purchaseDate"
              required
              value={formData.purchaseDate}
              onChange={(e) =>
                setFormData({ ...formData, purchaseDate: e.target.value })
              }
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>

          <div>
            <label
              htmlFor="expirationDate"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Expiration Date *
            </label>
            <input
              type="date"
              id="expirationDate"
              required
              value={formData.expirationDate}
              onChange={(e) =>
                setFormData({ ...formData, expirationDate: e.target.value })
              }
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        {success && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">
            {success}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-primary-600 text-white py-3 px-6 rounded-lg font-medium hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {loading ? (
            "Registering..."
          ) : (
            <>
              <Save className="w-5 h-5" />
              Register Warranty
            </>
          )}
        </button>
      </form>
    </div>
  );
}

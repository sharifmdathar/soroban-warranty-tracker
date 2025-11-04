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
    <div className="bg-white/80 backdrop-blur-md rounded-xl shadow-lg p-8 border border-gray-200/50 animate-fade-in">
      <div className="flex items-center gap-3 mb-8">
        <div className="bg-gradient-to-br from-blue-600 to-purple-600 p-3 rounded-xl shadow-lg">
          <Package className="w-7 h-7 text-white" />
        </div>
        <div>
          <h2 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Register New Warranty
          </h2>
          <p className="text-sm text-gray-500 mt-1">Add a new product warranty to the blockchain</p>
        </div>
      </div>

      {/* Wallet Connection Status */}
      {!walletAddress && (
        <div className="bg-gradient-to-br from-yellow-50 to-orange-50 border-2 border-yellow-200 rounded-xl p-5 mb-6 shadow-md animate-scale-in">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <div className="bg-gradient-to-br from-yellow-400 to-orange-400 p-2 rounded-lg">
                <Wallet className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="font-semibold text-yellow-900 text-lg">
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
                className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white px-6 py-3 rounded-lg font-semibold hover:from-yellow-600 hover:to-orange-600 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transform hover:scale-105 transition-all duration-200 shadow-lg hover:shadow-xl"
              >
                <Wallet className="w-5 h-5" />
                {connecting ? (
                  <span className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                    Connecting...
                  </span>
                ) : (
                  "Connect Wallet"
                )}
              </button>
            )}
          </div>
        </div>
      )}

      {walletAddress && (
        <div className="bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-200 rounded-xl p-5 mb-6 shadow-md animate-scale-in">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-br from-green-500 to-emerald-500 p-2 rounded-lg">
              <Wallet className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="font-semibold text-green-900 text-lg flex items-center gap-2">
                Wallet Connected
                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
              </p>
              <p className="text-sm text-green-700 font-mono mt-1">
                {walletAddress.slice(0, 8)}...{walletAddress.slice(-8)}
              </p>
            </div>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-2">
          <label
            htmlFor="productName"
            className="block text-sm font-semibold text-gray-700 flex items-center gap-2"
          >
            <span>Product Name</span>
            <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            id="productName"
            required
            value={formData.productName}
            onChange={(e) =>
              setFormData({ ...formData, productName: e.target.value })
            }
            className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 hover:border-blue-400"
            placeholder="e.g., Laptop Pro 2024"
          />
        </div>

        <div className="space-y-2">
          <label
            htmlFor="serialNumber"
            className="block text-sm font-semibold text-gray-700 flex items-center gap-2"
          >
            <span>Serial Number</span>
            <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            id="serialNumber"
            required
            value={formData.serialNumber}
            onChange={(e) =>
              setFormData({ ...formData, serialNumber: e.target.value })
            }
            className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 hover:border-blue-400 font-mono"
            placeholder="e.g., SN123456789"
          />
        </div>

        <div className="space-y-2">
          <label
            htmlFor="manufacturer"
            className="block text-sm font-semibold text-gray-700 flex items-center gap-2"
          >
            <span>Manufacturer</span>
            <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            id="manufacturer"
            required
            value={formData.manufacturer}
            onChange={(e) =>
              setFormData({ ...formData, manufacturer: e.target.value })
            }
            className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 hover:border-blue-400"
            placeholder="e.g., TechCorp"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label
              htmlFor="purchaseDate"
              className="block text-sm font-semibold text-gray-700 flex items-center gap-2"
            >
              <span>Purchase Date</span>
              <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              id="purchaseDate"
              required
              value={formData.purchaseDate}
              onChange={(e) =>
                setFormData({ ...formData, purchaseDate: e.target.value })
              }
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 hover:border-blue-400"
            />
          </div>

          <div className="space-y-2">
            <label
              htmlFor="expirationDate"
              className="block text-sm font-semibold text-gray-700 flex items-center gap-2"
            >
              <span>Expiration Date</span>
              <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              id="expirationDate"
              required
              value={formData.expirationDate}
              onChange={(e) =>
                setFormData({ ...formData, expirationDate: e.target.value })
              }
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 hover:border-blue-400"
            />
          </div>
        </div>

        {error && (
          <div className="bg-gradient-to-r from-red-50 to-pink-50 border-2 border-red-200 text-red-700 px-5 py-4 rounded-xl shadow-md animate-scale-in flex items-center gap-3">
            <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
            <span className="font-medium">{error}</span>
          </div>
        )}

        {success && (
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-200 text-green-700 px-5 py-4 rounded-xl shadow-md animate-scale-in flex items-center gap-3">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span className="font-semibold">{success}</span>
          </div>
        )}

        <button
          type="submit"
          disabled={loading || !walletAddress}
          className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-4 px-6 rounded-xl font-semibold hover:from-blue-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 transform hover:scale-105 transition-all duration-200 shadow-lg hover:shadow-xl disabled:hover:scale-100"
        >
          {loading ? (
            <span className="flex items-center gap-3">
              <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
              Registering Warranty...
            </span>
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

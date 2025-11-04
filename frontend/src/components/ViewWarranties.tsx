import { useState, useMemo } from "react";
import { Search, Eye, Calendar, Package } from "lucide-react";
import type { WarrantyData, WarrantyStatus } from "../types";
import {
  formatDate,
  getStatusColor,
  WarrantyTrackerClient,
} from "../utils/soroban";

interface ViewWarrantiesProps {
  contractId: string;
}

export default function ViewWarranties({ contractId }: ViewWarrantiesProps) {
  const [warrantyId, setWarrantyId] = useState("");
  const [owner, setOwner] = useState("");
  const [warranty, setWarranty] = useState<WarrantyData | null>(null);
  const [warranties, setWarranties] = useState<WarrantyData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"id" | "owner">("id");

  // Create client instance when contractId is available
  const client = useMemo(() => {
    if (!contractId) return null;
    try {
      return new WarrantyTrackerClient({ contractId });
    } catch (err) {
      return null;
    }
  }, [contractId]);

  const handleSearchById = async () => {
    if (!client) {
      setError("Contract ID not configured. Please set it in Settings.");
      return;
    }

    if (!warrantyId.trim()) {
      setError("Please enter a warranty ID");
      return;
    }

    setLoading(true);
    setError(null);
    setWarranty(null);

    try {
      const result = await client.getWarranty(warrantyId.trim());
      if (result) {
        setWarranty(result);
        setError(null);
      } else {
        setError("Warranty not found. Please check the ID and try again.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch warranty");
    } finally {
      setLoading(false);
    }
  };

  const handleSearchByOwner = async () => {
    if (!client) {
      setError("Contract ID not configured. Please set it in Settings.");
      return;
    }

    if (!owner.trim()) {
      setError("Please enter an owner address");
      return;
    }

    // Validate Stellar address format
    if (!owner.trim().startsWith("G") || owner.trim().length !== 56) {
      setError(
        "Invalid Stellar address format. Address must start with G and be 56 characters long."
      );
      return;
    }

    setLoading(true);
    setError(null);
    setWarranties([]);

    try {
      const result = await client.getWarrantiesByOwner(owner.trim());
      if (result && result.length > 0) {
        setWarranties(result);
        setError(null);
      } else {
        setError("No warranties found for this owner.");
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to fetch warranties"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white/80 backdrop-blur-md rounded-xl shadow-lg p-8 border border-gray-200/50 animate-fade-in">
        <div className="flex items-center gap-3 mb-8">
          <div className="bg-gradient-to-br from-blue-600 to-purple-600 p-3 rounded-xl shadow-lg">
            <Search className="w-7 h-7 text-white" />
          </div>
          <div>
            <h2 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              View Warranties
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              Search and view warranty details
            </p>
          </div>
        </div>

        <div className="flex gap-4 mb-6">
          <button
            onClick={() => setViewMode("id")}
            className={`px-6 py-3 rounded-xl font-semibold transition-all duration-200 transform hover:scale-105 ${
              viewMode === "id"
                ? "bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200 hover:shadow-md"
            }`}
          >
            Search by ID
          </button>
          <button
            onClick={() => setViewMode("owner")}
            className={`px-6 py-3 rounded-xl font-semibold transition-all duration-200 transform hover:scale-105 ${
              viewMode === "owner"
                ? "bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200 hover:shadow-md"
            }`}
          >
            Search by Owner
          </button>
        </div>

        {viewMode === "id" ? (
          <div className="space-y-4">
            <div>
              <label
                htmlFor="warrantyId"
                className="block text-sm font-semibold text-gray-700 mb-2"
              >
                Warranty ID
              </label>
              <div className="flex gap-3">
                <input
                  type="text"
                  id="warrantyId"
                  value={warrantyId}
                  onChange={(e) => setWarrantyId(e.target.value)}
                  className="flex-1 px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 hover:border-blue-400 font-mono"
                  placeholder="Enter warranty ID"
                />
                <button
                  onClick={handleSearchById}
                  disabled={loading || !warrantyId}
                  className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-3 rounded-lg font-semibold hover:from-blue-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transform hover:scale-105 transition-all duration-200 shadow-lg hover:shadow-xl disabled:hover:scale-100"
                >
                  {loading ? (
                    <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                  ) : (
                    <Search className="w-5 h-5" />
                  )}
                  Search
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label
                htmlFor="owner"
                className="block text-sm font-semibold text-gray-700 mb-2"
              >
                Owner Address
              </label>
              <div className="flex gap-3">
                <input
                  type="text"
                  id="owner"
                  value={owner}
                  onChange={(e) => setOwner(e.target.value)}
                  className="flex-1 px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 hover:border-blue-400 font-mono"
                  placeholder="G..."
                />
                <button
                  onClick={handleSearchByOwner}
                  disabled={loading || !owner}
                  className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-3 rounded-lg font-semibold hover:from-blue-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transform hover:scale-105 transition-all duration-200 shadow-lg hover:shadow-xl disabled:hover:scale-100"
                >
                  {loading ? (
                    <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                  ) : (
                    <Search className="w-5 h-5" />
                  )}
                  Search
                </button>
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="mt-4 bg-gradient-to-r from-red-50 to-pink-50 border-2 border-red-200 text-red-700 px-5 py-4 rounded-xl shadow-md animate-scale-in flex items-center gap-3">
            <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
            <span className="font-medium">{error}</span>
          </div>
        )}
      </div>

      {warranty && (
        <div className="bg-white/80 backdrop-blur-md rounded-xl shadow-lg p-8 border border-gray-200/50 animate-fade-in">
          <div className="flex items-center gap-3 mb-6">
            <div className="bg-gradient-to-br from-blue-600 to-purple-600 p-2 rounded-xl">
              <Eye className="w-6 h-6 text-white" />
            </div>
            <h3 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Warranty Details
            </h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <label className="text-sm font-semibold text-gray-600 mb-2 block">
                  Product Name
                </label>
                <p className="text-lg font-bold text-gray-900">
                  {warranty.product_name}
                </p>
              </div>
              <div>
                <label className="text-sm font-semibold text-gray-600 mb-2 block">
                  Serial Number
                </label>
                <p className="text-lg font-mono text-gray-900">
                  {warranty.serial_number}
                </p>
              </div>
              <div>
                <label className="text-sm font-semibold text-gray-600 mb-2 block">
                  Manufacturer
                </label>
                <p className="text-lg font-semibold text-gray-900">
                  {warranty.manufacturer}
                </p>
              </div>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-semibold text-gray-600 mb-2 block">
                  Owner Address
                </label>
                <p className="text-base font-mono text-gray-900 break-all bg-gray-50 p-3 rounded-lg border border-gray-200">
                  {warranty.owner}
                </p>
              </div>
              <div>
                <label className="text-sm font-semibold text-gray-600 mb-2 block">
                  Status
                </label>
                <span
                  className={`inline-block px-4 py-2 rounded-full border-2 font-semibold ${getStatusColor(
                    warranty.status as WarrantyStatus
                  )}`}
                >
                  {warranty.status}
                </span>
              </div>
              <div>
                <label className="text-sm font-semibold text-gray-600 mb-2 flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  Purchase Date
                </label>
                <p className="text-lg font-semibold text-gray-900">
                  {formatDate(warranty.purchase_date)}
                </p>
              </div>
              <div>
                <label className="text-sm font-semibold text-gray-600 mb-2 flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  Expiration Date
                </label>
                <p className="text-lg font-semibold text-gray-900">
                  {formatDate(warranty.expiration_date)}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {warranties.length > 0 && (
        <div className="bg-white/80 backdrop-blur-md rounded-xl shadow-lg p-8 border border-gray-200/50 animate-fade-in">
          <h3 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-6">
            Owner's Warranties ({warranties.length})
          </h3>
          <div className="space-y-4">
            {warranties.map((warranty) => (
              <div
                key={warranty.id}
                className="p-6 bg-gradient-to-br from-gray-50 to-blue-50 rounded-xl hover:shadow-lg border-2 border-gray-200 transition-all duration-200 transform hover:scale-[1.02]"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="bg-gradient-to-br from-blue-600 to-purple-600 p-2 rounded-lg">
                      <Package className="w-5 h-5 text-white" />
                    </div>
                    <span className="font-bold text-lg text-gray-900">
                      Warranty ID: {warranty.id}
                    </span>
                  </div>
                  <span
                    className={`px-4 py-2 rounded-full border-2 font-semibold ${getStatusColor(
                      warranty.status as WarrantyStatus
                    )}`}
                  >
                    {warranty.status}
                  </span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <span className="text-sm font-semibold text-gray-600 block mb-1">
                      Product:
                    </span>
                    <p className="font-bold text-gray-900">
                      {warranty.product_name}
                    </p>
                  </div>
                  <div>
                    <span className="text-sm font-semibold text-gray-600 block mb-1">
                      Serial:
                    </span>
                    <p className="font-mono font-semibold text-gray-900">
                      {warranty.serial_number}
                    </p>
                  </div>
                  <div>
                    <span className="text-sm font-semibold text-gray-600 block mb-1">
                      Expires:
                    </span>
                    <p className="font-semibold text-gray-900">
                      {formatDate(warranty.expiration_date)}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

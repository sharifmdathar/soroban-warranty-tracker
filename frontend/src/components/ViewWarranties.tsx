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
      console.error("Failed to create WarrantyTrackerClient:", err);
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
      console.error("Error fetching warranty:", err);
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
      console.error("Error fetching warranties:", err);
      setError(
        err instanceof Error ? err.message : "Failed to fetch warranties"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center gap-2 mb-6">
          <Search className="w-6 h-6 text-primary-600" />
          <h2 className="text-2xl font-bold text-gray-900">View Warranties</h2>
        </div>

        <div className="flex gap-4 mb-6">
          <button
            onClick={() => setViewMode("id")}
            className={`px-4 py-2 rounded-lg font-medium ${
              viewMode === "id"
                ? "bg-primary-600 text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            Search by ID
          </button>
          <button
            onClick={() => setViewMode("owner")}
            className={`px-4 py-2 rounded-lg font-medium ${
              viewMode === "owner"
                ? "bg-primary-600 text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
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
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Warranty ID
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  id="warrantyId"
                  value={warrantyId}
                  onChange={(e) => setWarrantyId(e.target.value)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="Enter warranty ID"
                />
                <button
                  onClick={handleSearchById}
                  disabled={loading || !warrantyId}
                  className="bg-primary-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  <Search className="w-5 h-5" />
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
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Owner Address
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  id="owner"
                  value={owner}
                  onChange={(e) => setOwner(e.target.value)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="G..."
                />
                <button
                  onClick={handleSearchByOwner}
                  disabled={loading || !owner}
                  className="bg-primary-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  <Search className="w-5 h-5" />
                  Search
                </button>
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="mt-4 bg-yellow-50 border border-yellow-200 text-yellow-700 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}
      </div>

      {warranty && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center gap-2 mb-4">
            <Eye className="w-5 h-5 text-primary-600" />
            <h3 className="text-xl font-bold text-gray-900">
              Warranty Details
            </h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium text-gray-500">
                  Product Name
                </label>
                <p className="text-lg font-semibold">{warranty.product_name}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">
                  Serial Number
                </label>
                <p className="text-lg">{warranty.serial_number}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">
                  Manufacturer
                </label>
                <p className="text-lg">{warranty.manufacturer}</p>
              </div>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium text-gray-500">
                  Owner Address
                </label>
                <p className="text-lg font-mono text-sm break-all">
                  {warranty.owner}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">
                  Status
                </label>
                <span
                  className={`inline-block px-3 py-1 rounded-full border ${getStatusColor(
                    warranty.status as WarrantyStatus
                  )}`}
                >
                  {warranty.status}
                </span>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500 flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  Purchase Date
                </label>
                <p className="text-lg">{formatDate(warranty.purchase_date)}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500 flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  Expiration Date
                </label>
                <p className="text-lg">
                  {formatDate(warranty.expiration_date)}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {warranties.length > 0 && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-xl font-bold text-gray-900 mb-4">
            Owner's Warranties ({warranties.length})
          </h3>
          <div className="space-y-4">
            {warranties.map((warranty) => (
              <div
                key={warranty.id}
                className="p-4 bg-gray-50 rounded-lg hover:bg-gray-100 border border-gray-200"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Package className="w-5 h-5 text-primary-600" />
                    <span className="font-medium text-lg">
                      Warranty ID: {warranty.id}
                    </span>
                  </div>
                  <span
                    className={`px-3 py-1 rounded-full border text-sm ${getStatusColor(
                      warranty.status as WarrantyStatus
                    )}`}
                  >
                    {warranty.status}
                  </span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                  <div>
                    <span className="text-gray-500">Product:</span>
                    <p className="font-semibold">{warranty.product_name}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Serial:</span>
                    <p className="font-mono">{warranty.serial_number}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Expires:</span>
                    <p className="font-medium">
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

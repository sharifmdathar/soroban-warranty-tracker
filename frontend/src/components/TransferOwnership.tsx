import { useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { WarrantyTrackerClient } from '../utils/soroban';

interface TransferOwnershipProps {
  contractId: string;
  onSuccess?: () => void;
}

export default function TransferOwnership({ contractId, onSuccess }: TransferOwnershipProps) {
  const [warrantyId, setWarrantyId] = useState('');
  const [newOwner, setNewOwner] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const client = new WarrantyTrackerClient({ contractId });
      await client.transferOwnership(warrantyId, newOwner);

      setSuccess('Ownership transferred successfully!');
      setWarrantyId('');
      setNewOwner('');

      if (onSuccess) {
        onSuccess();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to transfer ownership');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Transfer Ownership</h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="warrantyId" className="block text-sm font-medium text-gray-700 mb-1">
            Warranty ID *
          </label>
          <input
            type="text"
            id="warrantyId"
            required
            value={warrantyId}
            onChange={(e) => setWarrantyId(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            placeholder="Enter warranty ID"
          />
        </div>

        <div>
          <label htmlFor="newOwner" className="block text-sm font-medium text-gray-700 mb-1">
            New Owner Address *
          </label>
          <input
            type="text"
            id="newOwner"
            required
            value={newOwner}
            onChange={(e) => setNewOwner(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            placeholder="G..."
          />
          <p className="mt-1 text-sm text-gray-500">
            Only active warranties can be transferred
          </p>
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
            'Transferring...'
          ) : (
            <>
              <ArrowRight className="w-5 h-5" />
              Transfer Ownership
            </>
          )}
        </button>
      </form>
    </div>
  );
}


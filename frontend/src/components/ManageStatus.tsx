import { useState } from 'react';
import { Shield } from 'lucide-react';
import { WarrantyTrackerClient } from '../utils/soroban';
import { WarrantyStatus } from '../types';

interface ManageStatusProps {
  contractId: string;
  onSuccess?: () => void;
}

export default function ManageStatus({ contractId, onSuccess }: ManageStatusProps) {
  const [warrantyId, setWarrantyId] = useState('');
  const [status, setStatus] = useState<WarrantyStatus>(WarrantyStatus.Active);
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
      await client.updateStatus(warrantyId, status);

      setSuccess(`Warranty status updated to ${status} successfully!`);
      setWarrantyId('');
      setStatus(WarrantyStatus.Active);

      if (onSuccess) {
        onSuccess();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update status');
    } finally {
      setLoading(false);
    }
  };

  const handleRevoke = async () => {
    if (!warrantyId) {
      setError('Please enter a warranty ID');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const client = new WarrantyTrackerClient({ contractId });
      await client.revokeWarranty(warrantyId);

      setSuccess('Warranty revoked successfully!');
      setWarrantyId('');
      setStatus(WarrantyStatus.Active);

      if (onSuccess) {
        onSuccess();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to revoke warranty');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center gap-2 mb-6">
        <Shield className="w-6 h-6 text-primary-600" />
        <h2 className="text-2xl font-bold text-gray-900">Manage Warranty Status</h2>
      </div>

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
          <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">
            Status *
          </label>
          <select
            id="status"
            required
            value={status}
            onChange={(e) => setStatus(e.target.value as WarrantyStatus)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          >
            <option value={WarrantyStatus.Active}>Active</option>
            <option value={WarrantyStatus.Expired}>Expired</option>
            <option value={WarrantyStatus.Revoked}>Revoked</option>
          </select>
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

        <div className="flex gap-4">
          <button
            type="submit"
            disabled={loading}
            className="flex-1 bg-primary-600 text-white py-3 px-6 rounded-lg font-medium hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Updating...' : 'Update Status'}
          </button>
          <button
            type="button"
            onClick={handleRevoke}
            disabled={loading || !warrantyId}
            className="flex-1 bg-red-600 text-white py-3 px-6 rounded-lg font-medium hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Revoke Warranty
          </button>
        </div>
      </form>
    </div>
  );
}


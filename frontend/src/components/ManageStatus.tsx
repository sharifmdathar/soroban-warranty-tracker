import { useState, useEffect } from 'react';
import { Shield, Wallet } from 'lucide-react';
import { WarrantyTrackerClient } from '../utils/soroban';
import { WarrantyStatus } from '../types';
import {
  connectFreighter,
  getFreighterPublicKey,
  isFreighterAvailable,
} from '../utils/wallet';

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
          : 'Failed to connect wallet. Make sure Freighter is installed and unlocked.'
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
        setError('Wallet not connected. Please connect your Freighter wallet first.');
        setLoading(false);
        return;
      }

      // Validate warranty ID
      if (!warrantyId.trim()) {
        setError('Please enter a warranty ID');
        setLoading(false);
        return;
      }

      const client = new WarrantyTrackerClient({ contractId });

      // First, verify the warranty exists and belongs to the connected wallet
      const warranty = await client.getWarranty(warrantyId.trim());
      if (!warranty) {
        setError(`Warranty with ID ${warrantyId} not found. Please check the ID and try again. You can view your warranties in the "View Warranties" section.`);
        setLoading(false);
        return;
      }

      // Check if the connected wallet is the owner
      if (warranty.owner !== walletAddress) {
        setError(`You are not the owner of warranty ${warrantyId}. Current owner: ${warranty.owner.slice(0, 8)}...${warranty.owner.slice(-8)}. Only the owner can update the status.`);
        setLoading(false);
        return;
      }

      // Re-verify warranty exists one more time to catch any race conditions
      const recheck = await client.getWarranty(warrantyId.trim());
      if (!recheck) {
        setError(`Warranty ${warrantyId} was found earlier but no longer exists. Please refresh and try again.`);
        setLoading(false);
        return;
      }
      
      if (recheck.owner !== walletAddress) {
        setError(`Warranty ownership has changed. Current owner: ${recheck.owner.slice(0, 8)}...${recheck.owner.slice(-8)}.`);
        setLoading(false);
        return;
      }

      await client.updateStatus(warrantyId, status, walletAddress);

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
    if (!warrantyId.trim()) {
      setError('Please enter a warranty ID');
      return;
    }

    // Check if wallet is connected
    if (!walletAddress) {
      setError('Wallet not connected. Please connect your Freighter wallet first.');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const client = new WarrantyTrackerClient({ contractId });

      // First, verify the warranty exists and belongs to the connected wallet
      const warranty = await client.getWarranty(warrantyId.trim());
      if (!warranty) {
        setError(`Warranty with ID ${warrantyId} not found. Please check the ID and try again.`);
        setLoading(false);
        return;
      }

      // Check if the connected wallet is the owner
      if (warranty.owner !== walletAddress) {
        setError(`You are not the owner of warranty ${warrantyId}. Only the owner can revoke the warranty.`);
        setLoading(false);
        return;
      }

      await client.revokeWarranty(warrantyId, walletAddress);

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

      {/* Wallet Connection Status */}
      {!walletAvailable && (
        <div className="mb-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-yellow-800">
            Freighter wallet not detected. Please install{' '}
            <a
              href="https://freighter.app"
              target="_blank"
              rel="noopener noreferrer"
              className="underline font-medium"
            >
              Freighter
            </a>{' '}
            to manage warranty status.
          </p>
        </div>
      )}

      {walletAvailable && !walletAddress && (
        <div className="mb-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <p className="text-yellow-800">Please connect your wallet to continue.</p>
            <button
              onClick={handleConnectWallet}
              disabled={connecting}
              className="bg-yellow-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {connecting ? 'Connecting...' : 'Connect Wallet'}
            </button>
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


import { useState, useEffect } from 'react';
import { ArrowRight, Wallet } from 'lucide-react';
import { WarrantyTrackerClient } from '../utils/soroban';
import {
  connectFreighter,
  getFreighterPublicKey,
  isFreighterAvailable,
} from '../utils/wallet';

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

      // Validate addresses
      if (!newOwner || !newOwner.startsWith('G') || newOwner.length !== 56) {
        setError('Invalid new owner address. Address must start with G and be 56 characters long.');
        setLoading(false);
        return;
      }

      const client = new WarrantyTrackerClient({ contractId });
      await client.transferOwnership(warrantyId, newOwner, walletAddress);

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

      {/* Wallet Connection Status */}
      {!walletAvailable && (
        <div className="mb-4 bg-yellow-50 border border-yellow-200 text-yellow-700 px-4 py-3 rounded-lg">
          <p className="text-sm">
            Freighter wallet not detected. Please install Freighter to transfer ownership.
          </p>
        </div>
      )}

      {walletAvailable && !walletAddress && (
        <div className="mb-4 bg-yellow-50 border border-yellow-200 text-yellow-700 px-4 py-3 rounded-lg">
          <p className="text-sm mb-2">Wallet not connected. Please connect your Freighter wallet.</p>
          <button
            type="button"
            onClick={handleConnectWallet}
            disabled={connecting}
            className="bg-yellow-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-yellow-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <Wallet className="w-4 h-4" />
            {connecting ? 'Connecting...' : 'Connect Wallet'}
          </button>
        </div>
      )}

      {walletAddress && (
        <div className="mb-4 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">
          <p className="text-sm">
            <strong>Wallet Connected:</strong> {walletAddress.substring(0, 8)}...
            {walletAddress.substring(walletAddress.length - 6)}
          </p>
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


export interface WarrantyData {
  id: string;
  owner: string;
  product_name: string;
  serial_number: string;
  manufacturer: string;
  purchase_date: string;
  expiration_date: string;
  status: WarrantyStatus;
  created_at: string;
}

export enum WarrantyStatus {
  Active = 'Active',
  Expired = 'Expired',
  Revoked = 'Revoked',
}

export interface ContractConfig {
  contractId: string;
  networkPassphrase: string;
  rpcUrl: string;
}


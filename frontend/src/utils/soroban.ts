import {
  Contract,
  Networks,
  scValToNative,
  xdr,
  Address,
  rpc,
  TransactionBuilder,
  TimeoutInfinite,
  Account,
  Horizon,
} from "@stellar/stellar-sdk";
import { signTransaction } from "@stellar/freighter-api";
import type { WarrantyData, ContractConfig } from "../types";
import { WarrantyStatus } from "../types";

// Default contract configuration - update these with your deployed contract
const DEFAULT_CONFIG: ContractConfig = {
  contractId: "", // Add your contract ID after deployment
  networkPassphrase: Networks.TESTNET,
  rpcUrl: "https://soroban-testnet.stellar.org:443",
};

export class WarrantyTrackerClient {
  private config: ContractConfig;
  private contract: Contract;
  private rpc: rpc.Server;

  constructor(config?: Partial<ContractConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    if (!this.config.contractId) {
      throw new Error("Contract ID is required");
    }
    this.contract = new Contract(this.config.contractId);
    this.rpc = new rpc.Server(this.config.rpcUrl);
  }

  private async invokeContract(
    method: string,
    args: xdr.ScVal[],
    signerAddress: string
  ): Promise<xdr.ScVal> {
    try {
      // Get the current account from Horizon server
      // For testnet: https://horizon-testnet.stellar.org
      // For futurenet: https://horizon-futurenet.stellar.org
      let horizonUrl = this.config.rpcUrl.replace(/\/rpc.*$/, "");
      if (
        horizonUrl.includes("soroban-testnet") ||
        horizonUrl.includes("rpc-testnet")
      ) {
        horizonUrl = "https://horizon-testnet.stellar.org";
      } else if (
        horizonUrl.includes("soroban-futurenet") ||
        horizonUrl.includes("rpc-futurenet")
      ) {
        horizonUrl = "https://horizon-futurenet.stellar.org";
      } else if (!horizonUrl.includes("horizon")) {
        horizonUrl = "https://horizon-testnet.stellar.org";
      }
      const horizon = new Horizon.Server(horizonUrl);

      const accountResponse = await horizon.loadAccount(signerAddress);
      const sourceAccount = new Account(
        signerAddress,
        accountResponse.sequenceNumber()
      );

      // Build the transaction
      const contractOp = this.contract.call(method, ...args);
      const tx = new TransactionBuilder(sourceAccount, {
        fee: "100",
        networkPassphrase: this.config.networkPassphrase,
      })
        .addOperation(contractOp)
        .setTimeout(TimeoutInfinite)
        .build();

      // Simulate the transaction first
      let simResponse: any;
      try {
        simResponse = await this.rpc.simulateTransaction(tx);
      } catch (simErr) {
        simResponse = { error: simErr };
      }

      if ("error" in simResponse || (simResponse as any).errorResult) {
        const error =
          "error" in simResponse
            ? simResponse.error
            : (simResponse as any).errorResult;

        // Extract error string for checking
        const errorStr =
          typeof error === "string" ? error : JSON.stringify(error);

        if (
          method === "update_status" &&
          errorStr.includes("UnreachableCodeReached")
        ) {
          throw new Error(
            `Failed to update warranty status: The contract simulation is failing due to an enum parameter encoding issue. ` +
              `The contract code allows status changes, but Soroban's simulation cannot properly handle the enum parameter. ` +
              `This is a known limitation with contracttype enums during simulation. ` +
              `Please use the "Revoke Warranty" button for Revoked status, which uses a different method that works.`
          );
        }

        // Extract more detailed error information for other methods
        let errorMessage = `Transaction simulation failed: ${JSON.stringify(
          error
        )}`;

        // Check for specific error types
        if (errorStr.includes("UnreachableCodeReached")) {
          // This typically means the contract panicked
          if (method === "revoke_warranty") {
            errorMessage = `Warranty not found or access denied. The warranty may not exist, or you may not be the owner. Please verify: 1) The warranty ID is correct, 2) You are the owner of this warranty, 3) The warranty exists in the contract.`;
          } else {
            errorMessage = `Contract execution failed: ${error}. This usually means the contract panicked due to invalid input or state.`;
          }
        } else if (typeof error === "object" && error !== null) {
          // Try to extract error message from event log
          if ("events" in error || "eventLog" in error) {
            const events =
              ("events" in error ? error.events : error.eventLog) || [];
            const errorEvent = events.find(
              (e: any) =>
                e &&
                (e.topics?.includes("error") || e.topics?.includes("Error"))
            );
            if (errorEvent) {
              errorMessage = `Contract error: ${JSON.stringify(
                errorEvent.data || errorEvent
              )}`;
            }
          }
        }

        throw new Error(errorMessage);
      }

      // Prepare the transaction (adds fees)
      const preparedTx = await this.rpc.prepareTransaction(tx);

      // Validate simulation response
      if (!simResponse || !("result" in simResponse && simResponse.result)) {
        throw new Error("Invalid simulation response: missing result");
      }

      // For Soroban transactions, we need to assemble FIRST (add auth entries)
      // Then sign the assembled transaction
      let assembledTx: any;
      try {
        // assembleTransaction uses the prepared transaction and adds auth entries from simulation
        const assembledTxBuilder = rpc.assembleTransaction(
          preparedTx,
          simResponse
        );

        // Build the transaction from the builder
        assembledTx = assembledTxBuilder.build();
      } catch (assembleError) {
        throw new Error(
          `Failed to assemble transaction: ${
            assembleError instanceof Error
              ? assembleError.message
              : String(assembleError)
          }`
        );
      }

      // Now sign the ASSEMBLED transaction (with auth entries included)
      // Convert assembled transaction to XDR for signing
      const txToSign = assembledTx.toXDR();
      // Sign with Freighter
      const signedTxResult = await signTransaction(txToSign, {
        networkPassphrase: this.config.networkPassphrase,
      });

      if (signedTxResult.error) {
        throw new Error(`Failed to sign transaction: ${signedTxResult.error}`);
      }

      if (!signedTxResult.signedTxXdr) {
        throw new Error("Transaction was not signed");
      }

      // For Soroban transactions with auth entries, parse the signed envelope
      let signedTransaction: any;
      try {
        signedTransaction = TransactionBuilder.fromXDR(
          signedTxResult.signedTxXdr,
          this.config.networkPassphrase
        );
      } catch (parseError) {
        const errorMsg =
          parseError instanceof Error ? parseError.message : String(parseError);

        // "Bad union switch: 4" means envelopeTypeScpvalue - this is a Soroban-specific structure
        // When this happens, we need to use the assembled transaction and apply the signature manually
        if (
          errorMsg.includes("Bad union switch") ||
          errorMsg.includes("switch: 4")
        ) {
          try {
            const signedEnvelope = xdr.TransactionEnvelope.fromXDR(
              signedTxResult.signedTxXdr,
              "base64"
            );

            // Extract signature from envelope
            let signature: any = null;
            const envType = signedEnvelope.switch().value;

            if (envType === xdr.EnvelopeType.envelopeTypeTx().value) {
              const v1 = signedEnvelope.v1();
              if (v1 && v1.signatures().length > 0) {
                signature = v1.signatures()[0];
              }
            } else if (envType === xdr.EnvelopeType.envelopeTypeTxV0().value) {
              const v0 = signedEnvelope.v0();
              if (v0 && v0.signatures().length > 0) {
                signature = v0.signatures()[0];
              }
            }

            // Use the assembled transaction and apply the signature
            const finalTx = assembledTx;
            if (signature) {
              if (finalTx.signatures) {
                finalTx.signatures.push(signature);
              } else {
                throw new Error(
                  "Assembled transaction does not have a signatures array"
                );
              }
            }

            signedTransaction = finalTx;
          } catch (sigError) {
            throw new Error(
              `Failed to extract signature from Soroban envelope: ${
                sigError instanceof Error ? sigError.message : String(sigError)
              }`
            );
          }
        } else {
          throw new Error(`Failed to parse signed transaction: ${errorMsg}`);
        }
      }

      if (!signedTransaction) {
        throw new Error("Failed to parse signed transaction");
      }
      // Send the signed transaction with auth entries
      const sendResponse = await this.rpc.sendTransaction(signedTransaction);

      if ("errorResult" in sendResponse) {
        throw new Error(
          `Transaction failed: ${JSON.stringify(sendResponse.errorResult)}`
        );
      }

      // Use simulation result instead of waiting for getTransaction
      // The simulation result matches the actual transaction result
      if (
        simResponse &&
        "result" in simResponse &&
        (simResponse as any).result?.retval
      ) {
        const simResult = (simResponse as any).result.retval;

        // The retval is likely an object (ScVal structure), not a string
        // Use scValToNative to convert it to native JavaScript, then reconstruct ScVal
        let result: xdr.ScVal;

        try {
          // If it's already a ScVal object, use it directly
          if (simResult instanceof xdr.ScVal) {
            result = simResult;
          }
          // If it's a string (XDR base64), parse it
          else if (typeof simResult === "string") {
            result = xdr.ScVal.fromXDR(simResult, "base64");
          }
          // If it's an object, use scValToNative to convert it to native JavaScript
          else if (typeof simResult === "object" && simResult !== null) {
            // Use scValToNative to convert the ScVal-like object to native JavaScript
            const nativeValue = scValToNative(simResult);

            // Convert the native value back to ScVal
            // For u64 (which is what register_warranty returns), it should be a string, number, or bigint
            if (
              typeof nativeValue === "string" ||
              typeof nativeValue === "number"
            ) {
              result = xdr.ScVal.scvU64(
                xdr.Uint64.fromString(nativeValue.toString())
              );
            } else if (typeof nativeValue === "bigint") {
              result = xdr.ScVal.scvU64(
                xdr.Uint64.fromString(nativeValue.toString())
              );
            } else {
              throw new Error(
                `Unexpected native value type: ${typeof nativeValue}`
              );
            }
          } else {
            throw new Error(
              `Unexpected simulation result type: ${typeof simResult}`
            );
          }

          return result;
        } catch (error) {
          // If we can't extract the result, but transaction succeeded, return success indicator
          return xdr.ScVal.scvBool(true);
        }
      } else {
        // No result in simulation - this might be a write-only operation
        return xdr.ScVal.scvBool(true);
      }
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error("Failed to invoke contract method");
    }
  }

  async registerWarranty(
    owner: string,
    productName: string,
    serialNumber: string,
    manufacturer: string,
    purchaseDate: string,
    expirationDate: string,
    signerAddress: string
  ): Promise<string> {
    // Validate address format
    if (!owner || !owner.startsWith("G") || owner.length !== 56) {
      throw new Error(
        "Invalid Stellar address format. Address must start with G and be 56 characters long."
      );
    }

    if (
      !signerAddress ||
      !signerAddress.startsWith("G") ||
      signerAddress.length !== 56
    ) {
      throw new Error("Invalid signer address");
    }

    // Ensure owner is the signer (contract requires owner to authorize)
    if (owner !== signerAddress) {
      throw new Error(
        "Owner address must match the signer address. The contract requires the owner to authorize the transaction."
      );
    }

    // Convert dates to Unix timestamps (seconds)
    const purchaseTimestamp = Math.floor(
      new Date(purchaseDate).getTime() / 1000
    );
    const expirationTimestamp = Math.floor(
      new Date(expirationDate).getTime() / 1000
    );

    // Validate dates
    if (expirationTimestamp <= purchaseTimestamp) {
      throw new Error("Expiration date must be after purchase date.");
    }

    const currentTimestamp = Math.floor(Date.now() / 1000);
    if (purchaseTimestamp > currentTimestamp) {
      throw new Error("Purchase date cannot be in the future.");
    }

    try {
      const args = [
        Address.fromString(owner).toScVal(),
        xdr.ScVal.scvString(productName),
        xdr.ScVal.scvString(serialNumber),
        xdr.ScVal.scvString(manufacturer),
        xdr.ScVal.scvU64(xdr.Uint64.fromString(purchaseTimestamp.toString())),
        xdr.ScVal.scvU64(xdr.Uint64.fromString(expirationTimestamp.toString())),
      ];

      const result = await this.invokeContract(
        "register_warranty",
        args,
        signerAddress
      );
      return scValToNative(result).toString();
    } catch (err) {
      if (err instanceof Error && err.message.includes("address")) {
        throw new Error(
          "Invalid Stellar address. Please connect a valid wallet."
        );
      }
      throw err;
    }
  }

  async getWarranty(warrantyId: string): Promise<WarrantyData | null> {
    try {
      const args = [xdr.ScVal.scvU64(xdr.Uint64.fromString(warrantyId))];
      const simResponse = await this.rpc.simulateTransaction(
        new TransactionBuilder(
          new Account(
            "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF",
            "0"
          ),
          {
            fee: "100",
            networkPassphrase: this.config.networkPassphrase,
          }
        )
          .addOperation(this.contract.call("get_warranty", ...args))
          .setTimeout(TimeoutInfinite)
          .build()
      );

      if ("error" in simResponse || (simResponse as any).errorResult) {
        return null;
      }

      if (
        !simResponse ||
        !("result" in simResponse && (simResponse as any).result?.retval)
      ) {
        return null;
      }

      const simResult = (simResponse as any).result.retval;

      // Convert ScVal to native JavaScript
      let warrantyData: any;
      if (simResult instanceof xdr.ScVal) {
        warrantyData = scValToNative(simResult);
      } else if (typeof simResult === "object" && simResult !== null) {
        warrantyData = scValToNative(simResult);
      } else {
        return null;
      }

      // The contract returns a struct, which scValToNative converts to an object
      // Convert it to WarrantyData format
      if (typeof warrantyData === "object" && warrantyData !== null) {
        // Map the contract struct to WarrantyData
        // The struct fields depend on your contract, but typically:
        const data: WarrantyData = {
          id: warrantyId,
          owner: warrantyData.owner || warrantyData.owner?.toString() || "",
          product_name:
            warrantyData.product_name || warrantyData.productName || "",
          serial_number:
            warrantyData.serial_number || warrantyData.serialNumber || "",
          manufacturer: warrantyData.manufacturer || "",
          purchase_date:
            warrantyData.purchase_date?.toString() ||
            warrantyData.purchaseDate?.toString() ||
            "",
          expiration_date:
            warrantyData.expiration_date?.toString() ||
            warrantyData.expirationDate?.toString() ||
            "",
          status:
            warrantyData.status === 0 ||
            warrantyData.status === "0" ||
            warrantyData.status === "Active"
              ? WarrantyStatus.Active
              : warrantyData.status === 1 ||
                warrantyData.status === "1" ||
                warrantyData.status === "Expired"
              ? WarrantyStatus.Expired
              : WarrantyStatus.Revoked,
          created_at:
            warrantyData.created_at?.toString() ||
            warrantyData.createdAt?.toString() ||
            "",
        };

        return data;
      }

      return null;
    } catch (error) {
      return null;
    }
  }

  async getWarrantiesByOwner(owner: string): Promise<WarrantyData[]> {
    try {
      // Validate address format
      if (!owner || !owner.startsWith("G") || owner.length !== 56) {
        throw new Error("Invalid Stellar address format");
      }

      const args = [Address.fromString(owner).toScVal()];
      const simResponse = await this.rpc.simulateTransaction(
        new TransactionBuilder(
          new Account(
            "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF",
            "0"
          ),
          {
            fee: "100",
            networkPassphrase: this.config.networkPassphrase,
          }
        )
          .addOperation(this.contract.call("get_warranties_by_owner", ...args))
          .setTimeout(TimeoutInfinite)
          .build()
      );

      if ("error" in simResponse || (simResponse as any).errorResult) {
        return [];
      }

      if (
        !simResponse ||
        !("result" in simResponse && (simResponse as any).result?.retval)
      ) {
        return [];
      }

      const simResult = (simResponse as any).result.retval;

      // Convert ScVal to native JavaScript
      let warrantiesData: any;
      if (simResult instanceof xdr.ScVal) {
        warrantiesData = scValToNative(simResult);
      } else if (typeof simResult === "object" && simResult !== null) {
        warrantiesData = scValToNative(simResult);
      } else {
        return [];
      }

      // The contract returns a Vec (array), which scValToNative converts to an array
      if (Array.isArray(warrantiesData)) {
        // If it's an array of warranty IDs (u64), return them as strings
        const warrantyIds = warrantiesData.map(
          (id: any) => id?.toString() || String(id)
        );

        // Fetch full warranty data for each ID
        const warranties: WarrantyData[] = [];
        for (const id of warrantyIds) {
          const warranty = await this.getWarranty(id);
          if (warranty) {
            warranties.push(warranty);
          }
        }

        return warranties;
      }

      return [];
    } catch (error) {
      return [];
    }
  }

  async transferOwnership(
    warrantyId: string,
    newOwner: string,
    signerAddress: string
  ): Promise<void> {
    const args = [
      xdr.ScVal.scvU64(xdr.Uint64.fromString(warrantyId)),
      Address.fromString(newOwner).toScVal(),
    ];
    await this.invokeContract("transfer_ownership", args, signerAddress);
  }

  async updateStatus(
    warrantyId: string,
    status: WarrantyStatus,
    signerAddress: string
  ): Promise<void> {
    // Use dedicated methods for each status to avoid enum parameter simulation issues
    if (status === WarrantyStatus.Revoked) {
      await this.revokeWarranty(warrantyId, signerAddress);
      return;
    } else if (status === WarrantyStatus.Active) {
      await this.setToActive(warrantyId, signerAddress);
      return;
    } else if (status === WarrantyStatus.Expired) {
      await this.setToExpired(warrantyId, signerAddress);
      return;
    } else {
      throw new Error(`Invalid warranty status: ${status}`);
    }
  }

  async setToActive(warrantyId: string, signerAddress: string): Promise<void> {
    const args = [xdr.ScVal.scvU64(xdr.Uint64.fromString(warrantyId))];
    await this.invokeContract("set_to_active", args, signerAddress);
  }

  async setToExpired(warrantyId: string, signerAddress: string): Promise<void> {
    const args = [xdr.ScVal.scvU64(xdr.Uint64.fromString(warrantyId))];
    await this.invokeContract("set_to_expired", args, signerAddress);
  }

  async revokeWarranty(
    warrantyId: string,
    signerAddress: string
  ): Promise<void> {
    const args = [xdr.ScVal.scvU64(xdr.Uint64.fromString(warrantyId))];
    await this.invokeContract("revoke_warranty", args, signerAddress);
  }

  async getWarrantyCount(): Promise<string> {
    throw new Error(
      "Read operations not fully implemented. Use a Soroban RPC client."
    );
  }

  async isWarrantyExpired(_warrantyId: string): Promise<boolean> {
    throw new Error(
      "Read operations not fully implemented. Use a Soroban RPC client."
    );
  }
}

// Helper function to format date for display
export function formatDate(timestamp: string): string {
  const date = new Date(parseInt(timestamp) * 1000);
  return date.toLocaleDateString();
}

// Helper function to get status color
export function getStatusColor(status: WarrantyStatus): string {
  switch (status) {
    case WarrantyStatus.Active:
      return "bg-green-100 text-green-800 border-green-200";
    case WarrantyStatus.Expired:
      return "bg-red-100 text-red-800 border-red-200";
    case WarrantyStatus.Revoked:
      return "bg-gray-100 text-gray-800 border-gray-200";
    default:
      return "bg-gray-100 text-gray-800 border-gray-200";
  }
}

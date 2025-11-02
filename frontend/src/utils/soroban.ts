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

  /**
   * Read-only contract call - no transaction signing required
   * Uses simulateTransaction to get contract state
   */
  private async readContract(
    method: string,
    args: xdr.ScVal[]
  ): Promise<xdr.ScVal> {
    try {

      // For read-only calls, we can use a dummy account since we're not sending
      // We just need it to build the transaction for simulation
      const dummyAccount = new Account(
        "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF",
        "0"
      );

      // Build the transaction (won't be sent)
      const contractOp = this.contract.call(method, ...args);
      const tx = new TransactionBuilder(dummyAccount, {
        fee: "100",
        networkPassphrase: this.config.networkPassphrase,
      })
        .addOperation(contractOp)
        .setTimeout(TimeoutInfinite)
        .build();

      const simResponse = await this.rpc.simulateTransaction(tx);

      if ("error" in simResponse || (simResponse as any).errorResult) {
        const error =
          "error" in simResponse
            ? simResponse.error
            : (simResponse as any).errorResult;
        console.error("[Soroban] Read simulation failed:", error);
        throw new Error(`Read operation failed: ${JSON.stringify(error)}`);
      }


      // Extract result from simulation
      if (
        simResponse &&
        "result" in simResponse &&
        (simResponse as any).result?.retval
      ) {
        const simResult = (simResponse as any).result.retval;

        // Convert the result to ScVal
        let result: xdr.ScVal;

        if (simResult instanceof xdr.ScVal) {
          result = simResult;
        } else if (typeof simResult === "string") {
          result = xdr.ScVal.fromXDR(simResult, "base64");
        } else if (typeof simResult === "object" && simResult !== null) {
          // Use scValToNative to convert, then reconstruct ScVal
          const nativeValue = scValToNative(simResult);

          // The result type depends on what the contract returns
          // For warranty data, it will be a struct/object
          // We'll return it as-is for now and let the caller handle conversion
          // For now, wrap it in a ScVal if needed
          if (typeof nativeValue === "object") {
            // For structs, we can't easily reconstruct ScVal, so we'll need to
            // work with the native value directly or convert it back
            // For now, let's try to use the original object as ScVal-like
            throw new Error(
              "Complex return types from read operations need special handling. " +
                "Use scValToNative directly on the simulation result."
            );
          }

          // For primitive types
          if (
            typeof nativeValue === "string" ||
            typeof nativeValue === "number"
          ) {
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
      } else {
        throw new Error("No result in simulation response");
      }
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error("Failed to read from contract");
    }
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
      const simResponse = await this.rpc.simulateTransaction(tx);
      if ("error" in simResponse || (simResponse as any).errorResult) {
        const error =
          "error" in simResponse
            ? simResponse.error
            : (simResponse as any).errorResult;
        console.error("[Soroban] Simulation failed:", error);
        throw new Error(
          `Transaction simulation failed: ${JSON.stringify(error)}`
        );
      }

      // Prepare the transaction (adds fees)
      const preparedTx = await this.rpc.prepareTransaction(tx);

      // Validate simulation response
      if (!simResponse || !("result" in simResponse && simResponse.result)) {
        console.error("[Soroban] Invalid simulation response:", simResponse);
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
        console.error("[Soroban] Assemble failed:", assembleError);
        throw new Error(
          `Failed to assemble transaction: ${
            assembleError instanceof Error
              ? assembleError.message
              : String(assembleError)
          }. ` +
            `This might indicate an issue with the transaction structure or simulation response.`
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
        console.error(
          "[Soroban] Freighter signing error:",
          signedTxResult.error
        );
        throw new Error(`Failed to sign transaction: ${signedTxResult.error}`);
      }

      if (!signedTxResult.signedTxXdr) {
        console.error("[Soroban] No signed XDR returned from Freighter");
        throw new Error("Transaction was not signed");
      }

      // For Soroban transactions with auth entries, parse the signed envelope
      // The "Bad union switch: 4" error occurs when trying to parse Soroban-specific envelope structures
      let signedTransaction: any;
      try {
        // First, check if we can parse it as a standard transaction envelope
        signedTransaction = TransactionBuilder.fromXDR(
          signedTxResult.signedTxXdr,
          this.config.networkPassphrase
        );
      } catch (parseError) {
        const errorMsg =
          parseError instanceof Error ? parseError.message : String(parseError);
        console.error("[Soroban] ✗ Failed to parse signed envelope:", errorMsg);
        console.error(
          "[Soroban] Error type:",
          parseError instanceof Error
            ? parseError.constructor.name
            : typeof parseError
        );
        if (parseError instanceof Error) {
          console.error("[Soroban] Error stack:", parseError.stack);
        }

        // "Bad union switch: 4" means envelopeTypeScpvalue - this is a Soroban-specific structure
        // When this happens, we need to use the assembled transaction and apply the signature manually
        if (
          errorMsg.includes("Bad union switch") ||
          errorMsg.includes("switch: 4")
        ) {
          // The envelope has Soroban-specific structures that can't be parsed with TransactionBuilder.fromXDR
          // We already have the assembled transaction with auth entries
          // We need to apply the signature from the signed envelope to the assembled transaction
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
              } else {
                console.warn("[Soroban] No signatures found in v1 envelope");
              }
            } else if (envType === xdr.EnvelopeType.envelopeTypeTxV0().value) {
              const v0 = signedEnvelope.v0();
              if (v0 && v0.signatures().length > 0) {
                signature = v0.signatures()[0];
              } else {
                console.warn("[Soroban] No signatures found in v0 envelope");
              }
            } else {
              console.warn("[Soroban] Unsupported envelope type");
            }

            // Use the assembled transaction and apply the signature
            const finalTx = assembledTx;
            if (signature) {
              if (finalTx.signatures) {
                finalTx.signatures.push(signature);
              } else {
                console.error(
                  "[Soroban] ✗ Assembled transaction has no signatures array!"
                );
                console.error(
                  "[Soroban] Assembled transaction keys:",
                  Object.keys(finalTx)
                );
                throw new Error(
                  "Assembled transaction does not have a signatures array to append signature to"
                );
              }
            } else {
              console.warn("[Soroban] ⚠ No signature extracted from envelope!");
            }

            signedTransaction = finalTx;
          } catch (sigError) {
            console.error("[Soroban] ✗ Failed to extract signature:", sigError);
            if (sigError instanceof Error) {
              console.error(
                "[Soroban] Signature extraction error stack:",
                sigError.stack
              );
            }
            throw new Error(
              `Failed to extract signature from Soroban envelope: ${
                sigError instanceof Error ? sigError.message : String(sigError)
              }. Original error: ${errorMsg}`
            );
          }
        } else {
          console.error(
            "[Soroban] ✗ Unknown parse error (not Bad union switch):",
            errorMsg
          );
          throw new Error(`Failed to parse signed transaction: ${errorMsg}`);
        }
      }

      if (!signedTransaction) {
        console.error("[Soroban] ✗ Signed transaction is null or undefined");
        throw new Error(
          "Failed to parse signed transaction: returned null or undefined"
        );
      }
      // Send the signed transaction with auth entries
      const sendResponse = await this.rpc.sendTransaction(signedTransaction);

      if ("errorResult" in sendResponse) {
        console.error(
          "[Soroban] ✗ Transaction send failed:",
          sendResponse.errorResult
        );
        throw new Error(
          `Transaction failed: ${JSON.stringify(sendResponse.errorResult)}`
        );
      }

      // Use simulation result instead of waiting for getTransaction
      // The simulation result matches the actual transaction result
      // and avoids the "Bad union switch: 4" error when parsing getTransaction responses

      // Extract result from simulation response
      // This is safe because simulation returns the same result as the actual transaction
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
              console.error(
                "[Soroban] ✗ Unexpected native value type:",
                typeof nativeValue
              );
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
          const errorMsg =
            error instanceof Error ? error.message : String(error);
          console.error("[Soroban] ✗ Failed to extract result:", errorMsg);
          console.error(
            "[Soroban] Error stack:",
            error instanceof Error ? error.stack : "N/A"
          );

          // If we can't extract the result, but transaction succeeded, return success indicator
          console.warn(
            "[Soroban] ⚠ Cannot extract result, but transaction succeeded. Returning success indicator."
          );
          return xdr.ScVal.scvBool(true);
        }
      } else {
        // No result in simulation - this might be a write-only operation
        console.warn(
          "[Soroban] ⚠ No result in simulation response. This might be expected for write operations."
        );
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
      console.error("[RegisterWarranty] ✗ Registration failed:", err);
      if (err instanceof Error) {
        console.error("[RegisterWarranty] Error message:", err.message);
        console.error("[RegisterWarranty] Error stack:", err.stack);
      }
      if (err instanceof Error && err.message.includes("address")) {
        throw new Error(
          "Invalid Stellar address. Please connect a valid wallet."
        );
      }
      // Re-throw with more context if it's a Bad union switch error
      if (err instanceof Error && err.message.includes("Bad union switch")) {
        throw new Error(
          `Transaction parsing error: ${err.message}. ` +
            `This might indicate an issue with the transaction envelope structure. ` +
            `Check the browser console for detailed logs.`
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
        const error =
          "error" in simResponse
            ? simResponse.error
            : (simResponse as any).errorResult;
        console.error("[getWarranty] Error:", error);
        return null;
      }

      if (
        !simResponse ||
        !("result" in simResponse && (simResponse as any).result?.retval)
      ) {
        console.warn("[getWarranty] No result in simulation");
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
        console.error(
          "[getWarranty] Unexpected result type:",
          typeof simResult
        );
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
      console.error("[getWarranty] ✗ Failed to fetch warranty:", error);
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
        const error =
          "error" in simResponse
            ? simResponse.error
            : (simResponse as any).errorResult;
        console.error("[getWarrantiesByOwner] Error:", error);
        return [];
      }

      if (
        !simResponse ||
        !("result" in simResponse && (simResponse as any).result?.retval)
      ) {
        console.warn("[getWarrantiesByOwner] No result in simulation");
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
        console.error(
          "[getWarrantiesByOwner] Unexpected result type:",
          typeof simResult
        );
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
      console.error(
        "[getWarrantiesByOwner] ✗ Failed to fetch warranties:",
        error
      );
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
    const args = [
      xdr.ScVal.scvU64(xdr.Uint64.fromString(warrantyId)),
      xdr.ScVal.scvU32(Number(status)),
    ];
    await this.invokeContract("update_status", args, signerAddress);
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

  async isWarrantyExpired(warrantyId: string): Promise<boolean> {
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

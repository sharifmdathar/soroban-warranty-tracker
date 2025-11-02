# 🚀 Contract Deployment Guide

This guide will walk you through deploying the Warranty Tracker contract to the Soroban network.

## 📋 Prerequisites

1. **Stellar CLI** installed - Install from [here](https://developers.stellar.org/docs/tools/stellar-cli)
2. **Soroban CLI** - Usually comes with Stellar CLI, or install separately
3. **A Stellar account** - You'll need an account on testnet for deployment

## 🏗️ Step 1: Build the Contract

First, build the contract to generate the WASM file:

```bash
cd contracts/warranty-tracker
make build
```

Or directly:

```bash
stellar contract build
```

This will create the compiled WASM file at:

```
target/wasm32v1-none/release/warranty_tracker.wasm
```

## 🔑 Step 2: Set Up Your Stellar Account (Testnet)

### Option A: Generate a New Account

```bash
# Generate a new keypair
stellar keys generate --global testnet --key <name>

# Example:
stellar keys generate --global testnet --key deployer
```

This will output:

- **Public Key** (Stellar address): `G...`
- **Secret Key**: `S...` (save this securely!)

### Option B: Use Existing Account

If you already have a Stellar account, add it:

**Option 1: Using Secret Key (Interactive)**

```bash
# This will prompt you to enter your secret key securely
stellar keys add <name> --secret-key

# Example:
stellar keys add deployer --secret-key
# Then enter your secret key (starts with S...) when prompted
```

**Option 2: Using Seed Phrase (Interactive)**

```bash
# This will prompt you to enter your seed phrase securely
stellar keys add <name> --seed-phrase

# Example:
stellar keys add deployer --seed-phrase
# Then enter your 12-word seed phrase when prompted (space-separated)
```

**Option 3: Using Secure Store (Recommended for Seed Phrases)**

```bash
# Save key in OS secure store (Keychain/Secure Store/Secret Service)
stellar keys add <name> --seed-phrase --secure-store

# Example:
stellar keys add deployer --seed-phrase --secure-store
# Then enter your seed phrase when prompted
```

**Option 4: Add Public Key Only (Read-only)**

```bash
# If you only need to track a public key (cannot sign transactions)
stellar keys add <name> --public-key <PUBLIC_KEY>

# Example:
stellar keys add deployer --public-key GBGNU4UDGPA4SESSQUVHYVGWK5HAPNHF7PTDQWLQM3QNU5ZITNM2TMAN
```

**Important Notes:**

- `--secret-key` and `--seed-phrase` flags are **interactive** - they will prompt you to enter the value
- Do NOT pass the secret/seed as a command argument (it will be exposed in shell history)
- For seed phrases, use `--secure-store` to save in OS credential manager (recommended)
- Public keys (starting with G) can only be added with `--public-key` and **cannot sign transactions**

### Get Testnet Lumens

You need XLM (lumens) to deploy contracts. For testnet, get free testnet lumens from:

```bash
# Friendbot (testnet faucet) - replace with your public key (starts with G)
curl "https://friendbot-testnet.stellar.org/?addr=<YOUR_PUBLIC_KEY>"
```

**Or use Stellar CLI:**

```bash
# Fund your account with testnet lumens
stellar keys fund <your-account-name> --network testnet
```

**Or visit:** https://laboratory.stellar.org/#account-creator?network=testnet

**Note:**

- **Public Key** (address) starts with `G` - use this for receiving funds
- **Secret Key** starts with `S` - keep this secure, use this for signing transactions

## 📤 Step 3: Deploy the Contract

### Deploy to testnet (Testnet)

```bash
# Make sure you're in the contract directory
cd contracts/warranty-tracker

# Deploy to Testnet
stellar contract deploy \
  --wasm target/wasm32v1-none/release/warranty_tracker.wasm \
  --source <your-account-name> \
  --network testnet
```

**Example:**

```bash
stellar contract deploy \
  --wasm target/wasm32v1-none/release/warranty_tracker.wasm \
  --source deployer \
  --network testnet
```

### Deployment Output

After successful deployment, you'll see output like:

```
✅ Deployed!
CB5X3BAAPFIQAGWPCAU3XC2IQWAX3Q7VSE4IJ2NRWGUBXAMEGN4PKBGF
```

**⚠️ IMPORTANT:** Copy and save the **Contract ID** - you'll need this for your frontend!

## ✅ Step 4: Verify Deployment

You can verify your contract deployment:

```bash
# Check contract code
stellar contract invoke \
  --id <CONTRACT_ID> \
  --source <your-account-name> \
  --network testnet \
  -- get_warranty_count
```

Or use the Soroban RPC:

```bash
curl -X POST https://rpc-testnet.stellar.org \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "getLedgerEntry",
    "params": {
      "key": {
        "contractData": {
          "contract": "<CONTRACT_ID>",
          "key": "<DATA_KEY>",
          "durability": "persistent"
        }
      }
    }
  }'
```

## 🌐 Step 5: Configure Your Frontend

1. Copy the **Contract ID** from the deployment output
2. Open your frontend application
3. Navigate to **Settings** page
4. Paste the Contract ID in the input field
5. Save the configuration

The frontend will now be connected to your deployed contract!

## 🔐 Step 6 (Optional): Deploy to Mainnet

**⚠️ WARNING:** Only deploy to mainnet after thorough testing on testnet!

1. **Get a Mainnet Account**: You need real XLM on mainnet
2. **Fund Your Account**: Send XLM to your mainnet account
3. **Deploy to Mainnet**:

```bash
stellar contract deploy \
  --wasm target/wasm32v1-none/release/warranty_tracker.wasm \
  --source <your-mainnet-account-name> \
  --network mainnet
```

## 🛠️ Troubleshooting

### Error: "insufficient balance"

- Make sure your account has enough XLM
- On testnet, request more testnet lumens from the faucet

### Error: "account not found"

- Ensure your account is funded
- Verify you're using the correct network (testnet/mainnet)

### Error: "wasm file not found"

- Make sure you built the contract first (`make build`)
- Check that the WASM file exists at the expected path

### Contract ID not showing

- Verify the deployment completed successfully
- Check network explorer: https://testnet.stellar.expert/
- Search for your contract address

## 📚 Additional Resources

- [Stellar CLI Documentation](https://developers.stellar.org/docs/tools/stellar-cli)
- [Soroban Deployment Guide](https://soroban.stellar.org/docs/how-to-guides/deploy-to-network)
- [testnet Explorer](https://testnet.stellar.expert/)
- [Soroban RPC](https://soroban.stellar.org/docs/reference/rpc)

## 💡 Quick Reference

```bash
# 1. Generate new account (or add existing one)
stellar keys generate --global testnet --key deployer
# OR add existing account (interactive):
stellar keys add deployer --secret-key
# OR add using seed phrase:
stellar keys add deployer --seed-phrase --secure-store

# 2. Build the contract
cd contracts/warranty-tracker && make build

# 3. Get testnet funds
stellar keys fund deployer --network testnet
# OR manually:
curl "https://friendbot-testnet.stellar.org/?addr=<YOUR_PUBLIC_KEY>"

# 4. Deploy
stellar contract deploy \
  --wasm target/wasm32v1-none/release/warranty_tracker.wasm \
  --source deployer \
  --network testnet

# 5. Save the Contract ID for your frontend!
```

**Remember:**

- Use interactive prompts for secrets (don't pass them as arguments!)
- Always save your Contract ID after deployment!

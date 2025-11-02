# Warranty Tracker Frontend

A modern React + TypeScript frontend for the Warranty Tracker Soroban smart contract.

## ✨ Features

- 🎨 Modern UI built with React, TypeScript, and Tailwind CSS
- 📝 Register warranties with product details
- 🔍 View warranties by ID or owner
- 🔄 Transfer warranty ownership
- 📊 Manage warranty status (Active, Expired, Revoked)
- ⚙️ Easy contract configuration

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ and npm/yarn
- A deployed Warranty Tracker contract (get the contract ID)

### Installation

1. Install dependencies:

```bash
npm install
# or
yarn install
```

2. Start the development server:

```bash
npm run dev
# or
yarn dev
```

3. Open [http://localhost:3000](http://localhost:3000) in your browser

### Build for Production

```bash
npm run build
# or
yarn build
```

The built files will be in the `dist` directory.

## 📋 Configuration

1. Deploy your Warranty Tracker contract to the Soroban network
2. Copy the contract ID
3. Open the Settings page in the application
4. Enter your contract ID

## 🛠️ Development

The frontend uses:
- **React 18** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool
- **Tailwind CSS** - Styling
- **Lucide React** - Icons
- **Soroban Client** - Blockchain interaction

### Project Structure

```
frontend/
├── src/
│   ├── components/        # React components
│   │   ├── RegisterWarranty.tsx
│   │   ├── ViewWarranties.tsx
│   │   ├── TransferOwnership.tsx
│   │   └── ManageStatus.tsx
│   ├── utils/             # Utility functions
│   │   └── soroban.ts     # Soroban contract client
│   ├── types.ts           # TypeScript types
│   ├── App.tsx            # Main app component
│   └── main.tsx           # Entry point
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts
└── tailwind.config.js
```

## ⚠️ Note

This frontend currently includes placeholder implementations for contract interactions. To fully integrate:

1. Install and configure a wallet adapter (e.g., Freighter)
2. Implement proper transaction signing
3. Integrate Soroban RPC for read operations
4. Add error handling and loading states
5. Configure the network (testnet/mainnet)

## 📚 Resources

- [Soroban Documentation](https://soroban.stellar.org/docs)
- [React Documentation](https://react.dev)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)


import { useState } from "react";
import { Package, Search, ArrowRight, Shield, Settings } from "lucide-react";
import RegisterWarranty from "./components/RegisterWarranty";
import ViewWarranties from "./components/ViewWarranties";
import TransferOwnership from "./components/TransferOwnership";
import ManageStatus from "./components/ManageStatus";

type View = "register" | "view" | "transfer" | "status" | "settings";

function App() {
  const [currentView, setCurrentView] = useState<View>("register");
  const [contractId, setContractId] = useState("");

  const navigation = [
    { id: "register" as View, label: "Register Warranty", icon: Package },
    { id: "view" as View, label: "View Warranties", icon: Search },
    { id: "transfer" as View, label: "Transfer Ownership", icon: ArrowRight },
    { id: "status" as View, label: "Manage Status", icon: Shield },
    { id: "settings" as View, label: "Settings", icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-primary-600 p-2 rounded-lg">
                <Package className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  Warranty Tracker
                </h1>
                <p className="text-sm text-gray-500">
                  Soroban Smart Contract Interface
                </p>
              </div>
            </div>
            {contractId && (
              <div className="text-sm text-gray-600">
                <span className="font-medium">Contract:</span>{" "}
                <span className="font-mono">{contractId.slice(0, 8)}...</span>
              </div>
            )}
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar Navigation */}
          <aside className="lg:col-span-1">
            <nav className="bg-white rounded-lg shadow-md p-4 space-y-2">
              {navigation.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    onClick={() => setCurrentView(item.id)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-colors ${
                      currentView === item.id
                        ? "bg-primary-600 text-white"
                        : "text-gray-700 hover:bg-gray-100"
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </nav>
          </aside>

          {/* Main Content */}
          <main className="lg:col-span-3">
            {currentView === "settings" ? (
              <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">
                  Settings
                </h2>
                <div className="space-y-4">
                  <div>
                    <label
                      htmlFor="contractId"
                      className="block text-sm font-medium text-gray-700 mb-1"
                    >
                      Contract ID
                    </label>
                    <input
                      type="text"
                      id="contractId"
                      value={contractId}
                      onChange={(e) => setContractId(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent font-mono"
                      placeholder="Enter your deployed contract ID"
                    />
                    <p className="mt-1 text-sm text-gray-500">
                      Enter the contract ID after deploying the warranty tracker
                      contract
                    </p>
                  </div>
                </div>
              </div>
            ) : !contractId ? (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
                <div className="flex items-center gap-3 mb-4">
                  <Settings className="w-6 h-6 text-yellow-600" />
                  <h3 className="text-xl font-bold text-yellow-900">
                    Contract ID Required
                  </h3>
                </div>
                <p className="text-yellow-800 mb-4">
                  Please configure your contract ID in the Settings section
                  before using the application.
                </p>
                <button
                  onClick={() => setCurrentView("settings")}
                  className="bg-yellow-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-yellow-700"
                >
                  Go to Settings
                </button>
              </div>
            ) : (
              <>
                {currentView === "register" && (
                  <RegisterWarranty contractId={contractId} />
                )}
                {currentView === "view" && (
                  <ViewWarranties contractId={contractId} />
                )}
                {currentView === "transfer" && (
                  <TransferOwnership contractId={contractId} />
                )}
                {currentView === "status" && (
                  <ManageStatus
                    contractId={contractId}
                    onSuccess={() => {
                      console.log("Status updated");
                    }}
                  />
                )}
              </>
            )}
          </main>
        </div>
      </div>

      {/* Footer */}
      <footer className="mt-12 border-t border-gray-200 bg-white py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-center text-sm text-gray-500">
            Warranty Tracker - Built on Soroban & Stellar
          </p>
        </div>
      </footer>
    </div>
  );
}

export default App;

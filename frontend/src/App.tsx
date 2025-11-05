import { useState, Suspense, lazy } from "react";
import {
  Package,
  Search,
  ArrowRight,
  Shield,
  Settings,
  Sparkles,
} from "lucide-react";

// Lazy load components for code splitting
const RegisterWarranty = lazy(() => import("./components/RegisterWarranty"));
const ViewWarranties = lazy(() => import("./components/ViewWarranties"));
const TransferOwnership = lazy(() => import("./components/TransferOwnership"));
const ManageStatus = lazy(() => import("./components/ManageStatus"));

type View = "register" | "view" | "transfer" | "status" | "settings";

function App() {
  const [currentView, setCurrentView] = useState<View>("register");
  const [contractId, setContractId] = useState(
    "CDHLYNTLHUONKTPEMEJLN6RU43SR7XJLVSJLCUMIRRNR7D4NSG644DEU"
  );

  const navigation = [
    { id: "register" as View, label: "Register Warranty", icon: Package },
    { id: "view" as View, label: "View Warranties", icon: Search },
    { id: "transfer" as View, label: "Transfer Ownership", icon: ArrowRight },
    { id: "status" as View, label: "Manage Status", icon: Shield },
    { id: "settings" as View, label: "Settings", icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-300 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-float"></div>
        <div
          className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-300 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-float"
          style={{ animationDelay: "1s" }}
        ></div>
        <div
          className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-indigo-300 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-float"
          style={{ animationDelay: "2s" }}
        ></div>
      </div>

      {/* Header */}
      <header className="relative bg-white/80 backdrop-blur-md shadow-lg border-b border-gray-200/50 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4 animate-fade-in">
              <div className="relative">
                <div className="bg-gradient-to-br from-blue-600 to-purple-600 p-3 rounded-xl shadow-lg transform transition-transform hover:scale-110 hover:rotate-3">
                  <Package className="w-6 h-6 text-white" />
                </div>
                <div className="absolute -top-1 -right-1">
                  <Sparkles className="w-4 h-4 text-yellow-400 animate-pulse" />
                </div>
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  Warranty Tracker
                </h1>
                <p className="text-sm text-gray-600 flex items-center gap-1">
                  <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                  Soroban Smart Contract Interface
                </p>
              </div>
            </div>
            {contractId && (
              <div className="text-sm text-gray-700 bg-gradient-to-r from-blue-100 to-purple-100 px-4 py-2 rounded-lg border border-blue-200 animate-scale-in">
                <span className="font-medium">Contract:</span>{" "}
                <span className="font-mono text-blue-700">
                  {contractId.slice(0, 8)}...
                </span>
              </div>
            )}
          </div>
        </div>
      </header>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar Navigation */}
          <aside className="lg:col-span-1 animate-slide-in">
            <nav className="bg-white/80 backdrop-blur-md rounded-xl shadow-lg p-4 space-y-2 border border-gray-200/50">
              {navigation.map((item, index) => {
                const Icon = item.icon;
                const isActive = currentView === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setCurrentView(item.id)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-all duration-300 transform hover:scale-105 ${
                      isActive
                        ? "bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg scale-105"
                        : "text-gray-700 hover:bg-gradient-to-r hover:from-blue-50 hover:to-purple-50 hover:shadow-md"
                    }`}
                    style={{ animationDelay: `${index * 0.1}s` }}
                  >
                    <Icon
                      className={`w-5 h-5 transition-transform ${
                        isActive ? "scale-110" : ""
                      }`}
                    />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </nav>
          </aside>

          {/* Main Content */}
          <main className="lg:col-span-3">
            {currentView === "settings" ? (
              <div className="bg-white/80 backdrop-blur-md rounded-xl shadow-lg p-8 border border-gray-200/50 animate-scale-in">
                <div className="flex items-center gap-3 mb-6">
                  <div className="bg-gradient-to-br from-blue-600 to-purple-600 p-2 rounded-lg">
                    <Settings className="w-6 h-6 text-white" />
                  </div>
                  <h2 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                    Settings
                  </h2>
                </div>
                <div className="space-y-6">
                  <div className="space-y-2">
                    <label
                      htmlFor="contractId"
                      className="block text-sm font-semibold text-gray-700"
                    >
                      Contract ID
                    </label>
                    <input
                      type="text"
                      id="contractId"
                      value={contractId}
                      onChange={(e) => setContractId(e.target.value)}
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono transition-all duration-200 hover:border-blue-400"
                      placeholder="Enter your deployed contract ID"
                    />
                    <p className="text-sm text-gray-500 flex items-center gap-2">
                      <span className="w-1.5 h-1.5 bg-blue-500 rounded-full"></span>
                      Enter the contract ID after deploying the warranty tracker
                      contract
                    </p>
                  </div>
                </div>
              </div>
            ) : !contractId ? (
              <div className="bg-gradient-to-br from-yellow-50 to-orange-50 border-2 border-yellow-200 rounded-xl p-8 shadow-lg animate-scale-in">
                <div className="flex items-center gap-4 mb-6">
                  <div className="bg-gradient-to-br from-yellow-400 to-orange-400 p-3 rounded-xl shadow-lg animate-pulse">
                    <Settings className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-2xl font-bold text-yellow-900">
                    Contract ID Required
                  </h3>
                </div>
                <p className="text-yellow-800 mb-6 text-lg">
                  Please configure your contract ID in the Settings section
                  before using the application.
                </p>
                <button
                  onClick={() => setCurrentView("settings")}
                  className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white px-8 py-3 rounded-lg font-semibold hover:from-yellow-600 hover:to-orange-600 transform hover:scale-105 transition-all duration-200 shadow-lg hover:shadow-xl"
                >
                  Go to Settings
                </button>
              </div>
            ) : (
              <Suspense
                fallback={
                  <div className="bg-white/80 backdrop-blur-md rounded-xl shadow-lg p-8 border border-gray-200/50">
                    <div className="animate-pulse space-y-6">
                      <div className="flex items-center gap-4">
                        <div className="h-10 w-10 bg-gradient-to-br from-blue-400 to-purple-400 rounded-lg"></div>
                        <div className="h-8 bg-gray-200 rounded w-1/4"></div>
                      </div>
                      <div className="space-y-4">
                        <div className="h-4 bg-gray-200 rounded shimmer"></div>
                        <div className="h-4 bg-gray-200 rounded w-5/6 shimmer"></div>
                        <div className="h-4 bg-gray-200 rounded w-4/6 shimmer"></div>
                      </div>
                      <div className="h-12 bg-gradient-to-r from-blue-200 to-purple-200 rounded-lg"></div>
                    </div>
                  </div>
                }
              >
                <div key={currentView} className="animate-fade-in">
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
                    <ManageStatus contractId={contractId} />
                  )}
                </div>
              </Suspense>
            )}
          </main>
        </div>
      </div>

      {/* Footer */}
      <footer className="relative mt-12 border-t border-gray-200/50 bg-white/80 backdrop-blur-md py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center gap-2">
            <p className="text-center text-sm text-gray-600 font-medium">
              Warranty Tracker - Built on Soroban & Stellar
            </p>
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span>
              Powered by Blockchain Technology
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;

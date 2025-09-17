import React from 'react';
import { Wallet, X, Shield } from 'lucide-react';

const Header = ({ isConnected, walletAddress, isConnecting, onConnect, onDisconnect }) => {
  const formatAddress = (address) => {
    if (!address) return '';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  return (
    <header className="bg-shadow-800 border-b border-shadow-700">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center space-x-3">
            <div className="text-2xl">🕶️</div>
            <div>
              <h1 className="text-xl font-bold text-shadow-50">ShadowChat</h1>
              <div className="flex items-center space-x-2">
                <p className="text-xs text-shadow-400">Privacy-preserving messaging</p>
                <div className="flex items-center space-x-1">
                  <Shield size={12} className="text-green-400" />
                  <span className="text-xs text-green-400">Protected</span>
                </div>
              </div>
            </div>
          </div>

          {/* Wallet Connection */}
          <div className="flex items-center space-x-4">
            {isConnected ? (
              <div className="flex items-center space-x-3">
                <div className="text-right">
                  <div className="text-sm font-medium text-shadow-50">
                    {formatAddress(walletAddress)}
                  </div>
                  <div className="text-xs text-green-400">Connected</div>
                </div>
                <button
                  onClick={onDisconnect}
                  className="p-2 text-shadow-400 hover:text-shadow-50 transition-colors"
                  title="Disconnect wallet"
                >
                  <X size={20} />
                </button>
              </div>
            ) : (
              <button
                onClick={onConnect}
                disabled={isConnecting}
                className="shadow-button-primary flex items-center space-x-2"
              >
                <Wallet size={16} />
                <span>{isConnecting ? 'Connecting...' : 'Connect Wallet'}</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
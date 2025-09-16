import React, { useState } from 'react';
import { Toaster } from 'react-hot-toast';
import { useWeb3 } from './hooks/useWeb3.js';
import Header from './components/Header.jsx';
import IdentityGenerator from './components/IdentityGenerator.jsx';
import CreditManager from './components/CreditManager.jsx';
import MessageCenter from './components/MessageCenter.jsx';
import Analytics from './components/Analytics.jsx';

function App() {
  const { web3Service, isConnected, walletAddress, isConnecting, connect, disconnect } = useWeb3();
  const [activeTab, setActiveTab] = useState('identity');
  const [userIdentity, setUserIdentity] = useState(null);

  const tabs = [
    { id: 'identity', label: '🔑 Identity', component: IdentityGenerator },
    { id: 'credits', label: '💰 Credits', component: CreditManager },
    { id: 'messages', label: '💬 Messages', component: MessageCenter },
    { id: 'analytics', label: '📊 Analytics', component: Analytics }
  ];

  const ActiveComponent = tabs.find(tab => tab.id === activeTab)?.component;

  return (
    <div className="min-h-screen bg-shadow-900">
      <Toaster 
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#27272a',
            color: '#fafafa',
            border: '1px solid #52525b'
          }
        }}
      />
      
      <Header 
        isConnected={isConnected}
        walletAddress={walletAddress}
        isConnecting={isConnecting}
        onConnect={connect}
        onDisconnect={disconnect}
      />

      <main className="container mx-auto px-4 py-8">
        {!isConnected ? (
          <div className="text-center py-20">
            <div className="shadow-card max-w-md mx-auto">
              <h2 className="text-2xl font-bold mb-4">🕶️ Welcome to ShadowChat</h2>
              <p className="text-shadow-300 mb-6">
                A privacy-preserving, decentralized messaging platform built on Ethereum.
                Connect your wallet to start sending anonymous, encrypted messages.
              </p>
              <button 
                onClick={connect}
                disabled={isConnecting}
                className="shadow-button-primary w-full"
              >
                {isConnecting ? 'Connecting...' : 'Connect Wallet'}
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Tab Navigation */}
            <div className="flex space-x-1 mb-8 bg-shadow-800 p-1 rounded-lg">
              {tabs.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                    activeTab === tab.id
                      ? 'bg-blue-600 text-white'
                      : 'text-shadow-300 hover:text-shadow-50 hover:bg-shadow-700'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Active Tab Content */}
            {ActiveComponent && (
              <ActiveComponent 
                web3Service={web3Service}
                userIdentity={userIdentity}
                setUserIdentity={setUserIdentity}
              />
            )}
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-shadow-700 bg-shadow-800 mt-20">
        <div className="container mx-auto px-4 py-6">
          <div className="text-center text-shadow-400">
            <p className="text-sm">
              🕶️ ShadowChat Protocol - Privacy-preserving messaging on Ethereum
            </p>
            <p className="text-xs mt-2">
              ⚠️ This is experimental software. Use at your own risk.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
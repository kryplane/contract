import React, { useState, useEffect } from 'react';
import { Toaster } from 'react-hot-toast';
import { useWeb3 } from './hooks/useWeb3.js';
import Header from './components/Header.jsx';
import IdentityGenerator from './components/IdentityGenerator.jsx';
import CreditManager from './components/CreditManager.jsx';
import MessageCenter from './components/MessageCenter.jsx';
import ChatMessageCenter from './components/ChatMessageCenter.jsx';
import Analytics from './components/Analytics.jsx';
import PrivacyOnboarding from './components/PrivacyOnboarding.jsx';
import PrivacyStatusIndicator from './components/PrivacyStatusIndicator.jsx';

function App() {
  const { web3Service, isConnected, walletAddress, isConnecting, connect, connectDemo, disconnect } = useWeb3();
  const [activeTab, setActiveTab] = useState('identity');
  const [userIdentity, setUserIdentity] = useState(null);
  const [showOnboarding, setShowOnboarding] = useState(false);

  // Check if user has seen onboarding before
  useEffect(() => {
    const hasSeenOnboarding = localStorage.getItem('shadowchat-onboarding-seen');
    if (!hasSeenOnboarding && isConnected) {
      setShowOnboarding(true);
    }
  }, [isConnected]);

  const handleOnboardingClose = () => {
    setShowOnboarding(false);
    localStorage.setItem('shadowchat-onboarding-seen', 'true');
  };

  const tabs = [
    { id: 'identity', label: '🔑 Identity', component: IdentityGenerator },
    { id: 'credits', label: '💰 Credits', component: CreditManager },
    { id: 'messages', label: '💬 Messages', component: ChatMessageCenter },
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
      
      {/* Render chat interface full-screen when messages tab is active and connected */}
      {isConnected && activeTab === 'messages' ? (
        <div className="h-screen flex flex-col">
          {/* Minimal header for chat */}
          <div className="bg-shadow-800 border-b border-shadow-700 px-4 py-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                {/* Tab Navigation - Compact */}
                <div className="flex space-x-1 bg-shadow-700 p-1 rounded-lg">
                  {tabs.map(tab => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`py-1 px-3 rounded text-xs font-medium transition-colors ${
                        activeTab === tab.id
                          ? 'bg-blue-600 text-white'
                          : 'text-shadow-300 hover:text-shadow-50 hover:bg-shadow-600'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>
              
              {/* Wallet info */}
              <div className="flex items-center space-x-2">
                <div className="text-xs text-shadow-400">
                  {walletAddress && `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`}
                </div>
                <button 
                  onClick={disconnect}
                  className="text-xs px-2 py-1 bg-red-600 hover:bg-red-700 text-white rounded transition-colors"
                >
                  Disconnect
                </button>
              </div>
            </div>
          </div>
          
          {/* Chat Component */}
          <div className="flex-1">
            <ChatMessageCenter 
              web3Service={web3Service}
              userIdentity={userIdentity}
              setUserIdentity={setUserIdentity}
            />
          </div>
        </div>
      ) : (
        <>
          {/* Regular header for other tabs */}
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
                    className="shadow-button-primary w-full mb-3"
                  >
                    {isConnecting ? 'Connecting...' : 'Connect Wallet'}
                  </button>
                  <button 
                    onClick={() => {
                      connectDemo();
                      setUserIdentity({
                        secretCode: 'demo_secret_code_12345',
                        receiverHash: '0x1234567890abcdef1234567890abcdef12345678'
                      });
                      setActiveTab('messages');
                    }}
                    className="shadow-button w-full text-sm"
                  >
                    🎭 View Chat UI (Demo)
                  </button>
                </div>
              </div>
            ) : (
              <>
                {/* Privacy Status Indicator */}
                <div className="mb-6">
                  <PrivacyStatusIndicator
                    userIdentity={userIdentity}
                    isConnected={isConnected}
                    showDetails={false}
                  />
                </div>

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

                {/* Active Tab Content - Only for non-messages tabs */}
                {ActiveComponent && activeTab !== 'messages' && (
                  <ActiveComponent 
                    web3Service={web3Service}
                    userIdentity={userIdentity}
                    setUserIdentity={setUserIdentity}
                  />
                )}
              </>
            )}
          </main>
        </>
      )}

      {/* Privacy Onboarding Modal */}
      <PrivacyOnboarding
        isVisible={showOnboarding}
        onClose={handleOnboardingClose}
      />

      {/* Footer - only show when not in chat mode */}
      {!(isConnected && activeTab === 'messages') && (
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
      )}
    </div>
  );
}

export default App;
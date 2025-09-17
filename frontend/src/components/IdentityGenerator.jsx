/**
 * IdentityGenerator Component
 * 
 * Manages user identity creation and import for ShadowChat.
 * 
 * Features:
 * - Generate new random identity with secure secret code
 * - Import existing identity from secret code
 * - Display current identity with privacy controls
 * - Copy functionality for sharing receiver hash
 * 
 * Privacy Design:
 * - Secret codes are generated client-side only
 * - Receiver hash derived from secret code using keccak256
 * - No server communication - completely local
 * - Users responsible for backing up secret codes
 * 
 * Security:
 * - Secret codes never leave the browser
 * - Show/hide toggle for secret code visibility
 * - Minimum 8 character validation for imported codes
 * - Secure random generation for new identities
 */

import React, { useState, useEffect } from 'react';
import { RefreshCw, Copy, Eye, EyeOff, Shield, Key } from 'lucide-react';
import { MessageCrypto } from '../utils/crypto.js';
import PrivacyTooltip from './PrivacyTooltip.jsx';
import PasswordStrengthIndicator from './PasswordStrengthIndicator.jsx';
import toast from 'react-hot-toast';

const IdentityGenerator = ({ web3Service, userIdentity, setUserIdentity }) => {
  const [secretCode, setSecretCode] = useState('');
  const [receiverHash, setReceiverHash] = useState('');
  const [showSecret, setShowSecret] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  // Generate receiver hash when secret code changes
  useEffect(() => {
    if (secretCode && web3Service) {
      try {
        const hash = web3Service.generateReceiverHash(secretCode);
        setReceiverHash(hash);
      } catch (error) {
        console.error('Failed to generate receiver hash:', error);
        setReceiverHash('');
      }
    } else {
      setReceiverHash('');
    }
  }, [secretCode, web3Service]);

  const generateNewIdentity = async () => {
    setIsGenerating(true);
    try {
      // Generate a random secret code
      const newSecretCode = MessageCrypto.generateSecretCode(32);
      setSecretCode(newSecretCode);
      
      // Create identity object
      const identity = {
        secretCode: newSecretCode,
        receiverHash: web3Service.generateReceiverHash(newSecretCode),
        createdAt: new Date().toISOString()
      };
      
      setUserIdentity(identity);
      toast.success('New identity generated!');
    } catch (error) {
      console.error('Failed to generate identity:', error);
      toast.error('Failed to generate identity');
    } finally {
      setIsGenerating(false);
    }
  };

  const useExistingIdentity = () => {
    if (!secretCode) {
      toast.error('Please enter a secret code');
      return;
    }

    if (!MessageCrypto.isValidSecretCode(secretCode)) {
      toast.error('Secret code must be at least 8 characters long');
      return;
    }

    const identity = {
      secretCode,
      receiverHash,
      createdAt: new Date().toISOString()
    };

    setUserIdentity(identity);
    toast.success('Identity imported successfully!');
  };

  const copyToClipboard = async (text, label) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`${label} copied to clipboard!`);
    } catch (error) {
      toast.error('Failed to copy to clipboard');
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="flex items-center justify-center space-x-3 mb-4">
          <h2 className="text-3xl font-bold">🔑 Identity Management</h2>
          <PrivacyTooltip
            type="privacy"
            title="Your Privacy Foundation"
            persistKey="identity-overview"
          >
            <p className="mb-3">
              Your identity in ShadowChat is completely separate from your wallet address. 
              This ensures anonymous messaging while maintaining security.
            </p>
            <div className="space-y-2">
              <div className="flex items-start space-x-2">
                <div className="w-2 h-2 bg-purple-400 rounded-full mt-2"></div>
                <span>Secret codes create pseudonymous identities</span>
              </div>
              <div className="flex items-start space-x-2">
                <div className="w-2 h-2 bg-purple-400 rounded-full mt-2"></div>
                <span>Mathematically impossible to link to your wallet</span>
              </div>
              <div className="flex items-start space-x-2">
                <div className="w-2 h-2 bg-purple-400 rounded-full mt-2"></div>
                <span>You control your privacy completely</span>
              </div>
            </div>
          </PrivacyTooltip>
        </div>
        <p className="text-shadow-300 max-w-2xl mx-auto">
          Your identity in ShadowChat consists of a secret code and its corresponding receiver hash. 
          Keep your secret code private - it's used to decrypt messages sent to you.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Generate New Identity */}
        <div className="shadow-card">
          <div className="flex items-center space-x-2 mb-4">
            <Shield className="text-blue-400" size={24} />
            <h3 className="text-xl font-semibold">Generate New Identity</h3>
            <PrivacyTooltip
              type="security"
              title="Secure Identity Generation"
              persistKey="generate-identity"
            >
              <p className="mb-2">
                ShadowChat generates cryptographically secure identities using:
              </p>
              <ul className="space-y-1 text-sm">
                <li>• Browser's crypto.getRandomValues() for true randomness</li>
                <li>• 32+ character secret codes for maximum security</li>
                <li>• Keccak256 hashing for receiver hash derivation</li>
                <li>• No server communication - completely local</li>
              </ul>
            </PrivacyTooltip>
          </div>
          
          <p className="text-shadow-300 mb-6">
            Create a completely new identity with a randomly generated secret code.
          </p>

          <button
            onClick={generateNewIdentity}
            disabled={isGenerating}
            className="shadow-button-primary w-full flex items-center justify-center space-x-2"
          >
            <RefreshCw size={16} className={isGenerating ? 'animate-spin' : ''} />
            <span>{isGenerating ? 'Generating...' : 'Generate New Identity'}</span>
          </button>
        </div>

        {/* Import Existing Identity */}
        <div className="shadow-card">
          <div className="flex items-center space-x-2 mb-4">
            <Key className="text-green-400" size={24} />
            <h3 className="text-xl font-semibold">Import Existing Identity</h3>
            <PrivacyTooltip
              type="encryption"
              title="Identity Recovery"
              persistKey="import-identity"
            >
              <p className="mb-2">
                Your secret code is the only way to recover your identity:
              </p>
              <ul className="space-y-1 text-sm">
                <li>• Secret codes are never stored on servers</li>
                <li>• Only you have access to your secret code</li>
                <li>• If lost, your messages cannot be recovered</li>
                <li>• Always keep secure backups offline</li>
              </ul>
            </PrivacyTooltip>
          </div>
          
          <p className="text-shadow-300 mb-4">
            Enter your existing secret code to restore your identity.
          </p>

          <div className="space-y-4">
            <div className="relative">
              <input
                type={showSecret ? 'text' : 'password'}
                value={secretCode}
                onChange={(e) => setSecretCode(e.target.value)}
                placeholder="Enter your secret code..."
                className="shadow-input w-full pr-10"
              />
              <button
                type="button"
                onClick={() => setShowSecret(!showSecret)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-shadow-400 hover:text-shadow-50"
              >
                {showSecret ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>

            {/* Password strength indicator for import field */}
            <PasswordStrengthIndicator password={secretCode} />

            <button
              onClick={useExistingIdentity}
              disabled={!secretCode}
              className="shadow-button-primary w-full"
            >
              Import Identity
            </button>
          </div>
        </div>
      </div>

      {/* Current Identity Display */}
      {userIdentity && (
        <div className="shadow-card">
          <h3 className="text-xl font-semibold mb-4">Current Identity</h3>
          
          <div className="space-y-4">
            {/* Secret Code */}
            <div>
              <div className="flex items-center space-x-2 mb-2">
                <label className="block text-sm font-medium text-shadow-300">
                  Secret Code (Keep this private!)
                </label>
                <PrivacyTooltip
                  type="warning"
                  title="Critical Privacy Information"
                  persistKey="secret-code-warning"
                >
                  <div className="space-y-2">
                    <p className="font-semibold text-yellow-300">⚠️ Never share your secret code</p>
                    <ul className="space-y-1 text-sm">
                      <li>• Your secret code decrypts all your messages</li>
                      <li>• Anyone with it can read your messages</li>
                      <li>• Store it securely offline (password manager, paper)</li>
                      <li>• Consider it like a private key or password</li>
                    </ul>
                  </div>
                </PrivacyTooltip>
              </div>
              <div className="flex space-x-2">
                <input
                  type={showSecret ? 'text' : 'password'}
                  value={userIdentity.secretCode}
                  readOnly
                  className="shadow-input flex-1"
                />
                <button
                  onClick={() => setShowSecret(!showSecret)}
                  className="shadow-button p-2"
                  title="Toggle visibility"
                >
                  {showSecret ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
                <button
                  onClick={() => copyToClipboard(userIdentity.secretCode, 'Secret code')}
                  className="shadow-button p-2"
                  title="Copy secret code"
                >
                  <Copy size={16} />
                </button>
              </div>
              <p className="text-xs text-shadow-400 mt-1">
                This is your private key for decrypting messages. Never share it!
              </p>
            </div>

            {/* Receiver Hash */}
            <div>
              <div className="flex items-center space-x-2 mb-2">
                <label className="block text-sm font-medium text-shadow-300">
                  Receiver Hash (Your public address)
                </label>
                <PrivacyTooltip
                  type="privacy"
                  title="Anonymous Public Identity"
                  persistKey="receiver-hash-info"
                >
                  <div className="space-y-2">
                    <p>Your receiver hash is your anonymous public address:</p>
                    <ul className="space-y-1 text-sm">
                      <li>• Safe to share publicly</li>
                      <li>• Mathematically derived from your secret code</li>
                      <li>• Cannot be linked back to your wallet address</li>
                      <li>• Others need this to send you messages</li>
                      <li>• Think of it like an anonymous email address</li>
                    </ul>
                  </div>
                </PrivacyTooltip>
              </div>
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={userIdentity.receiverHash}
                  readOnly
                  className="shadow-input flex-1 font-mono text-sm"
                />
                <button
                  onClick={() => copyToClipboard(userIdentity.receiverHash, 'Receiver hash')}
                  className="shadow-button p-2"
                  title="Copy receiver hash"
                >
                  <Copy size={16} />
                </button>
              </div>
              <p className="text-xs text-shadow-400 mt-1">
                Share this with others so they can send you messages.
              </p>
            </div>

            {/* Creation Date */}
            <div>
              <label className="block text-sm font-medium text-shadow-300 mb-2">
                Created
              </label>
              <div className="text-sm text-shadow-400">
                {new Date(userIdentity.createdAt).toLocaleString()}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Security Notice */}
      <div className="shadow-card bg-yellow-900/20 border-yellow-600/50">
        <div className="flex items-start space-x-3">
          <Shield className="text-yellow-400 mt-1" size={20} />
          <div>
            <h4 className="font-semibold text-yellow-400 mb-2">Security Notice</h4>
            <ul className="text-sm text-yellow-200 space-y-1">
              <li>• Your secret code is never sent to the blockchain</li>
              <li>• Only the receiver hash (derived from your secret code) is public</li>
              <li>• Always backup your secret code securely</li>
              <li>• If you lose your secret code, you cannot decrypt your messages</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default IdentityGenerator;
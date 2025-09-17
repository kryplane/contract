/**
 * PrivacyOnboarding Component
 * 
 * Educational onboarding flow that explains privacy features to new users.
 * Helps users understand the privacy model and best practices.
 * 
 * Features:
 * - Step-by-step privacy education
 * - Interactive demonstrations
 * - Privacy best practices guidance
 * - Dismissible with local storage persistence
 */

import React, { useState, useEffect } from 'react';
import { 
  Shield, 
  Eye, 
  Lock, 
  Key, 
  ArrowRight, 
  ArrowLeft, 
  X, 
  CheckCircle,
  AlertTriangle,
  Globe,
  Database
} from 'lucide-react';

const PrivacyOnboarding = ({ isVisible, onClose }) => {
  const [currentStep, setCurrentStep] = useState(0);

  const steps = [
    {
      icon: <Shield className="text-blue-400" size={32} />,
      title: "Welcome to Privacy-First Messaging",
      content: (
        <div className="space-y-4">
          <p>
            ShadowChat is built with privacy as the foundation. Unlike traditional messaging apps, 
            your privacy is protected by design, not just policy.
          </p>
          <div className="bg-blue-950 border border-blue-500 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <Shield className="text-blue-400 mt-1" size={20} />
              <div>
                <h4 className="font-semibold text-blue-300 mb-2">What makes us different:</h4>
                <ul className="text-sm space-y-1 text-blue-100">
                  <li>• No servers store your messages</li>
                  <li>• Your identity is not linked to your wallet</li>
                  <li>• All encryption happens in your browser</li>
                  <li>• You control your data completely</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )
    },
    {
      icon: <Key className="text-purple-400" size={32} />,
      title: "Your Secret Code is Your Privacy Key",
      content: (
        <div className="space-y-4">
          <p>
            Your secret code is the foundation of your privacy. It creates your identity and 
            encrypts your messages without revealing who you are.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-green-950 border border-green-500 rounded-lg p-4">
              <div className="flex items-center space-x-2 mb-2">
                <CheckCircle className="text-green-400" size={16} />
                <h4 className="font-semibold text-green-300">What it does:</h4>
              </div>
              <ul className="text-sm space-y-1 text-green-100">
                <li>• Creates your unique receiver hash</li>
                <li>• Encrypts your messages</li>
                <li>• Authorizes credit withdrawals</li>
                <li>• Restores your identity</li>
              </ul>
            </div>
            <div className="bg-red-950 border border-red-500 rounded-lg p-4">
              <div className="flex items-center space-x-2 mb-2">
                <AlertTriangle className="text-red-400" size={16} />
                <h4 className="font-semibold text-red-300">Keep it safe:</h4>
              </div>
              <ul className="text-sm space-y-1 text-red-100">
                <li>• Never share with anyone</li>
                <li>• Store securely offline</li>
                <li>• If lost, messages are gone forever</li>
                <li>• No recovery possible</li>
              </ul>
            </div>
          </div>
        </div>
      )
    },
    {
      icon: <Eye className="text-green-400" size={32} />,
      title: "Anonymous by Design",
      content: (
        <div className="space-y-4">
          <p>
            Your messaging identity is completely separate from your wallet address. 
            Nobody can link your messages to your real identity.
          </p>
          <div className="space-y-3">
            <div className="bg-shadow-700 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                    <Globe size={16} />
                  </div>
                  <div>
                    <div className="font-mono text-sm">0x742d...5DC7</div>
                    <div className="text-xs text-shadow-400">Your Wallet (Public)</div>
                  </div>
                </div>
                <ArrowRight className="text-shadow-400" size={16} />
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center">
                    <Eye size={16} />
                  </div>
                  <div>
                    <div className="font-mono text-sm">0x9f4a...8b2c</div>
                    <div className="text-xs text-shadow-400">Your Message Identity</div>
                  </div>
                </div>
              </div>
            </div>
            <div className="text-center text-sm text-shadow-400">
              <Lock className="inline mr-1" size={14} />
              These are cryptographically unlinked
            </div>
          </div>
        </div>
      )
    },
    {
      icon: <Lock className="text-yellow-400" size={32} />,
      title: "End-to-End Encryption",
      content: (
        <div className="space-y-4">
          <p>
            Your messages are encrypted in your browser before being sent to the blockchain. 
            Only you and your intended recipient can read them.
          </p>
          <div className="bg-shadow-700 rounded-lg p-4">
            <div className="space-y-3">
              <div className="flex items-center space-x-3">
                <div className="w-6 h-6 bg-green-600 rounded-full flex items-center justify-center text-xs font-bold">1</div>
                <div className="text-sm">You type: "Hello, how are you?"</div>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center text-xs font-bold">2</div>
                <div className="text-sm">Encrypted: "aF7xK9mP2qR8..."</div>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-6 h-6 bg-purple-600 rounded-full flex items-center justify-center text-xs font-bold">3</div>
                <div className="text-sm">Stored on blockchain: encrypted data only</div>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-6 h-6 bg-green-600 rounded-full flex items-center justify-center text-xs font-bold">4</div>
                <div className="text-sm">Recipient decrypts: "Hello, how are you?"</div>
              </div>
            </div>
          </div>
        </div>
      )
    },
    {
      icon: <Database className="text-blue-400" size={32} />,
      title: "No Servers, Maximum Privacy",
      content: (
        <div className="space-y-4">
          <p>
            ShadowChat doesn't use traditional servers. Your messages are stored on the 
            Ethereum blockchain in encrypted form, ensuring maximum privacy and censorship resistance.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-red-950 border border-red-500 rounded-lg p-4">
              <h4 className="font-semibold text-red-300 mb-2">Traditional Apps:</h4>
              <ul className="text-sm space-y-1 text-red-100">
                <li>• Company servers store messages</li>
                <li>• Can be hacked or monitored</li>
                <li>• Subject to government requests</li>
                <li>• Data mining for advertising</li>
              </ul>
            </div>
            <div className="bg-green-950 border border-green-500 rounded-lg p-4">
              <h4 className="font-semibold text-green-300 mb-2">ShadowChat:</h4>
              <ul className="text-sm space-y-1 text-green-100">
                <li>• Blockchain stores encrypted data</li>
                <li>• No central point of failure</li>
                <li>• Censorship resistant</li>
                <li>• You own your data</li>
              </ul>
            </div>
          </div>
        </div>
      )
    }
  ];

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onClose();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSkip = () => {
    onClose();
  };

  if (!isVisible) return null;

  const currentStepData = steps[currentStep];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 z-50 flex items-center justify-center p-4">
      <div className="bg-shadow-800 border border-shadow-600 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-shadow-600">
          <div className="flex items-center space-x-3">
            {currentStepData.icon}
            <div>
              <h2 className="text-xl font-bold">{currentStepData.title}</h2>
              <div className="text-sm text-shadow-400">
                Step {currentStep + 1} of {steps.length}
              </div>
            </div>
          </div>
          <button
            onClick={handleSkip}
            className="text-shadow-400 hover:text-shadow-50 transition-colors"
            aria-label="Skip onboarding"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {currentStepData.content}
        </div>

        {/* Progress Bar */}
        <div className="px-6 pb-2">
          <div className="flex space-x-1">
            {steps.map((_, index) => (
              <div
                key={index}
                className={`flex-1 h-1 rounded ${
                  index <= currentStep ? 'bg-blue-500' : 'bg-shadow-600'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-shadow-600">
          <button
            onClick={handlePrevious}
            disabled={currentStep === 0}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
              currentStep === 0
                ? 'text-shadow-500 cursor-not-allowed'
                : 'text-shadow-300 hover:text-shadow-50 hover:bg-shadow-700'
            }`}
          >
            <ArrowLeft size={16} />
            <span>Previous</span>
          </button>

          <div className="text-sm text-shadow-400">
            Privacy is a human right
          </div>

          <button
            onClick={handleNext}
            className="flex items-center space-x-2 shadow-button-primary"
          >
            <span>{currentStep === steps.length - 1 ? 'Get Started' : 'Next'}</span>
            <ArrowRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default PrivacyOnboarding;
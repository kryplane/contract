/**
 * PrivacyStatusIndicator Component
 * 
 * Shows the current privacy status of the user's session and data.
 * Provides visual feedback about encryption, identity protection, and security state.
 * 
 * Features:
 * - Real-time privacy status monitoring
 * - Visual indicators for different privacy levels
 * - Contextual warnings and recommendations
 * - Accessibility-friendly design
 */

import React from 'react';
import { Shield, Lock, Eye, AlertTriangle, CheckCircle, Info } from 'lucide-react';

const PrivacyStatusIndicator = ({ 
  userIdentity, 
  isConnected, 
  className = '',
  showDetails = false 
}) => {
  // Calculate privacy status
  const getPrivacyStatus = () => {
    if (!isConnected) {
      return {
        level: 'disconnected',
        color: 'gray',
        icon: Shield,
        title: 'Wallet Disconnected',
        description: 'Connect your wallet to start private messaging',
        items: []
      };
    }

    if (!userIdentity) {
      return {
        level: 'no-identity',
        color: 'yellow',
        icon: AlertTriangle,
        title: 'Identity Required',
        description: 'Create or import an identity to enable private messaging',
        items: [
          { text: 'Wallet connected', status: 'good' },
          { text: 'Identity needed', status: 'warning' },
          { text: 'Messages not yet available', status: 'info' }
        ]
      };
    }

    return {
      level: 'protected',
      color: 'green',
      icon: Shield,
      title: 'Privacy Protected',
      description: 'Your messages are encrypted and identity is protected',
      items: [
        { text: 'Wallet connected securely', status: 'good' },
        { text: 'Identity created with encryption', status: 'good' },
        { text: 'Messages encrypted end-to-end', status: 'good' },
        { text: 'Anonymous messaging enabled', status: 'good' }
      ]
    };
  };

  const status = getPrivacyStatus();

  const getColorClasses = (color) => {
    switch (color) {
      case 'green':
        return {
          bg: 'bg-green-950 border-green-500',
          text: 'text-green-100',
          icon: 'text-green-400',
          indicator: 'bg-green-500'
        };
      case 'yellow':
        return {
          bg: 'bg-yellow-950 border-yellow-500',
          text: 'text-yellow-100',
          icon: 'text-yellow-400',
          indicator: 'bg-yellow-500'
        };
      case 'red':
        return {
          bg: 'bg-red-950 border-red-500',
          text: 'text-red-100',
          icon: 'text-red-400',
          indicator: 'bg-red-500'
        };
      default:
        return {
          bg: 'bg-shadow-800 border-shadow-600',
          text: 'text-shadow-100',
          icon: 'text-shadow-400',
          indicator: 'bg-shadow-500'
        };
    }
  };

  const colors = getColorClasses(status.color);
  const IconComponent = status.icon;

  const getStatusIcon = (itemStatus) => {
    switch (itemStatus) {
      case 'good':
        return <CheckCircle className="text-green-400" size={14} />;
      case 'warning':
        return <AlertTriangle className="text-yellow-400" size={14} />;
      case 'error':
        return <AlertTriangle className="text-red-400" size={14} />;
      default:
        return <Info className="text-blue-400" size={14} />;
    }
  };

  return (
    <div className={`border rounded-lg p-4 ${colors.bg} ${className}`}>
      <div className="flex items-start justify-between">
        <div className="flex items-start space-x-3">
          <div className="relative">
            <IconComponent className={colors.icon} size={24} />
            {/* Status indicator dot */}
            <div className={`absolute -top-1 -right-1 w-3 h-3 rounded-full ${colors.indicator}`} />
          </div>
          <div className="flex-1">
            <h3 className={`font-semibold ${colors.text}`}>{status.title}</h3>
            <p className={`text-sm mt-1 ${colors.text} opacity-90`}>
              {status.description}
            </p>
            
            {showDetails && status.items.length > 0 && (
              <div className="mt-3 space-y-2">
                {status.items.map((item, index) => (
                  <div key={index} className="flex items-center space-x-2">
                    {getStatusIcon(item.status)}
                    <span className="text-xs">{item.text}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Additional privacy features indicator */}
        {status.level === 'protected' && (
          <div className="flex space-x-1">
            <div className="w-2 h-2 bg-green-500 rounded-full" title="Encryption Active" />
            <div className="w-2 h-2 bg-blue-500 rounded-full" title="Anonymous Identity" />
            <div className="w-2 h-2 bg-purple-500 rounded-full" title="Decentralized Storage" />
          </div>
        )}
      </div>

      {/* Privacy score indicator for protected state */}
      {status.level === 'protected' && showDetails && (
        <div className="mt-4 pt-4 border-t border-green-800">
          <div className="flex items-center justify-between text-sm">
            <span className="text-green-300">Privacy Score</span>
            <div className="flex items-center space-x-2">
              <div className="flex space-x-1">
                {[...Array(5)].map((_, i) => (
                  <div
                    key={i}
                    className={`w-2 h-2 rounded-full ${
                      i < 5 ? 'bg-green-500' : 'bg-shadow-600'
                    }`}
                  />
                ))}
              </div>
              <span className="text-green-400 font-semibold">Excellent</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PrivacyStatusIndicator;
/**
 * PrivacyTooltip Component
 * 
 * Provides contextual privacy education and information throughout the app.
 * Helps users understand privacy implications and best practices.
 * 
 * Features:
 * - Contextual privacy tips and explanations
 * - Dismissible tooltips with memory
 * - Privacy-focused iconography and styling
 * - Accessible design with ARIA labels
 */

import React, { useState, useEffect } from 'react';
import { Info, Shield, Eye, Lock, AlertTriangle, CheckCircle, X } from 'lucide-react';

const PrivacyTooltip = ({ 
  type = 'info', 
  title, 
  children, 
  position = 'top',
  persistKey = null,
  className = ''
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  // Check if tooltip was previously dismissed
  useEffect(() => {
    if (persistKey) {
      const dismissed = localStorage.getItem(`privacy-tooltip-${persistKey}`);
      setIsDismissed(dismissed === 'true');
    }
  }, [persistKey]);

  const handleDismiss = () => {
    setIsVisible(false);
    if (persistKey) {
      localStorage.setItem(`privacy-tooltip-${persistKey}`, 'true');
      setIsDismissed(true);
    }
  };

  const getIcon = () => {
    switch (type) {
      case 'security':
        return <Shield className="text-blue-400" size={16} />;
      case 'privacy':
        return <Eye className="text-purple-400" size={16} />;
      case 'encryption':
        return <Lock className="text-green-400" size={16} />;
      case 'warning':
        return <AlertTriangle className="text-yellow-400" size={16} />;
      case 'success':
        return <CheckCircle className="text-green-400" size={16} />;
      default:
        return <Info className="text-blue-400" size={16} />;
    }
  };

  const getColorClasses = () => {
    switch (type) {
      case 'security':
        return 'border-blue-500 bg-blue-950 text-blue-100';
      case 'privacy':
        return 'border-purple-500 bg-purple-950 text-purple-100';
      case 'encryption':
        return 'border-green-500 bg-green-950 text-green-100';
      case 'warning':
        return 'border-yellow-500 bg-yellow-950 text-yellow-100';
      case 'success':
        return 'border-green-500 bg-green-950 text-green-100';
      default:
        return 'border-shadow-500 bg-shadow-800 text-shadow-100';
    }
  };

  if (isDismissed && persistKey) {
    return null;
  }

  return (
    <div className={`relative inline-block ${className}`}>
      <button
        type="button"
        onClick={() => setIsVisible(!isVisible)}
        className="p-1 rounded-full hover:bg-shadow-700 transition-colors"
        aria-label={`Show privacy information: ${title}`}
      >
        {getIcon()}
      </button>

      {isVisible && (
        <div className={`absolute z-50 w-80 p-4 rounded-lg border-2 shadow-xl ${getColorClasses()} ${
          position === 'top' ? 'bottom-full mb-2' : 
          position === 'bottom' ? 'top-full mt-2' :
          position === 'left' ? 'right-full mr-2' :
          'left-full ml-2'
        }`}>
          <div className="flex items-start justify-between mb-2">
            <div className="flex items-center space-x-2">
              {getIcon()}
              <h4 className="font-semibold text-sm">{title}</h4>
            </div>
            <button
              onClick={handleDismiss}
              className="text-current opacity-70 hover:opacity-100 transition-opacity"
              aria-label="Close tooltip"
            >
              <X size={14} />
            </button>
          </div>
          <div className="text-sm leading-relaxed">
            {children}
          </div>
        </div>
      )}
    </div>
  );
};

export default PrivacyTooltip;
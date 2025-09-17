/**
 * PasswordStrengthIndicator Component
 * 
 * Provides visual feedback on the strength of secret codes for privacy and security.
 * Helps users create strong secret codes without compromising privacy.
 * 
 * Features:
 * - Real-time strength calculation
 * - Privacy-focused recommendations
 * - Visual strength meter
 * - Security best practices
 */

import React from 'react';
import { Shield, AlertTriangle, CheckCircle, Info } from 'lucide-react';

const PasswordStrengthIndicator = ({ password, className = '' }) => {
  // Calculate password strength
  const calculateStrength = (pwd) => {
    if (!pwd) return { score: 0, level: 'none', color: 'gray' };

    let score = 0;
    let feedback = [];

    // Length check
    if (pwd.length >= 8) score += 1;
    if (pwd.length >= 12) score += 1;
    if (pwd.length >= 16) score += 1;
    if (pwd.length >= 24) score += 1;

    // Character variety
    if (/[a-z]/.test(pwd)) score += 1;
    if (/[A-Z]/.test(pwd)) score += 1;
    if (/[0-9]/.test(pwd)) score += 1;
    if (/[^a-zA-Z0-9]/.test(pwd)) score += 1;

    // Determine level and feedback
    if (score < 3) {
      return {
        score,
        level: 'weak',
        color: 'red',
        title: 'Weak Security',
        feedback: [
          'Use at least 16 characters for better security',
          'Include uppercase and lowercase letters',
          'Add numbers and special characters',
          'Consider using a passphrase'
        ]
      };
    } else if (score < 6) {
      return {
        score,
        level: 'medium',
        color: 'yellow',
        title: 'Moderate Security',
        feedback: [
          'Good start! Consider making it longer',
          'Add more character variety if possible',
          'Longer passphrases are easier to remember'
        ]
      };
    } else if (score < 8) {
      return {
        score,
        level: 'strong',
        color: 'green',
        title: 'Strong Security',
        feedback: [
          'Excellent! This is a strong secret code',
          'Make sure to store it securely',
          'Consider using a password manager'
        ]
      };
    } else {
      return {
        score,
        level: 'excellent',
        color: 'green',
        title: 'Excellent Security',
        feedback: [
          'Outstanding! Maximum security achieved',
          'Your messages will be very secure',
          'Remember to backup safely'
        ]
      };
    }
  };

  const strength = calculateStrength(password);

  const getColorClasses = (color) => {
    switch (color) {
      case 'red':
        return {
          bg: 'bg-red-950 border-red-500',
          text: 'text-red-100',
          bar: 'bg-red-500',
          icon: 'text-red-400'
        };
      case 'yellow':
        return {
          bg: 'bg-yellow-950 border-yellow-500',
          text: 'text-yellow-100',
          bar: 'bg-yellow-500',
          icon: 'text-yellow-400'
        };
      case 'green':
        return {
          bg: 'bg-green-950 border-green-500',
          text: 'text-green-100',
          bar: 'bg-green-500',
          icon: 'text-green-400'
        };
      default:
        return {
          bg: 'bg-shadow-800 border-shadow-600',
          text: 'text-shadow-300',
          bar: 'bg-shadow-500',
          icon: 'text-shadow-400'
        };
    }
  };

  const colors = getColorClasses(strength.color);

  const getIcon = () => {
    switch (strength.level) {
      case 'weak':
        return <AlertTriangle className={colors.icon} size={16} />;
      case 'medium':
        return <Info className={colors.icon} size={16} />;
      case 'strong':
      case 'excellent':
        return <CheckCircle className={colors.icon} size={16} />;
      default:
        return <Shield className={colors.icon} size={16} />;
    }
  };

  if (!password) return null;

  return (
    <div className={`border rounded-lg p-3 mt-2 ${colors.bg} ${className}`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center space-x-2">
          {getIcon()}
          <span className={`text-sm font-medium ${colors.text}`}>
            {strength.title}
          </span>
        </div>
        <div className="text-xs text-shadow-400">
          {password.length} characters
        </div>
      </div>

      {/* Strength meter */}
      <div className="w-full bg-shadow-700 rounded-full h-2 mb-3">
        <div
          className={`h-2 rounded-full transition-all duration-300 ${colors.bar}`}
          style={{ width: `${(strength.score / 8) * 100}%` }}
        />
      </div>

      {/* Feedback */}
      <div className="space-y-1">
        {strength.feedback.map((tip, index) => (
          <div key={index} className="flex items-start space-x-2">
            <div className={`w-1 h-1 rounded-full mt-2 ${colors.bar}`} />
            <span className="text-xs leading-relaxed">{tip}</span>
          </div>
        ))}
      </div>

      {/* Privacy reminder */}
      {strength.level === 'strong' || strength.level === 'excellent' ? (
        <div className="mt-3 pt-3 border-t border-green-800">
          <div className="flex items-start space-x-2">
            <Shield className="text-green-400 mt-0.5" size={12} />
            <span className="text-xs text-green-300">
              Strong secret codes protect your privacy. Store this safely offline!
            </span>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default PasswordStrengthIndicator;
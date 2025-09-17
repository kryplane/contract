/**
 * NotificationCenter Component
 * 
 * Provides a centralized notification management system for ShadowChat.
 * Displays real-time notifications, maintains notification history, and 
 * provides user controls for notification preferences.
 * 
 * Features:
 * - Real-time notification display with toast integration
 * - Notification history with persistence
 * - Privacy-friendly design (no sensitive data stored)
 * - Notification filtering and search
 * - Notification preferences and settings
 * - Network status and health indicators
 * 
 * Privacy Considerations:
 * - Only stores notification metadata (timestamps, types, general messages)
 * - No sensitive user data (secret codes, private keys, message content) 
 * - Notifications are processed locally and not transmitted
 * - User can clear notification history at any time
 * 
 * @author ShadowChat Team
 */

import React, { useState, useEffect } from 'react';
import { 
  Bell, 
  BellOff, 
  Trash2, 
  Filter, 
  Settings, 
  CheckCircle, 
  AlertCircle, 
  Info, 
  XCircle,
  Clock,
  Wifi,
  WifiOff,
  Shield
} from 'lucide-react';
import toast from 'react-hot-toast';

const NotificationCenter = ({ web3Service, userIdentity }) => {
  // Notification state management
  const [notifications, setNotifications] = useState([]);
  const [isEnabled, setIsEnabled] = useState(true);
  const [filter, setFilter] = useState('all'); // all, success, warning, error, info
  const [showSettings, setShowSettings] = useState(false);
  const [networkStatus, setNetworkStatus] = useState('connected');
  
  // Notification preferences stored in localStorage for persistence
  const [preferences, setPreferences] = useState(() => {
    const stored = localStorage.getItem('shadowchat-notification-preferences');
    return stored ? JSON.parse(stored) : {
      enableToasts: true,
      enableSounds: false,
      enableDesktop: false,
      maxHistory: 100,
      autoDelete: 7 // days
    };
  });

  /**
   * Add a new notification to the history
   * 
   * @param {Object} notification - Notification object
   * @param {string} notification.type - Type: success, warning, error, info
   * @param {string} notification.title - Notification title
   * @param {string} notification.message - Notification message
   * @param {string} [notification.category] - Category: message, credit, network, system
   */
  const addNotification = (notification) => {
    if (!isEnabled) return;

    const newNotification = {
      id: Date.now() + Math.random(),
      timestamp: new Date(),
      ...notification
    };

    setNotifications(prev => {
      const updated = [newNotification, ...prev];
      // Limit history size based on preferences
      return updated.slice(0, preferences.maxHistory);
    });

    // Show toast notification if enabled
    if (preferences.enableToasts) {
      const toastOptions = {
        duration: notification.type === 'error' ? 6000 : 4000,
        position: 'top-right'
      };

      switch (notification.type) {
        case 'success':
          toast.success(notification.message, toastOptions);
          break;
        case 'warning':
          toast(notification.message, { ...toastOptions, icon: '⚠️' });
          break;
        case 'error':
          toast.error(notification.message, toastOptions);
          break;
        case 'info':
        default:
          toast(notification.message, { ...toastOptions, icon: 'ℹ️' });
          break;
      }
    }

    // Desktop notification if enabled and supported
    if (preferences.enableDesktop && 'Notification' in window && Notification.permission === 'granted') {
      new Notification(`ShadowChat - ${notification.title}`, {
        body: notification.message,
        icon: '/favicon.ico',
        badge: '/favicon.ico'
      });
    }
  };

  /**
   * Monitor network connectivity and Web3 service status
   */
  useEffect(() => {
    if (!web3Service) return;

    const checkNetworkStatus = async () => {
      try {
        if (web3Service.provider) {
          await web3Service.provider.getNetwork();
          setNetworkStatus('connected');
        } else {
          setNetworkStatus('disconnected');
        }
      } catch (error) {
        setNetworkStatus('error');
        if (error.code === 'NETWORK_ERROR') {
          addNotification({
            type: 'warning',
            title: 'Network Issue',
            message: 'Connection to blockchain network is unstable',
            category: 'network'
          });
        }
      }
    };

    // Check initially and then periodically
    checkNetworkStatus();
    const interval = setInterval(checkNetworkStatus, 30000); // Check every 30 seconds

    return () => clearInterval(interval);
  }, [web3Service]);

  /**
   * Set up real-time event monitoring for notifications
   */
  useEffect(() => {
    if (!userIdentity || !web3Service) return;

    let messageUnsubscribe, creditUnsubscribe;

    const setupEventListeners = async () => {
      try {
        // Listen for new messages and create notifications
        messageUnsubscribe = await web3Service.listenForMessages(
          userIdentity.receiverHash,
          (message) => {
            addNotification({
              type: 'info',
              title: 'New Message',
              message: `Encrypted message received from ${message.sender.slice(0, 8)}...`,
              category: 'message'
            });
          }
        );

        // Listen for credit events and create notifications
        creditUnsubscribe = await web3Service.listenForCreditEvents(
          userIdentity.receiverHash,
          {
            onDeposit: (eventData) => {
              addNotification({
                type: 'success',
                title: 'Credits Deposited',
                message: `${eventData.amount} ETH added to your balance`,
                category: 'credit'
              });
            },
            onWithdraw: (eventData) => {
              addNotification({
                type: 'info',
                title: 'Credits Withdrawn',
                message: `${eventData.amount} ETH withdrawn from balance`,
                category: 'credit'
              });
            }
          }
        );

        addNotification({
          type: 'success',
          title: 'Real-time Monitoring Active',
          message: 'Now listening for messages and credit events',
          category: 'system'
        });

      } catch (error) {
        console.error('Failed to setup notification listeners:', error);
        addNotification({
          type: 'error',
          title: 'Monitoring Setup Failed',
          message: 'Unable to start real-time event monitoring',
          category: 'system'
        });
      }
    };

    setupEventListeners();

    // Cleanup function
    return () => {
      if (messageUnsubscribe) messageUnsubscribe();
      if (creditUnsubscribe) creditUnsubscribe();
    };
  }, [userIdentity, web3Service]);

  /**
   * Save preferences to localStorage whenever they change
   */
  useEffect(() => {
    localStorage.setItem('shadowchat-notification-preferences', JSON.stringify(preferences));
  }, [preferences]);

  /**
   * Clean up old notifications based on user preferences
   */
  useEffect(() => {
    if (preferences.autoDelete > 0) {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - preferences.autoDelete);
      
      setNotifications(prev => 
        prev.filter(notification => new Date(notification.timestamp) > cutoffDate)
      );
    }
  }, [preferences.autoDelete]);

  // Request desktop notification permission if needed
  const requestDesktopPermission = async () => {
    if ('Notification' in window && Notification.permission === 'default') {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        setPreferences(prev => ({ ...prev, enableDesktop: true }));
        addNotification({
          type: 'success',
          title: 'Desktop Notifications Enabled',
          message: 'You will now receive desktop notifications',
          category: 'system'
        });
      }
    }
  };

  // Clear all notifications
  const clearAllNotifications = () => {
    setNotifications([]);
    toast.success('All notifications cleared');
  };

  // Filter notifications based on current filter
  const filteredNotifications = notifications.filter(notification => {
    if (filter === 'all') return true;
    return notification.type === filter;
  });

  // Get notification icon based on type
  const getNotificationIcon = (type) => {
    switch (type) {
      case 'success': return <CheckCircle className="text-green-400" size={20} />;
      case 'warning': return <AlertCircle className="text-yellow-400" size={20} />;
      case 'error': return <XCircle className="text-red-400" size={20} />;
      case 'info': 
      default: return <Info className="text-blue-400" size={20} />;
    }
  };

  // Get network status indicator
  const getNetworkStatusIndicator = () => {
    switch (networkStatus) {
      case 'connected':
        return <Wifi className="text-green-400" size={16} />;
      case 'disconnected':
        return <WifiOff className="text-red-400" size={16} />;
      case 'error':
        return <AlertCircle className="text-yellow-400" size={16} />;
      default:
        return <Wifi className="text-gray-400" size={16} />;
    }
  };

  const formatTime = (date) => {
    return new Date(date).toLocaleString();
  };

  if (!userIdentity) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="shadow-card text-center">
          <Bell className="mx-auto text-yellow-400 mb-4" size={48} />
          <h3 className="text-xl font-semibold mb-2">Notification Center</h3>
          <p className="text-shadow-300">
            Connect your identity to enable real-time notifications for messages and transactions.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center space-x-3">
          <Bell className="text-blue-400" size={32} />
          <div>
            <h2 className="text-3xl font-bold">🔔 Notification Center</h2>
            <p className="text-shadow-300">
              Real-time alerts and activity monitoring with privacy protection
            </p>
          </div>
        </div>
        
        <div className="flex items-center space-x-3">
          {/* Network Status */}
          <div className={`flex items-center space-x-2 px-3 py-1 rounded-full text-xs ${
            networkStatus === 'connected' ? 'bg-green-900/30 text-green-400' :
            networkStatus === 'disconnected' ? 'bg-red-900/30 text-red-400' :
            'bg-yellow-900/30 text-yellow-400'
          }`}>
            {getNetworkStatusIndicator()}
            <span className="capitalize">{networkStatus}</span>
          </div>

          {/* Notification Toggle */}
          <button
            onClick={() => setIsEnabled(!isEnabled)}
            className={`p-2 rounded-lg ${
              isEnabled ? 'bg-green-900/30 text-green-400' : 'bg-gray-900/30 text-gray-400'
            }`}
            title={isEnabled ? 'Disable notifications' : 'Enable notifications'}
          >
            {isEnabled ? <Bell size={20} /> : <BellOff size={20} />}
          </button>

          {/* Settings */}
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="shadow-button p-2"
            title="Notification settings"
          >
            <Settings size={20} />
          </button>
        </div>
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <div className="shadow-card bg-blue-900/20 border-blue-600/50">
          <h3 className="text-lg font-semibold mb-4 text-blue-400">Notification Settings</h3>
          
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h4 className="font-medium text-blue-300">Display Options</h4>
              
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={preferences.enableToasts}
                  onChange={(e) => setPreferences(prev => ({ ...prev, enableToasts: e.target.checked }))}
                  className="rounded"
                />
                <span className="text-sm">Show toast notifications</span>
              </label>

              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={preferences.enableDesktop}
                  onChange={(e) => {
                    if (e.target.checked && 'Notification' in window) {
                      requestDesktopPermission();
                    } else {
                      setPreferences(prev => ({ ...prev, enableDesktop: e.target.checked }));
                    }
                  }}
                  className="rounded"
                />
                <span className="text-sm">Desktop notifications</span>
              </label>
            </div>

            <div className="space-y-4">
              <h4 className="font-medium text-blue-300">History Management</h4>
              
              <div>
                <label className="block text-sm text-blue-200 mb-1">Max history items</label>
                <input
                  type="number"
                  min="10"
                  max="500"
                  value={preferences.maxHistory}
                  onChange={(e) => setPreferences(prev => ({ ...prev, maxHistory: parseInt(e.target.value) }))}
                  className="shadow-input w-20"
                />
              </div>

              <div>
                <label className="block text-sm text-blue-200 mb-1">Auto-delete after (days)</label>
                <input
                  type="number"
                  min="0"
                  max="30"
                  value={preferences.autoDelete}
                  onChange={(e) => setPreferences(prev => ({ ...prev, autoDelete: parseInt(e.target.value) }))}
                  className="shadow-input w-20"
                />
              </div>
            </div>
          </div>
          
          <div className="mt-4 p-3 bg-green-900/20 border border-green-600/50 rounded-lg">
            <div className="text-sm text-green-200">
              <Shield className="inline mr-1" size={14} />
              Privacy-friendly: No sensitive data is stored in notification history
            </div>
          </div>
        </div>
      )}

      {/* Notification Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <span className="text-sm text-shadow-300">Filter:</span>
          {['all', 'success', 'warning', 'error', 'info'].map(filterType => (
            <button
              key={filterType}
              onClick={() => setFilter(filterType)}
              className={`px-3 py-1 rounded-lg text-xs font-medium ${
                filter === filterType 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-shadow-700 text-shadow-300 hover:bg-shadow-600'
              }`}
            >
              {filterType.charAt(0).toUpperCase() + filterType.slice(1)}
            </button>
          ))}
        </div>

        <div className="flex items-center space-x-2">
          <span className="text-sm text-shadow-400">
            {filteredNotifications.length} notification{filteredNotifications.length !== 1 ? 's' : ''}
          </span>
          
          {notifications.length > 0 && (
            <button
              onClick={clearAllNotifications}
              className="shadow-button text-red-400 border-red-400/50 hover:bg-red-900/20 text-sm px-3 py-1"
              title="Clear all notifications"
            >
              <Trash2 size={14} className="mr-1" />
              Clear All
            </button>
          )}
        </div>
      </div>

      {/* Notification List */}
      <div className="shadow-card">
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {filteredNotifications.length === 0 ? (
            <div className="text-center py-8 text-shadow-400">
              <Bell size={48} className="mx-auto mb-2 opacity-50" />
              <p>No notifications</p>
              <p className="text-xs">
                {filter === 'all' 
                  ? 'Notifications will appear here when events occur'
                  : `No ${filter} notifications to show`
                }
              </p>
            </div>
          ) : (
            filteredNotifications.map((notification) => (
              <div
                key={notification.id}
                className={`p-4 rounded-lg border ${
                  notification.type === 'success' ? 'bg-green-900/20 border-green-600/50' :
                  notification.type === 'warning' ? 'bg-yellow-900/20 border-yellow-600/50' :
                  notification.type === 'error' ? 'bg-red-900/20 border-red-600/50' :
                  'bg-blue-900/20 border-blue-600/50'
                }`}
              >
                <div className="flex items-start space-x-3">
                  {getNotificationIcon(notification.type)}
                  
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <h4 className="font-medium text-shadow-50">{notification.title}</h4>
                      <div className="flex items-center space-x-2 text-xs text-shadow-400">
                        <Clock size={12} />
                        <span>{formatTime(notification.timestamp)}</span>
                      </div>
                    </div>
                    
                    <p className="text-shadow-300 text-sm">{notification.message}</p>
                    
                    {notification.category && (
                      <span className="inline-block mt-1 px-2 py-1 bg-shadow-700 text-shadow-400 text-xs rounded">
                        {notification.category}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Privacy Information */}
      <div className="shadow-card bg-purple-900/20 border-purple-600/50">
        <h4 className="font-semibold text-purple-400 mb-3">Privacy & Security</h4>
        <div className="text-sm text-purple-200 space-y-2">
          <p>• Notifications are processed locally in your browser</p>
          <p>• No sensitive data (secret codes, message content) is stored in notification history</p>
          <p>• Notification preferences are saved locally and never transmitted</p>
          <p>• You can clear notification history at any time</p>
          <p>• Desktop notifications respect your browser's privacy settings</p>
        </div>
      </div>
    </div>
  );
};

export default NotificationCenter;
/**
 * Analytics Component
 * 
 * Provides comprehensive analytics and metrics for ShadowChat users in a privacy-friendly manner.
 * All analytics are computed locally and never transmitted to external services.
 * 
 * Features:
 * - User activity metrics (messages received, credits spent, etc.)
 * - Network statistics and health indicators  
 * - Real-time activity feed with recent events
 * - Privacy-preserving design with local computation only
 * - Interactive charts and visualizations (future enhancement)
 * 
 * Privacy Considerations:
 * - All data processing happens client-side
 * - No analytics data is transmitted to external services
 * - Metrics are computed from local blockchain events only
 * - No user tracking or profiling
 * - Users control their own analytics data
 * 
 * @author ShadowChat Team
 */

import React, { useState, useEffect } from 'react';
import { BarChart3, TrendingUp, MessageSquare, Coins, Users, Activity, RefreshCw, Clock, Shield, Zap, Network } from 'lucide-react';
import toast from 'react-hot-toast';

const Analytics = ({ web3Service, userIdentity }) => {
  const [stats, setStats] = useState({
    totalMessages: 0,
    messagesReceived: 0,
    totalCredits: '0',
    messagesSent: 0,
    averageMessageSize: 0,
    recentActivity: [],
    privacyScore: 0,
    accountAge: 0
  });
  const [networkStats, setNetworkStats] = useState({
    totalNetworkMessages: 0,
    totalShards: 0,
    messageFee: '0',
    networkHealth: 'unknown',
    averageBlockTime: 0
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [lastUpdateTime, setLastUpdateTime] = useState(null);

  /**
   * Load comprehensive analytics data for the user
   * Computes all metrics locally from blockchain data
   */
  const loadAnalytics = async () => {
    if (!userIdentity || !web3Service) return;

    setIsLoading(true);
    try {
      // Load user-specific data
      const [creditBalance, messageFee, userMessages] = await Promise.all([
        web3Service.getCreditBalance(userIdentity.receiverHash),
        web3Service.getMessageFee(),
        web3Service.getHistoricalMessages(userIdentity.receiverHash)
      ]);

      // Calculate user statistics
      const messagesReceived = userMessages.length;
      const totalMessageSize = userMessages.reduce((sum, msg) => sum + msg.encryptedContent.length, 0);
      const averageMessageSize = messagesReceived > 0 ? Math.round(totalMessageSize / messagesReceived) : 0;

      // Calculate account age from identity creation
      const accountAge = userIdentity.createdAt ? 
        Math.floor((Date.now() - new Date(userIdentity.createdAt).getTime()) / (1000 * 60 * 60 * 24)) : 0;

      // Calculate privacy score based on usage patterns
      const privacyScore = calculatePrivacyScore(userMessages, creditBalance, accountAge);

      // Get recent activity (last 24 hours) with enhanced details
      const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);
      const recentActivity = userMessages
        .filter(msg => parseInt(msg.timestamp) * 1000 > oneDayAgo)
        .slice(0, 15)
        .map(msg => ({
          type: 'message_received',
          timestamp: new Date(parseInt(msg.timestamp) * 1000),
          from: msg.sender,
          messageId: msg.messageId,
          size: msg.encryptedContent.length,
          blockNumber: msg.blockNumber
        }))
        .sort((a, b) => b.timestamp - a.timestamp);

      setStats({
        totalMessages: messagesReceived,
        messagesReceived,
        totalCredits: creditBalance,
        messagesSent: 0, // This would require tracking sent messages separately
        averageMessageSize,
        recentActivity,
        privacyScore,
        accountAge
      });

      // Load enhanced network statistics
      try {
        const factoryInfo = await web3Service.getFactoryInfo();
        const networkInfo = await web3Service.getNetworkInfo();
        
        // Calculate network health based on various factors
        const networkHealth = calculateNetworkHealth(factoryInfo, networkInfo);
        
        setNetworkStats({
          totalNetworkMessages: 0, // This would require aggregating across all shards
          totalShards: parseInt(factoryInfo.totalShards),
          messageFee: factoryInfo.messageFee,
          networkHealth,
          averageBlockTime: 13 // Approximate for most networks
        });
      } catch (error) {
        console.warn('Could not load extended network stats:', error);
        setNetworkStats(prev => ({
          ...prev,
          messageFee,
          networkHealth: 'limited'
        }));
      }

      setLastUpdateTime(new Date());
      toast.success('Analytics updated');
    } catch (error) {
      console.error('Failed to load analytics:', error);
      toast.error('Failed to load analytics');
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Calculate a privacy score based on user's activity patterns
   * Higher score indicates better privacy practices
   */
  const calculatePrivacyScore = (messages, creditBalance, accountAge) => {
    let score = 0;
    
    // Base score for having an identity
    score += 20;
    
    // Score for account age (older accounts get more points, up to 20)
    score += Math.min(accountAge * 2, 20);
    
    // Score for having credits (shows preparedness)
    if (parseFloat(creditBalance) > 0) score += 15;
    
    // Score for message activity (balanced usage)
    if (messages.length > 0) score += 15;
    if (messages.length > 10) score += 10;
    
    // Score for consistent usage patterns
    if (messages.length > 5) {
      const timeSpan = messages.length > 1 ? 
        (parseInt(messages[0].timestamp) - parseInt(messages[messages.length - 1].timestamp)) / (60 * 60 * 24) : 0;
      if (timeSpan > 1) score += 10; // Using service over multiple days
    }
    
    // Score for reasonable message sizes (not too large or small)
    const avgSize = messages.reduce((sum, msg) => sum + msg.encryptedContent.length, 0) / messages.length;
    if (avgSize > 50 && avgSize < 2000) score += 10;
    
    return Math.min(score, 100);
  };

  /**
   * Calculate network health based on various network metrics
   */
  const calculateNetworkHealth = (factoryInfo, networkInfo) => {
    // Simple heuristic based on available data
    if (parseInt(factoryInfo.totalShards) > 0 && parseFloat(networkInfo.balance) >= 0) {
      return 'good';
    } else {
      return 'limited';
    }
  };

  // Load analytics on component mount and set up real-time updates
  useEffect(() => {
    loadAnalytics();
  }, [userIdentity, web3Service]);

  /**
   * Set up real-time analytics updates by listening to blockchain events
   * This provides automatic updates to analytics when events occur
   */
  useEffect(() => {
    if (!userIdentity || !web3Service || isListening) return;

    let messageUnsubscribe, creditUnsubscribe;

    const setupRealtimeUpdates = async () => {
      try {
        // Listen for new messages to update activity feed
        messageUnsubscribe = await web3Service.listenForMessages(
          userIdentity.receiverHash,
          (newMessage) => {
            // Update recent activity immediately
            const activityItem = {
              type: 'message_received',
              timestamp: new Date(parseInt(newMessage.timestamp) * 1000),
              from: newMessage.sender,
              messageId: newMessage.messageId,
              size: newMessage.encryptedContent.length,
              blockNumber: newMessage.blockNumber
            };

            setStats(prev => ({
              ...prev,
              totalMessages: prev.totalMessages + 1,
              messagesReceived: prev.messagesReceived + 1,
              recentActivity: [activityItem, ...prev.recentActivity].slice(0, 15)
            }));
          }
        );

        // Listen for credit events to update balance-related metrics
        creditUnsubscribe = await web3Service.listenForCreditEvents(
          userIdentity.receiverHash,
          {
            onDeposit: (eventData) => {
              setStats(prev => ({
                ...prev,
                totalCredits: eventData.totalBalance
              }));
            },
            onWithdraw: (eventData) => {
              setStats(prev => ({
                ...prev,
                totalCredits: eventData.remainingBalance
              }));
            }
          }
        );

        setIsListening(true);
      } catch (error) {
        console.error('Failed to setup real-time analytics updates:', error);
      }
    };

    setupRealtimeUpdates();

    return () => {
      if (messageUnsubscribe) messageUnsubscribe();
      if (creditUnsubscribe) creditUnsubscribe();
      setIsListening(false);
    };
  }, [userIdentity, web3Service, isListening]);

  /**
   * StatCard component for displaying metrics with icons and descriptions
   */
  const StatCard = ({ icon: Icon, title, value, subtitle, color = "blue", trend, onClick }) => (
    <div className={`shadow-card ${onClick ? 'cursor-pointer hover:shadow-lg transition-shadow' : ''}`} onClick={onClick}>
      <div className="flex items-center space-x-3">
        <div className={`p-3 rounded-lg bg-${color}-900/50`}>
          <Icon className={`text-${color}-400`} size={24} />
        </div>
        <div className="flex-1">
          <div className="text-2xl font-bold text-shadow-50">{value}</div>
          <div className="text-sm font-medium text-shadow-300">{title}</div>
          {subtitle && (
            <div className="text-xs text-shadow-400">{subtitle}</div>
          )}
          {trend && (
            <div className={`text-xs flex items-center space-x-1 mt-1 ${
              trend > 0 ? 'text-green-400' : trend < 0 ? 'text-red-400' : 'text-gray-400'
            }`}>
              <TrendingUp size={10} className={trend < 0 ? 'transform rotate-180' : ''} />
              <span>{Math.abs(trend)}% {trend > 0 ? 'increase' : trend < 0 ? 'decrease' : 'no change'}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const formatTime = (date) => {
    return date.toLocaleString();
  };

  const formatAddress = (address) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  if (!userIdentity) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="shadow-card text-center">
          <BarChart3 className="mx-auto text-yellow-400 mb-4" size={48} />
          <h3 className="text-xl font-semibold mb-2">No Identity Found</h3>
          <p className="text-shadow-300">
            Please create or import an identity first to view your analytics.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-3xl font-bold mb-2">📊 Analytics Dashboard</h2>
          <p className="text-shadow-300">
            Monitor your messaging activity and network statistics with privacy protection.
          </p>
          {lastUpdateTime && (
            <p className="text-xs text-shadow-400 mt-1">
              Last updated: {lastUpdateTime.toLocaleString()}
            </p>
          )}
        </div>
        <div className="flex items-center space-x-3">
          {/* Real-time status indicator */}
          <div className={`flex items-center space-x-2 px-3 py-1 rounded-full text-xs ${
            isListening ? 'bg-green-900/30 text-green-400' : 'bg-gray-900/30 text-gray-400'
          }`}>
            <div className={`w-2 h-2 rounded-full ${
              isListening ? 'bg-green-400 animate-pulse' : 'bg-gray-400'
            }`}></div>
            <span>{isListening ? 'Real-time Updates' : 'Static View'}</span>
          </div>
          
          <button
            onClick={loadAnalytics}
            disabled={isLoading}
            className="shadow-button-primary flex items-center space-x-2"
          >
            <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* User Statistics */}
      <div>
        <h3 className="text-xl font-semibold mb-4 flex items-center space-x-2">
          <Users className="text-blue-400" size={20} />
          <span>Your Activity</span>
        </h3>
        
        <div className="grid md:grid-cols-2 lg:grid-cols-5 gap-4">
          <StatCard
            icon={MessageSquare}
            title="Messages Received"
            value={stats.messagesReceived}
            subtitle="Total messages to your hash"
            color="green"
          />
          
          <StatCard
            icon={Coins}
            title="Credit Balance"
            value={`${parseFloat(stats.totalCredits).toFixed(4)} ETH`}
            subtitle="Available for sending messages"
            color="yellow"
          />
          
          <StatCard
            icon={TrendingUp}
            title="Avg Message Size"
            value={`${stats.averageMessageSize} chars`}
            subtitle="Average encrypted message length"
            color="purple"
          />
          
          <StatCard
            icon={Shield}
            title="Privacy Score"
            value={`${stats.privacyScore}/100`}
            subtitle="Privacy practices rating"
            color="blue"
          />

          <StatCard
            icon={Clock}
            title="Account Age"
            value={`${stats.accountAge} days`}
            subtitle="Days since identity creation"
            color="indigo"
          />
        </div>
      </div>

      {/* Enhanced Network Health Section */}
      <div>
        <h3 className="text-xl font-semibold mb-4 flex items-center space-x-2">
          <Network className="text-green-400" size={20} />
          <span>Network Health</span>
        </h3>
        
        <div className="grid md:grid-cols-4 gap-4">
          <StatCard
            icon={Zap}
            title="Network Status"
            value={networkStats.networkHealth}
            subtitle="Overall network condition"
            color={networkStats.networkHealth === 'good' ? 'green' : 'yellow'}
          />
          
          <StatCard
            icon={BarChart3}
            title="Active Shards"
            value={networkStats.totalShards}
            subtitle="Distributed message storage"
            color="blue"
          />
          
          <StatCard
            icon={Coins}
            title="Message Fee"
            value={`${parseFloat(networkStats.messageFee).toFixed(4)} ETH`}
            subtitle="Cost per message"
            color="purple"
          />

          <StatCard
            icon={Clock}
            title="Block Time"
            value={`~${networkStats.averageBlockTime}s`}
            subtitle="Average confirmation time"
            color="indigo"
          />
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Enhanced Recent Activity */}
        <div className="shadow-card">
          <h3 className="text-xl font-semibold mb-4 flex items-center space-x-2">
            <Activity className="text-green-400" size={20} />
            <span>Real-time Activity Feed</span>
            {isListening && (
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
            )}
          </h3>
          
          <div className="space-y-3 max-h-80 overflow-y-auto">
            {stats.recentActivity.length === 0 ? (
              <div className="text-center py-8 text-shadow-400">
                <Activity size={48} className="mx-auto mb-2 opacity-50" />
                <p>No recent activity</p>
                <p className="text-xs">Activity will appear here when you receive messages</p>
              </div>
            ) : (
              stats.recentActivity.map((activity, index) => (
                <div key={index} className="flex items-center space-x-3 p-3 bg-shadow-700 rounded-lg">
                  <div className="p-2 bg-green-900/50 rounded-lg">
                    <MessageSquare className="text-green-400" size={16} />
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-medium text-shadow-50">
                      Message Received
                    </div>
                    <div className="text-xs text-shadow-400">
                      From {formatAddress(activity.from)} • {activity.size} chars
                    </div>
                    {activity.blockNumber && (
                      <div className="text-xs text-shadow-500">
                        Block #{activity.blockNumber}
                      </div>
                    )}
                  </div>
                  <div className="text-xs text-shadow-400">
                    {formatTime(activity.timestamp)}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Enhanced Network Statistics with Privacy Focus */}
        <div className="shadow-card">
          <h3 className="text-xl font-semibold mb-4 flex items-center space-x-2">
            <BarChart3 className="text-purple-400" size={20} />
            <span>Privacy-Preserving Network Stats</span>
          </h3>
          
          <div className="space-y-4">
            <div className="flex justify-between items-center p-3 bg-shadow-700 rounded-lg">
              <span className="text-shadow-300">Message Fee</span>
              <span className="font-semibold text-shadow-50">
                {parseFloat(networkStats.messageFee).toFixed(4)} ETH
              </span>
            </div>
            
            <div className="flex justify-between items-center p-3 bg-shadow-700 rounded-lg">
              <span className="text-shadow-300">Active Shards</span>
              <span className="font-semibold text-shadow-50">
                {networkStats.totalShards}
              </span>
            </div>
            
            <div className="flex justify-between items-center p-3 bg-shadow-700 rounded-lg">
              <span className="text-shadow-300">Network Health</span>
              <span className={`font-semibold ${
                networkStats.networkHealth === 'good' ? 'text-green-400' :
                networkStats.networkHealth === 'limited' ? 'text-yellow-400' : 'text-red-400'
              }`}>
                {networkStats.networkHealth.toUpperCase()}
              </span>
            </div>

            <div className="flex justify-between items-center p-3 bg-shadow-700 rounded-lg">
              <span className="text-shadow-300">Your Messages Affordable</span>
              <span className="font-semibold text-shadow-50">
                {Math.floor(parseFloat(stats.totalCredits) / parseFloat(networkStats.messageFee || 1))}
              </span>
            </div>
          </div>

          <div className="mt-6 p-4 bg-blue-900/20 border border-blue-600/50 rounded-lg">
            <h4 className="font-semibold text-blue-400 mb-2">Privacy-First Design</h4>
            <div className="text-sm text-blue-200 space-y-1">
              <p>• All analytics computed locally in your browser</p>
              <p>• No data transmitted to external analytics services</p>
              <p>• Network statistics aggregated without exposing user data</p>
              <p>• Real-time updates preserve privacy through encryption</p>
            </div>
          </div>
        </div>
      </div>

      {/* Enhanced Privacy Score Breakdown */}
      <div className="shadow-card bg-gradient-to-r from-green-900/20 to-blue-900/20 border-green-600/50">
        <h3 className="text-xl font-semibold mb-4 text-green-400">Privacy Score Breakdown</h3>
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <h4 className="font-medium text-green-300 mb-3">Score Components</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-green-200">Identity Setup</span>
                <span className="text-green-400">20/20</span>
              </div>
              <div className="flex justify-between">
                <span className="text-green-200">Account Age ({stats.accountAge} days)</span>
                <span className="text-green-400">{Math.min(stats.accountAge * 2, 20)}/20</span>
              </div>
              <div className="flex justify-between">
                <span className="text-green-200">Credit Balance</span>
                <span className="text-green-400">{parseFloat(stats.totalCredits) > 0 ? '15' : '0'}/15</span>
              </div>
              <div className="flex justify-between">
                <span className="text-green-200">Message Activity</span>
                <span className="text-green-400">{stats.messagesReceived > 0 ? (stats.messagesReceived > 10 ? '25' : '15') : '0'}/25</span>
              </div>
              <div className="flex justify-between">
                <span className="text-green-200">Usage Patterns</span>
                <span className="text-green-400">{stats.messagesReceived > 5 ? '20' : '0'}/20</span>
              </div>
            </div>
          </div>
          
          <div>
            <h4 className="font-medium text-green-300 mb-3">Privacy Tips</h4>
            <div className="space-y-2 text-sm text-green-200">
              {stats.privacyScore < 50 && (
                <p>• Consider using ShadowChat more regularly to improve your privacy practices</p>
              )}
              {parseFloat(stats.totalCredits) === 0 && (
                <p>• Maintain some credit balance to enable immediate messaging</p>
              )}
              {stats.messagesReceived === 0 && (
                <p>• Share your receiver hash to start receiving encrypted messages</p>
              )}
              {stats.accountAge < 7 && (
                <p>• Your privacy score improves over time with consistent usage</p>
              )}
              <p>• All metrics are computed locally and never shared</p>
            </div>
          </div>
        </div>
        
        {/* Privacy Score Visualization */}
        <div className="mt-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-green-300 font-medium">Overall Privacy Score</span>
            <span className="text-green-400 font-bold">{stats.privacyScore}/100</span>
          </div>
          <div className="w-full bg-shadow-700 rounded-full h-3">
            <div 
              className={`h-3 rounded-full transition-all duration-500 ${
                stats.privacyScore >= 80 ? 'bg-green-500' :
                stats.privacyScore >= 60 ? 'bg-yellow-500' :
                stats.privacyScore >= 40 ? 'bg-orange-500' : 'bg-red-500'
              }`}
              style={{ width: `${stats.privacyScore}%` }}
            ></div>
          </div>
        </div>
      </div>

      {/* Identity Summary */}
      <div className="shadow-card bg-gradient-to-r from-purple-900/20 to-blue-900/20 border-purple-600/50">
        <h3 className="text-xl font-semibold mb-4 text-purple-400">Identity Summary</h3>
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-purple-300 mb-1">
              Receiver Hash
            </label>
            <input
              type="text"
              value={userIdentity.receiverHash}
              readOnly
              className="shadow-input w-full font-mono text-xs"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-purple-300 mb-1">
              Identity Created
            </label>
            <div className="text-shadow-50 font-medium">
              {new Date(userIdentity.createdAt).toLocaleDateString()}
            </div>
          </div>
        </div>
        
        <div className="mt-4 grid md:grid-cols-3 gap-4 text-sm">
          <div className="text-center p-3 bg-purple-900/30 rounded-lg">
            <div className="text-lg font-bold text-purple-400">
              {Math.floor(parseFloat(stats.totalCredits) / parseFloat(networkStats.messageFee || 1))}
            </div>
            <div className="text-purple-200">Messages Affordable</div>
          </div>
          <div className="text-center p-3 bg-purple-900/30 rounded-lg">
            <div className="text-lg font-bold text-purple-400">
              {stats.messagesReceived}
            </div>
            <div className="text-purple-200">Total Received</div>
          </div>
          <div className="text-center p-3 bg-purple-900/30 rounded-lg">
            <div className="text-lg font-bold text-purple-400">
              {stats.recentActivity.length}
            </div>
            <div className="text-purple-200">Recent (24h)</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Analytics;
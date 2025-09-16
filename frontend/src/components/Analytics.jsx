import React, { useState, useEffect } from 'react';
import { BarChart3, TrendingUp, MessageSquare, Coins, Users, Activity, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';

const Analytics = ({ web3Service, userIdentity }) => {
  const [stats, setStats] = useState({
    totalMessages: 0,
    messagesReceived: 0,
    totalCredits: '0',
    messagesSent: 0,
    averageMessageSize: 0,
    recentActivity: []
  });
  const [networkStats, setNetworkStats] = useState({
    totalNetworkMessages: 0,
    totalShards: 0,
    messageFee: '0'
  });
  const [isLoading, setIsLoading] = useState(false);

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

      // Calculate user stats
      const messagesReceived = userMessages.length;
      const totalMessageSize = userMessages.reduce((sum, msg) => sum + msg.encryptedContent.length, 0);
      const averageMessageSize = messagesReceived > 0 ? Math.round(totalMessageSize / messagesReceived) : 0;

      // Get recent activity (last 24 hours)
      const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);
      const recentActivity = userMessages
        .filter(msg => parseInt(msg.timestamp) * 1000 > oneDayAgo)
        .slice(0, 10)
        .map(msg => ({
          type: 'message_received',
          timestamp: new Date(parseInt(msg.timestamp) * 1000),
          from: msg.sender,
          messageId: msg.messageId
        }));

      setStats({
        totalMessages: messagesReceived,
        messagesReceived,
        totalCredits: creditBalance,
        messagesSent: 0, // This would require tracking sent messages separately
        averageMessageSize,
        recentActivity
      });

      // Load network stats
      setNetworkStats({
        totalNetworkMessages: 0, // This would require aggregating across all shards
        totalShards: 0, // This would require calling factory.totalShards()
        messageFee
      });

      toast.success('Analytics updated');
    } catch (error) {
      console.error('Failed to load analytics:', error);
      toast.error('Failed to load analytics');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAnalytics();
  }, [userIdentity, web3Service]);

  const StatCard = ({ icon: Icon, title, value, subtitle, color = "blue" }) => (
    <div className="shadow-card">
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
            Monitor your messaging activity and network statistics.
          </p>
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

      {/* User Statistics */}
      <div>
        <h3 className="text-xl font-semibold mb-4 flex items-center space-x-2">
          <Users className="text-blue-400" size={20} />
          <span>Your Activity</span>
        </h3>
        
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
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
            icon={Activity}
            title="Messages Sent"
            value={stats.messagesSent}
            subtitle="Total messages sent by you"
            color="red"
          />
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Recent Activity */}
        <div className="shadow-card">
          <h3 className="text-xl font-semibold mb-4 flex items-center space-x-2">
            <Activity className="text-green-400" size={20} />
            <span>Recent Activity</span>
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
                      From {formatAddress(activity.from)}
                    </div>
                  </div>
                  <div className="text-xs text-shadow-400">
                    {formatTime(activity.timestamp)}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Network Statistics */}
        <div className="shadow-card">
          <h3 className="text-xl font-semibold mb-4 flex items-center space-x-2">
            <BarChart3 className="text-purple-400" size={20} />
            <span>Network Statistics</span>
          </h3>
          
          <div className="space-y-4">
            <div className="flex justify-between items-center p-3 bg-shadow-700 rounded-lg">
              <span className="text-shadow-300">Message Fee</span>
              <span className="font-semibold text-shadow-50">
                {parseFloat(networkStats.messageFee).toFixed(4)} ETH
              </span>
            </div>
            
            <div className="flex justify-between items-center p-3 bg-shadow-700 rounded-lg">
              <span className="text-shadow-300">Total Shards</span>
              <span className="font-semibold text-shadow-50">
                {networkStats.totalShards}
              </span>
            </div>
            
            <div className="flex justify-between items-center p-3 bg-shadow-700 rounded-lg">
              <span className="text-shadow-300">Network Messages</span>
              <span className="font-semibold text-shadow-50">
                {networkStats.totalNetworkMessages.toLocaleString()}
              </span>
            </div>
          </div>

          <div className="mt-6 p-4 bg-blue-900/20 border border-blue-600/50 rounded-lg">
            <h4 className="font-semibold text-blue-400 mb-2">Network Info</h4>
            <div className="text-sm text-blue-200 space-y-1">
              <p>• ShadowChat uses sharded contracts for scalability</p>
              <p>• Messages are routed based on receiver hash</p>
              <p>• All data is stored on-chain for decentralization</p>
            </div>
          </div>
        </div>
      </div>

      {/* Message Distribution Chart Placeholder */}
      <div className="shadow-card">
        <h3 className="text-xl font-semibold mb-4 flex items-center space-x-2">
          <BarChart3 className="text-blue-400" size={20} />
          <span>Message Activity Over Time</span>
        </h3>
        
        <div className="h-64 flex items-center justify-center bg-shadow-700 rounded-lg">
          <div className="text-center text-shadow-400">
            <BarChart3 size={48} className="mx-auto mb-2 opacity-50" />
            <p>Chart visualization coming soon</p>
            <p className="text-xs">Will show message activity trends over time</p>
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
/**
 * CreditManager Component
 * 
 * Handles ETH credit deposits and withdrawals for message functionality.
 * 
 * Features:
 * - Display current credit balance and message capacity
 * - Deposit ETH credits to receiver hash
 * - Withdraw unused credits with proper authorization
 * - Real-time balance updates and transaction feedback
 * 
 * Credit System:
 * - Credits stored in smart contract under receiver hash
 * - Anyone can deposit credits to any receiver hash
 * - Only secret code holder can withdraw credits
 * - Message fee deducted from credits when sending messages
 * 
 * Security:
 * - Withdrawal requires two-step process: authorize + withdraw
 * - Secret code used for withdrawal authorization
 * - Comprehensive validation and error handling
 * - User-friendly transaction feedback
 */

import React, { useState, useEffect } from 'react';
import { Coins, Plus, Minus, RefreshCw, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';

const CreditManager = ({ web3Service, userIdentity }) => {
  const [balance, setBalance] = useState('0');
  const [depositAmount, setDepositAmount] = useState('');
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [messageFee, setMessageFee] = useState('0');
  const [isLoading, setIsLoading] = useState(false);
  const [isDepositing, setIsDepositing] = useState(false);
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  const [isListening, setIsListening] = useState(false);

  // Load balance and fees
  const loadData = async () => {
    if (!userIdentity || !web3Service) return;

    setIsLoading(true);
    try {
      const [currentBalance, currentMessageFee] = await Promise.all([
        web3Service.getCreditBalance(userIdentity.receiverHash),
        web3Service.getMessageFee()
      ]);
      
      setBalance(currentBalance);
      setMessageFee(currentMessageFee);
    } catch (error) {
      console.error('Failed to load credit data:', error);
      toast.error('Failed to load credit information');
    } finally {
      setIsLoading(false);
    }
  };

  // Load data on component mount and when identity changes
  useEffect(() => {
    loadData();
  }, [userIdentity, web3Service]);

  // Set up real-time credit event listening
  useEffect(() => {
    if (!userIdentity || !web3Service || isListening) return;

    let unsubscribe;

    const startListening = async () => {
      try {
        unsubscribe = await web3Service.listenForCreditEvents(
          userIdentity.receiverHash,
          {
            onDeposit: (eventData) => {
              console.log('🪙 Credit deposited:', eventData);
              setBalance(eventData.totalBalance);
              toast.success(`Credits deposited! New balance: ${eventData.totalBalance} ETH`);
            },
            onWithdraw: (eventData) => {
              console.log('💰 Credit withdrawn:', eventData);
              setBalance(eventData.remainingBalance);
              toast.success(`Credits withdrawn! Remaining balance: ${eventData.remainingBalance} ETH`);
            }
          }
        );
        setIsListening(true);
      } catch (error) {
        console.error('Failed to start credit event listening:', error);
        toast.error('Failed to start real-time balance updates');
      }
    };

    startListening();

    // Cleanup function
    return () => {
      if (unsubscribe) {
        unsubscribe();
        setIsListening(false);
      }
    };
  }, [userIdentity, web3Service, isListening]);

  const handleDeposit = async () => {
    if (!depositAmount || parseFloat(depositAmount) <= 0) {
      toast.error('Please enter a valid deposit amount');
      return;
    }

    setIsDepositing(true);
    try {
      const tx = await web3Service.depositCredit(
        userIdentity.receiverHash,
        depositAmount
      );
      
      toast.success(`Deposit transaction submitted! ${depositAmount} ETH`);
      setDepositAmount('');
      
      // Balance will be updated automatically via event listener
    } catch (error) {
      console.error('Deposit failed:', error);
      toast.error(error.message || 'Deposit failed');
    } finally {
      setIsDepositing(false);
    }
  };

  const handleWithdraw = async () => {
    if (!withdrawAmount || parseFloat(withdrawAmount) <= 0) {
      toast.error('Please enter a valid withdrawal amount');
      return;
    }

    if (parseFloat(withdrawAmount) > parseFloat(balance)) {
      toast.error('Insufficient balance');
      return;
    }

    if (!userIdentity.secretCode) {
      toast.error('Secret code is required for withdrawal authorization');
      return;
    }

    setIsWithdrawing(true);
    try {
      // First, authorize the withdrawal using the secret code
      const walletAddress = await web3Service.getWalletAddress();
      
      toast.info('Step 1/2: Authorizing withdrawal...');
      
      const authTx = await web3Service.authorizeWithdrawal(
        userIdentity.receiverHash,
        walletAddress,
        userIdentity.secretCode
      );
      
      toast.info('Step 2/2: Processing withdrawal...');
      
      // Then perform the actual withdrawal
      const withdrawTx = await web3Service.withdrawCredit(
        userIdentity.receiverHash,
        withdrawAmount
      );
      
      toast.success(`Withdrawal transaction submitted! ${withdrawAmount} ETH`);
      setWithdrawAmount('');
      
      // Balance will be updated automatically via event listener
    } catch (error) {
      console.error('Withdrawal failed:', error);
      toast.error(error.message || 'Withdrawal failed');
    } finally {
      setIsWithdrawing(false);
    }
  };

  const calculateMaxMessages = () => {
    if (parseFloat(balance) === 0 || parseFloat(messageFee) === 0) return 0;
    return Math.floor(parseFloat(balance) / parseFloat(messageFee));
  };

  if (!userIdentity) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="shadow-card text-center">
          <AlertCircle className="mx-auto text-yellow-400 mb-4" size={48} />
          <h3 className="text-xl font-semibold mb-2">No Identity Found</h3>
          <p className="text-shadow-300">
            Please create or import an identity first to manage your credits.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold mb-4">💰 Credit Management</h2>
        <p className="text-shadow-300 max-w-2xl mx-auto">
          Credits are required to send messages. Anyone can deposit credits to your receiver hash, 
          but only you can withdraw them (with proper authorization).
        </p>
      </div>

      {/* Current Balance Card */}
      <div className="shadow-card">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <Coins className="text-green-400" size={24} />
            <h3 className="text-xl font-semibold">Current Balance</h3>
            {/* Real-time status indicator */}
            <div className={`flex items-center space-x-1 text-xs px-2 py-1 rounded-full ${
              isListening ? 'bg-green-900/30 text-green-400' : 'bg-gray-900/30 text-gray-400'
            }`}>
              <div className={`w-2 h-2 rounded-full ${
                isListening ? 'bg-green-400 animate-pulse' : 'bg-gray-400'
              }`}></div>
              <span>{isListening ? 'Live Updates' : 'Static'}</span>
            </div>
          </div>
          <button
            onClick={loadData}
            disabled={isLoading}
            className="shadow-button p-2"
            title="Refresh balance"
          >
            <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
          </button>
        </div>

        <div className="grid md:grid-cols-3 gap-4">
          <div className="text-center p-4 bg-shadow-700 rounded-lg">
            <div className="text-2xl font-bold text-green-400">
              {isLoading ? '...' : `${parseFloat(balance).toFixed(4)} ETH`}
            </div>
            <div className="text-sm text-shadow-300">Available Balance</div>
          </div>

          <div className="text-center p-4 bg-shadow-700 rounded-lg">
            <div className="text-2xl font-bold text-blue-400">
              {isLoading ? '...' : calculateMaxMessages()}
            </div>
            <div className="text-sm text-shadow-300">Max Messages</div>
          </div>

          <div className="text-center p-4 bg-shadow-700 rounded-lg">
            <div className="text-2xl font-bold text-purple-400">
              {isLoading ? '...' : `${parseFloat(messageFee).toFixed(4)} ETH`}
            </div>
            <div className="text-sm text-shadow-300">Message Fee</div>
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Deposit Credits */}
        <div className="shadow-card">
          <div className="flex items-center space-x-2 mb-4">
            <Plus className="text-green-400" size={24} />
            <h3 className="text-xl font-semibold">Deposit Credits</h3>
          </div>

          <p className="text-shadow-300 mb-4">
            Add ETH to your credit balance to enable message sending.
          </p>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-shadow-300 mb-2">
                Amount (ETH)
              </label>
              <input
                type="number"
                step="0.001"
                min="0"
                value={depositAmount}
                onChange={(e) => setDepositAmount(e.target.value)}
                placeholder="0.01"
                className="shadow-input w-full"
              />
            </div>

            {/* Quick Amount Buttons */}
            <div className="flex space-x-2">
              {['0.01', '0.05', '0.1'].map(amount => (
                <button
                  key={amount}
                  onClick={() => setDepositAmount(amount)}
                  className="shadow-button text-xs px-3 py-1"
                >
                  {amount} ETH
                </button>
              ))}
            </div>

            <button
              onClick={handleDeposit}
              disabled={isDepositing || !depositAmount}
              className="shadow-button-primary w-full"
            >
              {isDepositing ? 'Depositing...' : 'Deposit Credits'}
            </button>
          </div>

          {depositAmount && (
            <div className="mt-4 p-3 bg-blue-900/20 border border-blue-600/50 rounded-lg">
              <div className="text-sm text-blue-200">
                This will enable approximately{' '}
                <strong>
                  {Math.floor(parseFloat(depositAmount || 0) / parseFloat(messageFee || 1))}
                </strong>{' '}
                messages
              </div>
            </div>
          )}
        </div>

        {/* Withdraw Credits */}
        <div className="shadow-card">
          <div className="flex items-center space-x-2 mb-4">
            <Minus className="text-red-400" size={24} />
            <h3 className="text-xl font-semibold">Withdraw Credits</h3>
          </div>

          <p className="text-shadow-300 mb-4">
            Withdraw your unused credits back to your wallet.
          </p>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-shadow-300 mb-2">
                Amount (ETH)
              </label>
              <input
                type="number"
                step="0.001"
                min="0"
                max={balance}
                value={withdrawAmount}
                onChange={(e) => setWithdrawAmount(e.target.value)}
                placeholder="0.01"
                className="shadow-input w-full"
              />
            </div>

            {/* Quick Amount Buttons */}
            <div className="flex space-x-2">
              <button
                onClick={() => setWithdrawAmount((parseFloat(balance) * 0.25).toFixed(4))}
                className="shadow-button text-xs px-3 py-1"
                disabled={parseFloat(balance) === 0}
              >
                25%
              </button>
              <button
                onClick={() => setWithdrawAmount((parseFloat(balance) * 0.5).toFixed(4))}
                className="shadow-button text-xs px-3 py-1"
                disabled={parseFloat(balance) === 0}
              >
                50%
              </button>
              <button
                onClick={() => setWithdrawAmount(balance)}
                className="shadow-button text-xs px-3 py-1"
                disabled={parseFloat(balance) === 0}
              >
                Max
              </button>
            </div>

            <button
              onClick={handleWithdraw}
              disabled={isWithdrawing || !withdrawAmount || parseFloat(balance) === 0}
              className="shadow-button w-full text-red-400 border-red-400/50 hover:bg-red-900/20"
            >
              {isWithdrawing ? 'Withdrawing...' : 'Withdraw Credits'}
            </button>
          </div>

          <div className="mt-4 p-3 bg-yellow-900/20 border border-yellow-600/50 rounded-lg">
            <div className="text-sm text-yellow-200">
              <strong>Note:</strong> Withdrawal requires additional authorization steps 
              involving your secret code for security.
            </div>
          </div>
        </div>
      </div>

      {/* Info Section */}
      <div className="shadow-card bg-blue-900/20 border-blue-600/50">
        <h4 className="font-semibold text-blue-400 mb-3">How Credits Work</h4>
        <div className="grid md:grid-cols-2 gap-4 text-sm text-blue-200">
          <ul className="space-y-2">
            <li>• Credits are held in the smart contract</li>
            <li>• Each message sent consumes one message fee worth of credits</li>
            <li>• Anyone can deposit credits to any receiver hash</li>
          </ul>
          <ul className="space-y-2">
            <li>• Only the owner of the secret code can withdraw</li>
            <li>• Withdrawal requires authorization with your secret code</li>
            <li>• Credits enable spam protection through economic cost</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default CreditManager;
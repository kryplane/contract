/**
 * ShadowChat Web3 Integration Service
 * 
 * This service provides a clean interface for interacting with ShadowChat smart contracts.
 * It handles wallet connection, contract interactions, and provides user-friendly error handling.
 * 
 * Key Features:
 * - Dynamic contract address configuration via environment variables
 * - Comprehensive error handling with user-friendly messages
 * - Credit deposit and withdrawal with proper authorization
 * - Message sending with balance validation
 * - Debug logging for development
 * 
 * @author ShadowChat Team
 */

import { ethers } from 'ethers';

// Contract ABIs (simplified versions based on the interface)
// These ABIs define the functions and events we can interact with

/**
 * ShadowChat Shard Contract ABI
 * Contains functions for messaging and credit management
 */
export const SHADOWCHAT_ABI = [
  // Events for listening to contract state changes
  "event MessageSent(uint256 indexed messageId, address indexed sender, bytes32 indexed receiverHash, string encryptedContent, uint256 timestamp)",
  "event CreditDeposited(bytes32 indexed receiverHash, uint256 amount, uint256 totalBalance)",
  "event CreditWithdrawn(bytes32 indexed receiverHash, address withdrawer, uint256 amount, uint256 remainingBalance)",
  
  // Core messaging and credit functions
  "function sendMessage(bytes32 receiverHash, string calldata encryptedContent)",
  "function depositCredit(bytes32 receiverHash) payable",
  "function withdrawCredit(bytes32 receiverHash, uint256 amount)",
  "function authorizeWithdrawal(bytes32 receiverHash, address withdrawer, string calldata secretCode)",
  "function getCreditBalance(bytes32 receiverHash) view returns (uint256)",
  "function messageFee() view returns (uint256)",
  "function withdrawalFee() view returns (uint256)",
  "function totalMessages() view returns (uint256)"
];

/**
 * ShadowChat Factory Contract ABI
 * Used for shard discovery and configuration
 */
export const FACTORY_ABI = [
  "event ShardDeployed(uint256 indexed shardId, address shardAddress)",
  "function getShardForReceiver(bytes32 receiverHash) view returns (address, uint256)",
  "function getAllShards() view returns (address[])",
  "function totalShards() view returns (uint256)",
  "function messageFee() view returns (uint256)",
  "function withdrawalFee() view returns (uint256)"
];

/**
 * Get contract addresses from environment variables with fallbacks
 * This allows for dynamic configuration across different deployments
 * 
 * @returns {Object} Contract addresses
 */
export const getContractAddresses = () => {
  return {
    factory: import.meta.env.VITE_FACTORY_ADDRESS || "0x5FbDB2315678afecb367f032d93F642f64180aa3",
    batch: import.meta.env.VITE_BATCH_ADDRESS || "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512"
  };
};

/**
 * Get network configuration from environment variables
 * Supports different networks and debug modes
 * 
 * @returns {Object} Network configuration
 */
export const getNetworkConfig = () => {
  return {
    chainId: parseInt(import.meta.env.VITE_CHAIN_ID) || 31337,
    networkName: import.meta.env.VITE_NETWORK_NAME || "localhost",
    debugMode: import.meta.env.VITE_DEBUG_MODE === "true" || false
  };
};

/**
 * Main Web3 Service Class
 * 
 * Provides a unified interface for all ShadowChat smart contract interactions.
 * Handles wallet connection, contract instantiation, and error management.
 */
export class Web3Service {
  constructor() {
    this.provider = null;
    this.signer = null;
    this.factoryContract = null;
    this.contracts = new Map(); // Cache for shard contracts to improve performance
    this.config = getNetworkConfig();
    
    // Log debug information if enabled
    if (this.config.debugMode) {
      console.log('🔧 Web3Service initialized with config:', this.config);
      console.log('📍 Contract addresses:', getContractAddresses());
    }
  }

  /**
   * Connect to user's wallet (MetaMask)
   * 
   * Initializes the Web3 provider, requests account access, and sets up
   * the factory contract connection. Also validates network compatibility.
   * 
   * @returns {Promise<boolean>} True if connection successful
   * @throws {Error} If wallet not available or connection fails
   */
  async connect() {
    if (typeof window.ethereum !== 'undefined') {
      try {
        await window.ethereum.request({ method: 'eth_requestAccounts' });
        this.provider = new ethers.BrowserProvider(window.ethereum);
        this.signer = await this.provider.getSigner();
        
        // Check if we're on the correct network
        const network = await this.provider.getNetwork();
        if (this.config.debugMode) {
          console.log(`🌐 Connected to network: ${network.name} (Chain ID: ${network.chainId})`);
        }
        
        // Initialize factory contract with dynamic address
        const contractAddresses = getContractAddresses();
        this.factoryContract = new ethers.Contract(
          contractAddresses.factory,
          FACTORY_ABI,
          this.signer
        );
        
        if (this.config.debugMode) {
          console.log(`🏭 Factory contract initialized at: ${contractAddresses.factory}`);
        }
        
        return true;
      } catch (error) {
        console.error('Failed to connect to wallet:', error);
        throw error;
      }
    } else {
      throw new Error('MetaMask is not installed');
    }
  }

  /**
   * Get the appropriate shard contract for a receiver hash
   * 
   * Uses the factory contract to determine which shard handles messages
   * for a specific receiver hash. Implements caching for performance.
   * 
   * @param {string} receiverHash - The keccak256 hash of the secret code
   * @returns {Promise<Contract>} The shard contract instance
   * @throws {Error} If factory not initialized or shard not found
   */
  async getShardContract(receiverHash) {
    if (!this.factoryContract) {
      throw new Error('Factory contract not initialized');
    }

    // Check cache first to avoid unnecessary calls
    const cacheKey = receiverHash.toString();
    if (this.contracts.has(cacheKey)) {
      return this.contracts.get(cacheKey);
    }

    // Get shard address from factory
    const [shardAddress] = await this.factoryContract.getShardForReceiver(receiverHash);
    
    // Create contract instance
    const shardContract = new ethers.Contract(
      shardAddress,
      SHADOWCHAT_ABI,
      this.signer
    );

    // Cache it for future use
    this.contracts.set(cacheKey, shardContract);
    
    return shardContract;
  }

  /**
   * Generate a receiver hash from a secret code
   * 
   * This creates the pseudonymous identifier used for receiving messages.
   * The same secret code will always produce the same hash.
   * 
   * @param {string} secretCode - The user's secret code
   * @returns {string} The keccak256 hash as a hex string
   */
  generateReceiverHash(secretCode) {
    return ethers.keccak256(ethers.toUtf8Bytes(secretCode));
  }

  /**
   * Deposit credits to a receiver hash
   * 
   * Allows anyone to add ETH credits to a receiver hash, enabling message reception.
   * Includes comprehensive validation and user-friendly error handling.
   * 
   * @param {string} receiverHash - The target receiver hash
   * @param {string|number} amount - Amount in ETH to deposit
   * @returns {Promise<TransactionReceipt>} Transaction receipt
   * @throws {Error} For validation failures or transaction errors
   */
  async depositCredit(receiverHash, amount) {
    // Input validation
    if (!receiverHash) {
      throw new Error('Receiver hash is required');
    }
    
    if (!amount || parseFloat(amount) <= 0) {
      throw new Error('Amount must be greater than 0');
    }

    try {
      const shardContract = await this.getShardContract(receiverHash);
      const amountWei = ethers.parseEther(amount.toString());
      
      if (this.config.debugMode) {
        console.log(`💰 Depositing ${amount} ETH to ${receiverHash}`);
      }
      
      const tx = await shardContract.depositCredit(receiverHash, { 
        value: amountWei 
      });
      
      if (this.config.debugMode) {
        console.log(`📝 Transaction sent: ${tx.hash}`);
      }
      
      const receipt = await tx.wait();
      
      if (this.config.debugMode) {
        console.log(`✅ Transaction confirmed in block ${receipt.blockNumber}`);
      }
      
      return receipt;
    } catch (error) {
      console.error('Deposit failed:', error);
      
      // Provide user-friendly error messages
      if (error.code === 'INSUFFICIENT_FUNDS') {
        throw new Error('Insufficient funds in wallet');
      } else if (error.code === 'USER_REJECTED') {
        throw new Error('Transaction rejected by user');
      } else if (error.message.includes('execution reverted')) {
        throw new Error('Transaction failed: ' + (error.reason || 'Contract execution reverted'));
      } else {
        throw new Error(error.message || 'Deposit failed');
      }
    }
  }

  async sendMessage(receiverHash, encryptedContent) {
    if (!receiverHash) {
      throw new Error('Receiver hash is required');
    }
    
    if (!encryptedContent) {
      throw new Error('Message content is required');
    }

    try {
      const shardContract = await this.getShardContract(receiverHash);
      
      // Check if receiver has sufficient credits first
      const balance = await this.getCreditBalance(receiverHash);
      const messageFee = await this.getMessageFee();
      
      if (parseFloat(balance) < parseFloat(messageFee)) {
        throw new Error(`Insufficient credits. Balance: ${balance} ETH, Required: ${messageFee} ETH`);
      }
      
      if (this.config.debugMode) {
        console.log(`📤 Sending message to ${receiverHash}`);
        console.log(`💬 Content length: ${encryptedContent.length} characters`);
      }
      
      const tx = await shardContract.sendMessage(receiverHash, encryptedContent);
      
      if (this.config.debugMode) {
        console.log(`📝 Transaction sent: ${tx.hash}`);
      }
      
      const receipt = await tx.wait();
      
      if (this.config.debugMode) {
        console.log(`✅ Message sent successfully in block ${receipt.blockNumber}`);
      }
      
      return receipt;
    } catch (error) {
      console.error('Send message failed:', error);
      
      if (error.code === 'USER_REJECTED') {
        throw new Error('Transaction rejected by user');
      } else if (error.message.includes('execution reverted')) {
        throw new Error('Message sending failed: ' + (error.reason || 'Contract execution reverted'));
      } else {
        throw new Error(error.message || 'Failed to send message');
      }
    }
  }

  async getCreditBalance(receiverHash) {
    if (!receiverHash) {
      throw new Error('Receiver hash is required');
    }

    try {
      const shardContract = await this.getShardContract(receiverHash);
      const balance = await shardContract.getCreditBalance(receiverHash);
      return ethers.formatEther(balance);
    } catch (error) {
      console.error('Failed to get credit balance:', error);
      throw new Error('Failed to retrieve credit balance');
    }
  }

  async getMessageFee() {
    try {
      await this.checkContractAvailability();
      const fee = await this.factoryContract.messageFee();
      return ethers.formatEther(fee);
    } catch (error) {
      console.error('Failed to get message fee:', error);
      throw new Error('Failed to retrieve message fee');
    }
  }

  async listenForMessages(receiverHash, callback) {
    const shardContract = await this.getShardContract(receiverHash);
    
    // Listen for new MessageSent events
    const filter = shardContract.filters.MessageSent(null, null, receiverHash);
    
    shardContract.on(filter, (messageId, sender, receiverHash, encryptedContent, timestamp, event) => {
      callback({
        messageId: messageId.toString(),
        sender,
        receiverHash,
        encryptedContent,
        timestamp: timestamp.toString(),
        blockNumber: event.blockNumber,
        transactionHash: event.transactionHash
      });
    });

    return () => {
      shardContract.removeAllListeners(filter);
    };
  }

  /**
   * Listen for credit events (deposits and withdrawals) for a specific receiver hash
   * @param {string} receiverHash - The receiver hash to listen for
   * @param {Object} callbacks - Object containing onDeposit and onWithdraw callback functions
   * @returns {Function} Cleanup function to stop listening
   */
  async listenForCreditEvents(receiverHash, callbacks) {
    const shardContract = await this.getShardContract(receiverHash);
    
    // Listen for CreditDeposited events
    const depositFilter = shardContract.filters.CreditDeposited(receiverHash);
    const withdrawFilter = shardContract.filters.CreditWithdrawn(receiverHash);
    
    if (callbacks.onDeposit) {
      shardContract.on(depositFilter, (receiverHash, amount, totalBalance, event) => {
        callbacks.onDeposit({
          receiverHash,
          amount: amount.toString(),
          totalBalance: totalBalance.toString(),
          blockNumber: event.blockNumber,
          transactionHash: event.transactionHash,
          timestamp: Date.now()
        });
      });
    }

    if (callbacks.onWithdraw) {
      shardContract.on(withdrawFilter, (receiverHash, withdrawer, amount, remainingBalance, event) => {
        callbacks.onWithdraw({
          receiverHash,
          withdrawer,
          amount: amount.toString(),
          remainingBalance: remainingBalance.toString(),
          blockNumber: event.blockNumber,
          transactionHash: event.transactionHash,
          timestamp: Date.now()
        });
      });
    }

    return () => {
      shardContract.removeAllListeners(depositFilter);
      shardContract.removeAllListeners(withdrawFilter);
    };
  }

  async getHistoricalMessages(receiverHash, fromBlock = 0) {
    const shardContract = await this.getShardContract(receiverHash);
    const filter = shardContract.filters.MessageSent(null, null, receiverHash);
    const events = await shardContract.queryFilter(filter, fromBlock);
    
    return events.map(event => ({
      messageId: event.args.messageId.toString(),
      sender: event.args.sender,
      receiverHash: event.args.receiverHash,
      encryptedContent: event.args.encryptedContent,
      timestamp: event.args.timestamp.toString(),
      blockNumber: event.blockNumber,
      transactionHash: event.transactionHash
    }));
  }

  async getWalletAddress() {
    if (!this.signer) {
      throw new Error('Wallet not connected');
    }
    return await this.signer.getAddress();
  }

  /**
   * Check if contracts are deployed and accessible
   */
  async checkContractAvailability() {
    if (!this.factoryContract) {
      throw new Error('Factory contract not initialized');
    }

    try {
      // Try to call a simple view function to check if contract exists
      await this.factoryContract.totalShards();
      return true;
    } catch (error) {
      if (this.config.debugMode) {
        console.error('Contract availability check failed:', error);
      }
      throw new Error('Contract not found or not deployed. Please check contract addresses.');
    }
  }

  /**
   * Get network information
   */
  async getNetworkInfo() {
    if (!this.provider) {
      throw new Error('Provider not initialized');
    }
    
    const network = await this.provider.getNetwork();
    const balance = await this.provider.getBalance(await this.signer.getAddress());
    
    return {
      chainId: network.chainId.toString(),
      name: network.name,
      balance: ethers.formatEther(balance)
    };
  }

  /**
   * Get factory contract information
   */
  async getFactoryInfo() {
    await this.checkContractAvailability();
    
    const [totalShards, messageFee, withdrawalFee] = await Promise.all([
      this.factoryContract.totalShards(),
      this.factoryContract.messageFee(),
      this.factoryContract.withdrawalFee()
    ]);

    return {
      totalShards: totalShards.toString(),
      messageFee: ethers.formatEther(messageFee),
      withdrawalFee: ethers.formatEther(withdrawalFee),
      address: await this.factoryContract.getAddress()
    };
  }

  /**
   * Authorize withdrawal for a specific receiver hash
   */
  async authorizeWithdrawal(receiverHash, withdrawer, secretCode) {
    if (!receiverHash || !withdrawer || !secretCode) {
      throw new Error('All parameters are required for withdrawal authorization');
    }

    try {
      const shardContract = await this.getShardContract(receiverHash);
      
      if (this.config.debugMode) {
        console.log(`🔐 Authorizing withdrawal for ${receiverHash}`);
      }
      
      const tx = await shardContract.authorizeWithdrawal(receiverHash, withdrawer, secretCode);
      
      if (this.config.debugMode) {
        console.log(`📝 Authorization transaction sent: ${tx.hash}`);
      }
      
      const receipt = await tx.wait();
      
      if (this.config.debugMode) {
        console.log(`✅ Withdrawal authorized in block ${receipt.blockNumber}`);
      }
      
      return receipt;
    } catch (error) {
      console.error('Authorization failed:', error);
      
      if (error.code === 'USER_REJECTED') {
        throw new Error('Transaction rejected by user');
      } else if (error.message.includes('Invalid secret code')) {
        throw new Error('Invalid secret code provided');
      } else if (error.message.includes('execution reverted')) {
        throw new Error('Authorization failed: ' + (error.reason || 'Contract execution reverted'));
      } else {
        throw new Error(error.message || 'Failed to authorize withdrawal');
      }
    }
  }

  /**
   * Withdraw credits from a receiver hash
   */
  async withdrawCredit(receiverHash, amount) {
    if (!receiverHash || !amount || parseFloat(amount) <= 0) {
      throw new Error('Valid receiver hash and amount are required');
    }

    try {
      const shardContract = await this.getShardContract(receiverHash);
      const amountWei = ethers.parseEther(amount.toString());
      
      if (this.config.debugMode) {
        console.log(`💸 Withdrawing ${amount} ETH from ${receiverHash}`);
      }
      
      const tx = await shardContract.withdrawCredit(receiverHash, amountWei);
      
      if (this.config.debugMode) {
        console.log(`📝 Withdrawal transaction sent: ${tx.hash}`);
      }
      
      const receipt = await tx.wait();
      
      if (this.config.debugMode) {
        console.log(`✅ Withdrawal completed in block ${receipt.blockNumber}`);
      }
      
      return receipt;
    } catch (error) {
      console.error('Withdrawal failed:', error);
      
      if (error.code === 'USER_REJECTED') {
        throw new Error('Transaction rejected by user');
      } else if (error.message.includes('Not authorized')) {
        throw new Error('Withdrawal not authorized. Please authorize first with your secret code.');
      } else if (error.message.includes('Insufficient balance')) {
        throw new Error('Insufficient credit balance for withdrawal');
      } else if (error.message.includes('execution reverted')) {
        throw new Error('Withdrawal failed: ' + (error.reason || 'Contract execution reverted'));
      } else {
        throw new Error(error.message || 'Failed to withdraw credits');
      }
    }
  }
}
import { ethers } from 'ethers';

// Contract ABIs (simplified versions based on the interface)
export const SHADOWCHAT_ABI = [
  // Events
  "event MessageSent(uint256 indexed messageId, address indexed sender, bytes32 indexed receiverHash, string encryptedContent, uint256 timestamp)",
  "event CreditDeposited(bytes32 indexed receiverHash, uint256 amount, uint256 totalBalance)",
  "event CreditWithdrawn(bytes32 indexed receiverHash, address withdrawer, uint256 amount, uint256 remainingBalance)",
  
  // Functions
  "function sendMessage(bytes32 receiverHash, string calldata encryptedContent)",
  "function depositCredit(bytes32 receiverHash) payable",
  "function withdrawCredit(bytes32 receiverHash, uint256 amount)",
  "function authorizeWithdrawal(bytes32 receiverHash, address withdrawer, string calldata secretCode)",
  "function getCreditBalance(bytes32 receiverHash) view returns (uint256)",
  "function messageFee() view returns (uint256)",
  "function withdrawalFee() view returns (uint256)",
  "function totalMessages() view returns (uint256)"
];

export const FACTORY_ABI = [
  "event ShardDeployed(uint256 indexed shardId, address shardAddress)",
  "function getShardForReceiver(bytes32 receiverHash) view returns (address, uint256)",
  "function getAllShards() view returns (address[])",
  "function totalShards() view returns (uint256)",
  "function messageFee() view returns (uint256)",
  "function withdrawalFee() view returns (uint256)"
];

// Default contract addresses (will be configurable)
export const DEFAULT_CONTRACTS = {
  factory: "0x5FbDB2315678afecb367f032d93F642f64180aa3", // Default hardhat local
  batch: "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512"    // Default hardhat local
};

export class Web3Service {
  constructor() {
    this.provider = null;
    this.signer = null;
    this.factoryContract = null;
    this.contracts = new Map(); // Cache for shard contracts
  }

  async connect() {
    if (typeof window.ethereum !== 'undefined') {
      try {
        await window.ethereum.request({ method: 'eth_requestAccounts' });
        this.provider = new ethers.BrowserProvider(window.ethereum);
        this.signer = await this.provider.getSigner();
        
        // Initialize factory contract
        this.factoryContract = new ethers.Contract(
          DEFAULT_CONTRACTS.factory,
          FACTORY_ABI,
          this.signer
        );
        
        return true;
      } catch (error) {
        console.error('Failed to connect to wallet:', error);
        throw error;
      }
    } else {
      throw new Error('MetaMask is not installed');
    }
  }

  async getShardContract(receiverHash) {
    if (!this.factoryContract) {
      throw new Error('Factory contract not initialized');
    }

    // Check cache first
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

    // Cache it
    this.contracts.set(cacheKey, shardContract);
    
    return shardContract;
  }

  generateReceiverHash(secretCode) {
    return ethers.keccak256(ethers.toUtf8Bytes(secretCode));
  }

  async depositCredit(receiverHash, amount) {
    const shardContract = await this.getShardContract(receiverHash);
    const tx = await shardContract.depositCredit(receiverHash, { 
      value: ethers.parseEther(amount.toString()) 
    });
    return await tx.wait();
  }

  async sendMessage(receiverHash, encryptedContent) {
    const shardContract = await this.getShardContract(receiverHash);
    const tx = await shardContract.sendMessage(receiverHash, encryptedContent);
    return await tx.wait();
  }

  async getCreditBalance(receiverHash) {
    const shardContract = await this.getShardContract(receiverHash);
    const balance = await shardContract.getCreditBalance(receiverHash);
    return ethers.formatEther(balance);
  }

  async getMessageFee() {
    if (!this.factoryContract) {
      throw new Error('Factory contract not initialized');
    }
    const fee = await this.factoryContract.messageFee();
    return ethers.formatEther(fee);
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
}
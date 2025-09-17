const { ethers } = require("hardhat");
const fs = require('fs');
const path = require('path');
const { IPFSClient } = require('./utils/ipfs');

class ShadowChatClient {
  constructor(factoryAddress, batchAddress, signer) {
    this.factoryAddress = factoryAddress;
    this.batchAddress = batchAddress;
    this.signer = signer;
    // Initialize IPFS client for off-chain message storage
    this.ipfs = new IPFSClient();
  }
  
  async init() {
    const ShadowChatFactory = await ethers.getContractFactory("ShadowChatFactory");
    const ShadowChatBatch = await ethers.getContractFactory("ShadowChatBatch");
    const ShadowChat = await ethers.getContractFactory("ShadowChat");
    
    this.factory = ShadowChatFactory.attach(this.factoryAddress);
    this.batch = ShadowChatBatch.attach(this.batchAddress);
    
    console.log(`🏭 Factory: ${this.factoryAddress}`);
    console.log(`📦 Batch Helper: ${this.batchAddress}`);
    console.log(`👤 User: ${this.signer.address}`);
    
    // Show IPFS status
    const ipfsStatus = this.ipfs.getStatus();
    console.log(`📡 IPFS Backend: ${ipfsStatus.backend} (${ipfsStatus.configured ? 'Configured' : 'Not Configured'})`);
    console.log("");
    
    // Load shards
    this.shards = await this.factory.getAllShards();
    console.log(`🗂️ Loaded ${this.shards.length} shards:`);
    this.shards.forEach((shard, i) => {
      console.log(`   Shard ${i}: ${shard}`);
    });
    console.log("");
  }
  
  generateReceiverHash(secretCode) {
    return ethers.keccak256(ethers.toUtf8Bytes(secretCode));
  }
  
  async getShardForReceiver(receiverHash) {
    return await this.factory.getShardForReceiver(receiverHash);
  }
  
  async depositCredit(receiverHash, amount) {
    console.log(`💰 Nạp credit: ${ethers.formatEther(amount)} ETH`);
    console.log(`   Receiver: ${receiverHash.substring(0, 10)}...`);
    
    const shardAddress = await this.getShardForReceiver(receiverHash);
    const ShadowChat = await ethers.getContractFactory("ShadowChat");
    const shard = ShadowChat.attach(shardAddress);
    
    const tx = await shard.depositCredit(receiverHash, { value: amount });
    await tx.wait();
    
    const balance = await shard.getCredit(receiverHash);
    console.log(`✅ Nạp thành công! Balance: ${ethers.formatEther(balance)} ETH\n`);
    
    return tx.hash;
  }
  
  async sendMessage(receiverHash, messageCid) {
    console.log(`📨 Gửi tin nhắn với CID có sẵn:`);
    console.log(`   Receiver: ${receiverHash.substring(0, 10)}...`);
    console.log(`   IPFS CID: ${messageCid}`);
    
    const shardAddress = await this.getShardForReceiver(receiverHash);
    const ShadowChat = await ethers.getContractFactory("ShadowChat");
    const shard = ShadowChat.attach(shardAddress);
    
    // Check balance
    const balance = await shard.getCredit(receiverHash);
    const messageFee = await this.factory.messageFee();
    
    if (balance < messageFee) {
      throw new Error(`❌ Không đủ credit! Cần: ${ethers.formatEther(messageFee)} ETH`);
    }
    
    const tx = await shard.sendMessage(receiverHash, messageCid);
    const receipt = await tx.wait();
    
    // Extract message event
    const messageEvent = receipt.logs.find(log => {
      try {
        const parsed = shard.interface.parseLog(log);
        return parsed.name === 'MessageSent';
      } catch (e) {
        return false;
      }
    });
    
    if (messageEvent) {
      const parsed = shard.interface.parseLog(messageEvent);
      console.log(`✅ Sent! ID: ${parsed.args.messageId}`);
    }
    
    const newBalance = await shard.getCredit(receiverHash);
    console.log(`💰 Credit: ${ethers.formatEther(newBalance)} ETH\n`);
    
    return tx.hash;
  }

  /**
   * Send message with automatic IPFS storage
   * Encrypts content and stores on IPFS, then sends CID to blockchain
   * @param {string} receiverHash - Target receiver's hash
   * @param {string} messageContent - Plain message content to encrypt and store
   * @param {string} encryptionKey - Key for encrypting the message
   * @returns {Promise<Object>} - Transaction hash and IPFS CID
   */
  async sendMessageWithIPFS(receiverHash, messageContent, encryptionKey) {
    console.log(`📨 Gửi tin nhắn với IPFS integration:`);
    console.log(`   Receiver: ${receiverHash.substring(0, 10)}...`);
    console.log(`   Content length: ${messageContent.length} characters`);
    
    try {
      // Encrypt the message content
      const encryptedContent = await this._encryptMessage(messageContent, encryptionKey);
      console.log(`🔐 Message encrypted (${encryptedContent.length} characters)`);
      
      // Store encrypted content on IPFS
      const ipfsCid = await this.ipfs.storeMessage(encryptedContent, {
        sender: this.signer.address,
        receiverHash: receiverHash,
        contentLength: messageContent.length
      });
      
      // Send the IPFS CID to blockchain
      const txHash = await this.sendMessage(receiverHash, ipfsCid);
      
      console.log(`🎯 Message sent successfully:`);
      console.log(`   IPFS CID: ${ipfsCid}`);
      console.log(`   Transaction: ${txHash}`);
      
      return {
        transactionHash: txHash,
        ipfsCid: ipfsCid,
        encryptedContent: encryptedContent
      };
      
    } catch (error) {
      console.error('❌ Failed to send message with IPFS:', error.message);
      throw error;
    }
  }
  
  async getMessages(receiverHash, fromBlock = 0) {
    console.log(`📬 Retrieving messages for: ${receiverHash.substring(0, 10)}...`);
    
    const shardAddress = await this.getShardForReceiver(receiverHash);
    const ShadowChat = await ethers.getContractFactory("ShadowChat");
    const shard = ShadowChat.attach(shardAddress);
    
    const filter = shard.filters.MessageSent(null, receiverHash);
    const events = await shard.queryFilter(filter, fromBlock);
    
    console.log(`📨 Tìm thấy ${events.length} tin nhắn:`);
    
    const messages = [];
    for (const event of events) {
      const message = {
        messageId: event.args.messageId.toString(),
        sender: event.args.sender,
        receiver: event.args.receiver,
        ipfsCid: event.args.encryptedContent, // This might be a CID or direct content
        timestamp: new Date(Number(event.args.timestamp) * 1000).toISOString(),
        blockNumber: event.blockNumber,
        transactionHash: event.transactionHash
      };
      
      messages.push(message);
      console.log(`   ID: ${message.messageId}`);
      console.log(`   From: ${message.sender}`);
      console.log(`   CID: ${message.ipfsCid}`);
      console.log(`   Time: ${message.timestamp}`);
      console.log("");
    }
    
    return messages;
  }

  /**
   * Get messages and retrieve content from IPFS
   * @param {string} receiverHash - Target receiver's hash
   * @param {string} decryptionKey - Key for decrypting messages
   * @param {number} fromBlock - Starting block number
   * @returns {Promise<Array>} - Array of messages with decrypted content
   */
  async getMessagesWithIPFS(receiverHash, decryptionKey, fromBlock = 0) {
    console.log(`📬 Retrieving messages with IPFS content for: ${receiverHash.substring(0, 10)}...`);
    
    const messages = await this.getMessages(receiverHash, fromBlock);
    
    console.log(`🔍 Processing ${messages.length} messages for IPFS content...`);
    
    for (const message of messages) {
      try {
        // Check if the content looks like an IPFS CID
        if (IPFSClient.isValidCID(message.ipfsCid)) {
          console.log(`📥 Retrieving IPFS content for CID: ${message.ipfsCid}`);
          
          // Retrieve content from IPFS
          const ipfsData = await this.ipfs.retrieveMessage(message.ipfsCid);
          message.encryptedContent = ipfsData.content;
          message.ipfsMetadata = {
            timestamp: ipfsData.timestamp,
            version: ipfsData.version
          };
          
          // Decrypt the content if decryption key is provided
          if (decryptionKey) {
            try {
              message.decryptedContent = await this._decryptMessage(message.encryptedContent, decryptionKey);
              console.log(`🔓 Message decrypted successfully`);
            } catch (decryptError) {
              console.log(`❌ Failed to decrypt message: ${decryptError.message}`);
              message.decryptedContent = '[DECRYPTION FAILED]';
            }
          }
          
          message.isFromIPFS = true;
        } else {
          // Content is stored directly on-chain (legacy mode)
          message.encryptedContent = message.ipfsCid;
          message.isFromIPFS = false;
          
          if (decryptionKey) {
            try {
              message.decryptedContent = await this._decryptMessage(message.encryptedContent, decryptionKey);
            } catch (decryptError) {
              message.decryptedContent = '[DECRYPTION FAILED]';
            }
          }
        }
      } catch (error) {
        console.error(`❌ Error processing message ${message.messageId}:`, error.message);
        message.error = error.message;
      }
    }
    
    return messages;
  }
  
  async getStats() {
    console.log("📊 System:");
    console.log("=".repeat(40));
    
    try {
      const totalMessages = await this.factory.getTotalMessages();
      const totalUsers = await this.factory.getTotalUsers();
      
      console.log(`📨 Total Messages: ${totalMessages}`);
      console.log(`👥 Total Users: ${totalUsers}`);
      
      for (let i = 0; i < this.shards.length; i++) {
        const ShadowChat = await ethers.getContractFactory("ShadowChat");
        const shard = ShadowChat.attach(this.shards[i]);
        
        const shardMessages = await shard.totalMessages();
        const shardUsers = await shard.totalUsers();
        
        console.log(`🗂️ Shard ${i}: ${shardMessages} messages, ${shardUsers} users`);
      }
    } catch (error) {
      console.log("❌ Error fetching stats:", error.message);
    }
    
    console.log("");
  }
  
  async withdrawCredit(receiverHash, amount) {
    console.log(`💸 Withdraw: ${ethers.formatEther(amount)} ETH`);
    console.log(`   Receiver: ${receiverHash.substring(0, 10)}...`);
    
    const shardAddress = await this.getShardForReceiver(receiverHash);
    const ShadowChat = await ethers.getContractFactory("ShadowChat");
    const shard = ShadowChat.attach(shardAddress);
    
    // Step 1: Authorize withdrawal
    const authTx = await shard.authorizeWithdrawal(receiverHash, amount);
    await authTx.wait();
    console.log(`✅ Withdrawal authorized`);
    
    // Step 2: Execute withdrawal
    const withdrawTx = await shard.withdrawCredit(receiverHash, amount);
    await withdrawTx.wait();
    
    const balance = await shard.getCredit(receiverHash);
    console.log(`✅ Withdraw successful! Balance: ${ethers.formatEther(balance)} ETH\n`);

    return withdrawTx.hash;
  }

  /**
   * Simple encryption using basic crypto operations
   * In production, use more robust encryption libraries
   * @private
   */
  async _encryptMessage(message, key) {
    if (!message || !key) {
      throw new Error('Message and key are required for encryption');
    }
    
    // For demo purposes, using a simple transformation
    // In production, use proper encryption libraries like crypto-js
    const crypto = require('crypto');
    const algorithm = 'aes-256-cbc';
    const keyHash = crypto.scryptSync(key, 'salt', 32);
    const iv = crypto.randomBytes(16);
    
    const cipher = crypto.createCipheriv(algorithm, keyHash, iv);
    let encrypted = cipher.update(message, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    // Combine iv and encrypted data
    return iv.toString('hex') + ':' + encrypted;
  }

  /**
   * Simple decryption using basic crypto operations
   * @private
   */
  async _decryptMessage(encryptedMessage, key) {
    if (!encryptedMessage || !key) {
      throw new Error('Encrypted message and key are required for decryption');
    }
    
    try {
      const crypto = require('crypto');
      const algorithm = 'aes-256-cbc';
      const keyHash = crypto.scryptSync(key, 'salt', 32);
      
      const parts = encryptedMessage.split(':');
      if (parts.length !== 2) {
        throw new Error('Invalid encrypted message format');
      }
      
      const iv = Buffer.from(parts[0], 'hex');
      const encrypted = parts[1];
      
      const decipher = crypto.createDecipheriv(algorithm, keyHash, iv);
      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      
      return decrypted;
    } catch (error) {
      throw new Error(`Decryption failed: ${error.message}`);
    }
  }
}

// Load deployment info
function loadDeploymentInfo(networkName) {
  const deployDir = path.join(__dirname, '..', 'deployments');
  
  if (!fs.existsSync(deployDir)) {
    throw new Error(`Directory not found: ${deployDir}`);
  }
  
  const files = fs.readdirSync(deployDir)
    .filter(file => file.startsWith(networkName) && file.endsWith('.json'))
    .sort()
    .reverse(); // Latest first
  
  if (files.length === 0) {
    throw new Error(`: ${networkName}`);
  }
  
  const latestFile = files[0];
  const filepath = path.join(deployDir, latestFile);
  
  console.log(`📋 Loading deployment: ${latestFile}`);
  return JSON.parse(fs.readFileSync(filepath, 'utf8'));
}

async function main() {
  const networkName = network.name;
  console.log(`🌐 Network: ${networkName.toUpperCase()}`);
  console.log("=".repeat(50));
  
  // Load deployment
  const deployment = loadDeploymentInfo(networkName);
  const [signer] = await ethers.getSigners();
  
  // Create client
  const client = new ShadowChatClient(
    deployment.factory.address,
    deployment.batch.address,
    signer
  );
  
  await client.init();
  
  // Show current stats
  await client.getStats();
  
  // Example usage - uncomment as needed
  /*
  // Generate a receiver hash for demo
  const secretCode = "my-secret-123";
  const receiverHash = client.generateReceiverHash(secretCode);
  console.log(`🔐 Generated receiver hash for "${secretCode}": ${receiverHash}\n`);
  
  // Deposit some credit
  const creditAmount = ethers.parseEther("0.01");
  await client.depositCredit(receiverHash, creditAmount);
  
  // Example 1: Send a message with IPFS CID (traditional way)
  const ipfsCid = "QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG"; // example CID
  await client.sendMessage(receiverHash, ipfsCid);
  
  // Example 2: Send a message with automatic IPFS integration (new way)
  const messageContent = "Hello! This message will be encrypted and stored on IPFS.";
  const encryptionKey = "my-secret-encryption-key";
  const result = await client.sendMessageWithIPFS(receiverHash, messageContent, encryptionKey);
  console.log("IPFS Integration Result:", result);
  
  // Get messages with IPFS content retrieval
  const messages = await client.getMessagesWithIPFS(receiverHash, encryptionKey);
  console.log("Messages with IPFS content:", messages);
  
  // Check stats again
  await client.getStats();
  */
  
  console.log("🎯 CLIENT READY!");
  console.log("Uncomment example usage in script to test interactions.");
  
  return client;
}

// Allow script to be imported as module
if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error("❌ Error:", error);
      process.exit(1);
    });
}

module.exports = { ShadowChatClient, loadDeploymentInfo };
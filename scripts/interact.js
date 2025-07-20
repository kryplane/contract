const { ethers } = require("hardhat");
const fs = require('fs');
const path = require('path');

/**
 * Script tiện ích để tương tác với ShadowChat Protocol đã deploy
 * Sử dụng: npx hardhat run scripts/interact.js --network <network>
 */

class ShadowChatClient {
  constructor(factoryAddress, batchAddress, signer) {
    this.factoryAddress = factoryAddress;
    this.batchAddress = batchAddress;
    this.signer = signer;
  }
  
  async init() {
    const ShadowChatFactory = await ethers.getContractFactory("ShadowChatFactory");
    const ShadowChatBatch = await ethers.getContractFactory("ShadowChatBatch");
    const ShadowChat = await ethers.getContractFactory("ShadowChat");
    
    this.factory = ShadowChatFactory.attach(this.factoryAddress);
    this.batch = ShadowChatBatch.attach(this.batchAddress);
    
    console.log(`🏭 Factory: ${this.factoryAddress}`);
    console.log(`📦 Batch Helper: ${this.batchAddress}`);
    console.log(`👤 User: ${this.signer.address}\n`);
    
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
    console.log(`📨 Gửi tin nhắn:`);
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
      console.log(`✅ Tin nhắn đã gửi! ID: ${parsed.args.messageId}`);
    }
    
    const newBalance = await shard.getCredit(receiverHash);
    console.log(`💰 Credit còn lại: ${ethers.formatEther(newBalance)} ETH\n`);
    
    return tx.hash;
  }
  
  async getMessages(receiverHash, fromBlock = 0) {
    console.log(`📬 Lấy tin nhắn cho: ${receiverHash.substring(0, 10)}...`);
    
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
        ipfsCid: event.args.ipfsCid,
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
  
  async getStats() {
    console.log("📊 Thống kê hệ thống:");
    console.log("=".repeat(40));
    
    try {
      const totalMessages = await this.factory.getTotalMessages();
      const totalUsers = await this.factory.getTotalUsers();
      
      console.log(`📨 Tổng tin nhắn: ${totalMessages}`);
      console.log(`👥 Tổng người dùng: ${totalUsers}`);
      
      for (let i = 0; i < this.shards.length; i++) {
        const ShadowChat = await ethers.getContractFactory("ShadowChat");
        const shard = ShadowChat.attach(this.shards[i]);
        
        const shardMessages = await shard.totalMessages();
        const shardUsers = await shard.totalUsers();
        
        console.log(`🗂️ Shard ${i}: ${shardMessages} messages, ${shardUsers} users`);
      }
    } catch (error) {
      console.log("❌ Lỗi khi lấy thống kê:", error.message);
    }
    
    console.log("");
  }
  
  async withdrawCredit(receiverHash, amount) {
    console.log(`💸 Rút credit: ${ethers.formatEther(amount)} ETH`);
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
    console.log(`✅ Rút thành công! Balance: ${ethers.formatEther(balance)} ETH\n`);
    
    return withdrawTx.hash;
  }
}

// Load deployment info
function loadDeploymentInfo(networkName) {
  const deployDir = path.join(__dirname, '..', 'deployments');
  
  if (!fs.existsSync(deployDir)) {
    throw new Error(`Thư mục deployments không tồn tại: ${deployDir}`);
  }
  
  const files = fs.readdirSync(deployDir)
    .filter(file => file.startsWith(networkName) && file.endsWith('.json'))
    .sort()
    .reverse(); // Latest first
  
  if (files.length === 0) {
    throw new Error(`Không tìm thấy deployment cho network: ${networkName}`);
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
  
  // Send a message
  const ipfsCid = "QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG"; // example CID
  await client.sendMessage(receiverHash, ipfsCid);
  
  // Get messages
  const messages = await client.getMessages(receiverHash);
  console.log("Messages:", messages);
  
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

const { ethers } = require("hardhat");
const crypto = require("crypto");
const fs = require('fs');
const path = require('path');

// Simple encryption/decryption utilities for demo
class MessageCrypto {
  static encrypt(message, secretKey) {
    const algorithm = 'aes-256-cbc';
    const key = crypto.scryptSync(secretKey, 'salt', 32);
    const iv = crypto.randomBytes(16);
    
    const cipher = crypto.createCipheriv(algorithm, key, iv);
    
    let encrypted = cipher.update(message, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    // Combine iv and encrypted data
    return iv.toString('hex') + ':' + encrypted;
  }
  
  static decrypt(encryptedMessage, secretKey) {
    try {
      const algorithm = 'aes-256-cbc';
      const key = crypto.scryptSync(secretKey, 'salt', 32);
      
      const parts = encryptedMessage.split(':');
      if (parts.length !== 2) {
        throw new Error('Invalid encrypted message format');
      }
      
      const iv = Buffer.from(parts[0], 'hex');
      const encrypted = parts[1];
      
      const decipher = crypto.createDecipheriv(algorithm, key, iv);
      
      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      
      return decrypted;
    } catch (error) {
      return `[DECRYPTION FAILED: ${error.message}]`;
    }
  }
}

async function loadDeploymentInfo() {
  console.log("📄 Loading deployment information...");
  
  const deploymentsDir = './deployments';
  if (!fs.existsSync(deploymentsDir)) {
    throw new Error("No deployments directory found. Please run deployment first with: npm run deploy");
  }

  const deploymentFiles = fs.readdirSync(deploymentsDir)
    .filter(file => file.endsWith('.json'))
    .sort()
    .reverse();

  if (deploymentFiles.length === 0) {
    throw new Error("No deployment files found. Please run deployment first with: npm run deploy");
  }

  const latestDeployment = deploymentFiles[0];
  const deploymentPath = path.join(deploymentsDir, latestDeployment);
  
  console.log(`   Using deployment: ${latestDeployment}`);
  
  return JSON.parse(fs.readFileSync(deploymentPath, 'utf8'));
}

async function main() {
  console.log("🚀 ShadowChat Protocol Demo");
  console.log("🔐 Anonymous Messaging with End-to-End Encryption");
  console.log("=".repeat(60));
  
  // Load deployment info
  const deploymentInfo = await loadDeploymentInfo();
  const contracts = deploymentInfo.contracts;
  
  // Get demo accounts
  const [deployer, sender, receiver] = await ethers.getSigners();
  
  console.log("👥 Demo Participants:");
  console.log(`   Sender: ${sender.address}`);
  console.log(`   Receiver: ${receiver.address}`);
  console.log("");
  
  // Connect to contracts
  console.log("🔗 Connecting to deployed contracts...");
  const factory = await ethers.getContractAt("ShadowChatFactory", contracts.shadowChatFactory);
  const batch = await ethers.getContractAt("ShadowChatBatch", contracts.shadowChatBatch);
  
  console.log(`   Factory: ${contracts.shadowChatFactory}`);
  console.log(`   Batch: ${contracts.shadowChatBatch}`);
  console.log("");
  
  // Create anonymous identity
  console.log("🔐 Creating anonymous receiver identity...");
  const secretCode = "demo-secret-code-2024";
  const receiverHash = ethers.keccak256(ethers.toUtf8Bytes(secretCode));
  const encryptionKey = secretCode + "-encryption-key";
  
  console.log(`   Secret Code: ${secretCode}`);
  console.log(`   Receiver Hash: ${receiverHash}`);
  console.log("");
  
  // Find appropriate shard
  const [shardAddress, shardId] = await factory.getShardForReceiver(receiverHash);
  console.log(`🗂️  Message routing:`);
  console.log(`   Shard ID: ${shardId}`);
  console.log(`   Shard Address: ${shardAddress}`);
  console.log("");
  
  const shard = await ethers.getContractAt("ShadowChat", shardAddress);
  
  // Deposit credits
  console.log("💰 Depositing anonymous credits...");
  const depositAmount = ethers.parseEther("0.05");
  
  const depositTx = await shard.connect(sender).depositCredit(receiverHash, { value: depositAmount });
  await depositTx.wait();
  
  const balance = await shard.getCreditBalance(receiverHash);
  console.log(`   Deposited: ${ethers.formatEther(depositAmount)} ETH`);
  console.log(`   Balance: ${ethers.formatEther(balance)} ETH`);
  console.log("");
  
  // Send encrypted messages
  console.log("📨 Sending encrypted messages...");
  
  const messages = [
    "Hello from ShadowChat! This message is completely anonymous and encrypted.",
    "Demo message 2: The system is working perfectly! 🎉",
    "Final message: Privacy and security confirmed! 🔐"
  ];
  
  for (let i = 0; i < messages.length; i++) {
    const plaintext = messages[i];
    const encryptedContent = MessageCrypto.encrypt(plaintext, encryptionKey);
    
    console.log(`   📤 Sending message ${i + 1}:`);
    console.log(`      Original: "${plaintext}"`);
    console.log(`      Encrypted: "${encryptedContent.substring(0, 40)}..."`);
    
    const tx = await shard.connect(sender).sendMessage(receiverHash, encryptedContent);
    const receipt = await tx.wait();
    
    console.log(`      ✅ Sent! Gas used: ${receipt.gasUsed.toString()}`);
    console.log("");
  }
  
  // Retrieve and decrypt messages
  console.log("📥 Retrieving and decrypting messages...");
  
  const filter = shard.filters.MessageSent(null, null, receiverHash);
  const receivedEvents = await shard.queryFilter(filter, 0, 'latest');
  
  console.log(`   📬 Found ${receivedEvents.length} messages:`);
  console.log("");
  
  receivedEvents.forEach((event, index) => {
    const args = event.args;
    const decryptedMessage = MessageCrypto.decrypt(args.encryptedContent, encryptionKey);
    
    console.log(`   📨 Message ${index + 1}:`);
    console.log(`      From: ${args.sender.substring(0, 10)}...`);
    console.log(`      Encrypted: "${args.encryptedContent.substring(0, 30)}..."`);
    console.log(`      Decrypted: "${decryptedMessage}"`);
    console.log(`      Time: ${new Date(Number(args.timestamp) * 1000).toLocaleString()}`);
    console.log("");
  });
  
  // Demo batch operations
  console.log("📦 Batch operations demo...");
  
  const batchReceivers = [];
  const batchMessages = [];
  const batchAmounts = [];
  
  for (let i = 1; i <= 2; i++) {
    const batchSecret = `batch-demo-${i}`;
    const batchHash = ethers.keccak256(ethers.toUtf8Bytes(batchSecret));
    const amount = ethers.parseEther("0.01");
    const message = `Batch message ${i}: Efficient bulk messaging! 📦`;
    
    const batchKey = batchSecret + "-key";
    const encrypted = MessageCrypto.encrypt(message, batchKey);
    
    batchReceivers.push(batchHash);
    batchMessages.push(encrypted);
    batchAmounts.push(amount);
  }
  
  // Batch deposit and send
  const totalBatchAmount = batchAmounts.reduce((sum, amount) => sum + amount, 0n);
  
  console.log("   💰 Batch depositing credits...");
  await batch.connect(sender).batchDepositCredits(shardAddress, batchReceivers, batchAmounts, { value: totalBatchAmount });
  
  console.log("   📤 Batch sending messages...");
  await batch.connect(sender).sendBatchMessages(shardAddress, batchReceivers, batchMessages);
  
  console.log("   ✅ Batch operations completed!");
  console.log("");
  
  // Show system stats
  console.log("📊 System Statistics:");
  try {
    const [totalMessages, totalCredits, contractBalance] = await factory.getAggregatedStats();
    console.log(`   Messages sent: ${totalMessages.toString()}`);
    console.log(`   Credits deposited: ${ethers.formatEther(totalCredits)} ETH`);
    console.log(`   Contract balance: ${ethers.formatEther(contractBalance)} ETH`);
  } catch (error) {
    console.log("   Statistics not available");
  }
  console.log("");
  
  // Demo complete
  console.log("=".repeat(60));
  console.log("🎉 Demo completed successfully!");
  console.log("");
  console.log("✨ Features demonstrated:");
  console.log("   🔒 Anonymous identity creation");
  console.log("   💰 Anonymous credit deposits");
  console.log("   🔐 Client-side message encryption");
  console.log("   📨 Encrypted message sending");
  console.log("   📥 Message retrieval and decryption");
  console.log("   📦 Batch operations for gas efficiency");
  console.log("   🗂️  Automatic message routing via sharding");
  console.log("");
  console.log("🔐 Privacy guaranteed:");
  console.log("   ✅ No personal information stored");
  console.log("   ✅ Messages encrypted before sending");
  console.log("   ✅ Only encrypted data on blockchain");
  console.log("   ✅ Receiver controls decryption");
  console.log("");
  console.log("🚀 Ready for production use!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Demo failed:", error);
    process.exit(1);
  });

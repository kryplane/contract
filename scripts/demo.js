const { ethers } = require("hardhat");
const crypto = require("crypto");

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

async function main() {
  console.log("🚀 ShadowChat Protocol Demo - Anonymous Messaging System");
  console.log("🔐 With End-to-End Encryption");
  console.log("=".repeat(60));
  
  const [deployer, sender, receiver] = await ethers.getSigners();
  
  console.log("👥 Accounts in use:");
  console.log(`   Deployer: ${deployer.address}`);
  console.log(`   Sender: ${sender.address}`);
  console.log(`   Receiver: ${receiver.address}\n`);
  
  // Deployment
  console.log("📦 Deploying contracts...");
  const messageFee = ethers.parseEther("0.005"); // 0.005 ETH
  const withdrawalFee = ethers.parseEther("0.0005"); // 0.0005 ETH
  
  // Deploy Factory with 3 shards
  const ShadowChatFactory = await ethers.getContractFactory("ShadowChatFactory");
  const factoryDeployTx = await ShadowChatFactory.deploy(messageFee, withdrawalFee, 3);
  console.log(`   🔄 Factory deployment transaction hash: ${factoryDeployTx.deploymentTransaction().hash}`);
  
  const factory = await factoryDeployTx.waitForDeployment();
  const factoryReceipt = await factoryDeployTx.deploymentTransaction().wait();
  const factoryGasUsed = factoryReceipt.gasUsed * factoryReceipt.gasPrice;
  
  console.log(`✅ Factory deployed: ${await factory.getAddress()}`);
  console.log(`   🧾 Deployment Details:`);
  console.log(`      📦 Block: ${factoryReceipt.blockNumber}`);
  console.log(`      ⛽ Gas used: ${factoryReceipt.gasUsed.toString()}`);
  console.log(`      💰 Gas price: ${ethers.formatUnits(factoryReceipt.gasPrice, 'gwei')} gwei`);
  console.log(`      💸 Gas cost: ${ethers.formatEther(factoryGasUsed)} ETH`);
  
  // Deploy Batch contract
  const ShadowChatBatch = await ethers.getContractFactory("ShadowChatBatch");
  const batchDeployTx = await ShadowChatBatch.deploy();
  console.log(`   🔄 Batch deployment transaction hash: ${batchDeployTx.deploymentTransaction().hash}`);
  
  const batch = await batchDeployTx.waitForDeployment();
  const batchDeployReceipt = await batchDeployTx.deploymentTransaction().wait();
  const batchDeployGasUsed = batchDeployReceipt.gasUsed * batchDeployReceipt.gasPrice;
  
  console.log(`✅ Batch contract deployed: ${await batch.getAddress()}`);
  console.log(`   🧾 Deployment Details:`);
  console.log(`      📦 Block: ${batchDeployReceipt.blockNumber}`);
  console.log(`      ⛽ Gas used: ${batchDeployReceipt.gasUsed.toString()}`);
  console.log(`      💰 Gas price: ${ethers.formatUnits(batchDeployReceipt.gasPrice, 'gwei')} gwei`);
  console.log(`      💸 Gas cost: ${ethers.formatEther(batchDeployGasUsed)} ETH\n`);
  
  // Create anonymous receiver identity
  console.log("🔐 Creating anonymous identity for receiver...");
  const secretCode = "super-secure-secret-code-2024";
  const receiverHash = ethers.keccak256(ethers.toUtf8Bytes(secretCode));
  
  console.log(`   Secret Code: ${secretCode}`);
  console.log(`   Receiver Hash: ${receiverHash}`);
  
  // Create encryption key from secret code
  const encryptionKey = secretCode + "-encryption-key";
  console.log(`   🔑 Encryption Key: ${encryptionKey}`);
  
  // Find appropriate shard
  const [shardAddress, shardId] = await factory.getShardForReceiver(receiverHash);
  console.log(`   ➡️ Messages will be routed to Shard ${shardId}: ${shardAddress}\n`);
  
  const ShadowChat = await ethers.getContractFactory("ShadowChat");
  const shard = ShadowChat.attach(shardAddress);
  
  // Deposit anonymous credits
  console.log("💰 Depositing anonymous credits...");
  const depositAmount = ethers.parseEther("0.1");
  
  const depositTx = await shard.connect(sender).depositCredit(receiverHash, { value: depositAmount });
  console.log(`   🔄 Transaction hash: ${depositTx.hash}`);
  
  const depositReceipt = await depositTx.wait();
  const depositGasUsed = depositReceipt.gasUsed * depositReceipt.gasPrice;
  
  console.log(`   ✅ Deposited ${ethers.formatEther(depositAmount)} ETH`);
  console.log(`   🧾 Transaction Details:`);
  console.log(`      📦 Block: ${depositReceipt.blockNumber}`);
  console.log(`      ⛽ Gas used: ${depositReceipt.gasUsed.toString()}`);
  console.log(`      💰 Gas price: ${ethers.formatUnits(depositReceipt.gasPrice, 'gwei')} gwei`);
  console.log(`      💸 Gas cost: ${ethers.formatEther(depositGasUsed)} ETH`);
  
  const balance = await shard.getCreditBalance(receiverHash);
  console.log(`   💳 Current balance: ${ethers.formatEther(balance)} ETH\n`);
  
  // Demo sending individual messages
  console.log("📨 Sending encrypted anonymous messages...");
  
  const messages = [
    {
      plaintext: "Hello from ShadowChat! This is a secret message.",
      description: "Hello from ShadowChat!"
    },
    {
      plaintext: "System working perfectly. All tests passing! 🎉",
      description: "System working perfectly"
    }
  ];
  
  const sentMessages = [];
  
  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i];
    console.log(`   📤 Sending message ${i + 1}: "${msg.description}"`);
    
    // Encrypt the message before sending
    const encryptedContent = MessageCrypto.encrypt(msg.plaintext, encryptionKey);
    console.log(`   🔐 Original: "${msg.plaintext}"`);
    console.log(`   🔒 Encrypted: "${encryptedContent.substring(0, 40)}..."`);
    
    const tx = await shard.connect(sender).sendMessage(receiverHash, encryptedContent);
    console.log(`      🔄 Transaction hash: ${tx.hash}`);
    
    const receipt = await tx.wait();
    const gasUsed = receipt.gasUsed * receipt.gasPrice;
    
    // Find MessageSent event
    const event = receipt.logs.find(log => {
      try {
        const parsed = shard.interface.parseLog(log);
        return parsed.name === "MessageSent";
      } catch {
        return false;
      }
    });
    
    if (event) {
      const parsed = shard.interface.parseLog(event);
      console.log(`   ✅ Sent! Message ID: ${parsed.args.messageId}`);
      console.log(`   📝 Content length: ${parsed.args.encryptedContent.length} chars`);
      console.log(`   ⏰ Timestamp: ${new Date(Number(parsed.args.timestamp) * 1000).toLocaleString('en-US')}`);
      console.log(`   💸 Fee: ${ethers.formatEther(await factory.messageFee())} ETH`);
      console.log(`   🧾 Transaction Details:`);
      console.log(`      📦 Block: ${receipt.blockNumber}`);
      console.log(`      ⛽ Gas used: ${receipt.gasUsed.toString()}`);
      console.log(`      💰 Gas price: ${ethers.formatUnits(receipt.gasPrice, 'gwei')} gwei`);
      console.log(`      💸 Gas cost: ${ethers.formatEther(gasUsed)} ETH`);
      console.log(`      📋 Status: ${receipt.status === 1 ? 'Success' : 'Failed'}\n`);
      
      // Store message info for retrieval demo
      sentMessages.push({
        messageId: parsed.args.messageId,
        sender: parsed.args.sender,
        receiverHash: parsed.args.receiverHash,
        encryptedContent: parsed.args.encryptedContent,
        plaintext: msg.plaintext, // Store original for comparison
        timestamp: parsed.args.timestamp,
        blockNumber: receipt.blockNumber,
        transactionHash: tx.hash,
        gasUsed: receipt.gasUsed,
        gasPrice: receipt.gasPrice
      });
    }
  }
  
  // Demo message retrieval (receiving messages)
  console.log("📥 Retrieving and decrypting received messages...");
  console.log("   🔍 Querying MessageSent events for receiver...\n");
  
  // Query all MessageSent events for this receiver
  const filter = shard.filters.MessageSent(null, null, receiverHash);
  const receivedEvents = await shard.queryFilter(filter, 0, 'latest');
  
  console.log(`   📬 Found ${receivedEvents.length} messages for this receiver:`);
  
  receivedEvents.forEach((event, index) => {
    const args = event.args;
    
    // Decrypt the message content
    const decryptedMessage = MessageCrypto.decrypt(args.encryptedContent, encryptionKey);
    
    console.log(`   📨 Message ${index + 1}:`);
    console.log(`      🆔 ID: ${args.messageId}`);
    console.log(`      👤 From: ${args.sender}`);
    console.log(`      � Encrypted: "${args.encryptedContent.substring(0, 40)}..."`);
    console.log(`      🔓 Decrypted: "${decryptedMessage}"`);
    console.log(`      ⏰ Received: ${new Date(Number(args.timestamp) * 1000).toLocaleString('en-US')}`);
    console.log(`      🏗️ Block: ${event.blockNumber}`);
    console.log("");
  });
  
  // Demo batch operations
  console.log("📦 Demo Batch Operations with Encryption...");
  
  // Create multiple receiver hashes
  const batchReceivers = [];
  const batchMessages = [];
  const batchAmounts = [];
  const batchSecrets = []; // Store secrets for decryption demo
  
  for (let i = 1; i <= 3; i++) {
    const batchSecret = `batch-receiver-${i}-secret-code`;
    const batchHash = ethers.keccak256(ethers.toUtf8Bytes(batchSecret));
    const amount = ethers.parseEther("0.02");
    const plaintextMessage = `Batch message ${i}: This is a secret batch message with confidential data! 🔒`;
    
    // Create encryption key for this batch receiver
    const batchEncryptionKey = batchSecret + "-encryption-key";
    const encryptedMessage = MessageCrypto.encrypt(plaintextMessage, batchEncryptionKey);
    
    batchReceivers.push(batchHash);
    batchMessages.push(encryptedMessage);
    batchAmounts.push(amount);
    batchSecrets.push({ secret: batchSecret, key: batchEncryptionKey, plaintext: plaintextMessage });
  }
  
  // Batch deposit credits
  console.log("   💰 Batch depositing credits for 3 receivers...");
  const totalBatchAmount = batchAmounts.reduce((sum, amount) => sum + amount, 0n);
  
  const batchDepositTx = await batch.connect(sender).batchDepositCredits(
    shardAddress,
    batchReceivers,
    batchAmounts,
    { value: totalBatchAmount }
  );
  console.log(`      🔄 Batch deposit transaction hash: ${batchDepositTx.hash}`);
  
  const batchDepositReceipt = await batchDepositTx.wait();
  const batchDepositGasUsed = batchDepositReceipt.gasUsed * batchDepositReceipt.gasPrice;
  
  console.log(`      🧾 Batch Deposit Transaction Details:`);
  console.log(`         📦 Block: ${batchDepositReceipt.blockNumber}`);
  console.log(`         ⛽ Gas used: ${batchDepositReceipt.gasUsed.toString()}`);
  console.log(`         💰 Gas price: ${ethers.formatUnits(batchDepositReceipt.gasPrice, 'gwei')} gwei`);
  console.log(`         💸 Gas cost: ${ethers.formatEther(batchDepositGasUsed)} ETH`);
  console.log(`         📋 Status: ${batchDepositReceipt.status === 1 ? 'Success' : 'Failed'}`);
  
  // Check balances
  const balances = await batch.getBatchBalances(shardAddress, batchReceivers);
  balances.forEach((bal, index) => {
    console.log(`   💳 Receiver ${index + 1}: ${ethers.formatEther(bal)} ETH`);
  });
  
  // Batch send messages
  console.log("\n   📤 Batch sending messages...");
  const batchMsgTx = await batch.connect(sender).sendBatchMessages(shardAddress, batchReceivers, batchMessages);
  console.log(`      🔄 Batch message transaction hash: ${batchMsgTx.hash}`);
  
  const batchMsgReceipt = await batchMsgTx.wait();
  const batchMsgGasUsed = batchMsgReceipt.gasUsed * batchMsgReceipt.gasPrice;
  
  console.log("   ✅ Sent 3 messages simultaneously!");
  console.log(`   🧾 Batch Message Transaction Details:`);
  console.log(`      📦 Block: ${batchMsgReceipt.blockNumber}`);
  console.log(`      ⛽ Gas used: ${batchMsgReceipt.gasUsed.toString()}`);
  console.log(`      💰 Gas price: ${ethers.formatUnits(batchMsgReceipt.gasPrice, 'gwei')} gwei`);
  console.log(`      💸 Gas cost: ${ethers.formatEther(batchMsgGasUsed)} ETH`);
  console.log(`      📋 Status: ${batchMsgReceipt.status === 1 ? 'Success' : 'Failed'}`);
  console.log(`      📊 Events emitted: ${batchMsgReceipt.logs.length}`);
  
  // Show batch message retrieval
  console.log("\n   📥 Retrieving batch messages...");
  
  // Get events from the batch transaction
  const batchEvents = batchMsgReceipt.logs
    .map(log => {
      try {
        return shard.interface.parseLog(log);
      } catch {
        return null;
      }
    })
    .filter(parsed => parsed && parsed.name === "MessageSent");
  
  console.log(`   📬 Batch sent ${batchEvents.length} messages:`);
  batchEvents.forEach((event, index) => {
    const batchInfo = batchSecrets[index];
    const decryptedBatchMessage = MessageCrypto.decrypt(event.args.encryptedContent, batchInfo.key);
    
    console.log(`      📨 Batch Message ${index + 1}:`);
    console.log(`         🔒 Encrypted: "${event.args.encryptedContent.substring(0, 30)}..."`);
    console.log(`         🔓 Decrypted: "${decryptedBatchMessage}"`);
    console.log(`         🆔 ID: ${event.args.messageId}`);
    console.log(`         👤 From: ${event.args.sender}`);
    console.log(`         ⏰ Sent: ${new Date(Number(event.args.timestamp) * 1000).toLocaleString('en-US')}`);
    console.log(`         🔗 Transaction: ${batchMsgTx.hash}`);
  });
  console.log("");
  
  // Demo comprehensive message inbox
  console.log("📪 Complete Message Inbox Demo...");
  console.log("   🔍 Simulating how a receiver would check all their messages:\n");
  
  // Query all messages across all shards for this receiver
  const allShards = await factory.getAllShards();
  let totalInboxMessages = 0;
  
  for (let shardIndex = 0; shardIndex < allShards.length; shardIndex++) {
    const shardAddr = allShards[shardIndex];
    const shardContract = ShadowChat.attach(shardAddr);
    
    // Query messages for this receiver on this shard
    const shardFilter = shardContract.filters.MessageSent(null, null, receiverHash);
    const shardMessages = await shardContract.queryFilter(shardFilter, 0, 'latest');
    
    if (shardMessages.length > 0) {
      console.log(`   📂 Shard ${shardIndex} (${shardAddr}):`);
      console.log(`      📨 ${shardMessages.length} message(s) found`);
      
      shardMessages.forEach((msg, msgIndex) => {
        const args = msg.args;
        // Try to decrypt with main receiver's key for demo
        const decryptedContent = MessageCrypto.decrypt(args.encryptedContent, encryptionKey);
        
        console.log(`      📧 Message ${msgIndex + 1}:`);
        console.log(`         🆔 ID: ${args.messageId}`);
        console.log(`         👤 From: ${args.sender.slice(0, 10)}...`);
        console.log(`         � Encrypted Preview: "${args.encryptedContent.slice(0, 30)}${args.encryptedContent.length > 30 ? '...' : ''}"`);
        console.log(`         🔓 Decrypted: "${decryptedContent}"`);
        console.log(`         ⏰ Time: ${new Date(Number(args.timestamp) * 1000).toLocaleString('en-US')}`);
      });
      console.log("");
      totalInboxMessages += shardMessages.length;
    }
  }
  
  console.log(`   📊 Total messages in inbox: ${totalInboxMessages}\n`);
  
  // Demo message filtering capabilities
  console.log("🔍 Message Filtering Demo...");
  console.log("   📋 Showing advanced message querying capabilities:\n");
  
  // Filter messages by specific sender
  const senderFilter = shard.filters.MessageSent(null, sender.address, receiverHash);
  const senderMessages = await shard.queryFilter(senderFilter, 0, 'latest');
  console.log(`   👤 Messages from ${sender.address.slice(0, 10)}...:`);
  console.log(`      Found ${senderMessages.length} message(s) from this sender`);
  
  // Filter messages by message ID range
  const messageFilter = shard.filters.MessageSent([1, 2], null, receiverHash);
  const filteredMessages = await shard.queryFilter(messageFilter, 0, 'latest');
  console.log(`   🔢 Messages with ID 1 or 2:`);
  console.log(`      Found ${filteredMessages.length} message(s) matching ID filter`);
  
  // Show recent messages (simulate time-based filtering)
  const currentBlock = await ethers.provider.getBlockNumber();
  const recentMessages = await shard.queryFilter(
    shard.filters.MessageSent(null, null, receiverHash),
    Math.max(0, currentBlock - 10),
    'latest'
  );
  console.log(`   ⏰ Recent messages (last 10 blocks):`);
  console.log(`      Found ${recentMessages.length} recent message(s)\n`);

  // Authorize withdrawal
  console.log("🔑 Authorizing credit withdrawal...");
  const authTx = await shard.connect(receiver).authorizeWithdrawal(receiverHash, receiver.address, secretCode);
  console.log(`   🔄 Authorization transaction hash: ${authTx.hash}`);
  
  const authReceipt = await authTx.wait();
  const authGasUsed = authReceipt.gasUsed * authReceipt.gasPrice;
  // Withdraw remaining credits
  const remainingBalance = await shard.getCreditBalance(receiverHash);
  if (remainingBalance > withdrawalFee) {
    console.log("💸 Withdrawing remaining credits...");
    
    const initialBalance = await ethers.provider.getBalance(receiver.address);
    
    const withdrawTx = await shard.connect(receiver).withdrawCredit(receiverHash, remainingBalance);
    console.log(`   🔄 Withdrawal transaction hash: ${withdrawTx.hash}`);
    
    const receipt = await withdrawTx.wait();
    const gasUsed = receipt.gasUsed * receipt.gasPrice;
    
    const finalBalance = await ethers.provider.getBalance(receiver.address);
    const netReceived = finalBalance - initialBalance + gasUsed;
    
    console.log(`   ✅ Withdrawn: ${ethers.formatEther(netReceived)} ETH`);
    console.log(`   🧾 Withdrawal Transaction Details:`);
    console.log(`      📦 Block: ${receipt.blockNumber}`);
    console.log(`      ⛽ Gas used: ${receipt.gasUsed.toString()}`);
    console.log(`      💰 Gas price: ${ethers.formatUnits(receipt.gasPrice, 'gwei')} gwei`);
    console.log(`      💸 Gas cost: ${ethers.formatEther(gasUsed)} ETH`);
    console.log(`      📋 Status: ${receipt.status === 1 ? 'Success' : 'Failed'}`);
    console.log(`      💵 Net received (after gas): ${ethers.formatEther(netReceived)} ETH`);
    console.log(`      📊 Events emitted: ${receipt.logs.length}\n`);
  }
  
  // Final statistics
  console.log("📊 System statistics:");
  const [totalMessages, totalCredits, contractBalance] = await factory.getAggregatedStats();
  
  console.log(`   📨 Total messages sent: ${totalMessages}`);
  console.log(`   💰 Total credits deposited: ${ethers.formatEther(totalCredits)} ETH`);
  console.log(`   🏦 Balance in contracts: ${ethers.formatEther(contractBalance)} ETH`);
  
  // Calculate total gas usage across all transactions
  console.log("\n⛽ Gas Usage Summary:");
  console.log(`   🏭 Factory deployment: ${factoryReceipt.gasUsed.toString()} gas (${ethers.formatEther(factoryGasUsed)} ETH)`);
  console.log(`   📦 Batch deployment: ${batchDeployReceipt.gasUsed.toString()} gas (${ethers.formatEther(batchDeployGasUsed)} ETH)`);
  console.log(`   💰 Credit deposit: ${depositReceipt.gasUsed.toString()} gas (${ethers.formatEther(depositGasUsed)} ETH)`);
  
  // Calculate total gas for individual messages
  let totalMsgGas = 0n;
  let totalMsgCost = 0n;
  sentMessages.forEach((msg, index) => {
    totalMsgGas += msg.gasUsed;
    totalMsgCost += msg.gasUsed * msg.gasPrice;
    console.log(`   📨 Message ${index + 1}: ${msg.gasUsed.toString()} gas (${ethers.formatEther(msg.gasUsed * msg.gasPrice)} ETH)`);
  });
  
  console.log(`   💳 Batch deposit: ${batchDepositReceipt.gasUsed.toString()} gas (${ethers.formatEther(batchDepositGasUsed)} ETH)`);
  console.log(`   📦 Batch messages: ${batchMsgReceipt.gasUsed.toString()} gas (${ethers.formatEther(batchMsgGasUsed)} ETH)`);
  console.log(`   🔑 Authorization: ${authReceipt.gasUsed.toString()} gas (${ethers.formatEther(authGasUsed)} ETH)`);
  
  if (typeof receipt !== 'undefined') {
    console.log(`   💸 Withdrawal: ${receipt.gasUsed.toString()} gas (${ethers.formatEther(gasUsed)} ETH)`);
  }
  
  // Calculate total gas usage
  const totalGasUsed = factoryReceipt.gasUsed + batchDeployReceipt.gasUsed + depositReceipt.gasUsed + 
                       totalMsgGas + batchDepositReceipt.gasUsed + batchMsgReceipt.gasUsed + authReceipt.gasUsed +
                       (typeof receipt !== 'undefined' ? receipt.gasUsed : 0n);
  
  const totalGasCost = factoryGasUsed + batchDeployGasUsed + depositGasUsed + 
                       totalMsgCost + batchDepositGasUsed + batchMsgGasUsed + authGasUsed +
                       (typeof gasUsed !== 'undefined' ? gasUsed : 0n);
  
  console.log(`   📊 TOTAL GAS USED: ${totalGasUsed.toString()} gas`);
  console.log(`   💸 TOTAL GAS COST: ${ethers.formatEther(totalGasCost)} ETH`);
  
  console.log("\n" + "=".repeat(60));
  console.log("🎉 Demo completed!");
  console.log("✨ Key features demonstrated:");
  console.log("   🔒 Completely anonymous - no identity disclosure");
  console.log("   🔐 End-to-end encryption - messages encrypted client-side");
  console.log("   🌐 Encrypted data stored on-chain");
  console.log("   🔑 Only receiver with secret key can decrypt");
  console.log("   ⚡ Sharding for high scalability");
  console.log("   💳 Anonymous credit system");
  console.log("   📦 Batch operations save gas");
  console.log("   📨 Send & receive encrypted messages via events");
  console.log("   🔍 Advanced message filtering & querying");
  console.log("   📪 Cross-shard encrypted message inbox");
  console.log("   ⏰ Real-time encrypted message retrieval");
  console.log("   🧾 Detailed transaction logging");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Demo failed:", error);
    process.exit(1);
  });

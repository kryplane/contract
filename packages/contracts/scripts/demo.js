const { ethers } = require("hardhat");

async function main() {
  console.log("🚀 ShadowChat Protocol Demo - Anonymous Messaging System");
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
  const factory = await ShadowChatFactory.deploy(messageFee, withdrawalFee, 3);
  await factory.waitForDeployment();
  
  console.log(`✅ Factory deployed: ${await factory.getAddress()}`);
  
  // Deploy Batch contract
  const ShadowChatBatch = await ethers.getContractFactory("ShadowChatBatch");
  const batch = await ShadowChatBatch.deploy();
  await batch.waitForDeployment();
  
  console.log(`✅ Batch contract deployed: ${await batch.getAddress()}\n`);
  
  // Create anonymous receiver identity
  console.log("🔐 Creating anonymous identity for receiver...");
  const secretCode = "super-secure-secret-code-2024";
  const receiverHash = ethers.keccak256(ethers.toUtf8Bytes(secretCode));
  
  console.log(`   Secret Code: ${secretCode}`);
  console.log(`   Receiver Hash: ${receiverHash}`);
  
  // Find appropriate shard
  const [shardAddress, shardId] = await factory.getShardForReceiver(receiverHash);
  console.log(`   ➡️ Messages will be routed to Shard ${shardId}: ${shardAddress}\n`);
  
  const ShadowChat = await ethers.getContractFactory("ShadowChat");
  const shard = ShadowChat.attach(shardAddress);
  
  // Deposit anonymous credits
  console.log("💰 Depositing anonymous credits...");
  const depositAmount = ethers.parseEther("0.1");
  
  await shard.connect(sender).depositCredit(receiverHash, { value: depositAmount });
  const balance = await shard.getCreditBalance(receiverHash);
  
  console.log(`   ✅ Deposited ${ethers.formatEther(depositAmount)} ETH`);
  console.log(`   💳 Current balance: ${ethers.formatEther(balance)} ETH\n`);
  
  // Demo sending individual messages
  console.log("📨 Sending anonymous messages...");
  
  const messages = [
    {
      content: "Hello from ShadowChat! This is an encrypted message.",
      description: "Hello from ShadowChat!"
    },
    {
      content: "System working perfectly. All tests passing!",
      description: "System working perfectly"
    }
  ];
  
  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i];
    console.log(`   📤 Sending message ${i + 1}: "${msg.description}"`);
    
    const tx = await shard.connect(sender).sendMessage(receiverHash, msg.content);
    const receipt = await tx.wait();
    
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
      console.log(`   💸 Fee: ${ethers.formatEther(await factory.messageFee())} ETH\n`);
    }
  }
  
  // Demo batch operations
  console.log("📦 Demo Batch Operations...");
  
  // Create multiple receiver hashes
  const batchReceivers = [];
  const batchMessages = [];
  const batchAmounts = [];
  
  for (let i = 1; i <= 3; i++) {
    const batchSecret = `batch-receiver-${i}-secret-code`;
    const batchHash = ethers.keccak256(ethers.toUtf8Bytes(batchSecret));
    const amount = ethers.parseEther("0.02");
    const message = `Batch message ${i}: This is an encrypted batch message content.`;
    
    batchReceivers.push(batchHash);
    batchMessages.push(message);
    batchAmounts.push(amount);
  }
  
  // Batch deposit credits
  console.log("   💰 Batch depositing credits for 3 receivers...");
  const totalBatchAmount = batchAmounts.reduce((sum, amount) => sum + amount, 0n);
  
  await batch.connect(sender).batchDepositCredits(
    shardAddress,
    batchReceivers,
    batchAmounts,
    { value: totalBatchAmount }
  );
  
  // Check balances
  const balances = await batch.getBatchBalances(shardAddress, batchReceivers);
  balances.forEach((bal, index) => {
    console.log(`   💳 Receiver ${index + 1}: ${ethers.formatEther(bal)} ETH`);
  });
  
  // Batch send messages
  console.log("\n   📤 Batch sending messages...");
  await batch.connect(sender).sendBatchMessages(shardAddress, batchReceivers, batchMessages);
  console.log("   ✅ Sent 3 messages simultaneously!\n");
  
  // Authorize withdrawal
  console.log("🔑 Authorizing credit withdrawal...");
  await shard.connect(receiver).authorizeWithdrawal(receiverHash, receiver.address, secretCode);
  
  const isAuthorized = await shard.isAuthorizedWithdrawer(receiverHash, receiver.address);
  console.log(`   ✅ Authorization successful: ${isAuthorized}\n`);
  
  // Withdraw remaining credits
  const remainingBalance = await shard.getCreditBalance(receiverHash);
  if (remainingBalance > withdrawalFee) {
    console.log("💸 Withdrawing remaining credits...");
    
    const initialBalance = await ethers.provider.getBalance(receiver.address);
    
    const tx = await shard.connect(receiver).withdrawCredit(receiverHash, remainingBalance);
    const receipt = await tx.wait();
    const gasUsed = receipt.gasUsed * receipt.gasPrice;
    
    const finalBalance = await ethers.provider.getBalance(receiver.address);
    const netReceived = finalBalance - initialBalance + gasUsed;
    
    console.log(`   ✅ Withdrawn: ${ethers.formatEther(netReceived)} ETH`);
    console.log(`   ⛽ Gas used: ${ethers.formatEther(gasUsed)} ETH\n`);
  }
  
  // Final statistics
  console.log("📊 System statistics:");
  const [totalMessages, totalCredits, contractBalance] = await factory.getAggregatedStats();
  
  console.log(`   📨 Total messages sent: ${totalMessages}`);
  console.log(`   💰 Total credits deposited: ${ethers.formatEther(totalCredits)} ETH`);
  console.log(`   🏦 Balance in contracts: ${ethers.formatEther(contractBalance)} ETH`);
  
  console.log("\n" + "=".repeat(60));
  console.log("🎉 Demo completed!");
  console.log("✨ Key features of ShadowChat:");
  console.log("   🔒 Completely anonymous - no identity disclosure");
  console.log("   🌐 Encrypted data stored on-chain");
  console.log("   ⚡ Sharding for high scalability");
  console.log("   💳 Anonymous credit system");
  console.log("   📦 Batch operations save gas");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Demo failed:", error);
    process.exit(1);
  });

const { ethers } = require("hardhat");

async function main() {
  // Example usage of the ShadowChat Protocol
  console.log("Running ShadowChat Protocol interaction example...");
  
  const [deployer, sender, receiver] = await ethers.getSigners();
  
  console.log("Accounts:");
  console.log(`Deployer: ${deployer.address}`);
  console.log(`Sender: ${sender.address}`);
  console.log(`Receiver: ${receiver.address}`);
  
  // Deploy contracts
  const messageFee = ethers.parseEther("0.01");
  const withdrawalFee = ethers.parseEther("0.001");
  
  console.log("\nDeploying contracts...");
  const ShadowChatFactory = await ethers.getContractFactory("ShadowChatFactory");
  const factory = await ShadowChatFactory.deploy(messageFee, withdrawalFee, 3);
  await factory.waitForDeployment();
  
  console.log(`Factory deployed at: ${await factory.getAddress()}`);
  
  // Step 1: Generate receiver hash
  const secretCode = "my-super-secret-code-12345";
  const receiverHash = ethers.keccak256(ethers.toUtf8Bytes(secretCode));
  
  console.log(`\n1. Generated receiver hash: ${receiverHash}`);
  console.log(`   From secret code: ${secretCode}`);
  
  // Step 2: Get the appropriate shard for this receiver
  const [shardAddress, shardId] = await factory.getShardForReceiver(receiverHash);
  console.log(`\n2. Message will be routed to shard ${shardId} at ${shardAddress}`);
  
  const ShadowChat = await ethers.getContractFactory("ShadowChat");
  const shard = ShadowChat.attach(shardAddress);
  
  // Step 3: Deposit credits (anyone can fund a receiver hash)
  const depositAmount = ethers.parseEther("0.1");
  console.log(`\n3. Depositing ${ethers.formatEther(depositAmount)} ETH to receiver hash...`);
  
  const depositTx = await shard.connect(sender).depositCredit(receiverHash, { 
    value: depositAmount 
  });
  await depositTx.wait();
  
  const balance = await shard.getCreditBalance(receiverHash);
  console.log(`   Credit balance: ${ethers.formatEther(balance)} ETH`);
  
  // Step 4: Send messages
  const messages = [
    "QmFirstMessageCID123",
    "QmSecondMessageCID456", 
    "QmThirdMessageCID789"
  ];
  
  console.log(`\n4. Sending ${messages.length} messages...`);
  
  for (let i = 0; i < messages.length; i++) {
    const cid = messages[i];
    console.log(`   Sending message ${i + 1}: ${cid}`);
    
    const sendTx = await shard.connect(sender).sendMessage(receiverHash, cid);
    const receipt = await sendTx.wait();
    
    // Find the MessageSent event
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
      console.log(`   ✓ Message sent at timestamp: ${parsed.args.timestamp}`);
    }
  }
  
  // Check remaining balance
  const remainingBalance = await shard.getCreditBalance(receiverHash);
  console.log(`   Remaining balance: ${ethers.formatEther(remainingBalance)} ETH`);
  
  // Step 5: Authorize withdrawal
  console.log(`\n5. Authorizing withdrawal for receiver address...`);
  
  const authTx = await shard.connect(receiver).authorizeWithdrawal(
    receiverHash,
    receiver.address,
    secretCode
  );
  await authTx.wait();
  
  const isAuthorized = await shard.isAuthorizedWithdrawer(receiverHash, receiver.address);
  console.log(`   ✓ Withdrawal authorized: ${isAuthorized}`);
  
  // Step 6: Withdraw remaining credits
  if (remainingBalance > withdrawalFee) {
    console.log(`\n6. Withdrawing remaining credits...`);
    
    const initialReceiverBalance = await ethers.provider.getBalance(receiver.address);
    
    const withdrawTx = await shard.connect(receiver).withdrawCredit(receiverHash, remainingBalance);
    const receipt = await withdrawTx.wait();
    
    const finalReceiverBalance = await ethers.provider.getBalance(receiver.address);
    const gasUsed = receipt.gasUsed * receipt.gasPrice;
    const netReceived = finalReceiverBalance - initialReceiverBalance + gasUsed;
    
    console.log(`   ✓ Net amount received: ${ethers.formatEther(netReceived)} ETH`);
    console.log(`   ✓ Gas used: ${ethers.formatEther(gasUsed)} ETH`);
    
    const finalBalance = await shard.getCreditBalance(receiverHash);
    console.log(`   Final receiver hash balance: ${ethers.formatEther(finalBalance)} ETH`);
  } else {
    console.log(`\n6. Insufficient balance to withdraw (balance < withdrawal fee)`);
  }
  
  // Step 7: Display statistics
  console.log(`\n7. Protocol Statistics:`);
  const [totalMessages, totalCreditsDeposited, contractBalance] = await factory.getAggregatedStats();
  
  console.log(`   Total messages sent: ${totalMessages}`);
  console.log(`   Total credits deposited: ${ethers.formatEther(totalCreditsDeposited)} ETH`);
  console.log(`   Total contract balance: ${ethers.formatEther(contractBalance)} ETH`);
  
  console.log(`\n✅ Example completed successfully!`);
  console.log(`\n📝 Summary:`);
  console.log(`   - Created receiver hash from secret code`);
  console.log(`   - Deposited credits anonymously`);
  console.log(`   - Sent ${messages.length} messages using IPFS CIDs`);
  console.log(`   - Authorized and withdrew remaining credits`);
  console.log(`   - All operations preserved receiver privacy`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Example failed:", error);
    process.exit(1);
  });

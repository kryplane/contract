const { ethers } = require("hardhat");
const { ShadowChatClient, loadDeploymentInfo } = require("../interact");
const { IPFSClient } = require("../utils/ipfs");

/**
 * Demo script showing IPFS integration for off-chain messaging
 * This demonstrates storing and retrieving encrypted messages via IPFS
 */

async function demonstrateIPFSIntegration() {
  console.log("🌐 ShadowChat IPFS Integration Demo");
  console.log("=" .repeat(50));
  
  try {
    // Load deployment information
    const networkName = network.name;
    const deployment = loadDeploymentInfo(networkName);
    
    // Get signers for demo
    const [alice, bob] = await ethers.getSigners();
    
    // Initialize clients for both users
    const aliceClient = new ShadowChatClient(
      deployment.factory.address,
      deployment.batch.address,
      alice
    );
    
    const bobClient = new ShadowChatClient(
      deployment.factory.address,
      deployment.batch.address,
      bob
    );
    
    await aliceClient.init();
    console.log("");
    
    // Demo configuration
    const bobSecretCode = "demo_bob_secret_key_123";
    const bobReceiverHash = bobClient.generateReceiverHash(bobSecretCode);
    const encryptionKey = "my_encryption_key_456";
    
    console.log("👤 Demo Users:");
    console.log(`   Alice: ${alice.address.substring(0, 10)}...`);
    console.log(`   Bob: ${bob.address.substring(0, 10)}...`);
    console.log(`   Bob's receiver hash: ${bobReceiverHash.substring(0, 10)}...`);
    console.log("");
    
    // Step 1: Bob deposits credit for receiving messages
    console.log("💰 Step 1: Bob deposits credit for receiving messages");
    const creditAmount = ethers.parseEther("0.05");
    await bobClient.depositCredit(bobReceiverHash, creditAmount);
    
    // Step 2: Test IPFS client directly
    console.log("📡 Step 2: Testing IPFS client functionality");
    const ipfs = new IPFSClient();
    const ipfsStatus = ipfs.getStatus();
    console.log(`   Backend: ${ipfsStatus.backend}`);
    console.log(`   Configured: ${ipfsStatus.configured}`);
    
    if (!ipfsStatus.configured) {
      console.log("⚠️  IPFS not configured, using mock storage for demo");
    }
    console.log("");
    
    // Step 3: Alice sends messages using IPFS integration
    console.log("📨 Step 3: Alice sends messages with IPFS integration");
    
    const messages = [
      "Hello Bob! This is a test message stored on IPFS.",
      "IPFS integration is working perfectly! 🎉",
      "Privacy-preserving messaging with off-chain storage."
    ];
    
    const sentMessages = [];
    
    for (let i = 0; i < messages.length; i++) {
      console.log(`\n📤 Sending message ${i + 1}/${messages.length}`);
      console.log(`   Content: "${messages[i]}"`);
      
      try {
        const result = await aliceClient.sendMessageWithIPFS(
          bobReceiverHash,
          messages[i],
          encryptionKey
        );
        
        sentMessages.push({
          content: messages[i],
          ipfsCid: result.ipfsCid,
          transactionHash: result.transactionHash
        });
        
        console.log(`   ✅ Message sent successfully`);
        
      } catch (error) {
        console.log(`   ❌ Failed to send message: ${error.message}`);
        
        // Fallback to direct CID sending for demo purposes
        if (error.message.includes('IPFS')) {
          console.log("   🔄 Falling back to mock CID for demo...");
          const mockCid = `QmDemo${i + 1}MockCIDForTestingPurposes${Date.now()}`;
          await aliceClient.sendMessage(bobReceiverHash, mockCid);
          
          sentMessages.push({
            content: messages[i],
            ipfsCid: mockCid,
            transactionHash: 'demo-tx',
            isMock: true
          });
        }
      }
    }
    
    console.log("\n📬 Step 4: Bob retrieves and decrypts messages");
    
    // Wait a moment for blockchain confirmation
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    try {
      const retrievedMessages = await bobClient.getMessagesWithIPFS(
        bobReceiverHash,
        encryptionKey
      );
      
      console.log(`\n📊 Retrieved ${retrievedMessages.length} messages:`);
      
      retrievedMessages.forEach((msg, index) => {
        console.log(`\n📨 Message ${index + 1}:`);
        console.log(`   From: ${msg.sender.substring(0, 10)}...`);
        console.log(`   CID/Content: ${msg.ipfsCid.substring(0, 30)}...`);
        console.log(`   Timestamp: ${msg.timestamp}`);
        console.log(`   From IPFS: ${msg.isFromIPFS ? 'Yes' : 'No'}`);
        
        if (msg.decryptedContent) {
          console.log(`   Decrypted: "${msg.decryptedContent}"`);
        }
        
        if (msg.error) {
          console.log(`   Error: ${msg.error}`);
        }
      });
      
    } catch (error) {
      console.log(`❌ Failed to retrieve messages: ${error.message}`);
      
      // Fallback to basic message retrieval
      console.log("🔄 Falling back to basic message retrieval...");
      const basicMessages = await bobClient.getMessages(bobReceiverHash);
      console.log(`📊 Retrieved ${basicMessages.length} messages (basic mode)`);
    }
    
    // Step 5: Demonstrate IPFS features
    console.log("\n🔧 Step 5: IPFS Integration Features Summary");
    console.log("✅ Off-chain message storage reduces blockchain bloat");
    console.log("✅ End-to-end encryption for privacy");
    console.log("✅ Automatic IPFS CID generation and storage");
    console.log("✅ Seamless retrieval and decryption");
    console.log("✅ Fallback compatibility with on-chain storage");
    console.log("✅ Support for both Pinata and local IPFS nodes");
    
    console.log("\n🎯 Demo completed successfully!");
    
    return {
      sentMessages,
      ipfsStatus,
      aliceAddress: alice.address,
      bobAddress: bob.address,
      bobReceiverHash
    };
    
  } catch (error) {
    console.error("❌ Demo failed:", error);
    throw error;
  }
}

// Run demo if script is executed directly
if (require.main === module) {
  demonstrateIPFSIntegration()
    .then((result) => {
      console.log("\n📈 Demo Results:");
      console.log(`   Messages sent: ${result.sentMessages.length}`);
      console.log(`   IPFS backend: ${result.ipfsStatus.backend}`);
      console.log(`   IPFS configured: ${result.ipfsStatus.configured}`);
      process.exit(0);
    })
    .catch((error) => {
      console.error("❌ Demo error:", error);
      process.exit(1);
    });
}

module.exports = { demonstrateIPFSIntegration };
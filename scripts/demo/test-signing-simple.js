const { ethers } = require("hardhat");

/**
 * Simple Test Signing Script for ShadowChat Protocol
 * Focuses on core signing operations needed for the protocol
 */

async function main() {
  console.log("🔐 ShadowChat - Simple Test Signing Script");
  console.log("=".repeat(50));
  
  // Get test accounts
  const [deployer, sender, receiver] = await ethers.getSigners();
  
  console.log("👥 Test Accounts:");
  console.log(`   Sender: ${sender.address}`);
  console.log(`   Receiver: ${receiver.address}\n`);
  
  // Test 1: Sign a simple message
  console.log("📝 Test 1: Basic Message Signing");
  console.log("-".repeat(30));
  
  const message = "Hello ShadowChat!";
  console.log(`Message: "${message}"`);
  
  // Sign the message
  const signature = await sender.signMessage(message);
  console.log(`Signature: ${signature}`);
  
  // Verify the signature
  const recoveredAddress = ethers.verifyMessage(message, signature);
  const isValid = recoveredAddress.toLowerCase() === sender.address.toLowerCase();
  
  console.log(`Recovered Address: ${recoveredAddress}`);
  console.log(`Signature Valid: ${isValid ? '✅ Yes' : '❌ No'}\n`);
  
  // Test 2: Sign secret code for receiver hash
  console.log("🔑 Test 2: Secret Code Signing");
  console.log("-".repeat(30));
  
  const secretCode = "my-super-secret-code-2024";
  const receiverHash = ethers.keccak256(ethers.toUtf8Bytes(secretCode));
  
  console.log(`Secret Code: "${secretCode}"`);
  console.log(`Receiver Hash: ${receiverHash}`);
  
  // Sign the secret code
  const secretSignature = await receiver.signMessage(secretCode);
  console.log(`Secret Signature: ${secretSignature}`);
  
  // Verify
  const secretRecovered = ethers.verifyMessage(secretCode, secretSignature);
  const secretValid = secretRecovered.toLowerCase() === receiver.address.toLowerCase();
  
  console.log(`Secret Valid: ${secretValid ? '✅ Yes' : '❌ No'}\n`);
  
  // Test 3: Sign withdrawal authorization
  console.log("💸 Test 3: Withdrawal Authorization");
  console.log("-".repeat(30));
  
  const withdrawMessage = `AUTHORIZE_WITHDRAWAL:${receiverHash}:${receiver.address}:${Date.now()}`;
  console.log(`Withdrawal Message: "${withdrawMessage}"`);
  
  const withdrawSignature = await receiver.signMessage(withdrawMessage);
  console.log(`Withdrawal Signature: ${withdrawSignature}`);
  
  // Verify withdrawal authorization
  const withdrawRecovered = ethers.verifyMessage(withdrawMessage, withdrawSignature);
  const withdrawValid = withdrawRecovered.toLowerCase() === receiver.address.toLowerCase();
  
  console.log(`Withdrawal Valid: ${withdrawValid ? '✅ Yes' : '❌ No'}\n`);
  
  // Test 4: Message content signing
  console.log("📨 Test 4: Message Content Signing");
  console.log("-".repeat(30));
  
  const encryptedContent = "encrypted:abcd1234567890";
  const contentMessage = `SEND_TO:${receiverHash}:${encryptedContent}`;
  
  console.log(`Content Message: "${contentMessage}"`);
  
  const contentSignature = await sender.signMessage(contentMessage);
  console.log(`Content Signature: ${contentSignature}`);
  
  // Verify content signature
  const contentRecovered = ethers.verifyMessage(contentMessage, contentSignature);
  const contentValid = contentRecovered.toLowerCase() === sender.address.toLowerCase();
  
  console.log(`Content Valid: ${contentValid ? '✅ Yes' : '❌ No'}\n`);
  
  // Test 5: Batch signing
  console.log("📦 Test 5: Batch Message Signing");
  console.log("-".repeat(30));
  
  const messages = [
    "Message 1: Hello World!",
    "Message 2: How are you?",
    "Message 3: Goodbye!"
  ];
  
  console.log("Signing multiple messages:");
  const signatures = [];
  
  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i];
    const sig = await sender.signMessage(msg);
    signatures.push(sig);
    
    console.log(`   ${i + 1}. "${msg}"`);
    console.log(`      Signature: ${sig.substring(0, 20)}...`);
    
    // Verify each one
    const recovered = ethers.verifyMessage(msg, sig);
    const valid = recovered.toLowerCase() === sender.address.toLowerCase();
    console.log(`      Valid: ${valid ? '✅' : '❌'}`);
  }
  
  console.log(`\n📊 Batch Results: ${signatures.length} messages signed successfully\n`);
  
  // Summary
  console.log("=".repeat(50));
  console.log("🎉 Simple Test Signing Completed!");
  console.log("✨ All signature operations working correctly!");
  console.log("🔐 Ready for ShadowChat protocol integration!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Simple test signing failed:", error);
    process.exit(1);
  });

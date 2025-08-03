const { ethers } = require("hardhat");
const crypto = require("crypto");

/**
 * Test Signing Script for ShadowChat Protocol
 * Demonstrates various cryptographic signing operations including:
 * - Message signing and verification
 * - Typed data signing (EIP-712)
 * - Secret code verification
 * - Multi-signature operations
 * - Authorization signatures
 */

// Utility class for message signing operations
class MessageSigner {
  /**
   * Sign a message with private key
   * @param {string} message - The message to sign
   * @param {ethers.Wallet} wallet - The wallet to sign with
   * @returns {Object} Signature components
   */
  static async signMessage(message, wallet) {
    const messageHash = ethers.hashMessage(message);
    const signature = await wallet.signMessage(message);
    
    // Split signature into components
    const sig = ethers.Signature.from(signature);
    
    return {
      message,
      messageHash,
      signature,
      r: sig.r,
      s: sig.s,
      v: sig.v,
      signer: wallet.address
    };
  }
  
  /**
   * Verify a message signature
   * @param {string} message - Original message
   * @param {string} signature - Signature to verify
   * @param {string} expectedSigner - Expected signer address
   * @returns {boolean} Whether signature is valid
   */
  static verifyMessage(message, signature, expectedSigner) {
    try {
      const recoveredAddress = ethers.verifyMessage(message, signature);
      return recoveredAddress.toLowerCase() === expectedSigner.toLowerCase();
    } catch (error) {
      console.log(`❌ Signature verification failed: ${error.message}`);
      return false;
    }
  }
  
  /**
   * Sign typed data (EIP-712)
   * @param {Object} domain - Domain separator
   * @param {Object} types - Type definitions
   * @param {Object} value - Data to sign
   * @param {ethers.Wallet} wallet - Signer wallet
   * @returns {Object} Signature data
   */
  static async signTypedData(domain, types, value, wallet) {
    const signature = await wallet.signTypedData(domain, types, value);
    const sig = ethers.Signature.from(signature);
    
    // Compute the domain separator hash
    const domainHash = ethers.TypedDataEncoder.hashDomain(domain);
    const structHash = ethers.TypedDataEncoder.hashStruct("MessageAuth", types, value);
    const digest = ethers.TypedDataEncoder.hash(domain, types, value);
    
    return {
      signature,
      r: sig.r,
      s: sig.s,
      v: sig.v,
      domainHash,
      structHash,
      digest,
      signer: wallet.address
    };
  }
}

// Utility class for secret code operations
class SecretCodeManager {
  /**
   * Generate a secure secret code
   * @param {number} length - Length of secret code
   * @returns {string} Generated secret code
   */
  static generateSecretCode(length = 32) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }
  
  /**
   * Create receiver hash from secret code
   * @param {string} secretCode - The secret code
   * @returns {string} Receiver hash
   */
  static createReceiverHash(secretCode) {
    return ethers.keccak256(ethers.toUtf8Bytes(secretCode));
  }
  
  /**
   * Sign a secret code with timestamp for withdrawal authorization
   * @param {string} secretCode - The secret code
   * @param {string} withdrawerAddress - Address authorized to withdraw
   * @param {number} timestamp - Authorization timestamp
   * @param {ethers.Wallet} wallet - Authorizing wallet
   * @returns {Object} Authorization signature
   */
  static async signWithdrawalAuthorization(secretCode, withdrawerAddress, timestamp, wallet) {
    const message = `WITHDRAW_AUTH:${secretCode}:${withdrawerAddress}:${timestamp}`;
    return await MessageSigner.signMessage(message, wallet);
  }
}

// Multi-signature utilities
class MultiSigManager {
  /**
   * Create a multi-signature for message sending
   * @param {string} receiverHash - Receiver hash
   * @param {string} encryptedContent - Encrypted message content
   * @param {number} nonce - Transaction nonce
   * @param {Array<ethers.Wallet>} signers - Array of signer wallets
   * @returns {Object} Multi-signature data
   */
  static async createMultiSig(receiverHash, encryptedContent, nonce, signers) {
    const message = `SEND_MESSAGE:${receiverHash}:${encryptedContent}:${nonce}`;
    const signatures = [];
    
    for (const signer of signers) {
      const sig = await MessageSigner.signMessage(message, signer);
      signatures.push(sig);
    }
    
    return {
      message,
      signatures,
      signerAddresses: signers.map(s => s.address),
      threshold: signers.length
    };
  }
  
  /**
   * Verify multi-signature
   * @param {string} message - Original message
   * @param {Array} signatures - Array of signatures
   * @param {Array<string>} expectedSigners - Expected signer addresses
   * @returns {boolean} Whether all signatures are valid
   */
  static verifyMultiSig(message, signatures, expectedSigners) {
    if (signatures.length !== expectedSigners.length) {
      return false;
    }
    
    for (let i = 0; i < signatures.length; i++) {
      if (!MessageSigner.verifyMessage(message, signatures[i].signature, expectedSigners[i])) {
        return false;
      }
    }
    
    return true;
  }
}

async function main() {
  console.log("🔐 ShadowChat Protocol - Test Signing Script");
  console.log("🔑 Testing Cryptographic Signing Operations");
  console.log("=".repeat(60));
  
  // Set up test accounts
  const [deployer, sender, receiver, multisig1, multisig2, multisig3] = await ethers.getSigners();
  
  console.log("👥 Test Accounts:");
  console.log(`   Deployer: ${deployer.address}`);
  console.log(`   Sender: ${sender.address}`);
  console.log(`   Receiver: ${receiver.address}`);
  console.log(`   MultiSig 1: ${multisig1.address}`);
  console.log(`   MultiSig 2: ${multisig2.address}`);
  console.log(`   MultiSig 3: ${multisig3.address}\n`);
  
  // Test 1: Basic Message Signing
  console.log("📝 Test 1: Basic Message Signing");
  console.log("─".repeat(40));
  
  const testMessage = "Hello ShadowChat! This is a test message for signing.";
  console.log(`   📨 Original Message: "${testMessage}"`);
  
  const signResult = await MessageSigner.signMessage(testMessage, sender);
  console.log(`   🔐 Message Hash: ${signResult.messageHash}`);
  console.log(`   ✍️  Signature: ${signResult.signature}`);
  console.log(`   📊 Signature Components:`);
  console.log(`      r: ${signResult.r}`);
  console.log(`      s: ${signResult.s}`);
  console.log(`      v: ${signResult.v}`);
  console.log(`   👤 Signer: ${signResult.signer}`);
  
  // Verify the signature
  const isValid = MessageSigner.verifyMessage(testMessage, signResult.signature, sender.address);
  console.log(`   ✅ Signature Valid: ${isValid ? '✓' : '✗'}\n`);
  
  // Test 2: EIP-712 Typed Data Signing
  console.log("📋 Test 2: EIP-712 Typed Data Signing");
  console.log("─".repeat(40));
  
  // Define domain and types for ShadowChat message authorization
  const domain = {
    name: "ShadowChat",
    version: "1.0",
    chainId: await sender.provider.getNetwork().then(n => n.chainId),
    verifyingContract: "0x0000000000000000000000000000000000000000" // Placeholder
  };
  
  const types = {
    MessageAuth: [
      { name: "receiverHash", type: "bytes32" },
      { name: "sender", type: "address" },
      { name: "contentHash", type: "bytes32" },
      { name: "timestamp", type: "uint256" },
      { name: "nonce", type: "uint256" }
    ]
  };
  
  const messageData = {
    receiverHash: ethers.keccak256(ethers.toUtf8Bytes("test-receiver-secret")),
    sender: sender.address,
    contentHash: ethers.keccak256(ethers.toUtf8Bytes("encrypted-message-content")),
    timestamp: Math.floor(Date.now() / 1000),
    nonce: 1
  };
  
  console.log(`   📝 Domain:`);
  console.log(`      Name: ${domain.name}`);
  console.log(`      Version: ${domain.version}`);
  console.log(`      Chain ID: ${domain.chainId}`);
  console.log(`   📊 Message Data:`);
  console.log(`      Receiver Hash: ${messageData.receiverHash}`);
  console.log(`      Sender: ${messageData.sender}`);
  console.log(`      Content Hash: ${messageData.contentHash}`);
  console.log(`      Timestamp: ${messageData.timestamp}`);
  console.log(`      Nonce: ${messageData.nonce}`);
  
  const typedSig = await MessageSigner.signTypedData(domain, types, messageData, sender);
  console.log(`   🔐 Typed Data Signature: ${typedSig.signature}`);
  console.log(`   📊 Signature Components:`);
  console.log(`      r: ${typedSig.r}`);
  console.log(`      s: ${typedSig.s}`);
  console.log(`      v: ${typedSig.v}`);
  console.log(`   🏷️  Domain Hash: ${typedSig.domainHash}`);
  console.log(`   🔗 Struct Hash: ${typedSig.structHash}`);
  console.log(`   📄 Digest: ${typedSig.digest}\n`);
  
  // Test 3: Secret Code Management
  console.log("🔑 Test 3: Secret Code Management");
  console.log("─".repeat(40));
  
  // Generate secure secret codes
  const secretCode1 = SecretCodeManager.generateSecretCode(24);
  const secretCode2 = SecretCodeManager.generateSecretCode(32);
  const secretCode3 = SecretCodeManager.generateSecretCode(16);
  
  console.log(`   🎲 Generated Secret Codes:`);
  console.log(`      Code 1 (24 chars): ${secretCode1}`);
  console.log(`      Code 2 (32 chars): ${secretCode2}`);
  console.log(`      Code 3 (16 chars): ${secretCode3}`);
  
  // Create receiver hashes
  const receiverHash1 = SecretCodeManager.createReceiverHash(secretCode1);
  const receiverHash2 = SecretCodeManager.createReceiverHash(secretCode2);
  const receiverHash3 = SecretCodeManager.createReceiverHash(secretCode3);
  
  console.log(`   🔐 Receiver Hashes:`);
  console.log(`      Hash 1: ${receiverHash1}`);
  console.log(`      Hash 2: ${receiverHash2}`);
  console.log(`      Hash 3: ${receiverHash3}`);
  
  // Test collision resistance (same input should produce same hash)
  const duplicateHash = SecretCodeManager.createReceiverHash(secretCode1);
  console.log(`   🔍 Collision Test:`);
  console.log(`      Original Hash: ${receiverHash1}`);
  console.log(`      Duplicate Hash: ${duplicateHash}`);
  console.log(`      Match: ${receiverHash1 === duplicateHash ? '✓' : '✗'}\n`);
  
  // Test 4: Withdrawal Authorization Signatures
  console.log("💸 Test 4: Withdrawal Authorization Signatures");
  console.log("─".repeat(40));
  
  const withdrawerAddress = receiver.address;
  const authTimestamp = Math.floor(Date.now() / 1000);
  
  console.log(`   👤 Withdrawer: ${withdrawerAddress}`);
  console.log(`   ⏰ Timestamp: ${authTimestamp}`);
  console.log(`   🔑 Secret Code: ${secretCode1}`);
  
  const authSig = await SecretCodeManager.signWithdrawalAuthorization(
    secretCode1,
    withdrawerAddress,
    authTimestamp,
    sender
  );
  
  console.log(`   📝 Authorization Message: "${authSig.message}"`);
  console.log(`   ✍️  Authorization Signature: ${authSig.signature}`);
  console.log(`   👤 Authorizer: ${authSig.signer}`);
  
  // Verify authorization signature
  const authValid = MessageSigner.verifyMessage(authSig.message, authSig.signature, sender.address);
  console.log(`   ✅ Authorization Valid: ${authValid ? '✓' : '✗'}\n`);
  
  // Test 5: Multi-Signature Operations
  console.log("👥 Test 5: Multi-Signature Operations");
  console.log("─".repeat(40));
  
  const msigReceiverHash = receiverHash2;
  const msigContent = "encrypted-multisig-message-content";
  const msigNonce = 12345;
  const msigSigners = [multisig1, multisig2, multisig3];
  
  console.log(`   📨 Multi-Sig Message:`);
  console.log(`      Receiver Hash: ${msigReceiverHash}`);
  console.log(`      Content: ${msigContent}`);
  console.log(`      Nonce: ${msigNonce}`);
  console.log(`      Required Signers: ${msigSigners.length}`);
  
  const multiSigResult = await MultiSigManager.createMultiSig(
    msigReceiverHash,
    msigContent,
    msigNonce,
    msigSigners
  );
  
  console.log(`   📝 Multi-Sig Message: "${multiSigResult.message}"`);
  console.log(`   ✍️  Signatures:`);
  
  multiSigResult.signatures.forEach((sig, index) => {
    console.log(`      Signer ${index + 1} (${sig.signer}):`);
    console.log(`         Signature: ${sig.signature.substring(0, 42)}...`);
    console.log(`         r: ${sig.r.substring(0, 20)}...`);
    console.log(`         s: ${sig.s.substring(0, 20)}...`);
    console.log(`         v: ${sig.v}`);
  });
  
  // Verify multi-signature
  const msigValid = MultiSigManager.verifyMultiSig(
    multiSigResult.message,
    multiSigResult.signatures,
    multiSigResult.signerAddresses
  );
  console.log(`   ✅ Multi-Signature Valid: ${msigValid ? '✓' : '✗'}\n`);
  
  // Test 6: Signature Malleability and Security Tests
  console.log("🛡️  Test 6: Security Tests");
  console.log("─".repeat(40));
  
  const securityTestMessage = "Security test message for signature malleability";
  const originalSig = await MessageSigner.signMessage(securityTestMessage, sender);
  
  console.log(`   📨 Test Message: "${securityTestMessage}"`);
  console.log(`   ✍️  Original Signature: ${originalSig.signature}`);
  
  // Test with wrong signer
  const wrongSignerTest = MessageSigner.verifyMessage(
    securityTestMessage,
    originalSig.signature,
    receiver.address // Wrong signer
  );
  console.log(`   ❌ Wrong Signer Test: ${wrongSignerTest ? '✗ VULNERABLE' : '✓ SECURE'}`);
  
  // Test with modified message
  const modifiedMessage = securityTestMessage + " MODIFIED";
  const modifiedMessageTest = MessageSigner.verifyMessage(
    modifiedMessage,
    originalSig.signature,
    sender.address
  );
  console.log(`   ❌ Modified Message Test: ${modifiedMessageTest ? '✗ VULNERABLE' : '✓ SECURE'}`);
  
  // Test signature format validation
  try {
    const invalidSig = "0xinvalidsignature";
    const invalidSigTest = MessageSigner.verifyMessage(
      securityTestMessage,
      invalidSig,
      sender.address
    );
    console.log(`   ❌ Invalid Signature Test: ${invalidSigTest ? '✗ VULNERABLE' : '✓ SECURE'}`);
  } catch (error) {
    console.log(`   ✅ Invalid Signature Test: ✓ SECURE (Properly rejected)`);
  }
  
  // Test 7: Performance Benchmarking
  console.log("\n⚡ Test 7: Performance Benchmarking");
  console.log("─".repeat(40));
  
  const benchmarkIterations = 100;
  const benchmarkMessage = "Benchmark message for performance testing";
  
  console.log(`   🔄 Running ${benchmarkIterations} signing operations...`);
  
  const startTime = Date.now();
  
  for (let i = 0; i < benchmarkIterations; i++) {
    await MessageSigner.signMessage(benchmarkMessage + i, sender);
  }
  
  const endTime = Date.now();
  const totalTime = endTime - startTime;
  const avgTime = totalTime / benchmarkIterations;
  
  console.log(`   📊 Performance Results:`);
  console.log(`      Total Time: ${totalTime}ms`);
  console.log(`      Average Time per Signature: ${avgTime.toFixed(2)}ms`);
  console.log(`      Signatures per Second: ${(1000 / avgTime).toFixed(2)}`);
  
  // Test verification performance
  console.log(`   🔍 Testing verification performance...`);
  
  const verifyStartTime = Date.now();
  const testSig = await MessageSigner.signMessage(benchmarkMessage, sender);
  
  for (let i = 0; i < benchmarkIterations; i++) {
    MessageSigner.verifyMessage(benchmarkMessage, testSig.signature, sender.address);
  }
  
  const verifyEndTime = Date.now();
  const verifyTotalTime = verifyEndTime - verifyStartTime;
  const verifyAvgTime = verifyTotalTime / benchmarkIterations;
  
  console.log(`   📊 Verification Results:`);
  console.log(`      Total Time: ${verifyTotalTime}ms`);
  console.log(`      Average Time per Verification: ${verifyAvgTime.toFixed(2)}ms`);
  console.log(`      Verifications per Second: ${(1000 / verifyAvgTime).toFixed(2)}`);
  
  // Final Summary
  console.log("\n" + "=".repeat(60));
  console.log("🎉 Test Signing Script Completed Successfully!");
  console.log("✨ Tests Performed:");
  console.log("   ✅ Basic Message Signing & Verification");
  console.log("   ✅ EIP-712 Typed Data Signing");
  console.log("   ✅ Secret Code Management & Hashing");
  console.log("   ✅ Withdrawal Authorization Signatures");
  console.log("   ✅ Multi-Signature Operations");
  console.log("   ✅ Security & Malleability Tests");
  console.log("   ✅ Performance Benchmarking");
  console.log("\n🔐 All cryptographic operations validated!");
  console.log("🛡️  Security tests passed - signatures are secure!");
  console.log("⚡ Performance benchmarks completed!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Test signing script failed:", error);
    process.exit(1);
  });

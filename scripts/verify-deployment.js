const { ethers } = require("hardhat");
const fs = require('fs');
const path = require('path');

/**
 * Verification script for deployed ShadowChat contracts
 * This script helps verify that all contracts are deployed correctly and functioning
 */

async function main() {
    console.log("🔍 Starting ShadowChat Protocol Deployment Verification...\n");

    // Check if deployment file exists
    const deploymentsDir = './deployments';
    if (!fs.existsSync(deploymentsDir)) {
        console.error("❌ No deployments directory found. Please run deployment first.");
        process.exit(1);
    }

    // Get the latest deployment file
    const deploymentFiles = fs.readdirSync(deploymentsDir)
        .filter(file => file.endsWith('.json'))
        .sort()
        .reverse();

    if (deploymentFiles.length === 0) {
        console.error("❌ No deployment files found. Please run deployment first.");
        process.exit(1);
    }

    const latestDeployment = deploymentFiles[0];
    const deploymentPath = path.join(deploymentsDir, latestDeployment);
    
    console.log("📄 Using deployment file:", latestDeployment);
    
    const deploymentInfo = JSON.parse(fs.readFileSync(deploymentPath, 'utf8'));
    const contracts = deploymentInfo.contracts;

    console.log("🌐 Network:", deploymentInfo.network);
    console.log("🔗 Chain ID:", deploymentInfo.chainId);
    console.log("👤 Deployer:", deploymentInfo.deployer);
    console.log("");

    try {
        // Verify ShadowChatRegistry
        console.log("1️⃣  Verifying ShadowChatRegistry...");
        const registry = await ethers.getContractAt("ShadowChatRegistry", contracts.shadowChatRegistry);
        const registrationFee = await registry.registrationFee();
        const owner = await registry.owner();
        console.log("   ✅ ShadowChatRegistry verified at:", contracts.shadowChatRegistry);
        console.log("   📋 Registration Fee:", ethers.formatEther(registrationFee), "ETH");
        console.log("   👤 Owner:", owner);

        // Verify ShadowChatFactory
        console.log("2️⃣  Verifying ShadowChatFactory...");
        const factory = await ethers.getContractAt("ShadowChatFactory", contracts.shadowChatFactory);
        const messageFee = await factory.messageFee();
        const withdrawalFee = await factory.withdrawalFee();
        const totalShards = await factory.totalShards();
        const factoryOwner = await factory.owner();
        
        console.log("   ✅ ShadowChatFactory verified at:", contracts.shadowChatFactory);
        console.log("   💳 Message Fee:", ethers.formatEther(messageFee), "ETH");
        console.log("   💳 Withdrawal Fee:", ethers.formatEther(withdrawalFee), "ETH");
        console.log("   📦 Total Shards:", totalShards.toString());
        console.log("   👤 Owner:", factoryOwner);

        // Verify all shards
        console.log("   🔍 Verifying individual shards...");
        for (let i = 0; i < totalShards; i++) {
            const shardAddress = await factory.shards(i);
            const shardCode = await ethers.provider.getCode(shardAddress);
            if (shardCode === '0x') {
                throw new Error(`Shard ${i} not deployed or no code found`);
            }
            
            // Test basic shard functionality
            const shard = await ethers.getContractAt("ShadowChat", shardAddress);
            const shardMessageFee = await shard.messageFee();
            const shardWithdrawalFee = await shard.withdrawalFee();
            
            console.log(`   📦 Shard ${i} verified at: ${shardAddress}`);
            console.log(`      💳 Message Fee: ${ethers.formatEther(shardMessageFee)} ETH`);
            console.log(`      💳 Withdrawal Fee: ${ethers.formatEther(shardWithdrawalFee)} ETH`);
        }

        // Verify ShadowChatBatch
        console.log("3️⃣  Verifying ShadowChatBatch...");
        const batchCode = await ethers.provider.getCode(contracts.shadowChatBatch);
        if (batchCode === '0x') {
            throw new Error("ShadowChatBatch not deployed or no code found");
        }
        console.log("   ✅ ShadowChatBatch verified at:", contracts.shadowChatBatch);

        // Summary
        console.log("");
        console.log("🎉 All contracts verified successfully!");
        console.log("");
        console.log("📊 Verification Summary:");
        console.log("========================");
        console.log("✅ ShadowChatRegistry:  Registry with", ethers.formatEther(registrationFee), "ETH registration fee");
        console.log("✅ ShadowChatFactory:   Factory with", totalShards.toString(), "shards deployed");
        console.log("✅ ShadowChatBatch:     Batch operations contract deployed");
        console.log("");

        // Test basic interactions (optional)
        console.log("🧪 Running basic functionality tests...");
        
        // Test registry functionality
        const testAlias = "test-verification-" + Date.now();
        const testSecretCode = "test-secret-" + Math.random().toString(36).substring(7);
        
        console.log("   🔍 Testing registry read functions...");
        const totalRegistrations = await registry.totalRegistrations();
        const maxRegistrations = await registry.MAX_REGISTRATIONS_PER_USER();
        console.log("   📈 Total registrations:", totalRegistrations.toString());
        console.log("   📊 Max registrations per user:", maxRegistrations.toString());

        // Test factory read functions
        console.log("   🔍 Testing factory read functions...");
        const firstShardAddress = await factory.shards(0);
        console.log("   📦 First shard address:", firstShardAddress);

        console.log("   ✅ Basic functionality tests passed!");
        console.log("");
        console.log("🚀 Deployment verification complete!");
        console.log("");
        console.log("💡 Next steps:");
        console.log("   - Run full integration tests: npm run test");
        console.log("   - Test interactions: npm run interact:local");
        console.log("   - Run demo: npm run demo");
        
        if (deploymentInfo.network !== 'localhost' && deploymentInfo.network !== 'hardhat') {
            console.log("   - Verify contracts on Etherscan");
            console.log("   - Update frontend configuration");
        }

    } catch (error) {
        console.error("❌ Verification failed:", error.message);
        console.error("Stack trace:", error.stack);
        process.exit(1);
    }
}

// Execute verification
main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("❌ Verification script failed:", error);
        process.exit(1);
    });

const { ethers } = require("hardhat");

async function main() {
    console.log("🚀 Starting ShadowChat Protocol Deployment...\n");

    // Get the deployer account
    const [deployer] = await ethers.getSigners();
    console.log("📝 Deploying contracts with account:", deployer.address);
    console.log("💰 Account balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "ETH\n");

    // Configuration parameters
    const config = {
        messageFee: ethers.parseEther("0.001"), // 0.001 ETH per message
        withdrawalFee: ethers.parseEther("0.0005"), // 0.0005 ETH per withdrawal
        registrationFee: ethers.parseEther("0.01"), // 0.01 ETH to register receiverHash
        initialShards: 3 // Number of initial shards for the factory
    };

    console.log("⚙️  Deployment Configuration:");
    console.log("   - Message Fee:", ethers.formatEther(config.messageFee), "ETH");
    console.log("   - Withdrawal Fee:", ethers.formatEther(config.withdrawalFee), "ETH");
    console.log("   - Registration Fee:", ethers.formatEther(config.registrationFee), "ETH");
    console.log("   - Initial Shards:", config.initialShards);
    console.log("");

    const deployedContracts = {};

    try {
        // Step 1: Deploy ShadowChatRegistry
        console.log("1️⃣  Deploying ShadowChatRegistry...");
        const ShadowChatRegistry = await ethers.getContractFactory("ShadowChatRegistry");
        const shadowChatRegistry = await ShadowChatRegistry.deploy(config.registrationFee);
        await shadowChatRegistry.waitForDeployment();
        deployedContracts.shadowChatRegistry = await shadowChatRegistry.getAddress();
        console.log("   ✅ ShadowChatRegistry deployed to:", deployedContracts.shadowChatRegistry);
        console.log("");

        // Step 2: Deploy ShadowChatFactory
        console.log("2️⃣  Deploying ShadowChatFactory...");
        const ShadowChatFactory = await ethers.getContractFactory("ShadowChatFactory");
        const shadowChatFactory = await ShadowChatFactory.deploy(
            config.messageFee,
            config.withdrawalFee,
            config.initialShards
        );
        await shadowChatFactory.waitForDeployment();
        deployedContracts.shadowChatFactory = await shadowChatFactory.getAddress();
        console.log("   ✅ ShadowChatFactory deployed to:", deployedContracts.shadowChatFactory);
        
        // Get deployed shard addresses
        const totalShards = await shadowChatFactory.totalShards();
        console.log("   📦 Total shards deployed:", totalShards.toString());
        const shardAddresses = [];
        for (let i = 0; i < totalShards; i++) {
            const shardAddress = await shadowChatFactory.shards(i);
            shardAddresses.push(shardAddress);
            console.log(`   📦 Shard ${i} deployed to:`, shardAddress);
        }
        deployedContracts.shards = shardAddresses;
        console.log("");

        // Step 3: Deploy ShadowChatBatch
        console.log("3️⃣  Deploying ShadowChatBatch...");
        const ShadowChatBatch = await ethers.getContractFactory("ShadowChatBatch");
        const shadowChatBatch = await ShadowChatBatch.deploy();
        await shadowChatBatch.waitForDeployment();
        deployedContracts.shadowChatBatch = await shadowChatBatch.getAddress();
        console.log("   ✅ ShadowChatBatch deployed to:", deployedContracts.shadowChatBatch);
        console.log("");

        // Deployment Summary
        console.log("🎉 Deployment Complete! Summary:");
        console.log("=====================================");
        console.log("ShadowChatRegistry: ", deployedContracts.shadowChatRegistry);
        console.log("ShadowChatFactory:  ", deployedContracts.shadowChatFactory);
        console.log("ShadowChatBatch:    ", deployedContracts.shadowChatBatch);
        console.log("");

        // Save deployment info to file
        const deploymentInfo = {
            network: await ethers.provider.getNetwork().then(n => n.name),
            chainId: await ethers.provider.getNetwork().then(n => Number(n.chainId)),
            deployer: deployer.address,
            timestamp: new Date().toISOString(),
            config: {
                messageFee: config.messageFee.toString(),
                withdrawalFee: config.withdrawalFee.toString(),
                registrationFee: config.registrationFee.toString(),
                initialShards: config.initialShards
            },
            contracts: deployedContracts
        };

        // Write deployment info to JSON file
        const fs = require('fs');
        const deploymentPath = `./deployments/deployment-${Date.now()}.json`;
        
        // Create deployments directory if it doesn't exist
        if (!fs.existsSync('./deployments')) {
            fs.mkdirSync('./deployments', { recursive: true });
        }
        
        fs.writeFileSync(deploymentPath, JSON.stringify(deploymentInfo, null, 2));
        console.log("📄 Deployment info saved to:", deploymentPath);

        // Display next steps
        console.log("");
        console.log("🔧 Next Steps:");
        console.log("1. Verify deployment: npm run verify:deployment");
        console.log("2. Run comprehensive tests: npm run test:protocol");
        console.log("3. Test individual features: npm run interact:local");
        console.log("4. Run full demo: npm run demo");

    } catch (error) {
        console.error("❌ Deployment failed:", error);
        process.exit(1);
    }
}

// Execute deployment
main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("❌ Deployment script failed:", error);
        process.exit(1);
    });
const { ethers } = require("hardhat");

async function main() {
  console.log("Deploying ShadowChat Protocol...");
  
  // Get deployment parameters
  const messageFee = ethers.parseEther("0.01"); // 0.01 ETH per message
  const withdrawalFee = ethers.parseEther("0.001"); // 0.001 ETH withdrawal fee
  const initialShards = 5; // Start with 5 shards
  
  console.log(`Message Fee: ${ethers.formatEther(messageFee)} ETH`);
  console.log(`Withdrawal Fee: ${ethers.formatEther(withdrawalFee)} ETH`);
  console.log(`Initial Shards: ${initialShards}`);
  
  // Deploy the factory (which will deploy individual shards)
  console.log("\nDeploying ShadowChatFactory...");
  const ShadowChatFactory = await ethers.getContractFactory("ShadowChatFactory");
  const factory = await ShadowChatFactory.deploy(messageFee, withdrawalFee, initialShards);
  
  await factory.waitForDeployment();
  const factoryAddress = await factory.getAddress();
  
  console.log(`ShadowChatFactory deployed to: ${factoryAddress}`);
  
  // Get all shard addresses
  console.log("\nShard Addresses:");
  const shards = await factory.getAllShards();
  shards.forEach((shardAddress, index) => {
    console.log(`  Shard ${index}: ${shardAddress}`);
  });
  
  // Deploy a standalone contract for testing
  console.log("\nDeploying standalone ShadowChat for testing...");
  const ShadowChat = await ethers.getContractFactory("ShadowChat");
  const standalone = await ShadowChat.deploy(messageFee, withdrawalFee);
  
  await standalone.waitForDeployment();
  const standaloneAddress = await standalone.getAddress();
  
  console.log(`Standalone ShadowChat deployed to: ${standaloneAddress}`);
  
  // Save deployment info
  const deploymentInfo = {
    network: network.name,
    timestamp: new Date().toISOString(),
    factory: {
      address: factoryAddress,
      messageFee: messageFee.toString(),
      withdrawalFee: withdrawalFee.toString(),
      initialShards: initialShards,
      shards: shards
    },
    standalone: {
      address: standaloneAddress,
      messageFee: messageFee.toString(),
      withdrawalFee: withdrawalFee.toString()
    }
  };
  
  console.log("\n=== Deployment Summary ===");
  console.log(JSON.stringify(deploymentInfo, null, 2));
  
  // Verify contracts if not on localhost
  if (network.name !== "hardhat" && network.name !== "localhost") {
    console.log("\nWaiting for block confirmations before verification...");
    await factory.deploymentTransaction().wait(5);
    await standalone.deploymentTransaction().wait(5);
    
    try {
      console.log("Verifying Factory contract...");
      await run("verify:verify", {
        address: factoryAddress,
        constructorArguments: [messageFee, withdrawalFee, initialShards],
      });
      
      console.log("Verifying Standalone contract...");
      await run("verify:verify", {
        address: standaloneAddress,
        constructorArguments: [messageFee, withdrawalFee],
      });
    } catch (error) {
      console.log("Verification failed:", error.message);
    }
  }
  
  return deploymentInfo;
}

main()
  .then((info) => {
    console.log("\n✅ Deployment completed successfully!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  });

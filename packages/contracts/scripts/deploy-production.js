const { ethers } = require("hardhat");
const fs = require('fs');
const path = require('path');

// Cấu hình cho các networks khác nhau
const NETWORK_CONFIGS = {
  localhost: {
    messageFee: ethers.parseEther("0.001"), // Thấp cho test
    withdrawalFee: ethers.parseEther("0.0001"),
    initialShards: 3
  },
  goerli: {
    messageFee: ethers.parseEther("0.005"), // Phí trung bình
    withdrawalFee: ethers.parseEther("0.0005"),
    initialShards: 5
  },
  sepolia: {
    messageFee: ethers.parseEther("0.005"),
    withdrawalFee: ethers.parseEther("0.0005"), 
    initialShards: 5
  },
  mainnet: {
    messageFee: ethers.parseEther("0.01"), // Phí cao cho mainnet
    withdrawalFee: ethers.parseEther("0.001"),
    initialShards: 10 // Nhiều shards hơn cho mainnet
  }
};

async function main() {
  const networkName = network.name;
  const config = NETWORK_CONFIGS[networkName];
  
  if (!config) {
    throw new Error(`Không tìm thấy cấu hình cho network: ${networkName}`);
  }
  
  console.log(`🚀 Deploy ShadowChat Protocol trên ${networkName.toUpperCase()}`);
  console.log("=".repeat(50));
  
  const [deployer] = await ethers.getSigners();
  console.log(`📍 Deployer address: ${deployer.address}`);
  console.log(`💰 Balance: ${ethers.formatEther(await ethers.provider.getBalance(deployer.address))} ETH\n`);
  
  console.log("⚙️ Cấu hình deployment:");
  console.log(`   💸 Message Fee: ${ethers.formatEther(config.messageFee)} ETH`);
  console.log(`   💸 Withdrawal Fee: ${ethers.formatEther(config.withdrawalFee)} ETH`);
  console.log(`   🗂️ Initial Shards: ${config.initialShards}\n`);
  
  // Deploy Factory
  console.log("📦 Deploying ShadowChatFactory...");
  const ShadowChatFactory = await ethers.getContractFactory("ShadowChatFactory");
  const factory = await ShadowChatFactory.deploy(
    config.messageFee,
    config.withdrawalFee,
    config.initialShards
  );
  
  await factory.waitForDeployment();
  const factoryAddress = await factory.getAddress();
  console.log(`✅ Factory deployed: ${factoryAddress}`);
  
  // Deploy Batch Helper
  console.log("\n📦 Deploying ShadowChatBatch...");
  const ShadowChatBatch = await ethers.getContractFactory("ShadowChatBatch");
  const batch = await ShadowChatBatch.deploy();
  
  await batch.waitForDeployment();
  const batchAddress = await batch.getAddress();
  console.log(`✅ Batch Helper deployed: ${batchAddress}`);
  
  // Get shard addresses
  console.log("\n🗂️ Shard Addresses:");
  const shards = await factory.getAllShards();
  shards.forEach((shardAddress, index) => {
    console.log(`   Shard ${index}: ${shardAddress}`);
  });
  
  // Create deployment info
  const deploymentInfo = {
    network: networkName,
    timestamp: new Date().toISOString(),
    deployer: deployer.address,
    gasPrice: await ethers.provider.getGasPrice(),
    factory: {
      address: factoryAddress,
      messageFee: config.messageFee.toString(),
      withdrawalFee: config.withdrawalFee.toString(),
      initialShards: config.initialShards,
      shards: shards
    },
    batch: {
      address: batchAddress
    },
    config: {
      messageFeeETH: ethers.formatEther(config.messageFee),
      withdrawalFeeETH: ethers.formatEther(config.withdrawalFee),
      initialShards: config.initialShards
    }
  };
  
  // Save deployment info
  const deployDir = path.join(__dirname, '..', 'deployments');
  if (!fs.existsSync(deployDir)) {
    fs.mkdirSync(deployDir, { recursive: true });
  }
  
  const filename = `${networkName}-${Date.now()}.json`;
  const filepath = path.join(deployDir, filename);
  
  fs.writeFileSync(filepath, JSON.stringify(deploymentInfo, null, 2));
  
  console.log("\n📋 Deployment Summary:");
  console.log(JSON.stringify(deploymentInfo, null, 2));
  
  console.log(`\n💾 Deployment info saved: ${filepath}`);
  
  // Contract verification for non-local networks
  if (networkName !== "hardhat" && networkName !== "localhost") {
    console.log("\n⏳ Chờ block confirmations trước khi verify...");
    await factory.deploymentTransaction().wait(6);
    await batch.deploymentTransaction().wait(6);
    
    try {
      console.log("🔍 Verifying Factory contract...");
      await run("verify:verify", {
        address: factoryAddress,
        constructorArguments: [config.messageFee, config.withdrawalFee, config.initialShards],
      });
      
      console.log("🔍 Verifying Batch contract...");
      await run("verify:verify", {
        address: batchAddress,
        constructorArguments: [],
      });
      
      console.log("✅ Contracts verified successfully!");
      
    } catch (error) {
      console.log(`❌ Verification failed: ${error.message}`);
    }
  }
  
  // Show usage instructions
  console.log("\n" + "=".repeat(50));
  console.log("🎯 SỬ DỤNG HỆ THỐNG:");
  console.log("1️⃣ Frontend integration:");
  console.log(`   Factory Address: ${factoryAddress}`);
  console.log(`   Batch Helper: ${batchAddress}`);
  
  console.log("\n2️⃣ Để gửi tin nhắn:");
  console.log("   - Tạo receiverHash từ secret code");
  console.log("   - Nạp credit vào receiverHash");
  console.log("   - Gửi message với IPFS CID");
  
  console.log("\n3️⃣ Để nhận tin nhắn:");
  console.log("   - Listen events từ shard tương ứng");
  console.log("   - Download và decrypt từ IPFS");
  console.log("   - Verify sender signature");
  
  console.log("\n✨ Deployment hoàn tất thành công!");
  
  return deploymentInfo;
}

main()
  .then((info) => {
    console.log("\n🎉 SUCCESS!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("💥 DEPLOYMENT FAILED:", error);
    process.exit(1);
  });

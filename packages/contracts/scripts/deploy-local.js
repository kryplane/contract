const hre = require("hardhat");

async function main() {
  console.log("Deploying ShadowChat contracts to local network...");

  // Deploy ShadowChatRegistry with registration fee (0.01 ETH)
  const registrationFee = hre.ethers.parseEther("0.01");
  const ShadowChatRegistry = await hre.ethers.getContractFactory("ShadowChatRegistry");
  const registry = await ShadowChatRegistry.deploy(registrationFee);
  await registry.waitForDeployment();

  console.log("ShadowChatRegistry deployed to:", await registry.getAddress());

  // Deploy ShadowChatFactory with fees (0.001 ETH message fee, 0.001 ETH withdrawal fee, 10 initial shards)
  const messageFee = hre.ethers.parseEther("0.001");
  const withdrawalFee = hre.ethers.parseEther("0.001");
  const initialShards = 10;
  const ShadowChatFactory = await hre.ethers.getContractFactory("ShadowChatFactory");
  const factory = await ShadowChatFactory.deploy(messageFee, withdrawalFee, initialShards);
  await factory.waitForDeployment();

  console.log("ShadowChatFactory deployed to:", await factory.getAddress());

  // Deploy ShadowChatUtils (no constructor parameters)
  const ShadowChatUtils = await hre.ethers.getContractFactory("ShadowChatUtils");
  const utils = await ShadowChatUtils.deploy();
  await utils.waitForDeployment();

  console.log("ShadowChatUtils deployed to:", await utils.getAddress());

  // Deploy ShadowChatBatch (no constructor parameters)
  const ShadowChatBatch = await hre.ethers.getContractFactory("ShadowChatBatch");
  const batch = await ShadowChatBatch.deploy();
  await batch.waitForDeployment();

  console.log("ShadowChatBatch deployed to:", await batch.getAddress());

  // Save deployment addresses to a JSON file for frontend use
  const deployments = {
    networkName: "localhost",
    chainId: 31337,
    contracts: {
      ShadowChatRegistry: await registry.getAddress(),
      ShadowChatFactory: await factory.getAddress(),
      ShadowChatUtils: await utils.getAddress(),
      ShadowChatBatch: await batch.getAddress()
    },
    timestamp: new Date().toISOString()
  };

  const fs = require("fs");
  const path = require("path");
  
  // Create deployments directory if it doesn't exist
  const deploymentsDir = path.join(__dirname, "../deployments");
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir);
  }

  // Write deployment info
  fs.writeFileSync(
    path.join(deploymentsDir, "localhost.json"),
    JSON.stringify(deployments, null, 2)
  );

  console.log("\nDeployment complete! Contract addresses saved to deployments/localhost.json");
  console.log("\nTo use these contracts in your frontend:");
  console.log("1. Make sure MetaMask is connected to your local network (localhost:8545)");
  console.log("2. Import a test account using one of the private keys shown when you started the node");
  console.log("3. The contract addresses are now available in the deployments file");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

const hre = require("hardhat");

async function main() {
    console.log("Deploying ShadowChatRegistry...");

    // Get the ContractFactory and Signers here.
    const [deployer] = await hre.ethers.getSigners();

    console.log("Deploying contracts with the account:", deployer.address);
    console.log("Account balance:", (await hre.ethers.provider.getBalance(deployer.address)).toString());

    // Deploy ShadowChatRegistry
    const registrationFee = hre.ethers.parseEther("0.001"); // 0.001 ETH registration fee

    const ShadowChatRegistry = await hre.ethers.getContractFactory("ShadowChatRegistry");
    const registry = await ShadowChatRegistry.deploy(registrationFee);

    await registry.waitForDeployment();

    console.log("ShadowChatRegistry deployed to:", await registry.getAddress());
    console.log("Registration fee set to:", hre.ethers.formatEther(registrationFee), "ETH");

    // Verify contract on etherscan if we have the API key and we're not on localhost
    const network = await hre.ethers.provider.getNetwork();
    if (network.chainId !== 31337n && process.env.ETHERSCAN_API_KEY) {
        console.log("Waiting for block confirmations...");
        await registry.deploymentTransaction().wait(6);
        
        console.log("Verifying contract...");
        try {
            await hre.run("verify:verify", {
                address: await registry.getAddress(),
                constructorArguments: [registrationFee],
            });
        } catch (error) {
            console.log("Verification failed:", error);
        }
    }

    // Display contract information
    console.log("\n=== Contract Deployment Summary ===");
    console.log("Network:", network.name, `(Chain ID: ${network.chainId})`);
    console.log("ShadowChatRegistry:", await registry.getAddress());
    console.log("Registration Fee:", hre.ethers.formatEther(registrationFee), "ETH");
    console.log("Max Registrations Per User:", await registry.MAX_REGISTRATIONS_PER_USER());
    console.log("Min Alias Length:", await registry.MIN_ALIAS_LENGTH());
    console.log("Max Alias Length:", await registry.MAX_ALIAS_LENGTH());
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

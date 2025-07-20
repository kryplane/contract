const hre = require("hardhat");

async function main() {
    const [deployer, user1, user2] = await hre.ethers.getSigners();

    console.log("=== ShadowChatRegistry Demo ===\n");

    // Deploy the contract first
    const registrationFee = hre.ethers.parseEther("0.001");
    const ShadowChatRegistry = await hre.ethers.getContractFactory("ShadowChatRegistry");
    const registry = await ShadowChatRegistry.deploy(registrationFee);
    await registry.waitForDeployment();

    const registryAddress = await registry.getAddress();
    console.log("ShadowChatRegistry deployed to:", registryAddress);
    console.log("Registration fee:", hre.ethers.formatEther(registrationFee), "ETH\n");

    // Connect to registry with different users
    const registryAsUser1 = registry.connect(user1);
    const registryAsUser2 = registry.connect(user2);

    try {
        // Example 1: User1 registers a public receiverHash
        console.log("1. User1 registering public receiverHash...");
        const secretCode1 = "my-secret-code-123";
        const aliasName1 = "user1_public";
        
        const tx1 = await registryAsUser1.registerReceiverHash(
            secretCode1,
            true, // isPublic
            aliasName1,
            { value: registrationFee }
        );
        await tx1.wait();
        
        const publicReceiverHash = await registry.getReceiverHashByAddress(user1.address);
        console.log("✅ Public receiverHash registered:", publicReceiverHash);
        console.log("   User1 address:", user1.address);
        console.log();

        // Example 2: User2 registers a private receiverHash
        console.log("2. User2 registering private receiverHash...");
        const secretCode2 = "another-secret-456";
        const aliasName2 = "user2_private";
        
        const tx2 = await registryAsUser2.registerReceiverHash(
            secretCode2,
            false, // isPublic = false (private)
            aliasName2,
            { value: registrationFee }
        );
        await tx2.wait();
        
        console.log("✅ Private receiverHash registered with alias:", aliasName2);
        console.log("   User2 address:", user2.address);
        console.log();

        // Example 3: Retrieve public receiverHash by address
        console.log("3. Retrieving public receiverHash by address...");
        const retrievedPublicHash = await registry.getReceiverHashByAddress(user1.address);
        console.log("✅ Retrieved public receiverHash:", retrievedPublicHash);
        console.log("   Matches:", retrievedPublicHash === publicReceiverHash);
        console.log();

        // Example 4: User2 retrieves their private receiverHash by alias
        console.log("4. User2 retrieving private receiverHash by alias...");
        const privateReceiverHash = await registryAsUser2.getReceiverHashByAlias(aliasName2);
        console.log("✅ Private receiverHash retrieved:", privateReceiverHash);
        console.log();

        // Example 5: Try to access private alias as unauthorized user (should fail)
        console.log("5. Testing unauthorized access to private alias...");
        try {
            await registryAsUser1.getReceiverHashByAlias(aliasName2);
            console.log("❌ This should have failed!");
        } catch (error) {
            console.log("✅ Access denied as expected:", error.reason);
        }
        console.log();

        // Example 6: Check alias availability
        console.log("6. Checking alias availability...");
        const availableAlias = "available_alias";
        const takenAlias = aliasName1;
        
        const isAvailable = await registry.isAliasAvailable(availableAlias);
        const isTaken = await registry.isAliasAvailable(takenAlias);
        
        console.log(`✅ Alias '${availableAlias}' is available:`, isAvailable);
        console.log(`✅ Alias '${takenAlias}' is taken:`, !isTaken);
        console.log();

        // Example 7: Get receiverHash info
        console.log("7. Getting receiverHash information...");
        const info = await registry.getReceiverHashInfo(publicReceiverHash);
        console.log("✅ ReceiverHash info:");
        console.log("   Owner:", info.owner);
        console.log("   Is Public:", info.isPublic);
        console.log("   Alias:", info.aliasName);
        console.log("   Registered at:", new Date(Number(info.registeredAt) * 1000).toISOString());
        console.log();

        // Example 8: Get contract statistics
        console.log("8. Getting contract statistics...");
        const totalRegs = await registry.totalRegistrations();
        const user1Count = await registry.userRegistrationCount(user1.address);
        const user2Count = await registry.userRegistrationCount(user2.address);
        
        console.log("✅ Contract Statistics:");
        console.log("   Total registrations:", totalRegs.toString());
        console.log("   User1 registrations:", user1Count.toString());
        console.log("   User2 registrations:", user2Count.toString());
        console.log();

        console.log("=== Demo completed successfully! ===");

    } catch (error) {
        console.error("Error during demo:", error);
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

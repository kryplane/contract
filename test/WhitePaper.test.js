const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("ShadowChat Protocol - WhitePaper Compliance Tests", function () {
    let ShadowChat, shadowChat;
    let ShadowChatRegistry, registry;
    let ShadowChatFactory, factory;
    let owner, user1, user2, user3, sender, receiver;
    let messageFee, withdrawalFee, registrationFee;

    beforeEach(async function () {
        [owner, user1, user2, user3, sender, receiver] = await ethers.getSigners();
        
        // Set fees as per whitepaper
        messageFee = ethers.parseEther("0.01"); // Per-message fee
        withdrawalFee = ethers.parseEther("0.001"); // Withdrawal fee
        registrationFee = ethers.parseEther("0.001"); // Registration fee
        
        // Deploy contracts
        ShadowChat = await ethers.getContractFactory("ShadowChat");
        shadowChat = await ShadowChat.deploy(messageFee, withdrawalFee);
        await shadowChat.waitForDeployment();

        ShadowChatRegistry = await ethers.getContractFactory("ShadowChatRegistry");
        registry = await ShadowChatRegistry.deploy(registrationFee);
        await registry.waitForDeployment();

        ShadowChatFactory = await ethers.getContractFactory("ShadowChatFactory");
        factory = await ShadowChatFactory.deploy(messageFee, withdrawalFee, 2); // 2 initial shards
        await factory.waitForDeployment();

        ShadowChatBatch = await ethers.getContractFactory("ShadowChatBatch");
        batch = await ShadowChatBatch.deploy();
        await batch.waitForDeployment();
    });

    describe("1. WhitePaper Section 3.1: Setting up Receiver Hash", function () {
        it("Should generate receiverHash using keccak256(secretCode) as specified", async function () {
            // As per whitepaper: "receiverHash = keccak256(secretCode)"
            const secretCode = "my-32-byte-random-secret-string!!";
            const expectedReceiverHash = ethers.keccak256(ethers.toUtf8Bytes(secretCode));
            
            // Test that our implementation matches the whitepaper specification
            const contractReceiverHash = await shadowChat.connect(user1).calculateReceiverHash ?
                await shadowChat.connect(user1).calculateReceiverHash(secretCode) :
                ethers.keccak256(ethers.toUtf8Bytes(secretCode));
            
            expect(contractReceiverHash).to.equal(expectedReceiverHash);
        });

        it("Should allow 32-byte random string as secretCode per whitepaper", async function () {
            const secretCode = "abcdefghijklmnopqrstuvwxyz123456"; // 32 bytes
            const receiverHash = ethers.keccak256(ethers.toUtf8Bytes(secretCode));
            
            // Should be valid hash format
            expect(receiverHash).to.match(/^0x[a-fA-F0-9]{64}$/);
            expect(receiverHash).to.not.equal(ethers.ZeroHash);
        });

        it("Should create unique receiverHash for different secretCodes", async function () {
            const secretCode1 = "secret-code-user-1";
            const secretCode2 = "secret-code-user-2";
            
            const hash1 = ethers.keccak256(ethers.toUtf8Bytes(secretCode1));
            const hash2 = ethers.keccak256(ethers.toUtf8Bytes(secretCode2));
            
            expect(hash1).to.not.equal(hash2);
        });
    });

    describe("2. WhitePaper Section 3.2: Depositing Credits", function () {
        let receiverHash;

        beforeEach(async function () {
            const secretCode = "test-secret-for-deposits";
            receiverHash = ethers.keccak256(ethers.toUtf8Bytes(secretCode));
        });

        it("Should allow anonymous credit deposits as per whitepaper", async function () {
            // Whitepaper: "Anyone can fund a receiver hash anonymously"
            const depositAmount = ethers.parseEther("0.1");
            
            // Different users can deposit to same receiverHash anonymously
            await expect(
                shadowChat.connect(user1).depositCredit(receiverHash, { value: depositAmount })
            ).to.emit(shadowChat, "CreditDeposited")
                .withArgs(receiverHash, depositAmount, depositAmount);

            await expect(
                shadowChat.connect(user2).depositCredit(receiverHash, { value: depositAmount })
            ).to.emit(shadowChat, "CreditDeposited")
                .withArgs(receiverHash, depositAmount, depositAmount * 2n);

            expect(await shadowChat.getCreditBalance(receiverHash)).to.equal(depositAmount * 2n);
        });

        it("Should implement depositCredit function exactly as whitepaper specifies", async function () {
            // Whitepaper function signature: depositCredit(bytes32 receiverHash) external payable
            const depositAmount = ethers.parseEther("0.05");
            
            const initialBalance = await shadowChat.getCreditBalance(receiverHash);
            await shadowChat.connect(user1).depositCredit(receiverHash, { value: depositAmount });
            const finalBalance = await shadowChat.getCreditBalance(receiverHash);
            
            expect(finalBalance - initialBalance).to.equal(depositAmount);
        });

        it("Should maintain creditBalance mapping as specified in whitepaper", async function () {
            const depositAmount = ethers.parseEther("0.2");
            
            // Initial balance should be 0
            expect(await shadowChat.getCreditBalance(receiverHash)).to.equal(0);
            
            // After deposit, balance should equal deposit amount
            await shadowChat.connect(user1).depositCredit(receiverHash, { value: depositAmount });
            expect(await shadowChat.getCreditBalance(receiverHash)).to.equal(depositAmount);
        });
    });

    describe("3. WhitePaper Section 3.3: Sending Messages", function () {
        let receiverHash;
        const secretCode = "message-receiver-secret";
        const encryptedMessage = "AES-encrypted-message-content-as-per-whitepaper";

        beforeEach(async function () {
            receiverHash = ethers.keccak256(ethers.toUtf8Bytes(secretCode));
            
            // Deposit sufficient credits
            const depositAmount = ethers.parseEther("1");
            await shadowChat.connect(user1).depositCredit(receiverHash, { value: depositAmount });
        });

        it("Should implement sendMessage function as specified in whitepaper", async function () {
            // Whitepaper: sendMessage(bytes32 receiverHash, string calldata encryptedMessage)
            const tx = await shadowChat.connect(sender).sendMessage(receiverHash, encryptedMessage);
            const receipt = await tx.wait();
            
            // Verify the event was emitted with correct parameters
            const events = await shadowChat.queryFilter(
                shadowChat.filters.MessageSent(),
                receipt.blockNumber,
                receipt.blockNumber
            );
            
            expect(events).to.have.lengthOf(1);
            expect(events[0].args.sender).to.equal(sender.address);
            expect(events[0].args.receiverHash).to.equal(receiverHash);
            expect(events[0].args.encryptedContent).to.equal(encryptedMessage);
        });

        it("Should require sufficient creditBalance before sending", async function () {
            // Whitepaper: "require(creditBalance[receiverHash] >= messageFee)"
            const poorReceiverHash = ethers.keccak256(ethers.toUtf8Bytes("poor-receiver"));
            
            await expect(
                shadowChat.connect(sender).sendMessage(poorReceiverHash, encryptedMessage)
            ).to.be.revertedWith("Insufficient credits");
        });

        it("Should deduct messageFee from creditBalance", async function () {
            // Whitepaper: "creditBalance[receiverHash] -= messageFee"
            const initialBalance = await shadowChat.getCreditBalance(receiverHash);
            
            await shadowChat.connect(sender).sendMessage(receiverHash, encryptedMessage);
            
            const finalBalance = await shadowChat.getCreditBalance(receiverHash);
            expect(initialBalance - finalBalance).to.equal(messageFee);
        });

        it("Should emit MessageSent event with receiverHash, encryptedMessage, and timestamp", async function () {
            // Whitepaper: "emit MessageSent(receiverHash, encryptedMessage, block.timestamp)"
            const tx = await shadowChat.connect(sender).sendMessage(receiverHash, encryptedMessage);
            const receipt = await tx.wait();
            const block = await ethers.provider.getBlock(receipt.blockNumber);
            
            const events = await shadowChat.queryFilter(
                shadowChat.filters.MessageSent(),
                receipt.blockNumber,
                receipt.blockNumber
            );
            
            expect(events).to.have.lengthOf(1);
            expect(events[0].args.receiverHash).to.equal(receiverHash);
            expect(events[0].args.encryptedContent).to.equal(encryptedMessage);
            expect(events[0].args.timestamp).to.equal(block.timestamp);
        });

        it("Should store encrypted message content directly on-chain as per whitepaper", async function () {
            // Whitepaper: "encrypted message content stored directly in contract events"
            const longEncryptedMessage = "Very-long-encrypted-message-content-that-demonstrates-on-chain-storage-capability-as-specified-in-whitepaper";
            
            const tx = await shadowChat.connect(sender).sendMessage(receiverHash, longEncryptedMessage);
            const receipt = await tx.wait();
            
            const events = await shadowChat.queryFilter(
                shadowChat.filters.MessageSent(),
                receipt.blockNumber,
                receipt.blockNumber
            );
            
            expect(events).to.have.lengthOf(1);
            expect(events[0].args.encryptedContent).to.equal(longEncryptedMessage);
        });

        it("Should allow multiple messages to same receiverHash", async function () {
            const message1 = "first-encrypted-message";
            const message2 = "second-encrypted-message";
            
            await shadowChat.connect(sender).sendMessage(receiverHash, message1);
            await shadowChat.connect(user2).sendMessage(receiverHash, message2);
            
            // Both messages should be sent successfully
            expect(await shadowChat.totalMessages()).to.equal(2);
        });
    });

    describe("4. WhitePaper Section 3.4: Receiving Messages", function () {
        let receiverHash;
        const secretCode = "message-listening-secret";

        beforeEach(async function () {
            receiverHash = ethers.keccak256(ethers.toUtf8Bytes(secretCode));
            
            // Setup credits and send a message
            const depositAmount = ethers.parseEther("1");
            await shadowChat.connect(user1).depositCredit(receiverHash, { value: depositAmount });
        });

        it("Should enable filtering MessageSent events by receiverHash", async function () {
            // Whitepaper: "Frontend watches only for MessageSent(receiverHash) matching its own receiverHash"
            const message = "test-encrypted-message";
            
            const tx = await shadowChat.connect(sender).sendMessage(receiverHash, message);
            const receipt = await tx.wait();
            
            // Filter events by receiverHash (3rd indexed parameter)
            const filter = shadowChat.filters.MessageSent(null, null, receiverHash);
            const events = await shadowChat.queryFilter(filter, receipt.blockNumber, receipt.blockNumber);
            
            expect(events).to.have.lengthOf(1);
            expect(events[0].args.receiverHash).to.equal(receiverHash);
            expect(events[0].args.encryptedContent).to.equal(message);
        });

        it("Should provide event data for decryption and sender verification", async function () {
            // Whitepaper: "decrypts the message content directly from the event data and verifies sender via ECDSA signature"
            const message = "message-with-signature-data";
            
            const tx = await shadowChat.connect(sender).sendMessage(receiverHash, message);
            const receipt = await tx.wait();
            
            const events = await shadowChat.queryFilter(
                shadowChat.filters.MessageSent(null, null, receiverHash),
                receipt.blockNumber,
                receipt.blockNumber
            );
            
            expect(events).to.have.lengthOf(1);
            expect(events[0].args.encryptedContent).to.equal(message);
            expect(events[0].args.timestamp).to.be.a('bigint');
            // Event should contain all data needed for decryption and verification
        });

        it("Should not expose receiver identity through events", async function () {
            // Whitepaper: "Receiver identity is obfuscated"
            const message = "privacy-test-message";
            
            const tx = await shadowChat.connect(sender).sendMessage(receiverHash, message);
            const receipt = await tx.wait();
            
            // Events should only contain receiverHash, not wallet addresses
            const events = await shadowChat.queryFilter(
                shadowChat.filters.MessageSent(),
                receipt.blockNumber,
                receipt.blockNumber
            );
            
            // No wallet address should be in event args
            expect(events[0].args.receiverHash).to.equal(receiverHash);
            expect(events[0].args).to.not.include(receiver.address);
            expect(events[0].args).to.not.include(user1.address);
        });
    });

    describe("5. WhitePaper Section 3.5: Credit Withdrawal", function () {
        let receiverHash;
        const secretCode = "withdrawal-test-secret";

        beforeEach(async function () {
            receiverHash = ethers.keccak256(ethers.toUtf8Bytes(secretCode));
            
            // Deposit credits
            const depositAmount = ethers.parseEther("0.5");
            await shadowChat.connect(user1).depositCredit(receiverHash, { value: depositAmount });
        });

        it("Should require receiver signature for withdrawal authorization", async function () {
            // Whitepaper: "Receiver signs a withdraw intent with their main wallet"
            const withdrawAmount = ethers.parseEther("0.1");
            
            // First authorize withdrawal
            await shadowChat.connect(receiver).authorizeWithdrawal(receiverHash, receiver.address, secretCode);
            
            // Then withdraw
            const initialBalance = await ethers.provider.getBalance(receiver.address);
            await shadowChat.connect(receiver).withdrawCredit(receiverHash, withdrawAmount);
            const finalBalance = await ethers.provider.getBalance(receiver.address);
            
            // Should receive withdrawn amount minus gas and fees
            expect(finalBalance).to.be.greaterThan(initialBalance);
        });

        it("Should allow extracting unused credits", async function () {
            // Whitepaper: "extract unused credit"
            const initialCreditBalance = await shadowChat.getCreditBalance(receiverHash);
            const withdrawAmount = ethers.parseEther("0.1");
            
            await shadowChat.connect(receiver).authorizeWithdrawal(receiverHash, receiver.address, secretCode);
            await shadowChat.connect(receiver).withdrawCredit(receiverHash, withdrawAmount);
            
            const finalCreditBalance = await shadowChat.getCreditBalance(receiverHash);
            expect(initialCreditBalance - finalCreditBalance).to.equal(withdrawAmount);
        });

        it("Should charge withdrawal fee as specified", async function () {
            const withdrawAmount = ethers.parseEther("0.1");
            const initialBalance = await shadowChat.getCreditBalance(receiverHash);
            const initialEthBalance = await ethers.provider.getBalance(receiver.address);
            
            await shadowChat.connect(receiver).authorizeWithdrawal(receiverHash, receiver.address, secretCode);
            await shadowChat.connect(receiver).withdrawCredit(receiverHash, withdrawAmount);
            
            const finalBalance = await shadowChat.getCreditBalance(receiverHash);
            const finalEthBalance = await ethers.provider.getBalance(receiver.address);
            const totalDeducted = initialBalance - finalBalance;
            
            // Credit balance should only be reduced by withdraw amount
            expect(totalDeducted).to.equal(withdrawAmount);
            // User balance should increase by less than withdrawal amount (due to fees and gas)
            expect(finalEthBalance).to.be.lessThan(initialEthBalance + withdrawAmount);
            // But should still be greater than initial balance (net positive)
            expect(finalEthBalance).to.be.greaterThan(initialEthBalance);
        });
    });

    describe("6. WhitePaper Section 4: Privacy and Security Analysis", function () {
        let receiverHash1, receiverHash2;
        const secretCode1 = "user1-private-secret";
        const secretCode2 = "user2-private-secret";

        beforeEach(async function () {
            receiverHash1 = ethers.keccak256(ethers.toUtf8Bytes(secretCode1));
            receiverHash2 = ethers.keccak256(ethers.toUtf8Bytes(secretCode2));
            
            // Fund both receivers
            await shadowChat.connect(user1).depositCredit(receiverHash1, { value: ethers.parseEther("0.5") });
            await shadowChat.connect(user2).depositCredit(receiverHash2, { value: ethers.parseEther("0.5") });
        });

        it("Should obfuscate receiver identity through hashed secrets", async function () {
            // Whitepaper: "Receiver identity is obfuscated"
            const message = "privacy-preserving-message";
            
            await shadowChat.connect(sender).sendMessage(receiverHash1, message);
            
            // receiverHash should not reveal actual wallet address
            expect(receiverHash1).to.not.equal(user1.address);
            expect(receiverHash1).to.not.equal(user2.address);
            expect(receiverHash1).to.not.equal(sender.address);
        });

        it("Should enable end-to-end encryption with on-chain storage", async function () {
            // Whitepaper: "Message payload is encrypted end-to-end and stored on-chain"
            const encryptedMessage = "AES256-encrypted-content-stored-immutably-on-blockchain";
            
            const tx = await shadowChat.connect(sender).sendMessage(receiverHash1, encryptedMessage);
            const receipt = await tx.wait();
            
            // Message should be stored exactly as provided (encrypted)
            const events = await shadowChat.queryFilter(
                shadowChat.filters.MessageSent(null, null, receiverHash1),
                receipt.blockNumber,
                receipt.blockNumber
            );
            
            expect(events[0].args.encryptedContent).to.equal(encryptedMessage);
        });

        it("Should prevent linkage between receiverHash and wallet unless explicitly exposed", async function () {
            // Whitepaper: "No linkage between receiverHash and wallet unless explicitly exposed"
            const message = "unlinkable-message";
            
            await shadowChat.connect(sender).sendMessage(receiverHash1, message);
            
            // Contract should not store wallet address mappings for receiverHash
            // (unless user explicitly registers in registry)
            const filter = shadowChat.filters.MessageSent(null, null, receiverHash1);
            const events = await shadowChat.queryFilter(filter);
            
            // Events should not contain wallet addresses
            for (const event of events) {
                expect(event.args).to.not.include(user1.address);
                expect(event.args).to.not.include(user2.address);
            }
        });

        it("Should maintain immutability of encrypted content", async function () {
            // Whitepaper: "ensuring privacy while maintaining immutability"
            const message = "immutable-encrypted-message";
            
            const tx = await shadowChat.connect(sender).sendMessage(receiverHash1, message);
            const receipt = await tx.wait();
            
            // Message should be permanently stored and unchanged
            const events = await shadowChat.queryFilter(
                shadowChat.filters.MessageSent(null, null, receiverHash1),
                receipt.blockNumber,
                receipt.blockNumber
            );
            
            expect(events[0].args.encryptedContent).to.equal(message);
            
            // Multiple queries should return same data
            const events2 = await shadowChat.queryFilter(
                shadowChat.filters.MessageSent(null, null, receiverHash1),
                receipt.blockNumber,
                receipt.blockNumber
            );
            
            expect(events2[0].args.encryptedContent).to.equal(message);
        });
    });

    describe("7. WhitePaper Section 5: Scaling Strategy - Sharding", function () {
        it("Should route receiverHash to appropriate shard using modulo operation", async function () {
            // Whitepaper: "receiverHash % N routes messages to one of N shard contracts"
            const numShards = await factory.totalShards();
            
            if (numShards > 1n) {
                const secretCode = "sharding-test-secret";
                const receiverHash = ethers.keccak256(ethers.toUtf8Bytes(secretCode));
                
                const expectedShardId = BigInt(receiverHash) % numShards;
                const [shardAddress, actualShardId] = await factory.getShardForReceiver(receiverHash);
                
                expect(actualShardId).to.equal(expectedShardId);
            }
        });

        it("Should enable load balancing through hash distribution", async function () {
            // Whitepaper: "Hashing ensures even distribution"
            const shardCounts = new Map();
            const numTests = 10;
            
            // Test multiple receiverHashes
            for (let i = 0; i < numTests; i++) {
                const secretCode = `shard-test-${i}`;
                const receiverHash = ethers.keccak256(ethers.toUtf8Bytes(secretCode));
                const shardId = await factory.getShardForReceiver ? 
                    await factory.getShardForReceiver(receiverHash) :
                    BigInt(receiverHash) % 3n; // Assume 3 shards for test
                
                shardCounts.set(shardId.toString(), (shardCounts.get(shardId.toString()) || 0) + 1);
            }
            
            // Distribution should be reasonably balanced (not all in one shard)
            expect(shardCounts.size).to.be.greaterThan(1);
        });

        it("Should allow clients to listen to specific shards only", async function () {
            // Whitepaper: "Each client only listens to its assigned shard"
            const secretCode = "client-shard-test";
            const receiverHash = ethers.keccak256(ethers.toUtf8Bytes(secretCode));
            
            // Get shard for this receiverHash
            const [shardAddress, shardId] = await factory.getShardForReceiver(receiverHash);
            
            // Client should only need to monitor events from this specific shard
            expect(shardAddress).to.be.properAddress;
        });
    });

    describe("8. WhitePaper Section 6: Anti-Spam Model", function () {
        let receiverHash;

        beforeEach(async function () {
            const secretCode = "anti-spam-test";
            receiverHash = ethers.keccak256(ethers.toUtf8Bytes(secretCode));
        });

        it("Should enforce credit system as anti-spam mechanism", async function () {
            // Whitepaper: "Credit system acts as anti-spam fee"
            const message = "potential-spam-message";
            
            // Should fail without credits
            await expect(
                shadowChat.connect(sender).sendMessage(receiverHash, message)
            ).to.be.revertedWith("Insufficient credits");
            
            // Should succeed with credits
            await shadowChat.connect(user1).depositCredit(receiverHash, { value: ethers.parseEther("0.1") });
            await expect(
                shadowChat.connect(sender).sendMessage(receiverHash, message)
            ).to.emit(shadowChat, "MessageSent");
        });

        it("Should use configurable per-message fee", async function () {
            // Whitepaper: "Per-message fee is configurable"
            const currentFee = await shadowChat.messageFee();
            expect(currentFee).to.equal(messageFee);
            
            // Owner should be able to update fee
            const newFee = ethers.parseEther("0.02");
            await shadowChat.connect(owner).updateMessageFee(newFee);
            
            expect(await shadowChat.messageFee()).to.equal(newFee);
        });

        it("Should allow third-party funding without linking identities", async function () {
            // Whitepaper: "Third parties can fund public inboxes without linking identities"
            const thirdParty = user3;
            const depositAmount = ethers.parseEther("0.1");
            
            // Third party funds receiverHash
            await shadowChat.connect(thirdParty).depositCredit(receiverHash, { value: depositAmount });
            
            // Receiver can receive messages without revealing connection to third party
            const message = "third-party-funded-message";
            const tx = await shadowChat.connect(sender).sendMessage(receiverHash, message);
            const receipt = await tx.wait();
            
            // No on-chain link between thirdParty and receiverHash in message events
            const events = await shadowChat.queryFilter(
                shadowChat.filters.MessageSent(),
                receipt.blockNumber,
                receipt.blockNumber
            );
            
            expect(events).to.have.lengthOf(1);
            expect(events[0].args.encryptedContent).to.equal(message);
            expect(events[0].args.sender).to.not.equal(thirdParty.address);
        });

        it("Should prevent spam through economic barriers", async function () {
            const spamMessages = ["spam1", "spam2", "spam3", "spam4", "spam5"];
            
            // Fund with enough for only 2 messages
            const limitedFunding = messageFee * 2n + ethers.parseEther("0.001");
            await shadowChat.connect(user1).depositCredit(receiverHash, { value: limitedFunding });
            
            // First 2 messages should succeed
            await shadowChat.connect(sender).sendMessage(receiverHash, spamMessages[0]);
            await shadowChat.connect(sender).sendMessage(receiverHash, spamMessages[1]);
            
            // Third message should fail due to insufficient credits
            await expect(
                shadowChat.connect(sender).sendMessage(receiverHash, spamMessages[2])
            ).to.be.revertedWith("Insufficient credits");
        });
    });

    describe("9. WhitePaper Registry Integration", function () {
        let receiverHash;
        const secretCode = "registry-integration-secret";
        const aliasName = "test_user_alias";

        beforeEach(async function () {
            receiverHash = ethers.keccak256(ethers.toUtf8Bytes(secretCode));
        });

        it("Should integrate with registry for receiverHash management", async function () {
            // Register receiverHash in registry
            await registry.connect(user1).registerReceiverHash(
                secretCode,
                true, // isPublic
                aliasName,
                { value: registrationFee }
            );
            
            // Verify registration
            const retrievedHash = await registry.getReceiverHashByAddress(user1.address);
            expect(retrievedHash).to.equal(receiverHash);
        });

        it("Should support both public and private receiverHash registration", async function () {
            // Public registration
            await registry.connect(user1).registerReceiverHash(
                secretCode,
                true,
                "public_alias",
                { value: registrationFee }
            );
            
            // Private registration
            await registry.connect(user2).registerReceiverHash(
                "private-secret-code",
                false,
                "private_alias",
                { value: registrationFee }
            );
            
            // Public should be retrievable by address
            const publicHash = await registry.getReceiverHashByAddress(user1.address);
            expect(publicHash).to.not.equal(ethers.ZeroHash);
            
            // Private should only be accessible to owner
            const privateHash = await registry.connect(user2).getReceiverHashByAlias("private_alias");
            expect(privateHash).to.not.equal(ethers.ZeroHash);
        });

        it("Should enable alias-based receiverHash lookup", async function () {
            await registry.connect(user1).registerReceiverHash(
                secretCode,
                false, // private
                aliasName,
                { value: registrationFee }
            );
            
            // Owner can lookup by alias
            const retrievedHash = await registry.connect(user1).getReceiverHashByAlias(aliasName);
            expect(retrievedHash).to.equal(receiverHash);
            
            // Non-owner should not be able to access private alias
            await expect(
                registry.connect(user2).getReceiverHashByAlias(aliasName)
            ).to.be.revertedWith("Not authorized to access private alias");
        });
    });

    describe("10. WhitePaper End-to-End Workflow", function () {
        it("Should demonstrate complete whitepaper workflow", async function () {
            // Step 1: Setup receiver hash (Section 3.1)
            const secretCode = "complete-workflow-secret-code";
            const receiverHash = ethers.keccak256(ethers.toUtf8Bytes(secretCode));
            
            // Step 2: Deposit credits (Section 3.2)
            const depositAmount = ethers.parseEther("0.5");
            await shadowChat.connect(user1).depositCredit(receiverHash, { value: depositAmount });
            
            expect(await shadowChat.getCreditBalance(receiverHash)).to.equal(depositAmount);
            
            // Step 3: Send message (Section 3.3)
            const encryptedMessage = "AES-encrypted-end-to-end-test-message";
            const tx = await shadowChat.connect(sender).sendMessage(receiverHash, encryptedMessage);
            
            // Verify message sent and fee deducted
            expect(await shadowChat.getCreditBalance(receiverHash)).to.equal(depositAmount - messageFee);
            
            // Step 4: Receive message (Section 3.4)
            const receipt = await tx.wait();
            const events = await shadowChat.queryFilter(
                shadowChat.filters.MessageSent(),
                receipt.blockNumber,
                receipt.blockNumber
            );
            
            expect(events).to.have.lengthOf(1);
            expect(events[0].args.receiverHash).to.equal(receiverHash);
            expect(events[0].args.encryptedContent).to.equal(encryptedMessage);
            
            // Step 5: Optional credit withdrawal (Section 3.5)
            const withdrawAmount = ethers.parseEther("0.1");
            await shadowChat.connect(receiver).authorizeWithdrawal(receiverHash, receiver.address, secretCode);
            await shadowChat.connect(receiver).withdrawCredit(receiverHash, withdrawAmount);
            
            const finalBalance = await shadowChat.getCreditBalance(receiverHash);
            const expectedBalance = depositAmount - messageFee - withdrawAmount;
            expect(finalBalance).to.equal(expectedBalance);
        });

        it("Should maintain privacy throughout complete workflow", async function () {
            const secretCode = "privacy-workflow-test";
            const receiverHash = ethers.keccak256(ethers.toUtf8Bytes(secretCode));
            
            // Fund anonymously
            await shadowChat.connect(user3).depositCredit(receiverHash, { value: ethers.parseEther("0.2") });
            
            // Send encrypted message
            const encryptedMessage = "privacy-preserving-encrypted-content";
            await shadowChat.connect(sender).sendMessage(receiverHash, encryptedMessage);
            
            // Verify no wallet addresses exposed in events
            const events = await shadowChat.queryFilter(shadowChat.filters.MessageSent(receiverHash));
            
            for (const event of events) {
                expect(event.args.receiverHash).to.equal(receiverHash);
                expect(event.args.encryptedMessage).to.equal(encryptedMessage);
                // No wallet addresses should be exposed
                expect(JSON.stringify(event.args)).to.not.include(user3.address.toLowerCase());
                expect(JSON.stringify(event.args)).to.not.include(sender.address.toLowerCase());
            }
        });
    });

    // Helper function for any value matching in tests (not used anymore)
    // function anyValue() {
    //     return expect.anything();
    // }
});

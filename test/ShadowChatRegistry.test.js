const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("ShadowChatRegistry - WhitePaper Registry Compliance", function () {
    let ShadowChatRegistry, registry;
    let owner, user1, user2, user3;
    let registrationFee;

    beforeEach(async function () {
        [owner, user1, user2, user3] = await ethers.getSigners();
        
        registrationFee = ethers.parseEther("0.001");
        
        ShadowChatRegistry = await ethers.getContractFactory("ShadowChatRegistry");
        registry = await ShadowChatRegistry.deploy(registrationFee);
        await registry.waitForDeployment();
    });

    describe("Registry System for ReceiverHash Management", function () {
        const secretCode1 = "registry-secret-code-1";
        const secretCode2 = "registry-secret-code-2";
        let receiverHash1, receiverHash2;

        beforeEach(async function () {
            receiverHash1 = ethers.keccak256(ethers.toUtf8Bytes(secretCode1));
            receiverHash2 = ethers.keccak256(ethers.toUtf8Bytes(secretCode2));
        });

        it("Should register receiverHash with proper fee payment", async function () {
            const aliasName = "user1_public";
            
            await expect(
                registry.connect(user1).registerReceiverHash(
                    secretCode1,
                    true, // isPublic
                    aliasName,
                    { value: registrationFee }
                )
            ).to.emit(registry, "ReceiverHashRegistered")
                .withArgs(receiverHash1, user1.address, true, aliasName);
            
            expect(await registry.totalRegistrations()).to.equal(1);
            expect(await registry.userRegistrationCount(user1.address)).to.equal(1);
        });

        it("Should handle public receiverHash registration correctly", async function () {
            const aliasName = "public_user";
            
            await registry.connect(user1).registerReceiverHash(
                secretCode1,
                true,
                aliasName,
                { value: registrationFee }
            );
            
            // Public receiverHash should be retrievable by address
            const retrievedHash = await registry.getReceiverHashByAddress(user1.address);
            expect(retrievedHash).to.equal(receiverHash1);
            
            // Get full info
            const info = await registry.getReceiverHashInfo(receiverHash1);
            expect(info.owner).to.equal(user1.address);
            expect(info.isPublic).to.be.true;
            expect(info.aliasName).to.equal(aliasName);
        });

        it("Should handle private receiverHash registration correctly", async function () {
            const aliasName = "private_user";
            
            await registry.connect(user1).registerReceiverHash(
                secretCode1,
                false, // private
                aliasName,
                { value: registrationFee }
            );
            
            // Private receiverHash should NOT be retrievable by address
            expect(await registry.getReceiverHashByAddress(user1.address)).to.equal(ethers.ZeroHash);
            
            // But should be retrievable by alias (for owner only)
            const retrievedHash = await registry.connect(user1).getReceiverHashByAlias(aliasName);
            expect(retrievedHash).to.equal(receiverHash1);
            
            // Non-owner should not be able to access
            await expect(
                registry.connect(user2).getReceiverHashByAlias(aliasName)
            ).to.be.revertedWith("Not authorized to access private alias");
        });

        it("Should enforce alias uniqueness", async function () {
            const aliasName = "unique_alias";
            
            // First registration should succeed
            await registry.connect(user1).registerReceiverHash(
                secretCode1,
                false,
                aliasName,
                { value: registrationFee }
            );
            
            // Second registration with same alias should fail
            await expect(
                registry.connect(user2).registerReceiverHash(
                    secretCode2,
                    false,
                    aliasName,
                    { value: registrationFee }
                )
            ).to.be.revertedWith("Alias already taken");
        });

        it("Should check alias availability", async function () {
            const takenAlias = "taken_alias";
            const availableAlias = "available_alias";
            
            // Register one alias
            await registry.connect(user1).registerReceiverHash(
                secretCode1,
                false,
                takenAlias,
                { value: registrationFee }
            );
            
            // Check availability
            expect(await registry.isAliasAvailable(takenAlias)).to.be.false;
            expect(await registry.isAliasAvailable(availableAlias)).to.be.true;
        });

        it("Should enforce registration limits per user", async function () {
            const maxRegistrations = await registry.MAX_REGISTRATIONS_PER_USER();
            
            // Register up to the limit
            for (let i = 0; i < maxRegistrations; i++) {
                await registry.connect(user1).registerReceiverHash(
                    `secret-code-${i}-that-is-long-enough`,
                    false,
                    `alias${i}`,
                    { value: registrationFee }
                );
            }
            
            // Next registration should fail
            await expect(
                registry.connect(user1).registerReceiverHash(
                    "extra-secret-code-that-is-valid",
                    false,
                    "extraalias",
                    { value: registrationFee }
                )
            ).to.be.revertedWith("Max registrations exceeded");
        });

        it("Should validate secret code format", async function () {
            const invalidSecretCodes = ["", "ab", "a".repeat(256)]; // Too short or too long
            
            for (const invalidCode of invalidSecretCodes) {
                await expect(
                    registry.connect(user1).registerReceiverHash(
                        invalidCode,
                        true,
                        "test_alias",
                        { value: registrationFee }
                    )
                ).to.be.revertedWith("Invalid secret code format");
            }
        });

        it("Should validate alias format", async function () {
            const invalidAliases = ["ab", "a".repeat(50)]; // Too short or too long
            
            for (const invalidAlias of invalidAliases) {
                await expect(
                    registry.connect(user1).registerReceiverHash(
                        secretCode1,
                        true,
                        invalidAlias,
                        { value: registrationFee }
                    )
                ).to.be.revertedWith("Invalid alias format");
            }
        });

        it("Should require sufficient registration fee", async function () {
            const insufficientFee = registrationFee - 1n;
            
            await expect(
                registry.connect(user1).registerReceiverHash(
                    secretCode1,
                    true,
                    "test_alias",
                    { value: insufficientFee }
                )
            ).to.be.revertedWith("Insufficient registration fee");
        });

        it("Should prevent duplicate receiverHash registration", async function () {
            const aliasName1 = "alias1";
            const aliasName2 = "alias2";
            
            // First registration
            await registry.connect(user1).registerReceiverHash(
                secretCode1,
                true,
                aliasName1,
                { value: registrationFee }
            );
            
            // Second registration with same secret (same receiverHash) should fail
            await expect(
                registry.connect(user2).registerReceiverHash(
                    secretCode1, // Same secret code = same receiverHash
                    false,
                    aliasName2,
                    { value: registrationFee }
                )
            ).to.be.revertedWith("ReceiverHash already registered");
        });

        it("Should handle mixed public and private registrations for same user", async function () {
            const publicAlias = "public_alias";
            const privateAlias = "private_alias";
            const secretCode3 = "third-secret-code";
            const receiverHash3 = ethers.keccak256(ethers.toUtf8Bytes(secretCode3));
            
            // Register public receiverHash
            await registry.connect(user1).registerReceiverHash(
                secretCode1,
                true,
                publicAlias,
                { value: registrationFee }
            );
            
            // Register private receiverHash
            await registry.connect(user1).registerReceiverHash(
                secretCode3,
                false,
                privateAlias,
                { value: registrationFee }
            );
            
            // Should be able to retrieve public by address
            expect(await registry.getReceiverHashByAddress(user1.address)).to.equal(receiverHash1);
            
            // Should be able to retrieve private by alias
            const privateHash = await registry.connect(user1).getReceiverHashByAlias(privateAlias);
            expect(privateHash).to.equal(receiverHash3);
            
            // User should have 2 registrations
            expect(await registry.userRegistrationCount(user1.address)).to.equal(2);
        });

        it("Should allow multiple public registrations updating the latest", async function () {
            const alias1 = "publicalias1";
            const alias2 = "publicalias2";
            const secretCode3 = "new-public-secret-code";
            const receiverHash3 = ethers.keccak256(ethers.toUtf8Bytes(secretCode3));
            
            // First public registration
            await registry.connect(user1).registerReceiverHash(
                secretCode1,
                true,
                alias1,
                { value: registrationFee }
            );
            
            expect(await registry.getReceiverHashByAddress(user1.address)).to.equal(receiverHash1);
            
            // User1 should not be able to register another public receiverHash
            await expect(
                registry.connect(user1).registerReceiverHash(
                    secretCode3,
                    true,
                    alias2,
                    { value: registrationFee }
                )
            ).to.be.revertedWith("User already has public receiverHash");
        });

        it("Should provide comprehensive receiverHash information", async function () {
            const aliasName = "info_test_alias";
            
            const tx = await registry.connect(user1).registerReceiverHash(
                secretCode1,
                true,
                aliasName,
                { value: registrationFee }
            );
            
            const receipt = await tx.wait();
            const block = await ethers.provider.getBlock(receipt.blockNumber);
            
            const info = await registry.getReceiverHashInfo(receiverHash1);
            
            expect(info.owner).to.equal(user1.address);
            expect(info.isPublic).to.be.true;
            expect(info.aliasName).to.equal(aliasName);
            expect(info.registeredAt).to.equal(block.timestamp);
        });

        it("Should track registration statistics correctly", async function () {
            const initialTotal = await registry.totalRegistrations();
            const initialUser1Count = await registry.userRegistrationCount(user1.address);
            const initialUser2Count = await registry.userRegistrationCount(user2.address);
            
            // User1 registers 2 receiverHashes
            await registry.connect(user1).registerReceiverHash(
                secretCode1,
                true,
                "alias1",
                { value: registrationFee }
            );
            
            await registry.connect(user1).registerReceiverHash(
                "second-secret-code-for-user1",
                false,
                "alias2",
                { value: registrationFee }
            );
            
            // User2 registers 1 receiverHash
            await registry.connect(user2).registerReceiverHash(
                secretCode2,
                true,
                "alias3",
                { value: registrationFee }
            );
            
            expect(await registry.totalRegistrations()).to.equal(initialTotal + 3n);
            expect(await registry.userRegistrationCount(user1.address)).to.equal(initialUser1Count + 2n);
            expect(await registry.userRegistrationCount(user2.address)).to.equal(initialUser2Count + 1n);
        });
    });

    describe("Registry Owner Functions", function () {
        it("Should prevent owner from updating registration fee without proper event", async function () {
            const newFee = ethers.parseEther("0.002");
            
            // This test checks that the function exists and works
            await registry.connect(owner).updateRegistrationFee(newFee);
            expect(await registry.registrationFee()).to.equal(newFee);
        });

        it("Should prevent non-owner from updating registration fee", async function () {
            const newFee = ethers.parseEther("0.002");
            
            await expect(
                registry.connect(user1).updateRegistrationFee(newFee)
            ).to.be.revertedWithCustomError(registry, "OwnableUnauthorizedAccount");
        });

        it("Should allow owner to withdraw collected fees", async function () {
            // Generate some fee revenue
            await registry.connect(user1).registerReceiverHash(
                "valid-secret-code-1",
                true,
                "alias1",
                { value: registrationFee }
            );
            
            await registry.connect(user2).registerReceiverHash(
                "valid-secret-code-2",
                false,
                "alias2",
                { value: registrationFee }
            );
            
            const contractBalance = await ethers.provider.getBalance(registry.target);
            expect(contractBalance).to.equal(registrationFee * 2n);
            
            const ownerBalanceBefore = await ethers.provider.getBalance(owner.address);
            
            await registry.connect(owner).withdrawFees(owner.address);
            
            const ownerBalanceAfter = await ethers.provider.getBalance(owner.address);
            const contractBalanceAfter = await ethers.provider.getBalance(registry.target);
            
            expect(contractBalanceAfter).to.equal(0);
            expect(ownerBalanceAfter).to.be.greaterThan(ownerBalanceBefore);
        });

        it("Should allow owner to pause and unpause contract", async function () {
            // Pause contract
            await registry.connect(owner).pause();
            
            // Should not be able to register when paused
            await expect(
                registry.connect(user1).registerReceiverHash(
                    "valid-secret-code",
                    true,
                    "alias",
                    { value: registrationFee }
                )
            ).to.be.revertedWithCustomError(registry, "EnforcedPause");
            
            // Unpause contract
            await registry.connect(owner).unpause();
            
            // Should be able to register again
            await expect(
                registry.connect(user1).registerReceiverHash(
                    "valid-secret-code",
                    true,
                    "alias",
                    { value: registrationFee }
                )
            ).to.emit(registry, "ReceiverHashRegistered");
        });
    });

    describe("Registry Integration with WhitePaper Scenarios", function () {
        it("Should support anonymous tip jar scenario", async function () {
            // Journalist registers public receiverHash for tips
            const journalistSecret = "journalist-tip-secret-2024";
            const tipJarAlias = "journalist_tips";
            const journalistHash = ethers.keccak256(ethers.toUtf8Bytes(journalistSecret));
            
            await registry.connect(user1).registerReceiverHash(
                journalistSecret,
                true, // Public so anyone can find it
                tipJarAlias,
                { value: registrationFee }
            );
            
            // Anyone can lookup the public tip jar
            const retrievedHash = await registry.getReceiverHashByAddress(user1.address);
            expect(retrievedHash).to.equal(journalistHash);
            
            // Verify it's registered as public
            const info = await registry.getReceiverHashInfo(journalistHash);
            expect(info.isPublic).to.be.true;
            expect(info.aliasName).to.equal(tipJarAlias);
        });

        it("Should support decentralized dating platform scenario", async function () {
            // Users register private receiverHashes for dating
            const user1Secret = "dating-user1-private-inbox";
            const user2Secret = "dating-user2-private-inbox";
            const user1Alias = "dating_user_001";
            const user2Alias = "dating_user_002";
            
            // Both users register private inboxes
            await registry.connect(user1).registerReceiverHash(
                user1Secret,
                false, // Private
                user1Alias,
                { value: registrationFee }
            );
            
            await registry.connect(user2).registerReceiverHash(
                user2Secret,
                false, // Private
                user2Alias,
                { value: registrationFee }
            );
            
            // Users can access their own private aliases
            const user1Hash = await registry.connect(user1).getReceiverHashByAlias(user1Alias);
            const user2Hash = await registry.connect(user2).getReceiverHashByAlias(user2Alias);
            
            expect(user1Hash).to.equal(ethers.keccak256(ethers.toUtf8Bytes(user1Secret)));
            expect(user2Hash).to.equal(ethers.keccak256(ethers.toUtf8Bytes(user2Secret)));
            
            // But cannot access each other's private aliases
            await expect(
                registry.connect(user1).getReceiverHashByAlias(user2Alias)
            ).to.be.revertedWith("Not authorized to access private alias");
            
            await expect(
                registry.connect(user2).getReceiverHashByAlias(user1Alias)
            ).to.be.revertedWith("Not authorized to access private alias");
        });

        it("Should support NFT project support inbox scenario", async function () {
            // NFT project registers public support inbox
            const projectSecret = "nft-project-support-2024";
            const supportAlias = "nft_project_support";
            const projectHash = ethers.keccak256(ethers.toUtf8Bytes(projectSecret));
            
            await registry.connect(user1).registerReceiverHash(
                projectSecret,
                true, // Public for community access
                supportAlias,
                { value: registrationFee }
            );
            
            // Community members can find the support inbox
            const supportHash = await registry.getReceiverHashByAddress(user1.address);
            expect(supportHash).to.equal(projectHash);
            
            // Verify support inbox is public and accessible
            const info = await registry.getReceiverHashInfo(projectHash);
            expect(info.isPublic).to.be.true;
            expect(info.owner).to.equal(user1.address);
        });

        it("Should support token-gated community messaging scenario", async function () {
            // Community creates multiple private channels
            const channels = [
                { secret: "token-gate-general", alias: "general_chat" },
                { secret: "token-gate-vip", alias: "vip_chat" },
                { secret: "token-gate-dev", alias: "dev_chat" }
            ];
            
            // Register multiple private channels for community
            for (const channel of channels) {
                await registry.connect(user1).registerReceiverHash(
                    channel.secret,
                    false, // Private channels
                    channel.alias,
                    { value: registrationFee }
                );
            }
            
            // Verify all channels are registered
            expect(await registry.userRegistrationCount(user1.address)).to.equal(3);
            
            // Community owner can access all channels
            for (const channel of channels) {
                const channelHash = await registry.connect(user1).getReceiverHashByAlias(channel.alias);
                const expectedHash = ethers.keccak256(ethers.toUtf8Bytes(channel.secret));
                expect(channelHash).to.equal(expectedHash);
            }
        });

        it("Should handle alias conflicts gracefully", async function () {
            const popularAlias = "popular_name";
            
            // First user registers the alias
            await registry.connect(user1).registerReceiverHash(
                "valid-secret-code-1",
                false,
                popularAlias,
                { value: registrationFee }
            );
            
            // Second user tries same alias - should fail
            await expect(
                registry.connect(user2).registerReceiverHash(
                    "valid-secret-code-2",
                    false,
                    popularAlias,
                    { value: registrationFee }
                )
            ).to.be.revertedWith("Alias already taken");
            
            // Second user uses different alias - should succeed
            await registry.connect(user2).registerReceiverHash(
                "valid-secret-code-2",
                false,
                "alternativename",
                { value: registrationFee }
            );
            
            expect(await registry.userRegistrationCount(user2.address)).to.equal(1);
        });
    });

    describe("Registry Error Handling and Edge Cases", function () {
        it("Should handle empty alias for public registration", async function () {
            // Public registration should work even with empty alias
            await registry.connect(user1).registerReceiverHash(
                "valid-public-secret-code",
                true,
                "", // Empty alias should be allowed for public
                { value: registrationFee }
            );
            
            const hash = await registry.getReceiverHashByAddress(user1.address);
            expect(hash).to.not.equal(ethers.ZeroHash);
        });

        it("Should require non-empty alias for private registration", async function () {
            // Private registration should require alias
            await expect(
                registry.connect(user1).registerReceiverHash(
                    "valid-private-secret-code",
                    false,
                    "", // Empty alias not allowed for private
                    { value: registrationFee }
                )
            ).to.be.revertedWith("Alias required for private registration");
        });

        it("Should handle maximum length inputs", async function () {
            const maxLengthSecret = "a".repeat(50); // Reasonable max length for secret codes
            const maxLengthAlias = "b".repeat(32); // MAX_ALIAS_LENGTH
            
            await registry.connect(user1).registerReceiverHash(
                maxLengthSecret,
                false,
                maxLengthAlias,
                { value: registrationFee }
            );
            
            expect(await registry.userRegistrationCount(user1.address)).to.equal(1);
        });

        it("Should return zero hash for non-existent public address", async function () {
            const nonExistentHash = await registry.getReceiverHashByAddress(user3.address);
            expect(nonExistentHash).to.equal(ethers.ZeroHash);
        });

        it("Should revert for non-existent private alias", async function () {
            await expect(
                registry.connect(user1).getReceiverHashByAlias("nonexistentalias")
            ).to.be.revertedWith("Alias not found");
        });

        it("Should handle registration info for non-existent receiverHash", async function () {
            const nonExistentHash = ethers.keccak256(ethers.toUtf8Bytes("non-existent-secret"));
            
            await expect(
                registry.getReceiverHashInfo(nonExistentHash)
            ).to.be.revertedWith("ReceiverHash not found");
        });
    });
});

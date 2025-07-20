const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("ShadowChatRegistry", function () {
    let ShadowChatRegistry;
    let registry;
    let owner;
    let user1;
    let user2;
    let user3;
    const registrationFee = ethers.parseEther("0.001");

    beforeEach(async function () {
        [owner, user1, user2, user3] = await ethers.getSigners();
        
        ShadowChatRegistry = await ethers.getContractFactory("ShadowChatRegistry");
        registry = await ShadowChatRegistry.deploy(registrationFee);
        await registry.waitForDeployment();
    });

    describe("Deployment", function () {
        it("Should set the right owner", async function () {
            expect(await registry.owner()).to.equal(owner.address);
        });

        it("Should set the right registration fee", async function () {
            expect(await registry.registrationFee()).to.equal(registrationFee);
        });

        it("Should have correct constants", async function () {
            expect(await registry.MAX_REGISTRATIONS_PER_USER()).to.equal(10);
            expect(await registry.MIN_ALIAS_LENGTH()).to.equal(3);
            expect(await registry.MAX_ALIAS_LENGTH()).to.equal(32);
        });
    });

    describe("Public Registration", function () {
        it("Should allow public receiverHash registration", async function () {
            const secretCode = "my-secret-code-123";
            const aliasName = "user1_alias";
            
            await expect(registry.connect(user1).registerReceiverHash(
                secretCode,
                true, // isPublic
                aliasName,
                { value: registrationFee }
            )).to.emit(registry, "ReceiverHashRegistered");

            const receiverHash = await registry.getReceiverHashByAddress(user1.address);
            expect(receiverHash).to.not.equal(ethers.ZeroHash);
        });

        it("Should reject registration with insufficient fee", async function () {
            const secretCode = "my-secret-code-123";
            const aliasName = "user1_alias";
            const insufficientFee = ethers.parseEther("0.0001");
            
            await expect(registry.connect(user1).registerReceiverHash(
                secretCode,
                true,
                aliasName,
                { value: insufficientFee }
            )).to.be.revertedWith("Insufficient registration fee");
        });

        it("Should reject invalid secret codes", async function () {
            const shortSecretCode = "short";
            const aliasName = "user1_alias";
            
            await expect(registry.connect(user1).registerReceiverHash(
                shortSecretCode,
                true,
                aliasName,
                { value: registrationFee }
            )).to.be.revertedWith("Invalid secret code format");
        });

        it("Should reject invalid alias formats", async function () {
            const secretCode = "my-secret-code-123";
            const invalidAlias = "a"; // too short
            
            await expect(registry.connect(user1).registerReceiverHash(
                secretCode,
                true,
                invalidAlias,
                { value: registrationFee }
            )).to.be.revertedWith("Invalid alias format");
        });

        it("Should prevent duplicate public registrations for same user", async function () {
            const secretCode1 = "secret-code-1";
            const secretCode2 = "secret-code-2";
            const aliasName1 = "alias1";
            const aliasName2 = "alias2";
            
            // First registration should succeed
            await registry.connect(user1).registerReceiverHash(
                secretCode1,
                true,
                aliasName1,
                { value: registrationFee }
            );

            // Second public registration should fail
            await expect(registry.connect(user1).registerReceiverHash(
                secretCode2,
                true,
                aliasName2,
                { value: registrationFee }
            )).to.be.revertedWith("User already has public receiverHash");
        });
    });

    describe("Private Registration", function () {
        it("Should allow private receiverHash registration", async function () {
            const secretCode = "private-secret-code";
            const aliasName = "private_alias";
            
            await expect(registry.connect(user1).registerReceiverHash(
                secretCode,
                false, // isPublic = false
                aliasName,
                { value: registrationFee }
            )).to.emit(registry, "ReceiverHashRegistered");

            // Should not appear in public mappings
            const publicHash = await registry.getReceiverHashByAddress(user1.address);
            expect(publicHash).to.equal(ethers.ZeroHash);
        });

        it("Should require alias for private registration", async function () {
            const secretCode = "private-secret-code-long-enough";
            const emptyAlias = "";
            
            await expect(registry.connect(user1).registerReceiverHash(
                secretCode,
                false,
                emptyAlias,
                { value: registrationFee }
            )).to.be.revertedWith("Alias required for private registration");
        });

        it("Should prevent duplicate aliases", async function () {
            const secretCode1 = "secret-1";
            const secretCode2 = "secret-2";
            const aliasName = "same_alias";
            
            // First registration
            await registry.connect(user1).registerReceiverHash(
                secretCode1,
                false,
                aliasName,
                { value: registrationFee }
            );

            // Second registration with same alias should fail
            await expect(registry.connect(user2).registerReceiverHash(
                secretCode2,
                false,
                aliasName,
                { value: registrationFee }
            )).to.be.revertedWith("Alias already taken");
        });
    });

    describe("Lookup Functions", function () {
        beforeEach(async function () {
            // Set up test data
            await registry.connect(user1).registerReceiverHash(
                "public-secret",
                true,
                "public_alias",
                { value: registrationFee }
            );

            await registry.connect(user2).registerReceiverHash(
                "private-secret",
                false,
                "private_alias",
                { value: registrationFee }
            );
        });

        it("Should retrieve receiverHash by address for public registrations", async function () {
            const receiverHash = await registry.getReceiverHashByAddress(user1.address);
            expect(receiverHash).to.not.equal(ethers.ZeroHash);
        });

        it("Should return zero hash for private registrations when queried by address", async function () {
            const receiverHash = await registry.getReceiverHashByAddress(user2.address);
            expect(receiverHash).to.equal(ethers.ZeroHash);
        });

        it("Should allow owner to retrieve private receiverHash by alias", async function () {
            const receiverHash = await registry.connect(user2).getReceiverHashByAlias("private_alias");
            expect(receiverHash).to.not.equal(ethers.ZeroHash);
        });

        it("Should deny unauthorized access to private aliases", async function () {
            await expect(
                registry.connect(user1).getReceiverHashByAlias("private_alias")
            ).to.be.revertedWith("Not authorized to access private alias");
        });

        it("Should allow anyone to access public aliases", async function () {
            const receiverHash = await registry.connect(user3).getReceiverHashByAlias("public_alias");
            expect(receiverHash).to.not.equal(ethers.ZeroHash);
        });
    });

    describe("Alias Availability", function () {
        beforeEach(async function () {
            await registry.connect(user1).registerReceiverHash(
                "secret-code",
                false,
                "taken_alias",
                { value: registrationFee }
            );
        });

        it("Should return true for available aliases", async function () {
            const isAvailable = await registry.isAliasAvailable("available_alias");
            expect(isAvailable).to.be.true;
        });

        it("Should return false for taken aliases", async function () {
            const isAvailable = await registry.isAliasAvailable("taken_alias");
            expect(isAvailable).to.be.false;
        });

        it("Should return false for invalid alias formats", async function () {
            const isAvailable = await registry.isAliasAvailable("x"); // too short
            expect(isAvailable).to.be.false;
        });
    });

    describe("ReceiverHash Info", function () {
        let receiverHash;

        beforeEach(async function () {
            await registry.connect(user1).registerReceiverHash(
                "test-secret",
                true,
                "test_alias",
                { value: registrationFee }
            );
            receiverHash = await registry.getReceiverHashByAddress(user1.address);
        });

        it("Should return correct receiver hash info", async function () {
            const info = await registry.getReceiverHashInfo(receiverHash);
            
            expect(info.owner).to.equal(user1.address);
            expect(info.isPublic).to.be.true;
            expect(info.aliasName).to.equal("test_alias");
            expect(info.exists).to.be.true;
            expect(info.registeredAt).to.be.greaterThan(0);
        });

        it("Should hide alias for private hashes from unauthorized users", async function () {
            // Register a private hash
            await registry.connect(user2).registerReceiverHash(
                "private-secret",
                false,
                "private_alias",
                { value: registrationFee }
            );

            const privateHash = await registry.connect(user2).getReceiverHashByAlias("private_alias");
            const info = await registry.connect(user1).getReceiverHashInfo(privateHash);
            
            expect(info.owner).to.equal(user2.address);
            expect(info.isPublic).to.be.false;
            expect(info.aliasName).to.equal(""); // Hidden from unauthorized user
        });
    });

    describe("Visibility Updates", function () {
        let publicHash, privateHash;

        beforeEach(async function () {
            await registry.connect(user1).registerReceiverHash(
                "public-secret",
                true,
                "public_alias",
                { value: registrationFee }
            );
            publicHash = await registry.getReceiverHashByAddress(user1.address);

            await registry.connect(user2).registerReceiverHash(
                "private-secret",
                false,
                "private_alias",
                { value: registrationFee }
            );
            privateHash = await registry.connect(user2).getReceiverHashByAlias("private_alias");
        });

        it("Should allow changing from public to private", async function () {
            await expect(registry.connect(user1).updateVisibility(
                publicHash,
                false, // new visibility: private
                "new_private_alias"
            )).to.emit(registry, "VisibilityChanged");

            // Should no longer be accessible by address
            const hashByAddress = await registry.getReceiverHashByAddress(user1.address);
            expect(hashByAddress).to.equal(ethers.ZeroHash);

            // Should be accessible by new alias
            const hashByAlias = await registry.connect(user1).getReceiverHashByAlias("new_private_alias");
            expect(hashByAlias).to.equal(publicHash);
        });

        it("Should allow changing from private to public", async function () {
            await expect(registry.connect(user2).updateVisibility(
                privateHash,
                true, // new visibility: public
                "" // alias not needed for public
            )).to.emit(registry, "VisibilityChanged");

            // Should now be accessible by address
            const hashByAddress = await registry.getReceiverHashByAddress(user2.address);
            expect(hashByAddress).to.equal(privateHash);
        });

        it("Should reject visibility updates from non-owners", async function () {
            await expect(registry.connect(user2).updateVisibility(
                publicHash,
                false,
                "some_alias"
            )).to.be.revertedWith("Not the owner");
        });
    });

    describe("Statistics", function () {
        it("Should track total registrations", async function () {
            expect(await registry.totalRegistrations()).to.equal(0);

            await registry.connect(user1).registerReceiverHash(
                "secret-code-long-enough",
                true,
                "alias1",
                { value: registrationFee }
            );

            expect(await registry.totalRegistrations()).to.equal(1);

            await registry.connect(user2).registerReceiverHash(
                "another-secret-code",
                false,
                "alias2",
                { value: registrationFee }
            );

            expect(await registry.totalRegistrations()).to.equal(2);
        });

        it("Should track user registration counts", async function () {
            expect(await registry.userRegistrationCount(user1.address)).to.equal(0);

            await registry.connect(user1).registerReceiverHash(
                "secret-code-long-enough",
                true,
                "alias1",
                { value: registrationFee }
            );

            expect(await registry.userRegistrationCount(user1.address)).to.equal(1);
        });
    });

    describe("Admin Functions", function () {
        it("Should allow owner to update registration fee", async function () {
            const newFee = ethers.parseEther("0.002");
            await registry.updateRegistrationFee(newFee);
            expect(await registry.registrationFee()).to.equal(newFee);
        });

        it("Should allow owner to pause and unpause", async function () {
            await registry.pause();
            
            await expect(registry.connect(user1).registerReceiverHash(
                "secret-code-long-enough",
                true,
                "alias",
                { value: registrationFee }
            )).to.be.revertedWithCustomError(registry, "EnforcedPause");

            await registry.unpause();
            
            await expect(registry.connect(user1).registerReceiverHash(
                "secret-code-long-enough",
                true,
                "alias",
                { value: registrationFee }
            )).to.not.be.reverted;
        });

        it("Should allow owner to withdraw fees", async function () {
            // Generate some fees
            await registry.connect(user1).registerReceiverHash(
                "secret-code-long-enough",
                true,
                "alias",
                { value: registrationFee }
            );

            const initialBalance = await ethers.provider.getBalance(owner.address);
            await registry.withdrawFees(owner.address);
            const finalBalance = await ethers.provider.getBalance(owner.address);

            expect(finalBalance).to.be.greaterThan(initialBalance);
        });

        it("Should reject non-owner admin calls", async function () {
            await expect(registry.connect(user1).updateRegistrationFee(
                ethers.parseEther("0.002")
            )).to.be.revertedWithCustomError(registry, "OwnableUnauthorizedAccount");

            await expect(registry.connect(user1).pause())
                .to.be.revertedWithCustomError(registry, "OwnableUnauthorizedAccount");

            await expect(registry.connect(user1).withdrawFees(user1.address))
                .to.be.revertedWithCustomError(registry, "OwnableUnauthorizedAccount");
        });
    });
});

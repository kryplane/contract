const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("ShadowChatFactory", function () {
  let ShadowChatFactory, factory;
  let owner, addr1, addr2;
  let messageFee, withdrawalFee, initialShards;

  beforeEach(async function () {
    [owner, addr1, addr2] = await ethers.getSigners();
    
    messageFee = ethers.parseEther("0.01");
    withdrawalFee = ethers.parseEther("0.001");
    initialShards = 3;
    
    ShadowChatFactory = await ethers.getContractFactory("ShadowChatFactory");
    factory = await ShadowChatFactory.deploy(messageFee, withdrawalFee, initialShards);
    await factory.waitForDeployment();
  });

  describe("Deployment", function () {
    it("Should deploy with correct parameters", async function () {
      expect(await factory.totalShards()).to.equal(initialShards);
      expect(await factory.messageFee()).to.equal(messageFee);
      expect(await factory.withdrawalFee()).to.equal(withdrawalFee);
    });

    it("Should deploy initial shards", async function () {
      for (let i = 0; i < initialShards; i++) {
        const shardAddress = await factory.shards(i);
        expect(shardAddress).to.not.equal(ethers.ZeroAddress);
      }
    });
  });

  describe("Shard Management", function () {
    it("Should add new shard", async function () {
      const initialCount = await factory.totalShards();
      
      await expect(
        factory.connect(owner).addShard()
      ).to.emit(factory, "ShardDeployed");
      
      expect(await factory.totalShards()).to.equal(initialCount + 1n);
    });

    it("Should get correct shard for receiver hash", async function () {
      const receiverHash = ethers.keccak256(ethers.toUtf8Bytes("test-receiver"));
      const [shardAddress, shardId] = await factory.getShardForReceiver(receiverHash);
      
      expect(shardAddress).to.not.equal(ethers.ZeroAddress);
      expect(shardId).to.be.lt(initialShards);
      
      // Verify consistent routing
      const [shardAddress2, shardId2] = await factory.getShardForReceiver(receiverHash);
      expect(shardAddress).to.equal(shardAddress2);
      expect(shardId).to.equal(shardId2);
    });

    it("Should return all shards", async function () {
      const allShards = await factory.getAllShards();
      expect(allShards.length).to.equal(initialShards);
      
      for (const shardAddress of allShards) {
        expect(shardAddress).to.not.equal(ethers.ZeroAddress);
      }
    });
  });

  describe("Cross-Shard Operations", function () {
    it("Should update message fee across all shards", async function () {
      const newFee = ethers.parseEther("0.02");
      
      await factory.connect(owner).updateMessageFeeAllShards(newFee);
      
      expect(await factory.messageFee()).to.equal(newFee);
      
      // Check that all shards have updated fee
      for (let i = 0; i < initialShards; i++) {
        const shardAddress = await factory.shards(i);
        const ShadowChat = await ethers.getContractFactory("ShadowChat");
        const shard = ShadowChat.attach(shardAddress);
        
        expect(await shard.messageFee()).to.equal(newFee);
      }
    });

    it("Should update withdrawal fee across all shards", async function () {
      const newFee = ethers.parseEther("0.002");
      
      await factory.connect(owner).updateWithdrawalFeeAllShards(newFee);
      
      expect(await factory.withdrawalFee()).to.equal(newFee);
      
      // Check that all shards have updated fee
      for (let i = 0; i < initialShards; i++) {
        const shardAddress = await factory.shards(i);
        const ShadowChat = await ethers.getContractFactory("ShadowChat");
        const shard = ShadowChat.attach(shardAddress);
        
        expect(await shard.withdrawalFee()).to.equal(newFee);
      }
    });

    it("Should pause all shards", async function () {
      await factory.connect(owner).pauseAllShards();
      
      // Try to interact with a shard and expect it to be paused
      const receiverHash = ethers.keccak256(ethers.toUtf8Bytes("test"));
      const [shardAddress] = await factory.getShardForReceiver(receiverHash);
      
      const ShadowChat = await ethers.getContractFactory("ShadowChat");
      const shard = ShadowChat.attach(shardAddress);
      
      await expect(
        shard.connect(addr1).depositCredit(receiverHash, { value: ethers.parseEther("0.1") })
      ).to.be.revertedWithCustomError(shard, "EnforcedPause");
    });

    it("Should unpause all shards", async function () {
      // First pause
      await factory.connect(owner).pauseAllShards();
      
      // Then unpause
      await factory.connect(owner).unpauseAllShards();
      
      // Should be able to interact now
      const receiverHash = ethers.keccak256(ethers.toUtf8Bytes("test"));
      const [shardAddress] = await factory.getShardForReceiver(receiverHash);
      
      const ShadowChat = await ethers.getContractFactory("ShadowChat");
      const shard = ShadowChat.attach(shardAddress);
      
      await expect(
        shard.connect(addr1).depositCredit(receiverHash, { value: ethers.parseEther("0.1") })
      ).to.not.be.reverted;
    });
  });

  describe("Aggregated Statistics", function () {
    it("Should return aggregated statistics from all shards", async function () {
      // Interact with multiple shards
      const receivers = [
        ethers.keccak256(ethers.toUtf8Bytes("receiver1")),
        ethers.keccak256(ethers.toUtf8Bytes("receiver2")),
        ethers.keccak256(ethers.toUtf8Bytes("receiver3"))
      ];
      
      const ShadowChat = await ethers.getContractFactory("ShadowChat");
      
      // Deposit credits and send messages across different shards
      for (const receiverHash of receivers) {
        const [shardAddress] = await factory.getShardForReceiver(receiverHash);
        const shard = ShadowChat.attach(shardAddress);
        
        // Deposit credits
        await shard.connect(addr1).depositCredit(receiverHash, { 
          value: ethers.parseEther("0.1") 
        });
        
        // Send a message with valid encrypted content
        await shard.connect(addr2).sendMessage(receiverHash, `Encrypted message for receiver ${receiverHash.slice(-6)}`);
      }
      
      const [totalMessages, totalCreditsDeposited, totalContractBalance] = 
        await factory.getAggregatedStats();
      
      expect(totalMessages).to.equal(3); // 3 messages sent
      expect(totalCreditsDeposited).to.equal(ethers.parseEther("0.3")); // 3 * 0.1 ETH
      // Balance should be the current contract balance (deposits minus any withdrawals/fees)
      // Since no withdrawals were made, balance = deposits
      expect(totalContractBalance).to.equal(ethers.parseEther("0.3"));
    });
  });

  describe("Access Control", function () {
    it("Should restrict admin functions to owner", async function () {
      await expect(
        factory.connect(addr1).addShard()
      ).to.be.revertedWithCustomError(factory, "OwnableUnauthorizedAccount");

      await expect(
        factory.connect(addr1).updateMessageFeeAllShards(ethers.parseEther("0.02"))
      ).to.be.revertedWithCustomError(factory, "OwnableUnauthorizedAccount");

      await expect(
        factory.connect(addr1).pauseAllShards()
      ).to.be.revertedWithCustomError(factory, "OwnableUnauthorizedAccount");
    });
  });

  describe("Integration Testing", function () {
    it("Should handle end-to-end message flow across shards", async function () {
      const secretCode = "integration-test-secret";
      const receiverHash = ethers.keccak256(ethers.toUtf8Bytes(secretCode));
      const [shardAddress, shardId] = await factory.getShardForReceiver(receiverHash);
      
      const ShadowChat = await ethers.getContractFactory("ShadowChat");
      const shard = ShadowChat.attach(shardAddress);
      
      // 1. Deposit credits
      const depositAmount = ethers.parseEther("0.5");
      await shard.connect(addr1).depositCredit(receiverHash, { value: depositAmount });
      
      // 2. Send multiple messages
      const messages = ["First message content", "Second message content", "Third message content"];
      for (const msgContent of messages) {
        await shard.connect(addr2).sendMessage(receiverHash, msgContent);
      }
      
      // 3. Authorize and withdraw remaining credits
      await shard.connect(addr1).authorizeWithdrawal(receiverHash, addr1.address, secretCode);
      
      const remainingBalance = await shard.getCreditBalance(receiverHash);
      const withdrawAmount = remainingBalance;
      
      if (withdrawAmount > withdrawalFee) {
        await shard.connect(addr1).withdrawCredit(receiverHash, withdrawAmount);
      }
      
      // 4. Verify final state
      const finalBalance = await shard.getCreditBalance(receiverHash);
      expect(finalBalance).to.equal(0);
      
      const [totalMessages, ,] = await shard.getStats();
      expect(totalMessages).to.equal(3);
    });
  });
});

const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("ShadowChat", function () {
  let ShadowChat, shadowChat;
  let owner, addr1, addr2, addr3;
  let messageFee, withdrawalFee;

  beforeEach(async function () {
    [owner, addr1, addr2, addr3] = await ethers.getSigners();
    
    messageFee = ethers.parseEther("0.01"); // 0.01 ETH
    withdrawalFee = ethers.parseEther("0.001"); // 0.001 ETH
    
    ShadowChat = await ethers.getContractFactory("ShadowChat");
    shadowChat = await ShadowChat.deploy(messageFee, withdrawalFee);
    await shadowChat.waitForDeployment();
  });

  describe("Deployment", function () {
    it("Should set the right owner", async function () {
      expect(await shadowChat.owner()).to.equal(owner.address);
    });

    it("Should set the correct message fee", async function () {
      expect(await shadowChat.messageFee()).to.equal(messageFee);
    });

    it("Should set the correct withdrawal fee", async function () {
      expect(await shadowChat.withdrawalFee()).to.equal(withdrawalFee);
    });

    it("Should revert with invalid fees", async function () {
      const invalidMessageFee = ethers.parseEther("1"); // Too high
      const invalidWithdrawalFee = ethers.parseEther("0.1"); // Too high

      await expect(
        ShadowChat.deploy(invalidMessageFee, withdrawalFee)
      ).to.be.revertedWith("Invalid message fee");

      await expect(
        ShadowChat.deploy(messageFee, invalidWithdrawalFee)
      ).to.be.revertedWith("Invalid withdrawal fee");
    });
  });

  describe("Credit Management", function () {
    let receiverHash;

    beforeEach(async function () {
      const secretCode = "test-secret-code";
      receiverHash = ethers.keccak256(ethers.toUtf8Bytes(secretCode));
    });

    it("Should allow depositing credits", async function () {
      const depositAmount = ethers.parseEther("0.1");
      
      await expect(
        shadowChat.connect(addr1).depositCredit(receiverHash, { value: depositAmount })
      ).to.emit(shadowChat, "CreditDeposited")
        .withArgs(receiverHash, depositAmount, depositAmount);

      expect(await shadowChat.getCreditBalance(receiverHash)).to.equal(depositAmount);
    });

    it("Should accumulate multiple deposits", async function () {
      const firstDeposit = ethers.parseEther("0.1");
      const secondDeposit = ethers.parseEther("0.05");
      
      await shadowChat.connect(addr1).depositCredit(receiverHash, { value: firstDeposit });
      await shadowChat.connect(addr2).depositCredit(receiverHash, { value: secondDeposit });

      const expectedTotal = firstDeposit + secondDeposit;
      expect(await shadowChat.getCreditBalance(receiverHash)).to.equal(expectedTotal);
    });

    it("Should revert deposit with zero value", async function () {
      await expect(
        shadowChat.connect(addr1).depositCredit(receiverHash, { value: 0 })
      ).to.be.revertedWith("Must deposit some ETH");
    });

    it("Should revert deposit with invalid receiver hash", async function () {
      await expect(
        shadowChat.connect(addr1).depositCredit(ethers.ZeroHash, { value: ethers.parseEther("0.1") })
      ).to.be.revertedWith("Invalid receiver hash");
    });
  });

  describe("Message Sending", function () {
    let receiverHash;
    const secretCode = "test-secret-code";
    const encryptedMessage = "encrypted-message-content-123";

    beforeEach(async function () {
      receiverHash = ethers.keccak256(ethers.toUtf8Bytes(secretCode));
      
      // Deposit credits
      const depositAmount = ethers.parseEther("1");
      await shadowChat.connect(addr1).depositCredit(receiverHash, { value: depositAmount });
    });

    it("Should send a message successfully", async function () {
      const tx = await shadowChat.connect(addr2).sendMessage(receiverHash, encryptedMessage);
      const receipt = await tx.wait();
      
      // Check that MessageSent event was emitted
      const messageEvent = receipt.logs.find(log => {
        try {
          const parsed = shadowChat.interface.parseLog(log);
          return parsed.name === 'MessageSent';
        } catch (e) {
          return false;
        }
      });
      
      expect(messageEvent).to.not.be.undefined;
      const parsedEvent = shadowChat.interface.parseLog(messageEvent);
      expect(parsedEvent.args.encryptedContent).to.equal(encryptedMessage);
      expect(parsedEvent.args.receiverHash).to.equal(receiverHash);
      expect(parsedEvent.args.sender).to.equal(addr2.address);

      // Check remaining balance
      const actualFee = await shadowChat.messageFee();
      const remainingBalance = ethers.parseEther("1") - actualFee;
      expect(await shadowChat.getCreditBalance(receiverHash)).to.equal(remainingBalance);
    });

    it("Should increment total messages", async function () {
      const initialCount = await shadowChat.totalMessages();
      
      await shadowChat.connect(addr2).sendMessage(receiverHash, encryptedMessage);
      
      expect(await shadowChat.totalMessages()).to.equal(initialCount + 1n);
    });

    it("Should revert with insufficient credits", async function () {
      // Create a new receiver hash with no credits
      const newSecretCode = "new-secret-code";
      const newReceiverHash = ethers.keccak256(ethers.toUtf8Bytes(newSecretCode));

      await expect(
        shadowChat.connect(addr2).sendMessage(newReceiverHash, encryptedMessage)
      ).to.be.revertedWith("Insufficient credits");
    });

    it("Should revert with empty message content", async function () {
      await expect(
        shadowChat.connect(addr2).sendMessage(receiverHash, "")
      ).to.be.revertedWith("Invalid message content");
    });

    it("Should revert with invalid receiver hash", async function () {
      await expect(
        shadowChat.connect(addr2).sendMessage(ethers.ZeroHash, encryptedMessage)
      ).to.be.revertedWith("Invalid receiver hash");
    });
  });

  describe("Withdrawal Authorization and Execution", function () {
    let receiverHash;
    const secretCode = "test-secret-code";

    beforeEach(async function () {
      receiverHash = ethers.keccak256(ethers.toUtf8Bytes(secretCode));
      
      // Deposit credits
      const depositAmount = ethers.parseEther("1");
      await shadowChat.connect(addr1).depositCredit(receiverHash, { value: depositAmount });
    });

    it("Should authorize withdrawal correctly", async function () {
      await shadowChat.connect(addr2).authorizeWithdrawal(receiverHash, addr2.address, secretCode);
      
      expect(await shadowChat.isAuthorizedWithdrawer(receiverHash, addr2.address)).to.be.true;
    });

    it("Should revert authorization with wrong secret code", async function () {
      const wrongSecretCode = "wrong-secret-code";
      
      await expect(
        shadowChat.connect(addr2).authorizeWithdrawal(receiverHash, addr2.address, wrongSecretCode)
      ).to.be.revertedWith("Invalid secret code");
    });

    it("Should withdraw credits successfully", async function () {
      // Authorize withdrawal
      await shadowChat.connect(addr2).authorizeWithdrawal(receiverHash, addr2.address, secretCode);
      
      const withdrawAmount = ethers.parseEther("0.5");
      const netAmount = withdrawAmount - withdrawalFee;
      
      const initialBalance = await ethers.provider.getBalance(addr2.address);
      
      const tx = await shadowChat.connect(addr2).withdrawCredit(receiverHash, withdrawAmount);
      const receipt = await tx.wait();
      const gasUsed = receipt.gasUsed * receipt.gasPrice;
      
      const finalBalance = await ethers.provider.getBalance(addr2.address);
      
      // Check that the net amount was received (accounting for gas)
      expect(finalBalance).to.equal(initialBalance + netAmount - gasUsed);
      
      // Check remaining balance in contract
      const remainingBalance = ethers.parseEther("1") - withdrawAmount;
      expect(await shadowChat.getCreditBalance(receiverHash)).to.equal(remainingBalance);
    });

    it("Should revert withdrawal if not authorized", async function () {
      const withdrawAmount = ethers.parseEther("0.5");
      
      await expect(
        shadowChat.connect(addr2).withdrawCredit(receiverHash, withdrawAmount)
      ).to.be.revertedWith("Not authorized to withdraw");
    });

    it("Should revert withdrawal with insufficient balance", async function () {
      // Authorize withdrawal
      await shadowChat.connect(addr2).authorizeWithdrawal(receiverHash, addr2.address, secretCode);
      
      const withdrawAmount = ethers.parseEther("2"); // More than deposited
      
      await expect(
        shadowChat.connect(addr2).withdrawCredit(receiverHash, withdrawAmount)
      ).to.be.revertedWith("Insufficient balance");
    });

    it("Should revert withdrawal if amount is less than withdrawal fee", async function () {
      // Authorize withdrawal
      await shadowChat.connect(addr2).authorizeWithdrawal(receiverHash, addr2.address, secretCode);
      
      const withdrawAmount = withdrawalFee / 2n; // Less than withdrawal fee
      
      await expect(
        shadowChat.connect(addr2).withdrawCredit(receiverHash, withdrawAmount)
      ).to.be.revertedWith("Amount must be greater than withdrawal fee");
    });
  });

  describe("Admin Functions", function () {
    it("Should update message fee", async function () {
      const newFee = ethers.parseEther("0.02");
      
      await expect(
        shadowChat.connect(owner).updateMessageFee(newFee)
      ).to.emit(shadowChat, "MessageFeeUpdated")
        .withArgs(messageFee, newFee);

      expect(await shadowChat.messageFee()).to.equal(newFee);
    });

    it("Should update withdrawal fee", async function () {
      const newFee = ethers.parseEther("0.002");
      
      await expect(
        shadowChat.connect(owner).updateWithdrawalFee(newFee)
      ).to.emit(shadowChat, "WithdrawalFeeUpdated")
        .withArgs(withdrawalFee, newFee);

      expect(await shadowChat.withdrawalFee()).to.equal(newFee);
    });

    it("Should revert fee updates from non-owner", async function () {
      const newFee = ethers.parseEther("0.02");
      
      await expect(
        shadowChat.connect(addr1).updateMessageFee(newFee)
      ).to.be.revertedWithCustomError(shadowChat, "OwnableUnauthorizedAccount");
    });

    it("Should pause and unpause contract", async function () {
      await shadowChat.connect(owner).pause();
      
      const receiverHash = ethers.keccak256(ethers.toUtf8Bytes("test"));
      
      await expect(
        shadowChat.connect(addr1).depositCredit(receiverHash, { value: ethers.parseEther("0.1") })
      ).to.be.revertedWithCustomError(shadowChat, "EnforcedPause");
      
      await shadowChat.connect(owner).unpause();
      
      await expect(
        shadowChat.connect(addr1).depositCredit(receiverHash, { value: ethers.parseEther("0.1") })
      ).to.not.be.reverted;
    });
  });

  describe("Statistics", function () {
    it("Should return correct statistics", async function () {
      const receiverHash = ethers.keccak256(ethers.toUtf8Bytes("test"));
      const depositAmount = ethers.parseEther("1");
      
      // Deposit credits
      await shadowChat.connect(addr1).depositCredit(receiverHash, { value: depositAmount });
      
      // Send a message
      await shadowChat.connect(addr2).sendMessage(receiverHash, "Encrypted test message content");
      
      const [totalMessages, totalCreditsDeposited, contractBalance] = await shadowChat.getStats();
      
      expect(totalMessages).to.equal(1);
      expect(totalCreditsDeposited).to.equal(depositAmount);
      expect(contractBalance).to.equal(depositAmount); // No withdrawals yet
    });
  });
});

// Helper function for time manipulation in tests
const time = {
  latest: async () => {
    const block = await ethers.provider.getBlock('latest');
    return block.timestamp;
  }
};

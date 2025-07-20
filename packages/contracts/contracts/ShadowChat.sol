// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "./IShadowChat.sol";
import "./ShadowChatUtils.sol";

/**
 * @title ShadowChat
 * @dev A privacy-preserving, credit-based on-chain messaging system
 * @notice This contract enables anonymous messaging using hashed receiver identities
 */
contract ShadowChat is IShadowChat, Ownable, ReentrancyGuard, Pausable {
    using ShadowChatUtils for string;
    using ShadowChatUtils for bytes32;
    
    // Additional events not in interface
    event MessageFeeUpdated(uint256 oldFee, uint256 newFee);
    
    event WithdrawalFeeUpdated(uint256 oldFee, uint256 newFee);

    // State variables
    mapping(bytes32 => uint256) public creditBalance;
    mapping(bytes32 => address) public authorizedWithdrawer;
    
    uint256 public messageFee;
    uint256 public withdrawalFee;
    uint256 public totalMessages;
    uint256 public totalCreditsDeposited;
    
    // Constants
    uint256 public constant MIN_MESSAGE_FEE = 0.001 ether;
    uint256 public constant MAX_MESSAGE_FEE = 0.1 ether;
    uint256 public constant MIN_WITHDRAWAL_FEE = 0.0001 ether;
    uint256 public constant MAX_WITHDRAWAL_FEE = 0.01 ether;

    constructor(
        uint256 _messageFee,
        uint256 _withdrawalFee
    ) Ownable(msg.sender) {
        require(_messageFee >= MIN_MESSAGE_FEE && _messageFee <= MAX_MESSAGE_FEE, "Invalid message fee");
        require(_withdrawalFee >= MIN_WITHDRAWAL_FEE && _withdrawalFee <= MAX_WITHDRAWAL_FEE, "Invalid withdrawal fee");
        
        messageFee = _messageFee;
        withdrawalFee = _withdrawalFee;
    }

    /**
     * @notice Deposit credits for a receiver hash to enable message receipt
     * @param receiverHash The keccak256 hash of the receiver's secret code
     */
    function depositCredit(bytes32 receiverHash) external payable nonReentrant whenNotPaused {
        require(msg.value > 0, "Must deposit some ETH");
        require(receiverHash != bytes32(0), "Invalid receiver hash");
        
        creditBalance[receiverHash] += msg.value;
        totalCreditsDeposited += msg.value;
        
        emit CreditDeposited(receiverHash, msg.value, creditBalance[receiverHash]);
    }

    /**
     * @notice Send a message to a receiver hash
     * @param receiverHash The target receiver's hash
     * @param encryptedContent Encrypted message content to store on-chain
     */
    function sendMessage(
        bytes32 receiverHash,
        string calldata encryptedContent
    ) external nonReentrant whenNotPaused {
        require(receiverHash != bytes32(0), "Invalid receiver hash");
        require(ShadowChatUtils.isValidMessageContent(encryptedContent), "Invalid message content");
        
        uint256 actualMessageFee = ShadowChatUtils.calculateMessageFee(messageFee, encryptedContent);
        require(creditBalance[receiverHash] >= actualMessageFee, "Insufficient credits");
        
        creditBalance[receiverHash] -= actualMessageFee;
        totalMessages++;
        
        emit MessageSent(totalMessages, msg.sender, receiverHash, encryptedContent, block.timestamp);
    }

    /**
     * @notice Authorize an address to withdraw credits from a receiver hash
     * @param receiverHash The receiver hash to authorize withdrawal for
     * @param withdrawer The address authorized to withdraw
     * @param secretCode The secret code that generates the receiver hash (for verification)
     */
    function authorizeWithdrawal(
        bytes32 receiverHash,
        address withdrawer,
        string calldata secretCode
    ) external whenNotPaused {
        require(receiverHash != bytes32(0), "Invalid receiver hash");
        require(withdrawer != address(0), "Invalid withdrawer address");
        require(ShadowChatUtils.isValidSecretCode(secretCode), "Invalid secret code format");
        require(ShadowChatUtils.generateReceiverHash(secretCode) == receiverHash, "Invalid secret code");
        
        authorizedWithdrawer[receiverHash] = withdrawer;
    }

    /**
     * @notice Withdraw credits from a receiver hash
     * @param receiverHash The receiver hash to withdraw from
     * @param amount The amount to withdraw
     */
    function withdrawCredit(
        bytes32 receiverHash,
        uint256 amount
    ) external nonReentrant whenNotPaused {
        require(receiverHash != bytes32(0), "Invalid receiver hash");
        require(authorizedWithdrawer[receiverHash] == msg.sender, "Not authorized to withdraw");
        require(amount > 0, "Amount must be greater than 0");
        require(creditBalance[receiverHash] >= amount, "Insufficient balance");
        require(amount > withdrawalFee, "Amount must be greater than withdrawal fee");
        
        uint256 netAmount = amount - withdrawalFee;
        creditBalance[receiverHash] -= amount;
        
        // Transfer net amount to withdrawer
        (bool success, ) = payable(msg.sender).call{value: netAmount}("");
        require(success, "Transfer failed");
        
        emit CreditWithdrawn(receiverHash, msg.sender, netAmount, creditBalance[receiverHash]);
    }

    /**
     * @notice Get credit balance for a receiver hash
     * @param receiverHash The receiver hash to query
     * @return The current credit balance
     */
    function getCreditBalance(bytes32 receiverHash) external view returns (uint256) {
        return creditBalance[receiverHash];
    }

    /**
     * @notice Check if an address is authorized to withdraw from a receiver hash
     * @param receiverHash The receiver hash to check
     * @param withdrawer The address to check authorization for
     * @return True if authorized, false otherwise
     */
    function isAuthorizedWithdrawer(
        bytes32 receiverHash,
        address withdrawer
    ) external view returns (bool) {
        return authorizedWithdrawer[receiverHash] == withdrawer;
    }

    /**
     * @notice Update message fee (only owner)
     * @param newFee The new message fee
     */
    function updateMessageFee(uint256 newFee) external onlyOwner {
        require(newFee >= MIN_MESSAGE_FEE && newFee <= MAX_MESSAGE_FEE, "Invalid message fee");
        
        uint256 oldFee = messageFee;
        messageFee = newFee;
        
        emit MessageFeeUpdated(oldFee, newFee);
    }

    /**
     * @notice Update withdrawal fee (only owner)
     * @param newFee The new withdrawal fee
     */
    function updateWithdrawalFee(uint256 newFee) external onlyOwner {
        require(newFee >= MIN_WITHDRAWAL_FEE && newFee <= MAX_WITHDRAWAL_FEE, "Invalid withdrawal fee");
        
        uint256 oldFee = withdrawalFee;
        withdrawalFee = newFee;
        
        emit WithdrawalFeeUpdated(oldFee, newFee);
    }

    /**
     * @notice Pause the contract (only owner)
     */
    function pause() external onlyOwner {
        _pause();
    }

    /**
     * @notice Unpause the contract (only owner)
     */
    function unpause() external onlyOwner {
        _unpause();
    }

    /**
     * @notice Withdraw collected fees (only owner)
     * @param to Address to send the fees to
     */
    function withdrawFees(address payable to) external onlyOwner nonReentrant {
        require(to != address(0), "Invalid recipient address");
        
        uint256 balance = address(this).balance;
        // Calculate total credits still in the system
        uint256 totalCreditsInSystem = totalCreditsDeposited;
        
        // Only withdraw fees, not user credits
        require(balance > totalCreditsInSystem, "No fees to withdraw");
        
        uint256 feesToWithdraw = balance - totalCreditsInSystem;
        
        (bool success, ) = to.call{value: feesToWithdraw}("");
        require(success, "Fee withdrawal failed");
    }

    /**
     * @notice Get contract statistics
     * @return totalMessages_ Total number of messages sent
     * @return totalCreditsDeposited_ Total credits deposited
     * @return contractBalance Current contract balance
     */
    function getStats() external view returns (
        uint256 totalMessages_,
        uint256 totalCreditsDeposited_,
        uint256 contractBalance
    ) {
        return (totalMessages, totalCreditsDeposited, address(this).balance);
    }

    /**
     * @notice Emergency function to recover stuck funds (only owner)
     * @dev Should only be used in extreme circumstances
     */
    function emergencyWithdraw() external onlyOwner {
        (bool success, ) = payable(owner()).call{value: address(this).balance}("");
        require(success, "Emergency withdrawal failed");
    }
}

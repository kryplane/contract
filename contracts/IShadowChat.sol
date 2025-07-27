// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title IShadowChat Interface
 * @dev Interface for ShadowChat protocol
 * @notice This interface defines the core functionalities of the ShadowChat protocol,
 */
interface IShadowChat {
    // Events
    event MessageSent(
        uint256 indexed messageId,
        address indexed sender,
        bytes32 indexed receiverHash,
        string encryptedContent,
        uint256 timestamp
    );
    
    event CreditDeposited(
        bytes32 indexed receiverHash,
        uint256 amount,
        uint256 totalBalance
    );
    
    event CreditWithdrawn(
        bytes32 indexed receiverHash,
        address withdrawer,
        uint256 amount,
        uint256 remainingBalance
    );
    
    // Core messaging functions
    function sendMessage(bytes32 receiverHash, string calldata encryptedContent) external;
    function depositCredit(bytes32 receiverHash) external payable;
    function withdrawCredit(bytes32 receiverHash, uint256 amount) external;
    function authorizeWithdrawal(bytes32 receiverHash, address withdrawer, string calldata secretCode) external;
    
    // View functions
    function getCreditBalance(bytes32 receiverHash) external view returns (uint256);
    function messageFee() external view returns (uint256);
    function withdrawalFee() external view returns (uint256);
}

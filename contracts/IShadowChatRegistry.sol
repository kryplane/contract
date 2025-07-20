// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title IShadowChatRegistry Interface
 * @dev Interface for ShadowChatRegistry protocol
 * @notice This interface defines the core functionalities of the ShadowChatRegistry,
 * which manages receiverHash registration and lookup
 */
interface IShadowChatRegistry {
    // Events
    event ReceiverHashRegistered(
        bytes32 indexed receiverHash,
        address indexed owner,
        bool isPublic,
        string aliasName
    );
    
    event ReceiverHashUpdated(
        bytes32 indexed oldReceiverHash,
        bytes32 indexed newReceiverHash,
        address indexed owner,
        bool isPublic
    );
    
    event VisibilityChanged(
        bytes32 indexed receiverHash,
        address indexed owner,
        bool newVisibility
    );

    // Structs
    struct ReceiverHashInfo {
        address owner;
        bool isPublic;
        string aliasName;
        uint256 registeredAt;
        bool exists;
    }

    // Core registration functions
    function registerReceiverHash(
        string calldata secretCode,
        bool isPublic,
        string calldata aliasName
    ) external payable;
    
    function updateReceiverHash(
        bytes32 oldReceiverHash,
        string calldata newSecretCode
    ) external;
    
    function updateVisibility(
        bytes32 receiverHash,
        bool newVisibility,
        string calldata aliasName
    ) external;

    // Lookup functions
    function getReceiverHashByAddress(address walletAddress) external view returns (bytes32);
    function getReceiverHashByAlias(string calldata aliasName) external view returns (bytes32);
    function getReceiverHashInfo(bytes32 receiverHash) external view returns (ReceiverHashInfo memory);
    
    // Utility functions
    function isAliasAvailable(string calldata aliasName) external view returns (bool);
    
    // View functions
    function registrationFee() external view returns (uint256);
    function totalRegistrations() external view returns (uint256);
    function userRegistrationCount(address user) external view returns (uint256);
}

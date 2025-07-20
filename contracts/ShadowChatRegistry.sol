// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "./IShadowChatRegistry.sol";
import "./ShadowChatUtils.sol";

/**
 * @title ShadowChatRegistry
 * @dev A contract for managing receiverHash registration and lookup
 * @notice This contract allows users to register receiverHashes and provides lookup functionality
 */
contract ShadowChatRegistry is IShadowChatRegistry, Ownable, ReentrancyGuard, Pausable {
    using ShadowChatUtils for string;
    
    // State variables
    mapping(bytes32 => ReceiverHashInfo) public receiverHashInfo;
    mapping(address => bytes32) public publicReceiverHashes; // wallet address -> receiverHash for public hashes
    mapping(string => bytes32) private aliasToReceiverHash; // alias -> receiverHash for private hashes
    mapping(string => address) private aliasOwners; // alias -> owner address for access control
    mapping(address => uint256) public userRegistrationCount; // track registrations per user
    
    uint256 public totalRegistrations;
    uint256 public registrationFee;
    
    // Constants
    uint256 public constant MAX_REGISTRATIONS_PER_USER = 10;
    uint256 public constant MIN_ALIAS_LENGTH = 3;
    uint256 public constant MAX_ALIAS_LENGTH = 32;
    
    constructor(uint256 _registrationFee) Ownable(msg.sender) {
        registrationFee = _registrationFee;
    }
    
    /**
     * @notice Register a new receiverHash
     * @param secretCode The secret code that generates the receiverHash
     * @param isPublic Whether the receiverHash should be publicly visible
     * @param aliasName The alias for the receiverHash (required for private hashes)
     */
    function registerReceiverHash(
        string calldata secretCode,
        bool isPublic,
        string calldata aliasName
    ) external payable override nonReentrant whenNotPaused {
        require(msg.value >= registrationFee, "Insufficient registration fee");
        require(ShadowChatUtils.isValidSecretCode(secretCode), "Invalid secret code format");
        require(userRegistrationCount[msg.sender] < MAX_REGISTRATIONS_PER_USER, "Max registrations exceeded");
        
        bytes32 receiverHash = ShadowChatUtils.generateReceiverHash(secretCode);
        require(!receiverHashInfo[receiverHash].exists, "ReceiverHash already registered");
        
        // For private hashes, alias is required and must be unique
        if (!isPublic) {
            require(bytes(aliasName).length > 0, "Alias required for private registration");
            require(_isValidAlias(aliasName), "Invalid alias format");
            require(aliasToReceiverHash[aliasName] == bytes32(0), "Alias already taken");
            aliasToReceiverHash[aliasName] = receiverHash;
            aliasOwners[aliasName] = msg.sender;
        } else {
            // For public hashes, check if user already has a public hash registered
            require(publicReceiverHashes[msg.sender] == bytes32(0), "User already has public receiverHash");
            publicReceiverHashes[msg.sender] = receiverHash;
            // Validate alias if provided for public registration and add to alias mapping
            if (bytes(aliasName).length > 0) {
                require(_isValidAlias(aliasName), "Invalid alias format");
                require(aliasToReceiverHash[aliasName] == bytes32(0), "Alias already taken");
                aliasToReceiverHash[aliasName] = receiverHash;
            }
        }
        
        // Store receiver hash info
        receiverHashInfo[receiverHash] = ReceiverHashInfo({
            owner: msg.sender,
            isPublic: isPublic,
            aliasName: aliasName,
            registeredAt: block.timestamp,
            exists: true
        });
        
        userRegistrationCount[msg.sender]++;
        totalRegistrations++;
        
        emit ReceiverHashRegistered(receiverHash, msg.sender, isPublic, aliasName);
    }
    
    /**
     * @notice Get receiverHash by wallet address (only works for public hashes)
     * @param walletAddress The wallet address to look up
     * @return The receiverHash associated with the address, or bytes32(0) if not found/not public
     */
    function getReceiverHashByAddress(address walletAddress) external view override returns (bytes32) {
        return publicReceiverHashes[walletAddress];
    }
    
    /**
     * @notice Get receiverHash by alias (only the alias owner can call this for private aliases)
     * @param aliasName The alias to look up
     * @return The receiverHash associated with the alias
     */
    function getReceiverHashByAlias(string calldata aliasName) external view override returns (bytes32) {
        bytes32 receiverHash = aliasToReceiverHash[aliasName];
        require(receiverHash != bytes32(0), "Alias not found");
        
        ReceiverHashInfo memory info = receiverHashInfo[receiverHash];
        
        // If it's a private hash, only the owner can retrieve it
        if (!info.isPublic) {
            require(aliasOwners[aliasName] == msg.sender, "Not authorized to access private alias");
        }
        
        return receiverHash;
    }
    
    /**
     * @notice Get detailed information about a receiverHash
     * @param receiverHash The receiverHash to query
     * @return info The ReceiverHashInfo struct
     */
    function getReceiverHashInfo(bytes32 receiverHash) 
        external 
        view 
        override
        returns (ReceiverHashInfo memory info) 
    {
        info = receiverHashInfo[receiverHash];
        require(info.exists, "ReceiverHash not found");
        
        // Hide alias for private hashes unless caller is the owner
        if (!info.isPublic && info.owner != msg.sender) {
            info.aliasName = "";
        }
    }
    
    /**
     * @notice Update the visibility of a receiverHash (public <-> private)
     * @param receiverHash The receiverHash to update
     * @param newVisibility The new visibility setting
     * @param aliasName New alias (required when changing to private)
     */
    function updateVisibility(
        bytes32 receiverHash,
        bool newVisibility,
        string calldata aliasName
    ) external override nonReentrant whenNotPaused {
        ReceiverHashInfo storage info = receiverHashInfo[receiverHash];
        require(info.exists, "ReceiverHash not found");
        require(info.owner == msg.sender, "Not the owner");
        require(info.isPublic != newVisibility, "Visibility already set");
        
        if (newVisibility) {
            // Changing from private to public
            require(publicReceiverHashes[msg.sender] == bytes32(0), "User already has public receiverHash");
            
            // Remove from private mappings
            delete aliasToReceiverHash[info.aliasName];
            delete aliasOwners[info.aliasName];
            
            // Add to public mapping
            publicReceiverHashes[msg.sender] = receiverHash;
            
        } else {
            // Changing from public to private
            require(bytes(aliasName).length > 0, "Alias required for private registration");
            require(_isValidAlias(aliasName), "Invalid alias format");
            require(aliasToReceiverHash[aliasName] == bytes32(0), "Alias already taken");
            
            // Remove from public mapping
            delete publicReceiverHashes[msg.sender];
            
            // Add to private mappings
            aliasToReceiverHash[aliasName] = receiverHash;
            aliasOwners[aliasName] = msg.sender;
            info.aliasName = aliasName;
        }
        
        info.isPublic = newVisibility;
        
        emit VisibilityChanged(receiverHash, msg.sender, newVisibility);
    }
    
    /**
     * @notice Update receiverHash (generate new hash from new secret code)
     * @param oldReceiverHash The current receiverHash to update
     * @param newSecretCode The new secret code
     */
    function updateReceiverHash(
        bytes32 oldReceiverHash,
        string calldata newSecretCode
    ) external override nonReentrant whenNotPaused {
        ReceiverHashInfo storage oldInfo = receiverHashInfo[oldReceiverHash];
        require(oldInfo.exists, "ReceiverHash not found");
        require(oldInfo.owner == msg.sender, "Not the owner");
        require(ShadowChatUtils.isValidSecretCode(newSecretCode), "Invalid secret code format");
        
        bytes32 newReceiverHash = ShadowChatUtils.generateReceiverHash(newSecretCode);
        require(!receiverHashInfo[newReceiverHash].exists, "New receiverHash already registered");
        
        // Create new registration
        receiverHashInfo[newReceiverHash] = ReceiverHashInfo({
            owner: msg.sender,
            isPublic: oldInfo.isPublic,
            aliasName: oldInfo.aliasName,
            registeredAt: block.timestamp,
            exists: true
        });
        
        // Update mappings
        if (oldInfo.isPublic) {
            publicReceiverHashes[msg.sender] = newReceiverHash;
        } else {
            aliasToReceiverHash[oldInfo.aliasName] = newReceiverHash;
        }
        
        // Remove old registration
        delete receiverHashInfo[oldReceiverHash];
        
        emit ReceiverHashUpdated(oldReceiverHash, newReceiverHash, msg.sender, oldInfo.isPublic);
    }
    
    /**
     * @notice Check if an alias is available
     * @param aliasName The alias to check
     * @return True if alias is available, false otherwise
     */
    function isAliasAvailable(string calldata aliasName) external view override returns (bool) {
        return _isValidAlias(aliasName) && aliasToReceiverHash[aliasName] == bytes32(0);
    }
    
    /**
     * @notice Get registration statistics
     * @return totalRegistrations_ Total number of registrations
     * @return totalPublicRegistrations Total number of public registrations
     * @return totalPrivateRegistrations Total number of private registrations
     */
    function getStats() external view returns (
        uint256 totalRegistrations_,
        uint256 totalPublicRegistrations,
        uint256 totalPrivateRegistrations
    ) {
        // Note: This is a simplified implementation
        // For better performance, you might want to track these counters separately
        return (totalRegistrations, 0, 0);
    }
    
    /**
     * @notice Update registration fee (only owner)
     * @param newFee The new registration fee
     */
    function updateRegistrationFee(uint256 newFee) external onlyOwner {
        registrationFee = newFee;
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
        require(balance > 0, "No fees to withdraw");
        
        (bool success, ) = to.call{value: balance}("");
        require(success, "Fee withdrawal failed");
    }
    
    /**
     * @dev Internal function to validate alias format
     * @param aliasName The alias to validate
     * @return True if valid, false otherwise
     */
    function _isValidAlias(string memory aliasName) internal pure returns (bool) {
        bytes memory aliasBytes = bytes(aliasName);
        uint256 length = aliasBytes.length;
        
        // Check length requirements
        if (length < MIN_ALIAS_LENGTH || length > MAX_ALIAS_LENGTH) {
            return false;
        }
        
        // Check for valid characters (alphanumeric and underscore only)
        for (uint256 i = 0; i < length; i++) {
            bytes1 char = aliasBytes[i];
            if (!(
                (char >= 0x30 && char <= 0x39) || // 0-9
                (char >= 0x41 && char <= 0x5A) || // A-Z
                (char >= 0x61 && char <= 0x7A) || // a-z
                char == 0x5F // underscore
            )) {
                return false;
            }
        }
        
        return true;
    }
}

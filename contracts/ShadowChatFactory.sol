// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./ShadowChat.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title ShadowChatFactory
 * @dev Factory contract for deploying and managing ShadowChat shards
 * @notice Enables scalable message routing through multiple contract instances
 */
contract ShadowChatFactory is Ownable {
    // Events
    event ShardDeployed(uint256 indexed shardId, address shardAddress);
    event ShardUpdated(uint256 indexed shardId, address oldAddress, address newAddress);

    // State variables
    mapping(uint256 => address) public shards;
    uint256 public totalShards;
    uint256 public messageFee;
    uint256 public withdrawalFee;

    constructor(
        uint256 _messageFee,
        uint256 _withdrawalFee,
        uint256 _initialShards
    ) Ownable(msg.sender) {
        messageFee = _messageFee;
        withdrawalFee = _withdrawalFee;
        
        // Deploy initial shards
        for (uint256 i = 0; i < _initialShards; i++) {
            _deployShard(i);
        }
        
        totalShards = _initialShards;
    }

    /**
     * @notice Deploy a new shard contract
     * @param shardId The ID for the new shard
     */
    function _deployShard(uint256 shardId) internal {
        ShadowChat shard = new ShadowChat(messageFee, withdrawalFee);
        shards[shardId] = address(shard);
        
        emit ShardDeployed(shardId, address(shard));
    }

    /**
     * @notice Add a new shard to the factory
     * @return shardId The ID of the newly created shard
     */
    function addShard() external onlyOwner returns (uint256) {
        uint256 shardId = totalShards;
        _deployShard(shardId);
        totalShards++;
        
        return shardId;
    }

    /**
     * @notice Get the appropriate shard for a receiver hash
     * @param receiverHash The receiver hash to route
     * @return shardAddress The address of the shard contract
     * @return shardId The ID of the shard
     */
    function getShardForReceiver(bytes32 receiverHash) external view returns (address, uint256) {
        require(totalShards > 0, "No shards available");
        
        uint256 shardId = uint256(receiverHash) % totalShards;
        return (shards[shardId], shardId);
    }

    /**
     * @notice Get all shard addresses
     * @return An array of all shard addresses
     */
    function getAllShards() external view returns (address[] memory) {
        address[] memory allShards = new address[](totalShards);
        
        for (uint256 i = 0; i < totalShards; i++) {
            allShards[i] = shards[i];
        }
        
        return allShards;
    }

    /**
     * @notice Update message fee across all shards
     * @param newFee The new message fee
     */
    function updateMessageFeeAllShards(uint256 newFee) external onlyOwner {
        messageFee = newFee;
        
        for (uint256 i = 0; i < totalShards; i++) {
            ShadowChat(shards[i]).updateMessageFee(newFee);
        }
    }

    /**
     * @notice Update withdrawal fee across all shards
     * @param newFee The new withdrawal fee
     */
    function updateWithdrawalFeeAllShards(uint256 newFee) external onlyOwner {
        withdrawalFee = newFee;
        
        for (uint256 i = 0; i < totalShards; i++) {
            ShadowChat(shards[i]).updateWithdrawalFee(newFee);
        }
    }

    /**
     * @notice Pause all shards
     */
    function pauseAllShards() external onlyOwner {
        for (uint256 i = 0; i < totalShards; i++) {
            ShadowChat(shards[i]).pause();
        }
    }

    /**
     * @notice Unpause all shards
     */
    function unpauseAllShards() external onlyOwner {
        for (uint256 i = 0; i < totalShards; i++) {
            ShadowChat(shards[i]).unpause();
        }
    }

    /**
     * @notice Get aggregated statistics from all shards
     * @return totalMessages Total messages across all shards
     * @return totalCreditsDeposited Total credits deposited across all shards
     * @return totalContractBalance Total balance across all shards
     */
    function getAggregatedStats() external view returns (
        uint256 totalMessages,
        uint256 totalCreditsDeposited,
        uint256 totalContractBalance
    ) {
        for (uint256 i = 0; i < totalShards; i++) {
            ShadowChat shard = ShadowChat(shards[i]);
            (uint256 messages, uint256 credits, uint256 balance) = shard.getStats();
            
            totalMessages += messages;
            totalCreditsDeposited += credits;
            totalContractBalance += balance;
        }
    }
}

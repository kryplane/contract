// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title ShadowChatUtils
 * @dev Utility library cho ShadowChat protocol
 * @notice Các function tiện ích cho routing và validation
 */
library ShadowChatUtils {
    /**
     * @notice Tính shard ID cho receiver hash
     * @param receiverHash Hash của receiver
     * @param totalShards Tổng số shards
     * @return Shard ID (0-based index)
     */
    function getShardId(bytes32 receiverHash, uint256 totalShards) 
        internal 
        pure 
        returns (uint256) 
    {
        require(totalShards > 0, "Total shards must be greater than 0");
        return uint256(receiverHash) % totalShards;
    }
    
    /**
     * @notice Validate message content (basic check)
     * @param content Encrypted message content
     * @return true if content is valid
     */
    function isValidMessageContent(string memory content) internal pure returns (bool) {
        bytes memory contentBytes = bytes(content);
        
        // Check content is not empty
        if (contentBytes.length == 0) return false;
        
        // Check content length limits
        if (contentBytes.length > 1000) return false; // Max 1000 bytes
        
        return true;
    }
    
    /**
     * @notice Tạo receiver hash từ secret code
     * @param secretCode Mã bí mật của người nhận
     * @return Hash để sử dụng làm receiver identity
     */
    function generateReceiverHash(string memory secretCode) 
        internal 
        pure 
        returns (bytes32) 
    {
        require(bytes(secretCode).length >= 8, "Secret code too short");
        return keccak256(abi.encodePacked(secretCode));
    }
    
    /**
     * @notice Validate secret code format
     * @param secretCode Mã bí mật cần validate
     * @return true nếu secret code hợp lệ
     */
    function isValidSecretCode(string memory secretCode) 
        internal 
        pure 
        returns (bool) 
    {
        bytes memory codeBytes = bytes(secretCode);
        
        // Độ dài tối thiểu 8 ký tự, tối đa 64 ký tự
        if (codeBytes.length < 8 || codeBytes.length > 64) {
            return false;
        }
        
        // Không cho phép string rỗng hoặc chỉ có space
        bool hasValidChar = false;
        for (uint256 i = 0; i < codeBytes.length; i++) {
            if (codeBytes[i] != 0x20) { // không phải space
                hasValidChar = true;
                break;
            }
        }
        
        return hasValidChar;
    }
    
    /**
     * @notice Calculate message fee based on content length
     * @param baseFee Base message fee
     * @param content Encrypted message content
     * @return Final fee amount
     */
    function calculateMessageFee(uint256 baseFee, string memory content) 
        internal 
        pure 
        returns (uint256) 
    {
        uint256 contentLength = bytes(content).length;
        
        // Fee increases slightly with content length (max 200% base fee)
        if (contentLength > 500) {
            return baseFee * 200 / 100; // +100% for very long messages
        } else if (contentLength > 200) {
            return baseFee * 150 / 100; // +50% for medium messages
        } else if (contentLength > 50) {
            return baseFee * 125 / 100; // +25% for short messages
        }
        
        return baseFee; // Base fee for very short messages
    }
}

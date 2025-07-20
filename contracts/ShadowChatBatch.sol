// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./IShadowChat.sol";
import "./ShadowChatUtils.sol";

/**
 * @title ShadowChatBatch
 * @dev Contract hỗ trợ batch operations để tiết kiệm gas
 * @notice Cho phép gửi nhiều message cùng lúc và quản lý credit hiệu quả
 */
contract ShadowChatBatch {
    using ShadowChatUtils for string;
    using ShadowChatUtils for bytes32;
    
    // Events
    event BatchMessageSent(
        address indexed sender,
        uint256 messageCount,
        uint256 totalFee
    );
    
    event BatchCreditDeposit(
        address indexed depositor,
        bytes32[] receiverHashes,
        uint256[] amounts
    );
    
    /**
     * @notice Send multiple messages at once
     * @param shadowChatAddress Address of ShadowChat contract
     * @param receiverHashes Array of receiver hashes
     * @param encryptedContents Array of encrypted message contents
     */
    function sendBatchMessages(
        address shadowChatAddress,
        bytes32[] calldata receiverHashes,
        string[] calldata encryptedContents
    ) external {
        require(receiverHashes.length == encryptedContents.length, "Arrays length mismatch");
        require(receiverHashes.length > 0, "Empty arrays");
        require(receiverHashes.length <= 50, "Too many messages"); // Gas limit
        
        IShadowChat shadowChat = IShadowChat(shadowChatAddress);
        uint256 messageFee = shadowChat.messageFee();
        
        // Validate all message contents before sending
        for (uint256 i = 0; i < encryptedContents.length; i++) {
            require(ShadowChatUtils.isValidMessageContent(encryptedContents[i]), "Invalid message content");
        }
        
        // Send each message
        for (uint256 i = 0; i < receiverHashes.length; i++) {
            shadowChat.sendMessage(receiverHashes[i], encryptedContents[i]);
        }
        
        emit BatchMessageSent(
            msg.sender,
            receiverHashes.length,
            messageFee * receiverHashes.length
        );
    }
    
    /**
     * @notice Nạp credit cho nhiều receiver cùng lúc
     * @param shadowChatAddress Địa chỉ ShadowChat contract
     * @param receiverHashes Mảng receiver hashes
     * @param amounts Mảng số tiền nạp cho mỗi receiver
     */
    function batchDepositCredits(
        address shadowChatAddress,
        bytes32[] calldata receiverHashes,
        uint256[] calldata amounts
    ) external payable {
        require(receiverHashes.length == amounts.length, "Arrays length mismatch");
        require(receiverHashes.length > 0, "Empty arrays");
        require(receiverHashes.length <= 20, "Too many deposits"); // Giới hạn gas
        
        IShadowChat shadowChat = IShadowChat(shadowChatAddress);
        uint256 totalAmount = 0;
        
        // Tính tổng số tiền cần
        for (uint256 i = 0; i < amounts.length; i++) {
            require(amounts[i] > 0, "Amount must be greater than 0");
            totalAmount += amounts[i];
        }
        
        require(msg.value == totalAmount, "Incorrect total amount");
        
        // Nạp credit cho từng receiver
        for (uint256 i = 0; i < receiverHashes.length; i++) {
            shadowChat.depositCredit{value: amounts[i]}(receiverHashes[i]);
        }
        
        emit BatchCreditDeposit(msg.sender, receiverHashes, amounts);
    }
    
    /**
     * @notice Kiểm tra balance của nhiều receiver cùng lúc
     * @param shadowChatAddress Địa chỉ ShadowChat contract
     * @param receiverHashes Mảng receiver hashes
     * @return balances Mảng số dư của các receiver
     */
    function getBatchBalances(
        address shadowChatAddress,
        bytes32[] calldata receiverHashes
    ) external view returns (uint256[] memory balances) {
        require(receiverHashes.length <= 100, "Too many queries");
        
        IShadowChat shadowChat = IShadowChat(shadowChatAddress);
        balances = new uint256[](receiverHashes.length);
        
        for (uint256 i = 0; i < receiverHashes.length; i++) {
            balances[i] = shadowChat.getCreditBalance(receiverHashes[i]);
        }
        
        return balances;
    }
    
    /**
     * @notice Tính tổng chi phí cho batch messages
     * @param shadowChatAddress Địa chỉ ShadowChat contract
     * @param messageCount Số lượng messages
     * @return Tổng chi phí
     */
    function calculateBatchCost(
        address shadowChatAddress,
        uint256 messageCount
    ) external view returns (uint256) {
        IShadowChat shadowChat = IShadowChat(shadowChatAddress);
        return shadowChat.messageFee() * messageCount;
    }
}

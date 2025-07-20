**Title:** ShadowChat Protocol: A Privacy-Preserving, Credit-Based On-Chain Messaging System

---

**Abstract:**

ShadowChat is a decentralized on-chain messaging protocol that ensures message privacy, sender obfuscation, and spam prevention using credit-based access control. It utilizes Ethereum-compatible smart contracts for direct on-chain text message storage and sharding for scalability. Unlike traditional messaging protocols that rely on centralized intermediaries or expose user metadata, ShadowChat is entirely on-chain and allows recipients to remain anonymous by using hashed secret codes as message endpoints.

---

**1. Introduction**

In decentralized applications (dApps), enabling secure, private messaging presents challenges:

- Sender or recipient wallet addresses are exposed on-chain.
- Continuous polling for messages drains performance.
- Spam resistance is weak.
- Notifications are limited without off-chain infrastructure.

ShadowChat addresses these challenges by using hashed secrets instead of wallet addresses for message routing and introduces a credit-based system to gate messaging rights without exposing sender identity.

---

**2. System Architecture**

Components:

- **User Wallets (EVM compatible)**: Sender and receiver wallets for signing and message encryption/decryption.
- **Frontend DB (IndexedDB + Encryption)**: Local, per-user encrypted data store for fast lookup.
- **Smart Contract Shards**: Multiple instances of the base contract to scale event indexing and store encrypted messages on-chain.

Key Concepts:

- **Receiver Hash (receiverHash)**: A `keccak256(secretCode)` used as a pseudonymous message endpoint.
- **Credit Balance**: ETH or tokens deposited under `receiverHash` to enable message receipt.
- **Sharded Contracts**: Each user listens only to a subset of contracts to improve performance.
- **On-Chain Messages**: Encrypted message content stored directly in contract events.

---

**3. Protocol Workflow**

**3.1. Setting up Receiver Hash**

- User generates a `secretCode` (e.g., 32-byte random string).
- Computes `receiverHash = keccak256(secretCode)`.

**3.2. Depositing Credits**

```solidity
function depositCredit(bytes32 receiverHash) external payable {
    creditBalance[receiverHash] += msg.value;
}
```

Anyone can fund a receiver hash anonymously.

**3.3. Sending Messages**

```solidity
function sendMessage(bytes32 receiverHash, string calldata encryptedMessage) external {
    require(creditBalance[receiverHash] >= messageFee);
    creditBalance[receiverHash] -= messageFee;
    emit MessageSent(receiverHash, encryptedMessage, block.timestamp);
}
```

- `encryptedMessage` is the encrypted text message content stored directly on-chain.

**3.4. Receiving Messages**

- Frontend watches only for `MessageSent(receiverHash)` matching its own `receiverHash`.
- Upon match, it decrypts the message content directly from the event data and verifies sender via ECDSA signature.

**3.5. Optional Credit Withdrawal**

- Receiver signs a withdraw intent with their main wallet to extract unused credit.

---

**4. Privacy and Security Analysis**

- Receiver identity is obfuscated.
- Message payload is encrypted end-to-end and stored on-chain.
- Sender identity is verifiable from encrypted message signature.
- Contract stores encrypted content, ensuring privacy while maintaining immutability.
- No linkage between receiverHash and wallet unless explicitly exposed.

---

**5. Scaling Strategy**

- **Sharding Contracts:** `receiverHash % N` routes messages to one of N shard contracts.
- **Event Listeners:** Each client only listens to its assigned shard.
- **Load Balancing:** Hashing ensures even distribution.

---

**6. Monetization and Anti-Spam Model**

- Credit system acts as anti-spam fee.
- Per-message fee is configurable.
- Third parties can fund public inboxes without linking identities.
- Future addition: credit marketplace for message quota trading.

---

**7. Notification Strategy**

Future extension:

- Use hybrid relayer node or push service for off-chain notifications.
- End-to-end encryption ensures relayers can't read message.

---

**8. Implementation Details**

- Solidity Smart Contract (~0.8.20)
- On-chain encrypted message storage
- IndexedDB via RxDB or WatermelonDB
- Frontend in React Native (for mobile) and React (for web)
- Client-side encryption/decryption for message privacy

---

**9. Use Cases**

- Anonymous tips and journalism
- Decentralized dating platforms
- Message-based DAO proposals
- NFT project support inboxes
- Token-gated community messaging

---

**10. Conclusion**

ShadowChat Protocol introduces a viable path for privacy-preserving, spam-resistant on-chain messaging. It separates identity from storage and payment via hashed pseudonyms and local decryption keys. The modular sharding and event-based architecture allows full decentralization while maintaining practical scalability.

---
---

**Appendix**

- ABI interface
- Flowchart diagram (from previous design)
- Gas cost analysis table (optional)


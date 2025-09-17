# ShadowChat Frontend Integration Guide

This document provides comprehensive guidance for integrating with the ShadowChat Protocol frontend application.

## Overview

The ShadowChat frontend is a React-based web application that provides a user-friendly interface for interacting with ShadowChat smart contracts. It enables users to:

- Create and manage privacy-preserving identities
- Deposit and withdraw credits for messaging
- Send and receive encrypted messages
- Monitor account activity and analytics

## Architecture

```
Frontend Architecture
├── React UI Components
│   ├── IdentityGenerator - Create/import identities
│   ├── CreditManager - Manage ETH credits
│   ├── MessageCenter - Send/receive messages
│   └── Analytics - View usage statistics
├── Web3Service - Smart contract integration
├── Crypto Utils - Encryption/decryption
└── Environment Configuration
```

## Quick Start

### 1. Environment Configuration

Create a `.env` file in the frontend directory:

```bash
# Contract Addresses (update after deployment)
VITE_FACTORY_ADDRESS=0x5FbDB2315678afecb367f032d93F642f64180aa3
VITE_BATCH_ADDRESS=0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512

# Network Configuration
VITE_NETWORK_NAME=localhost
VITE_CHAIN_ID=31337

# Development Settings
VITE_DEBUG_MODE=true
```

### 2. Installation and Setup

```bash
# Install dependencies
cd frontend
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

### 3. MetaMask Configuration

Ensure MetaMask is configured for your target network:

- **Local Development**: Add Hardhat network (http://localhost:8545, Chain ID: 31337)
- **Testnet**: Configure for Goerli/Sepolia
- **Mainnet**: Use default Ethereum mainnet

## Core Components

### Web3Service Class

The `Web3Service` class provides the main interface for smart contract interactions:

```javascript
import { Web3Service } from './utils/web3.js';

const web3Service = new Web3Service();

// Connect wallet
await web3Service.connect();

// Generate identity
const secretCode = "my-secret-code";
const receiverHash = web3Service.generateReceiverHash(secretCode);

// Deposit credits
await web3Service.depositCredit(receiverHash, "0.01");

// Send message
await web3Service.sendMessage(receiverHash, encryptedContent);
```

### Key Methods

#### Identity Management
- `generateReceiverHash(secretCode)` - Generate receiver hash from secret
- `getWalletAddress()` - Get connected wallet address
- `checkContractAvailability()` - Verify contracts are deployed

#### Credit Management
- `depositCredit(receiverHash, amount)` - Add ETH credits
- `getCreditBalance(receiverHash)` - Check credit balance
- `authorizeWithdrawal(receiverHash, withdrawer, secretCode)` - Authorize withdrawal
- `withdrawCredit(receiverHash, amount)` - Withdraw credits

#### Messaging
- `sendMessage(receiverHash, encryptedContent)` - Send encrypted message
- `listenForMessages(receiverHash, callback)` - Listen for new messages
- `getHistoricalMessages(receiverHash, fromBlock)` - Get message history

## Privacy Features

### Identity Privacy
- **Pseudonymous Identities**: Users identified by hash, not wallet address
- **Secret Code Protection**: Identity tied to user-controlled secret code
- **No Address Linkage**: Receiver hash mathematically unlinked to wallet

### Message Privacy
- **End-to-End Encryption**: Messages encrypted before blockchain storage
- **Client-Side Decryption**: Only secret code holder can decrypt
- **Anonymous Sending**: Sender identity protected through encryption

### Financial Privacy
- **Anonymous Funding**: Anyone can deposit credits to any receiver hash
- **Withdrawal Authorization**: Only secret code holder can withdraw
- **Spam Protection**: Credit requirement prevents abuse

## Error Handling

The Web3Service provides comprehensive error handling with user-friendly messages:

```javascript
try {
  await web3Service.depositCredit(receiverHash, amount);
} catch (error) {
  // Errors are automatically translated to user-friendly messages:
  // - "Insufficient funds in wallet"
  // - "Transaction rejected by user"
  // - "Contract execution reverted"
}
```

## Development Features

### Debug Mode
Enable debug logging by setting `VITE_DEBUG_MODE=true`:

```javascript
// Logs contract addresses, transaction hashes, and operation details
🔧 Web3Service initialized with config: {chainId: 31337, networkName: localhost, debugMode: true}
📍 Contract addresses: {factory: 0x5FbDB..., batch: 0xe7f17...}
💰 Depositing 0.01 ETH to 0x8f2a7c9b...
📝 Transaction sent: 0x1234567...
✅ Transaction confirmed in block 12345
```

### Contract Caching
Shard contracts are cached for performance:
- Reduces redundant factory lookups
- Improves response times
- Maintains consistency across operations

## Integration Examples

### Complete Identity and Credit Flow

```javascript
// 1. Connect wallet
const web3Service = new Web3Service();
await web3Service.connect();

// 2. Generate identity
const secretCode = MessageCrypto.generateSecretCode(32);
const identity = {
  secretCode,
  receiverHash: web3Service.generateReceiverHash(secretCode),
  createdAt: new Date().toISOString()
};

// 3. Deposit credits
await web3Service.depositCredit(identity.receiverHash, "0.05");

// 4. Check balance
const balance = await web3Service.getCreditBalance(identity.receiverHash);
console.log(`Balance: ${balance} ETH`);

// 5. Send message
const message = "Hello, ShadowChat!";
const encrypted = MessageCrypto.encrypt(message, secretCode);
await web3Service.sendMessage(targetReceiverHash, encrypted);
```

### Message Listening

```javascript
// Listen for incoming messages
const stopListening = await web3Service.listenForMessages(
  identity.receiverHash,
  (messageData) => {
    // Decrypt message
    const decrypted = MessageCrypto.decrypt(
      messageData.encryptedContent,
      identity.secretCode
    );
    console.log('New message:', decrypted);
  }
);

// Stop listening when component unmounts
// stopListening();
```

## IPFS Integration for Frontend

The ShadowChat frontend can leverage IPFS for off-chain message storage, dramatically reducing gas costs while enhancing privacy.

### IPFS Client Setup

```javascript
// Install IPFS dependencies
npm install axios form-data

// Initialize IPFS client in your frontend
import { IPFSClient } from '../utils/ipfs';

const ipfsClient = new IPFSClient({
  pinataApiKey: process.env.VITE_PINATA_API_KEY,
  pinataSecretKey: process.env.VITE_PINATA_SECRET_KEY
});
```

### Message Storage Flow

```javascript
// 1. Encrypt message content
const encryptedContent = MessageCrypto.encrypt(message, secretKey);

// 2. Store on IPFS
const ipfsCid = await ipfsClient.storeMessage(encryptedContent, {
  sender: userAddress,
  timestamp: Date.now()
});

// 3. Send CID to blockchain (much cheaper!)
const tx = await shadowChatContract.sendMessage(receiverHash, ipfsCid);
```

### Message Retrieval Flow

```javascript
// 1. Listen for MessageSent events
shadowChatContract.on('MessageSent', async (messageId, sender, receiverHash, cidOrContent, timestamp) => {
  // 2. Check if content is IPFS CID
  if (IPFSClient.isValidCID(cidOrContent)) {
    // 3. Fetch from IPFS
    const messageData = await ipfsClient.retrieveMessage(cidOrContent);
    
    // 4. Decrypt content
    const decryptedMessage = MessageCrypto.decrypt(messageData.content, secretKey);
    
    // 5. Display in UI
    displayMessage({
      id: messageId,
      sender,
      content: decryptedMessage,
      timestamp: new Date(timestamp * 1000),
      isFromIPFS: true
    });
  } else {
    // Handle legacy on-chain content
    const decryptedMessage = MessageCrypto.decrypt(cidOrContent, secretKey);
    displayMessage({
      id: messageId,
      sender,
      content: decryptedMessage,
      timestamp: new Date(timestamp * 1000),
      isFromIPFS: false
    });
  }
});
```

### Environment Configuration

Add IPFS configuration to your `.env` file:

```bash
# IPFS Configuration
VITE_PINATA_API_KEY=your_pinata_api_key
VITE_PINATA_SECRET_KEY=your_pinata_secret_key
VITE_IPFS_GATEWAY=https://gateway.pinata.cloud/ipfs/

# Alternative: Local IPFS Node
VITE_LOCAL_IPFS_URL=http://localhost:5001
VITE_LOCAL_IPFS_GATEWAY=http://localhost:8080/ipfs/
```

### React Hook for IPFS Messages

```javascript
import { useState, useEffect } from 'react';
import { IPFSClient } from '../utils/ipfs';

export const useIPFSMessages = (receiverHash, secretKey) => {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchMessages = async () => {
    setLoading(true);
    try {
      // Get events from blockchain
      const events = await shadowChatContract.queryFilter(
        shadowChatContract.filters.MessageSent(null, receiverHash)
      );

      const ipfsClient = new IPFSClient();
      const processedMessages = [];

      for (const event of events) {
        const { messageId, sender, cidOrContent, timestamp } = event.args;
        
        let decryptedContent;
        let isFromIPFS = false;

        if (IPFSClient.isValidCID(cidOrContent)) {
          // Fetch from IPFS
          const messageData = await ipfsClient.retrieveMessage(cidOrContent);
          decryptedContent = MessageCrypto.decrypt(messageData.content, secretKey);
          isFromIPFS = true;
        } else {
          // Direct on-chain content
          decryptedContent = MessageCrypto.decrypt(cidOrContent, secretKey);
        }

        processedMessages.push({
          id: messageId.toString(),
          sender,
          content: decryptedContent,
          timestamp: new Date(Number(timestamp) * 1000),
          isFromIPFS
        });
      }

      setMessages(processedMessages);
    } catch (error) {
      console.error('Failed to fetch messages:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (receiverHash && secretKey) {
      fetchMessages();
    }
  }, [receiverHash, secretKey]);

  return { messages, loading, refetch: fetchMessages };
};
```

### IPFS Status Component

```javascript
const IPFSStatus = () => {
  const [status, setStatus] = useState(null);

  useEffect(() => {
    const checkStatus = async () => {
      const ipfsClient = new IPFSClient();
      const ipfsStatus = ipfsClient.getStatus();
      setStatus(ipfsStatus);
    };
    
    checkStatus();
  }, []);

  if (!status) return <div>Checking IPFS status...</div>;

  return (
    <div className="ipfs-status">
      <h3>IPFS Configuration</h3>
      <p>Backend: {status.backend}</p>
      <p>Status: {status.configured ? '✅ Connected' : '❌ Not Configured'}</p>
      <p>Gateway: {status.gatewayUrl}</p>
    </div>
  );
};
```

### Performance Benefits

| Feature | Traditional | With IPFS | Improvement |
|---------|-------------|-----------|-------------|
| Gas Cost (1KB msg) | ~21,000 gas | ~2,100 gas | 90% reduction |
| Message Size Limit | Block gas limit | Unlimited | ∞ |
| Loading Speed | Blockchain sync | Direct fetch | 10x faster |

## Security Considerations

### Secret Code Management
- **Never log secret codes** in production
- **Store locally only** - never send to servers
- **Use strong generation** - minimum 32 characters
- **Backup securely** - user responsibility

### Contract Interaction
- **Validate inputs** before sending transactions
- **Check balances** before operations
- **Handle failures gracefully** with proper error messages
- **Verify contract addresses** in production

### User Experience
- **Clear error messages** for all failure scenarios
- **Loading states** for pending transactions
- **Transaction confirmations** with block numbers
- **Balance updates** after operations

## Testing

### Local Development
1. Start Hardhat node: `npx hardhat node`
2. Deploy contracts: `npm run deploy:local`
3. Start frontend: `npm run dev`
4. Connect MetaMask to localhost:8545

### Contract Integration Testing
1. Run demo script: `npm run frontend:demo`
2. Check generated `.env` configuration
3. Verify contract addresses in console logs
4. Test all UI components

## Troubleshooting

### Common Issues

**MetaMask Not Connecting**
- Ensure MetaMask is installed and unlocked
- Check network configuration matches environment
- Verify account has sufficient ETH for transactions

**Contract Not Found**
- Verify contract addresses in `.env` file
- Ensure contracts are deployed to target network
- Check Web3Service debug logs for details

**Transaction Failures**
- Check wallet ETH balance for gas fees
- Verify credit balance for message sending
- Ensure proper authorization for withdrawals

**Message Decryption Failures**
- Verify secret code matches original
- Check message encryption format
- Ensure proper receiver hash calculation

### Debug Information

Enable debug mode and check browser console for detailed logs:
- Contract initialization details
- Transaction hashes and block numbers
- Error details with stack traces
- Network and address information

## Production Deployment

### Environment Variables
Update `.env` with production contract addresses:

```bash
VITE_FACTORY_ADDRESS=0x...  # Production factory address
VITE_BATCH_ADDRESS=0x...    # Production batch address
VITE_NETWORK_NAME=mainnet   # Target network name
VITE_CHAIN_ID=1            # Ethereum mainnet
VITE_DEBUG_MODE=false      # Disable debug logs
```

### Build Optimization
```bash
npm run build
```

### Security Checklist
- [ ] Debug mode disabled
- [ ] Contract addresses verified
- [ ] Network configuration correct
- [ ] No secret codes in logs
- [ ] Error handling comprehensive
- [ ] User education complete

## Support

For additional support:
1. Check the repository issues
2. Review contract documentation
3. Test with local Hardhat network
4. Verify environment configuration

## License

MIT License - see LICENSE file for details.
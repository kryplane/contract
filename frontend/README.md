# 🕶️ ShadowChat Frontend

A privacy-preserving web application for the ShadowChat Protocol, built with React and Vite.

## Features

- **🔑 Identity Management**: Generate or import cryptographic identities
- **💰 Credit Management**: Deposit and manage credits for message sending
- **💬 Encrypted Messaging**: Send and receive end-to-end encrypted messages
- **📊 Analytics Dashboard**: Monitor messaging activity and network statistics
- **🔒 Privacy-First Design**: Client-side encryption with no server dependencies

## Quick Start

### Prerequisites

- Node.js 16+ 
- MetaMask or compatible Web3 wallet
- Access to Ethereum network (local/testnet/mainnet)

### Installation

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

### Configuration

The app connects to default Hardhat local network addresses by default. To use different networks or contract addresses, update the configuration in `src/utils/web3.js`:

```javascript
export const DEFAULT_CONTRACTS = {
  factory: "0x5FbDB2315678afecb367f032d93F642f64180aa3", // Factory contract address
  batch: "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512"    // Batch contract address
};
```

## Usage Guide

### 1. Connect Wallet

- Click "Connect Wallet" to connect your MetaMask or compatible Web3 wallet
- Ensure you're connected to the correct network where ShadowChat contracts are deployed

### 2. Create Identity

- Go to "🔑 Identity" tab
- Choose to either:
  - **Generate New Identity**: Creates a random secret code and receiver hash
  - **Import Existing Identity**: Enter your existing secret code to restore identity

⚠️ **Important**: Keep your secret code private and secure - it's needed to decrypt messages!

### 3. Deposit Credits

- Go to "💰 Credits" tab  
- Enter amount of ETH to deposit
- Credits are required to send messages (based on message fee)
- Anyone can deposit credits to any receiver hash anonymously

### 4. Send Messages

- Go to "💬 Messages" tab
- Enter recipient's secret code (for encryption) or receiver hash
- Type your message
- Click "Send Encrypted Message"
- Message is encrypted client-side before sending to blockchain

### 5. Receive Messages

- Messages sent to your receiver hash appear automatically in "💬 Messages" tab
- Messages are decrypted client-side using your secret code
- Real-time listening for new messages when tab is active

### 6. View Analytics

- Go to "📊 Analytics" tab to see:
  - Messages received/sent statistics
  - Credit balance and usage
  - Recent activity
  - Network statistics

## Privacy & Security

### Client-Side Encryption

- All messages are encrypted client-side using AES encryption
- Only the recipient with the correct secret code can decrypt messages
- Encrypted content is stored on-chain, but plaintext never leaves your browser

### Identity Protection

- Your wallet address is never linked to your receiver hash on-chain
- Secret codes are never transmitted to the blockchain
- Receiver hashes are cryptographic commitments that can't be reversed

### Best Practices

- **Never share your secret code** - it's your private key for decryption
- **Backup your secret code securely** - losing it means losing access to messages
- **Use unique secret codes** for different purposes/identities
- **Verify receiver hashes** before sending sensitive messages

## Architecture

### Components

- **IdentityGenerator**: Manages cryptographic identity creation and import
- **CreditManager**: Handles ETH deposits and withdrawals for message fees
- **MessageCenter**: Interface for sending/receiving encrypted messages
- **Analytics**: Dashboard for activity monitoring and statistics
- **Header**: Wallet connection and navigation

### Core Utilities

- **Web3Service**: Ethereum blockchain interaction layer
- **MessageCrypto**: Client-side AES encryption/decryption
- **useWeb3**: React hook for Web3 state management

### Tech Stack

- **React 18**: Modern React with hooks
- **Vite**: Fast build tool and dev server
- **Ethers.js 6**: Ethereum interaction library
- **TailwindCSS**: Utility-first CSS framework
- **Lucide React**: Beautiful SVG icons
- **React Hot Toast**: Toast notifications

## Smart Contract Integration

The frontend integrates with the ShadowChat Protocol smart contracts:

### Factory Contract
- Manages multiple shard contracts for scalability
- Routes messages based on receiver hash modulo shard count
- Provides network-wide configuration

### Shard Contracts  
- Store encrypted messages on-chain
- Manage credit balances per receiver hash
- Emit events for message sending/credit operations

### Events Monitored

- `MessageSent`: New message to your receiver hash
- `CreditDeposited`: Credits added to your balance  
- `CreditWithdrawn`: Credits withdrawn from your balance

## Development

### Project Structure

```
frontend/
├── public/              # Static assets
├── src/
│   ├── components/      # React components
│   │   ├── Header.jsx
│   │   ├── IdentityGenerator.jsx
│   │   ├── CreditManager.jsx
│   │   ├── MessageCenter.jsx
│   │   └── Analytics.jsx
│   ├── hooks/           # Custom React hooks
│   │   └── useWeb3.js
│   ├── utils/           # Utility functions
│   │   ├── web3.js      # Blockchain interaction
│   │   └── crypto.js    # Encryption utilities
│   ├── App.jsx          # Main app component
│   ├── main.jsx         # React entry point
│   └── index.css        # Global styles
├── package.json
├── tailwind.config.js
└── vite.config.js
```

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production  
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

### Adding New Features

1. Create new components in `src/components/`
2. Add utility functions in `src/utils/`
3. Use `useWeb3` hook for blockchain interactions
4. Follow existing patterns for error handling and user feedback

## Deployment

### Local Development

1. Run Hardhat local network: `npx hardhat node`
2. Deploy contracts: `npm run deploy:localhost` 
3. Start frontend: `npm run dev`
4. Access at `http://localhost:3000`

### Production Deployment

1. Update contract addresses in `src/utils/web3.js`
2. Build: `npm run build`
3. Deploy `dist/` folder to web server
4. Configure HTTPS for Web3 wallet connectivity

### Testnet Deployment

- Update contract addresses to point to testnet deployments
- Ensure users have testnet ETH for gas fees
- Consider using testnet-specific configuration

## Troubleshooting

### Common Issues

**Wallet Connection Fails**
- Ensure MetaMask is installed and unlocked
- Check you're on correct network
- Try refreshing page and reconnecting

**Messages Not Decrypting**
- Verify you're using correct secret code
- Check message was sent to your receiver hash
- Ensure message wasn't corrupted in transit

**Transaction Fails**
- Check you have sufficient ETH for gas fees
- Verify contract addresses are correct
- Ensure you have credits for message sending

**Real-time Updates Not Working**
- Check wallet is connected
- Verify you're listening to correct events
- Try refreshing to reload messages

### Support

For issues and questions:
- Check the main [ShadowChat README](../README.md)
- Review [WhitePaper.md](../WhitePaper.md) for protocol details
- Open issues on GitHub repository

## License

MIT License - see [LICENSE](../LICENSE) file for details.

---

⚠️ **Security Notice**: This is experimental software for educational/research purposes. 
Audit thoroughly before production use with real assets.
# 🕶️ ShadowChat Frontend - Quick Start Guide

> 📸 **Visual Walkthrough**: For step-by-step screenshots of the complete application workflow, see [App Workflow Screenshots](docs/APP_WORKFLOW_SCREENSHOTS.md)

## Demo Walkthrough

Follow these steps to test the complete ShadowChat frontend application:

### Prerequisites

1. **Node.js 16+** installed
2. **MetaMask** browser extension installed
3. **Hardhat local network** running

### Step 1: Setup Local Environment

```bash
# Clone and setup the project
git clone <repository-url>
cd contract

# Install dependencies for both backend and frontend
npm run setup

# Start local Hardhat network (in one terminal)
npm run node

# Deploy contracts and setup demo data (in another terminal)
npm run frontend:demo
```

### Step 2: Configure MetaMask

1. Open MetaMask
2. Add new network with these settings:
   - **Network Name**: Hardhat Local
   - **RPC URL**: http://localhost:8545
   - **Chain ID**: 31337
   - **Currency Symbol**: ETH
3. Import test accounts using the private keys from Hardhat node output

### Step 3: Start Frontend

```bash
# Start the frontend development server
npm run frontend:dev

# Or start both node and frontend together
npm run dev
```

Visit: **http://localhost:3000**

### Step 4: Demo Workflow

#### A. Connect Wallet
1. Click "Connect Wallet" button
2. Approve MetaMask connection
3. Verify you're connected to Hardhat Local network

#### B. Import Demo Identity

1. Go to **🔑 Identity** tab
2. Choose "Import Existing Identity"
3. Enter one of these demo secret codes:
   - Alice: `alice_secret_demo_key_12345678`
   - Bob: `bob_secret_demo_key_87654321`
4. Click "Import Identity"

#### C. Check Credits

1. Go to **💰 Credits** tab
2. Verify you have 0.01 ETH credit balance
3. See that this allows ~10 messages (based on 0.001 ETH fee)

#### D. Send/Receive Messages

1. Go to **💬 Messages** tab
2. **To send a message:**
   - Enter recipient's secret code (use the other demo identity)
   - Type your message
   - Click "Send Encrypted Message"
3. **To receive messages:**
   - Import the other demo identity
   - Messages appear automatically with real-time updates

#### E. View Analytics

1. Go to **📊 Analytics** tab
2. See message statistics and activity
3. Monitor credit usage and network stats

### Demo Features Showcase

#### 🔒 Privacy & Security
- **Client-side encryption**: All messages encrypted in browser
- **Identity protection**: Wallet address never linked to receiver hash
- **Secret code privacy**: Never transmitted to blockchain

#### 🚀 Real-time Updates
- **Event listening**: Automatic updates when messages received
- **Live notifications**: Toast notifications for all actions
- **Real-time balance**: Credit balance updates instantly

#### 🎨 User Experience
- **Dark theme**: Professional privacy-focused design
- **Responsive layout**: Works on desktop and mobile
- **Intuitive navigation**: Clear tab-based interface
- **Error handling**: Comprehensive error messages and validation

#### 🔧 Technical Features
- **Web3 integration**: Seamless MetaMask connection
- **Contract interaction**: Direct smart contract calls
- **Event monitoring**: Real-time blockchain event listening
- **Local encryption**: AES encryption for message privacy

### Troubleshooting

#### Wallet Connection Issues
```bash
# Ensure MetaMask is connected to correct network
Network: Hardhat Local (localhost:8545)
Chain ID: 31337
```

#### Contract Interaction Errors
```bash
# Redeploy contracts if needed
npm run clean
npm run compile
npm run frontend:demo
```

#### Frontend Build Issues
```bash
# Reinstall frontend dependencies
cd frontend
rm -rf node_modules package-lock.json
npm install
npm run build
```

### File Structure

```
frontend/
├── src/
│   ├── components/           # React components
│   │   ├── Header.jsx       # Wallet connection
│   │   ├── IdentityGenerator.jsx  # Identity management
│   │   ├── CreditManager.jsx      # Credit operations
│   │   ├── MessageCenter.jsx      # Messaging interface
│   │   └── Analytics.jsx          # Statistics dashboard
│   ├── hooks/
│   │   └── useWeb3.js       # Web3 state management
│   ├── utils/
│   │   ├── web3.js          # Blockchain interaction
│   │   └── crypto.js        # Client-side encryption
│   └── App.jsx              # Main application
└── package.json             # Frontend dependencies
```

### Production Deployment

1. **Update contract addresses** in `frontend/src/utils/web3.js`
2. **Build production version**: `npm run frontend:build`
3. **Deploy `frontend/dist/`** to web server
4. **Configure HTTPS** for Web3 wallet connectivity

### Security Considerations

- ✅ **No server required** - fully client-side application
- ✅ **Private keys never exposed** - only wallet signatures used
- ✅ **End-to-end encryption** - messages encrypted before blockchain
- ✅ **Pseudonymous identities** - wallet addresses not linked to receiver hashes
- ⚠️ **Experimental software** - audit before production use with real assets

---

**Next Steps**: Refer to `frontend/README.md` for detailed documentation and `scripts/frontend-demo.js` for automated setup.
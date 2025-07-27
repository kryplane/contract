# ShadowChat Protocol Deployment Guide

This guide explains how to deploy the ShadowChat protocol contracts using the provided deployment scripts.

## Prerequisites

- Node.js and npm installed
- Hardhat configured
- Sufficient ETH for deployment (gas costs)
- Private key or mnemonic configured for target network

## Quick Start

### 1. Compile Contracts
```bash
npm run compile
```

### 2. Deploy to Local Network
```bash
# Start local Hardhat node (in separate terminal)
npm run node

# Deploy to local network
npm run deploy:local
```

### 3. Verify Deployment
```bash
npm run verify:deployment
```

## Deployment Scripts

### `deploy.js` - Local/Development Deployment
- **Purpose**: Development and testing
- **Configuration**: Lower fees, fewer shards (3)
- **Networks**: localhost, hardhat
- **Usage**: `npm run deploy:local`

### `deploy-production.js` - Production Deployment
- **Purpose**: Mainnet and testnet production deployments
- **Configuration**: Higher fees, more shards (10)
- **Networks**: mainnet, goerli, sepolia
- **Usage**: 
  - Testnet: `npm run deploy:goerli`
  - Mainnet: `npm run deploy:mainnet`

### `verify-deployment.js` - Deployment Verification
- **Purpose**: Verify deployed contracts are working correctly
- **Features**: 
  - Checks contract deployment
  - Verifies basic functionality
  - Tests contract interactions
- **Usage**: `npm run verify:deployment`

## Deployment Configuration

The deployment parameters are configured in `scripts/deployment-config.js`:

```javascript
// Local development
local: {
    messageFee: 0.001 ETH,      // Per message
    withdrawalFee: 0.0005 ETH,  // Per withdrawal
    registrationFee: 0.01 ETH,  // Per receiverHash registration
    initialShards: 3            // Number of shards
}

// Production mainnet
production: {
    messageFee: 0.005 ETH,      // Higher for production
    withdrawalFee: 0.002 ETH,
    registrationFee: 0.05 ETH,
    initialShards: 10           // More shards for scalability
}
```

## Contract Deployment Order

The deployment scripts deploy contracts in the following order:

1. **ShadowChatRegistry** - Manages receiverHash registration
2. **ShadowChatFactory** - Deploys and manages ShadowChat shards
3. **ShadowChatBatch** - Batch operations for gas efficiency

Note: `ShadowChatUtils` is a library with all `internal` functions, so it gets compiled inline and doesn't require separate deployment or linking.

## Network Configuration

Add network configurations to `hardhat.config.js`:

```javascript
networks: {
  localhost: {
    url: "http://127.0.0.1:8545",
  },
  goerli: {
    url: `https://goerli.infura.io/v3/${process.env.INFURA_PROJECT_ID}`,
    accounts: [process.env.PRIVATE_KEY]
  },
  mainnet: {
    url: `https://mainnet.infura.io/v3/${process.env.INFURA_PROJECT_ID}`,
    accounts: [process.env.PRIVATE_KEY]
  }
}
```

## Environment Variables

Set up required environment variables:

```bash
# .env file
PRIVATE_KEY=your_private_key_here
INFURA_PROJECT_ID=your_infura_project_id
ETHERSCAN_API_KEY=your_etherscan_api_key
```

## Deployment Output

After successful deployment, you'll find:

1. **Console Output**: Detailed deployment information
2. **Deployment File**: JSON file in `./deployments/` with:
   - Contract addresses
   - Configuration parameters
   - Gas usage
   - Network information
   - Timestamp

## Post-Deployment Steps

### 1. Verify Contracts on Etherscan
```bash
# Example for mainnet
npx hardhat verify --network mainnet <CONTRACT_ADDRESS> <CONSTRUCTOR_ARGS>
```

### 2. Test Deployment
```bash
npm run test
npm run interact:local
npm run demo
```

### 3. Update Frontend Configuration
Update your frontend with the new contract addresses from the deployment file.

## Troubleshooting

### Common Issues

1. **Insufficient Gas**: Increase gas limit in network configuration
2. **Library Linking**: Ensure libraries are deployed before contracts that use them
3. **Network Issues**: Check RPC endpoint and network configuration

### Gas Estimation

Approximate gas usage:
- ShadowChatRegistry: ~2,000,000 gas
- ShadowChatFactory: ~3,000,000+ gas (depends on initial shards)
- ShadowChatBatch: ~1,500,000 gas

### Recovery

If deployment fails partway through:
1. Check the deployment file for successfully deployed contracts
2. Modify the deployment script to skip already deployed contracts
3. Continue from the failed step

## Security Considerations

### Production Deployment Checklist

- [ ] Code audited and tested thoroughly
- [ ] Private keys secure and not exposed
- [ ] Network configuration verified
- [ ] Gas prices appropriate for network conditions
- [ ] Deployment parameters reviewed
- [ ] Emergency procedures documented
- [ ] Monitoring setup ready

### Contract Ownership

By default, contracts are deployed with the deployer as owner. Consider:
- Transferring ownership to a multisig wallet
- Setting up governance mechanisms
- Implementing emergency pause functionality

## Scripts Reference

| Command | Description |
|---------|-------------|
| `npm run compile` | Compile all contracts |
| `npm run deploy` | Deploy to localhost (default) |
| `npm run deploy:local` | Deploy to local network |
| `npm run deploy:goerli` | Deploy to Goerli testnet |
| `npm run deploy:mainnet` | Deploy to Ethereum mainnet |
| `npm run verify:deployment` | Verify deployed contracts |
| `npm run test` | Run contract tests |
| `npm run node` | Start local Hardhat network |

## Support

For issues or questions:
1. Check the deployment logs for error details
2. Verify network configuration and environment variables
3. Review the contract compilation output
4. Check gas estimation and account balance

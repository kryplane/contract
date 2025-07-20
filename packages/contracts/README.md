# Contracts Package - ShadowChat Protocol

This package contains the smart contracts for the ShadowChat Protocol, implementing privacy-preserving messaging on blockchain with on-chain storage.

## Contracts

- **ShadowChat.sol** - Core messaging contract with sharded architecture
- **ShadowChatFactory.sol** - Factory for creating new ShadowChat instances
- **ShadowChatRegistry.sol** - Registry for managing active shards
- **ShadowChatBatch.sol** - Gas optimization for batch operations
- **ShadowChatUtils.sol** - Utility functions and helpers

## Development

```bash
# Install dependencies
npm install

# Compile contracts
npm run compile

# Run tests
npm run test

# Start local Hardhat network
npm run node

# Deploy to local network
npm run deploy:local

# Deploy to Goerli testnet
npm run deploy:goerli
```

## Testing

Run the comprehensive test suite:

```bash
npm run test
npm run coverage  # Generate coverage report
```

## Deployment

The contracts support deployment to multiple networks:

- Local Hardhat network
- Ethereum testnets (Goerli, Sepolia)
- Ethereum mainnet

Configure networks in `hardhat.config.js` before deployment.

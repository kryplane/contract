/**
 * Deployment Configuration for ShadowChat Protocol
 * 
 * This file contains configuration parameters for different deployment environments.
 * Modify these values as needed for your specific deployment requirements.
 */

const { ethers } = require("hardhat");

const deploymentConfig = {
    // Local development configuration
    local: {
        messageFee: ethers.parseEther("0.001"),      // 0.001 ETH per message
        withdrawalFee: ethers.parseEther("0.0005"),  // 0.0005 ETH per withdrawal  
        registrationFee: ethers.parseEther("0.01"),  // 0.01 ETH to register receiverHash
        initialShards: 3                             // Number of initial shards
    },

    // Testnet configuration (Goerli, Sepolia, etc.)
    testnet: {
        messageFee: ethers.parseEther("0.002"),      // 0.002 ETH per message
        withdrawalFee: ethers.parseEther("0.001"),   // 0.001 ETH per withdrawal
        registrationFee: ethers.parseEther("0.02"),  // 0.02 ETH to register receiverHash
        initialShards: 5                             // More shards for testing
    },

    // Production mainnet configuration
    production: {
        messageFee: ethers.parseEther("0.005"),      // 0.005 ETH per message
        withdrawalFee: ethers.parseEther("0.002"),   // 0.002 ETH per withdrawal
        registrationFee: ethers.parseEther("0.05"),  // 0.05 ETH to register receiverHash
        initialShards: 10                            // More shards for scalability
    }
};

/**
 * Get configuration for specific environment
 * @param {string} environment - Environment name (local, testnet, production)
 * @returns {object} Configuration object
 */
function getConfig(environment = 'local') {
    const config = deploymentConfig[environment];
    if (!config) {
        throw new Error(`Unknown environment: ${environment}. Available: ${Object.keys(deploymentConfig).join(', ')}`);
    }
    return config;
}

/**
 * Get configuration based on network name
 * @param {string} networkName - Network name from hardhat config
 * @returns {object} Configuration object
 */
function getConfigByNetwork(networkName) {
    if (networkName === 'localhost' || networkName === 'hardhat') {
        return getConfig('local');
    } else if (networkName === 'mainnet') {
        return getConfig('production');
    } else {
        // Assume testnet for all other networks
        return getConfig('testnet');
    }
}

module.exports = {
    deploymentConfig,
    getConfig,
    getConfigByNetwork
};

const { ethers } = require("hardhat");
const { loadDeploymentInfo } = require('./interact.js');

/**
 * Event monitoring script cho ShadowChat Protocol
 * Sử dụng: npx hardhat run scripts/monitor.js --network <network>
 */

class ShadowChatMonitor {
  constructor(factoryAddress, batchAddress) {
    this.factoryAddress = factoryAddress;
    this.batchAddress = batchAddress;
    this.isMonitoring = false;
    this.eventCounts = {
      MessageSent: 0,
      CreditDeposited: 0,
      CreditWithdrawn: 0,
      WithdrawalAuthorized: 0,
      ShardDeployed: 0
    };
  }
  
  async init() {
    const ShadowChatFactory = await ethers.getContractFactory("ShadowChatFactory");
    const ShadowChat = await ethers.getContractFactory("ShadowChat");
    
    this.factory = ShadowChatFactory.attach(this.factoryAddress);
    this.shards = await this.factory.getAllShards();
    
    console.log(`🏭 Factory: ${this.factoryAddress}`);
    console.log(`🗂️ Monitoring ${this.shards.length} shards:`);
    
    this.shardContracts = [];
    for (let i = 0; i < this.shards.length; i++) {
      const shard = ShadowChat.attach(this.shards[i]);
      this.shardContracts.push(shard);
      console.log(`   Shard ${i}: ${this.shards[i]}`);
    }
    
    console.log("");
  }
  
  formatTimestamp(timestamp) {
    return new Date(Number(timestamp) * 1000).toISOString();
  }
  
  formatAddress(address) {
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
  }
  
  formatHash(hash) {
    return `${hash.substring(0, 10)}...`;
  }
  
  async startMonitoring() {
    if (this.isMonitoring) {
      console.log("❌ Monitor already running!");
      return;
    }
    
    console.log("🔍 Bắt đầu monitor events...");
    console.log("=".repeat(60));
    this.isMonitoring = true;
    
    // Monitor Factory events
    this.factory.on("ShardDeployed", (shardAddress, index, event) => {
      this.eventCounts.ShardDeployed++;
      console.log(`🏭 [FACTORY] Shard Deployed`);
      console.log(`   Address: ${shardAddress}`);
      console.log(`   Index: ${index}`);
      console.log(`   Block: ${event.blockNumber}`);
      console.log(`   Time: ${new Date().toISOString()}\n`);
    });
    
    // Monitor all shard events
    for (let i = 0; i < this.shardContracts.length; i++) {
      const shard = this.shardContracts[i];
      const shardIndex = i;
      
      // Message events
      shard.on("MessageSent", (messageId, sender, receiver, ipfsCid, timestamp, event) => {
        this.eventCounts.MessageSent++;
        console.log(`📨 [SHARD ${shardIndex}] Message Sent`);
        console.log(`   ID: ${messageId}`);
        console.log(`   From: ${this.formatAddress(sender)}`);
        console.log(`   To: ${this.formatHash(receiver)}`);
        console.log(`   IPFS: ${ipfsCid}`);
        console.log(`   Time: ${this.formatTimestamp(timestamp)}`);
        console.log(`   Block: ${event.blockNumber}`);
        console.log(`   TX: ${event.transactionHash}\n`);
      });
      
      // Credit events
      shard.on("CreditDeposited", (receiver, amount, newBalance, event) => {
        this.eventCounts.CreditDeposited++;
        console.log(`💰 [SHARD ${shardIndex}] Credit Deposited`);
        console.log(`   Receiver: ${this.formatHash(receiver)}`);
        console.log(`   Amount: ${ethers.formatEther(amount)} ETH`);
        console.log(`   New Balance: ${ethers.formatEther(newBalance)} ETH`);
        console.log(`   Block: ${event.blockNumber}`);
        console.log(`   TX: ${event.transactionHash}\n`);
      });
      
      shard.on("CreditWithdrawn", (receiver, amount, newBalance, event) => {
        this.eventCounts.CreditWithdrawn++;
        console.log(`💸 [SHARD ${shardIndex}] Credit Withdrawn`);
        console.log(`   Receiver: ${this.formatHash(receiver)}`);
        console.log(`   Amount: ${ethers.formatEther(amount)} ETH`);
        console.log(`   New Balance: ${ethers.formatEther(newBalance)} ETH`);
        console.log(`   Block: ${event.blockNumber}`);
        console.log(`   TX: ${event.transactionHash}\n`);
      });
      
      shard.on("WithdrawalAuthorized", (receiver, amount, authorizedAt, event) => {
        this.eventCounts.WithdrawalAuthorized++;
        console.log(`🔐 [SHARD ${shardIndex}] Withdrawal Authorized`);
        console.log(`   Receiver: ${this.formatHash(receiver)}`);
        console.log(`   Amount: ${ethers.formatEther(amount)} ETH`);
        console.log(`   Authorized: ${this.formatTimestamp(authorizedAt)}`);
        console.log(`   Block: ${event.blockNumber}`);
        console.log(`   TX: ${event.transactionHash}\n`);
      });
    }
    
    // Show stats every 30 seconds
    this.statsInterval = setInterval(() => {
      this.showStats();
    }, 30000);
    
    console.log("✅ Monitor active! Press Ctrl+C to stop.\n");
  }
  
  stopMonitoring() {
    if (!this.isMonitoring) return;
    
    console.log("\n🛑 Stopping monitor...");
    this.isMonitoring = false;
    
    // Remove all listeners
    this.factory.removeAllListeners();
    this.shardContracts.forEach(shard => {
      shard.removeAllListeners();
    });
    
    if (this.statsInterval) {
      clearInterval(this.statsInterval);
    }
    
    console.log("✅ Monitor stopped.");
  }
  
  showStats() {
    console.log("📊 EVENT STATISTICS");
    console.log("-".repeat(30));
    console.log(`📨 Messages: ${this.eventCounts.MessageSent}`);
    console.log(`💰 Deposits: ${this.eventCounts.CreditDeposited}`);
    console.log(`💸 Withdrawals: ${this.eventCounts.CreditWithdrawn}`);
    console.log(`🔐 Authorizations: ${this.eventCounts.WithdrawalAuthorized}`);
    console.log(`🏭 New Shards: ${this.eventCounts.ShardDeployed}`);
    console.log(`⏰ Last Update: ${new Date().toISOString()}`);
    console.log("");
  }
  
  async getHistoricalEvents(fromBlock = 0, toBlock = 'latest') {
    console.log(`📚 Lấy historical events từ block ${fromBlock} đến ${toBlock}`);
    console.log("=".repeat(60));
    
    const events = [];
    
    // Factory events
    try {
      const factoryFilter = this.factory.filters.ShardDeployed();
      const factoryEvents = await this.factory.queryFilter(factoryFilter, fromBlock, toBlock);
      
      for (const event of factoryEvents) {
        events.push({
          type: 'ShardDeployed',
          contract: 'Factory',
          blockNumber: event.blockNumber,
          transactionHash: event.transactionHash,
          args: event.args,
          timestamp: await this.getBlockTimestamp(event.blockNumber)
        });
      }
    } catch (error) {
      console.log(`❌ Error querying Factory events: ${error.message}`);
    }
    
    // Shard events
    for (let i = 0; i < this.shardContracts.length; i++) {
      const shard = this.shardContracts[i];
      const shardIndex = i;
      
      try {
        // Message events
        const messageFilter = shard.filters.MessageSent();
        const messageEvents = await shard.queryFilter(messageFilter, fromBlock, toBlock);
        
        for (const event of messageEvents) {
          events.push({
            type: 'MessageSent',
            contract: `Shard${shardIndex}`,
            blockNumber: event.blockNumber,
            transactionHash: event.transactionHash,
            args: event.args,
            timestamp: await this.getBlockTimestamp(event.blockNumber)
          });
        }
        
        // Credit events
        const depositFilter = shard.filters.CreditDeposited();
        const depositEvents = await shard.queryFilter(depositFilter, fromBlock, toBlock);
        
        for (const event of depositEvents) {
          events.push({
            type: 'CreditDeposited',
            contract: `Shard${shardIndex}`,
            blockNumber: event.blockNumber,
            transactionHash: event.transactionHash,
            args: event.args,
            timestamp: await this.getBlockTimestamp(event.blockNumber)
          });
        }
        
      } catch (error) {
        console.log(`❌ Error querying Shard ${i} events: ${error.message}`);
      }
    }
    
    // Sort by block number
    events.sort((a, b) => a.blockNumber - b.blockNumber);
    
    console.log(`📋 Tìm thấy ${events.length} events:`);
    
    for (const event of events) {
      console.log(`${event.type} | ${event.contract} | Block ${event.blockNumber} | ${new Date(event.timestamp * 1000).toISOString()}`);
    }
    
    return events;
  }
  
  async getBlockTimestamp(blockNumber) {
    try {
      const block = await ethers.provider.getBlock(blockNumber);
      return block.timestamp;
    } catch (error) {
      return Math.floor(Date.now() / 1000);
    }
  }
  
  async exportEvents(fromBlock = 0, toBlock = 'latest') {
    const events = await this.getHistoricalEvents(fromBlock, toBlock);
    
    const filename = `events-${network.name}-${Date.now()}.json`;
    const fs = require('fs');
    const path = require('path');
    
    const exportDir = path.join(__dirname, '..', 'exports');
    if (!fs.existsSync(exportDir)) {
      fs.mkdirSync(exportDir, { recursive: true });
    }
    
    const filepath = path.join(exportDir, filename);
    fs.writeFileSync(filepath, JSON.stringify(events, null, 2));
    
    console.log(`💾 Events exported: ${filepath}`);
    return filepath;
  }
}

async function main() {
  const networkName = network.name;
  console.log(`🌐 Network: ${networkName.toUpperCase()}`);
  console.log("=".repeat(60));
  
  // Load deployment
  const deployment = loadDeploymentInfo(networkName);
  
  // Create monitor
  const monitor = new ShadowChatMonitor(
    deployment.factory.address,
    deployment.batch.address
  );
  
  await monitor.init();
  
  // Handle different modes based on command line args
  const args = process.argv.slice(2);
  
  if (args.includes('--history')) {
    // Export historical events
    const fromBlock = args.includes('--from') ? 
      parseInt(args[args.indexOf('--from') + 1]) : 0;
    const toBlock = args.includes('--to') ? 
      args[args.indexOf('--to') + 1] : 'latest';
    
    await monitor.exportEvents(fromBlock, toBlock);
    return;
  }
  
  if (args.includes('--stats')) {
    // Just show current stats
    monitor.showStats();
    return;
  }
  
  // Default: Start real-time monitoring
  await monitor.startMonitoring();
  
  // Graceful shutdown
  process.on('SIGINT', () => {
    monitor.stopMonitoring();
    process.exit(0);
  });
  
  // Keep alive
  setInterval(() => {}, 1000);
}

// Allow script to be imported as module
if (require.main === module) {
  main().catch((error) => {
    console.error("❌ Monitor Error:", error);
    process.exit(1);
  });
}

module.exports = { ShadowChatMonitor };

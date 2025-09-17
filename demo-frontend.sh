#!/bin/bash

# ShadowChat Frontend Demo Setup
# This script demonstrates how to set up and run the ShadowChat frontend

echo "🕶️  ShadowChat Frontend Demo Setup"
echo "====================================="
echo

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: Please run this script from the root project directory"
    exit 1
fi

echo "📦 Installing dependencies..."
npm install
cd frontend && npm install && cd ..

echo
echo "⚙️  Setting up environment configuration..."

# Create frontend .env if it doesn't exist
if [ ! -f "frontend/.env" ]; then
    cat > frontend/.env << EOF
# ShadowChat Frontend Configuration
VITE_FACTORY_ADDRESS=0x5FbDB2315678afecb367f032d93F642f64180aa3
VITE_BATCH_ADDRESS=0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512
VITE_NETWORK_NAME=localhost
VITE_CHAIN_ID=31337
VITE_DEBUG_MODE=true
EOF
    echo "✅ Created frontend/.env with default configuration"
else
    echo "✅ frontend/.env already exists"
fi

echo
echo "🚀 Starting demo..."
echo

echo "1️⃣  To run the complete demo with contracts:"
echo "   Terminal 1: npm run node        # Start Hardhat network"
echo "   Terminal 2: npm run frontend:demo   # Deploy contracts & configure frontend"
echo "   Terminal 3: npm run frontend:dev    # Start frontend server"
echo

echo "2️⃣  To run frontend-only (requires existing contracts):"
echo "   cd frontend && npm run dev"
echo

echo "📱 Frontend Features:"
echo "   • 🔑 Identity Generation - Create pseudonymous identities"
echo "   • 💰 Credit Management - Deposit/withdraw ETH credits"
echo "   • 💬 Message Center - Send/receive encrypted messages"
echo "   • 📊 Analytics - View usage statistics"
echo

echo "🔧 Development Tools:"
echo "   • Debug mode enabled for detailed logging"
echo "   • Environment-based configuration"
echo "   • Comprehensive error handling"
echo "   • MetaMask integration"
echo

echo "📖 Documentation:"
echo "   • FRONTEND_INTEGRATION.md - Complete integration guide"
echo "   • USER_FLOW.md - User experience documentation"
echo "   • README.md - Project overview"
echo

echo "⚠️  Requirements:"
echo "   • MetaMask browser extension"
echo "   • Node.js 16+ and npm"
echo "   • Local Hardhat network (for testing)"
echo

echo "✨ Ready to start! Follow the instructions above."
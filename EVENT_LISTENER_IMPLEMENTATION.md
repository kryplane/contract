# Contract Event Listener Implementation

## Overview

This implementation adds real-time contract event listening to the ShadowChat frontend, enabling automatic UI updates when contract events occur. The system listens for three key events:

- **MessageSent**: New messages to your receiver hash
- **CreditDeposited**: Credits added to your balance
- **CreditWithdrawn**: Credits withdrawn from your balance

## Implementation Details

### 1. Web3Service Event Listeners

#### `listenForMessages(receiverHash, callback)`
- Listens for MessageSent events filtered by receiver hash
- Automatically updates message list in real-time
- Provides immediate notification when new messages arrive

```javascript
const unsubscribe = await web3Service.listenForMessages(
  userIdentity.receiverHash,
  (message) => {
    // Handle new message
    setMessages(prev => [decryptedMessage, ...prev]);
    toast.success('New message received!');
  }
);
```

#### `listenForCreditEvents(receiverHash, callbacks)`
- Listens for both CreditDeposited and CreditWithdrawn events
- Automatically updates balance without manual refresh
- Provides real-time feedback for credit operations

```javascript
const unsubscribe = await web3Service.listenForCreditEvents(
  userIdentity.receiverHash,
  {
    onDeposit: (eventData) => {
      setBalance(eventData.totalBalance);
      toast.success(`Credits deposited! New balance: ${eventData.totalBalance} ETH`);
    },
    onWithdraw: (eventData) => {
      setBalance(eventData.remainingBalance);
      toast.success(`Credits withdrawn! Remaining balance: ${eventData.remainingBalance} ETH`);
    }
  }
);
```

### 2. UI Components with Real-Time Updates

#### CreditManager Component
- **Real-Time Balance Updates**: Automatically updates when credits are deposited or withdrawn
- **Live Status Indicator**: Shows when event listeners are active with visual indicators
- **Automatic Refresh**: No need to manually refresh balance after transactions
- **Toast Notifications**: Immediate feedback for all credit operations

Key Features:
- Green "Live Updates" indicator when event listeners are active
- Automatic balance updates from contract events
- Improved user experience with immediate feedback

#### MessageCenter Component  
- **Real-Time Message Reception**: New messages appear immediately
- **Live Status Display**: Shows listening status with visual indicators
- **Automatic Updates**: Message list updates without page refresh
- **New Message Indicators**: Visual highlighting for newly received messages

### 3. Event Data Structure

#### MessageSent Event
```javascript
{
  messageId: string,        // Unique message identifier
  sender: string,          // Sender's wallet address
  receiverHash: string,    // Target receiver hash
  encryptedContent: string,// Encrypted message content
  timestamp: string,       // Block timestamp
  blockNumber: number,     // Block number
  transactionHash: string  // Transaction hash
}
```

#### CreditDeposited Event
```javascript
{
  receiverHash: string,    // Target receiver hash
  amount: string,          // Amount deposited (in wei)
  totalBalance: string,    // New total balance (in wei)
  blockNumber: number,     // Block number
  transactionHash: string, // Transaction hash
  timestamp: number        // Event timestamp
}
```

#### CreditWithdrawn Event
```javascript
{
  receiverHash: string,     // Target receiver hash
  withdrawer: string,       // Withdrawer's wallet address
  amount: string,           // Amount withdrawn (in wei)
  remainingBalance: string, // Remaining balance (in wei)
  blockNumber: number,      // Block number
  transactionHash: string,  // Transaction hash
  timestamp: number         // Event timestamp
}
```

## Benefits

### 1. Enhanced User Experience
- **Immediate Feedback**: Users see updates instantly without refreshing
- **Real-Time Activity**: Live updates show contract activity as it happens
- **Reduced Manual Actions**: No need to manually refresh balances or message lists

### 2. Technical Improvements
- **Efficient Updates**: Only update UI when actual changes occur
- **Memory Management**: Proper cleanup prevents memory leaks
- **Error Handling**: Comprehensive error handling with user-friendly messages

### 3. Privacy & Security
- **No Additional Exposure**: Event listening doesn't expose any additional private information
- **Client-Side Processing**: All event processing happens client-side
- **Secure Cleanup**: Proper listener cleanup on component unmount

## Usage Examples

### Setting Up Credit Event Listeners
```javascript
useEffect(() => {
  if (!userIdentity || !web3Service) return;

  const startListening = async () => {
    const unsubscribe = await web3Service.listenForCreditEvents(
      userIdentity.receiverHash,
      {
        onDeposit: (eventData) => {
          setBalance(eventData.totalBalance);
          toast.success(`Credits deposited! New balance: ${eventData.totalBalance} ETH`);
        },
        onWithdraw: (eventData) => {
          setBalance(eventData.remainingBalance);
          toast.success(`Credits withdrawn! Remaining balance: ${eventData.remainingBalance} ETH`);
        }
      }
    );
    setIsListening(true);
    return unsubscribe;
  };

  const unsubscribePromise = startListening();

  return () => {
    unsubscribePromise.then(unsubscribe => {
      if (unsubscribe) unsubscribe();
      setIsListening(false);
    });
  };
}, [userIdentity, web3Service]);
```

### Setting Up Message Event Listeners
```javascript
useEffect(() => {
  if (!userIdentity || !web3Service) return;

  const startListening = async () => {
    const unsubscribe = await web3Service.listenForMessages(
      userIdentity.receiverHash,
      (newMessage) => {
        const decryptedMessage = {
          ...newMessage,
          decryptedContent: MessageCrypto.decrypt(newMessage.encryptedContent, userIdentity.secretCode),
          timestamp: new Date(parseInt(newMessage.timestamp) * 1000),
          isDecrypted: true,
          isNew: true
        };
        
        setMessages(prev => [decryptedMessage, ...prev]);
        toast.success('New message received!');
      }
    );
    
    setIsListening(true);
    return unsubscribe;
  };

  const unsubscribePromise = startListening();

  return () => {
    unsubscribePromise.then(unsubscribe => {
      if (unsubscribe) unsubscribe();
      setIsListening(false);
    });
  };
}, [userIdentity, web3Service]);
```

## Testing

The implementation includes comprehensive test coverage for:
- Event listener setup and teardown
- Event data structure validation
- Error handling scenarios
- Memory leak prevention

Test files are located in `frontend/src/tests/eventListeners.test.js`.

## Performance Considerations

1. **Event Filtering**: Events are filtered by receiver hash to only process relevant events
2. **Efficient Updates**: Only update UI state when events actually occur
3. **Memory Management**: Proper cleanup prevents memory leaks
4. **Debouncing**: Toast notifications prevent spam from rapid successive events

## Browser Compatibility

Event listeners work with all modern browsers that support:
- WebSocket connections (for Web3 provider)
- JavaScript ES6+ features
- Local Storage (for identity management)

## Troubleshooting

### Common Issues
1. **Event Listeners Not Working**: Ensure wallet is connected and contracts are deployed
2. **Memory Leaks**: Check that cleanup functions are properly called on component unmount
3. **Missing Events**: Verify contract addresses and network configuration

### Debug Information
Enable debug mode in Web3Service to see detailed event logging:
```javascript
// Set VITE_DEBUG_MODE=true in environment variables
console.log('🔧 Web3Service initialized with config:', this.config);
```
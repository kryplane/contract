# ShadowChatRegistry Contract

## Overview

The `ShadowChatRegistry` contract is a privacy-preserving receiverHash registration and lookup system designed to work with the ShadowChat protocol. It allows users to register receiverHash identities in two modes:

1. **Public Registration** - The receiverHash can be looked up by wallet address
2. **Private Registration** - The receiverHash can only be accessed via an alias, and only by the owner

## Features

- **Dual Registration Modes**: Public and private receiverHash registration
- **Alias System**: Secure lookup via aliases for private registrations
- **Access Control**: Private aliases can only be accessed by their owners
- **Visibility Management**: Users can change between public and private modes
- **Registration Limits**: Maximum 10 registrations per user
- **Fee Management**: Configurable registration fees
- **Pausable**: Contract can be paused for maintenance
- **Comprehensive Statistics**: Track registrations and usage

## Key Functions

### Registration Functions

#### `registerReceiverHash(string secretCode, bool isPublic, string aliasName)`
Register a new receiverHash with the given parameters:
- `secretCode`: The secret code that generates the receiverHash (min 8 chars)
- `isPublic`: Whether the receiverHash should be publicly accessible
- `aliasName`: Alias for the receiverHash (required for private, optional for public)

**Requirements:**
- Must pay registration fee
- Secret code must be valid (8-64 characters)
- Alias must be valid (3-32 alphanumeric characters + underscore)
- Users can only have one public registration
- Users can have up to 10 total registrations

### Lookup Functions

#### `getReceiverHashByAddress(address walletAddress) → bytes32`
Retrieve the receiverHash associated with a wallet address. Only works for public registrations.

#### `getReceiverHashByAlias(string aliasName) → bytes32`
Retrieve the receiverHash by alias. For private registrations, only the owner can call this function.

#### `getReceiverHashInfo(bytes32 receiverHash) → ReceiverHashInfo`
Get detailed information about a receiverHash including owner, visibility, alias, and registration time.

### Management Functions

#### `updateVisibility(bytes32 receiverHash, bool newVisibility, string aliasName)`
Change a receiverHash from public to private or vice versa. Only the owner can call this.

#### `updateReceiverHash(bytes32 oldReceiverHash, string newSecretCode)`
Generate a new receiverHash from a new secret code while maintaining the same alias/visibility settings.

#### `isAliasAvailable(string aliasName) → bool`
Check if an alias is available for registration.

## Contract Architecture

```
ShadowChatRegistry
├── IShadowChatRegistry (Interface)
├── Ownable (Admin functions)
├── ReentrancyGuard (Security)
├── Pausable (Emergency controls)
└── ShadowChatUtils (Utility functions)
```

## State Variables

- `receiverHashInfo`: Mapping of receiverHash to registration details
- `publicReceiverHashes`: Mapping of wallet addresses to public receiverHashes
- `aliasToReceiverHash`: Private mapping of aliases to receiverHashes
- `aliasOwners`: Mapping of aliases to owner addresses for access control
- `userRegistrationCount`: Track registrations per user

## Events

- `ReceiverHashRegistered`: Emitted when a new receiverHash is registered
- `ReceiverHashUpdated`: Emitted when a receiverHash is updated
- `VisibilityChanged`: Emitted when visibility is changed

## Security Features

1. **Access Control**: Private aliases can only be accessed by their owners
2. **Reentrancy Protection**: All state-changing functions are protected
3. **Input Validation**: Comprehensive validation of secret codes and aliases
4. **Registration Limits**: Prevents spam with per-user limits
5. **Fee Requirements**: Registration requires payment to prevent abuse
6. **Pausable**: Contract can be paused in emergencies

## Usage Examples

### Registering a Public ReceiverHash

```javascript
await registry.registerReceiverHash(
    "my-secret-code-123",
    true, // isPublic
    "my_public_alias",
    { value: ethers.parseEther("0.001") }
);
```

### Registering a Private ReceiverHash

```javascript
await registry.registerReceiverHash(
    "private-secret-456", 
    false, // isPublic = false
    "my_private_alias",
    { value: ethers.parseEther("0.001") }
);
```

### Looking up Public ReceiverHash

```javascript
const receiverHash = await registry.getReceiverHashByAddress(walletAddress);
```

### Looking up Private ReceiverHash (by owner only)

```javascript
const receiverHash = await registry.getReceiverHashByAlias("my_private_alias");
```

## Constants

- `MAX_REGISTRATIONS_PER_USER`: 10
- `MIN_ALIAS_LENGTH`: 3 characters
- `MAX_ALIAS_LENGTH`: 32 characters

## Deployment

1. Deploy with initial registration fee:
   ```bash
   npx hardhat run scripts/deploy-registry.js
   ```

2. Run tests:
   ```bash
   npx hardhat test test/ShadowChatRegistry.test.js
   ```

3. Run demo:
   ```bash
   npx hardhat run scripts/registry-demo.js
   ```

## Integration with ShadowChat

The ShadowChatRegistry is designed to work alongside the ShadowChat messaging system:

1. Users register receiverHashes in the registry
2. Others can look up receiverHashes to send messages
3. The same receiverHash is used in ShadowChat for credit deposits and messaging
4. Privacy is maintained through the alias system

## Admin Functions

Contract owners can:
- Update registration fees
- Pause/unpause the contract
- Withdraw collected fees
- Emergency functions for maintenance

## Error Handling

The contract includes comprehensive error messages for various failure conditions:
- Insufficient registration fee
- Invalid secret code format
- Invalid alias format
- Alias already taken
- Maximum registrations exceeded
- Unauthorized access to private aliases
- And more...

## License

MIT License - see LICENSE file for details.

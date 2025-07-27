        ┌────────────┐              ┌────────────────────────┐
        │  User A    │              │      User B            │
        │ (Sender)   │              │ (Receiver)             │
        └────┬───────┘              └─────────┬──────────────┘
             │                                    │
             │                                    │
             │ Generate `receiverHash = keccak(secret)` ◄────┐
             │                                                │
             │ (offline, never published)                    │
             ▼                                                │
      ┌─────────────────┐                                     │
      │ Frontend Client │                                     │
      └─────────────────┘                                     │
             │                                                │
             │ Check shard index: `receiverHash % N`          │
             ▼                                                │
 ┌─────────────────────────────┐         ┌─────────────────────────────┐
 │  ShadowChatShard[i] Contract│         │  ShadowChatShard[i] Contract│
 └─────────────────────────────┘         └─────────────────────────────┘
             ▲                                                ▲
             │                                                │
             │ 1. Deposit credit to `receiverHash`            │
             │    (by User B or third party)                  │
             └──────────────────────────────┐                 │
                                            │                 │
       2. sendMessage(receiverHash, cid) ───┘                 │
             (burns credit, emits event)                      │
                                            ┌────────────────┘
                                            ▼
                             ┌────────────────────────────────────┐
                             │   Event: MessageSent(receiverHash, │
                             │           cid, timestamp)         │
                             └────────────────────────────────────┘
                                            │
                                            ▼
                             ┌──────────────────────────┐
                             │  User B Frontend Client  │
                             └──────────────────────────┘
                                            │
                         3. Listen for event where
                            receiverHash == keccak(secret)
                                            │
                                            ▼
                        4. Fetch IPFS[cid] → decrypt with secret
                                            │
                                            ▼
                          Optional: withdrawCredit(secret)

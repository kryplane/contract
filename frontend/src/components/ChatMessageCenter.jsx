import React, { useState, useEffect, useRef } from 'react';
import { Send, RefreshCw, MessageSquare, Lock, Unlock, AlertCircle, Clock, User, Smile, Paperclip, MoreVertical, Search, Phone, Video, Menu, Share2, Copy } from 'lucide-react';
import { MessageCrypto } from '../utils/crypto.js';
import PrivacyTooltip from './PrivacyTooltip.jsx';
import toast from 'react-hot-toast';

const ChatMessageCenter = ({ web3Service, userIdentity }) => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [recipientHash, setRecipientHash] = useState('');
  const [recipientSecret, setRecipientSecret] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showInviteLink, setShowInviteLink] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Load historical messages
  const loadMessages = async () => {
    if (!userIdentity || !web3Service) return;

    setIsLoading(true);
    try {
      const historicalMessages = await web3Service.getHistoricalMessages(
        userIdentity.receiverHash
      );
      
      // Decrypt messages
      const decryptedMessages = historicalMessages.map(msg => ({
        ...msg,
        decryptedContent: MessageCrypto.decrypt(msg.encryptedContent, userIdentity.secretCode),
        timestamp: new Date(parseInt(msg.timestamp) * 1000),
        isDecrypted: true
      }));

      setMessages(decryptedMessages);
      toast.success(`Loaded ${decryptedMessages.length} messages`);
    } catch (error) {
      console.error('Failed to load messages:', error);
      toast.error('Failed to load messages');
    } finally {
      setIsLoading(false);
    }
  };

  // Start listening for new messages
  const startListening = async () => {
    if (!userIdentity || !web3Service || isListening) return;

    try {
      const unsubscribe = await web3Service.listenForMessages(
        userIdentity.receiverHash,
        (newMessage) => {
          console.log('New message received:', newMessage);
          
          // Try to decrypt the message
          let decryptedContent = null;
          let isDecrypted = false;
          
          try {
            decryptedContent = MessageCrypto.decrypt(newMessage.encryptedContent, userIdentity.secretCode);
            isDecrypted = true;
          } catch (error) {
            console.error('Failed to decrypt message:', error);
            decryptedContent = null;
            isDecrypted = false;
          }

          const messageWithDecryption = {
            ...newMessage,
            decryptedContent,
            isDecrypted,
            timestamp: new Date(parseInt(newMessage.timestamp) * 1000),
            isNew: true
          };

          setMessages(prev => [...prev, messageWithDecryption]);
          
          if (isDecrypted) {
            toast.success('New encrypted message received!');
          } else {
            toast.error('Received message but failed to decrypt');
          }
        }
      );

      setIsListening(true);
      toast.success('Started listening for messages');
      
      return unsubscribe;
    } catch (error) {
      console.error('Failed to start listening:', error);
      toast.error('Failed to start listening for messages');
    }
  };

  // Send a message
  const sendMessage = async () => {
    if (!newMessage || !recipientHash || !userIdentity || !web3Service) return;

    setIsSending(true);
    try {
      // Encrypt the message
      const encryptedContent = MessageCrypto.encrypt(newMessage, recipientSecret);
      
      // Send the message
      const result = await web3Service.sendMessage(recipientHash, encryptedContent);
      
      // Add to local messages with sent flag
      const sentMessage = {
        messageId: Date.now().toString(),
        sender: userIdentity.receiverHash,
        encryptedContent: encryptedContent,
        decryptedContent: newMessage,
        timestamp: new Date(),
        isDecrypted: true,
        isSent: true,
        transactionHash: result.transactionHash
      };

      setMessages(prev => [...prev, sentMessage]);
      setNewMessage('');
      
      toast.success('Message sent successfully!');
    } catch (error) {
      console.error('Failed to send message:', error);
      toast.error(error.message || 'Failed to send message');
    } finally {
      setIsSending(false);
    }
  };

  // Load messages when component mounts
  useEffect(() => {
    loadMessages();
    const unsubscribe = startListening();
    
    // Cleanup listener on unmount
    return () => {
      if (unsubscribe && typeof unsubscribe === 'function') {
        unsubscribe();
      }
    };
  }, [userIdentity, web3Service]);

  const formatAddress = (address) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const formatTime = (date) => {
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: false 
    });
  };

  // Generate invite link for current user's identity
  const generateInviteLink = () => {
    if (!userIdentity?.receiverHash) return '';
    
    try {
      // Create invite data with user's receiver hash
      const inviteData = {
        receiverHash: userIdentity.receiverHash,
        timestamp: Date.now()
      };
      
      // Encode to base64 for URL safety
      const encodedData = btoa(JSON.stringify(inviteData));
      const baseUrl = window.location.origin + window.location.pathname;
      return `${baseUrl}?invite=${encodedData}`;
    } catch (error) {
      console.error('Failed to generate invite link:', error);
      return '';
    }
  };

  // Parse invite from URL parameters
  const parseInviteFromUrl = () => {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const inviteParam = urlParams.get('invite');
      
      if (!inviteParam) return null;
      
      const inviteData = JSON.parse(atob(inviteParam));
      
      // Validate the invite data structure
      if (inviteData.receiverHash && typeof inviteData.receiverHash === 'string') {
        return inviteData;
      }
      
      return null;
    } catch (error) {
      console.error('Failed to parse invite from URL:', error);
      return null;
    }
  };

  // Copy invite link to clipboard
  const copyInviteLink = async () => {
    const inviteLink = generateInviteLink();
    if (!inviteLink) {
      toast.error('Failed to generate invite link');
      return;
    }

    try {
      await navigator.clipboard.writeText(inviteLink);
      toast.success('Invite link copied to clipboard!');
    } catch (error) {
      console.error('Failed to copy invite link:', error);
      toast.error('Failed to copy invite link');
    }
  };

  // Handle invite link from URL on component mount
  useEffect(() => {
    const inviteData = parseInviteFromUrl();
    if (inviteData && inviteData.receiverHash) {
      // Auto-populate the recipient hash to start chat from invite
      setRecipientHash(inviteData.receiverHash);
      
      // Clear URL parameters to clean up address bar
      const url = new URL(window.location);
      url.searchParams.delete('invite');
      window.history.replaceState({}, document.title, url.toString());
      
      toast.success('Started chat from invite link!');
    }
  }, []);

  if (!userIdentity) {
    return (
      <div className="h-full flex items-center justify-center bg-shadow-900">
        <div className="shadow-card text-center max-w-md">
          <AlertCircle className="mx-auto text-yellow-400 mb-4" size={48} />
          <h3 className="text-xl font-semibold mb-2">No Identity Found</h3>
          <p className="text-shadow-300">
            Please create or import an identity first to start chatting.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex bg-shadow-900 relative">
      {/* Mobile Backdrop */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-10 lg:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar - Chat List */}
      <div className={`
        w-80 bg-shadow-800 border-r border-shadow-700 flex flex-col
        lg:relative lg:translate-x-0
        ${isMobileMenuOpen ? 'fixed inset-y-0 left-0 z-20 translate-x-0' : 'hidden lg:flex'}
      `}>
        {/* Sidebar Header */}
        <div className="p-4 border-b border-shadow-700">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-shadow-50">💬 ShadowChat</h2>
            <div className="flex items-center space-x-2">
              <PrivacyTooltip
                type="encryption"
                title="End-to-End Encryption"
                persistKey="message-encryption"
              >
                <div className="space-y-2">
                  <p>Your messages are protected by military-grade encryption:</p>
                  <ul className="space-y-1 text-sm">
                    <li>• AES-256 encryption happens in your browser</li>
                    <li>• Only encrypted data touches the blockchain</li>
                    <li>• Messages can only be read by intended recipients</li>
                  </ul>
                </div>
              </PrivacyTooltip>
              <button className="p-2 hover:bg-shadow-700 rounded-lg transition-colors lg:hidden">
                <MoreVertical size={20} className="text-shadow-400" />
              </button>
            </div>
          </div>
          
          {/* Search Bar */}
          <div className="mt-3 relative">
            <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-shadow-400" />
            <input
              type="text"
              placeholder="Search conversations..."
              className="w-full pl-10 pr-4 py-2 bg-shadow-700 border border-shadow-600 rounded-lg text-shadow-50 placeholder-shadow-400 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            />
          </div>
        </div>

        {/* Chat List */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-2">
            {/* Active Chat Item */}
            {recipientHash && (
              <div className="p-3 bg-blue-600/20 border border-blue-600/50 rounded-lg mb-2 cursor-pointer">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                    <User size={20} className="text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h3 className="font-medium text-shadow-50 truncate">Anonymous User</h3>
                      <span className="text-xs text-shadow-400">
                        {messages.length > 0 ? formatTime(messages[messages.length - 1].timestamp) : 'Now'}
                      </span>
                    </div>
                    <p className="text-sm text-shadow-300 truncate">
                      {messages.length > 0 ? 
                        (messages[messages.length - 1].isDecrypted ? 
                          messages[messages.length - 1].decryptedContent.substring(0, 30) + '...' : 
                          'Encrypted message') 
                        : 'No messages yet'}
                    </p>
                  </div>
                  {messages.some(m => m.isNew) && (
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  )}
                </div>
              </div>
            )}

            {/* New Chat Button */}
            <button 
              className="w-full p-3 border-2 border-dashed border-shadow-600 rounded-lg text-shadow-400 hover:border-blue-500 hover:text-blue-400 transition-colors flex items-center justify-center space-x-2"
              onClick={() => {
                setRecipientHash('');
                setRecipientSecret('');
                setMessages([]);
              }}
            >
              <MessageSquare size={16} />
              <span>Start New Chat</span>
            </button>
          </div>
        </div>

        {/* Sidebar Footer */}
        <div className="p-4 border-t border-shadow-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className={`w-2 h-2 rounded-full ${isListening ? 'bg-green-400' : 'bg-gray-400'}`}></div>
              <span className="text-xs text-shadow-400">
                {isListening ? 'Online' : 'Offline'}
              </span>
            </div>
            <span className="text-xs text-shadow-400 font-mono">
              {userIdentity.receiverHash.substring(0, 8)}...
            </span>
          </div>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Chat Header */}
        <div className="p-4 bg-shadow-800 border-b border-shadow-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              {/* Mobile Menu Button */}
              <button
                onClick={() => setIsMobileMenuOpen(true)}
                className="p-2 hover:bg-shadow-700 rounded-lg transition-colors lg:hidden"
              >
                <Menu size={20} className="text-shadow-400" />
              </button>
              
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                <User size={16} className="text-white" />
              </div>
              <div>
                <h3 className="font-medium text-shadow-50">
                  {recipientHash ? 'Anonymous Chat' : 'ShadowChat'}
                </h3>
                <p className="text-sm text-shadow-400">
                  {recipientHash ? 'End-to-end encrypted' : 'Select a conversation or start a new chat'}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={loadMessages}
                disabled={isLoading}
                className="p-2 hover:bg-shadow-700 rounded-lg transition-colors"
                title="Refresh messages"
              >
                <RefreshCw size={16} className={`text-shadow-400 ${isLoading ? 'animate-spin' : ''}`} />
              </button>
              <button 
                onClick={() => setShowInviteLink(!showInviteLink)}
                className="p-2 hover:bg-shadow-700 rounded-lg transition-colors"
                title="Share invite link"
              >
                <Share2 size={16} className="text-shadow-400" />
              </button>
              <button className="p-2 hover:bg-shadow-700 rounded-lg transition-colors">
                <Phone size={16} className="text-shadow-400" />
              </button>
              <button className="p-2 hover:bg-shadow-700 rounded-lg transition-colors">
                <Video size={16} className="text-shadow-400" />
              </button>
              <button className="p-2 hover:bg-shadow-700 rounded-lg transition-colors">
                <MoreVertical size={16} className="text-shadow-400" />
              </button>
            </div>
          </div>
        </div>

        {/* Invite Link Display */}
        {showInviteLink && (
          <div className="p-4 bg-blue-900/20 border-b border-blue-600/50">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center space-x-2 mb-2">
                  <Share2 size={16} className="text-blue-400" />
                  <h4 className="text-sm font-medium text-blue-300">Share Invite Link</h4>
                </div>
                <p className="text-xs text-blue-200 mb-3">
                  Anyone with this link can send you messages directly. Your identity remains anonymous.
                </p>
                <div className="flex items-center space-x-2">
                  <input
                    type="text"
                    value={generateInviteLink()}
                    readOnly
                    className="flex-1 px-3 py-2 bg-shadow-700 border border-shadow-600 rounded-lg text-shadow-50 text-xs font-mono"
                  />
                  <button
                    onClick={copyInviteLink}
                    className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-medium flex items-center space-x-1 transition-colors"
                  >
                    <Copy size={14} />
                    <span>Copy</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {!recipientHash ? (
            <div className="flex flex-col items-center justify-center h-full text-shadow-400">
              <div className="w-16 h-16 bg-shadow-700 rounded-full flex items-center justify-center mb-4">
                <MessageSquare size={24} className="opacity-50" />
              </div>
              <h3 className="text-lg font-medium mb-2">Welcome to ShadowChat</h3>
              <p className="text-sm text-center max-w-md">
                Your privacy-first messaging platform on Ethereum. Enter a recipient's secret code below to start a secure conversation.
              </p>
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-shadow-400">
              <div className="w-16 h-16 bg-shadow-700 rounded-full flex items-center justify-center mb-4">
                <MessageSquare size={24} className="opacity-50" />
              </div>
              <h3 className="text-lg font-medium mb-2">No messages yet</h3>
              <p className="text-sm text-center">Start a conversation by sending your first encrypted message</p>
            </div>
          ) : (
            <>
              {messages.map((message, index) => (
                <div
                  key={`${message.messageId}-${index}`}
                  className={`flex ${message.isSent ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`max-w-xs lg:max-w-md ${message.isSent ? 'order-2' : 'order-1'}`}>
                    {!message.isSent && (
                      <div className="flex items-center space-x-2 mb-1">
                        <div className="w-6 h-6 bg-gradient-to-br from-green-500 to-blue-600 rounded-full flex items-center justify-center">
                          <User size={12} className="text-white" />
                        </div>
                        <span className="text-xs text-shadow-400 font-mono">
                          {formatAddress(message.sender)}
                        </span>
                      </div>
                    )}
                    
                    <div className={`p-3 rounded-2xl ${
                      message.isSent 
                        ? 'bg-blue-600 text-white ml-4' 
                        : 'bg-shadow-700 text-shadow-50 mr-4'
                    }`}>
                      {message.isDecrypted ? (
                        <p className="break-words">{message.decryptedContent}</p>
                      ) : (
                        <div className="space-y-1">
                          <div className="flex items-center space-x-1">
                            <Lock size={12} className="text-red-400" />
                            <span className="text-xs text-red-300">Failed to decrypt</span>
                          </div>
                          <p className="text-xs font-mono opacity-60">
                            {message.encryptedContent.substring(0, 30)}...
                          </p>
                        </div>
                      )}
                      
                      <div className={`flex items-center justify-between mt-2 text-xs ${
                        message.isSent ? 'text-blue-100' : 'text-shadow-400'
                      }`}>
                        <span>{formatTime(message.timestamp)}</span>
                        <div className="flex items-center space-x-1">
                          {message.isSent && (
                            <div className="flex space-x-1">
                              <div className="w-1 h-1 bg-current rounded-full"></div>
                              <div className="w-1 h-1 bg-current rounded-full"></div>
                            </div>
                          )}
                          {message.isNew && (
                            <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </>
          )}
        </div>

        {/* Message Input Area */}
        <div className="p-4 bg-shadow-800 border-t border-shadow-700">
          {/* Recipient Setup */}
          {!recipientHash && (
            <div className="mb-4 p-3 bg-yellow-900/20 border border-yellow-600/50 rounded-lg">
              <div className="flex items-center space-x-2 mb-2">
                <AlertCircle size={16} className="text-yellow-400" />
                <span className="text-sm font-medium text-yellow-200">Setup Required</span>
              </div>
              <div className="space-y-2">
                <input
                  type="text"
                  value={recipientSecret}
                  onChange={(e) => {
                    setRecipientSecret(e.target.value);
                    if (e.target.value) {
                      try {
                        const hash = MessageCrypto.generateReceiverHash(e.target.value);
                        setRecipientHash(hash);
                      } catch (error) {
                        console.error('Failed to generate hash:', error);
                      }
                    } else {
                      setRecipientHash('');
                    }
                  }}
                  placeholder="Enter recipient's secret code to start chatting..."
                  className="w-full px-3 py-2 bg-shadow-700 border border-shadow-600 rounded-lg text-shadow-50 placeholder-shadow-400 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                />
                <div className="text-xs text-yellow-200">
                  Or share your invite link above for others to message you directly
                </div>
              </div>
            </div>
          )}

          {/* Chat Started Info */}
          {recipientHash && (
            <div className="mb-4 p-3 bg-green-900/20 border border-green-600/50 rounded-lg">
              <div className="flex items-center space-x-2">
                <Lock size={16} className="text-green-400" />
                <span className="text-sm font-medium text-green-200">
                  Secure chat active with {formatAddress(recipientHash)}
                </span>
              </div>
            </div>
          )}

          {/* Message Input */}
          <div className="flex items-end space-x-3">
            <button className="p-2 text-shadow-400 hover:text-shadow-300 transition-colors">
              <Paperclip size={20} />
            </button>
            
            <div className="flex-1 relative">
              <textarea
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    if (newMessage.trim() && recipientHash && !isSending) {
                      sendMessage();
                    }
                  }
                }}
                placeholder="Type a message..."
                rows={1}
                className="w-full px-4 py-3 bg-shadow-700 border border-shadow-600 rounded-2xl text-shadow-50 placeholder-shadow-400 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                style={{
                  minHeight: '48px',
                  maxHeight: '120px'
                }}
              />
              <button className="absolute right-3 top-1/2 transform -translate-y-1/2 p-1 text-shadow-400 hover:text-shadow-300 transition-colors">
                <Smile size={16} />
              </button>
            </div>
            
            <button
              onClick={sendMessage}
              disabled={isSending || !newMessage.trim() || !recipientHash}
              className={`p-3 rounded-full transition-colors ${
                newMessage.trim() && recipientHash && !isSending
                  ? 'bg-blue-600 hover:bg-blue-700 text-white' 
                  : 'bg-shadow-700 text-shadow-400 cursor-not-allowed'
              }`}
            >
              <Send size={16} />
            </button>
          </div>
          
          {/* Status Info */}
          {recipientHash && (
            <div className="mt-2 flex items-center justify-between text-xs text-shadow-400">
              <div className="flex items-center space-x-1">
                <Lock size={12} className="text-green-400" />
                <span>End-to-end encrypted</span>
              </div>
              <span>Press Enter to send, Shift+Enter for new line</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChatMessageCenter;
const axios = require('axios');
const FormData = require('form-data');

/**
 * IPFS Integration Utilities for ShadowChat Protocol
 * Provides seamless integration with IPFS for off-chain message storage
 * Supports both Pinata cloud service and local IPFS nodes
 */
class IPFSClient {
  constructor(config = {}) {
    this.config = {
      // Pinata configuration for reliable IPFS hosting
      pinataApiKey: config.pinataApiKey || process.env.PINATA_API_KEY,
      pinataSecretKey: config.pinataSecretKey || process.env.PINATA_SECRET_KEY,
      pinataBaseUrl: 'https://api.pinata.cloud',
      pinataGatewayUrl: 'https://gateway.pinata.cloud/ipfs/',
      
      // Local IPFS node configuration (fallback)
      localNodeUrl: config.localNodeUrl || 'http://localhost:5001',
      localGatewayUrl: config.localGatewayUrl || 'http://localhost:8080/ipfs/',
      
      // General settings
      timeout: config.timeout || 30000,
      retries: config.retries || 3,
      
      ...config
    };
    
    this.usePinata = !!(this.config.pinataApiKey && this.config.pinataSecretKey);
    console.log(`📡 IPFS Client initialized with ${this.usePinata ? 'Pinata' : 'local node'} backend`);
  }

  /**
   * Store encrypted message content on IPFS
   * @param {string} encryptedContent - The encrypted message content
   * @param {Object} metadata - Optional metadata for the content
   * @returns {Promise<string>} - Returns the IPFS CID of stored content
   */
  async storeMessage(encryptedContent, metadata = {}) {
    if (!encryptedContent || typeof encryptedContent !== 'string') {
      throw new Error('Invalid encrypted content provided');
    }

    console.log(`📤 Storing message on IPFS (${encryptedContent.length} characters)...`);
    
    try {
      const messageData = {
        content: encryptedContent,
        timestamp: Date.now(),
        version: '1.0',
        ...metadata
      };
      
      let cid;
      if (this.usePinata) {
        cid = await this._storeToPinata(messageData);
      } else {
        cid = await this._storeToLocalNode(messageData);
      }
      
      console.log(`✅ Message stored successfully with CID: ${cid}`);
      return cid;
      
    } catch (error) {
      console.error('❌ Failed to store message on IPFS:', error.message);
      throw new Error(`IPFS storage failed: ${error.message}`);
    }
  }

  /**
   * Retrieve encrypted message content from IPFS
   * @param {string} cid - The IPFS CID to retrieve
   * @returns {Promise<Object>} - Returns the message data object
   */
  async retrieveMessage(cid) {
    if (!cid || typeof cid !== 'string') {
      throw new Error('Invalid CID provided');
    }

    console.log(`📥 Retrieving message from IPFS: ${cid}...`);
    
    try {
      let messageData;
      if (this.usePinata) {
        messageData = await this._retrieveFromPinata(cid);
      } else {
        messageData = await this._retrieveFromLocalNode(cid);
      }
      
      // Validate retrieved data structure
      if (!messageData.content) {
        throw new Error('Invalid message data structure retrieved');
      }
      
      console.log(`✅ Message retrieved successfully (${messageData.content.length} characters)`);
      return messageData;
      
    } catch (error) {
      console.error('❌ Failed to retrieve message from IPFS:', error.message);
      throw new Error(`IPFS retrieval failed: ${error.message}`);
    }
  }

  /**
   * Store data to Pinata IPFS service
   * @private
   */
  async _storeToPinata(data) {
    const formData = new FormData();
    const jsonData = JSON.stringify(data);
    formData.append('file', Buffer.from(jsonData), {
      filename: 'message.json',
      contentType: 'application/json'
    });

    const metadata = JSON.stringify({
      name: `ShadowChat Message ${Date.now()}`,
      keyvalues: {
        service: 'shadowchat',
        type: 'message',
        timestamp: data.timestamp.toString()
      }
    });
    formData.append('pinataMetadata', metadata);

    const response = await axios.post(
      `${this.config.pinataBaseUrl}/pinning/pinFileToIPFS`,
      formData,
      {
        headers: {
          ...formData.getHeaders(),
          'pinata_api_key': this.config.pinataApiKey,
          'pinata_secret_api_key': this.config.pinataSecretKey
        },
        timeout: this.config.timeout
      }
    );

    if (!response.data.IpfsHash) {
      throw new Error('No IPFS hash returned from Pinata');
    }

    return response.data.IpfsHash;
  }

  /**
   * Retrieve data from Pinata IPFS service
   * @private
   */
  async _retrieveFromPinata(cid) {
    const response = await axios.get(
      `${this.config.pinataGatewayUrl}${cid}`,
      {
        timeout: this.config.timeout
      }
    );

    return response.data;
  }

  /**
   * Store data to local IPFS node
   * @private
   */
  async _storeToLocalNode(data) {
    const formData = new FormData();
    const jsonData = JSON.stringify(data);
    formData.append('file', Buffer.from(jsonData), {
      filename: 'message.json'
    });

    const response = await axios.post(
      `${this.config.localNodeUrl}/api/v0/add`,
      formData,
      {
        headers: formData.getHeaders(),
        timeout: this.config.timeout
      }
    );

    if (!response.data.Hash) {
      throw new Error('No IPFS hash returned from local node');
    }

    return response.data.Hash;
  }

  /**
   * Retrieve data from local IPFS node
   * @private
   */
  async _retrieveFromLocalNode(cid) {
    const response = await axios.get(
      `${this.config.localGatewayUrl}${cid}`,
      {
        timeout: this.config.timeout
      }
    );

    return response.data;
  }

  /**
   * Validate if a string is a valid IPFS CID
   * @param {string} cid - The CID to validate
   * @returns {boolean} - True if valid CID format
   */
  static isValidCID(cid) {
    if (!cid || typeof cid !== 'string') return false;
    
    // Basic CID validation - starts with Qm (CIDv0) or b (CIDv1)
    return /^(Qm[1-9A-HJ-NP-Za-km-z]{44}|b[a-z2-7]{58})$/.test(cid);
  }

  /**
   * Get connection status and configuration info
   * @returns {Object} - Status information
   */
  getStatus() {
    return {
      backend: this.usePinata ? 'Pinata' : 'Local Node',
      configured: this.usePinata ? !!(this.config.pinataApiKey && this.config.pinataSecretKey) : true,
      baseUrl: this.usePinata ? this.config.pinataBaseUrl : this.config.localNodeUrl,
      gatewayUrl: this.usePinata ? this.config.pinataGatewayUrl : this.config.localGatewayUrl
    };
  }
}

module.exports = { IPFSClient };
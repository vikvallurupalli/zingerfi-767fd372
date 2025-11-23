// ECC-256 Encryption utilities using Web Crypto API (P-256 curve)

export interface KeyPair {
  publicKey: CryptoKey;
  privateKey: CryptoKey;
}

/**
 * Generate a new ECC-256 key pair
 */
export async function generateKeyPair(): Promise<KeyPair> {
  const keyPair = await window.crypto.subtle.generateKey(
    {
      name: "ECDH",
      namedCurve: "P-256",
    },
    true,
    ["deriveKey"]
  );

  return {
    publicKey: keyPair.publicKey,
    privateKey: keyPair.privateKey,
  };
}

/**
 * Export public key to base64 string for storage
 */
export async function exportPublicKey(key: CryptoKey): Promise<string> {
  const exported = await window.crypto.subtle.exportKey("spki", key);
  return arrayBufferToBase64(exported);
}

/**
 * Export private key to base64 string for storage
 */
export async function exportPrivateKey(key: CryptoKey): Promise<string> {
  const exported = await window.crypto.subtle.exportKey("pkcs8", key);
  return arrayBufferToBase64(exported);
}

/**
 * Import public key from base64 string
 */
export async function importPublicKey(keyData: string): Promise<CryptoKey> {
  const buffer = base64ToArrayBuffer(keyData);
  return await window.crypto.subtle.importKey(
    "spki",
    buffer,
    {
      name: "ECDH",
      namedCurve: "P-256",
    },
    true,
    []
  );
}

/**
 * Import private key from base64 string
 */
export async function importPrivateKey(keyData: string): Promise<CryptoKey> {
  const buffer = base64ToArrayBuffer(keyData);
  return await window.crypto.subtle.importKey(
    "pkcs8",
    buffer,
    {
      name: "ECDH",
      namedCurve: "P-256",
    },
    true,
    ["deriveKey"]
  );
}

/**
 * Encrypt a message using recipient's public key
 */
export async function encryptMessage(
  message: string,
  recipientPublicKey: CryptoKey,
  senderPrivateKey: CryptoKey
): Promise<string> {
  // Derive shared secret using ECDH
  const sharedSecret = await window.crypto.subtle.deriveKey(
    {
      name: "ECDH",
      public: recipientPublicKey,
    },
    senderPrivateKey,
    {
      name: "AES-GCM",
      length: 256,
    },
    false,
    ["encrypt"]
  );

  // Generate random IV
  const iv = window.crypto.getRandomValues(new Uint8Array(12));

  // Encrypt the message
  const encodedMessage = new TextEncoder().encode(message);
  const encrypted = await window.crypto.subtle.encrypt(
    {
      name: "AES-GCM",
      iv: iv,
    },
    sharedSecret,
    encodedMessage
  );

  // Combine IV and encrypted data
  const combined = new Uint8Array(iv.length + encrypted.byteLength);
  combined.set(iv);
  combined.set(new Uint8Array(encrypted), iv.length);

  return arrayBufferToBase64(combined.buffer);
}

/**
 * Decrypt a message using own private key
 */
export async function decryptMessage(
  encryptedData: string,
  senderPublicKey: CryptoKey,
  recipientPrivateKey: CryptoKey
): Promise<string> {
  // Parse encrypted data
  const combined = base64ToArrayBuffer(encryptedData);
  const iv = combined.slice(0, 12);
  const encrypted = combined.slice(12);

  // Derive shared secret using ECDH
  const sharedSecret = await window.crypto.subtle.deriveKey(
    {
      name: "ECDH",
      public: senderPublicKey,
    },
    recipientPrivateKey,
    {
      name: "AES-GCM",
      length: 256,
    },
    false,
    ["decrypt"]
  );

  // Decrypt the message
  const decrypted = await window.crypto.subtle.decrypt(
    {
      name: "AES-GCM",
      iv: iv,
    },
    sharedSecret,
    encrypted
  );

  return new TextDecoder().decode(decrypted);
}

/**
 * Store private key in IndexedDB (encrypted with user password in future)
 */
export async function storePrivateKey(userId: string, privateKey: string): Promise<void> {
  const dbName = "ZingerKeys";
  const storeName = "keys";
  
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(dbName, 1);
    
    request.onerror = () => reject(request.error);
    
    request.onsuccess = () => {
      const db = request.result;
      const transaction = db.transaction([storeName], "readwrite");
      const store = transaction.objectStore(storeName);
      
      store.put({ userId, privateKey });
      
      transaction.oncomplete = () => {
        db.close();
        resolve();
      };
      
      transaction.onerror = () => reject(transaction.error);
    };
    
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(storeName)) {
        db.createObjectStore(storeName, { keyPath: "userId" });
      }
    };
  });
}

/**
 * Retrieve private key from IndexedDB
 */
export async function retrievePrivateKey(userId: string): Promise<string | null> {
  const dbName = "ZingerKeys";
  const storeName = "keys";
  
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(dbName, 1);
    
    request.onerror = () => reject(request.error);
    
    request.onsuccess = () => {
      const db = request.result;
      const transaction = db.transaction([storeName], "readonly");
      const store = transaction.objectStore(storeName);
      const getRequest = store.get(userId);
      
      getRequest.onsuccess = () => {
        db.close();
        resolve(getRequest.result?.privateKey || null);
      };
      
      getRequest.onerror = () => {
        db.close();
        reject(getRequest.error);
      };
    };
  });
}

// Utility functions
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

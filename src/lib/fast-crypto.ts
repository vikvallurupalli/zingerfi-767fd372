// FastEncrypt crypto utilities
// Uses a system-wide ECDH keypair with ephemeral client-side keys (ECIES-like scheme)
// The private key never leaves the server — decryption happens server-side via edge function

/**
 * Encrypt a message using the system's public key with an ephemeral ECDH key pair.
 * Returns the ephemeral public key and encrypted data for the server to decrypt.
 */
export async function fastEncrypt(
  message: string,
  systemPublicKeyBase64: string
): Promise<{ ephemeralPublicKey: string; encryptedData: string }> {
  // Import system public key
  const systemPubBuffer = base64ToArrayBuffer(systemPublicKeyBase64);
  const systemPublicKey = await crypto.subtle.importKey(
    'spki',
    systemPubBuffer,
    { name: 'ECDH', namedCurve: 'P-256' },
    false,
    []
  );

  // Generate ephemeral key pair (used once, then discarded)
  const ephemeralKeyPair = await crypto.subtle.generateKey(
    { name: 'ECDH', namedCurve: 'P-256' },
    true,
    ['deriveKey']
  );

  // Export ephemeral public key to send along with the message
  const ephemeralPubBuffer = await crypto.subtle.exportKey('spki', ephemeralKeyPair.publicKey);
  const ephemeralPublicKey = arrayBufferToBase64(ephemeralPubBuffer);

  // Derive shared secret using ephemeral private key + system public key
  const sharedSecret = await crypto.subtle.deriveKey(
    { name: 'ECDH', public: systemPublicKey },
    ephemeralKeyPair.privateKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt']
  );

  // Encrypt the message
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encodedMessage = new TextEncoder().encode(message);
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    sharedSecret,
    encodedMessage
  );

  // Combine IV + ciphertext into a single buffer
  const combined = new Uint8Array(iv.length + encrypted.byteLength);
  combined.set(iv);
  combined.set(new Uint8Array(encrypted), iv.length);
  const encryptedData = arrayBufferToBase64(combined.buffer);

  return { ephemeralPublicKey, encryptedData };
}

/**
 * Format the encrypted payload into a shareable string.
 * Format: FEID:<message_uid>:<ephemeral_public_key>:<encrypted_data>
 */
export function formatFastEncryptPayload(
  messageUid: string,
  ephemeralPublicKey: string,
  encryptedData: string
): string {
  return `FEID:${messageUid}:${ephemeralPublicKey}:${encryptedData}`;
}

/**
 * Parse a FastEncrypt payload string back into its components.
 */
export function parseFastEncryptPayload(
  payload: string
): { messageUid: string; ephemeralPublicKey: string; encryptedData: string } | null {
  const trimmed = payload.trim();
  if (!trimmed.startsWith('FEID:')) return null;

  // Split on first 3 colons only (base64 doesn't contain colons, but be safe)
  const withoutPrefix = trimmed.substring(5); // Remove "FEID:"
  const firstColon = withoutPrefix.indexOf(':');
  if (firstColon === -1) return null;

  const messageUid = withoutPrefix.substring(0, firstColon);
  const rest = withoutPrefix.substring(firstColon + 1);

  const secondColon = rest.indexOf(':');
  if (secondColon === -1) return null;

  const ephemeralPublicKey = rest.substring(0, secondColon);
  const encryptedData = rest.substring(secondColon + 1);

  if (!messageUid || !ephemeralPublicKey || !encryptedData) return null;

  return { messageUid, ephemeralPublicKey, encryptedData };
}

// Utility functions
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
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

import CryptoJS from 'crypto-js';

// The secret key should be injected from environment variables
const SECRET_KEY = process.env.NEXT_PUBLIC_WS_SECRET || process.env.WS_SECRET || 'default_secret_key_123!';

/**
 * Encrypts a payload into an AES string.
 * This is used to prevent simple tampering in the browser devtools.
 */
export function encryptPayload(payload: any): string {
  if (payload === undefined || payload === null) return payload;
  const str = JSON.stringify(payload);
  return CryptoJS.AES.encrypt(str, SECRET_KEY).toString();
}

/**
 * Decrypts an AES string back into an object/payload.
 */
export function decryptPayload(ciphertext: any): any {
  if (typeof ciphertext !== 'string' || !ciphertext.startsWith('U2FsdGVkX1')) {
    // If it's not a string or doesn't look like crypto-js output, return as is.
    // This allows gradual rollout or mixed encrypted/unencrypted traffic.
    return ciphertext;
  }
  
  try {
    const bytes = CryptoJS.AES.decrypt(ciphertext, SECRET_KEY);
    const decryptedStr = bytes.toString(CryptoJS.enc.Utf8);
    if (!decryptedStr) return ciphertext;
    return JSON.parse(decryptedStr);
  } catch (err) {
    // Return original if decryption fails (e.g. wrong key, malformed)
    return ciphertext;
  }
}

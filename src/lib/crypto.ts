/**
 * End-to-End Encryption using AES-GCM (hardware accelerated)
 * 
 * Key is stored in URL fragment (#key=...) and never sent to server.
 * All sensitive data is encrypted client-side before transmission.
 */

const KEY_LENGTH = 256; // bits
const IV_LENGTH = 12; // bytes for AES-GCM

/**
 * Generate a new random encryption key
 */
export async function generateKey(): Promise<string> {
  const key = await crypto.subtle.generateKey(
    { name: 'AES-GCM', length: KEY_LENGTH },
    true, // extractable
    ['encrypt', 'decrypt']
  );
  const exported = await crypto.subtle.exportKey('raw', key);
  return arrayBufferToBase64Url(exported);
}

/**
 * Import a base64url-encoded key
 */
async function importKey(keyBase64Url: string): Promise<CryptoKey> {
  const keyBuffer = base64UrlToArrayBuffer(keyBase64Url);
  return crypto.subtle.importKey(
    'raw',
    keyBuffer,
    { name: 'AES-GCM', length: KEY_LENGTH },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Encrypt plaintext using AES-GCM
 * Returns: base64url(iv + ciphertext + authTag)
 */
export async function encrypt(plaintext: string, keyBase64Url: string): Promise<string> {
  const key = await importKey(keyBase64Url);
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
  const encoder = new TextEncoder();
  
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    encoder.encode(plaintext)
  );
  
  // Combine IV + ciphertext (authTag is appended by AES-GCM)
  const combined = new Uint8Array(iv.length + ciphertext.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(ciphertext), iv.length);
  
  return arrayBufferToBase64Url(combined.buffer);
}

/**
 * Decrypt ciphertext using AES-GCM
 */
export async function decrypt(encryptedBase64Url: string, keyBase64Url: string): Promise<string> {
  const key = await importKey(keyBase64Url);
  const combined = new Uint8Array(base64UrlToArrayBuffer(encryptedBase64Url));
  
  const iv = combined.slice(0, IV_LENGTH);
  const ciphertext = combined.slice(IV_LENGTH);
  
  const plaintext = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    key,
    ciphertext
  );
  
  return new TextDecoder().decode(plaintext);
}

/**
 * Encrypt an object's specified fields
 */
export async function encryptFields<T extends Record<string, any>>(
  obj: T,
  fields: (keyof T)[],
  keyBase64: string
): Promise<T> {
  const result = { ...obj };
  for (const field of fields) {
    if (typeof result[field] === 'string' && result[field]) {
      (result as any)[field] = await encrypt(result[field] as string, keyBase64);
    }
  }
  return result;
}

/**
 * Decrypt an object's specified fields
 */
export async function decryptFields<T extends Record<string, any>>(
  obj: T,
  fields: (keyof T)[],
  keyBase64: string
): Promise<T> {
  const result = { ...obj };
  for (const field of fields) {
    if (typeof result[field] === 'string' && result[field]) {
      try {
        (result as any)[field] = await decrypt(result[field] as string, keyBase64);
      } catch {
        // Field might not be encrypted (legacy data)
        console.warn(`Failed to decrypt field: ${String(field)}`);
      }
    }
  }
  return result;
}

// ─────────────────────────────────────────────────────────────────────────────
// URL Key Management
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Get encryption key from URL fragment
 */
export function getKeyFromUrl(): string | null {
  const hash = window.location.hash;
  if (!hash) return null;
  
  const params = new URLSearchParams(hash.slice(1));
  return params.get('key');
}

/**
 * Set encryption key in URL fragment (without triggering navigation)
 */
export function setKeyInUrl(key: string): void {
  const currentHash = window.location.hash;
  const params = new URLSearchParams(currentHash.slice(1));
  params.set('key', key);
  
  // Update URL without triggering hashchange
  const newUrl = `${window.location.pathname}${window.location.search}#${params.toString()}`;
  window.history.replaceState(null, '', newUrl);
}

/**
 * Build invite URL with encryption key (Base64URL - no encoding needed)
 */
export function buildInviteUrl(code: string, key: string): string {
  return `${window.location.origin}/join/${code}#key=${key}`;
}

/**
 * Build magic link URL with encryption key (Base64URL - no encoding needed)
 */
export function buildMagicLinkUrl(token: string, key: string): string {
  return `${window.location.origin}/join/auth/${token}#key=${key}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers - Using Base64URL (URL-safe, no padding)
// ─────────────────────────────────────────────────────────────────────────────

function arrayBufferToBase64Url(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  // Convert to Base64, then to Base64URL (replace + with -, / with _, remove =)
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function base64UrlToArrayBuffer(base64url: string): ArrayBuffer {
  // Convert Base64URL back to Base64
  let base64 = base64url
    .replace(/-/g, '+')
    .replace(/_/g, '/');
  
  // Add padding if needed
  while (base64.length % 4) {
    base64 += '=';
  }
  
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

// ─────────────────────────────────────────────────────────────────────────────
// Key Storage (per room)
// ─────────────────────────────────────────────────────────────────────────────

const KEY_STORAGE_PREFIX = 'e2e_key_';

export function storeRoomKey(roomCode: string, key: string): void {
  localStorage.setItem(`${KEY_STORAGE_PREFIX}${roomCode.toUpperCase()}`, key);
}

export function getRoomKey(roomCode: string): string | null {
  return localStorage.getItem(`${KEY_STORAGE_PREFIX}${roomCode.toUpperCase()}`);
}

export function clearRoomKey(roomCode: string): void {
  localStorage.removeItem(`${KEY_STORAGE_PREFIX}${roomCode.toUpperCase()}`);
}


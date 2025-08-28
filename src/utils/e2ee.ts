export interface EncryptedBlob {
  /** base64(salt[16] + iv[12] + ciphertext) */
  data: string;
}

async function importKeyFromPassphrase(passphrase: string): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    enc.encode(passphrase),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );
  return keyMaterial;
}

async function deriveAesKey(keyMaterial: CryptoKey, salt: Uint8Array): Promise<CryptoKey> {
  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations: 200_000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

export async function encryptJson(value: unknown, passphrase: string): Promise<EncryptedBlob> {
  const json = JSON.stringify(value);
  const enc = new TextEncoder();
  const data = enc.encode(json);
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const keyMaterial = await importKeyFromPassphrase(passphrase);
  const key = await deriveAesKey(keyMaterial, salt);
  const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, data);
  const combined = new Uint8Array(salt.length + iv.length + ciphertext.byteLength);
  combined.set(salt, 0);
  combined.set(iv, salt.length);
  combined.set(new Uint8Array(ciphertext), salt.length + iv.length);
  const b64 = btoa(String.fromCharCode(...combined));
  return { data: b64 };
}

export async function decryptJson<T = unknown>(blob: EncryptedBlob, passphrase: string): Promise<T> {
  const raw = atob(blob.data);
  const bytes = new Uint8Array([...raw].map(c => c.charCodeAt(0)));
  const salt = bytes.slice(0, 16);
  const iv = bytes.slice(16, 28);
  const ciphertext = bytes.slice(28);
  const keyMaterial = await importKeyFromPassphrase(passphrase);
  const key = await deriveAesKey(keyMaterial, salt);
  const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ciphertext);
  const dec = new TextDecoder();
  return JSON.parse(dec.decode(decrypted)) as T;
}

export function isEncryptedBlob(str: string): boolean {
  // Heuristic: base64 length and contains only base64 chars
  return /^[A-Za-z0-9+/=]+$/.test(str) && str.length > 60;
}



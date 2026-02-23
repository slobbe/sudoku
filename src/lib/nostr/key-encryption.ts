const DEFAULT_KDF_ITERATIONS = 210_000;
const AES_KEY_LENGTH_BITS = 256;
const SALT_BYTES = 16;
const IV_BYTES = 12;

export type NostrKeyEncryptionEnvelope = {
  scheme: "aes-gcm";
  kdf: "pbkdf2-sha256";
  iterations: number;
  salt: string;
  iv: string;
  ciphertext: string;
};

function getWebCrypto(): Crypto {
  if (typeof crypto === "undefined" || !crypto.subtle) {
    throw new Error("Web Crypto is unavailable for key encryption.");
  }

  return crypto;
}

function toBase64(bytes: Uint8Array): string {
  let binary = "";
  for (const value of bytes) {
    binary += String.fromCharCode(value);
  }

  if (typeof btoa === "function") {
    return btoa(binary);
  }

  return Buffer.from(binary, "binary").toString("base64");
}

function fromBase64(value: string): Uint8Array | null {
  if (typeof value !== "string" || value.length === 0) {
    return null;
  }

  try {
    const binary = typeof atob === "function"
      ? atob(value)
      : Buffer.from(value, "base64").toString("binary");
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index += 1) {
      bytes[index] = binary.charCodeAt(index);
    }

    return bytes;
  } catch {
    return null;
  }
}

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  return copy.buffer;
}

async function deriveAesKey(
  passphrase: string,
  salt: Uint8Array,
  iterations: number,
): Promise<CryptoKey> {
  const input = new TextEncoder().encode(passphrase);
  const keyMaterial = await getWebCrypto().subtle.importKey(
    "raw",
    input,
    "PBKDF2",
    false,
    ["deriveKey"],
  );

  return getWebCrypto().subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: toArrayBuffer(salt),
      iterations,
      hash: "SHA-256",
    },
    keyMaterial,
    {
      name: "AES-GCM",
      length: AES_KEY_LENGTH_BITS,
    },
    false,
    ["encrypt", "decrypt"],
  );
}

function normalizePassphrase(passphrase: string): string {
  if (typeof passphrase !== "string") {
    return "";
  }

  return passphrase;
}

export function isNostrKeyEncryptionEnvelope(value: unknown): value is NostrKeyEncryptionEnvelope {
  if (!value || Array.isArray(value) || typeof value !== "object") {
    return false;
  }

  const candidate = value as Partial<NostrKeyEncryptionEnvelope>;
  return candidate.scheme === "aes-gcm"
    && candidate.kdf === "pbkdf2-sha256"
    && Number.isInteger(candidate.iterations)
    && typeof candidate.salt === "string"
    && candidate.salt.length > 0
    && typeof candidate.iv === "string"
    && candidate.iv.length > 0
    && typeof candidate.ciphertext === "string"
    && candidate.ciphertext.length > 0;
}

export async function encryptNsecWithPassphrase(
  nsec: string,
  passphrase: string,
): Promise<NostrKeyEncryptionEnvelope> {
  const normalizedPassphrase = normalizePassphrase(passphrase);
  if (normalizedPassphrase.trim().length === 0) {
    throw new Error("Passphrase is required for encrypted local key storage.");
  }

  const normalizedNsec = nsec.trim();
  if (normalizedNsec.length === 0) {
    throw new Error("A valid nsec is required for encryption.");
  }

  const webCrypto = getWebCrypto();
  const salt = webCrypto.getRandomValues(new Uint8Array(SALT_BYTES));
  const iv = webCrypto.getRandomValues(new Uint8Array(IV_BYTES));
  const key = await deriveAesKey(normalizedPassphrase, salt, DEFAULT_KDF_ITERATIONS);
  const plaintext = new TextEncoder().encode(normalizedNsec);
  const encrypted = await webCrypto.subtle.encrypt(
    { name: "AES-GCM", iv: toArrayBuffer(iv) },
    key,
    toArrayBuffer(plaintext),
  );

  return {
    scheme: "aes-gcm",
    kdf: "pbkdf2-sha256",
    iterations: DEFAULT_KDF_ITERATIONS,
    salt: toBase64(salt),
    iv: toBase64(iv),
    ciphertext: toBase64(new Uint8Array(encrypted)),
  };
}

export async function decryptNsecWithPassphrase(
  envelope: NostrKeyEncryptionEnvelope,
  passphrase: string,
): Promise<string | null> {
  if (!isNostrKeyEncryptionEnvelope(envelope)) {
    return null;
  }

  const normalizedPassphrase = normalizePassphrase(passphrase);
  if (normalizedPassphrase.trim().length === 0) {
    return null;
  }

  const salt = fromBase64(envelope.salt);
  const iv = fromBase64(envelope.iv);
  const ciphertext = fromBase64(envelope.ciphertext);
  if (!salt || !iv || !ciphertext) {
    return null;
  }

  try {
    const key = await deriveAesKey(normalizedPassphrase, salt, envelope.iterations);
    const decrypted = await getWebCrypto().subtle.decrypt(
      { name: "AES-GCM", iv: toArrayBuffer(iv) },
      key,
      toArrayBuffer(ciphertext),
    );

    return new TextDecoder().decode(decrypted);
  } catch {
    return null;
  }
}

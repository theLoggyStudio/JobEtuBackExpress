import crypto from 'node:crypto';
import { SECURITY_CONFIG } from '../../Constants/variable.constant';

const PREFIX = 'enc:v1:';

/**
 * Déchiffre une valeur `enc:v1:…` (AES-256-GCM) si présente ; sinon renvoie la chaîne telle quelle.
 * Utilisé pour les champs mot de passe avant hachage bcrypt.
 */
export function decryptClientSecretIfEncrypted(value: string): string {
  if (!value.startsWith(PREFIX)) {
    return value;
  }
  const keyHex = SECURITY_CONFIG.clientPayloadAesKeyHex;
  if (!keyHex) {
    throw new Error('CLIENT_PAYLOAD_AES_KEY_MISSING');
  }
  const rest = value.slice(PREFIX.length);
  const colonIdx = rest.indexOf(':');
  if (colonIdx < 0) {
    throw new Error('CLIENT_PAYLOAD_MALFORMED');
  }
  const ivHex = rest.slice(0, colonIdx);
  const b64 = rest.slice(colonIdx + 1);
  if (!/^[0-9a-f]{24}$/.test(ivHex)) {
    throw new Error('CLIENT_PAYLOAD_MALFORMED');
  }
  const iv = Buffer.from(ivHex, 'hex');
  const combined = Buffer.from(b64, 'base64');
  if (combined.length < 17) {
    throw new Error('CLIENT_PAYLOAD_MALFORMED');
  }
  const tag = combined.subarray(combined.length - 16);
  const ciphertext = combined.subarray(0, combined.length - 16);
  const key = Buffer.from(keyHex, 'hex');
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(tag);
  return decipher.update(ciphertext, undefined, 'utf8') + decipher.final('utf8');
}

type Body = Record<string, unknown>;

/** Décrypte `password`, `currentPassword`, `newPassword` si envoyés chiffrés. */
export function unwrapEncryptedPasswordFields(body: unknown): unknown {
  if (body === null || typeof body !== 'object' || Array.isArray(body)) {
    return body;
  }
  const o = { ...(body as Body) };
  const keys = ['password', 'currentPassword', 'newPassword'] as const;
  for (const k of keys) {
    const v = o[k];
    if (typeof v === 'string' && v.length > 0) {
      try {
        o[k] = decryptClientSecretIfEncrypted(v);
      } catch (e) {
        const code = e instanceof Error ? e.message : '';
        if (code === 'CLIENT_PAYLOAD_AES_KEY_MISSING') {
          throw new Error('CLIENT_PAYLOAD_AES_KEY_MISSING');
        }
        throw new Error('CLIENT_PAYLOAD_DECRYPT_FAILED');
      }
    }
  }
  return o;
}

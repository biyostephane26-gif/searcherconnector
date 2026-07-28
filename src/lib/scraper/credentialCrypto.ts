// =================================================================
// CHIFFREMENT DES IDENTIFIANTS DE PLATEFORME (AES-256-GCM)
// =================================================================
// Nécessaire uniquement parce que le worker doit se RECONNECTER lui-même
// (Playwright) sur des comptes appartenant au fondateur, pour lire les
// pages de missions même hors ligne. Ce sont les propres comptes du
// fondateur, créés et consentis explicitement pour cet usage — jamais de
// mot de passe d'un autre utilisateur.
//
// PLATFORM_CREDENTIALS_KEY doit être un secret de 32 octets encodé en hex
// (64 caractères), généré une fois via `openssl rand -hex 32` et stocké
// UNIQUEMENT en variable d'environnement (jamais en base, jamais commité).
import crypto from 'crypto';

const ALGO = 'aes-256-gcm';

function getKey(): Buffer {
  const hex = process.env.PLATFORM_CREDENTIALS_KEY;
  if (!hex || hex.length !== 64) {
    throw new Error('PLATFORM_CREDENTIALS_KEY manquante ou invalide (attendu: 64 caractères hex / 32 octets)');
  }
  return Buffer.from(hex, 'hex');
}

export function encryptCredential(plaintext: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGO, getKey(), iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  // Format stocké : iv:authTag:ciphertext, tout en hex
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted.toString('hex')}`;
}

export function decryptCredential(stored: string): string {
  const [ivHex, tagHex, dataHex] = stored.split(':');
  if (!ivHex || !tagHex || !dataHex) throw new Error('Format de credential chiffré invalide');
  const decipher = crypto.createDecipheriv(ALGO, getKey(), Buffer.from(ivHex, 'hex'));
  decipher.setAuthTag(Buffer.from(tagHex, 'hex'));
  const decrypted = Buffer.concat([decipher.update(Buffer.from(dataHex, 'hex')), decipher.final()]);
  return decrypted.toString('utf8');
}

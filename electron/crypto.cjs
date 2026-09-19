const crypto = require('crypto');

/**
 * Paramètres scrypt — robustesse vs performance.
 * N=32768 (2^15), r=8, p=1 ≈ 100ms sur CPU moderne.
 */
const SCRYPT_PARAMS = { N: 32768, r: 8, p: 1, keylen: 64 };

// ---------------------------------------------------------------------------
// HACHAGE DES MOTS DE PASSE (one-way, non réversible)
// ---------------------------------------------------------------------------

/**
 * Hache un mot de passe avec scrypt + sel aléatoire.
 * @param {string} password - Mot de passe en clair
 * @returns {{ hash: string, salt: string }}
 */
function hashPassword(password) {
  const salt = crypto.randomBytes(32).toString('hex');
  const hash = crypto.scryptSync(password, salt, SCRYPT_PARAMS.keylen, {
    N: SCRYPT_PARAMS.N,
    r: SCRYPT_PARAMS.r,
    p: SCRYPT_PARAMS.p,
  }).toString('hex');
  return { hash, salt };
}

/**
 * Vérifie un mot de passe contre un hash scrypt stocké.
 * @param {string} inputPassword  - Mot de passe saisi
 * @param {string} storedHash     - Hash scrypt hex stocké (colonne passwordEncrypted)
 * @param {string} storedSalt     - Sel hex stocké (colonne iv)
 * @returns {boolean}
 */
function verifyPasswordScrypt(inputPassword, storedHash, storedSalt) {
  try {
    const inputHash = crypto.scryptSync(inputPassword, storedSalt, SCRYPT_PARAMS.keylen, {
      N: SCRYPT_PARAMS.N,
      r: SCRYPT_PARAMS.r,
      p: SCRYPT_PARAMS.p,
    }).toString('hex');
    return crypto.timingSafeEqual(
      Buffer.from(inputHash, 'hex'),
      Buffer.from(storedHash, 'hex')
    );
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// COMPATIBILITÉ ASCENDANTE — anciens mots de passe AES-256-GCM
// (uniquement pour migrer les utilisateurs existants, jamais pour nouveaux)
// ---------------------------------------------------------------------------

/** @deprecated — conservé uniquement pour la migration silencieuse */
const _LEGACY_MASTER_KEY = 'GestionFinanciere2024SecureAdminKey!@#$%';

function _getLegacyKey() {
  return crypto.createHash('sha256').update(_LEGACY_MASTER_KEY).digest();
}

/**
 * Vérifie un mot de passe au format legacy (AES-256-GCM).
 * Utilisé uniquement lors de la migration automatique au premier login.
 * @deprecated
 */
function verifyPasswordLegacy(inputPassword, storedEncrypted, iv, authTag) {
  try {
    const decipher = crypto.createDecipheriv(
      'aes-256-gcm',
      _getLegacyKey(),
      Buffer.from(iv, 'hex')
    );
    decipher.setAuthTag(Buffer.from(authTag, 'hex'));
    let decrypted = decipher.update(storedEncrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted === inputPassword;
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// CLÉ ADMIN — générée aléatoirement au premier démarrage, jamais hardcodée
// ---------------------------------------------------------------------------

/**
 * Génère une clé admin aléatoire sécurisée et son hash scrypt.
 * Appelé UNE SEULE FOIS lors de l'initialisation de la base de données.
 * @returns {{ key: string, hash: string, salt: string }}
 */
function generateAdminKey() {
  const key = crypto.randomBytes(20).toString('base64url'); // ~27 chars URL-safe
  const { hash, salt } = hashPassword(key);
  return { key, hash, salt };
}

/**
 * Vérifie la clé admin fournie contre le hash stocké en base.
 * @param {string} providedKey
 * @param {string} storedHash  - Hash scrypt (app_settings.adminKeyHash)
 * @param {string} storedSalt  - Sel (app_settings.adminKeySalt)
 * @returns {boolean}
 */
function verifyAdminKey(providedKey, storedHash, storedSalt) {
  return verifyPasswordScrypt(providedKey, storedHash, storedSalt);
}

module.exports = {
  hashPassword,
  verifyPasswordScrypt,
  verifyPasswordLegacy,
  generateAdminKey,
  verifyAdminKey,
};

import type { MatchStatus } from './types.constant';
import { appEnv, appEnvBool, appEnvInt, appEnvOrDefault, appEnvPositiveInt } from './envResolve';
import { MODE_CONFIG } from './mode.constant';

/**
 * Variables serveur centralisées — toute configuration modifiable passe par ce fichier.
 * Mode test / production : voir `Constants/mode.constant.ts`.
 */
export const APP_CONFIG = {
  name: 'OneJob API',
  version: '0.1.0',
  apiPrefix: '/api',
} as const;

export const UI_CONFIG = {} as const;

/**
 * `memory` = données en RAM (tests, reset au redémarrage).
 * `json` = fichier JSON (mode test, sans PostgreSQL).
 * `postgres` = Sequelize + PG.
 */
export const STORAGE_DRIVER_CONFIG = {
  memory: 'memory',
  json: 'json',
  postgres: 'postgres',
} as const;

export type StorageDriver = (typeof STORAGE_DRIVER_CONFIG)[keyof typeof STORAGE_DRIVER_CONFIG];

function resolveStorageDriver(): StorageDriver {
  const raw = appEnv('STORAGE_DRIVER');
  if (raw === STORAGE_DRIVER_CONFIG.memory) return STORAGE_DRIVER_CONFIG.memory;
  if (raw === STORAGE_DRIVER_CONFIG.json) return STORAGE_DRIVER_CONFIG.json;
  if (raw === STORAGE_DRIVER_CONFIG.postgres) return STORAGE_DRIVER_CONFIG.postgres;
  if (raw != null && raw !== '') {
    return STORAGE_DRIVER_CONFIG.postgres;
  }
  return MODE_CONFIG.current === 'test' ? STORAGE_DRIVER_CONFIG.memory : STORAGE_DRIVER_CONFIG.postgres;
}

const DEFAULT_CORS_ORIGIN = 'http://localhost:5173';

/** En test : `CORS_ORIGIN_TEST` puis `CORS_ORIGIN`. En production : `CORS_ORIGIN` uniquement. */
function resolveCorsOrigin(): string {
  return appEnvOrDefault('CORS_ORIGIN', DEFAULT_CORS_ORIGIN);
}

export const SERVER_CONFIG = {
  port: appEnvInt('PORT', 4000) || 4000,
  nodeEnv: appEnvOrDefault('NODE_ENV', 'development'),
  corsOrigin: resolveCorsOrigin(),
  dbSync: appEnvBool('DB_SYNC'),
  payloadLimit: appEnvOrDefault('PAYLOAD_LIMIT', '1mb'),
  storageDriver: resolveStorageDriver(),
} as const;

/** Fichier de données en mode `STORAGE_DRIVER=json` (relatif au répertoire de travail du processus). */
export const JSON_STORE_CONFIG = {
  fileRelativePath: appEnvOrDefault('JSON_STORE_PATH', 'data/jobetu-test-store.json'),
} as const;

function resolveClientPayloadAesKeyHex(): string | null {
  const raw = appEnv('CLIENT_PAYLOAD_AES_KEY');
  if (!raw) return null;
  const lower = raw.toLowerCase();
  return /^[0-9a-f]{64}$/.test(lower) ? lower : null;
}

export const SECURITY_CONFIG = {
  jwtSecret: appEnvOrDefault('JWT_SECRET', 'dev-only-change-me'),
  jwtExpiresIn: appEnvOrDefault('JWT_EXPIRES_IN', '7d'),
  /** Coût bcrypt : mots de passe stockés en hachage à sens unique (irréversible), jamais en clair. */
  bcryptRounds: appEnvPositiveInt('BCRYPT_ROUNDS', 10),
  /**
   * Clé AES-256 (64 caractères hex) partagée avec le front (`VITE_CLIENT_PAYLOAD_AES_KEY`)
   * pour chiffrer les mots de passe dans le corps JSON. Complément au HTTPS, pas un substitut.
   */
  clientPayloadAesKeyHex: resolveClientPayloadAesKeyHex(),
  /** Désactivé par défaut pour API JSON + front séparé ; activer en prod derrière reverse proxy si besoin */
  helmetContentSecurityPolicy: false as boolean,
  rateLimitWindowMs: appEnvInt('RATE_LIMIT_WINDOW_MS', 15 * 60 * 1000),
  rateLimitMax: appEnvInt('RATE_LIMIT_MAX', 200),
  authRateLimitMax: appEnvInt('AUTH_RATE_LIMIT_MAX', 30),
} as const;

export const ROLE_CONFIG = {
  admin: 'admin',
  entreprise: 'entreprise',
  etudiant: 'etudiant',
  particulier: 'particulier',
} as const;

/** Cibles possibles pour un questionnaire (sous-ensemble des rôles métier) */
export const QUESTIONNAIRE_TARGET_CONFIG = {
  entreprise: ROLE_CONFIG.entreprise,
  etudiant: ROLE_CONFIG.etudiant,
} as const;

export const MESSAGE_CONFIG = {
  serverRunning: 'OneJob API opérationnelle',
  modeJsonActif: 'Mode persistance JSON (test) — aucune base PostgreSQL',
  modeMemoryActif:
    'Mode persistance mémoire (test) — données réinitialisées à chaque redémarrage du serveur',
  unauthorized: 'Non autorisé',
  forbidden: 'Accès interdit',
  notFound: 'Ressource introuvable',
  validationError: 'Données invalides',
  invalidCredentials: 'Identifiants incorrects',
  emailTaken: 'Cet email est déjà utilisé',
  adminRegisterForbidden: 'Création de compte admin interdite via API publique',
  databaseUrlRequired:
    'URL PostgreSQL requise si STORAGE_DRIVER=postgres (en test : *_TEST puis clés prod ; DATABASE_URL, POSTGRES_URL, …)',
  matchPairConflict:
    'Une demande ou une mise en relation validée existe déjà pour cette paire entreprise / étudiant.',
  matchInvalidStatusTransition: 'Changement de statut impossible pour cette demande.',
  matchNotValidated: 'La mise en relation n’est pas encore validée ou a été refusée.',
  wrongCurrentPassword: 'Mot de passe actuel incorrect.',
  lastAdminCannotDelete: 'Impossible de supprimer le dernier administrateur.',
  profileNothingToUpdate: 'Aucune modification à enregistrer.',
  clientPayloadKeyMissing:
    'Chiffrement des mots de passe activé côté client mais CLIENT_PAYLOAD_AES_KEY manque sur le serveur.',
  clientPayloadDecryptFailed: 'Impossible de déchiffrer les données sensibles du corps de requête.',
  submissionRequiresPaydunya:
    'La soumission nécessite un paiement via PayDunya. Utilisez le parcours « Envoyer » du formulaire.',
  paydunyaNotConfigured: 'Paiement PayDunya non configuré sur le serveur.',
  paydunyaInvoiceError: 'Impossible de créer la facture de paiement.',
  paydunyaConfirmError: 'Impossible de confirmer le paiement.',
  paydunyaSessionNotFound: 'Session de paiement introuvable ou expirée.',
  paydunyaPaymentIncomplete: 'Le paiement n’est pas encore confirmé. Réessayez dans un instant.',
} as const;

/** `json` ou `memory` : pas de Sequelize, données locales (fichier ou RAM). */
export function usesJsonStylePersistence(): boolean {
  return (
    SERVER_CONFIG.storageDriver === STORAGE_DRIVER_CONFIG.json ||
    SERVER_CONFIG.storageDriver === STORAGE_DRIVER_CONFIG.memory
  );
}

export function embeddedStorageHealthExtra(): { note: string } | Record<string, never> {
  if (!usesJsonStylePersistence()) return {};
  return {
    note:
      SERVER_CONFIG.storageDriver === STORAGE_DRIVER_CONFIG.memory
        ? MESSAGE_CONFIG.modeMemoryActif
        : MESSAGE_CONFIG.modeJsonActif,
  };
}

export const FEATURE_FLAGS = {
  enablePaymentHooks: false,
} as const;

export const MATCH_STATUS_CONFIG: Record<MatchStatus, MatchStatus> = {
  pending: 'pending',
  validated: 'validated',
  rejected: 'rejected',
};

export const MATCH_CONFIG = {
  tableName: 'matches',
} as const;

export const WHATSAPP_CONFIG = {
  maxLinkLength: 2048,
} as const;

export const BUSINESS_RULES = {
  minPasswordLength: 8,
  maxPhoneLength: 40,
  maxQuestionnaireTitleLength: 200,
  maxSlugLength: 120,
  maxSearchLength: 120,
  maxMatchMessageLength: 4000,
  /** Notes admin sur un match (tiers entreprise / étudiant) */
  minAdminMatchRating: 1,
  maxAdminMatchRating: 10,
} as const;

export const PAGINATION_CONFIG = {
  defaultLimit: 50,
  maxLimit: 200,
} as const;

export const HTTP_STATUS = {
  ok: 200,
  created: 201,
  badRequest: 400,
  unauthorized: 401,
  paymentRequired: 402,
  forbidden: 403,
  notFound: 404,
  conflict: 409,
  tooManyRequests: 429,
  notImplemented: 501,
  serverError: 500,
} as const;

export const API_PATHS = {
  health: '/health',
  authRegister: '/auth/register',
  authRegisterAdmin: '/auth/register-admin',
  authLogin: '/auth/login',
  authMe: '/auth/me',
  questionnaires: '/questionnaires',
  questionnaireById: '/questionnaires/:id',
  questionnaireBySlug: '/questionnaires/by-slug/:slug',
  questionnaireToggle: '/questionnaires/:id/toggle',
  submissions: '/submissions',
  submissionById: '/submissions/:id',
  matches: '/matches',
  matchRatings: '/matches/:matchId/ratings',
  matchStatus: '/matches/:matchId/status',
} as const;

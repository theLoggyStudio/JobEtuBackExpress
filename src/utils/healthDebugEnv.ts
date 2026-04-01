import { appEnvOrDefault } from '../../Constants/envResolve';
import { TEST_DEFAULT_ADMIN_CONFIG } from '../../Constants/mode.constant';
import { SECURITY_CONFIG, SERVER_CONFIG } from '../../Constants/variable.constant';

/**
 * Données sensibles pour `/api/health` **uniquement** si `JOBETU_HEALTH_DEBUG=true|1|yes`.
 * À désactiver sur Vercel immédiatement après diagnostic.
 */
export function maybeHealthDebugEnv(): Record<string, unknown> | undefined {
  const raw = process.env.JOBETU_HEALTH_DEBUG?.trim().toLowerCase();
  if (raw !== '1' && raw !== 'true' && raw !== 'yes') {
    return undefined;
  }

  const adminPassword = appEnvOrDefault('ADMIN_PASSWORD', TEST_DEFAULT_ADMIN_CONFIG.password);

  return {
    _warning:
      'JOBETU_HEALTH_DEBUG actif : mots de passe / clés exposés. Supprimer cette variable sur Vercel après le test.',
    ADMIN_EMAIL: appEnvOrDefault('ADMIN_EMAIL', TEST_DEFAULT_ADMIN_CONFIG.email),
    ADMIN_PASSWORD: adminPassword,
    ADMIN_PASSWORD_LENGTH: adminPassword.length,
    CLIENT_PAYLOAD_AES_KEY_HEX: SECURITY_CONFIG.clientPayloadAesKeyHex,
    CORS_ORIGIN: SERVER_CONFIG.corsOrigin,
    NODE_ENV: SERVER_CONFIG.nodeEnv,
    DATABASE_URL_SET: Boolean(process.env.DATABASE_URL?.trim()),
    POSTGRES_URL_SET: Boolean(process.env.POSTGRES_URL?.trim()),
    POSTGRES_PRISMA_URL_SET: Boolean(process.env.POSTGRES_PRISMA_URL?.trim()),
    JWT_SECRET_LENGTH: (process.env.JWT_SECRET ?? '').trim().length,
  };
}

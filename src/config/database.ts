import { Sequelize } from 'sequelize';
import { isProductionAppMode } from '../../Constants/envResolve';
import { MESSAGE_CONFIG, SERVER_CONFIG, STORAGE_DRIVER_CONFIG } from '../../Constants/variable.constant';

function trimEnv(key: string): string | undefined {
  const v = process.env[key]?.trim();
  return v === '' ? undefined : v;
}

/** En test : `key_TEST` puis `key`. En production : `key` uniquement. */
function trimEnvMode(key: string): string | undefined {
  if (isProductionAppMode()) {
    return trimEnv(key);
  }
  return trimEnv(`${key}_TEST`) ?? trimEnv(key);
}

function buildPostgresUrl(user: string, password: string, host: string, database: string): string {
  return `postgres://${encodeURIComponent(user)}:${encodeURIComponent(password)}@${host}/${encodeURIComponent(database)}`;
}

/**
 * Ordre : URL complètes puis variables discrètes Vercel `POSTGRES_*` / `PG*`.
 * Mode test : pour chaque clé, `*_TEST` puis repli sur la clé production.
 */
export function resolvePostgresConnectionString(): string | undefined {
  const urlKeys = ['DATABASE_URL', 'POSTGRES_URL', 'POSTGRES_PRISMA_URL'] as const;
  for (const k of urlKeys) {
    const v = trimEnvMode(k);
    if (v) return v;
  }

  const user = trimEnvMode('POSTGRES_USER') ?? trimEnvMode('PGUSER');
  const password = trimEnvMode('POSTGRES_PASSWORD') ?? trimEnvMode('PGPASSWORD');
  const host = trimEnvMode('POSTGRES_HOST') ?? trimEnvMode('PGHOST');
  const database = trimEnvMode('POSTGRES_DATABASE') ?? trimEnvMode('PGDATABASE');
  if (user && password && host && database) {
    return buildPostgresUrl(user, password, host, database);
  }
  return undefined;
}

const databaseUrl = resolvePostgresConnectionString();

if (SERVER_CONFIG.storageDriver === STORAGE_DRIVER_CONFIG.postgres) {
  if (!databaseUrl) {
    throw new Error(MESSAGE_CONFIG.databaseUrlRequired);
  }
}

export const sequelize: Sequelize | null =
  SERVER_CONFIG.storageDriver === STORAGE_DRIVER_CONFIG.postgres && databaseUrl
    ? new Sequelize(databaseUrl, {
        dialect: 'postgres',
        logging: SERVER_CONFIG.nodeEnv === 'development' ? console.log : false,
        define: {
          underscored: true,
          timestamps: true,
        },
      })
    : null;

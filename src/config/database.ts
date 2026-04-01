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

/** True si l’URL porte déjà la config TLS (Neon / Vercel Postgres le font presque toujours). */
function connectionStringDeclaresSsl(connectionString: string): boolean {
  return /[?&]sslmode=/i.test(connectionString) || /[?&]ssl=true/i.test(connectionString);
}

/**
 * Besoin d’ajouter des `dialectOptions` SSL côté Sequelize **uniquement** si l’URL ne le dit pas déjà.
 * Sinon `pg` reçoit une double config → warning « SECURITY WARNING: The SSL… » et risque d’erreurs.
 */
function shouldAddDialectSsl(connectionString: string): boolean {
  if (/sslmode=disable/i.test(connectionString)) return false;
  if (connectionStringDeclaresSsl(connectionString)) return false;
  try {
    const normalized = connectionString.replace(/^postgres(ql)?:\/\//i, 'http://');
    const u = new URL(normalized);
    return u.hostname !== 'localhost' && u.hostname !== '127.0.0.1';
  } catch {
    return process.env.VERCEL === '1';
  }
}

/**
 * Ordre aligné sur les variables injectées par Vercel Postgres / Neon (dashboard « Connect »).
 * `POSTGRES_URL_NO_SSL` en dernier : ne pas ajouter d’options SSL Sequelize par-dessus.
 * Mode test : pour chaque clé, `*_TEST` puis repli sur la clé production.
 */
function resolvePostgresConnection():
  | { url: string; urlSourceKey: 'POSTGRES_URL_NO_SSL' | 'URL_ENV' | 'DISCRETE' }
  | undefined {
  const urlKeys = [
    'DATABASE_URL',
    'POSTGRES_URL',
    'POSTGRES_PRISMA_URL',
    'POSTGRES_URL_NON_POOLING',
    'DATABASE_URL_UNPOOLED',
    'POSTGRES_URL_NO_SSL',
  ] as const;

  for (const k of urlKeys) {
    const v = trimEnvMode(k);
    if (v) {
      return {
        url: v,
        urlSourceKey: k === 'POSTGRES_URL_NO_SSL' ? 'POSTGRES_URL_NO_SSL' : 'URL_ENV',
      };
    }
  }

  const user = trimEnvMode('POSTGRES_USER') ?? trimEnvMode('PGUSER');
  const password = trimEnvMode('POSTGRES_PASSWORD') ?? trimEnvMode('PGPASSWORD');
  const host =
    trimEnvMode('POSTGRES_HOST') ??
    trimEnvMode('PGHOST') ??
    trimEnvMode('PGHOST_UNPOOLED');
  const database = trimEnvMode('POSTGRES_DATABASE') ?? trimEnvMode('PGDATABASE');
  if (user && password && host && database) {
    return { url: buildPostgresUrl(user, password, host, database), urlSourceKey: 'DISCRETE' };
  }
  return undefined;
}

export function resolvePostgresConnectionString(): string | undefined {
  return resolvePostgresConnection()?.url;
}

const resolvedPg = resolvePostgresConnection();
const databaseUrl = resolvedPg?.url;

if (SERVER_CONFIG.storageDriver === STORAGE_DRIVER_CONFIG.postgres && !databaseUrl) {
  console.warn(
    `[JobEtu] ${MESSAGE_CONFIG.databaseUrlRequired} (aucun throw au démarrage — health OK, routes API en 503 jusqu’à configuration.)`
  );
}

const useSequelizeDialectSsl = Boolean(
  databaseUrl &&
    resolvedPg?.urlSourceKey !== 'POSTGRES_URL_NO_SSL' &&
    shouldAddDialectSsl(databaseUrl)
);

export const sequelize: Sequelize | null =
  SERVER_CONFIG.storageDriver === STORAGE_DRIVER_CONFIG.postgres && databaseUrl
    ? new Sequelize(databaseUrl, {
        dialect: 'postgres',
        logging: SERVER_CONFIG.nodeEnv === 'development' ? console.log : false,
        dialectOptions: useSequelizeDialectSsl ? { ssl: true } : {},
        define: {
          underscored: true,
          timestamps: true,
        },
      })
    : null;

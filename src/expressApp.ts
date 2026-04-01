import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import {
  APP_CONFIG,
  MESSAGE_CONFIG,
  SECURITY_CONFIG,
  SERVER_CONFIG,
  STORAGE_DRIVER_CONFIG,
  embeddedStorageHealthExtra,
} from '../Constants/variable.constant';
import { errorHandler } from './middlewares/errorHandler';
import { globalLimiter } from './middlewares/rateLimiter';
import { registerRoutes } from './routes';
import { sequelize, syncDatabase } from './models';
import { ensureEnvAdminUser } from './services/ensureEnvAdmin';
import { maybeHealthDebugEnv } from './utils/healthDebugEnv';

export function createApp(): express.Express {
  const app = express();
  app.set('trust proxy', 1);

  /** Réécriture vercel.json → /api/handler : rétablit le chemin client pour le routeur Express. */
  if (process.env.VERCEL === '1') {
    app.use((req, _res, next) => {
      const pathOnly = (req.url || '/').split('?')[0];
      if (pathOnly !== '/api/handler' && pathOnly !== '/api/handler/') {
        next();
        return;
      }
      const orig = req.originalUrl || '/';
      const origPath = orig.split('?')[0];
      const query = orig.includes('?') ? orig.slice(orig.indexOf('?')) : '';
      const target =
        origPath === '/api/handler' || origPath === '/api/handler/' ? '/' : origPath;
      req.url = target + query;
      next();
    });
  }

  /**
   * Avant toute route : sync PG + admin env (une fois par instance).
   * Doit précéder `GET /api/diagnostic-ping`, sinon ce hit ne passait pas ici et l’admin n’était jamais créé.
   */
  let dbSynced = false;
  app.use(async (_req, _res, next) => {
    if (dbSynced) {
      next();
      return;
    }
    dbSynced = true;
    try {
      await syncDatabase();
      try {
        await ensureEnvAdminUser();
      } catch (adminErr) {
        console.error('[JobEtu] ensureEnvAdminUser:', adminErr);
      }
    } catch (err) {
      dbSynced = false;
      next(err instanceof Error ? err : new Error(String(err)));
      return;
    }
    next();
  });

  /** Diagnostic déploiement : après bootstrap (tables + admin). */
  app.get('/api/diagnostic-ping', (_req, res) => {
    res.status(200).json({ ok: true, layer: 'express', route: 'diagnostic-ping' });
  });
  app.use(
    helmet({
      contentSecurityPolicy: SECURITY_CONFIG.helmetContentSecurityPolicy ? undefined : false,
    })
  );
  app.use(
    cors({
      origin: SERVER_CONFIG.corsOrigin,
      credentials: true,
    })
  );
  app.use(globalLimiter);
  app.use(express.json({ limit: SERVER_CONFIG.payloadLimit }));

  app.get('/', (_req, res) => {
    res.redirect(302, `${APP_CONFIG.apiPrefix}/health`);
  });

  app.get(`${APP_CONFIG.apiPrefix}/health`, (_req, res) => {
    const debugEnv = maybeHealthDebugEnv();
    res.json({
      status: 'ok',
      message: MESSAGE_CONFIG.serverRunning,
      version: APP_CONFIG.version,
      storageDriver: SERVER_CONFIG.storageDriver,
      ...(SERVER_CONFIG.storageDriver === STORAGE_DRIVER_CONFIG.postgres
        ? {
            databaseReady: Boolean(sequelize),
            ...(!sequelize ? { warning: MESSAGE_CONFIG.databaseUrlRequired } : {}),
          }
        : {}),
      ...embeddedStorageHealthExtra(),
      ...(debugEnv ? { debugEnv } : {}),
    });
  });

  /** Postgres sans URL : ne pas faire planter la fonction serverless ; bloquer le reste des routes en 503. */
  if (SERVER_CONFIG.storageDriver === STORAGE_DRIVER_CONFIG.postgres) {
    app.use((req, res, next) => {
      if (sequelize) {
        next();
        return;
      }
      if (req.method === 'OPTIONS' || req.path === '/api/diagnostic-ping') {
        next();
        return;
      }
      res.status(503).json({
        error: 'Service indisponible',
        message: MESSAGE_CONFIG.databaseUrlRequired,
      });
    });
  }

  registerRoutes(app);

  app.use(errorHandler);
  return app;
}

import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import {
  APP_CONFIG,
  MESSAGE_CONFIG,
  SECURITY_CONFIG,
  SERVER_CONFIG,
  embeddedStorageHealthExtra,
} from '../Constants/variable.constant';
import { errorHandler } from './middlewares/errorHandler';
import { globalLimiter } from './middlewares/rateLimiter';
import { registerRoutes } from './routes';
import { syncDatabase } from './models';

export function createApp(): express.Express {
  const app = express();
  app.set('trust proxy', 1);

  /** Vercel (serverless) : sync Sequelize une fois au premier hit ; `server.ts` fait déjà await sync avant listen en local. */
  let dbSynced = false;
  app.use(async (_req, _res, next) => {
    if (dbSynced) {
      next();
      return;
    }
    dbSynced = true;
    try {
      await syncDatabase();
    } catch (err) {
      dbSynced = false;
      next(err instanceof Error ? err : new Error(String(err)));
      return;
    }
    next();
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
    res.json({
      status: 'ok',
      message: MESSAGE_CONFIG.serverRunning,
      version: APP_CONFIG.version,
      storageDriver: SERVER_CONFIG.storageDriver,
      ...embeddedStorageHealthExtra(),
    });
  });

  registerRoutes(app);

  app.use(errorHandler);
  return app;
}

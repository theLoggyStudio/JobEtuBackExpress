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

export function createApp(): express.Express {
  const app = express();
  app.set('trust proxy', 1);
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

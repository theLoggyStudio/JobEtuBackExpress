/**
 * Fichier attendu par la détection Express Vercel (`src/app.ts`) : **export default** = app ou handler.
 * La configuration des routes reste dans `expressApp.ts` (`createApp`).
 */
import './config/loadEnv';
import { createApp } from './expressApp';

const app = createApp();
export default app;

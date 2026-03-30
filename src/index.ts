/**
 * Point d’entrée Vercel : export **de l’app Express** (recommandation Vercel), pas serverless-http.
 * @see https://vercel.com/docs/frameworks/backend/express
 */
import './config/loadEnv';
import { createApp } from './app';

const app = createApp();
export default app;

/**
 * Entrée serverless : import depuis les sources (pas `dist/`), pour que le traceur Vercel inclue tout le graphe.
 * @see https://vercel.com/docs/functions/runtimes/node-js
 */
export { default } from '../src/index';

/**
 * Point d’entrée Vercel (serverless). Le serveur classique reste `server.ts` (npm run dev / start).
 */
import './config/loadEnv';
import type { Request, Response } from 'express';
import serverless from 'serverless-http';
import { createApp } from './app';
import { syncDatabase } from './models';

let handler: ReturnType<typeof serverless> | null = null;

async function getHandler(): Promise<ReturnType<typeof serverless>> {
  if (!handler) {
    await syncDatabase();
    handler = serverless(createApp());
  }
  return handler;
}

export default async function vercelHandler(req: Request, res: Response): Promise<void> {
  const h = await getHandler();
  await h(req, res);
}

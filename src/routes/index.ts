import express, { type Express } from 'express';
import { APP_CONFIG } from '../../Constants/variable.constant';
import { paydunyaWebhook } from '../controllers/paydunyaSubmissionController';
import { asyncHandler } from '../middlewares/asyncHandler';
import { authRouter } from './authRoutes';
import { questionnaireRouter } from './questionnaireRoutes';
import { submissionRouter } from './submissionRoutes';
import { matchRouter } from './matchRoutes';

export function registerRoutes(app: Express): void {
  const prefix = APP_CONFIG.apiPrefix;
  app.post(
    `${prefix}/webhooks/paydunya`,
    express.urlencoded({ extended: true, limit: '1mb' }),
    asyncHandler(paydunyaWebhook)
  );
  app.use(`${prefix}/auth`, authRouter);
  app.use(`${prefix}/questionnaires`, questionnaireRouter);
  app.use(`${prefix}/submissions`, submissionRouter);
  app.use(`${prefix}/matches`, matchRouter);
}

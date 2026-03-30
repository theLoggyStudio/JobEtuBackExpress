import { Router } from 'express';
import {
  confirmPaydunyaSubmission,
  initPaydunyaSubmissionCheckout,
} from '../controllers/paydunyaSubmissionController';
import { createSubmission, getSubmission, listSubmissions } from '../controllers/submissionController';
import { asyncHandler } from '../middlewares/asyncHandler';
import { authMiddleware } from '../middlewares/authMiddleware';
import { requireAdmin } from '../middlewares/roleMiddleware';

export const submissionRouter = Router();

submissionRouter.post('/paydunya/init', authMiddleware, asyncHandler(initPaydunyaSubmissionCheckout));
submissionRouter.get(
  '/paydunya/confirm/:sessionId',
  authMiddleware,
  asyncHandler(confirmPaydunyaSubmission)
);
submissionRouter.post('/', authMiddleware, asyncHandler(createSubmission));
submissionRouter.get('/', authMiddleware, requireAdmin, asyncHandler(listSubmissions));
submissionRouter.get('/:id', authMiddleware, requireAdmin, asyncHandler(getSubmission));

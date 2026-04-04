import { Router } from 'express';
import {
  createQuestionnaire,
  getBySlug,
  listQuestionnaires,
  toggleQuestionnaire,
  updateQuestionnaire,
} from '../controllers/questionnaireController';
import { asyncHandler } from '../middlewares/asyncHandler';
import { authMiddleware } from '../middlewares/authMiddleware';
import { optionalAuthMiddleware } from '../middlewares/optionalAuthMiddleware';
import { requireAdmin } from '../middlewares/roleMiddleware';

export const questionnaireRouter = Router();

questionnaireRouter.get('/', optionalAuthMiddleware, asyncHandler(listQuestionnaires));
questionnaireRouter.get('/by-slug/:slug', asyncHandler(getBySlug));
questionnaireRouter.post('/', authMiddleware, requireAdmin, asyncHandler(createQuestionnaire));
questionnaireRouter.put('/:id', authMiddleware, requireAdmin, asyncHandler(updateQuestionnaire));
questionnaireRouter.patch('/:id/toggle', authMiddleware, requireAdmin, asyncHandler(toggleQuestionnaire));
/** POST : même effet que PATCH (proxies / hébergeurs qui filtrent PATCH). */
questionnaireRouter.post('/:id/toggle', authMiddleware, requireAdmin, asyncHandler(toggleQuestionnaire));

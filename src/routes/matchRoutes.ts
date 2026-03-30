import { Router } from 'express';
import {
  createMatch,
  listMatchMessages,
  listMatchPairBlockKeys,
  listMatches,
  listMyMatches,
  patchMatchAdminRatings,
  patchMatchStatus,
  postMatchMessage,
} from '../controllers/matchController';
import { asyncHandler } from '../middlewares/asyncHandler';
import { authMiddleware } from '../middlewares/authMiddleware';
import { requireAdmin, requireBusinessUser } from '../middlewares/roleMiddleware';

export const matchRouter = Router();

matchRouter.get('/my', authMiddleware, requireBusinessUser, asyncHandler(listMyMatches));
matchRouter.get(
  '/pair-block-keys',
  authMiddleware,
  requireAdmin,
  asyncHandler(listMatchPairBlockKeys)
);
matchRouter.get('/:matchId/messages', authMiddleware, requireBusinessUser, asyncHandler(listMatchMessages));
matchRouter.post('/:matchId/messages', authMiddleware, requireBusinessUser, asyncHandler(postMatchMessage));
matchRouter.post('/', authMiddleware, requireAdmin, asyncHandler(createMatch));
matchRouter.get('/', authMiddleware, requireAdmin, asyncHandler(listMatches));
matchRouter.patch(
  '/:matchId/ratings',
  authMiddleware,
  requireAdmin,
  asyncHandler(patchMatchAdminRatings)
);
matchRouter.patch(
  '/:matchId/status',
  authMiddleware,
  requireAdmin,
  asyncHandler(patchMatchStatus)
);

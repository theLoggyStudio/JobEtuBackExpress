import { Router } from 'express';
import { deleteMe, login, me, patchMe, register, registerAdmin } from '../controllers/authController';
import { asyncHandler } from '../middlewares/asyncHandler';
import { authMiddleware } from '../middlewares/authMiddleware';
import { authLimiter } from '../middlewares/rateLimiter';
import { requireAdmin } from '../middlewares/roleMiddleware';

export const authRouter = Router();
authRouter.post('/register', authLimiter, asyncHandler(register));
authRouter.post('/login', authLimiter, asyncHandler(login));
authRouter.get('/me', authMiddleware, asyncHandler(me));
authRouter.patch('/me', authMiddleware, asyncHandler(patchMe));
authRouter.delete('/me', authMiddleware, asyncHandler(deleteMe));
authRouter.post('/register-admin', authMiddleware, requireAdmin, asyncHandler(registerAdmin));

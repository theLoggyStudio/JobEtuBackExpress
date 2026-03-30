import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { SECURITY_CONFIG } from '../../Constants/variable.constant';
import type { UserRole } from '../../Constants/types.constant';
import type { AuthPayload } from './authMiddleware';
import { findUserById } from '../repositories/userRepository';
import { asyncHandler } from './asyncHandler';

async function optionalAuthMiddlewareImpl(
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    next();
    return;
  }
  const token = header.slice(7);
  try {
    const decoded = jwt.verify(token, SECURITY_CONFIG.jwtSecret) as AuthPayload;
    const user = await findUserById(decoded.sub);
    if (user) {
      req.auth = { userId: user.id, role: user.role as UserRole };
    }
  } catch {
    /* ignore invalid token for optional routes */
  }
  next();
}

export const optionalAuthMiddleware = asyncHandler(optionalAuthMiddlewareImpl);

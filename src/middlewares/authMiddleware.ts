import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { HTTP_STATUS, MESSAGE_CONFIG, SECURITY_CONFIG } from '../../Constants/variable.constant';
import type { UserRole } from '../../Constants/types.constant';
import { findUserById } from '../repositories/userRepository';
import { asyncHandler } from './asyncHandler';

export type AuthPayload = { sub: string; role: UserRole };

declare global {
  namespace Express {
    interface Request {
      auth?: { userId: string; role: UserRole };
    }
  }
}

async function authMiddlewareImpl(req: Request, res: Response, next: NextFunction): Promise<void> {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    res.status(HTTP_STATUS.unauthorized).json({ error: MESSAGE_CONFIG.unauthorized });
    return;
  }
  const token = header.slice(7);
  try {
    const decoded = jwt.verify(token, SECURITY_CONFIG.jwtSecret) as AuthPayload;
    const user = await findUserById(decoded.sub);
    if (!user) {
      res.status(HTTP_STATUS.unauthorized).json({ error: MESSAGE_CONFIG.unauthorized });
      return;
    }
    req.auth = { userId: user.id, role: user.role };
    next();
  } catch {
    res.status(HTTP_STATUS.unauthorized).json({ error: MESSAGE_CONFIG.unauthorized });
  }
}

export const authMiddleware = asyncHandler(authMiddlewareImpl);

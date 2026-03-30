import type { NextFunction, Request, Response } from 'express';
import { HTTP_STATUS, MESSAGE_CONFIG, ROLE_CONFIG } from '../../Constants/variable.constant';
import type { UserRole } from '../../Constants/types.constant';

export function requireRoles(...roles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.auth) {
      res.status(HTTP_STATUS.unauthorized).json({ error: MESSAGE_CONFIG.unauthorized });
      return;
    }
    if (!roles.includes(req.auth.role)) {
      res.status(HTTP_STATUS.forbidden).json({ error: MESSAGE_CONFIG.forbidden });
      return;
    }
    next();
  };
}

export const requireAdmin = requireRoles(ROLE_CONFIG.admin);

export const requireBusinessUser = requireRoles(ROLE_CONFIG.entreprise, ROLE_CONFIG.etudiant);

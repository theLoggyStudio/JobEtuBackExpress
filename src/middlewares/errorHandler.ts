import type { NextFunction, Request, Response } from 'express';
import { ForeignKeyConstraintError, ValidationError as SequelizeValidationError } from 'sequelize';
import { ZodError } from 'zod';
import { HTTP_STATUS, MESSAGE_CONFIG } from '../../Constants/variable.constant';

const SUBMISSION_FK_HINT =
  'Soumission impossible : le formulaire ou le compte ne correspond pas à la base (rechargez la page ou reconnectez-vous).';

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction): void {
  if (err instanceof ZodError) {
    res.status(HTTP_STATUS.badRequest).json({
      error: MESSAGE_CONFIG.validationError,
      details: err.flatten(),
    });
    return;
  }
  if (err instanceof SequelizeValidationError) {
    res.status(HTTP_STATUS.badRequest).json({
      error: MESSAGE_CONFIG.validationError,
      details: err.errors.map((e) => ({ path: e.path, message: e.message })),
    });
    return;
  }
  if (err instanceof ForeignKeyConstraintError) {
    res.status(HTTP_STATUS.badRequest).json({ error: SUBMISSION_FK_HINT });
    return;
  }
  const pgCode =
    err && typeof err === 'object' && 'parent' in err
      ? (err as { parent?: { code?: string } }).parent?.code
      : undefined;
  if (pgCode === '23503') {
    res.status(HTTP_STATUS.badRequest).json({ error: SUBMISSION_FK_HINT });
    return;
  }
  const message = err instanceof Error ? err.message : MESSAGE_CONFIG.validationError;
  const status =
    message === MESSAGE_CONFIG.unauthorized
      ? HTTP_STATUS.unauthorized
      : message === MESSAGE_CONFIG.forbidden
        ? HTTP_STATUS.forbidden
        : message === MESSAGE_CONFIG.notFound
          ? HTTP_STATUS.notFound
          : HTTP_STATUS.serverError;
  res.status(status).json({ error: message });
}

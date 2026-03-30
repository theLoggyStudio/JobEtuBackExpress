import type { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';
import { HTTP_STATUS, MESSAGE_CONFIG } from '../../Constants/variable.constant';

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction): void {
  if (err instanceof ZodError) {
    res.status(HTTP_STATUS.badRequest).json({
      error: MESSAGE_CONFIG.validationError,
      details: err.flatten(),
    });
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

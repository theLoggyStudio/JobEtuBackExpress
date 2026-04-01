import type { Request } from 'express';
import rateLimit from 'express-rate-limit';
import { SECURITY_CONFIG } from '../../Constants/variable.constant';

/**
 * Sur Vercel (serverless), `req.ip` est souvent `undefined` : express-rate-limit v7 lève alors
 * ERR_ERL_UNDEFINED_IP_ADDRESS et toute la fonction plante (500 FUNCTION_INVOCATION_FAILED).
 * @see https://github.com/express-rate-limit/express-rate-limit/wiki/Error-Codes#err_erl_undefined_ip_address
 */
function rateLimitKey(req: Request): string {
  const xff = req.headers['x-forwarded-for'];
  const fromHeader = typeof xff === 'string' ? xff.split(',')[0]?.trim() : '';
  const ip = typeof req.ip === 'string' && req.ip.length > 0 ? req.ip : fromHeader;
  return ip.length > 0 ? ip : 'unknown';
}

const vercelSafeRateLimitValidate = {
  ip: false,
  xForwardedForHeader: false,
} as const;

export const globalLimiter = rateLimit({
  windowMs: SECURITY_CONFIG.rateLimitWindowMs,
  max: SECURITY_CONFIG.rateLimitMax,
  standardHeaders: true,
  legacyHeaders: false,
  validate: vercelSafeRateLimitValidate,
  keyGenerator: (req) => rateLimitKey(req),
  /** PayDunya envoie des IPN en rafale ; ne pas bloquer le webhook. */
  skip: (req) => req.path.includes('/webhooks/paydunya'),
});

export const authLimiter = rateLimit({
  windowMs: SECURITY_CONFIG.rateLimitWindowMs,
  max: SECURITY_CONFIG.authRateLimitMax,
  standardHeaders: true,
  legacyHeaders: false,
  validate: vercelSafeRateLimitValidate,
  keyGenerator: (req) => rateLimitKey(req),
});

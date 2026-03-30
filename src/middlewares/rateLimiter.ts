import rateLimit from 'express-rate-limit';
import { SECURITY_CONFIG } from '../../Constants/variable.constant';

export const globalLimiter = rateLimit({
  windowMs: SECURITY_CONFIG.rateLimitWindowMs,
  max: SECURITY_CONFIG.rateLimitMax,
  standardHeaders: true,
  legacyHeaders: false,
  /** PayDunya envoie des IPN en rafale ; ne pas bloquer le webhook. */
  skip: (req) => req.path.includes('/webhooks/paydunya'),
});

export const authLimiter = rateLimit({
  windowMs: SECURITY_CONFIG.rateLimitWindowMs,
  max: SECURITY_CONFIG.authRateLimitMax,
  standardHeaders: true,
  legacyHeaders: false,
});

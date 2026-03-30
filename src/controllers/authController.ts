import type { Request, Response } from 'express';
import { z } from 'zod';
import { BUSINESS_RULES, HTTP_STATUS, MESSAGE_CONFIG, ROLE_CONFIG } from '../../Constants/variable.constant';
import {
  deleteAuthenticatedUserAccount,
  loginUser,
  registerAdminUser,
  registerUser,
  updateAuthenticatedUserProfile,
  userPublic,
} from '../services/authService';
import { findUserById } from '../repositories/userRepository';
import { unwrapEncryptedPasswordFields } from '../utils/clientPayloadCrypto';

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  displayName: z.string().min(1).max(200),
  role: z.enum([ROLE_CONFIG.entreprise, ROLE_CONFIG.etudiant]),
  phone: z.string().max(BUSINESS_RULES.maxPhoneLength).optional(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const registerAdminSchema = z.object({
  email: z.string().email(),
  password: z.string().min(BUSINESS_RULES.minPasswordLength),
  displayName: z.string().min(1).max(200),
  phone: z.string().max(BUSINESS_RULES.maxPhoneLength).optional(),
});

const patchMeSchema = z.object({
  currentPassword: z.string().min(1),
  displayName: z.string().min(1).max(200).optional(),
  phone: z.union([z.string().max(BUSINESS_RULES.maxPhoneLength), z.null()]).optional(),
  email: z.string().email().optional(),
  newPassword: z.string().min(BUSINESS_RULES.minPasswordLength).optional(),
});

const deleteMeSchema = z.object({
  currentPassword: z.string().min(1),
});

function mapCryptoBodyError(res: Response, msg: string): boolean {
  if (msg === 'CLIENT_PAYLOAD_AES_KEY_MISSING') {
    res.status(HTTP_STATUS.serverError).json({ error: MESSAGE_CONFIG.clientPayloadKeyMissing });
    return true;
  }
  if (msg === 'CLIENT_PAYLOAD_DECRYPT_FAILED') {
    res.status(HTTP_STATUS.badRequest).json({ error: MESSAGE_CONFIG.clientPayloadDecryptFailed });
    return true;
  }
  return false;
}

export async function register(req: Request, res: Response): Promise<void> {
  let rawBody: unknown = req.body;
  try {
    rawBody = unwrapEncryptedPasswordFields(req.body);
  } catch (e) {
    const m = e instanceof Error ? e.message : '';
    if (mapCryptoBodyError(res, m)) return;
    throw e;
  }
  const parsed = registerSchema.parse(rawBody);
  const phone = parsed.phone?.trim() ? parsed.phone.trim() : null;
  const input = { ...parsed, phone };
  try {
    const { user, token } = await registerUser(input);
    res.status(HTTP_STATUS.created).json({ user: userPublic(user), token });
  } catch (e) {
    const msg = e instanceof Error ? e.message : MESSAGE_CONFIG.validationError;
    if (msg === MESSAGE_CONFIG.emailTaken) {
      res.status(HTTP_STATUS.conflict).json({ error: msg });
      return;
    }
    if (msg === MESSAGE_CONFIG.adminRegisterForbidden) {
      res.status(HTTP_STATUS.forbidden).json({ error: msg });
      return;
    }
    res.status(HTTP_STATUS.badRequest).json({ error: msg });
  }
}

export async function registerAdmin(req: Request, res: Response): Promise<void> {
  let rawBody: unknown = req.body;
  try {
    rawBody = unwrapEncryptedPasswordFields(req.body);
  } catch (e) {
    const m = e instanceof Error ? e.message : '';
    if (mapCryptoBodyError(res, m)) return;
    throw e;
  }
  const parsed = registerAdminSchema.parse(rawBody);
  const phone = parsed.phone?.trim() ? parsed.phone.trim() : null;
  try {
    const user = await registerAdminUser({ ...parsed, phone });
    res.status(HTTP_STATUS.created).json({ user: userPublic(user) });
  } catch (e) {
    const msg = e instanceof Error ? e.message : MESSAGE_CONFIG.validationError;
    if (msg === MESSAGE_CONFIG.emailTaken) {
      res.status(HTTP_STATUS.conflict).json({ error: msg });
      return;
    }
    res.status(HTTP_STATUS.badRequest).json({ error: msg });
  }
}

export async function login(req: Request, res: Response): Promise<void> {
  let rawBody: unknown = req.body;
  try {
    rawBody = unwrapEncryptedPasswordFields(req.body);
  } catch (e) {
    const m = e instanceof Error ? e.message : '';
    if (mapCryptoBodyError(res, m)) return;
    throw e;
  }
  const body = loginSchema.parse(rawBody);
  try {
    const { user, token } = await loginUser(body.email, body.password);
    res.json({ user: userPublic(user), token });
  } catch {
    res.status(HTTP_STATUS.unauthorized).json({ error: MESSAGE_CONFIG.invalidCredentials });
  }
}

export async function me(req: Request, res: Response): Promise<void> {
  if (!req.auth) {
    res.status(HTTP_STATUS.unauthorized).json({ error: MESSAGE_CONFIG.unauthorized });
    return;
  }
  const user = await findUserById(req.auth.userId);
  if (!user) {
    res.status(HTTP_STATUS.unauthorized).json({ error: MESSAGE_CONFIG.unauthorized });
    return;
  }
  res.json({ user: userPublic(user) });
}

function mapProfileError(res: Response, msg: string): boolean {
  if (msg === MESSAGE_CONFIG.wrongCurrentPassword) {
    res.status(HTTP_STATUS.unauthorized).json({ error: msg });
    return true;
  }
  if (msg === MESSAGE_CONFIG.profileNothingToUpdate) {
    res.status(HTTP_STATUS.badRequest).json({ error: msg });
    return true;
  }
  if (msg === MESSAGE_CONFIG.emailTaken) {
    res.status(HTTP_STATUS.conflict).json({ error: msg });
    return true;
  }
  if (msg === MESSAGE_CONFIG.validationError) {
    res.status(HTTP_STATUS.badRequest).json({ error: msg });
    return true;
  }
  if (msg === MESSAGE_CONFIG.unauthorized) {
    res.status(HTTP_STATUS.unauthorized).json({ error: msg });
    return true;
  }
  if (msg === MESSAGE_CONFIG.lastAdminCannotDelete) {
    res.status(HTTP_STATUS.forbidden).json({ error: msg });
    return true;
  }
  return false;
}

export async function patchMe(req: Request, res: Response): Promise<void> {
  if (!req.auth) {
    res.status(HTTP_STATUS.unauthorized).json({ error: MESSAGE_CONFIG.unauthorized });
    return;
  }
  let rawBody: unknown = req.body;
  try {
    rawBody = unwrapEncryptedPasswordFields(req.body);
  } catch (e) {
    const m = e instanceof Error ? e.message : '';
    if (mapCryptoBodyError(res, m)) return;
    throw e;
  }
  const parsed = patchMeSchema.parse(rawBody);
  try {
    const user = await updateAuthenticatedUserProfile(req.auth.userId, parsed.currentPassword, {
      displayName: parsed.displayName,
      phone: parsed.phone,
      email: parsed.email,
      newPassword: parsed.newPassword,
    });
    res.json({ user: userPublic(user) });
  } catch (e) {
    const msg = e instanceof Error ? e.message : MESSAGE_CONFIG.validationError;
    if (mapProfileError(res, msg)) return;
    res.status(HTTP_STATUS.badRequest).json({ error: msg });
  }
}

export async function deleteMe(req: Request, res: Response): Promise<void> {
  if (!req.auth) {
    res.status(HTTP_STATUS.unauthorized).json({ error: MESSAGE_CONFIG.unauthorized });
    return;
  }
  let rawBody: unknown = req.body;
  try {
    rawBody = unwrapEncryptedPasswordFields(req.body);
  } catch (e) {
    const m = e instanceof Error ? e.message : '';
    if (mapCryptoBodyError(res, m)) return;
    throw e;
  }
  const parsed = deleteMeSchema.parse(rawBody);
  try {
    await deleteAuthenticatedUserAccount(req.auth.userId, parsed.currentPassword);
    res.status(204).send();
  } catch (e) {
    const msg = e instanceof Error ? e.message : MESSAGE_CONFIG.validationError;
    if (mapProfileError(res, msg)) return;
    res.status(HTTP_STATUS.badRequest).json({ error: msg });
  }
}

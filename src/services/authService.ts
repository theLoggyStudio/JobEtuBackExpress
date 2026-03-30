import bcrypt from 'bcryptjs';
import jwt, { type SignOptions } from 'jsonwebtoken';
import { BUSINESS_RULES, MESSAGE_CONFIG, ROLE_CONFIG, SECURITY_CONFIG } from '../../Constants/variable.constant';
import type { UserRole } from '../../Constants/types.constant';
import type { UserEntity } from '../repositories/entities';
import {
  createUser,
  deleteUserAccount,
  findUserByEmail,
  findUserById,
  updateUserById,
} from '../repositories/userRepository';

export function signToken(userId: string, role: UserRole): string {
  const secret = SECURITY_CONFIG.jwtSecret;
  const options: SignOptions = { expiresIn: SECURITY_CONFIG.jwtExpiresIn as SignOptions['expiresIn'] };
  return jwt.sign({ sub: userId, role }, secret, options);
}

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, SECURITY_CONFIG.bcryptRounds);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

export async function registerUser(input: {
  email: string;
  password: string;
  displayName: string;
  role: UserRole;
  phone: string | null;
}): Promise<{ user: UserEntity; token: string }> {
  if (input.role === ROLE_CONFIG.admin) {
    throw new Error(MESSAGE_CONFIG.adminRegisterForbidden);
  }
  if (input.password.length < BUSINESS_RULES.minPasswordLength) {
    throw new Error(MESSAGE_CONFIG.validationError);
  }
  const existing = await findUserByEmail(input.email);
  if (existing) {
    throw new Error(MESSAGE_CONFIG.emailTaken);
  }
  const passwordHash = await hashPassword(input.password);
  const user = await createUser({
    email: input.email.toLowerCase(),
    passwordHash,
    role: input.role,
    displayName: input.displayName,
    phone: input.phone,
  });
  return { user, token: signToken(user.id, user.role) };
}

/** Réservé à un appelant déjà authentifié en tant qu’admin (route protégée). */
export async function registerAdminUser(input: {
  email: string;
  password: string;
  displayName: string;
  phone: string | null;
}): Promise<UserEntity> {
  if (input.password.length < BUSINESS_RULES.minPasswordLength) {
    throw new Error(MESSAGE_CONFIG.validationError);
  }
  const existing = await findUserByEmail(input.email);
  if (existing) {
    throw new Error(MESSAGE_CONFIG.emailTaken);
  }
  const passwordHash = await hashPassword(input.password);
  return createUser({
    email: input.email.toLowerCase(),
    passwordHash,
    role: ROLE_CONFIG.admin,
    displayName: input.displayName,
    phone: input.phone,
  });
}

export async function loginUser(email: string, password: string): Promise<{ user: UserEntity; token: string }> {
  const user = await findUserByEmail(email);
  if (!user) {
    throw new Error(MESSAGE_CONFIG.invalidCredentials);
  }
  const ok = await verifyPassword(password, user.passwordHash);
  if (!ok) {
    throw new Error(MESSAGE_CONFIG.invalidCredentials);
  }
  return { user, token: signToken(user.id, user.role) };
}

export function userPublic(user: UserEntity) {
  return {
    id: user.id,
    email: user.email,
    role: user.role,
    displayName: user.displayName,
    phone: user.phone,
  };
}

export async function updateAuthenticatedUserProfile(
  userId: string,
  currentPassword: string,
  body: {
    displayName?: string;
    phone?: string | null;
    email?: string;
    newPassword?: string;
  }
): Promise<UserEntity> {
  const user = await findUserById(userId);
  if (!user) {
    throw new Error(MESSAGE_CONFIG.unauthorized);
  }
  const ok = await verifyPassword(currentPassword, user.passwordHash);
  if (!ok) {
    throw new Error(MESSAGE_CONFIG.wrongCurrentPassword);
  }

  const hasChange =
    body.displayName !== undefined ||
    body.phone !== undefined ||
    body.email !== undefined ||
    (body.newPassword != null && body.newPassword.length > 0);
  if (!hasChange) {
    throw new Error(MESSAGE_CONFIG.profileNothingToUpdate);
  }

  const patch: Parameters<typeof updateUserById>[1] = {};
  if (body.displayName !== undefined) {
    patch.displayName = body.displayName.trim() || null;
  }
  if (body.phone !== undefined) {
    const p = body.phone;
    patch.phone = p === null || (typeof p === 'string' && p.trim() === '') ? null : String(p).trim();
  }
  if (body.email !== undefined) {
    const e = body.email.toLowerCase().trim();
    const taken = await findUserByEmail(e);
    if (taken && taken.id !== userId) {
      throw new Error(MESSAGE_CONFIG.emailTaken);
    }
    patch.email = e;
  }
  if (body.newPassword != null && body.newPassword.length > 0) {
    if (body.newPassword.length < BUSINESS_RULES.minPasswordLength) {
      throw new Error(MESSAGE_CONFIG.validationError);
    }
    patch.passwordHash = await hashPassword(body.newPassword);
  }

  const updated = await updateUserById(userId, patch);
  if (!updated) {
    throw new Error(MESSAGE_CONFIG.unauthorized);
  }
  return updated;
}

export async function deleteAuthenticatedUserAccount(
  userId: string,
  currentPassword: string
): Promise<void> {
  const user = await findUserById(userId);
  if (!user) {
    throw new Error(MESSAGE_CONFIG.unauthorized);
  }
  const ok = await verifyPassword(currentPassword, user.passwordHash);
  if (!ok) {
    throw new Error(MESSAGE_CONFIG.wrongCurrentPassword);
  }

  const result = await deleteUserAccount(userId);
  if (result === 'not_found') {
    throw new Error(MESSAGE_CONFIG.unauthorized);
  }
  if (result === 'last_admin') {
    throw new Error(MESSAGE_CONFIG.lastAdminCannotDelete);
  }
}

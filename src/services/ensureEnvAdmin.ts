import { appEnvOrDefault } from '../../Constants/envResolve';
import { TEST_DEFAULT_ADMIN_CONFIG } from '../../Constants/mode.constant';
import { BUSINESS_RULES, ROLE_CONFIG, usesJsonStylePersistence } from '../../Constants/variable.constant';
import { sequelize } from '../config/database';
import { createUser, findUserByEmail, updateUserById } from '../repositories/userRepository';
import { hashPassword } from './authService';

/**
 * Crée ou met à jour le compte `ADMIN_EMAIL` : rôle admin + mot de passe = `ADMIN_PASSWORD`
 * (mêmes sources que `seed:admin`, défauts test si variables absentes).
 * Permet de se connecter sans exécuter le script seed sur Vercel.
 *
 * Si `ADMIN_PASSWORD` est plus court que `BUSINESS_RULES.minPasswordLength`, l’opération est ignorée (log).
 */
export async function ensureEnvAdminUser(): Promise<void> {
  const emailRaw = appEnvOrDefault('ADMIN_EMAIL', TEST_DEFAULT_ADMIN_CONFIG.email);
  const password = appEnvOrDefault('ADMIN_PASSWORD', TEST_DEFAULT_ADMIN_CONFIG.password);
  const email = emailRaw.trim().toLowerCase();
  if (!email) {
    return;
  }
  if (password.length < BUSINESS_RULES.minPasswordLength) {
    console.warn(
      `[JobEtu] ADMIN_PASSWORD trop court (< ${BUSINESS_RULES.minPasswordLength}) — compte admin auto ignoré.`
    );
    return;
  }

  const passwordHash = await hashPassword(password);

  if (usesJsonStylePersistence()) {
    const existing = await findUserByEmail(email);
    if (!existing) {
      await createUser({
        email,
        passwordHash,
        role: ROLE_CONFIG.admin,
        displayName: 'Administrateur',
        phone: null,
      });
      return;
    }
    await updateUserById(existing.id, {
      passwordHash,
      role: ROLE_CONFIG.admin,
    });
    return;
  }

  if (!sequelize) {
    return;
  }

  const existing = await findUserByEmail(email);
  if (!existing) {
    await createUser({
      email,
      passwordHash,
      role: ROLE_CONFIG.admin,
      displayName: 'Administrateur',
      phone: null,
    });
    return;
  }

  await updateUserById(existing.id, {
    passwordHash,
    role: ROLE_CONFIG.admin,
  });
}

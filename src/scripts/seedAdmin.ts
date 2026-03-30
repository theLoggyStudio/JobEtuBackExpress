import '../config/loadEnv';
import { randomUUID } from 'node:crypto';
import bcrypt from 'bcryptjs';
import { appEnvOrDefault } from '../../Constants/envResolve';
import { TEST_DEFAULT_ADMIN_CONFIG } from '../../Constants/mode.constant';
import {
  ROLE_CONFIG,
  SECURITY_CONFIG,
  SERVER_CONFIG,
  usesJsonStylePersistence,
} from '../../Constants/variable.constant';
import { sequelize, User } from '../models';
import { loadJsonStore, withJsonStore } from '../repositories/json/jsonDb';

async function run(): Promise<void> {
  const email = appEnvOrDefault('ADMIN_EMAIL', TEST_DEFAULT_ADMIN_CONFIG.email);
  const password = appEnvOrDefault('ADMIN_PASSWORD', TEST_DEFAULT_ADMIN_CONFIG.password);

  if (usesJsonStylePersistence()) {
    const existing = loadJsonStore().users.some((u) => u.email === email.toLowerCase());
    if (existing) {
      console.log('Admin déjà présent (JSON / mémoire):', email);
      return;
    }
    const passwordHash = await bcrypt.hash(password, SECURITY_CONFIG.bcryptRounds);
    const now = new Date();
    withJsonStore((store) => {
      store.users.push({
        id: randomUUID(),
        email: email.toLowerCase(),
        passwordHash,
        role: ROLE_CONFIG.admin,
        displayName: 'Administrateur',
        phone: null,
        location: null,
        paymentMetadata: null,
        createdAt: now,
        updatedAt: now,
      });
    });
    console.log('Admin créé (JSON / mémoire):', email);
    return;
  }

  if (!sequelize) {
    console.error(
      'Sequelize non initialisé — vérifiez STORAGE_DRIVER=postgres et une URL (DATABASE_URL / POSTGRES_URL / POSTGRES_*).'
    );
    process.exit(1);
  }
  await sequelize.sync({ alter: true });
  const existing = await User.findOne({ where: { email: email.toLowerCase() } });
  if (existing) {
    console.log('Admin déjà présent:', email);
    await sequelize.close();
    return;
  }
  const passwordHash = await bcrypt.hash(password, SECURITY_CONFIG.bcryptRounds);
  await User.create({
    email: email.toLowerCase(),
    passwordHash,
    role: ROLE_CONFIG.admin,
    displayName: 'Administrateur',
  });
  console.log('Admin créé:', email);
  await sequelize.close();
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});

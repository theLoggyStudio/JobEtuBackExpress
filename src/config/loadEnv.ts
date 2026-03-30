import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { config } from 'dotenv';
import { MODE_CONFIG } from '../../Constants/mode.constant';

/**
 * Charge `.env.test` ou `.env.prod` selon `MODE_CONFIG.current` (racine du projet, `process.cwd()`).
 * Ne remplace pas une variable déjà définie (ex. injectée par Vercel / le système).
 * Si le fichier est absent, aucune erreur (déploiement piloté uniquement par les variables de plateforme).
 */
function loadAppEnvFiles(): void {
  const fileName = MODE_CONFIG.current === 'production' ? '.env.prod' : '.env.test';
  const envPath = resolve(process.cwd(), fileName);
  if (existsSync(envPath)) {
    config({ path: envPath });
  }
}

loadAppEnvFiles();

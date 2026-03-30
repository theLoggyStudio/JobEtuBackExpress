/**
 * Mode d’exécution de l’API.
 * Modifiez `current` pour refléter test vs production.
 * - **production** : seules les variables d’environnement **sans** suffixe `_TEST`.
 * - **test** : pour chaque clé `FOO`, lecture de `FOO_TEST` puis repli sur `FOO`.
 * `STORAGE_DRIVER` / `STORAGE_DRIVER_TEST` : voir `variable.constant.ts`. Sans valeur en test, défaut = mémoire (RAM).
 */
export type AppMode = 'test' | 'production';

/** Modifiez `current` : `'test'` ou `'production'`. */
export const MODE_CONFIG: { current: AppMode } = {
  current: 'production',
};

export const isTestMode = MODE_CONFIG.current === 'test';
export const isProductionMode = MODE_CONFIG.current === 'production';

/**
 * Admin par défaut des données initiales (store mémoire / JSON) et valeurs par défaut de `seed:admin`
 * lorsque `ADMIN_EMAIL` / `ADMIN_PASSWORD` ne sont pas définis dans `.env`.
 * Mot de passe en clair : réservé au développement et aux tests uniquement.
 */
export const TEST_DEFAULT_ADMIN_CONFIG = {
  id: '00000000-0000-4000-8000-000000000001',
  email: 'admin@jobetu.local',
  password: 'AdminJobEtu!2026',
  displayName: 'Administrateur (test)',
} as const;

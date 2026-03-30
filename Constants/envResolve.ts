import { MODE_CONFIG } from './mode.constant';

/**
 * `MODE_CONFIG.current === 'production'` : uniquement les variables sans suffixe `_TEST`
 * (fichier `.env.prod` via `src/config/loadEnv.ts`).
 * Mode test : `FOO_TEST` puis `FOO` (fichier `.env.test`).
 */
export function isProductionAppMode(): boolean {
  return MODE_CONFIG.current === 'production';
}

function trimRaw(v: string | undefined): string | undefined {
  if (v === undefined) return undefined;
  const t = v.trim();
  return t === '' ? undefined : t;
}

/**
 * Mode **production** : lit uniquement `name`.
 * Mode **test** : `name_TEST` puis repli sur `name`.
 */
export function appEnv(name: string): string | undefined {
  if (isProductionAppMode()) {
    return trimRaw(process.env[name]);
  }
  return trimRaw(process.env[`${name}_TEST`]) ?? trimRaw(process.env[name]);
}

export function appEnvOrDefault(name: string, defaultValue: string): string {
  return appEnv(name) ?? defaultValue;
}

export function appEnvBool(name: string): boolean {
  return appEnv(name) === 'true';
}

export function appEnvPositiveInt(name: string, defaultValue: number): number {
  const raw = appEnv(name);
  if (!raw) return defaultValue;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : defaultValue;
}

export function appEnvInt(name: string, defaultValue: number): number {
  const raw = appEnv(name);
  if (!raw) return defaultValue;
  const n = Number(raw);
  return Number.isFinite(n) ? n : defaultValue;
}

/**
 * PayDunya — clés et réglages.
 * Variables d’environnement : voir `.env.example`. Ne committez jamais les vraies clés.
 *
 * Mode **test** (app, `MODE_CONFIG`) : chaque variable existe aussi en `*_TEST` (prioritaire).
 * Mode **production** : uniquement les variables sans `_TEST`.
 *
 * `PAYDUNYA_TEST_*` / `PAYDUNYA_LIVE_*` : clés API PayDunya (sandbox vs live), distinctes du suffixe `_TEST` app.
 */
import { appEnv } from './envResolve';
import { APP_CONFIG } from './variable.constant';

export type PaydunyaMode = 'test' | 'live';

function resolveMode(): PaydunyaMode {
  const raw = appEnv('PAYDUNYA_MODE');
  return raw === 'live' ? 'live' : 'test';
}

const paydunyaMode = resolveMode();

function envPay(key: string): string {
  return appEnv(key) ?? '';
}

const privateKeyForMode =
  paydunyaMode === 'live'
    ? envPay('PAYDUNYA_LIVE_PRIVATE_KEY') || envPay('PAYDUNYA_PRIVATE_KEY')
    : envPay('PAYDUNYA_TEST_PRIVATE_KEY') || envPay('PAYDUNYA_PRIVATE_KEY');

const publicKeyForMode =
  paydunyaMode === 'live'
    ? envPay('PAYDUNYA_LIVE_PUBLIC_KEY') || envPay('PAYDUNYA_PUBLIC_KEY')
    : envPay('PAYDUNYA_TEST_PUBLIC_KEY') || envPay('PAYDUNYA_PUBLIC_KEY');

const tokenForMode =
  paydunyaMode === 'live'
    ? envPay('PAYDUNYA_LIVE_TOKEN') || envPay('PAYDUNYA_TOKEN')
    : envPay('PAYDUNYA_TEST_TOKEN') || envPay('PAYDUNYA_TOKEN');

export const PAYDUNYA_CONFIG = {
  /** Clé principale (Master Key) — sert aussi à vérifier le hash des IPN / réponses confirm. */
  masterKey: envPay('PAYDUNYA_MASTER_KEY'),
  privateKey: privateKeyForMode,
  /** Clé publique (PSR / SoftPay ; le checkout PAR utilise surtout private + token). */
  publicKey: publicKeyForMode,
  token: tokenForMode,
  mode: paydunyaMode,
  /** Montant FCFA pour la soumission d’un questionnaire après paiement. */
  submissionAmountFcfa: (() => {
    const n = Number(appEnv('PAYDUNYA_SUBMISSION_AMOUNT'));
    return Number.isFinite(n) && n > 0 ? n : 2500;
  })(),
  /** Nom affiché sur la page de paiement PayDunya. */
  storeName: appEnv('PAYDUNYA_STORE_NAME')?.trim() || 'JobEtu',
  /** Origine du front (sans slash final) — return_url / cancel_url. */
  frontendBaseUrl: (appEnv('FRONTEND_APP_URL') ?? 'http://localhost:5173').replace(/\/$/, ''),
  /**
   * URL publique de l’API (sans slash final) — sert au `callback_url` par défaut si `PAYDUNYA_CALLBACK_URL` est vide.
   * Ex. https://api.mondomaine.sn ou tunnel ngrok en dev.
   */
  apiPublicBaseUrl: (appEnv('API_PUBLIC_URL') ?? 'http://localhost:4000').replace(/\/$/, ''),
} as const;

/**
 * URL complète IPN (`callback_url` facture PayDunya).
 * Définir `PAYDUNYA_CALLBACK_URL` pour pointer vers le front (ex. `/paydunia/hasPaied` + proxy Vercel vers l’API).
 * Sinon : `{API_PUBLIC_URL}{apiPrefix}/webhooks/paydunya`.
 */
export function getPaydunyaIpnCallbackUrl(): string {
  const custom = appEnv('PAYDUNYA_CALLBACK_URL')?.trim().replace(/\/$/, '');
  if (custom) return custom;
  return `${PAYDUNYA_CONFIG.apiPublicBaseUrl}${APP_CONFIG.apiPrefix}/webhooks/paydunya`;
}

export function isPaydunyaConfigured(): boolean {
  const c = PAYDUNYA_CONFIG;
  return Boolean(c.masterKey && c.privateKey && c.token);
}

export function getPaydunyaCheckoutCreateUrl(): string {
  const base =
    PAYDUNYA_CONFIG.mode === 'live'
      ? 'https://app.paydunya.com/api/v1'
      : 'https://app.paydunya.com/sandbox-api/v1';
  return `${base}/checkout-invoice/create`;
}

export function getPaydunyaCheckoutConfirmUrl(invoiceToken: string): string {
  const base =
    PAYDUNYA_CONFIG.mode === 'live'
      ? 'https://app.paydunya.com/api/v1'
      : 'https://app.paydunya.com/sandbox-api/v1';
  return `${base}/checkout-invoice/confirm/${encodeURIComponent(invoiceToken)}`;
}

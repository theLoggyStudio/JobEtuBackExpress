/**
 * PayDunya — clés et réglages.
 * Renseignez les variables d’environnement (voir `.env.example`) ; ne committez jamais les vraies clés.
 *
 * Mode `test` : `PAYDUNYA_TEST_*` (+ secours `PAYDUNYA_PRIVATE_KEY` / `PAYDUNYA_PUBLIC_KEY` / `PAYDUNYA_TOKEN`).
 * Mode `live` : `PAYDUNYA_LIVE_*` (+ mêmes secours).
 */
export type PaydunyaMode = 'test' | 'live';

function resolveMode(): PaydunyaMode {
  return process.env.PAYDUNYA_MODE === 'live' ? 'live' : 'test';
}

const paydunyaMode = resolveMode();

function envTrim(key: string): string {
  return process.env[key]?.trim() ?? '';
}

const privateKeyForMode =
  paydunyaMode === 'live'
    ? envTrim('PAYDUNYA_LIVE_PRIVATE_KEY') || envTrim('PAYDUNYA_PRIVATE_KEY')
    : envTrim('PAYDUNYA_TEST_PRIVATE_KEY') || envTrim('PAYDUNYA_PRIVATE_KEY');

const publicKeyForMode =
  paydunyaMode === 'live'
    ? envTrim('PAYDUNYA_LIVE_PUBLIC_KEY') || envTrim('PAYDUNYA_PUBLIC_KEY')
    : envTrim('PAYDUNYA_TEST_PPUBLIC_KEY') || envTrim('PAYDUNYA_PUBLIC_KEY');

const tokenForMode =
  paydunyaMode === 'live'
    ? envTrim('PAYDUNYA_LIVE_TOKEN') || envTrim('PAYDUNYA_TOKEN')
    : envTrim('PAYDUNYA_TEST_PTOKEN') || envTrim('PAYDUNYA_TOKEN');

export const PAYDUNYA_CONFIG = {
  /** Clé principale (Master Key) — sert aussi à vérifier le hash des IPN / réponses confirm. */
  masterKey: envTrim('PAYDUNYA_MASTER_KEY'),
  privateKey: privateKeyForMode,
  /** Clé publique (PSR / SoftPay ; le checkout PAR utilise surtout private + token). */
  publicKey: publicKeyForMode,
  token: tokenForMode,
  mode: paydunyaMode,
  /** Montant FCFA pour la soumission d’un questionnaire après paiement. */
  submissionAmountFcfa: Number(process.env.PAYDUNYA_SUBMISSION_AMOUNT) > 0
    ? Number(process.env.PAYDUNYA_SUBMISSION_AMOUNT)
    : 2500,
  /** Nom affiché sur la page de paiement PayDunya. */
  storeName: process.env.PAYDUNYA_STORE_NAME?.trim() || 'JobEtu',
  /** Origine du front (sans slash final) — return_url / cancel_url. */
  frontendBaseUrl: process.env.FRONTEND_APP_URL?.replace(/\/$/, '') || 'http://localhost:5173',
  /**
   * URL publique de l’API (sans slash final) — callback IPN PayDunya.
   * Ex. https://api.mondomaine.sn ou tunnel ngrok en dev.
   */
  apiPublicBaseUrl: process.env.API_PUBLIC_URL?.replace(/\/$/, '') || 'http://localhost:4000',
} as const;

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

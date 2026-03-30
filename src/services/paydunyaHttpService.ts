import { createHash } from 'node:crypto';
import {
  PAYDUNYA_CONFIG,
  getPaydunyaCheckoutConfirmUrl,
  getPaydunyaCheckoutCreateUrl,
  getPaydunyaIpnCallbackUrl,
  isPaydunyaConfigured,
} from '../../Constants/paydunya.constant';

export type PaydunyaCreateResult = { checkoutUrl: string; invoiceToken: string };

type CreateApiResponse = {
  response_code: string;
  response_text: string;
  token?: string;
};

export type PaydunyaConfirmPayload = {
  response_code: string;
  response_text: string;
  hash?: string;
  status?: string;
  custom_data?: Record<string, string | number | undefined>;
  invoice?: { token?: string; total_amount?: number | string };
};

function paydunyaHeaders(): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    'PAYDUNYA-MASTER-KEY': PAYDUNYA_CONFIG.masterKey,
    'PAYDUNYA-PRIVATE-KEY': PAYDUNYA_CONFIG.privateKey,
    'PAYDUNYA-TOKEN': PAYDUNYA_CONFIG.token,
  };
}

export async function createCheckoutInvoiceForSubmission(input: {
  sessionId: string;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  cancelUrl: string;
}): Promise<PaydunyaCreateResult> {
  if (!isPaydunyaConfigured()) {
    throw new Error('PAYDUNYA_NOT_CONFIGURED');
  }
  const amount = PAYDUNYA_CONFIG.submissionAmountFcfa;
  const returnUrl = `${PAYDUNYA_CONFIG.frontendBaseUrl}/paiement/soumission/${input.sessionId}`;
  const callbackUrl = getPaydunyaIpnCallbackUrl();

  const body = {
    invoice: {
      total_amount: amount,
      description: `Soumission questionnaire JobEtu — ${amount} FCFA`,
      customer: {
        name: input.customerName,
        email: input.customerEmail,
        phone: input.customerPhone ?? '',
      },
    },
    store: {
      name: PAYDUNYA_CONFIG.storeName,
    },
    custom_data: {
      sessionId: input.sessionId,
    },
    actions: {
      return_url: returnUrl,
      cancel_url: input.cancelUrl,
      callback_url: callbackUrl,
    },
  };

  const res = await fetch(getPaydunyaCheckoutCreateUrl(), {
    method: 'POST',
    headers: paydunyaHeaders(),
    body: JSON.stringify(body),
  });
  const json = (await res.json()) as CreateApiResponse;
  if (json.response_code !== '00' || !json.token || !json.response_text?.startsWith('http')) {
    throw new Error(`PAYDUNYA_CREATE_FAILED:${json.response_text ?? json.response_code}`);
  }
  return { checkoutUrl: json.response_text, invoiceToken: json.token };
}

export async function confirmCheckoutInvoice(invoiceToken: string): Promise<PaydunyaConfirmPayload> {
  if (!isPaydunyaConfigured()) {
    throw new Error('PAYDUNYA_NOT_CONFIGURED');
  }
  const url = getPaydunyaCheckoutConfirmUrl(invoiceToken);
  const res = await fetch(url, { method: 'GET', headers: paydunyaHeaders() });
  const json = (await res.json()) as PaydunyaConfirmPayload;
  return json;
}

/** Vérifie que la réponse PayDunya provient bien de leurs serveurs (doc : SHA-512 de la Master Key). */
export function verifyPaydunyaHash(receivedHash: string | undefined): boolean {
  if (!receivedHash || !PAYDUNYA_CONFIG.masterKey) return false;
  const expected = createHash('sha512').update(PAYDUNYA_CONFIG.masterKey, 'utf8').digest('hex');
  return expected.toLowerCase() === receivedHash.toLowerCase();
}

export function isPaydunyaPaymentCompleted(payload: PaydunyaConfirmPayload): boolean {
  return payload.response_code === '00' && payload.status === 'completed';
}

export function getInvoiceAmountFromPayload(payload: PaydunyaConfirmPayload): number {
  const raw = payload.invoice?.total_amount;
  if (typeof raw === 'number' && Number.isFinite(raw)) return raw;
  if (typeof raw === 'string') return Number.parseInt(raw, 10) || 0;
  return 0;
}

import type { Request, Response } from 'express';
import { z } from 'zod';
import { HTTP_STATUS, MESSAGE_CONFIG } from '../../Constants/variable.constant';
import { PAYDUNYA_CONFIG, isPaydunyaConfigured } from '../../Constants/paydunya.constant';
import { findQuestionnaireById } from '../repositories/questionnaireRepository';
import { findUserById } from '../repositories/userRepository';
import {
  findPaymentSessionById,
  markPaymentSessionCompleted,
  createPaymentSession,
  setPaymentSessionInvoiceToken,
} from '../repositories/paymentSessionRepository';
import { createSubmissionWithAnswers } from '../repositories/submissionRepository';
import {
  confirmCheckoutInvoice,
  createCheckoutInvoiceForSubmission,
  getInvoiceAmountFromPayload,
  isPaydunyaPaymentCompleted,
  verifyPaydunyaHash,
  type PaydunyaConfirmPayload,
} from '../services/paydunyaHttpService';
import type { QuestionnaireTarget } from '../../Constants/types.constant';

const initSchema = z.object({
  questionnaireId: z.string().uuid(),
  questionnaireSlug: z.string().min(1).max(200),
  answers: z.record(z.string()),
  profileSnapshot: z.record(z.unknown()).optional(),
});

function parseIpnData(body: Record<string, unknown>): PaydunyaConfirmPayload | null {
  const raw = body.data;
  if (raw == null) return null;
  if (typeof raw === 'string') {
    try {
      return JSON.parse(raw) as PaydunyaConfirmPayload;
    } catch {
      return null;
    }
  }
  if (typeof raw === 'object') {
    return raw as PaydunyaConfirmPayload;
  }
  return null;
}

async function finalizePaidSession(
  sessionId: string,
  payload: PaydunyaConfirmPayload,
  opts: { expectedUserId?: string }
): Promise<{ submissionId: string } | { error: string }> {
  if (!verifyPaydunyaHash(payload.hash)) {
    return { error: 'HASH' };
  }
  if (!isPaydunyaPaymentCompleted(payload)) {
    return { error: 'NOT_COMPLETED' };
  }
  const amount = getInvoiceAmountFromPayload(payload);
  if (amount !== PAYDUNYA_CONFIG.submissionAmountFcfa) {
    return { error: 'AMOUNT' };
  }
  const sid = payload.custom_data && String(payload.custom_data.sessionId ?? '');
  if (!sid || sid !== sessionId) {
    return { error: 'SESSION' };
  }
  const session = await findPaymentSessionById(sessionId);
  if (!session) {
    return { error: 'NOT_FOUND' };
  }
  if (opts.expectedUserId && session.userId !== opts.expectedUserId) {
    return { error: 'FORBIDDEN' };
  }
  const invToken = payload.invoice?.token;
  if (invToken && session.invoiceToken && invToken !== session.invoiceToken) {
    return { error: 'TOKEN' };
  }
  if (session.status === 'completed' && session.resultSubmissionId) {
    return { submissionId: session.resultSubmissionId };
  }
  if (session.status !== 'pending') {
    return { error: 'STATE' };
  }

  const { id } = await createSubmissionWithAnswers({
    userId: session.userId,
    questionnaireId: session.questionnaireId,
    targetUserType: session.targetUserType,
    profileSnapshot: session.profileSnapshot,
    answers: session.answers,
  });
  await markPaymentSessionCompleted(sessionId, id);
  return { submissionId: id };
}

export async function initPaydunyaSubmissionCheckout(req: Request, res: Response): Promise<void> {
  if (!req.auth) {
    res.status(HTTP_STATUS.unauthorized).json({ error: MESSAGE_CONFIG.unauthorized });
    return;
  }
  if (!isPaydunyaConfigured()) {
    res.status(HTTP_STATUS.notImplemented).json({ error: MESSAGE_CONFIG.paydunyaNotConfigured });
    return;
  }
  const body = initSchema.parse(req.body);
  const questionnaire = await findQuestionnaireById(body.questionnaireId);
  if (!questionnaire || !questionnaire.isActive) {
    res.status(HTTP_STATUS.notFound).json({ error: MESSAGE_CONFIG.notFound });
    return;
  }
  const expected = questionnaire.targetUserType as QuestionnaireTarget;
  if (req.auth.role !== expected) {
    res.status(HTTP_STATUS.forbidden).json({ error: MESSAGE_CONFIG.forbidden });
    return;
  }

  const session = await createPaymentSession({
    userId: req.auth.userId,
    questionnaireId: questionnaire.id,
    questionnaireSlug: body.questionnaireSlug,
    targetUserType: expected,
    answers: body.answers,
    profileSnapshot: body.profileSnapshot ?? null,
  });

  const user = await findUserById(req.auth.userId);
  if (!user?.email) {
    res.status(HTTP_STATUS.badRequest).json({ error: MESSAGE_CONFIG.validationError });
    return;
  }
  const customerEmail = user.email;
  const customerName = user.displayName?.trim() || user.email;

  const rolePath = expected === 'entreprise' ? 'entreprise' : 'etudiant';
  const cancelUrl = `${PAYDUNYA_CONFIG.frontendBaseUrl}/${rolePath}/questionnaire/${encodeURIComponent(body.questionnaireSlug)}`;

  try {
    const { checkoutUrl, invoiceToken } = await createCheckoutInvoiceForSubmission({
      sessionId: session.id,
      customerName,
      customerEmail,
      cancelUrl,
    });
    await setPaymentSessionInvoiceToken(session.id, invoiceToken);
    res.json({ sessionId: session.id, checkoutUrl });
  } catch (e) {
    const msg = e instanceof Error ? e.message : '';
    if (msg === 'PAYDUNYA_NOT_CONFIGURED') {
      res.status(HTTP_STATUS.serverError).json({ error: MESSAGE_CONFIG.paydunyaNotConfigured });
      return;
    }
    res.status(HTTP_STATUS.badRequest).json({ error: MESSAGE_CONFIG.paydunyaInvoiceError });
  }
}

/** Après retour PayDunya : ?token=invoice_token (ajouté par PayDunya). */
export async function confirmPaydunyaSubmission(req: Request, res: Response): Promise<void> {
  if (!req.auth) {
    res.status(HTTP_STATUS.unauthorized).json({ error: MESSAGE_CONFIG.unauthorized });
    return;
  }
  const sessionId = typeof req.params.sessionId === 'string' ? req.params.sessionId : '';
  const token = typeof req.query.token === 'string' ? req.query.token : '';
  if (!sessionId || !z.string().uuid().safeParse(sessionId).success || !token) {
    res.status(HTTP_STATUS.badRequest).json({ error: MESSAGE_CONFIG.validationError });
    return;
  }

  let payload: PaydunyaConfirmPayload;
  try {
    payload = await confirmCheckoutInvoice(token);
  } catch {
    res.status(HTTP_STATUS.badRequest).json({ error: MESSAGE_CONFIG.paydunyaConfirmError });
    return;
  }

  const result = await finalizePaidSession(sessionId, payload, { expectedUserId: req.auth.userId });
  if ('error' in result) {
    if (result.error === 'NOT_COMPLETED') {
      res.status(HTTP_STATUS.ok).json({ status: 'pending', message: MESSAGE_CONFIG.paydunyaPaymentIncomplete });
      return;
    }
    if (result.error === 'FORBIDDEN' || result.error === 'NOT_FOUND') {
      res.status(HTTP_STATUS.forbidden).json({ error: MESSAGE_CONFIG.paydunyaSessionNotFound });
      return;
    }
    res.status(HTTP_STATUS.badRequest).json({ error: MESSAGE_CONFIG.paydunyaConfirmError });
    return;
  }
  res.json({ id: result.submissionId, status: 'completed' });
}

export async function paydunyaWebhook(req: Request, res: Response): Promise<void> {
  const payload = parseIpnData(req.body as Record<string, unknown>);
  if (!payload) {
    res.status(HTTP_STATUS.badRequest).send('invalid');
    return;
  }
  const sessionId =
    payload.custom_data && String(payload.custom_data.sessionId ?? '')
      ? String(payload.custom_data.sessionId)
      : '';
  if (!sessionId) {
    res.status(HTTP_STATUS.badRequest).send('no session');
    return;
  }

  const result = await finalizePaidSession(sessionId, payload, {});
  if ('error' in result) {
    if (result.error === 'NOT_COMPLETED') {
      res.status(200).send('ok pending');
      return;
    }
    res.status(200).send('ignored');
    return;
  }
  res.status(200).send('ok');
}

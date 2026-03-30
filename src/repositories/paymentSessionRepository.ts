import { randomUUID } from 'node:crypto';
import { usesJsonStylePersistence } from '../../Constants/variable.constant';
import type { QuestionnaireTarget } from '../../Constants/types.constant';
import type { SubmissionPaymentSessionEntity } from './entities';
import { loadJsonStore, saveJsonStore, withJsonStore } from './json/jsonDb';
import { SubmissionPaymentSession } from '../models';

function entityFromRow(
  row: InstanceType<typeof SubmissionPaymentSession>
): SubmissionPaymentSessionEntity {
  const r = row as InstanceType<typeof SubmissionPaymentSession> & {
    createdAt: Date;
    updatedAt: Date;
  };
  return {
    id: row.id,
    userId: row.userId,
    questionnaireId: row.questionnaireId,
    questionnaireSlug: row.questionnaireSlug,
    targetUserType: row.targetUserType as QuestionnaireTarget,
    answers: row.answers,
    profileSnapshot: row.profileSnapshot,
    invoiceToken: row.invoiceToken,
    status: row.status,
    resultSubmissionId: row.resultSubmissionId,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
  };
}

export async function createPaymentSession(input: {
  userId: string;
  questionnaireId: string;
  questionnaireSlug: string;
  targetUserType: QuestionnaireTarget;
  answers: Record<string, string>;
  profileSnapshot: Record<string, unknown> | null;
}): Promise<SubmissionPaymentSessionEntity> {
  const now = new Date();
  if (usesJsonStylePersistence()) {
    return withJsonStore((store) => {
      const id = randomUUID();
      const row: SubmissionPaymentSessionEntity = {
        id,
        userId: input.userId,
        questionnaireId: input.questionnaireId,
        questionnaireSlug: input.questionnaireSlug,
        targetUserType: input.targetUserType,
        answers: input.answers,
        profileSnapshot: input.profileSnapshot,
        invoiceToken: null,
        status: 'pending',
        resultSubmissionId: null,
        createdAt: now,
        updatedAt: now,
      };
      if (!store.submissionPaymentSessions) {
        store.submissionPaymentSessions = [];
      }
      store.submissionPaymentSessions.push(row);
      return row;
    });
  }
  const created = await SubmissionPaymentSession.create({
    userId: input.userId,
    questionnaireId: input.questionnaireId,
    questionnaireSlug: input.questionnaireSlug,
    targetUserType: input.targetUserType,
    answers: input.answers,
    profileSnapshot: input.profileSnapshot,
    invoiceToken: null,
    status: 'pending',
    resultSubmissionId: null,
  });
  return entityFromRow(created);
}

export async function setPaymentSessionInvoiceToken(
  sessionId: string,
  invoiceToken: string
): Promise<void> {
  if (usesJsonStylePersistence()) {
    const store = loadJsonStore();
    const list = store.submissionPaymentSessions ?? [];
    const row = list.find((s) => s.id === sessionId);
    if (!row) return;
    row.invoiceToken = invoiceToken;
    row.updatedAt = new Date();
    store.submissionPaymentSessions = list;
    saveJsonStore(store);
    return;
  }
  await SubmissionPaymentSession.update({ invoiceToken }, { where: { id: sessionId } });
}

export async function findPaymentSessionById(
  id: string
): Promise<SubmissionPaymentSessionEntity | null> {
  if (usesJsonStylePersistence()) {
    const store = loadJsonStore();
    const row = (store.submissionPaymentSessions ?? []).find((s) => s.id === id);
    if (!row) return null;
    return {
      ...row,
      createdAt: new Date(row.createdAt as unknown as string),
      updatedAt: new Date(row.updatedAt as unknown as string),
    };
  }
  const row = await SubmissionPaymentSession.findByPk(id);
  return row ? entityFromRow(row) : null;
}

export async function markPaymentSessionCompleted(
  sessionId: string,
  resultSubmissionId: string
): Promise<void> {
  const now = new Date();
  if (usesJsonStylePersistence()) {
    const store = loadJsonStore();
    const list = store.submissionPaymentSessions ?? [];
    const row = list.find((s) => s.id === sessionId);
    if (!row) return;
    row.status = 'completed';
    row.resultSubmissionId = resultSubmissionId;
    row.updatedAt = now;
    store.submissionPaymentSessions = list;
    saveJsonStore(store);
    return;
  }
  await SubmissionPaymentSession.update(
    { status: 'completed', resultSubmissionId },
    { where: { id: sessionId } }
  );
}

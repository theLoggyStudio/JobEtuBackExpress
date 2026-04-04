import fs from 'node:fs';
import path from 'node:path';
import type { MatchStatus } from '../../../Constants/types.constant';
import {
  JSON_STORE_CONFIG,
  MATCH_STATUS_CONFIG,
  QUESTIONNAIRE_TARGET_CONFIG,
  ROLE_CONFIG,
  SERVER_CONFIG,
  STORAGE_DRIVER_CONFIG,
} from '../../../Constants/variable.constant';
import { getMemoryStore } from '../memoryStore';
import type {
  AnswerEntity,
  MatchEntity,
  MatchMessageEntity,
  QuestionnaireEntity,
  SubmissionEntity,
  SubmissionPaymentSessionEntity,
  UserEntity,
} from '../entities';
import { normalizeQuestionnaireIsActive } from '../../utils/normalizeQuestionnaireIsActive';
import { createDefaultJsonStore, type JsonStoreFile } from './jsonStoreDefaults';

export type { JsonStoreFile } from './jsonStoreDefaults';

function resolvePath(): string {
  return path.resolve(process.cwd(), JSON_STORE_CONFIG.fileRelativePath);
}

function parseDates<T extends JsonStoreFile>(raw: T): JsonStoreFile {
  const fixUser = (u: UserEntity): UserEntity => ({
    ...u,
    role:
      (u.role as unknown as string) === 'fonctionnaire' ? ROLE_CONFIG.etudiant : u.role,
    createdAt: new Date(u.createdAt as unknown as string),
    updatedAt: new Date(u.updatedAt as unknown as string),
  });
  const fixQ = (q: QuestionnaireEntity): QuestionnaireEntity => {
    const slug =
      String(q.slug) === 'fonctionnaire' ? QUESTIONNAIRE_TARGET_CONFIG.etudiant : q.slug;
    const targetUserType =
      String(q.targetUserType) === 'fonctionnaire'
        ? QUESTIONNAIRE_TARGET_CONFIG.etudiant
        : q.targetUserType;
    const def = q.definition as { targetUserType?: string; title?: string; [k: string]: unknown };
    const definition =
      def.targetUserType === 'fonctionnaire'
        ? { ...q.definition, targetUserType: QUESTIONNAIRE_TARGET_CONFIG.etudiant }
        : q.definition;
    return {
      ...q,
      slug,
      targetUserType,
      definition,
      isActive: normalizeQuestionnaireIsActive((q as QuestionnaireEntity & { isActive?: unknown }).isActive),
      createdAt: new Date(q.createdAt as unknown as string),
      updatedAt: new Date(q.updatedAt as unknown as string),
    };
  };
  const fixS = (s: SubmissionEntity): SubmissionEntity => ({
    ...s,
    targetUserType:
      String(s.targetUserType) === 'fonctionnaire'
        ? QUESTIONNAIRE_TARGET_CONFIG.etudiant
        : s.targetUserType,
    createdAt: new Date(s.createdAt as unknown as string),
    updatedAt: new Date(s.updatedAt as unknown as string),
  });
  const fixA = (a: AnswerEntity): AnswerEntity => ({
    ...a,
    createdAt: new Date(a.createdAt as unknown as string),
    updatedAt: new Date(a.updatedAt as unknown as string),
  });
  const normalizeMatchStatus = (raw: unknown): MatchStatus => {
    if (raw === MATCH_STATUS_CONFIG.pending) return MATCH_STATUS_CONFIG.pending;
    if (raw === MATCH_STATUS_CONFIG.validated) return MATCH_STATUS_CONFIG.validated;
    if (raw === MATCH_STATUS_CONFIG.rejected) return MATCH_STATUS_CONFIG.rejected;
    return MATCH_STATUS_CONFIG.validated;
  };

  const fixM = (m: MatchEntity & Record<string, unknown>): MatchEntity => {
    const legacy = m as Record<string, unknown>;
    const etudiantSubmissionId =
      typeof m.etudiantSubmissionId === 'string'
        ? m.etudiantSubmissionId
        : typeof legacy.fonctionnaireSubmissionId === 'string'
          ? legacy.fonctionnaireSubmissionId
          : '';
    const e =
      typeof m.adminRatingEntreprise === 'number' && Number.isFinite(m.adminRatingEntreprise)
        ? m.adminRatingEntreprise
        : null;
    const fRaw = m.adminRatingEtudiant ?? legacy.adminRatingFonctionnaire;
    const f =
      typeof fRaw === 'number' && Number.isFinite(fRaw) ? fRaw : null;
    return {
      id: m.id,
      createdByUserId: m.createdByUserId,
      entrepriseSubmissionId: m.entrepriseSubmissionId,
      etudiantSubmissionId,
      metadata: m.metadata,
      status: normalizeMatchStatus((m as { status?: unknown }).status),
      adminRatingEntreprise: e,
      adminRatingEtudiant: f,
      createdAt: new Date(m.createdAt as unknown as string),
      updatedAt: new Date(m.updatedAt as unknown as string),
    };
  };
  const fixMsg = (m: MatchMessageEntity): MatchMessageEntity => ({
    ...m,
    createdAt: new Date(m.createdAt as unknown as string),
    updatedAt: new Date(m.updatedAt as unknown as string),
  });
  const fixPs = (s: SubmissionPaymentSessionEntity): SubmissionPaymentSessionEntity => ({
    ...s,
    createdAt: new Date(s.createdAt as unknown as string),
    updatedAt: new Date(s.updatedAt as unknown as string),
  });
  const r = raw as JsonStoreFile & { matchMessages?: MatchMessageEntity[] };
  return {
    users: (raw.users ?? []).map(fixUser),
    questionnaires: (raw.questionnaires ?? []).map(fixQ),
    submissions: (raw.submissions ?? []).map(fixS),
    answers: (raw.answers ?? []).map(fixA),
    matches: (raw.matches ?? []).map(fixM),
    matchMessages: (r.matchMessages ?? []).map(fixMsg),
    submissionPaymentSessions: (r.submissionPaymentSessions ?? []).map(fixPs),
  };
}

export function loadJsonStore(): JsonStoreFile {
  if (SERVER_CONFIG.storageDriver === STORAGE_DRIVER_CONFIG.memory) {
    return getMemoryStore();
  }
  const p = resolvePath();
  const dir = path.dirname(p);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  if (!fs.existsSync(p)) {
    const initial = createDefaultJsonStore();
    fs.writeFileSync(p, JSON.stringify(initial, null, 2), 'utf8');
    return initial;
  }
  const raw = JSON.parse(fs.readFileSync(p, 'utf8')) as JsonStoreFile;
  return parseDates(raw);
}

export function saveJsonStore(data: JsonStoreFile): void {
  if (SERVER_CONFIG.storageDriver === STORAGE_DRIVER_CONFIG.memory) {
    return;
  }
  const p = resolvePath();
  fs.writeFileSync(p, JSON.stringify(data, null, 2), 'utf8');
}

export function withJsonStore<T>(mutator: (store: JsonStoreFile) => T): T {
  const store = loadJsonStore();
  const result = mutator(store);
  saveJsonStore(store);
  return result;
}

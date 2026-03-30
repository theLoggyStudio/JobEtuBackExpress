import { randomUUID } from 'node:crypto';
import { Op } from 'sequelize';
import {
  BUSINESS_RULES,
  PAGINATION_CONFIG,
  QUESTIONNAIRE_TARGET_CONFIG,
  usesJsonStylePersistence,
} from '../../Constants/variable.constant';
import type { QuestionnaireTarget } from '../../Constants/types.constant';
import { Questionnaire, QuestionnaireSubmission, SubmissionAnswer, User } from '../models';
import type { AnswerEntity, QuestionnaireEntity, SubmissionEntity, UserEntity } from './entities';
import { loadJsonStore, withJsonStore } from './json/jsonDb';
import { toQuestionnaireEntity } from './questionnaireRepository';

export type SubmissionSummary = {
  id: string;
  questionnaireTitle: string;
  userEmail: string;
  userDisplayName: string | null;
  profileSnapshot: Record<string, unknown> | null;
  answers: { fieldName: string; value: string }[];
  targetUserType: QuestionnaireTarget;
  createdAt: Date;
};

function modelSubToEntity(s: InstanceType<typeof QuestionnaireSubmission>): SubmissionEntity {
  const t = s as InstanceType<typeof QuestionnaireSubmission> & { createdAt: Date; updatedAt: Date };
  return {
    id: s.id,
    userId: s.userId,
    questionnaireId: s.questionnaireId,
    targetUserType: s.targetUserType as QuestionnaireTarget,
    profileSnapshot: s.profileSnapshot,
    createdAt: t.createdAt,
    updatedAt: t.updatedAt,
  };
}

function modelAnsToEntity(a: InstanceType<typeof SubmissionAnswer>): AnswerEntity {
  const t = a as InstanceType<typeof SubmissionAnswer> & { createdAt: Date; updatedAt: Date };
  return {
    id: a.id,
    submissionId: a.submissionId,
    fieldName: a.fieldName,
    value: a.value,
    createdAt: t.createdAt,
    updatedAt: t.updatedAt,
  };
}

export async function createSubmissionWithAnswers(input: {
  userId: string;
  questionnaireId: string;
  targetUserType: QuestionnaireTarget;
  profileSnapshot: Record<string, unknown> | null;
  answers: Record<string, string>;
}): Promise<{ id: string }> {
  if (usesJsonStylePersistence()) {
    return withJsonStore((store) => {
      const now = new Date();
      const subId = randomUUID();
      const sub: SubmissionEntity = {
        id: subId,
        userId: input.userId,
        questionnaireId: input.questionnaireId,
        targetUserType: input.targetUserType,
        profileSnapshot: input.profileSnapshot,
        createdAt: now,
        updatedAt: now,
      };
      store.submissions.push(sub);
      for (const [fieldName, value] of Object.entries(input.answers)) {
        store.answers.push({
          id: randomUUID(),
          submissionId: subId,
          fieldName,
          value: String(value),
          createdAt: now,
          updatedAt: now,
        });
      }
      return { id: subId };
    });
  }
  const submission = await QuestionnaireSubmission.create({
    userId: input.userId,
    questionnaireId: input.questionnaireId,
    targetUserType: input.targetUserType,
    profileSnapshot: input.profileSnapshot,
  });
  const rows = Object.entries(input.answers).map(([fieldName, value]) => ({
    submissionId: submission.id,
    fieldName,
    value: String(value),
  }));
  await SubmissionAnswer.bulkCreate(rows);
  return { id: submission.id };
}

function buildSummary(
  s: SubmissionEntity,
  user: UserEntity | null,
  questionnaire: QuestionnaireEntity | null,
  answers: AnswerEntity[]
): SubmissionSummary {
  return {
    id: s.id,
    questionnaireTitle: questionnaire?.title ?? '',
    userEmail: user?.email ?? '',
    userDisplayName: user?.displayName ?? null,
    profileSnapshot: s.profileSnapshot,
    answers: answers.map((a) => ({ fieldName: a.fieldName, value: a.value })),
    targetUserType: s.targetUserType,
    createdAt: s.createdAt,
  };
}

export async function listSubmissionSummaries(input: {
  target?: string;
  search?: string;
  limit: number;
  offset: number;
}): Promise<{ items: SubmissionSummary[]; total: number }> {
  const search = input.search?.slice(0, BUSINESS_RULES.maxSearchLength);
  const limit = Math.min(Math.max(1, input.limit), PAGINATION_CONFIG.maxLimit);
  const offset = Math.max(0, input.offset);

  if (usesJsonStylePersistence()) {
    const store = loadJsonStore();
    let subs = [...store.submissions];
    if (input.target === QUESTIONNAIRE_TARGET_CONFIG.entreprise || input.target === QUESTIONNAIRE_TARGET_CONFIG.etudiant) {
      subs = subs.filter((s) => s.targetUserType === input.target);
    }
    subs.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    const needle = search?.toLowerCase().trim();
    if (needle) {
      subs = subs.filter((s) => {
        const u = store.users.find((x) => x.id === s.userId);
        const mail = u?.email.toLowerCase() ?? '';
        const name = (u?.displayName ?? '').toLowerCase();
        return mail.includes(needle) || name.includes(needle);
      });
    }
    const total = subs.length;
    subs = subs.slice(offset, offset + limit);
    const items = subs.map((s) => {
      const user = store.users.find((u) => u.id === s.userId) ?? null;
      const q = store.questionnaires.find((x) => x.id === s.questionnaireId) ?? null;
      const ans = store.answers.filter((a) => a.submissionId === s.id);
      return buildSummary(s, user, q, ans);
    });
    return { items, total };
  }

  const whereSub: Record<string, unknown> = {};
  if (input.target === QUESTIONNAIRE_TARGET_CONFIG.entreprise || input.target === QUESTIONNAIRE_TARGET_CONFIG.etudiant) {
    whereSub.targetUserType = input.target;
  }

  const userWhere =
    search && search.length > 0
      ? {
          [Op.or]: [
            { email: { [Op.iLike]: `%${search}%` } },
            { displayName: { [Op.iLike]: `%${search}%` } },
          ],
        }
      : undefined;

  const total =
    userWhere
      ? await QuestionnaireSubmission.count({
          where: whereSub,
          distinct: true,
          col: 'QuestionnaireSubmission.id',
          include: [{ model: User, required: true, where: userWhere }],
        })
      : await QuestionnaireSubmission.count({ where: whereSub });

  const submissions = await QuestionnaireSubmission.findAll({
    where: whereSub,
    include: [
      { model: User, required: Boolean(userWhere), where: userWhere },
      { model: Questionnaire },
    ],
    order: [['createdAt', 'DESC']],
    limit,
    offset,
  });

  const ids = submissions.map((x) => x.id);
  const allAnswers =
    ids.length > 0
      ? await SubmissionAnswer.findAll({ where: { submissionId: { [Op.in]: ids } } })
      : [];
  const bySub = new Map<string, AnswerEntity[]>();
  for (const a of allAnswers) {
    const list = bySub.get(a.submissionId) ?? [];
    list.push(modelAnsToEntity(a));
    bySub.set(a.submissionId, list);
  }

  const items = submissions.map((s) => {
    const user = s.get('User') as InstanceType<typeof User> | undefined;
    const q = s.get('Questionnaire') as InstanceType<typeof Questionnaire> | undefined;
    const ut = user as InstanceType<typeof User> & { createdAt: Date; updatedAt: Date };
    const uEnt = user
      ? ({
          id: user.id,
          email: user.email,
          passwordHash: user.passwordHash,
          role: user.role,
          displayName: user.displayName,
          phone: user.phone,
          location: user.location,
          paymentMetadata: user.paymentMetadata,
          createdAt: ut.createdAt,
          updatedAt: ut.updatedAt,
        } satisfies UserEntity)
      : null;
    const qEnt = q ? toQuestionnaireEntity(q) : null;
    return buildSummary(modelSubToEntity(s), uEnt, qEnt, bySub.get(s.id) ?? []);
  });
  return { items, total };
}

export async function getSubmissionSummaryById(id: string): Promise<SubmissionSummary | null> {
  if (usesJsonStylePersistence()) {
    const store = loadJsonStore();
    const s = store.submissions.find((x) => x.id === id);
    if (!s) return null;
    const user = store.users.find((u) => u.id === s.userId) ?? null;
    const q = store.questionnaires.find((x) => x.id === s.questionnaireId) ?? null;
    const ans = store.answers.filter((a) => a.submissionId === s.id);
    return buildSummary(s, user, q, ans);
  }
  const s = await QuestionnaireSubmission.findByPk(id, {
    include: [User, Questionnaire],
  });
  if (!s) return null;
  const answers = await SubmissionAnswer.findAll({ where: { submissionId: s.id } });
  const user = s.get('User') as InstanceType<typeof User> | undefined;
  const q = s.get('Questionnaire') as InstanceType<typeof Questionnaire> | undefined;
  const ut = user as (InstanceType<typeof User> & { createdAt: Date; updatedAt: Date }) | undefined;
  const uEnt = user
    ? ({
        id: user.id,
        email: user.email,
        passwordHash: user.passwordHash,
        role: user.role,
        displayName: user.displayName,
        phone: user.phone,
        location: user.location,
        paymentMetadata: user.paymentMetadata,
        createdAt: ut!.createdAt,
        updatedAt: ut!.updatedAt,
      } satisfies UserEntity)
    : null;
  return buildSummary(
    modelSubToEntity(s),
    uEnt,
    q ? toQuestionnaireEntity(q) : null,
    answers.map(modelAnsToEntity)
  );
}

export async function findSubmissionById(id: string): Promise<SubmissionEntity | null> {
  if (usesJsonStylePersistence()) {
    const store = loadJsonStore();
    return store.submissions.find((s) => s.id === id) ?? null;
  }
  const s = await QuestionnaireSubmission.findByPk(id);
  return s ? modelSubToEntity(s) : null;
}

export async function listSubmissionIdsForUser(userId: string): Promise<string[]> {
  if (usesJsonStylePersistence()) {
    const store = loadJsonStore();
    return store.submissions.filter((s) => s.userId === userId).map((s) => s.id);
  }
  const rows = await QuestionnaireSubmission.findAll({
    where: { userId },
    attributes: ['id'],
  });
  return rows.map((r) => r.id);
}

import type { Request, Response } from 'express';
import { z } from 'zod';
import { HTTP_STATUS, MESSAGE_CONFIG, ROLE_CONFIG } from '../../Constants/variable.constant';
import type { QuestionnaireTarget } from '../../Constants/types.constant';
import { findQuestionnaireById } from '../repositories/questionnaireRepository';
import { submissionRoleMatchesTarget } from '../utils/submissionRoleMatchesTarget';
import {
  createSubmissionWithAnswers,
  getSubmissionSummaryById,
  listSubmissionSummaries,
} from '../repositories/submissionRepository';
import { parseLimitOffsetQuery } from '../utils/parsePaginationQuery';

const submitSchema = z.object({
  questionnaireId: z.string().uuid(),
  /** Valeurs normalisées en chaînes (évite les rejets silencieux côté Sequelize). */
  answers: z.record(z.unknown()).transform((rec) =>
    Object.fromEntries(
      Object.entries(rec).map(([k, v]) => [k, v == null ? '' : typeof v === 'string' ? v : String(v)])
    )
  ),
  profileSnapshot: z.record(z.unknown()).optional(),
});

function sanitizeProfileSnapshot(raw: Record<string, unknown> | undefined): Record<string, unknown> | null {
  if (!raw || typeof raw !== 'object') return null;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(raw)) {
    if (v !== undefined) out[k] = v;
  }
  return Object.keys(out).length > 0 ? out : null;
}

export async function createSubmission(req: Request, res: Response): Promise<void> {
  if (!req.auth) {
    res.status(HTTP_STATUS.unauthorized).json({ error: MESSAGE_CONFIG.unauthorized });
    return;
  }
  const body = submitSchema.parse(req.body);
  const questionnaire = await findQuestionnaireById(body.questionnaireId);
  if (!questionnaire || !questionnaire.isActive) {
    res.status(HTTP_STATUS.notFound).json({ error: MESSAGE_CONFIG.notFound });
    return;
  }
  const expected = questionnaire.targetUserType as QuestionnaireTarget;
  if (!submissionRoleMatchesTarget(req.auth.role, expected)) {
    res.status(HTTP_STATUS.forbidden).json({ error: MESSAGE_CONFIG.forbidden });
    return;
  }
  const { id } = await createSubmissionWithAnswers({
    userId: req.auth.userId,
    questionnaireId: questionnaire.id,
    targetUserType: expected,
    profileSnapshot: sanitizeProfileSnapshot(body.profileSnapshot),
    answers: body.answers,
  });
  res.status(HTTP_STATUS.created).json({ id });
}

export async function listSubmissions(req: Request, res: Response): Promise<void> {
  if (req.auth?.role !== ROLE_CONFIG.admin) {
    res.status(HTTP_STATUS.forbidden).json({ error: MESSAGE_CONFIG.forbidden });
    return;
  }
  const target = req.query.target as string | undefined;
  const search = req.query.search as string | undefined;
  const { limit, offset } = parseLimitOffsetQuery(req.query as Record<string, unknown>);

  const { items, total } = await listSubmissionSummaries({ target, search, limit, offset });
  res.json({ items, total, limit, offset });
}

export async function getSubmission(req: Request, res: Response): Promise<void> {
  if (req.auth?.role !== ROLE_CONFIG.admin) {
    res.status(HTTP_STATUS.forbidden).json({ error: MESSAGE_CONFIG.forbidden });
    return;
  }
  const row = await getSubmissionSummaryById(req.params.id);
  if (!row) {
    res.status(HTTP_STATUS.notFound).json({ error: MESSAGE_CONFIG.notFound });
    return;
  }
  res.json(row);
}

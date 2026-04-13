import type { Request, Response } from 'express';
import { z } from 'zod';
import {
  BUSINESS_RULES,
  HTTP_STATUS,
  MATCH_STATUS_CONFIG,
  MESSAGE_CONFIG,
  QUESTIONNAIRE_TARGET_CONFIG,
  ROLE_CONFIG,
} from '../../Constants/variable.constant';
import type { MatchEntity } from '../repositories/entities';
import { createMatchMessageEntity, listMatchMessagesByMatchId } from '../repositories/matchMessageRepository';
import {
  createMatchEntity,
  findBlockingMatchForPair,
  findMatchById,
  listBlockingMatchPairKeys,
  listMatchesRawPaged,
  listValidatedMatchesForSubmissionIds,
  updateMatchAdminRatings,
  updateMatchStatusFromPending,
} from '../repositories/matchRepository';
import { parseLimitOffsetQuery } from '../utils/parsePaginationQuery';
import {
  findSubmissionById,
  getSubmissionSummaryById,
  listSubmissionIdsForUser,
} from '../repositories/submissionRepository';

const createMatchSchema = z.object({
  entrepriseSubmissionId: z.string().uuid(),
  etudiantSubmissionId: z.string().uuid(),
});

export async function createMatch(req: Request, res: Response): Promise<void> {
  if (!req.auth || req.auth.role !== ROLE_CONFIG.admin) {
    res.status(HTTP_STATUS.forbidden).json({ error: MESSAGE_CONFIG.forbidden });
    return;
  }
  const body = createMatchSchema.parse(req.body);
  const [eSub, fSub] = await Promise.all([
    findSubmissionById(body.entrepriseSubmissionId),
    findSubmissionById(body.etudiantSubmissionId),
  ]);
  if (!eSub || eSub.targetUserType !== QUESTIONNAIRE_TARGET_CONFIG.entreprise) {
    res.status(HTTP_STATUS.badRequest).json({ error: MESSAGE_CONFIG.validationError });
    return;
  }
  if (!fSub || fSub.targetUserType !== QUESTIONNAIRE_TARGET_CONFIG.etudiant) {
    res.status(HTTP_STATUS.badRequest).json({ error: MESSAGE_CONFIG.validationError });
    return;
  }
  const duplicate = await findBlockingMatchForPair(eSub.id, fSub.id);
  if (duplicate) {
    res.status(HTTP_STATUS.conflict).json({ error: MESSAGE_CONFIG.matchPairConflict });
    return;
  }
  const { id } = await createMatchEntity({
    createdByUserId: req.auth.userId,
    entrepriseSubmissionId: eSub.id,
    etudiantSubmissionId: fSub.id,
    metadata: null,
    status: MATCH_STATUS_CONFIG.pending,
  });
  res.status(HTTP_STATUS.created).json({ id, status: MATCH_STATUS_CONFIG.pending });
}

async function toAdminMatchListItem(match: MatchEntity) {
  const [eSum, fSum] = await Promise.all([
    getSubmissionSummaryById(match.entrepriseSubmissionId),
    getSubmissionSummaryById(match.etudiantSubmissionId),
  ]);
  return {
    id: match.id,
    createdAt: match.createdAt.toISOString(),
    entreprise: eSum
      ? {
          submissionId: eSum.id,
          userEmail: eSum.userEmail,
          userDisplayName: eSum.userDisplayName,
          questionnaireTitle: eSum.questionnaireTitle,
        }
      : null,
    etudiant: fSum
      ? {
          submissionId: fSum.id,
          userEmail: fSum.userEmail,
          userDisplayName: fSum.userDisplayName,
          questionnaireTitle: fSum.questionnaireTitle,
        }
      : null,
    adminRatingEntreprise: match.adminRatingEntreprise,
    adminRatingEtudiant: match.adminRatingEtudiant,
    status: match.status,
  };
}

export async function listMatches(req: Request, res: Response): Promise<void> {
  if (!req.auth || req.auth.role !== ROLE_CONFIG.admin) {
    res.status(HTTP_STATUS.forbidden).json({ error: MESSAGE_CONFIG.forbidden });
    return;
  }
  const { limit, offset } = parseLimitOffsetQuery(req.query as Record<string, unknown>);
  const { items: raw, total } = await listMatchesRawPaged({ limit, offset });
  const items = await Promise.all(raw.map((m) => toAdminMatchListItem(m)));
  res.json({ items, total, limit, offset });
}

export async function listMatchPairBlockKeys(req: Request, res: Response): Promise<void> {
  if (!req.auth || req.auth.role !== ROLE_CONFIG.admin) {
    res.status(HTTP_STATUS.forbidden).json({ error: MESSAGE_CONFIG.forbidden });
    return;
  }
  const pairKeys = await listBlockingMatchPairKeys();
  res.json({ pairKeys });
}

const patchAdminRatingsSchema = z.object({
  adminRatingEntreprise: z
    .union([
      z.number().int().min(BUSINESS_RULES.minAdminMatchRating).max(BUSINESS_RULES.maxAdminMatchRating),
      z.null(),
    ])
    .optional(),
  adminRatingEtudiant: z
    .union([
      z.number().int().min(BUSINESS_RULES.minAdminMatchRating).max(BUSINESS_RULES.maxAdminMatchRating),
      z.null(),
    ])
    .optional(),
});

export async function patchMatchAdminRatings(req: Request, res: Response): Promise<void> {
  if (!req.auth || req.auth.role !== ROLE_CONFIG.admin) {
    res.status(HTTP_STATUS.forbidden).json({ error: MESSAGE_CONFIG.forbidden });
    return;
  }
  const matchId = z.string().uuid().parse(req.params.matchId);
  const body = patchAdminRatingsSchema.parse(req.body);
  if (body.adminRatingEntreprise === undefined && body.adminRatingEtudiant === undefined) {
    res.status(HTTP_STATUS.badRequest).json({ error: MESSAGE_CONFIG.validationError });
    return;
  }
  const updated = await updateMatchAdminRatings(matchId, body);
  if (!updated) {
    res.status(HTTP_STATUS.notFound).json({ error: MESSAGE_CONFIG.notFound });
    return;
  }
  res.json({
    id: updated.id,
    adminRatingEntreprise: updated.adminRatingEntreprise,
    adminRatingEtudiant: updated.adminRatingEtudiant,
  });
}

const patchMatchStatusSchema = z.object({
  status: z.enum([MATCH_STATUS_CONFIG.validated, MATCH_STATUS_CONFIG.rejected]),
});

export async function patchMatchStatus(req: Request, res: Response): Promise<void> {
  if (!req.auth || req.auth.role !== ROLE_CONFIG.admin) {
    res.status(HTTP_STATUS.forbidden).json({ error: MESSAGE_CONFIG.forbidden });
    return;
  }
  const matchId = z.string().uuid().parse(req.params.matchId);
  const body = patchMatchStatusSchema.parse(req.body);
  const updated = await updateMatchStatusFromPending(matchId, body.status);
  if (!updated) {
    const exists = await findMatchById(matchId);
    if (!exists) {
      res.status(HTTP_STATUS.notFound).json({ error: MESSAGE_CONFIG.notFound });
      return;
    }
    res.status(HTTP_STATUS.badRequest).json({ error: MESSAGE_CONFIG.matchInvalidStatusTransition });
    return;
  }
  res.json({ id: updated.id, status: updated.status });
}

async function userParticipatesInMatch(userId: string, match: MatchEntity): Promise<boolean> {
  const eSub = await findSubmissionById(match.entrepriseSubmissionId);
  const fSub = await findSubmissionById(match.etudiantSubmissionId);
  const uid = String(userId);
  return Boolean(
    (eSub && String(eSub.userId) === uid) || (fSub && String(fSub.userId) === uid)
  );
}

function senderSideInMatch(
  senderUserId: string,
  entrepriseSubmissionUserId: string,
  etudiantSubmissionUserId: string
): typeof QUESTIONNAIRE_TARGET_CONFIG.entreprise | typeof QUESTIONNAIRE_TARGET_CONFIG.etudiant {
  const s = String(senderUserId);
  if (s === String(entrepriseSubmissionUserId)) return QUESTIONNAIRE_TARGET_CONFIG.entreprise;
  return QUESTIONNAIRE_TARGET_CONFIG.etudiant;
}

async function buildMyMatchDto(match: MatchEntity, userId: string) {
  const eSub = await findSubmissionById(match.entrepriseSubmissionId);
  const fSub = await findSubmissionById(match.etudiantSubmissionId);
  if (!eSub || !fSub) return null;
  const uid = String(userId);
  const iAmEntreprise = String(eSub.userId) === uid;
  const iAmEtudiant = String(fSub.userId) === uid;
  if (!iAmEntreprise && !iAmEtudiant) return null;
  const counterpartySubId = iAmEntreprise ? fSub.id : eSub.id;
  const summary = await getSubmissionSummaryById(counterpartySubId);
  if (!summary) return null;
  return {
    id: match.id,
    matchedAt: match.createdAt.toISOString(),
    myRole: iAmEntreprise
      ? QUESTIONNAIRE_TARGET_CONFIG.entreprise
      : QUESTIONNAIRE_TARGET_CONFIG.etudiant,
    counterparty: {
      displayName: summary.userDisplayName,
      email: summary.userEmail,
      questionnaireTitle: summary.questionnaireTitle,
      answersPreview: summary.answers.slice(0, 10),
    },
  };
}

export async function listMyMatches(req: Request, res: Response): Promise<void> {
  if (!req.auth) {
    res.status(HTTP_STATUS.unauthorized).json({ error: MESSAGE_CONFIG.unauthorized });
    return;
  }
  const subIds = await listSubmissionIdsForUser(req.auth.userId);
  const matches = await listValidatedMatchesForSubmissionIds(subIds);
  const built = await Promise.all(matches.map((m) => buildMyMatchDto(m, req.auth!.userId)));
  const items = built.filter((x): x is NonNullable<typeof x> => x != null);
  res.json({ items });
}

export async function listMatchMessages(req: Request, res: Response): Promise<void> {
  if (!req.auth) {
    res.status(HTTP_STATUS.unauthorized).json({ error: MESSAGE_CONFIG.unauthorized });
    return;
  }
  const matchId = z.string().uuid().parse(req.params.matchId);
  const match = await findMatchById(matchId);
  if (!match) {
    res.status(HTTP_STATUS.notFound).json({ error: MESSAGE_CONFIG.notFound });
    return;
  }
  if (!(await userParticipatesInMatch(req.auth.userId, match))) {
    res.status(HTTP_STATUS.forbidden).json({ error: MESSAGE_CONFIG.forbidden });
    return;
  }
  if (match.status !== MATCH_STATUS_CONFIG.validated) {
    res.status(HTTP_STATUS.forbidden).json({ error: MESSAGE_CONFIG.matchNotValidated });
    return;
  }
  const eSub = await findSubmissionById(match.entrepriseSubmissionId);
  const fSub = await findSubmissionById(match.etudiantSubmissionId);
  if (!eSub || !fSub) {
    res.status(HTTP_STATUS.serverError).json({ error: MESSAGE_CONFIG.validationError });
    return;
  }
  const rows = await listMatchMessagesByMatchId(matchId);
  res.json({
    items: rows.map((m) => ({
      id: m.id,
      senderUserId: m.senderUserId,
      senderSide: senderSideInMatch(m.senderUserId, eSub.userId, fSub.userId),
      body: m.body,
      createdAt: m.createdAt.toISOString(),
    })),
  });
}

const postMessageSchema = z.object({
  body: z.string().min(1).max(BUSINESS_RULES.maxMatchMessageLength),
});

export async function postMatchMessage(req: Request, res: Response): Promise<void> {
  if (!req.auth) {
    res.status(HTTP_STATUS.unauthorized).json({ error: MESSAGE_CONFIG.unauthorized });
    return;
  }
  const matchId = z.string().uuid().parse(req.params.matchId);
  const { body: text } = postMessageSchema.parse(req.body);
  const match = await findMatchById(matchId);
  if (!match) {
    res.status(HTTP_STATUS.notFound).json({ error: MESSAGE_CONFIG.notFound });
    return;
  }
  if (!(await userParticipatesInMatch(req.auth.userId, match))) {
    res.status(HTTP_STATUS.forbidden).json({ error: MESSAGE_CONFIG.forbidden });
    return;
  }
  if (match.status !== MATCH_STATUS_CONFIG.validated) {
    res.status(HTTP_STATUS.forbidden).json({ error: MESSAGE_CONFIG.matchNotValidated });
    return;
  }
  const msg = await createMatchMessageEntity({
    matchId,
    senderUserId: req.auth.userId,
    body: text.trim(),
  });
  const eSubPost = await findSubmissionById(match.entrepriseSubmissionId);
  const fSubPost = await findSubmissionById(match.etudiantSubmissionId);
  res.status(HTTP_STATUS.created).json({
    id: msg.id,
    senderUserId: msg.senderUserId,
    senderSide:
      eSubPost && fSubPost
        ? senderSideInMatch(msg.senderUserId, eSubPost.userId, fSubPost.userId)
        : undefined,
    body: msg.body,
    createdAt: msg.createdAt.toISOString(),
  });
}

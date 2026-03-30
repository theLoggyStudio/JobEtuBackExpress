import { randomUUID } from 'node:crypto';
import { Op } from 'sequelize';
import type { MatchStatus } from '../../Constants/types.constant';
import {
  MATCH_STATUS_CONFIG,
  PAGINATION_CONFIG,
  usesJsonStylePersistence,
} from '../../Constants/variable.constant';
import { Match } from '../models';
import type { MatchEntity } from './entities';
import { loadJsonStore, withJsonStore } from './json/jsonDb';

function modelToEntity(m: InstanceType<typeof Match>): MatchEntity {
  const t = m as InstanceType<typeof Match> & { createdAt: Date; updatedAt: Date };
  const st = m.status;
  const status: MatchStatus =
    st === MATCH_STATUS_CONFIG.pending ||
    st === MATCH_STATUS_CONFIG.validated ||
    st === MATCH_STATUS_CONFIG.rejected
      ? st
      : MATCH_STATUS_CONFIG.validated;
  return {
    id: m.id,
    createdByUserId: m.createdByUserId,
    entrepriseSubmissionId: m.entrepriseSubmissionId,
    etudiantSubmissionId: m.etudiantSubmissionId,
    metadata: m.metadata,
    adminRatingEntreprise: m.adminRatingEntreprise ?? null,
    adminRatingEtudiant: m.adminRatingEtudiant ?? null,
    status,
    createdAt: t.createdAt,
    updatedAt: t.updatedAt,
  };
}

export async function createMatchEntity(input: {
  createdByUserId: string;
  entrepriseSubmissionId: string;
  etudiantSubmissionId: string;
  metadata: Record<string, unknown> | null;
  status: MatchStatus;
}): Promise<{ id: string }> {
  if (usesJsonStylePersistence()) {
    return withJsonStore((store) => {
      const now = new Date();
      const id = randomUUID();
      store.matches.push({
        id,
        createdByUserId: input.createdByUserId,
        entrepriseSubmissionId: input.entrepriseSubmissionId,
        etudiantSubmissionId: input.etudiantSubmissionId,
        metadata: input.metadata,
        adminRatingEntreprise: null,
        adminRatingEtudiant: null,
        status: input.status,
        createdAt: now,
        updatedAt: now,
      });
      return { id };
    });
  }
  const m = await Match.create({
    createdByUserId: input.createdByUserId,
    entrepriseSubmissionId: input.entrepriseSubmissionId,
    etudiantSubmissionId: input.etudiantSubmissionId,
    metadata: input.metadata,
    adminRatingEntreprise: null,
    adminRatingEtudiant: null,
    status: input.status,
  });
  return { id: m.id };
}

export async function findBlockingMatchForPair(
  entrepriseSubmissionId: string,
  etudiantSubmissionId: string
): Promise<MatchEntity | null> {
  const blocking: MatchStatus[] = [MATCH_STATUS_CONFIG.pending, MATCH_STATUS_CONFIG.validated];
  if (usesJsonStylePersistence()) {
    const s = loadJsonStore();
    return (
      s.matches.find(
        (m) =>
          m.entrepriseSubmissionId === entrepriseSubmissionId &&
          m.etudiantSubmissionId === etudiantSubmissionId &&
          blocking.includes(m.status)
      ) ?? null
    );
  }
  const row = await Match.findOne({
    where: {
      entrepriseSubmissionId,
      etudiantSubmissionId,
      status: { [Op.in]: blocking },
    },
  });
  return row ? modelToEntity(row) : null;
}

export async function updateMatchStatusFromPending(
  id: string,
  next: typeof MATCH_STATUS_CONFIG.validated | typeof MATCH_STATUS_CONFIG.rejected
): Promise<MatchEntity | null> {
  if (usesJsonStylePersistence()) {
    return withJsonStore((store) => {
      const idx = store.matches.findIndex((m) => m.id === id);
      if (idx === -1) return null;
      const row = store.matches[idx];
      if (row.status !== MATCH_STATUS_CONFIG.pending) return null;
      row.status = next;
      row.updatedAt = new Date();
      return { ...row };
    });
  }
  const row = await Match.findByPk(id);
  if (!row || row.status !== MATCH_STATUS_CONFIG.pending) return null;
  row.status = next;
  await row.save();
  return modelToEntity(row);
}

export async function updateMatchAdminRatings(
  id: string,
  patch: {
    adminRatingEntreprise?: number | null;
    adminRatingEtudiant?: number | null;
  }
): Promise<MatchEntity | null> {
  const hasE = patch.adminRatingEntreprise !== undefined;
  const hasF = patch.adminRatingEtudiant !== undefined;
  if (!hasE && !hasF) {
    return findMatchById(id);
  }
  if (usesJsonStylePersistence()) {
    return withJsonStore((store) => {
      const idx = store.matches.findIndex((m) => m.id === id);
      if (idx === -1) return null;
      const row = store.matches[idx];
      const now = new Date();
      if (hasE) {
        row.adminRatingEntreprise = patch.adminRatingEntreprise ?? null;
      }
      if (hasF) {
        row.adminRatingEtudiant = patch.adminRatingEtudiant ?? null;
      }
      row.updatedAt = now;
      return { ...row };
    });
  }
  const row = await Match.findByPk(id);
  if (!row) return null;
  if (hasE) {
    row.adminRatingEntreprise = patch.adminRatingEntreprise ?? null;
  }
  if (hasF) {
    row.adminRatingEtudiant = patch.adminRatingEtudiant ?? null;
  }
  await row.save();
  return modelToEntity(row);
}

export async function listMatchesRawPaged(input: {
  limit: number;
  offset: number;
}): Promise<{ items: MatchEntity[]; total: number }> {
  const limit = Math.min(Math.max(1, input.limit), PAGINATION_CONFIG.maxLimit);
  const offset = Math.max(0, input.offset);
  if (usesJsonStylePersistence()) {
    const s = loadJsonStore();
    const sorted = [...s.matches].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    const total = sorted.length;
    const items = sorted.slice(offset, offset + limit);
    return { items, total };
  }
  const { rows, count } = await Match.findAndCountAll({
    order: [['createdAt', 'DESC']],
    limit,
    offset,
  });
  return { items: rows.map(modelToEntity), total: count };
}

/** Paires `entrepriseSubmissionId|etudiantSubmissionId` pour matchs pending ou validés (anti-doublon côté client). */
export async function listBlockingMatchPairKeys(): Promise<string[]> {
  const blocking: MatchStatus[] = [MATCH_STATUS_CONFIG.pending, MATCH_STATUS_CONFIG.validated];
  if (usesJsonStylePersistence()) {
    const s = loadJsonStore();
    return s.matches
      .filter((m) => blocking.includes(m.status))
      .map((m) => `${m.entrepriseSubmissionId}|${m.etudiantSubmissionId}`);
  }
  const rows = await Match.findAll({
    where: { status: { [Op.in]: blocking } },
    attributes: ['entrepriseSubmissionId', 'etudiantSubmissionId'],
  });
  return rows.map((r) => `${r.entrepriseSubmissionId}|${r.etudiantSubmissionId}`);
}

export async function findMatchById(id: string): Promise<MatchEntity | null> {
  if (usesJsonStylePersistence()) {
    const s = loadJsonStore();
    return s.matches.find((m) => m.id === id) ?? null;
  }
  const m = await Match.findByPk(id);
  return m ? modelToEntity(m) : null;
}

export async function listMatchesForSubmissionIds(submissionIds: string[]): Promise<MatchEntity[]> {
  if (submissionIds.length === 0) return [];
  if (usesJsonStylePersistence()) {
    const s = loadJsonStore();
    const set = new Set(submissionIds);
    return s.matches
      .filter(
        (m) => set.has(m.entrepriseSubmissionId) || set.has(m.etudiantSubmissionId)
      )
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }
  const rows = await Match.findAll({
    where: {
      [Op.or]: [
        { entrepriseSubmissionId: { [Op.in]: submissionIds } },
        { etudiantSubmissionId: { [Op.in]: submissionIds } },
      ],
    },
    order: [['createdAt', 'DESC']],
  });
  return rows.map(modelToEntity);
}

export async function listValidatedMatchesForSubmissionIds(submissionIds: string[]): Promise<MatchEntity[]> {
  const all = await listMatchesForSubmissionIds(submissionIds);
  return all.filter((m) => m.status === MATCH_STATUS_CONFIG.validated);
}

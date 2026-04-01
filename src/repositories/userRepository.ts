import { randomUUID } from 'node:crypto';
import { Op } from 'sequelize';
import { ROLE_CONFIG, usesJsonStylePersistence } from '../../Constants/variable.constant';
import type { UserRole } from '../../Constants/types.constant';
import { sequelize } from '../config/database';
import {
  User,
  QuestionnaireSubmission,
  SubmissionAnswer,
  Match,
  MatchMessage,
} from '../models';
import type { UserEntity } from './entities';
import type { JsonStoreFile } from './json/jsonDb';
import { loadJsonStore, withJsonStore } from './json/jsonDb';

function modelToEntity(u: InstanceType<typeof User>): UserEntity {
  const t = u as InstanceType<typeof User> & { createdAt: Date; updatedAt: Date };
  return {
    id: u.id,
    email: u.email,
    passwordHash: u.passwordHash,
    role: u.role,
    displayName: u.displayName,
    phone: u.phone,
    location: u.location,
    paymentMetadata: u.paymentMetadata,
    createdAt: t.createdAt,
    updatedAt: t.updatedAt,
  };
}

export async function findUserById(id: string): Promise<UserEntity | null> {
  if (usesJsonStylePersistence()) {
    const s = loadJsonStore();
    return s.users.find((u) => u.id === id) ?? null;
  }
  const u = await User.findByPk(id);
  return u ? modelToEntity(u) : null;
}

export async function findUserByEmail(email: string): Promise<UserEntity | null> {
  const e = email.toLowerCase();
  if (usesJsonStylePersistence()) {
    const s = loadJsonStore();
    return s.users.find((u) => u.email === e) ?? null;
  }
  const u = await User.findOne({ where: { email: e } });
  return u ? modelToEntity(u) : null;
}

export async function createUser(input: {
  email: string;
  passwordHash: string;
  role: UserRole;
  displayName: string;
  phone?: string | null;
}): Promise<UserEntity> {
  if (usesJsonStylePersistence()) {
    return withJsonStore((store) => {
      const now = new Date();
      const entity: UserEntity = {
        id: randomUUID(),
        email: input.email.toLowerCase(),
        passwordHash: input.passwordHash,
        role: input.role,
        displayName: input.displayName,
        phone: input.phone ?? null,
        location: null,
        paymentMetadata: null,
        createdAt: now,
        updatedAt: now,
      };
      store.users.push(entity);
      return entity;
    });
  }
  const u = await User.create({
    email: input.email.toLowerCase(),
    passwordHash: input.passwordHash,
    role: input.role,
    displayName: input.displayName,
    phone: input.phone ?? null,
  });
  return modelToEntity(u);
}

export type UserProfilePatch = {
  displayName?: string | null;
  phone?: string | null;
  email?: string;
  passwordHash?: string;
  role?: UserRole;
};

export async function updateUserById(userId: string, patch: UserProfilePatch): Promise<UserEntity | null> {
  if (usesJsonStylePersistence()) {
    return withJsonStore((store) => {
      const i = store.users.findIndex((u) => u.id === userId);
      if (i === -1) return null;
      const prev = store.users[i];
      const next: UserEntity = {
        ...prev,
        displayName: patch.displayName !== undefined ? patch.displayName : prev.displayName,
        phone: patch.phone !== undefined ? patch.phone : prev.phone,
        email: patch.email !== undefined ? patch.email.toLowerCase() : prev.email,
        passwordHash: patch.passwordHash !== undefined ? patch.passwordHash : prev.passwordHash,
        role: patch.role !== undefined ? patch.role : prev.role,
        updatedAt: new Date(),
      };
      store.users[i] = next;
      return next;
    });
  }
  const row: Record<string, unknown> = {};
  if (patch.displayName !== undefined) row.displayName = patch.displayName;
  if (patch.phone !== undefined) row.phone = patch.phone;
  if (patch.email !== undefined) row.email = patch.email.toLowerCase();
  if (patch.passwordHash !== undefined) row.passwordHash = patch.passwordHash;
  if (patch.role !== undefined) row.role = patch.role;
  if (Object.keys(row).length === 0) {
    const u = await User.findByPk(userId);
    return u ? modelToEntity(u) : null;
  }
  await User.update(row, { where: { id: userId } });
  const u = await User.findByPk(userId);
  return u ? modelToEntity(u) : null;
}

type CascadeResult = { ok: true } | { ok: false; reason: 'last_admin' | 'not_found' };

function deleteUserCascadeInJsonStore(store: JsonStoreFile, userId: string): CascadeResult {
  const user = store.users.find((u) => u.id === userId);
  if (!user) return { ok: false, reason: 'not_found' };
  const admins = store.users.filter((u) => u.role === ROLE_CONFIG.admin);
  if (user.role === ROLE_CONFIG.admin && admins.length <= 1) {
    return { ok: false, reason: 'last_admin' };
  }

  const subIds = store.submissions.filter((s) => s.userId === userId).map((s) => s.id);
  const subIdSet = new Set(subIds);
  const matchIdsAffected = new Set(
    store.matches
      .filter(
        (m) => subIdSet.has(m.entrepriseSubmissionId) || subIdSet.has(m.etudiantSubmissionId)
      )
      .map((m) => m.id)
  );

  store.matchMessages = store.matchMessages.filter((m) => !matchIdsAffected.has(m.matchId));
  store.matches = store.matches.filter((m) => !matchIdsAffected.has(m.id));

  const replacementCreator =
    store.users.find((u) => u.id !== userId && u.role === ROLE_CONFIG.admin)?.id ??
    store.users.find((u) => u.id !== userId)?.id;
  if (replacementCreator) {
    for (const m of store.matches) {
      if (m.createdByUserId === userId) m.createdByUserId = replacementCreator;
    }
  }

  store.answers = store.answers.filter((a) => !subIdSet.has(a.submissionId));
  store.submissions = store.submissions.filter((s) => s.userId !== userId);
  store.matchMessages = store.matchMessages.filter((m) => m.senderUserId !== userId);
  store.users = store.users.filter((u) => u.id !== userId);
  return { ok: true };
}

export type DeleteUserResult = 'ok' | 'last_admin' | 'not_found';

export async function deleteUserAccount(userId: string): Promise<DeleteUserResult> {
  if (usesJsonStylePersistence()) {
    return withJsonStore((store) => {
      const r = deleteUserCascadeInJsonStore(store, userId);
      if (!r.ok) return r.reason;
      return 'ok';
    });
  }

  if (!sequelize) return 'not_found';

  const t = await sequelize.transaction();
  try {
    const user = await User.findByPk(userId, { transaction: t });
    if (!user) {
      await t.rollback();
      return 'not_found';
    }
    if (user.role === ROLE_CONFIG.admin) {
      const adminCount = await User.count({ where: { role: ROLE_CONFIG.admin }, transaction: t });
      if (adminCount <= 1) {
        await t.rollback();
        return 'last_admin';
      }
    }

    const subs = await QuestionnaireSubmission.findAll({
      where: { userId },
      attributes: ['id'],
      transaction: t,
    });
    const subIds = subs.map((s) => s.id as string);

    if (subIds.length > 0) {
      const matches = await Match.findAll({
        where: {
          [Op.or]: [
            { entrepriseSubmissionId: { [Op.in]: subIds } },
            { etudiantSubmissionId: { [Op.in]: subIds } },
          ],
        },
        attributes: ['id'],
        transaction: t,
      });
      const mids = matches.map((m) => m.id as string);
      if (mids.length > 0) {
        await MatchMessage.destroy({ where: { matchId: { [Op.in]: mids } }, transaction: t });
        await Match.destroy({ where: { id: { [Op.in]: mids } }, transaction: t });
      }
      await SubmissionAnswer.destroy({ where: { submissionId: { [Op.in]: subIds } }, transaction: t });
      await QuestionnaireSubmission.destroy({ where: { userId }, transaction: t });
    }

    const replacement = await User.findOne({
      where: { id: { [Op.ne]: userId }, role: ROLE_CONFIG.admin },
      attributes: ['id'],
      transaction: t,
    });
    const repId =
      replacement?.id ??
      (await User.findOne({
        where: { id: { [Op.ne]: userId } },
        attributes: ['id'],
        transaction: t,
      }))?.id;
    if (repId) {
      await Match.update({ createdByUserId: repId }, { where: { createdByUserId: userId }, transaction: t });
    }

    await MatchMessage.destroy({ where: { senderUserId: userId }, transaction: t });
    await user.destroy({ transaction: t });
    await t.commit();
    return 'ok';
  } catch (e) {
    await t.rollback();
    throw e;
  }
}

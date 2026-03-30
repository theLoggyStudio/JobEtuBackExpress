import { randomUUID } from 'node:crypto';
import { Op } from 'sequelize';
import { QUESTIONNAIRE_TARGET_CONFIG, usesJsonStylePersistence } from '../../Constants/variable.constant';
import type { QuestionnaireTarget } from '../../Constants/types.constant';
import { Questionnaire } from '../models';
import type { QuestionnaireEntity } from './entities';
import { loadJsonStore, withJsonStore } from './json/jsonDb';

export function toQuestionnaireEntity(q: InstanceType<typeof Questionnaire>): QuestionnaireEntity {
  const t = q as InstanceType<typeof Questionnaire> & { createdAt: Date; updatedAt: Date };
  return {
    id: q.id,
    slug: q.slug,
    title: q.title,
    targetUserType: q.targetUserType as QuestionnaireTarget,
    description: q.description,
    whatsappLink: q.whatsappLink,
    definition: q.definition as Record<string, unknown>,
    isActive: q.isActive,
    createdAt: t.createdAt,
    updatedAt: t.updatedAt,
  };
}

export async function listQuestionnairesAdmin(): Promise<QuestionnaireEntity[]> {
  if (usesJsonStylePersistence()) {
    const s = loadJsonStore();
    return [...s.questionnaires].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }
  const rows = await Questionnaire.findAll({ order: [['createdAt', 'DESC']] });
  return rows.map(toQuestionnaireEntity);
}

export async function listQuestionnairesPublic(target?: string): Promise<QuestionnaireEntity[]> {
  if (target === QUESTIONNAIRE_TARGET_CONFIG.entreprise || target === QUESTIONNAIRE_TARGET_CONFIG.etudiant) {
    const q = await findQuestionnaireByTarget(target);
    return q && q.isActive ? [q] : [];
  }
  if (usesJsonStylePersistence()) {
    const s = loadJsonStore();
    return s.questionnaires
      .filter((q) => q.isActive)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }
  const rows = await Questionnaire.findAll({ where: { isActive: true }, order: [['createdAt', 'DESC']] });
  return rows.map(toQuestionnaireEntity);
}

export async function findQuestionnaireBySlug(slug: string): Promise<QuestionnaireEntity | null> {
  if (usesJsonStylePersistence()) {
    const s = loadJsonStore();
    return s.questionnaires.find((q) => q.slug === slug) ?? null;
  }
  const q = await Questionnaire.findOne({ where: { slug } });
  return q ? toQuestionnaireEntity(q) : null;
}

export async function findQuestionnaireById(id: string): Promise<QuestionnaireEntity | null> {
  if (usesJsonStylePersistence()) {
    const s = loadJsonStore();
    return s.questionnaires.find((q) => q.id === id) ?? null;
  }
  const q = await Questionnaire.findByPk(id);
  return q ? toQuestionnaireEntity(q) : null;
}

/** Un seul formulaire métier par cible : slug préféré = `entreprise` | `etudiant`. */
export async function findQuestionnaireByTarget(
  target: QuestionnaireTarget
): Promise<QuestionnaireEntity | null> {
  if (usesJsonStylePersistence()) {
    const s = loadJsonStore();
    const byCanonical = s.questionnaires.find((q) => q.slug === target && q.targetUserType === target);
    if (byCanonical) return byCanonical;
    const sameTarget = s.questionnaires.filter((q) => q.targetUserType === target);
    if (sameTarget.length === 0) return null;
    return [...sameTarget].sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())[0]!;
  }
  const canonical = await Questionnaire.findOne({ where: { slug: target, targetUserType: target } });
  if (canonical) return toQuestionnaireEntity(canonical);
  const rows = await Questionnaire.findAll({
    where: { targetUserType: target },
    order: [['updatedAt', 'DESC']],
    limit: 1,
  });
  return rows[0] ? toQuestionnaireEntity(rows[0]) : null;
}

export async function slugExists(slug: string, excludeId?: string): Promise<boolean> {
  if (usesJsonStylePersistence()) {
    const s = loadJsonStore();
    return s.questionnaires.some((q) => q.slug === slug && q.id !== excludeId);
  }
  const where: Record<string, unknown> = { slug };
  if (excludeId) {
    where.id = { [Op.ne]: excludeId };
  }
  const found = await Questionnaire.findOne({ where });
  return Boolean(found);
}

export async function createQuestionnaireEntity(input: {
  slug: string;
  title: string;
  targetUserType: QuestionnaireTarget;
  description: string | null;
  whatsappLink: string | null;
  definition: Record<string, unknown>;
  isActive: boolean;
}): Promise<QuestionnaireEntity> {
  if (usesJsonStylePersistence()) {
    return withJsonStore((store) => {
      const now = new Date();
      const entity: QuestionnaireEntity = {
        id: randomUUID(),
        slug: input.slug,
        title: input.title,
        targetUserType: input.targetUserType,
        description: input.description,
        whatsappLink: input.whatsappLink,
        definition: input.definition,
        isActive: input.isActive,
        createdAt: now,
        updatedAt: now,
      };
      store.questionnaires.push(entity);
      return entity;
    });
  }
  const q = await Questionnaire.create({
    slug: input.slug,
    title: input.title,
    targetUserType: input.targetUserType,
    description: input.description,
    whatsappLink: input.whatsappLink,
    definition: input.definition,
    isActive: input.isActive,
  });
  return toQuestionnaireEntity(q);
}

export async function updateQuestionnaireEntity(
  id: string,
  input: {
    slug: string;
    title: string;
    targetUserType: QuestionnaireTarget;
    description: string | null;
    whatsappLink: string | null;
    definition: Record<string, unknown>;
  }
): Promise<QuestionnaireEntity | null> {
  if (usesJsonStylePersistence()) {
    return withJsonStore((store) => {
      const q = store.questionnaires.find((x) => x.id === id);
      if (!q) return null;
      q.slug = input.slug;
      q.title = input.title;
      q.targetUserType = input.targetUserType;
      q.description = input.description;
      q.whatsappLink = input.whatsappLink;
      q.definition = input.definition;
      q.updatedAt = new Date();
      return q;
    });
  }
  const q = await Questionnaire.findByPk(id);
  if (!q) return null;
  await q.update({
    slug: input.slug,
    title: input.title,
    targetUserType: input.targetUserType,
    description: input.description,
    whatsappLink: input.whatsappLink,
    definition: input.definition,
  });
  return toQuestionnaireEntity(q);
}

export async function toggleQuestionnaireEntity(id: string): Promise<QuestionnaireEntity | null> {
  if (usesJsonStylePersistence()) {
    return withJsonStore((store) => {
      const q = store.questionnaires.find((x) => x.id === id);
      if (!q) return null;
      q.isActive = !q.isActive;
      q.updatedAt = new Date();
      return q;
    });
  }
  const q = await Questionnaire.findByPk(id);
  if (!q) return null;
  await q.update({ isActive: !q.isActive });
  return toQuestionnaireEntity(q);
}

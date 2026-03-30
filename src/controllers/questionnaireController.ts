import type { Request, Response } from 'express';
import { z } from 'zod';
import type { QuestionnaireTarget } from '../../Constants/types.constant';
import {
  HTTP_STATUS,
  MESSAGE_CONFIG,
  QUESTIONNAIRE_TARGET_CONFIG,
  ROLE_CONFIG,
} from '../../Constants/variable.constant';
import type { QuestionnaireEntity } from '../repositories/entities';
import {
  createQuestionnaireEntity,
  findQuestionnaireById,
  findQuestionnaireBySlug,
  findQuestionnaireByTarget,
  listQuestionnairesAdmin,
  listQuestionnairesPublic,
  slugExists,
  toggleQuestionnaireEntity,
  updateQuestionnaireEntity,
} from '../repositories/questionnaireRepository';
import { questionnaireDefinitionSchema } from '../validators/questionnaireSchema';

function dto(q: QuestionnaireEntity) {
  const def = q.definition as Record<string, unknown>;
  return {
    id: q.id,
    slug: q.slug,
    title: q.title,
    targetUserType: q.targetUserType,
    description: q.description,
    whatsappLink: q.whatsappLink,
    definition: def,
    isActive: q.isActive,
  };
}

export async function listQuestionnaires(req: Request, res: Response): Promise<void> {
  const isAdmin = req.auth?.role === ROLE_CONFIG.admin;
  const target = req.query.target as string | undefined;

  if (isAdmin) {
    const items = await listQuestionnairesAdmin();
    res.json({ items: items.map(dto) });
    return;
  }

  const items = await listQuestionnairesPublic(target);
  res.json({ items: items.map(dto) });
}

export async function getBySlug(req: Request, res: Response): Promise<void> {
  const slug = req.params.slug;
  let q = await findQuestionnaireBySlug(slug);
  if (
    !q &&
    (slug === QUESTIONNAIRE_TARGET_CONFIG.entreprise || slug === QUESTIONNAIRE_TARGET_CONFIG.etudiant)
  ) {
    q = await findQuestionnaireByTarget(slug as QuestionnaireTarget);
  }
  if (!q || !q.isActive) {
    res.status(HTTP_STATUS.notFound).json({ error: MESSAGE_CONFIG.notFound });
    return;
  }
  res.json(dto(q));
}

const createBodySchema = z.object({
  definition: questionnaireDefinitionSchema,
});

export async function createQuestionnaire(req: Request, res: Response): Promise<void> {
  const { definition } = createBodySchema.parse(req.body);
  const canonicalSlug = definition.targetUserType;
  const existing = await findQuestionnaireByTarget(definition.targetUserType);
  if (existing) {
    if (await slugExists(canonicalSlug, existing.id)) {
      res
        .status(HTTP_STATUS.conflict)
        .json({ error: 'Conflit de slug : un autre enregistrement utilise déjà ce slug.' });
      return;
    }
    const q = await updateQuestionnaireEntity(existing.id, {
      slug: canonicalSlug,
      title: definition.title,
      targetUserType: definition.targetUserType,
      description: definition.description ?? null,
      whatsappLink: definition.whatsappLink?.trim() ? definition.whatsappLink : null,
      definition: definition as unknown as Record<string, unknown>,
    });
    if (!q) {
      res.status(HTTP_STATUS.notFound).json({ error: MESSAGE_CONFIG.notFound });
      return;
    }
    res.json(dto(q));
    return;
  }
  if (await slugExists(canonicalSlug)) {
    res
      .status(HTTP_STATUS.conflict)
      .json({
        error: `Le slug « ${canonicalSlug} » est déjà réservé. Supprimez ou renommez l’autre questionnaire.`,
      });
    return;
  }
  const q = await createQuestionnaireEntity({
    slug: canonicalSlug,
    title: definition.title,
    targetUserType: definition.targetUserType,
    description: definition.description ?? null,
    whatsappLink: definition.whatsappLink?.trim() ? definition.whatsappLink : null,
    definition: definition as unknown as Record<string, unknown>,
    isActive: true,
  });
  res.status(HTTP_STATUS.created).json(dto(q));
}

const updateBodySchema = z.object({
  definition: questionnaireDefinitionSchema,
});

export async function updateQuestionnaire(req: Request, res: Response): Promise<void> {
  const { definition } = updateBodySchema.parse(req.body);
  const existing = await findQuestionnaireById(req.params.id);
  if (!existing) {
    res.status(HTTP_STATUS.notFound).json({ error: MESSAGE_CONFIG.notFound });
    return;
  }
  const slug = definition.targetUserType;
  if (slug !== existing.slug && (await slugExists(slug, existing.id))) {
    res.status(HTTP_STATUS.conflict).json({ error: 'Ce slug est déjà utilisé par un autre questionnaire.' });
    return;
  }
  const q = await updateQuestionnaireEntity(existing.id, {
    slug,
    title: definition.title,
    targetUserType: definition.targetUserType,
    description: definition.description ?? null,
    whatsappLink: definition.whatsappLink?.trim() ? definition.whatsappLink : null,
    definition: definition as unknown as Record<string, unknown>,
  });
  if (!q) {
    res.status(HTTP_STATUS.notFound).json({ error: MESSAGE_CONFIG.notFound });
    return;
  }
  res.json(dto(q));
}

export async function toggleQuestionnaire(req: Request, res: Response): Promise<void> {
  const q = await toggleQuestionnaireEntity(req.params.id);
  if (!q) {
    res.status(HTTP_STATUS.notFound).json({ error: MESSAGE_CONFIG.notFound });
    return;
  }
  res.json(dto(q));
}

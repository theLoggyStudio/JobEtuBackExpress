import { z } from 'zod';
import { BUSINESS_RULES, QUESTIONNAIRE_TARGET_CONFIG, WHATSAPP_CONFIG } from '../../Constants/variable.constant';

const fieldTypes = [
  'text',
  'textarea',
  'email',
  'tel',
  'number',
  'select',
  'radio',
  'checkboxes',
  'file',
  'info',
  'date',
  'time',
  'datetime',
] as const;

const fieldSchema = z.object({
  name: z.string().min(1).max(120),
  label: z.string().min(1).max(200),
  type: z.enum(fieldTypes),
  required: z.boolean().optional(),
  options: z.array(z.string()).optional(),
});

/** Une étape = une seule question (un champ). */
const stepSchema = z.object({
  title: z.string().min(1).max(200),
  fields: z.array(fieldSchema).length(1),
});

export const questionnaireDefinitionSchema = z.object({
  title: z.string().min(1).max(BUSINESS_RULES.maxQuestionnaireTitleLength),
  targetUserType: z.enum([
    QUESTIONNAIRE_TARGET_CONFIG.entreprise,
    QUESTIONNAIRE_TARGET_CONFIG.etudiant,
  ]),
  description: z.string().max(2000).optional(),
  whatsappLink: z
    .union([z.string().url().max(WHATSAPP_CONFIG.maxLinkLength), z.literal('')])
    .optional(),
  steps: z.array(stepSchema).min(1),
});

export type QuestionnaireDefinitionInput = z.infer<typeof questionnaireDefinitionSchema>;

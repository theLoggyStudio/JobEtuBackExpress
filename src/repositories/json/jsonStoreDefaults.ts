import { TEST_DEFAULT_ADMIN_CONFIG } from '../../../Constants/mode.constant';
import { QUESTIONNAIRE_TARGET_CONFIG, ROLE_CONFIG, SECURITY_CONFIG } from '../../../Constants/variable.constant';
import { DEFAULT_ENTREPRISE_QUESTIONNAIRE_STEPS } from './defaultEntrepriseQuestionnaireSteps';
import bcrypt from 'bcryptjs';
import type {
  AnswerEntity,
  MatchEntity,
  MatchMessageEntity,
  QuestionnaireEntity,
  SubmissionEntity,
  SubmissionPaymentSessionEntity,
  UserEntity,
} from '../entities';

export type JsonStoreFile = {
  users: UserEntity[];
  questionnaires: QuestionnaireEntity[];
  submissions: SubmissionEntity[];
  answers: AnswerEntity[];
  matches: MatchEntity[];
  matchMessages: MatchMessageEntity[];
  submissionPaymentSessions?: SubmissionPaymentSessionEntity[];
};

/** Données initiales (admin + 2 questionnaires) — utilisé par fichier JSON et par la RAM de test. */
export function createDefaultJsonStore(): JsonStoreFile {
  const now = new Date();
  const passwordHash = bcrypt.hashSync(
    TEST_DEFAULT_ADMIN_CONFIG.password,
    SECURITY_CONFIG.bcryptRounds
  );
  return {
    users: [
      {
        id: TEST_DEFAULT_ADMIN_CONFIG.id,
        email: TEST_DEFAULT_ADMIN_CONFIG.email.toLowerCase(),
        passwordHash,
        role: ROLE_CONFIG.admin,
        displayName: TEST_DEFAULT_ADMIN_CONFIG.displayName,
        phone: null,
        location: null,
        paymentMetadata: null,
        createdAt: now,
        updatedAt: now,
      },
    ],
    questionnaires: [
      {
        id: '10000000-0000-4000-8000-000000000001',
        slug: QUESTIONNAIRE_TARGET_CONFIG.entreprise,
        title: 'Formulaire entreprise',
        targetUserType: QUESTIONNAIRE_TARGET_CONFIG.entreprise,
        description: 'Décrivez votre besoin',
        whatsappLink: '',
        isActive: true,
        definition: {
          title: 'Formulaire entreprise',
          targetUserType: QUESTIONNAIRE_TARGET_CONFIG.entreprise,
          description: 'Décrivez votre besoin',
          whatsappLink: '',
          steps: [...DEFAULT_ENTREPRISE_QUESTIONNAIRE_STEPS],
        },
        createdAt: now,
        updatedAt: now,
      },
      {
        id: '10000000-0000-4000-8000-000000000002',
        slug: QUESTIONNAIRE_TARGET_CONFIG.etudiant,
        title: 'Formulaire étudiant',
        targetUserType: QUESTIONNAIRE_TARGET_CONFIG.etudiant,
        description: 'Vos compétences et disponibilités',
        whatsappLink: '',
        isActive: true,
        definition: {
          title: 'Formulaire étudiant',
          targetUserType: QUESTIONNAIRE_TARGET_CONFIG.etudiant,
          description: 'Vos compétences et disponibilités',
          whatsappLink: '',
          steps: [
            {
              title: 'Compétences',
              fields: [{ name: 'skills', label: 'Compétences', type: 'textarea', required: true }],
            },
            {
              title: 'Disponibilité',
              fields: [{ name: 'availability', label: 'Disponibilité', type: 'text', required: false }],
            },
          ],
        },
        createdAt: now,
        updatedAt: now,
      },
    ],
    submissions: [],
    answers: [],
    matches: [],
    matchMessages: [],
    submissionPaymentSessions: [],
  };
}

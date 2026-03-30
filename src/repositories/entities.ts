import type { MatchStatus, QuestionnaireTarget, UserRole } from '../../Constants/types.constant';

export type UserEntity = {
  id: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  displayName: string | null;
  phone: string | null;
  location: Record<string, unknown> | null;
  paymentMetadata: Record<string, unknown> | null;
  createdAt: Date;
  updatedAt: Date;
};

export type QuestionnaireEntity = {
  id: string;
  slug: string;
  title: string;
  targetUserType: QuestionnaireTarget;
  description: string | null;
  whatsappLink: string | null;
  definition: Record<string, unknown>;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export type SubmissionEntity = {
  id: string;
  userId: string;
  questionnaireId: string;
  targetUserType: QuestionnaireTarget;
  profileSnapshot: Record<string, unknown> | null;
  createdAt: Date;
  updatedAt: Date;
};

export type AnswerEntity = {
  id: string;
  submissionId: string;
  fieldName: string;
  value: string;
  createdAt: Date;
  updatedAt: Date;
};

export type MatchEntity = {
  id: string;
  createdByUserId: string;
  entrepriseSubmissionId: string;
  etudiantSubmissionId: string;
  metadata: Record<string, unknown> | null;
  /** Note admin sur 10 pour le dossier entreprise ; `null` = non noté. */
  adminRatingEntreprise: number | null;
  /** Note admin sur 10 pour le dossier étudiant ; `null` = non noté. */
  adminRatingEtudiant: number | null;
  status: MatchStatus;
  createdAt: Date;
  updatedAt: Date;
};

export type MatchMessageEntity = {
  id: string;
  matchId: string;
  senderUserId: string;
  body: string;
  createdAt: Date;
  updatedAt: Date;
};

export type SubmissionPaymentSessionStatus = 'pending' | 'completed' | 'failed';

/** Session de paiement PayDunya avant création réelle de la soumission questionnaire. */
export type SubmissionPaymentSessionEntity = {
  id: string;
  userId: string;
  questionnaireId: string;
  questionnaireSlug: string;
  targetUserType: QuestionnaireTarget;
  answers: Record<string, string>;
  profileSnapshot: Record<string, unknown> | null;
  invoiceToken: string | null;
  status: SubmissionPaymentSessionStatus;
  resultSubmissionId: string | null;
  createdAt: Date;
  updatedAt: Date;
};

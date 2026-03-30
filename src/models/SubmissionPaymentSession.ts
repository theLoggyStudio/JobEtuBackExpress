import type { Sequelize } from 'sequelize';
import { DataTypes, Model, type Optional } from 'sequelize';
import { QUESTIONNAIRE_TARGET_CONFIG } from '../../Constants/variable.constant';
import type { QuestionnaireTarget } from '../../Constants/types.constant';
import type { SubmissionPaymentSessionStatus } from '../repositories/entities';

export type SubmissionPaymentSessionAttrs = {
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
};

export type SubmissionPaymentSessionCreation = Optional<
  SubmissionPaymentSessionAttrs,
  'id' | 'invoiceToken' | 'resultSubmissionId' | 'profileSnapshot'
>;

export class SubmissionPaymentSession
  extends Model<SubmissionPaymentSessionAttrs, SubmissionPaymentSessionCreation>
  implements SubmissionPaymentSessionAttrs
{
  declare id: string;
  declare userId: string;
  declare questionnaireId: string;
  declare questionnaireSlug: string;
  declare targetUserType: QuestionnaireTarget;
  declare answers: Record<string, string>;
  declare profileSnapshot: Record<string, unknown> | null;
  declare invoiceToken: string | null;
  declare status: SubmissionPaymentSessionStatus;
  declare resultSubmissionId: string | null;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
}

export function initSubmissionPaymentSession(sequelize: Sequelize): typeof SubmissionPaymentSession {
  SubmissionPaymentSession.init(
    {
      id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
      userId: { type: DataTypes.UUID, allowNull: false },
      questionnaireId: { type: DataTypes.UUID, allowNull: false },
      questionnaireSlug: { type: DataTypes.STRING(255), allowNull: false },
      targetUserType: {
        type: DataTypes.ENUM(
          QUESTIONNAIRE_TARGET_CONFIG.entreprise,
          QUESTIONNAIRE_TARGET_CONFIG.etudiant
        ),
        allowNull: false,
      },
      answers: { type: DataTypes.JSONB, allowNull: false },
      profileSnapshot: DataTypes.JSONB,
      invoiceToken: { type: DataTypes.TEXT, allowNull: true },
      status: {
        type: DataTypes.ENUM('pending', 'completed', 'failed'),
        allowNull: false,
        defaultValue: 'pending',
      },
      resultSubmissionId: { type: DataTypes.UUID, allowNull: true },
    },
    { sequelize, modelName: 'SubmissionPaymentSession', tableName: 'submission_payment_sessions' }
  );
  return SubmissionPaymentSession;
}

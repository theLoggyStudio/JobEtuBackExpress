import type { Sequelize } from 'sequelize';
import { DataTypes, Model, type Optional } from 'sequelize';
import { QUESTIONNAIRE_TARGET_CONFIG } from '../../Constants/variable.constant';
import type { QuestionnaireTarget } from '../../Constants/types.constant';

export type QuestionnaireSubmissionAttrs = {
  id: string;
  userId: string;
  questionnaireId: string;
  targetUserType: QuestionnaireTarget;
  profileSnapshot: Record<string, unknown> | null;
};

export type QuestionnaireSubmissionCreation = Optional<
  QuestionnaireSubmissionAttrs,
  'id' | 'profileSnapshot'
>;

export class QuestionnaireSubmission
  extends Model<QuestionnaireSubmissionAttrs, QuestionnaireSubmissionCreation>
  implements QuestionnaireSubmissionAttrs
{
  declare id: string;
  declare userId: string;
  declare questionnaireId: string;
  declare targetUserType: QuestionnaireTarget;
  declare profileSnapshot: Record<string, unknown> | null;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
}

export function initQuestionnaireSubmission(sequelize: Sequelize): typeof QuestionnaireSubmission {
  QuestionnaireSubmission.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      userId: { type: DataTypes.UUID, allowNull: false },
      questionnaireId: { type: DataTypes.UUID, allowNull: false },
      targetUserType: {
        type: DataTypes.ENUM(
          QUESTIONNAIRE_TARGET_CONFIG.entreprise,
          QUESTIONNAIRE_TARGET_CONFIG.etudiant
        ),
        allowNull: false,
      },
      profileSnapshot: DataTypes.JSONB,
    },
    { sequelize, modelName: 'QuestionnaireSubmission', tableName: 'questionnaire_submissions' }
  );
  return QuestionnaireSubmission;
}

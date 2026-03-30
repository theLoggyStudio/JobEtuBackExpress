import type { Sequelize } from 'sequelize';
import { DataTypes, Model, type Optional } from 'sequelize';
import { QUESTIONNAIRE_TARGET_CONFIG } from '../../Constants/variable.constant';
import type { QuestionnaireTarget } from '../../Constants/types.constant';

export type QuestionnaireAttrs = {
  id: string;
  slug: string;
  title: string;
  targetUserType: QuestionnaireTarget;
  description: string | null;
  whatsappLink: string | null;
  definition: Record<string, unknown>;
  isActive: boolean;
};

export type QuestionnaireCreation = Optional<QuestionnaireAttrs, 'id' | 'description' | 'whatsappLink' | 'isActive'>;

export class Questionnaire extends Model<QuestionnaireAttrs, QuestionnaireCreation> implements QuestionnaireAttrs {
  declare id: string;
  declare slug: string;
  declare title: string;
  declare targetUserType: QuestionnaireTarget;
  declare description: string | null;
  declare whatsappLink: string | null;
  declare definition: Record<string, unknown>;
  declare isActive: boolean;
}

export function initQuestionnaire(sequelize: Sequelize): typeof Questionnaire {
  Questionnaire.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      slug: { type: DataTypes.STRING(160), allowNull: false, unique: true },
      title: { type: DataTypes.STRING(200), allowNull: false },
      targetUserType: {
        type: DataTypes.ENUM(
          QUESTIONNAIRE_TARGET_CONFIG.entreprise,
          QUESTIONNAIRE_TARGET_CONFIG.etudiant
        ),
        allowNull: false,
      },
      description: DataTypes.TEXT,
      whatsappLink: DataTypes.STRING(2048),
      definition: { type: DataTypes.JSONB, allowNull: false },
      isActive: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    },
    { sequelize, modelName: 'Questionnaire', tableName: 'questionnaires' }
  );
  return Questionnaire;
}

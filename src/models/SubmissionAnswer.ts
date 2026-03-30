import type { Sequelize } from 'sequelize';
import { DataTypes, Model, type Optional } from 'sequelize';

export type SubmissionAnswerAttrs = {
  id: string;
  submissionId: string;
  fieldName: string;
  value: string;
};

export type SubmissionAnswerCreation = Optional<SubmissionAnswerAttrs, 'id'>;

export class SubmissionAnswer
  extends Model<SubmissionAnswerAttrs, SubmissionAnswerCreation>
  implements SubmissionAnswerAttrs
{
  declare id: string;
  declare submissionId: string;
  declare fieldName: string;
  declare value: string;
}

export function initSubmissionAnswer(sequelize: Sequelize): typeof SubmissionAnswer {
  SubmissionAnswer.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      submissionId: { type: DataTypes.UUID, allowNull: false },
      fieldName: { type: DataTypes.STRING(200), allowNull: false },
      value: { type: DataTypes.TEXT, allowNull: false },
    },
    { sequelize, modelName: 'SubmissionAnswer', tableName: 'submission_answers' }
  );
  return SubmissionAnswer;
}

import { sequelize } from '../config/database';
import { User, initUser } from './User';
import { Questionnaire, initQuestionnaire } from './Questionnaire';
import { QuestionnaireSubmission, initQuestionnaireSubmission } from './QuestionnaireSubmission';
import { SubmissionAnswer, initSubmissionAnswer } from './SubmissionAnswer';
import { Match, initMatch } from './Match';
import { MatchMessage, initMatchMessage } from './MatchMessage';
import { SubmissionPaymentSession, initSubmissionPaymentSession } from './SubmissionPaymentSession';
import { SERVER_CONFIG, STORAGE_DRIVER_CONFIG } from '../../Constants/variable.constant';

if (sequelize) {
  initUser(sequelize);
  initQuestionnaire(sequelize);
  initQuestionnaireSubmission(sequelize);
  initSubmissionAnswer(sequelize);
  initMatch(sequelize);
  initMatchMessage(sequelize);
  initSubmissionPaymentSession(sequelize);

  User.hasMany(QuestionnaireSubmission, { foreignKey: 'userId' });
  QuestionnaireSubmission.belongsTo(User, { foreignKey: 'userId' });

  Questionnaire.hasMany(QuestionnaireSubmission, { foreignKey: 'questionnaireId' });
  QuestionnaireSubmission.belongsTo(Questionnaire, { foreignKey: 'questionnaireId' });

  QuestionnaireSubmission.hasMany(SubmissionAnswer, { foreignKey: 'submissionId', onDelete: 'CASCADE' });
  SubmissionAnswer.belongsTo(QuestionnaireSubmission, { foreignKey: 'submissionId' });

  User.hasMany(Match, { foreignKey: 'createdByUserId' });
  Match.belongsTo(User, { foreignKey: 'createdByUserId' });

  Match.belongsTo(QuestionnaireSubmission, { foreignKey: 'entrepriseSubmissionId', as: 'EntrepriseSubmission' });
  Match.belongsTo(QuestionnaireSubmission, {
    foreignKey: 'etudiantSubmissionId',
    as: 'EtudiantSubmission',
  });

  Match.hasMany(MatchMessage, { foreignKey: 'matchId', onDelete: 'CASCADE' });
  MatchMessage.belongsTo(Match, { foreignKey: 'matchId' });
  User.hasMany(MatchMessage, { foreignKey: 'senderUserId' });
  MatchMessage.belongsTo(User, { foreignKey: 'senderUserId' });

  User.hasMany(SubmissionPaymentSession, { foreignKey: 'userId' });
  SubmissionPaymentSession.belongsTo(User, { foreignKey: 'userId' });
}

export async function syncDatabase(): Promise<void> {
  if (sequelize && SERVER_CONFIG.storageDriver === STORAGE_DRIVER_CONFIG.postgres && SERVER_CONFIG.dbSync) {
    await sequelize.sync({ alter: true });
  }
}

export {
  sequelize,
  User,
  Questionnaire,
  QuestionnaireSubmission,
  SubmissionAnswer,
  Match,
  MatchMessage,
  SubmissionPaymentSession,
};

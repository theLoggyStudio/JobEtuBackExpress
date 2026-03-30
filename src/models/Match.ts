import type { Sequelize } from 'sequelize';
import { DataTypes, Model, type Optional } from 'sequelize';
import type { MatchStatus } from '../../Constants/types.constant';
import { MATCH_STATUS_CONFIG } from '../../Constants/variable.constant';

export type MatchAttrs = {
  id: string;
  createdByUserId: string;
  entrepriseSubmissionId: string;
  etudiantSubmissionId: string;
  metadata: Record<string, unknown> | null;
  adminRatingEntreprise: number | null;
  adminRatingEtudiant: number | null;
  status: MatchStatus;
};

export type MatchCreation = Optional<
  MatchAttrs,
  'id' | 'metadata' | 'adminRatingEntreprise' | 'adminRatingEtudiant' | 'status'
>;

export class Match extends Model<MatchAttrs, MatchCreation> implements MatchAttrs {
  declare id: string;
  declare createdByUserId: string;
  declare entrepriseSubmissionId: string;
  declare etudiantSubmissionId: string;
  declare metadata: Record<string, unknown> | null;
  declare adminRatingEntreprise: number | null;
  declare adminRatingEtudiant: number | null;
  declare status: MatchStatus;
}

export function initMatch(sequelize: Sequelize): typeof Match {
  Match.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      createdByUserId: { type: DataTypes.UUID, allowNull: false },
      entrepriseSubmissionId: { type: DataTypes.UUID, allowNull: false },
      etudiantSubmissionId: { type: DataTypes.UUID, allowNull: false },
      metadata: DataTypes.JSONB,
      adminRatingEntreprise: { type: DataTypes.INTEGER, allowNull: true },
      adminRatingEtudiant: { type: DataTypes.INTEGER, allowNull: true },
      status: {
        type: DataTypes.STRING(16),
        allowNull: false,
        defaultValue: MATCH_STATUS_CONFIG.validated,
      },
    },
    { sequelize, modelName: 'Match', tableName: 'matches' }
  );
  return Match;
}

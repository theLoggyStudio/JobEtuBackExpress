import type { Sequelize } from 'sequelize';
import { DataTypes, Model, type Optional } from 'sequelize';

export type MatchMessageAttrs = {
  id: string;
  matchId: string;
  senderUserId: string;
  body: string;
};

export type MatchMessageCreation = Optional<MatchMessageAttrs, 'id'>;

export class MatchMessage
  extends Model<MatchMessageAttrs, MatchMessageCreation>
  implements MatchMessageAttrs
{
  declare id: string;
  declare matchId: string;
  declare senderUserId: string;
  declare body: string;
}

export function initMatchMessage(sequelize: Sequelize): typeof MatchMessage {
  MatchMessage.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      matchId: { type: DataTypes.UUID, allowNull: false },
      senderUserId: { type: DataTypes.UUID, allowNull: false },
      body: { type: DataTypes.TEXT, allowNull: false },
    },
    { sequelize, modelName: 'MatchMessage', tableName: 'match_messages' }
  );
  return MatchMessage;
}

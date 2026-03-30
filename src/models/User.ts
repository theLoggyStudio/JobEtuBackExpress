import type { Sequelize } from 'sequelize';
import { DataTypes, Model, type Optional } from 'sequelize';
import { ROLE_CONFIG } from '../../Constants/variable.constant';
import type { UserRole } from '../../Constants/types.constant';

export type UserAttrs = {
  id: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  displayName: string | null;
  phone: string | null;
  location: Record<string, unknown> | null;
  paymentMetadata: Record<string, unknown> | null;
};

export type UserCreation = Optional<UserAttrs, 'id' | 'displayName' | 'phone' | 'location' | 'paymentMetadata'>;

export class User extends Model<UserAttrs, UserCreation> implements UserAttrs {
  declare id: string;
  declare email: string;
  declare passwordHash: string;
  declare role: UserRole;
  declare displayName: string | null;
  declare phone: string | null;
  declare location: Record<string, unknown> | null;
  declare paymentMetadata: Record<string, unknown> | null;
}

export function initUser(sequelize: Sequelize): typeof User {
  User.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      email: { type: DataTypes.STRING(320), allowNull: false, unique: true },
      passwordHash: { type: DataTypes.STRING(255), allowNull: false },
      role: {
        type: DataTypes.ENUM(ROLE_CONFIG.admin, ROLE_CONFIG.entreprise, ROLE_CONFIG.etudiant),
        allowNull: false,
      },
      displayName: DataTypes.STRING(200),
      phone: DataTypes.STRING(40),
      location: DataTypes.JSONB,
      paymentMetadata: DataTypes.JSONB,
    },
    { sequelize, modelName: 'User', tableName: 'users' }
  );
  return User;
}

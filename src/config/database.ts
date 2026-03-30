import { Sequelize } from 'sequelize';
import { MESSAGE_CONFIG, SERVER_CONFIG, STORAGE_DRIVER_CONFIG } from '../../Constants/variable.constant';

const databaseUrl = process.env.DATABASE_URL;

if (SERVER_CONFIG.storageDriver === STORAGE_DRIVER_CONFIG.postgres) {
  if (!databaseUrl) {
    throw new Error(MESSAGE_CONFIG.databaseUrlRequired);
  }
}

export const sequelize: Sequelize | null =
  SERVER_CONFIG.storageDriver === STORAGE_DRIVER_CONFIG.postgres && databaseUrl
    ? new Sequelize(databaseUrl, {
        dialect: 'postgres',
        logging: SERVER_CONFIG.nodeEnv === 'development' ? console.log : false,
        define: {
          underscored: true,
          timestamps: true,
        },
      })
    : null;

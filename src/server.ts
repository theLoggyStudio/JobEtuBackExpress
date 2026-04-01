import 'express';
import app from './app';
import { MODE_CONFIG, TEST_DEFAULT_ADMIN_CONFIG } from '../Constants/mode.constant';
import {
  APP_CONFIG,
  MESSAGE_CONFIG,
  SERVER_CONFIG,
  STORAGE_DRIVER_CONFIG,
  usesJsonStylePersistence,
} from '../Constants/variable.constant';
import { syncDatabase } from './models';

async function main(): Promise<void> {
  await syncDatabase();
  app.listen(SERVER_CONFIG.port, () => {
    console.log(`${APP_CONFIG.name} écoute sur le port ${SERVER_CONFIG.port}`);
    if (usesJsonStylePersistence()) {
      console.log(
        `→ ${
          SERVER_CONFIG.storageDriver === STORAGE_DRIVER_CONFIG.memory
            ? MESSAGE_CONFIG.modeMemoryActif
            : MESSAGE_CONFIG.modeJsonActif
        }`
      );
      if (MODE_CONFIG.current === 'test' || SERVER_CONFIG.nodeEnv === 'development') {
        console.log(
          `→ Admin test (voir Constants/mode.constant.ts) : ${TEST_DEFAULT_ADMIN_CONFIG.email} / ${TEST_DEFAULT_ADMIN_CONFIG.password}`
        );
      }
    }
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

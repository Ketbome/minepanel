import * as path from 'path';

export default () => {
  const baseDir = process.env.BASE_DIR || '/app';
  return {
    jwtSecret: process.env.JWT_SECRET,
    clientUsername: process.env.CLIENT_USERNAME,
    clientPassword: process.env.CLIENT_PASSWORD,
    frontendUrl: process.env.FRONTEND_URL,
    defaultLanguage: process.env.DEFAULT_LANGUAGE ?? 'en',
    hostLanIP: process.env.HOST_LAN_IP,
    serversDir: path.join(baseDir, 'servers'),
    baseDir,
    database: {
      path: path.join(baseDir, 'data', 'minepanel.db'),
    },
  };
};

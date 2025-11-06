export default () => ({
  jwtSecret: process.env.JWT_SECRET,
  clientUsername: process.env.CLIENT_USERNAME,
  clientPassword: process.env.CLIENT_PASSWORD,
  frontendUrl: process.env.FRONTEND_URL,
  defaultLanguage: process.env.DEFAULT_LANGUAGE ?? 'en',
  serversDir: '/app/servers',
  baseDir: process.env.BASE_DIR || '/app',
  database: {
    path: '/app/data/minepanel.db',
  },
});

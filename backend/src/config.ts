export default () => ({
  jwtSecret: process.env.JWT_SECRET,
  clientUsername: process.env.CLIENT_USERNAME,
  clientPassword: process.env.CLIENT_PASSWORD,
  frontendUrl: process.env.FRONTEND_URL,
  defaultLanguage: process.env.DEFAULT_LANGUAGE ?? 'en',
  database: {
    path: process.env.DB_PATH || './data/minepanel.db',
  },
});

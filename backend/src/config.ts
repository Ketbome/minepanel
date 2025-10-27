export default () => ({ 
  jwtSecret: process.env.JWT_SECRET,
  clientUsername: process.env.CLIENT_USERNAME,
  clientPassword: process.env.CLIENT_PASSWORD,
  frontendUrl: process.env.FRONTEND_URL,
  defaultLanguage: process.env.DEFAULT_LANGUAGE ?? 'en',
  database: {
    host: process.env.DB_HOST,
    port: Number.parseInt(process.env.DB_PORT, 10),
    name: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
  },
});

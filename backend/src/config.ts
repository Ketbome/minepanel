export default () => ({
  jwtSecret: process.env.JWT_SECRET,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '2d',
  jwtIssuer: process.env.JWT_ISSUER || 'minepanel',
  jwtAudience: process.env.JWT_AUDIENCE || 'minepanel-users',
  frontendUrl: process.env.FRONTEND_URL,
  composeProject: process.env.COMPOSE_PROJECT,
  defaultLanguage: process.env.DEFAULT_LANGUAGE ?? 'en',
  passwordResetTokenExpiresInMinutes: Number(process.env.PASSWORD_RESET_TOKEN_EXPIRES_IN_MINUTES || 60),
  smtp: {
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === 'true',
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
    from: process.env.SMTP_FROM,
  },
  serversDir: '/app/servers',
  baseDir: process.env.BASE_DIR || '/app',
  database: {
    path: '/app/data/minepanel.db',
  },
});

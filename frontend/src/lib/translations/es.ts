export const es = {
  // Auth
  login: "Iniciar Sesión",
  logout: "Cerrar Sesión",
  username: "Nombre de Usuario",
  password: "Contraseña",
  invalidCredentials: "Credenciales inválidas",

  // Navigation
  dashboard: "Panel de Control",
  servers: "Servidores",
  settings: "Configuración",
  home: "Inicio",

  // Server Management
  createServer: "Crear Servidor",
  serverName: "Nombre del Servidor",
  serverType: "Tipo de Servidor",
  serverTypeDescription: "Selecciona el tipo de servidor de Minecraft que deseas configurar",
  serverVanilla: "Servidor básico de Minecraft sin mods ni plugins. Ideal para jugar en modo supervivencia clásico.",
  serverForge: "Servidor con soporte para mods usando Forge. Requiere configurar la versión de Forge específica a utilizar.",
  serverCurseForge: "Instala automáticamente modpacks de CurseForge. Se puede configurar mediante URL, o Slug.",
  serverCurseForgeManual: "Modo manual para modpacks de CurseForge. Utiliza archivos ZIP precargados. Función obsoleta, recomendamos usar CurseForge Modpack.",
  serverSpigot: "Servidor optimizado compatible con plugins de Bukkit",
  serverPaper: "Servidor de alto rendimiento basado en Spigot con optimizaciones adicionales",
  serverBukkit: "Servidor clásico con soporte de plugins API estándar",
  version: "Versión",
  memory: "Memoria",
  port: "Puerto",
  difficulty: "Dificultad",
  gameMode: "Modo de Juego",
  maxPlayers: "Jugadores Máximos",
  serverId: "ID del Servidor",

  // Server Actions
  start: "Iniciar",
  stop: "Detener",
  restart: "Reiniciar",
  delete: "Eliminar",
  edit: "Editar",
  console: "Consola",
  files: "Archivos",

  // Status
  online: "En Línea",
  offline: "Desconectado",
  starting: "Iniciando",
  stopping: "Deteniendo",
  running: "Ejecutándose",
  stopped: "Detenido",
  not_found: "No Encontrado",

  // Common
  save: "Guardar",
  cancel: "Cancelar",
  confirm: "Confirmar",
  loading: "Cargando...",
  error: "Error",
  success: "Éxito",

  // Messages
  serverCreated: "Servidor creado exitosamente",
  serverDeleted: "Servidor eliminado exitosamente",
  serverStarted: "Servidor iniciado exitosamente",
  serverStopped: "Servidor detenido exitosamente",
  loginSuccess: "Inicio de sesión exitoso",

  // Errors
  serverNotFound: "Servidor no encontrado",
  connectionError: "Error de conexión",
  unexpectedError: "Error inesperado",
  NO_ACCESS_TOKEN: "No se recibió token de acceso",
  LOGIN_ERROR: "Error al iniciar sesión",
  SERVER_START_ERROR: "Error al iniciar el servidor",
  SERVER_STOP_ERROR: "Error al detener el servidor",

  // Language
  language: "Idioma",
  spanish: "Español",
  english: "Inglés",

  // Welcome page
  welcome: "Bienvenido",
  welcomeDescription: "Gestiona tus servidores de Minecraft con facilidad",
  enterCredentials: "Ingresa tus credenciales para continuar",
  enterServer: "ENTRAR AL SERVIDOR",
  allRightsReserved: "Todos los derechos reservados",
  help: "Ayuda",
  privacy: "Privacidad",
  terms: "Términos",

  // Dashboard
  myServers: "Mis Servidores",
  noServers: "No tienes servidores creados",
  noServersDesc: "Crea tu primer servidor para comenzar",
  createFirstServer: "Crear Mi Primer Servidor",
  manageServer: "Gestionar Servidor",
  deleteServerConfirm: "¿Estás seguro de que quieres eliminar este servidor?",
  deleteServerDesc: "Esta acción no se puede deshacer. Se eliminará permanentemente el servidor y todos sus datos.",

  // Form validation
  idMinLength: "El ID debe tener al menos 3 caracteres",
  idMaxLength: "El ID debe tener máximo 20 caracteres",
  idInvalidChars: "El ID solo puede contener letras, números, guiones y guiones bajos",

  // Server creation
  serverCreationDesc: "Crea un nuevo servidor de Minecraft",
  serverIdPlaceholder: "mi-servidor",
  serverIdDesc: "Identificador único para tu servidor",

  // Plugins
  pluginsConfig: "Configuración de Plugins",
  pluginsConfigDesc: "Configura plugins para tu servidor",
  pluginsNotAvailable: "Esta sección solo está disponible para servidores Spigot, Paper o Bukkit",
  pluginsSelectServerType: 'Selecciona el tipo de servidor Spigot, Paper o Bukkit en la pestaña "Tipo de Servidor" para configurar plugins.',
  pluginsAutoDownload: "Descarga Automática desde Spiget",
  pluginsAutoDownloadDesc: "Descarga automática de plugins desde SpigotMC usando la API de Spiget. Los archivos ZIP se expandirán automáticamente en la carpeta de plugins.",
  pluginsManualInfo: "Para agregar plugins manualmente (archivos JAR), usa el File Browser para subirlos a la carpeta /plugins del servidor.",
  pluginsSpigetResources: "Recursos de Spiget (SPIGET_RESOURCES)",
  pluginsSpigetResourcesDesc: "IDs de recursos de SpigotMC (ej: LuckPerms=28140, Vault=34315)",
  pluginsSpigetNote: "Nota importante: La variable es SPIGET con E, no SPIGOT.",
  pluginsSpigetWarning: "⚠️ Algunos plugins como EssentialsX no permiten descargas automatizadas.",
  pluginsManualTitle: "Agregar plugins manualmente",
  pluginsManualStep1: "Accede al File Browser del servidor",
  pluginsManualStep2: "Navega a la carpeta /plugins",
  pluginsManualStep3: "Sube tus archivos JAR directamente",
  pluginsManualStep4: "Reinicia el servidor para que se carguen los plugins",
  pluginsTipsTitle: "Consejos útiles",
  pluginsTip1: "Los plugins se descargarán automáticamente al iniciar el servidor",
  pluginsTip2: "Los archivos ZIP se expandirán automáticamente en la carpeta de plugins",
  pluginsTip3: "Puedes combinar Spiget con plugins manuales desde File Browser",
  pluginsTip4: "Los plugins de Spigot también funcionan en Paper y Bukkit",
  pluginsSave: "Guardar Configuración",

  // Mods
  modsConfig: "Configuración de Mods",
  modsConfigDesc: "Configura los detalles de mods para tu servidor",
  modsNotAvailable: "Esta sección solo está disponible para servidores Forge o CurseForge",
  modsSelectServerType: 'Selecciona el tipo de servidor Forge o CurseForge en la pestaña "Tipo de Servidor" para configurar los mods.',

  // Common buttons and labels
  saveConfiguration: "Guardar Configuración",
  saveChanges: "Guardar Cambios",
};

export type TranslationKey = keyof typeof es;

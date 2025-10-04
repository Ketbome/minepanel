export const en = {
  // Auth
  login: "Login",
  logout: "Logout",
  username: "Username",
  password: "Password",
  invalidCredentials: "Invalid credentials",

  // Navigation
  dashboard: "Dashboard",
  servers: "Servers",
  settings: "Settings",
  home: "Home",

  // Server Management
  createServer: "Create Server",
  serverName: "Server Name",
  serverType: "Server Type",
  serverTypeDescription: "Select the type of Minecraft server you want to configure.",
  serverVanilla: "Basic Minecraft server without mods or plugins. Ideal for playing in classic survival mode.",
  serverForge: "Server with support for mods using Forge. Requires configuration of the specific version of Forge to be used.",
  serverCurseForge: "Automatically installs modpacks from CurseForge. Can be configured using the modpack's URL, or slug.",
  serverCurseForgeManual: "Manual mode for CurseForge modpacks. Uses preloaded ZIP files. Obsolete feature, we recommend using CurseForge Modpack.",
  serverSpigot: "Optimized server compatible with Bukkit plugins",
  serverPaper: "High-performance server based on Spigot with additional optimizations",
  serverBukkit: "Classic server with standard plugin API support",
  version: "Version",
  memory: "Memory",
  port: "Port",
  difficulty: "Difficulty",
  gameMode: "Game Mode",
  maxPlayers: "Max Players",
  serverId: "Server ID",

  // Server Actions
  start: "Start",
  stop: "Stop",
  restart: "Restart",
  delete: "Delete",
  edit: "Edit",
  console: "Console",
  files: "Files",

  // Status
  online: "Online",
  offline: "Offline",
  starting: "Starting",
  stopping: "Stopping",
  running: "Running",
  stopped: "Stopped",
  not_found: "Not Found",

  // Common
  save: "Save",
  cancel: "Cancel",
  confirm: "Confirm",
  loading: "Loading...",
  error: "Error",
  success: "Success",
  welcome: "Welcome",

  // Messages
  serverCreated: "Server created successfully",
  serverDeleted: "Server deleted successfully",
  serverStarted: "Server started successfully",
  serverStopped: "Server stopped successfully",
  loginSuccess: "Login successful",

  // Errors
  serverNotFound: "Server not found",
  connectionError: "Connection error",
  unexpectedError: "Unexpected error",
  NO_ACCESS_TOKEN: "No access token received",
  LOGIN_ERROR: "Login error",
  SERVER_START_ERROR: "Error starting server",
  SERVER_STOP_ERROR: "Error stopping server",

  // Language
  language: "Language",
  spanish: "Spanish",
  english: "English",

  // Welcome page
  welcomeDescription: "Manage your Minecraft servers with ease",
  enterCredentials: "Enter your credentials to continue",
  enterServer: "ENTER SERVER",
  allRightsReserved: "All rights reserved",
  help: "Help",
  privacy: "Privacy",
  terms: "Terms",

  // Dashboard
  myServers: "My Servers",
  noServers: "You don't have any servers created",
  noServersDesc: "Create your first server to get started",
  createFirstServer: "Create My First Server",
  manageServer: "Manage Server",
  deleteServerConfirm: "Are you sure you want to delete this server?",
  deleteServerDesc: "This action cannot be undone. This will permanently delete the server and all its data.",

  // Form validation
  idMinLength: "ID must be at least 3 characters",
  idMaxLength: "ID must be maximum 20 characters",
  idInvalidChars: "ID can only contain letters, numbers, hyphens and underscores",

  // Server creation
  serverCreationDesc: "Create a new Minecraft server",
  serverIdPlaceholder: "my-server",
  serverIdDesc: "Unique identifier for your server",

  // Plugins
  pluginsConfig: "Plugins Configuration",
  pluginsConfigDesc: "Configure plugins for your server",
  pluginsNotAvailable: "This section is only available for Spigot, Paper or Bukkit servers",
  pluginsSelectServerType: 'Select Spigot, Paper or Bukkit server type in the "Server Type" tab to configure plugins.',
  pluginsAutoDownload: "Auto-download from Spiget",
  pluginsAutoDownloadDesc: "Automatic plugin downloads from SpigotMC using Spiget API. ZIP files will be automatically expanded in the plugins folder.",
  pluginsManualInfo: "To add plugins manually (JAR files), use File Browser to upload them to the /plugins folder of the server.",
  pluginsSpigetResources: "Spiget Resources (SPIGET_RESOURCES)",
  pluginsSpigetResourcesDesc: "SpigotMC resource IDs (e.g: LuckPerms=28140, Vault=34315)",
  pluginsSpigetNote: "Important note: The variable is SPIGET with E, not SPIGOT.",
  pluginsSpigetWarning: "⚠️ Some plugins like EssentialsX do not allow automated downloads.",
  pluginsManualTitle: "Add plugins manually",
  pluginsManualStep1: "Access the server's File Browser",
  pluginsManualStep2: "Navigate to the /plugins folder",
  pluginsManualStep3: "Upload your JAR files directly",
  pluginsManualStep4: "Restart the server to load the plugins",
  pluginsTipsTitle: "Useful tips",
  pluginsTip1: "Plugins will be downloaded automatically when starting the server",
  pluginsTip2: "ZIP files will be automatically expanded in the plugins folder",
  pluginsTip3: "You can combine Spiget with manual plugins from File Browser",
  pluginsTip4: "Spigot plugins also work on Paper and Bukkit",
  pluginsSave: "Save Configuration",

  // Mods
  modsConfig: "Mods Configuration",
  modsConfigDesc: "Configure mod details for your server",
  modsNotAvailable: "This section is only available for Forge or CurseForge servers",
  modsSelectServerType: 'Select Forge or CurseForge server type in the "Server Type" tab to configure mods.',

  // Common buttons and labels
  saveConfiguration: "Save Configuration",
  saveChanges: "Save Changes",
};

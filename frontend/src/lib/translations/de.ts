import type { TranslationKey } from './en';

export const de: Record<TranslationKey, string> = {
  // ===========================
  // AUTHENTICATION
  // ===========================
  login: 'Anmelden',
  logout: 'Abmelden',
  username: 'Benutzername',
  password: 'Passwort',
  invalidCredentials: 'Ungültige Anmeldedaten',
  loginSuccess: 'Anmeldung erfolgreich',
  serverUnavailable: 'Keine Verbindung möglich',
  serverUnavailableDesc:
    'Es scheint ein Konfigurationsproblem zu geben. Überprüfen Sie, ob die Backend-URL korrekt eingestellt ist, ob der Server läuft oder ob es ein DNS-Problem gibt.',
  checkingServerStatus: 'Verbindung wird überprüft...',
  cannotConnectToServer: 'Keine Verbindung zum Server möglich',
  cannotConnectToServerDesc:
    'Die Anwendung kann keine Verbindung zum Backend-Server herstellen. Bitte überprüfen Sie Ihre Konfiguration.',
  troubleshootingSteps: 'Fehlerbehebungsschritte',
  checkBackendUrl: 'Backend-URL überprüfen',
  checkBackendUrlDesc:
    'Stellen Sie sicher, dass die NEXT_PUBLIC_API_URL Umgebungsvariable korrekt konfiguriert ist',
  checkServerRunning: 'Serverstatus überprüfen',
  checkServerRunningDesc:
    'Stellen Sie sicher, dass der Backend-Server läuft und auf dem konfigurierten Port erreichbar ist',
  checkDNS: 'DNS/Netzwerk überprüfen',
  checkDNSDesc: 'Überprüfen Sie, ob keine DNS- oder Firewall-Probleme die Verbindung blockieren',
  needMoreHelp: 'Benötigen Sie weitere Hilfe?',
  needMoreHelpDesc: 'Überprüfen Sie die Dokumentation oder wenden Sie sich an den Support',
  retryConnection: 'Verbindung wiederholen',
  retrying: 'Wiederhole...',

  // ===========================
  // NAVIGATION
  // ===========================
  dashboard: 'Dashboard',
  servers: 'Server',
  settings: 'Einstellungen',
  home: 'Startseite',
  navigation: 'Navigation',

  // ===========================
  // COMMON ACTIONS
  // ===========================
  save: 'Speichern',
  saving: 'Speichern...',
  cancel: 'Abbrechen',
  confirm: 'Bestätigen',
  loading: 'Laden...',
  error: 'Fehler',
  success: 'Erfolg',
  welcome: 'Willkommen',
  start: 'Starten',
  stop: 'Stoppen',
  restart: 'Neustarten',
  delete: 'Löschen',
  edit: 'Bearbeiten',
  console: 'Konsole',
  files: 'Dateien',
  configure: 'Konfigurieren',
  creating: 'Erstellen...',
  eliminating: 'Löschen...',
  deleting: 'Löschen...',
  sending: 'Senden...',
  send: 'Senden',
  refresh: 'Aktualisieren',
  retry: 'Wiederholen',
  pause: 'Pause',
  resume: 'Fortsetzen',
  search: 'Suchen...',
  saveConfiguration: 'Konfiguration speichern',
  saveConfigurationSuccess: 'Konfiguration erfolgreich gespeichert',
  saveConfigurationError: 'Fehler beim Speichern der Konfiguration',
  loadConfigError: 'Fehler beim Laden der Serverkonfiguration',
  serverRestartSuccess: 'Server erfolgreich neugestartet',
  serverRestartError: 'Fehler beim Neustarten des Servers',
  clearDataSuccess: 'Serverdaten erfolgreich gelöscht',
  clearDataError: 'Fehler beim Löschen der Serverdaten',
  saveChanges: 'Änderungen speichern',
  addPort: 'Port hinzufügen',
  addVariable: 'Variable hinzufügen',
  comingSoon: 'Demnächst verfügbar',

  // ===========================
  // STATUS
  // ===========================
  online: 'Online',
  offline: 'Offline',
  starting: 'Startet',
  stopping: 'Stoppt',
  running: 'Läuft',
  stopped: 'Gestoppt',
  not_found: 'Nicht gefunden',
  active: 'Aktiv',
  starting2: 'Startet...',
  stopped2: 'Gestoppt',
  notFound: 'Nicht gefunden',
  unknown: 'Unbekannt',
  restarting: 'Neustart...',
  initializing: 'Initialisieren...',
  verifyingAuth: 'Authentifizierung wird überprüft...',
  disconnected: 'Getrennt',
  withErrors: 'Mit Fehlern',

  // ===========================
  // SERVER MANAGEMENT
  // ===========================
  createServer: 'Server erstellen',
  serverName: 'Servername',
  serverType: 'Servertyp',
  serverTypeDescription: 'Wählen Sie den Typ des Minecraft-Servers, den Sie konfigurieren möchten.',
  version: 'Version',
  memory: 'Speicher',
  port: 'Port',
  difficulty: 'Schwierigkeit',
  gameMode: 'Spielmodus',
  maxPlayers: 'Max. Spieler',
  serverId: 'Server-ID',
  serverIdLabel: 'Server-ID',
  serverIdDescription:
    'Eindeutiger Bezeichner für den Server (nur Buchstaben, Zahlen, Bindestriche und Unterstriche)',
  serverIdPlaceholder: 'mein-server',
  serverIdDesc: 'Eindeutiger Bezeichner für Ihren Server',
  serverDefaultName: 'Server',
  minecraftServer: 'Minecraft Server',
  currentStatus: 'Aktueller Status',
  serverInformation: 'Serverinformationen',
  container: 'Container',

  // Server Types
  serverVanilla:
    'Einfacher Minecraft-Server ohne Mods oder Plugins. Ideal für klassisches Survival-Gameplay.',
  serverForge:
    'Server mit Mod-Unterstützung über Forge. Erfordert die Konfiguration der spezifischen Forge-Version.',
  serverNeoforge:
    'Server mit Mod-Unterstützung über Neoforge. Erfordert die Konfiguration der spezifischen Neoforge-Version.',
  serverCurseForge:
    'Installiert automatisch Modpacks von CurseForge. Kann über URL oder Slug des Modpacks konfiguriert werden.',
  serverCurseForgeManual:
    'Manueller Modus für CurseForge-Modpacks. Verwendet vorgeladene ZIP-Dateien. Veraltete Funktion, wir empfehlen CurseForge Modpack.',
  serverModrinth:
    'Installiert automatisch Modpacks von Modrinth. Kann über URL oder Slug des Modpacks konfiguriert werden.',
  serverSpigot: 'Optimierter Server kompatibel mit Bukkit-Plugins',
  serverPaper: 'Hochleistungsserver basierend auf Spigot mit zusätzlichen Optimierungen',
  serverBukkit: 'Klassischer Server mit Standard-Plugin-API-Unterstützung',
  serverPufferfish: 'Optimierter Paper-Fork für große Server, die maximale Leistung benötigen',
  serverPurpur: 'Server mit lustigen und konfigurierbaren Funktionen basierend auf Paper',
  serverLeaf: 'Paper-Fork mit Fokus auf Leistung und Low-Level-Optimierungen',
  serverFolia: 'Experimenteller Paper-Server mit Multi-Threading-Unterstützung (Regionen)',
  selectType: 'Servertyp auswählen',

  // Server Actions
  startServer: 'Server starten',
  stopServer: 'Server stoppen',
  restart2: 'Neustarten',
  consoleStatus: 'Konsole',
  manageServer: 'Server verwalten',

  // ===========================
  // DASHBOARD
  // ===========================
  dashboardTitle: 'Server-Dashboard',
  dashboardDescription: 'Verwalten und konfigurieren Sie Ihre Minecraft-Server',
  myServers: 'Meine Server',
  noServers: 'Sie haben keine Server erstellt',
  noServersDesc: 'Erstellen Sie Ihren ersten Server, um zu beginnen',
  noServersAvailable: 'Keine Server verfügbar',
  noServersAvailableDesc: 'Erstellen Sie Ihren ersten Server, um das Abenteuer zu beginnen',
  createFirstServer: 'Meinen ersten Server erstellen',
  createNewServer: 'Neuen Server erstellen',
  systemActive: 'System aktiv',
  admin: 'Admin',
  administrator: 'Administrator',
  minecraftPanel: 'Minepanel',

  // Home Page
  homeTitle: 'Startseite',
  homeDescription: 'Übersicht über Ihr Minecraft-Server-Panel',
  welcomeBack: 'Willkommen zurück',
  quickStats: 'Schnellstatistiken',
  totalServers: 'Gesamtserver',
  runningServers: 'Laufende Server',
  stoppedServers: 'Gestoppte Server',
  systemStatus: 'Systemstatus',
  cpuUsage: 'CPU-Auslastung',
  memoryUsage: 'Speicherauslastung',
  diskUsage: 'Festplattenauslastung',
  recentActivity: 'Letzte Aktivitäten',
  noRecentActivity: 'Keine aktuellen Aktivitäten',
  quickActions: 'Schnellaktionen',
  viewAllServers: 'Alle Server anzeigen',
  serversOverview: 'Serverübersicht',
  viewAll: 'Alle anzeigen',
  systemHealth: 'Systemzustand',
  healthy: 'Gesund',
  alertServerDown: "Server '{server}' ist offline",
  alertHighCPU: "Hohe CPU-Auslastung auf '{server}': {value}%",
  alertHighMemory: "Hohe Speicherauslastung auf '{server}': {value}%",

  // Settings Page
  settingsTitle: 'Einstellungen',
  settingsDescription: 'Konfigurieren Sie Ihr Konto und Ihre Anwendungseinstellungen',
  accountSettings: 'Kontoeinstellungen',
  yourUsername: 'Ihr Benutzername',
  changePassword: 'Passwort ändern',
  currentPassword: 'Aktuelles Passwort',
  newPassword: 'Neues Passwort',
  confirmPassword: 'Passwort bestätigen',
  updatePassword: 'Passwort aktualisieren',
  apiSettings: 'API-Einstellungen',
  apiSettingsDesc: 'Konfigurieren Sie API-Schlüssel für externe Integrationen',
  curseforgeApiKey: 'CurseForge API-Schlüssel',
  curseforgeApiKeyDesc: 'API-Schlüssel zum Herunterladen von Mods und Modpacks von CurseForge',
  importFromSettings: 'Aus Einstellungen importieren',
  apiKeyImported: 'API-Schlüssel erfolgreich importiert',
  noApiKeyConfigured: 'Kein API-Schlüssel in den Einstellungen konfiguriert',
  discordWebhook: 'Discord Webhook-URL',
  discordWebhookDesc: 'Webhook-URL für Discord-Benachrichtigungen',
  appearanceSettings: 'Darstellung',
  languageDesc: 'Wählen Sie Ihre bevorzugte Sprache',
  notificationSettings: 'Benachrichtigungen',
  enableNotifications: 'Benachrichtigungen aktivieren',
  enableNotificationsDesc: 'Benachrichtigungen über Serverereignisse erhalten',
  dangerZone: 'Gefahrenzone',
  dangerZoneDesc: 'Irreversible und destruktive Aktionen',
  settingsSaved: 'Einstellungen erfolgreich gespeichert',
  settingsSaveFailed: 'Einstellungen konnten nicht gespeichert werden',
  test: 'Testen',
  webhookTestSuccess: 'Webhook-Test erfolgreich! Überprüfen Sie Ihren Discord-Kanal',
  webhookTestFailed: 'Webhook-Test fehlgeschlagen',
  securitySettings: 'Sicherheit',
  securitySettingsDesc: 'Verwalten Sie Ihr Passwort und Ihre Sicherheitseinstellungen',
  passwordChangedSuccessfully: 'Passwort erfolgreich geändert',
  passwordChangeFailed: 'Passwortänderung fehlgeschlagen',
  passwordsMustMatch: 'Passwörter müssen übereinstimmen',
  incorrectCurrentPassword: 'Aktuelles Passwort ist falsch',
  allPasswordFieldsRequired: 'Alle Passwortfelder sind erforderlich',
  updatingPassword: 'Passwort wird aktualisiert...',

  // Server Creation
  serverCreationDesc: 'Einen neuen Minecraft-Server erstellen',
  enterServerName: 'Geben Sie den Namen für Ihren neuen Minecraft-Server ein.',

  // Server Deletion
  deleteServer: 'Server löschen',
  deleteServerTitle: 'Server löschen',
  deleteServerConfirm: 'Sind Sie sicher, dass Sie diesen Server löschen möchten?',
  deleteServerDesc:
    'Diese Aktion kann nicht rückgängig gemacht werden. Dadurch werden der Server und alle seine Daten dauerhaft gelöscht.',
  deleteServerWarning: 'Sind Sie sicher, dass Sie den Server löschen möchten',
  cannotBeUndone: 'Diese Aktion kann nicht rückgängig gemacht werden und löscht alle Serverdaten.',
  deleteServerData: 'Serverdaten löschen',
  deleteConfirmTitle: 'Sind Sie absolut sicher?',
  deleteConfirmDesc:
    'Diese Aktion kann nicht rückgängig gemacht werden. Alle Welten, Konfigurationen und gespeicherten Serverdaten werden gelöscht.',
  yesDeleteAll: 'Ja, alles löschen',

  // ===========================
  // FORM VALIDATION
  // ===========================
  idMinLength: 'ID muss mindestens 3 Zeichen lang sein',
  idMaxLength: 'ID darf maximal 20 Zeichen lang sein',
  idInvalidChars: 'ID darf nur Buchstaben, Zahlen, Bindestriche und Unterstriche enthalten',

  // ===========================
  // MESSAGES & NOTIFICATIONS
  // ===========================
  serverCreated: 'Server erfolgreich erstellt',
  serverDeleted: 'Server erfolgreich gelöscht',
  serverStarted: 'Server erfolgreich gestartet',
  serverStopped: 'Server erfolgreich gestoppt',
  serverCreatedSuccess: 'Server erfolgreich erstellt',
  serverDeletedSuccess: 'Server erfolgreich gelöscht',

  // ===========================
  // ERRORS
  // ===========================
  serverNotFound: 'Server nicht gefunden',
  connectionError: 'Verbindungsfehler',
  unexpectedError: 'Unerwarteter Fehler',
  NO_ACCESS_TOKEN: 'Kein Zugriffstoken erhalten',
  LOGIN_ERROR: 'Anmeldefehler',
  SERVER_START_ERROR: 'Fehler beim Starten des Servers',
  SERVER_STOP_ERROR: 'Fehler beim Stoppen des Servers',
  errorLoadingServerList: 'Fehler beim Laden der Serverliste',
  errorProcessingStatuses: 'Fehler bei der Verarbeitung der Serverstatus',
  errorDeletingServer: 'Fehler beim Löschen des Servers',
  errorCreatingServer: 'Fehler beim Erstellen des Servers',
  errorLoadingServerInfo: 'Fehler beim Laden der Serverinformationen',
  errorLoadingLogs: 'Fehler beim Laden der Protokolle',
  errorFetchingResources: 'Fehler beim Abrufen der Serverressourcen',
  errorGettingLogsServer: 'Fehler beim Abrufen der Protokolle vom Server',
  containerNotFound: 'Container nicht gefunden',
  serverNotFoundSpecified: 'Angegebener Server nicht gefunden',
  connectionErrorDocker: 'Verbindungsfehler mit Docker',
  unknownError: 'Unbekannter Fehler',
  logsError: 'Fehler in Protokollen',
  resourcesError: 'Fehler bei Ressourcen',
  errorsDetected: 'Fehler in Protokollen erkannt',
  errorsDetectedDesc: 'In den Serverprotokollen wurden Fehler oder Ausnahmen gefunden',
  saveFailed: 'Speichern fehlgeschlagen',
  configSavedAutomatically: 'Konfiguration automatisch gespeichert',
  errorSavingAutomatically: 'Fehler beim automatischen Speichern',
  saveMode: 'Speichermodus',
  autoSave: 'Automatisch speichern',
  manualSave: 'Manuell speichern',
  saveNow: 'Jetzt speichern',
  autoSaveActive: 'Aktiv',
  serverRunningWarning: 'Server läuft',
  serverRunningWarningDesc:
    'Die Konfiguration kann nicht bearbeitet werden, während der Server läuft. Stoppen Sie den Server, um Änderungen vorzunehmen.',
  unsavedChanges: 'Ungespeicherte Änderungen',
  allChangesSaved: 'Alle Änderungen gespeichert',
  failedToFetchVersions: 'Versionen konnten nicht abgerufen werden',

  // ===========================
  // LANGUAGE
  // ===========================
  language: 'Sprache',
  spanish: 'Spanisch',
  english: 'Englisch',
  dutch: 'Niederländisch',
  german: 'Deutsch',
  changeLanguage: 'Sprache ändern',

  // ===========================
  // WELCOME PAGE
  // ===========================
  welcomeDescription: 'Verwalten Sie Ihre Minecraft-Server mit Leichtigkeit',
  enterCredentials: 'Geben Sie Ihre Anmeldedaten ein, um fortzufahren',
  enterServer: 'SERVER BETRETEN',
  allRightsReserved: 'Alle Rechte vorbehalten',
  help: 'Hilfe',
  privacy: 'Datenschutz',
  terms: 'Nutzungsbedingungen',
  documentation: 'Dokumentation',
  github: 'GitHub',
  reportBug: 'Bug Melden',
  links: 'Links',
  sourceCode: 'Quellcode',
  withLove: 'Mit Liebe gemacht',

  // ===========================
  // GENERAL SETTINGS TAB
  // ===========================
  general: 'Allgemein',
  generalSettings: 'Allgemeine Einstellungen',
  generalSettingsDesc: 'Allgemeine Einstellungen für Ihren Minecraft-Server',
  basicSettings: 'Grundeinstellungen',
  performanceSettings: 'Leistung',
  connectivitySettings: 'Konnektivität',

  // ===========================
  // BASIC SETTINGS TAB
  // ===========================
  motd: 'Nachricht des Tages (MOTD)',
  motdPlaceholder: 'Ein unglaublicher Minecraft-Server',
  motdDescription: 'Die Nachricht, die in der Serverliste angezeigt wird',
  serverNamePlaceholder: 'Ihr Servername',
  maxPlayersPlaceholder: '20',
  players: 'Spieler',
  versionsAvailable: 'Versionen verfügbar',
  recommended: 'Empfohlen',
  popular: 'Beliebt',
  allVersions: 'Alle Versionen',
  selectVersion: 'Version auswählen',
  loadingVersions: 'Versionen werden geladen',
  updateVersions: 'Versionen aktualisieren',
  list: 'Liste',
  manual: 'Manuell',
  latest: 'Neueste',

  // Difficulty
  selectDifficulty: 'Schwierigkeit auswählen',
  peaceful: 'Friedlich',
  easy: 'Einfach',
  normal: 'Normal',
  hard: 'Schwer',

  // Game Mode
  selectGameMode: 'Spielmodus auswählen',
  survival: 'Überleben',
  creative: 'Kreativ',
  adventure: 'Abenteuer',
  spectator: 'Zuschauer',

  // World Settings
  worldSettings: 'Welt',
  seed: 'Welt-Seed',
  seedPlaceholder: 'Leer lassen für zufälligen Seed',
  seedDescription:
    'Welt-Seed für die Weltgenerierung. Wenn Sie eine negative Zahl verwenden, stellen Sie sicher, dass Sie sie in Anführungszeichen setzen.',
  levelType: 'Welttyp',
  selectLevelType: 'Welttyp auswählen',
  flat: 'Flach',
  largeBiomes: 'Große Biome',
  amplified: 'Verstärkt',
  singleBiomeSurface: 'Einzelnes Biom Oberfläche',

  // World Options
  hardcore: 'Hardcore',
  hardcoreDescription: 'Wenn aktiviert, werden Spieler beim Tod zu Zuschauern',
  pvp: 'PvP',
  pvpDescription: 'Spieler-gegen-Spieler-Kampf erlauben',
  spawningOptions: 'Spawn-Optionen',
  spawnAnimals: 'Tiere spawnen',
  spawnMonsters: 'Monster spawnen',
  spawnNpcs: 'NPCs spawnen',
  generateStructures: 'Strukturen generieren',
  generateStructuresDescription:
    'Definiert, ob Strukturen wie Dörfer, Tempel usw. generiert werden',
  allowNether: 'Nether erlauben',
  allowNetherDescription: 'Zugang zur Nether-Dimension aktivieren oder deaktivieren',

  // ===========================
  // PERFORMANCE SETTINGS TAB
  // ===========================
  performanceConfig: 'Leistungskonfiguration',
  viewDistance: 'Sichtweite',
  viewDistanceDesc:
    'Bestimmt, wie viele Chunks um jeden Spieler geladen werden. Niedrigere Werte verbessern die Leistung.',
  chunks: 'Chunks',
  simulationDistance: 'Simulationsdistanz',
  simulationDistanceDesc:
    'Bestimmt, wie weit der Server aktualisiert (Mobs, Pflanzen usw.). Kann niedriger als die Sichtweite sein.',
  enableCommandBlocks: 'Befehlsblöcke aktivieren',
  enableCommandBlocksDesc:
    'Ermöglicht die Verwendung von Befehlsblöcken, die die Leistung beeinträchtigen können, wenn sie übermäßig verwendet werden.',

  // ===========================
  // CONNECTIVITY SETTINGS TAB
  // ===========================
  serverPort: 'Server-Port',
  serverPortDesc: 'Port, auf dem der Server lauscht. Der Standardport ist 25565.',
  serverPortWarning:
    'Dieser Port muss sich von anderen laufenden Servern unterscheiden, um Konflikte zu vermeiden.',
  serverPortProxyInfo:
    'Port wird vom Proxy verwaltet. Alle Server verwenden den internen Port 25565 und verbinden sich über Hostname.',
  playerIdleTimeout: 'Spieler-Leerlauf-Timeout (Minuten)',
  playerIdleTimeoutDesc: 'Zeit vor dem Kick inaktiver Spieler (0 zum Deaktivieren)',
  onlineMode: 'Online-Modus',
  onlineModeDesc:
    'Wenn aktiviert, überprüft der Server, ob Spieler bei Mojang authentifiziert sind. Es wird empfohlen, dies aktiviert zu lassen, um Benutzer mit gefälschten Namen zu verhindern.',
  preventProxyConnections: 'Proxy-Verbindungen verhindern',
  preventProxyConnectionsDesc:
    'Wenn aktiviert, versucht der Server, Verbindungen über Proxys/VPNs zu erkennen und zu blockieren.',

  // Access Control
  accessControl: 'Zugriffskontrolle',
  serverOperators: 'Server-Operatoren',
  serverOperatorsDesc: 'Spieler mit Admin-Berechtigungen, durch Kommas getrennt',
  opPermissionLevel: 'OP-Berechtigungsstufe',
  selectOpPermissionLevel: 'OP-Berechtigungsstufe auswählen',
  opPermissionLevel1: 'Stufe 1 (Minimum)',
  opPermissionLevel2: 'Stufe 2',
  opPermissionLevel3: 'Stufe 3',
  opPermissionLevel4: 'Stufe 4 (Maximum)',
  opPermissionLevelDesc: 'Berechtigungsstufe für Operatoren (4 = voller Zugriff)',

  // RCON
  rcon: 'RCON (Fernsteuerung)',
  rconDesc: 'Fernzugriff auf die Serverkonsole konfigurieren',
  enableRcon: 'RCON aktivieren',
  enableRconDesc: 'Fernsteuerung des Servers über das RCON-Protokoll erlauben',
  backupRequiresRcon: 'Backups benötigen RCON, um ordnungsgemäß zu funktionieren.',
  broadcastRconToOps: 'RCON an OPs senden',
  broadcastRconToOpsDesc: 'Ausgeführte RCON-Befehle an verbundene Operatoren senden',
  rconPort: 'RCON-Port',
  rconPassword: 'RCON-Passwort',
  rconPasswordImportant: 'Wichtig! Sie müssen das Standardpasswort ändern',
  backupRconDesc: 'Der RCON-Backup-Dienst für die Durchführung von Backups.',

  // Additional Permissions
  additionalPermissions: 'Zusätzliche Berechtigungen',
  commandBlock: 'Befehlsblock',
  commandBlockDesc: 'Verwendung von Befehlsblöcken aktivieren',
  allowFlight: 'Fliegen erlauben',
  allowFlightDesc:
    'Spielern das Fliegen erlauben (wenn sie den Kreativmodus oder Flug-Mods aktiviert haben)',

  // ===========================
  // ADVANCED TAB
  // ===========================
  advancedConfig: 'Erweiterte Konfiguration',
  advancedConfigDesc: 'Erweiterte Optionen für Ihre Serverkonfiguration',
  advanced: 'Erweitert',

  // Docker Configuration
  dockerImage: 'Docker-Image',
  dockerImageDesc: 'Offizielles Docker-Image für den Server',
  dockerImageHelp: 'Docker-Image verwenden (latest, java21, java17)',
  dockerImageHelpTags: 'Hier sind die verfügbaren Tags',
  dockerImageHelpDocumentation: 'Java-Version-Dokumentation',
  dockerVolumes: 'Docker-Volumes',
  dockerVolumesDesc: 'Zusätzliche Volume-Mappings für den Docker-Container',
  dockerVolumesHelp:
    'Docker-Volume-Mappings (eines pro Zeile, Format: lokaler-pfad:container-pfad)',

  // Ports Configuration
  extraPorts: 'Zusätzliche Ports',
  extraPortsDesc: 'Konfigurieren Sie zusätzliche Ports, um weitere Serverdienste freizugeben',
  portFormat: 'Format: host_port:container_port[/protokoll]',
  configuredPorts: 'Konfigurierte Ports',
  noExtraPorts: 'Keine zusätzlichen Ports konfiguriert',
  extraPortsUseful:
    'Zusätzliche Ports sind nützlich für Plugins, die spezifische Verbindungen benötigen',
  configExamples: 'Konfigurationsbeispiele:',
  portVoiceChat: 'Voice-Chat-Mod-Port',
  portTcpSpecific: 'Spezifischer TCP-Port',
  portUdpPlugins: 'UDP-Port für Plugins',
  portDynmap: 'Dynmap oder andere Web-Plugins',

  // Server Configuration
  minecraftVersion: 'Minecraft-Version',
  minecraftVersionDesc: 'Spezifische Minecraft-Version zum Installieren',
  minecraftVersionHelp: 'Spezifische Minecraft-Version verwenden',
  curseforgeVersionAuto: 'Minecraft-Version wird automatisch aus dem CurseForge-Modpack bezogen',
  idleTimeout: 'Leerlauf-Timeout (Min.)',
  idleTimeoutDesc: 'Zeit vor dem Kick inaktiver Spieler',
  idleTimeoutHelp: 'Zeit in Minuten vor dem Kick inaktiver Spieler (0 zum Deaktivieren)',
  stopDelay: 'Stop-Verzögerung (Sek.)',
  stopDelayDesc: 'Wartezeit vor dem erzwungenen Stoppen des Servers',
  stopDelayHelp: 'Zeit in Sekunden zum Warten vor dem erzwungenen Stoppen des Servers',
  restartPolicy: 'Neustartrichtlinie',
  restartPolicyDesc: 'Bestimmt, wie sich der Container verhält, wenn er die Ausführung beendet',
  noRestart: 'Kein Neustart',
  alwaysRestart: 'Immer neustarten',
  restartOnFailure: 'Bei Fehler neustarten',
  restartUnlessStopped: 'Neustarten außer gestoppt',
  no: 'Nein',
  always: 'Immer',
  onFailure: 'Bei Fehler',
  unlessStopped: 'Außer gestoppt',

  // Environment Variables
  environmentVars: 'Umgebungsvariablen',
  environmentVarsDesc: 'Benutzerdefinierte Umgebungsvariablen für den Container',
  environmentVarsHelp:
    'Zusätzliche Umgebungsvariablen für den Container (eine pro Zeile, Format: SCHLÜSSEL=WERT)',
  variableName: 'Variablenname',
  variableValue: 'Wert',

  // Docker Labels
  dockerLabels: 'Docker-Labels',
  dockerLabelsDesc:
    'Benutzerdefinierte Labels für den Container, nützlich für Reverse-Proxies wie Traefik oder Caddy',
  dockerLabelsHelp:
    'Container-Labels (eines pro Zeile, Format: schlüssel=wert). Nützlich für Traefik, Caddy, nginx-proxy, etc.',

  // Backup Configuration
  backupConfig: 'Backup-Konfiguration',
  enableBackup: 'Backups aktivieren',
  backupMethod: 'Backup-Methode',
  backupMethodDesc: 'Methode für die Durchführung von Backups',
  selectBackupMethod: 'Backup-Methode auswählen',
  tarCompression: 'tar (Komprimierung)',
  rsyncIncremental: 'rsync (inkrementell)',
  resticIncrementalEncrypted: 'restic (inkrementell verschlüsselt)',
  rcloneRemote: 'rclone (remote)',
  backupName: 'Backup-Name',
  backupNameDesc: 'Name zur Identifizierung von Backup-Dateien',
  backupInterval: 'Backup-Intervall',
  backupIntervalDesc: 'Zeit zwischen jedem Backup (z.B.: 24h, 2h 30m)',
  backupInitialDelay: 'Anfangsverzögerung',
  backupInitialDelayDesc: 'Wartezeit vor dem ersten Backup',
  backupPruneDays: 'Aufbewahrungstage',
  backupPruneDaysDesc: 'Backups löschen, die älter als diese Anzahl von Tagen sind',
  backupDestDir: 'Backup-Zielverzeichnis',
  backupDestDirDesc: 'Pfad, in dem Backups gespeichert werden',
  backupExcludes: 'Backup-Ausschlüsse',
  backupExcludesDesc:
    'Muster von Dateien, die vom Backup ausgeschlossen werden sollen (durch Kommas getrennt)',
  backupExcludesHelp: 'Dateien und Verzeichnisse, die nicht im Backup enthalten sein werden',
  tarCompressMethod: 'Tar-Komprimierungsmethode',
  tarCompressMethodDesc: 'Komprimierungsalgorithmus für tar-Dateien',
  selectTarCompressMethod: 'Komprimierungsmethode auswählen',
  gzip: 'gzip (Standard)',
  bzip2: 'bzip2 (bessere Komprimierung)',
  zstd: 'zstd (schnell)',
  backupOnStartup: 'Backup beim Start',
  backupOnStartupDesc: 'Backup sofort nach dem Starten des Servers durchführen',
  pauseIfNoPlayers: 'Backups pausieren wenn keine Spieler',
  pauseIfNoPlayersDesc:
    'Keine automatischen Backups durchführen, wenn keine Spieler verbunden sind',
  playersOnlineCheckInterval: 'Spieler-Überprüfungsintervall',
  playersOnlineCheckIntervalDesc:
    'Wie oft überprüft werden soll, ob Spieler online sind, wenn Backups pausiert sind (z.B.: 5m, 1m)',
  enableSaveAll: 'Save All aktivieren',
  enableSaveAllDesc:
    "Führe 'save-all' Befehl vor dem Backup aus. Deaktivieren, wenn dein Server während save-all abstürzt (häufig bei großen Welten).",
  enableSaveAllWarning:
    'Warnung: Mit deaktiviertem save-all stelle sicher, dass dein Server Autosave aktiviert hat, sonst könnten aktuelle Änderungen verloren gehen.',
  enableSync: 'Filesystem Sync aktivieren',
  enableSyncDesc:
    'Dateisystem-Puffer nach save-all leeren. Nur in Cluster-Umgebungen mit bekannten Problemen deaktivieren.',

  // ===========================
  // RESOURCES TAB
  // ===========================
  serverResources: 'Server-Ressourcen',
  serverResourcesDesc:
    'Konfigurieren Sie Speicher, CPU und andere Ressourcenbeschränkungen für Ihren Server',
  memoryCpu: 'Speicher & CPU',
  jvmOptions: 'JVM-Optionen',
  advancedResources: 'Erweiterte Ressourcen',
  resources: 'Ressourcen',
  cpu: 'CPU',
  serverInactive: 'Server inaktiv',

  // Memory & CPU Tab
  initialMemoryJvm: 'Anfangsspeicher (JVM)',
  initialMemoryTooltip: 'Anfangsspeicher für die JVM (-Xms)',
  initialMemoryDesc: 'Anfangsspeicher für Java (Xms) - z.B.: 2G, 1024M',
  maxMemoryJvm: 'Maximaler Speicher (JVM)',
  maxMemoryTooltip: 'Maximaler Speicher für die JVM (-Xmx)',
  maxMemoryDesc: 'Maximaler Speicher für Java (Xmx) - z.B.: 4G, 4096M',
  cpuLimit: 'CPU-Limit',
  cpuLimitTooltip: 'Maximales CPU-Limit für den Docker-Container',
  cpuLimitDesc: 'Maximale Anzahl von CPU-Kernen, die der Server verwenden kann',
  cpuReservation: 'CPU-Reservierung',
  cpuReservationTooltip: 'Mindest-CPU garantiert für den Container',
  cpuReservationDesc: 'Mindest-CPU garantiert für den Container',
  memoryReservationDocker: 'Speicherreservierung (Docker)',
  memoryReservationTooltip: 'Für den Docker-Container reservierter Speicher',
  memoryReservationDesc: 'Für den Docker-Container reservierter Speicher',
  linuxUserUid: 'Linux-Benutzer (UID)',
  linuxUserDesc: 'Linux-Benutzer-ID, unter der der Server ausgeführt wird',
  linuxGroupGid: 'Linux-Gruppe (GID)',
  linuxGroupDesc: 'Linux-Gruppen-ID, unter der der Server ausgeführt wird',

  // JVM Options Tab
  useAikarFlags: 'Aikars Flags verwenden',
  aikarFlagsTooltip:
    'Aikar hat Forschungen durchgeführt, um die optimalen JVM-Flags für GC-Tuning zu finden, was umso wichtiger ist, je mehr Benutzer gleichzeitig verbunden sind.',
  aikarFlagsRecommended: 'Empfohlen für Server mit vielen Spielern',
  aikarFlagsDesc: 'Optimierte JVM-Einstellungen für Server mit vielen Spielern verwenden',
  enableJmx: 'JMX aktivieren',
  enableJmxTooltip: 'Aktiviert Remote-JMX-Überwachung, wie Profiling mit VisualVM oder JMC',
  enableJmxDesc: 'Aktiviert Remote-JMX-Überwachung für Diagnosetools',
  jmxHost: 'JMX-Host',
  jmxHostDesc: 'IP/Host, auf dem der Docker-Container läuft (erforderlich für Remote-JMX)',
  jvmOptionsField: 'JVM-Optionen',
  jvmOptionsDesc: 'Allgemeine JVM-Optionen durch Leerzeichen getrennt (Argumente beginnend mit -X)',
  jvmXxOptions: 'JVM XX-Optionen',
  jvmXxOptionsDesc: 'Spezifische JVM XX-Optionen (müssen vor -X-Optionen stehen)',
  systemPropertiesDd: 'Systemeigenschaften (DD)',
  systemPropertiesDdDesc:
    'Liste von Systemeigenschaften durch Kommas getrennt (name=wert oder name:wert)',
  additionalArguments: 'Zusätzliche Argumente',
  additionalArgumentsDesc: 'Zusätzliche Argumente für die Server-JAR-Datei',

  // Advanced Resources Tab
  timezone: 'Zeitzone',
  selectTimezone: 'Zeitzone auswählen',
  timezoneDesc: 'Server-Zeitzone (Standard: UTC)',
  enableAutoStop: 'Auto-Stop aktivieren',
  autoStopTooltip:
    'Stoppt den Server automatisch, wenn für die angegebene Zeit keine Spieler online sind',
  cannotUseWithAutoPause: 'Kann nicht zusammen mit Auto-Pause verwendet werden',
  initialTimeout: 'Anfängliches Timeout (Sekunden)',
  autoStopTimeoutInitDesc:
    'Anfängliche Wartezeit zum Stoppen des Servers, wenn keine Spieler online sind',
  establishedTimeout: 'Etabliertes Timeout (Sekunden)',
  autoStopTimeoutEstDesc: 'Wartezeit zum Stoppen des Servers, sobald er läuft',
  enableAutoPause: 'Auto-Pause aktivieren',
  autoPauseTooltip:
    'Pausiert den Server automatisch, wenn für die angegebene Zeit keine Spieler online sind',
  cannotUseWithAutoStop: 'Kann nicht zusammen mit Auto-Stop verwendet werden',
  modCompatibilityWarning: '⚠️ Warnung zur Mod-Kompatibilität:',
  modCompatibilityDesc:
    'Wenn der Server Mods installiert hat, kann die Auto-Pause-Funktion Probleme beim Aufwecken des Servers verursachen. Einige Mods sind nicht mit dieser Funktion kompatibel und können den Server während des Aufwachvorgangs hängen lassen oder abstürzen. Es wird empfohlen, diese Funktion nur auf Vanilla-Servern zu verwenden oder die Kompatibilität gründlich zu testen, bevor Sie sie in der Produktion aktivieren.',
  autoPauseTimeoutInitDesc:
    'Anfängliche Wartezeit zum Pausieren des Servers, wenn keine Spieler online sind',
  autoPauseTimeoutEstDesc: 'Wartezeit zum Pausieren des Servers, sobald er läuft',
  reconnectInterface: 'Reconnect-Interface',
  reconnectInterfaceDesc:
    'IP-Adresse zum Lauschen auf Verbindungen, die den Server aufwecken (0.0.0.0 für alle)',
  enableRollingLogs: 'Rolling Logs aktivieren',
  rollingLogsTooltip:
    'Standardmäßig wächst die Vanilla-Protokolldatei unbegrenzt. Der Logger kann so konfiguriert werden, dass er eine Rolling-Log-Datei-Strategie verwendet.',
  rollingLogsDesc: 'Begrenzt die Protokolldateigröße durch Rotation',
  showTimeInLogs: 'Zeit in Protokollen anzeigen',
  logTimestampTooltip: 'Zeitstempel bei jedem Protokolleintrag einschließen',
  logTimestampDesc: 'Fügt Zeitstempel zu Protokolleinträgen hinzu',

  // ===========================
  // LOGS TAB
  // ===========================
  logs: 'Protokolle',
  serverLogs: 'Server-Protokolle',
  serverLogsDesc: 'Server-Protokolle in Echtzeit anzeigen und überwachen',
  searchInLogs: 'In Protokollen suchen...',
  filterByLevel: 'Nach Stufe filtern',
  allLevels: 'Alle Stufen',
  onlyErrors: 'Nur Fehler',
  onlyWarnings: 'Nur Warnungen',
  onlyInfo: 'Nur Info',
  onlyDebug: 'Nur Debug',
  autoScroll: 'Auto-Scroll',
  realTime: 'Echtzeit',
  lines: 'Zeilen',
  noLogsAvailable: 'Keine Protokolle verfügbar',
  serverNotRunning: 'Server läuft nicht',
  serverNotRunning2: 'Server läuft nicht',
  lastUpdate: 'Letzte Aktualisierung:',
  realTimeActive: 'Echtzeit aktiv',
  realTimePaused: 'Echtzeit pausiert',
  showing: 'Zeige',
  of: 'von',
  entries: 'Einträgen',
  liveLabel: 'LIVE',
  viewLogsRealtime: 'Server-Protokolle in Echtzeit anzeigen',
  loadingLogs: 'Protokolle werden geladen...',
  loadingServerConfig: 'Serverkonfiguration wird geladen...',
  preparingBlocks: 'Blöcke und Einstellungen werden vorbereitet...',

  // ===========================
  // COMMANDS TAB
  // ===========================
  serverCommands: 'Server-Befehle',
  serverCommandsDesc: 'Befehle auf Ihrem Server über RCON ausführen',
  commandConsole: 'Befehlskonsole',
  commandConsoleDesc: 'Befehle direkt auf dem Minecraft-Server ausführen',
  quickCommandConsole: 'Schnellbefehlskonsole',
  startServerToExecute: 'Starten Sie den Server, um Befehle auszuführen.',
  quickCommands: 'Schnellbefehle',
  sendCommand: 'Befehl senden',
  enterMinecraftCommand: 'Minecraft-Befehl eingeben... (ohne /)',
  serverResponse: 'Serverantwort',
  pressTabToAutocomplete: 'Tab zum Autovervollständigen drücken oder Enter zum Senden',
  commandsInfo:
    'Befehle werden ohne das anfängliche "/" Symbol gesendet. Verwenden Sie Tab zum Autovervollständigen der vorgeschlagenen Befehle.',
  clearConsole: 'Konsole leeren',
  serverMustBeRunning: 'Server muss laufen, um Befehle auszuführen',
  rconNotConfigured: 'RCON ist nicht richtig konfiguriert',
  rconNotConfiguredDesc:
    'Konfigurieren Sie RCON-Port und Passwort im Tab Allgemeine Einstellungen, um Befehle zu verwenden',
  commands: 'Befehle',
  enterACommandToExecute: 'Befehl zum Ausführen eingeben',
  rconPortNotConfigured: 'RCON-Port nicht konfiguriert',
  rconPortNotConfiguredDesc:
    'Konfigurieren Sie den RCON-Port im Tab Allgemeine Einstellungen, um Befehle zu verwenden (Passwort ist optional)',
  commandExecutedSuccessfully: 'Befehl erfolgreich ausgeführt',
  errorExecutingCommand: 'Fehler beim Ausführen des Befehls',

  // Command Labels
  cmdListPlayers: 'Spieler auflisten',
  cmdTeleportPlayer: 'Spieler teleportieren',
  cmdGiveXP: 'Erfahrung geben',
  cmdGiveEffect: 'Effekt geben',
  cmdCreativeMode: 'Kreativmodus',
  cmdSurvivalMode: 'Überlebensmodus',
  cmdAdventureMode: 'Abenteuermodus',
  cmdSpectatorMode: 'Zuschauermodus',
  cmdDayTime: 'Tag setzen',
  cmdNightTime: 'Nacht setzen',
  cmdClearWeather: 'Klares Wetter',
  cmdRainWeather: 'Regenwetter',
  cmdThunderWeather: 'Gewitterwetter',
  cmdPeacefulDifficulty: 'Friedliche Schwierigkeit',
  cmdEasyDifficulty: 'Einfache Schwierigkeit',
  cmdNormalDifficulty: 'Normale Schwierigkeit',
  cmdHardDifficulty: 'Schwere Schwierigkeit',
  cmdGiveDiamonds: 'Diamanten geben',
  cmdGiveDiamondSword: 'Diamantschwert geben',
  cmdGiveGoldenApples: 'Goldene Äpfel geben',
  cmdGiveCommandBlock: 'Befehlsblock geben',
  cmdSeedWorld: 'Welt-Seed anzeigen',
  cmdSaveWorld: 'Welt speichern',
  cmdKickPlayer: 'Spieler kicken',
  cmdBanPlayer: 'Spieler bannen',
  cmdViewTPS: 'TPS anzeigen',
  cmdSpigotTimings: 'Spigot Timings-Modus',
  cmdClearInventory: 'Inventar leeren',
  cmdClearEffects: 'Effekte entfernen',
  cmdNoonTime: 'Mittag setzen',
  cmdMidnightTime: 'Mitternacht setzen',
  cmdKillHostileMobs: 'Feindliche Mobs töten',
  cmdClearDroppedItems: 'Fallen gelassene Items löschen',
  cmdSetWorldSpawn: 'Welt-Spawn setzen',
  cmdGiveNetherite: '64 Netherite geben',
  cmdGiveElytra: 'Elytra geben',
  cmdGiveTotem: 'Totem geben',
  cmdGiveEnchantedBook: 'Verzaubertes Buch geben',
  cmdSummonZombie: 'Zombie beschwören',
  cmdSummonSkeleton: 'Skelett beschwören',
  cmdSummonCreeper: 'Creeper beschwören',
  cmdSummonEnderman: 'Enderman beschwören',
  cmdSummonWither: 'Wither beschwören',
  cmdSummonDragon: 'Enderdrache beschwören',
  cmdStopServer: 'Server stoppen',
  cmdReloadServer: 'Server neu laden',

  // Welt-Verwaltung
  world: 'Welt',
  worldManagement: 'Welt-Verwaltung',
  time: 'Zeit',
  weather: 'Wetter',
  weatherThunder: 'Gewitter',
  setSpawn: 'Spawn setzen',
  setWorldBorder: 'Grenze setzen',
  gamerules: 'Spielregeln',
  freezeTime: 'Zeit einfrieren',
  unfreezeTime: 'Zeit fortsetzen',
  disableFire: 'Feuer deaktivieren',
  freezeWeather: 'Wetter einfrieren',
  entityManagement: 'Entitäten-Verwaltung',
  killAllMobs: 'Alle Mobs töten',
  killZombies: 'Zombies töten',
  clearItems: 'Items löschen',
  clearXPOrbs: 'XP-Orbs löschen',
  summonEntities: 'Entitäten beschwören',
  giveItemsEffects: 'Items & Effekte',
  giveToAllPlayers: 'Allen Spielern geben',
  effectsToAllPlayers: 'Effekte für alle Spieler',
  clearAll: 'Alles löschen',
  tpAllToCoords: 'Alle zu Koordinaten teleportieren',
  difficultyChanged: 'Schwierigkeit geändert',
  gameruleChanged: 'Spielregel geändert',
  entitiesKilled: 'Entitäten getötet',
  itemsCleared: 'Items gelöscht',
  worldBorderSet: 'Weltgrenze gesetzt',
  worldSpawnSet: 'Welt-Spawn gesetzt',
  entitySummoned: 'Entität beschworen',
  inventoryCleared: 'Inventar geleert',
  itemEnchanted: 'Gegenstand verzaubert',
  effectsCleared: 'Effekte entfernt',
  effectGiven: 'Effekt angewendet',

  // ===========================
  // PLUGINS CONFIGURATION
  // ===========================
  plugins: 'Plugins',
  pluginsConfig: 'Plugin-Konfiguration',
  pluginsConfigDesc: 'Plugins für Ihren Server konfigurieren',
  pluginsNotAvailable: 'Dieser Bereich ist nur für Spigot-, Paper- oder Bukkit-Server verfügbar',
  pluginsSelectServerType:
    'Wählen Sie Spigot, Paper oder Bukkit als Servertyp im Tab "Servertyp", um Plugins zu konfigurieren.',
  pluginsAutoDownload: 'Auto-Download von Spiget',
  pluginsAutoDownloadDesc:
    'Automatische Plugin-Downloads von SpigotMC über die Spiget-API. ZIP-Dateien werden automatisch im Plugins-Ordner entpackt.',
  pluginsManualInfo:
    'Um Plugins manuell hinzuzufügen (JAR-Dateien), verwenden Sie den Dateibrowser, um sie in den /plugins-Ordner des Servers hochzuladen.',
  pluginsSpigetResources: 'Spiget-Ressourcen (SPIGET_RESOURCES)',
  pluginsSpigetResourcesDesc: 'SpigotMC-Ressourcen-IDs (z.B.: LuckPerms=28140, Vault=34315)',
  pluginsSpigetNote: 'Wichtiger Hinweis: Die Variable ist SPIGET mit E, nicht SPIGOT.',
  pluginsSpigetWarning:
    '⚠️ Einige Plugins wie EssentialsX erlauben keine automatisierten Downloads.',
  pluginsManualTitle: 'Plugins manuell hinzufügen',
  pluginsManualStep1: 'Auf den Dateibrowser des Servers zugreifen',
  pluginsManualStep2: 'Zum /plugins-Ordner navigieren',
  pluginsManualStep3: 'Ihre JAR-Dateien direkt hochladen',
  pluginsManualStep4: 'Server neustarten, um die Plugins zu laden',
  pluginsTipsTitle: 'Nützliche Tipps',
  pluginsTip1: 'Plugins werden automatisch beim Starten des Servers heruntergeladen',
  pluginsTip2: 'ZIP-Dateien werden automatisch im Plugins-Ordner entpackt',
  pluginsTip3: 'Sie können Spiget mit manuellen Plugins aus dem Dateibrowser kombinieren',
  pluginsTip4: 'Spigot-Plugins funktionieren auch auf Paper und Bukkit',
  pluginsSave: 'Konfiguration speichern',
  pluginsOpenPluginsFolder: 'Plugins-Ordner öffnen',
  pluginsOpenServerFolder: 'Server-Ordner öffnen',
  openFileBrowser: 'Dateimanager',
  filesDesc: 'Serverdateien durchsuchen, bearbeiten und verwalten',
  allServersFilesDesc: 'Dateien aller Server durchsuchen und verwalten',
  openInNewTab: 'In neuem Tab öffnen',
  fileBrowserError: 'Dateibrowser kann nicht geladen werden',
  fileBrowserErrorDesc: 'Bitte versuchen Sie, in einem neuen Tab zu öffnen',
  fileBrowserTip: 'Dateimanager-Tipp',
  fileBrowserTipDesc:
    'Sie können Konfigurationsdateien bearbeiten, Dateien hoch-/herunterladen und Berechtigungen direkt von hier aus verwalten.',

  // Native File Browser
  newFolder: 'Neuer Ordner',
  folderName: 'Ordnername',
  upload: 'Hochladen',
  uploadFiles: 'Dateien hochladen',
  uploadFolder: 'Ordner hochladen',
  download: 'Herunterladen',
  rename: 'Umbenennen',
  newName: 'Neuer Name',
  create: 'Erstellen',
  confirmDelete: 'Löschen bestätigen',
  deleteConfirmMessage: 'Sind Sie sicher, dass Sie löschen möchten',
  unsaved: 'Nicht gespeichert',
  errorLoadingFiles: 'Fehler beim Laden der Dateien',
  errorReadingFile: 'Fehler beim Lesen der Datei',
  errorSavingFile: 'Fehler beim Speichern der Datei',
  errorDeletingFile: 'Fehler beim Löschen der Datei',
  errorCreatingFolder: 'Fehler beim Erstellen des Ordners',
  errorUploadingFile: 'Fehler beim Hochladen der Datei',
  errorRenamingFile: 'Fehler beim Umbenennen der Datei',
  errorDownloadingFile: 'Fehler beim Herunterladen der Datei',
  fileSaved: 'Datei erfolgreich gespeichert',
  fileDeleted: 'Datei erfolgreich gelöscht',
  folderCreated: 'Ordner erfolgreich erstellt',
  fileUploaded: 'Datei erfolgreich hochgeladen',
  fileRenamed: 'Datei erfolgreich umbenannt',
  filesUploaded: '{count} Dateien erfolgreich hochgeladen',
  filesUploadFailed: '{count} Dateien konnten nicht hochgeladen werden',
  uploading: 'Hochladen...',
  uploadingFiles: 'Dateien werden hochgeladen',
  uploadComplete: 'Upload abgeschlossen',
  uploadCompleteWithErrors: 'Upload mit Fehlern abgeschlossen',
  waiting: 'Warten',
  dropFilesHere: 'Dateien hier ablegen',
  releaseToUpload: 'Zum Hochladen loslassen',
  copyPath: 'Pfad kopieren',
  open: 'Öffnen',
  downloadAsZip: 'Als ZIP herunterladen',
  creatingZip: 'ZIP-Datei wird erstellt...',
  zipDownloaded: 'ZIP erfolgreich heruntergeladen',
  errorDownloadingZip: 'Fehler beim Herunterladen der ZIP',
  enterNewName: 'Neuen Namen eingeben',
  toSave: 'zum Speichern',

  // Plugin Server Configurations
  paperConfiguration: 'Paper-Konfiguration',
  paperBuild: 'Paper-Build',
  paperBuildDesc: 'Spezifische Paper-Build-Nummer (leer lassen für neueste)',
  paperChannel: 'Paper-Kanal',
  paperChannelDesc: 'Kanal: default oder experimental',
  customDownloadUrl: 'Benutzerdefinierte Download-URL',
  paperDownloadUrlDesc: 'Paper-Download-URL überschreiben (optional)',

  bukkitSpigotConfiguration: 'Bukkit/Spigot-Konfiguration',
  bukkitDownloadUrl: 'Bukkit-Download-URL',
  bukkitDownloadUrlDesc: 'Benutzerdefinierte Bukkit-Download-URL',
  spigotDownloadUrl: 'Spigot-Download-URL',
  spigotDownloadUrlDesc: 'Benutzerdefinierte Spigot-Download-URL',
  buildFromSource: 'Spigot aus Quellcode bauen',

  pufferfishConfiguration: 'Pufferfish-Konfiguration',
  pufferfishBuild: 'Pufferfish-Build',
  pufferfishBuildDesc: 'Spezifische Build-Nummer oder lastSuccessfulBuild',
  useFlareFlags: 'Flare-Profiler-Flags verwenden',

  purpurConfiguration: 'Purpur-Konfiguration',
  purpurBuild: 'Purpur-Build',
  purpurBuildDesc: 'LATEST oder spezifische Build-Nummer',
  purpurDownloadUrlDesc: 'Purpur-Download-URL überschreiben (optional)',

  leafConfiguration: 'Leaf-Konfiguration',
  leafBuild: 'Leaf-Build',
  leafBuildDesc: 'Spezifische Leaf-Build-Nummer (leer lassen für neueste)',

  foliaConfiguration: 'Folia-Konfiguration',
  foliaWarning:
    'Folia ist experimentell und viele Plugins funktionieren möglicherweise aufgrund von Multi-Threading-Änderungen nicht korrekt.',
  foliaBuild: 'Folia-Build',
  foliaBuildDesc: 'Spezifische Folia-Build-Nummer',
  foliaChannel: 'Folia-Kanal',
  foliaChannelDesc: 'Release-Kanal (experimental empfohlen)',
  foliaDownloadUrlDesc: 'Folia-Download-URL überschreiben (optional)',

  skipDownloadDefaults: 'Standard-Configs nicht herunterladen',
  skipDownloadDefaultsDesc:
    'Überprüfung auf Standard-Paper/Bukkit/Spigot-Konfigurationsdateien zum Herunterladen überspringen',

  // ===========================
  // MODS CONFIGURATION
  // ===========================
  mods: 'Mods',
  modsConfig: 'Mod-Konfiguration',
  modsConfigDesc: 'Mod-Details für Ihren Server konfigurieren',
  modsNotAvailable: 'Dieser Bereich ist nur für Forge- oder CurseForge-Server verfügbar',
  modsSelectServerType:
    'Wählen Sie Forge oder CurseForge als Servertyp im Tab "Servertyp", um Mods zu konfigurieren.',

  // Forge Configuration
  forgeVersion: 'Forge-Version',
  forgeBuildDesc: 'Forge-Build-Nummer für die ausgewählte Minecraft-Version',

  // Neoforge Configuration
  neoforgeVersion: 'Neoforge-Version',
  neoforgeBuildDesc: 'Neoforge-Buildnummer (die richtige Minecraft-Version wird automatisch ausgewählt)',

  // Fabric Configuration
  serverFabric:
    'Server mit Unterstützung für Fabric-Mods. Eine leichtgewichtige Modding-Plattform als Alternative zu Forge.',
  fabricLoaderVersion: 'Fabric-Loader-Version',
  fabricLoaderDesc: 'Spezifische Fabric-Loader-Version (leer lassen für neueste)',
  fabricLauncherVersion: 'Fabric-Launcher-Version',
  fabricLauncherDesc: 'Spezifische Fabric-Launcher-Version (leer lassen für neueste)',

  // Modrinth Configuration
  modrinthProjects: 'Modrinth-Projekte',
  modrinthProjectsHelp:
    "Komma- oder zeilengetrennte Liste von Projekt-Slugs/IDs. Formate: 'fabric-api' (neueste), 'fabric-api:0.119.2' (Version), 'fabric-api:beta' (Release-Typ), 'datapack:terralith', '@/path/to/file.txt' (Auflistung). Siehe Dokumentation für alle Formate.",
  modrinthProjectsDesc: 'Auto-Download von Mods, Plugins und Datapacks von Modrinth',
  modrinthDependencies: 'Abhängigkeiten herunterladen',
  modrinthDependenciesHelp:
    'Ob erforderliche und/oder optionale Abhängigkeiten heruntergeladen werden sollen',
  modrinthVersionType: 'Standard-Versionstyp',
  modrinthVersionTypeHelp:
    'Der Versionstyp für die Auswahl der neuesten Version (release, beta oder alpha)',
  dependenciesNone: 'Keine',
  dependenciesRequired: 'Erforderlich',
  dependenciesOptional: 'Erforderlich + Optional',
  versionRelease: 'Release',
  versionBeta: 'Beta (+ Release)',
  versionAlpha: 'Alpha (+ Beta + Release)',
  browseMods: 'Mods durchsuchen',
  browseModpacks: 'Modpacks durchsuchen',
  browseModpacksDesc: 'Suchen und wählen Sie ein Modpack aus CurseForge-Vorlagen',
  browse: 'Durchsuchen',
  modpackSelected: 'Modpack ausgewählt',
  searchOrBrowsePopular: 'Nach einem Modpack suchen oder beliebte durchstöbern',
  searchModpacks: 'Modpacks suchen...',

  // Modrinth Modpack Configuration
  modrinthModpack: 'Modrinth-Modpack',
  modrinthModpackDesc: 'Gib den Slug oder die URL des Modrinth-Modpacks ein, das du verwenden möchtest.',
  modrinthModpackTooltip: 'Gib den Modrinth-Projekt-Slug oder die URL ein. Du kannst auch eine spezifische Version angeben (z. B. https://modrinth.com/modpack/surface-living/version/1.2.1).',


  // Manual CurseForge (Deprecated)
  deprecatedFeature: 'Veraltete Funktion',
  manualCurseForgeDeprecated:
    'Diese manuelle Methode für CurseForge ist veraltet. Wir empfehlen die Verwendung von "CurseForge Modpack" (AUTO_CURSEFORGE) für neue Installationen. Dieser Modus erfordert, dass Sie die Modpack-Dateien manuell auf den Server hochladen.',
  modpackFile: 'Modpack-Datei (CF_SERVER_MOD)',
  modpackFileHelp: 'Vollständiger Pfad zur Modpack-.zip-Datei im Container.',
  modpackFileExample: 'Beispiel: /modpacks/SkyFactory_4_Server_4.1.0.zip',
  modpackFilePath: 'Pfad zur CurseForge-Modpack-ZIP-Datei im Container',
  baseDirectory: 'Basisverzeichnis (CF_BASE_DIR)',
  baseDirectoryHelp: 'Verzeichnis, in dem das Modpack entpackt wird. Standard: /data',
  baseDirectoryPath: 'Verzeichnis, in dem das Modpack extrahiert und ausgeführt wird',
  useModpackStartScript: 'Modpack-Startskript verwenden',
  useModpackStartScriptDesc:
    'Wenn deaktiviert, wird das im Modpack enthaltene Startskript vermieden und die Standard-Serverlogik verwendet',
  ftbLegacyJavaFixer: 'FTB Legacy Java Fixer',
  ftbLegacyJavaFixerDesc:
    'Fix für Modpacks aktivieren, die mit "unable to launch forgemodloader" fehlschlagen',
  cfApiKeyOptional: 'Optionaler API-Schlüssel für Kompatibilität mit einigen Modpacks',

  // CurseForge Auto Configuration
  importantInfo: 'Wichtige Information',
  cfApiKeyRequired:
    'Für die ordnungsgemäße Nutzung der CurseForge-Funktionalität ist ein API-Schlüssel erforderlich. Der API-Schlüssel ist notwendig, um private oder eingeschränkte Modpacks herunterzuladen.',
  cfApiKeyConfigured: 'CurseForge API-Schlüssel konfiguriert. Bereit zur Servererstellung.',
  installationMethod: 'Installationsmethode',
  installationMethodHelp: 'Wählen Sie, wie Sie das Modpack erhalten möchten:',
  methodUrl: 'URL',
  methodUrlDesc: 'Direkte Webadresse zum Modpack auf CurseForge',
  methodSlug: 'Slug',
  methodSlugDesc: 'Eindeutiger Modpack-Bezeichner (z.B.: "all-the-mods-7")',
  methodFile: 'Datei',
  methodFileDesc: 'Aus einer bereits auf den Server hochgeladenen .zip-Datei installieren',
  installFromUrl: 'Von direkter URL installieren',
  useIdSlug: 'Modpack-ID/Slug verwenden',
  useLocalFile: 'Lokale Datei auf dem Server verwenden',

  modpackUrl: 'Modpack-URL (CF_PAGE_URL)',
  modpackUrlHelp: 'Vollständige URL zur Modpack-Seite oder spezifischen Datei.',
  modpackUrlDesc: 'Direkte Download-URL des CurseForge-Modpacks',

  curseForgeProject: 'CurseForge-Projekt (CF_SLUG)',
  curseForgeProjectHelp: 'Der Bezeichner (Slug) des Modpacks auf CurseForge.',
  projectNameOrSlug: 'Projektname oder Slug auf CurseForge',

  fileId: 'Datei-ID (CF_FILE_ID)',
  fileIdHelp:
    'Numerische ID der spezifischen Datei zum Herunterladen. Wenn nicht angegeben, wird die neueste Version verwendet.',
  fileIdDesc:
    'Spezifische Datei-ID zum Herunterladen. Wenn leer gelassen, wird die neueste Version verwendet.',

  filePattern: 'Dateimuster (CF_FILENAME_MATCHER)',
  filePatternHelp:
    'Geben Sie einen Teilstring an, um die gewünschte Datei im /modpacks-Ordner zu finden.',
  filePatternDesc: 'Muster zum Finden der Modpack-Datei im /modpacks-Ordner',

  cfApiKey: 'CurseForge API-Schlüssel (CF_API_KEY)',
  cfApiKeyHelp:
    'CurseForge API-Schlüssel (Eternal), erforderlich zum Herunterladen einiger Modpacks.',
  cfApiKeyDesc:
    'API-Schlüssel zum Herunterladen eingeschränkter Modpacks (für die meisten Modpacks erforderlich)',

  // CurseForge Advanced Options
  advancedOptions: 'Erweiterte Optionen',
  synchronizeCurseForge: 'CurseForge synchronisieren (CF_FORCE_SYNCHRONIZE)',
  synchronizeCurseForgeDesc:
    'Modpack-Updates automatisch synchronisieren, wenn der Server neu startet',
  parallelDownloads: 'Parallele Downloads (CF_PARALLEL_DOWNLOADS)',
  parallelDownloadsHelp:
    'Anzahl der Mod-Downloads, die parallel durchgeführt werden. Standardwert: 4',
  parallelDownloadsDesc: 'Anzahl der parallelen Mod-Downloads angeben',
  download1: '1 Download',
  download2: '2 Downloads',
  download4: '4 Downloads (empfohlen)',
  download6: '6 Downloads',
  download8: '8 Downloads',
  skipExistingFiles: 'Vorhandene Dateien überspringen (CF_OVERRIDES_SKIP_EXISTING)',
  skipExistingFilesDesc:
    'Wenn aktiviert, werden Dateien, die bereits im Datenverzeichnis existieren, nicht ersetzt',
  setLevelFrom: 'Level setzen von (CF_SET_LEVEL_FROM)',
  setLevelFromHelp: 'Bestimmt, wie Weltdaten aus dem Modpack gesetzt werden.',
  setLevelFromDesc: 'Konfigurieren, wie Weltdaten aus dem Modpack bezogen werden',
  doNotSet: 'Nicht setzen',
  worldFile: 'Weltdatei',
  modpackOverrides: 'Modpack-Überschreibungen',
  curseforgeFiles: 'Zusätzliche Mods herunterladen (CURSEFORGE_FILES)',
  curseforgeFilesHelp:
    "Einzelne Mods automatisch von CurseForge herunterladen. Formate: 'jei' (neueste), 'jei:4593548' (Datei-ID), 'jei@10.2.1' (Version), vollständige URL oder '@/path/to/file.txt' (Auflistung). Automatisch verwaltet - entfernte Einträge werden bereinigt. Siehe Dokumentation für alle Formate.",
  curseforgeFilesDesc:
    'Komma- oder zeilengetrennte Liste (z.B.: jei, geckolib:4593548, aquaculture@1.0.0)',
  forceIncludeMods: 'Client-Mods erzwingen (CF_FORCE_INCLUDE_MODS)',
  forceIncludeModsHelp:
    'Erzwingt die Aufnahme von Mods, die fälschlicherweise als nur für Client markiert sind. Lädt KEINE zusätzlichen Mods herunter - überschreibt nur Client-Only-Tags für Mods, die bereits im Modpack oder in CURSEFORGE_FILES enthalten sind.',
  forceIncludeModsDesc:
    'Projekt-Slugs oder IDs zum erzwungenen Einschließen trotz Client-Only-Tag (komma- oder leerzeichengetrennt)',
  excludeMods: 'Mods ausschließen (CF_EXCLUDE_MODS)',
  excludeModsHelp:
    'Liste der Mods (durch Leerzeichen oder Zeilen getrennt), die vom Modpack ausgeschlossen werden (IDs oder Slugs).',
  excludeModsDesc:
    'Liste der Mods, die vom Modpack ausgeschlossen werden (IDs oder Slugs, eine pro Zeile, unterstützt Glob-Muster)',

  // ===========================
  // UI COMPONENTS
  // ===========================
  tip: 'Tipp:',
  configureServerTip:
    'Konfigurieren Sie diesen Server, indem Sie die Parameter in den folgenden Tabs anpassen.',
  changesRequireRestart: 'Änderungen erfordern einen Neustart des Servers, um wirksam zu werden.',

  // ===========================
  // MODPACK TEMPLATES
  // ===========================
  templates: 'Vorlagen',
  modpackTemplates: 'Modpack-Vorlagen',
  modpackTemplatesDescription: 'Entdecken und installieren Sie Modpacks von CurseForge',
  loadingModpacks: 'Modpacks werden geladen...',
  errorLoadingModpacks: 'Fehler beim Laden der Modpacks',
  errorSearchingModpacks: 'Fehler bei der Modpack-Suche',
  noModpacksFound: 'Keine Modpacks gefunden',
  selectModpack: 'Modpack auswählen',
  modpackDetails: 'Modpack-Details',
  description: 'Beschreibung',
  downloads: 'Downloads',
  created: 'Erstellt',
  updated: 'Aktualisiert',
  authors: 'Autoren',
  latestVersion: 'Neueste Version',
  fileName: 'Dateiname',
  gameVersions: 'Spielversionen',
  releaseDate: 'Veröffentlichungsdatum',
  quickCopy: 'Schnellkopie',
  modpackId: 'Modpack-ID',
  modpackSlug: 'Modpack-Slug',
  curseforgeUrl: 'CurseForge-URL',
  copiedToClipboard: 'in Zwischenablage kopiert',
  copyError: 'Kopieren in Zwischenablage fehlgeschlagen',
  serverConnection: 'Serververbindung',
  globalIP: 'Öffentliche IP / Domain',
  lanIP: 'LAN / Lokale IP',
  connectionTip: 'Teilen Sie diese Adresse mit Spielern, um Ihrem Server beizutreten',
  playingLAN: 'Im LAN spielen?',
  learnHow: 'Erfahren Sie, wie Sie es konfigurieren',
  proxyConnectionTip: 'Spieler verbinden sich über diesen Hostnamen am Standard-Port (25565)',
  forgotPassword: 'Passwort vergessen?',
  fileBrowserPasswordTip: 'Kennen Sie das FileBrowser-Passwort nicht?',
  learnHowToGetIt: 'Erfahren Sie, wie Sie es erhalten',
  viewOnCurseForge: 'Auf CurseForge anzeigen',
  close: 'Schließen',
  featured: 'Empfohlen',
  popularity: 'Beliebtheit',
  lastUpdated: 'Zuletzt aktualisiert',
  name: 'Name',
  totalDownloads: 'Gesamtdownloads',
  sortBy: 'Sortieren nach',
  sortOrder: 'Sortierreihenfolge',
  descending: 'Absteigend (Hoch zu Niedrig)',
  ascending: 'Aufsteigend (Niedrig zu Hoch)',
  searchResults: 'Suchergebnisse',
  loadMore: 'Mehr laden',
  curseforgeApiKeyNotConfigured:
    'CurseForge API-Schlüssel ist nicht konfiguriert. Bitte fügen Sie ihn in den Einstellungen hinzu, um diese Funktion zu nutzen.',
  goToSettings: 'Zu Einstellungen gehen',
  createServerFromModpack: 'Einen neuen Server mit diesem Modpack erstellen',
  serverIdRequired: 'Server-ID ist erforderlich',
  optional: 'optional',

  // ===========================
  // PLAYER MANAGEMENT
  // ===========================
  playerManagement: 'Spielerverwaltung',
  onlinePlayers: 'Online Spieler',
  noPlayersOnline: 'Keine Spieler online',
  whitelist: 'Whitelist',
  whitelistEmpty: 'Whitelist ist leer',
  operators: 'Operatoren',
  noOperators: 'Keine Operatoren',
  bannedPlayers: 'Gebannte Spieler',
  noBannedPlayers: 'Keine gebannten Spieler',
  playerName: 'Spielername',
  kick: 'Kicken',
  ban: 'Bannen',
  unban: 'Entbannen',
  remove: 'Entfernen',
  demote: 'Degradieren',
  promoteToOp: 'Zum OP befördern',
  playerAddedToWhitelist: 'Spieler zur Whitelist hinzugefügt',
  playerRemovedFromWhitelist: 'Spieler von der Whitelist entfernt',
  playerPromotedToOp: 'Spieler zum Operator befördert',
  playerDemotedFromOp: 'Spieler vom Operator degradiert',
  playerKicked: 'Spieler gekickt',
  playerBanned: 'Spieler gebannt',
  playerUnbanned: 'Spieler entbannt',
  saveWorld: 'Welt Speichern',
  whitelistOn: 'Whitelist AN',
  whitelistOff: 'Whitelist AUS',
  timeWeather: 'Zeit/Wetter',
  setDay: 'Tag Setzen',
  setNight: 'Nacht Setzen',
  weatherClear: 'Klares Wetter',
  weatherRain: 'Regen',
  broadcast: 'Ankündigen',
  broadcastPlaceholder: 'Nachricht an alle Spieler...',
  heal: 'Heilen',
  gamemodeChanged: 'Spielmodus geändert',
  playerTeleported: 'Spieler teleportiert',
  playerHealed: 'Spieler geheilt',
  itemsGiven: 'Items gegeben',
  worldSaved: 'Welt gespeichert',
  whitelistEnabled: 'Whitelist aktiviert',
  whitelistDisabled: 'Whitelist deaktiviert',
  messageBroadcast: 'Nachricht gesendet',
  timeChanged: 'Zeit geändert',
  weatherChanged: 'Wetter geändert',

  // ===========================
  // SERVER TEMPLATES
  // ===========================
  chooseCreationMethod: 'Wählen Sie, wie Sie Ihren Server erstellen möchten',
  quickCreate: 'Schnell Erstellen',
  fromTemplate: 'Von Vorlage',
  selectTemplate: 'Wählen Sie eine Vorlage, um schnell zu starten',
  quickCreateDesc:
    'Erstellen Sie einen leeren Server mit Standardeinstellungen. Sie können alles später konfigurieren.',
  templateSelected: 'Vorlage ausgewählt',
  vanillaSurvival: 'Vanilla Überleben',
  vanillaSurvivalDesc:
    'Das klassische Minecraft-Erlebnis. Überlebensmodus mit normalem Schwierigkeitsgrad.',
  vanillaCreative: 'Vanilla Kreativ',
  vanillaCreativeDesc:
    'Unbegrenzte Kreativität. Bauen Sie frei mit allen Blöcken und ohne Monster.',
  vanillaHardcore: 'Vanilla Hardcore',
  vanillaHardcoreDesc: 'Nur ein Leben. Schwerer Schwierigkeitsgrad, keine zweiten Chancen.',
  paperPerformance: 'Paper Leistung',
  paperPerformanceDesc: 'Optimierter Paper-Server mit Aikar-Flags. Ideal für öffentliche Server.',
  skyblock: 'SkyBlock',
  skyblockDesc: 'Starten Sie auf einer schwebenden Insel. Flache Welt ohne Strukturen.',
  pvpArena: 'PvP Arena',
  pvpArenaDesc: 'Kampforientierter Server. Abenteuermodus, keine Mobs, PvP aktiviert.',
  peacefulParadise: 'Friedliches Paradies',
  peacefulParadiseDesc:
    'Entspannendes Überleben ohne feindliche Mobs. Perfekt für Gelegenheitsspieler.',
  amplifiedWorld: 'Verstärkte Welt',
  amplifiedWorldDesc: 'Extreme Terrain-Generierung. Erfordert mehr RAM für flüssiges Spielen.',

  // ===========================
  // PROXY SETTINGS
  // ===========================
  proxySettings: 'Proxy-Einstellungen',
  proxySettingsDesc: 'Konfiguriere mc-router, um einen einzelnen Port für alle Server zu verwenden',
  proxyBaseDomain: 'Basis-Domain',
  proxyBaseDomainDesc: 'Die Domain, die für Server-Subdomains verwendet wird (z.B. mc.example.com)',
  enableProxy: 'Proxy Aktivieren',
  enableProxyDesc: 'Leite den gesamten Minecraft-Verkehr über mc-router auf Port 25565',
  proxyRequiresDomain: 'Konfiguriere eine Basis-Domain, um die Proxy-Funktion zu aktivieren',
  proxyDnsInfo: 'Konfiguriere einen Wildcard-DNS-Eintrag, der auf deinen Server zeigt:',
  proxyHostname: 'Benutzerdefinierter Hostname',
  proxyHostnameDesc:
    'Optionaler benutzerdefinierter Hostname für diesen Server. Leer lassen für automatische Generierung',
  useProxy: 'Proxy Verwenden',
  useProxyDesc:
    'Proxy-Routing für diesen Server aktivieren. Bei Deaktivierung wird direkter Port-Zugang verwendet',
  proxySettingsServerDesc: 'Konfiguriere, wie dieser Server über den mc-router Proxy verbindet',
  proxyServerInfo:
    'Proxy-Einstellungen gelten nur, wenn der globale Proxy in den Einstellungen aktiviert ist',

  // NETWORK SETTINGS
  networkSettings: 'Netzwerk-Einstellungen',
  networkSettingsDesc:
    'Konfiguriere IP-Adressen für Serververbindungen und Discord-Benachrichtigungen',
  publicIp: 'Öffentliche IP / Domain',
  publicIpDesc:
    'Deine Server öffentliche IP oder Domain. Für externe Spielerverbindungen und Benachrichtigungen',
  lanIp: 'LAN IP',
  lanIpDesc: 'Deine lokale Netzwerk-IP. Für Spieler im gleichen Netzwerk',
  networkProxyNote:
    'Wenn Proxy aktiviert ist, wird der Proxy-Hostname anstelle von IP:Port in Benachrichtigungen verwendet',

  // ===========================
  // BEDROCK EDITION
  // ===========================
  serverEdition: 'Server Edition',
  javaEditionDesc: 'PC/Mac-Version mit Mod-Unterstützung',
  bedrockEditionDesc: 'Plattformübergreifend (Mobil, Konsole, Win10)',
  editionLocked: 'Kann nach der Servererstellung nicht geändert werden',
  bedrockVersion: 'Bedrock Version',
  bedrockVersionDesc: 'Wähle die Bedrock-Version. LATEST aktualisiert automatisch auf die neueste Version.',
  autoUpdate: 'Auto Update',
  preview: 'Vorschau',
  bedrockInfo: 'Bedrock Edition Server',
  bedrockInfoDesc: 'Bedrock-Server unterstützen Cross-Play zwischen Mobil-, Konsolen- und Windows 10/11-Spielern. Hinweis: RCON-Befehle werden nicht unterstützt.',
  bedrock: 'Bedrock',
  bedrockSettings: 'Bedrock Einstellungen',
  bedrockSettingsDesc: 'Konfiguriere Bedrock-spezifische Serveroptionen',
  permissions: 'Berechtigungen',
  allowCheats: 'Cheats Erlauben',
  allowCheatsDesc: 'Befehle für alle Spieler aktivieren, wenn kein Operator',
  defaultPermissionLevel: 'Standard-Berechtigungsstufe',
  defaultPermissionLevelDesc: 'Berechtigungsstufe für neue Spieler',
  visitor: 'Besucher',
  member: 'Mitglied',
  operator: 'Operator',
  performance: 'Leistung',
  tickDistance: 'Tick-Distanz',
  tickDistanceDesc: 'Welt-Tick-Simulationsdistanz (4-12). Niedriger = bessere Leistung.',
  maxThreads: 'Max Threads',
  maxThreadsDesc: 'Maximale Threads für Server-Operationen',
  playerSettings: 'Spieler-Einstellungen',
  texturepackRequired: 'Texturepack Erforderlich',
  texturepackRequiredDesc: 'Spieler zwingen, Server-Ressourcenpaket herunterzuladen',
  whiteList: 'Whitelist',
  whiteListDesc: 'Nur Spieler auf der Whitelist dürfen beitreten',
  serverPortV6: 'IPv6 Port',
  serverPortV6Desc: 'Port für IPv6-Verbindungen. Leer lassen zum Deaktivieren.',
  serverPortV6Help: 'Optional. Einstellen, wenn dein Server IPv6-Verbindungen unterstützt.',

  // BEDROCK TEMPLATES
  bedrockSurvival: 'Bedrock Überleben',
  bedrockSurvivalDesc: 'Klassisches Überleben für Mobil- und Konsolenspieler.',
  bedrockCreative: 'Bedrock Kreativ',
  bedrockCreativeDesc: 'Kreativmodus mit aktivierten Cheats für alle Spieler.',
  bedrockFamily: 'Bedrock Familie',
  bedrockFamilyDesc: 'Privater LAN-Server für Familienspiel mit Whitelist.',

  // SFTP
  sftp: 'SFTP',
  enableSftp: 'SFTP aktivieren',
  disableSftp: 'SFTP deaktivieren',
  sftpDetails: 'SFTP-Verbindungsdetails',
  sftpHost: 'Host',
  sftpPort: 'Port',
  sftpUsername: 'Benutzername',
  sftpPassword: 'Passwort',
  sftpPasswordDesc: 'Verwenden Sie Ihr Kontopasswort',
  sftpStatus: 'SFTP-Status',
  sftpActive: 'Aktiv',
  sftpInactive: 'Inaktiv',
  sftpWarning: 'SFTP ermöglicht direkten Zugriff auf Dateien. Seien Sie vorsichtig.',
};

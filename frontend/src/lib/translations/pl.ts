export const pl = {
  // ===========================
  // AUTHENTICATION
  // ===========================
  login: 'Zaloguj się',
  logout: 'Wyloguj się',
  username: 'Nazwa użytkownika',
  password: 'Hasło',
  invalidCredentials: 'Nieprawidłowe dane logowania',
  loginSuccess: 'Logowanie zakończone sukcesem',
  serverUnavailable: 'Nie można połączyć się z serwerem',
  serverUnavailableDesc:
    'Wygląda na problem z konfiguracją. Sprawdź, czy adres URL backendu jest poprawnie ustawiony, czy serwer działa oraz czy nie występuje problem z DNS.',
  checkingServerStatus: 'Sprawdzanie połączenia...',
  cannotConnectToServer: 'Nie można połączyć się z serwerem',
  cannotConnectToServerDesc:
    'Aplikacja nie może nawiązać połączenia z serwerem backend. Sprawdź konfigurację.',
  troubleshootingSteps: 'Kroki rozwiązywania problemów',
  checkBackendUrl: 'Sprawdź adres URL backendu',
  checkBackendUrlDesc:
    'Upewnij się, że zmienna środowiskowa NEXT_PUBLIC_API_URL jest poprawnie skonfigurowana',
  checkServerRunning: 'Sprawdź stan serwera',
  checkServerRunningDesc:
    'Upewnij się, że serwer backend działa i jest dostępny na skonfigurowanym porcie',
  checkDNS: 'Sprawdź DNS/Sieć',
  checkDNSDesc: 'Sprawdź, czy nie ma problemów z DNS lub zaporą sieciową blokującą połączenie',
  needMoreHelp: 'Potrzebujesz więcej pomocy?',
  needMoreHelpDesc: 'Sprawdź dokumentację lub skontaktuj się ze wsparciem technicznym',
  retryConnection: 'Ponów połączenie',
  retrying: 'Ponawianie...',

  // ===========================
  // NAVIGATION
  // ===========================
  dashboard: 'Panel główny',
  servers: 'Serwery',
  settings: 'Ustawienia',
  home: 'Strona główna',
  navigation: 'Nawigacja',

  // ===========================
  // COMMON ACTIONS
  // ===========================
  save: 'Zapisz',
  saving: 'Zapisywanie...',
  cancel: 'Anuluj',
  confirm: 'Potwierdź',
  loading: 'Ładowanie...',
  error: 'Błąd',
  success: 'Sukces',
  welcome: 'Witamy',
  start: 'Uruchom',
  stop: 'Zatrzymaj',
  restart: 'Uruchom ponownie',
  delete: 'Usuń',
  edit: 'Edytuj',
  console: 'Konsola',
  files: 'Pliki',
  configure: 'Konfiguruj',
  creating: 'Tworzenie...',
  eliminating: 'Usuwanie...',
  deleting: 'Usuwanie...',
  sending: 'Wysyłanie...',
  send: 'Wyślij',
  refresh: 'Odśwież',
  retry: 'Ponów',
  pause: 'Wstrzymaj',
  resume: 'Wznów',
  search: 'Szukaj...',
  saveConfiguration: 'Zapisz konfigurację',
  saveConfigurationSuccess: 'Konfiguracja została zapisana pomyślnie',
  saveConfigurationError: 'Błąd podczas zapisywania konfiguracji',
  loadConfigError: 'Błąd podczas ładowania konfiguracji serwera',
  serverRestartSuccess: 'Serwer został pomyślnie zrestartowany',
  serverRestartError: 'Błąd podczas restartowania serwera',
  clearDataSuccess: 'Dane serwera zostały pomyślnie wyczyszczone',
  clearDataError: 'Błąd podczas czyszczenia danych serwera',
  saveChanges: 'Zapisz zmiany',
  addPort: 'Dodaj port',
  addVariable: 'Dodaj zmienną',
  comingSoon: 'Wkrótce dostępne',

  // ===========================
  // STATUS
  // ===========================
  online: 'Online',
  offline: 'Offline',
  starting: 'Uruchamianie',
  stopping: 'Zatrzymywanie',
  running: 'Działa',
  stopped: 'Zatrzymany',
  not_found: 'Nie znaleziono',
  active: 'Aktywny',
  starting2: 'Uruchamianie...',
  stopped2: 'Zatrzymany',
  notFound: 'Nie znaleziono',
  unknown: 'Nieznany',
  restarting: 'Restartowanie...',
  initializing: 'Inicjalizacja...',
  verifyingAuth: 'Weryfikacja uwierzytelniania...',
  disconnected: 'Rozłączono',
  withErrors: 'Z błędami',

  // ===========================
  // SERVER MANAGEMENT
  // ===========================
  createServer: 'Utwórz serwer',
  serverName: 'Nazwa serwera',
  serverType: 'Typ serwera',
  serverTypeDescription: 'Wybierz typ serwera Minecraft, który chcesz skonfigurować.',
  version: 'Wersja',
  memory: 'Pamięć',
  port: 'Port',
  difficulty: 'Poziom trudności',
  gameMode: 'Tryb gry',
  maxPlayers: 'Maksymalna liczba graczy',
  serverId: 'ID serwera',
  serverIdLabel: 'ID serwera',
  serverIdDescription:
    'Unikalny identyfikator serwera (tylko litery, cyfry, myślniki i podkreślenia)',
  serverIdPlaceholder: 'moj-serwer',
  serverIdDesc: 'Unikalny identyfikator twojego serwera',
  serverDefaultName: 'Serwer',
  minecraftServer: 'Serwer Minecraft',
  currentStatus: 'Aktualny status',
  serverInformation: 'Informacje o serwerze',
  container: 'Kontener',
  // ===========================
  // SERVER CONFIGURATION
  // ===========================
  serverConfiguration: 'Konfiguracja serwera',
  basicSettings: 'Ustawienia podstawowe',
  advancedSettings: 'Ustawienia zaawansowane',
  serverProperties: 'Właściwości serwera',
  environmentVariables: 'Zmienne środowiskowe',
  startupCommand: 'Komenda startowa',
  startupDescription:
    'Komenda używana do uruchamiania serwera. Zmieniaj tylko jeśli wiesz co robisz.',
  dockerImage: 'Obraz Docker',
  dockerTag: 'Tag obrazu',
  autoStart: 'Automatyczne uruchamianie',
  autoRestart: 'Automatyczny restart',
  enableLogs: 'Włącz logi',
  enableBackups: 'Włącz kopie zapasowe',
  backupInterval: 'Interwał kopii zapasowej',
  backupRetention: 'Liczba przechowywanych kopii',
  resourceLimits: 'Limity zasobów',
  cpuLimit: 'Limit CPU',
  memoryLimit: 'Limit pamięci',
  diskLimit: 'Limit dysku',
  networkSettings: 'Ustawienia sieciowe',
  exposedPorts: 'Wystawione porty',
  internalPort: 'Port wewnętrzny',
  externalPort: 'Port zewnętrzny',
  protocol: 'Protokół',

  // ===========================
  // FILE MANAGER
  // ===========================
  fileManager: 'Menedżer plików',
  uploadFile: 'Prześlij plik',
  downloadFile: 'Pobierz plik',
  deleteFile: 'Usuń plik',
  renameFile: 'Zmień nazwę pliku',
  createFolder: 'Utwórz folder',
  folderName: 'Nazwa folderu',
  fileName: 'Nazwa pliku',
  fileSize: 'Rozmiar pliku',
  lastModified: 'Ostatnia modyfikacja',
  permissions: 'Uprawnienia',
  rootDirectory: 'Katalog główny',
  emptyDirectory: 'Folder jest pusty',
  confirmDeleteFile: 'Czy na pewno chcesz usunąć ten plik?',
  confirmDeleteFolder: 'Czy na pewno chcesz usunąć ten folder?',
  uploadSuccess: 'Plik został przesłany pomyślnie',
  uploadError: 'Błąd podczas przesyłania pliku',
  downloadError: 'Błąd podczas pobierania pliku',
  renameSuccess: 'Nazwa została zmieniona pomyślnie',
  renameError: 'Błąd podczas zmiany nazwy',
  createFolderSuccess: 'Folder został utworzony',
  createFolderError: 'Błąd podczas tworzenia folderu',

  // ===========================
  // CONSOLE
  // ===========================
  serverConsole: 'Konsola serwera',
  enterCommand: 'Wpisz komendę...',
  sendCommand: 'Wyślij komendę',
  clearConsole: 'Wyczyść konsolę',
  autoScroll: 'Automatyczne przewijanie',
  consoleOutput: 'Wyjście konsoli',
  consoleConnected: 'Połączono z konsolą',
  consoleDisconnected: 'Rozłączono z konsolą',
  consoleError: 'Błąd połączenia z konsolą',

  // ===========================
  // BACKUPS
  // ===========================
  backups: 'Kopie zapasowe',
  createBackup: 'Utwórz kopię zapasową',
  restoreBackup: 'Przywróć kopię zapasową',
  deleteBackup: 'Usuń kopię zapasową',
  backupName: 'Nazwa kopii',
  backupDate: 'Data utworzenia',
  backupSize: 'Rozmiar kopii',
  noBackups: 'Brak dostępnych kopii zapasowych',
  confirmRestoreBackup: 'Czy na pewno chcesz przywrócić tę kopię zapasową?',
  confirmDeleteBackup: 'Czy na pewno chcesz usunąć tę kopię zapasową?',
  backupCreated: 'Kopia zapasowa została utworzona',
  backupRestored: 'Kopia zapasowa została przywrócona',
  backupDeleted: 'Kopia zapasowa została usunięta',
  backupError: 'Błąd operacji na kopii zapasowej',

  // ===========================
  // USERS & PERMISSIONS
  // ===========================
  users: 'Użytkownicy',
  user: 'Użytkownik',
  addUser: 'Dodaj użytkownika',
  editUser: 'Edytuj użytkownika',
  deleteUser: 'Usuń użytkownika',
  role: 'Rola',
  roles: 'Role',
  admin: 'Administrator',
  moderator: 'Moderator',
  member: 'Członek',
  viewer: 'Podgląd',
  email: 'Adres e-mail',
  passwordConfirmation: 'Potwierdź hasło',
  userCreated: 'Użytkownik został utworzony',
  userUpdated: 'Dane użytkownika zostały zaktualizowane',
  userDeleted: 'Użytkownik został usunięty',
  userError: 'Błąd operacji na użytkowniku',

  // ===========================
  // NOTIFICATIONS
  // ===========================
  notifications: 'Powiadomienia',
  noNotifications: 'Brak powiadomień',
  markAllAsRead: 'Oznacz wszystkie jako przeczytane',
  markAsRead: 'Oznacz jako przeczytane',
  newNotification: 'Nowe powiadomienie',

  // ===========================
  // SYSTEM
  // ===========================
  system: 'System',
  systemStatus: 'Status systemu',
  uptime: 'Czas działania',
  cpuUsage: 'Użycie CPU',
  memoryUsage: 'Użycie pamięci',
  diskUsage: 'Użycie dysku',
  networkUsage: 'Użycie sieci',
  systemLogs: 'Logi systemowe',
  viewLogs: 'Zobacz logi',
  clearLogs: 'Wyczyść logi',
  logsCleared: 'Logi zostały wyczyszczone',
  logsError: 'Błąd podczas czyszczenia logów',
  // ===========================
  // MONITORING & STATISTICS
  // ===========================
  monitoring: 'Monitorowanie',
  statistics: 'Statystyki',
  performance: 'Wydajność',
  realTimeStats: 'Statystyki w czasie rzeczywistym',
  averageLoad: 'Średnie obciążenie',
  peakUsage: 'Maksymalne użycie',
  activeConnections: 'Aktywne połączenia',
  playerCount: 'Liczba graczy',
  tps: 'TPS',
  ramUsage: 'Zużycie RAM',
  diskIO: 'Operacje dyskowe',
  networkIO: 'Transfer sieciowy',
  processList: 'Lista procesów',
  threadCount: 'Liczba wątków',
  entityCount: 'Liczba encji',
  chunkCount: 'Liczba chunków',

  // ===========================
  // SECURITY
  // ===========================
  security: 'Bezpieczeństwo',
  twoFactorAuth: 'Uwierzytelnianie dwuskładnikowe',
  enable2FA: 'Włącz 2FA',
  disable2FA: 'Wyłącz 2FA',
  apiKeys: 'Klucze API',
  createApiKey: 'Utwórz klucz API',
  revokeApiKey: 'Unieważnij klucz API',
  apiKeyCreated: 'Klucz API został utworzony',
  apiKeyRevoked: 'Klucz API został unieważniony',
  firewall: 'Zapora sieciowa',
  allowedIPs: 'Dozwolone adresy IP',
  blockedIPs: 'Zablokowane adresy IP',
  addIP: 'Dodaj adres IP',
  removeIP: 'Usuń adres IP',
  ipAddress: 'Adres IP',
  securityLogs: 'Logi bezpieczeństwa',
  lastLogin: 'Ostatnie logowanie',
  failedAttempts: 'Nieudane próby logowania',

  // ===========================
  // SCHEDULER / TASKS
  // ===========================
  scheduler: 'Harmonogram',
  scheduledTasks: 'Zaplanowane zadania',
  createTask: 'Utwórz zadanie',
  editTask: 'Edytuj zadanie',
  deleteTask: 'Usuń zadanie',
  taskName: 'Nazwa zadania',
  taskCommand: 'Komenda zadania',
  taskInterval: 'Interwał',
  cronExpression: 'Wyrażenie CRON',
  nextRun: 'Następne uruchomienie',
  lastRun: 'Ostatnie uruchomienie',
  taskCreated: 'Zadanie zostało utworzone',
  taskUpdated: 'Zadanie zostało zaktualizowane',
  taskDeleted: 'Zadanie zostało usunięte',
  taskError: 'Błąd operacji na zadaniu',

  // ===========================
  // INSTALLER
  // ===========================
  installer: 'Instalator',
  installServer: 'Zainstaluj serwer',
  reinstallServer: 'Zainstaluj ponownie serwer',
  installationInProgress: 'Instalacja w toku...',
  installationCompleted: 'Instalacja zakończona',
  installationFailed: 'Instalacja nie powiodła się',
  selectTemplate: 'Wybierz szablon',
  templates: 'Szablony',
  officialTemplates: 'Oficjalne szablony',
  communityTemplates: 'Szablony społeczności',
  customTemplate: 'Własny szablon',

  // ===========================
  // DATABASE
  // ===========================
  databases: 'Bazy danych',
  createDatabase: 'Utwórz bazę danych',
  deleteDatabase: 'Usuń bazę danych',
  databaseName: 'Nazwa bazy danych',
  databaseUser: 'Użytkownik bazy danych',
  databasePassword: 'Hasło bazy danych',
  databaseHost: 'Host bazy danych',
  databasePort: 'Port bazy danych',
  databaseCreated: 'Baza danych została utworzona',
  databaseDeleted: 'Baza danych została usunięta',
  databaseError: 'Błąd operacji na bazie danych',

  // ===========================
  // EMAIL SETTINGS
  // ===========================
  emailSettings: 'Ustawienia e-mail',
  smtpHost: 'Host SMTP',
  smtpPort: 'Port SMTP',
  smtpUser: 'Użytkownik SMTP',
  smtpPassword: 'Hasło SMTP',
  fromEmail: 'Adres nadawcy',
  testEmail: 'Wyślij testowy e-mail',
  emailSent: 'E-mail został wysłany',
  emailError: 'Błąd wysyłania e-maila',

  // ===========================
  // PROFILE
  // ===========================
  profile: 'Profil',
  accountSettings: 'Ustawienia konta',
  changePassword: 'Zmień hasło',
  currentPassword: 'Aktualne hasło',
  newPassword: 'Nowe hasło',
  confirmNewPassword: 'Potwierdź nowe hasło',
  passwordChanged: 'Hasło zostało zmienione',
  passwordChangeError: 'Błąd podczas zmiany hasła',
  language: 'Język',
  spanish: 'Hiszpański',
  english: 'Angielski',
  dutch: 'Holenderski',
  german: 'Niemiecki',
  polish: 'Polski',
  changeLanguage: 'Zmień język',
  theme: 'Motyw',
  lightTheme: 'Jasny',
  darkTheme: 'Ciemny',
  systemTheme: 'Systemowy',
  profileUpdated: 'Profil został zaktualizowany',
  profileUpdateError: 'Błąd aktualizacji profilu',
  // ===========================
  // BILLING
  // ===========================
  billing: 'Rozliczenia',
  plans: 'Plany',
  currentPlan: 'Aktualny plan',
  upgradePlan: 'Zmień plan',
  downgradePlan: 'Obniż plan',
  renewPlan: 'Odnów plan',
  cancelPlan: 'Anuluj plan',
  paymentMethod: 'Metoda płatności',
  addPaymentMethod: 'Dodaj metodę płatności',
  removePaymentMethod: 'Usuń metodę płatności',
  cardNumber: 'Numer karty',
  expirationDate: 'Data ważności',
  cvc: 'Kod CVC',
  billingHistory: 'Historia płatności',
  invoice: 'Faktura',
  downloadInvoice: 'Pobierz fakturę',
  paymentSuccessful: 'Płatność zakończona sukcesem',
  paymentFailed: 'Płatność nie powiodła się',
  trialEnds: 'Okres próbny kończy się',
  nextBillingDate: 'Następna data rozliczenia',

  // ===========================
  // SUPPORT
  // ===========================
  support: 'Wsparcie',
  helpCenter: 'Centrum pomocy',
  documentation: 'Dokumentacja',
  contactSupport: 'Skontaktuj się ze wsparciem',
  submitTicket: 'Utwórz zgłoszenie',
  ticketSubject: 'Temat zgłoszenia',
  ticketMessage: 'Treść zgłoszenia',
  ticketPriority: 'Priorytet',
  low: 'Niski',
  medium: 'Średni',
  high: 'Wysoki',
  urgent: 'Pilny',
  ticketCreated: 'Zgłoszenie zostało utworzone',
  ticketClosed: 'Zgłoszenie zostało zamknięte',
  ticketUpdated: 'Zgłoszenie zostało zaktualizowane',

  // ===========================
  // ERRORS & VALIDATION
  // ===========================
  requiredField: 'To pole jest wymagane',
  invalidEmail: 'Nieprawidłowy adres e-mail',
  passwordTooShort: 'Hasło jest za krótkie',
  passwordsDoNotMatch: 'Hasła nie są zgodne',
  invalidPort: 'Nieprawidłowy numer portu',
  invalidIpAddress: 'Nieprawidłowy adres IP',
  invalidCron: 'Nieprawidłowe wyrażenie CRON',
  somethingWentWrong: 'Coś poszło nie tak',
  accessDenied: 'Brak dostępu',
  sessionExpired: 'Sesja wygasła',
  pageNotFound: 'Strona nie została znaleziona',
  internalServerError: 'Wewnętrzny błąd serwera',

  // ===========================
  // CONFIRMATIONS
  // ===========================
  areYouSure: 'Czy jesteś pewien?',
  thisActionCannotBeUndone: 'Tej operacji nie można cofnąć.',
  confirmDeletion: 'Potwierdź usunięcie',
  confirmRestart: 'Potwierdź restart',
  confirmStop: 'Potwierdź zatrzymanie',
  confirmStart: 'Potwierdź uruchomienie',

  // ===========================
  // PLACEHOLDERS
  // ===========================
  enterServerName: 'Wpisz nazwę serwera',
  enterVersion: 'Wpisz wersję',
  enterMemory: 'Wpisz ilość pamięci (np. 2GB)',
  enterPort: 'Wpisz numer portu',
  enterEmail: 'Wpisz adres e-mail',
  enterPassword: 'Wpisz hasło',
  searchServers: 'Szukaj serwerów...',
  searchUsers: 'Szukaj użytkowników...',
  searchLogs: 'Szukaj w logach...',

  // ===========================
  // MISC
  // ===========================
  yes: 'Tak',
  no: 'Nie',
  enabled: 'Włączone',
  disabled: 'Wyłączone',
  optional: 'Opcjonalne',
  required: 'Wymagane',
  public: 'Publiczny',
  private: 'Prywatny',
  createdAt: 'Data utworzenia',
  updatedAt: 'Data aktualizacji',
  actions: 'Akcje',
  details: 'Szczegóły',
  description: 'Opis',
  type: 'Typ',
  status: 'Status',
  name: 'Nazwa',
  date: 'Data',
  time: 'Czas',
  size: 'Rozmiar',
  usage: 'Użycie',
  limit: 'Limit',
  total: 'Łącznie',
  free: 'Dostępne',
  used: 'Wykorzystane',
  percentage: 'Procent',
  versionLabel: 'Wersja',
  build: 'Build',
  environment: 'Środowisko',
  production: 'Produkcyjne',
  development: 'Deweloperskie',
  staging: 'Testowe',

  // ===========================
  // TIME & DATES
  // ===========================
  today: 'Dzisiaj',
  yesterday: 'Wczoraj',
  tomorrow: 'Jutro',
  minutes: 'Minuty',
  hours: 'Godziny',
  days: 'Dni',
  weeks: 'Tygodnie',
  months: 'Miesiące',
  years: 'Lata',
  never: 'Nigdy',

  // ===========================
  // FINAL
  // ===========================
  footerText: 'Wszystkie prawa zastrzeżone.',
};

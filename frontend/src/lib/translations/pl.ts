import type { TranslationKey } from './en';

export const pl: Record<TranslationKey, string> = {
  // ===========================
  // UWIERZYTELNIANIE
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
  // NAWIGACJA
  // ===========================
  dashboard: 'Panel główny',
  servers: 'Serwery',
  settings: 'Ustawienia',
  home: 'Strona główna',
  navigation: 'Nawigacja',

  // ===========================
  // GŁOWNE AKCJE
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
  // ZARZĄDZANIE SERWERAMI
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

  // Typy serwerów
  serverVanilla:
    'Podstawowy serwer Minecraft bez modów i pluginów. Idealny do gry w klasycznym trybie survival.',
  serverForge:
    'Serwer z obsługą modów przy użyciu Forge. Wymaga konfiguracji konkretnej wersji Forge, która ma być używana.',
  serverNeoforge:
    'Serwer z obsługą modów przy użyciu Neoforge. Wymaga konfiguracji konkretnej wersji Neoforge, która ma być używana.',
  serverCurseForge:
    'Automatycznie instaluje paczki modów z CurseForge. Może być skonfigurowany przy użyciu adresu URL paczki lub jej slugu.',
  serverCurseForgeManual:
    'Tryb ręczny dla paczek modów CurseForge. Używa wcześniej wgranych plików ZIP. Funkcja przestarzała — zalecamy użycie CurseForge Modpack.',
  serverModrinth:
    'Automatycznie instaluje paczki modów z Modrinth. Może być skonfigurowany przy użyciu adresu URL paczki lub jej slugu.',
  serverSpigot: 'Zoptymalizowany serwer kompatybilny z pluginami Bukkit',
  serverPaper: 'Wysokowydajny serwer oparty na Spigot z dodatkowymi optymalizacjami',
  serverBukkit: 'Klasyczny serwer ze standardowym wsparciem dla API pluginów',
  serverPufferfish:
    'Zoptymalizowany fork Paper przeznaczony dla dużych serwerów wymagających maksymalnej wydajności',
  serverPurpur: 'Serwer z dodatkowymi, konfigurowalnymi i rozrywkowymi funkcjami oparty na Paper',
  serverLeaf: 'Fork serwera Paper skoncentrowany na wydajności i niskopoziomowych optymalizacjach',
  serverFolia: 'Eksperymentalny serwer Paper z obsługą wielowątkowości (regiony)',
  selectType: 'Wybierz typ serwera',

  // Akcje server
  startServer: 'Uruchom',
  stopServer: 'Zatrzymaj',
  restart2: 'Zrestartuj',
  consoleStatus: 'Konsola',
  manageServer: 'Zarządzaj',

  // ===========================
  // PANEL SERWERA
  // ===========================
  dashboardTitle: 'Panel serwera',
  dashboardDescription: 'Zarządzaj i konfiguruj swoje serwery Minecraft',
  myServers: 'Moje serwery',
  noServers: 'Nie masz utworzonych żadnych serwerów',
  noServersDesc: 'Utwórz swój pierwszy serwer, aby rozpocząć',
  noServersAvailable: 'Brak dostępnych serwerów',
  noServersAvailableDesc: 'Utwórz swój pierwszy serwer, aby rozpocząć przygodę',
  createFirstServer: 'Utwórz mój pierwszy serwer',
  createNewServer: 'Utwórz nowy serwer',
  systemActive: 'System aktywny',
  admin: 'Administrator',
  administrator: 'Administrator',
  minecraftPanel: 'Minepanel',

  // Strona główna
  homeTitle: 'Strona główna',
  homeDescription: 'Przegląd panelu serwera Minecraft',
  welcomeBack: 'Witaj ponownie',
  quickStats: 'Szybkie statystyki',
  totalServers: 'Łączna liczba serwerów',
  runningServers: 'Uruchomione serwery',
  stoppedServers: 'Zatrzymane serwery',
  systemStatus: 'Stan systemu',
  cpuUsage: 'Użycie procesora',
  memoryUsage: 'Użycie pamięci',
  diskUsage: 'Użycie dysku',
  recentActivity: 'Ostatnia aktywność',
  noRecentActivity: 'Brak ostatniej aktywności',
  quickActions: 'Szybkie akcje',
  viewAllServers: 'Wyświetl wszystkie serwery',
  serversOverview: 'Przegląd serwerów',
  viewAll: 'Wyświetl wszystkie',
  systemHealth: 'Stan systemu',
  healthy: 'Stan zdrowia',
  alertServerDown: "Serwer '{server}' jest wyłączony",
  alertHighCPU: "Wysokie użycie procesora na '{server}': {value}%",
  alertHighMemory: "Wysokie użycie pamięci na '{server}': {value}%",

  // Ustawienia
  settingsTitle: 'Ustawienia',
  settingsDescription: 'Skonfiguruj preferencje konta i aplikacji',
  accountSettings: 'Ustawienia konta',
  yourUsername: 'Twoja nazwa użytkownika',
  changePassword: 'Zmień hasło',
  currentPassword: 'Aktualne hasło',
  newPassword: 'Nowe hasło',
  confirmPassword: 'Potwierdź hasło',
  updatePassword: 'Zaktualizuj hasło',
  apiSettings: 'Ustawienia API',
  apiSettingsDesc: 'Skonfiguruj klucze API dla integracji zewnętrznych',
  curseforgeApiKey: 'Klucz API CurseForge',
  curseforgeApiKeyDesc: 'Klucz API do pobierania modów i pakietów modów z CurseForge',
  importFromSettings: 'Importuj z ustawień',
  apiKeyImported: 'Klucz API zaimportowany pomyślnie',
  noApiKeyConfigured: 'Brak skonfigurowanego klucza API w Ustawieniach',
  discordWebhook: 'Adres URL webhooka Discord',
  discordWebhookDesc: 'Adres URL webhooka dla powiadomień Discord',
  appearanceSettings: 'Wygląd',
  languageDesc: 'Wybierz preferowany język',
  notificationSettings: 'Powiadomienia',
  enableNotifications: 'Włącz powiadomienia',
  enableNotificationsDesc: 'Otrzymuj powiadomienia o zdarzeniach na serwerze',
  dangerZone: 'Strefa zagrożenia',
  dangerZoneDesc: 'Akcje nieodwracalne i destrukcyjne',
  settingsSaved: 'Ustawienia zostały pomyślnie zapisane',
  settingsSaveFailed: 'Nie udało się zapisać ustawień',
  test: 'Test',
  webhookTestSuccess: 'Test webhooka zakończony sukcesem! Sprawdź swój kanał Discord',
  webhookTestFailed: 'Nie udało się przetestować webhooka',
  securitySettings: 'Bezpieczeństwo',
  securitySettingsDesc: 'Zarządzaj swoim hasłem i preferencjami bezpieczeństwa',
  passwordChangedSuccessfully: 'Hasło zostało pomyślnie zmienione',
  passwordChangeFailed: 'Nie udało się zmienić hasła',
  passwordsMustMatch: 'Hasła muszą być takie same',
  incorrectCurrentPassword: 'Aktualne hasło jest nieprawidłowe',
  allPasswordFieldsRequired: 'Wszystkie pola hasła są wymagane',

  // Tworzenie serwera
  serverCreationDesc: 'Utwórz nowy serwer Minecraft',
  enterServerName: 'Wprowadź nazwę nowego serwera Minecraft.',

  // Usuwanie serwera
  deleteServer: 'Usuń serwer',
  deleteServerTitle: 'Usuń serwer',
  deleteServerConfirm: 'Czy na pewno chcesz usunąć ten serwer?',
  deleteServerDesc:
    'Tej czynności nie można cofnąć. Spowoduje to trwałe usunięcie serwera i wszystkich jego danych.',
  deleteServerWarning: 'Czy na pewno chcesz usunąć serwer?',
  cannotBeUndone:
    'Tej czynności nie można cofnąć i spowoduje to usunięcie wszystkich danych serwera.',
  deleteServerData: 'Usuń dane serwera',
  deleteConfirmTitle: 'Czy jesteś absolutnie pewien?',
  deleteConfirmDesc:
    'Tej czynności nie można cofnąć. Wszystkie światy, konfiguracje i zapisane dane serwera zostaną usunięte.',
  yesDeleteAll: 'Tak, usuń wszystko',

  // ===========================
  // WALIDACJA
  // ===========================
  idMinLength: 'Identyfikator musi mieć co najmniej 3 znaki',
  idMaxLength: 'Identyfikator musi mieć maksymalnie 20 znaków',
  idInvalidChars: 'Identyfikator może zawierać tylko litery, cyfry, myślniki i podkreślenia',

  // ===========================
  // POWIADOMIENIA I WIADOMOŚCI
  // ===========================
  serverCreated: 'Serwer został pomyślnie utworzony',
  serverDeleted: 'Serwer został pomyślnie usunięty',
  serverStarted: 'Serwer został pomyślnie uruchomiony',
  serverStopped: 'Serwer został pomyślnie zatrzymany',
  serverCreatedSuccess: 'Serwer został pomyślnie utworzony',
  serverDeletedSuccess: 'Serwer został pomyślnie usunięty',

  // ===========================
  // BŁĘDY
  // ===========================
  serverNotFound: 'Nie znaleziono serwera',
  connectionError: 'Błąd połączenia',
  unexpectedError: 'Nieoczekiwany błąd',
  NO_ACCESS_TOKEN: 'Nie otrzymano tokena dostępu',
  LOGIN_ERROR: 'Błąd logowania',
  SERVER_START_ERROR: 'Błąd uruchamiania serwera',
  SERVER_STOP_ERROR: 'Błąd zatrzymywania serwera',
  errorLoadingServerList: 'Błąd ładowania listy serwerów',
  errorProcessingStatuses: 'Błąd przetwarzania statusów serwerów',
  errorDeletingServer: 'Błąd usuwania serwera',
  errorCreatingServer: 'Błąd tworzenia serwera',
  errorLoadingServerInfo: 'Błąd ładowania informacji o serwerze',
  errorLoadingLogs: 'Błąd ładowania logów',
  errorFetchingResources: 'Błąd pobierania zasobów serwera',
  errorGettingLogsServer: 'Błąd pobierania logów z serwera',
  containerNotFound: 'Nie znaleziono kontenera',
  serverNotFoundSpecified: 'Nie znaleziono określonego serwera',
  connectionErrorDocker: 'Błąd połączenia z Dockerem',
  unknownError: 'Nieznany błąd',
  logsError: 'Błąd w logach',
  resourcesError: 'Błąd w zasobach',
  errorsDetected: 'Wykryto błędy w logach',
  errorsDetectedDesc: 'W logach serwera znaleziono błędy lub wyjątki',
  saveFailed: 'Zapis nie powiódł się',
  configSavedAutomatically: 'Konfiguracja zapisana automatycznie',
  errorSavingAutomatically: 'Błąd automatycznego zapisywania',
  saveMode: 'Tryb zapisu',
  autoSave: 'Automatyczny zapis',
  manualSave: 'Zapis ręczny',
  saveNow: 'Zapisz teraz',
  autoSaveActive: 'Aktywny',
  serverRunningWarning: 'Serwer jest uruchomiony',
  serverRunningWarningDesc:
    'Konfiguracji nie można edytować, gdy serwer jest uruchomiony. Zatrzymaj serwer, aby wprowadzić zmiany',
  unsavedChanges: 'Niezapisane zmiany',
  allChangesSaved: 'Wszystkie zmiany zapisane',
  failedToFetchVersions: 'Nie udało się pobrać wersji',

  // ===========================
  // JĘZYKI
  // ===========================
  changeLanguage: 'Zmień język',

  // ===========================
  // STRONA: GŁÓWNA
  // ===========================
  welcomeDescription: 'Zarządzaj swoimi serwerami Minecraft z łatwością',
  enterCredentials: 'Wprowadź swoje dane, aby kontynuować',
  enterServer: 'WEJDŹ NA SERWER',
  allRightsReserved: 'Wszelkie prawa zastrzeżone',
  help: 'Pomoc',
  privacy: 'Prywatność',
  terms: 'Warunki',
  documentation: 'Dokumentacja',
  github: 'GitHub',
  reportBug: 'Zgłoś błąd',
  links: 'Linki',
  sourceCode: 'Kod źródłowy',
  withLove: 'Stworzone z',

  // ===========================
  // STRONA: USTAWIENIA OGÓLNE
  // ===========================
  general: 'Ogólne',
  generalSettings: 'Ustawienia ogólne',
  generalSettingsDesc: 'Ustawienia ogólne serwera Minecraft',
  basicSettings: 'Ustawienia podstawowe',
  performanceSettings: 'Wydajność',
  connectivitySettings: 'Łączność',

  // ===========================
  // STRONA: USTAWIENIA PODSTAWOWE
  // ===========================
  motd: 'Wiadomość dnia (MOTD)',
  motdPlaceholder: 'Niesamowity serwer Minecraft',
  motdDescription: 'Wiadomość wyświetlana na liście serwerów',
  serverNamePlaceholder: 'Nazwa Twojego serwera',
  maxPlayersPlaceholder: '20',
  players: 'Gracze',
  versionsAvailable: 'Dostępne wersje',
  recommended: 'Polecane',
  popular: 'Popularne',
  allVersions: 'Wszystkie wersje',
  selectVersion: 'Wybierz wersję',
  loadingVersions: 'Ładowanie wersji',
  updateVersions: 'Aktualizuj wersje',
  list: 'Lista',
  manual: 'Instrukcja',
  latest: 'Najnowsza',

  // Poziom trudności
  selectDifficulty: 'Wybierz poziom trudności',
  easy: 'Łatwy (Easy)',
  normal: 'Normalny (Normal)',
  hard: 'Trudny (Hard)',

  // Tryb gry
  selectGameMode: 'Wybierz tryb gry',
  survival: 'Przetrwanie (Survival)',
  creative: 'Kreatywny (Creative)',
  adventure: 'Przygoda (Adventure)',
  spectator: 'Widz (Spectator)',

  // Ustawienia świata
  worldSettings: 'Świat',
  seed: 'Ziarno świata',
  seedPlaceholder: 'Pozostaw puste, aby uzyskać losowe ziarno',
  seedDescription:
    'Ziarno świata do wygenerowania świata. Jeśli używasz liczby ujemnej, upewnij się, że jest ona ujęta w cudzysłów',
  levelType: 'Typ świata',
  selectLevelType: 'Wybierz typ świata',
  flat: 'Płaski',
  largeBiomes: 'Duże biomy',
  amplified: 'Wzmocniony',
  singleBiomeSurface: 'Powierzchnia pojedynczego biomu',

  // Ustawienia świata
  hardcore: 'Hardcore',
  hardcoreDescription: 'Po włączeniu gracze staną się widzami po śmierci',
  pvp: 'PvP',
  pvpDescription: 'Zezwalaj na walkę gracz kontra gracz',
  spawningOptions: 'Opcje generowania',
  spawnAnimals: 'Zachowaj zwierzęta',
  spawnMonsters: 'Zachowaj potwory',
  spawnNpcs: 'Zachowaj postacie niezależne',
  generateStructures: 'Generuj struktury',
  generateStructuresDescription:
    'Określ, czy struktury takie jak wioski, świątynie itp. będą generowane',
  allowNether: 'Zachowaj Nether',
  allowNetherDescription: 'Włącz lub wyłącz dostęp do wymiaru Nether',

  // ===========================
  // STRONA: WYDAJNOŚĆ
  // ===========================
  performanceConfig: 'Konfiguracja wydajności',
  viewDistance: 'Odległość widoku',
  viewDistanceDesc:
    'Określa liczbę fragmentów ładowanych wokół każdego gracza. Niższe wartości poprawiają wydajność',
  chunks: 'fragmenty',
  simulationDistance: 'Odległość symulacji',
  simulationDistanceDesc:
    'Określa, jak daleko serwer aktualizuje (moby, uprawy itp.). Może być mniejsza niż odległość widoku',
  enableCommandBlocks: 'Włącz bloki poleceń',
  enableCommandBlocksDesc:
    'Umożliwia korzystanie z bloków poleceń, które mogą wpływać na wydajność, jeśli są używane zbyt często',

  // ===========================
  // STRONA: POŁĄCZENIA
  // ===========================
  serverPort: 'Port serwera',
  serverPortDesc: 'Port, na którym serwer będzie nasłuchiwał. Domyślny port to 25565.',
  serverPortWarning:
    'Ten port musi być inny niż port innych działających serwerów, aby uniknąć konfliktów.',
  serverPortProxyInfo:
    'Port jest zarządzany przez proxy. Wszystkie serwery używają wewnętrznego portu 25565 i łączą się za pomocą nazwy hosta.',
  playerIdleTimeout: 'Limit czasu bezczynności gracza (minuty)',
  playerIdleTimeoutDesc: 'Czas przed wyrzuceniem nieaktywnych graczy (0, aby wyłączyć)',
  onlineMode: 'Tryb online',
  onlineModeDesc:
    'Jeśli włączone, serwer sprawdzi, czy gracze są uwierzytelnieni w Mojang. Zaleca się pozostawienie tej opcji włączonej, aby uniemożliwić użytkownikom korzystanie z fałszywych nazw.',
  preventProxyConnections: 'Zapobiegaj połączeniom proxy',
  preventProxyConnectionsDesc:
    'Jeśli ta opcja jest włączona, serwer będzie próbował wykryć i zablokować połączenia przez proxy/VPN.',

  // Kontrola dostępu
  accessControl: 'Kontrola dostępu',
  serverOperators: 'Operatorzy serwera',
  serverOperatorsDesc: 'Gracze z uprawnieniami administratora, oddzieleni przecinkami',
  opPermissionLevel: 'Poziom uprawnień operatora',
  selectOpPermissionLevel: 'Wybierz poziom uprawnień operatora',
  opPermissionLevel1: 'Poziom 1 (minimalny)',
  opPermissionLevel2: 'Poziom 2',
  opPermissionLevel3: 'Poziom 3',
  opPermissionLevel4: 'Poziom 4 (maksymalny)',
  opPermissionLevelDesc: 'Poziom uprawnień dla operatorów (4 = pełny dostęp)',

  // RCON
  rcon: 'RCON (Zdalne sterowanie)',
  rconDesc: 'Skonfiguruj zdalny dostęp do konsoli serwera',
  enableRcon: 'Włącz RCON',
  enableRconDesc: 'Zezwól na zdalne sterowanie serwerem za pomocą protokołu RCON',
  backupRequiresRcon: 'Kopie zapasowe wymagają protokołu RCON do prawidłowego działania',
  broadcastRconToOps: 'Rozsyłaj RCON do operatorów operacyjnych',
  broadcastRconToOpsDesc: 'Rozsyłaj polecenia RCON wykonywane do podłączonych operatorów',
  rconPort: 'Port RCON',
  rconPassword: 'Hasło RCON',
  rconPasswordImportant: 'Ważne! Musisz zmienić domyślne hasło',
  backupRconDesc: 'Usługa kopii zapasowych RCON do tworzenia kopii zapasowych',

  // Dodatkowe uprawnienia
  additionalPermissions: 'Dodatkowe uprawnienia',
  commandBlock: 'Blok poleceń',
  commandBlockDesc: 'Włącz korzystanie z bloków poleceń',
  allowFlight: 'Zezwól na lot',
  allowFlightDesc:
    'Zezwól graczom na latanie (jeśli mają włączony tryb kreatywny lub modyfikatory lotu)',

  // ===========================
  // STRONA: ZAAWANSOWANE
  // ===========================
  advancedConfig: 'Konfiguracja zaawansowana',
  advancedConfigDesc: 'Zaawansowane opcje konfiguracji serwera',
  advanced: 'Zaawansowane',

  // Konfiguracja Docker'a
  dockerImage: 'Obraz Dockera',
  dockerImageDesc: 'Oficjalny obraz Dockera do użycia na serwerze',
  dockerImageHelp: 'Obraz Dockera do użycia (najnowszy, java21, java17)',
  dockerImageHelpTags: 'Oto dostępne tagi',
  dockerImageHelpDocumentation: 'Dokumentacja wersji Java',
  dockerVolumes: 'Woluminy Dockera',
  dockerVolumesDesc: 'Dodatkowe mapowania woluminów dla kontenera Dockera',
  dockerVolumesHelp:
    'Mapowania woluminów Dockera (jedno na wiersz, format: ścieżka-lokalna:ścieżka-kontenera)',

  // Ustawienia portów
  extraPorts: 'Dodatkowe porty',
  extraPortsDesc: 'Skonfiguruj dodatkowe porty, aby udostępnić dodatkowe usługi serwera',
  portFormat: 'Format: port_hosta:port_kontenera[/protocol]',
  configuredPorts: 'Skonfigurowane porty',
  noExtraPorts: 'Brak skonfigurowanych dodatkowych portów',
  extraPortsUseful: 'Dodatkowe porty są przydatne dla wtyczek wymagających określonych połączeń',
  configExamples: 'Przykłady konfiguracji:',
  portVoiceChat: 'Port modułu czatu głosowego',
  portTcpSpecific: 'Określony port TCP',
  portUdpPlugins: 'Port UDP dla wtyczek',
  portDynmap: 'Dynmap lub inne wtyczki internetowe',

  // Ustawienia serwera
  minecraftVersion: 'Wersja Minecrafta',
  minecraftVersionDesc: 'Konkretna wersja Minecrafta do zainstalowania',
  minecraftVersionHelp: 'Konkretna wersja Minecrafta do użycia',
  curseforgeVersionAuto: 'Wersja Minecrafta jest automatycznie pobierana z paczki modów CurseForge',
  idleTimeout: 'Czas bezczynności (min)',
  idleTimeoutDesc: 'Czas przed wyrzuceniem nieaktywnych graczy',
  idleTimeoutHelp: 'Czas w minutach przed wyrzuceniem nieaktywnych graczy (0, aby wyłączyć)',
  stopDelay: 'Opóźnienie zatrzymania (s)',
  stopDelayDesc: 'Czas oczekiwania przed wymuszonym zatrzymaniem serwera',
  stopDelayHelp: 'Czas oczekiwania w sekundach przed wymuszonym zatrzymaniem serwera',
  restartPolicy: 'Zasada ponownego uruchomienia',
  restartPolicyDesc: 'Określa zachowanie kontenera po zakończeniu wykonywania',
  noRestart: 'Bez restartu',
  alwaysRestart: 'Zawsze restartuj',
  restartOnFailure: 'Uruchom ponownie w przypadku awarii',
  restartUnlessStopped: 'Uruchom ponownie, chyba że zatrzymane',
  no: 'Nie',
  always: 'Zawsze',
  onFailure: 'W przypadku awarii',

  // Zmienne środowiskowe
  environmentVars: 'Zmienne środowiskowe',
  environmentVarsDesc: 'Niestandardowe zmienne środowiskowe dla kontenera',
  environmentVarsHelp:
    'Dodatkowe zmienne środowiskowe dla kontenera (jedna w wierszu, format: KLUCZ=WARTOŚĆ)',
  variableName: 'Nazwa zmiennej',
  variableValue: 'Wartość',

  // Edykiety Dockera
  dockerLabels: 'Etykiety Dockera',
  dockerLabelsDesc:
    'Niestandardowe etykiety dla kontenera, przydatne dla odwrotnych serwerów proxy, takich jak Traefik lub Caddy',
  dockerLabelsHelp:
    'Etykiety kontenera (jedna w wierszu, format: klucz=wartość). Przydatne dla Traefik, Caddy, nginx-proxy itp.',

  // Konfiguracja kopii zapasowej
  backupConfig: 'Konfiguracja kopii zapasowej',
  enableBackup: 'Włącz kopie zapasowe',
  backupMethod: 'Metoda tworzenia kopii zapasowej',
  backupMethodDesc: 'Metoda tworzenia kopii zapasowych',
  selectBackupMethod: 'Wybierz metodę tworzenia kopii zapasowej',
  tarCompression: 'tar (kompresja)',
  rsyncIncremental: 'rsync (przyrostowy)',
  resticIncrementalEncrypted: 'restic (przyrostowy szyfrowany)',
  rcloneRemote: 'rclone (zdalny)',
  backupName: 'Nazwa kopii zapasowej',
  backupNameDesc: 'Nazwa używana do identyfikacji plików kopii zapasowej',
  backupInterval: 'Interwał tworzenia kopii zapasowych',
  backupIntervalDesc: 'Czas między kolejnymi kopiami zapasowymi (np. 24 godz., 2 godz. 30 min)',
  backupInitialDelay: 'Opóźnienie początkowe',
  backupInitialDelayDesc: 'Czas oczekiwania przed utworzeniem pierwszej kopii zapasowej',
  backupPruneDays: 'Liczba dni usuwania',
  backupPruneDaysDesc: 'Usuń kopie zapasowe starsze niż podana liczba dni',
  backupDestDir: 'Katalog docelowy kopii zapasowej',
  backupDestDirDesc: 'Ścieżka, w której będą zapisywane kopie zapasowe',
  backupExcludes: 'Wykluczenia kopii zapasowych',
  backupExcludesDesc: 'Wzorce plików do wykluczenia z kopii zapasowej (rozdzielone przecinkami)',
  backupExcludesHelp: 'Pliki i katalogi, które nie zostaną uwzględnione w kopii zapasowej',
  tarCompressMethod: 'Metoda kompresji plików TAR',
  tarCompressMethodDesc: 'Algorytm kompresji plików tar',
  selectTarCompressMethod: 'Wybierz kompresję metoda',
  gzip: 'gzip (standardowy)',
  bzip2: 'bzip2 (lepsza kompresja)',
  zstd: 'zstd (szybki)',
  backupOnStartup: 'Kopia zapasowa przy uruchomieniu',
  backupOnStartupDesc: 'Wykonaj kopię zapasową natychmiast po uruchomieniu serwera',
  pauseIfNoPlayers: 'Wstrzymaj tworzenie kopii zapasowych, gdy nie ma graczy',
  pauseIfNoPlayersDesc:
    'Nie wykonuj automatycznych kopii zapasowych, gdy nie ma podłączonych graczy',
  playersOnlineCheckInterval: 'Interwał sprawdzania graczy',
  playersOnlineCheckIntervalDesc:
    'Jak często sprawdzać, czy gracze są online, gdy tworzenie kopii zapasowych jest wstrzymane (np. 5 min, 1 min)',
  enableSaveAll: 'Włącz zapisywanie wszystkich',
  enableSaveAllDesc:
    "Uruchom polecenie 'save-all' przed utworzeniem kopii zapasowej. Wyłącz tę opcję, jeśli serwer ulegnie awarii podczas zapisywania (częste w przypadku dużych światów).",
  enableSaveAllWarning:
    'Ostrzeżenie: Po wyłączeniu funkcji zapisywania wszystkiego upewnij się, że serwer ma włączoną funkcję automatycznego zapisywania, w przeciwnym razie możesz utracić ostatnie zmiany.',
  enableSync: 'Włącz synchronizację systemu plików',
  enableSyncDesc:
    'Opróżnij bufory systemu plików po zapisaniu wszystkiego. Wyłącz tylko w środowiskach klastrowych ze znanymi problemami.',

  // ===========================
  // STRONA: ZASOBY
  // ===========================
  serverResources: 'Zasoby serwera',
  serverResourcesDesc:
    'Skonfiguruj ograniczenia pamięci, procesora i innych zasobów dla swojego serwera',
  memoryCpu: 'Pamięć i procesor',
  jvmOptions: 'Opcje JVM',
  advancedResources: 'Zaawansowane zasoby',
  resources: 'Zasoby',
  cpu: 'Procesor',
  serverInactive: 'Serwer nieaktywny',

  // Pamięć i procesor
  initialMemoryJvm: 'Pamięć początkowa (JVM)',
  initialMemoryTooltip: 'Pamięć początkowa przypisana do JVM (-Xms)',
  initialMemoryDesc: 'Pamięć początkowa przypisana do Java (Xms) – np.: 2 GB, 1024 MB',
  maxMemoryJvm: 'Maksymalna pamięć (JVM)',
  maxMemoryTooltip: 'Maksymalna pamięć przypisana do JVM (-Xmx)',
  maxMemoryDesc: 'Maksymalna pamięć przypisana do Java (Xmx) – np.: 4 GB, 4096 MB',
  cpuLimit: 'Limit procesora',
  cpuLimitTooltip: 'Maksymalny limit procesora dla kontenera Docker',
  cpuLimitDesc: 'Maksymalna liczba rdzeni procesora, jaką serwer może obsłużyć.',
  cpuReservation: 'Rezerwacja procesora',
  cpuReservationTooltip: 'Minimalna gwarantowana ilość procesora dla kontenera',
  cpuReservationDesc: 'Minimalna gwarantowana ilość procesora dla kontenera',
  memoryReservationDocker: 'Rezerwacja pamięci (Docker)',
  memoryReservationTooltip: 'Ilość pamięci zarezerwowanej dla kontenera Docker',
  memoryReservationDesc: 'Ilość pamięci zarezerwowanej dla kontenera Docker',
  linuxUserUid: 'Użytkownik Linux (UID)',
  linuxUserDesc: 'Identyfikator użytkownika Linux, pod którym będzie działał serwer',
  linuxGroupGid: 'Grupa Linux (GID)',
  linuxGroupDesc: 'Identyfikator grupy Linux, pod którym będzie działał serwer',

  // Ustawienia JVM
  useAikarFlags: 'Użyj flag Aikara',
  aikarFlagsTooltip:
    'Aikar przeprowadził badania w celu znalezienia optymalnych flag JVM do dostrajania GC, co jest najważniejsze, im więcej użytkowników łączy się jednocześnie',
  aikarFlagsRecommended: 'Zalecane dla serwerów z wieloma graczami',
  aikarFlagsDesc: 'Użyj zoptymalizowanych ustawień JVM dla serwerów z wieloma graczami',
  enableJmx: 'Włącz JMX',
  enableJmxTooltip:
    'Włącza zdalne monitorowanie JMX, takie jak profilowanie za pomocą VisualVM lub JMC',
  enableJmxDesc: 'Włącza zdalne monitorowanie JMX dla narzędzi diagnostycznych',
  jmxHost: 'Host JMX',
  jmxHostDesc: 'Adres IP/Host, na którym działa kontener Docker (wymagany dla zdalnego JMX)',
  jvmOptionsField: 'Opcje JVM',
  jvmOptionsDesc: 'Ogólne opcje JVM oddzielone spacjami (argumenty zaczynające się od -X)',
  jvmXxOptions: 'Opcje JVM XX',
  jvmXxOptionsDesc: 'Konkretne opcje JVM XX (muszą poprzedzać opcje -X)',
  systemPropertiesDd: 'Właściwości systemowe (DD)',
  systemPropertiesDdDesc:
    'Lista właściwości systemowych oddzielonych przecinkami (nazwa=wartość lub nazwa:wartość)',
  additionalArguments: 'Dodatkowe argumenty',
  additionalArgumentsDesc: 'Dodatkowe argumenty do przekazania do pliku JAR serwera',

  // Zaawansowane
  timezone: 'Strefa czasowa',
  selectTimezone: 'Wybierz strefę czasową',
  timezoneDesc: 'Strefa czasowa serwera (domyślnie: UTC)',
  enableAutoStop: 'Włącz automatyczne zatrzymywanie',
  autoStopTooltip: 'Automatycznie zatrzymuje serwer, gdy przez określony czas nie ma graczy',
  cannotUseWithAutoPause: 'Nie można używać razem z funkcją Auto-Pause',
  initialTimeout: 'Początkowy limit czasu (sekundy)',
  autoStopTimeoutInitDesc: 'Początkowy czas oczekiwania na zatrzymanie serwera, gdy nie ma graczy',
  autoStopTimeoutEstDesc: 'Czas oczekiwania na zatrzymanie serwera po jego uruchomieniu',
  enableAutoPause: 'Włącz automatyczne zatrzymywanie',
  autoPauseTooltip: 'Automatycznie wstrzymuje serwer gdy przez określony czas nie ma graczy',
  cannotUseWithAutoStop: 'Nie można używać razem z funkcją Auto-Stop',
  modCompatibilityWarning: '⚠️ Ostrzeżenie o zgodności modów:',
  modCompatibilityDesc:
    'Jeśli na serwerze są zainstalowane mody, funkcja Auto-Pause może powodować problemy podczas próby wybudzenia serwera. Niektóre mody nie są kompatybilne z tą funkcją i mogą powodować zawieszenie się lub awarię serwera podczas procesu wybudzania. Zaleca się korzystanie z tej funkcji tylko na serwerach Vanilla lub dokładne przetestowanie jej zgodności przed włączeniem w środowisku produkcyjnym.',
  autoPauseTimeoutInitDesc:
    'Początkowy czas oczekiwania na wstrzymanie serwera, jeśli nie ma graczy',
  autoPauseTimeoutEstDesc: 'Czas oczekiwania na wstrzymanie serwera po jego uruchomieniu',
  reconnectInterface: 'Ponowne połączenie z interfejsem',
  reconnectInterfaceDesc:
    'Adres IP do nasłuchiwania połączeń wybudzających serwer (0.0.0.0 dla wszystkich)',
  enableRollingLogs: 'Włącz rejestrowanie rejestrów',
  rollingLogsTooltip:
    'Domyślnie plik dziennika w wersji Vanilla będzie się rozrastał bez ograniczeń. Rejestrator można skonfigurować tak, aby korzystał ze strategii rotacyjnego pliku dziennika.',
  rollingLogsDesc: 'Ogranicza rozmiar pliku dziennika poprzez rotację',
  showTimeInLogs: 'Pokaż czas w dziennikach',
  logTimestampTooltip: 'Dołącz znacznik czasu do każdego wpisu w dzienniku',
  logTimestampDesc: 'Dodaje znaczniki czasu do wpisów w dzienniku',

  // ===========================
  // STRONA: LOGI
  // ===========================
  logs: 'Logi',
  serverLogs: 'Logi serwera',
  serverLogsDesc: 'Wyświetlaj i monitoruj logi serwera w czasie rzeczywistym',
  searchInLogs: 'Szukaj w logach...',
  filterByLevel: 'Filtruj według poziomu',
  allLevels: 'Wszystkie poziomy',
  onlyErrors: 'Tylko błędy',
  onlyWarnings: 'Tylko ostrzeżenia',
  onlyInfo: 'Tylko informacje',
  onlyDebug: 'Tylko debugowanie',
  autoScroll: 'Automatyczne przewijanie',
  realTime: 'Czas rzeczywisty',
  lines: 'linie',
  noLogsAvailable: 'Brak dostępnych logów',
  serverNotRunning: 'Serwer nie działa',
  serverNotRunning2: 'Serwer nie działa',
  lastUpdate: 'Ostatnia aktualizacja:',
  realTimeActive: 'Aktywne w czasie rzeczywistym',
  realTimePaused: 'Wstrzymane w czasie rzeczywistym',
  showing: 'Wyświetlanie',
  of: 'z',
  entries: 'wpisy',
  liveLabel: 'NA ŻYWO',
  viewLogsRealtime: 'Wyświetl logi serwera w czasie rzeczywistym',
  loadingLogs: 'Ładowanie logów...',
  loadingServerConfig: 'Ładowanie konfiguracji serwera...',

  // ===========================
  // STRONA: KOMENDY
  // ===========================
  serverCommands: 'Polecenia serwera',
  serverCommandsDesc: 'Wykonuj polecenia na swoim serwerze przez RCON',
  commandConsole: 'Konsola poleceń',
  commandConsoleDesc: 'Wykonuj polecenia bezpośrednio na serwerze Minecraft',
  quickCommandConsole: 'Szybka konsola poleceń',
  startServerToExecute: 'Uruchom serwer w celu wykonania poleceń',
  quickCommands: 'Szybkie polecenia',
  sendCommand: 'Wyślij polecenie',
  enterMinecraftCommand: 'Wprowadź polecenie Minecraft... (bez /)',
  serverResponse: 'Odpowiedź serwera',
  pressTabToAutocomplete: 'Naciśnij Tab, aby uzupełnić automatycznie, lub Enter, aby wysłać',
  commandsInfo:
    'Polecenia są wysyłane bez początkowego symbolu "/". Użyj klawisza Tab, aby automatycznie uzupełniać sugerowane polecenia.',
  clearConsole: 'Wyczyść konsolę',
  serverMustBeRunning: 'Serwer musi być uruchomiony, aby można było wykonywać polecenia',
  rconNotConfigured: 'RCON nie jest poprawnie skonfigurowany',
  rconNotConfiguredDesc:
    'Skonfiguruj port RCON i hasło na karcie Ustawienia ogólne, aby korzystać z poleceń',
  commands: 'Polecenia',
  enterACommandToExecute: 'Wprowadź polecenie do wykonania',
  rconPortNotConfigured: 'Port RCON nie jest skonfigurowany',
  rconPortNotConfiguredDesc:
    'Skonfiguruj port RCON na karcie Ustawienia ogólne, aby korzystać z poleceń (hasło jest opcjonalne)',
  commandExecutedSuccessfully: 'Polecenie wykonane pomyślnie',
  errorExecutingCommand: 'Błąd podczas wykonywania polecenia',

  // Etykiety
  cmdListPlayers: 'Wyświetl listę graczy',
  cmdTeleportPlayer: 'Teleportuj gracza',
  cmdGiveXP: 'Przyznaj doświadczenie',
  cmdGiveEffect: 'Przyznaj efekt',
  cmdCreativeMode: 'Tryb kreatywny',
  cmdSurvivalMode: 'Tryb przetrwania',
  cmdAdventureMode: 'Tryb przygodowy',
  cmdSpectatorMode: 'Tryb widza',
  cmdDayTime: 'Ustaw dzień',
  cmdNightTime: 'Ustaw noc',
  cmdClearWeather: 'Pogodna pogoda',
  cmdRainWeather: 'Deszczowa pogoda',
  cmdThunderWeather: 'Grzmiąca pogoda',
  cmdPeacefulDifficulty: 'Pokojowy poziom trudności',
  cmdEasyDifficulty: 'Łatwy poziom trudności',
  cmdNormalDifficulty: 'Normalny poziom trudności',
  cmdHardDifficulty: 'Wysoki poziom trudności',
  cmdGiveDiamonds: 'Daj diamenty',
  cmdGiveDiamondSword: 'Daj diamentowy miecz',
  cmdGiveGoldenApples: 'Daj złote jabłka',
  cmdGiveCommandBlock: 'Daj blok poleceń',
  cmdSeedWorld: 'Wyświetl ziarno świata',
  cmdSaveWorld: 'Zapisz świat',
  cmdKickPlayer: 'Wyrzuć gracza',
  cmdBanPlayer: 'Zablokuj gracza',
  cmdViewTPS: 'Wyświetl TPS',
  cmdSpigotTimings: 'Tryb czasu Spigot',
  cmdClearInventory: 'Wyczyść ekwipunek',
  cmdClearEffects: 'Wyczyść efekty',
  cmdNoonTime: 'Ustaw południe',
  cmdMidnightTime: 'Ustaw północ',
  cmdKillHostileMobs: 'Zabij wrogie moby',
  cmdClearDroppedItems: 'Usuń upuszczone przedmioty',
  cmdSetWorldSpawn: 'Ustaw miejsce odrodzenia świata',
  cmdGiveNetherite: 'Daj 64 netherite',
  cmdGiveElytra: 'Daj elytrę',
  cmdGiveTotem: 'Daj totem',
  cmdGiveEnchantedBook: 'Daj zaczarowaną księgę',
  cmdSummonZombie: 'Przyzwij zombie',
  cmdSummonSkeleton: 'Przyzwij szkielet',
  cmdSummonCreeper: 'Przyzwij creepera',
  cmdSummonEnderman: 'Przyzwij endermana',
  cmdSummonWither: 'Przywołaj Withera',
  cmdSummonDragon: 'Przywołaj Smoka Endera',
  cmdStopServer: 'Zatrzymaj serwer',
  cmdReloadServer: 'Przeładuj serwer',

  // Zarządzanie Światem
  world: 'Świat',
  worldManagement: 'Zarządzanie Światem',
  time: 'Czas',
  weather: 'Pogoda',
  weatherThunder: 'Grzmot',
  setSpawn: 'Ustaw Spawn',
  setWorldBorder: 'Ustaw Granicę',
  gamerules: 'Zasady Gry',
  freezeTime: 'Czas Zamrożenia',
  unfreezeTime: 'Czas Odmrożenia',
  disableFire: 'Wyłącz Ogień',
  freezeWeather: 'Zamroź Pogodę',
  entityManagement: 'Zarządzanie Bytami',
  killAllMobs: 'Zabij Wszystkie Moby',
  killZombies: 'Zabij Zombie',
  clearItems: 'Wyczyść Przedmioty',
  clearXPOrbs: 'Wyczyść Kule PD',
  summonEntities: 'Przywołaj Byty',
  giveItemsEffects: 'Przedmioty i efekty',
  giveToAllPlayers: 'Przekaż wszystkim graczom',
  effectsToAllPlayers: 'Efekty dla wszystkich graczy',
  clearAll: 'Wyczyść wszystko',
  tpAllToCoords: 'Teleportuj wszystkich do współrzędnych',
  gameruleChanged: 'Zmieniono regułę gry',
  itemsCleared: 'Wyczyszczone przedmioty',
  worldBorderSet: 'Ustawiono granicę świata',
  worldSpawnSet: 'Ustawiono odradzanie się świata',
  entitySummoned: 'Przywołany byt',
  inventoryCleared: 'Wyczyszczono ekwipunek',
  itemEnchanted: 'Przedmiot zaczarowany',
  effectsCleared: 'Efekty wyczyszczone',
  effectGiven: 'Efekt nadany',

  // ===========================
  // KONFIGURACJA WTYCZEK
  // ===========================
  plugins: 'Wtyczki',
  pluginsConfig: 'Konfiguracja wtyczek',
  pluginsConfigDesc: 'Skonfiguruj wtyczki dla swojego serwera',
  pluginsNotAvailable: 'Ta sekcja jest dostępna tylko dla serwerów Spigot, Paper lub Bukkit',
  pluginsSelectServerType:
    'Wybierz typ serwera Spigot, Paper lub Bukkit na karcie "Typ serwera", aby skonfigurować wtyczki',
  pluginsAutoDownload: 'Automatyczne pobieranie ze Spiget',
  pluginsAutoDownloadDesc:
    'Automatyczne pobieranie wtyczek ze SpigotMC za pomocą interfejsu API Spiget. Pliki ZIP zostaną automatycznie rozpakowane w folderze wtyczek.',
  pluginsManualInfo:
    'Aby ręcznie dodać wtyczki (pliki JAR), użyj Przeglądarki plików, aby przesłać je do folderu /plugins na serwerze.',
  pluginsSpigetResources: 'Zasoby Spiget (SPIGET_RESOURCES)',
  pluginsSpigetResourcesDesc: 'Identyfikatory zasobów SpigotMC (np.: LuckPerms=28140, Vault=34315)',
  pluginsSpigetNote: 'Ważna uwaga: Zmienna to SPIGET z literą E, a nie SPIGOT.',
  pluginsSpigetWarning:
    '⚠️ Niektóre wtyczki, takie jak EssentialsX, nie umożliwiają automatycznego pobierania.',
  pluginsManualTitle: 'Dodaj wtyczki ręcznie',
  pluginsManualStep1: 'Uzyskaj dostęp do Przeglądarki plików serwera',
  pluginsManualStep2: 'Przejdź do folderu /plugins',
  pluginsManualStep3: 'Prześlij pliki JAR bezpośrednio',
  pluginsManualStep4: 'Uruchom ponownie serwer, aby załadować wtyczki',
  pluginsTipsTitle: 'Przydatne wskazówki',
  pluginsTip1: 'Wtyczki zostaną pobrane automatycznie podczas uruchamiania serwera',
  pluginsTip2: 'Pliki ZIP zostaną automatycznie rozpakowane w folderze wtyczek',
  pluginsTip3: 'Możesz połączyć Spiget z ręcznymi wtyczkami z poziomu przeglądarki plików',
  pluginsTip4: 'Wtyczki Spigot działają również na Paper i Bukkit',
  pluginsSave: 'Zapisz konfigurację',
  pluginsOpenPluginsFolder: 'Otwórz folder wtyczek',
  pluginsOpenServerFolder: 'Otwórz folder serwera',
  openFileBrowser: 'Menedżer plików',
  filesDesc: 'Przeglądaj, edytuj i zarządzaj plikami serwera',
  allServersFilesDesc: 'Przeglądaj i zarządzaj plikami wszystkich serwerów',
  openInNewTab: 'Otwórz w nowej karcie',
  fileBrowserError: 'Nie można załadować przeglądarki plików',
  fileBrowserErrorDesc: 'Spróbuj otworzyć w nowej karcie',
  fileBrowserTip: 'Wskazówka dotycząca menedżera plików',
  fileBrowserTipDesc:
    'Możesz edytować pliki konfiguracyjne, przesyłać/pobierać pliki i zarządzać uprawnieniami bezpośrednio z tego miejsca.',

  // Pliki i foldery
  newFolder: 'Nowy folder',
  folderName: 'Nazwa folderu',
  upload: 'Prześlij',
  uploadFiles: 'Prześlij pliki',
  uploadFolder: 'Prześlij folder',
  download: 'Pobierz',
  rename: 'Zmień nazwę',
  newName: 'Nowa nazwa',
  create: 'Utwórz',
  confirmDelete: 'Potwierdź usunięcie',
  deleteConfirmMessage: 'Czy na pewno chcesz usunąć?',
  unsaved: 'Niezapisane',
  errorLoadingFiles: 'Błąd ładowania plików',
  errorReadingFile: 'Błąd odczytu pliku',
  errorSavingFile: 'Błąd zapisywania pliku',
  errorDeletingFile: 'Błąd usuwania pliku',
  errorCreatingFolder: 'Błąd tworzenia folderu',
  errorUploadingFile: 'Błąd podczas przesyłania pliku',
  errorRenamingFile: 'Błąd podczas zmiany nazwy pliku',
  errorDownloadingFile: 'Błąd podczas pobierania pliku',
  fileSaved: 'Plik zapisano pomyślnie',
  fileDeleted: 'Plik został usunięty pomyślnie',
  folderCreated: 'Folder został utworzony pomyślnie',
  fileUploaded: 'Plik został przesłany pomyślnie',
  fileRenamed: 'Nazwa pliku została zmieniona pomyślnie',
  filesUploaded: '{count} plików zostało przesłanych pomyślnie',
  filesUploadFailed: 'Nie udało się przesłać {count} plików',
  uploading: 'Przesyłanie...',
  uploadingFiles: 'Przesyłanie plików',
  uploadComplete: 'Przesyłanie zakończone',
  uploadCompleteWithErrors: 'Przesyłanie zakończone z błędami',
  waiting: 'Oczekiwanie',
  dropFilesHere: 'Upuść pliki tutaj',
  releaseToUpload: 'Zwolnij, aby przesłać',
  copyPath: 'Kopiuj ścieżkę',
  open: 'Otwórz',
  downloadAsZip: 'Pobierz jako ZIP',
  creatingZip: 'Tworzenie pliku ZIP...',
  zipDownloaded: 'Pobrano plik ZIP pomyślnie',
  errorDownloadingZip: 'Błąd pobierania pliku ZIP',
  enterNewName: 'Wprowadź nową nazwę',
  toSave: 'aby zapisać',

  // Plugin Server Configurations
  paperConfiguration: 'Konfiguracja Paper',
  paperBuild: 'Kompilacja Paper',
  paperBuildDesc: 'Konkretny numer kompilacji Paper (pozostaw puste, aby wybrać najnowszą wersję)',
  paperChannel: 'Kanał Paper',
  paperChannelDesc: 'Kanał: domyślny lub eksperymentalny',
  customDownloadUrl: 'Niestandardowy adres URL pobierania',
  paperDownloadUrlDesc: 'Zastąp adres URL pobierania Paper (opcjonalnie)',

  bukkitSpigotConfiguration: 'Konfiguracja Bukkit/Spigot',
  bukkitDownloadUrl: 'Adres URL pobierania Bukkit',
  bukkitDownloadUrlDesc: 'Niestandardowy adres URL pobierania Bukkit',
  spigotDownloadUrl: 'Adres URL pobierania Spigot',
  spigotDownloadUrlDesc: 'Niestandardowy adres URL pobierania Spigot',
  buildFromSource: 'Buduj Spigot ze źródła',

  pufferfishConfiguration: 'Konfiguracja Pufferfish',
  pufferfishBuild: 'Budowa Pufferfish',
  pufferfishBuildDesc: 'Konkretny numer kompilacji lub ostatnia udana kompilacja',
  useFlareFlags: 'Użyj flag profilera Flare',

  purpurConfiguration: 'Konfiguracja Purpur',
  purpurBuild: 'Budowa Purpur',
  purpurBuildDesc: 'NAJNOWSZY lub konkretny numer kompilacji',

  purpurDownloadUrlDesc: 'Zastąp Purpurowy adres URL pobierania (opcjonalnie)',

  leafConfiguration: 'Konfiguracja Leaf',
  leafBuild: 'Budowa Leaf',
  leafBuildDesc: 'Konkretny numer kompilacji Leaf (pozostaw puste, aby wybrać najnowszą wersję)',

  foliaConfiguration: 'Konfiguracja Folia',
  foliaWarning:
    'Folia jest w fazie eksperymentalnej i wiele wtyczek może nie działa poprawnie z powodu zmian w wielowątkowości.',
  foliaBuild: 'Kompilacja Folia',
  foliaBuildDesc: 'Konkretny numer kompilacji Folia',
  foliaChannel: 'Kanał Folia',
  foliaChannelDesc: 'Kanał wydania (zalecany eksperymentalny)',
  foliaDownloadUrlDesc: 'Zastąp adres URL pobierania Folia (opcjonalnie)',

  skipDownloadDefaults: 'Pomiń domyślne konfiguracje pobierania',
  skipDownloadDefaultsDesc:
    'Pomiń sprawdzanie domyślnych plików konfiguracyjnych Paper/Bukkit/Spigot do pobrania',

  // ===========================
  // MODS CONFIGURATION
  // ===========================
  mods: 'Mody',
  modsConfig: 'Konfiguracja modów',
  modsConfigDesc: 'Skonfiguruj szczegóły modów dla swojego serwera',
  modsNotAvailable: 'Ta sekcja jest dostępna tylko dla serwerów Forge lub CurseForge',
  modsSelectServerType:
    'Wybierz typ serwera Forge lub CurseForge na karcie "Typ serwera", aby skonfigurować mody',

  // Forge Configuration
  forgeVersion: 'Wersja Forge',
  forgeBuildDesc: 'Numer kompilacji Forge dla wybranej wersji Minecrafta',

  // Neoforge Configuration
  neoforgeVersion: 'Wersja Neoforge',
  neoforgeBuildDesc:
    'Numer kompilacji Neoforge (automatycznie wybierze prawidłową wersję Minecrafta)',

  // Fabric Configuration
  serverFabric: 'Serwer z obsługą modów Fabric. Lekka platforma moderska, alternatywa dla Forge',
  fabricLoaderVersion: 'Wersja programu Fabric Loader',
  fabricLoaderDesc:
    'Konkretna wersja programu Fabric Loader (pozostaw puste, aby wyświetlić najnowszą wersję)',
  fabricLauncherVersion: 'Wersja programu Fabric Launcher',
  fabricLauncherDesc:
    'Konkretna wersja programu Fabric Launcher (pozostaw puste, aby wyświetlić najnowszą wersję)',

  // Modrinth Configuration
  modrinthProjects: 'Projekty Modrinth',
  modrinthProjectsHelp:
    "Lista identyfikatorów/slugów projektu rozdzielonych przecinkami lub znakami nowej linii. Formaty: 'fabric-api' (najnowszy), 'fabric-api:0.119.2' (wersja), 'fabric-api:beta' (typ wydania), 'datapack:terralith', '@/ścieżka/do/pliku.txt' (lista). Zobacz dokumentację dla wszystkich formatów.",
  modrinthProjectsDesc: 'Automatyczne pobieranie modów, wtyczek i pakietów danych z Modrinth',
  modrinthDependencies: 'Pobierz zależności',
  modrinthDependenciesHelp: 'Czy pobrać wymagane i/lub opcjonalne zależności',
  modrinthVersionType: 'Domyślny typ wersji',
  modrinthVersionTypeHelp:
    'Typ wersji do użycia podczas wybierania najnowszej wersji (wydanie, beta lub alfa)',
  dependenciesNone: 'Brak',
  dependenciesRequired: 'Wymagane',
  dependenciesOptional: 'Wymagane + Opcjonalne',
  versionRelease: 'Wydanie',
  versionBeta: 'Beta (+ Wydanie)',
  versionAlpha: 'Alfa (+ Beta + Wydanie)',
  browseMods: 'Przeglądaj mody',
  browseModpacks: 'Przeglądaj pakiety modów',
  browseModpacksDesc: 'Wyszukaj i wybierz pakiet modów z szablonów CurseForge',
  browse: 'Przeglądaj',
  modpackSelected: 'Wybrany pakiet modów',
  searchOrBrowsePopular: 'Wyszukaj pakiet modów lub przeglądaj popularne',
  searchModpacks: 'Wyszukaj pakiety modów...',
  searchMods: 'Szukaj modów',
  searchModsDesc: 'Wyniki filtrowane według kompatybilności dla wersji/loadera:',
  searchProvider: 'Dostawca',
  insertAsSlug: 'Wstaw jako slug',
  insertAsId: 'Wstaw jako ID',
  addMod: 'Dodaj mod',
  alreadyAdded: 'Ten mod jest już na liście',
  noCompatibleModsFound: 'Nie znaleziono kompatybilnych modów dla bieżących filtrów',
  compatibilityFiltered: 'Wyświetlane są tylko kompatybilne mody dla bieżącej konfiguracji serwera',
  loaderNotDetected: 'Nie wykryto loadera. Zgodność jest filtrowana tylko po wersji Minecrafta.',
  errorSearchingMods: 'Błąd podczas wyszukiwania modów',

  // Modrinth Modpack Configuration
  modrinthModpack: 'Pakiet Modrinth',
  modrinthModpackDesc: 'Wprowadź slug lub adres URL pakietu Modrinth, którego chcesz użyć',
  modrinthModpackTooltip:
    'Wprowadź slug lub adres URL projektu Modrinth. Możesz również podać konkretną wersję (np. https://modrinth.com/modpack/surface-living/version/1.2.1).',

  // Manual CurseForge (Deprecated)
  deprecatedFeature: 'Przestarzała funkcja',
  manualCurseForgeDeprecated:
    'Ta ręczna metoda dla CurseForge jest przestarzała. Zalecamy używanie "CurseForge Modpack" (AUTO_CURSEFORGE) w przypadku nowych instalacji. Ten tryb wymaga ręcznego przesłania plików modpack na serwer.',
  modpackFile: 'Plik modpack (CF_SERVER_MOD)',
  modpackFileHelp: 'Pełna ścieżka do pliku modpack .zip w kontenerze.',
  modpackFileExample: 'Przykład: /modpacks/SkyFactory_4_Server_4.1.0.zip',
  modpackFilePath: 'Ścieżka do pliku modpack CurseForge w kontenerze ZIP',
  baseDirectory: 'Katalog bazowy (CF_BASE_DIR)',
  baseDirectoryHelp: 'Katalog, w którym zostanie rozpakowany modpack. Domyślnie: /data',
  baseDirectoryPath: 'Katalog, w którym zostanie wypakowany i uruchomiony modpack',
  useModpackStartScript: 'Użyj skryptu startowego modpack',
  useModpackStartScriptDesc:
    'Jeśli wyłączone, unika używania dołączonego skryptu startowego modpacka i używa standardowej logiki serwera',
  ftbLegacyJavaFixer: 'FTB Legacy Java Fixer',
  ftbLegacyJavaFixerDesc:
    'Włącz poprawkę dla modpacków, które kończą się komunikatem "unable to launch forgemodloader"',
  cfApiKeyOptional: 'Opcjonalny klucz API dla zgodności z niektórymi modpackami',

  // CurseForge Auto Configuration
  importantInfo: 'Ważne informacje',
  cfApiKeyRequired:
    'Aby poprawnie korzystać z funkcjonalności CurseForge, wymagany jest klucz API. Klucz API jest niezbędny do pobierania prywatnych lub zastrzeżonych pakietów modów.',
  cfApiKeyConfigured: 'Klucz API CurseForge skonfigurowany. Gotowy do utworzenia serwera.',
  installationMethod: 'Metoda instalacji',
  installationMethodHelp: 'Wybierz sposób pobrania modpacka:',
  methodUrl: 'URL',
  methodUrlDesc: 'Bezpośredni adres internetowy modpacka na CurseForge',
  methodSlug: 'Slug',
  methodSlugDesc: 'Unikalny identyfikator modpacka (np. "all-the-mods-7")',
  methodFile: 'Plik',
  methodFileDesc: 'Zainstaluj z pliku .zip już przesłanego na serwer',
  installFromUrl: 'Zainstaluj z bezpośredniego adresu URL',
  useIdSlug: 'Użyj identyfikatora/sluga modpacka',
  useLocalFile: 'Użyj pliku lokalnego na serwerze',

  modpackUrl: 'Adres URL modpacka (CF_PAGE_URL)',
  modpackUrlHelp: 'Pełny adres URL strony modpacka lub konkretnego pliku.',
  modpackUrlDesc: 'Bezpośredni adres URL pobierania modpacka CurseForge',

  curseForgeProject: 'Projekt CurseForge (CF_SLUG)',
  curseForgeProjectHelp: 'Identyfikator (slug) modpacka w CurseForge.',
  projectNameOrSlug: 'Nazwa projektu lub slug w CurseForge',

  fileId: 'Identyfikator pliku (CF_FILE_ID)',
  fileIdHelp:
    'Numeryczny identyfikator konkretnego pliku do pobrania. W przypadku pominięcia zostanie użyta najnowsza wersja.',
  fileIdDesc:
    'Identyfikator konkretnego pliku do pobrania. Jeśli pole pozostanie puste, zostanie użyta najnowsza wersja.',

  filePattern: 'Wzorzec pliku (CF_FILENAME_MATCHER)',
  filePatternHelp: 'Podaj podciąg, aby znaleźć żądany plik w folderze /modpacks.',
  filePatternDesc: 'Wzorzec wyszukiwania pliku modpack w folderze /modpacks',

  cfApiKey: 'Klucz API CurseForge (CF_API_KEY)',
  cfApiKeyHelp: 'Klucz API CurseForge (Eternal) wymagany do pobrania niektórych modpacków.',
  cfApiKeyDesc: 'Klucz API do pobrania ograniczonych modpacków (wymagany dla większości modpacków)',

  // CurseForge Advanced Options
  advancedOptions: 'Opcje zaawansowane',
  synchronizeCurseForge: 'Synchronizuj CurseForge (CF_FORCE_SYNCHRONIZE)',
  synchronizeCurseForgeDesc:
    'Automatycznie synchronizuj aktualizacje modpacków po ponownym uruchomieniu serwera',
  parallelDownloads: 'Pobieranie równoległe (CF_PARALLEL_DOWNLOADS)',
  parallelDownloadsHelp:
    'Liczba pobrań modów, które zostaną wykonane równolegle. Wartość domyślna: 4',
  parallelDownloadsDesc: 'Określ liczbę równoległych pobrań modów do wykonania',
  download1: '1 pobranie',
  download2: '2 pobrania',
  download4: '4 pobrania (zalecane)',
  download6: '6 pobrań',
  download8: '8 pobrań',
  skipExistingFiles: 'Pomiń istniejące pliki (CF_OVERRIDES_SKIP_EXISTING)',
  skipExistingFilesDesc:
    'Jeśli włączone, pliki, które już istnieją w katalogu danych, nie są zastępowane',
  setLevelFrom: 'Ustaw poziom z (CF_SET_LEVEL_FROM)',
  setLevelFromHelp: 'Określa sposób ustawiania danych świata z modpacka.',
  setLevelFromDesc: 'Skonfiguruj sposób pobierania danych świata z modpacka',
  doNotSet: 'Nie ustawiaj',
  worldFile: 'Plik świata',
  modpackOverrides: 'Nadpisy pakietów modów',
  curseforgeFiles: 'Pobierz dodatkowe mody (CURSEFORGE_FILES)',
  curseforgeFilesHelp:
    "Automatycznie pobieraj pojedyncze mody z CurseForge. Formaty: 'jei' (najnowszy), 'jei:4593548' (ID pliku), 'jei@10.2.1' (wersja), pełny adres URL lub '@/ścieżka/do/pliku.txt' (lista). Zarządzane automatycznie — usunięte wpisy są czyszczone. Zobacz dokumentację dotyczącą wszystkich formatów.",
  curseforgeFilesDesc:
    'Lista rozdzielona przecinkami lub znakami nowej linii (np.: jei, geckolib:4593548, aquaculture@1.0.0)',
  forceIncludeMods: 'Wymuś dołączenie modów klienta (CF_FORCE_INCLUDE_MODS)',
  forceIncludeModsHelp:
    'Wymuś dołączenie modów nieprawidłowo oznaczonych jako tylko dla klienta. NIE pobiera dodatkowych modów – zastępuje jedynie tagi tylko dla klienta dla modów już znajdujących się w pakiecie modów lub w plikach CURSEFORGE_FILES.',
  forceIncludeModsDesc:
    'Slugi lub identyfikatory projektu do wymuszenia dołączenia pomimo tagu tylko dla klienta (rozdzielone przecinkiem lub spacją)',
  excludeMods: 'Wyklucz mody (CF_EXCLUDE_MODS)',
  excludeModsHelp:
    'Lista modów (oddzielonych spacjami lub wierszami), które zostaną wykluczone z identyfikatorów lub slugów pakietu modów.',
  excludeModsDesc:
    'Lista modów, które zostaną wykluczone z identyfikatorów lub slugów pakietu modów (jeden w wierszu, obsługuje wzorce glob)',

  // ===========================
  // UI COMPONENTS
  // ===========================
  tip: 'Wskazówka:',
  configureServerTip: 'Skonfiguruj ten serwer, dostosowując parametry na poniższych kartach.',
  changesRequireRestart:
    'Aby zmiany zostały zastosowane, konieczne będzie ponowne uruchomienie serwera.',

  // ===========================
  // MODPACK TEMPLATES
  // ===========================
  templates: 'Szablony',
  modpackTemplates: 'Szablony pakietów modów',
  modpackTemplatesDescription: 'Wykryj i zainstaluj pakiety modów z CurseForge',
  loadingModpacks: 'Ładowanie pakietów modów...',
  errorLoadingModpacks: 'Błąd ładowania pakietów modów',
  errorSearchingModpacks: 'Błąd wyszukiwania pakietów modów',
  noModpacksFound: 'Nie znaleziono pakietów modów',
  selectModpack: 'Wybierz pakiet modów',
  modpackDetails: 'Szczegóły pakietu modów',
  description: 'Opis',
  downloads: 'Pobrane',
  created: 'Utworzono',
  updated: 'Zaktualizowano',
  latestVersion: 'Najnowsza wersja',
  fileName: 'Nazwa pliku',
  gameVersions: 'Wersje gry',
  releaseDate: 'Data wydania',
  quickCopy: 'Szybka kopia',
  modpackId: 'Identyfikator modpacka',
  modpackSlug: 'Slug modpacka',
  curseforgeUrl: 'Adres URL CurseForge',
  copiedToClipboard: 'Skopiowano do schowka',
  copyError: 'Nie udało się skopiować do schowka',
  serverConnection: 'Połączenie z serwerem',
  globalIP: 'Publiczny adres IP / Domena',
  lanIP: 'Sieć lokalna / Lokalny adres IP',
  connectionTip: 'Udostępnij ten adres graczom, aby dołączyli do Twojego serwera',
  playingLAN: 'Grasz w sieci LAN?',
  learnHow: 'Dowiedz się, jak to skonfigurować',
  proxyConnectionTip: 'Gracze łączą się, używając tej nazwy hosta na domyślnym porcie (25565)',
  forgotPassword: 'Zapomniałeś hasła?',
  fileBrowserPasswordTip: 'Nie znasz hasła do Menedżera plików?',
  learnHowToGetIt: 'Dowiedz się, jak je zdobyć',
  viewOnCurseForge: 'Wyświetl w CurseForge',
  close: 'Zamknij',
  featured: 'Polecane',
  lastUpdated: 'Ostatnia aktualizacja',
  name: 'Nazwa',
  totalDownloads: 'Łączna liczba pobrań',
  sortBy: 'Sortuj według',
  sortOrder: 'Kolejność sortowania',
  descending: 'Malejąco (od najwyższej do najniższej)',
  ascending: 'Rosnąco (od najniższej do najwyższej)',
  searchResults: 'Wyniki wyszukiwania',
  loadMore: 'Załaduj więcej',
  curseforgeApiKeyNotConfigured:
    'Klucz API CurseForge nie jest Skonfigurowano. Dodaj to w Ustawieniach, aby korzystać z tej funkcji.',
  goToSettings: 'Przejdź do Ustawień',
  createServerFromModpack: 'Utwórz nowy serwer za pomocą tego modpacka',
  serverIdRequired: 'Identyfikator serwera jest wymagany',
  optional: 'opcjonalny',

  // ===========================
  // PLAYER MANAGEMENT
  // ===========================
  playerManagement: 'Zarządzanie graczami',
  onlinePlayers: 'Gracze online',
  noPlayersOnline: 'Brak graczy online',
  whitelist: 'Biała lista',
  whitelistEmpty: 'Biała lista jest pusta',
  operators: 'Operatorzy',
  noOperators: 'Brak operatorów',
  bannedPlayers: 'Zablokowani gracze',
  noBannedPlayers: 'Brak zablokowanych graczy',
  playerName: 'Nazwa gracza',
  kick: 'Wykop',
  ban: 'Zablokuj',
  unban: 'Odbanuj',
  remove: 'Usuń',
  demote: 'Zdegraduj',
  promoteToOp: 'Awansuj do OP',
  playerAddedToWhitelist: 'Gracz dodany do białej listy',
  playerRemovedFromWhitelist: 'Gracz usunięty z białej listy',
  playerPromotedToOp: 'Gracz awansowany do operatora',
  playerDemotedFromOp: 'Gracz zdegradowany z operatora',
  playerKicked: 'Gracz wyrzucony',
  playerBanned: 'Gracz zbanowany',
  playerUnbanned: 'Gracz odbanowany',
  saveWorld: 'Zapisz świat',
  whitelistOn: 'Włącz białą listę',
  whitelistOff: 'Wyłącz białą listę',
  timeWeather: 'Czas/Pogoda',
  setDay: 'Ustaw dzień',
  setNight: 'Ustaw noc',
  weatherClear: 'Pogoda bezchmurna',
  weatherRain: 'Deszcz',
  broadcast: 'Transmisja',
  broadcastPlaceholder: 'Wiadomość dla wszystkich graczy...',
  heal: 'Ulecz',
  gamemodeChanged: 'Zmieniono tryb gry',
  playerTeleported: 'Gracz teleportowany',
  playerHealed: 'Gracz uzdrowiony',
  itemsGiven: 'Przekazane przedmioty',
  worldSaved: 'Świat uratowany',
  whitelistEnabled: 'Biała lista włączona',
  whitelistDisabled: 'Biała lista wyłączona',
  messageBroadcast: 'Wiadomość wysłana',
  timeChanged: 'Czas się zmienił',
  weatherChanged: 'Pogoda się zmieniła',

  // ===========================
  // SERVER TEMPLATES
  // ===========================
  chooseCreationMethod: 'Wybierz, jak chcesz utworzyć serwer',
  quickCreate: 'Szybkie tworzenie',
  fromTemplate: 'Z szablonu',
  selectTemplate: 'Wybierz szablon, aby szybko rozpocząć',
  quickCreateDesc:
    'Utwórz pusty serwer z domyślnymi ustawieniami. Możesz skonfigurować wszystko później',
  templateSelected: 'Wybrano szablon',
  vanillaSurvival: 'Przetrwanie w wersji Vanilla',
  vanillaSurvivalDesc:
    'Klasyczne doświadczenie Minecrafta. Tryb przetrwania na normalnym poziomie trudności',
  vanillaCreative: 'Kreatywny w wersji Vanilla',
  vanillaCreativeDesc:
    'Nieograniczona kreatywność. Buduj swobodnie, używając wszystkich bloków i bez potworów',
  vanillaHardcore: 'Hardcore w wersji Vanilla',
  vanillaHardcoreDesc: 'Tylko jedno życie. Wysoki poziom trudności, bez drugiej szansy.',
  paperPerformance: 'Wydajność na papierze',
  paperPerformanceDesc:
    'Zoptymalizowany serwer Paper z flagami Aikar. Idealny dla serwerów publicznych',
  skyblock: 'SkyBlock',
  skyblockDesc: 'Rozpocznij na unoszącej się wyspie. Płaski świat bez struktur',
  pvpArena: 'Arena PvP',
  pvpArenaDesc: 'Serwer nastawiony na walkę. Tryb przygodowy, brak mobów, włączony tryb PvP',
  amplifiedWorld: 'Wzmocniony Świat',
  amplifiedWorldDesc:
    'Ekstremalne generowanie terenu. Wymaga więcej pamięci RAM dla płynnej rozgrywki',

  // ===========================
  // PROXY SETTINGS
  // ===========================
  proxySettings: 'Ustawienia proxy',
  proxySettingsDesc: 'Skonfiguruj mc-router, aby używał jednego portu dla wszystkich serwerów',
  proxyBaseDomain: 'Domena bazowa',
  proxyBaseDomainDesc: 'Domena, która będzie używana dla subdomen serwerów (np. mc.example.com)',
  enableProxy: 'Włącz proxy',
  enableProxyDesc: 'Kieruj cały ruch Minecraft przez mc-router na porcie 25565',
  proxyRequiresDomain: 'Skonfiguruj domenę bazową, aby włączyć funkcję proxy',
  proxyDnsInfo: 'Skonfiguruj rekord DNS z symbolem wieloznacznym wskazujący na Twój serwer:',
  proxyHostname: 'Niestandardowa nazwa hosta',
  proxyHostnameDesc:
    'Opcjonalna niestandardowa nazwa hosta dla tego serwera. Pozostaw puste, aby automatycznie wygenerować z identyfikatora serwera',
  useProxy: 'Użyj proxy',
  useProxyDesc:
    'Włącz routing proxy dla tego serwera. Jeśli wyłączone, używa bezpośredniego dostępu do portu',
  proxySettingsServerDesc: 'Skonfiguruj sposób łączenia się tego serwera przez proxy mc-router',
  proxyServerInfo:
    'Ustawienia proxy obowiązują tylko wtedy, gdy globalny proxy jest włączony w Ustawieniach',

  // USTAWIENIA SIECIOWE
  networkSettings: 'Ustawienia sieciowe',
  networkSettingsDesc: 'Skonfiguruj adresy IP dla połączeń z serwerem i powiadomień Discord',
  publicIp: 'Publiczny adres IP / Domena',
  publicIpDesc:
    'Publiczny adres IP lub domena Twojego serwera. Używany do połączeń z zewnętrznymi graczami i powiadomień',
  lanIp: 'Adres IP sieci LAN',
  lanIpDesc: 'Adres IP Twojej sieci lokalnej. Dla graczy w tej samej sieci',
  networkProxyNote:
    'Gdy proxy jest włączone, w powiadomieniach zamiast IP:port będzie używana nazwa hosta proxy',

  // ===========================
  // BEDROCK EDITION
  // ===========================
  serverEdition: 'Wersja serwera',
  javaEditionDesc: 'Wersja na PC/Mac z obsługą modów',
  bedrockEditionDesc: 'Wersja wieloplatformowa (mobilna, konsolowa, Windows 10)',
  editionLocked: 'Nie można zmienić po utworzeniu serwera',
  bedrockVersion: 'Wersja Bedrock',
  bedrockVersionDesc:
    'Wybierz wersję Bedrock. NAJNOWSZE automatyczne aktualizacje do najnowszej wersji',
  autoUpdate: 'Automatyczna aktualizacja',
  preview: 'Podgląd',
  bedrockInfo: 'Serwer Bedrock',
  bedrockInfoDesc:
    'Serwery Bedrock obsługują rozgrywkę międzyplatformową między graczami mobilnymi, konsolowymi i z systemem Windows 10/11. Uwaga: polecenia RCON nie są obsługiwane.',
  bedrock: 'Bedrock',
  bedrockSettings: 'Ustawienia Bedrock',
  bedrockSettingsDesc: 'Skonfiguruj opcje serwera specyficzne dla Bedrock',
  permissions: 'Uprawnienia',
  allowCheats: 'Zezwalaj na kody',
  allowCheatsDesc: 'Włącz polecenia dla wszystkich graczy, którzy nie są operatorami',
  defaultPermissionLevel: 'Domyślny poziom uprawnień',
  defaultPermissionLevelDesc: 'Poziom uprawnień dla nowych graczy',
  visitor: 'Gość',
  member: 'Członek',
  operator: 'Operator',
  performance: 'Wydajność',
  tickDistance: 'Odległość między znacznikami',
  tickDistanceDesc:
    'Odległość między znacznikami symulacji świata (4-12). Niższy = lepsza wydajność.',
  maxThreads: 'Maks. liczba wątków',
  maxThreadsDesc: 'Maksymalna liczba wątków dla operacji serwera',
  playerSettings: 'Ustawienia gracza',
  texturepackRequired: 'Wymagany pakiet tekstur',
  texturepackRequiredDesc: 'Wymuś na graczach pobranie pakietu zasobów serwera',
  whiteList: 'Biała lista',
  whiteListDesc: 'Zezwalaj na dołączanie tylko graczom z białej listy',
  serverPortV6: 'Port IPv6',
  serverPortV6Desc: 'Port dla połączeń IPv6. Pozostaw puste, aby wyłączyć.',
  serverPortV6Help: 'Opcjonalne. Ustaw, jeśli Twój serwer obsługuje połączenia IPv6.',

  // BEDROCK TEMPLATES
  bedrockSurvival: 'Bedrock Survival',
  bedrockSurvivalDesc: 'Klasyczny survival dla graczy mobilnych i konsolowych',
  bedrockCreative: 'Bedrock Creative',
  bedrockCreativeDesc: 'Tryb kreatywny z kodami dostępnymi dla wszystkich graczy',
  bedrockFamily: 'Bedrock Family',
  bedrockFamilyDesc: 'Prywatny serwer LAN do gry rodzinnej z białą listą',
  updatingPassword: 'Aktualizowanie hasła...',
  language: 'Język',
  spanish: 'Hiszpański',
  english: 'Angielski',
  dutch: 'Niderlandzki',
  german: 'Niemiecki',
  polish: 'Polski',
  peaceful: 'Pokojowy',
  unlessStopped: 'Chyba że zatrzymane',
  establishedTimeout: 'Ustalony limit czasu',
  preparingBlocks: 'Przygotowywanie bloków',
  difficultyChanged: 'Poziom trudności został zmieniony',
  entitiesKilled: 'Zabito byty',
  authors: 'Autorzy',
  popularity: 'Popularność',
  peacefulParadise: 'Spokojny raj',
  peacefulParadiseDesc: 'Tryb pokojowy z dodatkowymi udogodnieniami, idealny do budowania.',
};

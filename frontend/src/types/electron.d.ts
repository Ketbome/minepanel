export interface ElectronAPI {
  getAppVersion: () => Promise<string>;
  quitApp: () => Promise<void>;
  reloadApp: () => Promise<void>;
  getServerUrl: () => Promise<string | undefined>;
  setServerUrl: (url: string) => Promise<boolean>;
  clearServerUrl: () => Promise<boolean>;
  getLanguage: () => Promise<string>;
  setLanguage: (lang: string) => Promise<boolean>;
  getTranslations: (lang: string) => Promise<any>;
  isElectron: boolean;
  platform: string;
}

declare global {
  interface Window {
    electron?: ElectronAPI;
  }
}

export {};

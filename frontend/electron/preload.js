const { contextBridge, ipcRenderer } = require("electron");

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld("electron", {
  getAppVersion: () => ipcRenderer.invoke("get-app-version"),

  quitApp: () => ipcRenderer.invoke("quit-app"),
  reloadApp: () => ipcRenderer.invoke("reload-app"),

  getServerUrl: () => ipcRenderer.invoke("get-server-url"),
  setServerUrl: (url) => ipcRenderer.invoke("set-server-url", url),
  clearServerUrl: () => ipcRenderer.invoke("clear-server-url"),

  getLanguage: () => ipcRenderer.invoke("get-language"),
  setLanguage: (lang) => ipcRenderer.invoke("set-language", lang),
  getTranslations: (lang) => ipcRenderer.invoke("get-translations", lang),

  isElectron: true,

  platform: process.platform,
});

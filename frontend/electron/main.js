const { app, BrowserWindow, ipcMain, Menu } = require("electron");
const path = require("path");
const i18n = require("./translations/i18n");

let store;
let mainWindow;

function createAppMenu() {
  const t = (key) => i18n.t(key);

  const template = [
    {
      label: t("menu.file"),
      submenu: [
        {
          label: t("menu.changeServer"),
          accelerator: "CmdOrCtrl+D",
          click: async () => {
            if (!store) {
              const Store = (await import("electron-store")).default;
              store = new Store();
            }
            store.delete("serverUrl");
            if (mainWindow) {
              mainWindow.loadFile(path.join(__dirname, "setup.html"));
            }
          },
        },
        {
          label: t("menu.reloadConnection"),
          accelerator: "CmdOrCtrl+R",
          click: async () => {
            if (!store) {
              const Store = (await import("electron-store")).default;
              store = new Store();
            }
            if (mainWindow) {
              const serverUrl = store.get("serverUrl");
              if (serverUrl) {
                mainWindow.loadURL(serverUrl);
              } else {
                mainWindow.reload();
              }
            }
          },
        },
        { type: "separator" },
        {
          label: t("menu.quit"),
          accelerator: "CmdOrCtrl+Q",
          click: () => {
            app.quit();
          },
        },
      ],
    },
    {
      label: t("menu.view"),
      submenu: [
        {
          label: t("menu.reloadPage"),
          accelerator: "F5",
          click: () => {
            if (mainWindow) {
              mainWindow.reload();
            }
          },
        },
        {
          label: t("menu.devTools"),
          accelerator: "F12",
          click: () => {
            if (mainWindow) {
              mainWindow.webContents.toggleDevTools();
            }
          },
        },
        { type: "separator" },
        {
          label: t("menu.fullScreen"),
          accelerator: "F11",
          click: () => {
            if (mainWindow) {
              mainWindow.setFullScreen(!mainWindow.isFullScreen());
            }
          },
        },
        {
          label: t("menu.zoomIn"),
          accelerator: "CmdOrCtrl+Plus",
          click: () => {
            if (mainWindow) {
              const currentZoom = mainWindow.webContents.getZoomLevel();
              mainWindow.webContents.setZoomLevel(currentZoom + 1);
            }
          },
        },
        {
          label: t("menu.zoomOut"),
          accelerator: "CmdOrCtrl+-",
          click: () => {
            if (mainWindow) {
              const currentZoom = mainWindow.webContents.getZoomLevel();
              mainWindow.webContents.setZoomLevel(currentZoom - 1);
            }
          },
        },
        {
          label: t("menu.zoomReset"),
          accelerator: "CmdOrCtrl+0",
          click: () => {
            if (mainWindow) {
              mainWindow.webContents.setZoomLevel(0);
            }
          },
        },
      ],
    },
    {
      label: t("menu.help"),
      submenu: [
        {
          label: t("menu.about"),
          click: () => {
            const { dialog } = require("electron");
            dialog.showMessageBox(mainWindow, {
              type: "info",
              title: t("menu.aboutDialog.title"),
              message: t("menu.aboutDialog.message"),
              detail: `${t("menu.aboutDialog.version")}: ${app.getVersion()}\nElectron: ${process.versions.electron}\nChrome: ${process.versions.chrome}\nNode.js: ${process.versions.node}`,
              buttons: [t("menu.aboutDialog.close")],
            });
          },
        },
      ],
    },
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

async function createWindow() {
  if (!store) {
    const Store = (await import("electron-store")).default;
    store = new Store();
    console.log("✅ Store initialized");
    console.log("📁 Store path:", store.path);
  }
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1200,
    minHeight: 700,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: false,
    },
    icon: path.join(__dirname, "img", "logo.webp"),
    backgroundColor: "#0a0a0a",
    show: false,
    frame: true,
    titleBarStyle: "default",
    autoHideMenuBar: false,
  });

  mainWindow.once("ready-to-show", () => {
    mainWindow.show();
  });

  const serverUrl = store.get("serverUrl");
  console.log("🔍 Checking saved URL:", serverUrl);
  if (serverUrl) {
    console.log("✅ Loading saved URL:", serverUrl);
    mainWindow.loadURL(serverUrl);
  } else {
    console.log("⚠️ No saved URL, showing setup page");
    // Load local setup page
    mainWindow.loadFile(path.join(__dirname, "setup.html"));
  }

  mainWindow.on("closed", () => {
    mainWindow = null;
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    const serverUrl = store.get("serverUrl");
    if (serverUrl && url.startsWith(serverUrl)) {
      return { action: "allow" };
    }
    require("electron").shell.openExternal(url);
    return { action: "deny" };
  });
}

app.whenReady().then(async () => {
  if (!store) {
    const Store = (await import("electron-store")).default;
    store = new Store();
  }

  const savedLang = store.get("language", "en");
  i18n.setLanguage(savedLang);

  createAppMenu();
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

ipcMain.handle("get-app-version", () => {
  return app.getVersion();
});

ipcMain.handle("quit-app", () => {
  app.quit();
});

ipcMain.handle("get-server-url", async () => {
  if (!store) {
    const Store = (await import("electron-store")).default;
    store = new Store();
  }
  return store.get("serverUrl");
});

ipcMain.handle("set-server-url", async (event, url) => {
  if (!store) {
    const Store = (await import("electron-store")).default;
    store = new Store();
  }
  console.log("💾 Saving URL:", url);
  store.set("serverUrl", url);
  console.log("✅ URL saved to:", store.path);
  console.log("📝 Stored value:", store.get("serverUrl"));
  if (mainWindow) {
    mainWindow.loadURL(url);
  }
  return true;
});

ipcMain.handle("clear-server-url", async () => {
  if (!store) {
    const Store = (await import("electron-store")).default;
    store = new Store();
  }
  store.delete("serverUrl");
  if (mainWindow) {
    mainWindow.loadFile(path.join(__dirname, "setup.html"));
  }
  return true;
});

ipcMain.handle("reload-app", async () => {
  if (!store) {
    const Store = (await import("electron-store")).default;
    store = new Store();
  }
  if (mainWindow) {
    const serverUrl = store.get("serverUrl");
    if (serverUrl) {
      mainWindow.loadURL(serverUrl);
    }
  }
  return true;
});

ipcMain.handle("get-language", async () => {
  if (!store) {
    const Store = (await import("electron-store")).default;
    store = new Store();
  }
  const savedLang = store.get("language", "en");
  i18n.setLanguage(savedLang);
  return savedLang;
});

ipcMain.handle("set-language", async (event, lang) => {
  if (!store) {
    const Store = (await import("electron-store")).default;
    store = new Store();
  }
  store.set("language", lang);
  i18n.setLanguage(lang);
  createAppMenu();
  return true;
});

ipcMain.handle("get-translations", (event, lang) => {
  return i18n.getAllTranslations(lang);
});

process.on("uncaughtException", (error) => {
  console.error("Uncaught Exception:", error);
});

process.on("unhandledRejection", (error) => {
  console.error("Unhandled Rejection:", error);
});

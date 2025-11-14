const fs = require("fs");
const path = require("path");

class I18n {
  constructor() {
    this.translations = {};
    this.currentLanguage = "en";
    this.loadTranslations();
  }

  loadTranslations() {
    const translationsDir = path.join(__dirname);
    const languages = ["en", "es", "nl"];

    languages.forEach((lang) => {
      try {
        const filePath = path.join(translationsDir, `${lang}.json`);
        const content = fs.readFileSync(filePath, "utf8");
        this.translations[lang] = JSON.parse(content);
      } catch (error) {
        console.error(`Error loading translation file for ${lang}:`, error);
      }
    });
  }

  setLanguage(lang) {
    if (this.translations[lang]) {
      this.currentLanguage = lang;
      return true;
    }
    return false;
  }

  getLanguage() {
    return this.currentLanguage;
  }

  t(key) {
    const keys = key.split(".");
    let value = this.translations[this.currentLanguage];

    for (const k of keys) {
      if (value && typeof value === "object") {
        value = value[k];
      } else {
        return key; // Return key if translation not found
      }
    }

    return value || key;
  }

  getAllTranslations(lang = null) {
    const targetLang = lang || this.currentLanguage;
    return this.translations[targetLang] || {};
  }
}

module.exports = new I18n();

import { loadLanguages, loadTranslation } from './loader.js';
export class I18n {
    constructor() {
        this.currentLanguage = 'en';
        this.translations = {};
        this.observers = [];
        this.loadingPromises = {};
        this.languages = [];
        const savedLang = localStorage.getItem('language') || 'en';
        Promise.all([
            this.init(),
            this.loadLanguage(savedLang),
            savedLang !== 'en' ? this.loadLanguage('en') : Promise.resolve()
        ]).then(() => {
            if (this.translations[savedLang]) {
                this.setLanguage(savedLang).catch(console.error);
            }
        });
    }
    async init() {
        this.languages = await loadLanguages();
    }
    async loadLanguage(lang) {
        if (this.translations[lang]) {
            return;
        }
        if (lang in this.loadingPromises) {
            return this.loadingPromises[lang];
        }
        this.loadingPromises[lang] = new Promise(async (resolve, reject) => {
            try {
                this.translations[lang] = await loadTranslation(lang);
                resolve();
            }
            catch (error) {
                console.error(`Failed to load language ${lang}:`, error);
                delete this.translations[lang];
                reject(error);
            }
            finally {
                delete this.loadingPromises[lang];
            }
        });
        return this.loadingPromises[lang];
    }
    async setLanguage(lang) {
        if (!this.languages.find((l) => l.code === lang)) {
            throw new Error(`Language ${lang} is not supported`);
        }
        try {
            await Promise.all([
                this.loadLanguage(lang),
                lang !== 'en' ? this.loadLanguage('en') : Promise.resolve()
            ]);
            if (!this.translations[lang]) {
                throw new Error(`Translations for ${lang} not loaded`);
            }
            this.currentLanguage = lang;
            localStorage.setItem('language', lang);
            document.documentElement.lang = lang;
            this.updatePageTranslations();
            this.notifyObservers();
        }
        catch (error) {
            console.error(`Error setting language ${lang}:`, error);
            if (lang !== 'en' && this.translations['en']) {
                await this.setLanguage('en');
            }
            throw error;
        }
    }
    translate(key) {
        const keys = key.split('.');
        let value = this.translations[this.currentLanguage];
        if (!value && this.translations['en']) {
            value = this.translations['en'];
        }
        for (const k of keys) {
            if (value === undefined)
                break;
            value = value[k];
        }
        return value || key;
    }
    updatePageTranslations() {
        document.querySelectorAll('[data-i18n]').forEach(element => {
            const key = element.getAttribute('data-i18n');
            if (key) {
                element.textContent = this.translate(key);
            }
        });
        document.querySelectorAll('[data-i18n-placeholder]').forEach(element => {
            const key = element.getAttribute('data-i18n-placeholder');
            if (key) {
                element.setAttribute('placeholder', this.translate(key));
            }
        });
    }
    getLanguages() {
        return this.languages;
    }
    getCurrentLanguage() {
        return this.currentLanguage;
    }
    addObserver(callback) {
        this.observers.push(callback);
    }
    notifyObservers() {
        this.observers.forEach(callback => callback(this.currentLanguage));
    }
}
export const i18n = new I18n();

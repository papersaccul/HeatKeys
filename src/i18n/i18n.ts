import { Language, Translations } from './types.js';
import { loadLanguages, loadTranslation } from './loader.js';

export class I18n {
    private currentLanguage: string = 'en';
    private translations: { [lang: string]: Translations } = {};
    private observers: ((lang: string) => void)[] = [];
    private loadingPromises: { [lang: string]: Promise<void> } = {};
    private languages: Language[] = [];

    constructor() {
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

    private async init(): Promise<void> {
        this.languages = await loadLanguages();
    }

    async loadLanguage(lang: string): Promise<void> {
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
            } catch (error) {
                console.error(`Failed to load language ${lang}:`, error);
                delete this.translations[lang];
                reject(error);
            } finally {
                delete this.loadingPromises[lang];
            }
        });

        return this.loadingPromises[lang];
    }

    async setLanguage(lang: string): Promise<void> {
        if (!this.languages.find((l: Language) => l.code === lang)) {
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
        } catch (error) {
            console.error(`Error setting language ${lang}:`, error);
            if (lang !== 'en' && this.translations['en']) {
                await this.setLanguage('en');
            }
            throw error;
        }
    }

    translate(key: string): string {
        const keys = key.split('.');
        let value: any = this.translations[this.currentLanguage];
        
        if (!value && this.translations['en']) {
            value = this.translations['en'];
        }
        
        for (const k of keys) {
            if (value === undefined) break;
            value = value[k];
        }

        return value || key;
    }

    private updatePageTranslations(): void {
        document.querySelectorAll('[data-i18n]').forEach(element => {
            const key = element.getAttribute('data-i18n');
            if (key) {
                element.textContent = this.translate(key);
            }
        });

        document.querySelectorAll('[data-i18n-placeholder]').forEach(element => {
            const key = element.getAttribute('data-i18n-placeholder');
            if (key) {
                (element as HTMLElement).setAttribute('placeholder', this.translate(key));
            }
        });
    }

    getLanguages(): Language[] {
        return this.languages;
    }

    getCurrentLanguage(): string {
        return this.currentLanguage;
    }

    addObserver(callback: (lang: string) => void): void {
        this.observers.push(callback);
    }

    private notifyObservers(): void {
        this.observers.forEach(callback => callback(this.currentLanguage));
    }
}

export const i18n = new I18n(); 
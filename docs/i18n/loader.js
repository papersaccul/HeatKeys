const AVAILABLE_LANGUAGES = ['en', 'es', 'fr', 'ru', 'de'];
// Функция для динамической загрузки локалей
export async function loadLanguages() {
    try {
        // Создаем массив языков с их названиями
        const languages = AVAILABLE_LANGUAGES.map(code => {
            const langNames = new Intl.DisplayNames([code], { type: 'language' });
            const nativeLangNames = new Intl.DisplayNames([code], { type: 'language' });
            return {
                code,
                name: langNames.of(code) || code,
                nativeName: nativeLangNames.of(code) || code
            };
        });
        return languages;
    }
    catch (error) {
        console.error('Error loading languages:', error);
        return [];
    }
}
// Функция для загрузки конкретного перевода
export async function loadTranslation(code) {
    try {
        const response = await fetch(`locales/${code}.json`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return await response.json();
    }
    catch (error) {
        console.error(`Error loading translation for ${code}:`, error);
        return {};
    }
}

class ThemeManager {
    constructor() {
        const savedTheme = localStorage.getItem('theme');
        if (savedTheme === 'light' || savedTheme === 'dark') {
            this.currentTheme = savedTheme;
        }
        else {
            this.currentTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
        }
        this.applyTheme(this.currentTheme);
    }
    static getInstance() {
        if (!ThemeManager.instance) {
            ThemeManager.instance = new ThemeManager();
        }
        return ThemeManager.instance;
    }
    toggleTheme() {
        this.currentTheme = this.currentTheme === 'light' ? 'dark' : 'light';
        this.applyTheme(this.currentTheme);
        localStorage.setItem('theme', this.currentTheme);
    }
    applyTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
    }
    getCurrentTheme() {
        return this.currentTheme;
    }
}
document.addEventListener('DOMContentLoaded', () => {
    const themeManager = ThemeManager.getInstance();
    const themeToggle = document.getElementById('theme-toggle');
    document.documentElement.setAttribute('data-theme', themeManager.getCurrentTheme());
    themeToggle?.addEventListener('click', () => {
        themeManager.toggleTheme();
    });
});
export { ThemeManager };

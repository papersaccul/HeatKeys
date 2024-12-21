class ThemeManager {
    private static instance: ThemeManager;
    private currentTheme: 'light' | 'dark';

    private constructor() {
        const savedTheme = localStorage.getItem('theme');
        if (savedTheme === 'light' || savedTheme === 'dark') {
            this.currentTheme = savedTheme;
        } else {
            this.currentTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
        }
        this.applyTheme(this.currentTheme);
    }

    public static getInstance(): ThemeManager {
        if (!ThemeManager.instance) {
            ThemeManager.instance = new ThemeManager();
        }
        return ThemeManager.instance;
    }

    public toggleTheme(): void {
        this.currentTheme = this.currentTheme === 'light' ? 'dark' : 'light';
        this.applyTheme(this.currentTheme);
        localStorage.setItem('theme', this.currentTheme);
    }

    private applyTheme(theme: 'light' | 'dark'): void {
        document.documentElement.setAttribute('data-theme', theme);
    }

    public getCurrentTheme(): 'light' | 'dark' {
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
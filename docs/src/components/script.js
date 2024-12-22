import { i18n } from '../utils/i18n.js';
import { ThemeManager } from '../utils/theme.js';
class KeyboardHeatmap {
    constructor() {
        this.currentLayout = 'ru';
        this.keyStats = {};
        this.maxHeat = 0;
        this.thermalMode = true;
        this.heatmapCanvas = null;
        this.heatmapContainer = null;
        this.currentDictionary = 'en';
        this.dictionaries = {};
        this.keyboard = document.getElementById('keyboard-layout');
        this.modal = document.getElementById('layout-modal');
        this.layoutSelect = document.getElementById('layout-select');
        this.languageSelect = document.getElementById('language-select');
        this.layouts = {};
        this.layoutNames = {};
        this.availableLayouts = [];
        this.themeManager = ThemeManager.getInstance();
        this.thermalMode = localStorage.getItem('thermal-mode') !== 'false';
        const thermalCheckbox = document.getElementById('thermal-mode');
        if (thermalCheckbox) {
            thermalCheckbox.checked = this.thermalMode;
            thermalCheckbox.addEventListener('change', (e) => {
                this.thermalMode = e.target.checked;
                localStorage.setItem('thermal-mode', this.thermalMode.toString());
                if (this.heatmapCanvas) {
                    this.heatmapCanvas.style.display = this.thermalMode ? 'block' : 'none';
                }
                this.updateHeatmap();
            });
        }
        this.initializeLanguageSelector();
        this.dictionarySelect = document.getElementById('dictionary-select');
        this.loadLayoutsFromConfig().then(() => {
            this.loadDictionaries().then(() => {
                this.initializeEventListeners();
                this.updateLayoutSelect();
                this.renderKeyboard();
                this.initializeDictionarySelector();
                this.loadSelectedDictionary();
            });
        });
        this.initHeatmap();
    }
    initializeLanguageSelector() {
        const languages = i18n.getLanguages();
        languages.forEach(lang => {
            const option = document.createElement('option');
            option.value = lang.code;
            option.textContent = lang.nativeName;
            this.languageSelect.appendChild(option);
        });
        this.languageSelect.value = i18n.getCurrentLanguage();
        this.languageSelect.addEventListener('change', async () => {
            try {
                await i18n.setLanguage(this.languageSelect.value);
            }
            catch (error) {
                console.error('Error changing language:', error);
                this.languageSelect.value = i18n.getCurrentLanguage();
            }
        });
    }
    async loadLayoutsFromConfig() {
        try {
            const response = await fetch('../config/layouts.json');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            Object.entries(data.layouts).forEach(([key, config]) => {
                this.layouts[key] = config.layout;
                this.layoutNames[key] = config.name;
            });
            const savedLayouts = localStorage.getItem('keyboard-layouts');
            if (savedLayouts) {
                const customLayouts = JSON.parse(savedLayouts);
                Object.entries(customLayouts).forEach(([key, layout]) => {
                    this.layouts[key] = layout;
                });
            }
            if (Object.keys(this.layouts).length === 0) {
                this.layouts['ru'] = [
                    ['ё', '1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '-', '='],
                    ['й', 'ц', 'у', 'к', 'е', 'н', 'г', 'ш', 'щ', 'з', 'х', 'ъ'],
                    ['ф', 'ы', 'в', 'а', 'п', 'р', 'о', 'л', 'д', 'ж', 'э'],
                    ['я', 'ч', 'с', 'м', 'и', 'т', 'ь', 'б', 'ю', '.']
                ];
                this.layoutNames['ru'] = 'Русская';
            }
            this.availableLayouts = Object.keys(this.layouts);
        }
        catch (error) {
            console.error('Ошибка загрузки конфигурации раскладок:', error);
            this.layouts['ru'] = [
                ['ё', '1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '-', '='],
                ['й', 'ц', 'у', 'к', 'е', 'н', 'г', 'ш', 'щ', 'з', 'х', 'ъ'],
                ['ф', 'ы', 'в', 'а', 'п', 'р', 'о', 'л', 'д', 'ж', 'э'],
                ['я', 'ч', 'с', 'м', 'и', 'т', 'ь', 'б', 'ю', '.']
            ];
            this.layoutNames['ru'] = 'Русская';
            this.availableLayouts = ['ru'];
        }
    }
    saveLayouts() {
        const customLayouts = {};
        Object.keys(this.layouts).forEach(key => {
            if (!this.layoutNames[key]) {
                customLayouts[key] = this.layouts[key];
            }
        });
        localStorage.setItem('keyboard-layouts', JSON.stringify(customLayouts));
    }
    updateLayoutSelect() {
        const currentValue = this.layoutSelect.value;
        this.layoutSelect.innerHTML = '';
        this.availableLayouts.forEach(layout => {
            const option = document.createElement('option');
            option.value = layout;
            option.textContent = this.getLayoutDisplayName(layout);
            this.layoutSelect.appendChild(option);
        });
        if (this.availableLayouts.includes(currentValue)) {
            this.layoutSelect.value = currentValue;
        }
        else if (this.availableLayouts.length > 0) {
            this.layoutSelect.value = this.availableLayouts[0];
            this.currentLayout = this.availableLayouts[0];
        }
    }
    getLayoutDisplayName(layout) {
        return this.layoutNames[layout] || layout;
    }
    initializeEventListeners() {
        const analyzeBtn = document.getElementById('analyze-btn');
        const createLayoutBtn = document.getElementById('create-layout');
        const saveLayoutBtn = document.getElementById('save-layout');
        const cancelLayoutBtn = document.getElementById('cancel-layout');
        const inputText = document.getElementById('input-text');
        const thermalCheckbox = document.getElementById('thermal-mode');
        const editLayoutBtn = document.getElementById('edit-layout-btn');
        analyzeBtn?.addEventListener('click', () => this.analyzeText(inputText.value));
        this.layoutSelect.addEventListener('change', () => this.switchLayout());
        createLayoutBtn?.addEventListener('click', () => this.showLayoutModal());
        saveLayoutBtn?.addEventListener('click', () => this.saveNewLayout());
        cancelLayoutBtn?.addEventListener('click', () => this.hideLayoutModal());
        thermalCheckbox?.addEventListener('change', (e) => {
            this.thermalMode = e.target.checked;
            localStorage.setItem('thermal-mode', this.thermalMode.toString());
            this.updateHeatmap();
        });
        editLayoutBtn?.addEventListener('click', () => this.editCurrentLayout());
    }
    showLayoutModal() {
        document.getElementById('layout-name').value = '';
        ['row1', 'row2', 'row3', 'row4'].forEach(id => {
            document.getElementById(id).value = '';
        });
        const modalTitle = document.querySelector('.modal-title');
        if (modalTitle) {
            modalTitle.textContent = i18n.translate('layouts.modal.title');
        }
        const deleteBtn = document.querySelector('.delete-layout-btn');
        if (deleteBtn) {
            deleteBtn.style.display = 'none';
        }
        const saveBtn = document.getElementById('save-layout');
        if (saveBtn) {
            saveBtn.onclick = () => this.saveNewLayout();
        }
        this.modal.classList.add('active');
    }
    hideLayoutModal() {
        this.modal.classList.remove('active');
        document.getElementById('layout-name').value = '';
        ['row1', 'row2', 'row3', 'row4'].forEach(id => {
            document.getElementById(id).value = '';
        });
    }
    saveNewLayout() {
        const name = document.getElementById('layout-name').value.trim();
        if (!name) {
            alert(i18n.translate('errors.nameRequired'));
            return;
        }
        if (this.layouts[name]) {
            alert(i18n.translate('errors.layoutExists'));
            return;
        }
        const rows = ['row1', 'row2', 'row3', 'row4'].map(id => {
            const value = document.getElementById(id).value.trim();
            return value ? Array.from(value) : [];
        });
        if (rows[1].length === 0 || rows[2].length === 0 || rows[3].length === 0) {
            alert(i18n.translate('errors.rowsRequired'));
            return;
        }
        const layoutRows = rows[0].length > 0 ? rows : rows.slice(1);
        this.layouts[name] = layoutRows;
        this.availableLayouts.push(name);
        this.saveLayouts();
        this.updateLayoutSelect();
        this.currentLayout = name;
        this.layoutSelect.value = name;
        this.renderKeyboard();
        this.hideLayoutModal();
    }
    renderKeyboard() {
        this.keyboard.innerHTML = '';
        const layout = this.layouts[this.currentLayout];
        layout.forEach(row => {
            const rowElement = document.createElement('div');
            rowElement.className = 'keyboard-row';
            row.forEach(key => {
                const keyElement = document.createElement('div');
                keyElement.className = 'key';
                keyElement.textContent = key;
                keyElement.setAttribute('data-key', key);
                rowElement.appendChild(keyElement);
            });
            this.keyboard.appendChild(rowElement);
        });
        if (this.thermalMode && Object.keys(this.keyStats).length > 0) {
            this.initHeatmap();
            this.updateHeatmap();
        }
    }
    analyzeText(text) {
        this.keyStats = {};
        this.maxHeat = Math.max(1, text.length / 20);
        text.toLowerCase().split('').forEach(char => {
            if (this.keyStats[char]) {
                this.keyStats[char]++;
            }
            else {
                this.keyStats[char] = 1;
            }
        });
        this.initHeatmap();
        this.updateHeatmap();
    }
    updateHeatmap() {
        const keys = this.keyboard.getElementsByClassName('key');
        const dataPoints = [];
        Array.from(keys).forEach(key => {
            const char = key.textContent?.toLowerCase() || '';
            const heat = this.keyStats[char] || 0;
            const keyElement = key;
            const rect = keyElement.getBoundingClientRect();
            const containerRect = this.keyboard.getBoundingClientRect();
            if (this.thermalMode) {
                keyElement.classList.add('thermal');
                if (heat > 0) {
                    for (let i = 0; i < heat; i++) {
                        dataPoints.push({
                            x: rect.left - containerRect.left + rect.width / 2,
                            y: rect.top - containerRect.top + rect.height / 2,
                            value: 1
                        });
                    }
                }
            }
            else {
                keyElement.classList.remove('thermal');
                keyElement.style.backgroundColor = this.getHeatColor(heat / this.maxHeat);
            }
        });
        if (this.thermalMode && this.heatmap) {
            this.heatmap.setData({
                max: this.maxHeat,
                data: dataPoints
            });
            if (this.heatmapCanvas) {
                const heatmapData = this.heatmap.getDataURL();
                const img = new Image();
                img.onload = () => {
                    if (this.heatmapCanvas) {
                        const ctx = this.heatmapCanvas.getContext('2d');
                        if (ctx) {
                            ctx.clearRect(0, 0, this.heatmapCanvas.width, this.heatmapCanvas.height);
                            ctx.drawImage(img, 0, 0, this.heatmapCanvas.width, this.heatmapCanvas.height);
                        }
                    }
                };
                img.src = heatmapData;
            }
        }
    }
    getRGBValues(color) {
        const match = color.match(/\d+/g);
        if (match && match.length >= 3) {
            return `${match[0]}, ${match[1]}, ${match[2]}`;
        }
        return '0, 0, 0';
    }
    getHeatColor(intensity) {
        if (!this.thermalMode) {
            return `rgba(${Math.round(255 * intensity)}, ${Math.round(255 * (1 - intensity))}, 0, ${Math.max(0.1, intensity)})`;
        }
        const cold = [136, 192, 208];
        const warm = [235, 203, 139];
        const hot = [191, 97, 106];
        let r, g, b;
        if (intensity <= 0.5) {
            const t = intensity * 2;
            r = Math.round(cold[0] + (warm[0] - cold[0]) * t);
            g = Math.round(cold[1] + (warm[1] - cold[1]) * t);
            b = Math.round(cold[2] + (warm[2] - cold[2]) * t);
        }
        else {
            const t = (intensity - 0.5) * 2;
            r = Math.round(warm[0] + (hot[0] - warm[0]) * t);
            g = Math.round(warm[1] + (hot[1] - warm[1]) * t);
            b = Math.round(warm[2] + (hot[2] - warm[2]) * t);
        }
        const brightnessBoost = 1.2;
        r = Math.min(255, Math.round(r * brightnessBoost));
        g = Math.min(255, Math.round(g * brightnessBoost));
        b = Math.min(255, Math.round(b * brightnessBoost));
        return `rgb(${r}, ${g}, ${b})`;
    }
    switchLayout() {
        this.currentLayout = this.layoutSelect.value;
        this.renderKeyboard();
        if (this.keyStats && Object.keys(this.keyStats).length > 0) {
            this.initHeatmap();
            this.updateHeatmap();
        }
    }
    initHeatmap() {
        const container = document.querySelector('.keyboard-container');
        if (this.heatmapContainer) {
            this.heatmapContainer.remove();
        }
        if (this.heatmapCanvas) {
            this.heatmapCanvas.remove();
        }
        this.heatmapContainer = document.createElement('div');
        this.heatmapContainer.id = 'heatmap-overlay';
        this.heatmapContainer.style.position = 'absolute';
        this.heatmapContainer.style.top = '0';
        this.heatmapContainer.style.left = '0';
        this.heatmapContainer.style.width = '100%';
        this.heatmapContainer.style.height = '100%';
        this.heatmapContainer.style.pointerEvents = 'none';
        this.heatmapContainer.style.opacity = '0';
        this.heatmapContainer.style.visibility = 'hidden';
        container.style.position = 'relative';
        container.appendChild(this.heatmapContainer);
        this.heatmapCanvas = document.createElement('canvas');
        this.heatmapCanvas.style.position = 'absolute';
        this.heatmapCanvas.style.top = '0';
        this.heatmapCanvas.style.left = '0';
        this.heatmapCanvas.style.width = '100%';
        this.heatmapCanvas.style.height = '100%';
        this.heatmapCanvas.style.pointerEvents = 'none';
        this.heatmapCanvas.style.display = this.thermalMode ? 'block' : 'none';
        container.appendChild(this.heatmapCanvas);
        this.heatmap = h337.create({
            container: this.heatmapContainer,
            radius: 70,
            maxOpacity: 0.4,
            blur: 0.75
        });
    }
    async loadDictionaries() {
        try {
            const response = await fetch('../config/dictionaries.json');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            this.dictionaries = await response.json();
        }
        catch (error) {
            console.error('Ошибка загрузки словарей:', error);
            this.dictionaries = {
                en: {
                    name: "English",
                    code: "en",
                    words: ["the", "be", "to", "of", "and", "a", "in", "that", "have", "I"]
                }
            };
        }
    }
    initializeDictionarySelector() {
        this.dictionarySelect.innerHTML = '';
        Object.entries(this.dictionaries).forEach(([code, dict]) => {
            const option = document.createElement('option');
            option.value = code;
            option.textContent = dict.name;
            this.dictionarySelect.appendChild(option);
        });
        this.dictionarySelect.value = this.currentDictionary;
        this.dictionarySelect.addEventListener('change', () => {
            this.currentDictionary = this.dictionarySelect.value;
            this.loadSelectedDictionary();
        });
    }
    loadSelectedDictionary() {
        const dictionary = this.dictionaries[this.currentDictionary];
        if (dictionary) {
            const inputText = document.getElementById('input-text');
            inputText.value = dictionary.words.join(' ');
            this.analyzeText(inputText.value);
        }
        else {
            console.warn(`Dictionary ${this.currentDictionary} not found`);
            if (this.dictionaries['en']) {
                this.currentDictionary = 'en';
                this.dictionarySelect.value = 'en';
                this.loadSelectedDictionary();
            }
        }
    }
    editCurrentLayout() {
        const currentLayout = this.layouts[this.currentLayout];
        if (!currentLayout)
            return;
        const layoutNameInput = document.getElementById('layout-name');
        layoutNameInput.value = this.currentLayout;
        currentLayout.forEach((row, index) => {
            const rowInput = document.getElementById(`row${index + 1}`);
            if (rowInput) {
                rowInput.value = row.join('');
            }
        });
        const modalTitle = document.querySelector('.modal-title');
        if (modalTitle) {
            modalTitle.textContent = i18n.translate('layouts.modal.editTitle');
        }
        const deleteBtn = document.querySelector('.delete-layout-btn');
        if (deleteBtn) {
            deleteBtn.style.display = this.layoutNames[this.currentLayout] ? 'none' : 'block';
            deleteBtn.onclick = () => this.deleteLayout();
        }
        const saveBtn = document.getElementById('save-layout');
        if (saveBtn) {
            saveBtn.onclick = () => this.saveEditedLayout();
        }
        this.modal.classList.add('active');
    }
    saveEditedLayout() {
        const name = document.getElementById('layout-name').value.trim();
        const rows = ['row1', 'row2', 'row3', 'row4'].map(id => {
            const value = document.getElementById(id).value.trim();
            return value ? Array.from(value) : [];
        }).filter(row => row.length > 0);
        if (rows.length < 3) {
            alert(i18n.translate('errors.rowsRequired'));
            return;
        }
        if (this.layoutNames[this.currentLayout] && name !== this.currentLayout) {
            alert(i18n.translate('errors.cantModifyStandard'));
            return;
        }
        if (name !== this.currentLayout && this.layouts[name]) {
            alert(i18n.translate('errors.layoutExists'));
            return;
        }
        if (name !== this.currentLayout) {
            delete this.layouts[this.currentLayout];
            const index = this.availableLayouts.indexOf(this.currentLayout);
            if (index > -1) {
                this.availableLayouts.splice(index, 1);
            }
            this.availableLayouts.push(name);
            this.currentLayout = name;
        }
        this.layouts[name] = rows;
        if (!this.layoutNames[name]) {
            this.saveLayouts();
        }
        this.updateLayoutSelect();
        this.renderKeyboard();
        this.hideLayoutModal();
    }
    deleteLayout() {
        if (confirm(i18n.translate('layouts.modal.deleteConfirm') || 'Удалить раскладку?')) {
            delete this.layouts[this.currentLayout];
            const index = this.availableLayouts.indexOf(this.currentLayout);
            if (index > -1) {
                this.availableLayouts.splice(index, 1);
            }
            this.currentLayout = this.availableLayouts[0];
            this.saveLayouts();
            this.updateLayoutSelect();
            this.renderKeyboard();
            this.hideLayoutModal();
        }
    }
}
document.addEventListener('DOMContentLoaded', () => {
    new KeyboardHeatmap();
});

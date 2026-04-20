/**
 * Theme utility — dark/light mode manager with system preference detection
 */

const THEME_KEY = 'aegibit_theme';

export const THEMES = {
  DARK: 'dark',
  LIGHT: 'light',
  SYSTEM: 'system',
};

class ThemeManager {
  constructor() {
    this.currentTheme = null;
    this.systemPreference = null;
    this.listeners = [];
    this.initialized = false;
  }

  init() {
    if (this.initialized) return;
    
    // Get stored theme or default to dark
    this.currentTheme = localStorage.getItem(THEME_KEY) || THEMES.DARK;
    this.systemPreference = window.matchMedia('(prefers-color-scheme: dark)');
    
    // Listen for system theme changes
    this.systemPreference.addEventListener('change', (e) => {
      if (this.currentTheme === THEMES.SYSTEM) {
        this.applyTheme(this.getEffectiveTheme());
      }
    });
    
    // Apply initial theme
    this.applyTheme(this.getEffectiveTheme());
    this.initialized = true;
  }

  getStoredTheme() {
    return localStorage.getItem(THEME_KEY);
  }

  getEffectiveTheme() {
    if (this.currentTheme === THEMES.SYSTEM && this.systemPreference) {
      return this.systemPreference.matches ? THEMES.DARK : THEMES.LIGHT;
    }
    return this.currentTheme || THEMES.DARK;
  }

  applyTheme(theme) {
    const root = document.documentElement;
    if (!root) return;
    
    // Remove both classes first
    root.classList.remove('light-mode', 'dark-mode');
    
    // Add appropriate class
    if (theme === THEMES.LIGHT) {
      root.classList.add('light-mode');
    } else {
      root.classList.add('dark-mode');
    }
    
    // Notify listeners
    this.listeners.forEach(cb => cb(theme));
  }

  setTheme(theme) {
    this.currentTheme = theme;
    localStorage.setItem(THEME_KEY, theme);
    this.applyTheme(this.getEffectiveTheme());
  }

  toggle() {
    const effective = this.getEffectiveTheme();
    const newTheme = effective === THEMES.DARK ? THEMES.LIGHT : THEMES.DARK;
    this.setTheme(newTheme);
    return newTheme;
  }

  onChange(callback) {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(cb => cb !== callback);
    };
  }

  getCurrentTheme() {
    return this.currentTheme;
  }
}

// Singleton instance
export const themeManager = new ThemeManager();

// Convenience exports
export const toggleTheme = () => themeManager.toggle();
export const setTheme = (theme) => themeManager.setTheme(theme);
export const getCurrentTheme = () => themeManager.getCurrentTheme();
export const getEffectiveTheme = () => themeManager.getEffectiveTheme();
export const onThemeChange = (cb) => themeManager.onChange(cb);

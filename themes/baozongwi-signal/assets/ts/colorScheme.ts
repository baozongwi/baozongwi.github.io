type colorScheme = 'light' | 'dark';
type themeMode = 'night' | 'midnight' | 'day' | 'rain' | 'snow';

const THEME_MODES: themeMode[] = ['night', 'midnight', 'day', 'rain', 'snow'];
const DARK_THEME_MODES = new Set<themeMode>(['night', 'midnight', 'rain']);
const SHORTCUT_MAP: Record<string, themeMode> = {
    n: 'night',
    m: 'midnight',
    d: 'day',
    r: 'rain',
    w: 'snow',
};

const isThemeMode = (value: string | null): value is themeMode => {
    return value !== null && THEME_MODES.includes(value as themeMode);
};

class SignalColorScheme {
    private legacyStorageKey = 'BaozongwiSignalColorScheme';
    private themeStorageKey = 'BaozongwiSignalThemeMode';
    private currentMode: themeMode;

    constructor(toggleEl: HTMLElement | null) {
        this.currentMode = this.getSavedMode();
        this.applyThemeMode(this.currentMode, false);

        if (toggleEl) {
            this.bindClick(toggleEl);
            this.bindKeyboardShortcuts();
        }
    }

    private getSchemeForMode(mode: themeMode): colorScheme {
        return DARK_THEME_MODES.has(mode) ? 'dark' : 'light';
    }

    private dispatchEvent(mode: themeMode, scheme: colorScheme) {
        window.dispatchEvent(new CustomEvent('onThemeModeChange', {
            detail: mode,
        }));

        window.dispatchEvent(new CustomEvent('onColorSchemeChange', {
            detail: scheme,
        }));
    }

    private saveThemeMode() {
        localStorage.setItem(this.themeStorageKey, this.currentMode);
        localStorage.setItem(this.legacyStorageKey, this.getSchemeForMode(this.currentMode));
    }

    private updateToggleState(mode: themeMode) {
        document.querySelectorAll<HTMLElement>('[data-theme-mode-option]').forEach(option => {
            const isActive = option.dataset.themeModeOption === mode;
            option.classList.toggle('is-active', isActive);
            option.setAttribute('aria-pressed', String(isActive));
        });
    }

    private applyThemeMode(mode: themeMode, persist = true) {
        const scheme = this.getSchemeForMode(mode);
        this.currentMode = mode;

        document.documentElement.dataset.themeMode = mode;
        document.documentElement.dataset.scheme = scheme;
        document.documentElement.style.colorScheme = scheme;

        this.updateToggleState(mode);
        this.dispatchEvent(mode, scheme);

        if (persist) {
            this.saveThemeMode();
        }
    }

    private bindClick(toggleEl: HTMLElement) {
        toggleEl.querySelectorAll<HTMLElement>('[data-theme-mode-option]').forEach(option => {
            option.addEventListener('click', event => {
                event.preventDefault();

                const nextMode = option.dataset.themeModeOption;
                if (!isThemeMode(nextMode)) return;

                this.applyThemeMode(nextMode);
            });
        });
    }

    private bindKeyboardShortcuts() {
        document.addEventListener('keydown', event => {
            const target = event.target;
            if (
                target instanceof HTMLInputElement ||
                target instanceof HTMLTextAreaElement ||
                target instanceof HTMLSelectElement ||
                (target instanceof HTMLElement && target.isContentEditable)
            ) {
                return;
            }

            const nextMode = SHORTCUT_MAP[event.key.toLowerCase()];
            if (!nextMode) return;

            this.applyThemeMode(nextMode);
        });
    }

    private getSavedMode(): themeMode {
        const savedMode = localStorage.getItem(this.themeStorageKey);
        if (isThemeMode(savedMode)) return savedMode;

        const currentDomMode = document.documentElement.dataset.themeMode;
        if (isThemeMode(currentDomMode)) return currentDomMode;

        const legacyMode = localStorage.getItem(this.legacyStorageKey);
        if (legacyMode === 'dark') return 'night';

        return 'day';
    }
}

export default SignalColorScheme;

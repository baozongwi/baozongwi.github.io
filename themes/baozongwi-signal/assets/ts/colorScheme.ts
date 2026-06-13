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

const isThemeMode = (value: string | null | undefined): value is themeMode => {
    return value !== null && value !== undefined && THEME_MODES.includes(value as themeMode);
};

const getSystemSchemeQuery = () => {
    if (!window.matchMedia) return null;

    return window.matchMedia('(prefers-color-scheme: dark)');
};

const prefersDarkScheme = () => {
    return getSystemSchemeQuery()?.matches === true;
};

class SignalColorScheme {
    private legacyStorageKey = 'BaozongwiSignalColorScheme';
    private themeStorageKey = 'BaozongwiSignalThemeMode';
    private followsSystemPreference = false;
    private currentMode: themeMode;

    constructor(toggleEl: HTMLElement | null) {
        this.followsSystemPreference = this.shouldFollowSystemPreference();
        this.currentMode = this.getSavedMode();
        this.applyThemeMode(this.currentMode, false);
        this.bindSystemPreference();

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

    private getStorageValue(key: string) {
        try {
            return localStorage.getItem(key);
        } catch (error) {
            return null;
        }
    }

    private setStorageValue(key: string, value: string) {
        try {
            localStorage.setItem(key, value);
        } catch (error) {
            // Storage can be unavailable in private browsing or embedded contexts.
        }
    }

    private saveThemeMode() {
        this.setStorageValue(this.themeStorageKey, this.currentMode);
        this.setStorageValue(this.legacyStorageKey, this.getSchemeForMode(this.currentMode));
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
        if (persist) {
            this.followsSystemPreference = false;
        }

        document.documentElement.dataset.themeMode = mode;
        document.documentElement.dataset.scheme = scheme;
        document.documentElement.dataset.themeSource = this.followsSystemPreference ? 'auto' : 'manual';
        document.documentElement.style.colorScheme = scheme;

        this.updateToggleState(mode);
        this.dispatchEvent(mode, scheme);

        if (persist) {
            this.saveThemeMode();
        }
    }

    private shouldFollowSystemPreference() {
        const savedMode = this.getStorageValue(this.themeStorageKey);
        if (isThemeMode(savedMode)) return false;

        return document.documentElement.dataset.themeSource === 'auto'
            || this.getStorageValue(this.legacyStorageKey) === 'auto';
    }

    private bindSystemPreference() {
        const systemSchemeQuery = getSystemSchemeQuery();
        if (!systemSchemeQuery) return;

        const syncSystemPreference = () => {
            if (!this.followsSystemPreference) return;

            this.applyThemeMode(systemSchemeQuery.matches ? 'night' : 'day', false);
        };

        if ('addEventListener' in systemSchemeQuery) {
            systemSchemeQuery.addEventListener('change', syncSystemPreference);
        } else {
            systemSchemeQuery.addListener(syncSystemPreference);
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

        const moreBtn = toggleEl.querySelector<HTMLElement>('#theme-more-btn');
        const extrasPanel = toggleEl.querySelector<HTMLElement>('#theme-extras-panel');
        if (moreBtn && extrasPanel) {
            moreBtn.addEventListener('click', event => {
                event.preventDefault();
                const isVisible = extrasPanel.classList.toggle('is-visible');
                moreBtn.setAttribute('aria-expanded', String(isVisible));
                extrasPanel.setAttribute('aria-hidden', String(!isVisible));
            });
        }
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

            if (!event.altKey || event.metaKey || event.ctrlKey) return;

            const nextMode = SHORTCUT_MAP[event.key.toLowerCase()];
            if (!nextMode) return;

            event.preventDefault();
            this.applyThemeMode(nextMode);
        });
    }

    private getSavedMode(): themeMode {
        const savedMode = this.getStorageValue(this.themeStorageKey);
        if (isThemeMode(savedMode)) return savedMode;

        const currentDomMode = document.documentElement.dataset.themeMode;
        if (isThemeMode(currentDomMode)) return currentDomMode;

        const legacyMode = this.getStorageValue(this.legacyStorageKey);
        if (legacyMode === 'dark') return 'night';
        if (legacyMode === 'light') return 'day';
        if (legacyMode === 'auto') return prefersDarkScheme() ? 'night' : 'day';

        return 'day';
    }
}

export default SignalColorScheme;

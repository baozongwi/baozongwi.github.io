const THEME_MODE_KEY = 'BaozongwiSignalThemeMode';
const LEGACY_COLOR_SCHEME_KEY = 'BaozongwiSignalColorScheme';
const LEGACY_LINKS_THEME_KEY = 'BaozongwiLinksThemeMode';
const LINKS_THEMES = ['day', 'night', 'midnight', 'rain', 'snow'] as const;
const DARK_LINKS_THEMES = new Set<LinksTheme>(['night', 'midnight', 'rain']);

type LinksTheme = typeof LINKS_THEMES[number];
type ColorScheme = 'light' | 'dark';

const LINKS_THEME_LABELS: Record<LinksTheme, string> = {
    day: 'Day',
    night: 'Night',
    midnight: 'Moonlight',
    rain: 'Rainy',
    snow: 'Snowy',
};

const LINKS_THEME_SHORTCUTS: Record<string, LinksTheme> = {
    d: 'day',
    n: 'night',
    m: 'midnight',
    r: 'rain',
    w: 'snow',
};

const isLinksTheme = (value: string | null): value is LinksTheme => {
    return value !== null && LINKS_THEMES.includes(value as LinksTheme);
};

const getSchemeForTheme = (mode: LinksTheme): ColorScheme => {
    return DARK_LINKS_THEMES.has(mode) ? 'dark' : 'light';
};

const persistThemeMode = (mode: LinksTheme, scheme: ColorScheme) => {
    localStorage.setItem(THEME_MODE_KEY, mode);
    localStorage.setItem(LEGACY_LINKS_THEME_KEY, mode);
    localStorage.setItem(LEGACY_COLOR_SCHEME_KEY, scheme);
};

const dispatchThemeEvents = (mode: LinksTheme, scheme: ColorScheme) => {
    window.dispatchEvent(new CustomEvent('onThemeModeChange', {
        detail: mode,
    }));

    window.dispatchEvent(new CustomEvent('onColorSchemeChange', {
        detail: scheme,
    }));
};

const shuffleItems = <T>(items: T[]) => {
    for (let index = items.length - 1; index > 0; index -= 1) {
        const randomIndex = Math.floor(Math.random() * (index + 1));
        [items[index], items[randomIndex]] = [items[randomIndex], items[index]];
    }

    return items;
};

const randomizeLinkCards = () => {
    document.querySelectorAll<HTMLElement>('[data-links-grid]').forEach(grid => {
        const cards = Array.from(grid.querySelectorAll<HTMLElement>('[data-links-card]'));
        if (cards.length < 2) return;

        shuffleItems(cards).forEach(card => grid.appendChild(card));
    });
};

const updateThemeDots = (mode: LinksTheme) => {
    document.querySelectorAll<HTMLElement>('[data-links-mode-option]').forEach(dot => {
        const isActive = dot.dataset.linksModeOption === mode;
        dot.classList.toggle('is-active', isActive);
        dot.setAttribute('aria-pressed', String(isActive));
    });
};

const showThemeToast = (mode: LinksTheme) => {
    const toast = document.getElementById('links-mode-toast');
    if (!toast) return;

    toast.textContent = LINKS_THEME_LABELS[mode];
    toast.classList.add('is-visible');

    window.clearTimeout(Number(toast.dataset.timeoutId || 0));
    const timeoutId = window.setTimeout(() => {
        toast.classList.remove('is-visible');
    }, 1400);

    toast.dataset.timeoutId = String(timeoutId);
};

const applyLinksTheme = (mode: LinksTheme, announce = false) => {
    const scheme = getSchemeForTheme(mode);

    document.documentElement.dataset.linksMode = mode;
    document.documentElement.dataset.themeMode = mode;
    document.documentElement.dataset.scheme = scheme;
    document.documentElement.style.colorScheme = scheme;
    persistThemeMode(mode, scheme);
    updateThemeDots(mode);
    dispatchThemeEvents(mode, scheme);

    if (announce) {
        showThemeToast(mode);
    }
};

const getInitialLinksTheme = (): LinksTheme => {
    const savedTheme = localStorage.getItem(THEME_MODE_KEY);
    if (isLinksTheme(savedTheme)) return savedTheme;

    const legacyLinksTheme = localStorage.getItem(LEGACY_LINKS_THEME_KEY);
    if (isLinksTheme(legacyLinksTheme)) return legacyLinksTheme;

    const currentDomTheme = document.documentElement.dataset.themeMode;
    if (isLinksTheme(currentDomTheme)) return currentDomTheme;

    const currentLinksTheme = document.documentElement.dataset.linksMode;
    if (isLinksTheme(currentLinksTheme)) return currentLinksTheme;

    return 'day';
};

const bindThemeSwitch = () => {
    const initialTheme = getInitialLinksTheme();
    applyLinksTheme(initialTheme);

    document.querySelectorAll<HTMLElement>('[data-links-mode-option]').forEach(dot => {
        dot.addEventListener('click', () => {
            const nextTheme = dot.dataset.linksModeOption;
            if (!isLinksTheme(nextTheme)) return;
            applyLinksTheme(nextTheme, true);
        });
    });

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

        const nextTheme = LINKS_THEME_SHORTCUTS[event.key.toLowerCase()];
        if (!nextTheme) return;

        applyLinksTheme(nextTheme, true);
    });
};

window.addEventListener('DOMContentLoaded', () => {
    const linksPage = document.body.classList.contains('links-page');

    if (!linksPage) return;

    randomizeLinkCards();
    bindThemeSwitch();
});

const textDecoder = new TextDecoder();
const textEncoder = new TextEncoder();

const decodeBase64ToBytes = (value: string) => {
    const normalized = value.trim();
    const binary = window.atob(normalized);
    return Uint8Array.from(binary, char => char.charCodeAt(0));
};

const deriveDecryptKey = async (password: string, salt: Uint8Array) => {
    const baseKey = await window.crypto.subtle.importKey(
        'raw',
        textEncoder.encode(password),
        'PBKDF2',
        false,
        ['deriveKey']
    );

    return await window.crypto.subtle.deriveKey(
        {
            name: 'PBKDF2',
            salt,
            iterations: 100000,
            hash: 'SHA-256',
        },
        baseKey,
        {
            name: 'AES-GCM',
            length: 256,
        },
        false,
        ['decrypt']
    );
};

const rerenderMath = (root: HTMLElement) => {
    const renderMath = (window as Window & {
        renderMathInElement?: (element: Element, options: Record<string, unknown>) => void;
    }).renderMathInElement;

    if (typeof renderMath !== 'function') return;

    renderMath(root, {
        delimiters: [
            { left: '$$', right: '$$', display: true },
            { left: '$', right: '$', display: false },
            { left: '\\(', right: '\\)', display: false },
            { left: '\\[', right: '\\]', display: true },
        ],
        ignoredClasses: ['gist'],
    });
};

const hydrateEncryptedContent = (scope: ParentNode = document) => {
    scope.querySelectorAll<HTMLElement>('.encrypt-locked').forEach(locked => {
        if (locked.dataset.encryptBound === 'true') return;
        locked.dataset.encryptBound = 'true';

        const form = locked.querySelector<HTMLFormElement>('.encrypt-form');
        const input = locked.querySelector<HTMLInputElement>('.encrypt-input');
        const error = locked.querySelector<HTMLElement>('.encrypt-error');
        const button = locked.querySelector<HTMLButtonElement>('.encrypt-btn');

        if (!form || !input || !button) return;

        form.addEventListener('submit', async event => {
            event.preventDefault();

            const password = input.value;
            if (!password) {
                error?.removeAttribute('hidden');
                return;
            }

            const salt = locked.dataset.salt;
            const iv = locked.dataset.iv;
            const ct = locked.dataset.ct;
            if (!salt || !iv || !ct) return;

            button.disabled = true;
            button.textContent = 'Unlocking...';
            error?.setAttribute('hidden', '');

            try {
                const key = await deriveDecryptKey(password, decodeBase64ToBytes(salt));
                const plaintext = await window.crypto.subtle.decrypt(
                    {
                        name: 'AES-GCM',
                        iv: decodeBase64ToBytes(iv),
                    },
                    key,
                    decodeBase64ToBytes(ct)
                );

                const container = locked.closest<HTMLElement>('.encrypt-container');
                if (!container) return;

                container.innerHTML = textDecoder.decode(plaintext);
                hydrateEncryptedContent(container);
                rerenderMath(container);
            } catch (decryptError) {
                console.error('Failed to unlock encrypted content', decryptError);
                error?.removeAttribute('hidden');
            } finally {
                button.disabled = false;
                button.textContent = 'Unlock';
            }
        });
    });
};

window.addEventListener('DOMContentLoaded', () => {
    hydrateEncryptedContent();
});

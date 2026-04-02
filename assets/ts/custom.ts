const LINKS_THEME_KEY = 'BaozongwiLinksThemeMode';
const LINKS_THEMES = ['day', 'sunny', 'night', 'midnight', 'rain', 'snow'] as const;

type LinksTheme = typeof LINKS_THEMES[number];

const LINKS_THEME_LABELS: Record<LinksTheme, string> = {
    day: 'Day',
    sunny: 'Sunny',
    night: 'Night',
    midnight: 'Moonlight',
    rain: 'Rainy',
    snow: 'Snowy',
};

const LINKS_THEME_SHORTCUTS: Record<string, LinksTheme> = {
    d: 'day',
    s: 'sunny',
    n: 'night',
    m: 'midnight',
    r: 'rain',
    w: 'snow',
};

const isLinksTheme = (value: string | null): value is LinksTheme => {
    return value !== null && LINKS_THEMES.includes(value as LinksTheme);
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
    document.documentElement.dataset.linksMode = mode;
    localStorage.setItem(LINKS_THEME_KEY, mode);
    window.dispatchEvent(new CustomEvent('onLinksThemeChange', {
        detail: mode,
    }));
    updateThemeDots(mode);

    if (announce) {
        showThemeToast(mode);
    }
};

const bindThemeSwitch = () => {
    const savedTheme = localStorage.getItem(LINKS_THEME_KEY);
    const initialTheme = isLinksTheme(savedTheme) ? savedTheme : 'day';
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
        if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) return;

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

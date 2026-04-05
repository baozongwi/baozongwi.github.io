import menu from 'ts/menu';
import SignalColorScheme from 'ts/colorScheme';
import MoonOverlay from 'ts/moonOverlay';
import { setupScrollspy } from 'ts/scrollspy';
import { setupSmoothAnchors } from "ts/smoothAnchors";

type SearchEntry = {
    title: string;
    date: string;
    permalink: string;
    content: string;
    description?: string;
    tags?: string[];
    categories?: string[];
    image?: string;
}

type SearchIndexEntry = SearchEntry & {
    normalizedTitle: string;
    normalizedDescription: string;
    normalizedContent: string;
    normalizedTags: string[];
    normalizedCategories: string[];
}

const escapeHTML = (value: string) =>
    value
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#39;');

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const normalizeText = (value?: string) => (value ?? '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();

const highlightMatch = (value: string, query: string) => {
    const safeValue = escapeHTML(value);
    if (!query) return safeValue;

    const pattern = new RegExp(`(${escapeRegExp(query)})`, 'ig');
    return safeValue.replace(pattern, '<mark>$1</mark>');
}

const getExcerpt = (entry: SearchEntry, query: string) => {
    const source = `${entry.description ?? ''} ${entry.content ?? ''}`.replace(/\s+/g, ' ').trim();
    if (!source) return '打开文章查看完整内容';
    if (!query) return source.slice(0, 120);

    const lowerSource = source.toLowerCase();
    const index = lowerSource.indexOf(query.toLowerCase());
    if (index === -1) return source.slice(0, 120);

    const start = Math.max(0, index - 50);
    const end = Math.min(source.length, index + 90);
    const prefix = start > 0 ? '…' : '';
    const suffix = end < source.length ? '…' : '';

    return `${prefix}${source.slice(start, end)}${suffix}`;
}

const isEditableTarget = (target: EventTarget | null) => {
    if (!(target instanceof HTMLElement)) return false;
    if (target.isContentEditable) return true;

    const tagName = target.tagName.toLowerCase();
    return ['input', 'textarea', 'select'].includes(tagName);
}

const setupActionFeedback = () => {
    const actionSelectors = [
        '.copyCodeButton',
        '.menu-social a',
        '#main-menu li a',
        '#main-menu li button',
        '.pagination .page-link',
        '.not-found-action',
        '.back-to-top'
    ];

    document.querySelectorAll<HTMLElement>(actionSelectors.join(', ')).forEach(actionEl => {
        actionEl.addEventListener('click', () => {
            actionEl.classList.remove('is-pressed');
            window.requestAnimationFrame(() => {
                actionEl.classList.add('is-pressed');
                window.setTimeout(() => actionEl.classList.remove('is-pressed'), 220);
            });
        });
    });
}

const setupSearchModal = () => {
    const searchModal = document.querySelector<HTMLElement>('[data-search-modal]');
    if (!searchModal) return;

    const searchInput = searchModal.querySelector<HTMLInputElement>('[data-search-input]');
    const searchResults = searchModal.querySelector<HTMLElement>('[data-search-results]');
    const searchStatus = searchModal.querySelector<HTMLElement>('[data-search-status]');
    const openTriggers = document.querySelectorAll<HTMLElement>('.js-search-open');
    const closeTriggers = searchModal.querySelectorAll<HTMLElement>('[data-search-close]');
    const searchIndexUrl = searchModal.dataset.searchIndexUrl;
    const readyText = searchModal.dataset.readyText ?? '输入标题、标签或正文关键词';
    const emptyText = searchModal.dataset.emptyText ?? '最近更新';
    const noResultsText = searchModal.dataset.noResultsText ?? '没有找到匹配内容';
    const loadingText = searchModal.dataset.loadingText ?? '正在载入搜索索引…';
    const errorText = searchModal.dataset.errorText ?? '搜索索引加载失败，请稍后再试';

    if (!searchInput || !searchResults || !searchStatus || !searchIndexUrl) return;

    let searchIndexPromise: Promise<SearchIndexEntry[]> | null = null;
    let isOpen = false;
    let closingTimer: number | null = null;
    let searchInputFrame: number | null = null;

    const loadSearchIndex = async () => {
        if (!searchIndexPromise) {
            searchStatus.textContent = loadingText;
            searchIndexPromise = fetch(searchIndexUrl, {
                headers: {
                    Accept: 'application/json'
                }
            })
                .then(async response => {
                    if (!response.ok) {
                        throw new Error(`Failed to load search index: ${response.status}`);
                    }

                    return await response.json() as SearchEntry[];
                })
                .then(entries => entries.map(entry => ({
                    ...entry,
                    tags: entry.tags ?? [],
                    categories: entry.categories ?? [],
                    normalizedTitle: normalizeText(entry.title),
                    normalizedDescription: normalizeText(entry.description),
                    normalizedContent: normalizeText(entry.content),
                    normalizedTags: (entry.tags ?? []).map(tag => normalizeText(tag)),
                    normalizedCategories: (entry.categories ?? []).map(category => normalizeText(category)),
                })));
        }

        return await searchIndexPromise;
    }

    const renderResults = (entries: SearchEntry[], query: string) => {
        if (!entries.length) {
            searchStatus.textContent = noResultsText;
            searchResults.innerHTML = '';
            return;
        }

        searchStatus.textContent = query
            ? `找到 ${entries.length} 篇相关文章`
            : `${emptyText} · 共展示 ${entries.length} 篇`;

        searchResults.innerHTML = entries.map(entry => {
            const metaParts = [entry.date];
            if (entry.categories && entry.categories.length) {
                metaParts.push(...entry.categories.slice(0, 2));
            }

            const tags = entry.tags?.slice(0, 3) ?? [];
            const excerpt = getExcerpt(entry, query);

            return `
                <a class="search-hit" href="${entry.permalink}">
                    ${entry.image ? `
                        <span class="search-hit__thumb">
                            <img src="${entry.image}" alt="${escapeHTML(entry.title)}" loading="lazy">
                        </span>
                    ` : ''}
                    <span class="search-hit__body">
                        <span class="search-hit__meta">${escapeHTML(metaParts.filter(Boolean).join(' · '))}</span>
                        <strong class="search-hit__title">${highlightMatch(entry.title, query)}</strong>
                        <span class="search-hit__excerpt">${highlightMatch(excerpt, query)}</span>
                        ${tags.length ? `
                            <span class="search-hit__tags">
                                ${tags.map(tag => `<span>${escapeHTML(tag)}</span>`).join('')}
                            </span>
                        ` : ''}
                    </span>
                </a>
            `;
        }).join('');
    }

    const scoreEntry = (entry: SearchIndexEntry, normalizedQuery: string) => {
        let score = 0;

        if (entry.normalizedTitle.includes(normalizedQuery)) score += 18;
        if (entry.normalizedTags.some(tag => tag.includes(normalizedQuery))) score += 10;
        if (entry.normalizedCategories.some(category => category.includes(normalizedQuery))) score += 8;
        if (entry.normalizedDescription.includes(normalizedQuery)) score += 6;
        if (entry.normalizedContent.includes(normalizedQuery)) score += 4;

        return score;
    }

    const performSearch = async (query: string) => {
        try {
            const searchEntries = await loadSearchIndex();
            const normalizedQuery = normalizeText(query);

            if (!normalizedQuery) {
                renderResults(searchEntries.slice(0, 8), '');
                return;
            }

            const matches = searchEntries
                .map(entry => ({
                    entry,
                    score: scoreEntry(entry, normalizedQuery)
                }))
                .filter(item => item.score > 0)
                .sort((left, right) => {
                    if (right.score !== left.score) {
                        return right.score - left.score;
                    }

                    return new Date(right.entry.date).getTime() - new Date(left.entry.date).getTime();
                })
                .slice(0, 12)
                .map(item => item.entry);

            renderResults(matches, normalizedQuery);
        } catch (error) {
            console.error(error);
            searchStatus.textContent = errorText;
            searchResults.innerHTML = '';
        }
    }

    const openSearch = () => {
        if (closingTimer) {
            window.clearTimeout(closingTimer);
            closingTimer = null;
        }

        isOpen = true;
        searchModal.hidden = false;
        searchModal.setAttribute('aria-hidden', 'false');
        document.body.classList.add('search-modal-open');
        window.requestAnimationFrame(() => searchModal.classList.add('is-visible'));
        searchStatus.textContent = readyText;
        void performSearch(searchInput.value);

        window.setTimeout(() => {
            searchInput.focus();
            searchInput.select();
        }, 80);
    }

    const closeSearch = () => {
        isOpen = false;
        searchModal.classList.remove('is-visible');
        searchModal.setAttribute('aria-hidden', 'true');
        document.body.classList.remove('search-modal-open');

        closingTimer = window.setTimeout(() => {
            if (!isOpen) {
                searchModal.hidden = true;
            }
        }, 220);
    }

    openTriggers.forEach(trigger => {
        trigger.addEventListener('click', () => openSearch());
    });

    closeTriggers.forEach(trigger => {
        trigger.addEventListener('click', () => closeSearch());
    });

    searchInput.addEventListener('input', () => {
        if (searchInputFrame !== null) {
            window.cancelAnimationFrame(searchInputFrame);
        }

        searchInputFrame = window.requestAnimationFrame(() => {
            searchInputFrame = null;
            void performSearch(searchInput.value);
        });
    });

    document.addEventListener('keydown', event => {
        if (event.key === 'Escape' && isOpen) {
            event.preventDefault();
            closeSearch();
            return;
        }

        const shouldOpenWithShortcut = event.key.toLowerCase() === 'k' && (event.metaKey || event.ctrlKey);
        const shouldOpenWithSlash = event.key === '/' && !event.metaKey && !event.ctrlKey && !event.altKey;

        if ((shouldOpenWithShortcut || shouldOpenWithSlash) && !isEditableTarget(document.activeElement)) {
            event.preventDefault();
            openSearch();
        }
    });
}

const SignalTheme = {
    init: () => {
        menu();
        setupActionFeedback();
        setupSearchModal();

        const articleContent = document.querySelector('.article-content') as HTMLElement;
        if (articleContent) {
            setupSmoothAnchors();

            if (document.getElementById('TableOfContents')) {
                setupScrollspy();
            }
        }

        const codeBlocks = document.querySelectorAll<HTMLElement>('.article-content pre');
        const copiedText = `copied`;
        const coarsePointerMedia = window.matchMedia('(hover: none), (pointer: coarse)');

        codeBlocks.forEach(pre => {
            const parent = pre.parentElement;
            const host = parent?.classList.contains('highlight') ? parent as HTMLElement : pre;
            if (host.querySelector('.copyCodeButton')) return;

            const copyHotspot = document.createElement('div');
            copyHotspot.classList.add('copyCodeHotspot');
            copyHotspot.setAttribute('aria-hidden', 'true');

            const copyButton = document.createElement('button');
            copyButton.type = 'button';
            copyButton.setAttribute('aria-label', 'Copy code');
            copyButton.setAttribute('title', 'Copy code');
            copyButton.classList.add('copyCodeButton');
            host.append(copyHotspot);
            host.append(copyButton);

            let hideCopyTimer: number | null = null;
            const showCopyButton = () => {
                if (hideCopyTimer) {
                    window.clearTimeout(hideCopyTimer);
                    hideCopyTimer = null;
                }
                host.classList.add('is-copy-active');
            };

            const hideCopyButton = () => {
                if (coarsePointerMedia.matches) return;
                host.classList.remove('is-copy-active');
            };

            const scheduleHideCopyButton = () => {
                if (coarsePointerMedia.matches) return;
                if (hideCopyTimer) {
                    window.clearTimeout(hideCopyTimer);
                }
                hideCopyTimer = window.setTimeout(() => {
                    host.classList.remove('is-copy-active');
                    hideCopyTimer = null;
                }, 120);
            };

            copyHotspot.addEventListener('mouseenter', showCopyButton);
            copyHotspot.addEventListener('mouseleave', scheduleHideCopyButton);
            copyButton.addEventListener('mouseenter', showCopyButton);
            copyButton.addEventListener('mouseleave', scheduleHideCopyButton);
            copyButton.addEventListener('focus', showCopyButton);
            copyButton.addEventListener('blur', scheduleHideCopyButton);
            host.addEventListener('mouseleave', hideCopyButton);

            copyButton.addEventListener('click', () => {
                navigator.clipboard.writeText(pre.querySelector('code')?.textContent ?? pre.textContent ?? '')
                    .then(() => {
                        copyButton.textContent = copiedText;
                        copyButton.classList.add('is-copied');

                        setTimeout(() => {
                            copyButton.textContent = '';
                            copyButton.classList.remove('is-copied');
                        }, 1000);
                    })
                    .catch(err => {
                        console.log('Something went wrong', err);
                    });
            });
        });

        new SignalColorScheme(document.getElementById('dark-mode-toggle'));
        new MoonOverlay();

        const backToTopBtn = document.getElementById('back-to-top') as HTMLButtonElement;
        if (backToTopBtn) {
            const toggleBtn = () => {
                const threshold = 300;
                if (window.scrollY > threshold) backToTopBtn.classList.add('show');
                else backToTopBtn.classList.remove('show');
            };
            window.addEventListener('scroll', toggleBtn, { passive: true });
            toggleBtn();
            backToTopBtn.addEventListener('click', () => {
                window.scrollTo({ top: 0, behavior: 'smooth' });
            });
        }
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        SignalTheme.init();
    }, { once: true });
} else {
    SignalTheme.init();
}

declare global {
    interface Window {
        SignalTheme: any
    }
}

window.SignalTheme = SignalTheme;

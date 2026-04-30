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

window.addEventListener('DOMContentLoaded', () => {
    randomizeLinkCards();
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

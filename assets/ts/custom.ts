const shuffleNodes = (container: HTMLElement) => {
    const items = Array.from(container.querySelectorAll<HTMLElement>('[data-links-item]'));
    if (items.length < 2) return;

    for (let index = items.length - 1; index > 0; index -= 1) {
        const randomIndex = Math.floor(Math.random() * (index + 1));
        [items[index], items[randomIndex]] = [items[randomIndex], items[index]];
    }

    items.forEach(item => container.appendChild(item));
}

window.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll<HTMLElement>('[data-links-wall]').forEach(shuffleNodes);
});

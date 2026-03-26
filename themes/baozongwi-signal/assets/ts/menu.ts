export default function () {
    const toggleMenu = document.getElementById('toggle-menu') as HTMLButtonElement | null;
    const sidebar = document.querySelector('.left-sidebar') as HTMLElement | null;
    const closeTriggers = document.querySelectorAll<HTMLElement>('[data-menu-close]');
    const menuLinks = document.querySelectorAll<HTMLElement>('#main-menu a');
    const mobileMedia = window.matchMedia('(max-width: 767px)');

    if (!toggleMenu || !sidebar) return;

    const setMenuState = (isOpen: boolean) => {
        document.body.classList.toggle('show-menu', isOpen);
        toggleMenu.classList.toggle('is-active', isOpen);
        toggleMenu.setAttribute('aria-expanded', String(isOpen));
        sidebar.toggleAttribute('data-open', isOpen);
    };

    const closeMenu = () => setMenuState(false);

    toggleMenu.addEventListener('click', () => {
        if (!mobileMedia.matches) return;
        setMenuState(!document.body.classList.contains('show-menu'));
    });

    closeTriggers.forEach(trigger => {
        trigger.addEventListener('click', () => closeMenu());
    });

    menuLinks.forEach(link => {
        link.addEventListener('click', () => {
            if (mobileMedia.matches) {
                closeMenu();
            }
        });
    });

    document.addEventListener('keydown', event => {
        if (event.key === 'Escape' && document.body.classList.contains('show-menu')) {
            closeMenu();
        }
    });

    mobileMedia.addEventListener('change', event => {
        if (!event.matches) {
            closeMenu();
        }
    });
}

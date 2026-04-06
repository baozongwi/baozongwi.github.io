export default function () {
    const toggleMenu = document.getElementById('toggle-menu') as HTMLButtonElement | null;
    const sidebar = document.querySelector('.left-sidebar') as HTMLElement | null;
    const sidebarContent = sidebar?.querySelector('.left-sidebar__content') as HTMLElement | null;
    const closeTriggers = document.querySelectorAll<HTMLElement>('[data-menu-close]');
    const menuLinks = document.querySelectorAll<HTMLElement>('#main-menu a');
    const menuButtons = document.querySelectorAll<HTMLElement>('#main-menu button');
    const mobileMedia = window.matchMedia('(max-width: 767px)');
    const mobileHomeTarget = toggleMenu?.dataset.mobileHomeTarget;

    if (!toggleMenu || !sidebar || !sidebarContent) return;

    const syncSidebarScrollState = () => {
        const isScrollable = mobileMedia.matches && sidebarContent.scrollHeight > sidebarContent.clientHeight + 1;
        sidebarContent.toggleAttribute('data-scrollable', isScrollable);
    };

    const queueSidebarScrollSync = () => {
        window.requestAnimationFrame(syncSidebarScrollState);
    };

    const setMenuState = (isOpen: boolean) => {
        document.body.classList.toggle('show-menu', isOpen);
        toggleMenu.classList.toggle('is-active', isOpen);
        toggleMenu.setAttribute('aria-expanded', String(isOpen));
        sidebar.toggleAttribute('data-open', isOpen);
        queueSidebarScrollSync();
    };

    const closeMenu = () => setMenuState(false);

    toggleMenu.addEventListener('click', () => {
        if (!mobileMedia.matches) return;

        if (mobileHomeTarget) {
            window.location.assign(mobileHomeTarget);
            return;
        }

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

    menuButtons.forEach(button => {
        button.addEventListener('click', () => {
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
        queueSidebarScrollSync();
    });

    window.addEventListener('resize', queueSidebarScrollSync);

    if ('fonts' in document) {
        void document.fonts.ready.then(() => queueSidebarScrollSync());
    }

    queueSidebarScrollSync();
}

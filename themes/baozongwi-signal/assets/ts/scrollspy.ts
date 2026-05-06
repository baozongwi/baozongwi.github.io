// Implements a scroll spy system for the ToC, displaying the current section with an indicator and scrolling to it when needed.

// Inspired from https://gomakethings.com/debouncing-your-javascript-events/
function debounced(func: Function) {
    let timeout;
    return () => {
        if (timeout) {
            window.cancelAnimationFrame(timeout);
        }

        timeout = window.requestAnimationFrame(() => func());
    }
}

const headersQuery = ".article-content h1[id], .article-content h2[id], .article-content h3[id], .article-content h4[id], .article-content h5[id], .article-content h6[id]";
const tocQuery = "#TableOfContents";
const navigationQuery = "#TableOfContents li";
const activeClass = "active-class";
let refreshScrollspy: (() => void) | null = null;
let cleanupScrollspy: (() => void) | null = null;
let boundScrollspyToc: HTMLElement | null = null;
let boundArticleContent: Element | null = null;

function scrollToTocElement(tocElement: HTMLElement, scrollableNavigation: HTMLElement) {
    const link = tocElement.querySelector("a");
    if (!link) return;

    let textHeight = link.offsetHeight;
    let scrollTop = tocElement.offsetTop - scrollableNavigation.offsetHeight / 2 + textHeight / 2 - scrollableNavigation.offsetTop;
    if (scrollTop < 0) {
        scrollTop = 0;
    }
    scrollableNavigation.scrollTo({ top: scrollTop, behavior: "smooth" });
}

type IdToElementMap = { [key: string]: HTMLElement };

function buildIdToNavigationElementMap(navigation: NodeListOf<Element>): IdToElementMap {
    const sectionLinkRef: IdToElementMap = {};
    navigation.forEach((navigationElement: HTMLElement) => {
        const link = navigationElement.querySelector("a");
        if (link) {
            const href = link.getAttribute("href");
            if (href?.startsWith("#")) {
                sectionLinkRef[href.slice(1)] = navigationElement;
            }
        }
    });

    return sectionLinkRef;
}

function computeOffsets(headers: NodeListOf<Element>) {
    let sectionsOffsets = [];
    headers.forEach((header: HTMLElement) => { sectionsOffsets.push({ id: header.id, offset: header.offsetTop }) });
    sectionsOffsets.sort((a, b) => a.offset - b.offset);
    return sectionsOffsets;
}

function setupScrollspy() {
    let headers = document.querySelectorAll(headersQuery);
    if (!headers.length) {
        console.warn("No header matched query", headers);
        return;
    }

    let scrollableNavigation = document.querySelector(tocQuery) as HTMLElement | undefined;
    if (!scrollableNavigation) {
        console.warn("No toc matched query", tocQuery);
        return;
    }

    let navigation = document.querySelectorAll(navigationQuery);
    if (!navigation.length) {
        console.warn("No navigation matched query", navigationQuery);
        return;
    }

    const articleContent = document.querySelector(".article-content");

    if (
        refreshScrollspy
        && boundScrollspyToc === scrollableNavigation
        && boundArticleContent === articleContent
    ) {
        refreshScrollspy();
        return;
    }

    cleanupScrollspy?.();
    cleanupScrollspy = null;
    refreshScrollspy = null;
    boundScrollspyToc = scrollableNavigation;
    boundArticleContent = articleContent;

    let sectionsOffsets = computeOffsets(headers);

    // We need to avoid scrolling when the user is actively interacting with the ToC. Otherwise, if the user clicks on a link in the ToC,
    // we would scroll their view, which is not optimal usability-wise.
    let tocHovered: boolean = false;
    const handleTocMouseEnter = debounced(() => tocHovered = true);
    const handleTocMouseLeave = debounced(() => tocHovered = false);
    scrollableNavigation.addEventListener("mouseenter", handleTocMouseEnter);
    scrollableNavigation.addEventListener("mouseleave", handleTocMouseLeave);

    let activeSectionLink: Element;

    let idToNavigationElement: IdToElementMap = buildIdToNavigationElementMap(navigation);

    function scrollHandler() {
        let scrollPosition = document.documentElement.scrollTop || document.body.scrollTop;

        let newActiveSection: HTMLElement | undefined;

        // Find the section that is currently active.
        // It is possible for no section to be active, so newActiveSection may be undefined.
        for (let index = sectionsOffsets.length - 1; index >= 0; index -= 1) {
            const section = sectionsOffsets[index];

            if (scrollPosition >= section.offset - 20) {
                newActiveSection = document.getElementById(section.id) ?? undefined;
                break;
            }
        }

        // Find the link for the active section. Once again, there are a few edge cases:
        // - No active section = no link => undefined
        // - No active section but the link does not exist in toc (e.g. because it is outside of the applicable ToC levels) => undefined
        let newActiveSectionLink: HTMLElement | undefined
        if (newActiveSection) {
            newActiveSectionLink = idToNavigationElement[newActiveSection.id];
        }

        if (newActiveSection && !newActiveSectionLink) {
            // The active section does not have a link in the ToC, so we can't scroll to it.
            console.debug("No link found for section", newActiveSection);
        } else if (newActiveSectionLink !== activeSectionLink) {
            if (activeSectionLink)
                activeSectionLink.classList.remove(activeClass);
            if (newActiveSectionLink) {
                newActiveSectionLink.classList.add(activeClass);
                if (!tocHovered) {
                    // Scroll so that newActiveSectionLink is in the middle of scrollableNavigation, except when it's from a manual click (hence the tocHovered check)
                    scrollToTocElement(newActiveSectionLink, scrollableNavigation);
                }
            }
            activeSectionLink = newActiveSectionLink;
        }
    }

    const handleScroll = debounced(scrollHandler);
    window.addEventListener("scroll", handleScroll, { passive: true });
    
    // Resizing may cause the offset values to change: recompute them.
    function resizeHandler() {
        headers = document.querySelectorAll(headersQuery);
        navigation = document.querySelectorAll(navigationQuery);
        idToNavigationElement = buildIdToNavigationElementMap(navigation);
        sectionsOffsets = computeOffsets(headers);
        scrollHandler();
    }

    const handleResize = debounced(resizeHandler);
    refreshScrollspy = resizeHandler;

    let resizeObserver: ResizeObserver | null = null;
    // Use ResizeObserver to detect changes in the size of .article-content
    if (articleContent && 'ResizeObserver' in window) {
        resizeObserver = new ResizeObserver(handleResize);
        resizeObserver.observe(articleContent);
    }

    window.addEventListener("resize", handleResize);

    cleanupScrollspy = () => {
        window.removeEventListener("scroll", handleScroll);
        window.removeEventListener("resize", handleResize);
        scrollableNavigation.removeEventListener("mouseenter", handleTocMouseEnter);
        scrollableNavigation.removeEventListener("mouseleave", handleTocMouseLeave);
        resizeObserver?.disconnect();
    };

    scrollHandler();
}

export { setupScrollspy };

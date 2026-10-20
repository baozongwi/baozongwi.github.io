(function () {
  var notes = Array.from(document.querySelectorAll('.hover-note'));
  if (!notes.length) return;

  var margin = 12;
  var gap = 10;
  var navbarClearance = 78;
  var activeNote = null;
  var fineHover = window.matchMedia('(hover: hover) and (pointer: fine)');

  function useHover() {
    return fineHover.matches;
  }

  function cardMax() {
    var root = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
    return Math.max(160, Math.min(root * 22, window.innerWidth - margin * 2));
  }

  function resetStory(note) {
    var story = note.querySelector('.hover-note__story');
    if (!story) return;
    story.style.left = '';
    story.style.width = '';
    story.style.maxWidth = '';
    story.style.transform = '';
    story.style.transition = '';
  }

  // Pixel left, not translate(-50%). The show transition interpolates
  // transform, so a measurement taken during that slide is not the final box.
  function place(note) {
    var story = note.querySelector('.hover-note__story');
    if (!story) return;

    note.classList.add('is-ready');
    story.style.transition = 'none';
    story.style.transform = 'none';
    story.style.left = '0px';
    story.style.width = 'max-content';
    story.style.maxWidth = cardMax() + 'px';

    var anchor = note.getBoundingClientRect();
    var width = story.offsetWidth;
    var height = story.offsetHeight;
    var left = anchor.left + (anchor.width - width) / 2;
    var maxLeft = window.innerWidth - margin - width;
    if (left < margin) left = margin;
    if (left > maxLeft) left = Math.max(margin, maxLeft);
    story.style.left = (left - anchor.left) + 'px';

    var fitsAbove = anchor.top - height - gap >= navbarClearance;
    note.dataset.hoverNotePlacement = fitsAbove ? 'top' : 'bottom';
    story.style.transition = '';
  }

  function close(note) {
    if (!note) return;
    resetStory(note);
    note.classList.remove('is-open', 'is-ready');
    note.classList.add('is-dismissed');
    note.setAttribute('aria-expanded', 'false');
    if (note.contains(document.activeElement) && !useHover()) document.activeElement.blur();
    if (activeNote === note) activeNote = null;
  }

  function closeAll() {
    notes.forEach(close);
  }

  function open(note) {
    notes.forEach(function (other) {
      if (other !== note) close(other);
    });
    note.classList.remove('is-dismissed');
    place(note);
    note.classList.add('is-open');
    note.setAttribute('aria-expanded', 'true');
    activeNote = note;
  }

  notes.forEach(function (note) {
    var skipClick = false;

    note.addEventListener('pointerenter', function () {
      if (!useHover()) return;
      note.classList.remove('is-dismissed');
      activeNote = note;
      place(note);
    });

    note.addEventListener('pointerleave', function () {
      if (!useHover()) return;
      close(note);
    });

    // Touch focuses the word before click. Opening here and then toggling
    // on click would flash the card shut. Swallow that following click.
    note.addEventListener('focus', function () {
      if (useHover() && !note.matches(':focus-visible')) return;
      open(note);
      if (!useHover()) skipClick = true;
    });

    note.addEventListener('blur', function () {
      if (!useHover()) return;
      window.setTimeout(function () {
        if (!note.contains(document.activeElement)) close(note);
      }, 0);
    });

    note.addEventListener('click', function (e) {
      if (e.target.closest('a')) {
        close(note);
        return;
      }
      if (useHover()) return;
      if (skipClick) {
        skipClick = false;
        return;
      }
      if (note.classList.contains('is-open')) close(note);
      else open(note);
    });

    note.addEventListener('keydown', function (e) {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      if (e.target.closest('a')) return;
      e.preventDefault();
      if (note.classList.contains('is-open')) close(note);
      else open(note);
    });
  });

  document.addEventListener('pointerdown', function (e) {
    if (e.target.closest('.hover-note')) return;
    closeAll();
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') closeAll();
  });

  function repositionOpen() {
    if (activeNote && activeNote.classList.contains('is-open')) place(activeNote);
    else if (activeNote && useHover() && !activeNote.classList.contains('is-dismissed')) place(activeNote);
  }

  window.addEventListener('resize', repositionOpen);
  window.addEventListener('scroll', repositionOpen, { passive: true });
  fineHover.addEventListener('change', closeAll);
  window.addEventListener('pagehide', closeAll);
  window.addEventListener('pageshow', closeAll);
  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'hidden') closeAll();
  });
})();

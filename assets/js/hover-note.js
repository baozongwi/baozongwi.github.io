(function () {
  var notes = Array.from(document.querySelectorAll('.hover-note'));
  if (!notes.length) return;

  var viewportMargin = 12;
  var gap = 10;
  var activeNote = null;

  function positionNote(note) {
    var story = note.querySelector('.hover-note__story');
    if (!story) return;

    note.style.setProperty('--hover-note-shift', '0px');
    var anchorRect = note.getBoundingClientRect();
    var storyRect = story.getBoundingClientRect();
    var fitsAbove = anchorRect.top >= storyRect.height + gap + viewportMargin;
    note.dataset.hoverNotePlacement = fitsAbove ? 'top' : 'bottom';

    storyRect = story.getBoundingClientRect();
    var shift = 0;
    var overflowLeft = viewportMargin - storyRect.left;
    var overflowRight = storyRect.right - (window.innerWidth - viewportMargin);
    if (overflowLeft > 0) shift += overflowLeft;
    if (overflowRight > 0) shift -= overflowRight;
    note.style.setProperty('--hover-note-shift', shift + 'px');
  }

  function dismiss(note) {
    if (!note) return;
    note.classList.add('is-dismissed');
    if (note.contains(document.activeElement)) document.activeElement.blur();
    if (activeNote === note) activeNote = null;
  }

  function dismissAll() {
    notes.forEach(dismiss);
  }

  notes.forEach(function (note) {
    note.addEventListener('pointerenter', function () {
      note.classList.remove('is-dismissed');
      activeNote = note;
      positionNote(note);
    });
    note.addEventListener('pointerleave', function () {
      dismiss(note);
    });
    note.addEventListener('click', function (e) {
      if (!e.target.closest('a')) return;
      dismiss(note);
    });
  });

  function repositionActiveNote() {
    if (activeNote && !activeNote.classList.contains('is-dismissed')) positionNote(activeNote);
  }

  window.addEventListener('resize', repositionActiveNote);
  window.addEventListener('scroll', repositionActiveNote, { passive: true });
  window.addEventListener('pagehide', dismissAll);
  window.addEventListener('pageshow', dismissAll);
  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'hidden') dismissAll();
  });
})();

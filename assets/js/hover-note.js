(function () {
  var notes = Array.from(document.querySelectorAll('.hover-note'));
  if (!notes.length) return;

  var viewportMargin = 12;
  var gap = 10;
  var activeNote = null;

  function clamp(value, minimum, maximum) {
    return Math.min(Math.max(value, minimum), maximum);
  }

  function positionNote(note) {
    var story = note.querySelector('.hover-note__story');
    if (!story) return;

    var anchorRect = note.getBoundingClientRect();
    var storyRect = story.getBoundingClientRect();
    var halfWidth = storyRect.width / 2;
    var center = clamp(
      anchorRect.left + anchorRect.width / 2,
      viewportMargin + halfWidth,
      window.innerWidth - viewportMargin - halfWidth
    );
    var fitsAbove = anchorRect.top >= storyRect.height + gap + viewportMargin;
    var placement = fitsAbove ? 'top' : 'bottom';
    var y = fitsAbove ? anchorRect.top - gap : anchorRect.bottom + gap;

    note.dataset.hoverNotePlacement = placement;
    note.style.setProperty('--hover-note-x', center + 'px');
    note.style.setProperty('--hover-note-y', y + 'px');
  }

  function activate(note) {
    activeNote = note;
    positionNote(note);
  }

  notes.forEach(function (note) {
    note.addEventListener('pointerenter', function () { activate(note); });
    note.addEventListener('focus', function () { activate(note); });
    note.addEventListener('pointerleave', function () {
      if (activeNote === note && document.activeElement !== note) activeNote = null;
    });
    note.addEventListener('blur', function () {
      if (activeNote === note && !note.matches(':hover')) activeNote = null;
    });
  });

  function repositionActiveNote() {
    if (activeNote) positionNote(activeNote);
  }

  window.addEventListener('resize', repositionActiveNote);
  window.addEventListener('scroll', repositionActiveNote, { passive: true });
  document.documentElement.classList.add('has-hover-notes');
})();

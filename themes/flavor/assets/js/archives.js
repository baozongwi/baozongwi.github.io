// Archives filter. The year chips are plain anchors and need no JS; this only
// narrows the already-rendered list by title + description, hides the year
// sections that end up empty, and keeps each year's count in step.
(function() {
  var input = document.getElementById('archives-filter');
  var hit = document.getElementById('archives-hit');
  var empty = document.getElementById('archives-empty');
  if (!input) return;

  function normalise(s) {
    return (s || '').toLowerCase().replace(/\s+/g, ' ').trim();
  }

  var entries = Array.prototype.slice.call(document.querySelectorAll('.archives-year')).map(function(section) {
    var rows = Array.prototype.slice.call(section.querySelectorAll('.archives-list > li'));
    return {
      section: section,
      count: section.querySelector('.archives-year__count'),
      rows: rows,
      text: rows.map(function(li) { return normalise(li.textContent); })
    };
  });

  var total = entries.reduce(function(n, e) { return n + e.rows.length; }, 0);

  function apply() {
    var q = normalise(input.value);
    var shown = 0;

    entries.forEach(function(entry) {
      var visible = 0;
      entry.rows.forEach(function(li, i) {
        var match = !q || entry.text[i].indexOf(q) !== -1;
        li.hidden = !match;
        if (match) visible++;
      });
      entry.section.hidden = visible === 0;
      if (entry.count) {
        entry.count.textContent = q ? visible + ' / ' + entry.rows.length + ' posts' : entry.rows.length + ' posts';
      }
      shown += visible;
    });

    if (empty) empty.hidden = shown !== 0;
    if (hit) hit.textContent = q ? shown + ' / ' + total : '';
  }

  input.addEventListener('input', apply);
  input.addEventListener('search', apply);
  window.addEventListener('pageshow', apply);
  apply();
})();

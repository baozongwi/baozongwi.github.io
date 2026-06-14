document.querySelectorAll('.article-content blockquote').forEach(function (bq) {
  var links = [];
  var isRef = true;

  for (var i = 0; i < bq.childNodes.length; i++) {
    var node = bq.childNodes[i];
    if (node.nodeType === 3 && !node.textContent.trim()) continue;
    if (node.nodeType !== 1 || node.tagName !== 'P') { isRef = false; break; }

    for (var j = 0; j < node.childNodes.length; j++) {
      var child = node.childNodes[j];
      if (child.nodeType === 3 && !child.textContent.trim()) continue;
      if (child.nodeType === 1 && child.tagName === 'BR') continue;
      if (child.nodeType === 1 && child.tagName === 'A' && /^https?:\/\//.test(child.href)) {
        links.push({ text: child.textContent, href: child.href });
        continue;
      }
      isRef = false;
      break;
    }
    if (!isRef) break;
  }

  if (!isRef || links.length === 0) return;

  bq.innerHTML = '';
  bq.classList.add('ref-links');
  links.forEach(function (link) {
    var div = document.createElement('div');
    div.className = 'ref-links__item';
    var a = document.createElement('a');
    a.href = link.href;
    a.textContent = link.text;
    a.target = '_blank';
    a.rel = 'noopener';
    div.appendChild(a);
    bq.appendChild(div);
  });
});

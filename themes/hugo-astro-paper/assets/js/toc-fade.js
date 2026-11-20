/* Long tables of contents only — ported from the flavor theme.
   The median post has six headings, so most lists are shown whole. Above
   LONG_THRESHOLD entries the list is capped (see .is-long in the css) and
   this adds a bottom fade while it actually overflows — the scrollbar
   itself stays hidden so the list never turns back into a framed panel. */
(function () {
  var LONG_THRESHOLD = 25;

  var block = document.querySelector(".post-toc");
  var body = block && block.querySelector(".post-toc__body");
  if (!body) return;

  function update() {
    var items = body.querySelectorAll("li").length;
    var long = items > LONG_THRESHOLD;
    block.classList.toggle("is-long", long);
    if (!long) {
      body.classList.remove("is-clipped");
      return;
    }
    body.classList.toggle("is-clipped", body.scrollHeight > body.clientHeight + 2);
  }

  update();
  window.addEventListener("resize", update);
})();

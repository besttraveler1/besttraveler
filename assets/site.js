(function () {
  var d = document, root = d.documentElement;
  function $(s, c) { return (c || d).querySelector(s); }
  function $$(s, c) { return Array.prototype.slice.call((c || d).querySelectorAll(s)); }

  // theme
  $$('[data-theme-toggle]').forEach(function (b) {
    b.addEventListener('click', function () {
      var cur = root.getAttribute('data-theme') ||
        (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
      var next = cur === 'dark' ? 'light' : 'dark';
      root.setAttribute('data-theme', next);
      try { localStorage.setItem('bt-theme', next); } catch (e) {}
    });
  });

  // mobile menu
  var mnav = $('#mnav');
  function setMenu(open) {
    if (!mnav) return;
    mnav.classList.toggle('open', open);
    $$('[data-menu]').forEach(function (b) { b.setAttribute('aria-expanded', open ? 'true' : 'false'); });
    d.body.style.overflow = open ? 'hidden' : '';
    if (open) { var f = $('a, button', mnav); if (f) f.focus(); }
  }
  $$('[data-menu]').forEach(function (b) { b.addEventListener('click', function () { setMenu(!mnav.classList.contains('open')); }); });
  $$('[data-menu-close]').forEach(function (b) { b.addEventListener('click', function () { setMenu(false); }); });
  d.addEventListener('keydown', function (e) { if (e.key === 'Escape' && mnav && mnav.classList.contains('open')) setMenu(false); });

  // search
  var dlg = $('#sdlg'), idx = null;
  function norm(s) { return (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, ''); }
  function render(q) {
    var out = $('#sres'); if (!out) return;
    out.innerHTML = '';
    if (!idx) return;
    var words = norm(q).split(/\s+/).filter(Boolean);
    if (!words.length) return;
    var hits = idx.filter(function (it) {
      var t = it._n || (it._n = norm(it.t + ' ' + it.d + ' ' + (it.k || '')));
      return words.every(function (w) { return t.indexOf(w) > -1; });
    }).slice(0, 12);
    if (!hits.length) { out.innerHTML = '<li class="none">' + out.getAttribute('data-none') + '</li>'; return; }
    hits.forEach(function (it) {
      var li = d.createElement('li'), a = d.createElement('a'), s = d.createElement('small');
      a.href = it.u; a.textContent = it.t; s.textContent = it.d; a.appendChild(s); li.appendChild(a); out.appendChild(li);
    });
  }
  $$('[data-search]').forEach(function (b) {
    b.addEventListener('click', function () {
      if (!dlg || !dlg.showModal) { location.href = b.getAttribute('data-href'); return; }
      dlg.showModal();
      var inp = $('#sq'); inp.focus();
      if (!idx) fetch(dlg.getAttribute('data-src')).then(function (r) { return r.json(); })
        .then(function (j) { idx = j; render(inp.value); }).catch(function () {});
    });
  });
  if (dlg) {
    $('#sq').addEventListener('input', function (e) { render(e.target.value); });
    dlg.addEventListener('click', function (e) { if (e.target === dlg) dlg.close(); });
    $$('[data-sclose]').forEach(function (b) { b.addEventListener('click', function () { dlg.close(); }); });
  }

  // tour filters
  var grid = $('[data-filter-grid]');
  if (grid) {
    var chips = $$('[data-f]'), empty = $('[data-empty]');
    function apply(v) {
      var n = 0;
      $$('[data-tags]', grid).forEach(function (c) {
        var ok = v === 'all' || (' ' + c.getAttribute('data-tags') + ' ').indexOf(' ' + v + ' ') > -1;
        c.hidden = !ok; if (ok) n++;
      });
      chips.forEach(function (c) { c.setAttribute('aria-pressed', c.getAttribute('data-f') === v ? 'true' : 'false'); });
      if (empty) empty.style.display = n ? 'none' : 'block';
    }
    chips.forEach(function (c) {
      c.addEventListener('click', function () {
        var v = c.getAttribute('data-f'); apply(v);
        try { history.replaceState(null, '', v === 'all' ? location.pathname : '#' + v); } catch (e) {}
      });
    });
    var h = location.hash.slice(1);
    if (h && chips.some(function (c) { return c.getAttribute('data-f') === h; })) apply(h);
  }

  // WhatsApp request form
  $$('form[data-wa]').forEach(function (f) {
    f.addEventListener('submit', function (e) {
      e.preventDefault();
      var name = f.elements.name, err = $('.err', f);
      if (!name.value.trim()) {
        name.setAttribute('aria-invalid', 'true'); err.style.display = 'block'; name.focus(); return;
      }
      name.removeAttribute('aria-invalid'); err.style.display = 'none';
      var L = JSON.parse(f.getAttribute('data-l'));
      var tour = f.elements.tour ? f.elements.tour.value : '';
      var lines = [L.hello + (tour ? ': ' + tour : '')];
      lines.push(L.name + ': ' + name.value.trim());
      if (f.elements.people && f.elements.people.value) lines.push(f.elements.people.value + ' ' + L.people);
      if (f.elements.msg && f.elements.msg.value.trim()) lines.push(f.elements.msg.value.trim());
      var ok = $('.ok', f); if (ok) ok.style.display = 'block';
      location.href = 'https://wa.me/' + f.getAttribute('data-wa') + '?text=' + encodeURIComponent(lines.join('\n'));
    });
  });
})();

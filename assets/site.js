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
  var dlg = $('#sdlg'), data = null, loading = false, sel = -1;
  function norm(s) { return (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, ''); }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function hl(text, words) {
    var t = esc(text);
    words.forEach(function (w) {
      if (w.length < 2) return;
      var i = norm(text).indexOf(w);
      if (i > -1) {
        var raw = text.substr(i, w.length);
        t = t.replace(esc(raw), '<mark>' + esc(raw) + '</mark>');
      }
    });
    return t;
  }
  function itemHTML(it, words) {
    return '<li><a href="' + esc(it.u) + '"><span class="si">' + (data.icons[it.i] || '') + '</span><span class="st"><b>' +
      hl(it.t, words) + '</b><small>' + esc(it.d) + '</small></span>' + (it.p ? '<span class="sp">' + esc(it.p) + '</span>' : '') + '</a></li>';
  }
  function setSel(i) {
    var links = $$('#sbody a');
    if (!links.length) { sel = -1; return; }
    sel = (i + links.length) % links.length;
    links.forEach(function (a, n) { a.setAttribute('aria-selected', n === sel ? 'true' : 'false'); });
    links[sel].scrollIntoView({ block: 'nearest' });
  }
  function render(q) {
    var body = $('#sbody'), quick = $('#squick');
    var words = norm(q).trim().split(/\s+/).filter(Boolean);
    sel = -1;
    if (!words.length) { body.innerHTML = ''; body.appendChild(quick); quick.hidden = false; return; }
    if (!data) {
      body.innerHTML = '<div class="sk"><i class="a"></i><div style="flex:1"><i class="b"></i><i class="c"></i></div></div>'.repeat(4);
      return;
    }
    var hits = [];
    data.items.forEach(function (it) {
      var tt = it._t || (it._t = norm(it.t)), all = it._a || (it._a = norm(it.t + ' ' + it.d + ' ' + (it.k || '')));
      if (!words.every(function (w) { return all.indexOf(w) > -1; })) return;
      var sc = 0;
      words.forEach(function (w) { if (tt.indexOf(w) > -1) sc += 10; if (tt.indexOf(w) === 0) sc += 5; });
      sc += it.g === 'dest' ? 6 : it.g === 'tour' ? 3 : 0;
      hits.push([sc, it]);
    });
    hits.sort(function (a, b) { return b[0] - a[0]; });
    if (!hits.length) { body.innerHTML = '<p class="snone">' + esc(body.getAttribute('data-none')) + '</p>'; return; }
    var groups = {}, order = [];
    hits.slice(0, 20).forEach(function (h) { var g = h[1].g; if (!groups[g]) { groups[g] = []; order.push(g); } groups[g].push(h[1]); });
    body.innerHTML = order.map(function (g) {
      return '<p class="sgrp">' + esc(data.groups[g] || '') + '</p><ul class="slist">' + groups[g].map(function (it) { return itemHTML(it, words); }).join('') + '</ul>';
    }).join('');
  }
  function load(cb) {
    if (data || loading) return;
    loading = true;
    fetch(dlg.getAttribute('data-src')).then(function (r) { return r.json(); })
      .then(function (j) { data = j; loading = false; cb && cb(); })
      .catch(function () { loading = false; });
  }
  function openSearch() {
    if (!dlg || !dlg.showModal) { location.href = dlg ? dlg.getAttribute('data-href') : '/'; return; }
    if (!dlg.open) dlg.showModal();
    var inp = $('#sq'); inp.focus(); inp.select();
    load(function () { render(inp.value); });
  }
  $$('[data-search]').forEach(function (b) { b.addEventListener('click', openSearch); b.addEventListener('mouseenter', function () { if (dlg) load(); }); });
  if (dlg) {
    var inp = $('#sq');
    inp.addEventListener('input', function () { render(inp.value); });
    inp.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowDown') { e.preventDefault(); setSel(sel + 1); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); setSel(sel - 1); }
      else if (e.key === 'Enter') { var l = $$('#sbody a'); var a = l[sel > -1 ? sel : 0]; if (a) { e.preventDefault(); location.href = a.href; } }
    });
    dlg.addEventListener('click', function (e) { if (e.target === dlg) dlg.close(); });
    $$('[data-sclose]').forEach(function (b) { b.addEventListener('click', function () { dlg.close(); }); });
    d.addEventListener('keydown', function (e) {
      var tag = (e.target.tagName || '').toLowerCase();
      if ((e.key === 'k' && (e.metaKey || e.ctrlKey)) || (e.key === '/' && tag !== 'input' && tag !== 'textarea' && tag !== 'select')) { e.preventDefault(); openSearch(); }
    });
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

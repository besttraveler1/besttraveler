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

  // route map animation: draw the route, pop in the pins, move the plane/bus along it
  var maps = $$('.rmap');
  if (maps.length && 'IntersectionObserver' in window && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
    var io = new IntersectionObserver(function (ents) {
      ents.forEach(function (en) {
        if (!en.isIntersecting) return;
        var m = en.target; io.unobserve(m);
        m.classList.add('go');
        var am = m.querySelector('animateMotion');
        if (am && am.beginElement) try { am.beginElement(); } catch (e) {}
      });
    }, { threshold: 0.35 });
    maps.forEach(function (m) { m.classList.add('anim'); io.observe(m); });
  }

  // Interactive tour map (MapLibre + OpenFreeMap), loaded only when the map comes near the screen
  var mboxes = $$('.mapbox[data-imap]');
  if (mboxes.length && 'IntersectionObserver' in window) {
    var mlLoad = null;
    var loadML = function () {
      if (mlLoad) return mlLoad;
      mlLoad = new Promise(function (ok, bad) {
        var l = d.createElement('link'); l.rel = 'stylesheet'; l.href = '/assets/vendor/maplibre-gl.css'; d.head.appendChild(l);
        var sc = d.createElement('script'); sc.src = '/assets/vendor/maplibre-gl.js'; sc.onload = ok; sc.onerror = bad; d.head.appendChild(sc);
      });
      return mlLoad;
    };
    var dark = function () {
      var t = root.getAttribute('data-theme');
      return t ? t === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches;
    };
    var still = matchMedia('(prefers-reduced-motion: reduce)').matches;
    var initMap = function (box) {
      var D = JSON.parse(box.getAttribute('data-imap')), ml = window.maplibregl;
      var holder = d.createElement('div'); holder.className = 'imap'; box.appendChild(holder);
      var b = new ml.LngLatBounds();
      D.line.forEach(function (c) { b.extend(c); });
      var map = new ml.Map({ container: holder, style: 'https://tiles.openfreemap.org/styles/' + (dark() ? 'dark' : 'liberty'),
        bounds: b, fitBoundsOptions: { padding: { top: 50, bottom: 50, left: 50, right: 150 }, maxZoom: 10 }, cooperativeGestures: true, attributionControl: { compact: true } });
      map.addControl(new ml.NavigationControl({ showCompass: false }), 'top-right');
      map.on('load', function () {
        map.getStyle().layers.forEach(function (ly) {
          if (ly.type === 'symbol' && ly.layout && ly.layout['text-field'])
            map.setLayoutProperty(ly.id, 'text-field', ['coalesce', ['get', 'name:' + D.lang], ['get', 'name']]);
        });
        map.addSource('route', { type: 'geojson', data: { type: 'Feature', geometry: { type: 'LineString', coordinates: [D.line[0]] } } });
        map.addLayer({ id: 'route-casing', type: 'line', source: 'route', paint: { 'line-color': '#ffffff', 'line-width': 7, 'line-opacity': .85 }, layout: { 'line-cap': 'round', 'line-join': 'round' } });
        map.addLayer({ id: 'route', type: 'line', source: 'route', paint: { 'line-color': '#6d28d9', 'line-width': 3.5, 'line-dasharray': [1.2, 1.6] }, layout: { 'line-cap': 'round', 'line-join': 'round' } });
        box.classList.add('live');
        // pins
        var pins = D.pins.map(function (p, i) {
          var el = d.createElement('div'); el.className = 'mpin';
          el.innerHTML = '<b>' + (i + 1) + '</b><span></span>'; el.lastChild.textContent = p[2];
          var mk = new ml.Marker({ element: el, anchor: 'left', offset: [-13, 0] }).setLngLat([p[1], p[0]]).addTo(map);
          el.setAttribute('role', 'img'); el.setAttribute('aria-label', (i + 1) + '. ' + p[2]);
          return { el: el, lng: p[1], lat: p[0] };
        });
        var bus = d.createElement('div'); bus.className = 'mbus';
        bus.innerHTML = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 6v6M15 6v6M2 12h19.6M18 18h3s.5-1.7.8-2.8c.1-.4.2-.8.2-1.2 0-.4-.1-.8-.2-1.2l-1.4-5C20.1 6.8 19.1 6 18 6H4a2 2 0 0 0-2 2v10h3"/><circle cx="7" cy="18" r="2"/><path d="M9 18h5"/><circle cx="16" cy="18" r="2"/></svg>';
        var busM = new ml.Marker({ element: bus }).setLngLat(D.line[0]).addTo(map);
        bus.removeAttribute('aria-label'); bus.setAttribute('aria-hidden', 'true');
        // animation along the route
        var L = D.line, seg = [], tot = 0;
        for (var i = 1; i < L.length; i++) { var dd = Math.hypot(L[i][0] - L[i - 1][0], L[i][1] - L[i - 1][1]); seg.push(dd); tot += dd; }
        var dur = still ? 0 : 3200, t0 = null;
        var reached = function (lng, lat) {
          pins.forEach(function (p) { if (Math.abs(p.lng - lng) < 0.05 && Math.abs(p.lat - lat) < 0.04) p.el.classList.add('on'); });
        };
        reached(L[0][0], L[0][1]);
        var step = function (ts) {
          if (t0 === null) t0 = ts;
          var f = dur ? Math.min(1, (ts - t0) / dur) : 1, want = f * tot, acc = 0, coords = [L[0]], pos = L[0];
          for (var j = 0; j < seg.length; j++) {
            if (acc + seg[j] <= want) { acc += seg[j]; coords.push(L[j + 1]); reached(L[j + 1][0], L[j + 1][1]); pos = L[j + 1]; continue; }
            var k = seg[j] ? (want - acc) / seg[j] : 0;
            pos = [L[j][0] + (L[j + 1][0] - L[j][0]) * k, L[j][1] + (L[j + 1][1] - L[j][1]) * k];
            coords.push(pos); break;
          }
          map.getSource('route').setData({ type: 'Feature', geometry: { type: 'LineString', coordinates: coords } });
          busM.setLngLat(pos);
          if (f < 1) requestAnimationFrame(step); else { pins.forEach(function (p) { p.el.classList.add('on'); }); bus.classList.add('done'); }
        };
        requestAnimationFrame(step);
      });
    };
    var mio = new IntersectionObserver(function (ents) {
      ents.forEach(function (en) {
        if (!en.isIntersecting) return;
        mio.unobserve(en.target);
        loadML().then(function () { initMap(en.target); }).catch(function () {});
      });
    }, { threshold: 0.2 });
    // start watching only after the page has fully loaded, so the map never competes with the first paint
    var watch = function () { mboxes.forEach(function (m) { mio.observe(m); }); };
    if (d.readyState === 'complete') watch(); else window.addEventListener('load', function () { setTimeout(watch, 1500); });
  }

  // Lottie animations: desktop only, loaded after the page is ready, off for reduced motion
  var lts = $$('[data-lottie]');
  if (lts.length && matchMedia('(min-width: 1000px)').matches && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
    var start = function () {
      var sc = d.createElement('script');
      sc.src = '/assets/vendor/lottie_svg.min.js';
      sc.onload = function () {
        lts.forEach(function (el) {
          var once = el.hasAttribute('data-once');
          var an = window.lottie.loadAnimation({ container: el, renderer: 'svg', loop: !once, autoplay: !once, path: el.getAttribute('data-lottie'),
            rendererSettings: { preserveAspectRatio: 'xMidYMid meet', progressiveLoad: true } });
          // whole frames only: the grass layer has a 1-frame jump at the end that must never be drawn in between
          an.setSubframe(false);
          el.classList.add('on');
          if (once) {
            // play one time when it scrolls into view, then stay on the last frame
            var io2 = new IntersectionObserver(function (es) {
              if (es[0].isIntersecting) { io2.disconnect(); an.play(); }
            }, { threshold: .5 });
            an.addEventListener('DOMLoaded', function () { io2.observe(el); });
          }
        });
      };
      d.head.appendChild(sc);
    };
    if ('requestIdleCallback' in window) requestIdleCallback(start, { timeout: 2500 }); else setTimeout(start, 1200);
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

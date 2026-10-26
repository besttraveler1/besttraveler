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
  // Search in any script: Georgian, Latin ("ateni", "xada", "kazbegi") and Cyrillic all fold to one simple Latin skeleton.
  var KA = 'ა:a,ბ:b,გ:g,დ:d,ე:e,ვ:v,ზ:z,თ:t,ი:i,კ:k,ლ:l,მ:m,ნ:n,ო:o,პ:p,ჟ:zh,რ:r,ს:s,ტ:t,უ:u,ფ:p,ქ:k,ღ:gh,ყ:k,შ:sh,ჩ:ch,ც:ts,ძ:dz,წ:ts,ჭ:ch,ხ:kh,ჯ:j,ჰ:h';
  var RU = 'а:a,б:b,в:v,г:g,д:d,е:e,ё:e,ж:zh,з:z,и:i,й:i,к:k,л:l,м:m,н:n,о:o,п:p,р:r,с:s,т:t,у:u,ф:f,х:kh,ц:ts,ч:ch,ш:sh,щ:sh,ъ:,ы:i,ь:,э:e,ю:iu,я:ia';
  var MAP = {};
  (KA + ',' + RU).split(',').forEach(function (p) { var kv = p.split(':'); MAP[kv[0]] = kv[1]; });
  function norm(s) {
    s = (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
    var out = '';
    for (var i = 0; i < s.length; i++) { var c = s[i]; out += Object.prototype.hasOwnProperty.call(MAP, c) ? MAP[c] : c; }
    // fold the different ways people type the same sound
    return out.replace(/kh|x|q/g, 'k').replace(/gh/g, 'g').replace(/sh/g, 's').replace(/zh/g, 'z')
      .replace(/tch|ch/g, 'c').replace(/ts|tz|w/g, 'c').replace(/dz/g, 'z').replace(/th/g, 't').replace(/ph|f/g, 'p')
      .replace(/y/g, 'i').replace(/[^a-z0-9]+/g, ' ').replace(/(.)\1+/g, '$1').trim();
  }
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
  var quickEl = $('#squick');   // kept: results replace it, clearing the box puts it back
  function render(q) {
    var body = $('#sbody'), quick = quickEl;
    var words = norm(q).trim().split(/\s+/).filter(Boolean);
    sel = -1;
    if (!words.length) { body.innerHTML = ''; if (quick) { body.appendChild(quick); quick.hidden = false; } return; }
    if (!data) {
      body.innerHTML = '<div class="sk"><i class="a"></i><div style="flex:1"><i class="b"></i><i class="c"></i></div></div>'.repeat(4);
      return;
    }
    var hits = [];
    data.items.forEach(function (it) {
      var tt = it._t || (it._t = norm(it.t + ' ' + (it.a || ''))), all = it._a || (it._a = norm(it.t + ' ' + (it.a || '') + ' ' + it.d + ' ' + (it.k || '')));
      if (!words.every(function (w) { return all.indexOf(w) > -1; })) return;
      var sc = 0;
      words.forEach(function (w) { if (tt.indexOf(w) > -1) sc += 10; if (tt.indexOf(w) === 0 || tt.indexOf(' ' + w) > -1) sc += 5; });
      // a title (in any language) that starts with the search word is the strongest match
      var heads = it._h || (it._h = [it.t].concat((it.a || '').split(' | ')).map(norm));
      words.forEach(function (w) { if (heads.some(function (h) { return h.indexOf(w) === 0; })) sc += 12; });
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
      (D.legs || []).forEach(function (lg) { lg.c.forEach(function (c) { b.extend(c); }); });
      var map = new ml.Map({ container: holder, style: 'https://tiles.openfreemap.org/styles/' + (dark() ? 'dark' : 'liberty'),
        bounds: b, fitBoundsOptions: { padding: { top: 50, bottom: 50, left: 50, right: 150 }, maxZoom: 10 }, cooperativeGestures: true, attributionControl: { compact: true } });
      map.addControl(new ml.NavigationControl({ showCompass: false }), 'top-right');
      map.on('error', function (ev) { if (window.console) console.warn('map', ev && ev.error); });
      map.on('load', function () {
        map.getStyle().layers.forEach(function (ly) {
          if (ly.type === 'symbol' && ly.layout && ly.layout['text-field'])
            { map.setLayoutProperty(ly.id, 'text-field', ['coalesce', ['get', 'name:' + D.lang], ['get', 'name']]); map.setPaintProperty(ly.id, 'text-opacity', .7); }
        });
        // route legs: each part keeps its own look (road, sea, flight, train)
        var LEGS = D.legs && D.legs.length ? D.legs : [{ m: 'road', c: D.line }];
        map.addSource('route', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
        map.addLayer({ id: 'route-casing', type: 'line', source: 'route', filter: ['==', ['get', 'm'], 'road'],
          paint: { 'line-color': '#ffffff', 'line-width': 7, 'line-opacity': .85 }, layout: { 'line-cap': 'round', 'line-join': 'round' } });
        map.addLayer({ id: 'route-road', type: 'line', source: 'route', filter: ['==', ['get', 'm'], 'road'],
          paint: { 'line-color': '#6d28d9', 'line-width': 3.5 }, layout: { 'line-cap': 'round', 'line-join': 'round' } });
        map.addLayer({ id: 'route-sea', type: 'line', source: 'route', filter: ['in', ['get', 'm'], ['literal', ['ferry', 'cruise']]],
          paint: { 'line-color': '#0369a1', 'line-width': 3, 'line-dasharray': [1.5, 1.5] }, layout: { 'line-cap': 'round' } });
        map.addLayer({ id: 'route-air', type: 'line', source: 'route', filter: ['==', ['get', 'm'], 'flight'],
          paint: { 'line-color': '#6d28d9', 'line-width': 2.5, 'line-dasharray': [2, 2], 'line-opacity': .9 }, layout: { 'line-cap': 'round' } });
        map.addLayer({ id: 'route-rail', type: 'line', source: 'route', filter: ['==', ['get', 'm'], 'train'],
          paint: { 'line-color': '#1f1a33', 'line-width': 3, 'line-dasharray': [3, 1] } });
        // pins as map layers, so the map itself keeps labels from overlapping
        var feats = D.pins.map(function (p, k) {
          return { type: 'Feature', geometry: { type: 'Point', coordinates: [p[1], p[0]] }, properties: { i: k, n: String(k + 1), label: p[2] } };
        });
        map.addSource('pins', { type: 'geojson', data: { type: 'FeatureCollection', features: feats } });
        var shownMax = -1;
        var filt = function () { return ['<=', ['get', 'i'], shownMax]; };
        map.addLayer({ id: 'pins-c', type: 'circle', source: 'pins', filter: filt(),
          paint: { 'circle-radius': 11, 'circle-color': '#6d28d9', 'circle-stroke-color': '#ffffff', 'circle-stroke-width': 3 } });
        map.addLayer({ id: 'pins-n', type: 'symbol', source: 'pins', filter: filt(),
          layout: { 'text-field': ['get', 'n'], 'text-font': ['Noto Sans Bold'], 'text-size': 12, 'text-allow-overlap': true, 'text-padding': 9 },
          paint: { 'text-color': '#ffffff' } });
        map.addLayer({ id: 'pins-l', type: 'symbol', source: 'pins', filter: filt(),
          layout: { 'text-field': ['get', 'label'], 'text-font': ['Noto Sans Bold'], 'text-size': 13, 'symbol-sort-key': ['get', 'i'],
            'text-variable-anchor': ['left', 'right', 'top', 'bottom', 'top-left', 'bottom-right'], 'text-radial-offset': 1.25, 'text-justify': 'auto', 'text-padding': 3 },
          paint: { 'text-color': '#1f1a33', 'text-halo-color': '#ffffff', 'text-halo-width': 2.2 } });
        var reveal = function (k) {
          if (k <= shownMax) return; shownMax = k;
          ['pins-c', 'pins-n', 'pins-l'].forEach(function (id) { map.setFilter(id, filt()); });
        };
        var pins = D.pins.map(function (p, k) { return { k: k, lng: p[1], lat: p[0] }; });
        var VI = {
          road: '<path d="M8 6v6M15 6v6M2 12h19.6M18 18h3s.5-1.7.8-2.8c.1-.4.2-.8.2-1.2 0-.4-.1-.8-.2-1.2l-1.4-5C20.1 6.8 19.1 6 18 6H4a2 2 0 0 0-2 2v10h3"/><circle cx="7" cy="18" r="2"/><path d="M9 18h5"/><circle cx="16" cy="18" r="2"/>',
          ferry: '<path d="M2 21c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1 .6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1"/><path d="M19.38 20A11.6 11.6 0 0 0 21 14l-9-4-9 4c0 2.9.94 5.34 2.81 7.76"/><path d="M19 13V7a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2v6M12 10v4M12 2v3"/>',
          flight: '<path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z"/>',
          train: '<rect width="16" height="16" x="4" y="3" rx="2"/><path d="M4 11h16M12 3v8M8 19l-2 3M18 22l-2-3M8 15h.01M16 15h.01"/>'
        };
        VI.cruise = VI.ferry;
        var vSvg = function (m) { return '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' + (VI[m] || VI.road) + '</svg>'; };
        var bus = d.createElement('div'); bus.className = 'mbus';
        bus.innerHTML = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 6v6M15 6v6M2 12h19.6M18 18h3s.5-1.7.8-2.8c.1-.4.2-.8.2-1.2 0-.4-.1-.8-.2-1.2l-1.4-5C20.1 6.8 19.1 6 18 6H4a2 2 0 0 0-2 2v10h3"/><circle cx="7" cy="18" r="2"/><path d="M9 18h5"/><circle cx="16" cy="18" r="2"/></svg>';
        var busM = new ml.Marker({ element: bus }).setLngLat(D.line[0]).addTo(map);
        bus.removeAttribute('aria-label'); bus.setAttribute('aria-hidden', 'true');
        // animation along the route, leg by leg
        var segs = [], tot = 0;
        LEGS.forEach(function (lg, li) {
          for (var q = 1; q < lg.c.length; q++) {
            var a = lg.c[q - 1], b2 = lg.c[q], dd = Math.hypot(b2[0] - a[0], b2[1] - a[1]);
            segs.push({ li: li, a: a, b: b2, d: dd }); tot += dd;
          }
        });
        var dur = still ? 0 : Math.min(6000, 2600 + LEGS.length * 300), t0 = null, curMode = null;
        var reached = function (lng, lat) {
          pins.forEach(function (p) { if (Math.abs(p.lng - lng) < 0.05 && Math.abs(p.lat - lat) < 0.04) reveal(p.k); });
        };
        reached(LEGS[0].c[0][0], LEGS[0].c[0][1]);
        var step = function (ts) {
          if (t0 === null) t0 = ts;
          var f = dur ? Math.min(1, (ts - t0) / dur) : 1, want = f * tot, acc = 0, pos = LEGS[0].c[0], li = 0;
          var parts = LEGS.map(function (lg) { return { type: 'Feature', properties: { m: lg.m }, geometry: { type: 'LineString', coordinates: [] } }; });
          for (var j2 = 0; j2 < segs.length; j2++) {
            var sg = segs[j2], co = parts[sg.li].geometry.coordinates;
            if (!co.length) co.push(sg.a);
            if (acc + sg.d <= want) { acc += sg.d; co.push(sg.b); pos = sg.b; li = sg.li;
              if (j2 === segs.length - 1 || segs[j2 + 1].li !== sg.li) reached(sg.b[0], sg.b[1]);
              continue; }
            var r = sg.d ? (want - acc) / sg.d : 0;
            pos = [sg.a[0] + (sg.b[0] - sg.a[0]) * r, sg.a[1] + (sg.b[1] - sg.a[1]) * r];
            co.push(pos); li = sg.li; break;
          }
          map.getSource('route').setData({ type: 'FeatureCollection', features: parts.filter(function (p) { return p.geometry.coordinates.length > 1; }) });
          var m = LEGS[li].m; if (m !== curMode) { curMode = m; bus.innerHTML = vSvg(m); }
          busM.setLngLat(pos);
          if (f < 1) requestAnimationFrame(step); else { reveal(pins.length - 1); setTimeout(function () { busM.remove(); }, 400); }
        };
        // keep the drawn map until the real map has finished loading its tiles, then swap them smoothly
        var go = function () { if (box.classList.contains('live')) return; box.classList.add('live'); requestAnimationFrame(step); };
        map.once('idle', go);
        setTimeout(go, 6000);
      });
    };
    var mio = new IntersectionObserver(function (ents) {
      ents.forEach(function (en) {
        if (!en.isIntersecting) return;
        mio.unobserve(en.target);
        loadML().then(function () { initMap(en.target); }).catch(function () {});
      });
    }, { rootMargin: '600px 0px' });
    // after the page has loaded: fetch the map library in the background, then draw maps that are near the screen
    var watch = function () {
      var go = function () { if (matchMedia('(min-width: 980px)').matches) loadML().catch(function () {}); mboxes.forEach(function (m) { mio.observe(m); }); };
      if ('requestIdleCallback' in window) requestIdleCallback(go, { timeout: 1200 }); else setTimeout(go, 300);
    };
    if (d.readyState === 'complete') watch(); else window.addEventListener('load', watch);
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
          var an = window.lottie.loadAnimation({ container: el, renderer: 'svg', loop: !once, autoplay: !once, path: (el.getAttribute('data-lottie-dark') && (root.getAttribute('data-theme') === 'dark' || (!root.getAttribute('data-theme') && matchMedia('(prefers-color-scheme: dark)').matches))) ? el.getAttribute('data-lottie-dark') : el.getAttribute('data-lottie'),
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

  // share buttons: Messenger link only works in the phone app; copy link; the phone's own share sheet
  if (/Android|iPhone|iPad|iPod/i.test(navigator.userAgent)) $$('[data-mobile]').forEach(function (li) { li.hidden = false; });
  if (navigator.share) $$('[data-native]').forEach(function (li) { li.hidden = false; });
  $$('[data-share]').forEach(function (b) {
    b.addEventListener('click', function () { navigator.share({ title: b.getAttribute('data-title'), url: b.getAttribute('data-share') }).catch(function () {}); });
  });
  $$('[data-copy]').forEach(function (b) {
    b.addEventListener('click', function () {
      var ok = b.closest('.share').querySelector('.shok');
      var done = function () { ok.textContent = b.getAttribute('data-done'); setTimeout(function () { ok.textContent = ''; }, 2500); };
      if (navigator.clipboard) navigator.clipboard.writeText(b.getAttribute('data-copy')).then(done, function () {});
    });
  });

  // tour filters
  var grid = $('[data-filter-grid]');
  if (grid) {
    // calendar: drop departures that have already passed since the last build
    var now = new Date(), today = now.getFullYear() + '-' + ('0' + (now.getMonth() + 1)).slice(-2) + '-' + ('0' + now.getDate()).slice(-2);
    $$('[data-end]', grid).forEach(function (r) { if (r.getAttribute('data-end') < today) r.remove(); });
    var chips = $$('[data-f]'), empty = $('[data-empty]');
    function apply(v) {
      var n = 0;
      $$('[data-tags]', grid).forEach(function (c) {
        var ok = v === 'all' || (' ' + c.getAttribute('data-tags') + ' ').indexOf(' ' + v + ' ') > -1;
        c.hidden = !ok; if (ok) n++;
      });
      $$('[data-group]', grid).forEach(function (g) { g.hidden = !g.querySelector('[data-tags]:not([hidden])'); });
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
    apply(h && chips.some(function (c) { return c.getAttribute('data-f') === h; }) ? h : 'all');
  }

  // searchable tour picker (enhances the native select; the select still works without JS)
  $$('select[data-combo]').forEach(function (sel) {
    var wrap = d.createElement('div'); wrap.className = 'combo';
    var inp = d.createElement('input'); inp.type = 'text'; inp.id = sel.id; inp.autocomplete = 'off';
    inp.placeholder = sel.getAttribute('data-ph'); inp.setAttribute('role', 'combobox');
    inp.setAttribute('aria-expanded', 'false'); inp.setAttribute('aria-autocomplete', 'list');
    var list = d.createElement('ul'); list.className = 'combo-list'; list.id = sel.id + '-list'; list.setAttribute('role', 'listbox'); list.hidden = true;
    inp.setAttribute('aria-controls', list.id);
    var hid = d.createElement('input'); hid.type = 'hidden'; hid.name = sel.name;
    var clr = d.createElement('button'); clr.type = 'button'; clr.className = 'combo-x'; clr.hidden = true; clr.setAttribute('aria-label', '×'); clr.textContent = '×';
    var items = [];
    $$('optgroup', sel).forEach(function (g) {
      $$('option', g).forEach(function (o) { items.push({ g: g.label, t: o.textContent, s: o.getAttribute('data-sub') || '', k: o.getAttribute('data-k') || '' }); });
    });
    sel.removeAttribute('id'); sel.removeAttribute('name'); sel.hidden = true;
    sel.parentNode.insertBefore(wrap, sel);
    wrap.appendChild(inp); wrap.appendChild(clr); wrap.appendChild(list); wrap.appendChild(hid);
    var act = -1, shown = [];
    function draw() {
      var q = norm(inp.value), last = null, h = '';
      shown = items.filter(function (it) { return !q || norm(it.t + ' ' + it.g + ' ' + it.k).indexOf(q) > -1; });
      shown.forEach(function (it, i) {
        if (it.g !== last) { h += '<li class="combo-g" role="presentation">' + esc(it.g) + '</li>'; last = it.g; }
        h += '<li role="option" id="' + list.id + '-' + i + '" data-i="' + i + '"' + (i === act ? ' aria-selected="true"' : '') + '><b>' + esc(it.t) + '</b>' + (it.s ? '<small>' + esc(it.s) + '</small>' : '') + '</li>';
      });
      list.innerHTML = h || '<li class="combo-none">' + esc(sel.getAttribute('data-none')) + '</li>';
    }
    function open(v) { list.hidden = !v; inp.setAttribute('aria-expanded', v ? 'true' : 'false'); if (v) draw(); }
    function pick(i) {
      var it = shown[i]; if (!it) return;
      inp.value = it.t; hid.value = it.t; clr.hidden = false; act = -1; open(false);
    }
    function move(k) {
      if (list.hidden) open(true);
      act = Math.max(0, Math.min(shown.length - 1, act + k)); draw();
      var el = d.getElementById(list.id + '-' + act); if (el) { el.scrollIntoView({ block: 'nearest' }); inp.setAttribute('aria-activedescendant', el.id); }
    }
    inp.addEventListener('focus', function () { open(true); });
    inp.addEventListener('input', function () { hid.value = ''; act = -1; clr.hidden = !inp.value; open(true); });
    inp.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowDown') { e.preventDefault(); move(1); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); move(-1); }
      else if (e.key === 'Enter' && !list.hidden && act > -1) { e.preventDefault(); pick(act); }
      else if (e.key === 'Escape') { open(false); }
    });
    list.addEventListener('mousedown', function (e) { var li = e.target.closest('[data-i]'); if (li) { e.preventDefault(); pick(+li.getAttribute('data-i')); } });
    clr.addEventListener('click', function () { inp.value = ''; hid.value = ''; clr.hidden = true; inp.focus(); });
    d.addEventListener('click', function (e) { if (!wrap.contains(e.target)) open(false); });
  });

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

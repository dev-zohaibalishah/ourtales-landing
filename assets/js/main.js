/* ==========================================================================
   OurTales — landing page behaviour
   --------------------------------------------------------------------------
   No framework, no build step, no third-party script. Everything here is
   progressive: with JavaScript off the page still reads and the forms still
   submit natively to whatever ENDPOINT is set.
   ========================================================================== */

(function () {
  'use strict';

  /* ----------------------------------------------------------------- config

     WHERE SIGNUPS GO. Set this one string and the forms start posting for
     real — Formspree, Buttondown, a Supabase Edge Function, anything that
     accepts a POST. Until it is set, a submission is validated, stored in
     localStorage and the success state is shown, so the page can be demoed
     and shared without silently pretending to collect addresses.

       ENDPOINT: 'https://formspree.io/f/xxxxxxx'

     SEATS: keep this honest or leave it null. `taken: null` hides the meter
     entirely; set a number only when it is the real count.
  ------------------------------------------------------------------------- */
  var CONFIG = {
    ENDPOINT: '',
    SEATS: { total: 40, taken: null },
    STORAGE_KEY: 'ourtales.waitlist'
  };

  var $ = function (sel, root) { return (root || document).querySelector(sel); };
  var $$ = function (sel, root) {
    return Array.prototype.slice.call((root || document).querySelectorAll(sel));
  };

  /* -------------------------------------------------------------- analytics
     One funnel event helper. It feeds dataLayer / gtag / plausible if any of
     them happen to be on the page, and is a no-op otherwise — so adding an
     analytics tag later needs no edit here. */
  function track(event, props) {
    var payload = props || {};
    try {
      if (window.dataLayer) { window.dataLayer.push(Object.assign({ event: event }, payload)); }
      if (typeof window.gtag === 'function') { window.gtag('event', event, payload); }
      if (typeof window.plausible === 'function') { window.plausible(event, { props: payload }); }
    } catch (e) { /* analytics must never break the page */ }
  }

  /* ------------------------------------------------------------ CTA clicks */
  $$('[data-cta]').forEach(function (el) {
    el.addEventListener('click', function () {
      track('cta_click', { location: el.getAttribute('data-cta') });
    });
  });

  /* ---------------------------------------------------------------- capture

     A real address has an @ with something either side and a dot in the
     domain. Anything stricter rejects addresses that genuinely exist, and the
     server is the only thing that can truly confirm one anyway. */
  var EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

  function remember(email, where) {
    try {
      var raw = window.localStorage.getItem(CONFIG.STORAGE_KEY);
      var list = raw ? JSON.parse(raw) : [];
      list.push({ email: email, source: where, at: new Date().toISOString() });
      window.localStorage.setItem(CONFIG.STORAGE_KEY, JSON.stringify(list));
    } catch (e) { /* private mode, quota — not worth failing a signup over */ }
  }

  function send(email, where) {
    if (!CONFIG.ENDPOINT) { return Promise.resolve({ stored: 'local' }); }
    return fetch(CONFIG.ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ email: email, source: where, page: location.pathname })
    }).then(function (res) {
      if (!res.ok) { throw new Error('Request failed: ' + res.status); }
      return res.json().catch(function () { return {}; });
    });
  }

  $$('[data-capture]').forEach(function (box) {
    var where = box.getAttribute('data-capture');
    var form = $('.capture__form', box);
    var input = $('input[type="email"]', box);
    var button = $('button[type="submit"]', box);
    var error = $('.capture__error', box);
    var success = $('.capture__success', box);
    if (!form || !input) { return; }

    if (CONFIG.ENDPOINT) { form.setAttribute('action', CONFIG.ENDPOINT); form.setAttribute('method', 'post'); }

    function fail(message) {
      error.textContent = message;
      error.classList.add('is-visible');
      input.setAttribute('aria-invalid', 'true');
      input.focus();
    }

    function clear() {
      error.textContent = '';
      error.classList.remove('is-visible');
      input.setAttribute('aria-invalid', 'false');
    }

    input.addEventListener('input', clear);

    form.addEventListener('submit', function (ev) {
      ev.preventDefault();
      var email = input.value.trim();

      if (!EMAIL.test(email)) {
        fail('That address looks incomplete — check it and try again.');
        track('signup_invalid', { location: where });
        return;
      }

      clear();
      var label = button.textContent;
      button.disabled = true;
      button.textContent = 'Sending…';
      track('signup_submit', { location: where });

      send(email, where)
        .then(function () {
          remember(email, where);
          box.classList.add('is-done');
          success.classList.add('is-visible');
          success.setAttribute('tabindex', '-1');
          success.focus({ preventScroll: true });
          track('signup_success', { location: where });
        })
        .catch(function (err) {
          button.disabled = false;
          button.textContent = label;
          fail('Something went wrong on our side. Try again, or email us and we will add you by hand.');
          track('signup_error', { location: where, message: String(err && err.message) });
        });
    });
  });

  /* ------------------------------------------------------------ seat meter */
  (function () {
    var meter = $('[data-slots-meter]');
    var fill = $('[data-slots-fill]');
    var meta = $('[data-slots-meta]');
    var seats = CONFIG.SEATS;
    if (!meter || !fill || !meta || seats.taken === null || seats.taken === undefined) { return; }

    var pct = Math.max(0, Math.min(100, Math.round((seats.taken / seats.total) * 100)));
    meter.hidden = false;
    meta.hidden = false;
    meta.children[0].textContent = seats.taken + ' of ' + seats.total + ' seats claimed';
    meta.children[1].textContent = (seats.total - seats.taken) + ' left';
    // Paint after a frame so the width transition actually runs.
    requestAnimationFrame(function () { fill.style.width = pct + '%'; });
  })();

  /* ---------------------------------------------------------- header state */
  var header = $('#header');
  var dock = $('#dock');
  var heroCapture = $('[data-capture="hero"]');

  function onScroll() {
    if (header) { header.classList.toggle('is-stuck', window.scrollY > 8); }
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* ------------------------------------------------------------ mobile dock
     It appears only once the hero form is off screen, so the primary CTA is
     never competing with itself, and goes inert while hidden so it cannot
     take focus behind the page. */
  function setDock(visible) {
    if (!dock) { return; }
    dock.classList.toggle('is-visible', visible);
    dock.setAttribute('aria-hidden', visible ? 'false' : 'true');
    if ('inert' in dock) { dock.inert = !visible; } // keyboard focus follows sight
  }
  setDock(false);

  if ('IntersectionObserver' in window) {
    if (heroCapture) {
      new IntersectionObserver(function (entries) {
        setDock(!entries[0].isIntersecting);
      }, { rootMargin: '-80px 0px 0px 0px' }).observe(heroCapture);
    }

    /* --------------------------------------------------------- reveal-on-scroll */
    var observerFired = false;
    var reveal = new IntersectionObserver(function (entries, obs) {
      observerFired = true;
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) { return; }
        entry.target.classList.add('is-in');
        obs.unobserve(entry.target);
      });
    }, { rootMargin: '0px 0px -12% 0px', threshold: 0.08 });

    $$('.reveal').forEach(function (el, i) {
      el.style.transitionDelay = (Math.min(i % 3, 2) * 90) + 'ms';
      reveal.observe(el);
    });

    /* Safety net. If the observer has not fired at all by now — a tab that is
       not compositing frames, an embedded webview, a browser quirk — drop the
       animation entirely and show everything. Hidden marketing copy is far
       worse than an unanimated page. */
    window.setTimeout(function () {
      if (observerFired) { return; }
      $$('.reveal').forEach(function (el) {
        el.style.transitionDelay = '0ms';
        el.classList.add('is-in');
      });
    }, 2000);
  } else {
    $$('.reveal').forEach(function (el) { el.classList.add('is-in'); });
  }

  /* ------------------------------------------------------------- footer year */
  var year = $('[data-year]');
  if (year) { year.textContent = String(new Date().getFullYear()); }

  /* ----------------------------------------------- deep-link into the form
     Anything pointing at #beta should land with the cursor already in the
     field on desktop — one less click between intent and conversion. */
  $$('a[href="#beta"]').forEach(function (link) {
    link.addEventListener('click', function () {
      if (window.matchMedia('(max-width: 900px)').matches) { return; }
      window.setTimeout(function () {
        var field = $('#email-beta');
        if (field && !field.closest('.capture').classList.contains('is-done')) {
          field.focus({ preventScroll: true });
        }
      }, 700);
    });
  });
})();

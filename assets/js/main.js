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

     The APK itself is not in this repository — it is a GitHub Release asset,
     because it is far past the file size a git repository should carry. The
     download buttons link straight at it.
  ------------------------------------------------------------------------- */
  var CONFIG = {
    ENDPOINT: '',
    STORAGE_KEY: 'ourtales.waitlist',
    /* The build the download buttons point at. Kept here so the analytics
       events carry a version and a release bump has one place to look. */
    BUILD: { version: '1.0.1', platform: 'android' }
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

  /* --------------------------------------------------------------- download
     The conversion event that matters on this page. Fired on every download
     link, tagged with the section it came from and the build it points at, so
     "which section actually gets the app installed" is answerable. */
  $$('[data-download]').forEach(function (link) {
    link.addEventListener('click', function () {
      track('download_click', {
        location: link.getAttribute('data-cta') || 'unknown',
        version: CONFIG.BUILD.version,
        platform: CONFIG.BUILD.platform
      });
    });
  });

  /* --------------------------------------------------------- checksum copy
     A 64-character hex string is not something anyone should retype. */
  $$('[data-copy]').forEach(function (button) {
    button.addEventListener('click', function () {
      var value = button.getAttribute('data-copy');
      var label = button.textContent;

      function done(ok) {
        button.textContent = ok ? 'Copied' : 'Select it manually';
        button.classList.toggle('is-copied', ok);
        window.setTimeout(function () {
          button.textContent = label;
          button.classList.remove('is-copied');
        }, 2200);
        track('checksum_copy', { ok: ok });
      }

      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(value).then(function () { done(true); }, function () { done(false); });
        return;
      }
      // execCommand is deprecated but is the only path left on http:// origins.
      try {
        var scratch = document.createElement('textarea');
        scratch.value = value;
        scratch.setAttribute('readonly', '');
        scratch.style.cssText = 'position:absolute;left:-9999px';
        document.body.appendChild(scratch);
        scratch.select();
        done(document.execCommand('copy'));
        document.body.removeChild(scratch);
      } catch (e) { done(false); }
    });
  });

  /* ---------------------------------------------------------- header state */
  var header = $('#header');
  var dock = $('#dock');
  var heroCta = $('.hero .get');

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
    if (heroCta) {
      new IntersectionObserver(function (entries) {
        setDock(!entries[0].isIntersecting);
      }, { rootMargin: '-80px 0px 0px 0px' }).observe(heroCta);
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
     "On iPhone? Get notified" should land with the cursor already in the
     field on desktop — one less click between intent and conversion. On a
     phone, focusing raises the keyboard over the copy the visitor came to
     read, so it is deliberately skipped there. */
  $$('a[href="#ios"]').forEach(function (link) {
    link.addEventListener('click', function () {
      if (window.matchMedia('(max-width: 900px)').matches) { return; }
      window.setTimeout(function () {
        var field = $('#email-ios');
        if (field && !field.closest('.capture').classList.contains('is-done')) {
          field.focus({ preventScroll: true });
        }
      }, 700);
    });
  });
})();

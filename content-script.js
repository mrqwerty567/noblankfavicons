(function () {
  'use strict';

  const SIZE = 64; // favicon size
  const FALLBACK_SEED = location.hostname || location.origin || location.href;

  function pageHasFavicon() {
    try {
      const relSelectors = [
        "link[rel~='icon']",
        "link[rel='shortcut icon']",
        "link[rel='apple-touch-icon']",
        "link[rel='apple-touch-icon-precomposed']"
      ];
      for (const sel of relSelectors) if (document.querySelector(sel)) return true;

      const links = document.querySelectorAll('link[rel]');
      for (const l of links) {
        const rel = (l.getAttribute('rel') || '').toLowerCase();
        if (rel.includes('icon')) return true;
        if (l.href) return true;
      }
      return false;
    } catch (err) {
      console.error('IdentFavIcon: error checking existing favicons', err);
      return false;
    }
  }

  async function remoteFaviconExists() {
    try {
      const url = new URL('/favicon.ico', location.href).href;
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 3000);
      const resp = await fetch(url, { method: 'HEAD', signal: controller.signal, cache: 'default' });
      clearTimeout(timeout);
      if (!resp) return false;
      return resp.status >= 200 && resp.status < 400;
    } catch (e) {
      return false;
    }
  }

  function injectFavicon(dataUrl, size) {
    try {
      const existing = document.querySelectorAll('link[data-identfavicon]');
      existing.forEach(e => e.parentNode && e.parentNode.removeChild(e));

      const link = document.createElement('link');
      link.setAttribute('rel', 'icon');
      link.setAttribute('type', 'image/png');
      link.setAttribute('sizes', `${size}x${size}`);
      link.setAttribute('href', dataUrl);
      link.setAttribute('data-identfavicon', 'true');
      document.head.appendChild(link);

      const apple = document.createElement('link');
      apple.setAttribute('rel', 'apple-touch-icon');
      apple.setAttribute('href', dataUrl);
      apple.setAttribute('sizes', `${size}x${size}`);
      apple.setAttribute('data-identfavicon', 'true');
      document.head.appendChild(apple);

      console.info('IdentFavIcon: injected generated favicon');
    } catch (err) {
      console.error('IdentFavIcon: failed to inject favicon', err);
    }
  }

  // Simple string -> 32-bit hash (xfnv1a)
  function xfnv1a(str) {
    let h = 2166136261 >>> 0;
    for (let i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 16777619) >>> 0;
    }
    return h >>> 0;
  }

  // PRNG based on mulberry32
  function mulberry32(a) {
    return function() {
      let t = a += 0x6D2B79F5;
      t = Math.imul(t ^ t >>> 15, t | 1);
      t ^= t + Math.imul(t ^ t >>> 7, t | 61);
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    }
  }

  // Generate a 5x5 symmetric identicon as PNG data URL
  function generateIdenticonDataUrl(seed, size) {
    const hash = xfnv1a(seed || '');
    const rand = mulberry32(hash);
    // choose color
    const hue = Math.floor(rand() * 360);
    const sat = 60 + Math.floor(rand() * 20);
    const light = 40 + Math.floor(rand() * 20);
    const fg = `hsl(${hue} ${sat}% ${light}%)`;

    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, size, size);

    // grid 5x5
    const cells = 5;
    const cell = Math.ceil(size / cells);
    const padding = Math.floor(cell * 0.1);

    // draw blocks
    ctx.fillStyle = fg;
    for (let x = 0; x < Math.ceil(cells / 2); x++) {
      for (let y = 0; y < cells; y++) {
        const v = rand();
        if (v > 0.5) {
          const sx = x * cell + padding;
          const sy = y * cell + padding;
          const w = cell - padding * 2;
          const h = cell - padding * 2;
          ctx.fillRect(sx, sy, w, h);
          // mirror
          const mx = (cells - 1 - x) * cell + padding;
          ctx.fillRect(mx, sy, w, h);
        }
      }
    }

    return canvas.toDataURL('image/png');
  }

  async function ensureFavicon() {
    try {
      if (pageHasFavicon()) {
        const exists = await remoteFaviconExists();
        if (exists) return;
      }

      const seed = (location.hostname || FALLBACK_SEED).toLowerCase();
      const dataUrl = generateIdenticonDataUrl(seed, SIZE);
      injectFavicon(dataUrl, SIZE);
    } catch (err) {
      console.error('IdentFavIcon: error in ensureFavicon', err);
    }
  }

  ensureFavicon();

  function hookHistoryEvents() {
    const _push = history.pushState;
    history.pushState = function () {
      const res = _push.apply(this, arguments);
      setTimeout(ensureFavicon, 300);
      return res;
    };
    const _replace = history.replaceState;
    history.replaceState = function () {
      const res = _replace.apply(this, arguments);
      setTimeout(ensureFavicon, 300);
      return res;
    };
    window.addEventListener('popstate', () => setTimeout(ensureFavicon, 300));
  }

  hookHistoryEvents();

  const head = document.head || document.getElementsByTagName('head')[0];
  if (head) {
    const observer = new MutationObserver(mutations => {
      for (const m of mutations) {
        if (m.type === 'childList' && m.addedNodes && m.addedNodes.length) {
          setTimeout(ensureFavicon, 400);
          break;
        }
      }
    });
    observer.observe(head, { childList: true, subtree: true });
  }

})();

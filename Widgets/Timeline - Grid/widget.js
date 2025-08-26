(function () {
  /* ---------- helpers ---------- */
  function rgbToLuma(rgb) {
    // rgb like "rgb(238, 238, 238)" or "rgba(...)"
    var m = rgb && rgb.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/i);
    if (!m) return 1; // assume light if unknown
    var r = parseInt(m[1], 10) / 255,
        g = parseInt(m[2], 10) / 255,
        b = parseInt(m[3], 10) / 255;
    // sRGB → linear
    [r, g, b] = [r, g, b].map(function (v) {
      return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b; // relative luminance
  }

  function debounce(fn, wait) {
    var t;
    return function () {
      clearTimeout(t);
      var args = arguments, ctx = this;
      t = setTimeout(function () { fn.apply(ctx, args); }, wait);
    };
  }

  /* ---------- equal-height (grid mode only) ---------- */
  function recalcEqualHeights(root) {
    if (!root || !root.classList.contains('is-grid')) return;

    // reset first to measure natural heights
    root.style.setProperty('--card-fixed-height', 'auto');

    // collect all cards within this widget instance
    var cards = root.querySelectorAll('.ue-carousel-item');
    if (!cards.length) return;

    var maxH = 0;
    cards.forEach(function (card) {
      // ensure layout applied; offsetHeight handles most cases
      var h = card.offsetHeight;
      if (h > maxH) maxH = h;
    });

    if (maxH > 0) {
      root.style.setProperty('--card-fixed-height', maxH + 'px');
    }
  }

  function setupEqualHeights(root) {
    if (!root) return;

    // guard: only attach once
    if (root.__ucEqHeightSetup) {
      // still do an immediate recalc in case content changed
      requestAnimationFrame(function () { recalcEqualHeights(root); });
      return;
    }
    root.__ucEqHeightSetup = true;

    var recalc = debounce(function () { recalcEqualHeights(root); }, 60);

    // recalc on window resize
    window.addEventListener('resize', recalc);

    // recalc when any image inside loads (lazy images, swaps)
    var imgs = root.querySelectorAll('img');
    imgs.forEach(function (img) {
      if (img.complete) return; // already loaded
      img.addEventListener('load', recalc, { once: true });
      img.addEventListener('error', recalc, { once: true });
    });

    // recalc when container/content size changes (webfonts, editor tweaks)
    if ('ResizeObserver' in window) {
      var ro = new ResizeObserver(recalc);
      ro.observe(root);
      root.__ucEqRO = ro;
    }

    // if the widget toggles grid/carousel by adding/removing .is-grid, watch class changes
    if ('MutationObserver' in window) {
      var mo = new MutationObserver(function (list) {
        list.forEach(function (m) {
          if (m.type === 'attributes' && m.attributeName === 'class') {
            // quick recalc when class flips
            recalc();
          }
        });
      });
      mo.observe(root, { attributes: true });
      root.__ucEqMO = mo;
    }

    // initial pass (next frame so CSS is applied)
    requestAnimationFrame(recalc);
    // safety recalc after images/webfonts settle
    setTimeout(recalc, 300);
  }

  /* ---------- main init per instance ---------- */
  function initUC(uidOrEl) {
    var root = typeof uidOrEl === 'string' ? document.getElementById(uidOrEl) : uidOrEl;
    if (!root) return;

    // 1) mirror actual content background into CSS vars (dots, etc.)
    var content = root.querySelector('.ue-carousel-content, .ue-carousel-content-inside');
    if (content) {
      var styles = getComputedStyle(content);
      var bg = styles.backgroundColor || styles.background || '';
      if (bg) {
        root.style.setProperty('--content-bg', bg);
        root.style.setProperty('--dot-inactive', bg);

        // 2) auto dark mode toggle based on background luminance
        if (rgbToLuma(bg) < 0.45) root.classList.add('dark-ui');
        else root.classList.remove('dark-ui');
      }
    }

    // 3) setup global equal-height for GRID mode
    setupEqualHeights(root);
  }

  /* ---------- bootstrapping ---------- */
  function ready(fn) {
    if (document.readyState !== 'loading') fn();
    else document.addEventListener('DOMContentLoaded', fn);
  }

  ready(function () {
    document.querySelectorAll('.ue-horizontal-timeline[id]').forEach(initUC);
  });

  // Elementor live editor / AJAX re-render support
  if (window.elementorFrontend && elementorFrontend.hooks) {
    elementorFrontend.hooks.addAction('frontend/element_ready/global', function (scope) {
      scope.querySelectorAll('.ue-horizontal-timeline[id]').forEach(initUC);
    });
  }

  // Optional public hook to force-refresh from outside if needed
  window.UC_GridTimeline_refresh = function (rootOrId) {
    var el = typeof rootOrId === 'string' ? document.getElementById(rootOrId) : rootOrId;
    if (el) initUC(el);
  };
})();
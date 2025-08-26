(function () {
  var GRID_BP = 768; // grid only from this width and up

  function rgbToLuma(rgb){
    var m = rgb && rgb.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/i);
    if(!m) return 1;
    var r = parseInt(m[1],10)/255, g = parseInt(m[2],10)/255, b = parseInt(m[3],10)/255;
    [r,g,b] = [r,g,b].map(function(v){ return v <= 0.03928 ? v/12.92 : Math.pow((v+0.055)/1.055, 2.4); });
    return 0.2126*r + 0.7152*g + 0.0722*b;
  }

  function debounce(fn, wait){
    var t; return function(){ clearTimeout(t); var a=arguments, c=this; t=setTimeout(function(){ fn.apply(c,a); }, wait); };
  }

  function recalcEqualHeights(root){
    if(!root) return;

    // Carousel equal height (mobile/tablet): handled by flex on .owl-stage via CSS.
    // Grid equal height (desktop only):
    var isDesktopGrid = root.classList.contains('is-grid') && window.innerWidth >= GRID_BP;
    if(!isDesktopGrid){
      root.style.removeProperty('--card-fixed-height');
      return;
    }

    root.style.setProperty('--card-fixed-height', 'auto'); // reset
    var cards = root.querySelectorAll('.ue-carousel-item');
    if(!cards.length) return;
    var maxH = 0;
    cards.forEach(function(card){ var h = card.offsetHeight; if(h > maxH) maxH = h; });
    if(maxH > 0) root.style.setProperty('--card-fixed-height', maxH + 'px');
  }

  function setupObservers(root){
    if(root.__ucObserversSetup) return;
    root.__ucObserversSetup = true;

    var recalc = debounce(function(){ recalcEqualHeights(root); }, 60);
    window.addEventListener('resize', recalc);

    // images
    root.querySelectorAll('img').forEach(function(img){
      if(img.complete) return;
      img.addEventListener('load', recalc, { once:true });
      img.addEventListener('error', recalc, { once:true });
    });

    // size changes
    if('ResizeObserver' in window){
      var ro = new ResizeObserver(recalc);
      ro.observe(root);
      root.__ucRO = ro;
    }

    // class flips (e.g., toggling .is-grid)
    if('MutationObserver' in window){
      var mo = new MutationObserver(function(list){
        list.forEach(function(m){
          if(m.type === 'attributes' && m.attributeName === 'class') recalc();
        });
      });
      mo.observe(root, { attributes:true });
      root.__ucMO = mo;
    }

    requestAnimationFrame(recalc);
    setTimeout(recalc, 300);
  }

  function initUC(el){
    var root = typeof el === 'string' ? document.getElementById(el) : el;
    if(!root) return;

    // read actual content bg → CSS vars (drives dots & dark mode)
    var content = root.querySelector('.ue-carousel-content, .ue-carousel-content-inside');
    if(content){
      var cs = getComputedStyle(content);
      var bg = cs.backgroundColor || cs.background || '';
      if(bg){
        root.style.setProperty('--content-bg', bg);
        root.style.setProperty('--dot-inactive', bg);
        if(rgbToLuma(bg) < 0.45) root.classList.add('dark-ui');
        else root.classList.remove('dark-ui');
      }
    }

    setupObservers(root);
  }

  function ready(fn){ document.readyState !== 'loading' ? fn() : document.addEventListener('DOMContentLoaded', fn); }

  ready(function(){
    document.querySelectorAll('.ue-horizontal-timeline[id]').forEach(initUC);
  });

  if(window.elementorFrontend && elementorFrontend.hooks){
    elementorFrontend.hooks.addAction('frontend/element_ready/global', function(scope){
      scope.querySelectorAll('.ue-horizontal-timeline[id]').forEach(initUC);
    });
  }

  // manual hook if needed
  window.UC_GridTimeline_refresh = function(rootOrId){
    var el = typeof rootOrId === 'string' ? document.getElementById(rootOrId) : rootOrId;
    if(el) initUC(el);
  };
})();
(function(){
  // ---- CONFIG ----
  var BREAKPOINT = 1025; // < this = carousel, >= this = grid

  // ---- tiny helpers ----
  function $q(sel, ctx){ return (ctx||document).querySelector(sel); }
  function $qa(sel, ctx){ return Array.prototype.slice.call((ctx||document).querySelectorAll(sel)); }

  // Wait for jQuery
  function onjQuery(cb){
    if (window.jQuery) cb(window.jQuery);
    else setTimeout(function(){ onjQuery(cb); }, 20);
  }

  // Wait for Owl plugin (if loaded)
  function onOwl(cb){
    onjQuery(function($){
      if ($.fn && $.fn.owlCarousel) cb($);
      else setTimeout(function(){ onOwl(cb); }, 40);
    });
  }

  // If Owl never loads, we add CSS scroll-snap fallback
  function enableSnap(el){
    if (!el.classList.contains('use-snap')) el.classList.add('use-snap');
    el.classList.remove('is-grid');
  }

  // Equalize heights (grid rows)
  function equalizeGridRows($wrap){
    var $items = $wrap.children('.ue-carousel-item');
    if (!$items.length) return;
    $items.find('.ue-carousel-item-holder').css('height','auto');
    var rows = {};
    $items.each(function(){
      var $it = window.jQuery(this);
      var top = Math.round($it.position().top);
      (rows[top] = rows[top] || []).push($it);
    });
    Object.keys(rows).forEach(function(k){
      var maxH = 0;
      rows[k].forEach(function($it){ maxH = Math.max(maxH, $it.find('.ue-carousel-item-holder').outerHeight()); });
      rows[k].forEach(function($it){ $it.find('.ue-carousel-item-holder').height(maxH); });
    });
  }

  // Equalize active slides (carousel)
  function equalizeCarouselActive($wrap){
    var $active = $wrap.find('.owl-item.active .ue-carousel-item-holder');
    if (!$active.length) return;
    $wrap.find('.ue-carousel-item-holder').css('height','auto');
    var maxH = 0;
    $active.each(function(){ maxH = Math.max(maxH, window.jQuery(this).outerHeight()); });
    $active.height(maxH);
  }

  // Ensure one wrapper only
  function dedupeWrappers(root){
    var wraps = root.querySelectorAll('.uc-items-wrapper');
    if (wraps.length > 1){
      for (var i=1;i<wraps.length;i++){ wraps[i].parentNode.removeChild(wraps[i]); }
      console.warn('[UE Timeline] Removed duplicate wrappers in', root);
    }
    return root.querySelector('.uc-items-wrapper');
  }

  // Core init for a single timeline
  function initOne(root){
    var el = root;
    var wrap = dedupeWrappers(el);
    if (!wrap) return;

    // Decide mode
    var toCarousel = function($){
      // already owl?
      if (!window.jQuery(wrap).hasClass('owl-loaded')){
        window.jQuery(wrap)
          .owlCarousel({
            items: 1,
            margin: 0,
            dots: true,
            nav: false,
            autoHeight: false,
            smartSpeed: 300
          })
          .on('initialized.owl.carousel changed.owl.carousel refreshed.owl.carousel', function(){
            equalizeCarouselActive(window.jQuery(wrap));
          });
      }
      el.classList.remove('is-grid');
      equalizeCarouselActive(window.jQuery(wrap));
    };

    var toGrid = function(){
      // destroy owl if present
      if (window.jQuery(wrap).hasClass('owl-loaded')){
        window.jQuery(wrap).trigger('destroy.owl.carousel');
        window.jQuery(wrap).removeAttr('style');
        window.jQuery(wrap).find('.owl-stage-outer, .owl-stage, .owl-item')
          .removeAttr('style').removeClass('active');
      }
      el.classList.add('is-grid');
      equalizeGridRows(window.jQuery(wrap));
    };

    // Apply current mode
    function applyMode(){
      var w = window.innerWidth;
      if (w < BREAKPOINT){
        // Try Owl; if not available, scroll-snap fallback
        if (window.jQuery && window.jQuery.fn && window.jQuery.fn.owlCarousel){
          toCarousel(window.jQuery);
        } else {
          enableSnap(el);
        }
      } else {
        toGrid();
      }
    }

    // Wait for images to avoid wrong measurements
    function onImagesReady(cb){
      var imgs = wrap.querySelectorAll('img');
      if (!imgs.length) return cb();
      var left = imgs.length;
      imgs.forEach(function(img){
        if (img.complete) { if(--left===0) cb(); }
        else {
          img.addEventListener('load', function(){ if(--left===0) cb(); }, {once:true});
          img.addEventListener('error', function(){ if(--left===0) cb(); }, {once:true});
        }
      });
    }

    onImagesReady(function(){
      applyMode();
    });

    // Re-apply on resize/orientation
    var ro = function(){ applyMode(); };
    window.addEventListener('resize', ro);
    window.addEventListener('orientationchange', ro);
  }

  // Init all timelines in DOM
  function initAll(){
    $qa('.js-ue-timeline').forEach(initOne);
  }

  // Elementor support: run after Elementor renders widgets, popups, etc.
  function hookElementor(){
    if (!window.elementorFrontend || !elementorFrontend.hooks) return;
    elementorFrontend.hooks.addAction('frontend/element_ready/global', function(){ initAll(); });
    if (elementorFrontend.elementsHandler){
      elementorFrontend.elementsHandler.addHandler(class { onInit(){ initAll(); }});
    }
  }

  // Mutation Observer (for AJAX / dynamic content)
  function observeDom(){
    var mo = new MutationObserver(function(muts){
      var need = false;
      muts.forEach(function(m){
        if (m.addedNodes && m.addedNodes.length){
          for (var i=0;i<m.addedNodes.length;i++){
            if (m.addedNodes[i].nodeType === 1 && m.addedNodes[i].matches && m.addedNodes[i].matches('.js-ue-timeline, .js-ue-timeline *')){
              need = true; break;
            }
          }
        }
      });
      if (need) initAll();
    });
    mo.observe(document.documentElement, {childList:true, subtree:true});
  }

  // Boot sequence
  onjQuery(function($){
    // If Owl never appears, we’ll still init with scroll-snap (mobile).
    // But if Owl DOES load later, switch to real carousel.
    initAll();
    hookElementor();
    observeDom();

    // Upgrade from snap -> Owl once Owl loads
    onOwl(function(){
      $qa('.js-ue-timeline.use-snap').forEach(function(el){
        el.classList.remove('use-snap');
      });
      initAll();
    });
  });

})();
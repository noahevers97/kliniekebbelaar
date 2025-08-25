jQuery(function($){
  var id = '{{uc_id}}';
  var GRID_BREAKPOINT = {{ grid_breakpoint | default(980) }}; // ≥ this → grid; below → carousel

  // pick the first root; strip duplicate IDs
  var $roots = $('[id="'+id+'"].ue-horizontal-timeline');
  if (!$roots.length) return;
  var $root = $roots.first();
  $roots.not($root).removeAttr('id');
  $root.find('[id="'+id+'"]').not($root).removeAttr('id');

  // use only the first items wrapper
  var $wraps = $root.find('.uc-items-wrapper');
  if (!$wraps.length) return;
  var $wrap = $wraps.first();
  $wraps.not($wrap).remove();

  if (!$wrap.hasClass('owl-carousel')) $wrap.addClass('owl-carousel');

  function initOwl(){
    if ($wrap.hasClass('owl-loaded')) return;
    $wrap.owlCarousel({
      loop: {{loop}},
      rtl: {{rtl}},
      dots: {{show_dots}},
      nav: false,
      center: {{ue_center}},
      autoplay: {{autoplay}},
      autoplayTimeout: {{autoplay_timeout}},
      autoplayHoverPause: {{autoplay_hover_pause}},
      smartSpeed: {{transition_speed}},
      margin: 0,
      responsive:{
        0:   { items: {{number_of_items_mobile}} {% if stage_padding_type != 'none' %}, stagePadding: {{stage_padding_mobile}} {% endif %} },
        768: { items: {{number_of_items_tablet}} {% if stage_padding_type != 'none' %}, stagePadding: {{stage_padding_tablet}} {% endif %} }
      }
    });
    $root.find('.carousel-next').off('click').on('click', function(){ $wrap.trigger('next.owl.carousel'); });
    $root.find('.carousel-prev').off('click').on('click', function(){ $wrap.trigger('prev.owl.carousel'); });
  }

  function destroyOwl(){
    if ($wrap.hasClass('owl-loaded')) $wrap.trigger('destroy.owl.carousel');
    $wrap.removeClass('owl-loaded owl-hidden').find('.owl-stage-outer').children().unwrap();
  }

  function applyMode(){
    var w = window.innerWidth || document.documentElement.clientWidth;
    if (w >= GRID_BREAKPOINT){
      destroyOwl();
      $root.addClass('is-grid');
    }else{
      $root.removeClass('is-grid');
      initOwl();
    }
  }

  applyMode();
  var t; $(window).on('resize', function(){ clearTimeout(t); t = setTimeout(applyMode,150); });
  $(document).on('uc:refresh:'+id, function(){ applyMode(); });
});
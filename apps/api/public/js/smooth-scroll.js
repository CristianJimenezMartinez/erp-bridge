/**
 * Bentian ERP Bridge — Desplazamiento Suave y Compensación Header Sticky
 */
(function initSmoothScrollCompensation() {
  document.addEventListener('click', function(e) {
    var anchor = e.target.closest('a[href^="#"]');
    if (!anchor) return;
    var href = anchor.getAttribute('href');
    if (!href || href === '#' || href.length < 2) return;

    var targetId = href.substring(1);
    var targetEl = document.getElementById(targetId);
    if (!targetEl) return;

    e.preventDefault();
    var headerHeight = 64; // Altura fija de header sticky h-16
    var paddingOffset = 20; // Espaciado visual de respiro superior
    var elementPosition = targetEl.getBoundingClientRect().top;
    var offsetPosition = elementPosition + window.pageYOffset - (headerHeight + paddingOffset);

    window.scrollTo({
      top: Math.max(0, offsetPosition),
      behavior: 'smooth'
    });

    if (window.history && window.history.pushState) {
      window.history.pushState(null, null, href);
    } else {
      window.location.hash = href;
    }
  });
})();

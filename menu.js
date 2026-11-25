/* =====================================================================
   REVA — Menu mobile (burger)
   Script autonome, chargé sur toutes les pages : il fonctionne même si
   le script principal de la page (3D, catalogue…) ne se charge pas.
   ===================================================================== */
(function () {
  function init() {
    var burger = document.getElementById('burger');
    var menu = document.getElementById('m-menu');
    var close = document.getElementById('m-close');
    if (!burger || !menu) return;

    function open() {
      menu.classList.add('open');
      document.body.classList.add('lock');
      burger.setAttribute('aria-expanded', 'true');
    }
    function shut() {
      menu.classList.remove('open');
      document.body.classList.remove('lock');
      burger.setAttribute('aria-expanded', 'false');
    }

    burger.setAttribute('aria-controls', 'm-menu');
    burger.setAttribute('aria-expanded', 'false');
    burger.addEventListener('click', open);
    if (close) close.addEventListener('click', shut);
    // un lien du menu referme le menu (utile pour les ancres #contact, #studio…)
    menu.addEventListener('click', function (e) { if (e.target.closest('a')) shut(); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') shut(); });
    // repasse en grand écran : on referme
    window.addEventListener('resize', function () { if (window.innerWidth > 980) shut(); });
  }
  // sécurité page d'accueil : si la 3D ne se charge pas (réseau lent, WebGL indisponible),
  // l'écran de chargement ne doit pas bloquer le site indéfiniment.
  setTimeout(function () {
    var l = document.getElementById('loader');
    if (l && !l.classList.contains('done')) l.classList.add('done');
  }, 12000);

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();

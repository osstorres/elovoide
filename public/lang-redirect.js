(function () {
  var nav = (navigator.languages && navigator.languages[0]) || navigator.language || 'es';
  location.replace(/^es\b/i.test(nav) ? '/es' : '/en');
})();

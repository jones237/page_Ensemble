// Diagnostic : si l'application plante avant d'afficher quoi que ce soit,
// l'erreur est montrée à l'écran (copiez-la ou prenez une capture).
(function () {
  function show(msg) {
    var r = document.getElementById('root');
    if (!r || !document.getElementById('boot')) return;
    r.innerHTML = '<div style="font-family:system-ui,sans-serif;padding:24px;max-width:720px;margin:auto">' +
      '<h2 style="color:#b91c1c">PageEnsemble n\'a pas pu démarrer</h2>' +
      '<pre style="white-space:pre-wrap;background:#f3f4f6;padding:12px;border-radius:8px;font-size:13px"></pre></div>';
    r.querySelector('pre').textContent = msg;
  }
  window.addEventListener('error', function (e) { show((e.message || 'Erreur') + (e.filename ? '\n' + e.filename + ':' + e.lineno : '')); });
  window.addEventListener('unhandledrejection', function (e) { show('Promesse rejetée : ' + (e.reason && e.reason.message || e.reason)); });
})();

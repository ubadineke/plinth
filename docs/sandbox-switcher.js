(function () {
  const SHARED_KEY = 'sk_test_DOCS_SHARED_KEY';
  const STORAGE_KEY = 'nomba_sandbox_key';

  function getPersonalKey() {
    try { return localStorage.getItem(STORAGE_KEY); } catch { return null; }
  }

  function clearPersonalKey() {
    try { localStorage.removeItem(STORAGE_KEY); } catch {}
    removeBadge();
    replaceKeysInPage(SHARED_KEY, SHARED_KEY); // no-op but triggers a re-render
    window.location.reload();
  }

  function replaceKeysInPage(from, to) {
    if (from === to) return;
    document.querySelectorAll('code, pre').forEach(function (el) {
      if (el.childNodes.length > 0) {
        el.childNodes.forEach(function (node) {
          if (node.nodeType === Node.TEXT_NODE) {
            node.textContent = node.textContent.replace(new RegExp(from, 'g'), to);
          }
        });
      }
    });
  }

  function injectBadge(key) {
    removeBadge();
    var badge = document.createElement('div');
    badge.id = 'nomba-sandbox-badge';
    badge.style.cssText = [
      'position:fixed', 'bottom:20px', 'right:20px', 'z-index:9999',
      'background:#4f46e5', 'color:#fff', 'padding:8px 14px',
      'border-radius:8px', 'font-size:12px', 'font-family:system-ui,sans-serif',
      'display:flex', 'align-items:center', 'gap:10px',
      'box-shadow:0 4px 12px rgba(0,0,0,0.15)',
    ].join(';');

    var label = document.createElement('span');
    label.textContent = '🔑 Using your sandbox (' + key.slice(0, 16) + '…)';

    var reset = document.createElement('button');
    reset.textContent = 'Reset';
    reset.style.cssText = [
      'background:rgba(255,255,255,0.2)', 'border:none', 'color:#fff',
      'padding:3px 8px', 'border-radius:4px', 'cursor:pointer', 'font-size:11px',
    ].join(';');
    reset.addEventListener('click', clearPersonalKey);

    badge.appendChild(label);
    badge.appendChild(reset);
    document.body.appendChild(badge);
  }

  function removeBadge() {
    var existing = document.getElementById('nomba-sandbox-badge');
    if (existing) existing.remove();
  }

  function init() {
    var personalKey = getPersonalKey();
    if (!personalKey || personalKey === SHARED_KEY) return;
    replaceKeysInPage(SHARED_KEY, personalKey);
    injectBadge(personalKey);
  }

  // Run after DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Re-run on soft navigation (Mintlify uses client-side routing)
  var lastUrl = location.href;
  new MutationObserver(function () {
    if (location.href !== lastUrl) {
      lastUrl = location.href;
      setTimeout(init, 300);
    }
  }).observe(document, { subtree: true, childList: true });
})();

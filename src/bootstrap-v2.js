// Compatibility shim for stale cached Project V v2 pages.
// The current site loads src/main.js directly from index.html.
const url = new URL(location.href);
if (url.searchParams.get('pv') !== '6') {
  url.searchParams.set('pv', '6');
  location.replace(url.href);
} else {
  // If an old shell is somehow still cached after the cache-busted reload,
  // fetch the current document one more time instead of executing the retired bundle.
  fetch(`./index.html?pv=6&t=${Date.now()}`, { cache: 'no-store' })
    .then(r => {
      if (!r.ok) throw new Error(`Project V refresh failed (${r.status})`);
      return r.text();
    })
    .then(html => {
      document.open();
      document.write(html);
      document.close();
    })
    .catch(error => {
      console.error('Project V compatibility refresh failed:', error);
      document.body.innerHTML = '<main style="min-height:100vh;background:#0b0d10;color:#fff;font-family:-apple-system,BlinkMacSystemFont,system-ui;padding:28px"><h1>Project V</h1><p>Refresh this page once to load the current runtime.</p></main>';
    });
}

if ('serviceWorker' in navigator) {
  window.addEventListener('load', function () {
    navigator.serviceWorker.register('./service-worker.js') // This must start with '/'
      .then(function (registration) {
        console.log('✅ Service Worker registered with scope:', registration.scope);
      }, function (err) {
        console.log('❌ Service Worker registration failed:', err);
      });
  });
}

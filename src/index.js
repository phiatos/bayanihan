if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    // Register the service worker
    navigator.serviceWorker.register('./service-worker.js')
      .then(reg => console.log('SW registered!', reg))
      .catch(err => console.error('SW registration failed:', err));

    // Fetch and insert sidebar content after the page loads
    fetch('/Bayanihan-PWA/src/components/sidebar/sidebar.html')
      .then(res => {
        if (!res.ok) {
          throw new Error('Failed to load sidebar.html: ' + res.statusText);
        }
        return res.text();
      })
      .then(data => {
        const container = document.getElementById('sidebar-container');
        if (container) {
          container.innerHTML = data;
        } else {
          console.error('Sidebar container not found');
        }

        // Dynamically load the sidebar's CSS
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = '/Bayanihan-PWA/src/components/sidebar/sidebar.css';
        document.head.appendChild(link);

        // Dynamically load the sidebar's JS
        const script = document.createElement('script');
        script.src = '/Bayanihan-PWA/src/components/sidebar/sidebar.js';
        script.onload = () => {
          console.log('Sidebar JS loaded successfully');
        };
        script.onerror = () => {
          console.error('Failed to load sidebar.js');
        };
        document.body.appendChild(script);
      })
      .catch(err => console.error('Error loading sidebar:', err));
  });
}
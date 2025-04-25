if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    // Register service worker
    navigator.serviceWorker.register('/service-worker.js')
      .then(reg => console.log('SW registered!', reg))
      .catch(err => console.error('SW registration failed:', err));

    // Load sidebar
    fetch('/src/components/sidebar/sidebar.html')
      .then(res => {
        if (!res.ok) throw new Error(`Failed to load sidebar: ${res.statusText}`);
        return res.text();
      })
      .then(html => {
        const container = document.getElementById('sidebar-container');
        if (!container) return console.error('Sidebar container not found');
        
        container.innerHTML = html;

        // Load sidebar styles
        const style = document.createElement('link');
        style.rel = 'stylesheet';
        style.href = '/src/components/sidebar/sidebar.css';
        document.head.appendChild(style);

        // Load sidebar script
        const script = document.createElement('script');
        script.src = '/src/components/sidebar/sidebar.js';
        script.onload = () => console.log('Sidebar script loaded');
        script.onerror = () => console.error('Failed to load sidebar.js');
        document.body.appendChild(script);
      })
      .catch(err => console.error('Sidebar load error:', err));
  });
}

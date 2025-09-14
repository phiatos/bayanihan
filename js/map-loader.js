import { Loader } from 'https://unpkg.com/@googlemaps/js-api-loader@1.16.2/dist/index.esm.js';
const loader = new Loader({
    apiKey: 'AIzaSyAAAu6BeQjIZ7H7beFbAsPWuKuORmh0wrk',
    version: 'weekly',
    libraries: ['places', 'marker']
});
loader.load().then(() => window.initMap()).catch(error => {
    console.error('Failed to load Google Maps API:', error.message, error.stack);
    Swal.fire({
        icon: 'error',
        title: 'Map Loading Error',
        text: `Unable to load the map: ${error.message}. Please try refreshing the page.`,
        confirmButtonText: 'OK'
    });
});
// window.addEventListener('load', () => {
//   // Register service worker
//   if ('serviceWorker' in navigator) {
//     navigator.serviceWorker
//       .register('./service-worker.js')
//       .then((registration) => {
//         console.log('Service Worker registered with scope:', registration.scope);
//       })
//       .catch((error) => {
//         console.error('Service Worker registration failed:', error);
//       });
//   }
// });

let map;
let geoJsonLayer;
let markers = [];
let activationsListenerQuery;
let activationsListenerCallback;

const firebaseConfig = {
    apiKey: "AIzaSyDJxMv8GCaMvQT2QBW3CdzA3dV5X_T2KqQ",
    authDomain: "bayanihan-5ce7e.firebaseapp.com",
    databaseURL: "https://bayanihan-5ce7e-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "bayanihan-5ce7e",
    storageBucket: "bayanihan-5ce7e.appspot.com",
    messagingSenderId: "593123849917",
    appId: "1:593123849917:web:eb85a63a536eeff78ce9d4",
    measurementId: "G-ZTQ9VXXVV0",
};

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const database = firebase.database();

console.log('Firebase DB initialized:', database);

function initializeMap() {
    const mapDiv = document.getElementById("map");
    if (!mapDiv) {
        Swal.fire({
            icon: "error",
            title: "Map Error",
            text: "Map container not found.",
        });
        return;
    }

    const philippinesBounds = {
        north: 21.5,
        south: 4.5,
        west: 114.0,
        east: 127.0
    };

    const defaultLocation = { lat: 14.5995, lng: 121.05 };

    map = new google.maps.Map(mapDiv, {
        center: defaultLocation,
        zoom: 6,
        restriction: {
            latLngBounds: philippinesBounds,
            strictBounds: true
        },
        mapTypeId: "roadmap"
    });

    // Load GeoJSON
    fetch('./json/ph_admin1.geojson') // <-- Removed duplicate .json extension, check your actual filename!
        .then(res => {
            if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
            return res.json();
        })
        .then(data => {
            console.log("GeoJSON loaded:", data);

            geoJsonLayer = map.data;
            geoJsonLayer.addGeoJson(data);

            geoJsonLayer.setStyle({
                fillColor: '#FA3B99',
                fillOpacity: 0.5,
                strokeColor: '#FFF',
                strokeWeight: 1,
                clickable: false
            });

            geoJsonLayer.addListener('mouseover', event => {
                geoJsonLayer.overrideStyle(event.feature, { fillOpacity: 0.7 });
            });

            geoJsonLayer.addListener('mouseout', event => {
                geoJsonLayer.revertStyle(event.feature);
            });

            geoJsonLayer.addListener('click', event => {
                const props = event.feature.getProperties ? event.feature.getProperties() : {};
                const name = event.feature.getProperty("name") || event.feature.getProperty("NAME_1") || "Unnamed Province";
                const content = `<strong>${name}</strong>`;
                const infowindow = new google.maps.InfoWindow({
                    content,
                    position: event.latLng
                });
                infowindow.open(map);
            });

            // After loading GeoJSON, add markers from Firebase
            addMarkersForActiveActivations();
        })
        .catch(err => {
            console.error("Failed to load GeoJSON:", err);
            Swal.fire({
                icon: "error",
                title: "GeoJSON Error",
                text: "Could not load the province boundaries."
            });
        });
}

function addMarkersForActiveActivations() {
    if (!map) {
        console.error("Map not initialized before adding markers");
        return;
    }

    // Remove old listener if exists
    if (activationsListenerQuery && activationsListenerCallback) {
        activationsListenerQuery.off("value", activationsListenerCallback);
        console.log("Removed previous activations listener");
    }

    activationsListenerQuery = database.ref("activations").orderByChild("status").equalTo("active");

    activationsListenerCallback = snapshot => {
        markers.forEach(marker => marker.setMap(null));
        markers = [];

        const activations = snapshot.val();
        console.log("Firebase activations snapshot:", activations);

        if (!activations) {
            console.log("No active activations found in Firebase.");
            return;
        }

        Object.entries(activations).forEach(([key, activation]) => {
            if (!activation.latitude || !activation.longitude) {
                console.warn(`Skipping activation ${key} due to missing lat/lng`);
                return;
            }

            const lat = parseFloat(activation.latitude);
            const lng = parseFloat(activation.longitude);
            if (isNaN(lat) || isNaN(lng)) {
                console.warn(`Skipping activation ${key} due to invalid lat/lng`);
                return;
            }

            const position = { lat, lng };

            const marker = new google.maps.Marker({
                position,
                map,
                title: activation.organization || "Organization Unknown",
                icon: {
                    url: "https://maps.google.com/mapfiles/ms/icons/red-dot.png",
                }
            });

            markers.push(marker);
        });

        console.log(`Added ${markers.length} markers to the map.`);
    };

    activationsListenerQuery.on("value", activationsListenerCallback);
    console.log('addMarkersForActiveActivations listener attached');
}







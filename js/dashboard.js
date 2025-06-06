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

let map, markers = [], geocoder, autocomplete, reportsListener, userRole, userEmail, userUid, currentInfoWindow, singleInfoWindow, isInfoWindowClicked = false;
let calamityMarkers = [], calamityListener, notificationsListener;

// Session lock to prevent multiple executions
const SESSION_KEY = 'dashboard_initialized';
const CALAMITY_TRACKING_KEY = 'calamity_tracking_lock';
const SESSION_TIMESTAMP_KEY = 'session_timestamp';
const PROCESSED_CALAMITIES_KEY = 'processed_calamities';
const PROCESSED_NOTIFICATIONS_KEY = 'processed_notifications';

// Persistent in-memory cache, synced with sessionStorage
let processedCalamities = new Set();
let processedNotifications = new Set();

// Sync Sets with sessionStorage on modification
function syncProcessedCalamities() {
    sessionStorage.setItem(PROCESSED_CALAMITIES_KEY, JSON.stringify([...processedCalamities]));
}
function syncProcessedNotifications() {
    sessionStorage.setItem(PROCESSED_NOTIFICATIONS_KEY, JSON.stringify([...processedNotifications]));
}

// Variables for inactivity detection
let inactivityTimeout;
const INACTIVITY_TIME = 1800000; // 30 minutes

// API keys
const WEATHER_API_KEY = "a98203b9ad890d981c589718b2d6d69d";
const GEMINI_API_KEY = "AIzaSyDWv5Yh1VjKzP4pVIhyyr6hu54nlPvx61Y";
const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent";

// Cache for API responses (persisted in sessionStorage)
const apiCache = {
    get: (key) => {
        const cached = sessionStorage.getItem(`apiCache_${key}`);
        return cached ? JSON.parse(cached) : null;
    },
    set: (key, value) => {
        sessionStorage.setItem(`apiCache_${key}`, JSON.stringify(value));
    },
    has: (key) => !!sessionStorage.getItem(`apiCache_${key}`),
};

// Emergency hotlines
const emergencyHotlines = {
    national: {
        NDRRMC: ["(02) 911-1406", "(02) 912-2665"],
        PNP: ["117", "166"],
        BFP: ["160"],
        RedCross: ["143", "(02) 8790-2300"],
    },
    cebu: {
        BFP: ["(032) 261-9111"],
    },
};

// Provinces list for weather and calamity tracking
const provinces = [
    { name: "Metro Manila", lat: 14.5995, lng: 120.9842 },
    { name: "Cebu", lat: 10.3157, lng: 123.8854 },
    { name: "Davao del Sur", lat: 6.7669, lng: 125.3572 },
    { name: "Ilocos Norte", lat: 18.1648, lng: 120.5927 },
    { name: "Albay", lat: 13.1391, lng: 123.7230 },
];

// Throttle utility to reduce frequent updates
const throttle = (func, limit) => {
    let lastFunc, lastRan;
    return function (...args) {
        if (!lastRan) {
            func.apply(this, args);
            lastRan = Date.now();
        } else {
            clearTimeout(lastFunc);
            lastFunc = setTimeout(() => {
                if (Date.now() - lastRan >= limit) {
                    func.apply(this, args);
                    lastRan = Date.now();
                }
            }, limit - (Date.now() - lastRan));
        }
    };
};

// Reset inactivity timer
const resetInactivityTimer = throttle(() => {
    clearTimeout(inactivityTimeout);
    inactivityTimeout = setTimeout(checkInactivity, INACTIVITY_TIME);
    console.log("Lenlen: Inactivity timer reset.");
}, 500);

// Check inactivity
function checkInactivity() {
    Swal.fire({
        title: 'Are you still there?',
        text: "You've been inactive for a while. Do you want to continue your session or log out?",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#3085d6',
        cancelButtonColor: '#d33',
        confirmButtonText: 'Stay Logged In',
        cancelButtonText: 'Log Out',
        allowOutsideClick: false,
        reverseButtons: true
    }).then((result) => {
        if (result.isConfirmed) {
            resetInactivityTimer();
            console.log("Lenlen: User chose to continue session.");
        } else if (result.dismiss === Swal.DismissReason.cancel) {
            auth.signOut().then(() => {
                console.log("Lenlen: User logged out due to inactivity.");
                window.location.href = "../pages/login.html";
            }).catch((error) => {
                console.error("Lenlen: Error logging out:", error);
                Swal.fire('Error', 'Failed to log out. Please try again.', 'error');
            });
        }
    });
}

// Attach activity listeners
['mousemove', 'keydown', 'click', 'scroll'].forEach(eventType => {
    document.addEventListener(eventType, resetInactivityTimer);
});

// Format numbers
function formatLargeNumber(numStr) {
    let num = BigInt(numStr || '0');
    const trillion = 1_000_000_000_000n;
    const billion = 1_000_000_000n;
    const million = 1_000_000n;
    const thousand = 1_000n;

    if (num >= trillion) return (Number(num) / Number(trillion)).toFixed(2).replace(/\.?0+$/, '') + 'T';
    if (num >= billion) return (Number(num) / Number(billion)).toFixed(2).replace(/\.?0+$/, '') + 'B';
    if (num >= million) return (Number(num) / Number(million)).toFixed(2).replace(/\.?0+$/, '') + 'M';
    if (num >= thousand) return (Number(num) / Number(thousand)).toFixed(2).replace(/\.?0+$/, '') + 'k';
    return num.toString();
}

function animateNumber(elementId, target, duration = 1000, decimals = 0) {
    const element = document.getElementById(elementId);
    if (!element) return;

    let start = 0;
    const stepTime = 16;
    const steps = duration / stepTime;
    const increment = target / steps;
    let currentStep = 0;

    function step() {
        currentStep++;
        start += increment;
        if (currentStep >= steps) start = target;

        const displayValue = decimals > 0 ? start.toFixed(decimals) : Math.floor(start);
        element.textContent = formatNumber(parseFloat(displayValue), elementId);
        highlight(element);

        if (currentStep < steps) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
}

function formatNumber(num, id) {
    if (id === 'amount-raised' || id === 'inkind-donations') return '₱' + abbreviateNumber(num);
    if (num >= 10000) return formatLargeNumber(num.toString());
    return num.toLocaleString();
}

function abbreviateNumber(number) {
    const absNumber = Math.abs(number);
    if (absNumber >= 1.0e+9) return (number / 1.0e+9).toFixed(2) + "B";
    if (absNumber >= 1.0e+6) return (number / 1.0e+6).toFixed(2) + "M";
    if (absNumber >= 1.0e+3) return (number / 1.0e+3).toFixed(2) + "K";
    return number.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function highlight(element) {
    element.style.transition = 'color 0.3s ease';
    element.style.color = '#FFF';
    setTimeout(() => element.style.color = '#FFF', 300);
}

// Elements
const headerEl = document.querySelector("header");
const foodPacksEl = document.getElementById("food-packs");
const hotMealsEl = document.getElementById("hot-meals");
const waterLitersEl = document.getElementById("water-liters");
const volunteersEl = document.getElementById("volunteers");
const amountRaisedEl = document.getElementById("amount-raised");
const inKindDonationsEl = document.getElementById("inkind-donations");
const searchInput = document.getElementById("search-input");

// Initialize dashboard with session lock
window.initializeDashboard = function () {
    const sessionInitialized = sessionStorage.getItem(SESSION_KEY);
    const sessionTimestamp = sessionStorage.getItem(SESSION_TIMESTAMP_KEY);
    const currentTime = Date.now();
    const sessionAgeLimit = 30 * 60 * 1000;

    if (sessionInitialized && sessionTimestamp && (currentTime - parseInt(sessionTimestamp) < sessionAgeLimit)) {
        console.log("Dashboard already initialized in this session, skipping. Timestamp:", new Date(parseInt(sessionTimestamp)).toISOString());
        return;
    }

    console.log("Lenlen: Initializing dashboard at", new Date().toISOString());
    cleanupDashboard();

    sessionStorage.setItem(SESSION_KEY, 'true');
    sessionStorage.setItem(SESSION_TIMESTAMP_KEY, currentTime.toString());

    auth.onAuthStateChanged(user => {
        if (!user) {
            Swal.fire({
                icon: "error",
                title: "Authentication Required",
                text: "Please sign in to access the dashboard.",
            }).then(() => {
                window.location.href = "../pages/login.html";
            });
            return;
        }
        resetInactivityTimer();
        userUid = user.uid;
        console.log(`Lenlen: Logged-in user UID: ${userUid}`);

        database.ref(`users/${user.uid}`).once("value", snapshot => {
            const userData = snapshot.val();
            if (!userData || !userData.role) {
                console.error(`Lenlen: User data not found for UID: ${user.uid}`);
                Swal.fire({
                    icon: "error",
                    title: "User Data Missing",
                    text: "User role not found. Please contact an administrator.",
                }).then(() => {
                    window.location.href = "../pages/login.html";
                });
                return;
            }

            userRole = userData.role;
            userEmail = user.email;
            console.log(`Lenlen: Role: ${userRole}, Email: ${userEmail}`);

            headerEl.textContent = userRole === "AB ADMIN" ? "Admin Dashboard" : "Volunteer Dashboard";

            initializeMap();
            if (!map) {
                console.error("Lenlen: Map initialization failed.");
                return;
            }

            addWeatherDataForProvinces();
            trackCalamities();
            setupAdminNotifications();
            fetchReports();

            if (userRole === "ABVN") {
                map.setOptions({
                    disableDefaultUI: true,
                    draggable: false,
                });
            }

            cleanDuplicateCalamities();
            cleanDuplicateNotifications();
            cleanOldCalamities();
            migrateLegacyCalamities();

            // Initialize processed sets from database to ensure consistency
            initializeProcessedSets();
        }, error => {
            console.error("Lenlen: Error fetching user data:", error);
            Swal.fire({
                icon: "error",
                title: "Error",
                text: "Failed to load user data. Please try again later.",
            });
        });
    });
};

// Initialize processed sets from database
async function initializeProcessedSets() {
    try {
        // Clear existing caches
        processedCalamities.clear();
        processedNotifications.clear();

        // Load processed calamities from database
        const calamitySnapshot = await database.ref("calamities").once("value");
        const calamities = calamitySnapshot.val();
        if (calamities) {
            Object.values(calamities).forEach(calamity => {
                if (calamity.eventId) processedCalamities.add(calamity.eventId);
                if (calamity.identifier) processedCalamities.add(calamity.identifier);
            });
            syncProcessedCalamities();
            console.log("Initialized processedCalamities from database:", processedCalamities.size);
        }

        // Load processed notifications from database
        const notifSnapshot = await database.ref("notifications").once("value");
        const notifications = notifSnapshot.val();
        if (notifications) {
            Object.values(notifications).forEach(notification => {
                if (notification.eventId) processedNotifications.add(notification.eventId);
                if (notification.identifier) processedNotifications.add(notification.identifier);
            });
            syncProcessedNotifications();
            console.log("Initialized processedNotifications from database:", processedNotifications.size);
        }
    } catch (error) {
        console.error("Error initializing processed sets:", error);
    }
}

// Initialize map
function initializeMap() {
    try {
        console.log("Lenlen: initializeMap called at", new Date().toISOString());
        const mapDiv = document.getElementById("map");
        if (!mapDiv) {
            console.error("Lenlen: Map container not found");
            Swal.fire({
                icon: "error",
                title: "Map Error",
                text: "Map container not found on the page.",
            });
            return;
        }

        const defaultLocation = { lat: 14.5995, lng: 120.9842 };

        if (!window.google || !window.google.maps) {
            console.error("Lenlen: Google Maps API not loaded");
            Swal.fire({
                icon: "error",
                title: "Map Error",
                text: "Google Maps API failed to load. Check your API key or internet connection.",
            });
            return;
        }

        if (!map || mapDiv !== map.getDiv()) {
            map = new google.maps.Map(mapDiv, {
                center: defaultLocation,
                zoom: 6,
                mapTypeId: "roadmap",
            });
            console.log("Lenlen: Map initialized successfully with Google Maps");
        }

        geocoder = new google.maps.Geocoder();

        if (!searchInput) {
            console.error("Lenlen: Search input not found");
            Swal.fire({
                icon: "error",
                title: "Map Error",
                text: "Search input not found on the page.",
            });
            return;
        }

        autocomplete = new google.maps.places.Autocomplete(searchInput, {
            componentRestrictions: { country: "PH" },
            types: ["geocode"],
        });
        autocomplete.bindTo("bounds", map);

        autocomplete.addListener("place_changed", () => {
            const place = autocomplete.getPlace();
            if (!place.geometry || !place.geometry.location) {
                console.log("Lenlen: No valid location selected from autocomplete.");
                Swal.fire({
                    icon: "error",
                    title: "Location Not Found",
                    text: "Please select a valid location from the dropdown.",
                });
                return;
            }

            map.setCenter(place.geometry.location);
            map.setZoom(12);
            console.log("Lenlen: Map centered on:", place.geometry.location.toString());
        });

        google.maps.event.trigger(map, "resize");
        console.log("Lenlen: Map resize event triggered");

        singleInfoWindow = new google.maps.InfoWindow();

        // Add map click listener for weather
        map.addListener("click", (event) => {
            showWeatherInfoWindow(event.latLng.lat(), event.latLng.lng());
        });
    } catch (error) {
        console.error("Lenlen: Failed to initialize Google Maps:", error);
        Swal.fire({
            icon: "error",
            title: "Map Error",
            text: "Failed to load the map. Check your internet connection or API key.",
        });
    }
}

// Add weather data for provinces
function addWeatherDataForProvinces() {
    if (!map) {
        console.error("Lenlen: Map not initialized, cannot add weather data for provinces.");
        return;
    }

    const addWeatherMarker = throttle((province) => {
        console.log(`Fetch weather for ${province.name}`);

        fetch(`https://api.openweathermap.org/data/2.5/weather?lat=${province.lat}&lon=${province.lng}&appid=${WEATHER_API_KEY}&units=metric`)
            .then(response => {
                if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
                return response.json();
            })
            .then(weatherData => {
                fetch(`https://api.openweathermap.org/data/2.5/forecast?lat=${province.lat}&lon=${province.lng}&appid=${WEATHER_API_KEY}&units=metric`)
                    .then(forecastResponse => {
                        if (!forecastResponse.ok) throw new Error(`HTTP error! Status: ${forecastResponse.status}`);
                        return forecastResponse.json();
                    })
                    .then(forecastData => {
                        const condition = weatherData.weather[0].main.toLowerCase();
                        const cloudCover = weatherData.clouds.all || 0;
                        const pop = (forecastData.list[0].pop || 0) * 100;

                        let sunnyPercent = 0, rainyPercent = 0, cloudyPercent = cloudCover;
                        if (condition.includes("clear")) {
                            sunnyPercent = 100 - cloudCover;
                        } else if (condition.includes("rain") || condition.includes("thunderstorm")) {
                            rainyPercent = pop;
                            sunnyPercent = Math.max(0, 100 - rainyPercent - cloudyPercent);
                        } else {
                            sunnyPercent = Math.max(0, 100 - cloudCover);
                        }

                        let icon = "☁️";
                        if (condition.includes("clear")) icon = "☀️";
                        if (condition.includes("thunderstorm")) icon = "⚡";

                        const marker = new google.maps.Marker({
                            position: { lat: province.lat, lng: province.lng },
                            map: map,
                            label: {
                                text: icon,
                                fontSize: '24px',
                            },
                            title: province.name,
                        });

                        markers.push(marker);

                        const weatherInfo = `
                            <div>
                                <b>${province.name} Weather</b><br>
                                Sunny: ${sunnyPercent.toFixed(1)}%<br>
                                Rainy: ${rainyPercent.toFixed(1)}% (Chance of Rain: ${pop.toFixed(1)}%)<br>
                                Cloudy: ${cloudyPercent.toFixed(1)}%<br>
                                Condition: ${weatherData.weather[0].description}<br>
                                Temperature: ${weatherData.main.temp}°C
                            </div>
                        `;
                        const infoWindow = new google.maps.InfoWindow({
                            content: weatherInfo,
                        });

                        marker.addListener("click", () => {
                            if (currentInfoWindow) singleInfoWindow.close();
                            singleInfoWindow.setContent(weatherInfo);
                            singleInfoWindow.open(map, marker);
                            currentInfoWindow = marker;
                            isInfoWindowClicked = true;
                            console.log(`Weather InfoWindow opened for ${province.name}`);
                        });

                        singleInfoWindow?.addListener("closeclick", () => {
                            isInfoWindowClicked = false;
                            currentInfoWindow = null;
                            console.log(`Weather InfoWindow closed for ${province.name}`);
                        });
                    })
                    .catch(error => {
                        console.error(`Error fetching forecast data for ${province.name}:`, error);
                    });
            })
            .catch(error => {
                console.error(`Error fetching weather data for ${province.name}:`, error);
            });
    }, 1000);

    provinces.forEach(province => addWeatherMarker(province));
}

// Track all calamities
function trackCalamities() {
    if (!map) {
        console.error("Map not initialized, cannot track calamities.");
        return;
    }

    const calamityTrackingInitialized = sessionStorage.getItem(CALAMITY_TRACKING_KEY);
    const sessionTimestamp = sessionStorage.getItem(SESSION_TIMESTAMP_KEY);
    const currentTime = Date.now();
    const sessionAgeLimit = 30 * 60 * 1000;

    if (calamityTrackingInitialized && sessionTimestamp && (currentTime - parseInt(sessionTimestamp) < sessionAgeLimit)) {
        console.log("Calamity tracking already executed in this session, skipping. Timestamp:", new Date(parseInt(sessionTimestamp)).toISOString());
        // Load existing calamities from database to display markers
        loadExistingCalamities();
        return;
    }

    console.log("Starting calamity tracking at", new Date().toISOString());
    sessionStorage.setItem(CALAMITY_TRACKING_KEY, 'true');
    sessionStorage.setItem(SESSION_TIMESTAMP_KEY, currentTime.toString());

    calamityMarkers.forEach(marker => marker.setMap(null));
    calamityMarkers = [];

    if (calamityListener) {
        console.log("Calamity listener already exists, removing.");
        calamityListener.off();
        calamityListener = null;
    }

    trackEarthquakes();
    trackFloods();
    trackFire();
    trackTyphoons();
    trackVolcanicEruptions();
    trackLandslides();
    trackTsunamis();
}

// Load existing calamities to display markers without re-tracking
async function loadExistingCalamities() {
    try {
        const snapshot = await database.ref("calamities").once("value");
        const calamities = snapshot.val();
        if (!calamities) {
            console.log("No existing calamities to load.");
            return;
        }

        calamityMarkers.forEach(marker => marker.setMap(null));
        calamityMarkers = [];

        for (const calamity of Object.values(calamities)) {
            if (!calamity.coordinates) continue;
            await addCalamityMarker(calamity.type, calamity.location, calamity.coordinates, calamity.details, calamity.eventId);
        }
        console.log("Loaded existing calamities and added markers.");
    } catch (error) {
        console.error("Error loading existing calamities:", error);
    }
}

// Generate a consistent identifier for a calamity
function generateCalamityIdentifier(type, location, time, magnitude = '', rainfall = '') {
    const normalizedTime = new Date(time);
    normalizedTime.setMinutes(0, 0, 0);
    const timeString = normalizedTime.toISOString();

    const normalizedLocation = location ? location.trim().toLowerCase() : '';
    const normalizedMagnitude = magnitude ? parseFloat(magnitude).toFixed(1) : '';
    const normalizedRainfall = rainfall ? parseFloat(rainfall).toFixed(1) : '';

    const identifier = `${type}|${normalizedLocation}|${timeString}|${normalizedMagnitude}|${normalizedRainfall}`;
    console.log(`Generated identifier for ${type} in ${location}: ${identifier}`);
    return identifier;
}

// Check if a calamity already exists
async function calamityExists(eventId, type, location, time, magnitude = '', rainfall = '') {
    const identifier = generateCalamityIdentifier(type, location, time, magnitude, rainfall);

    // Synchronous check using persisted cache
    if (eventId && processedCalamities.has(eventId)) {
        console.log(`Calamity already processed in persisted cache - Event ID: ${eventId}`);
        return true;
    }
    if (processedCalamities.has(identifier)) {
        console.log(`Calamity already processed in persisted cache - Identifier: ${identifier}`);
        return true;
    }

    // Database check
    try {
        const snapshotByEventId = await database.ref("calamities")
            .orderByChild("eventId")
            .equalTo(eventId)
            .once("value");
        if (snapshotByEventId.val()) {
            console.log(`Calamity found in database by eventId - Event ID: ${eventId}`);
            processedCalamities.add(eventId);
            processedCalamities.add(identifier);
            syncProcessedCalamities();
            return true;
        }

        const snapshotByIdentifier = await database.ref("calamities")
            .orderByChild("identifier")
            .equalTo(identifier)
            .once("value");
        if (snapshotByIdentifier.val()) {
            console.log(`Calamity found in database by identifier - Identifier: ${identifier}`);
            processedCalamities.add(eventId);
            processedCalamities.add(identifier);
            syncProcessedCalamities();
            return true;
        }

        console.log(`Calamity not found in database - Event ID: ${eventId || 'none'}, Identifier: ${identifier}`);
        return false;
    } catch (error) {
        console.error(`Error checking for duplicate calamity:`, error);
        return false;
    }
}

// Track earthquake
async function trackEarthquakes() {
    const philippinesBounds = {
        minLat: 4.5,
        maxLat: 21.0,
        minLon: 116.0,
        maxLon: 128.0,
    };

    const cacheKey = 'earthquakes';
    let data;
    if (apiCache.has(cacheKey)) {
        console.log("Using cached earthquake data.");
        data = apiCache.get(cacheKey);
    } else {
        const url = `https://earthquake.usgs.gov/fdsnws/event/1/query?format=geojson&minlatitude=${philippinesBounds.minLat}&maxlatitude=${philippinesBounds.maxLat}&minlongitude=${philippinesBounds.minLon}&maxlongitude=${philippinesBounds.maxLon}&minmagnitude=4&starttime=${new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()}&endtime=${new Date().toISOString()}`;
        try {
            console.log("Fetching earthquake data from USGS API.");
            const response = await fetch(url);
            if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
            data = await response.json();
            apiCache.set(cacheKey, data);
        } catch (error) {
            console.error("Error fetching earthquake data from USGS:", error);
            try {
                const snapshot = await database.ref("calamities")
                    .orderByChild("type")
                    .equalTo("Earthquake")
                    .limitToLast(5)
                    .once("value");
                const recentQuakes = snapshot.val();
                if (!recentQuakes) return;

                for (const quake of Object.values(recentQuakes)) {
                    await addCalamityMarker("Earthquake", quake.location, quake.coordinates, quake.details, quake.eventId);
                }
            } catch (dbError) {
                console.error("Error fetching recent earthquakes from database:", dbError);
            }
            return;
        }
    }

    await processEarthquakeData(data);
}

async function processEarthquakeData(data) {
    if (!data.features || data.features.length === 0) {
        console.warn("No earthquake data found.");
        return;
    }

    for (const quake of data.features) {
        const eventId = quake.id;
        const coords = quake.geometry.coordinates;
        const magnitude = quake.properties.mag;
        const place = quake.properties.place;
        const time = new Date(quake.properties.time).toISOString();
        const details = `Magnitude: ${magnitude}, Time: ${time}`;

        const exists = await calamityExists(eventId, "Earthquake", place, time, magnitude);
        if (exists) {
            console.log(`Skipping saving duplicate earthquake - Event ID: ${eventId}`);
            await addCalamityMarker("Earthquake", place, { lat: coords[1], lng: coords[0] }, details, eventId);
            continue;
        }

        const identifier = generateCalamityIdentifier("Earthquake", place, time, magnitude);
        processedCalamities.add(eventId);
        processedCalamities.add(identifier);
        syncProcessedCalamities();

        const calamityRef = database.ref("calamities").push();
        await calamityRef.set({
            type: "Earthquake",
            location: place,
            magnitude: magnitude,
            time: time,
            details: details,
            coordinates: { lat: coords[1], lng: coords[0] },
            eventId: eventId,
            identifier: identifier,
            timestamp: Date.now(),
        });

        console.log(`Saved new earthquake - Event ID: ${eventId}, Location: ${place}, Identifier: ${identifier}`);
        await addCalamityMarker("Earthquake", place, { lat: coords[1], lng: coords[0] }, details, eventId);
    }
}

// Track floods
async function trackFloods() {
    const rainfallThreshold = 50;

    const addFloodMarker = throttle(async (province) => {
        const cacheKey = `flood_${province.name}`;
        let forecastData;
        if (apiCache.has(cacheKey)) {
            forecastData = apiCache.get(cacheKey);
        } else {
            try {
                const response = await fetch(`https://api.openweathermap.org/data/2.5/forecast?lat=${province.lat}&lon=${province.lng}&appid=${WEATHER_API_KEY}&units=metric`);
                if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
                forecastData = await response.json();
                apiCache.set(cacheKey, forecastData);
            } catch (error) {
                console.error(`Error fetching flood risk data for ${province.name}:`, error);
                return;
            }
        }

        const rainfall = forecastData.list[0].rain ? forecastData.list[0].rain["3h"] || 0 : 0;
        if (rainfall < rainfallThreshold) return;

        const time = new Date(forecastData.list[0].dt * 1000).toISOString();
        const details = `Rainfall: ${rainfall} mm in last 3 hours, Time: ${time}`;
        const roundedTimestamp = Math.floor(new Date(time).getTime() / (60 * 60 * 1000)) * (60 * 60 * 1000);
        const eventId = `flood_${province.name}_${roundedTimestamp}`;

        const exists = await calamityExists(eventId, "Flood Risk", province.name, time, '', rainfall);
        if (exists) {
            console.log(`Skipping saving duplicate flood risk - Event ID: ${eventId}`);
            await addCalamityMarker("Flood Risk", province.name, { lat: province.lat, lng: province.lng }, details, eventId);
            return;
        }

        const identifier = generateCalamityIdentifier("Flood Risk", province.name, time, '', rainfall);
        processedCalamities.add(eventId);
        processedCalamities.add(identifier);
        syncProcessedCalamities();

        const calamityRef = database.ref("calamities").push();
        await calamityRef.set({
            type: "Flood Risk",
            location: province.name,
            rainfall: rainfall,
            time: time,
            details: details,
            coordinates: { lat: province.lat, lng: province.lng },
            eventId: eventId,
            identifier: identifier,
            timestamp: Date.now(),
        });

        console.log(`Saved new flood risk - Event ID: ${eventId}, Location: ${province.name}, Identifier: ${identifier}`);
        await addCalamityMarker("Flood Risk", province.name, { lat: province.lat, lng: province.lng }, details, eventId);
    }, 1000);

    provinces.forEach(province => addFloodMarker(province));
}

// Track house fires
async function trackFire() {
    const calamityTrackingInitialized = sessionStorage.getItem(CALAMITY_TRACKING_KEY);
    if (calamityTrackingInitialized) {
        console.log("House fire tracking already executed in this session, skipping.");
        return;
    }

    if (calamityListener) {
        calamityListener.off();
        console.log("Removed existing calamity listener for house fires");
    }

    calamityListener = database.ref("calamities").orderByChild("type").equalTo("House Fire").limitToLast(50);
    calamityListener.on("child_added", async snapshot => {
        const fire = snapshot.val();
        if (!fire.coordinates) return;

        const eventId = fire.eventId || snapshot.key;
        const identifier = fire.identifier || generateCalamityIdentifier("House Fire", fire.location, fire.time);
        if (processedCalamities.has(eventId) || processedCalamities.has(identifier)) {
            console.log(`Skipping duplicate house fire - Event ID: ${eventId}, Identifier: ${identifier}`);
            return;
        }

        processedCalamities.add(eventId);
        processedCalamities.add(identifier);
        syncProcessedCalamities();
        await addCalamityMarker("House Fire", fire.location, fire.coordinates, fire.details, eventId);
    }, error => {
        console.error("Error fetching house fire data:", error);
    });
}

// Track typhoons
async function trackTyphoons() {
    const calamityTrackingInitialized = sessionStorage.getItem(CALAMITY_TRACKING_KEY);
    if (calamityTrackingInitialized) {
        console.log("Typhoon tracking already executed in this session, skipping.");
        return;
    }

    const snapshot = await database.ref("calamities").orderByChild("type").equalTo("Typhoon").limitToLast(5).once("value");
    const typhoons = snapshot.val();
    if (!typhoons) return;

    for (const typhoon of Object.values(typhoons)) {
        const eventId = typhoon.eventId || snapshot.key;
        const identifier = typhoon.identifier || generateCalamityIdentifier("Typhoon", typhoon.location, typhoon.time);
        if (processedCalamities.has(eventId) || processedCalamities.has(identifier)) {
            console.log(`Skipping duplicate typhoon - Event ID: ${eventId}, Identifier: ${identifier}`);
            continue;
        }

        processedCalamities.add(eventId);
        processedCalamities.add(identifier);
        syncProcessedCalamities();
        await addCalamityMarker("Typhoon", typhoon.location, typhoon.coordinates, typhoon.details, eventId);
    }
}

// Track volcanic eruptions
async function trackVolcanicEruptions() {
    const calamityTrackingInitialized = sessionStorage.getItem(CALAMITY_TRACKING_KEY);
    if (calamityTrackingInitialized) {
        console.log("Volcanic eruption tracking already executed in this session, skipping.");
        return;
    }

    const snapshot = await database.ref("calamities").orderByChild("type").equalTo("Volcanic Eruption").limitToLast(5).once("value");
    const eruptions = snapshot.val();
    if (!eruptions) return;

    for (const eruption of Object.values(eruptions)) {
        const eventId = eruption.eventId || snapshot.key;
        const identifier = eruption.identifier || generateCalamityIdentifier("Volcanic Eruption", eruption.location, eruption.time);
        if (processedCalamities.has(eventId) || processedCalamities.has(identifier)) {
            console.log(`Skipping duplicate volcanic eruption - Event ID: ${eventId}, Identifier: ${identifier}`);
            continue;
        }

        processedCalamities.add(eventId);
        processedCalamities.add(identifier);
        syncProcessedCalamities();
        await addCalamityMarker("Volcanic Eruption", eruption.location, eruption.coordinates, eruption.details, eventId);
    }
}

// Track landslides
async function trackLandslides() {
    const rainfallThreshold = 100;

    const addLandslideMarker = throttle(async (province) => {
        const calamityTrackingInitialized = sessionStorage.getItem(CALAMITY_TRACKING_KEY);
        if (calamityTrackingInitialized) {
            console.log("Landslide tracking already executed in this session for", province.name, "skipping.");
            return;
        }

        const cacheKey = `landslide_${province.name}`;
        let forecastData;
        if (apiCache.has(cacheKey)) {
            forecastData = apiCache.get(cacheKey);
        } else {
            try {
                const response = await fetch(`https://api.openweathermap.org/data/2.5/forecast?lat=${province.lat}&lon=${province.lng}&appid=${WEATHER_API_KEY}&units=metric`);
                if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
                forecastData = await response.json();
                apiCache.set(cacheKey, forecastData);
            } catch (error) {
                console.error(`Error fetching landslide risk data for ${province.name}:`, error);
                return;
            }
        }

        const rainfall = forecastData.list[0].rain ? forecastData.list[0].rain["3h"] || 0 : 0;
        if (rainfall < rainfallThreshold) return;

        const time = new Date(forecastData.list[0].dt * 1000).toISOString();
        const details = `Rainfall: ${rainfall} mm in last 3 hours, Time: ${time}`;
        const roundedTimestamp = Math.floor(new Date(time).getTime() / (60 * 60 * 1000)) * (60 * 60 * 1000);
        const eventId = `landslide_${province.name}_${roundedTimestamp}`;

        const exists = await calamityExists(eventId, "Landslide Risk", province.name, time, '', rainfall);
        if (exists) {
            console.log(`Skipping saving duplicate landslide risk - Event ID: ${eventId}`);
            await addCalamityMarker("Landslide Risk", province.name, { lat: province.lat, lng: province.lng }, details, eventId);
            return;
        }

        const identifier = generateCalamityIdentifier("Landslide Risk", province.name, time, '', rainfall);
        processedCalamities.add(eventId);
        processedCalamities.add(identifier);
        syncProcessedCalamities();

        const calamityRef = database.ref("calamities").push();
        await calamityRef.set({
            type: "Landslide Risk",
            location: province.name,
            rainfall: rainfall,
            time: time,
            details: details,
            coordinates: { lat: province.lat, lng: province.lng },
            eventId: eventId,
            identifier: identifier,
            timestamp: Date.now(),
        });

        console.log(`Saved new landslide risk - Event ID: ${eventId}, Location: ${province.name}, Identifier: ${identifier}`);
        await addCalamityMarker("Landslide Risk", province.name, { lat: province.lat, lng: province.lng }, details, eventId);
    }, 1000);

    provinces.forEach(province => addLandslideMarker(province));
}

// Track tsunamis
async function trackTsunamis() {
    const calamityTrackingInitialized = sessionStorage.getItem(CALAMITY_TRACKING_KEY);
    if (calamityTrackingInitialized) {
        console.log("Tsunami tracking already executed in this session, skipping.");
        return;
    }

    const snapshot = await database.ref("calamities").orderByChild("type").equalTo("Tsunami").limitToLast(5).once("value");
    const tsunamis = snapshot.val();
    if (!tsunamis) return;

    for (const tsunami of Object.values(tsunamis)) {
        const eventId = tsunami.eventId || snapshot.key;
        const identifier = tsunami.identifier || generateCalamityIdentifier("Tsunami", tsunami.location, tsunami.time);
        if (processedCalamities.has(eventId) || processedCalamities.has(identifier)) {
            console.log(`Skipping duplicate tsunami - Event ID: ${eventId}, Identifier: ${identifier}`);
            continue;
        }

        processedCalamities.add(eventId);
        processedCalamities.add(identifier);
        syncProcessedCalamities();
        await addCalamityMarker("Tsunami", tsunami.location, tsunami.coordinates, tsunami.details, eventId);
    }
}

// Check for duplicate notification
async function hasRecentNotification(eventId, type, location, time, magnitude = '', rainfall = '') {
    const identifier = generateCalamityIdentifier(type, location, time, magnitude, rainfall);

    // Database check first to ensure consistency
    try {
        const snapshotByEventId = await database.ref("notifications")
            .orderByChild("eventId")
            .equalTo(eventId)
            .once("value");
        if (snapshotByEventId.val()) {
            console.log(`Notification found in database by eventId - Event ID: ${eventId}`);
            processedNotifications.add(eventId);
            processedNotifications.add(identifier);
            syncProcessedNotifications();
            return true;
        }

        const snapshotByIdentifier = await database.ref("notifications")
            .orderByChild("identifier")
            .equalTo(identifier)
            .once("value");
        if (snapshotByIdentifier.val()) {
            console.log(`Notification found in database by identifier - Identifier: ${identifier}`);
            processedNotifications.add(eventId);
            processedNotifications.add(identifier);
            syncProcessedNotifications();
            return true;
        }

        // Cache check after database to avoid false positives
        if (eventId && processedNotifications.has(eventId)) {
            console.log(`Notification already processed in cache - Event ID: ${eventId}`);
            return true;
        }
        if (processedNotifications.has(identifier)) {
            console.log(`Notification already processed in cache - Identifier: ${identifier}`);
            return true;
        }

        console.log(`No notification found - Event ID: ${eventId || 'none'}, Identifier: ${identifier}`);
        return false;
    } catch (error) {
        console.error(`Error checking for duplicate notification:`, error);
        return false;
    }
}

// Reverse geocode to get location name
async function getLocationName(lat, lng) {
    return new Promise((resolve) => {
        geocoder.geocode({ location: { lat, lng } }, (results, status) => {
            if (status === google.maps.GeocoderStatus.OK && results[0]) {
                resolve(results[0].formatted_address);
            } else {
                resolve(`(${lat.toFixed(2)}, ${lng.toFixed(2)})`);
            }
        });
    });
}

// Calamity marker with fun design and interactivity
async function addCalamityMarker(type, location, coordinates, details, eventId) {
    const icons = {
        "Earthquake": "🌍",
        "Flood Risk": "💧",
        "House Fire": "🔥",
        "Typhoon": "🌪️",
        "Volcanic Eruption": "🌋",
        "Landslide Risk": "⛰️",
        "Tsunami": "🌊",
    };

    // Create a div for the custom marker
    const markerDiv = document.createElement("div");
    markerDiv.innerHTML = `
        <div style="
            font-size: 24px;
            cursor: pointer;
            animation: pulse 2s infinite;
            transition: transform 0.2s ease;
        ">
            ${icons[type] || "⚠️"}
        </div>
    `;

    // Add CSS animation for pulsing effect
    const style = document.createElement("style");
    style.textContent = `
        @keyframes pulse {
            0% { transform: scale(1); opacity: 1; }
            50% { transform: scale(1.2); opacity: 0.7; }
            100% { transform: scale(1); opacity: 1; }
        }
    `;
    document.head.appendChild(style);

    const marker = new google.maps.Marker({
        position: { lat: coordinates.lat, lng: coordinates.lng },
        map: map,
        icon: {
            url: "data:image/svg+xml;charset=UTF-8,<svg xmlns='http://www.w3.org/2000/svg' width='1' height='1'></svg>", // Invisible SVG to use custom HTML
            scaledSize: new google.maps.Size(1, 1),
        },
        title: `${type} in ${location}`,
    });

    // Use AdvancedMarkerElement for custom HTML
    const advancedMarker = new google.maps.marker.AdvancedMarkerElement({
        position: { lat: coordinates.lat, lng: coordinates.lng },
        map: map,
        content: markerDiv,
    });

    calamityMarkers.push(marker);

    // Get the real location name
    const realLocation = await getLocationName(coordinates.lat, coordinates.lng);

    const infoWindowContent = `
        <div>
            <b>${type} in ${realLocation}</b><br>
            ${details}
        </div>
    `;
    const infoWindow = new google.maps.InfoWindow({
        content: infoWindowContent,
    });

    // Add hover effect
    markerDiv.addEventListener("mouseover", () => {
        markerDiv.style.transform = "scale(1.3)";
    });
    markerDiv.addEventListener("mouseout", () => {
        markerDiv.style.transform = "scale(1)";
    });

    // Add click effect and weather
    markerDiv.addEventListener("click", () => {
        // Bounce animation on click
        markerDiv.style.animation = "none";
        markerDiv.style.animation = "bounce 0.5s ease";

        const bounceStyle = document.createElement("style");
        bounceStyle.textContent = `
            @keyframes bounce {
                0%, 20%, 50%, 80%, 100% { transform: translateY(0); }
                40% { transform: translateY(-10px); }
                60% { transform: translateY(-5px); }
            }
        `;
        document.head.appendChild(bounceStyle);

        if (currentInfoWindow) singleInfoWindow.close();
        singleInfoWindow.setContent(infoWindowContent);
        singleInfoWindow.open(map, marker);
        currentInfoWindow = marker;
        isInfoWindowClicked = true;
        showWeatherInfoWindow(coordinates.lat, coordinates.lng);
    });

    singleInfoWindow?.addListener("closeclick", () => {
        isInfoWindowClicked = false;
        currentInfoWindow = null;
        markerDiv.style.animation = "pulse 2s infinite"; // Restart pulse animation
    });

    if (userRole === "AB ADMIN") {
        const magnitudeMatch = details.match(/Magnitude: (\d+\.\d+)/);
        const rainfallMatch = details.match(/Rainfall: (\d+\.?\d*) mm/);
        const timeMatch = details.match(/Time: (.+)/);
        const magnitude = magnitudeMatch ? magnitudeMatch[1] : '';
        const rainfall = rainfallMatch ? rainfallMatch[1] : '';
        const time = timeMatch ? timeMatch[1] : null;

        const hasDuplicate = await hasRecentNotification(eventId, type, location, time, magnitude, rainfall);
        if (hasDuplicate) {
            console.log(`Skipping notification generation - Event ID: ${eventId}`);
            return;
        }

        console.log(`Generating new notification - Event ID: ${eventId}`);
        await generateLenlenAlert(type, location, details, eventId);
    }
}

// Show weather info window at clicked location
async function showWeatherInfoWindow(lat, lng) {
    try {
        const cacheKey = `weather_${lat}_${lng}`;
        let weatherData;
        if (apiCache.has(cacheKey)) {
            weatherData = apiCache.get(cacheKey);
        } else {
            const response = await fetch(`https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lng}&appid=${WEATHER_API_KEY}&units=metric`);
            if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
            weatherData = await response.json();
            apiCache.set(cacheKey, weatherData);
        }

        const forecastResponse = await fetch(`https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lng}&appid=${WEATHER_API_KEY}&units=metric`);
        if (!forecastResponse.ok) throw new Error(`HTTP error! Status: ${forecastResponse.status}`);
        const forecastData = await forecastResponse.json();

        const condition = weatherData.weather[0].main.toLowerCase();
        const cloudCover = weatherData.clouds.all || 0;
        const pop = (forecastData.list[0].pop || 0) * 100;

        let sunnyPercent = 0, rainyPercent = 0, cloudyPercent = cloudCover;
        if (condition.includes("clear")) {
            sunnyPercent = 100 - cloudCover;
        } else if (condition.includes("rain") || condition.includes("thunderstorm")) {
            rainyPercent = pop;
            sunnyPercent = Math.max(0, 100 - rainyPercent - cloudyPercent);
        } else {
            sunnyPercent = Math.max(0, 100 - cloudCover);
        }

        let icon = "☁️";
        if (condition.includes("clear")) icon = "☀️";
        if (condition.includes("thunderstorm")) icon = "⚡";

        const realLocation = await getLocationName(lat, lng);
        const weatherInfo = `
            <div>
                <b>Weather at ${realLocation}</b><br>
                Sunny: ${sunnyPercent.toFixed(1)}%<br>
                Rainy: ${rainyPercent.toFixed(1)}% (Chance of Rain: ${pop.toFixed(1)}%)<br>
                Cloudy: ${cloudyPercent.toFixed(1)}%<br>
                Condition: ${weatherData.weather[0].description}<br>
                Temperature: ${weatherData.main.temp}°C
            </div>
        `;

        if (currentInfoWindow) singleInfoWindow.close();
        singleInfoWindow.setContent(weatherInfo);
        singleInfoWindow.setPosition({ lat, lng });
        singleInfoWindow.open(map);
        currentInfoWindow = { getPosition: () => ({ lat, lng }) };
        isInfoWindowClicked = true;

        singleInfoWindow.addListener("closeclick", () => {
            isInfoWindowClicked = false;
            currentInfoWindow = null;
        });
    } catch (error) {
        console.error("Error fetching weather data:", error);
        Swal.fire({
            icon: "error",
            title: "Weather Error",
            text: "Failed to load weather data. Please try again later.",
        });
    }
}

// Lenlen alert generator
async function generateLenlenAlert(calamityType, location, details, eventId) {
    try {
        const prompt = `
            You are Lenlen, a disaster tracking assistant. Generate a concise admin notification for a ${calamityType} in ${location}. Include relevant details and an emergency hotline if applicable.

            Details:
            - Location: ${location}
            - Calamity Type: ${calamityType}
            - Details: ${details}
            - Emergency Hotlines: ${JSON.stringify(emergencyHotlines)}

            Format the response as a single sentence, e.g.:
            "Flood risk detected in Cebu with 60 mm rainfall in the last 3 hours—contact BFP at (032) 261-9111 for assistance."
        `;

        const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                contents: [{
                    parts: [{
                        text: prompt,
                    }],
                }],
            }),
        });

        if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);

        const data = await response.json();
        const message = data.candidates[0].content.parts[0].text;

        await notifyAdmin(`Lenlen Alert - ${message}`, calamityType, location, details, eventId);
    } catch (error) {
        console.error("Error generating alert:", error);
        await notifyAdmin(`🚨 ${calamityType} detected in ${location}. ${details}`, calamityType, location, details, eventId);
    }
}

// Notify admin
const notifyAdmin = throttle(async (message, calamityType, location, details, eventId) => {
    const calamityList = document.getElementById("calamityList");
    const adminList = document.getElementById("adminList");
    if (!calamityList || !adminList) {
        console.error("Notification list elements not found.");
        return;
    }

    const magnitudeMatch = details.match(/Magnitude: (\d+\.\d+)/);
    const rainfallMatch = details.match(/Rainfall: (\d+\.?\d*) mm/);
    const timeMatch = details.match(/Time: (.+)/);
    const magnitude = magnitudeMatch ? magnitudeMatch[1] : '';
    const rainfall = rainfallMatch ? rainfallMatch[1] : '';
    const time = timeMatch ? timeMatch[1] : null;

    const identifier = generateCalamityIdentifier(calamityType, location, time, magnitude, rainfall);
    const hasDuplicate = await hasRecentNotification(eventId, calamityType, location, time, magnitude, rainfall);
    if (hasDuplicate) {
        console.log(`Skipping duplicate - Event ID: ${eventId}, Identifier: ${identifier}`);
        return;
    }

    processedNotifications.add(eventId);
    processedNotifications.add(identifier);
    syncProcessedNotifications();

    const li = document.createElement("li");
    li.innerHTML = `
        <strong>${calamityType ? "🚨 Calamity Alert:" : "🔔 Admin Notification:"}</strong> ${message}
        <span class="timestamp">${new Date().toLocaleTimeString()}</span>
    `;
    li.classList.add("unread");

    if (calamityType) {
        calamityList.prepend(li);
    } else {
        adminList.prepend(li);
    }

    const notifDot = document.getElementById("notifDot");
    if (notifDot) notifDot.style.display = "block";

    await database.ref("notifications").push({
        message,
        calamityType: calamityType || null,
        location,
        details,
        eventId,
        identifier,
        timestamp: Date.now(),
        read: false,
        type: calamityType ? "calamity" : "admin"
    });

    console.log(`Saved new notification - Event ID: ${eventId}`);
}, 10000);


// Setup admin notifications
function setupAdminNotifications() {
    if (userRole !== "AB ADMIN") return;

    const calamityList = document.getElementById("calamityList");
    const adminList = document.getElementById("adminList");
    const notifDot = document.getElementById("notifDot");

    if (!calamityList || !adminList || !notifDot) {
        console.error("Notification list or dot not found.");
        return;
    }

    loadNotifications();

    const markAllReadBtn = document.getElementById("markAllRead");
    if (markAllReadBtn) {
        markAllReadBtn.addEventListener("click", async () => {
            try {
                if (notificationsListener) notificationsListener.off();

                const snapshot = await database.ref("notifications").once("value");
                const updates = {};
                snapshot.forEach(child => {
                    if (!child.val().read) {
                        updates[`${child.key}/read`] = true;
                    }
                });

                if (Object.keys(updates).length > 0) {
                    await database.ref("notifications").update(updates);
                    console.log("Marked all notifications as read.");
                }

                calamityList.querySelectorAll("li").forEach(li => li.classList.remove("unread"));
                adminList.querySelectorAll("li").forEach(li => li.classList.remove("unread"));
                notifDot.style.display = "none";

                await initializeProcessedSets();
                loadNotifications();
            } catch (error) {
                console.error("Error marking read:", error);
                Swal.fire({ icon: "error", title: "Error", text: "Failed to mark all as read." });
            }
        });
    }
}


// Load and listen to notifications
function loadNotifications() {
    const calamityList = document.getElementById("calamityList");
    const adminList = document.getElementById("adminList");
    const notifDot = document.getElementById("notifDot");

    if (notificationsListener) notificationsListener.off();

    notificationsListener = database.ref("notifications").limitToLast(50);
    notificationsListener.on("child_added", snapshot => {
        const notification = snapshot.val();
        const key = snapshot.key;

        if (notification.read && processedNotifications.has(notification.eventId || notification.identifier)) return;
        if (document.querySelector(`li[data-key="${key}"]`)) return;

        const li = document.createElement("li");
        li.innerHTML = `
            <strong>${notification.calamityType ? "🚨 Calamity Alert:" : "🔔 Admin Notification:"}</strong> ${notification.message}
            <span class="timestamp">${new Date(notification.timestamp).toLocaleTimeString()}</span>
        `;
        li.dataset.key = key;
        if (!notification.read) li.classList.add("unread");

        if (notification.calamityType) {
            calamityList.prepend(li);
        } else {
            adminList.prepend(li);
        }

        if (notification.eventId) processedNotifications.add(notification.eventId);
        if (notification.identifier) processedNotifications.add(notification.identifier);
        syncProcessedNotifications();

        const hasUnread = calamityList.querySelectorAll("li.unread").length > 0 ||
                          adminList.querySelectorAll("li.unread").length > 0;
        notifDot.style.display = hasUnread ? "block" : "none";
    }, error => {
        console.error("Fetch error:", error);
        Swal.fire({ icon: "error", title: "Error", text: "Failed to load notifications." });
    });
}

function setupTabSwitching() {
    const tabCalamity = document.getElementById("tabCalamity");
    const tabAdmin = document.getElementById("tabAdmin");
    const calamityList = document.getElementById("calamityList");
    const adminList = document.getElementById("adminList");

    if (!tabCalamity || !tabAdmin || !calamityList || !adminList) return;

    tabCalamity.addEventListener("click", () => {
        tabCalamity.classList.add("active");
        tabAdmin.classList.remove("active");
        calamityList.classList.remove("hidden");
        adminList.classList.add("hidden");
    });

    tabAdmin.addEventListener("click", () => {
        tabAdmin.classList.add("active");
        tabCalamity.classList.remove("active");
        adminList.classList.remove("hidden");
        calamityList.classList.add("hidden");
    });
}


// Fetch reports
function fetchReports() {
    if (reportsListener) {
        reportsListener.off();
        console.log("Removed existing reports listener");
    }

    reportsListener = database.ref("reports/approved").limitToLast(50);
    reportsListener.on("value", snapshot => {
        let totalFoodPacks = 0, totalHotMeals = 0, totalWaterLiters = 0, totalVolunteers = 0, totalMonetaryDonations = 0, totalInKindDonations = 0;

        const reports = snapshot.val();
        if (reports) {
            const reportEntries = Object.entries(reports);
            reportEntries.forEach(([key, report]) => {
                if (userRole === "ABVN" && report.userUid !== userUid) return;

                totalFoodPacks += parseFloat(report.NoOfFoodPacks || 0);
                totalHotMeals += parseFloat(report.NoOfHotMeals || 0);
                totalWaterLiters += parseFloat(report.LitersOfWater || 0);
                totalVolunteers += parseFloat(report.NoOfVolunteersMobilized || 0);
                totalMonetaryDonations += parseFloat(report.TotalMonetaryDonations || 0);
                totalInKindDonations += parseFloat(report.TotalValueOfInKindDonations || 0);
            });
        }

        animateNumber('food-packs', totalFoodPacks, 1000, 0);
        animateNumber('hot-meals', totalHotMeals, 1000, 0);
        animateNumber('water-liters', totalWaterLiters, 1000, 0);
        animateNumber('volunteers', totalVolunteers, 1000, 0);
        animateNumber('amount-raised', totalMonetaryDonations, 1000, 2);
        animateNumber('inkind-donations', totalInKindDonations, 1000, 2);
    }, error => {
        console.error("Error fetching approved reports:", error);
        if (foodPacksEl) foodPacksEl.textContent = "0";
        if (hotMealsEl) hotMealsEl.textContent = "0";
        if (waterLitersEl) waterLitersEl.textContent = "0";
        if (volunteersEl) volunteersEl.textContent = "0";
        if (amountRaisedEl) amountRaisedEl.textContent = "₱0.00 (Error)";
        if (inKindDonationsEl) inKindDonationsEl.textContent = "₱0.00 (Error)";
    });
}

// Clean up duplicate calamities
async function cleanDuplicateCalamities() {
    try {
        const snapshot = await database.ref("calamities").once("value");
        const calamities = snapshot.val();
        if (!calamities) {
            console.log("No calamities found to clean up duplicates.");
            return;
        }

        const seen = new Map();
        const updates = {};

        Object.entries(calamities).forEach(([key, calamity]) => {
            const identifier = calamity.identifier || generateCalamityIdentifier(
                calamity.type,
                calamity.location,
                calamity.time,
                calamity.magnitude || '',
                calamity.rainfall || ''
            );
            if (seen.has(identifier)) {
                updates[key] = null;
                console.log(`Removing duplicate calamity - Key: ${key}, Identifier: ${identifier}`);
            } else {
                seen.set(identifier, key);
                if (!calamity.identifier) {
                    updates[`${key}/identifier`] = identifier;
                }
                console.log(`Keeping calamity - Key: ${key}, Identifier: ${identifier}`);
            }
        });

        if (Object.keys(updates).length > 0) {
            await database.ref("calamities").update(updates);
            console.log("Cleaned up duplicate calamities and migrated identifiers.");
        } else {
            console.log("No duplicate calamities found to clean up.");
        }
    } catch (error) {
        console.error("Error cleaning up duplicate calamities:", error);
    }
}

// Clean up duplicate notifications
async function cleanDuplicateNotifications() {
    try {
        const snapshot = await database.ref("notifications").once("value");
        const notifications = snapshot.val();
        if (!notifications) {
            console.log("No notifications found to clean up duplicates.");
            return;
        }

        const seen = new Map();
        const updates = {};

        Object.entries(notifications).forEach(([key, notification]) => {
            const identifier = notification.identifier || generateCalamityIdentifier(
                notification.calamityType,
                notification.location,
                notification.details.match(/Time: (.+)/)?.[1] || '',
                notification.details.match(/Magnitude: (\d+\.\d+)/)?.[1] || '',
                notification.details.match(/Rainfall: (\d+\.?\d*) mm/)?.[1] || ''
            );
            if (seen.has(identifier)) {
                updates[key] = null;
                console.log(`Removing duplicate notification - Key: ${key}, Identifier: ${identifier}`);
            } else {
                seen.set(identifier, key);
                if (!notification.identifier) {
                    updates[`${key}/identifier`] = identifier;
                }
                console.log(`Keeping notification - Key: ${key}, Identifier: ${identifier}`);
            }
        });

        if (Object.keys(updates).length > 0) {
            await database.ref("notifications").update(updates);
            console.log("Cleaned up duplicate notifications and migrated identifiers.");
        } else {
            console.log("No duplicate notifications found to clean up.");
        }
    } catch (error) {
        console.error("Error cleaning up duplicate notifications:", error);
    }
}

// Migrate legacy calamities
async function migrateLegacyCalamities() {
    try {
        const snapshot = await database.ref("calamities").once("value");
        const calamities = snapshot.val();
        if (!calamities) {
            console.log("No calamities found for migration.");
            return;
        }

        const updates = {};
        Object.entries(calamities).forEach(([key, calamity]) => {
            if (!calamity.identifier) {
                const identifier = generateCalamityIdentifier(
                    calamity.type,
                    calamity.location,
                    calamity.time,
                    calamity.magnitude || '',
                    calamity.rainfall || ''
                );
                updates[`${key}/identifier`] = identifier;
                console.log(`Migrating legacy calamity - Key: ${key}, Identifier: ${identifier}`);
            }
        });

        if (Object.keys(updates).length > 0) {
            await database.ref("calamities").update(updates);
            console.log("Migrated legacy calamities with identifier.");
        } else {
            console.log("No legacy calamities needed migration.");
        }
    } catch (error) {
        console.error("Error migrating legacy calamities:", error);
    }
}

// Clean up old calamities
async function cleanOldCalamities() {
    try {
        const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
        const snapshot = await database.ref("calamities").once("value");
        const calamities = snapshot.val();
        if (!calamities) {
            console.log("No calamities found to clean up old entries.");
            return;
        }

        const updates = {};
        Object.entries(calamities).forEach(([key, calamity]) => {
            if (calamity.timestamp < thirtyDaysAgo) {
                updates[key] = null;
                console.log(`Removing old calamity - Key: ${key}, Timestamp: ${calamity.timestamp}`);
            }
        });

        if (Object.keys(updates).length > 0) {
            await database.ref("calamities").update(updates);
            console.log("Cleaned up old calamities.");

            const notifSnapshot = await database.ref("notifications").once("value");
            const notifications = notifSnapshot.val();
            if (notifications) {
                const notifUpdates = {};
                Object.entries(notifications).forEach(([notifKey, notification]) => {
                    if (notification.timestamp < thirtyDaysAgo) {
                        notifUpdates[notifKey] = null;
                        console.log(`Removing old notification - Key: ${notifKey}, Timestamp: ${notification.timestamp}`);
                    }
                });

                if (Object.keys(notifUpdates).length > 0) {
                    await database.ref("notifications").update(notifUpdates);
                    console.log("Cleaned up old notifications.");
                }
            }
        } else {
            console.log("No old calamities found to clean up.");
        }
    } catch (error) {
        console.error("Error cleaning up old calamities:", error);
    }
}

// Cleanup dashboard
function cleanupDashboard() {
    console.log("Cleaning up dashboard state");

    clearTimeout(inactivityTimeout);
    ['mousemove', 'keydown', 'scroll', 'click'].forEach(eventType => {
        document.removeEventListener(eventType, resetInactivityTimer);
    });
    console.log("Removed inactivity timer listeners.");

    if (reportsListener) {
        reportsListener.off();
        reportsListener = null;
        console.log("Removed reports listener");
    }

    if (calamityListener) {
        calamityListener.off();
        calamityListener = null;
        console.log("Removed calamity listener");
    }

    if (notificationsListener) {
        notificationsListener.off();
        notificationsListener = null;
        console.log("Removed notifications listener");
    }

    markers.forEach(marker => marker.setMap(null));
    markers = [];

    calamityMarkers.forEach(marker => marker.setMap(null));
    calamityMarkers = [];

    if (singleInfoWindow) {
        singleInfoWindow.close();
        singleInfoWindow = null;
        currentInfoWindow = null;
        isInfoWindowClicked = false;
    }

    sessionStorage.removeItem(SESSION_KEY);
    sessionStorage.removeItem(CALAMITY_TRACKING_KEY);
    sessionStorage.removeItem(SESSION_TIMESTAMP_KEY);
    sessionStorage.removeItem(PROCESSED_CALAMITIES_KEY);
    sessionStorage.removeItem(PROCESSED_NOTIFICATIONS_KEY);
}

// Notification drawer interactions
const bell = document.getElementById('bell');
const drawer = document.getElementById('notificationDrawer');
const closeBtn = document.getElementById('closeDrawer');
const notifDot = document.getElementById('notifDot');

if (bell) {
    bell.addEventListener('click', (e) => {
        e.stopPropagation();
        drawer.classList.add('open');
    });
}

if (closeBtn) {
    closeBtn.addEventListener('click', () => {
        drawer.classList.remove('open');
    });
}

document.addEventListener('click', (e) => {
    if (!drawer.contains(e.target) && e.target !== bell && drawer.classList.contains('open')) {
        drawer.classList.remove('open');
    }
});

document.addEventListener("DOMContentLoaded", () => {
    setupAdminNotifications();
    setupTabSwitching();
});


window.addEventListener('beforeunload', cleanupDashboard);
window.addEventListener('navigate-away', () => {
    console.log('navigate-away event: Cleaning up dashboard');
    cleanupDashboard();
});
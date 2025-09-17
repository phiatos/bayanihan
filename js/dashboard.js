// dashboard.js
const tabContent = document.getElementById("tab-content");
const dashboardContainer = document.getElementById("dashboard-container");

document.querySelectorAll(".tab-btn").forEach(btn => {
  btn.addEventListener("click", async () => {
    const tab = btn.dataset.tab;

    document.querySelectorAll(".tab-btn").forEach(t => t.classList.remove("active"));
    btn.classList.add("active");

    if (tab === "volunteers") {
        // Hide dashboard
        dashboardContainer.style.display = "none";

        // Fetch volunteer overview HTML
        const res = await fetch("../pages/volunteerRequestOverview.html");
        const html = await res.text();

        const parser = new DOMParser();
        const doc = parser.parseFromString(html, "text/html");
        const bodyContent = doc.body.innerHTML;

        tabContent.innerHTML = bodyContent;

        // Attach CSS (only once)
        if (!document.querySelector('link[href="../css/volunteerRequest.css"]')) {
            const link = document.createElement("link");
            link.rel = "stylesheet";
            link.href = "../css/volunteerRequest.css";
            document.head.appendChild(link);
        }

        // Force reload volunteer JS every time
        try {
            const jsRes = await fetch("../js/volunteerRequestOverview.js");
            const jsCode = await jsRes.text();
            new Function(jsCode)();
        } catch (err) {
            console.error("Failed to load volunteerRequestOverview.js", err);
        }
    } else if (tab === "activation") {
        // Hide dashboard
        dashboardContainer.style.display = "none";

        // Fetch activation overview HTML
        const res = await fetch("../pages/activationOverview.html");
        const html = await res.text();

        const parser = new DOMParser();
        const doc = parser.parseFromString(html, "text/html");
        const bodyContent = doc.body.innerHTML;

        // Cleanup previous tab content
        if (typeof window.cleanupActivationOverview === 'function') {
            window.cleanupActivationOverview();
        }
        tabContent.innerHTML = bodyContent;

        // Attach CSS (only once)
        if (!document.querySelector('link[href="../css/volunteerRequest.css"]')) {
            const link = document.createElement("link");
            link.rel = "stylesheet";
            link.href = "../css/volunteerRequest.css";
            document.head.appendChild(link);
        }

        // Force reload activation JS
        try {
            const jsRes = await fetch("../js/activationOverview.js");
            const jsCode = await jsRes.text();
            new Function(jsCode)();
        } catch (err) {
            console.error("Failed to load activationOverview.js", err);
        }
    } else if (tab === "reliefs-request") {
        // Hide dashboard
        dashboardContainer.style.display = "none";

            // Fetch volunteer overview HTML
            const res = await fetch("../pages/reliefRequestOverview.html");
            const html = await res.text();

            const parser = new DOMParser();
            const doc = parser.parseFromString(html, "text/html");
            const bodyContent = doc.body.innerHTML;

            tabContent.innerHTML = bodyContent;

            // Attach CSS (only once)
            if (!document.querySelector('link[href="../css/volunteerRequest.css"]')) {
                const link = document.createElement("link");
                link.rel = "stylesheet";
                link.href = "../css/volunteerRequest.css";
                document.head.appendChild(link);
            }

            // Force reload volunteer JS every time
            try {
                const jsRes = await fetch("../js/reliefRequestOverview.js");
                const jsCode = await jsRes.text();
                new Function(jsCode)();
            } catch (err) {
                console.error("Failed to load reliefRequestOverview.js", err);
            }
        } else {
        // Default tab → show dashboard again
        dashboardContainer.style.display = "block";
        tabContent.innerHTML = "";
        }
    });
});

// Auto-load Default tab
document.querySelector(".tab-btn[data-tab='default']").click();

// dashboard.js
// Global variables
// Place this at the very top of dashboard.js
console.log = function () {};
console.error = function () {};
console.warn = function () {};

let map, markers = [], geocoder, autocomplete, reportsListener, userRole, userEmail, userUid, currentInfoWindow, singleInfoWindow, isInfoWindowClicked = false;
let calamityMarkers = [], calamityListener, notificationsListener;
// Session lock to prevent multiple executions
const SESSION_KEY = 'dashboard_initialized';
const CALAMITY_TRACKING_KEY = 'calamity_tracking_lock';
const SESSION_TIMESTAMP_KEY = 'session_timestamp'; 
const PROCESSED_CALAMITIES_KEY = 'processed_calamities';
const PROCESSED_NOTIFICATIONS_KEY = 'processed_notifications';
const reportBarsEls = document.querySelectorAll(".data-reports .data-bar");

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
// API keys
const WEATHER_API_KEY = "a98203b9ad890d981c589718b2d6d69d";
// const GEMINI_API_KEY = "AIzaSyDWv5Yh1VjKzP4pVIhyyr6hu54nlPvx61Y";
// const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent";
// Variables for inactivity detection
let inactivityTimeout;
const INACTIVITY_TIME = 1800000; // 30 minutes in milliseconds
// Function to reset the inactivity timer
function resetInactivityTimer() {
    clearTimeout(inactivityTimeout);
    inactivityTimeout = setTimeout(checkInactivity, INACTIVITY_TIME);
    console.log("Inactivity timer reset.");
}
// Function to check for inactivity and prompt the user
function checkInactivity() {
    Swal.fire({
        title: 'Are you still there?',
        text: 'You\'ve been inactive for a while. Do you want to continue your session or log out?',
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
            console.log("User chose to continue session.");
        } else if (result.dismiss === Swal.DismissReason.cancel) {
            auth.signOut().then(() => {
                console.log("User logged out due to inactivity.");
                window.location.href = "../pages/login.html";
            }).catch((error) => {
                console.error("Error logging out:", error);
                Swal.fire('Error', 'Failed to log out. Please try again.', 'error');
            });
        }
    });
}
// Attach event listeners to detect user activity
['mousemove', 'keydown', 'scroll', 'click'].forEach(eventType => {
    document.addEventListener(eventType, resetInactivityTimer);
});
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
    { name: "Davao del Sur", lat: 6.8852, lng: 125.2836 },
    { name: "Ilocos Norte", lat: 18.1869, lng: 120.5960 },
    { name: "Ilocos Sur", lat: 17.2643, lng: 120.5768 },
    { name: "La Union", lat: 16.5826, lng: 120.3269 },
    { name: "Pangasinan", lat: 15.8912, lng: 120.3360 },
    { name: "Batanes", lat: 20.4485, lng: 121.9708 },
    { name: "Cagayan", lat: 18.5120, lng: 121.7500 },
    { name: "Isabela", lat: 16.6566, lng: 121.5550 },
    { name: "Nueva Vizcaya", lat: 16.3333, lng: 121.1500 },
    { name: "Quirino", lat: 16.2700, lng: 121.5700 },
    { name: "Santiago City", lat: 16.6920, lng: 121.5530 },
    { name: "Batangas", lat: 13.7563, lng: 121.0583 },
    { name: "Cavite", lat: 14.4115, lng: 120.9046 },
    { name: "Laguna", lat: 14.2563, lng: 121.3450 },
    { name: "Quezon", lat: 14.0894, lng: 122.1320 },
    { name: "Rizal", lat: 14.5856, lng: 121.2349 },
    { name: "Bicol", lat: 13.4177, lng: 123.7355 },
    { name: "Albay", lat: 13.1466, lng: 123.6996 },
    { name: "Camarines Norte", lat: 14.1391, lng: 122.8111 },
    { name: "Camarines Sur", lat: 13.7072, lng: 123.2280 },
    { name: "Catanduanes", lat: 13.9333, lng: 124.3000 },
    { name: "Masbate", lat: 12.3717, lng: 123.6194 },
    { name: "Sorsogon", lat: 12.9742, lng: 124.0147 },
    { name: "Aklan", lat: 11.5167, lng: 122.3833 },
    { name: "Antique", lat: 11.0650, lng: 122.1000 },
    { name: "Capiz", lat: 11.5833, lng: 122.7500 },
    { name: "Iloilo", lat: 10.7167, lng: 122.5500 },
    { name: "Negros Occidental", lat: 10.5000, lng: 123.0000 },
    { name: "Bohol", lat: 9.8500, lng: 124.1500 },
    { name: "Siquijor", lat: 9.2167, lng: 123.5167 },
    { name: "Leyte", lat: 10.8833, lng: 124.8167 },
    { name: "Southern Leyte", lat: 10.3333, lng: 125.0167 },
    { name: "Biliran", lat: 11.5833, lng: 124.4500 },
    { name: "Eastern Samar", lat: 11.6167, lng: 125.4833 },
    { name: "Northern Samar", lat: 12.4333, lng: 124.8833 },
    { name: "Samar", lat: 12.0000, lng: 125.0000 },
    { name: "Zamboanga del Norte", lat: 8.1167, lng: 122.7500 },
    { name: "Zamboanga del Sur", lat: 7.8167, lng: 123.3167 },
    { name: "Zamboanga Sibugay", lat: 7.5167, lng: 122.6667 },
    { name: "Bukidnon", lat: 8.1500, lng: 124.8333 },
    { name: "Camiguin", lat: 9.1667, lng: 124.7167 },
    { name: "Lanao del Norte", lat: 8.0333, lng: 124.2833 },
    { name: "Misamis Occidental", lat: 8.4167, lng: 123.7500 },
    { name: "Misamis Oriental", lat: 8.9500, lng: 124.6167 },
    { name: "Agusan del Norte", lat: 9.2000, lng: 125.5000 },
    { name: "Agusan del Sur", lat: 8.7500, lng: 125.9167 },
    { name: "Surigao del Norte", lat: 9.8000, lng: 125.7000 },
    { name: "Surigao del Sur", lat: 9.0000, lng: 126.2500 },
    { name: "Dinagat Islands", lat: 10.1000, lng: 125.6000 },
    { name: "Cotabato", lat: 7.2000, lng: 124.2500 },
    { name: "South Cotabato", lat: 6.2500, lng: 124.8500 },
    { name: "Sultan Kudarat", lat: 6.5000, lng: 124.4000 },
    { name: "Sarangani", lat: 5.9500, lng: 125.1500 },
    { name: "Basilan", lat: 6.4167, lng: 121.9667 },
    { name: "Lanao del Sur", lat: 7.8500, lng: 124.2667 },
    { name: "Maguindanao", lat: 7.0000, lng: 124.5000 },
    { name: "Sulu", lat: 6.0000, lng: 121.0000 },
    { name: "Tawi-Tawi", lat: 5.0667, lng: 119.9500 },
    { name: "Abra", lat: 17.6167, lng: 120.7500 },
    { name: "Apayao", lat: 18.2500, lng: 121.1667 },
    { name: "Benguet", lat: 16.6500, lng: 120.7500 },
    { name: "Ifugao", lat: 16.8167, lng: 121.1500 },
    { name: "Kalinga", lat: 17.5000, lng: 121.5000 },
    { name: "Mountain Province", lat: 17.0833, lng: 121.1667 },
    { name: "Aurora", lat: 15.7517, lng: 121.5570 },
    { name: "Bataan", lat: 14.6667, lng: 120.4667 },
    { name: "Bulacan", lat: 14.8000, lng: 120.8667 },
    { name: "Nueva Ecija", lat: 15.5787, lng: 121.0139 },
    { name: "Pampanga", lat: 15.0833, lng: 120.6500 },
    { name: "Tarlac", lat: 15.4759, lng: 120.5960 },
    { name: "Zambales", lat: 15.5084, lng: 119.9692 },
    { name: "Guimaras", lat: 10.5833, lng: 122.6333 },
    { name: "Negros Oriental", lat: 9.5000, lng: 123.3000 },
    { name: "Romblon", lat: 12.5833, lng: 122.2667 },
    { name: "Palawan", lat: 9.7400, lng: 118.7400 },
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
    if (!element) {
        console.error(`Element with ID ${elementId} not found`);
        return;
    }
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
// Firebase configuration
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
// Initialize Firebase only if not already initialized
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const auth = firebase.auth();
const database = firebase.database();
// Elements
const headerEl = document.querySelector("header");
const foodPacksEl = document.getElementById("food-packs");
const hotMealsEl = document.getElementById("hot-meals");
const waterLitersEl = document.getElementById("water-liters");
const volunteersEl = document.getElementById("volunteers");
const amountRaisedEl = document.getElementById("amount-raised");
const inKindDonationsEl = document.getElementById("inkind-donations");
const searchInput = document.getElementById("search-input");
const calamityList = document.getElementById("calamityList");
const adminList = document.getElementById("adminList");
const notifDot = document.getElementById("notifDot");
const notifBadge = document.createElement("span"); // New badge for unread count
notifBadge.id = "notifBadge";
notifBadge.style.position = "absolute";
notifBadge.style.backgroundColor = "#ff4444";
notifBadge.style.color = "#fff";
notifBadge.style.borderRadius = "50%";
notifBadge.style.padding = "2px 6px";
notifBadge.style.fontSize = "12px";
notifBadge.style.top = "-5px";
notifBadge.style.right = "-5px";
const mapDiv = document.getElementById("map");
// Append badge to notifDot if it exists
if (notifDot && !notifDot.querySelector("#notifBadge")) {
    notifDot.appendChild(notifBadge);
}
// Initialize dashboard with session lock
window.initializeDashboard = function () {
    return new Promise((resolve, reject) => {
        if (!mapDiv) {
            console.error("Map container not found");
            return reject("Map container not found");
        }

        cleanupDashboard();
        const sessionInitialized = sessionStorage.getItem(SESSION_KEY);
        const sessionTimestamp = sessionStorage.getItem(SESSION_TIMESTAMP_KEY);
        const currentTime = Date.now();
        const sessionAgeLimit = 30 * 60 * 1000;

        if (sessionInitialized && sessionTimestamp && (currentTime - parseInt(sessionTimestamp) < sessionAgeLimit)) {
            console.log("Dashboard already initialized in this session, skipping.");
            return resolve();
        }

        console.log("Initializing dashboard at", new Date().toISOString());
        sessionStorage.setItem(SESSION_KEY, 'true');
        sessionStorage.setItem(SESSION_TIMESTAMP_KEY, currentTime.toString());

        auth.onAuthStateChanged(user => {
            if (!user) {
                Swal.fire({
                    icon: "error",
                    title: "Authentication Required",
                    text: "Please sign in to access the dashboard.",
                }).then(() => window.location.href = "../pages/login.html");
                return reject("User not authenticated");
            }

            userUid = user.uid;
            database.ref(`users/${user.uid}`).once("value", snapshot => {
                const userData = snapshot.val();
                if (!userData || !userData.role) {
                    Swal.fire({
                        icon: "error",
                        title: "User Data Missing",
                        text: "User role not found.",
                    }).then(() => window.location.href = "../pages/login.html");
                    return reject("User role not found");
                }

                userRole = userData.role;
                userEmail = user.email;
                headerEl.textContent = userRole === "AB ADMIN" ? "Admin Dashboard" : "ABVN Dashboard";
                
                 // --- TAB PERMISSION LOGIC ---
                if (userRole !== "AB ADMIN") {
                    document.querySelectorAll(".tab-btn[data-tab='volunteers'], .tab-btn[data-tab='activation'], .tab-btn[data-tab='reliefs-request']")
                        .forEach(tab => tab.style.display = "none");
                }

                initializeMap();
                if (!map) {
                    return reject("Map initialization failed");
                }

                addWeatherDataForProvinces();
                trackCalamities();
                setupAdminNotifications();
                fetchReports();
                fetchApprovedReports();
                
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
                initializeProcessedSets();

                resolve(); // ✅ Promise resolves here
            }, error => {
                Swal.fire({
                    icon: "error",
                    title: "Error",
                    text: "Failed to load user data.",
                });
                reject(error);
            });
        });
    });
};

// Initialize processed sets from database
async function initializeProcessedSets() {
    try {
        processedCalamities.clear();
        processedNotifications.clear();
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
        console.log("initializeMap called at", new Date().toISOString());
        if (!mapDiv) {
            console.error("Map container not found");
            Swal.fire({
                icon: "error",
                title: "Map Error",
                text: "Map container not found on the page.",
            });
            return;
        }
        const defaultLocation = { lat: 14.5995, lng: 120.9842 };
        if (!window.google || !window.google.maps) {
            console.error("Google Maps API not loaded");
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
                minZoom: 5, // prevent zooming out too far
                maxZoom: 18, // optional: prevents excessive zoom-in
                mapTypeId: "roadmap",
                restriction: {
                    latLngBounds: {
                        north: 21.1209,  // Batanes (North)
                        south: 4.225,    // Tawi-Tawi (South)
                        west: 116.93,    // Palawan (West)
                        east: 126.60     // Philippine Sea (East)
                    },
                    strictBounds: true
                }
            });

            console.log("Map initialized successfully with Google Maps and locked to the Philippines");
        }
        geocoder = new google.maps.Geocoder();
        if (!searchInput) {
            console.error("Search input not found");
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
                console.log("No valid location selected from autocomplete.");
                Swal.fire({
                    icon: "error",
                    title: "Location Not Found",
                    text: "Please select a valid location from the dropdown.",
                });
                return;
            }
            map.setCenter(place.geometry.location);
            map.setZoom(12);
            console.log("Map centered on:", place.geometry.location.toString());
        });
        google.maps.event.trigger(map, "resize");
        console.log("Map resize event triggered");
        singleInfoWindow = new google.maps.InfoWindow();
        map.addListener("click", (event) => {
            showWeatherInfoWindow(event.latLng.lat(), event.latLng.lng());
        });
        updateRainWarningOverlay();
    } catch (error) {
        console.error("Failed to initialize Google Maps:", error);
        Swal.fire({
            icon: "error",
            title: "Map Error",
            text: "Failed to load the map. Check your internet connection or API key.",
        });
    }
}
// Add weather data for all provinces with dynamic icons and rain notifications

// ✅ Enhanced Rainfall Alert Generator
// function generateRainAlert(province, rainfall, pop) {
//     let warningLevel = "";
//     if (pop >= 30 || rainfall >= 20) {
//         if (rainfall >= 100 || pop >= 80) {
//             warningLevel = "🔴 Red Warning: Heavy Rain";
//         } else if (rainfall >= 50 || pop >= 60) {
//             warningLevel = "🟠 Orange Warning: Moderate Rain";
//         } else if (rainfall >= 20 || pop >= 30) {
//             warningLevel = "🟡 Yellow Warning: Light Rain";
//         }
//     }

//     if (warningLevel) {
//         const eventId = `rain_${province.name}_${Date.now()}`;
//         const time = new Date().toISOString();
//         const details = `Rainfall: ${rainfall} mm in last 3h, Chance of Rain: ${pop}% | Time: ${time}`;
//         const identifier = generateCalamityIdentifier("Rainfall Alert", province.name, time, "", rainfall);

//         // Check for duplicates
//         calamityExists(eventId, "Rainfall Alert", province.name, time, "", rainfall).then(exists => {
//             if (!exists) {
//                 // Save to calamities node
//                 const calamityRef = database.ref("calamities").push();
//                 calamityRef.set({
//                     type: "Rainfall Alert",
//                     location: province.name,
//                     rainfall: rainfall,
//                     time: time,
//                     details: details,
//                     coordinates: { lat: province.lat, lng: province.lng },
//                     eventId: eventId,
//                     identifier: identifier,
//                     timestamp: Date.now(),
//                     warningLevel: warningLevel,
//                     source: "OpenWeatherMap"
//                 }).then(() => {
//                     console.log(`Saved new Rainfall Alert to calamities - Event ID: ${eventId}, Location: ${province.name}`);
//                     // Add marker for the calamity
//                     addCalamityMarker("Rainfall Alert", province.name, { lat: province.lat, lng: province.lng }, details, eventId);
//                 }).catch(error => {
//                     console.error(`Error saving Rainfall Alert for ${province.name}:`, error);
//                 });

//                 // Generate notification
//                 generateLenlenAlert("Rainfall Alert", province.name, details, eventId, warningLevel, "OpenWeatherMap");
//             } else {
//                 console.log(`Skipping duplicate Rainfall Alert - Event ID: ${eventId}, Identifier: ${identifier}`);
//             }
//         });
//     }
// }

function addWeatherDataForProvinces() {
    if (!map) {
        console.error("Map not initialized, cannot add weather data for provinces.");
        return;
    }
    markers.forEach(marker => marker.setMap(null));
    markers = [];
    const addWeatherMarker = async (province) => {
        console.log(`Fetching weather for ${province.name}`);
        try {
            const cacheKey = `weather_${province.lat}_${province.lng}`;
            let weatherData = apiCache.get(cacheKey);
            if (!weatherData) {
                const response = await fetch(`https://api.openweathermap.org/data/2.5/weather?lat=${province.lat}&lon=${province.lng}&appid=${WEATHER_API_KEY}&units=metric`);
                if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
                weatherData = await response.json();
                apiCache.set(cacheKey, weatherData);
            }
            const forecastResponse = await fetch(`https://api.openweathermap.org/data/2.5/forecast?lat=${province.lat}&lon=${province.lng}&appid=${WEATHER_API_KEY}&units=metric`);
            if (!forecastResponse.ok) throw new Error(`HTTP error! Status: ${forecastResponse.status}`);
            const forecastData = await forecastResponse.json();
            const condition = weatherData.weather[0].main.toLowerCase();
            const cloudCover = weatherData.clouds.all || 0;
            const pop = (forecastData.list[0].pop || 0) * 100; // For alerts only
            const rainfall = forecastData.list[0].rain ? forecastData.list[0].rain["3h"] || 0 : 0;

            // Log data to debug rainy bias
            console.log({ province: province.name, condition, cloudCover, pop, rainfall });

            // Percentage calculations
            let sunnyPercent = 0, rainyPercent = 0, cloudyPercent = cloudCover;
            if (condition.includes("clear")) {
                sunnyPercent = 100 - cloudCover;
            } else if (condition.includes("rain") || condition.includes("drizzle") || condition.includes("thunderstorm")) {
                rainyPercent = rainfall > 0 ? Math.min(100, rainfall * 10) : 50;
                cloudyPercent = Math.min(cloudCover, 100 - rainyPercent);
                sunnyPercent = Math.max(0, 100 - rainyPercent - cloudyPercent);
            } else if (rainfall >= 2) { // Only significant rainfall for clouds
                rainyPercent = Math.min(100, rainfall * 10);
                cloudyPercent = Math.min(cloudCover, 100 - rainyPercent);
                sunnyPercent = Math.max(0, 100 - rainyPercent - cloudyPercent);
            } else {
                sunnyPercent = Math.max(0, 100 - cloudCover);
            }

            // Generate rainfall alerts using new function
generateRainAlert(province, rainfall, pop);

      // Generate alerts for high rainfall (legacy fallback)
            if (rainfall > 0) {
                const eventId = `rain_${province.name}_${Date.now()}`;
                const details = `Rainfall: ${rainfall} mm in last 3 hours, Time: ${new Date().toISOString()}`;
                if (rainfall >= 100) {
                    generateLenlenAlert("Flood Risk", province.name, details, eventId, "Red Warning: Heavy Rain", "OpenWeatherMap");
                } else if (rainfall >= 50) {
                    generateLenlenAlert("Flood Risk", province.name, details, eventId, "Orange Warning: Moderate Rain", "OpenWeatherMap");
                } else if (rainfall >= 20) {
                    generateLenlenAlert("Flood Risk", province.name, details, eventId, "Yellow Warning: Light Rain", "OpenWeatherMap");
                }
            }

            // Icon selection (stricter for rain)
            let icon = "☁️";
            if (condition.includes("clear")) {
                icon = "☀️";
            } else if (condition.includes("rain") || condition.includes("drizzle") || condition.includes("thunderstorm") || rainfall >= 2) {
                icon = "🌧️";
            } else if (condition.includes("clouds") && cloudCover < 50) {
                icon = "⛅";
            }

            const markerSvg = `
                <svg width="40" height="40" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
                    <text x="20" y="22" font-size="20" text-anchor="middle" fill="#FFFFFF">${icon}</text>
                </svg>
            `;
            const marker = new google.maps.Marker({
                position: { lat: province.lat, lng: province.lng },
                map: map,
                icon: {
                    url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(markerSvg)}`,
                    scaledSize: new google.maps.Size(40, 40),
                },
                title: province.name,
            });
            markers.push(marker);

            // Original weather info display (no Chance of Rain)
            const weatherInfo = `
                <div style="font-size: 14px;">
                    <b>${province.name} Weather</b><br>
                    Sunny: ${sunnyPercent.toFixed(1)}%<br>
                    Rainy: ${rainyPercent.toFixed(1)}%<br>
                    Cloudy: ${cloudyPercent.toFixed(1)}%<br>
                    Condition: ${weatherData.weather[0].description}<br>
                    Temperature: ${weatherData.main.temp}°C<br>
                    Rainfall (3h): ${rainfall} mm
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
        } catch (error) {
            console.error(`Error fetching weather data for ${province.name}:`, error);
            const defaultMarkerSvg = `
                <svg width="40" height="40" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="20" cy="20" r="15" fill="#ADD8E6" opacity="0.7"/>
                    <text x="20" y="22" font-size="20" text-anchor="middle" fill="#FFFFFF">☁️</text>
                </svg>
            `;
            const marker = new google.maps.Marker({
                position: { lat: province.lat, lng: province.lng },
                map: map,
                icon: {
                    url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(defaultMarkerSvg)}`,
                    scaledSize: new google.maps.Size(40, 40),
                },
                title: `${province.name} (Data Unavailable)`,
            });
            markers.push(marker);
        }
    };
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
        console.log("Calamity tracking already executed in this session, skipping.");
        loadExistingCalamities();
        return;
    }
    console.log("Starting calamity tracking at", new Date().toISOString());
    sessionStorage.setItem(CALAMITY_TRACKING_KEY, 'true');
    sessionStorage.setItem(SESSION_TIMESTAMP_KEY, currentTime.toString());
    calamityMarkers.forEach(marker => marker.setMap(null));
    calamityMarkers = [];
    if (calamityListener) {
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
    if (eventId && processedCalamities.has(eventId)) {
        console.log(`Calamity already processed in persisted cache - Event ID: ${eventId}`);
        return true;
    }
    if (processedCalamities.has(identifier)) {
        console.log(`Calamity already processed in persisted cache - Identifier: ${identifier}`);
        return true;
    }
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
    const currentTime = Date.now(); // 06:52 PM PST, August 21, 2025 = 1724286320000 ms
    const timeMatch = details.match(/Time: (.+)/);
    const eventTime = timeMatch ? new Date(timeMatch[1]).getTime() : currentTime;
    const twelveHoursInMs = 12 * 60 * 60 * 1000; // 43200000 ms

    // Remove all existing markers temporarily
    calamityMarkers.forEach(({ marker }) => marker.setMap(null));
    calamityMarkers = [];

    // Add new marker only if recent (within 12 hours)
    if (currentTime - eventTime <= twelveHoursInMs) {
        const offsetLat = coordinates.lat + 0.01;
        const markerDiv = document.createElement("div");
        markerDiv.innerHTML = `
            <div style="
                font-size: 24px;
                cursor: pointer;
                animation: pulse 2s infinite;
                transition: transform 0.2s ease;
                background-color: rgba(255, 255, 255, 0.7);
                border: 2px solid #000;
                border-radius: 50%;
                padding: 2px;
                width: 32px;
                height: 32px;
                text-align: center;
                line-height: 32px;
            ">
                ${icons[type] || "⚠️"}
            </div>
        `;
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
            position: { lat: offsetLat, lng: coordinates.lng },
            map: map,
            title: `${type} in ${location}`,
            icon: {
                url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
                    <svg width="40" height="40" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
                        <circle cx="20" cy="20" r="18" fill="rgba(255, 255, 255, 0.7)" stroke="#000" stroke-width="2"/>
                        <text x="20" y="22" font-size="20" text-anchor="middle" fill="#000000">${icons[type] || "⚠️"}</text>
                    </svg>
                `)}`,
                scaledSize: new google.maps.Size(40, 40),
            },
            zIndex: 1000,
        });
        calamityMarkers.push({ marker, eventTime });
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
        markerDiv.addEventListener("mouseover", () => {
            markerDiv.style.transform = "scale(1.3)";
        });
        markerDiv.addEventListener("mouseout", () => {
            markerDiv.style.transform = "scale(1)";
        });
        marker.addListener("click", () => {
            console.log(`Clicked marker for ${type} at ${location}`);
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
            if (true) {
                const magnitudeMatch = details.match(/Magnitude: (\d+\.\d+)/);
                const rainfallMatch = details.match(/Rainfall: (\d+\.?\d*) mm/);
                const timeMatch = details.match(/Time: (.+)/);
                const magnitude = magnitudeMatch ? magnitudeMatch[1] : '';
                const rainfall = rainfallMatch ? rainfallMatch[1] : '';
                const time = timeMatch ? timeMatch[1] : null;
                const warningLevel = rainfall >= 100 ? "Red Warning: Heavy Rain" :
                                  rainfall >= 50 ? "Orange Warning: Moderate Rain" :
                                  rainfall >= 20 ? "Yellow Warning: Light Rain" : "";
                generateLenlenAlert(type, location, details, eventId, warningLevel);
            }
        });
        singleInfoWindow?.addListener("closeclick", () => {
            isInfoWindowClicked = false;
            currentInfoWindow = null;
            markerDiv.style.animation = "pulse 2s infinite";
        });
        if (true) {
            const magnitudeMatch = details.match(/Magnitude: (\d+\.\d+)/);
            const rainfallMatch = details.match(/Rainfall: (\d+\.?\d*) mm/);
            const timeMatch = details.match(/Time: (.+)/);
            const magnitude = magnitudeMatch ? magnitudeMatch[1] : '';
            const rainfall = rainfallMatch ? rainfallMatch[1] : '';
            const time = timeMatch ? timeMatch[1] : null;
            const hasDuplicate = await hasRecentNotification(eventId, type, location, time, magnitude, rainfall);
            if (!hasDuplicate) {
                const warningLevel = rainfall >= 100 ? "Red Warning: Heavy Rain" :
                                  rainfall >= 50 ? "Orange Warning: Moderate Rain" :
                                  rainfall >= 20 ? "Yellow Warning: Light Rain" : "";
                let source = '';
                if (type === "Earthquake") source = "USGS";
                else if (["Flood Risk", "Landslide Risk"].includes(type)) source = "OpenWeatherMap";
                generateLenlenAlert(type, location, details, eventId, warningLevel, source);
            }
        }
    } else {
        console.log(`Skipping ${type} marker for ${location} - older than 12 hours`);
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
        } else if (condition.includes("rain") || condition.includes("drizzle") || condition.includes("thunderstorm")) {
            rainyPercent = pop;
            sunnyPercent = Math.max(0, 100 - rainyPercent - cloudyPercent);
        } else {
            sunnyPercent = Math.max(0, 100 - cloudCover);
        }
        let icon = "☁️";
        if (condition.includes("clear")) icon = "☀️";
        if (condition.includes("rain") || condition.includes("drizzle") || condition.includes("thunderstorm")) icon = "🌧️";
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
// Lenlen alert generator with rain warning levels
async function generateLenlenAlert(calamityType, location, details, eventId, warningLevel = "", source = "") {
    try {
        const prompt = `
            You are Lenlen, a disaster tracking assistant. Generate a concise admin notification for a ${calamityType} in ${location} with the following details. Include the ${warningLevel} if provided, and suggest an appropriate emergency hotline from the list if applicable. Use factual and professional language. Include the source if provided (e.g., USGS for earthquakes, OpenWeatherMap for weather-related events).
            Details:
            - Location: ${location}
            - Calamity Type: ${calamityType}
            - Details: ${details}
            - Emergency Hotlines: ${JSON.stringify(emergencyHotlines)}
            - Warning Level: ${warningLevel}
            - Source: ${source}
            Format the response as a single sentence, e.g.:
            "Flood risk detected in Cebu with 60 mm rainfall in the last 3 hours (Orange Warning: Moderate Rain)—contact BFP at (032) 261-9111 for assistance. (Source: OpenWeatherMap)"
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
        await notifyAdmin(`🚨 ${calamityType} detected in ${location}. ${details} ${warningLevel ? `(${warningLevel})` : ""} ${source ? `(Source: ${source})` : ""}`, calamityType, location, details, eventId);
    }
}
// Notify admin (updated to include callfordonation, reliefrequest, rdana)
const notifyAdmin = throttle(async (message, calamityType, location, details, eventId) => {
    if (!calamityList || !adminList || !notifDot || !notifBadge) {
        console.error("Notification list elements or badge not found.");
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
    const key = database.ref("notifications").push().key;
    await database.ref("notifications").child(key).set({
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
    console.log(`Saved new notification - Event ID: ${eventId}, Key: ${key}`);

    // Check for new calls for donation, relief requests, or RDANA submissions
    if (true) {
        await checkNewSubmissions("callfordonation", key, "Call for Donation", location, details, eventId);
        await checkNewSubmissions("reliefrequest", key, "Relief Request", location, details, eventId);
        await checkNewSubmissions("rdana", key, "RDANA Submission", location, details, eventId);
    }

    updateNotificationBadge();
}, 10000);

// Creates notifications only for AB ADMIN when new submissions are pending
async function checkNewSubmissions(node, type, location, details) {
    const snapshot = await database.ref(node)
        .orderByChild("status")
        .equalTo("pending")
        .once("value");

    const submissions = snapshot.val();
    if (submissions) {
        for (const [subKey, submission] of Object.entries(submissions)) {
            const subEventId = `${type}_${subKey}_${Date.now()}`;
            const subIdentifier = generateCalamityIdentifier(
                type,
                submission.location || location,
                submission.timestamp || Date.now(),
                '',
                ''
            );

            // Prevent duplicates
            if (!processedNotifications.has(subEventId) && !processedNotifications.has(subIdentifier)) {
                const subMessage = `${type} pending at ${submission.location || location}: ${submission.details || details}`;

                await database.ref("notifications").push({
                    message: subMessage,
                    calamityType: type,
                    location: submission.location || location,
                    details: submission.details || details,
                    eventId: subEventId,
                    identifier: subIdentifier,
                    timestamp: Date.now(),
                    read: false,
                    type: "admin",   // 🔥 Only admin sees
                    userUid: null    // No user assigned
                });

                processedNotifications.add(subEventId);
                processedNotifications.add(subIdentifier);
                syncProcessedNotifications();
                console.log(`Admin notified of new ${type} - Event ID: ${subEventId}`);
            }
        }
    }
}


// for bar

function updateReportsByType(reportCounts) {
  const chartContainer = document.querySelector(".data-reports .data-mini-chart");
  if (!chartContainer) return;

  // Clear old bars
  chartContainer.innerHTML = "";

  const calamities = Object.keys(reportCounts);
  if (calamities.length === 0) {
    chartContainer.innerHTML = "<p style='font-size:0.8rem;color:#777;'>No reports yet</p>";
    return;
  }

  const max = Math.max(...Object.values(reportCounts), 1);

  // Define colors for calamities
  const calamityColors = {
    "Flood": "var(--blue)",
    "Fire": "var(--red)",
    "Landslide": "#8B4513",
    "Earthquake": "var(--gray)",
    "Typhoon": "var(--primary-color)",
    "Tsunami": "#0077b6",
    "Volcanic Eruption": "#FF5733"
  };

  // Build bars dynamically
  calamities.forEach(type => {
    const value = reportCounts[type] || 0;
    const percent = Math.round((value / max) * 100);

    const bar = document.createElement("div");
    bar.classList.add("data-bar");
    bar.style.height = percent + "%";
    bar.setAttribute("title", type);

    // Apply color (fallback teal if not in list)
    bar.style.background = calamityColors[type] || "#007b7b";

    // Add label
    const label = document.createElement("span");
    label.textContent = `${type} (${value})`;

    bar.appendChild(label);
    chartContainer.appendChild(bar);
  });
}




function fetchApprovedReports() {
  database.ref("reports/approved").on("value", snapshot => {
    const reports = snapshot.val() || {};
    const counts = {};

    // Count reports by calamity type
    Object.values(reports).forEach(report => {
      const calamity = report.CalamityType;
      if (calamity) {
        counts[calamity] = (counts[calamity] || 0) + 1;
      }
    });

    // Update the chart dynamically
    updateReportsByType(counts);
  });
}




function updateNotificationBadge() {
  if (!notifBadge) return;

  // Build a query that only fetches unread
  const notifRef = database.ref("notifications")
    .orderByChild("read")
    .equalTo(false)
    .limitToLast(200); // safety cap (adjust if needed)

  notifRef.once("value", (snapshot) => {
    let unreadCount = 0;

    snapshot.forEach((childSnap) => {
      const notif = childSnap.val();
      if (!notif || !notif.type) return;

      // --- Filtering rules ---
      if (notif.type === "admin") {
        if (userRole !== "AB ADMIN") return;
      } else if (
        ["donation_approved", "rdana_approved", "report_approved", "relief"].includes(
          notif.type
        )
      ) {
        if (notif.userUid !== userUid) return;
      } else if (notif.type !== "calamity") {
        // other types
        if (userRole !== "AB ADMIN" && notif.userUid && notif.userUid !== userUid) return;
      }
      // -----------------------

      unreadCount++;
    });

    notifBadge.textContent = unreadCount > 0 ? unreadCount : "";
    notifBadge.style.display = unreadCount > 0 ? "inline-flex" : "none";
    notifDot.style.display = unreadCount > 0 ? "block" : "none";
  });
}




// Setup admin notifications (unchanged)
function setupAdminNotifications() {
 if (!calamityList || !adminList || !notifDot || !notifBadge) return;
 loadNotifications();
 const markAllReadBtn = document.getElementById("markAllRead");
 if (markAllReadBtn && userRole === "AB ADMIN") {
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
 notifBadge.textContent = '';
 notifBadge.style.display = "none";
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
    // Check if required DOM elements exist
    if (!calamityList || !adminList || !notifDot || !notifBadge) {
        console.error("Notification list or dot not found.");
        Swal.fire({
            icon: "error",
            title: "Error",
            text: "Notification elements not found. Please check the dashboard setup.",
        });
        return;
    }

    // Remove existing listener to prevent duplicate event handlers
    if (notificationsListener) {
        notificationsListener.off();               // keep your original call
        notificationsListener.off("child_added");  // FIX: explicitly detach this handler
        console.log("Previous notifications listener removed.");
    }

    // Helper: single source of truth for visibility
const isNotifVisibleToUser = (n) => {
    if (!n) return false;

    // Admin-only
    if (n.type === "admin") return userRole === "AB ADMIN";

    // Approvals & Reliefs → ONLY for the owner (admins cannot override)
    if (["donation_approved", "rdana_approved", "report_approved", "relief"].includes(n.type)) {
        return n.userUid === userUid;
    }

    // Calamity is public
    if (n.type === "calamity") return true;

    // Other types
    if (true) return true;
    return !!n.userUid && n.userUid === userUid;
};



    // Set up Firebase listener for notifications (limit to last 50 for performance)
    notificationsListener = database.ref("notifications").limitToLast(50);
    notificationsListener.on("child_added", snapshot => {
        const notification = snapshot.val();
        const key = snapshot.key;
        console.log("New notification received:", notification);

        // Skip if essential fields (message and timestamp) are missing or invalid
        if (!notification || !notification.message || !notification.timestamp || isNaN(new Date(notification.timestamp))) {
            console.warn(`Skipping invalid notification (Key: ${key}) - Missing or invalid message or timestamp`);
            return;
        }

        // Skip duplicate notifications
        if (processedNotifications.has(notification.identifier) || document.querySelector(`li[data-key="${key}"]`)) {
            console.log(`Skipping duplicate notification - Key: ${key}, Identifier: ${notification.identifier}`);
            return;
        }

        // Filter notifications based on user role and userUid (kept) -----------------
        if (notification.type === "admin" && userRole !== "AB ADMIN") {
            console.log(`Skipping admin notification for non-admin user: ${notification.message}`);
            return;
        }

        // For approval notifications (donation_approved, rdana_approved), only show to the submitting user
        if (["donation_approved", "rdana_approved"].includes(notification.type)) {
            if (notification.userUid !== userUid) {
                console.log(`Skipping approval notification for user ${notification.userUid}, current user is ${userUid}`);
                return;
            }
        } else if (userRole !== "AB ADMIN" && notification.userUid && notification.userUid !== userUid) {
            // For non-approval notifications, non-admin users only see their own or calamity notifications
            console.log(`Skipping notification for user ${notification.userUid}, current user is ${userUid}`);
            return;
        }
        // EXTRA GUARD (added, not replacing): non-admins should NOT see items without userUid unless calamity/approval
        if (userRole !== "AB ADMIN" && !["calamity", "donation_approved", "rdana_approved"].includes(notification.type)) {
            if (!notification.userUid || notification.userUid !== userUid) {
                console.log("Skipping non-admin notification without matching userUid.");
                return;
            }
        }
        // Final gate using helper (added)
        if (!isNotifVisibleToUser(notification)) return;
        // ---------------------------------------------------------------------------

        // Add notification to processed set
        processedNotifications.add(notification.identifier || key); // Use key as fallback identifier
        syncProcessedNotifications();

        // Create notification list item
        const li = document.createElement("li");
        let content = "";

        // Customize notification content based on type
        if (notification.type === "calamity") {
            content = `<strong>🚨 Calamity Alert:</strong> ${notification.message}`;
        } else if (notification.type === "admin") {
            content = `<strong>🔔 Admin Notification:</strong> ${notification.message} ${notification.organization ? `from ${notification.organization}` : ''} ${notification.senderName ? `by ${notification.senderName}` : ''}`;
        } else if (notification.type === "donation_approved") {
            content = `<strong>✅ Donation Approved:</strong> ${notification.message}`;
        } else if (notification.type === "rdana_approved") {
            content = `<strong>✅ RDANA Report Approved:</strong> ${notification.message}`;
        } else {
            content = `<strong>🔔 Notification:</strong> ${notification.message}`;
        }

         // Append timestamp with proper time zone (Philippine Time)
const timestamp = new Date(notification.timestamp);
content += `<span class="timestamp">${timestamp.toLocaleString("en-US", {
    hour: "numeric",
    minute: "numeric",
    hour12: true,
    timeZone: "Asia/Manila" // Updated to Philippine Time
})}</span>`;

        li.innerHTML = content;
        li.dataset.key = key;
        li.dataset.type = notification.type || "default";
        li.style.cursor = "pointer";

        // Style unread notifications
        if (!notification.read) {
            li.classList.add("unread");
            li.style.backgroundColor = "#ffeeee"; // Red tint for unread
        } else {
            li.style.backgroundColor = "#ffffff"; // Default color for read
        }

        // Add delete button
        const deleteBtn = document.createElement("span");
        deleteBtn.className = "delete-btn";
        deleteBtn.innerHTML = "×";
        deleteBtn.style.display = "none"; // Hidden by default
        li.appendChild(deleteBtn);

        // Handle notification click (mark as read and navigate)
        li.addEventListener("click", () => {
            console.log(`Notification clicked: ${notification.message}`);
            li.classList.remove("unread");
            li.style.backgroundColor = "#ffffff"; // Reset to default on read

            // Mark notification as read in Firebase
            database.ref(`notifications/${key}`).update({ read: true }).catch(error => {
                console.error("Error marking notification as read:", error);
                Swal.fire({
                    icon: "error",
                    title: "Error",
                    text: "Failed to mark notification as read.",
                });
            });

            // Update notification badge (kept block; FIX: apply same filtering as above)
            database.ref("notifications")
                .once("value", snapshot => {
                    let unreadCount = 0;
                    snapshot.forEach(childSnap => {
                        const n = childSnap.val();
                        if (!n.read && isNotifVisibleToUser(n)) {
                            unreadCount++;
                        }
                    });
                    notifBadge.textContent = unreadCount > 0 ? unreadCount : '';
                    notifBadge.style.display = unreadCount > 0 ? "inline-flex" : "none";
                    notifDot.style.display = unreadCount > 0 ? "block" : "none";
                });

            // Handle navigation for admin notifications
            if (notification.type === "admin" && userRole === "AB ADMIN") {

                // ----- Volunteer Request Redirect (only if requestId exists) -----
                if (notification.requestId) {
                    window.highlightedRequestId = notification.requestId;
                    document.querySelector(".tab-btn[data-tab='volunteers']").click();
                    setTimeout(() => {
                        if (typeof renderTable === "function") renderTable();
                    }, 500);
                    // exit early so it doesn’t also try to redirect to other pages
                    return;
                }

                let targetPage = "";
                let reportIdToUse = "";

                // Detect the base path dynamically
                let basePath = window.location.origin;

                // Check if the current URL already contains "/bayanihan"
                if (window.location.pathname.includes("/bayanihan")) {
                    basePath += "/bayanihan";
                }

                // Determine the target page and ID based on notification message and type
                if (notification.message.toLowerCase().includes("rdana report")) {
                    reportIdToUse = notification.rdanaId || "";
                    targetPage = `${basePath}/pages/rdanaVerification.html?reportId=${reportIdToUse}`;
                    console.log(`Navigating to RDANA verification page with rdanaId: ${reportIdToUse}`);
                } else if (notification.message.toLowerCase().includes("relief report")) {
                    reportIdToUse = notification.rdanaId || "";
                    targetPage = `${basePath}/pages/reliefsLog.html?reportId=${reportIdToUse}`;
                    console.log(`Navigating to reliefs log page with rdanaId: ${reportIdToUse}`);
                } else if (notification.message.toLowerCase().includes("donation")) {
                    reportIdToUse = notification.donationId || "";
                    targetPage = `${basePath}/pages/callfordonation.html?reportId=${reportIdToUse}`;
                    console.log(`Navigating to donation page with donationId: ${reportIdToUse}`);
                } else if (notification.message.toLowerCase().includes("report")) {
                    const reportIdMatch = notification.message.match(/REPORTS-\d+/);
                    reportIdToUse = reportIdMatch ? reportIdMatch[0] : notification.reportId || "";
                    targetPage = `${basePath}/pages/reportsVerification.html?reportId=${reportIdToUse}`;
                    console.log(`Navigating to reports verification page with reportId: ${reportIdToUse}`);
                }

                // Redirect to the detected path
                if (targetPage && reportIdToUse) {
                    console.log(`Navigating to: ${targetPage}`);
                    try {
                        window.location.href = targetPage;
                    } catch (error) {
                        console.error(`Failed to navigate to ${targetPage}:`, error);
                        Swal.fire({
                            icon: "error",
                            title: "Navigation Error",
                            text: `Could not navigate to ${targetPage}. Please check if the page exists.`,
                        });
                    }
                } else {
                    console.log("No target page or ID determined for notification:", notification.message);
                }
            }

            // Handle calamity notifications with map interaction
// ================= Quick Activation Modal =================
const quickActivationHTML = `
<div id="quickActivationModal" style="
  display:none;position:fixed;top:0;left:0;width:100%;height:100%;
  background:rgba(0,0,0,0.5);z-index:9999;align-items:center;justify-content:center;">
  <div class="modal-content" style="background:#fff;padding:20px;width:420px;border-radius:8px;">
    <h2 style="margin-bottom:12px;">Quick Activation</h2>

    <label style="font-weight:600;">Area of Operations<span style="color:red">*</span></label>
    <input type="text" id="qaArea" style="width:100%;padding:6px;margin:6px 0;">

    <label style="font-weight:600;">Calamity Type<span style="color:red">*</span></label>
    <select id="qaCalamityType" style="width:100%;padding:6px;margin:6px 0;">
      <option value="">-- Select Calamity Type --</option>
      <option value="Typhoon">Typhoon</option>
      <option value="Earthquake">Earthquake</option>
      <option value="Flood">Flood</option>
      <option value="Volcanic Eruption">Volcanic Eruption</option>
      <option value="Landslide">Landslide</option>
      <option value="Tsunami">Tsunami</option>
    </select>

    <label style="font-weight:600;">Calamity Name</label>
    <input type="text" id="qaCalamityName" style="width:100%;padding:6px;margin:6px 0;">

    <div id="qaError" style="color:#e63946;font-size:13px;margin:6px 0;display:none;">
      Please fill in all required fields.
    </div>

    <div style="text-align:right;margin-top:14px;">
      <button id="qaCancel" style="padding:6px 12px;margin-right:6px;">Cancel</button>
      <button id="qaSave" style="padding:6px 12px;background:#2a9d8f;color:#fff;border:none;">Activate</button>
    </div>
  </div>
</div>
`;
if (!document.getElementById("quickActivationModal")) {
  document.body.insertAdjacentHTML("beforeend", quickActivationHTML);
}

function openQuickActivation(group, calamity, abvnMarker) {
  const areaInput = document.getElementById("qaArea");
  const typeSelect = document.getElementById("qaCalamityType");
  const nameInput = document.getElementById("qaCalamityName");
  const errorBox = document.getElementById("qaError");

  areaInput.value = group.address?.formattedAddress || "";
  typeSelect.value = calamity.type && [
    "Typhoon","Earthquake","Flood","Volcanic Eruption","Landslide","Tsunami"
  ].includes(calamity.type) ? calamity.type : "";
  nameInput.value = calamity.magnitude || "";

  document.getElementById("quickActivationModal").style.display = "flex";
  errorBox.style.display = "none";

  document.getElementById("qaCancel").onclick = () => {
    document.getElementById("quickActivationModal").style.display = "none";
  };

  document.getElementById("qaSave").onclick = async () => {
    const area = areaInput.value.trim();
    const ctype = typeSelect.value.trim();
    if (!area || !ctype) {
      errorBox.style.display = "block";
      return;
    }

    const newKey = database.ref("activations").push().key;
    await database.ref("activations/" + newKey).set({
      activationId: newKey,
      activationDate: new Date().toISOString(),
      calamityName: nameInput.value.trim() || calamity.magnitude,
      calamityType: ctype,
      groupId: group.id,
      hq: group.address?.formattedAddress || "Not specified",
      areaOfOperation: area,
      latitude: group.coords?.lat,
      longitude: group.coords?.lng,
      organization: group.organization,
      status: "active"
    });

    document.getElementById("quickActivationModal").style.display = "none";
    Swal.fire({ icon: "success", title: "Activated", text: `${group.organization} is now activated.` });

    if (abvnMarker) {
      abvnMarker.setIcon({
        url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
          <svg width="40" height="50" viewBox="0 0 40 50" xmlns="http://www.w3.org/2000/svg">
            <g>
              <path d="M20 0 L28 15 L20 10 L12 15 Z" fill="#28a745" stroke="#ffffff" stroke-width="2"/>
              <circle cx="20" cy="20" r="12" fill="#28a745" stroke="#ffffff" stroke-width="2"/>
              <text x="20" y="22" font-size="16" text-anchor="middle" fill="#ffffff" font-weight="bold">✓</text>
            </g>
          </svg>
        `)}`,
        scaledSize: new google.maps.Size(40, 50),
        anchor: new google.maps.Point(20, 50)
      });
    }
  };
}

// ================= Calamity Handler =================
let abvnMarkers = [];
let currentInfoWindow = null;
const calamityMarkersMap = {};

function handleCalamityNotification(eventId) {
  if (!eventId || calamityMarkersMap[eventId]) return;

  database.ref("calamities").orderByChild("eventId").equalTo(eventId).once("value")
    .then(calSnapshot => {
      const calData = calSnapshot.val();
      if (!calData) {
        console.log(`No calamity data found for eventId: ${eventId}`);
        return;
      }

      const calKey = Object.keys(calData)[0];
      const calamity = calData[calKey];
      const coordinates = calamity.coordinates || { lat: 14.5995, lng: 120.9842 };

      // calamity marker
      if (!calamityMarkersMap[eventId]) {
        const calamityIcon = {
          url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
            <svg width="50" height="60" viewBox="0 0 50 60" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <filter id="shadow" x="-50%" y="-50%" width="200%" height="200%">
                  <feDropShadow dx="0" dy="5" stdDeviation="3" flood-color="#000000"/>
                </filter>
              </defs>
              <g filter="url(#shadow)">
                <path d="M25 0 L35 20 L25 15 L15 20 Z" fill="#e63946" stroke="#ffffff" stroke-width="2"/>
                <circle cx="25" cy="25" r="15" fill="#e63946" stroke="#ffffff" stroke-width="2"/>
                <text x="25" y="30" font-size="20" text-anchor="middle" fill="#ffffff" font-weight="bold">⚠</text>
                <circle cx="25" cy="25" r="15" fill="none" stroke="#ff6b6b" stroke-width="3" opacity="0.8">
                  <animate attributeName="r" values="15;20;15" dur="2s" repeatCount="indefinite"/>
                  <animate attributeName="opacity" values="0.8;0.4;0.8" dur="2s" repeatCount="indefinite"/>
                </circle>
              </g>
            </svg>
          `)}`,
          scaledSize: new google.maps.Size(50, 60),
          anchor: new google.maps.Point(25, 60)
        };

        const pinMarker = new google.maps.Marker({
          position: coordinates,
          map: map,
          title: calamity.type || "Calamity",
          icon: calamityIcon,
          animation: google.maps.Animation.DROP
        });
        calamityMarkersMap[eventId] = pinMarker;

        const calamityInfo = new google.maps.InfoWindow({
          content: `
            <div style="font-family:'Segoe UI',sans-serif;width:260px;border-radius:12px;background:#fff;box-shadow:0 4px 14px rgba(0,0,0,0.25);overflow:hidden;">
              <div style="background:#e63946;color:#fff;padding:10px 14px;font-size:16px;font-weight:600;">
                🚨 ${calamity.type || "Calamity"}
              </div>
              <div style="padding:12px;color:#333;font-size:14px;line-height:1.4;">
                <b>📍 ${calamity.location || 'Unknown Location'}</b><br>
                <b>Magnitude:</b> ${calamity.magnitude || "N/A"}<br>
                <b>Time:</b> ${new Date(calamity.time || Date.now()).toLocaleString()}
              </div>
              <div style="padding:10px;border-top:1px solid #eee;text-align:center;">
                <button id="showAbvnBtn-${calKey}" style="
                  padding:8px 12px;border:none;border-radius:6px;
                  background:#2a9d8f;color:#fff;font-size:14px;font-weight:500;
                  cursor:pointer;transition:all 0.2s ease;">
                  Show All ABVNs
                </button>
              </div>
            </div>
          `
        });

        if (currentInfoWindow) currentInfoWindow.close();
        currentInfoWindow = calamityInfo;
        currentInfoWindow.open(map, pinMarker);

        pinMarker.addListener("click", () => {
          if (currentInfoWindow) currentInfoWindow.close();
          currentInfoWindow = calamityInfo;
          currentInfoWindow.open(map, pinMarker);
        });

        map.panTo(coordinates);
        map.setZoom(13);

        // ✅ Attach the Show ABVNs click after InfoWindow is ready
        google.maps.event.addListener(calamityInfo, "domready", () => {
          const btn = document.getElementById(`showAbvnBtn-${calKey}`);
          if (btn) {
            btn.addEventListener("click", async () => {
              console.log("Show ABVNs button clicked");

              try {
                abvnMarkers.forEach(m => m.setMap(null));
                abvnMarkers = [];

                const snapshot = await database.ref("volunteerGroups").once("value");
                const volunteerGroups = snapshot.val() || {};
                let abvnCount = 0;
                let abvnData = [];

                const abvnIcon = {
                  url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
                    <svg width="40" height="50" viewBox="0 0 40 50" xmlns="http://www.w3.org/2000/svg">
                      <g>
                        <path d="M20 0 L28 15 L20 10 L12 15 Z" fill="#2a9d8f" stroke="#ffffff" stroke-width="2"/>
                        <circle cx="20" cy="20" r="12" fill="#2a9d8f" stroke="#ffffff" stroke-width="2"/>
                        <text x="20" y="22" font-size="16" text-anchor="middle" fill="#ffffff" font-weight="bold">👥</text>
                      </g>
                    </svg>
                  `)}`,
                  scaledSize: new google.maps.Size(40, 50),
                  anchor: new google.maps.Point(20, 50)
                };

                function haversineDistance(coord1, coord2) {
                  const toRad = (x) => (x * Math.PI) / 180;
                  const R = 6371;
                  const dLat = toRad(coord2.lat - coord1.lat);
                  const dLon = toRad(coord2.lng - coord1.lng);
                  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                            Math.cos(toRad(coord1.lat)) * Math.cos(toRad(coord2.lat)) *
                            Math.sin(dLon / 2) * Math.sin(dLon / 2);
                  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
                  return R * c;
                }

                Object.entries(volunteerGroups).forEach(([groupId, group]) => {
                  if (group.address?.latitude && group.address?.longitude) {
                    const abvnCoords = {
                      lat: parseFloat(group.address.latitude),
                      lng: parseFloat(group.address.longitude)
                    };
                    const distance = haversineDistance(coordinates, abvnCoords).toFixed(1);
                    abvnData.push({ group, distance, coords: abvnCoords });

                    const abvnMarker = new google.maps.Marker({
                      position: abvnCoords,
                      map: map,
                      title: `${group.organization} (${distance} km)`,
                      icon: abvnIcon,
                      animation: google.maps.Animation.DROP
                    });
                    abvnMarkers.push(abvnMarker);
                    abvnCount++;

                    // 🔹 On click, open Quick Activation modal
                    abvnMarker.addListener("click", async () => {
                      const actSnap = await database.ref("activations")
                        .orderByChild("groupId")
                        .equalTo(groupId)
                        .once("value");
                      const acts = actSnap.val() || {};
                      const activeAct = Object.values(acts).find(a => a.status === "active");

                      if (activeAct) {
                        Swal.fire({
                          icon: "success",
                          title: `${group.organization} already active`,
                          html: `
                            <b>Status:</b> Active<br>
                            <b>Area:</b> ${activeAct.areaOfOperation}<br>
                            <b>Activated:</b> ${new Date(activeAct.activationDate).toLocaleString()}
                          `
                        });
                      } else {
                        openQuickActivation(
                          { ...group, id: groupId, coords: abvnCoords },
                          calamity,
                          abvnMarker
                        );
                      }
                    });
                  }
                });

                abvnData.sort((a, b) => a.distance - b.distance);
                const nearestSuggestion = abvnData.length > 0 ? abvnData[0].group.organization : "No groups available";
                const suggestionText = abvnData.length > 0
                  ? `Suggestion: ${nearestSuggestion} is the nearest (${abvnData[0].distance} km).`
                  : "No suggestions available";

                Swal.fire({
                  icon: "info",
                  title: "All ABVNs Located",
                  html: `Here are ${abvnCount} ABVN groups.<br><br>${suggestionText}`
                });

              } catch (error) {
                Swal.fire({
                  icon: "error",
                  title: "Error",
                  text: `Failed to load volunteer group locations: ${error.message}`
                });
              }
            });
          }
        });
      } else {
        // update existing calamity marker
        calamityMarkersMap[eventId].setPosition(coordinates);
        map.panTo(coordinates);
        map.setZoom(13);
      }
    })
    .catch(error => {
      Swal.fire({
        icon: "error",
        title: "Error",
        text: `Failed to load calamity location: ${error.message}`
      });
    });
}


// Example call
handleCalamityNotification(notification.eventId);



        });

        // Handle hover effect and delete button
        li.addEventListener("mousemove", (e) => {
            const rect = li.getBoundingClientRect();
            const mouseX = e.clientX - rect.left;
            const width = rect.width;
            li.style.transform = "translateX(-10px)"; // Slide left on hover
            if (mouseX > width * 0.8) {
                deleteBtn.style.display = "inline";
            } else {
                deleteBtn.style.display = "none";
            }
        });

        li.addEventListener("mouseleave", () => {
            li.style.transform = "translateX(0)"; // Reset position
            deleteBtn.style.display = "none";
        });

        // Handle delete button click
        deleteBtn.addEventListener("click", (e) => {
            e.stopPropagation(); // Prevent triggering the notification click
            database.ref(`notifications/${key}`).remove().then(() => {
                li.remove();
                updateNotificationBadge();
            }).catch(error => {
                console.error("Error deleting notification:", error);
                Swal.fire({
                    icon: "error",
                    title: "Error",
                    text: "Failed to delete notification.",
                });
            });
        });

        // Append notification to appropriate list
        if (notification.type === "calamity") {
            calamityList.prepend(li);
        } else {
            adminList.prepend(li);
        }

        // Update notification badge
        updateNotificationBadge();
    }, error => {
        console.error("Error fetching notifications:", error);
        Swal.fire({
            icon: "error",
            title: "Error",
            text: "Failed to load notifications: " + error.message,
        });
    });
}


// Verify report in reportssubmission
async function verifyReport(reportId) {
    try {
        const snapshot = await database.ref("reportssubmission").orderByChild("reportId").equalTo(reportId).once("value");
        const report = snapshot.val();
        if (report) {
            console.log(`Report found with ID: ${reportId}`);
            Swal.fire({
                icon: "success",
                title: "Report Found",
                text: `Report with ID ${reportId} has been located and is available for verification.`,
            });
        } else {
            console.log(`No report found with ID: ${reportId}`);
            Swal.fire({
                icon: "warning",
                title: "Report Not Found",
                text: `No report with ID ${reportId} exists in the submission list.`,
            });
        }
    } catch (error) {
        console.error("Error verifying report:", error);
        Swal.fire({
            icon: "error",
            title: "Error",
            text: "Failed to verify report. Please try again later.",
        });
    }
}
// Setup tab switching for notification drawer
function setupTabSwitching() {
    const tabCalamity = document.getElementById("tabCalamity");
    const tabAdmin = document.getElementById("tabAdmin");
    if (!tabCalamity || !tabAdmin) return;
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
        animateNumber('food-packs', totalFoodPacks);
        animateNumber('hot-meals', totalHotMeals);
        animateNumber('water-liters', totalWaterLiters);
        animateNumber('volunteers', totalVolunteers);
        animateNumber('amount-raised', totalMonetaryDonations, 1000, 2);
        animateNumber('inkind-donations', totalInKindDonations, 1000, 2);
    }, error => {
        console.error("Error fetching reports:", error);
        Swal.fire({
            icon: "error",
            title: "Error",
            text: "Failed to load reports.",
        });
    });
}

// Formatting functions
function formatWithCommas(value) {
    return value != null ? Number(value).toLocaleString() : "-";
}

function formatCompact(value) {
    return value != null
        ? new Intl.NumberFormat('en', {
            notation: 'compact',
            compactDisplay: 'short',
        }).format(value)
        : "-";
}

function formatCurrency(value) {
    return value != null
        ? new Intl.NumberFormat('en-PH', {
            style: 'currency',
            currency: 'PHP',
            minimumFractionDigits: 0,
        }).format(value)
        : "-";
}

// Function to fetch and render metrics
async function fetchAndRenderAllMetrics(sectionName) {
    const metricsTableBody = document.querySelector(`.${sectionName.toLowerCase().replace(/ /g, '-')}-metrics .metrics-table tbody`);
    console.log(`[${new Date().toLocaleTimeString()}] Targeting ${sectionName} table body:`, metricsTableBody);
    if (!metricsTableBody) {
        console.error(`[${new Date().toLocaleTimeString()}] ${sectionName} table body not found`);
        return;
    }

    try {
        metricsTableBody.innerHTML = '';
        const snapshot = await database.ref("reports/approved").once("value");
        const reports = snapshot.val();
        console.log(`[${new Date().toLocaleTimeString()}] Fetched reports:`, reports);
        if (!reports) {
            metricsTableBody.innerHTML = "<tr><td colspan='7'>No data available</td></tr>";
            return;
        }

        const processedReportIDs = new Set();
        const allMetrics = {};

        Object.entries(reports).forEach(([key, report]) => {
            const reportID = report.ReportID || key;
            if (processedReportIDs.has(reportID)) {
                console.warn(`[${new Date().toLocaleTimeString()}] Duplicate ReportID: ${reportID}`);
                return;
            }
            processedReportIDs.add(reportID);

            const volunteerGroup = report.organization || report.VolunteerGroupName || "Unknown";
            if (!allMetrics[volunteerGroup]) {
                allMetrics[volunteerGroup] = {
                    foodPacks: 0,
                    hotMeals: 0,
                    waterLiters: 0,
                    volunteers: 0,
                    monetaryDonations: 0,
                    inKindDonations: 0,
                    inKindItems: new Set(),
                };
            }
            allMetrics[volunteerGroup].foodPacks += parseFloat(report.NoOfFoodPacks || report.foodPacks || 0);
            allMetrics[volunteerGroup].hotMeals += parseFloat(report.NoOfHotMeals || report.hotMeals || 0);
            allMetrics[volunteerGroup].waterLiters += parseFloat(report.LitersOfWater || report.water || 0);
            allMetrics[volunteerGroup].volunteers += parseFloat(report.NoOfVolunteersMobilized || report.volunteers || 0);
            allMetrics[volunteerGroup].monetaryDonations += parseFloat(report.TotalMonetaryDonations || report.amountRaised || 0);
            allMetrics[volunteerGroup].inKindDonations += parseFloat(report.TotalValueOfInKindDonations || report.inKindValue || 0);
            if (report.inKindItems) {
                report.inKindItems.split(',').forEach(item => allMetrics[volunteerGroup].inKindItems.add(item.trim()));
            }
        });

        Object.entries(allMetrics).forEach(([group, metrics]) => {
            let inKindDisplay = metrics.inKindItems.size > 0
                ? Array.from(metrics.inKindItems).join(', ')
                : formatCurrency(metrics.inKindDonations) || '-';

            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${group}</td>
                <td>${formatCompact(metrics.foodPacks)}</td>
                <td>${formatCompact(metrics.hotMeals)}</td>
                <td>${formatWithCommas(metrics.waterLiters)} L</td>
                <td>${formatCompact(metrics.volunteers)}</td>
                <td>${formatCurrency(metrics.monetaryDonations)}</td>
                <td>${inKindDisplay}</td>
            `;
            metricsTableBody.appendChild(tr);
        });

        if (Object.keys(allMetrics).length === 0) {
            metricsTableBody.innerHTML = "<tr><td colspan='7'>No data available</td></tr>";
        }
        console.log(`[${new Date().toLocaleTimeString()}] Metrics rendered for ${sectionName}:`, allMetrics);
    } catch (error) {
        console.error(`[${new Date().toLocaleTimeString()}] Error in ${sectionName} metrics:`, error);
        metricsTableBody.innerHTML = "<tr><td colspan='7'>Error loading data</td></tr>";
    }
}

// Function to check user role and manage ABVN + Metrics visibility
function checkUserRoleAndRender() {
    firebase.auth().onAuthStateChanged((user) => {
        console.log(`[${new Date().toLocaleTimeString()}] Auth state changed, user:`, user);
        if (user) {
            database.ref(`users/${user.uid}`).once("value").then((snapshot) => {
                const userData = snapshot.val();
                console.log(`[${new Date().toLocaleTimeString()}] User data:`, userData);
                const isAdmin = userData?.role === "AB ADMIN"; 
                console.log(`[${new Date().toLocaleTimeString()}] Is Admin:`, isAdmin);

                // ===== ABVN section =====
                const abvnMetricsDiv = document.querySelector('.abvn-metrics');
                if (abvnMetricsDiv) {
                    if (!isAdmin) {
                        abvnMetricsDiv.remove();
                        console.log(`[${new Date().toLocaleTimeString()}] ABVN removed for non-ADMIN`);
                    } else {
                        fetchAndRenderAllMetrics("ABVN").catch(err => console.error(`[${new Date().toLocaleTimeString()}] ABVN render failed:`, err));
                        console.log(`[${new Date().toLocaleTimeString()}] ABVN rendering attempted for ADMIN`);
                    }
                }

                // ===== Metrics Toggle section =====
                const metricsToggleDiv = document.querySelector('.metrics-toggle');
                if (metricsToggleDiv) {
                    if (!isAdmin) {
                        metricsToggleDiv.remove();
                        console.log(`[${new Date().toLocaleTimeString()}] Metrics Toggle removed for non-ADMIN`);
                    } else {
                        metricsToggleDiv.style.display = "block";
                        loadMetricsSettings(); // 👈 restore saved toggle states
                        console.log(`[${new Date().toLocaleTimeString()}] Metrics Toggle visible for ADMIN`);
                    }
                }

                // ===== Always-render sections =====
                fetchAndRenderAllMetrics("PENDING APPROVALS").catch(err => console.error(err));
                fetchAndRenderAllMetrics("RELIEF OPERATIONS").catch(err => console.error(err));
                fetchAndRenderAllMetrics("RDANA").catch(err => console.error(err));

            }).catch(err => console.error(`[${new Date().toLocaleTimeString()}] User data fetch error:`, err));
        } else {
            console.log(`[${new Date().toLocaleTimeString()}] No user logged in`);

            const abvnMetricsDiv = document.querySelector('.abvn-metrics');
            if (abvnMetricsDiv) abvnMetricsDiv.remove();

            const metricsToggleDiv = document.querySelector('.metrics-toggle');
            if (metricsToggleDiv) metricsToggleDiv.remove();

            fetchAndRenderAllMetrics("PENDING APPROVALS").catch(err => console.error(err));
            fetchAndRenderAllMetrics("RELIEF OPERATIONS").catch(err => console.error(err));
            fetchAndRenderAllMetrics("RDANA").catch(err => console.error(err));
        }
    });
}


// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    if (database && firebase) {
        console.log(`[${new Date().toLocaleTimeString()}] Initializing with database and firebase`);
        checkUserRoleAndRender();
    } else {
        console.error(`[${new Date().toLocaleTimeString()}] Database or Firebase not initialized`);
    }
});

// Cleanup dashboard resources
function cleanupDashboard() {
    console.log("Cleaning up dashboard resources at", new Date().toISOString());
    if (map) {
        google.maps.event.clearInstanceListeners(map);
        markers.forEach(marker => marker.setMap(null));
        calamityMarkers.forEach(marker => marker.setMap(null));
        markers = [];
        calamityMarkers = [];
        if (currentInfoWindow) singleInfoWindow.close();
        currentInfoWindow = null;
        singleInfoWindow = null;
        map = null;
    }
    if (calamityListener) {
        calamityListener.off();
        calamityListener = null;
    }
    if (notificationsListener) {
        notificationsListener.off();
        notificationsListener = null;
    }
    if (reportsListener) {
        reportsListener.off();
        reportsListener = null;
    }
    sessionStorage.removeItem(SESSION_KEY);
    sessionStorage.removeItem(CALAMITY_TRACKING_KEY);
    sessionStorage.removeItem(SESSION_TIMESTAMP_KEY);
    processedCalamities.clear();
    processedNotifications.clear();
    syncProcessedCalamities();
    syncProcessedNotifications();
    console.log("Dashboard cleanup completed.");
}
// Update rain warning overlay
function updateRainWarningOverlay() {
    const overlay = new google.maps.OverlayView();
    overlay.onAdd = function () {
        const layer = document.createElement("div");
        layer.style.borderStyle = "none";
        layer.style.borderWidth = "0px";
        layer.style.position = "absolute";
        const panes = this.getPanes();
        panes.overlayLayer.appendChild(layer);
    };
    overlay.draw = function () {
        const projection = this.getProjection();
        const bounds = map.getBounds();
        if (!bounds) return;
        const ne = projection.fromLatLngToDivPixel(bounds.getNorthEast());
        const sw = projection.fromLatLngToDivPixel(bounds.getSouthWest());
        const overlay = this.getPanes().overlayLayer.firstChild;
        if (overlay) {
            overlay.style.left = sw.x + "px";
            overlay.style.top = ne.y + "px";
            overlay.style.width = (ne.x - sw.x) + "px";
            overlay.style.height = (sw.y - ne.y) + "px";
            overlay.style.backgroundColor = "rgba(255, 0, 0, 0.2)";
            overlay.style.display = isInfoWindowClicked ? "block" : "none";
        }
    };
    overlay.onRemove = function () {
        const overlay = this.getPanes().overlayLayer.firstChild;
        if (overlay) overlay.parentNode.removeChild(overlay);
    };
    overlay.setMap(map);
}
// Clean duplicate calamities
async function cleanDuplicateCalamities() {
    try {
        const snapshot = await database.ref("calamities").once("value");
        const calamities = snapshot.val();
        if (!calamities) return;
        const uniqueCalamities = new Map();
        for (const [key, calamity] of Object.entries(calamities)) {
            const identifier = calamity.identifier || generateCalamityIdentifier(calamity.type, calamity.location, calamity.time, calamity.magnitude, calamity.rainfall);
            if (!uniqueCalamities.has(identifier) || (calamity.timestamp && calamity.timestamp > (uniqueCalamities.get(identifier)?.timestamp || 0))) {
                uniqueCalamities.set(identifier, { key, ...calamity });
            }
        }
        const updates = {};
        Object.entries(calamities).forEach(([key, calamity]) => {
            const identifier = calamity.identifier || generateCalamityIdentifier(calamity.type, calamity.location, calamity.time, calamity.magnitude, calamity.rainfall);
            if (uniqueCalamities.get(identifier).key !== key) {
                updates[`/calamities/${key}`] = null;
            }
        });
        if (Object.keys(updates).length > 0) {
            await database.ref().update(updates);
            console.log("Removed duplicate calamities:", Object.keys(updates).length);
        }
    } catch (error) {
        console.error("Error cleaning duplicate calamities:", error);
    }
}
// Clean duplicate notifications
async function cleanDuplicateNotifications() {
    try {
        const snapshot = await database.ref("notifications").once("value");
        const notifications = snapshot.val();
        if (!notifications) return;
        const uniqueNotifications = new Map();
        for (const [key, notification] of Object.entries(notifications)) {
            const identifier = notification.identifier || generateCalamityIdentifier(notification.calamityType, notification.location, notification.time, notification.magnitude, notification.rainfall);
            if (!uniqueNotifications.has(identifier) || (notification.timestamp && notification.timestamp > (uniqueNotifications.get(identifier)?.timestamp || 0))) {
                uniqueNotifications.set(identifier, { key, ...notification });
            }
        }
        const updates = {};
        Object.entries(notifications).forEach(([key, notification]) => {
            const identifier = notification.identifier || generateCalamityIdentifier(notification.calamityType, notification.location, notification.time, notification.magnitude, notification.rainfall);
            if (uniqueNotifications.get(identifier).key !== key) {
                updates[`/notifications/${key}`] = null;
            }
        });
        if (Object.keys(updates).length > 0) {
            await database.ref().update(updates);
            console.log("Removed duplicate notifications:", Object.keys(updates).length);
        }
    } catch (error) {
        console.error("Error cleaning duplicate notifications:", error);
    }
}
// Clean old calamities (older than 30 days)
async function cleanOldCalamities() {
    try {
        const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000); // 30 days in milliseconds
        const snapshot = await database.ref("calamities").once("value");
        const calamities = snapshot.val();
        if (!calamities) return;
        const updates = {};
        Object.entries(calamities).forEach(([key, calamity]) => {
            if (calamity.timestamp && calamity.timestamp < thirtyDaysAgo) {
                updates[`/calamities/${key}`] = null;
            }
        });
        if (Object.keys(updates).length > 0) {
            await database.ref().update(updates);
            console.log("Removed old calamities:", Object.keys(updates).length);
        }
    } catch (error) {
        console.error("Error cleaning old calamities:", error);
    }
}

// Migrate legacy calamities (add missing eventId and identifier)
async function migrateLegacyCalamities() {
    try {
        const snapshot = await database.ref("calamities").once("value");
        const calamities = snapshot.val();
        if (!calamities) return;
        const updates = {};
        Object.entries(calamities).forEach(([key, calamity]) => {
            if (!calamity.eventId || !calamity.identifier) {
                const eventId = calamity.eventId || key;
                const identifier = calamity.identifier || generateCalamityIdentifier(calamity.type, calamity.location, calamity.time, calamity.magnitude, calamity.rainfall);
                updates[`/calamities/${key}/eventId`] = eventId;
                updates[`/calamities/${key}/identifier`] = identifier;
                processedCalamities.add(eventId);
                processedCalamities.add(identifier);
            }
        });
        if (Object.keys(updates).length > 0) {
            await database.ref().update(updates);
            syncProcessedCalamities();
            console.log("Migrated legacy calamities:", Object.keys(updates).length);
        }
    } catch (error) {
        console.error("Error migrating legacy calamities:", error);
    }
}
// Function to clean up expired calamity markers
function cleanupExpiredMarkers() {
    const currentTime = Date.now();
    const twelveHoursInMs = 12 * 60 * 60 * 1000;
    calamityMarkers = calamityMarkers.filter(({ marker, eventTime }) => {
        if (currentTime - eventTime > twelveHoursInMs) {
            marker.setMap(null); // Remove from map
            console.log(`Removed expired marker for event at ${marker.getPosition()}`);
            return false; // Filter out expired marker
        }
        return true; // Keep active marker
    });
}

// Start periodic cleanup (e.g., every hour)
setInterval(cleanupExpiredMarkers, 60 * 60 * 1000); // Runs every hour

// Initial cleanup on load
cleanupExpiredMarkers();
// Initialize dashboard when the page loads
window.addEventListener("load", initializeDashboard);

// Add periodic refresh for calamity tracking to fix realtime updates
setInterval(trackCalamities, 5 * 60 * 1000); // Refresh every 5 minutes

// Haversine distance function
function haversineDistance(coord1, coord2) {
    const R = 6371; // Earth's radius in km
    const dLat = (coord2.lat - coord1.lat) * Math.PI / 180;
    const dLon = (coord2.lng - coord1.lng) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(coord1.lat * Math.PI / 180) * Math.cos(coord2.lat * Math.PI / 180) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // Distance in km
}

// Function to find nearest ABVN group
async function findNearestABVN(lat, lng) {
    try {
        const snapshot = await database.ref("activations").orderByChild("status").equalTo("active").once("value");
        const activations = snapshot.val();
        if (!activations) return null;

        let nearest = null;
        let minDist = Infinity;

        Object.values(activations).forEach(act => {
            if (act.latitude && act.longitude) {
                const dist = haversineDistance({ lat, lng }, { lat: parseFloat(act.latitude), lng: parseFloat(act.longitude) });
                if (dist < minDist) {
                    minDist = dist;
                    nearest = act;
                }
            }
        });

        return nearest ? {
            organization: nearest.organization,
            distance: minDist.toFixed(2) + ' km',
            areaOfOperation: nearest.areaOfOperation
        } : null;
    } catch (error) {
        console.error("Error finding nearest ABVN:", error);
        throw error;
    }
}

document.getElementById("saveMetrics").addEventListener("click", () => {
  const settings = {};
  document.querySelectorAll("input[type=checkbox]").forEach(cb => {
    settings[cb.dataset.metric] = cb.checked;
  });

  database.ref("settings/metrics").set(settings).then(() => {
    Swal.fire({
      title: "Saved!",
      text: "Your metric settings have been updated.",
      icon: "success",
      confirmButtonText: "OK",
      timer: 2000,
      showConfirmButton: false
    });
  }).catch(error => {
    Swal.fire({
      title: "Error",
      text: "Something went wrong: " + error.message,
      icon: "error",
      confirmButtonText: "Retry"
    });
  });
});

function loadMetricsSettings() {
  database.ref("settings/metrics").once("value").then(snapshot => {
    const settings = snapshot.val();
    if (settings) {
      document.querySelectorAll(".metrics-toggle input[type=checkbox]").forEach(cb => {
        if (settings.hasOwnProperty(cb.dataset.metric)) {
          cb.checked = settings[cb.dataset.metric];
          // Optionally trigger visibility update right away
          const card = document.querySelector(`.metric-card[data-card="${cb.dataset.metric}"]`);
          if (card) {
            card.style.display = cb.checked ? "block" : "none";
          }
        }
      });
    }
  }).catch(err => console.error("Error loading metrics:", err));
}




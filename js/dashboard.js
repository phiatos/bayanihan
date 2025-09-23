// --- AUTO REMOVE OLD SORT DROPDOWNS (added) ---
document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('select').forEach(s => {
    if (s && s.id !== 'mapFilter' && !s.closest('#map-sort-filter')) {
      s.remove();
    }
  });
});
// --- END AUTO REMOVE ---

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
        } else if (tab === "reports") {
            // Hide dashboard
            dashboardContainer.style.display = "none";

            // Fetch reports overview HTML
            const res = await fetch("../pages/reportsOverview.html");
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

            // Force reload reports JS every time
            try {
                const jsRes = await fetch("../js/reportsOverview.js");
                const jsCode = await jsRes.text();
                new Function(jsCode)();
            } catch (err) {
                console.error("Failed to load reportsOverview.js", err);
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
// NEW: For map sorting/filtering
let hqMarkers = [], activatedMarkers = [], currentFilter = 'Calamities'; // Changed default to 'Calamities' for cleaner view
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
        confirmButtonColor: '#2a9d8f',
        cancelButtonColor: '#e63946',
        confirmButtonText: 'Stay Logged In',
        cancelButtonText: 'Log Out',
        allowOutsideClick: false,
        reverseButtons: true,
        customClass: {
          title: 'swal-title',
          htmlContainer: 'swal-html',
          confirmButton: 'swal-confirm',
          cancelButton: 'swal-cancel'
        }
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
// NEW: Map Sort Filter UI
// ------------------------------------------------------------------
// Single Map Sort Filter: creates one floating control, hides duplicate page selects,
// supports: ALL, Calamities, ABVN HQs, Activated ABVNs, Weather
// ------------------------------------------------------------------
function createMapSortFilter() {
    try {
        if (!mapDiv) return;
        // If we already added the floating filter, just sync value and return
        const existing = document.getElementById('map-sort-filter');
        if (existing) {
            const sel = document.getElementById('mapFilter');
            if (sel) sel.value = currentFilter || 'Calamities';
            return;
        }

        // Build floating container
        const container = document.createElement('div');
        container.id = 'map-sort-filter';
        container.style.cssText = 'position:absolute;top:10px;left:10px;z-index:1000;background:#fff;padding:8px;border-radius:6px;box-shadow:0 2px 5px rgba(0,0,0,0.2);';
        container.innerHTML = `
            <label for="mapFilter" style="font-weight:600;margin-right:8px;">Map View:</label>
            <select id="mapFilter" aria-label="Map View">
                <option value="ALL">ALL</option>
                <option value="Calamities">Calamities</option>
                <option value="ABVN HQs">ABVN HQs</option>
                <option value="Activated ABVNs">Activated ABVNs</option>
                <option value="Weather">Weather</option>
            </select>
        `;
        mapDiv.appendChild(container);

        const filter = document.getElementById('mapFilter');
        filter.value = currentFilter || 'Calamities';

        filter.addEventListener('change', (e) => {
            let val = e.target.value;
            if (val === 'All') val = 'ALL';
            currentFilter = val;
            applyMapFilter();
        });
    } catch (err) {
        console.error('createMapSortFilter error:', err);
    }
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
                    customClass: {
                      title: 'swal-title',
                      htmlContainer: 'swal-html',
                      confirmButton: 'swal-confirm'
                    }
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
                        customClass: {
                          title: 'swal-title',
                          htmlContainer: 'swal-html',
                          confirmButton: 'swal-confirm'
                        }
                    }).then(() => window.location.href = "../pages/login.html");
                    return reject("User role not found");
                }

                userRole = userData.role;
                userEmail = user.email;
                headerEl.textContent = userRole === "AB ADMIN" ? "Admin Dashboard" : "ABVN Dashboard";
                
                 // --- TAB PERMISSION LOGIC ---
                if (userRole !== "AB ADMIN") {
                    document.querySelectorAll(".tab-btn[data-tab='volunteers'], .tab-btn[data-tab='activation'], .tab-btn[data-tab='reliefs-request'], .tab-btn[data-tab='reports']")
                        .forEach(tab => tab.style.display = "none");
                }

                initializeMap();
                if (!map) {
                    return reject("Map initialization failed");
                }

                // NEW: Create filter UI after map init
                createMapSortFilter();

                addWeatherDataForProvinces();
                trackCalamities();
                loadABVNHQs(); // NEW: Load HQ markers
                loadActivatedABVNs(); // NEW: Load activated markers
                setupAdminNotifications();
                fetchReports();
                fetchApprovedReports();
                
                if (userRole === "ABVN") {
                    map.options.zoomControl = false;
                    map.options.scrollwheel = false;
                    map.options.dragging = false;
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
                    customClass: {
                      title: 'swal-title',
                      htmlContainer: 'swal-html',
                      confirmButton: 'swal-confirm'
                    }
                });
                reject(error);
            });
        });
    });
};

 // === NEW FUNCTION: loadCalamities ===
async function loadCalamities() {
    try {
        const snapshot = await database.ref("calamities").once("value");
        const calamities = snapshot.val() || {};
        
        // Clear old markers
        calamityMarkers.forEach(marker => marker.remove());
        calamityMarkers = [];

        Object.entries(calamities).forEach(([id, calamity]) => {
            if (calamity.coordinates?.lat && calamity.coordinates?.lng) {
                const coords = { 
                    lat: parseFloat(calamity.coordinates.lat), 
                    lng: parseFloat(calamity.coordinates.lng) 
                };

                // Select icon per calamity type
                let iconSvg = "";
                switch ((calamity.type || "").toLowerCase()) {
                    case "flood risk":
                        iconSvg = `<svg width="40" height="50" viewBox="0 0 40 50">
                            <circle cx="20" cy="25" r="12" fill="#007bff" stroke="#ffffff" stroke-width="2"/>
                            <text x="20" y="29" font-size="14" text-anchor="middle" fill="#fff">🌊</text>
                        </svg>`;
                        break;
                    case "volcanic eruption":
                        iconSvg = `<svg width="40" height="50" viewBox="0 0 40 50">
                            <circle cx="20" cy="25" r="12" fill="#e63946" stroke="#ffffff" stroke-width="2"/>
                            <text x="20" y="29" font-size="14" text-anchor="middle" fill="#fff">🌋</text>
                        </svg>`;
                        break;
                    case "house fire":
                        iconSvg = `<svg width="40" height="50" viewBox="0 0 40 50">
                            <circle cx="20" cy="25" r="12" fill="#ff6600" stroke="#ffffff" stroke-width="2"/>
                            <text x="20" y="29" font-size="14" text-anchor="middle" fill="#fff">🔥</text>
                        </svg>`;
                        break;
                    case "typhoon":
                        iconSvg = `<svg width="40" height="50" viewBox="0 0 40 50">
                            <circle cx="20" cy="25" r="12" fill="#28a745" stroke="#ffffff" stroke-width="2"/>
                            <text x="20" y="29" font-size="14" text-anchor="middle" fill="#fff">🌪</text>
                        </svg>`;
                        break;
                    case "earthquake":
                        iconSvg = `<svg width="40" height="50" viewBox="0 0 40 50">
                            <circle cx="20" cy="25" r="12" fill="#6f42c1" stroke="#ffffff" stroke-width="2"/>
                            <text x="20" y="29" font-size="14" text-anchor="middle" fill="#fff">🌎</text>
                        </svg>`;
                        break;
                    case "tsunami":
                        iconSvg = `<svg width="40" height="50" viewBox="0 0 40 50">
                            <circle cx="20" cy="25" r="12" fill="#004085" stroke="#ffffff" stroke-width="2"/>
                            <text x="20" y="29" font-size="14" text-anchor="middle" fill="#fff">🌊</text>
                        </svg>`;
                        break;
                    default:
                        iconSvg = `<svg width="40" height="50" viewBox="0 0 40 50">
                            <circle cx="20" cy="25" r="12" fill="#dc3545" stroke="#ffffff" stroke-width="2"/>
                            <text x="20" y="29" font-size="14" text-anchor="middle" fill="#fff">⚠</text>
                        </svg>`;
                }

                const calamityIcon = L.divIcon({
                    html: iconSvg,
                    className: 'custom-marker',
                    iconSize: [40, 50],
                    iconAnchor: [20, 50]
                });

                const marker = L.marker([coords.lat, coords.lng], { icon: calamityIcon }).addTo(map);
                calamityMarkers.push(marker);

                // Popup Info
                const info = `
                    <div style="font-size: 14px;">
                        <b>${calamity.type || "Calamity"}</b><br>
                        Location: ${calamity.location || "N/A"}<br>
                        Details: ${calamity.details || "N/A"}<br>
                        Time: ${calamity.time ? new Date(calamity.time).toLocaleString() : "N/A"}
                    </div>
                `;
                marker.bindPopup(info);
            }
        });

    } catch (error) {
        console.error("Error loading calamities:", error);
    }
}
// NEW: Function to load and add ABVN HQ markers
async function loadABVNHQs() {
    try {
        const snapshot = await database.ref("volunteerGroups").once("value");
        const groups = snapshot.val() || {};
        hqMarkers.forEach(marker => marker.remove());
        hqMarkers = [];
        Object.entries(groups).forEach(([groupId, group]) => {
            if (group.address?.latitude && group.address?.longitude) {
                const coords = { lat: parseFloat(group.address.latitude), lng: parseFloat(group.address.longitude) };
                const hqIcon = L.divIcon({
                    html: `
                        <svg width="40" height="50" viewBox="0 0 40 50" xmlns="http://www.w3.org/2000/svg">
                            <path d="M20 0 L28 15 L20 10 L12 15 Z" fill="#007bff" stroke="#ffffff" stroke-width="2"/>
                            <circle cx="20" cy="20" r="12" fill="#007bff" stroke="#ffffff" stroke-width="2"/>
                            <text x="20" y="22" font-size="16" text-anchor="middle" fill="#ffffff">HQ</text>
                        </svg>
                    `,
                    className: 'custom-marker',
                    iconSize: [40, 50],
                    iconAnchor: [20, 50]
                });
                const marker = L.marker([coords.lat, coords.lng], { icon: hqIcon }).addTo(map);
                hqMarkers.push(marker);

                // HQ Info Popup
                const hqInfo = `
                    <div style="font-size: 14px;">
                        <b>${group.organization || 'ABVN HQ'}</b><br>
                        Address: ${group.address.formattedAddress || 'N/A'}<br>
                        Contact: ${group.contact || 'N/A'}<br>
                        Members: ${group.members || 0}
                    </div>
                `;
                marker.bindPopup(hqInfo);
                marker.on('click', () => {
                    if (currentInfoWindow) currentInfoWindow.closePopup();
                    marker.openPopup();
                    currentInfoWindow = marker;
                });
            }
        });
        applyMapFilter(); // Apply current filter after loading
    } catch (error) {
        console.error("Error loading ABVN HQs:", error);
    }
}

// NEW: Function to load and add Activated ABVN markers (with relief data)
async function loadActivatedABVNs() {
    try {
        const snapshot = await database.ref("activations").orderByChild("status").equalTo("active").once("value");
        const activations = snapshot.val() || {};
        activatedMarkers.forEach(marker => marker.remove());
        activatedMarkers = [];
        Object.entries(activations).forEach(([actId, act]) => {
            if (act.address && act.address.latitude && act.address.longitude) {
                const coords = { lat: parseFloat(act.address.latitude), lng: parseFloat(act.address.longitude) };
                const actIcon = L.divIcon({
                    html: `
                        <svg width="50" height="60" viewBox="0 0 50 60" xmlns="http://www.w3.org/2000/svg">
                            <path d="M25 0 L35 20 L25 15 L15 20 Z" fill="#28a745" stroke="#ffffff" stroke-width="2"/>
                            <circle cx="25" cy="25" r="15" fill="#28a745" stroke="#ffffff" stroke-width="2"/>
                            <text x="25" y="30" font-size="20" text-anchor="middle" fill="#ffffff">✓</text>
                            <circle cx="25" cy="25" r="15" fill="none" stroke="#28a745" stroke-width="3" opacity="0.8">
                                <animate attributeName="r" values="15;20;15" dur="2s" repeatCount="indefinite"/>
                            </circle>
                        </svg>
                    `,
                    className: 'custom-marker',
                    iconSize: [50, 60],
                    iconAnchor: [25, 60]
                });
                const marker = L.marker([coords.lat, coords.lng], { icon: actIcon }).addTo(map);
                activatedMarkers.push(marker);

                // Relief Operation Data Popup (calamity-like flow)
                const reliefInfo = `
                    <div style="font-family:'Segoe UI',sans-serif;width:260px;border-radius:12px;background:#fff;box-shadow:0 4px 14px rgba(0,0,0,0.25);overflow:hidden;">
                        <div style="background:#28a745;color:#fff;padding:10px 14px;font-size:16px;font-weight:600;">
                            ✅ Activated ABVN: ${act.organization || 'ABVN'}
                        </div>
                        <div style="padding:12px;color:#333;font-size:14px;line-height:1.4;">
                            <b>📍 Area:</b> ${act.areaOfOperation || 'N/A'}<br>
                            <b>Calamity:</b> ${act.calamityType || 'N/A'} - ${act.calamityName || 'N/A'}<br>
                            <b>HQ:</b> ${act.hq || 'N/A'}<br>
                            <b>Activated:</b> ${new Date(act.activationDate).toLocaleString()}
                        </div>
                        <div style="padding:10px;border-top:1px solid #eee;text-align:center;">
                            <button id="deactivateBtn-${actId}" style="padding:8px 12px;border:none;border-radius:6px;background:#dc3545;color:#fff;font-size:14px;font-weight:500;cursor:pointer;transition:all 0.2s ease;">Deactivate</button>
                        </div>
                    </div>
                `;
                marker.bindPopup(reliefInfo);
                marker.on('click', () => {
                    if (currentInfoWindow) currentInfoWindow.closePopup();
                    marker.openPopup();
                    currentInfoWindow = marker;

                    // Attach deactivate button listener
                    setTimeout(() => {
                        const btn = document.getElementById(`deactivateBtn-${actId}`);
                        if (btn) {
                            btn.addEventListener('click', async () => {
                                Swal.fire({
                                    title: 'Are you sure?',
                                    text: `Do you want to deactivate the operation for ${act.organization} for ${act.calamityName} in ${act.areaOfOperation}?`,
                                    icon: 'warning',
                                    showCancelButton: true,
                                    confirmButtonText: 'Yes, deactivate it!',
                                    cancelButtonText: 'No, keep it',
                                    reverseButtons: true,
                                    focusCancel: true,
                                    allowOutsideClick: false,
                                    customClass: {
                                        popup: 'custom-swal-popup-large',
                                        title: 'custom-swal-title',
                                        htmlContainer: 'custom-swal-content',
                                        confirmButton: 'custom-confirm-btn',
                                        cancelButton: 'custom-cancel-btn'
                                    }
                                }).then(async (result) => {
                                    if (result.isConfirmed) {
                                        try {
                                            // Copy to history
                                            const activationRef = database.ref(`activations/${actId}`);
                                            const snapshot = await activationRef.once('value');
                                            const activationData = snapshot.val();

                                            if (!activationData) {
                                                throw new Error('Activation data not found.');
                                            }

                                            const deactivatedActivation = {
                                                ...activationData,
                                                status: "inactive",
                                                deactivationDate: new Date().toISOString()
                                            };

                                            const historyRef = database.ref(`activations/activationHistory`).push();
                                            await Promise.all([
                                                historyRef.set(deactivatedActivation),
                                                activationRef.remove()
                                            ]);

                                            marker.remove();
                                            activatedMarkers = activatedMarkers.filter(m => m !== marker);

                                            Swal.fire({
                                                icon: 'success',
                                                title: 'Deactivated!',
                                                text: `The activation has been moved to activation history.`,
                                                confirmButtonText: 'OK',
                                                customClass: {
                                                    popup: 'swal2-popup-success-clean',
                                                    title: 'swal2-title-success-clean',
                                                    htmlContainer: 'swal2-text-success-clean',
                                                    confirmButton: 'my-success-button'
                                                }
                                            });

                                        } catch (err) {
                                            console.error("Error during deactivation:", err);
                                            Swal.fire({ icon: 'error', title: 'Error', text: `Failed to deactivate: ${err.message}` });
                                        }
                                    }
                                });
                            });
                        }
                    }, 100);
                });
            }
        });
        applyMapFilter(); // Apply current filter after loading
    } catch (error) {
        console.error("Error loading activated ABVNs:", error);
    }
}

// UPDATED: Apply filter to show/hide marker layers (now properly hides weather markers except for ALL)
async function applyMapFilter() {
    try {
        if (!map) return;
        // Remove/hide all markers first
        try { markers.forEach(m => m.remove()); } catch(e) {}
        try { calamityMarkers.forEach(m => m.remove()); } catch(e) {}
        try { hqMarkers.forEach(m => m.remove()); } catch(e) {}
        try { activatedMarkers.forEach(m => m.remove()); } catch(e) {}

        switch (currentFilter) {
            case 'ALL':
                await loadCalamities(); // ✅ reload calamities
                try { markers.forEach(m => m.addTo(map)); } catch(e) {}
                try { calamityMarkers.forEach(m => m.addTo(map)); } catch(e) {}
                try { hqMarkers.forEach(m => m.addTo(map)); } catch(e) {}
                try { activatedMarkers.forEach(m => m.addTo(map)); } catch(e) {}
                break;
            case 'Calamities':
                await loadCalamities(); // ✅ reload calamities
                try { calamityMarkers.forEach(m => m.addTo(map)); } catch(e) {}
                break;
            case 'ABVN HQs':
                try { hqMarkers.forEach(m => m.addTo(map)); } catch(e) {}
                break;
            case 'Activated ABVNs':
                try { activatedMarkers.forEach(m => m.addTo(map)); } catch(e) {}
                break;
            case 'Weather':
                try { markers.forEach(m => m.addTo(map)); } catch(e) {}
                break;
            default:
                await loadCalamities(); // fallback
                try { calamityMarkers.forEach(m => m.addTo(map)); } catch(e) {}
        }
        console.log(`Applied filter: ${currentFilter}`);
    } catch (err) {
        console.error('applyMapFilter error:', err);
    }
}
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
                customClass: {
                  title: 'swal-title',
                  htmlContainer: 'swal-html',
                  confirmButton: 'swal-confirm'
                }
            });
            return;
        }
        const defaultLocation = [14.5995, 120.9842];
        if (map) {
            map.remove();
        }
        map = L.map('map', {
            center: defaultLocation,
            zoom: 6,
            minZoom: 5,
            maxZoom: 18,
            maxBounds: [
                [4.225, 116.93],
                [21.1209, 126.60]
            ],
            maxBoundsViscosity: 1.0
        });

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        }).addTo(map);

        console.log("Map initialized successfully with Leaflet and locked to the Philippines");

        if (!searchInput) {
            console.error("Search input not found");
            Swal.fire({
                icon: "error",
                title: "Map Error",
                text: "Search input not found on the page.",
                customClass: {
                  title: 'swal-title',
                  htmlContainer: 'swal-html',
                  confirmButton: 'swal-confirm'
                }
            });
            return;
        }

        // Search on enter or button click
        searchInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                performSearch(searchInput.value);
            }
        });

        const searchIcon = document.querySelector('.search-icon');
        if (searchIcon) {
            searchIcon.addEventListener('click', () => {
                performSearch(searchInput.value);
            });
        }

        // Map click listener
        map.on('click', function(e) {
            showWeatherInfoWindow(e.latlng.lat, e.latlng.lng);
        });

        singleInfoWindow = L.popup();
        updateRainWarningOverlay();
    } catch (error) {
        console.error("Failed to initialize Leaflet Map:", error);
        Swal.fire({
            icon: "error",
            title: "Map Error",
            text: "Failed to load the map. Check your internet connection.",
            customClass: {
              title: 'swal-title',
              htmlContainer: 'swal-html',
              confirmButton: 'swal-confirm'
            }
        });
    }
}

async function performSearch(query) {
    if (!query) return;
    try {
        const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&countrycodes=ph&limit=1`);
        const data = await response.json();
        if (data.length > 0) {
            const result = data[0];
            map.panTo([parseFloat(result.lat), parseFloat(result.lon)]);
            map.setZoom(12);
            console.log("Map centered on:", result.display_name);
        } else {
            Swal.fire({
                icon: "error",
                title: "Location Not Found",
                text: "No results found for the search query.",
                customClass: {
                  title: 'swal-title',
                  htmlContainer: 'swal-html',
                  confirmButton: 'swal-confirm'
                }
            });
        }
    } catch (error) {
        console.error("Search error:", error);
        Swal.fire({
            icon: "error",
            title: "Search Error",
            text: "Failed to perform search.",
            customClass: {
              title: 'swal-title',
              htmlContainer: 'swal-html',
              confirmButton: 'swal-confirm'
            }
        });
    }
}
// Add weather data for all provinces with dynamic icons (no separate rainfall alerts here; merged into trackFloods)
function addWeatherDataForProvinces() {
    if (!map) {
        console.error("Map not initialized, cannot add weather data for provinces.");
        return;
    }
    markers.forEach(marker => marker.remove());
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

            // Icon selection (simplified: no rain icon unless significant)
            let icon = "☁️";
            if (condition.includes("clear")) {
                icon = "☀️";
            } else if (condition.includes("clouds") && cloudCover < 50) {
                icon = "⛅";
            } else if (rainfall >= 50) { // Only show rain icon for significant rainfall
                icon = "🌧️";
            }

            const markerSvg = `
                <svg width="30" height="30" viewBox="0 0 30 30" xmlns="http://www.w3.org/2000/svg"> <!-- Smaller for less clutter -->
                    <text x="15" y="18" font-size="16" text-anchor="middle" fill="#FFFFFF">${icon}</text>
                </svg>
            `;
            const markerIcon = L.divIcon({
                html: markerSvg,
                className: 'custom-marker',
                iconSize: [30, 30],
                iconAnchor: [15, 15]
            });
            const marker = L.marker([province.lat, province.lng], {
                icon: markerIcon,
                title: province.name
            }).addTo(map);
            markers.push(marker);

            // Weather info display
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
            const popup = L.popup({
                content: weatherInfo
            });
            marker.on("click", () => {
                if (currentInfoWindow) singleInfoWindow.closePopup();
                singleInfoWindow.setContent(weatherInfo);
                singleInfoWindow.setLatLng([province.lat, province.lng]);
                singleInfoWindow.openOn(map);
                currentInfoWindow = marker;
                isInfoWindowClicked = true;
                console.log(`Weather Popup opened for ${province.name}`);
            });
            singleInfoWindow.on("remove", () => {
                isInfoWindowClicked = false;
                currentInfoWindow = null;
                console.log(`Weather Popup closed for ${province.name}`);
            });
        } catch (error) {
            console.error(`Error fetching weather data for ${province.name}:`, error);
            const defaultMarkerSvg = `
                <svg width="30" height="30" viewBox="0 0 30 30" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="15" cy="15" r="12" fill="#ADD8E6" opacity="0.7"/>
                    <text x="15" y="18" font-size="16" text-anchor="middle" fill="#FFFFFF">☁️</text>
                </svg>
            `;
            const defaultIcon = L.divIcon({
                html: defaultMarkerSvg,
                className: 'custom-marker',
                iconSize: [30, 30],
                iconAnchor: [15, 15]
            });
            const marker = L.marker([province.lat, province.lng], {
                icon: defaultIcon,
                title: `${province.name} (Data Unavailable)`
            }).addTo(map);
            markers.push(marker);
        }
    };
    provinces.forEach(province => addWeatherMarker(province));
    applyMapFilter(); // Apply filter after adding weather markers
}
// Track all calamities (removed trackFloods/trackLandslides calls; merged rainfall logic into trackFloods for conciseness)
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
    calamityMarkers.forEach(marker => marker.remove());
    calamityMarkers = [];
    if (calamityListener) {
        calamityListener.off();
        calamityListener = null;
    }
    trackEarthquakes();
    trackFloods(); // Now handles all rainfall alerts (light/moderate/heavy) with higher threshold to minimize
    trackFire();
    trackTyphoons();
    trackVolcanicEruptions();
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
        calamityMarkers.forEach(marker => marker.remove());
        calamityMarkers = [];
        for (const calamity of Object.values(calamities)) {
            if (!calamity.coordinates) continue;
            await addCalamityMarker(calamity.type, calamity.location, calamity.coordinates, calamity.details, calamity.eventId);
        }
        applyMapFilter(); // NEW: Apply filter after loading
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
    applyMapFilter(); // NEW: Re-apply filter after adding new markers
}
// Track floods (merged rainfall alerts here; higher threshold to minimize alerts)

// Track floods (merged rainfall alerts here; improved batching + dedupe)
// Behavior:
//  - Collects flood/rain alerts from all provinces.
//  - Deduplicates per-province so each province alerts at most once per hour.
//  - Queues alerts and flushes them once per hour, sending at most 6 notifications per flush.
//  - If queue reaches 6 alerts before the hour, it flushes immediately.
//  - Still saves each Flood Risk to /calamities node when detected.
async function trackFloods() {
    const YELLOW_THRESHOLD = 0.1;   // mm/3h, very low for testing
    const ORANGE_THRESHOLD = 5;     // mm/3h
    const RED_THRESHOLD = 15;       // mm/3h
    const MAX_ALERTS_PER_FLUSH = 10;
    const FLUSH_INTERVAL_MS = 60 * 60 * 1000; // 1 hour

    const LAST_ALERT_KEY = 'last_rain_alert_by_province';
    let lastAlertByProvince = {};
    try {
        const raw = sessionStorage.getItem(LAST_ALERT_KEY);
        lastAlertByProvince = raw ? JSON.parse(raw) : {};
    } catch (e) {
        lastAlertByProvince = {};
    }
    function setLastAlert(provinceName, ts) {
        lastAlertByProvince[provinceName] = ts;
        try { sessionStorage.setItem(LAST_ALERT_KEY, JSON.stringify(lastAlertByProvince)); } catch(e) {}
    }

    const rainAlertQueue = [];
    async function flushRainAlerts() {
        if (rainAlertQueue.length === 0) return;
        const toSend = rainAlertQueue.splice(0, MAX_ALERTS_PER_FLUSH);
        for (const item of toSend) {
            try {
                const warningLevel = item.maxRainfall >= RED_THRESHOLD ? "Red Warning: Heavy Rain" :
                                     item.maxRainfall >= ORANGE_THRESHOLD ? "Orange Warning: Moderate Rain" :
                                     "Yellow Warning: Light Rain";
                await generateLenlenAlert("Flood Risk", item.province, item.details, item.eventId, warningLevel, "OpenWeatherMap");
                setLastAlert(item.province, Date.now());
            } catch (err) {
                console.error("Error flushing rain alert for", item.province, err);
            }
        }
    }
    if (!sessionStorage.getItem('rain_flush_timer_set')) {
        setInterval(() => flushRainAlerts().catch(err => console.error("Error flushing rain alerts on interval:", err)), FLUSH_INTERVAL_MS);
        try { sessionStorage.setItem('rain_flush_timer_set', 'true'); } catch(e) {}
    }

    async function addFloodMarker(province) {
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

        // compute total and max rainfall for next 24h (8 slots)
        let totalRain = 0;
        let maxRain = 0;
        const slots = Math.min(8, forecastData.list.length);
        for (let i = 0; i < slots; i++) {
            const r = forecastData.list[i].rain ? (forecastData.list[i].rain["3h"] || 0) : 0;
            totalRain += r;
            if (r > maxRain) maxRain = r;
        }

        // skip if all zero
        if (maxRain < YELLOW_THRESHOLD && totalRain === 0) {
            console.log(`No rain for ${province.name}`);
            return;
        }

        const time = new Date(forecastData.list[0].dt * 1000).toISOString();
        const details = `Expected Rainfall (24h): ${totalRain.toFixed(1)} mm, Max 3h: ${maxRain.toFixed(1)} mm, Time: ${time}`;
        const roundedTimestamp = Math.floor(new Date(time).getTime() / 3600000) * 3600000;
        const eventId = `flood_${province.name}_${roundedTimestamp}`;

        const exists = await calamityExists(eventId, "Flood Risk", province.name, time, '', maxRain);
        if (exists) {
            console.log(`Skipping duplicate flood risk - Event ID: ${eventId}`);
            await addCalamityMarker("Flood Risk", province.name, { lat: province.lat, lng: province.lng }, details, eventId);
            return;
        }

        const identifier = generateCalamityIdentifier("Flood Risk", province.name, time, '', maxRain);
        processedCalamities.add(eventId);
        processedCalamities.add(identifier);
        syncProcessedCalamities();

        try {
            const calamityRef = database.ref("calamities").push();
            await calamityRef.set({
                type: "Flood Risk",
                location: province.name,
                rainfall: totalRain,
                maxRainfall: maxRain,
                time: time,
                details: details,
                coordinates: { lat: province.lat, lng: province.lng },
                eventId: eventId,
                identifier: identifier,
                timestamp: Date.now(),
            });
            console.log(`Saved new flood risk to calamities - Event ID: ${eventId}, Location: ${province.name}`);
            await addCalamityMarker("Flood Risk", province.name, { lat: province.lat, lng: province.lng }, details, eventId);
        } catch (err) {
            console.error("Failed to save calamity for", province.name, err);
        }

        // queue notification if more than 1h since last
        const lastTs = lastAlertByProvince[province.name] || 0;
        if (Date.now() - lastTs > 60 * 60 * 1000) {
            rainAlertQueue.push({ province: province.name, maxRainfall: maxRain, details, eventId });
        }
    }

    for (const province of provinces) {
        addFloodMarker(province);
    }

    await flushRainAlerts();
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
    applyMapFilter();
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
    applyMapFilter();
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
    applyMapFilter();
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
    try {
        const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`);
        const data = await response.json();
        return data.display_name || `(${lat.toFixed(2)}, ${lng.toFixed(2)})`;
    } catch (error) {
        console.error("Reverse geocode error:", error);
        return `(${lat.toFixed(2)}, ${lng.toFixed(2)})`;
    }
}
// Calamity marker with fun design and interactivity (simplified, no circulating animation)
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
    const currentTime = Date.now();
    const timeMatch = details.match(/Time: (.+)/);
    const eventTime = timeMatch ? new Date(timeMatch[1]).getTime() : currentTime;
    const twelveHoursInMs = 12 * 60 * 60 * 1000;

    // Remove all existing markers temporarily
    calamityMarkers.forEach(({ marker }) => marker.remove());
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
        const markerSvg = `
            <svg width="40" height="40" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
                <circle cx="20" cy="20" r="18" fill="rgba(255, 255, 255, 0.7)" stroke="#000" stroke-width="2"/>
                <text x="20" y="22" font-size="20" text-anchor="middle" fill="#000000">${icons[type] || "⚠️"}</text>
            </svg>
        `;
        const markerIcon = L.divIcon({
            html: markerSvg,
            className: 'custom-marker',
            iconSize: [40, 40],
            iconAnchor: [20, 40]
        });
        const marker = L.marker([offsetLat, coordinates.lng], {
            icon: markerIcon,
            title: `${type} in ${location}`
        }).addTo(map);
        calamityMarkers.push({ marker, eventTime });
        const realLocation = await getLocationName(coordinates.lat, coordinates.lng);
        const infoWindowContent = `
            <div>
                <b>${type} in ${realLocation}</b><br>
                ${details}
            </div>
        `;
        const popup = L.popup({
            content: infoWindowContent
        });
        markerDiv.addEventListener("mouseover", () => {
            markerDiv.style.transform = "scale(1.3)";
        });
        markerDiv.addEventListener("mouseout", () => {
            markerDiv.style.transform = "scale(1)";
        });
        marker.on("click", () => {
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
            if (currentInfoWindow) singleInfoWindow.closePopup();
            singleInfoWindow.setContent(infoWindowContent);
            singleInfoWindow.setLatLng([offsetLat, coordinates.lng]);
            singleInfoWindow.openOn(map);
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
        singleInfoWindow.on("remove", () => {
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
    applyMapFilter(); // NEW: Re-apply filter after adding
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
        if (currentInfoWindow) singleInfoWindow.closePopup();
        singleInfoWindow.setContent(weatherInfo);
        singleInfoWindow.setLatLng([lat, lng]);
        singleInfoWindow.openOn(map);
        currentInfoWindow = { getPosition: () => ({ lat, lng }) };
        isInfoWindowClicked = true;
        singleInfoWindow.on("remove", () => {
            isInfoWindowClicked = false;
            currentInfoWindow = null;
        });
    } catch (error) {
        console.error("Error fetching weather data:", error);
        Swal.fire({
            icon: "error",
            title: "Weather Error",
            text: "Failed to load weather data. Please try again later.",
            customClass: {
              title: 'swal-title',
              htmlContainer: 'swal-html',
              confirmButton: 'swal-confirm'
            }
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
 Swal.fire({ icon: "error", title: "Error", text: "Failed to mark all as read.", customClass: { title: 'swal-title', htmlContainer: 'swal-html', confirmButton: 'swal-confirm' } });
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
            customClass: {
              title: 'swal-title',
              htmlContainer: 'swal-html',
              confirmButton: 'swal-confirm'
            }
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
                    customClass: {
                      title: 'swal-title',
                      htmlContainer: 'swal-html',
                      confirmButton: 'swal-confirm'
                    }
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
                            customClass: {
                              title: 'swal-title',
                              htmlContainer: 'swal-html',
                              confirmButton: 'swal-confirm'
                            }
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
  <div class="modal-content" style="background:#fff;padding:20px;width:480px;border-radius:10px;max-height:90%;overflow-y:auto;">
    <h2 style="margin-bottom:16px;color:#e63946;">Quick Activation</h2>

    <label style="font-weight:600;">Area of Operations<span style="color:red">*</span></label>
    <div style="display:flex;gap:6px;margin:6px 0;">
      <input type="text" id="qaArea" style="flex:1;padding:8px;border:1px solid #ccc;border-radius:6px;">
      <button id="qaPinBtn" style="padding:8px 12px;background:#2a9d8f;color:#fff;border:none;border-radius:6px;cursor:pointer;">📍 Pin</button>
    </div>
    <input type="hidden" id="qaLat">
    <input type="hidden" id="qaLng">

    <label style="font-weight:600;">Calamity Type<span style="color:red">*</span></label>
    <select id="qaCalamityType" style="width:100%;padding:8px;margin:6px 0;border:1px solid #ccc;border-radius:6px;">
      <option value="">-- Select Calamity Type --</option>
      <option value="Typhoon">Typhoon</option>
      <option value="Earthquake">Earthquake</option>
      <option value="Flood">Flood</option>
      <option value="Volcanic Eruption">Volcanic Eruption</option>
      <option value="Landslide">Landslide</option>
      <option value="Tsunami">Tsunami</option>
    </select>

    <label style="font-weight:600;">Calamity Name</label>
    <input type="text" id="qaCalamityName" style="width:100%;padding:8px;margin:6px 0;border:1px solid #ccc;border-radius:6px;">

    <div id="qaError" style="color:#e63946;font-size:13px;margin:6px 0;display:none;">
      Please fill in all required fields.
    </div>

    <div style="text-align:right;margin-top:14px;">
      <button id="qaCancel" style="padding:8px 14px;margin-right:6px;border:1px solid #ccc;border-radius:6px;cursor:pointer;">Cancel</button>
      <button id="qaSave" style="padding:8px 14px;background:#2a9d8f;color:#fff;border:none;border-radius:6px;cursor:pointer;">Activate</button>
    </div>
  </div>
</div>

<!-- Pin Location Modal -->
<div id="qaPinModal" style="
  display:none;position:fixed;top:0;left:0;width:100%;height:100%;
  background:rgba(0,0,0,0.6);z-index:10000;align-items:center;justify-content:center;">
  <div style="background:#fff;padding:16px;width:600px;height:520px;border-radius:10px;display:flex;flex-direction:column;">
    <h3 style="margin-bottom:10px;color:#e63946;">Pin Location</h3>
    <div style="position:relative;">
      <input type="text" id="qaSearchLocation" placeholder="Search for a location..." style="padding:8px;margin-bottom:6px;border:1px solid #ccc;border-radius:6px;width:100%;box-sizing:border-box;">
      <div id="qaSuggestions" style="position:absolute;top:100%;left:0;right:0;background:#fff;border:1px solid #ccc;border-top:none;border-radius:0 0 6px 6px;max-height:200px;overflow-y:auto;display:none;z-index:10001;">
        <!-- Suggestions will be populated here -->
      </div>
    </div>
    <div id="qaMap" style="flex:1;border:1px solid #ccc;border-radius:6px;"></div>
    <div style="text-align:right;margin-top:10px;">
      <button id="qaPinCancel" style="padding:8px 14px;margin-right:6px;border:1px solid #ccc;border-radius:6px;cursor:pointer;">Cancel</button>
      <button id="qaPinSave" style="padding:8px 14px;background:#2a9d8f;color:#fff;border:none;border-radius:6px;cursor:pointer;">Save Location</button>
    </div>
  </div>
</div>
`;
if (!document.getElementById("quickActivationModal")) {
  document.body.insertAdjacentHTML("beforeend", quickActivationHTML);
}

let qaMap, qaMarker;

function openQuickActivation(group, calamity, abvnMarker) {
  const areaInput = document.getElementById("qaArea");
  const typeSelect = document.getElementById("qaCalamityType");
  const nameInput = document.getElementById("qaCalamityName");
  const errorBox = document.getElementById("qaError");
  const latInput = document.getElementById("qaLat");
  const lngInput = document.getElementById("qaLng");

  areaInput.value = group.address?.formattedAddress || "";
  latInput.value = group.coords?.lat || "";
  lngInput.value = group.coords?.lng || "";
  typeSelect.value = calamity.type && [
    "Typhoon","Earthquake","Flood","Volcanic Eruption","Landslide","Tsunami"
  ].includes(calamity.type) ? calamity.type : "";
  nameInput.value = calamity.magnitude || "";

  document.getElementById("quickActivationModal").style.display = "flex";
  errorBox.style.display = "none";

  document.getElementById("qaCancel").onclick = () => {
    document.getElementById("quickActivationModal").style.display = "none";
  };

  // Pin Location Button
  document.getElementById("qaPinBtn").onclick = () => {
    document.getElementById("qaPinModal").style.display = "flex";
    setTimeout(() => {
      initQaMap(parseFloat(latInput.value) || 14.5995, parseFloat(lngInput.value) || 120.9842, areaInput.value);
    }, 300);
  };

  document.getElementById("qaPinCancel").onclick = () => {
    document.getElementById("qaPinModal").style.display = "none";
    if (qaMap) {
      qaMap.remove();
      qaMap = null;
    }
    qaMarker = null;
  };

  document.getElementById("qaPinSave").onclick = () => {
    if (qaMarker) {
      const pos = qaMarker.getLatLng();
      latInput.value = pos.lat;
      lngInput.value = pos.lng;
      areaInput.value = areaInput.value || `Lat: ${pos.lat.toFixed(4)}, Lng: ${pos.lng.toFixed(4)}`;
    }
    document.getElementById("qaPinModal").style.display = "none";
    if (qaMap) {
      qaMap.remove();
      qaMap = null;
    }
    qaMarker = null;
  };

  // Save Activation
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
      address: {
        formattedAddress: area,
        latitude: parseFloat(latInput.value) || group.coords?.lat,
        longitude: parseFloat(lngInput.value) || group.coords?.lng
      },
      organization: group.organization,
      status: "active"
    });

    document.getElementById("quickActivationModal").style.display = "none";
    Swal.fire({ icon: "success", title: "Activated", text: `${group.organization} is now activated.`, customClass: { title: 'swal-title', htmlContainer: 'swal-html', confirmButton: 'swal-confirm' } });

    // Reload activated markers
    loadActivatedABVNs();
  };
}

function initQaMap(latitude = 14.5995, longitude = 120.9842, formattedAddress = null) {
  const defaultLocation = [latitude, longitude];
  const philippinesBounds = [
    [4.643, 116.929], // Southwest corner
    [21.121, 126.604] // Northeast corner
  ];

  if (qaMap) {
    qaMap.remove();
  }
  qaMap = L.map('qaMap', {
    center: defaultLocation,
    zoom: 12,
    minZoom: 6,
    maxZoom: 18,
    maxBounds: philippinesBounds,
    maxBoundsViscosity: 1.0
  });

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
  }).addTo(qaMap);

  qaMarker = L.marker(defaultLocation, { draggable: true }).addTo(qaMap);

  const searchInput = document.getElementById("qaSearchLocation");
  const suggestionsDiv = document.getElementById("qaSuggestions");
  let debounceTimer;

  // Autocomplete suggestions
  searchInput.addEventListener('input', function() {
    const query = searchInput.value.trim();
    clearTimeout(debounceTimer);
    suggestionsDiv.innerHTML = '';
    suggestionsDiv.style.display = 'none';

    if (query.length < 2) return;

    debounceTimer = setTimeout(() => {
      fetch(`https://nominatim.openstreetmap.org/search?format=json&countrycodes=PH&q=${encodeURIComponent(query)}&limit=5&addressdetails=1`)
        .then(response => response.json())
        .then(results => {
          if (results.length > 0) {
            suggestionsDiv.innerHTML = results.map(result => `
              <div style="padding:8px;cursor:pointer;border-bottom:1px solid #eee;" onclick="selectQaSuggestion('${result.display_name}', ${result.lat}, ${result.lon}, [${result.boundingbox.join(',')}])">
                ${result.display_name}
              </div>
            `).join('');
            suggestionsDiv.style.display = 'block';
          }
        })
        .catch(error => {
          console.error('Autocomplete error:', error);
        });
    }, 300);
  });

  // Hide suggestions on outside click
  document.addEventListener('click', function(e) {
    if (!searchInput.contains(e.target) && !suggestionsDiv.contains(e.target)) {
      suggestionsDiv.style.display = 'none';
    }
  });

  // Enter key for search (fallback)
  searchInput.addEventListener('keydown', function(e) {
    if (e.key === 'Enter') {
      const query = searchInput.value.trim();
      if (!query) return;
      performQaSearch(query);
    }
  });

  // Drag end handler
  function onQaMarkerDragEnd(e) {
    const latlng = e.target.getLatLng();
    if (latlng.lat < 4.643 || latlng.lat > 21.121 || latlng.lng < 116.929 || latlng.lng > 126.604) {
      Swal.fire({
        icon: 'error',
        title: 'Invalid Location',
        text: 'Selected location must be within the Philippines.'
      });
      e.target.setLatLng(defaultLocation);
      return;
    }
    fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latlng.lat}&lon=${latlng.lng}&addressdetails=1&countrycodes=PH`)
      .then(response => response.json())
      .then(data => {
        if (data && data.display_name && data.address.country_code === 'ph') {
          const areaInput = document.getElementById("qaArea");
          areaInput.value = data.display_name;
          document.getElementById("qaLat").value = latlng.lat;
          document.getElementById("qaLng").value = latlng.lng;
        } else {
          Swal.fire({
            icon: 'error',
            title: 'Invalid Location',
            text: 'Selected location must be within the Philippines.'
          });
          e.target.setLatLng(defaultLocation);
        }
      })
      .catch(() => {
        Swal.fire({
          icon: 'error',
          title: 'Geocoding Error',
          text: 'Unable to retrieve address. Please try again.'
        });
        e.target.setLatLng(defaultLocation);
      });
  }
  qaMarker.on("dragend", onQaMarkerDragEnd);

  // Map click handler
  qaMap.on('click', function(e) {
    const latlng = e.latlng;
    if (latlng.lat < 4.643 || latlng.lat > 21.121 || latlng.lng < 116.929 || latlng.lng > 126.604) {
      Swal.fire({
        icon: 'error',
        title: 'Invalid Location',
        text: 'Selected location must be within the Philippines.'
      });
      return;
    }
    qaMarker.setLatLng(latlng);
    fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latlng.lat}&lon=${latlng.lng}&addressdetails=1&countrycodes=PH`)
      .then(response => response.json())
      .then(data => {
        if (data && data.display_name && data.address.country_code === 'ph') {
          const areaInput = document.getElementById("qaArea");
          areaInput.value = data.display_name;
          document.getElementById("qaLat").value = latlng.lat;
          document.getElementById("qaLng").value = latlng.lng;
        } else {
          Swal.fire({
            icon: 'error',
            title: 'Invalid Location',
            text: 'Selected location must be within the Philippines.'
          });
          qaMarker.setLatLng(defaultLocation);
        }
      })
      .catch(() => {
        Swal.fire({
          icon: 'error',
          title: 'Geocoding Error',
          text: 'Unable to retrieve address. Please try again.'
        });
        qaMarker.setLatLng(defaultLocation);
      });
    qaMap.setView(latlng, 16);
  });

  // My Location button
  const returnButton = L.control({ position: 'topright' });
  returnButton.onAdd = function() {
    const div = L.DomUtil.create('div', 'leaflet-bar leaflet-control leaflet-bar-part');
    div.innerHTML = '<button style="background-color: #007bff; color: white; padding: 5px 10px; border: none; border-radius: 3px; cursor: pointer; font-size: 12px; width: 100%;">My Location</button>';
    div.firstChild.onclick = returnToQaUserLocation;
    return div;
  };
  returnButton.addTo(qaMap);

  // Set initial position if provided
  if (formattedAddress && latitude && longitude) {
    qaMap.setView(defaultLocation, 16);
    qaMarker.setLatLng(defaultLocation);
    const areaInput = document.getElementById("qaArea");
    areaInput.value = formattedAddress;
    document.getElementById("qaLat").value = latitude;
    document.getElementById("qaLng").value = longitude;
    L.popup()
      .setLatLng(defaultLocation)
      .setContent(`Selected Location<br>${formattedAddress}`)
      .openOn(qaMap);
  } else if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const userLocation = [position.coords.latitude, position.coords.longitude];
        if (userLocation[0] < 4.643 || userLocation[0] > 21.121 || userLocation[1] < 116.929 || userLocation[1] > 126.604) {
          Swal.fire({
            icon: 'error',
            title: 'Location Error',
            text: 'Your location is outside the Philippines. Using default.'
          });
          return;
        }
        qaMap.setView(userLocation, 16);
        qaMarker.setLatLng(userLocation);
        fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${userLocation[0]}&lon=${userLocation[1]}&addressdetails=1&countrycodes=PH`)
          .then(response => response.json())
          .then(data => {
            if (data && data.display_name) {
              const areaInput = document.getElementById("qaArea");
              areaInput.value = data.display_name;
              document.getElementById("qaLat").value = userLocation[0];
              document.getElementById("qaLng").value = userLocation[1];
              L.popup()
                .setLatLng(userLocation)
                .setContent(`You are here<br>${data.display_name}`)
                .openOn(qaMap);
            }
          })
          .catch(() => {
            Swal.fire({
              icon: 'error',
              title: 'Geocoding Error',
              text: 'Unable to retrieve address. Please try again.'
            });
          });
      },
      (error) => {
        console.warn('Geolocation error:', error);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  }
}

// Global function for suggestion selection (since onclick in innerHTML)
window.selectQaSuggestion = function(displayName, lat, lon, bbox) {
  const latlng = { lat: parseFloat(lat), lng: parseFloat(lon) };
  const bounds = [[parseFloat(bbox[0]), parseFloat(bbox[2])], [parseFloat(bbox[1]), parseFloat(bbox[3])]];
  qaMap.fitBounds(bounds);
  if (qaMarker) qaMap.removeLayer(qaMarker);
  qaMarker = L.marker(latlng, { draggable: true }).addTo(qaMap);
  const areaInput = document.getElementById("qaArea");
  areaInput.value = displayName;
  document.getElementById("qaLat").value = latlng.lat;
  document.getElementById("qaLng").value = latlng.lng;
  qaMarker.on("dragend", function(e) {
    const pos = e.target.getLatLng();
    document.getElementById("qaLat").value = pos.lat;
    document.getElementById("qaLng").value = pos.lng;
  });
  document.getElementById("qaSuggestions").style.display = 'none';
  document.getElementById("qaSearchLocation").value = displayName;
};

function performQaSearch(query) {
  fetch(`https://nominatim.openstreetmap.org/search?format=json&countrycodes=PH&q=${encodeURIComponent(query)}&limit=1`)
    .then(response => response.json())
    .then(results => {
      if (results.length > 0) {
        const result = results[0];
        const latlng = { lat: parseFloat(result.lat), lng: parseFloat(result.lon) };
        const bbox = result.boundingbox;
        if (latlng.lat < 4.643 || latlng.lat > 21.121 || latlng.lng < 116.929 || latlng.lng > 126.604) {
          Swal.fire({
            icon: 'error',
            title: 'Invalid Location',
            text: 'Selected location must be within the Philippines.'
          });
          return;
        }
        qaMap.fitBounds([[parseFloat(bbox[0]), parseFloat(bbox[2])], [parseFloat(bbox[1]), parseFloat(bbox[3])]]);
        if (qaMarker) qaMap.removeLayer(qaMarker);
        qaMarker = L.marker(latlng, { draggable: true }).addTo(qaMap);
        const areaInput = document.getElementById("qaArea");
        areaInput.value = result.display_name;
        document.getElementById("qaLat").value = latlng.lat;
        document.getElementById("qaLng").value = latlng.lng;
        qaMarker.on("dragend", function(e) {
          const pos = e.target.getLatLng();
          document.getElementById("qaLat").value = pos.lat;
          document.getElementById("qaLng").value = pos.lng;
        });
      } else {
        Swal.fire({
          icon: 'info',
          title: 'No Results',
          text: 'No location found for your search.'
        });
      }
    })
    .catch(error => {
      console.error('Search error:', error);
      Swal.fire({
        icon: 'error',
        title: 'Search Error',
        text: 'Unable to perform search. Please try again.'
      });
    });
}

function returnToQaUserLocation() {
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const userLocation = [position.coords.latitude, position.coords.longitude];
        if (userLocation[0] < 4.643 || userLocation[0] > 21.121 || userLocation[1] < 116.929 || userLocation[1] > 126.604) {
          Swal.fire({
            icon: 'error',
            title: 'Location Error',
            text: 'Your location is outside the Philippines. Using default.'
          });
          return;
        }
        qaMap.setView(userLocation, 16);
        if (qaMarker) qaMap.removeLayer(qaMarker);
        qaMarker = L.marker(userLocation, { draggable: true }).addTo(qaMap);
        qaMarker.on("dragend", function(e) {
          const pos = e.target.getLatLng();
          document.getElementById("qaLat").value = pos.lat;
          document.getElementById("qaLng").value = pos.lng;
        });
        fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${userLocation[0]}&lon=${userLocation[1]}&addressdetails=1&countrycodes=PH`)
          .then(response => response.json())
          .then(data => {
            if (data && data.display_name) {
              const areaInput = document.getElementById("qaArea");
              areaInput.value = data.display_name;
              document.getElementById("qaLat").value = userLocation[0];
              document.getElementById("qaLng").value = userLocation[1];
              L.popup()
                .setLatLng(userLocation)
                .setContent(`You are here<br>${data.display_name}`)
                .openOn(qaMap);
            }
          })
          .catch(() => {
            Swal.fire({
              icon: 'error',
              title: 'Geocoding Error',
              text: 'Unable to retrieve address. Please try again.'
            });
          });
      },
      (error) => {
        Swal.fire({
          icon: 'error',
          title: 'Location Error',
          text: getGeolocationErrorMessage(error)
        });
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  }
}

function getGeolocationErrorMessage(error) {
  switch (error.code) {
    case error.PERMISSION_DENIED:
      return "Location access denied. Please allow location access in your browser settings.";
    case error.POSITION_UNAVAILABLE:
      return "Location information is unavailable. Ensure your device has a working GPS or network connection.";
    case error.TIMEOUT:
      return "Location request timed out. Please try again.";
    default:
      return "Unable to retrieve your location.";
  }
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
      const popupContent = `
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
                  Show Nearest ABVNs
                </button>
              </div>
            </div>
          `;
      const attachButtonListener = (retryCount = 0) => {
        if (retryCount > 5) {
          console.warn(`Failed to attach listener after 5 retries for calamity ${calKey}`);
          return;
        }
        const btn = document.getElementById(`showAbvnBtn-${calKey}`);
        if (btn) {
          console.log(`Attaching listener to Show Nearest ABVNs button for calamity ${calKey}`);
          btn.addEventListener("click", async () => {
            console.log(`Show Nearest ABVNs button clicked for calamity ${calKey}`);
            try {
              const calSnap = await database.ref(`calamities/${calKey}`).once("value");
              if (!calSnap.exists()) {
                console.log(`No calamity data found for key: ${calKey}`);
                return;
              }
              const calamity = calSnap.val();
              const coordinates = calamity.coordinates || { lat: 14.5995, lng: 120.9842 };
              abvnMarkers.forEach(m => m.remove());
              abvnMarkers = [];
              const snapshot = await database.ref("volunteerGroups").once("value");
              const volunteerGroups = snapshot.val() || {};
              let abvnData = [];
              console.log(`Fetched ${Object.keys(volunteerGroups).length} volunteer groups`);
              const abvnSvg = `
                    <svg width="40" height="50" viewBox="0 0 40 50" xmlns="http://www.w3.org/2000/svg">
                      <g>
                        <path d="M20 0 L28 15 L20 10 L12 15 Z" fill="#2a9d8f" stroke="#ffffff" stroke-width="2"/>
                        <circle cx="20" cy="20" r="12" fill="#2a9d8f" stroke="#ffffff" stroke-width="2"/>
                        <text x="20" y="22" font-size="16" text-anchor="middle" fill="#ffffff" font-weight="bold">👥</text>
                      </g>
                    </svg>
                  `;
              const abvnIcon = L.divIcon({
                  html: abvnSvg,
                  className: 'custom-marker',
                  iconSize: [40, 50],
                  iconAnchor: [20, 50]
              });
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
                  abvnData.push({ group, distance: parseFloat(distance), coords: abvnCoords, groupId });
                  const abvnMarker = L.marker([abvnCoords.lat, abvnCoords.lng], {
                    icon: abvnIcon,
                    title: `${group.organization} (${distance} km)`
                  }).addTo(map);
                  abvnMarkers.push(abvnMarker);
                  console.log(`Added marker for ${group.organization} at ${abvnCoords.lat}, ${abvnCoords.lng} (distance: ${distance} km)`);
                  abvnMarker.on("click", async () => {
                    const actSnap = await database.ref("activations")
                      .orderByChild("groupId")
                      .equalTo(groupId)
                      .once("value");
                    const acts = actSnap.val() || {};
                    const activeAct = Object.values(acts).find(a => a.status === "active");
                    if (activeAct) {
                      Swal.fire({
                        icon: "info",
                        title: `${group.organization} Active`,
                        html: `
                          <div style="font-size:14px;color:#333;line-height:1.4;text-align:left;">
                            Area: ${activeAct.areaOfOperation}<br>
                            Activated: ${new Date(activeAct.activationDate).toLocaleDateString()}
                          </div>
                        `,
                        showCancelButton: true,
                        confirmButtonText: "Add",
                        cancelButtonText: "Close",
                        confirmButtonColor: "#2a9d8f",
                        cancelButtonColor: "#e63946",
                        customClass: {
                          title: 'swal-title',
                          htmlContainer: 'swal-html',
                          confirmButton: 'swal-confirm',
                          cancelButton: 'swal-cancel'
                        }
                      }).then((result) => {
                        if (result.isConfirmed) {
                          openQuickActivation(
                            { ...group, id: groupId, coords: abvnCoords },
                            calamity,
                            abvnMarker
                          );
                        }
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
              if (abvnData.length === 0) {
                console.log('No ABVN groups found');
                map.panTo([coordinates.lat, coordinates.lng]);
                map.setZoom(8);
                return;
              }
              abvnData.sort((a, b) => a.distance - b.distance);
              console.log('Sorted ABVN data:', abvnData.map(d => ({ org: d.group.organization, dist: d.distance })));
              const nearest = abvnData[0];
              console.log(`Navigating to show calamity and nearest ABVN: ${nearest.group.organization} at (${nearest.coords.lat}, ${nearest.coords.lng}), distance: ${nearest.distance} km`);
              const bounds = L.latLngBounds([
                [coordinates.lat, coordinates.lng],
                [nearest.coords.lat, nearest.coords.lng]
              ]);
              map.fitBounds(bounds, {
                animate: true,
                duration: 1.5,
                padding: [100, 100]
              });
              const nearestMarker = abvnMarkers.find(m =>
                m.getLatLng().lat === nearest.coords.lat && m.getLatLng().lng === nearest.coords.lng
              );
              if (nearestMarker) {
                setTimeout(() => {
                  nearestMarker.openPopup();
                  console.log('Opened popup for nearest ABVN');
                }, 1600);
              } else {
                console.warn('Nearest marker not found');
              }
            } catch (error) {
              console.error(`Error loading ABVNs: ${error.message}`);
              Swal.fire({
                icon: "error",
                title: "Error",
                text: `Failed to load volunteer group locations: ${error.message}`,
                customClass: {
                  title: 'swal-title',
                  htmlContainer: 'swal-html',
                  confirmButton: 'swal-confirm'
                }
              });
            }
          });
        } else {
          console.warn(`Show Nearest ABVNs button not found for calamity ${calKey}, retrying...`);
          setTimeout(() => attachButtonListener(retryCount + 1), 500);
        }
      };
      if (!calamityMarkersMap[eventId]) {
        const calamitySvg = `
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
                  <!-- Removed circulating animation -->
                </circle>
              </g>
            </svg>
          `;
        const calamityIcon = L.divIcon({
            html: calamitySvg,
            className: 'custom-marker',
            iconSize: [50, 60],
            iconAnchor: [25, 60]
        });
        const pinMarker = L.marker([coordinates.lat, coordinates.lng], {
            icon: calamityIcon,
            title: calamity.type || "Calamity"
        }).addTo(map);
        calamityMarkersMap[eventId] = pinMarker;
        const calamityPopup = L.popup({
          content: popupContent
        });
        pinMarker.bindPopup(calamityPopup);
        pinMarker.on("popupopen", attachButtonListener);
        pinMarker.on("click", () => {
          map.panTo([coordinates.lat, coordinates.lng]);
          map.setZoom(8);
        });
        pinMarker.openPopup();
        map.panTo([coordinates.lat, coordinates.lng]);
        map.setZoom(8);
      } else {
        const marker = calamityMarkersMap[eventId];
        marker.setLatLng([coordinates.lat, coordinates.lng]);
        marker.getPopup().setContent(popupContent);
        marker.openPopup();
        map.panTo([coordinates.lat, coordinates.lng]);
        map.setZoom(8);
      }
    })
    .catch(error => {
      Swal.fire({
        icon: "error",
        title: "Error",
        text: `Failed to load calamity location: ${error.message}`,
        customClass: {
          title: 'swal-title',
          htmlContainer: 'swal-html',
          confirmButton: 'swal-confirm'
        }
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
                    customClass: {
                      title: 'swal-title',
                      htmlContainer: 'swal-html',
                      confirmButton: 'swal-confirm'
                    }
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
            customClass: {
              title: 'swal-title',
              htmlContainer: 'swal-html',
              confirmButton: 'swal-confirm'
            }
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
                 customClass: {
                   title: 'swal-title',
                   htmlContainer: 'swal-html',
                   confirmButton: 'swal-confirm'
                 }
             });
         } else {
             console.log(`No report found with ID: ${reportId}`);
             Swal.fire({
                 icon: "warning",
                 title: "Report Not Found",
                 text: `No report with ID ${reportId} exists in the submission list.`,
                 customClass: {
                   title: 'swal-title',
                   htmlContainer: 'swal-html',
                   confirmButton: 'swal-confirm'
                 }
             });
         }
     } catch (error) {
         console.error("Error verifying report:", error);
         Swal.fire({
             icon: "error",
             title: "Error",
             text: "Failed to verify report. Please try again later.",
             customClass: {
               title: 'swal-title',
               htmlContainer: 'swal-html',
               confirmButton: 'swal-confirm'
             }
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
             customClass: {
               title: 'swal-title',
               htmlContainer: 'swal-html',
               confirmButton: 'swal-confirm'
             }
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
         map.off();
         markers.forEach(marker => marker.remove());
         calamityMarkers.forEach(marker => marker.remove());
         hqMarkers.forEach(marker => marker.remove()); // NEW
         activatedMarkers.forEach(marker => marker.remove()); // NEW
         markers = [];
         calamityMarkers = [];
         hqMarkers = []; // NEW
         activatedMarkers = []; // NEW
         if (currentInfoWindow) singleInfoWindow.closePopup();
         currentInfoWindow = null;
         singleInfoWindow = null;
         map.remove();
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
     const overlay = L.rectangle(map.getBounds(), {
         color: 'rgba(255, 0, 0, 0.2)',
         fillOpacity: 0.2,
         weight: 0,
         interactive: false
     }).addTo(map);
     overlay.setStyle({ display: isInfoWindowClicked ? 'block' : 'none' });
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
             marker.remove(); // Remove from map
             console.log(`Removed expired marker for event at ${marker.getLatLng()}`);
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

 // NEW: Periodic refresh for ABVN data
 setInterval(() => {
     loadABVNHQs();
     loadActivatedABVNs();
 }, 5 * 60 * 1000); // Every 5 minutes

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
      showConfirmButton: false,
      customClass: {
        title: 'swal-title',
        htmlContainer: 'swal-html',
        confirmButton: 'swal-confirm'
      }
    });
  }).catch(error => {
    Swal.fire({
      title: "Error",
      text: "Something went wrong: " + error.message,
      icon: "error",
      confirmButtonText: "Retry",
      customClass: {
        title: 'swal-title',
        htmlContainer: 'swal-html',
        confirmButton: 'swal-confirm'
      }
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

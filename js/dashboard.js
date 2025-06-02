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

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const database = firebase.database();

let map, markers = [], geocoder, autocomplete, activationsListener, reportsListener, userRole, userEmail, userUid, currentInfoWindow, singleInfoWindow, isInfoWindowClicked = false;

// --- Session Management Variables ---
const INACTIVITY_TIMEOUT = 5 * 1000; // 5 seconds in milliseconds
let inactivityTimer;
let logoutModalInstance = null; // Changed name for clarity, will hold the Swal instance
let isModalShowing = false; // Flag to prevent multiple modals
// --- End Session Management Variables ---

// Converts Big Quantities to Readable Ones
function formatLargeNumber(numStr) {
    let num = BigInt(numStr || "0");
    const trillion = 1_000_000_000_000n;
    const billion = 1_000_000_000n;
    const million = 1_000_000n;
    const thousand = 1_000n;

    if (num >= trillion) {
        return (Number(num) / Number(trillion)).toFixed(2).replace(/\.?0+$/, '') + 'T';
    } else if (num >= billion) {
        return (Number(num) / Number(billion)).toFixed(2).replace(/\.?0+$/, '') + 'B';
    } else if (num >= million) {
        return (Number(num) / Number(million)).toFixed(2).replace(/\.?0+$/, '') + 'M';
    } else if (num >= thousand) {
        return (Number(num) / Number(thousand)).toFixed(2).replace(/\.?0+$/, '') + 'k';
    }
    return num.toString();
}

function animateNumber(elementId, target, duration = 1500, decimals = 0) {
  const el = document.getElementById(elementId);
  if (!el) return;

  let start = 0;
  const stepTime = 16; // ~60fps
  const steps = duration / stepTime;
  let currentStep = 0;

  const increment = target / steps;

  function step() {
    currentStep++;
    start += increment;
    if (currentStep >= steps) start = target;

    const displayValue = decimals > 0 ? start.toFixed(decimals) : Math.floor(start);

    el.textContent = formatNumber(parseFloat(displayValue), elementId);
    highlight(el);

    if (currentStep < steps) {
      requestAnimationFrame(step);
    }
  }
  requestAnimationFrame(step);
}

function formatNumber(num, id) {
  if (id === 'amount-raised' || id === 'inkind-donations') {
    return '₱' + num.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  // For counts, if number is large, use abbreviated format
  if (num >= 10000) {
    return formatLargeNumber(num.toString());
  }
  return num.toLocaleString();
}

function highlight(el) {
  el.style.transition = 'color 0.3s ease';
  el.style.color = '#FFF';

  setTimeout(() => {
    el.style.color = '#FFF';
  }, 300);
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

// Function to initialize the dashboard
window.initializeDashboard = function () {
    console.log("initializeDashboard called at", new Date().toISOString());

    // Clean up existing listeners (if any)
    cleanupDashboard();

    // Check user authentication and fetch data
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

        console.log(`Logged-in user UID: ${user.uid}`);
        userUid = user.uid; // Store UID for report filtering

        // Fetch user role
        database.ref(`users/${user.uid}`).once("value", snapshot => {
            const userData = snapshot.val();
            if (!userData || !userData.role) {
                console.error(`User data not found for UID: ${user.uid}`);
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

            console.log(`Role of logged-in user (UID: ${user.uid}): ${userRole}`);
            console.log(`User Email: ${userEmail}`);

            headerEl.textContent = userRole === "AB ADMIN" ? "Admin Dashboard" : "Volunteer Dashboard";

            // Initialize map for both AB ADMIN and ABVN
            console.log(`Initializing map for role: ${userRole}`);
            initializeMap();
            addMarkersForActiveActivations();
            if (userRole === "ABVN") {
                // Optional: Add ABVN-specific map restrictions
                map.setOptions({
                    disableDefaultUI: true,
                    draggable: false,
                });
            }

            // Fetch reports for both roles
            fetchReports();

            // --- Session Management: Start inactivity timer after successful login ---
            resetInactivityTimer(); // Start the timer immediately
            // --- End Session Management ---

        }, error => {
            console.error("Error fetching user data:", error);
            Swal.fire({
                icon: "error",
                title: "Error",
                text: "Failed to load user data. Please try again later.",
            });
        });
    });
};

// Function to initialize or re-initialize the map
function initializeMap() {
    try {
        console.log("initializeMap called at", new Date().toISOString());
        const mapDiv = document.getElementById("map");
        if (!mapDiv) {
            console.error("Map container not found");
            Swal.fire({
                icon: "error",
                title: "Map Error",
                text: "Map container not found on the page.",
            });
            return;
        }

        // Check map container visibility
        const mapStyles = window.getComputedStyle(mapDiv);
        console.log("Map container styles - display:", mapStyles.display, "visibility:", mapStyles.visibility, "height:", mapStyles.height);

        const defaultLocation = { lat: 14.5995, lng: 120.9842 }; // Manila, Philippines

        if (!map || mapDiv !== map.getDiv()) {
            map = new google.maps.Map(mapDiv, {
                center: defaultLocation,
                zoom: 6,
                mapTypeId: "roadmap",
            });
            console.log("Map initialized successfully");
        } else {
            console.log("Map already initialized, re-using existing map");
        }

        geocoder = new google.maps.Geocoder();

        // Initialize Autocomplete for the search input
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
            console.log("Map centered on:", place.geometry.location);
        });

        // Trigger a resize event to ensure the map renders properly
        google.maps.event.trigger(map, "resize");
        console.log("Map resize event triggered");

        // Initialize a single InfoWindow instance
        singleInfoWindow = new google.maps.InfoWindow();
    } catch (error) {
        console.error("Failed to initialize Google Maps:", error);
        Swal.fire({
            icon: "error",
            title: "Map Error",
            text: "Failed to load the map. Please check your internet connection and try again.",
        });
    }
}

// Function to add markers for active activations
function addMarkersForActiveActivations() {
    if (!map) {
        console.error("Map not initialized before adding markers");
        return;
    }

    // Remove existing listener if it exists
    if (activationsListener) {
        activationsListener.off();
        console.log("Removed existing activations listener");
    }

    activationsListener = database.ref("activations").orderByChild("status").equalTo("active");
    activationsListener.on("value", snapshot => {
        // Clear existing markers
        markers.forEach(marker => marker.setMap(null));
        markers = [];

        const activations = snapshot.val();
        if (!activations) {
            console.log("No active activations found in Firebase.");
            return;
        }

        console.log("Active activations:", activations);

        Object.entries(activations).forEach(([key, activation]) => {
            if (!activation.latitude || !activation.longitude) {
                console.warn(`Activation ${key} is missing latitude or longitude:`, activation);
                return;
            }

            const position = { lat: parseFloat(activation.latitude), lng: parseFloat(activation.longitude) };
            console.log(`Creating marker for ${activation.organization} at position:`, position);

            const logoPath = "../assets/images/AB_logo.png"; // Path for InfoWindow logo
            console.log("Attempting to load logo for InfoWindow from:", logoPath);

            // Use standard Marker
            const marker = new google.maps.Marker({
                position: position,
                map: map,
                title: activation.organization,
                icon: {
                    url: "https://maps.google.com/mapfiles/ms/icons/red-dot.png",
                },
            });

            markers.push(marker);
            console.log(`Marker created for ${activation.organization}`);

            // Load logo for InfoWindow and attach event listeners
            const img = new Image();
            img.src = logoPath;
            img.onload = () => {
                console.log("Logo loaded successfully for InfoWindow:", logoPath);
                createInfoWindow(marker, activation, logoPath);
            };
            img.onerror = () => {
                console.error("Failed to load logo for InfoWindow:", logoPath);
                createInfoWindow(marker, activation, null);
            };
        });

        // Trigger resize again after adding markers
        google.maps.event.trigger(map, "resize");
        console.log("Map resize event triggered after adding markers");
    }, error => {
        console.error("Error fetching activations for map:", error);
        Swal.fire({
            icon: "error",
            title: "Error",
            text: "Failed to load activation data for the map.",
        });
    });
}

// Function to create and manage the InfoWindow
function createInfoWindow(marker, activation, logoUrl) {
    const content = `
        <div class="bayanihan-infowindow">
            <div class="header">
                ${logoUrl ?
                `<img src="${logoUrl}" alt="Logo" class="logo" />` :
                `<div class="placeholder-icon"><i class='bx bx-building'></i></div>`
                }
                <div class="header-text">
                <h3>${activation.organization}</h3>
                <span class="status-badge"><i class='bx bx-check-circle'></i> Active</span>
                </div>
            </div>


            <div class="info-section">
                <div class="info-item">
                    <i class='bx bx-map'></i>
                    <div class="info-text">
                        <span class="label">Location</span>
                        <span class="value">${activation.areaOfOperation}</span>
                    </div>
                </div>
                <div class="info-item">
                    <i class='bx bx-cloud-lightning'></i>
                    <div class="info-text">
                        <span class="label">Calamity</span>
                        <span class="value">${activation.calamityType}${activation.typhoonName ? ` (${activation.typhoonName})` : ''}</span>
                    </div>
                </div>
            </div>
        </div>

        <style>
        .bayanihan-infowindow {
            font-family: 'Arial', sans-serif;
            background: #fff;
            border-radius: 16px;
            max-width: 420px;
            padding: 28px;
            border-left: 8px solid #FF69B4;
            animation: fadeSlideIn 0.4s ease;
            transition: transform 0.3s ease, box-shadow 0.3s ease;
        }
        .header {
            display: flex;
            align-items: center;
            margin-bottom: 24px;
            gap: 16px;
        }
        .logo, .placeholder-icon {
        width: 80px;
        height: 80px;
        border-radius: 16px;
        background:rgb(255, 255, 255);
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 6px; /* add breathing space inside the box */
        box-sizing: border-box;
        }
        .logo {
        object-fit: contain;
        max-width: 100%;
        max-height: 100%;
        border-radius: 12px;
        }
        .header-text h3 {
            margin: 0;
            font-size: 20px;
            color: #007BFF;
            line-height: 1.3;
        }
        .status-badge {
            display: inline-flex;
            align-items: center;
            margin-top: 6px;
            font-size: 13px;
            background: #d4edda;
            color: #388E3C;
            padding: 4px 10px;
            border-radius: 16px;
            font-weight: bold;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        .status-badge i {
            font-size: 18px;
            margin-right: 6px;
        }
        .info-section {
            display: flex;
            flex-direction: column;
            gap: 18px;
        }
        .info-item {
            display: flex;
            align-items: flex-start;
            gap: 14px;
            font-size: 16px;
            color: #333;
        }
        .info-item i {
            font-size: 28px;
            color: #007BFF;
            flex-shrink: 0;
            margin-top: 4px;
        }
        .info-text {
            display: flex;
            flex-direction: column;
        }
        .label {
            font-weight: bold;
            color: #555;
            font-size: 14px;
            margin-bottom: 4px;
        }
        .value {
            color: #222;
            font-size: 15px;
        }
        @keyframes fadeSlideIn {
            0% { opacity: 0; transform: translateY(10px); }
            100% { opacity: 1; transform: translateY(0); }
        }
        </style>
    `;

    marker.addListener("mouseover", () => {
        if (isInfoWindowClicked) {
            console.log(`Hover ignored for ${activation.organization} because an InfoWindow is already clicked open`);
            return;
        }

        if (currentInfoWindow && currentInfoWindow !== marker) {
            singleInfoWindow.close();
        }

        singleInfoWindow.setContent(content);
        singleInfoWindow.open(map, marker);
        currentInfoWindow = marker;
        console.log(`InfoWindow opened on hover for ${activation.organization}`);
    });

    marker.addListener("mouseout", () => {
        if (isInfoWindowClicked) {
            console.log(`Mouseout ignored for ${activation.organization} because InfoWindow is clicked open`);
            return;
        }

        if (currentInfoWindow === marker) {
            singleInfoWindow.close();
            currentInfoWindow = null;
            console.log(`InfoWindow closed on mouseout for ${activation.organization}`);
        }
    });

    marker.addListener("click", () => {
        if (currentInfoWindow && currentInfoWindow !== marker) {
            singleInfoWindow.close();
        }

        singleInfoWindow.setContent(content);
        singleInfoWindow.open(map, marker);
        currentInfoWindow = marker;
        isInfoWindowClicked = true;
        console.log(`InfoWindow opened on click for ${activation.organization}`);
    });

    singleInfoWindow.addListener("closeclick", () => {
        isInfoWindowClicked = false;
        currentInfoWindow = null;
        console.log(`InfoWindow closed manually for ${activation.organization}`);
    });
}

// Function to fetch approved reports
function fetchReports() {
    if (reportsListener) {
        reportsListener.off();
        console.log("Removed existing reports listener");
    }

    console.log(`Fetching reports for role: ${userRole}, UID: ${userUid}`);

    reportsListener = database.ref("reports/approved");
    reportsListener.on("value", snapshot => {
        let totalFoodPacks = 0;
        let totalHotMeals = 0;
        let totalWaterLiters = 0;
        let totalVolunteers = 0;
        let totalMonetaryDonations = 0;
        let totalInKindDonations = 0;

        const reports = snapshot.val();
        console.log("Fetched reports:", reports);

        if (reports) {
            const reportEntries = Object.entries(reports);
            console.log(`Total number of approved reports: ${reportEntries.length}`);

            reportEntries.forEach(([key, report]) => {
                console.log(`Processing Report ${key}: Report User UID: ${report.userUid}, Current User UID: ${userUid}`);

                if (userRole === "ABVN" && report.userUid !== userUid) {
                    console.log(`Skipping report ${key} for ABVN - User UID mismatch. Report UID: ${report.userUid}, Current User UID: ${userUid}`);
                    return;
                }

                console.log(`Including report ${key} for ${userRole}`);

                totalFoodPacks += parseFloat(report.NoOfFoodPacks || 0);
                totalHotMeals += parseFloat(report.NoOfHotMeals || 0);
                totalWaterLiters += parseFloat(report.LitersOfWater || 0);
                totalVolunteers += parseFloat(report.NoOfVolunteersMobilized || 0);
                totalMonetaryDonations += parseFloat(report.TotalMonetaryDonations || 0);
                totalInKindDonations += parseFloat(report.TotalValueOfInKindDonations || 0);
            });

            console.log(`Calculated totals for ${userRole} (UID: ${userUid}) - Food Packs: ${totalFoodPacks}, Hot Meals: ${totalHotMeals}, Water Liters: ${totalWaterLiters}, Volunteers: ${totalVolunteers}, Monetary Donations: ${totalMonetaryDonations}, In-Kind Donations: ${totalInKindDonations}`);
        } else {
            console.log("No approved reports found in the database.");
        }

        animateNumber('food-packs', totalFoodPacks, 1500, 0);
        animateNumber('hot-meals', totalHotMeals, 1500, 0);
        animateNumber('water-liters', totalWaterLiters, 1500, 0);
        animateNumber('volunteers', totalVolunteers, 1500, 0);
        animateNumber('amount-raised', totalMonetaryDonations, 1500, 2);
        animateNumber('inkind-donations', totalInKindDonations, 1500, 2);
    }, error => {
        console.error("Error fetching approved reports:", error);
        Swal.fire({
            icon: "error",
            title: "Error",
            text: "Failed to load dashboard data. Please try again later.",
        });
        if (foodPacksEl) foodPacksEl.textContent = "0";
        if (hotMealsEl) hotMealsEl.textContent = "0";
        if (waterLitersEl) waterLitersEl.textContent = "0";
        if (volunteersEl) volunteersEl.textContent = "0";
        if (amountRaisedEl) amountRaisedEl.textContent = "₱0.00 (Error)";
        if (inKindDonationsEl) inKindDonationsEl.textContent = "₱0.00 (Error)";
    });
}

// Function to clean up listeners and map state when navigating away
function cleanupDashboard() {
    console.log("Cleaning up dashboard state");

    if (activationsListener) {
        activationsListener.off();
        activationsListener = null;
        console.log("Removed activations listener");
    }

    if (reportsListener) {
        reportsListener.off();
        reportsListener = null;
        console.log("Removed reports listener");
    }

    markers.forEach(marker => marker.setMap(null));
    markers = [];

    if (singleInfoWindow) {
        singleInfoWindow.close();
        singleInfoWindow = null;
        currentInfoWindow = null;
        isInfoWindowClicked = false;
    }
    // --- Session Management: Clear inactivity timer on cleanup ---
    clearInactivityTimer();
    if (logoutModalInstance && isModalShowing) { // Check if modal is active before closing
        Swal.close();
        logoutModalInstance = null;
        isModalShowing = false;
    }
    // --- End Session Management ---
}

// --- Session Management Functions ---

// Function to reset the inactivity timer
function resetInactivityTimer() {
    console.log("Activity detected, resetting inactivity timer. Current time:", new Date().toLocaleTimeString());
    clearTimeout(inactivityTimer);
    if (logoutModalInstance && isModalShowing) {
        console.log("Closing existing inactivity modal.");
        Swal.close(); // Close the modal if it's open
        logoutModalInstance = null;
        isModalShowing = false;
    }
    startInactivityTimer();
}

// Function to start the inactivity timer
function startInactivityTimer() {
    console.log("Starting inactivity timer for", INACTIVITY_TIMEOUT / 1000, "seconds. Current time:", new Date().toLocaleTimeString());
    inactivityTimer = setTimeout(() => {
        promptUserForActivity();
    }, INACTIVITY_TIMEOUT);
}

// Function to clear the inactivity timer
function clearInactivityTimer() {
    console.log("Inactivity timer cleared. Current time:", new Date().toLocaleTimeString());
    clearTimeout(inactivityTimer);
}

// Function to prompt the user if they want to continue or log out
function promptUserForActivity() {
    if (isModalShowing) {
        console.log("Modal is already showing, preventing duplicate prompt.");
        return; // Prevent multiple modals
    }

    console.log("Inactivity detected. Prompting user to continue or logout. Current time:", new Date().toLocaleTimeString());
    isModalShowing = true; // Set flag to true

    logoutModalInstance = Swal.fire({
        title: 'Are you still there?',
        html: 'You will be logged out due to inactivity in <strong id="countdown">10</strong> seconds.<br>Click "Continue Session" to stay logged in.',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#3085d6',
        cancelButtonColor: '#d33',
        confirmButtonText: 'Continue Session',
        cancelButtonText: 'Log Out',
        allowOutsideClick: false, // Prevent closing by clicking outside
        allowEscapeKey: false, // Prevent closing by escape key
        timer: 10000, // Give user 10 seconds to respond before forced logout
        timerProgressBar: true,
        didOpen: () => {
            // Update countdown in modal
            const countdownEl = Swal.getHtmlContainer().querySelector('#countdown');
            let timeLeft = 10;
            const timerInterval = setInterval(() => {
                timeLeft--;
                if (countdownEl) {
                    countdownEl.textContent = timeLeft;
                }
                if (timeLeft <= 0) {
                    clearInterval(timerInterval);
                }
            }, 1000);
        },
        willClose: () => {
            // This callback is fired when the timer runs out or when a button is clicked
            isModalShowing = false; // Reset flag when modal closes
            if (logoutModalInstance && logoutModalInstance.isConfirmed === undefined && !Swal.isLoading()) {
                // The modal closed because its timer ran out and no button was explicitly clicked
                console.log("User did not respond to prompt, automatically logging out.");
                performLogout();
            }
        }
    }).then((result) => {
        if (result.isConfirmed) {
            console.log("User chose to continue session.");
            resetInactivityTimer(); // Reset the timer if user chooses to continue
        } else if (result.dismiss === Swal.DismissReason.cancel) {
            // User clicked "Log Out"
            console.log("User chose to log out.");
            performLogout();
        } else if (result.dismiss === Swal.DismissReason.timer) {
            // This case is handled by willClose to ensure logout if timer runs out.
            // No explicit action needed here as performLogout is called in willClose.
            console.log("SweetAlert timer expired.");
        }
        logoutModalInstance = null; // Clear the instance after resolution
    }).catch(error => {
        console.error("SweetAlert error:", error);
        isModalShowing = false;
        logoutModalInstance = null;
    });
}

// Function to perform the logout
function performLogout() {
    clearInactivityTimer(); // Ensure the timer is stopped before logging out
    if (isModalShowing) {
        Swal.close(); // Close any lingering modal
        isModalShowing = false;
        logoutModalInstance = null;
    }
    auth.signOut().then(() => {
        console.log("User logged out due to inactivity/choice. Redirecting...");
        Swal.fire({
            icon: 'info',
            title: 'Logged Out',
            text: 'You have been logged out due to inactivity.',
            showConfirmButton: false,
            timer: 2000,
            allowOutsideClick: false,
            allowEscapeKey: false
        }).then(() => {
            window.location.href = "../pages/login.html"; // Redirect to login page
        });
    }).catch((error) => {
        console.error("Error logging out:", error);
        Swal.fire({
            icon: 'error',
            title: 'Logout Error',
            text: 'An error occurred during logout. Please try again.',
        });
    });
}

// Add event listeners for user activity
// Ensure these are attached to the document or a relevant container
const activityEvents = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'];
activityEvents.forEach(event => {
    document.addEventListener(event, resetInactivityTimer);
});

// --- End Session Management Functions ---

window.addEventListener('beforeunload', () => {
    cleanupDashboard();
});

window.addEventListener('navigate-away', () => {
    console.log('navigate-away event: Cleaning up dashboard');
    cleanupDashboard();
});

const bell = document.getElementById('bell');
const drawer = document.getElementById('notificationDrawer');
const closeBtn = document.getElementById('closeDrawer');
const notifDot = document.getElementById('notifDot');
const markAllBtn = document.getElementById('markAllRead');
const notificationItems = document.querySelectorAll('.notification-item');

if (bell) {
    bell.addEventListener('click', (e) => {
        e.stopPropagation();
        if (drawer) { // Add null check for drawer
            drawer.classList.add('open');
        }
        if (notifDot) { // Add null check for notifDot
            notifDot.style.display = 'none';
        }
    });
}

if (closeBtn) {
    closeBtn.addEventListener('click', () => {
        if (drawer) { // Add null check for drawer
            drawer.classList.remove('open');
        }
    });
}

document.addEventListener('click', (e) => {
    if (drawer && bell && !drawer.contains(e.target) && e.target !== bell && drawer.classList.contains('open')) {
        drawer.classList.remove('open');
    }
});

if (markAllBtn) {
    markAllBtn.addEventListener('click', () => {
        notificationItems.forEach(item => {
            item.classList.remove('unread');
        });
    });
}

// // Firebase configuration
// const firebaseConfig = {
//     apiKey: "AIzaSyDJxMv8GCaMvQT2QBW3CdzA3dV5X_T2KqQ",
//     authDomain: "bayanihan-5ce7e.firebaseapp.com",
//     databaseURL: "https://bayanihan-5ce7e-default-rtdb.asia-southeast1.firebasedatabase.app",
//     projectId: "bayanihan-5ce7e",
//     storageBucket: "bayanihan-5ce7e.appspot.com",
//     messagingSenderId: "593123849917",
//     appId: "1:593123849917:web:eb85a63a536eeff78ce9d4",
//     measurementId: "G-ZTQ9VXXVV0",
// };

// firebase.initializeApp(firebaseConfig);
// const auth = firebase.auth();
// const database = firebase.database();

// let map, markers = [], geocoder, autocomplete, activationsListener, reportsListener, userRole, userEmail, userUid, currentInfoWindow, singleInfoWindow, isInfoWindowClicked = false;

// // Converts Big Quantities to Readable Ones
// function formatLargeNumber(numStr) {
//     let num = BigInt(numStr || "0");
//     const trillion = 1_000_000_000_000n;
//     const billion = 1_000_000_000n;
//     const million = 1_000_000n;
//     const thousand = 1_000n;

//     if (num >= trillion) {
//         return (Number(num) / Number(trillion)).toFixed(2).replace(/\.?0+$/, '') + 'T';
//     } else if (num >= billion) {
//         return (Number(num) / Number(billion)).toFixed(2).replace(/\.?0+$/, '') + 'B';
//     } else if (num >= million) {
//         return (Number(num) / Number(million)).toFixed(2).replace(/\.?0+$/, '') + 'M';
//     } else if (num >= thousand) {
//         return (Number(num) / Number(thousand)).toFixed(2).replace(/\.?0+$/, '') + 'k';
//     }
//     return num.toString();
// }

// function animateNumber(elementId, target, duration = 1500, decimals = 0) {
//   const el = document.getElementById(elementId);
//   if (!el) return;

//   let start = 0;
//   const stepTime = 16; // ~60fps
//   const steps = duration / stepTime;
//   let currentStep = 0;

//   const increment = target / steps;

//   function step() {
//     currentStep++;
//     start += increment;
//     if (currentStep >= steps) start = target;

//     const displayValue = decimals > 0 ? start.toFixed(decimals) : Math.floor(start);

//     el.textContent = formatNumber(parseFloat(displayValue), elementId);
//     highlight(el);

//     if (currentStep < steps) {
//       requestAnimationFrame(step);
//     }
//   }
//   requestAnimationFrame(step);
// }

// function formatNumber(num, id) {
//   if (id === 'amount-raised' || id === 'inkind-donations') {
//     return '₱' + num.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
//   }
//   // For counts, if number is large, use abbreviated format
//   if (num >= 10000) {
//     return formatLargeNumber(num.toString());
//   }
//   return num.toLocaleString();
// }

// function highlight(el) {
//   el.style.transition = 'color 0.3s ease';
//   el.style.color = '#FFF';

//   setTimeout(() => {
//     el.style.color = '#FFF';
//   }, 300);
// }

// // Elements
// const headerEl = document.querySelector("header");
// const foodPacksEl = document.getElementById("food-packs");
// const hotMealsEl = document.getElementById("hot-meals");
// const waterLitersEl = document.getElementById("water-liters");
// const volunteersEl = document.getElementById("volunteers");
// const amountRaisedEl = document.getElementById("amount-raised");
// const inKindDonationsEl = document.getElementById("inkind-donations");
// const searchInput = document.getElementById("search-input");

// // Function to initialize the dashboard
// window.initializeDashboard = function () {
//     console.log("initializeDashboard called at", new Date().toISOString());

//     // Clean up existing listeners (if any)
//     cleanupDashboard();

//     // Check user authentication and fetch data
//     auth.onAuthStateChanged(user => {
//         if (!user) {
//             Swal.fire({
//                 icon: "error",
//                 title: "Authentication Required",
//                 text: "Please sign in to access the dashboard.",
//             }).then(() => {
//                 window.location.href = "../pages/login.html";
//             });
//             return;
//         }

//         console.log(`Logged-in user UID: ${user.uid}`);
//         userUid = user.uid; // Store UID for report filtering

//         // Fetch user role
//         database.ref(`users/${user.uid}`).once("value", snapshot => {
//             const userData = snapshot.val();
//             if (!userData || !userData.role) {
//                 console.error(`User data not found for UID: ${user.uid}`);
//                 Swal.fire({
//                     icon: "error",
//                     title: "User Data Missing",
//                     text: "User role not found. Please contact an administrator.",
//                 }).then(() => {
//                     window.location.href = "../pages/login.html";
//                 });
//                 return;
//             }

//             userRole = userData.role;
//             userEmail = user.email;

//             console.log(`Role of logged-in user (UID: ${user.uid}): ${userRole}`);
//             console.log(`User Email: ${userEmail}`);

//             headerEl.textContent = userRole === "AB ADMIN" ? "Admin Dashboard" : "Volunteer Dashboard";

//             // Initialize map for both AB ADMIN and ABVN
//             console.log(`Initializing map for role: ${userRole}`);
//             initializeMap();
//             addMarkersForActiveActivations();
//             if (userRole === "ABVN") {
//                 // Optional: Add ABVN-specific map restrictions
//                 map.setOptions({
//                     disableDefaultUI: true, 
//                     draggable: false, 
//                 });
//             }

//             // Fetch reports for both roles
//             fetchReports();
//         }, error => {
//             console.error("Error fetching user data:", error);
//             Swal.fire({
//                 icon: "error",
//                 title: "Error",
//                 text: "Failed to load user data. Please try again later.",
//             });
//         });
//     });
// };

// // Function to initialize or re-initialize the map
// function initializeMap() {
//     try {
//         console.log("initializeMap called at", new Date().toISOString());
//         const mapDiv = document.getElementById("map");
//         if (!mapDiv) {
//             console.error("Map container not found");
//             Swal.fire({
//                 icon: "error",
//                 title: "Map Error",
//                 text: "Map container not found on the page.",
//             });
//             return;
//         }

//         // Check map container visibility
//         const mapStyles = window.getComputedStyle(mapDiv);
//         console.log("Map container styles - display:", mapStyles.display, "visibility:", mapStyles.visibility, "height:", mapStyles.height);

//         const defaultLocation = { lat: 14.5995, lng: 120.9842 }; // Manila, Philippines

//         if (!map || mapDiv !== map.getDiv()) {
//             map = new google.maps.Map(mapDiv, {
//                 center: defaultLocation,
//                 zoom: 6,
//                 mapTypeId: "roadmap",
//             });
//             console.log("Map initialized successfully");
//         } else {
//             console.log("Map already initialized, re-using existing map");
//         }

//         geocoder = new google.maps.Geocoder();

//         // Initialize Autocomplete for the search input
//         if (!searchInput) {
//             console.error("Search input not found");
//             Swal.fire({
//                 icon: "error",
//                 title: "Map Error",
//                 text: "Search input not found on the page.",
//             });
//             return;
//         }

//         autocomplete = new google.maps.places.Autocomplete(searchInput, {
//             componentRestrictions: { country: "PH" },
//             types: ["geocode"],
//         });
//         autocomplete.bindTo("bounds", map);

//         autocomplete.addListener("place_changed", () => {
//             const place = autocomplete.getPlace();
//             if (!place.geometry || !place.geometry.location) {
//                 console.log("No valid location selected from autocomplete.");
//                 Swal.fire({
//                     icon: "error",
//                     title: "Location Not Found",
//                     text: "Please select a valid location from the dropdown.",
//                 });
//                 return;
//             }

//             map.setCenter(place.geometry.location);
//             map.setZoom(12);
//             console.log("Map centered on:", place.geometry.location);
//         });

//         // Trigger a resize event to ensure the map renders properly
//         google.maps.event.trigger(map, "resize");
//         console.log("Map resize event triggered");

//         // Initialize a single InfoWindow instance
//         singleInfoWindow = new google.maps.InfoWindow();
//     } catch (error) {
//         console.error("Failed to initialize Google Maps:", error);
//         Swal.fire({
//             icon: "error",
//             title: "Map Error",
//             text: "Failed to load the map. Please check your internet connection and try again.",
//         });
//     }
// }

// // Function to add markers for active activations
// function addMarkersForActiveActivations() {
//     if (!map) {
//         console.error("Map not initialized before adding markers");
//         return;
//     }

//     // Remove existing listener if it exists
//     if (activationsListener) {
//         activationsListener.off();
//         console.log("Removed existing activations listener");
//     }

//     activationsListener = database.ref("activations").orderByChild("status").equalTo("active");
//     activationsListener.on("value", snapshot => {
//         // Clear existing markers
//         markers.forEach(marker => marker.setMap(null));
//         markers = [];

//         const activations = snapshot.val();
//         if (!activations) {
//             console.log("No active activations found in Firebase.");
//             return;
//         }

//         console.log("Active activations:", activations);

//         Object.entries(activations).forEach(([key, activation]) => {
//             if (!activation.latitude || !activation.longitude) {
//                 console.warn(`Activation ${key} is missing latitude or longitude:`, activation);
//                 return;
//             }

//             const position = { lat: parseFloat(activation.latitude), lng: parseFloat(activation.longitude) };
//             console.log(`Creating marker for ${activation.organization} at position:`, position);

//             const logoPath = "../assets/images/AB_logo.png"; // Path for InfoWindow logo
//             console.log("Attempting to load logo for InfoWindow from:", logoPath);

//             // Use standard Marker
//             const marker = new google.maps.Marker({
//                 position: position,
//                 map: map,
//                 title: activation.organization,
//                 icon: {
//                     url: "https://maps.google.com/mapfiles/ms/icons/red-dot.png", 
//                 },
//             });

//             markers.push(marker);
//             console.log(`Marker created for ${activation.organization}`);

//             // Load logo for InfoWindow and attach event listeners
//             const img = new Image();
//             img.src = logoPath;
//             img.onload = () => {
//                 console.log("Logo loaded successfully for InfoWindow:", logoPath);
//                 createInfoWindow(marker, activation, logoPath);
//             };
//             img.onerror = () => {
//                 console.error("Failed to load logo for InfoWindow:", logoPath);
//                 createInfoWindow(marker, activation, null);
//             };
//         });

//         // Trigger resize again after adding markers
//         google.maps.event.trigger(map, "resize");
//         console.log("Map resize event triggered after adding markers");
//     }, error => {
//         console.error("Error fetching activations for map:", error);
//         Swal.fire({
//             icon: "error",
//             title: "Error",
//             text: "Failed to load activation data for the map.",
//         });
//     });
// }

// // Function to create and manage the InfoWindow
// function createInfoWindow(marker, activation, logoUrl) {
//     const content = `
//         <div class="bayanihan-infowindow">
//             <div class="header">
//                 ${logoUrl ? 
//                 `<img src="${logoUrl}" alt="Logo" class="logo" />` : 
//                 `<div class="placeholder-icon"><i class='bx bx-building'></i></div>`
//                 }
//                 <div class="header-text">
//                 <h3>${activation.organization}</h3>
//                 <span class="status-badge"><i class='bx bx-check-circle'></i> Active</span>
//                 </div>
//             </div>


//             <div class="info-section">
//                 <div class="info-item">
//                     <i class='bx bx-map'></i>
//                     <div class="info-text">
//                         <span class="label">Location</span>
//                         <span class="value">${activation.areaOfOperation}</span>
//                     </div>
//                 </div>
//                 <div class="info-item">
//                     <i class='bx bx-cloud-lightning'></i>
//                     <div class="info-text">
//                         <span class="label">Calamity</span>
//                         <span class="value">${activation.calamityType}${activation.typhoonName ? ` (${activation.typhoonName})` : ''}</span>
//                     </div>
//                 </div>
//             </div>
//         </div>
        
//         <style>
//         .bayanihan-infowindow {
//             font-family: 'Arial', sans-serif;
//             background: #fff;
//             border-radius: 16px;
//             max-width: 420px;
//             padding: 28px;
//             border-left: 8px solid #FF69B4;
//             animation: fadeSlideIn 0.4s ease;
//             transition: transform 0.3s ease, box-shadow 0.3s ease;
//         }
//         .header {
//             display: flex;
//             align-items: center;
//             margin-bottom: 24px;
//             gap: 16px;
//         }
//         .logo, .placeholder-icon {
//         width: 80px;
//         height: 80px;
//         border-radius: 16px;
//         background:rgb(255, 255, 255);
//         display: flex;
//         align-items: center;
//         justify-content: center;
//         padding: 6px; /* add breathing space inside the box */
//         box-sizing: border-box;
//         }
//         .logo {
//         object-fit: contain;
//         max-width: 100%;
//         max-height: 100%;
//         border-radius: 12px;
//         }
//         .header-text h3 {
//             margin: 0;
//             font-size: 20px;
//             color: #007BFF;
//             line-height: 1.3;
//         }
//         .status-badge {
//             display: inline-flex;
//             align-items: center;
//             margin-top: 6px;
//             font-size: 13px;
//             background: #d4edda;
//             color: #388E3C;
//             padding: 4px 10px;
//             border-radius: 16px;
//             font-weight: bold;
//             text-transform: uppercase;
//             letter-spacing: 0.5px;
//         }
//         .status-badge i {
//             font-size: 18px;
//             margin-right: 6px;
//         }
//         .info-section {
//             display: flex;
//             flex-direction: column;
//             gap: 18px;
//         }
//         .info-item {
//             display: flex;
//             align-items: flex-start;
//             gap: 14px;
//             font-size: 16px;
//             color: #333;
//         }
//         .info-item i {
//             font-size: 28px;
//             color: #007BFF;
//             flex-shrink: 0;
//             margin-top: 4px;
//         }
//         .info-text {
//             display: flex;
//             flex-direction: column;
//         }
//         .label {
//             font-weight: bold;
//             color: #555;
//             font-size: 14px;
//             margin-bottom: 4px;
//         }
//         .value {
//             color: #222;
//             font-size: 15px;
//         }
//         @keyframes fadeSlideIn {
//             0% { opacity: 0; transform: translateY(10px); }
//             100% { opacity: 1; transform: translateY(0); }
//         }
//         </style>
//     `;

//     marker.addListener("mouseover", () => {
//         if (isInfoWindowClicked) {
//             console.log(`Hover ignored for ${activation.organization} because an InfoWindow is already clicked open`);
//             return;
//         }

//         if (currentInfoWindow && currentInfoWindow !== marker) {
//             singleInfoWindow.close();
//         }

//         singleInfoWindow.setContent(content);
//         singleInfoWindow.open(map, marker);
//         currentInfoWindow = marker;
//         console.log(`InfoWindow opened on hover for ${activation.organization}`);
//     });

//     marker.addListener("mouseout", () => {
//         if (isInfoWindowClicked) {
//             console.log(`Mouseout ignored for ${activation.organization} because InfoWindow is clicked open`);
//             return;
//         }

//         if (currentInfoWindow === marker) {
//             singleInfoWindow.close();
//             currentInfoWindow = null;
//             console.log(`InfoWindow closed on mouseout for ${activation.organization}`);
//         }
//     });

//     marker.addListener("click", () => {
//         if (currentInfoWindow && currentInfoWindow !== marker) {
//             singleInfoWindow.close();
//         }

//         singleInfoWindow.setContent(content);
//         singleInfoWindow.open(map, marker);
//         currentInfoWindow = marker;
//         isInfoWindowClicked = true;
//         console.log(`InfoWindow opened on click for ${activation.organization}`);
//     });

//     singleInfoWindow.addListener("closeclick", () => {
//         isInfoWindowClicked = false;
//         currentInfoWindow = null;
//         console.log(`InfoWindow closed manually for ${activation.organization}`);
//     });
// }

// // Function to fetch approved reports
// function fetchReports() {
//     if (reportsListener) {
//         reportsListener.off();
//         console.log("Removed existing reports listener");
//     }

//     console.log(`Fetching reports for role: ${userRole}, UID: ${userUid}`);

//     reportsListener = database.ref("reports/approved");
//     reportsListener.on("value", snapshot => {
//         let totalFoodPacks = 0;
//         let totalHotMeals = 0;
//         let totalWaterLiters = 0;
//         let totalVolunteers = 0;
//         let totalMonetaryDonations = 0;
//         let totalInKindDonations = 0;

//         const reports = snapshot.val();
//         console.log("Fetched reports:", reports);

//         if (reports) {
//             const reportEntries = Object.entries(reports);
//             console.log(`Total number of approved reports: ${reportEntries.length}`);

//             reportEntries.forEach(([key, report]) => {
//                 console.log(`Processing Report ${key}: Report User UID: ${report.userUid}, Current User UID: ${userUid}`);

//                 if (userRole === "ABVN" && report.userUid !== userUid) {
//                     console.log(`Skipping report ${key} for ABVN - User UID mismatch. Report UID: ${report.userUid}, Current User UID: ${userUid}`);
//                     return;
//                 }

//                 console.log(`Including report ${key} for ${userRole}`);

//                 totalFoodPacks += parseFloat(report.NoOfFoodPacks || 0);
//                 totalHotMeals += parseFloat(report.NoOfHotMeals || 0);
//                 totalWaterLiters += parseFloat(report.LitersOfWater || 0);
//                 totalVolunteers += parseFloat(report.NoOfVolunteersMobilized || 0);
//                 totalMonetaryDonations += parseFloat(report.TotalMonetaryDonations || 0);
//                 totalInKindDonations += parseFloat(report.TotalValueOfInKindDonations || 0);
//             });

//             console.log(`Calculated totals for ${userRole} (UID: ${userUid}) - Food Packs: ${totalFoodPacks}, Hot Meals: ${totalHotMeals}, Water Liters: ${totalWaterLiters}, Volunteers: ${totalVolunteers}, Monetary Donations: ${totalMonetaryDonations}, In-Kind Donations: ${totalInKindDonations}`);
//         } else {
//             console.log("No approved reports found in the database.");
//         }

//         animateNumber('food-packs', totalFoodPacks, 1500, 0);
//         animateNumber('hot-meals', totalHotMeals, 1500, 0);
//         animateNumber('water-liters', totalWaterLiters, 1500, 0);
//         animateNumber('volunteers', totalVolunteers, 1500, 0);
//         animateNumber('amount-raised', totalMonetaryDonations, 1500, 2);
//         animateNumber('inkind-donations', totalInKindDonations, 1500, 2);
//     }, error => {
//         console.error("Error fetching approved reports:", error);
//         Swal.fire({
//             icon: "error",
//             title: "Error",
//             text: "Failed to load dashboard data. Please try again later.",
//         });
//         if (foodPacksEl) foodPacksEl.textContent = "0";
//         if (hotMealsEl) hotMealsEl.textContent = "0";
//         if (waterLitersEl) waterLitersEl.textContent = "0";
//         if (volunteersEl) volunteersEl.textContent = "0";
//         if (amountRaisedEl) amountRaisedEl.textContent = "₱0.00 (Error)";
//         if (inKindDonationsEl) inKindDonationsEl.textContent = "₱0.00 (Error)";
//     });
// }

// // Function to clean up listeners and map state when navigating away
// function cleanupDashboard() {
//     console.log("Cleaning up dashboard state");

//     if (activationsListener) {
//         activationsListener.off();
//         activationsListener = null;
//         console.log("Removed activations listener");
//     }

//     if (reportsListener) {
//         reportsListener.off();
//         reportsListener = null;
//         console.log("Removed reports listener");
//     }

//     markers.forEach(marker => marker.setMap(null));
//     markers = [];

//     if (singleInfoWindow) {
//         singleInfoWindow.close();
//         singleInfoWindow = null;
//         currentInfoWindow = null;
//         isInfoWindowClicked = false;
//     }
// }

// window.addEventListener('beforeunload', () => {
//     cleanupDashboard();
// });

// window.addEventListener('navigate-away', () => {
//     console.log('navigate-away event: Cleaning up dashboard');
//     cleanupDashboard();
// });

// const bell = document.getElementById('bell');
// const drawer = document.getElementById('notificationDrawer');
// const closeBtn = document.getElementById('closeDrawer');
// const notifDot = document.getElementById('notifDot');
// const markAllBtn = document.getElementById('markAllRead');
// const notificationItems = document.querySelectorAll('.notification-item');

// bell.addEventListener('click', (e) => {
//     e.stopPropagation();
//     drawer.classList.add('open');
//     notifDot.style.display = 'none';
// });

// closeBtn.addEventListener('click', () => {
//     drawer.classList.remove('open');
// });

// document.addEventListener('click', (e) => {
//     if (!drawer.contains(e.target) && e.target !== bell && drawer.classList.contains('open')) {
//         drawer.classList.remove('open');
//     }
// });

// markAllBtn.addEventListener('click', () => {
//     notificationItems.forEach(item => {
//         item.classList.remove('unread');
//     });
// });
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

let map, markers = [], geocoder, autocomplete, activationsListener, reportsListener, userRole, userEmail, currentInfoWindow, singleInfoWindow, isInfoWindowClicked = false;

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

    // Initialize the map
    initializeMap();

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

            // Load activations and reports
            addMarkersForActiveActivations();
            fetchReports();
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

        // Re-initialize the map if it doesn't exist or the container has changed
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
        const searchInput = document.getElementById("search-input");
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

// Function to add markers for active activations (for both AB ADMIN and ABVN)
function addMarkersForActiveActivations() {
    if (!map) {
        console.error("Map not initialized before adding markers");
        Swal.fire({
            icon: "error",
            title: "Map Error",
            text: "Map failed to initialize. Please refresh the page.",
        });
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
                    url: "https://maps.google.com/mapfiles/ms/icons/red-dot.png", // Default red pin
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
        <div class="bayanihan-infowindow" style="
            font-family: 'Arial', sans-serif;
            color: #333;
            padding: 15px;
            background: #FFFFFF;
            border-radius: 10px;
            box-shadow: 0 4px 8px rgba(0,0,0,0.2);
            max-width: 300px;
            border-top: 5px solid #FF69B4;
            animation: slideIn 0.3s ease-out;
        ">
            <h3 style="
                margin: 0 0 10px;
                color: #007BFF;
                font-size: 18px;
                display: flex;
                align-items: center;
                gap: 8px;
            ">
                ${logoUrl ? 
                    `<img src="${logoUrl}" alt="Bayanihan Logo" style="width: 24px; height: 24px;" />` : 
                    `<span style="font-size: 24px;">🌟</span>`
                }
                ${activation.organization}
            </h3>
            <p style="margin: 5px 0;">
                <strong style="color: #007BFF;">📍 Location:</strong>
                <span style="color: #333;">${activation.areaOfOperation}</span>
            </p>
            <p style="margin: 5px 0;">
                <strong style="color: #007BFF;">🌍 Calamity:</strong>
                <span style="color: #333;">${activation.calamityType}${activation.typhoonName ? ` (${activation.typhoonName})` : ''}</span>
            </p>
            <p style="margin: 5px 0;">
                <strong style="color: #007BFF;">✅ Status:</strong>
                <span style="color: #388E3C; font-weight: bold;">Active</span>
            </p>
        </div>
        <style>
            @keyframes slideIn {
                0% { transform: translateY(10px); opacity: 0; }
                100% { transform: translateY(0); opacity: 1; }
            }
        </style>
    `;

    // Add hover event listeners (mouseover and mouseout)
    marker.addListener("mouseover", () => {
        // If an InfoWindow is already open due to a click, do not open a new one on hover
        if (isInfoWindowClicked) {
            console.log(`Hover ignored for ${activation.organization} because an InfoWindow is already clicked open`);
            return;
        }

        // Close any existing InfoWindow (from a previous hover)
        if (currentInfoWindow && currentInfoWindow !== marker) {
            singleInfoWindow.close();
        }

        // Open the InfoWindow on hover
        singleInfoWindow.setContent(content);
        singleInfoWindow.open(map, marker);
        currentInfoWindow = marker;
        console.log(`InfoWindow opened on hover for ${activation.organization}`);
    });

    marker.addListener("mouseout", () => {
        // If an InfoWindow is open due to a click, do not close it
        if (isInfoWindowClicked) {
            console.log(`Mouseout ignored for ${activation.organization} because InfoWindow is clicked open`);
            return;
        }

        // Close the InfoWindow if it was opened by a hover
        if (currentInfoWindow === marker) {
            singleInfoWindow.close();
            currentInfoWindow = null;
            console.log(`InfoWindow closed on mouseout for ${activation.organization}`);
        }
    });

    // Add click event listener
    marker.addListener("click", () => {
        // Close any existing InfoWindow
        if (currentInfoWindow && currentInfoWindow !== marker) {
            singleInfoWindow.close();
        }

        // Open the InfoWindow on click
        singleInfoWindow.setContent(content);
        singleInfoWindow.open(map, marker);
        currentInfoWindow = marker;
        isInfoWindowClicked = true; // Set the clicked state
        console.log(`InfoWindow opened on click for ${activation.organization}`);
    });

    // Add a closeclick listener to reset the clicked state
    singleInfoWindow.addListener("closeclick", () => {
        isInfoWindowClicked = false;
        currentInfoWindow = null;
        console.log(`InfoWindow closed manually for ${activation.organization}`);
    });
}

// Function to fetch approved reports
function fetchReports() {
    // Remove existing listener if it exists
    if (reportsListener) {
        reportsListener.off();
        console.log("Removed existing reports listener");
    }

    reportsListener = database.ref("reports/approved");
    reportsListener.on("value", snapshot => {
        let totalFoodPacks = 0;
        let totalHotMeals = 0;
        let totalWaterLiters = 0;
        let totalVolunteers = 0;
        let totalMonetaryDonations = 0;
        let totalInKindDonations = 0;

        const reports = snapshot.val();
        if (reports) {
            const reportPromises = Object.values(reports).map(async report => {
                let submittedBy = report.SubmittedBy || "Unknown";

                // If SubmittedBy is a UID, fetch the user's email
                if (submittedBy !== "Unknown" && submittedBy.length === 28) { // Assuming UID length
                    try {
                        const userSnapshot = await database.ref(`users/${submittedBy}`).once('value');
                        const userData = userSnapshot.val();
                        submittedBy = userData?.email || "Unknown";
                    } catch (error) {
                        console.error(`Error fetching user for UID ${submittedBy}:`, error);
                    }
                }

                console.log(`Report SubmittedBy: ${submittedBy}, Report Data:`, report);

                if (userRole === "ABVN") {
                    const reportSubmittedBy = submittedBy ? submittedBy.toLowerCase() : "";
                    const currentUserEmail = userEmail ? userEmail.toLowerCase() : "";
                    if (reportSubmittedBy !== currentUserEmail) {
                        console.log(`Skipping report for ABVN - SubmittedBy (${submittedBy}) does not match user email (${userEmail})`);
                        return;
                    }
                }

                totalFoodPacks += parseFloat(report.NoOfFoodPacks || 0);
                totalHotMeals += parseFloat(report.NoOfHotMeals || 0);
                totalWaterLiters += parseFloat(report.LitersOfWater || 0);
                totalVolunteers += parseFloat(report.NoOfVolunteersMobilized || 0);
                totalMonetaryDonations += parseFloat(report.TotalMonetaryDonations || 0);
                totalInKindDonations += parseFloat(report.TotalValueOfInKindDonations || 0);
            });

            Promise.all(reportPromises).then(() => {
                foodPacksEl.textContent = totalFoodPacks.toLocaleString();
                hotMealsEl.textContent = totalHotMeals.toLocaleString();
                waterLitersEl.textContent = totalWaterLiters.toLocaleString();
                volunteersEl.textContent = totalVolunteers.toLocaleString();
                amountRaisedEl.textContent = `₱${totalMonetaryDonations.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
                inKindDonationsEl.textContent = `₱${totalInKindDonations.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

                console.log(`Totals - Food Packs: ${totalFoodPacks}, Hot Meals: ${totalHotMeals}, Water Liters: ${totalWaterLiters}, Volunteers: ${totalVolunteers}, Monetary Donations: ${totalMonetaryDonations}, In-Kind Donations: ${totalInKindDonations}`);
            });
        } else {
            console.log("No approved reports found.");
            foodPacksEl.textContent = "0";
            hotMealsEl.textContent = "0";
            waterLitersEl.textContent = "0";
            volunteersEl.textContent = "0";
            amountRaisedEl.textContent = "₱0.00";
            inKindDonationsEl.textContent = "₱0.00";
        }
    }, error => {
        console.error("Error fetching approved reports:", error);
        Swal.fire({
            icon: "error",
            title: "Error",
            text: "Failed to load dashboard data. Please try again later.",
        });
        foodPacksEl.textContent = "0";
        hotMealsEl.textContent = "0";
        waterLitersEl.textContent = "0";
        volunteersEl.textContent = "0";
        amountRaisedEl.textContent = "₱0.00 (Error)";
        inKindDonationsEl.textContent = "₱0.00 (Error)";
    });
}

// Function to clean up listeners and map state when navigating away
function cleanupDashboard() {
    console.log("Cleaning up dashboard state");

    // Remove Firebase listeners
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

    // Clear markers
    markers.forEach(marker => marker.setMap(null));
    markers = [];

    // Close any open InfoWindow and reset state
    if (singleInfoWindow) {
        singleInfoWindow.close();
        singleInfoWindow = null;
        currentInfoWindow = null;
        isInfoWindowClicked = false;
    }
}

// Listen for navigation away from the dashboard
window.addEventListener('beforeunload', () => {
    cleanupDashboard();
});

// Listen for custom navigation-away event (if your app dispatches one)
window.addEventListener('navigate-away', () => {
    console.log('navigate-away event: Cleaning up dashboard');
    cleanupDashboard();
});
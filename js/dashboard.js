// Global variable to hold the map and markers
let map;
let markers = [];
let autocomplete;

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
  el.style.color = '#23d7d7';

  setTimeout(() => {
    el.style.color = '#0fbaba';
  }, 300);
}



// Initialize Google Maps
function initMap() {
    // Default to Manila, Philippines
    const defaultLocation = { lat: 14.5995, lng: 120.9842 };

    // Initialize the map
    map = new google.maps.Map(document.getElementById("map"), {
        center: defaultLocation,
        zoom: 10,
        mapTypeId: "roadmap",
    });

    // Initialize the search bar with Places Autocomplete using the existing search-input
    const searchInput = document.getElementById("search-input");
    autocomplete = new google.maps.places.Autocomplete(searchInput);
    autocomplete.bindTo("bounds", map);

    // When a place is selected from the autocomplete dropdown
    autocomplete.addListener("place_changed", () => {
        const place = autocomplete.getPlace();
        if (!place.geometry || !place.geometry.location) {
            Swal.fire({
                icon: "error",
                title: "Location Not Found",
                text: "Please select a valid location from the dropdown.",
            });
            return;
        }

        // Center the map on the selected location
        map.setCenter(place.geometry.location);
        map.setZoom(16);

        // Clear existing markers
        clearMarkers();

        // Add a marker at the selected location
        const marker = new google.maps.Marker({
            position: place.geometry.location,
            map: map,
            title: place.name,
        });
        markers.push(marker);

        // Add an info window
        const infowindow = new google.maps.InfoWindow({
            content: `<strong>${place.name}</strong><br>${place.formatted_address}`,
        });
        marker.addListener("click", () => {
            infowindow.open(map, marker);
        });
        infowindow.open(map, marker);
    });

    // Allow pinning a location by clicking on the map
    map.addListener("click", (event) => {
        // Clear existing markers
        clearMarkers();

        // Add a new marker at the clicked location
        const marker = new google.maps.Marker({
            position: event.latLng,
            map: map,
            title: "Pinned Location",
        });
        markers.push(marker);

        // Add an info window
        const infowindow = new google.maps.InfoWindow({
            content: `Pinned Location<br>Lat: ${event.latLng.lat()}, Lng: ${event.latLng.lng()}`,
        });
        marker.addListener("click", () => {
            infowindow.open(map, marker);
        });
        infowindow.open(map, marker);

        // Center the map on the pinned location
        map.setCenter(event.latLng);
        map.setZoom(16);
    });

    // Get user's location
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const userLocation = {
                    lat: position.coords.latitude,
                    lng: position.coords.longitude,
                };

                // Center the map on the user's location
                map.setCenter(userLocation);
                map.setZoom(16);

                // Add a marker for the user's location
                const marker = new google.maps.Marker({
                    position: userLocation,
                    map: map,
                    title: "You are here",
                    icon: {
                        url: "http://maps.google.com/mapfiles/ms/icons/blue-dot.png", // Blue dot for user location
                    },
                });
                markers.push(marker);

                // Add an info window
                const infowindow = new google.maps.InfoWindow({
                    content: "You are here",
                });
                marker.addListener("click", () => {
                    infowindow.open(map, marker);
                });
                infowindow.open(map, marker);

                console.log("User location:", userLocation);
            },
            (error) => {
                console.error("Geolocation error:", error);
                let errorMessage = "Unable to retrieve your location.";
                switch (error.code) {
                    case error.PERMISSION_DENIED:
                        errorMessage = "Location access denied. Please allow location access in your browser settings.";
                        break;
                    case error.POSITION_UNAVAILABLE:
                        errorMessage = "Location information is unavailable. Ensure your device has a working GPS or network connection.";
                        break;
                    case error.TIMEOUT:
                        errorMessage = "Location request timed out. Please try again.";
                        break;
                }
                Swal.fire({
                    icon: "error",
                    title: "Location Error",
                    text: errorMessage,
                });
            },
            {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 0,
            }
        );
    } else {
        Swal.fire({
            icon: "error",
            title: "Geolocation Not Supported",
            text: "Your browser does not support geolocation. Please use a modern browser.",
        });
    }
}

// Function to clear all markers from the map
function clearMarkers() {
    markers.forEach(marker => marker.setMap(null));
    markers = [];
}

document.addEventListener("DOMContentLoaded", () => {
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

    // Initialize Firebase
    firebase.initializeApp(firebaseConfig);
    const auth = firebase.auth();
    const database = firebase.database();

    // Elements to display metrics
    const headerEl = document.querySelector("header");
    const foodPacksEl = document.getElementById("food-packs");
    const hotMealsEl = document.getElementById("hot-meals");
    const waterLitersEl = document.getElementById("water-liters");
    const volunteersEl = document.getElementById("volunteers");
    const amountRaisedEl = document.getElementById("amount-raised");
    const inKindDonationsEl = document.getElementById("inkind-donations"); // Corrected variable name

    // Search bar for both metrics and map search
    const searchInput = document.getElementById("search-input");
    searchInput.addEventListener("input", (e) => {
        const query = e.target.value.trim();
        console.log("Search query for dashboard metrics (if applicable):", query);
        // Add logic here to filter metrics based on query if needed
    });

    // Check user authentication
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

            const role = userData.role;
            // const userEmail = user.email; 

            console.log(`Role of logged-in user (UID: ${user.uid}): ${role}`);
            // console.log(`User Email: ${userEmail}`); // No longer needed for filtering

            // Update the dashboard header based on role
            headerEl.textContent = role === "AB ADMIN" ? "Admin Dashboard" : "Volunteer Dashboard";

            // Fetch approved reports and aggregate data
            database.ref("reports/approved").on("value", snapshot => {
                let totalFoodPacks = 0;
                let totalHotMeals = 0;
                let totalWaterLiters = 0;
                let totalVolunteers = 0;
                let totalMonetaryDonations = 0;
                let totalInKindDonations = 0;

                const reports = snapshot.val();
                if (reports) {
                    Object.values(reports).forEach(report => {
                        // Debug: Log the report's userUid and the current user's UID
                        console.log(`Processing Report: ${report.ReportID}, Report User UID: ${report.userUid}, Current User UID: ${user.uid}`);

                        // *** THE KEY CHANGE IS HERE: Filter by userUid for ABVN role ***
                        if (role === "ABVN") {
                            if (report.userUid !== user.uid) {
                                console.log(`Skipping report ${report.ReportID} for ABVN - User UID mismatch. Report UID: ${report.userUid}, Current User UID: ${user.uid}`);
                                return; // Skip this report, continue to the next one
                            } else {
                                console.log(`Including report ${report.ReportID} for ABVN - User UID match.`);
                            }
                        }

                        // Aggregate data - use parseFloat for numbers that can have decimals
                        // Using 'parseFloat' for all numeric values for consistency and to handle potential string numbers
                        totalFoodPacks += parseFloat(report.NoOfFoodPacks || 0);
                        totalHotMeals += parseFloat(report.NoOfHotMeals || 0); 
                        totalWaterLiters += parseFloat(report.LitersOfWater || 0);
                        totalVolunteers += parseFloat(report.NoOfVolunteersMobilized || 0);
                        
                        // Use the correct field name for monetary donations from your Firebase data
                        totalMonetaryDonations += parseFloat(report.TotalMonetaryDonations || 0);
                        
                        // Corrected typo in field name (TotalVa1ueOfInKindDonations -> TotalValueOfInKindDonations) if it's in your data
                        totalInKindDonations += parseFloat(report.TotalValueOfInKindDonations || 0); 
                    });
                } else {
                    console.log("No approved reports found in the database.");
                }

                // Update the DOM with aggregated data, applying formatting
                animateNumber('food-packs', totalFoodPacks, 1500, 0);
                animateNumber('hot-meals', totalHotMeals, 1500, 0);
                animateNumber('water-liters', totalWaterLiters, 1500, 0);
                animateNumber('volunteers', totalVolunteers, 1500, 0);
                animateNumber('amount-raised', totalMonetaryDonations, 1500, 2);
                animateNumber('inkind-donations', totalInKindDonations, 1500, 2);



                // Log aggregated totals
                console.log(`Totals - Food Packs: ${totalFoodPacks}, Hot Meals: ${totalHotMeals}, Water Liters: ${totalWaterLiters}, Volunteers: ${totalVolunteers}, Monetary Donations: ${totalMonetaryDonations}, In-Kind Donations: ${totalInKindDonations}`);
            }, error => {
                console.error("Error fetching approved reports:", error);
                Swal.fire({
                    icon: "error",
                    title: "Error",
                    text: "Failed to load dashboard data. Please try again later.",
                });
                // Set display to 0 or an error message if data load fails
                foodPacksEl.textContent = "0";
                hotMealsEl.textContent = "0";
                waterLitersEl.textContent = "0";
                volunteersEl.textContent = "0";
                amountRaisedEl.textContent = "₱0.00 (Error)";
                inKindDonationsEl.textContent = "₱0.00 (Error)";
            });
        }, error => {
            console.error("Error fetching user data:", error);
            Swal.fire({
                icon: "error",
                title: "Error",
                text: "Failed to load user data. Please try again later.",
            });
        });
    });
});


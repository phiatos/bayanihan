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

let map, markers = [], geocoder, autocomplete;

// Initialize Google Maps for Dashboard
function initMap() {
    const defaultLocation = { lat: 14.5995, lng: 120.9842 }; // Manila, Philippines

    map = new google.maps.Map(document.getElementById("map"), {
        center: defaultLocation,
        zoom: 6,
        mapTypeId: "roadmap",
    });

    geocoder = new google.maps.Geocoder();

    // Initialize Autocomplete for the search input
    autocomplete = new google.maps.places.Autocomplete(searchInput, {
        componentRestrictions: { country: "PH" },
        types: ["geocode"],
    });
    autocomplete.bindTo("bounds", map);

    autocomplete.addListener("place_changed", () => {
        const place = autocomplete.getPlace();
        if (!place.geometry || !place.geometry.location) {
            console.log("No valid location selected from autocomplete.");
            return;
        }

        map.setCenter(place.geometry.location);
        map.setZoom(12);
    });
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
        const userEmail = user.email;

        console.log(`Role of logged-in user (UID: ${user.uid}): ${role}`);
        console.log(`User Email: ${userEmail}`);

        headerEl.textContent = role === "AB ADMIN" ? "Admin Dashboard" : "Volunteer Dashboard";

        // Initialize map for admin
        if (role === "AB ADMIN") {
            database.ref("activations").orderByChild("status").equalTo("active").on("value", snapshot => {
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

                    const logoPath = "../assets/images/AB_logo.png";
                    console.log("Attempting to load logo from:", logoPath);

                    const markerIcon = new Image();
                    markerIcon.src = logoPath;
                    markerIcon.onload = () => {
                        console.log("Logo loaded successfully for marker:", logoPath);
                        const marker = new google.maps.Marker({
                            position: position,
                            map: map,
                            title: activation.organization,
                            icon: {
                                url: logoPath,
                                scaledSize: new google.maps.Size(50, 50),
                                labelOrigin: new google.maps.Point(25, -10),
                            },
                            label: {
                                text: activation.organization.slice(0, 15) + (activation.organization.length > 15 ? "..." : ""),
                                color: "#ffffff",
                                fontSize: "14px",
                                fontWeight: "bold",
                                backgroundColor: "#007BFF",
                                padding: "3px 6px",
                                borderRadius: "5px",
                            },
                            animation: google.maps.Animation.DROP,
                        });
                        markers.push(marker);
                        console.log(`Marker created for ${activation.organization}`);

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
                    };
                    markerIcon.onerror = () => {
                        console.error("Failed to load logo for marker:", logoPath);
                        const marker = new google.maps.Marker({
                            position: position,
                            map: map,
                            title: activation.organization,
                            icon: {
                                url: "https://maps.google.com/mapfiles/ms/icons/blue-dot.png",
                                scaledSize: new google.maps.Size(50, 50),
                                labelOrigin: new google.maps.Point(25, -10),
                            },
                            label: {
                                text: activation.organization.slice(0, 15) + (activation.organization.length > 15 ? "..." : ""),
                                color: "#ffffff",
                                fontSize: "14px",
                                fontWeight: "bold",
                                backgroundColor: "#007BFF",
                                padding: "3px 6px",
                                borderRadius: "5px",
                            },
                            animation: google.maps.Animation.DROP,
                        });
                        markers.push(marker);
                        console.log(`Marker created with fallback for ${activation.organization}`);
                        createInfoWindow(marker, activation, null);
                    };
                });
            }, error => {
                console.error("Error fetching activations for map:", error);
            });
        } else {
            // Hide map for non-admins
            document.querySelector(".map-container").style.display = "none";
        }

        // Fetch approved reports
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
                    console.log(`Report SubmittedBy: ${report.SubmittedBy}, Report Data:`, report);

                    if (role === "ABVN") {
                        const reportSubmittedBy = report.SubmittedBy ? report.SubmittedBy.toLowerCase() : "";
                        const currentUserEmail = userEmail ? userEmail.toLowerCase() : "";
                        if (reportSubmittedBy !== currentUserEmail) {
                            console.log(`Skipping report for ABVN - SubmittedBy (${report.SubmittedBy}) does not match user email (${userEmail})`);
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
            } else {
                console.log("No approved reports found.");
            }

            foodPacksEl.textContent = totalFoodPacks.toLocaleString();
            hotMealsEl.textContent = totalHotMeals.toLocaleString();
            waterLitersEl.textContent = totalWaterLiters.toLocaleString();
            volunteersEl.textContent = totalVolunteers.toLocaleString();
            amountRaisedEl.textContent = `₱${totalMonetaryDonations.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
            inKindDonationsEl.textContent = `₱${totalInKindDonations.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

            console.log(`Totals - Food Packs: ${totalFoodPacks}, Hot Meals: ${totalHotMeals}, Water Liters: ${totalWaterLiters}, Volunteers: ${totalVolunteers}, Monetary Donations: ${totalMonetaryDonations}, In-Kind Donations: ${totalInKindDonations}`);
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
    }, error => {
        console.error("Error fetching user data:", error);
        Swal.fire({
            icon: "error",
            title: "Error",
            text: "Failed to load user data. Please try again later.",
        });
    });
});

// Function to create the InfoWindow
function createInfoWindow(marker, activation, logoUrl) {
    const infowindow = new google.maps.InfoWindow({
        content: `
            <div class="bayanihan-infowindow" style="
                font-family: 'Arial', sans-serif;
                color: #333;
                padding: 15px;
                background: #FFFFFF;
                border-radius: 10px;
                box-shadow: 0 4px 8px rgba(0,0,0,0.2);
                max-width: 300px;
                border-top: 5px solid #FF69B4; /* Pink accent */
                animation: slideIn 0.3s ease-out;
            ">
                <h3 style="
                    margin: 0 0 10px;
                    color: #007BFF; /* Blue */
                    font-size: 18px;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                ">
                    ${logoUrl ? 
                        `<img src="${logoUrl}" alt="Bayanihan Logo" style="width: 24px; height: 24px;" />` : 
                        `<span style="font-size: 24px;">🌟</span>` // Fallback to star emoji if logo fails
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
        `,
    });
    marker.addListener("click", () => {
        infowindow.open(map, marker);
    });
}
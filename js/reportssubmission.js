// Global variables for map and markers
let map;
let markers = [];
let autocomplete;

document.addEventListener('DOMContentLoaded', () => {
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
    const database = firebase.database();
    const auth = firebase.auth();

    const formPage1 = document.getElementById('form-page-1');
    const formPage2 = document.getElementById('form-page-2');
    const nextBtn = document.getElementById('nextBtn');
    const backBtn = document.getElementById('backBtn');
    const areaOfOperationInput = document.getElementById('AreaOfOperation');

    if (!formPage1 || !formPage2 || !nextBtn || !backBtn || !areaOfOperationInput) {
        console.error("Form elements not found");
        return;
    }

    let userUid = null;
    let volunteerGroupName = "[Unknown Org]";

    // Check if user is logged in and fetch their UID and group name
    auth.onAuthStateChanged(user => {
        if (user) {
            userUid = user.uid;
            console.log('Logged-in user UID:', userUid);

            // Fetch user data from the database to get the volunteer group name
            database.ref(`users/${userUid}`).once('value', snapshot => {
                const userData = snapshot.val();
                if (userData && userData.group) {
                    volunteerGroupName = userData.group;
                    console.log('Volunteer group fetched from database:', volunteerGroupName);
                } else {
                    console.warn('User data or group not found in database for UID:', userUid);
                }
            }).catch(error => {
                console.error('Error fetching user data:', error);
            });
        } else {
            console.warn('No user is logged in');
            window.location.href = '../pages/login.html';
        }
    });

    // Auto-set today's date
    const dateInput = document.getElementById('dateOfReport');
    if (dateInput) {
        const today = new Date();
        const formatted = today.toLocaleDateString('en-CA');
        dateInput.value = formatted;
    }

    // Generate random report ID
    const idInput = document.getElementById('reportId');
    if (idInput) {
        const randomId = 'ABRN' + Math.floor(10000 + Math.random() * 9000000000);
        idInput.value = randomId;
    }

    // Map modal button logic
    const pinBtn = document.getElementById('pinBtn');
    const mapModal = document.getElementById('mapModal');
    const closeBtn = document.querySelector('.closeBtn');

    if (pinBtn && mapModal && closeBtn) {
        pinBtn.addEventListener('click', (e) => {
            e.preventDefault();
            mapModal.classList.add('show');
            // Initialize the map when the modal is opened (if not already initialized)
            if (!map) {
                initMap();
            }
        });

        closeBtn.addEventListener('click', () => {
            mapModal.classList.remove('show');
        });

        window.addEventListener('click', (e) => {
            if (e.target === mapModal) {
                mapModal.classList.remove('show');
            }
        });
    } else {
        console.warn('Modal elements not found');
    }

    const submittedByInput = document.getElementById('SubmittedBy');
    if (submittedByInput) {
        const volunteerGroup = JSON.parse(localStorage.getItem("loggedInVolunteerGroup"));
        const groupName = volunteerGroup ? volunteerGroup.organization : "Unknown Volunteer";
        submittedByInput.value = groupName;
        submittedByInput.readOnly = true;
    }

    // Handle navigation
    nextBtn.addEventListener('click', () => {
        if (!formPage1.checkValidity()) {
            formPage1.reportValidity(); 
            return; 
        }

        const startDateInput = document.getElementById('StartDate');
        const endDateInput = document.getElementById('EndDate');

        if (!startDateInput || !endDateInput) {
            console.error("StartDate or EndDate input not found. Cannot perform date validation.");
            return;
        }
        
        const startDateValue = startDateInput.value;
        const endDateValue = endDateInput.value;

        if (!startDateValue || !endDateValue) {
            alert("Please fill in both Start Date and End Date.");
            if (!startDateValue) {
                startDateInput.focus();
            } else {
                endDateInput.focus();
            }
            return;
        }

        const startDate = new Date(startDateValue + 'T00:00:00');
        const endDate = new Date(endDateValue + 'T00:00:00');
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const oneYearFromNow = new Date(today);
        oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);

        if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
            alert("Invalid date entered. Please use the date picker to select valid dates.");
            if (isNaN(startDate.getTime())) {
                startDateInput.focus();
            } else {
                endDateInput.focus();
            }
            return;
        }

        if (startDate > today) {
            alert("Start Date cannot be a future date.");
            startDateInput.focus();
            return;
        }

        if (startDate > endDate) {
            alert("Start Date cannot be after End Date.");
            startDateInput.focus();
            return;
        }

        if (endDate > oneYearFromNow) {
            alert("End Date cannot be more than 1 year from today. Please enter a valid date range.");
            endDateInput.focus();
            return;
        }

        formPage1.style.display = "none";
        formPage2.style.display = "block";
    });

    backBtn.addEventListener('click', () => {
        formPage2.style.display = "none";
        formPage1.style.display = "block";
    });

    // Submit
    formPage2.addEventListener("submit", function (e) {
        e.preventDefault();

        if (!userUid) {
            console.error('No user UID available. Cannot submit report.');
            alert('User not authenticated. Please log in again.');
            window.location.href = '../pages/login.html';
            return;
        }

        const startDateInput = document.querySelector('input[id="StartDate"]');
        const endDateInput = document.querySelector('input[id="EndDate"]');

        const formData = {
            VolunteerGroupName: volunteerGroupName,
            userUid,
            AreaOfOperation: document.querySelector('input[placeholder="e.g. Purok 2, Brgy. Maligaya, Rosario"]').value,
            TimeOfIntervention: document.querySelector('input[placeholder="Completion Time of Intervention"]')?.value || "N/A",
            DateOfReport: dateInput.value || "N/A",
            ReportID: idInput.value || "N/A",
            StartDate: startDateInput?.value || "N/A",
            EndDate: endDateInput?.value || "N/A",
            NoOfIndividualsOrFamilies: document.querySelector('input[placeholder="No. of Individuals or Families"]')?.value || "N/A",
            NoOfFoodPacks: document.querySelector('input[placeholder="No. of Food Packs"]')?.value || "N/A",
            NoOfHotMeals: document.querySelector('input[placeholder="No. of Hot Meals"]')?.value || "N/A",
            LitersOfWater: document.querySelector('input[placeholder="Liters of Water"]')?.value || "N/A",
            NoOfVolunteersMobilized: document.querySelector('input[placeholder="No. of Volunteers Mobilized"]')?.value || "N/A",
            NoOfOrganizationsActivated: document.querySelector('input[placeholder="No. of Organizations Activated"]')?.value || "N/A",
            TotalValueOfInKindDonations: document.querySelector('input[placeholder="Total Value of In-Kind Donations"]')?.value || "N/A",
            TotalMonetaryDonations: document.querySelector('input[placeholder="Total Monetary Donations"]')?.value || "N/A",
            NotesAdditionalInformation: document.querySelector('textarea')?.value || "N/A",
            Status: "Pending"
        };

        localStorage.setItem("reportData", JSON.stringify(formData));
        window.location.href = "../pages/reportsSummary.html";
    });

    // Handle returning from reportsSummary.html
    const returnTo = localStorage.getItem("returnToStep");

    if (returnTo === "form-container-1") {
        formPage1.style.display = "none";
        formPage2.style.display = "block";

        setTimeout(() => {
            const target = document.querySelector(".form-container-1");
            if (target) target.scrollIntoView({ behavior: "smooth" });
        }, 100);

        const savedData = JSON.parse(localStorage.getItem("reportData"));
        if (savedData) {
            document.querySelector('input[placeholder="e.g. Purok 2, Brgy. Maligaya, Rosario"]').value = savedData.AreaOfOperation || '';
            document.querySelector('input[placeholder="Time of Intervention"]').value = savedData.TimeOfIntervention || '';
            document.querySelector('input[type="date"]').value = savedData.Date || '';
            document.querySelector('input[placeholder="No. of Individuals or Families"]').value = savedData.NoOfIndividualsOrFamilies || '';
            document.querySelector('input[placeholder="No. of Food Packs"]').value = savedData.NoOfFoodPacks || '';
            document.querySelector('input[placeholder="No. of Hot Meals"]').value = savedData.NoOfHotMeals || '';
            document.querySelector('input[placeholder="Liters of Water"]').value = savedData.LitersOfWater || '';
            document.querySelector('input[placeholder="No. of Volunteers Mobilized"]').value = savedData.NoOfVolunteersMobilized || '';
            document.querySelector('input[placeholder="No. of Organizations Activated"]').value = savedData.NoOfOrganizationsActivated || '';
            document.querySelector('input[placeholder="Total Value of In-Kind Donations"]').value = savedData.TotalValueOfInKindDonations || '';
            document.querySelector('textarea').value = savedData.NotesAdditionalInformation || '';
        }

        localStorage.removeItem("returnToStep");
    } else {
        formPage1.style.display = "block";
        formPage2.style.display = "none";
    }
});

// Function to initialize Google Maps (adapted from dashboard.js)
function initMap() {
    // Default to Manila, Philippines
    const defaultLocation = { lat: 14.5995, lng: 120.9842 };

    // Initialize the map
    map = new google.maps.Map(document.getElementById("mapContainer"), {
        center: defaultLocation,
        zoom: 10,
        mapTypeId: "roadmap",
    });

    // Initialize the search bar with Places Autocomplete
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

        // Populate the AreaOfOperation input with the selected location
        const areaOfOperationInput = document.getElementById('AreaOfOperation');
        if (areaOfOperationInput) {
            areaOfOperationInput.value = place.formatted_address;
        }

        // Close the modal after selecting a location
        const mapModal = document.getElementById('mapModal');
        if (mapModal) {
            mapModal.classList.remove('show');
        }
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

        // Use Geocoder to get the address from the coordinates
        const geocoder = new google.maps.Geocoder();
        geocoder.geocode({ location: event.latLng }, (results, status) => {
            if (status === "OK" && results[0]) {
                const address = results[0].formatted_address;

                // Add an info window
                const infowindow = new google.maps.InfoWindow({
                    content: `Pinned Location<br>${address}`,
                });
                marker.addListener("click", () => {
                    infowindow.open(map, marker);
                });
                infowindow.open(map, marker);

                // Populate the AreaOfOperation input with the pinned location
                const areaOfOperationInput = document.getElementById('AreaOfOperation');
                if (areaOfOperationInput) {
                    areaOfOperationInput.value = address;
                }

                // Close the modal after pinning a location
                const mapModal = document.getElementById('mapModal');
                if (mapModal) {
                    mapModal.classList.remove('show');
                }
            } else {
                console.error("Geocoder failed due to: " + status);
                Swal.fire({
                    icon: "error",
                    title: "Geocoding Error",
                    text: "Unable to retrieve address for the pinned location.",
                });

                // Fallback: Use coordinates if geocoding fails
                const areaOfOperationInput = document.getElementById('AreaOfOperation');
                if (areaOfOperationInput) {
                    areaOfOperationInput.value = `Lat: ${event.latLng.lat()}, Lng: ${event.latLng.lng()}`;
                }

                const mapModal = document.getElementById('mapModal');
                if (mapModal) {
                    mapModal.classList.remove('show');
                }
            }
        });

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
                        url: "http://maps.google.com/mapfiles/ms/icons/blue-dot.png",
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
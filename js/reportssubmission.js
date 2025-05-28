import { initializeApp } from 'firebase/app';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { getDatabase, ref, get, set, update, query, orderByChild, equalTo } from 'firebase/database'; // Added query, orderByChild, equalTo

// Global variables for map and markers
let map;
let markers = [];
let autocomplete;

document.addEventListener('DOMContentLoaded', () => {
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

    const app = initializeApp(firebaseConfig);
    const auth = getAuth(app);
    const database = getDatabase(app);

    const formPage1 = document.getElementById('form-page-1');
    const formPage2 = document.getElementById('form-page-2');
    const nextBtn = document.getElementById('nextBtn');
    const backBtn = document.getElementById('backBtn');
    const submitReportBtn = document.getElementById('submitReportBtn'); // Added for page 2 submit

    const reportIdInput = document.getElementById('reportId');
    const dateOfReportInput = document.getElementById('dateOfReport');
    const areaOfOperationInput = document.getElementById('AreaOfOperation');
    const calamityAreaDropdown = document.getElementById('calamityAreaDropdown');
    const completionTimeInput = document.getElementById('completionTime');
    const startDateInput = document.getElementById('StartDate');
    const endDateInput = document.getElementById('EndDate');
    const numIndividualsFamiliesInput = document.getElementById('numIndividualsFamilies');
    const numFoodPacksInput = document.getElementById('numFoodPacks');
    const numHotMealsInput = document.getElementById('numHotMeals');
    const litersWaterInput = document.getElementById('litersWater');
    const numVolunteersInput = document.getElementById('numVolunteers');
    const numOrganizationsInput = document.getElementById('numOrganizations');
    const valueInKindInput = document.getElementById('valueInKind');
    const monetaryDonationsInput = document.getElementById('monetaryDonations');
    const notesInfoTextarea = document.getElementById('notesInfo');
    const submittedByInput = document.getElementById('SubmittedBy'); // Uncommented

    const pinBtn = document.getElementById('pinBtn');
    const mapModal = document.getElementById('mapModal');
    const closeBtn = document.querySelector('.closeBtn');

    let userUid = null;
    let volunteerGroupName = "[Unknown Org]"; // Default to Unknown Org
    let activeActivations = []; // To store active operations for the dropdown
    let userDisplayName = "Anonymous"; // To store user's display name

    function populateCalamityAreaDropdown() {
        calamityAreaDropdown.innerHTML = '<option value="">-- Select an Active Operation --</option>';
        activeActivations.forEach(activation => {
            const option = document.createElement("option");
            option.value = activation.id;

            let displayCalamity = activation.calamityType;
            if (activation.calamityType === "Typhoon" && activation.typhoonName) {
                displayCalamity += ` (${activation.typhoonName})`;
            }
            option.textContent = `${displayCalamity} (by ${activation.organization})`;
            calamityAreaDropdown.appendChild(option);
        });

        const savedData = JSON.parse(localStorage.getItem("reportData"));
        if (savedData && savedData.CalamityAreaId) {
            calamityAreaDropdown.value = savedData.CalamityAreaId;
            if (calamityAreaDropdown.value) {
                calamityAreaDropdown.dispatchEvent(new Event('change'));
            }
        }
    }

    calamityAreaDropdown.addEventListener('change', () => {
        const selectedActivationId = calamityAreaDropdown.value;

        if (selectedActivationId === "") {
            areaOfOperationInput.value = "";
            areaOfOperationInput.readOnly = false;
            pinBtn.style.display = 'inline-block';
        } else {
            const selectedActivation = activeActivations.find(
                (activation) => activation.id === selectedActivationId
            );

            if (selectedActivation) {
                // Keep areaOfOperation editable and pin button visible even if an activation is selected
                areaOfOperationInput.readOnly = false;
                pinBtn.style.display = 'inline-block';
            } else {
                console.warn("Selected activation not found in activeActivations array.");
                areaOfOperationInput.value = "";
                areaOfOperationInput.readOnly = false;
                pinBtn.style.display = 'inline-block';
            }
        }
    });

    onAuthStateChanged(auth, user => { // Changed to onAuthStateChanged for better reactivity
        if (user) {
            userUid = user.uid;
            userDisplayName = user.displayName || user.email || "Anonymous"; // Get user's display name
            submittedByInput.value = userDisplayName; // Populate SubmittedBy field
            console.log('Logged-in user UID:', userUid);
            console.log('Logged-in user Display Name:', userDisplayName);

            get(ref(database, `users/${userUid}`))
            .then(snapshot => {
                const userData = snapshot.val();
                if (userData && userData.group) {
                    volunteerGroupName = userData.group;
                    console.log('Volunteer group fetched from database for filtering:', volunteerGroupName);
                } else {
                    console.warn('User data or group not found in database for UID:', userUid);
                }

                let activationsRef = ref(database, "activations");
                // Fetch all active activations, then filter by group
                get(query(activationsRef, orderByChild("status"), equalTo("active")))
                    .then(snapshot => {
                        activeActivations = [];
                        snapshot.forEach(childSnapshot => {
                            const activation = { id: childSnapshot.key, ...childSnapshot.val() };
                            // Filter activations by the user's volunteer group, if known
                            if (volunteerGroupName && volunteerGroupName !== "[Unknown Org]") {
                                if (activation.organization === volunteerGroupName) {
                                    activeActivations.push(activation);
                                }
                            } else {
                                activeActivations.push(activation); // Show all if no specific group or unknown
                            }
                        });
                        populateCalamityAreaDropdown();
                    })
                    .catch(error => {
                        console.error("Error fetching active activations:", error);
                        Swal.fire({
                            icon: 'error',
                            title: 'Error',
                            text: 'Failed to load active operations. Please try again.'
                        });
                    });
            })
            .catch(error => {
                console.error('Error fetching user data:', error);
                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: 'Failed to fetch user group. Please try again.'
                });
            });

        } else {
            console.warn('No user is logged in. Redirecting to login page.');
            Swal.fire({
                icon: 'warning',
                title: 'Not Logged In',
                text: 'You need to be logged in to submit a report. Redirecting to login page.'
            }).then(() => {
                window.location.href = '../pages/login.html';
            });
        }
    });

    const today = new Date();
    const formattedDate = today.toLocaleDateString('en-CA'); //YYYY-MM-DD
    dateOfReportInput.value = formattedDate;

    // Generate random report ID
    const idInput = document.getElementById('reportId');
    if (idInput) {
        const randomId = 'ABRN' + Math.floor(1000000000 + Math.random() * 9000000000); // Ensures a 10-digit number after "ABRN"
        idInput.value = randomId;
    }

    if (pinBtn && mapModal && closeBtn) {
        pinBtn.addEventListener('click', (e) => {
            e.preventDefault();
            console.log("Pin button clicked!");
            mapModal.classList.add('show');
            console.log("mapModal classList:", mapModal.classList);
            // Initialize the map when the modal is opened (if not already initialized)
            if (!map) {
                initMap();
            } else {
                // If map already exists, just resize it to fit the modal
                setTimeout(() => {
                    if (map) {
                        google.maps.event.trigger(map, 'resize');
                        // Center map to current area of operation if available
                        const currentArea = areaOfOperationInput.value;
                        if (currentArea) {
                            const geocoder = new google.maps.Geocoder();
                            geocoder.geocode({ 'address': currentArea }, (results, status) => {
                                if (status === 'OK' && results[0]) {
                                    map.setCenter(results[0].geometry.location);
                                    // Clear existing markers and add a new one for the current area
                                    markers.forEach((marker) => marker.setMap(null));
                                    markers = [];
                                    const marker = new google.maps.Marker({
                                        map: map,
                                        position: results[0].geometry.location,
                                        title: currentArea,
                                    });
                                    markers.push(marker);
                                }
                            });
                        } else {
                            // If no area of operation, center on Philippines
                            map.setCenter({ lat: 12.8797, lng: 121.7740 });
                            map.setZoom(6);
                        }
                    }
                }, 100); // Small delay to allow modal to render
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
        console.warn('Modal elements (pinBtn, mapModal, closeBtn) not found. Map functionality may be impaired.');
    }

    nextBtn.addEventListener('click', () => {
        if (!formPage1.checkValidity()) {
            formPage1.reportValidity();
            return;
        }

        const startDateValue = startDateInput.value;
        const endDateValue = endDateInput.value;

        if (!startDateValue || !endDateValue) {
            Swal.fire({
                icon: 'warning',
                title: 'Missing Dates',
                text: 'Please fill in both Start Date and End Date.'
            });
            if (!startDateValue) {
                startDateInput.focus();
            } else {
                endDateInput.focus();
            }
            return;
        }

        const startDate = new Date(startDateValue + 'T00:00:00');
        const endDate = new Date(endDateValue + 'T00:00:00');
        const todayAtMidnight = new Date();
        todayAtMidnight.setHours(0, 0, 0, 0);
        const oneYearFromToday = new Date(todayAtMidnight);
        oneYearFromToday.setFullYear(oneYearFromToday.getFullYear() + 1);

        if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
            Swal.fire({
                icon: 'error',
                title: 'Invalid Date',
                text: 'Invalid date entered. Please use the date picker to select valid dates.'
            });
            if (isNaN(startDate.getTime())) startDateInput.focus();
            else endDateInput.focus();
            return;
        }

        if (startDate > todayAtMidnight) {
            Swal.fire({
                icon: 'warning',
                title: 'Future Start Date',
                text: 'Start Date cannot be a future date.'
            });
            startDateInput.focus();
            return;
        }

        if (startDate > endDate) {
            Swal.fire({
                icon: 'warning',
                title: 'Date Order Error',
                text: 'Start Date cannot be after End Date.'
            });
            startDateInput.focus();
            return;
        }

        if (endDate > oneYearFromToday) {
            Swal.fire({
                icon: 'warning',
                title: 'Excessive End Date',
                text: 'End Date cannot be more than 1 year from today. Please enter a valid date range.'
            });
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

    submitReportBtn.addEventListener("click", async function (e) { // Changed to async function for Firebase write
        e.preventDefault();

        // Perform validation for formPage2 fields here before saving
        // For example, assuming all number inputs have 'required' and 'min="0"' attributes
        if (!numIndividualsFamiliesInput.checkValidity() ||
            !numFoodPacksInput.checkValidity() ||
            !numHotMealsInput.checkValidity() ||
            !litersWaterInput.checkValidity() ||
            !numVolunteersInput.checkValidity() ||
            !numOrganizationsInput.checkValidity() ||
            !valueInKindInput.checkValidity() ||
            !monetaryDonationsInput.checkValidity()
        ) {
            Swal.fire({
                icon: 'error',
                title: 'Validation Error',
                text: 'Please ensure all numerical fields are filled correctly.'
            });
            // You might want to scroll to the first invalid field or highlight them
            return;
        }


        if (!userUid) {
            console.error('No user UID available. Cannot submit report.');
            Swal.fire({
                icon: 'error',
                title: 'Authentication Error',
                text: 'User not authenticated. Please log in again.'
            }).then(() => {
                window.location.href = '../pages/login.html';
            });
            return;
        }

        Swal.fire({
            title: 'Submitting Report...',
            text: 'Please wait.',
            allowOutsideClick: false,
            didOpen: () => {
                Swal.showLoading();
            }
        });

        const formData = {
            userUid: userUid,
            SubmittedBy: userDisplayName, // Populated from authenticated user
            VolunteerGroupName: volunteerGroupName, // Populated from user's data
            AreaOfOperation: areaOfOperationInput.value,
            CalamityAreaId: calamityAreaDropdown.value,
            TimeOfIntervention: completionTimeInput.value,
            DateOfReport: dateOfReportInput.value,
            ReportID: reportIdInput.value,
            StartDate: startDateInput.value,
            EndDate: endDateInput.value,
            NoOfIndividualsOrFamilies: parseInt(numIndividualsFamiliesInput.value) || 0, // Parse to integer, default to 0
            NoOfFoodPacks: parseInt(numFoodPacksInput.value) || 0,
            NoOfHotMeals: parseInt(numHotMealsInput.value) || 0,
            LitersOfWater: parseFloat(litersWaterInput.value) || 0, // Parse to float
            NoOfVolunteersMobilized: parseInt(numVolunteersInput.value) || 0,
            NoOfOrganizationsActivated: parseInt(numOrganizationsInput.value) || 0,
            TotalValueOfInKindDonations: parseFloat(valueInKindInput.value) || 0,
            TotalMonetaryDonations: parseFloat(monetaryDonationsInput.value) || 0,
            NotesAdditionalInformation: notesInfoTextarea.value,
            Status: "Pending", // Default status
            Timestamp: new Date().toISOString() // Add submission timestamp
        };

        try {
            // Write data to Firebase Realtime Database under 'reports' node
            // Using set with the ReportID as the key
            await set(ref(database, `reports/${formData.ReportID}`), formData);

            Swal.fire({
                icon: 'success',
                title: 'Report Submitted!',
                text: 'Your report has been successfully submitted.',
                showConfirmButton: false,
                timer: 2000
            }).then(() => {
                localStorage.removeItem("reportData"); // Clear saved data on successful submission
                window.location.href = "../pages/reportsSummary.html";
            });

        } catch (error) {
            console.error("Error submitting report to Firebase:", error);
            Swal.fire({
                icon: 'error',
                title: 'Submission Failed',
                text: 'There was an error submitting your report. Please try again. ' + error.message
            });
        }
    });


    // Logic to load data if returning from reportsSummary.html
    const returnTo = localStorage.getItem("returnToStep");

    if (returnTo === "form-container-1") { // Adjusted to match the key set in the summary page if returning
        formPage1.style.display = "block";
        formPage2.style.display = "none";

        const savedData = JSON.parse(localStorage.getItem("reportData"));
        if (savedData) {
            areaOfOperationInput.value = savedData.AreaOfOperation || '';
            if (savedData.CalamityAreaId) {
                calamityAreaDropdown.value = savedData.CalamityAreaId;
                if (calamityAreaDropdown.value) {
                    calamityAreaDropdown.dispatchEvent(new Event('change'));
                }
            }
            completionTimeInput.value = savedData.TimeOfIntervention || '';
            dateOfReportInput.value = savedData.DateOfReport || '';
            reportIdInput.value = savedData.ReportID || '';
            startDateInput.value = savedData.StartDate || '';
            endDateInput.value = savedData.EndDate || '';
            numIndividualsFamiliesInput.value = savedData.NoOfIndividualsOrFamilies || '';
            numFoodPacksInput.value = savedData.NoOfFoodPacks || '';
            numHotMealsInput.value = savedData.NoOfHotMeals || '';
            litersWaterInput.value = savedData.LitersOfWater || '';
            numVolunteersInput.value = savedData.NoOfVolunteersMobilized || '';
            numOrganizationsInput.value = savedData.NoOfOrganizationsActivated || '';
            valueInKindInput.value = savedData.TotalValueOfInKindDonations || '';
            monetaryDonationsInput.value = savedData.TotalMonetaryDonations || '';
            notesInfoTextarea.value = savedData.NotesAdditionalInformation || '';
            submittedByInput.value = savedData.SubmittedBy || userDisplayName; // Load or use current user's display name
        }

        localStorage.removeItem("returnToStep"); // Clear the flag after loading
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

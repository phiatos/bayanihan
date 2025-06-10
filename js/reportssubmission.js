// Global variables for map and markers
let map;
let markers = [];
let autocomplete;

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
                        url: "http://maps.google.com/mapfiles/ms/icons/blue-dot.png", // A more common blue dot icon
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
        confirmButtonText: 'Stay Login',
        cancelButtonText: 'Log Out',
        allowOutsideClick: false,
        reverseButtons: true
    }).then((result) => {
        if (result.isConfirmed) {
            resetInactivityTimer(); // User chose to continue, reset the timer
            console.log("User chose to continue session.");
        } else if (result.dismiss === Swal.DismissReason.cancel) {
            // User chose to log out
            auth.signOut().then(() => {
                console.log("User logged out due to inactivity.");
                window.location.href = "../pages/login.html"; // Redirect to login page
            }).catch((error) => {
                console.error("Error logging out:", error);
                Swal.fire('Error', 'Failed to log out. Please try again.', 'error');
            });
        }
    });
}

// Function to clear all markers from the map
function clearMarkers() {
    markers.forEach(marker => marker.setMap(null));
    markers = [];
}

document.addEventListener('DOMContentLoaded', () => {
    // Firebase configuration (should only be initialized once per app)
    const firebaseConfig = {
        apiKey: "AIzaSyDJxMv8GCaMvQT2QBW3CdzA3dV5X_T2KqQ", // Replace with your actual API Key
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

    // Get references to form elements
    const formPage1 = document.getElementById('form-page-1');
    const formPage2 = document.getElementById('form-page-2');
    const nextBtn = document.getElementById('nextBtn');
    const backBtn = document.getElementById('backBtn');

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
    // const submittedByInput = document.getElementById('SubmittedBy'); // Keep commented out if you don't want to use it

    // Map modal elements (assuming these exist in your HTML)
    const pinBtn = document.getElementById('pinBtn'); // Ensure this element exists
    const mapModal = document.getElementById('mapModal'); // Ensure this element exists
    const closeBtn = document.querySelector('.closeBtn'); // Reverted to querySelector for flexibility as in first version

    // Basic check for essential elements for debugging
    if (!formPage1 || !formPage2 || !nextBtn || !backBtn || !reportIdInput || !dateOfReportInput || !areaOfOperationInput || !calamityAreaDropdown || !completionTimeInput || !startDateInput || !endDateInput || !numIndividualsFamiliesInput || !numFoodPacksInput || !numHotMealsInput || !litersWaterInput || !numVolunteersInput || !numOrganizationsInput || !valueInKindInput || !monetaryDonationsInput || !notesInfoTextarea) {
        console.error("One or more essential form elements not found. Please check HTML IDs.");
        // Consider stopping execution or showing a user-friendly error message here
        return;
    }

    let userUid = null;
    let volunteerGroupName = "[Unknown Org]"; // Default to Unknown Org
    let activeActivations = []; // To store active operations for the dropdown

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

        // This part remains to attempt to pre-select after population
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
            areaOfOperationInput.readOnly = false; // Allow manual input if no operation is selected
        } else {
            const selectedActivation = activeActivations.find(
                (activation) => activation.id === selectedActivationId
            );

            if (selectedActivation) {
                // areaOfOperationInput.value = selectedActivation.areaOfOperation || ""; // You had this commented out
                areaOfOperationInput.readOnly = false; // Still allow manual pin even if an operation is selected
            } else {
                console.warn("Selected activation not found in activeActivations array.");
                areaOfOperationInput.value = "";
                areaOfOperationInput.readOnly = false;
            }
        }
        // Ensure pinBtn is always visible regardless of selection
        if (pinBtn) pinBtn.style.display = 'inline-block';
    });

    // auth.onAuthStateChanged(user => {
    //     if (user) {
    //         userUid = user.uid;
    //         console.log('Logged-in user UID:', userUid);

    //         database.ref(`users/${userUid}`).once('value', snapshot => {
    //             const userData = snapshot.val();
    //             if (userData && userData.group) {
    //                 volunteerGroupName = userData.group;
    //                 console.log('Volunteer group fetched from database for filtering:', volunteerGroupName);
    //             } else {
    //                 console.warn('User data or group not found in database for UID:', userUid);
    //             }

    //             let activationsQuery = database.ref("activations").orderByChild("status").equalTo("active");

    //             if (volunteerGroupName && volunteerGroupName !== "[Unknown Org]") {
    //                 console.log(`Filtering activations for group: ${volunteerGroupName}`);
    //                 activationsQuery.on("value", snapshot => {
    //                     activeActivations = [];
    //                     snapshot.forEach(childSnapshot => {
    //                         const activation = { id: childSnapshot.key, ...childSnapshot.val() };
    //                         if (activation.organization === volunteerGroupName) { // THIS IS THE FILTERING LOGIC
    //                             activeActivations.push(activation);
    //                         }
    //                     });
    //                     populateCalamityAreaDropdown();
    //                 }, error => {
    //                     console.error("Error listening for active activations with group filter:", error);
    //                     Swal.fire({
    //                         icon: 'error',
    //                         title: 'Error',
    //                         text: 'Failed to load active operations. Please try again.'
    //                     });
    //                 });
    //             } else {
    //                 console.log("Showing all active activations (Unknown Org or no group).");
    //                 activationsQuery.on("value", snapshot => {
    //                     activeActivations = [];
    //                     snapshot.forEach(childSnapshot => {
    //                         activeActivations.push({ id: childSnapshot.key, ...childSnapshot.val() });
    //                     });
    //                     populateCalamityAreaDropdown();
    //                 }, error => {
    //                     console.error("Error listening for all active activations:", error);
    //                     Swal.fire({
    //                         icon: 'error',
    //                         title: 'Error',
    //                         text: 'Failed to load active operations. Please try again.'
    //                     });
    //                 });
    //             }
    //         }).catch(error => {
    //             console.error('Error fetching user data:', error);
    //             Swal.fire({
    //                 icon: 'error',
    //                 title: 'Error',
    //                 text: 'Failed to fetch user group. Please try again.'
    //             });
    //         });

    //     } else {
    //         console.warn('No user is logged in');
    //         window.location.href = '../pages/login.html';
    //     }
    // });
    // --- onAuthStateChanged with Password Reset Logic ---
    auth.onAuthStateChanged(async user => {
        if (user) {
            userUid = user.uid;
            console.log('Logged-in user UID:', userUid);

            database.ref(`users/${userUid}`).once('value', snapshot => {
                const userData = snapshot.val();
                if (!userData) {
                    console.warn('User data not found in database for UID:', userUid);
                    Swal.fire({
                        icon: 'error',
                        title: 'User Data Missing',
                        text: 'Your user profile is incomplete. Please contact an administrator.',
                    }).then(() => {
                        window.location.href = '../pages/login.html';
                    });
                    resetInactivityTimer();
                    return;
                }

                // IMPORTANT: PASSWORD RESET CHECK
                const passwordNeedsReset = userData.password_needs_reset || false;
                const profilePage = 'profile.html'; // Assuming profile.html is in the same 'pages' directory

                if (passwordNeedsReset) {
                    console.log("Password change required. Redirecting to profile page.");
                    Swal.fire({
                        icon: 'info',
                        title: 'Password Change Required',
                        text: 'For security reasons, please change your password. You will be redirected to your profile.',
                        allowOutsideClick: false,
                        allowEscapeKey: false,
                        showConfirmButton: false,
                        timer: 2000,
                        timerProgressBar: true
                    }).then(() => {
                        window.location.replace(`../pages/${profilePage}`);
                    });
                    return; // Stop further execution if password reset is required
                }
                // END OF PASSWORD RESET CHECK

                if (userData.group) {
                    volunteerGroupName = userData.group;
                    console.log('Volunteer group fetched from database for filtering:', volunteerGroupName);
                } else {
                    console.warn('Volunteer group not found for UID:', userUid);
                }

                let activationsQuery = database.ref("activations").orderByChild("status").equalTo("active");

                if (volunteerGroupName && volunteerGroupName !== "[Unknown Org]") {
                    console.log(`Filtering activations for group: ${volunteerGroupName}`);
                    activationsQuery.on("value", snapshot => {
                        activeActivations = [];
                        snapshot.forEach(childSnapshot => {
                            const activation = { id: childSnapshot.key, ...childSnapshot.val() };
                            if (activation.organization === volunteerGroupName) { // THIS IS THE FILTERING LOGIC
                                activeActivations.push(activation);
                            }
                        });
                        populateCalamityAreaDropdown();
                    }, error => {
                        console.error("Error listening for active activations with group filter:", error);
                        Swal.fire({
                            icon: 'error',
                            title: 'Error',
                            text: 'Failed to load active operations. Please try again.'
                        });
                    });
                } else {
                    console.log("Showing all active activations (Unknown Org or no group).");
                    activationsQuery.on("value", snapshot => {
                        activeActivations = [];
                        snapshot.forEach(childSnapshot => {
                            activeActivations.push({ id: childSnapshot.key, ...childSnapshot.val() });
                        });
                        populateCalamityAreaDropdown();
                    }, error => {
                        console.error("Error listening for all active activations:", error);
                        Swal.fire({
                            icon: 'error',
                            title: 'Error',
                            text: 'Failed to load active operations. Please try again.'
                        });
                    });
                }
            }).catch(error => {
                console.error('Error fetching user data:', error);
                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: 'Failed to fetch user group. Please try again.'
                });
            });

        } else {
            console.warn('No user is logged in');
            Swal.fire({
                icon: 'error',
                title: 'Authentication Required',
                text: 'Please log in to submit a report.',
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
        const randomId = 'REPORTS' + Math.floor(10000 + Math.random() * 9000000000);
        idInput.value = randomId;
    }

    // --- Modal Elements and Event Listeners ---
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
        console.log("Next button clicked!"); // Debugging line
        // Form validation on page 1
        if (!formPage1.checkValidity()) {
            // console.log("Form page 1 is NOT valid. Showing validation messages."); // Debugging line
            formPage1.reportValidity();
            return; // Stop if validation fails
        }
        // console.log("Form page 1 is valid."); // Debugging line

        const startDateValue = startDateInput.value;
        const endDateValue = endDateInput.value;

        // console.log("Start Date:", startDateValue, "End Date:", endDateValue); // Debugging line

        if (!startDateValue || !endDateValue) {
            // console.log("Start or End Date is missing."); // Debugging line
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
        const today = new Date();
        today.setHours(0, 0, 0, 0); // Set to start of day for comparison
        const oneYearFromNow = new Date(today);
        oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);

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

        if (startDate > today) { // Changed to today for accurate comparison (start of day)
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

        if (endDate > oneYearFromNow) {
            Swal.fire({
                icon: 'warning',
                title: 'Excessive End Date',
                text: 'End Date cannot be more than 1 year from today. Please enter a valid date range.'
            });
            endDateInput.focus();
            return;
        }

        // --- Start of NEW logic to capture combined Calamity Area details ---
        let selectedCalamityName = "";
        let selectedCalamityOrganization = "";
        let selectedCalamityTyphoonName = "";
        let calamityAreaDetailsText = "";

        const selectedActivationId = calamityAreaDropdown.value;
        if (selectedActivationId) {
            const selectedActivation = activeActivations.find(
                (activation) => activation.id === selectedActivationId
            );
            if (selectedActivation) {
                selectedCalamityName = selectedActivation.calamityType;
                selectedCalamityOrganization = selectedActivation.organization;
                selectedCalamityTyphoonName = selectedActivation.typhoonName || "";

                calamityAreaDetailsText = selectedCalamityName;
                if (selectedCalamityTyphoonName) {
                    calamityAreaDetailsText += ` (${selectedCalamityTyphoonName})`;
                }
                if (selectedCalamityOrganization) {
                    calamityAreaDetailsText += ` (by ${selectedCalamityOrganization})`;
                }
            } else {
                console.warn("Calamity Area ID found but no matching activation data.");
                calamityAreaDetailsText = `ID: ${selectedActivationId} (Details Missing)`;
            }
        } else {
            console.warn("No Calamity Area selected.");
            calamityAreaDetailsText = "Not Specified";
        }
        // --- End of NEW logic ---

        // ONLY save data from form-page-1 when 'next' is clicked
        const formData = {
            userUid: userUid,
            VolunteerGroupName: volunteerGroupName,
            AreaOfOperation: areaOfOperationInput.value,
            CalamityAreaId: calamityAreaDropdown.value,
            CalamityName: selectedCalamityName,
            CalamityAreaDetails: calamityAreaDetailsText,
            TimeOfIntervention: completionTimeInput.value,
            DateOfReport: dateOfReportInput.value,
            ReportID: reportIdInput.value,
            StartDate: startDateInput.value,
            EndDate: endDateInput.value,
            // NotesAdditionalInformation is NOT on this page, so don't save it here yet
        };
        localStorage.setItem("reportData", JSON.stringify(formData));
        console.log("Form data (Page 1) saved to localStorage:", formData); // Debugging line

        formPage1.style.display = "none";
        formPage2.style.display = "block";
    });

    backBtn.addEventListener('click', () => {
        formPage2.style.display = "none";
        formPage1.style.display = "block";
    });

    // THIS IS WHERE ALL FINAL DATA SHOULD BE GATHERED AND SAVED/SUBMITTED
    formPage2.addEventListener("submit", function (e) {
        e.preventDefault();

        // Retrieve existing data from localStorage (from page 1)
        const savedData = JSON.parse(localStorage.getItem("reportData")) || {};

        // Add data from page 2 to the savedData object
        savedData.NoOfIndividualsOrFamilies = numIndividualsFamiliesInput.value;
        savedData.NoOfFoodPacks = numFoodPacksInput.value;
        savedData.NoOfHotMeals = numHotMealsInput.value;
        savedData.LitersOfWater = litersWaterInput.value;
        savedData.NoOfVolunteersMobilized = numVolunteersInput.value;
        savedData.NoOfOrganizationsActivated = numOrganizationsInput.value;
        savedData.TotalValueOfInKindDonations = valueInKindInput.value;
        savedData.TotalMonetaryDonations = monetaryDonationsInput.value;
        savedData.NotesAdditionalInformation = notesInfoTextarea.value; // <--- CAPTURE HERE
        savedData.Status = "Pending"; // Ensure status is set on final submission

        // Save the complete data back to localStorage
        localStorage.setItem("reportData", JSON.stringify(savedData));
        console.log("Full form data saved to localStorage on Page 2 submit:", savedData);

        // Then redirect
        window.location.href = "../pages/reportsSummary.html";
    });

    // Logic for returning from summary page (pre-filling fields)
    const returnTo = localStorage.getItem("returnToStep");

    if (returnTo) {
        const savedData = JSON.parse(localStorage.getItem("reportData"));

        if (savedData) {
            // Pre-fill fields from savedData
            reportIdInput.value = savedData.ReportID || '';
            dateOfReportInput.value = savedData.DateOfReport || '';
            areaOfOperationInput.value = savedData.AreaOfOperation || '';

            // Handle Calamity Area dropdown pre-selection and triggering change
            if (savedData.CalamityAreaId) {
                calamityAreaDropdown.value = savedData.CalamityAreaId;
                // Dispatch change event to ensure dependent logic runs
                calamityAreaDropdown.dispatchEvent(new Event('change'));
            }

            completionTimeInput.value = savedData.TimeOfIntervention || '';
            startDateInput.value = savedData.StartDate || '';
            endDateInput.value = savedData.EndDate || '';

            // Ensure these fields are also pre-filled if data exists for page 2
            numIndividualsFamiliesInput.value = savedData.NoOfIndividualsOrFamilies || '';
            numFoodPacksInput.value = savedData.NoOfFoodPacks || '';
            numHotMealsInput.value = savedData.NoOfHotMeals || '';
            litersWaterInput.value = savedData.LitersOfWater || '';
            numVolunteersInput.value = savedData.NoOfVolunteersMobilized || '';
            numOrganizationsInput.value = savedData.NoOfOrganizationsActivated || '';
            valueInKindInput.value = savedData.TotalValueOfInKindDonations || '';
            monetaryDonationsInput.value = savedData.TotalMonetaryDonations || '';
            notesInfoTextarea.value = savedData.NotesAdditionalInformation || ''; // This line is correct for pre-filling
        }

        // Determine which page to show on return
        if (returnTo === "form-container-1") {
            formPage1.style.display = "block";
            formPage2.style.display = "none";
        } else if (returnTo === "form-container-2") {
            formPage1.style.display = "none";
            formPage2.style.display = "block";
        }
        localStorage.removeItem("returnToStep"); // Clear the flag after processing
    } else {
        // Default: If no returnToStep flag, show the first page
        formPage1.style.display = "block";
        formPage2.style.display = "none";
    }
}); 
// Global variables for map and markers
let map;
let markers = [];
let autocomplete;

// Function to initialize Google Maps
function initMap() {
    const defaultLocation = { lat: 14.5995, lng: 120.9842 }; // Manila, Philippines

    map = new google.maps.Map(document.getElementById("mapContainer"), {
        center: defaultLocation,
        zoom: 10,
        mapTypeId: "roadmap",
    });

    const searchInput = document.getElementById("search-input");
    autocomplete = new google.maps.places.Autocomplete(searchInput);
    autocomplete.bindTo("bounds", map);

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

        map.setCenter(place.geometry.location);
        map.setZoom(16);

        clearMarkers();

        const marker = new google.maps.Marker({
            position: place.geometry.location,
            map: map,
            title: place.name,
        });
        markers.push(marker);

        const infowindow = new google.maps.InfoWindow({
            content: `<strong>${place.name}</strong><br>${place.formatted_address}`,
        });
        marker.addListener("click", () => {
            infowindow.open(map, marker);
        });
        infowindow.open(map, marker);

        const areaOfOperationInput = document.getElementById('AreaOfOperation');
        if (areaOfOperationInput) {
            areaOfOperationInput.value = place.formatted_address;
        }

        const mapModal = document.getElementById('mapModal');
        if (mapModal) {
            mapModal.classList.remove('show');
        }
    });

    map.addListener("click", (event) => {
        clearMarkers();

        const marker = new google.maps.Marker({
            position: event.latLng,
            map: map,
            title: "Pinned Location",
        });
        markers.push(marker);

        const geocoder = new google.maps.Geocoder();
        geocoder.geocode({ location: event.latLng }, (results, status) => {
            if (status === "OK" && results[0]) {
                const address = results[0].formatted_address;

                const infowindow = new google.maps.InfoWindow({
                    content: `Pinned Location<br>${address}`,
                });
                marker.addListener("click", () => {
                    infowindow.open(map, marker);
                });
                infowindow.open(map, marker);

                const areaOfOperationInput = document.getElementById('AreaOfOperation');
                if (areaOfOperationInput) {
                    areaOfOperationInput.value = address;
                }

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

        map.setCenter(event.latLng);
        map.setZoom(16);
    });

    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const userLocation = {
                    lat: position.coords.latitude,
                    lng: position.coords.longitude,
                };

                map.setCenter(userLocation);
                map.setZoom(16);

                const marker = new google.maps.Marker({
                    position: userLocation,
                    map: map,
                    title: "You are here",
                    icon: {
                        url: "http://maps.google.com/mapfiles/ms/icons/blue-dot.png",
                    },
                });
                markers.push(marker);

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

function clearMarkers() {
    markers.forEach(marker => marker.setMap(null));
    markers = [];
}

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

    if (!firebase.apps.length) {
        firebase.initializeApp(firebaseConfig);
    }
    const auth = firebase.auth();
    const database = firebase.database();

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

    const pinBtn = document.getElementById('pinBtn');
    const mapModal = document.getElementById('mapModal');
    const closeBtn = document.querySelector('.closeBtn');

    if (!formPage1 || !formPage2 || !nextBtn || !backBtn || !reportIdInput || !dateOfReportInput || !areaOfOperationInput || !calamityAreaDropdown || !completionTimeInput || !startDateInput || !endDateInput || !numIndividualsFamiliesInput || !numFoodPacksInput || !numHotMealsInput || !litersWaterInput || !numVolunteersInput || !numOrganizationsInput || !valueInKindInput || !monetaryDonationsInput || !notesInfoTextarea) {
        console.error("One or more essential form elements not found. Please check HTML IDs.");
        return;
    }

    let userUid = null;
    let volunteerGroupName = "[Unknown Org]";
    let activeActivations = [];

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
        } else {
            const selectedActivation = activeActivations.find(
                (activation) => activation.id === selectedActivationId
            );

            if (selectedActivation) {
                areaOfOperationInput.readOnly = false;
            } else {
                console.warn("Selected activation not found in activeActivations array.");
                areaOfOperationInput.value = "";
                areaOfOperationInput.readOnly = false;
            }
        }
        if (pinBtn) pinBtn.style.display = 'inline-block';
    });

    auth.onAuthStateChanged(user => {
        if (user) {
            userUid = user.uid;
            console.log('Logged-in user UID:', userUid);

            database.ref(`users/${userUid}`).once('value', snapshot => {
                const userData = snapshot.val();
                if (userData && userData.organization) {
                    volunteerGroupName = userData.organization;
                    console.log('Volunteer group fetched from database for filtering:', volunteerGroupName);
                } else {
                    console.warn('User data or group not found in database for UID:', userUid);
                }

                let activationsQuery = database.ref("activations").orderByChild("status").equalTo("active");

                if (volunteerGroupName && volunteerGroupName !== "[Unknown Org]") {
                    console.log(`Filtering activations for group: ${volunteerGroupName}`);
                    activationsQuery.on("value", snapshot => {
                        activeActivations = [];
                        snapshot.forEach(childSnapshot => {
                            const activation = { id: childSnapshot.key, ...childSnapshot.val() };
                            if (activation.organization === volunteerGroupName) {
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
            window.location.href = '../pages/login.html';
        }
    });

    const today = new Date();
    const formattedDate = today.toLocaleDateString('en-CA');
    dateOfReportInput.value = formattedDate;

    const idInput = document.getElementById('reportId');
    if (idInput) {
        const randomId = `REPORTS-${Math.floor(100000 + Math.random() * 900000)}`;
        idInput.value = randomId;
    }

    if (pinBtn && mapModal && closeBtn) {
        pinBtn.addEventListener('click', (e) => {
            e.preventDefault();
            console.log("Pin button clicked!");
            mapModal.classList.add('show');
            console.log("mapModal classList:", mapModal.classList);
            if (!map) {
                initMap();
            } else {
                setTimeout(() => {
                    if (map) {
                        google.maps.event.trigger(map, 'resize');
                        const currentArea = areaOfOperationInput.value;
                        if (currentArea) {
                            const geocoder = new google.maps.Geocoder();
                            geocoder.geocode({ 'address': currentArea }, (results, status) => {
                                if (status === 'OK' && results[0]) {
                                    map.setCenter(results[0].geometry.location);
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
                            map.setCenter({ lat: 12.8797, lng: 121.7740 });
                            map.setZoom(6);
                        }
                    }
                }, 100);
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
        const today = new Date();
        today.setHours(0, 0, 0, 0);
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

        if (startDate > today) {
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

        formPage1.style.display = "none";
        formPage2.style.display = "block";

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
            NoOfIndividualsOrFamilies: parseInt(numIndividualsFamiliesInput.value) || 0,
            NoOfFoodPacks: parseInt(numFoodPacksInput.value) || 0,
            NoOfHotMeals: parseInt(numHotMealsInput.value) || 0,
            LitersOfWater: parseInt(litersWaterInput.value) || 0,
            NoOfVolunteersMobilized: parseInt(numVolunteersInput.value) || 0,
            NoOfOrganizationsActivated: parseInt(numOrganizationsInput.value) || 0,
            TotalValueOfInKindDonations: parseFloat(valueInKindInput.value) || 0,
            TotalMonetaryDonations: parseFloat(monetaryDonationsInput.value) || 0,
            NotesAdditionalInformation: notesInfoTextarea.value,
            Status: "Pending"
        };
        localStorage.setItem("reportData", JSON.stringify(formData));
        console.log("Form data saved to localStorage:", formData);
    });

    backBtn.addEventListener('click', () => {
        formPage2.style.display = "none";
        formPage1.style.display = "block";
    });

    formPage2.addEventListener("submit", function (e) {
        e.preventDefault();
        window.location.href = "../pages/reportsSummary.html";
    });

    const returnTo = localStorage.getItem("returnToStep");

    if (returnTo) {
        const savedData = JSON.parse(localStorage.getItem("reportData"));

        if (savedData) {
            reportIdInput.value = savedData.ReportID || '';
            dateOfReportInput.value = savedData.DateOfReport || '';
            areaOfOperationInput.value = savedData.AreaOfOperation || '';

            if (savedData.CalamityAreaId) {
                calamityAreaDropdown.value = savedData.CalamityAreaId;
                calamityAreaDropdown.dispatchEvent(new Event('change'));
            }

            completionTimeInput.value = savedData.TimeOfIntervention || '';
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
        }

        if (returnTo === "form-container-1") {
            formPage1.style.display = "block";
            formPage2.style.display = "none";
        } else if (returnTo === "form-container-2") {
            formPage1.style.display = "none";
            formPage2.style.display = "block";
        }
        localStorage.removeItem("returnToStep");
    } else {
        formPage1.style.display = "block";
        formPage2.style.display = "none";
    }
});
console.log = function () {};
console.error = function () {};
console.warn = function () {};

// Global variables for map and markers
let map;
let markers = [];

// Initialize Leaflet map
function initMap() {
    const defaultLocation = [14.5995, 120.9842]; // Manila, Philippines
    map = L.map('mapContainer').setView(defaultLocation, 10);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);

    const searchInput = document.getElementById('search-input');
    const suggestionsContainer = document.getElementById('suggestions');

    // Autocomplete search with suggestions
    searchInput.addEventListener('input', debounce(async () => {
        const query = searchInput.value;
        suggestionsContainer.innerHTML = '';
        if (query.length < 3) return;

        try {
            const response = await fetch(
                `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5`
            );
            const results = await response.json();
            if (results.length > 0) {
                results.forEach((result) => {
                    const suggestion = document.createElement('div');
                    suggestion.className = 'suggestion-item';
                    suggestion.textContent = result.display_name;
                    suggestion.addEventListener('click', () => {
                        map.setView([result.lat, result.lon], 16);
                        clearMarkers();
                        const marker = L.marker([result.lat, result.lon], { title: result.display_name }).addTo(map);
                        markers.push(marker);
                        marker.bindPopup(`<strong>${result.display_name}</strong>`).openPopup();
                        document.getElementById('AreaOfOperation').value = result.display_name;
                        document.getElementById('latitude').value = result.lat;
                        document.getElementById('longitude').value = result.lon;
                        suggestionsContainer.innerHTML = '';
                    });
                    suggestionsContainer.appendChild(suggestion);
                });
            }
        } catch (error) {
            Swal.fire({
                icon: 'error',
                title: 'Location Not Found',
                text: 'Please select a valid location from the dropdown.',
            });
        }
    }, 500));

    // Clear suggestions when clicking outside
    document.addEventListener('click', (e) => {
        if (!suggestionsContainer.contains(e.target) && e.target !== searchInput) {
            suggestionsContainer.innerHTML = '';
        }
    });

    // Allow pinning a location by clicking on the map
    map.on('click', async (e) => {
        clearMarkers();
        const marker = L.marker(e.latlng, { title: 'Pinned Location' }).addTo(map);
        markers.push(marker);
        try {
            const response = await fetch(
                `https://nominatim.openstreetmap.org/reverse?format=json&lat=${e.latlng.lat}&lon=${e.latlng.lng}`
            );
            const data = await response.json();
            const address = data.display_name || `Lat: ${e.latlng.lat}, Lng: ${e.latlng.lng}`;
            marker.bindPopup(`Pinned Location<br>${address}`).openPopup();
            document.getElementById('AreaOfOperation').value = address;
            document.getElementById('latitude').value = e.latlng.lat;
            document.getElementById('longitude').value = e.latlng.lng;
        } catch (error) {
            Swal.fire({
                icon: 'error',
                title: 'Geocoding Error',
                text: 'Unable to retrieve address for the pinned location.',
            });
            document.getElementById('AreaOfOperation').value = `Lat: ${e.latlng.lat}, Lng: ${e.latlng.lng}`;
            document.getElementById('latitude').value = e.latlng.lat;
            document.getElementById('longitude').value = e.latlng.lng;
        }
        map.setView(e.latlng, 16);
    });

    // Get user's location
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const userLocation = [position.coords.latitude, position.coords.longitude];
                map.setView(userLocation, 16);
                clearMarkers();
                const marker = L.marker(userLocation, {
                    title: 'You are here',
                    icon: L.icon({
                        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
                        iconSize: [25, 41],
                        iconAnchor: [12, 41],
                        popupAnchor: [1, -34],
                    }),
                }).addTo(map);
                markers.push(marker);
                marker.bindPopup('You are here').openPopup();
            },
            (error) => {
                let errorMessage = 'Unable to retrieve your location.';
                switch (error.code) {
                    case error.PERMISSION_DENIED:
                        errorMessage = 'Location access denied. Please allow location access in your browser settings.';
                        break;
                    case error.POSITION_UNAVAILABLE:
                        errorMessage = 'Location information is unavailable. Ensure your device has a working GPS or network connection.';
                        break;
                    case error.TIMEOUT:
                        errorMessage = 'Location request timed out. Please try again.';
                        break;
                }
                Swal.fire({
                    icon: 'error',
                    title: 'Location Error',
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
            icon: 'error',
            title: 'Geolocation Not Supported',
            text: 'Your browser does not support geolocation. Please use a modern browser.',
        });
    }
}

// Function to clear all markers from the map
function clearMarkers() {
    markers.forEach(marker => marker.remove());
    markers = [];
}

// Debounce function to limit API calls
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

document.addEventListener('DOMContentLoaded', () => {
    // Clear stale localStorage data
    localStorage.removeItem('reportData');
    localStorage.removeItem('returnToStep');

    // Firebase configuration
    const firebaseConfig = {
        apiKey: 'AIzaSyDJxMv8GCaMvQT2QBW3CdzA3dV5X_T2KqQ',
        authDomain: 'bayanihan-5ce7e.firebaseapp.com',
        databaseURL: 'https://bayanihan-5ce7e-default-rtdb.asia-southeast1.firebasedatabase.app',
        projectId: 'bayanihan-5ce7e',
        storageBucket: 'bayanihan-5ce7e.appspot.com',
        messagingSenderId: '593123849917',
        appId: '1:593123849917:web:eb85a63a536eeff78ce9d4',
        measurementId: 'G-ZTQ9VXXVV0',
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
    const confirmBtn = document.getElementById('confirmLocationBtn');

    if (!formPage1 || !formPage2 || !nextBtn || !backBtn || !reportIdInput || !dateOfReportInput || !areaOfOperationInput || !calamityAreaDropdown || !completionTimeInput || !startDateInput || !endDateInput || !numIndividualsFamiliesInput || !numFoodPacksInput || !numHotMealsInput || !litersWaterInput || !numVolunteersInput || !numOrganizationsInput || !valueInKindInput || !monetaryDonationsInput || !notesInfoTextarea || !pinBtn || !mapModal || !closeBtn) {
        console.error('One or more essential form elements not found. Please check HTML IDs.');
        Swal.fire({
            icon: 'error',
            title: 'Setup Error',
            text: 'Required form or modal elements are missing. Please check the page setup.',
        });
        return;
    }

    let userUid = null;
    let volunteerGroupName = 'Admin';
    let activeActivations = [];
    let currentUserRole = null;

    nextBtn.disabled = true;

    function populateCalamityAreaDropdown() {
        calamityAreaDropdown.innerHTML = '<option value="">-- Select an Active Operation --</option>';
        activeActivations.forEach(activation => {
            const option = document.createElement('option');
            option.value = activation.id;
            const calamityType = activation.calamityType || 'Unknown Type';
            const calamityName = activation.calamityName || (activation.calamityType === 'Typhoon' && activation.typhoonName ? activation.typhoonName : calamityType);
            const organization = activation.organization || 'Unknown Organization';
            option.textContent = `${calamityType} - ${calamityName} (by ${organization})`;
            calamityAreaDropdown.appendChild(option);
        });

        const savedData = JSON.parse(localStorage.getItem('reportData'));
        if (savedData && savedData.CalamityAreaId) {
            calamityAreaDropdown.value = savedData.CalamityAreaId;
            if (calamityAreaDropdown.value) {
                calamityAreaDropdown.dispatchEvent(new Event('change'));
            }
        }
    }

    calamityAreaDropdown.addEventListener('change', () => {
        const selectedActivationId = calamityAreaDropdown.value;
        if (selectedActivationId === '') {
            areaOfOperationInput.value = '';
            areaOfOperationInput.readOnly = false;
        } else {
            const selectedActivation = activeActivations.find(activation => activation.id === selectedActivationId);
            if (selectedActivation) {
                areaOfOperationInput.readOnly = false;
            } else {
                console.warn('Selected activation not found in activeActivations array.');
                areaOfOperationInput.value = '';
                areaOfOperationInput.readOnly = false;
            }
        }
        pinBtn.style.display = 'inline-block';
    });

    auth.onAuthStateChanged(user => {
        if (user) {
            userUid = user.uid;
            database.ref(`users/${userUid}`).once('value', snapshot => {
                const userData = snapshot.val();
                if (userData) {
                    currentUserRole = userData.role;
                    volunteerGroupName = userData.organization || 'Admin';
                    if (currentUserRole === 'AB ADMIN') {
                        let activationsQuery = database.ref('activations').orderByChild('status').equalTo('active');
                        activationsQuery.on('value', snapshot => {
                            activeActivations = [];
                            snapshot.forEach(childSnapshot => {
                                activeActivations.push({ id: childSnapshot.key, ...childSnapshot.val() });
                            });
                            populateCalamityAreaDropdown();
                            nextBtn.disabled = false;
                        }, error => {
                            Swal.fire({
                                icon: 'error',
                                title: 'Error',
                                text: 'Failed to load active operations. Please try again.',
                            });
                            nextBtn.disabled = true;
                        });
                    } else if (currentUserRole === 'ABVN') {
                        if (volunteerGroupName !== 'Unknown Group') {
                            database.ref('activations').orderByChild('organization').equalTo(volunteerGroupName).once('value', organizationActivationsSnapshot => {
                                let organizationHasActiveActivations = false;
                                organizationActivationsSnapshot.forEach(childSnapshot => {
                                    if (childSnapshot.val().status === 'active') {
                                        organizationHasActiveActivations = true;
                                        return true;
                                    }
                                });
                                if (organizationHasActiveActivations) {
                                    let activationsQuery = database.ref('activations').orderByChild('status').equalTo('active');
                                    activationsQuery.on('value', snapshot => {
                                        activeActivations = [];
                                        snapshot.forEach(childSnapshot => {
                                            const activation = { id: childSnapshot.key, ...childSnapshot.val() };
                                            if (activation.organization === volunteerGroupName) {
                                                activeActivations.push(activation);
                                            }
                                        });
                                        populateCalamityAreaDropdown();
                                        nextBtn.disabled = false;
                                    }, error => {
                                        Swal.fire({
                                            icon: 'error',
                                            title: 'Error',
                                            text: 'Failed to load active operations. Please try again.',
                                        });
                                        nextBtn.disabled = true;
                                    });
                                } else {
                                    Swal.fire({
                                        icon: 'warning',
                                        title: 'Organization Inactive',
                                        text: 'Your organization has no active operations. Redirecting to dashboard.',
                                        allowOutsideClick: false,
                                        showConfirmButton: true,
                                        confirmButtonText: 'OK',
                                        customClass: {
                                            popup: 'swal2-popup-warning-clean',
                                            title: 'swal2-title-warning-clean',
                                            htmlContainer: 'swal2-text-warning-clean',
                                            confirmButton: 'my-warning-button',
                                        },
                                        didClose: () => {
                                            window.location.href = '../pages/dashboard.html';
                                        },
                                    });
                                    nextBtn.disabled = true;
                                    calamityAreaDropdown.innerHTML = '<option value="">-- No Active Operations (Organization Inactive) --</option>';
                                    calamityAreaDropdown.disabled = true;
                                    areaOfOperationInput.disabled = true;
                                    pinBtn.style.display = 'none';
                                }
                            }).catch(error => {
                                Swal.fire({
                                    icon: 'error',
                                    title: 'Error',
                                    text: 'Failed to check organization activation status.',
                                });
                                nextBtn.disabled = true;
                            });
                        } else {
                            Swal.fire({
                                icon: 'warning',
                                title: 'Organization Not Assigned',
                                text: 'Your account is not associated with an organization. Redirecting to dashboard.',
                                didClose: () => {
                                    window.location.href = '../pages/dashboard.html';
                                },
                            });
                            nextBtn.disabled = true;
                            calamityAreaDropdown.innerHTML = '<option value="">-- No Active Operations (No Organization) --</option>';
                            calamityAreaDropdown.disabled = true;
                            areaOfOperationInput.disabled = true;
                            pinBtn.style.display = 'none';
                        }
                    } else {
                        Swal.fire({
                            icon: 'error',
                            title: 'Unauthorized Access',
                            text: 'Your role does not permit access. Redirecting to dashboard.',
                            didClose: () => {
                                window.location.href = '../pages/dashboard.html';
                            },
                        });
                        nextBtn.disabled = true;
                        calamityAreaDropdown.innerHTML = '<option value="">-- Access Denied (Unauthorized Role) --</option>';
                        calamityAreaDropdown.disabled = true;
                        areaOfOperationInput.disabled = true;
                        pinBtn.style.display = 'none';
                    }
                } else {
                    Swal.fire({
                        icon: 'warning',
                        title: 'User Data Missing',
                        text: 'User data could not be retrieved. Redirecting to dashboard.',
                        didClose: () => {
                            window.location.href = '../pages/dashboard.html';
                        },
                    });
                    nextBtn.disabled = true;
                    calamityAreaDropdown.innerHTML = '<option value="">-- Error (User Data Missing) --</option>';
                    calamityAreaDropdown.disabled = true;
                    areaOfOperationInput.disabled = true;
                    pinBtn.style.display = 'none';
                }
            }).catch(error => {
                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: 'Failed to fetch user data.',
                });
                nextBtn.disabled = true;
            });
        } else {
            window.location.href = '../pages/login.html';
            nextBtn.disabled = true;
        }
    });

    const today = new Date();
    const formattedDate = today.toLocaleDateString('en-CA');
    dateOfReportInput.value = formattedDate;

    const idInput = document.getElementById('reportId');
    if (idInput) {
        const randomId = 'REPORTS-' + Math.floor(10000 + Math.random() * 9000000000);
        idInput.value = randomId;
    }

    if (pinBtn && mapModal && closeBtn && confirmBtn) {
        pinBtn.addEventListener('click', (e) => {
            e.preventDefault();
            mapModal.style.display = 'flex';
            if (!map) {
                initMap();
            } else {
                setTimeout(() => {
                    if (map) {
                        map.invalidateSize();
                        const currentArea = areaOfOperationInput.value;
                        if (currentArea) {
                            fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(currentArea)}&limit=1`)
                                .then(response => response.json())
                                .then(results => {
                                    if (results.length > 0) {
                                        const { lat, lon } = results[0];
                                        map.setView([lat, lon], 16);
                                        clearMarkers();
                                        const marker = L.marker([lat, lon], { title: currentArea }).addTo(map);
                                        markers.push(marker);
                                        marker.bindPopup(`<strong>${currentArea}</strong>`).openPopup();
                                        document.getElementById('latitude').value = lat;
                                        document.getElementById('longitude').value = lon;
                                    }
                                })
                                .catch(error => {
                                    map.setView([12.8797, 121.7740], 6);
                                });
                        } else {
                            map.setView([12.8797, 121.7740], 6);
                        }
                    }
                }, 100);
            }
        });

        closeBtn.addEventListener('click', () => {
            mapModal.style.display = 'none';
            document.getElementById('suggestions').innerHTML = '';
        });

        confirmBtn.addEventListener('click', async () => {
            if (markers.length > 0) {
                const marker = markers[0];
                const position = marker.getLatLng();
                try {
                    const response = await fetch(
                        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${position.lat}&lon=${position.lng}`
                    );
                    const data = await response.json();
                    if (data.display_name) {
                        document.getElementById('AreaOfOperation').value = data.display_name;
                        document.getElementById('latitude').value = position.lat;
                        document.getElementById('longitude').value = position.lng;
                    }
                } catch (error) {
                    Swal.fire({
                        icon: 'error',
                        title: 'Geocoding Error',
                        text: 'Unable to retrieve address for the pinned location.',
                    });
                }
            }
            mapModal.style.display = 'none';
            document.getElementById('suggestions').innerHTML = '';
        });

        window.addEventListener('click', (e) => {
            if (e.target === mapModal) {
                mapModal.style.display = 'none';
                document.getElementById('suggestions').innerHTML = '';
            }
        });
    } else {
        console.warn('Modal elements (pinBtn, mapModal, closeBtn, confirmBtn) not found. Map functionality may be impaired.');
        Swal.fire({
            icon: 'error',
            title: 'Setup Error',
            text: 'Modal elements are missing. Please check the page setup.',
        });
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
                text: 'Please fill in both Start Date and End Date.',
            });
            if (!startDateValue) startDateInput.focus();
            else endDateInput.focus();
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
                text: 'Invalid date entered. Please use the date picker to select valid dates.',
            });
            if (isNaN(startDate.getTime())) startDateInput.focus();
            else endDateInput.focus();
            return;
        }

        if (startDate > today) {
            Swal.fire({
                icon: 'warning',
                title: 'Future Start Date',
                text: 'Start Date cannot be a future date.',
            });
            startDateInput.focus();
            return;
        }

        if (startDate > endDate) {
            Swal.fire({
                icon: 'warning',
                title: 'Date Order Error',
                text: 'Start Date cannot be after End Date.',
            });
            startDateInput.focus();
            return;
        }

        if (endDate > oneYearFromNow) {
            Swal.fire({
                icon: 'warning',
                title: 'Excessive End Date',
                text: 'End Date cannot be more than 1 year from today. Please enter a valid date range.',
            });
            endDateInput.focus();
            return;
        }

        if (!calamityAreaDropdown.value) {
            Swal.fire({
                icon: 'warning',
                title: 'Missing Calamity Area',
                text: 'Please select an active operation from the dropdown.',
            });
            calamityAreaDropdown.focus();
            return;
        }

        let selectedCalamityName = '';
        let selectedCalamityType = '';
        let selectedCalamityOrganization = '';
        let calamityAreaDetailsText = '';

        const selectedActivationId = calamityAreaDropdown.value;
        if (selectedActivationId) {
            const selectedActivation = activeActivations.find(activation => activation.id === selectedActivationId);
            if (selectedActivation) {
                selectedCalamityType = selectedActivation.calamityType || 'Unknown Type';
                selectedCalamityName = selectedActivation.calamityName || (selectedActivation.calamityType === 'Typhoon' && selectedActivation.typhoonName ? selectedActivation.typhoonName : selectedCalamityType);
                selectedCalamityOrganization = selectedActivation.organization || 'Unknown Organization';
                calamityAreaDetailsText = `${selectedCalamityType} - ${selectedCalamityName} (by ${selectedCalamityOrganization})`;
            } else {
                calamityAreaDetailsText = `ID: ${selectedActivationId} (Details Missing)`;
                selectedCalamityName = 'Unknown Calamity';
                selectedCalamityType = 'Unknown Type';
            }
        } else {
            calamityAreaDetailsText = 'Not Specified';
            selectedCalamityName = 'Not Specified';
            selectedCalamityType = 'Not Specified';
        }

        formPage1.style.display = 'none';
        formPage2.style.display = 'block';

        const formData = {
            userUid: userUid,
            VolunteerGroupName: volunteerGroupName || 'Not Assigned',
            AreaOfOperation: areaOfOperationInput.value,
            CalamityAreaId: calamityAreaDropdown.value,
            CalamityType: selectedCalamityType,
            CalamityName: selectedCalamityName,
            CalamityAreaDetails: calamityAreaDetailsText,
            TimeOfIntervention: completionTimeInput.value,
            DateOfReport: dateOfReportInput.value,
            ReportID: reportIdInput.value,
            StartDate: startDateInput.value,
            EndDate: endDateInput.value,
            NoOfIndividualsOrFamilies: numIndividualsFamiliesInput.value,
            NoOfFoodPacks: numFoodPacksInput.value,
            NoOfHotMeals: numHotMealsInput.value,
            LitersOfWater: litersWaterInput.value,
            NoOfVolunteersMobilized: numVolunteersInput.value,
            NoOfOrganizationsActivated: numOrganizationsInput.value,
            TotalValueOfInKindDonations: valueInKindInput.value,
            TotalMonetaryDonations: monetaryDonationsInput.value,
            NotesAdditionalInformation: notesInfoTextarea.value || 'No additional notes',
            Status: 'Pending',
            Latitude: document.getElementById('latitude')?.value || '',
            Longitude: document.getElementById('longitude')?.value || '',
        };
        localStorage.setItem('reportData', JSON.stringify(formData));
    });

    backBtn.addEventListener('click', () => {
        formPage2.style.display = 'none';
        formPage1.style.display = 'block';
    });

    formPage2.addEventListener('submit', function (e) {
        e.preventDefault();
        const savedData = JSON.parse(localStorage.getItem('reportData')) || {};
        savedData.NotesAdditionalInformation = notesInfoTextarea.value || 'No additional notes';
        localStorage.setItem('reportData', JSON.stringify(savedData));
        window.location.href = '../pages/reportsSummary.html';
    });

    const returnTo = localStorage.getItem('returnToStep');
    if (returnTo) {
        const savedData = JSON.parse(localStorage.getItem('reportData'));
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
            document.getElementById('latitude').value = savedData.Latitude || '';
            document.getElementById('longitude').value = savedData.Longitude || '';
        }
        if (returnTo === 'form-container-1') {
            formPage1.style.display = 'block';
            formPage2.style.display = 'none';
        } else if (returnTo === 'form-container-2') {
            formPage1.style.display = 'none';
            formPage2.style.display = 'block';
        }
        localStorage.removeItem('returnToStep');
    } else {
        formPage1.style.display = 'block';
        formPage2.style.display = 'none';
    }
});
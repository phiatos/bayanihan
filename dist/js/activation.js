// Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyDJxMv8GCaMvQT2QBW3CdzA3dV5X_T2KqQ",
    authDomain: "bayanihan-5ce7e.firebaseapp.com",
    databaseURL: "https://bayanihan-5ce7e-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "bayanihan-5ce7e",
    storageBucket: "bayanihan-5ce7e.appspot.com",
    messagingSenderId: "593123849917",
    appId: "1:593123849917:web:eb85a63a536eeff78ce9d4",
    measurementId: "G-ZTQ9VXXVV0"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const database = firebase.database();

// Data arrays
let allVolunteerGroups = [];
let currentActiveActivations = [];

const calamityOptions = [
    "Select Calamity", "Typhoon", "Earthquake", "Flood", "Volcanic Eruption", "Landslide", "Tsunami"
];

let currentPage = 1;
const rowsPerPage = 5;

// DOM Elements
const tableBody = document.querySelector("#orgTable tbody");
const searchInput = document.querySelector("#searchInput");
const sortSelect = document.querySelector("#sortSelect");
const entriesInfo = document.querySelector("#entriesInfo");
const paginationContainer = document.querySelector("#pagination");
const clearBtn = document.querySelector('.clear-btn');
const addActivationBtn = document.getElementById("addActivationBtn");

// Modals and their elements
const activationModal = document.getElementById("activationModal");
const closeActivationModalBtn = document.getElementById("closeActivationModal");
const modalTitle = document.getElementById("modalTitle");
const endorseModal = document.getElementById("endorseModal");
const closeEndorseModalBtn = document.getElementById("closeEndorseModal");
const mapModal = document.getElementById("mapModal");
const closeMapModalBtn = document.getElementById("closeMapModal");
const cancelMapModalBtn = document.getElementById("cancelMapModalBtn");
const saveLocationBtn = document.getElementById("saveLocationBtn");
const mapSearchInput = document.getElementById("mapSearchInput");

// Step 1 Elements
const modalStep1 = document.getElementById("modalStep1");
const selectGroupDropdown = document.getElementById("selectGroupDropdown");
const modalNextStepBtn = document.getElementById("modalNextStepBtn");

// Step 2 Elements
const modalStep2 = document.getElementById("modalStep2");
const selectedOrgName = document.getElementById("selectedOrgName");
const modalAreaInput = document.getElementById("modalAreaInput");
const modalLatitudeInput = document.getElementById("modalLatitudeInput");
const modalLongitudeInput = document.getElementById("modalLongitudeInput");
const modalCalamitySelect = document.getElementById("modalCalamitySelect");
const modalTyphoonNameInput = document.getElementById("modalTyphoonNameInput");
const modalActivateSubmitBtn = document.getElementById("modalActivateSubmitBtn");
const modalPrevStepBtn = document.getElementById("modalPrevStepBtn");
const pinLocationBtn = document.getElementById("pinLocationBtn");

let selectedGroupForActivation = null;
let map, markers = [], autocomplete, geocoder;

// Initialize Google Maps for Map Modal
function initMap() {
    const defaultLocation = { lat: 14.5995, lng: 120.9842 }; // Manila, Philippines

    map = new google.maps.Map(document.getElementById("mapContainer"), {
        center: defaultLocation,
        zoom: 10,
        mapTypeId: "roadmap",
    });

    geocoder = new google.maps.Geocoder();

    autocomplete = new google.maps.places.Autocomplete(mapSearchInput, {
        componentRestrictions: { country: "PH" },
    });
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

        modalAreaInput.value = place.formatted_address;
        modalLatitudeInput.value = place.geometry.location.lat();
        modalLongitudeInput.value = place.geometry.location.lng();
    });

    map.addListener("click", (event) => {
        clearMarkers();

        const marker = new google.maps.Marker({
            position: event.latLng,
            map: map,
            title: "Pinned Location",
        });
        markers.push(marker);

        geocoder.geocode({ location: event.latLng }, (results, status) => {
            let infoContent = `Pinned Location<br>Lat: ${event.latLng.lat()}, Lng: ${event.latLng.lng()}`;
            if (status === "OK" && results[0]) {
                infoContent = `Pinned Location<br>${results[0].formatted_address}`;
                modalAreaInput.value = results[0].formatted_address;
            } else {
                modalAreaInput.value = `Lat: ${event.latLng.lat()}, Lng: ${event.latLng.lng()}`;
            }
            modalLatitudeInput.value = event.latLng.lat();
            modalLongitudeInput.value = event.latLng.lng();

            const infowindow = new google.maps.InfoWindow({
                content: infoContent,
            });
            marker.addListener("click", () => {
                infowindow.open(map, marker);
            });
            infowindow.open(map, marker);
        });

        map.setCenter(event.latLng);
        map.setZoom(16);
    });

    // Add "My Location" button
    const returnButton = document.createElement("button");
    returnButton.textContent = "My Location";
    returnButton.style.cssText = `
        background-color: #007bff;
        color: white;
        padding: 10px 15px;
        border: none;
        border-radius: 5px;
        cursor: pointer;
        font-size: 14px;
        margin: 10px;
    `;
    returnButton.addEventListener("click", returnToUserLocation);
    map.controls[google.maps.ControlPosition.TOP_RIGHT].push(returnButton);

    // Try to center on user's location
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const userLocation = {
                    lat: position.coords.latitude,
                    lng: position.coords.longitude,
                };
                map.setCenter(userLocation);
                map.setZoom(16);
                clearMarkers();
                const marker = new google.maps.Marker({
                    position: userLocation,
                    map: map,
                    title: "You are here",
                    icon: { url: "http://maps.google.com/mapfiles/ms/icons/blue-dot.png" },
                });
                markers.push(marker);

                geocoder.geocode({ location: userLocation }, (results, status) => {
                    let infoContent = "You are here";
                    if (status === "OK" && results[0]) {
                        infoContent = `You are here<br>${results[0].formatted_address}`;
                        modalAreaInput.value = results[0].formatted_address;
                        modalLatitudeInput.value = userLocation.lat;
                        modalLongitudeInput.value = userLocation.lng;
                    }
                    const infowindow = new google.maps.InfoWindow({ content: infoContent });
                    marker.addListener("click", () => infowindow.open(map, marker));
                    infowindow.open(map, marker);
                });
            },
            (error) => {
                console.error("Geolocation error:", error);
                Swal.fire({
                    icon: "error",
                    title: "Location Error",
                    text: getGeolocationErrorMessage(error),
                });
            },
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
        );
    }
}

function clearMarkers() {
    markers.forEach(marker => marker.setMap(null));
    markers = [];
}

function returnToUserLocation() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const userLocation = {
                    lat: position.coords.latitude,
                    lng: position.coords.longitude,
                };
                map.setCenter(userLocation);
                map.setZoom(16);
                clearMarkers();
                const marker = new google.maps.Marker({
                    position: userLocation,
                    map: map,
                    title: "You are here",
                    icon: { url: "http://maps.google.com/mapfiles/ms/icons/blue-dot.png" },
                });
                markers.push(marker);

                geocoder.geocode({ location: userLocation }, (results, status) => {
                    let infoContent = "You are here";
                    if (status === "OK" && results[0]) {
                        infoContent = `You are here<br>${results[0].formatted_address}`;
                        modalAreaInput.value = results[0].formatted_address;
                        modalLatitudeInput.value = userLocation.lat;
                        modalLongitudeInput.value = userLocation.lng;
                    }
                    const infowindow = new google.maps.InfoWindow({ content: infoContent });
                    marker.addListener("click", () => infowindow.open(map, marker));
                    infowindow.open(map, marker);
                });
            },
            (error) => {
                console.error("Geolocation error:", error);
                Swal.fire({
                    icon: "error",
                    title: "Location Error",
                    text: getGeolocationErrorMessage(error),
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

// Authentication and Data Listeners
firebase.auth().onAuthStateChanged(user => {
    if (user) {
        console.log("User is authenticated:", user.uid);
        listenForDataUpdates();
    } else {
        console.log("No user is authenticated. Attempting anonymous sign-in...");
        firebase.auth().signInAnonymously()
            .then(() => console.log("Signed in anonymously"))
            .catch(error => {
                console.error("Anonymous auth failed:", error.code, error.message);
                Swal.fire({
                    icon: 'error',
                    title: 'Authentication Error',
                    text: `Failed to authenticate: ${error.message}. Please check your network and Firebase configuration.`
                });
            });
    }
});

function listenForDataUpdates() {
    console.log("Setting up real-time listener for volunteerGroups...");
    database.ref("volunteerGroups").on("value", snapshot => {
        const fetchedGroups = snapshot.val();
        console.log("Volunteer groups data received:", fetchedGroups);

        allVolunteerGroups = [];
        if (fetchedGroups) {
            for (let key in fetchedGroups) {
                allVolunteerGroups.push({
                    no: parseInt(key),
                    organization: fetchedGroups[key].organization || "Unknown",
                    hq: fetchedGroups[key].hq || "Not specified",
                    contactPerson: fetchedGroups[key].contactPerson || "Unknown",
                    email: fetchedGroups[key].email || "Not specified",
                    mobileNumber: fetchedGroups[key].mobileNumber || "Not specified",
                });
            }
            allVolunteerGroups.sort((a, b) => a.no - b.no);
        }
        populateGroupDropdown();
    }, error => {
        console.error("Error listening for volunteerGroups:", error.code, error.message);
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: `Failed to load volunteer groups: ${error.message}`
        });
    });

    console.log("Setting up real-time listener for activations...");
    database.ref("activations").orderByChild("activationDate").on("value", snapshot => {
        const fetchedActivations = snapshot.val();
        console.log("Activations data received:", fetchedActivations);

        currentActiveActivations = [];
        if (fetchedActivations) {
            for (let key in fetchedActivations) {
                const activation = fetchedActivations[key];
                if (activation.status === 'active') {
                    const volunteerGroup = allVolunteerGroups.find(group => group.no === activation.groupId);
                    currentActiveActivations.push({
                        id: key,
                        no: activation.no || 0,
                        groupId: activation.groupId,
                        organization: activation.organization || "Unknown",
                        hq: activation.hq || "Not specified",
                        areaOfOperation: activation.areaOfOperation || "Not specified",
                        calamity: activation.calamityType || "Typhoon",
                        typhoonName: activation.typhoonName || "",
                        status: activation.status,
                        activationDate: activation.activationDate,
                        contactPerson: volunteerGroup ? volunteerGroup.contactPerson : "N/A",
                        email: volunteerGroup ? volunteerGroup.email : "N/A",
                        mobileNumber: volunteerGroup ? volunteerGroup.mobileNumber : "N/A",
                        latitude: activation.latitude || null,
                        longitude: activation.longitude || null
                    });
                }
            }
            // Sort by activationDate (newest first)
            currentActiveActivations.sort((a, b) => {
                const dateA = new Date(a.activationDate);
                const dateB = new Date(b.activationDate);
                return dateB - dateA;
            });
        }
        renderTable();
    }, error => {
        console.error("Error listening for activations:", error.code, error.message);
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: `Failed to load activations: ${error.message}`
        });
    });
}

function populateGroupDropdown() {
    selectGroupDropdown.innerHTML = '<option value="">-- Select an Organization --</option>';
    allVolunteerGroups.forEach(group => {
        const option = document.createElement("option");
        option.value = group.no;
        option.textContent = `${group.organization} (${group.hq})`;
        selectGroupDropdown.appendChild(option);
    });
}

function renderTable(filteredData = currentActiveActivations) {
    tableBody.innerHTML = "";
    const start = (currentPage - 1) * rowsPerPage;
    const end = start + rowsPerPage;
    const pageData = filteredData.slice(start, end);

    if (pageData.length === 0 && filteredData.length > 0 && currentPage > 1) {
        currentPage--;
        renderTable(filteredData);
        return;
    } else if (pageData.length === 0 && filteredData.length === 0) {
        const noDataRow = document.createElement("tr");
        noDataRow.innerHTML = `<td colspan="10" style="text-align: center;">No active group activations to display.</td>`;
        tableBody.appendChild(noDataRow);
    }

    pageData.forEach((row, index) => {
        const displayNumber = start + index + 1;
        const tr = document.createElement("tr");
        let calamityDisplay = row.calamity;
        if (row.calamity === "Typhoon" && row.typhoonName) {
            calamityDisplay += ` (${row.typhoonName})`;
        }

        tr.innerHTML = `
            <td>${displayNumber}</td>
            <td>${row.organization}</td>
            <td>${row.hq}</td>
            <td>${row.areaOfOperation || 'N/A'}</td>
            <td>${row.contactPerson || 'N/A'}</td>
            <td>${row.email || 'N/A'}</td>
            <td>${row.mobileNumber || 'N/A'}</td>
            <td>${calamityDisplay || 'N/A'}</td>
            <td><span class="status-circle ${row.status === "active" ? "green" : "red"}"></span> ${row.status}</td>
            <td>
                <button class="action-button-endorse-button" data-activation-id="${row.id}" data-group-id="${row.groupId}">Send Relief Assistance</button>
                <button class="action-button" data-activation-id="${row.id}" data-group-id="${row.groupId}">Deactivate</button>
            </td>
        `;
        tableBody.appendChild(tr);
    });

    entriesInfo.textContent = `Showing ${start + 1} to ${Math.min(end, filteredData.length)} of ${filteredData.length} entries`;
    renderPagination(filteredData.length);
}

function handleSearch() {
    const query = searchInput.value.trim().toLowerCase();
    clearBtn.style.display = query ? 'flex' : 'none';
    currentPage = 1;
    renderTable(filterAndSort());
}

function clearDInputs() {
    searchInput.value = '';
    clearBtn.style.display = 'none';
    currentPage = 1;
    renderTable(filterAndSort());
    searchInput.focus();
}

clearBtn.style.display = 'none';
searchInput.addEventListener('input', handleSearch);

function openAddActivationModal() {
    modalTitle.textContent = "Add New Activation";
    modalStep1.classList.add('active');
    modalStep2.classList.remove('active');
    selectGroupDropdown.value = "";
    modalNextStepBtn.disabled = true;
    selectedGroupForActivation = null;
    resetModalStep2Fields();
    populateGroupDropdown();
    activationModal.style.display = "flex";
}

function resetModalStep2Fields() {
    selectedOrgName.textContent = "";
    modalAreaInput.value = "";
    modalLatitudeInput.value = "";
    modalLongitudeInput.value = "";
    modalCalamitySelect.innerHTML = calamityOptions
        .map((opt, index) => {
            if (index === 0) {
                return `<option value="" disabled selected>-- Select Calamity Type --</option>`;
            }
            return `<option value="${opt}">${opt}</option>`;
        })
        .join("");
    modalTyphoonNameInput.style.display = "none";
    modalTyphoonNameInput.value = "";
}

function showStep1() {
    modalTitle.textContent = "Add New Activation";
    modalStep1.classList.add('active');
    modalStep2.classList.remove('active');
    selectedGroupForActivation = null;
    modalNextStepBtn.disabled = true;
    selectGroupDropdown.value = "";
    resetModalStep2Fields();
    populateGroupDropdown();
}

function showStep2() {
    if (!selectedGroupForActivation) {
        Swal.fire({
            icon: 'warning',
            title: 'No Group Selected',
            text: 'Please select an organization before proceeding.'
        });
        return;
    }
    modalStep1.classList.remove('active');
    modalStep2.classList.add('active');
    selectedOrgName.textContent = selectedGroupForActivation.organization;

    modalCalamitySelect.innerHTML = calamityOptions
        .map((opt, index) => {
            if (index === 0) {
                return `<option value="" disabled selected>-- Select Calamity Type --</option>`;
            }
            return `<option value="${opt}">${opt}</option>`;
        })
        .join("");
    modalTyphoonNameInput.style.display = "none";
    modalTyphoonNameInput.value = "";
    modalAreaInput.value = "";
    modalLatitudeInput.value = "";
    modalLongitudeInput.value = "";
}

function closeActivationModal() {
    activationModal.style.display = "none";
    selectedGroupForActivation = null;
    showStep1();
}

function openMapModal() {
    mapModal.style.display = "flex";
    setTimeout(() => {
        if (!map) {
            initMap();
        } else {
            google.maps.event.trigger(map, 'resize');
            const currentArea = modalAreaInput.value;
            if (currentArea) {
                geocoder.geocode({ 'address': currentArea }, (results, status) => {
                    if (status === 'OK' && results[0]) {
                        map.setCenter(results[0].geometry.location);
                        clearMarkers();
                        const marker = new google.maps.Marker({
                            map: map,
                            position: results[0].geometry.location,
                            title: currentArea,
                        });
                        markers.push(marker);
                    }
                });
            } else {
                map.setCenter({ lat: 14.5995, lng: 120.9842 });
                map.setZoom(10);
            }
        }
    }, 100);
}

function closeMapModal() {
    mapModal.style.display = "none";
    clearMarkers();
}

// Event Listeners
addActivationBtn.addEventListener("click", openAddActivationModal);
closeActivationModalBtn.addEventListener("click", closeActivationModal);
closeMapModalBtn.addEventListener("click", closeMapModal);
cancelMapModalBtn.addEventListener("click", closeMapModal);
window.addEventListener("click", (event) => {
    if (event.target === activationModal) {
        closeActivationModal();
    } else if (event.target === mapModal) {
        closeMapModal();
    } else if (event.target === endorseModal) {
        closeEndorseModal();
    }
});

selectGroupDropdown.addEventListener("change", (e) => {
    const selectedId = parseInt(e.target.value);
    selectedGroupForActivation = allVolunteerGroups.find(group => group.no === selectedId) || null;
    modalNextStepBtn.disabled = !selectedGroupForActivation;
});

modalNextStepBtn.addEventListener("click", showStep2);
modalPrevStepBtn.addEventListener("click", showStep1);

modalCalamitySelect.addEventListener("change", () => {
    if (modalCalamitySelect.value === "Typhoon") {
        modalTyphoonNameInput.style.display = "inline-block";
    } else {
        modalTyphoonNameInput.style.display = "none";
        modalTyphoonNameInput.value = "";
    }
});

pinLocationBtn.addEventListener("click", openMapModal);

saveLocationBtn.addEventListener("click", () => {
    if (!modalAreaInput.value || !modalLatitudeInput.value || !modalLongitudeInput.value) {
        Swal.fire({
            icon: 'warning',
            title: 'No Location Selected',
            text: 'Please select a location by searching or clicking on the map.'
        });
        return;
    }
    closeMapModal();
});

async function getNextActivationNumber() {
    try {
        const snapshot = await database.ref("activations").once("value");
        const activations = snapshot.val();
        let maxNo = 0;
        if (activations) {
            Object.values(activations).forEach(activation => {
                if (activation.no && activation.no > maxNo) {
                    maxNo = activation.no;
                }
            });
        }
        return maxNo + 1;
    } catch (error) {
        console.error("Error fetching max activation number:", error);
        throw error;
    }
}

modalActivateSubmitBtn.addEventListener("click", async () => {
    if (!selectedGroupForActivation) {
        Swal.fire({ icon: 'error', title: 'Error', text: 'No organization selected for activation.' });
        return;
    }

    const areaOfOperation = modalAreaInput.value.trim();
    const calamityType = modalCalamitySelect.value;
    const typhoonName = (calamityType === "Typhoon") ? modalTyphoonNameInput.value.trim() : "";
    const latitude = modalLatitudeInput.value;
    const longitude = modalLongitudeInput.value;

    if (!areaOfOperation) {
        Swal.fire({ icon: 'warning', title: 'Missing Field', text: 'Please enter an Area of Operations.' });
        return;
    }
    if (!calamityType || calamityType === "Select Calamity") {
        Swal.fire({ icon: 'warning', title: 'Missing Field', text: 'Please select a Calamity Type.' });
        return;
    }
    if (calamityType === "Typhoon" && !typhoonName) {
        Swal.fire({ icon: 'warning', title: 'Missing Field', text: 'Please enter the Typhoon Name.' });
        return;
    }
    if (!latitude || !longitude) {
        Swal.fire({ icon: 'warning', title: 'Missing Location', text: 'Please pin a location on the map.' });
        return;
    }

    const user = firebase.auth().currentUser;
    if (!user) {
        Swal.fire({ icon: 'error', title: 'Authentication Error', text: 'User not authenticated. Please refresh the page and try again.' });
        return;
    }

    const existingActiveQuery = database.ref("activations")
        .orderByChild("groupId")
        .equalTo(selectedGroupForActivation.no);

    try {
        const snapshot = await existingActiveQuery.once("value");
        let alreadyActiveInAreaForCalamity = false;

        snapshot.forEach(childSnapshot => {
            const activation = childSnapshot.val();
            if (activation.status === "active" &&
                activation.areaOfOperation.toLowerCase() === areaOfOperation.toLowerCase() &&
                activation.calamityType.toLowerCase() === calamityType.toLowerCase()) {
                alreadyActiveInAreaForCalamity = true;
                return true;
            }
        });

        if (alreadyActiveInAreaForCalamity) {
            Swal.fire({
                icon: 'warning',
                title: 'Activation Conflict',
                text: `${selectedGroupForActivation.organization} is already active for "${calamityType}" in "${areaOfOperation}". Please deactivate the existing operation first or choose a different area or calamity.`
            });
            return;
        }

        const nextNo = await getNextActivationNumber();

        const newActivationRecord = {
            no: nextNo,
            groupId: selectedGroupForActivation.no,
            organization: selectedGroupForActivation.organization,
            hq: selectedGroupForActivation.hq,
            areaOfOperation: areaOfOperation,
            calamityType: calamityType,
            typhoonName: typhoonName,
            status: "active",
            activationDate: new Date().toISOString(),
            latitude: parseFloat(latitude),
            longitude: parseFloat(longitude)
        };

        console.log("Adding new activation record:", newActivationRecord);
        await database.ref("activations").push(newActivationRecord);
        Swal.fire({
            icon: 'success',
            title: 'Activated!',
            text: `${selectedGroupForActivation.organization} has been activated for ${calamityType} in ${areaOfOperation}.`
        });
        closeActivationModal();
        // Force table refresh
        currentPage = 1;
        renderTable();
    } catch (error) {
        console.error("Error adding activation:", error);
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: `Failed to activate group: ${error.message}`
        });
    }
});

function openEndorseModal() {
    endorseModal.style.display = "flex";
}

function closeEndorseModal() {
    endorseModal.style.display = "none";
}

closeEndorseModalBtn.addEventListener("click", closeEndorseModal);

tableBody.addEventListener("click", e => {
    const btn = e.target;
    const activationId = btn.getAttribute('data-activation-id');
    const groupId = btn.getAttribute('data-group-id');

    if (btn.classList.contains("action-button-endorse-button")) {
        console.log(`Endorse button clicked for activation ID: ${activationId}, Group ID: ${groupId}`);
        openEndorseModal();
    } else if (btn.classList.contains("action-button")) {
        Swal.fire({
            title: 'Are you sure?',
            text: `Do you want to deactivate this specific operation for group ID ${groupId}?`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'Yes'
        }).then((result) => {
            if (result.isConfirmed) {
                const user = firebase.auth().currentUser;
                if (!user) {
                    Swal.fire({ icon: 'error', title: 'Authentication Error', text: 'User not authenticated.' });
                    return;
                }

                const updates = {
                    status: "inactive",
                    deactivationDate: new Date().toISOString()
                };

                database.ref(`activations/${activationId}`).update(updates)
                    .then(() => {
                        Swal.fire('Deactivated!', `The activation has been marked inactive.`, 'success');
                    })
                    .catch(error => {
                        console.error("Error deactivating activation:", error);
                        Swal.fire({ icon: 'error', title: 'Error', text: `Failed to deactivate: ${error.message}` });
                    });
            }
        });
    }
});

function renderPagination(totalRows) {
    paginationContainer.innerHTML = "";
    const totalPages = Math.ceil(totalRows / rowsPerPage);
    const maxVisible = 5;

    const createButton = (label, page = null, disabled = false, active = false) => {
        const btn = document.createElement("button");
        btn.textContent = label;
        if (disabled) btn.disabled = true;
        if (active) btn.classList.add("active-page");
        if (page !== null) {
            btn.addEventListener("click", () => {
                currentPage = page;
                renderTable(filterAndSort());
            });
        }
        return btn;
    };

    if (totalPages === 0) return;

    paginationContainer.appendChild(createButton("Prev", currentPage - 1, currentPage === 1));

    let startPage = Math.max(1, currentPage - Math.floor(maxVisible / 2));
    let endPage = Math.min(totalPages, startPage + maxVisible - 1);

    if (endPage - startPage < maxVisible - 1) {
        startPage = Math.max(1, endPage - maxVisible + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
        paginationContainer.appendChild(createButton(i, i, false, i === currentPage));
    }

    paginationContainer.appendChild(createButton("Next", currentPage + 1, currentPage === totalPages));
}

function filterAndSort() {
    let filtered = currentActiveActivations.filter(row => {
        const query = searchInput.value.trim().toLowerCase();
        return Object.values(row).some(val => {
            if (typeof val === 'string' || typeof val === 'number') {
                return val.toString().toLowerCase().includes(query);
            }
            return false;
        });
    });

    if (sortSelect.value) {
        filtered.sort((a, b) => {
            if (sortSelect.value === 'organization') {
                return a.organization.localeCompare(b.organization);
            } else if (sortSelect.value === 'hq') {
                return a.hq.localeCompare(b.hq);
            } else if (sortSelect.value === 'status') {
                const statusOrder = { 'active': 1, 'inactive': 2 };
                return statusOrder[a.status] - statusOrder[b.status];
            } else if (sortSelect.value === 'calamity') {
                return a.calamity.localeCompare(b.calamity);
            }
            return 0;
        });
    } else {
        // Default sort by activationDate (newest first)
        filtered.sort((a, b) => {
            const dateA = new Date(a.activationDate);
            const dateB = new Date(b.activationDate);
            return dateB - dateA;
        });
    }

    return filtered;
}

sortSelect.addEventListener("change", () => {
    currentPage = 1;
    renderTable(filterAndSort());
});
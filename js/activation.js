console.log = function () {};
console.error = function () {};
console.warn = function () {};

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

firebase.initializeApp(firebaseConfig);
const database = firebase.database();
const auth = firebase.auth();

let isAdminVerified = false;

async function verifySuperAdminPassword() {
    if (!auth || !auth.currentUser) {
        Swal.fire({
            icon: 'error',
            title: 'Authentication Error',
            text: 'No user is currently signed in. Please log in again.',
            timer: 2000,
            showConfirmButton: false,
            timerProgressBar: true,
            allowOutsideClick: false,
            customClass: {
                popup: 'swal2-popup-error-clean',
                title: 'swal2-title-error-clean',
                htmlContainer: 'swal2-text-error-clean'
            }
        });
        return false;
    }

    if (!auth.currentUser.providerData.some(provider => provider.providerId === 'password')) {
        Swal.fire({
            icon: 'error',
            title: 'Authentication Error',
            text: 'This account does not use email/password authentication.',
            timer: 2000,
            showConfirmButton: false,
            timerProgressBar: true,
            allowOutsideClick: false,
            customClass: {
                popup: 'swal2-popup-error-clean',
                title: 'swal2-title-error-clean',
                htmlContainer: 'swal2-text-error-clean'
            }
        });
        return false;
    }

    const { value: password } = await Swal.fire({
        title: 'Enter Admin Password',
        input: 'password',
        inputPlaceholder: 'Enter password here',
        inputAttributes: {
            autocapitalize: 'off',
            autocorrect: 'off',
            autocomplete: 'new-password'
        },
        showCancelButton: true,
        confirmButtonText: 'Verify',
        showLoaderOnConfirm: true,
        reverseButtons: true,
        focusCancel: true,
        inputValidator: (value) => !value && 'Password is required!',
        preConfirm: async (password) => {
            try {
                const user = auth.currentUser;
                const credential = firebase.auth.EmailAuthProvider.credential(user.email, password.trim());
                await user.reauthenticateWithCredential(credential);
                return true;
            } catch (error) {
                console.error('Password verification error:', error.code, error.message);
                let errorMessage = 'Invalid admin password.';
                if (error.code === 'auth/wrong-password') {
                    errorMessage = 'Incorrect password. Please try again.';
                } else if (error.code === 'auth/too-many-requests') {
                    errorMessage = 'Too many failed attempts. Please try again later.';
                } else if (error.code === 'auth/invalid-credential') {
                    errorMessage = 'Invalid credentials. Ensure you are using an email/password account.';
                }
                Swal.fire({
                    icon: 'error',
                    title: 'Verification Failed',
                    text: errorMessage,
                    timer: 2000,
                    showConfirmButton: false,
                    timerProgressBar: true,
                    allowOutsideClick: false,
                    customClass: {
                        popup: 'swal2-popup-error-clean',
                        title: 'swal2-title-error-clean',
                        htmlContainer: 'swal2-text-error-clean'
                    }
                });
                return false;
            }
        },
        allowOutsideClick: () => !Swal.isLoading(),
        customClass: {
            popup: 'custom-swal-popup',
            title: 'custom-swal-title',
            input: 'custom-swal-input',
            confirmButton: 'custom-confirm-btn',
            cancelButton: 'custom-cancel-btn'
        }
    });

    if (!password) {
        isAdminVerified = false;
        return false;
    }

    isAdminVerified = true;
    return true;
}

let allVolunteerGroups = [];
let currentActiveActivations = [];

const calamityOptions = [
    "Select Calamity", "Typhoon", "Earthquake", "Flood", "Volcanic Eruption", "Landslide", "Tsunami"
];

let currentPage = 1;
const rowsPerPage = 5;

const tableBody = document.querySelector("#orgTable tbody");
const searchInput = document.querySelector("#searchInput");
const sortSelect = document.querySelector("#sortSelect");
const entriesInfo = document.querySelector("#entriesInfo");
const paginationContainer = document.querySelector("#pagination");
const clearBtn = document.querySelector('.clear-btn');
const addActivationBtn = document.getElementById("addActivationBtn");

const activationModal = document.getElementById("activationModal");
const closeBtn = document.getElementById("closeActivationModal");
const closeActivationModalBtn = document.getElementById("closeActivationModalBtn");
const modalTitle = document.getElementById("modalTitle");
const endorseModal = document.getElementById("endorseModal");
const closeEndorseModalBtn = document.getElementById("closeEndorseModal");
const mapModal = document.getElementById("mapModal");
const closeMapModalBtn = document.getElementById("closeMapModal");
const cancelMapModalBtn = document.getElementById("cancelMapModalBtn");
const saveLocationBtn = document.getElementById("saveLocationBtn");
const mapSearchInput = document.getElementById("mapSearchInput");

const modalStep1 = document.getElementById("modalStep1");
const selectGroupDropdown = document.getElementById("selectGroupDropdown");
const modalNextStepBtn = document.getElementById("modalNextStepBtn");

const modalStep2 = document.getElementById("modalStep2");
const selectedOrgName = document.getElementById("selectedOrgName");
const modalAreaInput = document.getElementById("modalAreaInput");
const modalLatitudeInput = document.getElementById("modalLatitudeInput");
const modalLongitudeInput = document.getElementById("modalLongitudeInput");
const modalCalamitySelect = document.getElementById("modalCalamitySelect");
const modalCalamityNameInput = document.getElementById("modalCalamityNameInput");
const modalActivateSubmitBtn = document.getElementById("modalActivateSubmitBtn");
const modalPrevStepBtn = document.getElementById("modalPrevStepBtn");
const pinLocationBtn = document.getElementById("pinLocationBtn");

let selectedGroupForActivation = null;
let map, markers = [], autocomplete, geocoder;
let activationMap, activationMarkers = [], activationsListener, singleInfoWindow, currentInfoWindow, isInfoWindowClicked = false;
let currentActivationId = null;
let currentGroupId = null;

let inactivityTimeout;
const INACTIVITY_TIME = 1800000;

function resetInactivityTimer() {
    clearTimeout(inactivityTimeout);
    inactivityTimeout = setTimeout(checkInactivity, INACTIVITY_TIME);
    console.log("Inactivity timer reset.");
}

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
            resetInactivityTimer();
            console.log("User chose to continue session.");
        } else if (result.dismiss === Swal.DismissReason.cancel) {
            auth.signOut().then(() => {
                console.log("User logged out due to inactivity.");
                window.location.href = "../pages/login.html";
            }).catch((error) => {
                console.error("Error logging out:", error);
                Swal.fire('Error', 'Failed to log out. Please try again.', 'error');
            });
        }
    });
}

['mousemove', 'keydown', 'scroll', 'click'].forEach(eventType => {
    document.addEventListener(eventType, resetInactivityTimer);
});

function initMap() {
    const defaultLocation = { lat: 14.5995, lng: 120.9842 };

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

function initActivationMap() {
    const defaultLocation = { lat: 14.5995, lng: 120.9842 };

    try {
        const mapDiv = document.getElementById("activationMap");
        if (!mapDiv) {
            console.error("Activation map container not found.");
            Swal.fire({
                icon: "error",
                title: "Map Error",
                text: "Activation map container not found on the page.",
            });
            return;
        }

        if (!window.google || !window.google.maps) {
            console.error("Google Maps API not loaded for activation map.");
            Swal.fire({
                icon: "error",
                title: "Map Error",
                text: "Google Maps API failed to load for the activation map.",
            });
            return;
        }

        activationMap = new google.maps.Map(mapDiv, {
            center: defaultLocation,
            zoom: 6,
            mapTypeId: "roadmap",
        });
        console.log("Activation map initialized successfully.");

        singleInfoWindow = new google.maps.InfoWindow();
        google.maps.event.trigger(activationMap, "resize");
        console.log("Activation map resize event triggered.");

        fetch('../json/ph_admin1.geojson')
            .then(res => {
                if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
                return res.json();
            })
            .then(data => {
                console.log("GeoJSON loaded:", data);

                const geoJsonLayer = activationMap.data;
                geoJsonLayer.addGeoJson(data);

                geoJsonLayer.setStyle({
                    fillColor: '#FA3B99',
                    fillOpacity: 0.4,
                    strokeColor: '#FFF',
                    strokeWeight: 1.5,
                    clickable: false,
                });

                geoJsonLayer.addListener('mouseover', event => {
                    geoJsonLayer.overrideStyle(event.feature, { fillOpacity: 0.7 });
                });

                geoJsonLayer.addListener('mouseout', event => {
                    geoJsonLayer.revertStyle(event.feature);
                });

                geoJsonLayer.addListener('click', event => {
                    const name = event.feature.getProperty("name") || event.feature.getProperty("NAME_1") || "Unnamed Province";
                    const content = `<strong>${name}</strong>`;
                    const infowindow = new google.maps.InfoWindow({
                        content,
                        position: event.latLng
                    });
                    infowindow.open(activationMap);
                });
            })
            .catch(error => {
                console.error("Error loading GeoJSON:", error);
            });

        addMarkersForActiveActivations();

    } catch (error) {
        console.error("Failed to initialize Activation Map:", error);
        Swal.fire({
            icon: "error",
            title: "Map Error",
            text: "Failed to load the activation map. Check your internet connection or API key.",
        });
    }
}

function addMarkersForActiveActivations() {
    if (!activationMap) {
        console.error("Activation map not initialized before adding markers");
        return;
    }

    if (activationsListener) {
        activationsListener.off();
        console.log("Removed existing activations listener");
    }

    activationsListener = database.ref("activations").orderByChild("status").equalTo("active").limitToLast(50);
    activationsListener.on("value", snapshot => {
        activationMarkers.forEach(marker => marker.setMap(null));
        activationMarkers = [];

        const activations = snapshot.val();
        if (!activations) {
            console.log("No active activations found in Firebase.");
            activationMap.setCenter({ lat: 14.5995, lng: 120.9842 });
            activationMap.setZoom(6);
            console.log("No activation markers to display, set default map view.");
            return;
        }

        const bounds = new google.maps.LatLngBounds();

        Object.entries(activations).forEach(([key, activation]) => {
            if (!activation.latitude || !activation.longitude) {
                return;
            }

            const position = { lat: parseFloat(activation.latitude), lng: parseFloat(activation.longitude) };
            const logoPath = "../assets/images/AB_logo.png";

            const marker = new google.maps.Marker({
                position: position,
                map: activationMap,
                title: activation.organization,
                icon: {
                    url: logoPath,
                    scaledSize: new google.maps.Size(40, 20),
                    anchor: new google.maps.Point(20, 10),
                },
            });

            activationMarkers.push(marker);
            bounds.extend(position);

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

        if (activationMarkers.length > 0) {
            activationMap.fitBounds(bounds);
            console.log("Adjusted activation map bounds to fit all markers.");
        } else {
            activationMap.setCenter({ lat: 14.5995, lng: 120.9842 });
            activationMap.setZoom(6);
            console.log("No activation markers to display, set default map view.");
        }

        google.maps.event.trigger(activationMap, "resize");
        console.log("Map resize event triggered after adding markers");
    }, error => {
        console.error("Error fetching activations for map:", error);
        Swal.fire({
            icon: "error",
            title: "Error",
            text: "Failed to load activation markers on the map.",
        });
    });
}

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
                        <span class="value">${activation.calamityName} (${activation.calamityType})</span>
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
            background: rgb(255, 255, 255);
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 6px;
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
            font-size: 24px;
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
        if (isInfoWindowClicked) return;
        if (currentInfoWindow && currentInfoWindow !== marker) singleInfoWindow.close();
        singleInfoWindow.setContent(content);
        singleInfoWindow.open(activationMap, marker);
        currentInfoWindow = marker;
        console.log(`InfoWindow opened on hover for ${activation.organization}`);
    });

    marker.addListener("mouseout", () => {
        if (isInfoWindowClicked) return;
        if (currentInfoWindow === marker) {
            singleInfoWindow.close();
            currentInfoWindow = null;
        }
    });

    marker.addListener("click", () => {
        if (currentInfoWindow && currentInfoWindow !== marker) singleInfoWindow.close();
        singleInfoWindow.setContent(content);
        singleInfoWindow.open(activationMap, marker);
        currentInfoWindow = marker;
        isInfoWindowClicked = true;
    });

    singleInfoWindow?.addListener("closeclick", () => {
        isInfoWindowClicked = false;
        currentInfoWindow = null;
    });
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

async function notifyABVN(activationId, groupId, reliefAmount, reliefPurpose) {
    try {
        const user = firebase.auth().currentUser;
        if (!user) {
            throw new Error("User not authenticated.");
        }

        const group = allVolunteerGroups.find(g => g.no === parseInt(groupId));
        if (!group) {
            throw new Error(`Volunteer group not found for groupId: ${groupId}`);
        }

        const activationSnapshot = await database.ref(`activations/${activationId}`).once("value");
        const activation = activationSnapshot.val();
        if (!activation) {
            throw new Error(`Activation not found for activationId: ${activationId}`);
        }

        let abvnUserUid = null;
        const usersSnapshot = await database.ref("users").orderByChild("organization").equalTo(group.organization).once("value");
        if (usersSnapshot.exists()) {
            usersSnapshot.forEach(child => {
                const userData = child.val();
                if (userData.role === "ABVN") {
                    abvnUserUid = child.key;
                }
            });
        }

        console.log(`ABVN user lookup for organization ${group.organization}: userUid=${abvnUserUid || 'none'}`);

        const notification = {
            groupId: groupId,
            organization: group.organization,
            activationId: activationId,
            reliefAmount: parseFloat(reliefAmount),
            reliefPurpose: reliefPurpose,
            timestamp: new Date().toISOString(),
            read: false,
            type: "relief",
            userUid: abvnUserUid || null,
            message: `Relief assistance of ₱${parseFloat(reliefAmount).toLocaleString()} for "${reliefPurpose}" has been sent to ${group.organization} for ${activation.calamityName} (${activation.calamityType}) in ${activation.areaOfOperation}.`,
            identifier: `relief_${activationId}_${groupId}_${Date.now()}`
        };

        const newNotificationRef = await database.ref("notifications").push(notification);
        console.log(`Notification created for ${group.organization}:`, notification);

        return newNotificationRef.key;
    } catch (error) {
        console.error("Error creating notification:", error);
        throw error;
    }
}

async function notifyABVNActivation(activationId, groupId) {
    try {
        const user = firebase.auth().currentUser;
        if (!user) {
            throw new Error("User not authenticated.");
        }

        const group = allVolunteerGroups.find(g => g.no === parseInt(groupId));
        if (!group) {
            throw new Error(`Volunteer group not found for groupId: ${groupId}`);
        }

        const activationSnapshot = await database.ref(`activations/${activationId}`).once("value");
        const activation = activationSnapshot.val();
        if (!activation) {
            throw new Error(`Activation not found for activationId: ${activationId}`);
        }

        let abvnUserUid = null;
        const usersSnapshot = await database.ref("users").orderByChild("organization").equalTo(group.organization).once("value");
        if (usersSnapshot.exists()) {
            usersSnapshot.forEach(child => {
                const userData = child.val();
                if (userData.role === "ABVN") {
                    abvnUserUid = child.key;
                }
            });
        }

        console.log(`ABVN user lookup for organization ${group.organization}: userUid=${abvnUserUid || 'none'}`);

        const notification = {
            groupId: groupId,
            organization: group.organization,
            activationId: activationId,
            timestamp: new Date().toISOString(),
            read: false,
            type: "activation",
            userUid: abvnUserUid || null,
            message: `${group.organization} has been activated for ${activation.calamityName} (${activation.calamityType}) in ${activation.areaOfOperation}.`,
            identifier: `activation_${activationId}_${groupId}_${Date.now()}`
        };

        const newNotificationRef = await database.ref("notifications").push(notification);
        console.log(`Activation notification created for ${group.organization}:`, notification);

        return newNotificationRef.key;
    } catch (error) {
        console.error("Error creating activation notification:", error);
        throw error;
    }
}

firebase.auth().onAuthStateChanged(async (user) => {
    console.log(`[${new Date().toISOString()}] Auth state changed:`, user ? { uid: user.uid, email: user.email } : 'No user');

    if (user) {
        try {
            const userSnapshot = await database.ref('users/' + user.uid).once('value');
            const userData = userSnapshot.val();
            const passwordNeedsReset = userData ? (userData.password_needs_reset || false) : false;

            if (passwordNeedsReset) {
                console.log(`[${new Date().toISOString()}] Password change required for user ${user.uid}. Redirecting to profile page.`);
                Swal.fire({
                    icon: 'error',
                    title: 'Password Change Required',
                    text: 'For security reasons, please change your password. You will be redirected to your profile.',
                    allowOutsideClick: false,
                    timer: 1600,
                    showConfirmButton: false,
                    timerProgressBar: true,
                    customClass: {
                        popup: 'swal2-popup-error-clean',
                        title: 'swal2-title-error-clean',
                        htmlContainer: 'swal2-text-error-clean'
                    }
                }).then(() => {
                    window.location.replace("../pages/profile.html");
                });
                return;
            }

            console.log("User is authenticated:", user.uid);
            console.log("Anonymous user:", user.isAnonymous);
            listenForDataUpdates();
            initActivationMap();
            resetInactivityTimer();

        } catch (error) {
            console.error(`[${new Date().toISOString()}] Error checking user data:`, error);
            Swal.fire({
                icon: 'error',
                title: 'Authentication Error',
                text: 'Failed to verify account status. Please try logging in again.',
                showConfirmButton: true,
                confirmButtonText: 'OK',
                customClass: {
                    popup: 'swal2-popup-error-clean',
                    title: 'swal2-title-error-clean',
                    htmlContainer: 'swal2-text-error-clean',
                    confirmButton: 'my-error-button'
                }
            }).then(() => {
                window.location.replace("../pages/login.html");
            });
        }
    } else {
        console.log("No user is authenticated. Attempting anonymous sign-in...");
        try {
            await firebase.auth().signInAnonymously();
            console.log("Signed in anonymously successfully.");
            initActivationMap();
            resetInactivityTimer();
        } catch (error) {
            console.error("Anonymous auth failed:", error.code, error.message);
            Swal.fire({
                icon: 'error',
                title: 'Authentication Error',
                text: `Failed to authenticate: ${error.message}. Please check your network and Firebase configuration.`,
                showConfirmButton: true,
                confirmButtonText: 'OK',
                customClass: {
                    popup: 'swal2-popup-error-clean',
                    title: 'swal2-title-error-clean',
                    htmlContainer: 'swal2-text-error-clean',
                    confirmButton: 'my-error-button'
                }
            });
        }
    }
});

function listenForDataUpdates() {
    console.log("Setting up real-time listener for volunteerGroups...");
    database.ref("volunteerGroups").on("value", snapshot => {
        const fetchedGroups = snapshot.val();
        
        allVolunteerGroups = [];
        if (fetchedGroups) {
            for (let key in fetchedGroups) {
                const groupData = fetchedGroups[key];
                const addressData = groupData.address;

                let combinedAddress = "Not specified";

                if (addressData) {
                    const addressParts = [];

                    if (addressData.region && addressData.region.trim() !== '') {
                        addressParts.push(addressData.region.trim());
                    }
                    if (addressData.province && addressData.province.trim() !== '') {
                        addressParts.push(addressData.province.trim());
                    }
                    if (addressData.city && addressData.city.trim() !== '') {
                        addressParts.push(addressData.city.trim());
                    }
                    if (addressData.streetAddress && addressData.streetAddress.trim() !== '') {
                        addressParts.push(addressData.streetAddress.trim());
                    }

                    if (addressParts.length > 0) {
                        combinedAddress = addressParts.join(', ');
                    }
                }

                allVolunteerGroups.push({
                    no: parseInt(key),
                    organization: groupData.organization || "Unknown",
                    hq: combinedAddress,
                    address: groupData.address || "N/A",
                    contactPerson: groupData.contactPerson || "Unknown",
                    email: groupData.email || "Not specified",
                    mobileNumber: groupData.mobileNumber || "Not specified",
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
                        hq: volunteerGroup ? volunteerGroup.hq : "Not specified",
                        areaOfOperation: activation.areaOfOperation || "Not specified",
                        calamityType: activation.calamityType || "Typhoon",
                        calamityName: activation.calamityName || "Unknown",
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
            currentActiveActivations.sort((a, b) => {
                const dateA = new Date(a.activationDate);
                const dateB = new Date(b.activationDate);
                return dateB - dateA;
            });
        } else {
            console.log("No activations found in the database.");
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

        let locationToDisplay = 'N/A';

        if (group.address && group.address.city && group.address.city.trim() !== '') {
            locationToDisplay = group.address.city;
        } else if (group.hq && group.hq.trim() !== '') {
            locationToDisplay = group.hq;
        }

        option.textContent = `${group.organization} (${locationToDisplay})`;
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

        tr.innerHTML = `
            <td>${displayNumber}</td>
            <td>${row.organization}</td>
            <td>${row.hq}</td>
            <td>${row.areaOfOperation || 'N/A'}</td>
            <td>${row.contactPerson || 'N/A'}</td>
            <td>${row.email || 'N/A'}</td>
            <td>${row.mobileNumber || 'N/A'}</td>
            <td>${row.calamityName} (${row.calamityType})</td>
            <td><span class="status-circle ${row.status === "active" ? "green" : "red"}"></span> ${row.status}</td>
            <td>
                <button title="Endorse" class="endorseBtn" data-id="${row.id}" data-group-id="${row.groupId}"><i class='bx bx-mail-send'></i></button>
                <button title="Archive" class="archiveBtn" data-activation-id="${row.id}" data-group-id="${row.groupId}"><i class="bx bx-x-circle"></i></button>
            </td>
        `;
        tableBody.appendChild(tr);
    });

    entriesInfo.textContent = `Showing ${start + 1} to ${Math.min(end, filteredData.length)} of ${filteredData.length} entries`;
    renderPagination(filteredData.length);
}

function handleSearch() {
    const query = searchInput.value.trim().toLowerCase();
    currentPage = 1;
    renderTable(filterAndSort());
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
    modalCalamityNameInput.value = "";
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
    modalCalamityNameInput.value = "";
}

function closeActivationModal() {
    activationModal.style.display = "none";
    selectedGroupForActivation = null;
    showStep1();
}

function openMapModal() {
    mapModal.style.display = "flex";
    initMap();
}

function closeMapModal() {
    mapModal.style.display = "none";
    clearMarkers();
}

addActivationBtn.addEventListener("click", openAddActivationModal);
closeBtn.addEventListener("click", closeActivationModal);
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

pinLocationBtn.addEventListener("click", openMapModal);

saveLocationBtn.addEventListener("click", () => {
    if (!modalAreaInput.value || !modalLatitudeInput.value || !modalLongitudeInput.value) {
        Swal.fire({
            icon: 'warning',
            title: 'Missing Location',
            text: 'Please pin a location on the map.'
        });
        return;
    }
    mapModal.style.display = "none";
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
    const calamityName = modalCalamityNameInput.value.trim();
    const latitude = modalLatitudeInput.value;
    const longitude = modalLongitudeInput.value;
    const activationDate = new Date().toISOString();

    if (!areaOfOperation || !calamityType || !calamityName) {
        Swal.fire({ icon: 'warning', title: 'Missing Fields', text: 'Please supply all required fields.' });
        return;
    }
    if (!areaOfOperation) {
        Swal.fire({ icon: 'warning', title: 'Missing Field', text: 'Please enter an Area of Operations.' });
        return;
    }
    if (!calamityType || calamityType === "Select Calamity") {
        Swal.fire({ icon: 'warning', title: 'Missing Field', text: 'Please select a Calamity Type.' });
        return;
    }
    if (!calamityName) {
        Swal.fire({ icon: 'warning', title: 'Missing Field', text: 'Please enter a Calamity Name.' });
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
            calamityName: calamityName,
            status: "active",
            activationDate: activationDate,
            latitude: parseFloat(latitude) || null,
            longitude: parseFloat(longitude) || null,
            activationId: null
        };

        const newActivationRef = database.ref("activations").push();
        const activationId = newActivationRef.key;
        newActivationRecord.activationId = activationId;

        await newActivationRef.set(newActivationRecord);
        await notifyABVNActivation(activationId, selectedGroupForActivation.no);
        console.log("Added new activation record:", { ...newActivationRecord, activationId });

        Swal.fire({
            icon: 'success',
            title: 'Activated!',
            text: `${selectedGroupForActivation.organization} has been activated for ${calamityName} (${calamityType}) in ${areaOfOperation}.`,
            showConfirmButton: true,
            confirmButtonText: 'OK',
            customClass: {
                popup: 'swal2-popup-success-clean',
                title: 'swal2-title-success-clean',
                htmlContainer: 'swal2-text-success-clean',
                confirmButton: 'my-success-button'
            }
        });
        closeActivationModal();
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
    document.getElementById("reliefAmountInput").value = "";
    document.getElementById("reliefPurposeInput").value = "";
    currentActivationId = null;
    currentGroupId = null;
}

closeEndorseModalBtn.addEventListener("click", closeEndorseModal);

document.getElementById("submitReliefBtn").addEventListener("click", async () => {
    const reliefAmount = document.getElementById("reliefAmountInput").value.trim();
    const reliefPurpose = document.getElementById("reliefPurposeInput").value.trim();

    if (!reliefAmount || isNaN(reliefAmount) || parseFloat(reliefAmount) <= 0) {
        Swal.fire({
            icon: 'warning',
            title: 'Invalid Amount',
            text: 'Please enter a valid relief assistance amount.'
        });
        return;
    }

    if (!reliefPurpose) {
        Swal.fire({
            icon: 'warning',
            title: 'Missing Purpose',
            text: 'Please specify the purpose of the relief assistance.'
        });
        return;
    }

    if (!currentActivationId || !currentGroupId) {
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'No activation or group selected for relief assistance.'
        });
        return;
    }

    try {
        const notificationId = await notifyABVN(currentActivationId, currentGroupId, reliefAmount, reliefPurpose);
        const reliefRecord = {
            activationId: currentActivationId,
            groupId: currentGroupId,
            reliefAmount: parseFloat(reliefAmount),
            reliefPurpose: reliefPurpose,
            notificationId: notificationId,
            timestamp: new Date().toISOString()
        };

        await database.ref("reliefAssistance").push(reliefRecord);
        
        Swal.fire({
            icon: 'success',
            title: 'Relief Assistance Sent!',
            text: `Relief assistance of ₱${parseFloat(reliefAmount).toLocaleString()} for "${reliefPurpose}" has been sent. The group has been notified.`,
            showConfirmButton: true,
            confirmButtonText: 'OK',
            customClass: {
                popup: 'swal2-popup-success-clean',
                title: 'swal2-title-success-clean',
                htmlContainer: 'swal2-text-success-clean',
                confirmButton: 'my-success-button'
            }
        });

        document.getElementById("reliefAmountInput").value = "";
        document.getElementById("reliefPurposeInput").value = "";
        currentActivationId = null;
        currentGroupId = null;
        closeEndorseModal();
    } catch (error) {
        console.error("Error sending relief assistance:", error);
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: `Failed to send relief assistance: ${error.message}`
        });
    }
});

tableBody.addEventListener("click", e => {
    const btn = e.target.closest("button");
    if (!btn) return;

    const activationId = btn.getAttribute('data-id') || btn.getAttribute('data-activation-id');
    const groupId = btn.getAttribute('data-group-id');

    if (btn.classList.contains("endorseBtn")) {
        currentActivationId = activationId;
        currentGroupId = groupId;
        openEndorseModal();
    } else if (btn.classList.contains("archiveBtn")) {
        if (!isAdminVerified) {
            verifySuperAdminPassword().then(verified => {
                if (!verified) {
                    console.log("Password verification failed or was canceled.");
                    return;
                }
                Swal.fire({
                    title: 'Are you sure?',
                    text: `Do you want to deactivate this specific operation for group ID ${groupId}?`,
                    icon: 'warning',
                    showCancelButton: true,
                    confirmButtonText: 'Yes, clear it!',
                    cancelButtonText: 'No, keep editing',
                    reverseButtons: true,
                    focusCancel: true,
                    allowOutsideClick: false,
                    customClass: {
                        popup: 'custom-swal-popup-large',
                        title: 'custom-swal-title',
                        htmlContainer: 'custom-swal-content',
                        confirmButton: 'custom-confirm-btn',
                        cancelButton: 'custom-cancel-btn'
                    }
                }).then((result) => {
                    if (result.isConfirmed) {
                        console.log("User confirmed deactivation. Checking authentication...");
                        const user = firebase.auth().currentUser;
                        if (!user) {
                            console.error("No authenticated user found.");
                            Swal.fire({ icon: 'error', title: 'Authentication Error', text: 'User not authenticated.' });
                            return;
                        }
                        
                        const activationRef = database.ref(`activations/${activationId}`);
                        
                        activationRef.once('value')
                            .then(snapshot => {
                                const activationData = snapshot.val();
                                if (!activationData) {
                                    console.error("No activation data found at the specified path.");
                                    throw new Error('Activation data not found.');
                                }
                                
                                const deactivatedActivation = {
                                    ...activationData,
                                    status: "inactive",
                                    deactivationDate: new Date().toISOString()
                                };

                                const deletedActivationRef = database.ref('deleted/deletedActivations').push();

                                console.log("Performing copy to deletedActivations and remove from activations...");
                                return Promise.all([
                                    deletedActivationRef.set(deactivatedActivation).then(() => {
                                        console.log("Successfully copied to deletedActivations.");
                                    }),
                                    activationRef.remove().then(() => {
                                        console.log("Successfully removed from activations.");
                                    })
                                ]);
                            })
                            .then(() => {
                                console.log("Deactivation process completed successfully.");
                                Swal.fire({
                                    icon: 'success',
                                    title: 'Deactivated!',
                                    text: `The activation has been moved to deleted activations.`,
                                    showConfirmButton: true,
                                    confirmButtonText: 'OK',
                                    customClass: {
                                        popup: 'swal2-popup-success-clean',
                                        title: 'swal2-title-success-clean',
                                        htmlContainer: 'swal2-text-success-clean',
                                        confirmButton: 'my-success-button'
                                    }
                                });
                                renderTable();
                            })
                            .catch(error => {
                                console.error("Error during deactivation process:", error);
                                Swal.fire({ icon: 'error', title: 'Error', text: `Failed to deactivate: ${error.message}` });
                            });
                    } else {
                        console.log("User canceled deactivation.");
                    }
                });
            });
        } else {
            Swal.fire({
                title: 'Are you sure?',
                text: `Do you want to deactivate this specific operation for group ID ${groupId}?`,
                icon: 'warning',
                showCancelButton: true,
                confirmButtonText: 'Yes, clear it!',
                cancelButtonText: 'No, keep editing',
                reverseButtons: true,
                focusCancel: true,
                allowOutsideClick: false,
                customClass: {
                    popup: 'custom-swal-popup-large',
                    title: 'custom-swal-title',
                    htmlContainer: 'custom-swal-content',
                    confirmButton: 'custom-confirm-btn',
                    cancelButton: 'custom-cancel-btn'
                }
            }).then((result) => {
                if (result.isConfirmed) {
                    console.log("User confirmed deactivation. Checking authentication...");
                    const user = firebase.auth().currentUser;
                    if (!user) {
                        console.error("No authenticated user found.");
                        Swal.fire({ icon: 'error', title: 'Authentication Error', text: 'User not authenticated.' });
                        return;
                    }
                    
                    const activationRef = database.ref(`activations/${activationId}`);
                    
                    activationRef.once('value')
                        .then(snapshot => {
                            const activationData = snapshot.val();
                            if (!activationData) {
                                console.error("No activation data found at the specified path.");
                                throw new Error('Activation data not found.');
                            }
                            
                            const deactivatedActivation = {
                                ...activationData,
                                status: "inactive",
                                deactivationDate: new Date().toISOString()
                            };

                            const deletedActivationRef = database.ref('deleted/deletedActivations').push();

                            console.log("Performing copy to deletedActivations and remove from activations...");
                            return Promise.all([
                                deletedActivationRef.set(deactivatedActivation).then(() => {
                                    console.log("Successfully copied to deletedActivations.");
                                }),
                                activationRef.remove().then(() => {
                                    console.log("Successfully removed from activations.");
                                })
                            ]);
                        })
                        .then(() => {
                            console.log("Deactivation process completed successfully.");
                            Swal.fire({
                                icon: 'success',
                                title: 'Deactivated!',
                                text: `The activation has been moved to deleted activations.`,
                                showConfirmButton: true,
                                confirmButtonText: 'OK',
                                customClass: {
                                    popup: 'swal2-popup-success-clean',
                                    title: 'swal2-title-success-clean',
                                    htmlContainer: 'swal2-text-success-clean',
                                    confirmButton: 'my-success-button'
                                }
                            });
                            renderTable();
                        })
                        .catch(error => {
                            console.error("Error during deactivation process:", error);
                            Swal.fire({ icon: 'error', title: 'Error', text: `Failed to deactivate: ${error.message}` });
                        });
                } else {
                    console.log("User canceled deactivation.");
                }
            });
        }
    } else {
        console.log("Clicked element does not match expected buttons:", btn);
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
                return a.calamityName.localeCompare(b.calamityName);
            }
            return 0;
        });
    } else {
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

function cleanupActivationPage() {
    console.log("Cleaning up activation page state.");

    if (activationsListener) {
        activationsListener.off();
        activationsListener = null;
        console.log("Removed activations listener for map.");
    }

    activationMarkers.forEach(marker => marker.setMap(null));
    activationMarkers = [];

    if (singleInfoWindow) {
        singleInfoWindow.close();
        singleInfoWindow = null;
        currentInfoWindow = null;
        isInfoWindowClicked = false;
    }

    markers.forEach(marker => marker.setMap(null));
    markers = [];
}

window.addEventListener('beforeunload', cleanupActivationPage);
window.addEventListener('navigate-away', () => {
    console.log('navigate-away event: Cleaning up activation page.');
    cleanupActivationPage();
});
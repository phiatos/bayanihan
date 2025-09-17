// activation.js
console.log = function () {};
console.error = function () {};
console.warn = function () {};


const firebaseConfig = {
  apiKey: "AIzaSyBkmXOJvnlBtzkjNyR6wyd9BgGM0BhN0L8",
  authDomain: "bayanihan-new-472410.firebaseapp.com",
  projectId: "bayanihan-new-472410",
  storageBucket: "bayanihan-new-472410.firebasestorage.app",
  messagingSenderId: "995982574131",
  appId: "1:995982574131:web:3d45e358fad330c276d946",
  measurementId: "G-CEVPTQZM9C",
  databaseURL: "https://bayanihan-new-472410-default-rtdb.asia-southeast1.firebasedatabase.app/"
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
let activationHistory = [];
let historyCurrentPage = 1;
let allCalamities = [];

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
const modalActivateSubmitBtn = document.getElementById("modalActivateSubmitBtn");
const modalPrevStepBtn = document.getElementById("modalPrevStepBtn");
const pinLocationBtn = document.getElementById("pinLocationBtn");

const activationHistoryModal = document.getElementById("activationHistoryModal");
const closeActivationHistoryModalBtn = document.getElementById("closeActivationHistoryModal");
const historyTableBody = document.getElementById("historyTableBody");
const historyEntriesInfo = document.getElementById("historyEntriesInfo");
const historyPaginationContainer = document.getElementById("historyPagination");
const viewActivationHistoryBtn = document.getElementById("viewActivationHistory");

let selectedGroupForActivation = null;
let map, markers = [], autocomplete, geocoder;
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

function populateCalamityDropdown() {
    const calamitySelect = document.getElementById("modalCalamityNameSelect");
    calamitySelect.innerHTML = '<option value="" disabled selected>-- Select Calamity Name --</option>';
    allCalamities.forEach(calamity => {
        const option = document.createElement("option");
        option.value = calamity.id;
        option.textContent = `${calamity.name} (${calamity.type})`;
        calamitySelect.appendChild(option);
    });
    const addNewOption = document.createElement("option");
    addNewOption.value = "add_new";
    addNewOption.textContent = "Add New Calamity";
    calamitySelect.appendChild(addNewOption);
}

document.getElementById("modalCalamityNameSelect").addEventListener("change", (e) => {
    const selectedCalamityId = e.target.value;
    const newCalamityInputContainer = document.getElementById("newCalamityInputContainer");
    const newCalamityInput = document.getElementById("modalNewCalamityNameInput");

    if (selectedCalamityId === "add_new") {
        newCalamityInputContainer.style.display = "block";
        newCalamityInput.value = "";
        modalCalamitySelect.value = ""; // Reset calamity type
    } else {
        newCalamityInputContainer.style.display = "none";
        const selectedCalamity = allCalamities.find(calamity => calamity.id === selectedCalamityId);
        if (selectedCalamity) {
            modalCalamitySelect.value = selectedCalamity.type; // Auto-select the associated type
        }
    }
});

function initMap(latitude = 14.5995, longitude = 120.9842, formattedAddress = null) {
    const defaultLocation = { lat: latitude, lng: longitude };

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

    // If a formattedAddress and coordinates are provided, set a marker
    if (formattedAddress && latitude && longitude) {
        map.setCenter(defaultLocation);
        map.setZoom(16);
        clearMarkers();
        const marker = new google.maps.Marker({
            position: defaultLocation,
            map: map,
            title: "Selected ABVN Location",
        });
        markers.push(marker);
        const infowindow = new google.maps.InfoWindow({
            content: `Selected ABVN Location<br>${formattedAddress}`,
        });
        marker.addListener("click", () => infowindow.open(map, marker));
        infowindow.open(map, marker);
        modalAreaInput.value = formattedAddress;
        modalLatitudeInput.value = latitude;
        modalLongitudeInput.value = longitude;
    } else {
        // Fall back to user's geolocation if no coordinates are provided
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

        const group = allVolunteerGroups.find(g => g.no === groupId);
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
        console.log("notifyABVNActivation called with activationId:", activationId, "groupId:", groupId);
        console.log("selectedGroupForActivation:", selectedGroupForActivation);
        console.log("allVolunteerGroups IDs:", allVolunteerGroups.map(g => g.no));

        const user = firebase.auth().currentUser;
        if (!user) {
            console.error("User not authenticated.");
            throw new Error("User not authenticated.");
        }

        if (!selectedGroupForActivation || selectedGroupForActivation.no !== groupId) {
            console.error("Invalid or mismatched selectedGroupForActivation:", selectedGroupForActivation, "Expected groupId:", groupId);
            throw new Error(`Invalid group selection for groupId: ${groupId}`);
        }

        const group = selectedGroupForActivation;

        const activationSnapshot = await database.ref(`activations/${activationId}`).once("value");
        const activation = activationSnapshot.val();
        if (!activation) {
            console.error("Activation not found for activationId:", activationId);
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
        console.error("Error creating activation notification:", error.message);
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
    console.log("Starting listenForDataUpdates at", new Date().toISOString());
    database.ref("volunteerGroups").on("value", snapshot => {
        console.log("VolunteerGroups snapshot received:", snapshot.val());
        allVolunteerGroups = [];
        const fetchedGroups = snapshot.val();
        if (fetchedGroups) {
            for (let key in fetchedGroups) {
                const groupData = fetchedGroups[key];
                console.log("Processing group with key:", key);
                const addressData = groupData.address || {};
                let combinedAddress = addressData.formattedAddress || "Not specified";
                if (!addressData.formattedAddress && addressData) {
                    const addressParts = [];
                    if (addressData.region && addressData.region.trim() !== '') addressParts.push(addressData.region.trim());
                    if (addressData.province && addressData.province.trim() !== '') addressParts.push(addressData.province.trim());
                    if (addressData.city && addressData.city.trim() !== '') addressParts.push(addressData.city.trim());
                    if (addressData.streetAddress && addressData.streetAddress.trim() !== '') addressParts.push(addressData.streetAddress.trim());
                    if (addressParts.length > 0) combinedAddress = addressParts.join(', ');
                }
                allVolunteerGroups.push({
                    no: key,
                    organization: groupData.organization || "Unknown",
                    hq: combinedAddress,
                    address: addressData,
                    contactPerson: groupData.contactPerson || "Unknown",
                    email: groupData.email || "Not specified",
                    mobileNumber: groupData.mobileNumber || "Not specified",
                });
            }
            allVolunteerGroups.sort((a, b) => a.no.localeCompare(b.no));
            console.log("Processed allVolunteerGroups:", allVolunteerGroups.map(g => ({ no: g.no, organization: g.organization, hq: g.hq })));
            console.log("Group IDs in allVolunteerGroups:", allVolunteerGroups.map(g => g.no));
        } else {
            console.warn("No volunteerGroups data found.");
        }
        populateGroupDropdown();
        renderHistoryTable();
    }, error => {
        console.error("Error fetching volunteerGroups:", error.code, error.message);
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
                if (key === "calamities" || key === "activationHistory") continue; // Skip calamities and activationHistory
                const activation = fetchedActivations[key];
                if (activation.status === 'active') {
                    const volunteerGroup = allVolunteerGroups.find(group => group.no === String(activation.groupId));
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
            console.log("No active activations found in the database.");
        }
        renderTable();
    }, error => {
        console.error("Error listening for active activations:", error.code, error.message);
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: `Failed to load active activations: ${error.message}`
        });
    });

    console.log("Setting up real-time listener for calamities...");
    database.ref("activations/calamities").on("value", snapshot => {
        console.log("Calamities snapshot received:", snapshot.val());
        allCalamities = [];
        const fetchedCalamities = snapshot.val();
        if (fetchedCalamities) {
            for (let key in fetchedCalamities) {
                const calamityData = fetchedCalamities[key];
                allCalamities.push({
                    id: key,
                    name: calamityData.name || "Unknown",
                    type: calamityData.type || "Unknown",
                    createdAt: calamityData.createdAt || "N/A"
                });
            }
            allCalamities.sort((a, b) => a.name.localeCompare(b.name)); // Sort by name
            console.log("Processed allCalamities:", allCalamities);
        } else {
            console.warn("No calamities data found.");
        }
        populateCalamityDropdown(); // Call to populate the dropdown
    }, error => {
        console.error("Error fetching calamities:", error.code, error.message);
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: `Failed to load calamities: ${error.message}`
        });
    });

    console.log("Setting up real-time listener for activation history...");
    database.ref("activations/activationHistory").orderByChild("deactivationDate").on("value", snapshot => {
        const fetchedHistory = snapshot.val();
        activationHistory = [];
        if (fetchedHistory) {
            for (let key in fetchedHistory) {
                const activation = fetchedHistory[key];
                const volunteerGroup = allVolunteerGroups.find(group => group.no === String(activation.groupId));
                activationHistory.push({
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
                    deactivationDate: activation.deactivationDate || "N/A",
                    contactPerson: volunteerGroup ? volunteerGroup.contactPerson : "N/A",
                    email: volunteerGroup ? volunteerGroup.email : "N/A",
                    mobileNumber: volunteerGroup ? volunteerGroup.mobileNumber : "N/A"
                });
            }
            activationHistory.sort((a, b) => {
                const dateA = new Date(a.deactivationDate);
                const dateB = new Date(b.deactivationDate);
                return dateB - dateA;
            });
        } else {
            console.log("No activation history found in the database.");
        }
        renderHistoryTable();
    }, error => {
        console.error("Error listening for activation history:", error.code, error.message);
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: `Failed to load activation history: ${error.message}`
        });
    });
}

function populateGroupDropdown() {
    console.log("Populating selectGroupDropdown with groups:", allVolunteerGroups);
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
    console.log("Dropdown populated, options count:", selectGroupDropdown.options.length);
}

function renderTable(filteredData = currentActiveActivations) {
    tableBody.innerHTML = "";
    const start = (currentPage - 1) * rowsPerPage;
    const end = start + rowsPerPage;
    const pageData = filteredData.slice(start, end);

    // Adjust currentPage if no data on current page but data exists
    if (pageData.length === 0 && filteredData.length > 0 && currentPage > 1) {
        currentPage = Math.max(1, Math.ceil(filteredData.length / rowsPerPage));
        renderTable(filteredData); // Re-render with adjusted page
        return;
    } else if (pageData.length === 0 && filteredData.length === 0) {
        const noDataRow = document.createElement("tr");
        noDataRow.innerHTML = `<td colspan="10" style="text-align: center;">No active group activations to display.</td>`;
        tableBody.appendChild(noDataRow);
        entriesInfo.textContent = `Showing 0 to 0 of 0 entries`;
        renderPagination(0); // Update pagination for empty data
        return;
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
                <button title="Deactivate" class="archiveBtn" data-activation-id="${row.id}" data-group-id="${row.groupId}"><i class='bx bx-power-off'></i></button>
            </td>
        `;
        tableBody.appendChild(tr);
    });

    entriesInfo.textContent = `Showing ${start + 1} to ${Math.min(end, filteredData.length)} of ${filteredData.length} entries`;
    renderPagination(filteredData.length); // Always render pagination after table
}

function renderHistoryTable() {
    historyTableBody.innerHTML = "";
    const start = (historyCurrentPage - 1) * rowsPerPage;
    const end = start + rowsPerPage;
    const pageData = activationHistory.slice(start, end);

    if (pageData.length === 0 && activationHistory.length > 0 && historyCurrentPage > 1) {
        historyCurrentPage--;
        renderHistoryTable();
        return;
    } else if (pageData.length === 0 && activationHistory.length === 0) {
        const noDataRow = document.createElement("tr");
        noDataRow.innerHTML = `<td colspan="10" style="text-align: center;">No activation history to display.</td>`;
        historyTableBody.appendChild(noDataRow);
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
            <td><span class="status-circle red"></span> ${row.status}</td>
            <td>${row.deactivationDate || 'N/A'}</td>
        `;
        historyTableBody.appendChild(tr);
    });

    historyEntriesInfo.textContent = `Showing ${start + 1} to ${Math.min(end, activationHistory.length)} of ${activationHistory.length} entries`;
    renderHistoryPagination(activationHistory.length);
}

function renderHistoryPagination(totalRows) {
    historyPaginationContainer.innerHTML = "";
    const totalPages = Math.ceil(totalRows / rowsPerPage);
    const maxVisible = 5;

    const createButton = (label, page = null, disabled = false, active = false) => {
        const btn = document.createElement("button");
        btn.textContent = label;
        if (disabled) btn.disabled = true;
        if (active) btn.classList.add("active-page");
        if (page !== null) {
            btn.addEventListener("click", () => {
                historyCurrentPage = page;
                renderHistoryTable();
            });
        }
        return btn;
    };

    if (totalPages === 0) return;

    historyPaginationContainer.appendChild(createButton("Prev", historyCurrentPage - 1, historyCurrentPage === 1));

    let startPage = Math.max(1, historyCurrentPage - Math.floor(maxVisible / 2));
    let endPage = Math.min(totalPages, startPage + maxVisible - 1);

    if (endPage - startPage < maxVisible - 1) {
        startPage = Math.max(1, endPage - maxVisible + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
        historyPaginationContainer.appendChild(createButton(i, i, false, i === historyCurrentPage));
    }

    historyPaginationContainer.appendChild(createButton("Next", historyCurrentPage + 1, historyCurrentPage === totalPages));
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
                return (statusOrder[a.status] || 999) - (statusOrder[b.status] || 999); // Fallback for unknown statuses
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

    // Adjust currentPage if it exceeds the number of pages
    const totalPages = Math.ceil(filtered.length / rowsPerPage);
    if (currentPage > totalPages && totalPages > 0) {
        currentPage = totalPages;
    } else if (totalPages === 0) {
        currentPage = 1;
    }

    return filtered;
}

function renderPagination(totalRows) {
    paginationContainer.innerHTML = "";
    const totalPages = Math.ceil(totalRows / rowsPerPage);
    const maxVisible = 5;

    // If no data, clear pagination and return
    if (totalPages === 0) {
        paginationContainer.innerHTML = "";
        return;
    }

    const createButton = (label, page = null, disabled = false, active = false) => {
        const btn = document.createElement("button");
        btn.textContent = label;
        if (disabled) btn.disabled = true;
        if (active) btn.classList.add("active-page");
        if (page !== null) {
            btn.addEventListener("click", () => {
                currentPage = page;
                renderTable(filterAndSort()); // Use filtered data
            });
        }
        return btn;
    };

    // Add Previous button
    paginationContainer.appendChild(createButton("Prev", currentPage - 1, currentPage === 1));

    // Calculate visible page range
    let startPage = Math.max(1, currentPage - Math.floor(maxVisible / 2));
    let endPage = Math.min(totalPages, startPage + maxVisible - 1);

    if (endPage - startPage < maxVisible - 1) {
        startPage = Math.max(1, endPage - maxVisible + 1);
    }

    // Add page number buttons
    for (let i = startPage; i <= endPage; i++) {
        paginationContainer.appendChild(createButton(i, i, false, i === currentPage));
    }

    // Add Next button
    paginationContainer.appendChild(createButton("Next", currentPage + 1, currentPage === totalPages));
}

function handleSearch() {
    currentPage = 1;
    renderTable(filterAndSort());
}

clearBtn.style.display = 'none';
searchInput.addEventListener('input', () => {
    clearBtn.style.display = searchInput.value.trim() ? 'inline-block' : 'none';
    handleSearch();
});

clearBtn.addEventListener('click', () => {
    searchInput.value = '';
    clearBtn.style.display = 'none';
    currentPage = 1;
    renderTable(filterAndSort());
});

sortSelect.addEventListener("change", () => {
    currentPage = 1;
    renderTable(filterAndSort());
});

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
    document.getElementById("modalCalamityNameSelect").value = "";
    document.getElementById("modalNewCalamityNameInput").value = "";
    document.getElementById("newCalamityInputContainer").style.display = "none";
    populateCalamityDropdown();
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
    // Prefill modalAreaInput with the selected group's hq if not already set
    if (!modalAreaInput.value && selectedGroupForActivation.hq) {
        modalAreaInput.value = selectedGroupForActivation.hq;
        // Prefill latitude and longitude if available
        if (selectedGroupForActivation.address && selectedGroupForActivation.address.latitude && selectedGroupForActivation.address.longitude) {
            modalLatitudeInput.value = selectedGroupForActivation.address.latitude;
            modalLongitudeInput.value = selectedGroupForActivation.address.longitude;
        }
    }
    modalCalamitySelect.innerHTML = calamityOptions
        .map((opt, index) => {
            if (index === 0) {
                return `<option value="" disabled selected>-- Select Calamity Type --</option>`;
            }
            return `<option value="${opt}">${opt}</option>`;
        })
        .join("");
    document.getElementById("modalCalamityNameSelect").value = "";
    document.getElementById("modalNewCalamityNameInput").value = "";
    document.getElementById("newCalamityInputContainer").style.display = "none";
    populateCalamityDropdown();
}

function closeActivationModal() {
    activationModal.style.display = "none";
    selectedGroupForActivation = null;
    showStep1();
}

function openMapModal() {
    mapModal.style.display = "flex";
    if (selectedGroupForActivation && selectedGroupForActivation.address && selectedGroupForActivation.address.latitude && selectedGroupForActivation.address.longitude) {
        initMap(
            selectedGroupForActivation.address.latitude,
            selectedGroupForActivation.address.longitude,
            selectedGroupForActivation.hq
        );
    } else {
        initMap(); 
    }
}

function closeMapModal() {
    mapModal.style.display = "none";
    clearMarkers();
}

function openActivationHistoryModal() {
    activationHistoryModal.style.display = "flex";
    renderHistoryTable();
}

function closeActivationHistoryModal() {
    activationHistoryModal.style.display = "none";
}
document.addEventListener("DOMContentLoaded", () => {

    if (!viewActivationHistoryBtn) {
        console.error("viewActivationHistory button not found in the DOM");
    } else {
        console.log("viewActivationHistory button found, attaching event listener");
        viewActivationHistoryBtn.addEventListener("click", () => {
            console.log("viewActivationHistory button clicked");
            openActivationHistoryModal();
        });
    }

    if (!closeActivationHistoryModalBtn) {
        console.error("closeActivationHistoryModal button not found in the DOM");
    } else {
        console.log("closeActivationHistoryModal button found, attaching event listener");
        closeActivationHistoryModalBtn.addEventListener("click", () => {
            console.log("closeActivationHistoryModal button clicked");
            closeActivationHistoryModal();
        });
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
        } else if (event.target === activationHistoryModal) {
            closeActivationHistoryModal();
        }
    });

    selectGroupDropdown.addEventListener("change", (e) => {
        const selectedId = e.target.value;
        console.log("selectGroupDropdown changed, selectedId:", selectedId);
        selectedGroupForActivation = allVolunteerGroups.find(group => group.no === selectedId) || null;
        console.log("Selected group:", selectedGroupForActivation);
        modalNextStepBtn.disabled = !selectedGroupForActivation;
        console.log("Next button disabled state:", modalNextStepBtn.disabled);
        // Prefill modalAreaInput with the selected group's hq (formattedAddress)
        if (selectedGroupForActivation && selectedGroupForActivation.hq) {
            modalAreaInput.value = selectedGroupForActivation.hq;
            // Prefill latitude and longitude if available
            if (selectedGroupForActivation.address && selectedGroupForActivation.address.latitude && selectedGroupForActivation.address.longitude) {
                modalLatitudeInput.value = selectedGroupForActivation.address.latitude;
                modalLongitudeInput.value = selectedGroupForActivation.address.longitude;
            } else {
                modalLatitudeInput.value = "";
                modalLongitudeInput.value = "";
            }
        } else {
            modalAreaInput.value = "";
            modalLatitudeInput.value = "";
            modalLongitudeInput.value = "";
        }
    });

    modalNextStepBtn.addEventListener("click", () => {
        console.log("Next button clicked");
        showStep2();
    });

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
    if (!selectedGroupForActivation || !selectedGroupForActivation.no) {
        Swal.fire({ icon: 'error', title: 'Error', text: 'No organization selected for activation.' });
        return;
    }

    const areaOfOperation = modalAreaInput.value.trim();
    const calamityType = modalCalamitySelect.value;
    const calamitySelect = document.getElementById("modalCalamityNameSelect");
    const selectedCalamityId = calamitySelect.value;
    let calamityName = "";
    let newCalamityId = null;

    if (selectedCalamityId === "add_new") {
        calamityName = document.getElementById("modalNewCalamityNameInput").value.trim();
        if (!calamityName) {
            Swal.fire({
                icon: 'warning',
                title: 'Missing Calamity Name',
                text: 'Please enter a valid calamity name.',
                confirmButtonText: 'OK',
                customClass: {
                    popup: 'swal2-popup-warning-clean',
                    title: 'swal2-title-warning-clean',
                    htmlContainer: 'swal2-text-warning-clean',
                    confirmButton: 'my-warning-button'
                }
            });
            return;
        }
    } else {
        const selectedCalamity = allCalamities.find(calamity => calamity.id === selectedCalamityId);
        if (!selectedCalamity) {
            Swal.fire({ 
                icon: 'error',
                title: 'Selected calamity is invalid.',
                text: message,
                confirmButtonText: 'OK',
                customClass: {
                    popup: 'swal2-popup-error-clean',
                    title: 'swal2-title-error-clean',
                    htmlContainer: 'swal2-text-error-clean',
                    confirmButton: 'my-error-button'
                }
            });
            return;
        }
        calamityName = selectedCalamity.name;
    }

    const latitude = parseFloat(modalLatitudeInput.value);
    const longitude = parseFloat(modalLongitudeInput.value);
    const activationDate = new Date().toISOString();

    if (!areaOfOperation || !calamityType || !calamityName) {
        Swal.fire({ icon: 'warning', title: 'Missing Fields', text: 'Please supply all required fields.' });
        return;
    }
    if (isNaN(latitude) || isNaN(longitude)) {
        Swal.fire({ icon: 'warning', title: 'Invalid Location', text: 'Please provide valid latitude and longitude values.' });
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
                activation.calamityName.toLowerCase() === calamityName.toLowerCase()) {
                alreadyActiveInAreaForCalamity = true;
                return true;
            }
        });

        if (alreadyActiveInAreaForCalamity) {
            Swal.fire({
                icon: 'warning',
                title: 'Activation Conflict',
                text: `${selectedGroupForActivation.organization} is already active for "${calamityName}" in "${areaOfOperation}". Please deactivate the existing operation first or choose a different area or calamity.`
            });
            return;
        }

        if (selectedCalamityId === "add_new") {
            const newCalamityRef = database.ref("activations/calamities").push();
            newCalamityId = newCalamityRef.key;
            await newCalamityRef.set({
                name: calamityName,
                type: calamityType,
                createdAt: new Date().toISOString()
            });
        }

        const nextNo = await getNextActivationNumber();

        const newActivationRecord = {
            no: nextNo,
            groupId: String(selectedGroupForActivation.no),
            organization: selectedGroupForActivation.organization,
            areaOfOperation: areaOfOperation,
            calamityType: calamityType,
            calamityName: calamityName,
            status: "active",
            activationDate: activationDate,
            address: {
                formattedAddress: areaOfOperation, // Use areaOfOperation instead of hq
                latitude: latitude,
                longitude: longitude
            },
            activationId: null
        };

        const newActivationRef = database.ref("activations").push();
        const activationId = newActivationRef.key;
        newActivationRecord.activationId = activationId;

        await newActivationRef.set(newActivationRecord);
        await notifyABVNActivation(activationId, selectedGroupForActivation.no);

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
        const activation = currentActiveActivations.find(a => a.id === activationId);
        if (!activation) {
            Swal.fire({ icon: 'error', title: 'Error', text: 'Activation not found.' });
            return;
        }

        if (!isAdminVerified) {
            verifySuperAdminPassword().then(verified => {
                if (!verified) {
                    console.log("Password verification failed or was canceled.");
                    return;
                }
                Swal.fire({
                    title: 'Are you sure?',
                    text: `Do you want to deactivate the operation for ${activation.organization} for ${activation.calamityName} in ${activation.areaOfOperation}?`,
                    icon: 'warning',
                    showCancelButton: true,
                    confirmButtonText: 'Yes, deactivate it!',
                    cancelButtonText: 'No, keep it',
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

                                const historyActivationRef = database.ref(`activations/activationHistory`).push();

                                console.log("Performing copy to activationHistory and remove from activations...");
                                return Promise.all([
                                    historyActivationRef.set(deactivatedActivation).then(() => {
                                        console.log("Successfully copied to activationHistory.");
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
                                    text: `The activation has been moved to activation history.`,
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
                text: `Do you want to deactivate the operation for ${activation.organization} for ${activation.calamityName} in ${activation.areaOfOperation}?`,
                icon: 'warning',
                showCancelButton: true,
                confirmButtonText: 'Yes, deactivate it!',
                cancelButtonText: 'No, keep it',
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

                            const historyActivationRef = database.ref(`activations/activationHistory`).push();

                            console.log("Performing copy to activationHistory and remove from activations...");
                            return Promise.all([
                                historyActivationRef.set(deactivatedActivation).then(() => {
                                    console.log("Successfully copied to activationHistory.");
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
                                text: `The activation has been moved to activation history.`,
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

function cleanupActivationPage() {
    console.log("Cleaning up activation page state.");
    markers.forEach(marker => marker.setMap(null));
    markers = [];
}

    window.addEventListener('beforeunload', cleanupActivationPage);
    window.addEventListener('navigate-away', () => {
        console.log('navigate-away event: Cleaning up activation page.');
        cleanupActivationPage();
    });
});
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

try {
    firebase.initializeApp(firebaseConfig);
} catch (error) {
    Swal.fire({
        icon: "error",
        title: "Initialization Error",
        text: "Failed to initialize Firebase. Check configuration."
    });
}
const auth = firebase.auth();
const database = firebase.database();

try {
    firebase.initializeApp(firebaseConfig, "SecondaryApp");
} catch (error) {
}
const secondaryAuth = firebase.auth(firebase.app("SecondaryApp"));

try {
    emailjs.init('ULA8rmn7VM-3fZ7ik');
} catch (error) {
}

function generateTempPassword() {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    let password = "";
    for (let i = 0; i < 8; i++) {
        password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
}

function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const validDomains = ['gmail.com'];
    const domain = email.split('@')[1]?.toLowerCase();
    return emailRegex.test(email) && validDomains.includes(domain);
}

function isValidMobile(mobile) {
    mobile = mobile.replace(/\D/g, '');
    const mobileRegex = /^09[0-9]{9}$/;
    return mobileRegex.test(mobile);
}

document.getElementById('mobileNumber').addEventListener('input', (e) => {
    e.target.value = e.target.value.replace(/\D/g, '');
});
document.getElementById('editMobileNumber').addEventListener('input', (e) => {
    e.target.value = e.target.value.replace(/\D/g, '');
});

async function isMobileNumberInUse(mobile, excludeUid) {
    try {
        const snapshot = await database.ref('users').once('value');
        const users = snapshot.val();
        for (const uid in users) {
            if (uid !== excludeUid && users[uid].mobile === mobile) {
                return true;
            }
        }
        return false;
    } catch (error) {
        return false;
    }
}

async function isEmailInUse(email, excludeUid) {
    try {
        const snapshot = await database.ref('users').once('value');
        const users = snapshot.val();
        for (const uid in users) {
            if (uid !== excludeUid && users[uid].email === email) {
                return true;
            }
        }
        return false;
    } catch (error) {
        return false;
    }
}

async function isDataUnchanged(orgId, updatedData) {
    try {
        const snapshot = await database.ref(`volunteerGroups/${orgId}`).once('value');
        const orgData = snapshot.val();
        if (!orgData) return false;

        return (
            orgData.organization === updatedData.organization &&
            orgData.contactPerson === updatedData.contactPerson &&
            orgData.email === updatedData.email &&
            orgData.mobileNumber === updatedData.mobileNumber &&
            orgData.socialMedia === updatedData.socialMedia &&
            orgData.address.formattedAddress === updatedData.address.formattedAddress &&
            orgData.address.latitude === updatedData.address.latitude &&
            orgData.address.longitude === updatedData.address.longitude &&
            orgData.organizationalBackgroundMission === updatedData.organizationalBackgroundMission &&
            orgData.areasOfExpertiseFocus === updatedData.areasOfExpertiseFocus &&
            orgData.legalStatusRegistration === updatedData.legalStatusRegistration &&
            orgData.requiredDocumentsLink === updatedData.requiredDocumentsLink &&
            orgData.applicationDateandTime === updatedData.applicationDateandTime &&
            orgData.approvedApplicationDate === updatedData.approvedApplicationDate &&
            orgData.recaptchaResponse === updatedData.recaptchaResponse
        );
    } catch (error) {
        return false;
    }
}

async function verifySuperAdminPassword() {
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
        allowOutsideClick: false,
        customClass: {
            popup: 'custom-swal-popup',
            title: 'custom-swal-title',
            input: 'custom-swal-input',
            confirmButton: 'custom-confirm-btn',
            cancelButton: 'custom-cancel-btn'
        },
        inputValidator: (value) => {
            if (!value) {
                return 'Password is required!';
            }
        }
    });
    if (!password) return false;
    try {
        const user = auth.currentUser;
        if (!user) throw new Error('No authenticated user found.');
        const credential = firebase.auth.EmailAuthProvider.credential(user.email, password);
        await user.reauthenticateWithCredential(credential);
        return true;
    } catch (error) {
        Swal.fire({
            title: 'Verification Failed',
            text: 'Invalid admin password.',
            icon: 'error',
            timer: 1600,
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
}

let data = [];
let filteredData = [];
const rowsPerPage = 5;
let currentPage = 1;

let archivedData = [];
let filteredArchivedData = [];
const archivedRowsPerPage = 5;
let archivedCurrentPage = 1;

let orgData = null;
let isProcessing = false;
let currentEditOrgKey = null;
let adminPosition = null;

const tableBody = document.querySelector("#orgTable tbody");
const entriesInfo = document.querySelector("#entriesInfo");
const paginationContainer = document.querySelector("#pagination");
const addNew = document.getElementById('addNew');
const addOrgModal = document.getElementById('addOrgModal');
const addOrgForm = document.getElementById('addOrgForm');
const sortSelect = document.getElementById('sortSelect');
const searchInput = document.getElementById('searchInput');
const clearBtn = document.querySelector('.clear-btn');
const closeAddOrgModalBtn = document.getElementById("closeModalBtn");
const editOrgModal = document.getElementById('editOrgModal');
const closeEditModalBtn = document.getElementById('closeEditModalBtn');
const editOrgForm = document.getElementById('editOrgForm');
const editOrgFirebaseKeyInput = document.getElementById('editOrgFirebaseKey');
const archivedModal = document.getElementById('archivedModal');
const closeArchivedModalBtn = document.getElementById('closeArchivedModalBtn');
const archivedTableBody = document.querySelector('#archivedTable tbody');
const archivedEntriesInfo = document.getElementById('archivedEntriesInfo');
const archivedPaginationContainer = document.getElementById('archivedPagination');
const viewArchivedBtn = document.getElementById('viewArchived');

document.addEventListener('mousemove', (e) => {
    if (!addNew) return;
    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;
    const distanceX = windowWidth - e.clientX;
    const distanceY = windowHeight - e.clientY;
    if (distanceX < 200 && distanceY < 200) {
        addNew.classList.add('visible');
    } else {
        addNew.classList.remove('visible');
    }
});

function clearAInputs() {
    addOrgForm.reset();
    document.getElementById('map').innerHTML = '';
    initializeMap();
}

function fetchAndRenderTable() {
    database.ref("volunteerGroups").on("value", snapshot => {
        const fetchedData = snapshot.val();
        if (!fetchedData) {
            data = [];
            filteredData = [];
            applySearchAndSort();
            Swal.fire({
                icon: "info",
                title: "No Data",
                text: "No active volunteer groups found in the database.",
                toast: true,
                position: 'top-end',
                showConfirmButton: false,
                timer: 3000
            });
            return;
        }
        data = Object.entries(fetchedData).map(([key, entry]) => ({
            id: key,
            organization: entry.organization || "N/A",
            contactPerson: entry.contactPerson || "N/A",
            email: entry.email || "N/A",
            mobileNumber: entry.mobileNumber || "N/A",
            socialMedia: entry.socialMedia || "N/A",
            address: {
                formattedAddress: entry.address?.formattedAddress || "N/A",
                latitude: entry.address?.latitude || "N/A",
                longitude: entry.address?.longitude || "N/A"
            },
            organizationalBackgroundMission: entry.organizationalBackgroundMission || "N/A",
            areasOfExpertiseFocus: entry.areasOfExpertiseFocus || "N/A",
            legalStatusRegistration: entry.legalStatusRegistration || "N/A",
            requiredDocumentsLink: entry.requiredDocumentsLink || "N/A",
            applicationDateandTime: entry.applicationDateandTime || "N/A",
            approvedApplicationDate: entry.approvedApplicationDate || "N/A",
            recaptchaResponse: entry.recaptchaResponse || "N/A",
            timestamp: entry.timestamp || "N/A",
            userId: entry.userId || "N/A",
            lastUpdatedBy: entry.lastUpdatedBy || "N/A",
            lastUpdatedAt: entry.lastUpdatedAt || "N/A"
        }));
        applySearchAndSort();
    });
}

function fetchAndRenderArchivedTable() {
    database.ref("deleted/deletedVolunteerGroups").on("value", snapshot => {
        const fetchedArchivedData = snapshot.val();
        if (!fetchedArchivedData) {
            archivedData = [];
            filteredArchivedData = [];
            applyArchivedSearchAndSort();
            return;
        }
        archivedData = Object.entries(fetchedArchivedData).map(([key, entry]) => ({
            id: key,
            organization: entry.organization || "N/A",
            contactPerson: entry.contactPerson || "N/A",
            email: entry.email || "N/A",
            mobileNumber: entry.mobileNumber || "N/A",
            socialMedia: entry.socialMedia || "N/A",
            address: {
                formattedAddress: entry.address?.formattedAddress || "N/A",
                latitude: entry.address?.latitude || "N/A",
                longitude: entry.address?.longitude || "N/A"
            },
            deletedAt: entry.deletedAt || "N/A"
        }));
        applyArchivedSearchAndSort();
    });
}

function showPreviewModal(orgData) {
    const modalContentDiv = document.getElementById('modalContent');
    const formattedTimestamp = orgData.timestamp ? new Date(orgData.timestamp).toLocaleString('en-US', {
        year: 'numeric', month: 'short', day: 'numeric',
        hour: '2-digit', minute: '2-digit', second: '2-digit'
    }) : 'N/A';
    const formattedAppDateTime = orgData.applicationDateandTime ? new Date(orgData.applicationDateandTime).toLocaleString('en-US', {
        year: 'numeric', month: 'short', day: 'numeric',
        hour: '2-digit', minute: '2-digit', second: '2-digit'
    }) : 'N/A';
    const formattedApprovedDate = orgData.approvedApplicationDate ? new Date(orgData.approvedApplicationDate).toLocaleDateString('en-US') : 'N/A';
    const lastUpdatedAt = orgData.lastUpdatedAt ? new Date(orgData.lastUpdatedAt).toLocaleString('en-US', {
        year: 'numeric', month: 'short', day: 'numeric',
        hour: '2-digit', minute: '2-digit', second: '2-digit'
    }) : 'N/A';

    modalContentDiv.innerHTML = `
        <div class="modal-content-inner" style="padding: 20px;">
            <h2>Organization Details:</h2>
            <p><strong>Organization Name:</strong> ${orgData.organization || 'N/A'}</p>
            <p><strong>Contact Person:</strong> ${orgData.contactPerson || 'N/A'}</p>
            <p><strong>Email:</strong> ${orgData.email || 'N/A'}</p>
            <p><strong>Mobile Number:</strong> ${orgData.mobileNumber || 'N/A'}</p>
            <p><strong>Social Media Link:</strong> ${orgData.socialMedia && orgData.socialMedia !== 'N/A' ? `<a href="${orgData.socialMedia}" target="_blank" rel="noopener noreferrer">${orgData.socialMedia}</a>` : 'N/A'}</p>
            <hr>
            <h2>Address:</h2>
            <div style="margin-left: 15px;">
                <p><strong>Formatted Address:</strong> ${orgData.address?.formattedAddress || 'N/A'}</p>
                <p><strong>Latitude:</strong> ${orgData.address?.latitude || 'N/A'}</p>
                <p><strong>Longitude:</strong> ${orgData.address?.longitude || 'N/A'}</p>
            </div>
            <hr>
            <h2>Organizational Background:</h2>
            <p><strong>Mission/Background:</strong> ${orgData.organizationalBackgroundMission || 'N/A'}</p>
            <p><strong>Areas of Expertise/Focus:</strong> ${orgData.areasOfExpertiseFocus || 'N/A'}</p>
            <hr>
            <h2>Legal & Documents:</h2>
            <p><strong>Legal Status/Registration:</strong> ${orgData.legalStatusRegistration || 'N/A'}</p>
            <p><strong>Required Documents:</strong> ${orgData.requiredDocumentsLink ? `<a href="${orgData.requiredDocumentsLink}" target="_blank" rel="noopener noreferrer">View Document</a>` : 'N/A'}</p>
            <hr>
            <h2>Dates:</h2>
            <p><strong>Application Date and Time:</strong> ${formattedAppDateTime}</p>
            <p><strong>Approved Application Date:</strong> ${formattedApprovedDate}</p>
            <p><strong>Created At:</strong> ${formattedTimestamp}</p>
            <p><strong>Last Updated At:</strong> ${lastUpdatedAt}</p>
            <p><strong>Last Updated By:</strong> ${orgData.lastUpdatedBy || 'N/A'}</p>
        </div>
    `;
    document.getElementById('previewModal').style.display = 'flex';
}

function hidePreviewModal() {
    const previewModal = document.getElementById('previewModal');
    const modalContentDiv = document.getElementById('modalContent');
    previewModal.style.display = 'none';
    modalContentDiv.innerHTML = '';
}

function renderTable(dataToRender = filteredData) {
    if (!tableBody) return;
    tableBody.innerHTML = "";
    const start = (currentPage - 1) * rowsPerPage;
    const end = start + rowsPerPage;
    const pageData = dataToRender.slice(start, end);

    if (pageData.length === 0 && searchInput.value.trim() !== "") {
        tableBody.innerHTML = `<tr><td colspan="8" class="text-center">No volunteer group found.</td></tr>`;
    } else if (pageData.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="8" class="text-center">No volunteer groups to display.</td></tr>`;
    }

    pageData.forEach((row, index) => {
        const displayNo = start + index + 1;
        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td>${displayNo}</td>
            <td>${row.organization}</td>
            <td>${row.contactPerson}</td>
            <td>${row.email}</td>
            <td>${row.mobileNumber}</td>
            <td>${row.socialMedia && row.socialMedia !== 'N/A' ? `<a href="${row.socialMedia}" target="_blank" rel="noopener noreferrer">${row.socialMedia}</a>` : 'N/A'}</td>
            <td>${row.address?.formattedAddress || 'N/A'}</td>
            <td>
                <button title="View" class="viewBtn" data-id="${row.id}"><i class='bx bx-show'></i></button>
                <button title="Edit" class="editBtn" data-id="${row.id}"><i class='bx bx-edit'></i></button>
                <button title="Archive" class="deleteBtn" data-id="${row.id}"><i class='bx bx-archive'></i></button>
            </td>
        `;
        tableBody.appendChild(tr);
    });

    updateEntriesInfo(dataToRender.length);
    renderPagination(dataToRender.length);
    attachRowHandlers();
}

function renderArchivedTable(dataToRender = filteredArchivedData) {
    if (!archivedTableBody) return;
    archivedTableBody.innerHTML = "";
    const start = (archivedCurrentPage - 1) * archivedRowsPerPage;
    const end = start + archivedRowsPerPage;
    const pageData = dataToRender.slice(start, end);

    if (pageData.length === 0) {
        archivedTableBody.innerHTML = `<tr><td colspan="5" class="text-center">No archived volunteer groups to display.</td></tr>`;
    }

    pageData.forEach((row) => {
        const tr = document.createElement("tr");
        const deletedDate = row.deletedAt ? new Date(row.deletedAt).toLocaleDateString() : 'N/A';
        tr.innerHTML = `
            <td>${row.organization}</td>
            <td>${row.email}</td>
            <td>${row.address?.formattedAddress || 'N/A'}</td>
            <td>${deletedDate}</td>
            <td>
                <button class="retrieveBtn" data-id="${row.id}">Retrieve</button>
            </td>
        `;
        archivedTableBody.appendChild(tr);
    });

    updateArchivedEntriesInfo(dataToRender.length);
    renderArchivedPagination(dataToRender.length);
    attachArchivedRowHandlers();
}

let map, marker, editMap, editMarker;

function initializeMap() {
    const mapDiv = document.getElementById('map');
    const philippinesBounds = {
        north: 21.121, // Northernmost point
        south: 4.643,  // Southernmost point
        west: 116.929, // Westernmost point
        east: 126.604  // Easternmost point
    };
    map = new google.maps.Map(mapDiv, {
        center: { lat: 14.5995, lng: 120.9842 }, // Manila
        zoom: 6,
        restriction: {
            latLngBounds: philippinesBounds,
            strictBounds: true
        }
    });

    const input = document.getElementById('formattedAddress');
    const autocomplete = new google.maps.places.Autocomplete(input, {
        bounds: philippinesBounds,
        strictBounds: true,
        componentRestrictions: { country: 'PH' }
    });
    autocomplete.bindTo('bounds', map);

    marker = new google.maps.Marker({
        map: map,
        draggable: true
    });

    autocomplete.addListener('place_changed', () => {
        const place = autocomplete.getPlace();
        if (!place.geometry) {
            Swal.fire({
                icon: 'error',
                title: 'Invalid Address',
                text: 'Please select a valid address within the Philippines.'
            });
            return;
        }
        if (!philippinesBounds.north >= place.geometry.location.lat() ||
            place.geometry.location.lat() < philippinesBounds.south ||
            philippinesBounds.east < place.geometry.location.lng() ||
            place.geometry.location.lng() < philippinesBounds.west) {
            Swal.fire({
                icon: 'error',
                title: 'Invalid Location',
                text: 'Selected location must be within the Philippines.'
            });
            return;
        }

        map.setCenter(place.geometry.location);
        marker.setPosition(place.geometry.location);
        document.getElementById('latitude').value = place.geometry.location.lat();
        document.getElementById('longitude').value = place.geometry.location.lng();
        input.value = place.formatted_address;
    });

    marker.addListener('dragend', () => {
        const latlng = marker.getPosition();
        if (!philippinesBounds.north >= latlng.lat() ||
            latlng.lat() < philippinesBounds.south ||
            philippinesBounds.east < latlng.lng() ||
            latlng.lng() < philippinesBounds.west) {
            Swal.fire({
                icon: 'error',
                title: 'Invalid Location',
                text: 'Selected location must be within the Philippines.'
            });
            marker.setPosition(map.getCenter());
            return;
        }
        const geocoder = new google.maps.Geocoder();
        geocoder.geocode({ location: latlng }, (results, status) => {
            if (status === 'OK' && results[0]) {
                if (results[0].address_components.some(comp => comp.short_name === 'PH')) {
                    input.value = results[0].formatted_address;
                    document.getElementById('latitude').value = latlng.lat();
                    document.getElementById('longitude').value = latlng.lng();
                } else {
                    Swal.fire({
                        icon: 'error',
                        title: 'Invalid Location',
                        text: 'Selected location must be within the Philippines.'
                    });
                    marker.setPosition(map.getCenter());
                }
            }
        });
    });

    map.addListener('click', (e) => {
        if (!philippinesBounds.north >= e.latLng.lat() ||
            e.latLng.lat() < philippinesBounds.south ||
            philippinesBounds.east < e.latLng.lng() ||
            e.latLng.lng() < philippinesBounds.west) {
            Swal.fire({
                icon: 'error',
                title: 'Invalid Location',
                text: 'Selected location must be within the Philippines.'
            });
            return;
        }
        marker.setPosition(e.latLng);
        const geocoder = new google.maps.Geocoder();
        geocoder.geocode({ location: e.latLng }, (results, status) => {
            if (status === 'OK' && results[0]) {
                if (results[0].address_components.some(comp => comp.short_name === 'PH')) {
                    input.value = results[0].formatted_address;
                    document.getElementById('latitude').value = e.latLng.lat();
                    document.getElementById('longitude').value = e.latLng.lng();
                } else {
                    Swal.fire({
                        icon: 'error',
                        title: 'Invalid Location',
                        text: 'Selected location must be within the Philippines.'
                    });
                    marker.setPosition(map.getCenter());
                }
            }
        });
    });
}

function initializeEditMap(lat = 14.5995, lng = 120.9842) {
    const editMapDiv = document.getElementById('editMap');
    const philippinesBounds = {
        north: 21.121,
        south: 4.643,
        west: 116.929,
        east: 126.604
    };
    editMap = new google.maps.Map(editMapDiv, {
        center: { lat: lat, lng: lng },
        zoom: 6,
        restriction: {
            latLngBounds: philippinesBounds,
            strictBounds: true
        }
    });

    const editInput = document.getElementById('editFormattedAddress');
    const autocomplete = new google.maps.places.Autocomplete(editInput, {
        bounds: philippinesBounds,
        strictBounds: true,
        componentRestrictions: { country: 'PH' }
    });
    autocomplete.bindTo('bounds', editMap);

    editMarker = new google.maps.Marker({
        map: editMap,
        draggable: true,
        position: { lat: lat, lng: lng }
    });

    autocomplete.addListener('place_changed', () => {
        const place = autocomplete.getPlace();
        if (!place.geometry) {
            Swal.fire({
                icon: 'error',
                title: 'Invalid Address',
                text: 'Please select a valid address within the Philippines.'
            });
            return;
        }
        if (!philippinesBounds.north >= place.geometry.location.lat() ||
            place.geometry.location.lat() < philippinesBounds.south ||
            philippinesBounds.east < place.geometry.location.lng() ||
            place.geometry.location.lng() < philippinesBounds.west) {
            Swal.fire({
                icon: 'error',
                title: 'Invalid Location',
                text: 'Selected location must be within the Philippines.'
            });
            return;
        }

        editMap.setCenter(place.geometry.location);
        editMarker.setPosition(place.geometry.location);
        document.getElementById('editLatitude').value = place.geometry.location.lat();
        document.getElementById('editLongitude').value = place.geometry.location.lng();
        editInput.value = place.formatted_address;
    });

    editMarker.addListener('dragend', () => {
        const latlng = editMarker.getPosition();
        if (!philippinesBounds.north >= latlng.lat() ||
            latlng.lat() < philippinesBounds.south ||
            philippinesBounds.east < latlng.lng() ||
            latlng.lng() < philippinesBounds.west) {
            Swal.fire({
                icon: 'error',
                title: 'Invalid Location',
                text: 'Selected location must be within the Philippines.'
            });
            editMarker.setPosition(editMap.getCenter());
            return;
        }
        const geocoder = new google.maps.Geocoder();
        geocoder.geocode({ location: latlng }, (results, status) => {
            if (status === 'OK' && results[0]) {
                if (results[0].address_components.some(comp => comp.short_name === 'PH')) {
                    editInput.value = results[0].formatted_address;
                    document.getElementById('editLatitude').value = latlng.lat();
                    document.getElementById('editLongitude').value = latlng.lng();
                } else {
                    Swal.fire({
                        icon: 'error',
                        title: 'Invalid Location',
                        text: 'Selected location must be within the Philippines.'
                    });
                    editMarker.setPosition(editMap.getCenter());
                }
            }
        });
    });

    editMap.addListener('click', (e) => {
        if (!philippinesBounds.north >= e.latLng.lat() ||
            e.latLng.lat() < philippinesBounds.south ||
            philippinesBounds.east < e.latLng.lng() ||
            e.latLng.lng() < philippinesBounds.west) {
            Swal.fire({
                icon: 'error',
                title: 'Invalid Location',
                text: 'Selected location must be within the Philippines.'
            });
            return;
        }
        editMarker.setPosition(e.latLng);
        const geocoder = new google.maps.Geocoder();
        geocoder.geocode({ location: e.latLng }, (results, status) => {
            if (status === 'OK' && results[0]) {
                if (results[0].address_components.some(comp => comp.short_name === 'PH')) {
                    editInput.value = results[0].formatted_address;
                    document.getElementById('editLatitude').value = e.latLng.lat();
                    document.getElementById('editLongitude').value = e.latLng.lng();
                } else {
                    Swal.fire({
                        icon: 'error',
                        title: 'Invalid Location',
                        text: 'Selected location must be within the Philippines.'
                    });
                    editMarker.setPosition(editMap.getCenter());
                }
            }
        });
    });
}

if (addNew) {
    addNew.addEventListener('click', () => {
        if (!['Super Admin', 'position-one', 'position-two'].includes(adminPosition)) {
            Swal.fire({
                title: 'Access Denied',
                text: 'You do not have permission to add volunteer groups.',
                icon: 'error',
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
            return;
        }
        if (addOrgModal) {
            addOrgModal.style.display = 'flex';
            addOrgForm.reset();
            initializeMap();
        }
    });
}

if (closeAddOrgModalBtn) {
    closeAddOrgModalBtn.addEventListener('click', () => {
        addOrgModal.style.display = 'none';
        addOrgForm.reset();
    });
}

window.addEventListener('click', (event) => {
    if (event.target === addOrgModal) {
        addOrgModal.style.display = 'none';
        addOrgForm.reset();
    }
    if (event.target === editOrgModal) {
        editOrgModal.style.display = 'none';
        editOrgForm.reset();
    }
    if (event.target === archivedModal && archivedModal.style.display === 'flex') {
        archivedModal.style.display = 'none';
    }
    if (event.target === document.getElementById('confirmModal')) {
        document.getElementById('confirmModal').style.display = 'none';
    }
});

if (addOrgForm) {
    addOrgForm.addEventListener('submit', async e => {
        e.preventDefault();

        if (!['Super Admin', 'position-one', 'position-two'].includes(adminPosition)) {
            Swal.fire({
                title: 'Access Denied',
                text: 'You do not have permission to add volunteer groups.',
                icon: 'error',
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
            return;
        }

        const organization = document.getElementById('organization').value.trim();
        const formattedAddress = document.getElementById('formattedAddress').value.trim();
        const latitude = document.getElementById('latitude').value.trim();
        const longitude = document.getElementById('longitude').value.trim();
        const contactPerson = document.getElementById('contactPerson').value.trim();
        const email = document.getElementById('email').value.trim();
        const mobileNumber = document.getElementById('mobileNumber').value;
        const socialMedia = document.getElementById('socialMedia').value.trim();
        const organizationalBackgroundMission = document.getElementById('organizationalBackgroundMission').value.trim();
        const areasOfExpertiseFocus = document.getElementById('areasOfExpertiseFocus').value.trim();
        const legalStatusRegistration = document.getElementById('legalStatusRegistration').value.trim();
        const requiredDocumentsLink = document.getElementById('requiredDocumentsLink').value.trim();
        const applicationDateandTime = document.getElementById('applicationDateandTime').value.trim();
        const approvedApplicationDate = document.getElementById('approvedApplicationDate').value.trim();
        const recaptchaResponse = document.getElementById('recaptchaResponse').value.trim();

        const appDateTime = new Date(applicationDateandTime);
        const approvedDate = new Date(approvedApplicationDate);
        const appDateOnly = new Date(appDateTime.getFullYear(), appDateTime.getMonth(), appDateTime.getDate());
        const approvedDateOnly = new Date(approvedDate.getFullYear(), approvedDate.getMonth(), approvedDate.getDate());
        if (appDateOnly > approvedDateOnly) {
            Swal.fire({
                icon: 'error',
                title: 'Invalid Dates',
                text: 'Application Date cannot be after Approved Application Date.',
                showConfirmButton: true,
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

        if (!organization || !formattedAddress || !latitude || !longitude || !contactPerson || !email || !mobileNumber || !applicationDateandTime || !approvedApplicationDate) {
            Swal.fire({
                icon: 'error',
                title: 'Missing Fields',
                text: 'Please fill in all required fields (Organization, Address, Latitude, Longitude, Contact Person, Email, Mobile Number, Application Date and Time, Approved Application Date).',
                showConfirmButton: true,
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

        if (!isValidEmail(email)) {
            Swal.fire({
                icon: 'error',
                title: 'Invalid Email',
                text: 'Please enter a valid Gmail address (e.g., example@gmail.com).',
                showConfirmButton: true,
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

        if (!isValidMobile(mobileNumber)) {
            Swal.fire({
                icon: 'error',
                title: 'Invalid Mobile Number',
                text: 'Mobile number must be 11 digits starting with "09"',
                showConfirmButton: true,
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

        const emailInUse = await isEmailInUse(email, null);
        if (emailInUse) {
            Swal.fire({
                icon: 'error',
                title: 'Email In Use',
                text: 'The email address is already in use by another account.',
                showConfirmButton: true,
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

        const mobileInUse = await isMobileNumberInUse(mobileNumber, null);
        if (mobileInUse) {
            Swal.fire({
                icon: 'error',
                title: 'Mobile Number In Use',
                text: 'The mobile number is already in use by another account.',
                showConfirmButton: true,
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

        orgData = {
            organization: organization,
            contactPerson: contactPerson,
            email: email,
            mobileNumber: mobileNumber,
            socialMedia: socialMedia || "N/A",
            address: {
                formattedAddress: formattedAddress,
                latitude: parseFloat(latitude),
                longitude: parseFloat(longitude)
            },
            organizationalBackgroundMission: organizationalBackgroundMission || "N/A",
            areasOfExpertiseFocus: areasOfExpertiseFocus || "N/A",
            legalStatusRegistration: legalStatusRegistration || "N/A",
            requiredDocumentsLink: requiredDocumentsLink || "N/A",
            applicationDateandTime: applicationDateandTime,
            approvedApplicationDate: approvedApplicationDate,
            recaptchaResponse: recaptchaResponse || "N/A",
            timestamp: new Date().toISOString(),
            lastUpdatedBy: auth.currentUser?.uid || "N/A",
            lastUpdatedAt: new Date().toISOString()
        };

        const confirmDetails = document.getElementById('confirmDetails');
        if (confirmDetails) {
            confirmDetails.innerHTML = `
                <p><strong>Organization:</strong> ${orgData.organization}</p>
                <p><strong>Address:</strong> ${orgData.address.formattedAddress}</p>
                <p><strong>Latitude:</strong> ${orgData.address.latitude}</p>
                <p><strong>Longitude:</strong> ${orgData.address.longitude}</p>
                <p><strong>Contact Person:</strong> ${orgData.contactPerson}</p>
                <p><strong>Email:</strong> ${orgData.email}</p>
                <p><strong>Mobile:</strong> ${orgData.mobileNumber}</p>
                <p><strong>Social Media:</strong> ${orgData.socialMedia}</p>
                <p><strong>Mission/Background:</strong> ${orgData.organizationalBackgroundMission}</p>
                <p><strong>Areas of Expertise/Focus:</strong> ${orgData.areasOfExpertiseFocus}</p>
                <p><strong>Legal Status/Registration:</strong> ${orgData.legalStatusRegistration}</p>
                <p><strong>Required Documents:</strong> ${orgData.requiredDocumentsLink}</p>
                <p><strong>Application Date and Time:</strong> ${orgData.applicationDateandTime}</p>
                <p><strong>Approved Application Date:</strong> ${orgData.approvedApplicationDate}</p>
            `;
        }

        if (addOrgModal) addOrgModal.style.display = 'none';
        const confirmModal = document.getElementById('confirmModal');
        if (confirmModal) confirmModal.style.display = 'flex';
    });
}

const confirmSaveBtn = document.getElementById('confirmSaveBtn');
if (confirmSaveBtn) {
    confirmSaveBtn.addEventListener('click', async () => {
        if (isProcessing) return;
        isProcessing = true;
        confirmSaveBtn.disabled = true;

        if (!orgData) {
            Swal.fire({
                icon: 'error',
                title: 'Organization Not Found',
                text: 'We couldn’t find any data for the selected organization. Please try again.',
                showConfirmButton: true,
                confirmButtonText: 'OK',
                customClass: {
                    popup: 'swal2-popup-error-clean',
                    title: 'swal2-title-error-clean',
                    htmlContainer: 'swal2-text-error-clean',
                    confirmButton: 'my-error-button'
                }
            });
            isProcessing = false;
            confirmSaveBtn.disabled = false;
            return;
        }

        // Validate numeric fields to prevent NaN
        const lat = parseFloat(orgData.address.latitude);
        const lon = parseFloat(orgData.address.longitude);
        if (isNaN(lat) || isNaN(lon) || lat < -90 || lat > 90 || lon < -180 || lon > 180) {
            Swal.fire({
                icon: 'error',
                title: 'Invalid Coordinates',
                text: 'Latitude or longitude is invalid. Please check the address.',
                showConfirmButton: true,
                confirmButtonText: 'OK',
                customClass: {
                    popup: 'swal2-popup-error-clean',
                    title: 'swal2-title-error-clean',
                    htmlContainer: 'swal2-text-error-clean',
                    confirmButton: 'my-error-button'
                }
            });
            isProcessing = false;
            confirmSaveBtn.disabled = false;
            return;
        }

        const newVolunteerGroup = {
            organization: orgData.organization,
            contactPerson: orgData.contactPerson,
            email: orgData.email,
            mobileNumber: orgData.mobileNumber,
            socialMedia: orgData.socialMedia || "N/A",
            address: {
                formattedAddress: orgData.address.formattedAddress,
                latitude: lat,
                longitude: lon
            },
            organizationalBackgroundMission: orgData.organizationalBackgroundMission || "N/A",
            areasOfExpertiseFocus: orgData.areasOfExpertiseFocus || "N/A",
            legalStatusRegistration: orgData.legalStatusRegistration || "N/A",
            requiredDocumentsLink: orgData.requiredDocumentsLink || "N/A",
            applicationDateandTime: orgData.applicationDateandTime,
            approvedApplicationDate: orgData.approvedApplicationDate,
            recaptchaResponse: orgData.recaptchaResponse || "N/A",
            timestamp: orgData.timestamp || new Date().toISOString(),
            lastUpdatedBy: auth.currentUser?.uid || "N/A",
            lastUpdatedAt: new Date().toISOString()
        };

        try {
            const adminUser = auth.currentUser;
            if (!adminUser) {
                throw new Error("No admin signed in. Please sign in again.");
            }

            const tempPassword = generateTempPassword();
            let userCredential;
            try {
                userCredential = await secondaryAuth.createUserWithEmailAndPassword(orgData.email, tempPassword);
            } catch (error) {
                if (error.code === 'auth/email-already-in-use') {
                    throw new Error("The email address is already in use by another account.");
                }
                throw new Error("Error creating user in Firebase Authentication: " + error.message);
            }
            const newUser = userCredential.user;

            if (!newUser.uid) {
                throw new Error("Failed to generate a valid user ID.");
            }

            // Save to users
            await database.ref(`users/${newUser.uid}`).set({
                role: "ABVN",
                email: orgData.email,
                mobile: orgData.mobileNumber,
                organization: orgData.organization,
                contactPerson: orgData.contactPerson,
                address: {
                    formattedAddress: orgData.address.formattedAddress,
                    latitude: lat,
                    longitude: lon
                },
                organizationalBackgroundMission: orgData.organizationalBackgroundMission || "N/A",
                areasOfExpertiseFocus: orgData.areasOfExpertiseFocus || "N/A",
                legalStatusRegistration: orgData.legalStatusRegistration || "N/A",
                requiredDocumentsLink: orgData.requiredDocumentsLink || "N/A",
                applicationDateandTime: orgData.applicationDateandTime,
                approvedApplicationDate: orgData.approvedApplicationDate,
                recaptchaResponse: orgData.recaptchaResponse || "N/A",
                createdAt: new Date().toISOString(),
                isFirstLogin: true,
                emailVerified: false,
                password_needs_reset: true,
                lastUpdatedBy: adminUser.uid,
                lastUpdatedAt: new Date().toISOString()
            });

            // Save to volunteerGroups with UID as key
            await database.ref(`volunteerGroups/${newUser.uid}`).set({
                ...newVolunteerGroup,
                userId: newUser.uid
            });

            // Optionally save to abvnApplications/registeredABVN to sync with approvedvg.js
            await database.ref(`abvnApplications/registeredABVN/${newUser.uid}`).set({
                ...newVolunteerGroup,
                registeredBy: adminUser.uid,
                registeredAt: new Date().toISOString(),
                volunteerGroupKey: newUser.uid, // Ensure volunteerGroupKey is the UID
                authUserId: newUser.uid
            });

            await emailjs.send('service_g5f0erj', 'template_0yk865p', {
                email: orgData.email,
                organization: orgData.organization,
                tempPassword: tempPassword,
                message: `Your volunteer group "${orgData.organization}" has been successfully registered with Bayanihan. Please use the credentials below to log in. You will be prompted to verify your email and reset your password upon your first login.`,
                verification_message: `Please log in using the provided email and temporary password. You will be prompted to verify your email and reset your password upon your first login.`
            });

            Swal.fire({
                icon: 'success',
                title: 'Volunteer Group Successfully Added!',
                html: 'A temporary password has been sent to the newly added volunteer group. <i class="bx bxs-check-circle"></i>',
                showConfirmButton: true,
                confirmButtonText: "Ok",
                customClass: {
                    popup: 'swal2-popup-success-clean',
                    title: 'swal2-title-success-clean',
                    htmlContainer: 'swal2-text-success-clean',
                    confirmButton: 'my-success-button'
                }
            });

            orgData = null;
            const confirmModal = document.getElementById('confirmModal');
            if (confirmModal) confirmModal.style.display = 'none';
            clearAInputs();
            fetchAndRenderTable();
            fetchAndRenderArchivedTable();

            await secondaryAuth.signOut();
        } catch (error) {
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: `Failed to add group: ${error.message}`,
                customClass: {
                    popup: 'swal2-popup-error-clean',
                    title: 'swal2-title-error-clean',
                    htmlContainer: 'swal2-text-error-clean',
                    confirmButton: 'my-error-button'
                }
            });
        } finally {
            isProcessing = false;
            confirmSaveBtn.disabled = false;
        }
    });
}

if (closeEditModalBtn) {
    closeEditModalBtn.addEventListener('click', () => {
        editOrgModal.style.display = 'none';
        editOrgForm.reset();
    });
}

window.addEventListener('click', (event) => {
    if (event.target === editOrgModal) {
        editOrgModal.style.display = 'none';
        editOrgForm.reset();
    }
});

function openEditModal(orgId) {
    const orgToEdit = data.find(org => org.id === orgId);
    if (!orgToEdit) {
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'Volunteer group not found.',
            showConfirmButton: true,
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

    currentEditOrgKey = orgId;
    editOrgFirebaseKeyInput.value = orgId;

    document.getElementById('editOrganization').value = orgToEdit.organization;
    document.getElementById('editFormattedAddress').value = orgToEdit.address.formattedAddress || '';
    document.getElementById('editLatitude').value = orgToEdit.address.latitude || '';
    document.getElementById('editLongitude').value = orgToEdit.address.longitude || '';
    document.getElementById('editContactPerson').value = orgToEdit.contactPerson;
    document.getElementById('editEmail').value = orgToEdit.email;
    document.getElementById('editMobileNumber').value = orgToEdit.mobileNumber || "";
    document.getElementById('editSocialMedia').value = orgToEdit.socialMedia === "N/A" ? "" : orgToEdit.socialMedia;
    document.getElementById('editOrganizationalBackgroundMission').value = orgToEdit.organizationalBackgroundMission || "";
    document.getElementById('editAreasOfExpertiseFocus').value = orgToEdit.areasOfExpertiseFocus || "";
    document.getElementById('editLegalStatusRegistration').value = orgToEdit.legalStatusRegistration || "";
    document.getElementById('editRequiredDocumentsLink').value = orgToEdit.requiredDocumentsLink || "";
    document.getElementById('editApplicationDateandTime').value = 
        orgToEdit.applicationDateandTime && !isNaN(new Date(orgToEdit.applicationDateandTime).getTime()) 
        ? new Date(orgToEdit.applicationDateandTime).toISOString().slice(0, 16) 
        : "";
    document.getElementById('editApprovedApplicationDate').value = 
        orgToEdit.approvedApplicationDate && !isNaN(new Date(orgToEdit.approvedApplicationDate).getTime()) 
        ? new Date(orgToEdit.approvedApplicationDate).toISOString().slice(0, 10) 
        : "";
    document.getElementById('editRecaptchaResponse').value = orgToEdit.recaptchaResponse || "";

    initializeEditMap(
        orgToEdit.address.latitude !== "N/A" ? parseFloat(orgToEdit.address.latitude) : 14.5995,
        orgToEdit.address.longitude !== "N/A" ? parseFloat(orgToEdit.address.longitude) : 120.9842
    );

    editOrgModal.style.display = 'flex';
}

if (editOrgForm) {
    editOrgForm.addEventListener('submit', async e => {
        e.preventDefault();

        if (!['Super Admin', 'position-one', 'position-two'].includes(adminPosition)) {
            Swal.fire({
                title: 'Access Denied',
                text: 'You do not have permission to edit volunteer groups.',
                icon: 'error',
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
            return;
        }

        const orgId = editOrgFirebaseKeyInput.value;
        if (!orgId) {
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'No organization ID found for editing.',
                showConfirmButton: true,
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

        const updatedOrganization = document.getElementById('editOrganization').value.trim();
        const updatedFormattedAddress = document.getElementById('editFormattedAddress').value.trim();
        const updatedLatitude = document.getElementById('editLatitude').value.trim();
        const updatedLongitude = document.getElementById('editLongitude').value.trim();
        const updatedContactPerson = document.getElementById('editContactPerson').value.trim();
        const updatedEmail = document.getElementById('editEmail').value.trim();
        const updatedMobileNumber = document.getElementById('editMobileNumber').value;
        const updatedSocialMedia = document.getElementById('editSocialMedia').value.trim();
        const updatedOrganizationalBackgroundMission = document.getElementById('editOrganizationalBackgroundMission').value.trim();
        const updatedAreasOfExpertiseFocus = document.getElementById('editAreasOfExpertiseFocus').value.trim();
        const updatedLegalStatusRegistration = document.getElementById('editLegalStatusRegistration').value.trim();
        const updatedRequiredDocumentsLink = document.getElementById('editRequiredDocumentsLink').value.trim();
        const updatedApplicationDateandTime = document.getElementById('editApplicationDateandTime').value.trim();
        const updatedApprovedApplicationDate = document.getElementById('editApprovedApplicationDate').value.trim();
        const updatedRecaptchaResponse = document.getElementById('editRecaptchaResponse').value.trim();

        const appDateTime = new Date(updatedApplicationDateandTime);
        const approvedDate = new Date(updatedApprovedApplicationDate);
        const appDateOnly = new Date(appDateTime.getFullYear(), appDateTime.getMonth(), appDateTime.getDate());
        const approvedDateOnly = new Date(approvedDate.getFullYear(), approvedDate.getMonth(), approvedDate.getDate());
        if (appDateOnly > approvedDateOnly) {
            Swal.fire({
                icon: 'error',
                title: 'Invalid Dates',
                text: 'Application Date cannot be after Approved Application Date.',
                showConfirmButton: true,
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

        if (!updatedOrganization || !updatedFormattedAddress || !updatedLatitude || !updatedLongitude || !updatedContactPerson || !updatedEmail || !updatedMobileNumber || !updatedApplicationDateandTime || !updatedApprovedApplicationDate) {
            Swal.fire({
                icon: 'error',
                title: 'Missing Fields',
                text: 'Please fill in all required fields (Organization, Address, Latitude, Longitude, Contact Person, Email, Mobile Number, Application Date and Time, Approved Application Date).',
                showConfirmButton: true,
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

        if (!isValidEmail(updatedEmail)) {
            Swal.fire({
                icon: 'error',
                title: 'Invalid Email',
                text: 'Please enter a valid Gmail address (e.g., example@gmail.com).',
                showConfirmButton: true,
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

        if (!isValidMobile(updatedMobileNumber)) {
            Swal.fire({
                icon: 'error',
                title: 'Invalid Mobile Number',
                text: 'Mobile number must be 11 digits starting with "09"',
                showConfirmButton: true,
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

        if (!updatedApplicationDateandTime || isNaN(new Date(updatedApplicationDateandTime).getTime())) {
            Swal.fire({
                icon: 'error',
                title: 'Invalid Application Date',
                text: 'Please enter a valid application date and time.',
                showConfirmButton: true,
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

        if (!updatedApprovedApplicationDate || isNaN(new Date(updatedApprovedApplicationDate).getTime())) {
            Swal.fire({
                icon: 'error',
                title: 'Invalid Approved Application Date',
                text: 'Please enter a valid approved application date.',
                showConfirmButton: true,
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

        let userId, existingData;
        try {
            const snapshot = await database.ref(`volunteerGroups/${orgId}`).once('value');
            existingData = snapshot.val();
            if (!existingData || !existingData.userId) {
                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: 'Unable to find user ID for this organization.',
                    showConfirmButton: true,
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
            userId = existingData.userId;
        } catch (error) {
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: `Failed to fetch organization data: ${error.message}`,
                showConfirmButton: true,
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

        const updatedDataForComparison = {
            organization: updatedOrganization,
            contactPerson: updatedContactPerson,
            email: updatedEmail,
            mobileNumber: updatedMobileNumber,
            socialMedia: updatedSocialMedia || "N/A",
            address: {
                formattedAddress: updatedFormattedAddress,
                latitude: parseFloat(updatedLatitude),
                longitude: parseFloat(updatedLongitude)
            },
            organizationalBackgroundMission: updatedOrganizationalBackgroundMission || "N/A",
            areasOfExpertiseFocus: updatedAreasOfExpertiseFocus || "N/A",
            legalStatusRegistration: updatedLegalStatusRegistration || "N/A",
            requiredDocumentsLink: updatedRequiredDocumentsLink || "N/A",
            applicationDateandTime: updatedApplicationDateandTime,
            approvedApplicationDate: updatedApprovedApplicationDate,
            recaptchaResponse: updatedRecaptchaResponse || "N/A"
        };

        const unchanged = await isDataUnchanged(orgId, updatedDataForComparison);
        if (unchanged) {
            Swal.fire({
                icon: 'info',
                title: 'No Changes Detected',
                text: 'No changes were made to the volunteer group details.',
                showConfirmButton: true,
                confirmButtonText: 'OK',
                customClass: {
                    popup: 'swal2-popup-success-clean',
                    title: 'swal2-title-success-clean',
                    htmlContainer: 'swal2-text-success-clean',
                    confirmButton: 'my-success-button'
                }
            });
            editOrgModal.style.display = 'none';
            return;
        }

        const mobileInUse = await isMobileNumberInUse(updatedMobileNumber, userId);
        if (mobileInUse) {
            Swal.fire({
                icon: 'error',
                title: 'Mobile Number In Use',
                text: 'The mobile number is already in use by another account.',
                showConfirmButton: true,
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

        const emailInUse = await isEmailInUse(updatedEmail, userId);
        if (emailInUse) {
            Swal.fire({
                icon: 'error',
                title: 'Email In Use',
                text: 'The email address is already in use by another account.',
                showConfirmButton: true,
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

        try {
            const updatedData = {
                organization: updatedOrganization,
                contactPerson: updatedContactPerson,
                email: updatedEmail,
                mobileNumber: updatedMobileNumber,
                socialMedia: updatedSocialMedia || "N/A",
                address: {
                    formattedAddress: updatedFormattedAddress,
                    latitude: parseFloat(updatedLatitude),
                    longitude: parseFloat(updatedLongitude)
                },
                organizationalBackgroundMission: updatedOrganizationalBackgroundMission || "N/A",
                areasOfExpertiseFocus: updatedAreasOfExpertiseFocus || "N/A",
                legalStatusRegistration: updatedLegalStatusRegistration || "N/A",
                requiredDocumentsLink: updatedRequiredDocumentsLink || "N/A",
                applicationDateandTime: updatedApplicationDateandTime,
                approvedApplicationDate: updatedApprovedApplicationDate,
                recaptchaResponse: updatedRecaptchaResponse || "N/A",
                lastUpdatedBy: auth.currentUser.uid,
                lastUpdatedAt: new Date().toISOString(),
                timestamp: existingData.timestamp || new Date().toISOString(),
                userId: existingData.userId
            };

            await database.ref(`volunteerGroups/${orgId}`).update(updatedData);

            await database.ref(`users/${userId}`).update({
                email: updatedEmail,
                mobile: updatedMobileNumber,
                organization: updatedOrganization,
                contactPerson: updatedContactPerson,
                address: {
                    formattedAddress: updatedFormattedAddress,
                    latitude: parseFloat(updatedLatitude),
                    longitude: parseFloat(updatedLongitude)
                },
                organizationalBackgroundMission: updatedOrganizationalBackgroundMission || "N/A",
                areasOfExpertiseFocus: updatedAreasOfExpertiseFocus || "N/A",
                legalStatusRegistration: updatedLegalStatusRegistration || "N/A",
                requiredDocumentsLink: updatedRequiredDocumentsLink || "N/A",
                applicationDateandTime: updatedApplicationDateandTime,
                approvedApplicationDate: updatedApprovedApplicationDate,
                recaptchaResponse: updatedRecaptchaResponse || "N/A",
                lastUpdatedBy: auth.currentUser.uid,
                lastUpdatedAt: new Date().toISOString()
            });

            Swal.fire({
                icon: 'success',
                title: 'Updated!',
                text: 'The volunteer group has been updated.',
                allowOutsideClick: false,
                confirmButtonText: 'OK',
                customClass: {
                    popup: 'swal2-popup-success-clean',
                    title: 'swal2-title-success-clean',
                    htmlContainer: 'swal2-text-success-clean',
                    confirmButton: 'my-success-button'  
                }
            });
            document.getElementById('editOrgModal').style.display = 'none';
            editOrgForm.reset();
            fetchAndRenderTable();
        } catch (error) {
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: `Failed to update volunteer group: ${error.message}`,
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
    });
}

function attachRowHandlers() {
    document.querySelectorAll('.viewBtn').forEach(button => {
        button.onclick = (e) => {
            const orgId = e.target.dataset.id || e.target.closest('button').dataset.id;
            const orgData = data.find(org => org.id === orgId);
            if (orgData) {
                showPreviewModal(orgData);
            } else {
                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: 'Volunteer group not found.',
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
        };
    });

    document.querySelectorAll('.editBtn').forEach(button => {
        button.onclick = (e) => {
            const orgId = e.target.dataset.id;
            openEditModal(orgId);
        };
    });

    document.querySelectorAll('.deleteBtn').forEach(button => {
        button.addEventListener('click', () => {
            if (!['Super Admin', 'position-one'].includes(adminPosition)) {
                Swal.fire({
                    title: 'Access Denied',
                    text: 'You do not have permission to archive volunteer groups.',
                    icon: 'error',
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
                return;
            }

            const orgId = button.getAttribute('data-id');
            const orgName = button.closest('tr').children[1].textContent;

            verifySuperAdminPassword().then((passwordVerified) => {
                if (!passwordVerified) {
                    return;
                }

                Swal.fire({
                    title: `Are you sure to archive "${orgName}"?`,
                    text: "This will move it to archived records.",
                    icon: 'warning',
                    showCancelButton: true,
                    confirmButtonText: 'Archive',
                    cancelButtonText: 'Cancel',
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
                }).then(async (result) => {
                    if (result.isConfirmed) {
                        Swal.fire({
                            title: 'Archiving Volunteer Group...',
                            text: 'Moving volunteer group data to archived records...',
                            allowOutsideClick: false,
                            didOpen: () => {
                                Swal.showLoading();
                            }
                        });

                        try {
                            const groupSnapshot = await database.ref(`volunteerGroups/${orgId}`).once('value');
                            const groupData = groupSnapshot.val();
                            if (!groupData) {
                                Swal.fire({
                                    icon: 'error',
                                    title: 'Error',
                                    text: 'Volunteer group data not found for archiving.',
                                    showConfirmButton: true,
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

                            const userId = groupData.userId;
                            const userSnapshot = await database.ref(`users/${userId}`).once('value');
                            const userData = userSnapshot.val();
                            if (!userData) {
                                Swal.fire({
                                    icon: 'error',
                                    title: 'Error',
                                    text: 'User data not found for archiving.',
                                    showConfirmButton: true,
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

                            groupData.deletedAt = new Date().toISOString();
                            userData.deletedAt = new Date().toISOString();

                            await database.ref(`deleted/deletedVolunteerGroups/${orgId}`).set(groupData);
                            await database.ref(`deleted/deletedUsers/${orgId}`).set(userData);

                            await database.ref(`volunteerGroups/${orgId}`).remove();
                            await database.ref(`users/${userId}`).remove();

                            Swal.close();
                            Swal.fire({
                                title: 'Archived!',
                                text: `Volunteer application group "${orgName}" has been archived.`,
                                icon: 'success',
                                timer: 1600,
                                showConfirmButton: false,
                                timerProgressBar: true,
                                allowOutsideClick: false,
                                customClass: {
                                    popup: 'swal2-popup-success-clean',
                                    title: 'swal2-title-success-clean',
                                    htmlContainer: 'swal2-text-success-clean'
                                }
                            }).then(() => {
                                fetchAndRenderTable();
                                fetchAndRenderArchivedTable();
                            });
                        } catch (error) {
                            Swal.close();
                            Swal.fire({
                                icon: 'error',
                                title: 'Archiving Error',
                                text: `Failed to archive volunteer group: ${error.message}. Please try again.`,
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
            });
        });
    });
}

function attachArchivedRowHandlers() {
    document.querySelectorAll('.retrieveBtn').forEach(button => {
        button.addEventListener('click', async () => {
            if (!['Super Admin', 'position-one'].includes(adminPosition)) {
                Swal.fire({
                    title: 'Access Denied',
                    text: 'Only Super Admins and position-one can restore archived groups.',
                    icon: 'error',
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
                return;
            }

            const orgId = button.getAttribute('data-id');
            const orgToRestore = archivedData.find(item => item.id === orgId);
            const orgName = orgToRestore ? orgToRestore.organization : 'N/A';

            Swal.fire({
                title: `Retrieve "${orgName}"?`,
                text: 'This will move the volunteer group back to the active list.',
                icon: 'question',
                showCancelButton: true,
                confirmButtonText: 'Retrieve',
                cancelButtonText: 'Cancel',
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
            }).then(async (result) => {
                if (result.isConfirmed) {
                    try {
                        Swal.fire({
                            title: 'Restoring Volunteer Group...',
                            text: 'Moving volunteer group data to active records...',
                            allowOutsideClick: false,
                            didOpen: () => {
                                Swal.showLoading();
                            }
                        });

                        // Fetch full data from deleted nodes
                        const groupSnapshot = await database.ref(`deleted/deletedVolunteerGroups/${orgId}`).once('value');
                        const groupData = groupSnapshot.val();
                        if (!groupData) {
                            Swal.fire({
                                icon: 'error',
                                title: 'Error',
                                text: 'Volunteer group data not found for restoration.',
                                showConfirmButton: true,
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

                        const userSnapshot = await database.ref(`deleted/deletedUsers/${orgId}`).once('value');
                        const userData = userSnapshot.val();
                        if (!userData) {
                            Swal.fire({
                                icon: 'error',
                                title: 'Error',
                                text: 'User data not found for restoration.',
                                showConfirmButton: true,
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

                        // Remove deletedAt and restore all fields
                        const { deletedAt, ...restoredGroupData } = groupData;
                        const { deletedAt: userDeletedAt, ...restoredUserData } = userData;

                        // Restore to volunteerGroups and users with updated timestamps
                        await database.ref(`volunteerGroups/${orgId}`).set({
                            ...restoredGroupData,
                            lastUpdatedBy: auth.currentUser?.uid || 'N/A',
                            lastUpdatedAt: new Date().toISOString()
                        });
                        await database.ref(`users/${restoredGroupData.userId}`).set({
                            ...restoredUserData,
                            lastUpdatedBy: auth.currentUser?.uid || 'N/A',
                            lastUpdatedAt: new Date().toISOString()
                        });

                        // Remove from deleted nodes
                        await database.ref(`deleted/deletedVolunteerGroups/${orgId}`).remove();
                        await database.ref(`deleted/deletedUsers/${orgId}`).remove();

                        Swal.close();
                        Swal.fire({
                            icon: 'success',
                            title: 'Retrieved!',
                            text: `Volunteer group "${orgName}" has been retrieved from the archive.`,
                            
                            showConfirmButton: false,
                            timerProgressBar: true,
                            allowOutsideClick: false,
                            customClass: {
                                popup: 'swal2-popup-success-clean',
                                title: 'swal2-title-success-clean',
                                htmlContainer: 'swal2-text-success-clean'
                            }
                        }).then(() => {
                            fetchAndRenderTable();
                            fetchAndRenderArchivedTable();
                        });
                    } catch (error) {
                        Swal.close();
                        Swal.fire({
                            icon: 'error',
                            title: 'Restoration Error',
                            text: `Failed to restore volunteer group: ${error.message}.`,
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
        });
    });
}

function updateEntriesInfo(totalItems) {
    const startIndex = (currentPage - 1) * rowsPerPage;
    const endIndex = Math.min(startIndex + rowsPerPage, totalItems);
    if (entriesInfo) {
        entriesInfo.textContent = `Showing ${totalItems ? startIndex + 1 : 0} to ${endIndex} of ${totalItems} entries`;
    }
}

function updateArchivedEntriesInfo(totalItems) {
    const startIndex = (archivedCurrentPage - 1) * archivedRowsPerPage;
    const endIndex = Math.min(startIndex + archivedRowsPerPage, totalItems);
    if (archivedEntriesInfo) {
        archivedEntriesInfo.textContent = `Showing ${totalItems ? startIndex + 1 : 0} to ${endIndex} of ${totalItems} entries`;
    }
}

function renderPagination(totalRows) {
    if (!paginationContainer) return;
    paginationContainer.innerHTML = '';
    const totalPages = Math.ceil(totalRows / rowsPerPage);
    if (totalPages === 0) return;

    const createButton = (label, page, disabled = false, active = false) => {
        const btn = document.createElement('button');
        btn.textContent = label;
        if (disabled) btn.disabled = true;
        if (active) btn.classList.add('active-page');
        btn.addEventListener('click', () => {
            currentPage = page;
            renderTable(filteredData);
        });
        return btn;
    };

    paginationContainer.appendChild(createButton('Prev', currentPage - 1, currentPage === 1));

    const maxVisiblePages = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

    if (endPage - startPage < maxVisiblePages - 1) {
        startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
        paginationContainer.appendChild(createButton(i, i, false, i === currentPage));
    }

    paginationContainer.appendChild(createButton('Next', currentPage + 1, currentPage === totalPages));
}

function renderArchivedPagination(totalRows) {
    if (!archivedPaginationContainer) return;
    archivedPaginationContainer.innerHTML = '';
    const totalPages = Math.ceil(totalRows / archivedRowsPerPage);
    if (totalPages === 0) return;

    const createButton = (label, page, disabled = false, active = false) => {
        const btn = document.createElement('button');
        btn.textContent = label;
        if (disabled) btn.disabled = true;
        if (active) btn.classList.add('active-page');
        btn.addEventListener('click', () => {
            archivedCurrentPage = page;
            renderArchivedTable(filteredArchivedData);
        });
        return btn;
    };

    archivedPaginationContainer.appendChild(createButton('Prev', archivedCurrentPage - 1, archivedCurrentPage === 1));

    const maxVisiblePages = 5;
    let startPage = Math.max(1, archivedCurrentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

    if (endPage - startPage < maxVisiblePages - 1) {
        startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
        archivedPaginationContainer.appendChild(createButton(i, i, false, i === archivedCurrentPage));
    }

    archivedPaginationContainer.appendChild(createButton('Next', archivedCurrentPage + 1, archivedCurrentPage === totalPages));
}

function applySearchAndSort() {
    let currentData = [...data];

    const searchTerm = searchInput?.value.toLowerCase().trim() || '';
    if (searchTerm) {
        currentData = currentData.filter(item => {
            const organization = (item.organization || '').toLowerCase();
            const contactPerson = (item.contactPerson || '').toLowerCase();
            const email = (item.email || '').toLowerCase();
            const mobileNumber = (item.mobileNumber || '').toLowerCase();
            const formattedAddress = (item.address?.formattedAddress || '').toLowerCase();

            return organization.includes(searchTerm) ||
                   contactPerson.includes(searchTerm) ||
                   email.includes(searchTerm) ||
                   mobileNumber.includes(searchTerm) ||
                   formattedAddress.includes(searchTerm);
        });
    }

    const sortValue = sortSelect?.value || '';
    if (sortValue) {
        currentData.sort((a, b) => {
            let valA, valB;
            let order = 1;

            const parts = sortValue.split('-');
            const field = parts[0];
            if (parts.length > 1 && parts[1] === 'desc') {
                order = -1;
            }

            if (['organizationName', 'contactPerson', 'email', 'mobileNumber'].includes(field)) {
                valA = (a[field.replace('Name', '')] || '').toString().toLowerCase();
                valB = (b[field.replace('Name', '')] || '').toString().toLowerCase();
            } else if (field === 'formattedAddress') {
                valA = (a.address?.formattedAddress || '').toLowerCase();
                valB = (b.address?.formattedAddress || '').toLowerCase();
            } else {
                valA = (a.organization || '').toLowerCase();
                valB = (b.organization || '').toLowerCase();
            }

            return valA.localeCompare(valB) * order;
        });
    }

    filteredData = currentData;
    currentPage = 1;
    renderTable(filteredData);
}

function applyArchivedSearchAndSort() {
    let currentArchivedData = [...archivedData];

    filteredArchivedData = currentArchivedData;
    archivedCurrentPage = 1;
    renderArchivedTable(filteredArchivedData);
}

function clearDInputs() {
    if (!searchInput || !clearBtn) return;
    searchInput.value = '';
    clearBtn.style.display = 'none';
    applySearchAndSort();
}

if (clearBtn) {
    clearBtn.style.display = 'none';
    clearBtn.addEventListener('click', clearDInputs);
}

if (searchInput) {
    let searchTimeout;
    searchInput.addEventListener('keyup', () => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            applySearchAndSort();
            clearBtn.style.display = searchInput.value.trim() ? 'flex' : 'none';
        }, 300);
    });
}

if (sortSelect) {
    sortSelect.addEventListener('change', applySearchAndSort);
}

if (viewArchivedBtn) {
    viewArchivedBtn.addEventListener('click', async () => {
        if (!['Super Admin', 'position-one'].includes(adminPosition)) {
            Swal.fire({
                title: 'Access Denied',
                text: 'You must be a Super Admin or position-one to view archived groups.',
                icon: 'error',
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
            return;
        }

        if (archivedModal) {
            document.getElementById('addOrgModal').style.display = 'none';
            document.getElementById('confirmModal').style.display = 'none';
            document.getElementById('editOrgModal').style.display = 'none';
            document.getElementById('previewModal').style.display = 'none';
            
            archivedModal.style.display = 'flex';
            fetchAndRenderArchivedTable();
        }
    });
}

if (closeArchivedModalBtn) {
    closeArchivedModalBtn.addEventListener('click', () => {
        if (archivedModal) {
            archivedModal.style.display = 'none';
        }
    });
}

document.getElementById('closeModal').addEventListener('click', hidePreviewModal);

window.addEventListener('click', (event) => {
    if (event.target === document.getElementById('previewModal')) {
        hidePreviewModal();
    }
});

if (editDetailsBtn) {
    editDetailsBtn.addEventListener('click', () => {
        const confirmModal = document.getElementById('confirmModal');
        if (confirmModal) confirmModal.style.display = 'none';
        if (addOrgModal) addOrgModal.style.display = 'flex';
    });
}

document.addEventListener('DOMContentLoaded', () => {
    // Initialization code can be added here if needed
});

auth.onAuthStateChanged(async (user) => {
    if (!user) {
        Swal.fire({
            icon: 'warning',
            title: 'Authentication Required',
            text: 'Please sign in as an admin to view volunteer groups.',
            timer: 2000,
            showConfirmButton: false,
            timerProgressBar: true,
            allowOutsideClick: false,
            customClass: {
                popup: 'swal2-popup-error-clean',
                title: 'swal2-title-error-clean',
                htmlContainer: 'swal2-text-error-clean'
            }
        }).then(() => {
            window.location.replace('../pages/login.html');
        });
        return;
    }

    try {
        const userSnapshot = await database.ref(`users/${user.uid}`).once('value');
        const userData = userSnapshot.val();
        adminPosition = userData?.adminPosition || null;

        if (userData?.password_needs_reset) {
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
                window.location.replace('../pages/profile.html');
            });
            return;
        }

        if (['Super Admin', 'position-one'].includes(adminPosition)) {
            if (viewArchivedBtn) viewArchivedBtn.style.display = 'block';
        } else {
            if (viewArchivedBtn) viewArchivedBtn.style.display = 'none';
        }

        fetchAndRenderTable();
        fetchAndRenderArchivedTable();
    } catch (error) {
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
            window.location.replace('../pages/login.html');
        });
    }
});
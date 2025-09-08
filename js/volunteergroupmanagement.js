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

// Initialize secondary Firebase app for creating users
try {
    firebase.initializeApp(firebaseConfig, "SecondaryApp");
} catch (error) {
}
const secondaryAuth = firebase.auth(firebase.app("SecondaryApp"));

// Initialize EmailJS with updated public key
try {
    emailjs.init('ULA8rmn7VM-3fZ7ik');
} catch (error) {
}

// Function to generate a random temporary password
function generateTempPassword() {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    let password = "";
    for (let i = 0; i < 8; i++) {
        password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
}

// Function to validate email format
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const validDomains = ['gmail.com'];
    // const validDomains = ['gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com', 'icloud.com', 'protonmail.com'];
    const domain = email.split('@')[1]?.toLowerCase();
    return emailRegex.test(email) && validDomains.includes(domain);
}

// Function to validate mobile number format
function isValidMobile(mobile) {
    const mobileRegex = /^09[0-9]{9}$/;
    return mobileRegex.test(mobile);
}

// Function to check if mobile number is already in use by another user
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

// Function to check if email is already in use by another user
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

// Function to check if data is unchanged
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
            orgData.address.region === updatedData.address.region &&
            orgData.address.province === updatedData.address.province &&
            orgData.address.city === updatedData.address.city &&
            orgData.address.barangay === updatedData.address.barangay &&
            orgData.address.streetAddress === updatedData.address.streetAddress
        );
    } catch (error) {
        return false;
    }
}

// Function to verify Super Admin password
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

let currentAddressCell = null;
let editingRowId = null;
let orgData = null;
let isProcessing = false;
let currentEditOrgKey = null;
let adminPosition = null;

// DOM elements
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
const continueSuccessBtn = document.getElementById("closeSuccessBtn");

const regionSelect = document.getElementById('region');
const provinceSelect = document.getElementById('province');
const citySelect = document.getElementById('city');
const barangaySelect = document.getElementById('barangay');

const editOrgModal = document.getElementById('editOrgModal');
const closeEditModalBtn = document.getElementById('closeEditModalBtn');
const editOrgForm = document.getElementById('editOrgForm');
const editRegionSelect = document.getElementById('editRegion');
const editProvinceSelect = document.getElementById('editProvince');
const editCitySelect = document.getElementById('editCity');
const editBarangaySelect = document.getElementById('editBarangay');
const editOrgFirebaseKeyInput = document.getElementById('editOrgFirebaseKey');

const regionTextInput = document.getElementById('region-text');
const provinceTextInput = document.getElementById('province-text');
const cityTextInput = document.getElementById('city-text');
const barangayTextInput = document.getElementById('barangay-text');

const archivedModal = document.getElementById('archivedModal');
const closeArchivedModalBtn = document.getElementById('closeArchivedModalBtn');
const archivedTableBody = document.querySelector('#archivedTable tbody');
const archivedEntriesInfo = document.getElementById('archivedEntriesInfo');
const archivedPaginationContainer = document.getElementById('archivedPagination');
const viewArchivedBtn = document.getElementById('viewArchived');

// Floating button visibility
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

// Utility function to clear add form inputs
function clearAInputs() {
    addOrgForm.reset();
    my_handlers.fill_regions();
}

// Fetch and render table data
// function fetchAndRenderTable() {
//     database.ref("volunteerGroups").on("value", snapshot => {
//         const fetchedData = snapshot.val();
//         if (!fetchedData) {
//             data = [];
//             filteredData = [];
//             applySearchAndSort();
//             Swal.fire({
//                 icon: "info",
//                 title: "No Data",
//                 text: "No active volunteer groups found in the database.",
//                 toast: true,
//                 position: 'top-end',
//                 showConfirmButton: false,
//                 timer: 3000
//             });
//             return;
//         }
//         data = Object.entries(fetchedData).map(([key, entry]) => ({
//             id: key,
//             organization: entry.organization || "N/A",
//             contactPerson: entry.contactPerson || "N/A",
//             email: entry.email || "N/A",
//             mobileNumber: entry.mobileNumber || "N/A",
//             socialMedia: entry.socialMedia || "N/A",
//             address: {
//                 region: entry.address?.region || "N/A",
//                 province: entry.address?.province || "N/A",
//                 city: entry.address?.city || "N/A",
//                 barangay: entry.address?.barangay || "N/A",
//                 streetAddress: entry.address?.streetAddress || "N/A"
//             }
//         }));
//         applySearchAndSort();
//     });
// }
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
                region: entry.address?.region || "N/A",
                province: entry.address?.province || "N/A",
                city: entry.address?.city || "N/A",
                barangay: entry.address?.barangay || "N/A",
                streetAddress: entry.address?.streetAddress || "N/A"
            },
            organizationalBackgroundMission: entry.organizationalBackgroundMission || "N/A",
            areasOfExpertiseFocus: entry.areasOfExpertiseFocus || "N/A",
            legalStatusRegistration: entry.legalStatusRegistration || "N/A",
            requiredDocumentsLink: entry.requiredDocumentsLink || "N/A",
            timestamp: entry.timestamp || "N/A",
            userId: entry.userId || "N/A"
        }));
        applySearchAndSort();
    });
}

// Fetch and render archived table data
function fetchAndRenderArchivedTable() {
    database.ref("deletedVolunteerGroups").on("value", snapshot => {
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
                region: entry.address?.region || "N/A",
                province: entry.address?.province || "N/A",
                city: entry.address?.city || "N/A",
                barangay: entry.address?.barangay || "N/A",
                streetAddress: entry.address?.streetAddress || "N/A"
            },
            deletedAt: entry.deletedAt || "N/A"
        }));
        applyArchivedSearchAndSort();
    });
}

// === View Modal ===
// function showPreviewModal(orgData) {
//     const modalContentDiv = document.getElementById('modalContent');
//     const formattedTimestamp = orgData.timestamp ? new Date(orgData.timestamp).toLocaleString('en-US', {
//         year: 'numeric', month: 'short', day: 'numeric',
//         hour: '2-digit', minute: '2-digit', second: '2-digit'
//     }) : 'N/A';

//     modalContentDiv.innerHTML = `
//         <div class="modal-content-inner" style="padding: 20px;">
//             <h2>Organization Details:</h2>
//             <p><strong>Organization Name:</strong> ${orgData.organization || 'N/A'}</p>
//             <p><strong>Contact Person:</strong> ${orgData.contactPerson || 'N/A'}</p>
//             <p><strong>Email:</strong> ${orgData.email || 'N/A'}</p>
//             <p><strong>Mobile Number:</strong> ${orgData.mobileNumber || 'N/A'}</p>
//             <p><strong>Social Media Link:</strong> ${orgData.socialMedia && orgData.socialMedia !== 'N/A' ? `<a href="${orgData.socialMedia}" target="_blank" rel="noopener noreferrer">${orgData.socialMedia}</a>` : 'N/A'}</p>
//             <hr>
//             <h2>Address:</h2>
//             <div style="margin-left: 15px;">
//                 <p><strong>Region:</strong> ${orgData.address?.region || 'N/A'}</p>
//                 <p><strong>Province:</strong> ${orgData.address?.province || 'N/A'}</p>
//                 <p><strong>City:</strong> ${orgData.address?.city || 'N/A'}</p>
//                 <p><strong>Barangay:</strong> ${orgData.address?.barangay || 'N/A'}</p>
//                 <p><strong>Street Address:</strong> ${orgData.address?.streetAddress || 'N/A'}</p>
//             </div>
//             <hr>
//             <p style="margin-top: 20px; font-size: 0.9em; color: #555;"><strong>Created At:</strong> ${formattedTimestamp}</p>
//         </div>
//     `;
//     document.getElementById('previewModal').style.display = 'flex';
// }
function showPreviewModal(orgData) {
    const modalContentDiv = document.getElementById('modalContent');
    const formattedTimestamp = orgData.timestamp ? new Date(orgData.timestamp).toLocaleString('en-US', {
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
                <p><strong>Region:</strong> ${orgData.address?.region || 'N/A'}</p>
                <p><strong>Province:</strong> ${orgData.address?.province || 'N/A'}</p>
                <p><strong>City:</strong> ${orgData.address?.city || 'N/A'}</p>
                <p><strong>Barangay:</strong> ${orgData.address?.barangay || 'N/A'}</p>
                <p><strong>Street Address:</strong> ${orgData.address?.streetAddress || 'N/A'}</p>
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
            <p style="margin-top: 20px; font-size: 0.9em; color: #555;"><strong>Created At:</strong> ${formattedTimestamp}</p>
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

// Render table
function renderTable(dataToRender = filteredData) {
    if (!tableBody) return;
    tableBody.innerHTML = "";
    const start = (currentPage - 1) * rowsPerPage;
    const end = start + rowsPerPage;
    const pageData = dataToRender.slice(start, end);

    if (pageData.length === 0 && searchInput.value.trim() !== "") {
        tableBody.innerHTML = `<tr><td colspan="12" class="text-center">No volunteer group found.</td></tr>`;
    } else if (pageData.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="12" class="text-center">No volunteer groups to display.</td></tr>`;
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
            <td>
                ${row.socialMedia && row.socialMedia !== 'N/A' ? `<a href="${row.socialMedia}" target="_blank" rel="noopener noreferrer">${row.socialMedia}</a>` : 'N/A'}
            </td>
            <td>${row.address?.region || 'N/A'}</td>
            <td>${row.address?.province || 'N/A'}</td>
            <td>${row.address?.city || 'N/A'}</td>
            <td>${row.address?.barangay || 'N/A'}</td>
            <td>${row.address?.streetAddress || 'N/A'}</td>
            <td>
                <button title="View" class="viewBtn" data-id="${row.id}"><i class='bx bx-show'></i></button>
                <button title="Edit" class="editBtn" data-id="${row.id}"><i class='bx bx-edit'></i></button>
                <button title="Archive" class="deleteBtn" data-id="${row.id}"><i class="bx bx-x-circle"></i></button>
            </td>
        `;
        tableBody.appendChild(tr);
    });

    updateEntriesInfo(dataToRender.length);
    renderPagination(dataToRender.length);
    attachRowHandlers();
}

// Render archived table
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
        const fullAddress = `${row.address?.streetAddress !== 'N/A' ? row.address.streetAddress + ', ' : ''}${row.address?.barangay || 'N/A'}, ${row.address?.city || 'N/A'}, ${row.address?.province || 'N/A'}, ${row.address?.region || 'N/A'}`;
        const deletedDate = row.deletedAt ? new Date(row.deletedAt).toLocaleDateString() : 'N/A';

        tr.innerHTML = `
            <td>${row.organization}</td>
            <td>${row.email}</td>
            <td>${fullAddress}</td>
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

var my_handlers = {
    fill_regions: function() {
        if (regionTextInput) regionTextInput.value = '';
        if (provinceTextInput) provinceTextInput.value = '';
        if (cityTextInput) cityTextInput.value = '';
        if (barangayTextInput) barangayTextInput.value = '';

        regionSelect.innerHTML = '<option value="" selected="true" disabled>Choose Region</option>';
        regionSelect.selectedIndex = 0;

        provinceSelect.innerHTML = '<option value="" selected="true" disabled>Choose Region First</option>';
        provinceSelect.selectedIndex = 0;

        citySelect.innerHTML = '<option value="" selected="true" disabled>Choose Region First</option>';
        citySelect.selectedIndex = 0;

        barangaySelect.innerHTML = '<option value="" selected="true" disabled>Choose Region First</option>';
        barangaySelect.selectedIndex = 0;

        const url = '../json/region.json';

        fetch(url)
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP error! Status: ${response.status} - ${response.statusText}`);
                }
                return response.json();
            })
            .then(data => {
                if (!Array.isArray(data) || !data.every(item => item.region_code && item.region_name)) {
                    throw new Error("Invalid region data structure");
                }

                data.sort(function(a, b) {
                    return a.region_name.localeCompare(b.region_name);
                });

                data.forEach(entry => {
                    const opt = document.createElement('option');
                    opt.value = entry.region_code;
                    opt.textContent = entry.region_name;
                    regionSelect.appendChild(opt);
                });
            })
            .catch(error => {
                Swal.fire({
                    icon: 'error',
                    title: 'Failed to Load Regions',
                    text: `Unable to load region data: ${error.message}. Check if ${url} is accessible.`,
                    confirmButtonText: 'OK'
                });
            });
    },
    fill_provinces: function() {
        var region_code = regionSelect.value;

        if (!region_code) {
            Swal.fire({
                icon: 'warning',
                title: 'Select Region First',
                text: 'Please select a region before choosing a province.',
                confirmButtonText: 'OK'
            });
            provinceSelect.innerHTML = '<option value="" selected="true" disabled>Choose Province</option>';
            provinceSelect.selectedIndex = 0;
            citySelect.innerHTML = '<option value="" selected="true" disabled>Choose Province First</option>';
            citySelect.selectedIndex = 0;
            barangaySelect.innerHTML = '<option value="" selected="true" disabled>Choose City First</option>';
            barangaySelect.selectedIndex = 0;
            if (provinceTextInput) provinceTextInput.value = '';
            if (cityTextInput) cityTextInput.value = '';
            if (barangayTextInput) barangayTextInput.value = '';
            return;
        }

        var region_text = regionSelect.options[regionSelect.selectedIndex].textContent;
        if (regionTextInput) regionTextInput.value = region_text;

        if (provinceTextInput) provinceTextInput.value = '';
        if (cityTextInput) cityTextInput.value = '';
        if (barangayTextInput) barangayTextInput.value = '';

        provinceSelect.innerHTML = '<option value="" selected="true" disabled>Choose Province</option>';
        provinceSelect.selectedIndex = 0;

        citySelect.innerHTML = '<option value="" selected="true" disabled>Choose Province First</option>';
        citySelect.selectedIndex = 0;

        barangaySelect.innerHTML = '<option value="" selected="true" disabled>Choose Province First</option>';
        barangaySelect.selectedIndex = 0;

        const url = '../json/province.json';

        fetch(url)
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP error! Status: ${response.status} - ${response.statusText}`);
                }
                return response.json();
            })
            .then(data => {
                if (!Array.isArray(data) || !data.every(item => item.region_code && item.province_code && item.province_name)) {
                    throw new Error("Invalid province data structure");
                }

                var result = data.filter(function(value) {
                    return value.region_code === region_code;
                });

                result.sort(function(a, b) {
                    return a.province_name.localeCompare(b.province_name);
                });

                result.forEach(entry => {
                    const opt = document.createElement('option');
                    opt.value = entry.province_code;
                    opt.textContent = entry.province_name;
                    provinceSelect.appendChild(opt);
                });
            })
            .catch(error => {
                Swal.fire({
                    icon: 'error',
                    title: 'Failed to Load Provinces',
                    text: `Unable to load province data: ${error.message}. Check if ${url} is accessible.`,
                    confirmButtonText: 'OK'
                });
            });
    },
    fill_cities: function() {
        var province_code = provinceSelect.value;

        if (!province_code) {
            Swal.fire({
                icon: 'warning',
                title: 'Select Province First',
                text: 'Please select a province before choosing a city/municipality.',
                confirmButtonText: 'OK'
            });
            citySelect.innerHTML = '<option value="" selected="true" disabled>Choose City / Municipality</option>';
            citySelect.selectedIndex = 0;
            barangaySelect.innerHTML = '<option value="" selected="true" disabled>Choose City First</option>';
            barangaySelect.selectedIndex = 0;
            if (cityTextInput) cityTextInput.value = '';
            if (barangayTextInput) barangayTextInput.value = '';
            return;
        }

        var province_text = provinceSelect.options[provinceSelect.selectedIndex].textContent;
        if (provinceTextInput) provinceTextInput.value = province_text;

        if (cityTextInput) cityTextInput.value = '';
        if (barangayTextInput) barangayTextInput.value = '';

        citySelect.innerHTML = '<option value="" selected="true" disabled>Choose City / Municipality</option>';
        citySelect.selectedIndex = 0;

        barangaySelect.innerHTML = '<option value="" selected="true" disabled>Choose City First</option>';
        barangaySelect.selectedIndex = 0;

        const url = '../json/city.json';

        fetch(url)
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP error! Status: ${response.status} - ${response.statusText}`);
                }
                return response.json();
            })
            .then(data => {
                if (!Array.isArray(data) || !data.every(item => item.province_code && item.city_code && item.city_name)) {
                    throw new Error("Invalid city data structure");
                }

                var result = data.filter(function(value) {
                    return value.province_code === province_code;
                });

                result.sort(function(a, b) {
                    return a.city_name.localeCompare(b.city_name);
                });

                result.forEach(entry => {
                    const opt = document.createElement('option');
                    opt.value = entry.city_code;
                    opt.textContent = entry.city_name;
                    citySelect.appendChild(opt);
                });
            })
            .catch(error => {
                Swal.fire({
                    icon: 'error',
                    title: 'Failed to Load Cities',
                    text: `Unable to load city data: ${error.message}. Check if ${url} is accessible.`,
                    confirmButtonText: 'OK'
                });
            });
    },
    fill_barangays: function() {
        var city_code = citySelect.value;

        if (!city_code) {
            Swal.fire({
                icon: 'warning',
                title: 'Select City/Municipality First',
                text: 'Please select a city/municipality before choosing a barangay.',
                confirmButtonText: 'OK'
            });
            barangaySelect.innerHTML = '<option value="" selected="true" disabled>Choose Barangay</option>';
            barangaySelect.selectedIndex = 0;
            if (barangayTextInput) barangayTextInput.value = '';
            return;
        }

        var city_text = citySelect.options[citySelect.selectedIndex].textContent;
        if (cityTextInput) cityTextInput.value = city_text;

        if (barangayTextInput) barangayTextInput.value = '';

        barangaySelect.innerHTML = '<option value="" selected="true" disabled>Choose Barangay</option>';
        barangaySelect.selectedIndex = 0;

        const url = '../json/barangay.json';

        fetch(url)
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP error! Status: ${response.status} - ${response.statusText}`);
                }
                return response.json();
            })
            .then(data => {
                if (!Array.isArray(data) || !data.every(item => item.city_code && item.brgy_code && item.brgy_name)) {
                    throw new Error("Invalid barangay data structure");
                }

                var result = data.filter(function(value) {
                    return value.city_code === city_code;
                });

                result.sort(function(a, b) {
                    return a.brgy_name.localeCompare(b.brgy_name);
                });

                result.forEach(entry => {
                    const opt = document.createElement('option');
                    opt.value = entry.brgy_code;
                    opt.textContent = entry.brgy_name;
                    barangaySelect.appendChild(opt);
                });
            })
            .catch(error => {
                Swal.fire({
                    icon: 'error',
                    title: 'Failed to Load Barangays',
                    text: `Unable to load barangay data: ${error.message}. Check if ${url} is accessible.`,
                    confirmButtonText: 'OK'
                });
            });
    },
    onchange_barangay: function() {
        var barangay_text = barangaySelect.options[barangaySelect.selectedIndex].textContent;
        if (barangayTextInput) barangayTextInput.value = barangay_text;
    },
};

if (regionSelect) regionSelect.addEventListener('change', my_handlers.fill_provinces);
if (provinceSelect) provinceSelect.addEventListener('change', my_handlers.fill_cities);
if (citySelect) citySelect.addEventListener('change', my_handlers.fill_barangays);
if (barangaySelect) barangaySelect.addEventListener('change', my_handlers.onchange_barangay);

my_handlers.fill_regions();

// Event listeners for modals and buttons
if (addNew) {
    addNew.addEventListener('click', () => {
        if (adminPosition !== 'Super Admin') {
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
            my_handlers.fill_regions();
            currentAddressCell = null;
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

// Event listener for the form submission to show confirmation modal
if (addOrgForm) {
    addOrgForm.addEventListener('submit', async e => {
        e.preventDefault();

        if (adminPosition !== 'Super Admin') {
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
        const contactPerson = document.getElementById('contactPerson').value.trim();
        const email = document.getElementById('email').value.trim();
        const mobileNumber = document.getElementById('mobileNumber').value.trim();
        const socialMedia = document.getElementById('socialMedia').value.trim();
        const streetAddress = document.getElementById('streetAddress')?.value.trim() || '';

        const selectedRegionText = regionSelect.options[regionSelect.selectedIndex]?.textContent || '';
        const selectedProvinceText = provinceSelect.options[provinceSelect.selectedIndex]?.textContent || '';
        const selectedCityText = citySelect.options[citySelect.selectedIndex]?.textContent || '';
        const selectedBarangayText = barangaySelect.options[barangaySelect.selectedIndex]?.textContent || '';

        // Validation Checks
        if (!organization || !contactPerson || !email || !mobileNumber ||
            !selectedRegionText || !selectedProvinceText || !selectedCityText || !selectedBarangayText) {
            Swal.fire({
                icon: 'error',
                title: 'Missing Fields',
                text: 'Please fill in all required fields (Organization, Contact Person, Email, Mobile Number, and Full Address).',
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
                region: selectedRegionText,
                province: selectedProvinceText,
                city: selectedCityText,
                barangay: selectedBarangayText,
                streetAddress: streetAddress || "N/A"
            },
            timestamp: new Date().toISOString()
        };

        const confirmDetails = document.getElementById('confirmDetails');
        if (confirmDetails) {
            const fullAddress = `${orgData.address.streetAddress !== 'N/A' ? orgData.address.streetAddress + ', ' : ''}${orgData.address.barangay}, ${orgData.address.city}, ${orgData.address.province}, ${orgData.address.region}`;
            confirmDetails.innerHTML = `
                <p><strong>Organization:</strong> ${orgData.organization}</p>
                <p><strong>Full Address:</strong> ${fullAddress}</p>
                <p><strong>Contact Person:</strong> ${orgData.contactPerson}</p>
                <p><strong>Email:</strong> ${orgData.email}</p>
                <p><strong>Mobile:</strong> ${orgData.mobileNumber}</p>
                <p><strong>Social Media:</strong> ${orgData.socialMedia}</p>
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

        const newVolunteerGroup = {
            organization: orgData.organization,
            contactPerson: orgData.contactPerson,
            email: orgData.email || "N/A",
            mobileNumber: orgData.mobileNumber,
            socialMedia: orgData.socialMedia,
            address: {
                region: orgData.address.region,
                province: orgData.address.province,
                city: orgData.address.city,
                barangay: orgData.address.barangay,
                streetAddress: orgData.address.streetAddress
            },
            timestamp: orgData.timestamp
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

            await database.ref(`users/${newUser.uid}`).set({
                role: "ABVN",
                email: orgData.email,
                mobile: orgData.mobileNumber,
                organization: orgData.organization,
                contactPerson: orgData.contactPerson,
                address: {
                    region: orgData.address.region,
                    province: orgData.address.province,
                    city: orgData.address.city,
                    barangay: orgData.address.barangay,
                    streetAddress: orgData.address.streetAddress
                },
                createdAt: new Date().toISOString(),
                isFirstLogin: true,
                emailVerified: false,
                password_needs_reset: true
            });

            const snapshot = await database.ref('volunteerGroups').once('value');
            const groups = snapshot.val();
            const nextKey = groups ? Math.max(...Object.keys(groups).map(Number)) + 1 : 1;

            await database.ref(`volunteerGroups/${nextKey}`).set({
                ...newVolunteerGroup,
                userId: newUser.uid
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

// Function to populate and open the edit modal
// function openEditModal(orgId) {
//     const orgToEdit = data.find(org => org.id === orgId);
//     if (!orgToEdit) {
//         Swal.fire({
//             icon: 'error',
//             title: 'Error',
//             text: 'Volunteer group not found.',
//             showConfirmButton: true,
//             confirmButtonText: 'OK',
//             customClass: {
//                 popup: 'swal2-popup-suerrorccess-clean',
//                 title: 'swal2-title-error-clean',
//                 htmlContainer: 'swal2-text-error-clean',
//                 confirmButton: 'my-error-button'
//             }
//         });
//         return;
//     }

//     currentEditOrgKey = orgId;
//     editOrgFirebaseKeyInput.value = orgId;

//     document.getElementById('editOrganization').value = orgToEdit.organization;
//     document.getElementById('editContactPerson').value = orgToEdit.contactPerson;
//     document.getElementById('editEmail').value = orgToEdit.email;
//     document.getElementById('editMobileNumber').value = orgToEdit.mobileNumber;
//     document.getElementById('editSocialMedia').value = orgToEdit.socialMedia === "N/A" ? "" : orgToEdit.socialMedia;
//     document.getElementById('editStreetAddress').value = orgToEdit.address.streetAddress === "N/A" ? "" : orgToEdit.address.streetAddress;

//     populateEditLocationDropdowns(orgToEdit.address.region, orgToEdit.address.province, orgToEdit.address.city, orgToEdit.address.barangay);

//     editOrgModal.style.display = 'flex';
// }
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
    document.getElementById('editContactPerson').value = orgToEdit.contactPerson;
    document.getElementById('editEmail').value = orgToEdit.email;
    document.getElementById('editMobileNumber').value = orgToEdit.mobileNumber;
    document.getElementById('editSocialMedia').value = orgToEdit.socialMedia === "N/A" ? "" : orgToEdit.socialMedia;
    document.getElementById('editStreetAddress').value = orgToEdit.address.streetAddress === "N/A" ? "" : orgToEdit.address.streetAddress;
    document.getElementById('editOrganizationalBackgroundMission').value = orgToEdit.organizationalBackgroundMission || "";
    document.getElementById('editAreasOfExpertiseFocus').value = orgToEdit.areasOfExpertiseFocus || "";
    document.getElementById('editLegalStatusRegistration').value = orgToEdit.legalStatusRegistration || "";
    document.getElementById('editRequiredDocumentsLink').value = orgToEdit.requiredDocumentsLink || "";

    populateEditLocationDropdowns(orgToEdit.address.region, orgToEdit.address.province, orgToEdit.address.city, orgToEdit.address.barangay);

    editOrgModal.style.display = 'flex';
}

// Function to populate edit modal location dropdowns
// async function populateEditLocationDropdowns(selectedRegion, selectedProvince, selectedCity, selectedBarangay) {
//     editRegionSelect.innerHTML = '<option value="" selected="true" disabled>Choose Region</option>';
//     editProvinceSelect.innerHTML = '<option value="" selected="true" disabled>Choose Province</option>';
//     editCitySelect.innerHTML = '<option value="" selected="true" disabled>Choose City / Municipality</option>';
//     editBarangaySelect.innerHTML = '<option value="" selected="true" disabled>Choose Barangay</option>';

//     try {
//         const regionResponse = await fetch('../json/region.json');
//         if (!regionResponse.ok) throw new Error(`HTTP error! Status: ${regionResponse.status}`);
//         const regions = await regionResponse.json();
//         regions.sort((a, b) => a.region_name.localeCompare(b.region_name));
//         regions.forEach(entry => {
//             const opt = document.createElement('option');
//             opt.value = entry.region_code;
//             opt.textContent = entry.region_name;
//             editRegionSelect.appendChild(opt);
//         });
//         const regionFound = regions.find(r => r.region_name === selectedRegion);
//         if (regionFound) {
//             editRegionSelect.value = regionFound.region_code;
//         }

//         const provinceResponse = await fetch('../json/province.json');
//         if (!provinceResponse.ok) throw new Error(`HTTP error! Status: ${provinceResponse.status}`);
//         const provinces = await provinceResponse.json();
//         const filteredProvinces = provinces.filter(p => p.region_code === editRegionSelect.value);
//         filteredProvinces.sort((a, b) => a.province_name.localeCompare(b.province_name));
//         filteredProvinces.forEach(entry => {
//             const opt = document.createElement('option');
//             opt.value = entry.province_code;
//             opt.textContent = entry.province_name;
//             editProvinceSelect.appendChild(opt);
//         });
//         const provinceFound = filteredProvinces.find(p => p.province_name === selectedProvince);
//         if (provinceFound) {
//             editProvinceSelect.value = provinceFound.province_code;
//         }

//         const cityResponse = await fetch('../json/city.json');
//         if (!cityResponse.ok) throw new Error(`HTTP error! Status: ${cityResponse.status}`);
//         const cities = await cityResponse.json();
//         const filteredCities = cities.filter(c => c.province_code === editProvinceSelect.value);
//         filteredCities.sort((a, b) => a.city_name.localeCompare(b.city_name));
//         filteredCities.forEach(entry => {
//             const opt = document.createElement('option');
//             opt.value = entry.city_code;
//             opt.textContent = entry.city_name;
//             editCitySelect.appendChild(opt);
//         });
//         const cityFound = filteredCities.find(c => c.city_name === selectedCity);
//         if (cityFound) {
//             editCitySelect.value = cityFound.city_code;
//         }

//         const barangayResponse = await fetch('../json/barangay.json');
//         if (!barangayResponse.ok) throw new Error(`HTTP error! Status: ${barangayResponse.status}`);
//         const barangays = await barangayResponse.json();
//         const filteredBarangays = barangays.filter(b => b.city_code === editCitySelect.value);
//         filteredBarangays.sort((a, b) => a.brgy_name.localeCompare(b.brgy_name));
//         filteredBarangays.forEach(entry => {
//             const opt = document.createElement('option');
//             opt.value = entry.brgy_code;
//             opt.textContent = entry.brgy_name;
//             editBarangaySelect.appendChild(opt);
//         });
//         const barangayFound = filteredBarangays.find(b => b.brgy_name === selectedBarangay);
//         if (barangayFound) {
//             editBarangaySelect.value = barangayFound.brgy_code;
//         }
//     } catch (error) {
//         Swal.fire({
//             icon: 'error',
//             title: 'Failed to Load Location Data',
//             text: `Unable to load location data for editing: ${error.message}.`,
//             showConfirmButton: true,
//             confirmButtonText: 'OK',
//             customClass: {
//                 popup: 'swal2-popup-error-clean',
//                 title: 'swal2-title-error-clean',
//                 htmlContainer: 'swal2-text-error-clean',
//                 confirmButton: 'my-error-button'
//             }
//         });
//     }
// }
async function populateEditLocationDropdowns(selectedRegion, selectedProvince, selectedCity, selectedBarangay) {
    editRegionSelect.innerHTML = '<option value="" selected="true" disabled>Choose Region</option>';
    editProvinceSelect.innerHTML = '<option value="" selected="true" disabled>Choose Province</option>';
    editCitySelect.innerHTML = '<option value="" selected="true" disabled>Choose City / Municipality</option>';
    editBarangaySelect.innerHTML = '<option value="" selected="true" disabled>Choose Barangay</option>';

    try {
        const regionResponse = await fetch('../json/region.json');
        if (!regionResponse.ok) throw new Error(`HTTP error! Status: ${regionResponse.status}`);
        const regions = await regionResponse.json();
        regions.sort((a, b) => a.region_name.localeCompare(b.region_name));
        regions.forEach(entry => {
            const opt = document.createElement('option');
            opt.value = entry.region_code;
            opt.textContent = entry.region_name;
            editRegionSelect.appendChild(opt);
        });
        const regionFound = regions.find(r => r.region_name === selectedRegion);
        if (regionFound) {
            editRegionSelect.value = regionFound.region_code;
        }

        const provinceResponse = await fetch('../json/province.json');
        if (!provinceResponse.ok) throw new Error(`HTTP error! Status: ${provinceResponse.status}`);
        const provinces = await provinceResponse.json();
        const filteredProvinces = provinces.filter(p => p.region_code === editRegionSelect.value);
        filteredProvinces.sort((a, b) => a.province_name.localeCompare(b.province_name));
        filteredProvinces.forEach(entry => {
            const opt = document.createElement('option');
            opt.value = entry.province_code;
            opt.textContent = entry.province_name;
            editProvinceSelect.appendChild(opt);
        });
        const provinceFound = filteredProvinces.find(p => p.province_name === selectedProvince);
        if (provinceFound) {
            editProvinceSelect.value = provinceFound.province_code;
        }

        const cityResponse = await fetch('../json/city.json');
        if (!cityResponse.ok) throw new Error(`HTTP error! Status: ${cityResponse.status}`);
        const cities = await cityResponse.json();
        const filteredCities = cities.filter(c => c.province_code === editProvinceSelect.value);
        filteredCities.sort((a, b) => a.city_name.localeCompare(b.city_name));
        filteredCities.forEach(entry => {
            const opt = document.createElement('option');
            opt.value = entry.city_code;
            opt.textContent = entry.city_name;
            editCitySelect.appendChild(opt);
        });
        const cityFound = filteredCities.find(c => c.city_name === selectedCity);
        if (cityFound) {
            editCitySelect.value = cityFound.city_code;
        }

        const barangayResponse = await fetch('../json/barangay.json');
        if (!barangayResponse.ok) throw new Error(`HTTP error! Status: ${barangayResponse.status}`);
        const barangays = await barangayResponse.json();
        const filteredBarangays = barangays.filter(b => b.city_code === editCitySelect.value);
        filteredBarangays.sort((a, b) => a.brgy_name.localeCompare(b.brgy_name));
        filteredBarangays.forEach(entry => {
            const opt = document.createElement('option');
            opt.value = entry.brgy_code;
            opt.textContent = entry.brgy_name;
            editBarangaySelect.appendChild(opt);
        });
        const barangayFound = filteredBarangays.find(b => b.brgy_name === selectedBarangay);
        if (barangayFound) {
            editBarangaySelect.value = barangayFound.brgy_code;
        }

        // Populate new fields
        const orgToEdit = data.find(org => org.id === currentEditOrgKey);
        if (orgToEdit) {
            document.getElementById('editOrganizationalBackgroundMission').value = orgToEdit.organizationalBackgroundMission || '';
            document.getElementById('editAreasOfExpertiseFocus').value = orgToEdit.areasOfExpertiseFocus || '';
            document.getElementById('editLegalStatusRegistration').value = orgToEdit.legalStatusRegistration || '';
            document.getElementById('editRequiredDocumentsLink').value = orgToEdit.requiredDocumentsLink || '';
        }
    } catch (error) {
        Swal.fire({
            icon: 'error',
            title: 'Failed to Load Location Data',
            text: `Unable to load location data for editing: ${error.message}.`,
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

editRegionSelect.addEventListener('change', async () => {
    editProvinceSelect.innerHTML = '<option value="" selected="true" disabled>Choose Province</option>';
    editCitySelect.innerHTML = '<option value="" selected="true" disabled>Choose City / Municipality</option>';
    editBarangaySelect.innerHTML = '<option value="" selected="true" disabled>Choose Barangay</option>';
    const regionCode = editRegionSelect.value;
    if (!regionCode) return;

    try {
        const response = await fetch('../json/province.json');
        const provinces = await response.json();
        const filteredProvinces = provinces.filter(p => p.region_code === regionCode);
        filteredProvinces.sort((a, b) => a.province_name.localeCompare(b.province_name));
        filteredProvinces.forEach(entry => {
            const opt = document.createElement('option');
            opt.value = entry.province_code;
            opt.textContent = entry.province_name;
            editProvinceSelect.appendChild(opt);
        });
    } catch (error) {
    }
});

editProvinceSelect.addEventListener('change', async () => {
    editCitySelect.innerHTML = '<option value="" selected="true" disabled>Choose City / Municipality</option>';
    editBarangaySelect.innerHTML = '<option value="" selected="true" disabled>Choose Barangay</option>';
    const provinceCode = editProvinceSelect.value;
    if (!provinceCode) return;

    try {
        const response = await fetch('../json/city.json');
        const cities = await response.json();
        const filteredCities = cities.filter(c => c.province_code === provinceCode);
        filteredCities.sort((a, b) => a.city_name.localeCompare(b.city_name));
        filteredCities.forEach(entry => {
            const opt = document.createElement('option');
            opt.value = entry.city_code;
            opt.textContent = entry.city_name;
            editCitySelect.appendChild(opt);
        });
    } catch (error) {
    }
});

editCitySelect.addEventListener('change', async () => {
    editBarangaySelect.innerHTML = '<option value="" selected="true" disabled>Choose Barangay</option>';
    const cityCode = editCitySelect.value;
    if (!cityCode) return;

    try {
        const response = await fetch('../json/barangay.json');
        const barangays = await response.json();
        const filteredBarangays = barangays.filter(b => b.city_code === cityCode);
        filteredBarangays.sort((a, b) => a.brgy_name.localeCompare(b.brgy_name));
        filteredBarangays.forEach(entry => {
            const opt = document.createElement('option');
            opt.value = entry.brgy_code;
            opt.textContent = entry.brgy_name;
            editBarangaySelect.appendChild(opt);
        });
    } catch (error) {
    }
});

// if (editOrgForm) {
//     editOrgForm.addEventListener('submit', async e => {
//         e.preventDefault();

//         if (adminPosition !== 'Super Admin') {
//             Swal.fire({
//                 title: 'Access Denied',
//                 text: 'You do not have permission to edit volunteer groups.',
//                 icon: 'error',
//                 timer: 2000,
//                 showConfirmButton: false,
//                 timerProgressBar: true,
//                 allowOutsideClick: false,
//                 customClass: {
//                     popup: 'swal2-popup-error-clean',
//                     title: 'swal2-title-error-clean',
//                     htmlContainer: 'swal2-text-error-clean'
//                 }
//             });
//             return;
//         }

//         const orgId = editOrgFirebaseKeyInput.value;
//         if (!orgId) {
//             Swal.fire({
//                 icon: 'error',
//                 title: 'Error',
//                 text: 'No organization ID found for editing.',
//                 showConfirmButton: true,
//                 confirmButtonText: 'OK',
//                 customClass: {
//                     popup: 'swal2-popup-error-clean',
//                     title: 'swal2-title-error-clean',
//                     htmlContainer: 'swal2-text-error-clean',
//                     confirmButton: 'my-error-button'
//                 }
//             });
//             return;
//         }

//         const updatedOrganization = document.getElementById('editOrganization').value.trim();
//         const updatedContactPerson = document.getElementById('editContactPerson').value.trim();
//         const updatedEmail = document.getElementById('editEmail').value.trim();
//         const updatedMobileNumber = document.getElementById('editMobileNumber').value.trim();
//         const updatedSocialMedia = document.getElementById('editSocialMedia').value.trim();
//         const updatedStreetAddress = document.getElementById('editStreetAddress').value.trim();

//         const updatedRegionText = editRegionSelect.options[editRegionSelect.selectedIndex]?.textContent || '';
//         const updatedProvinceText = editProvinceSelect.options[editProvinceSelect.selectedIndex]?.textContent || '';
//         const updatedCityText = editCitySelect.options[editCitySelect.selectedIndex]?.textContent || '';
//         const updatedBarangayText = editBarangaySelect.options[editBarangaySelect.selectedIndex]?.textContent || ''; 

//         // Validation Checks
//         if (!updatedOrganization || !updatedContactPerson || !updatedEmail || !updatedMobileNumber ||
//             !updatedRegionText || !updatedProvinceText || !updatedCityText || !updatedBarangayText) {
//             Swal.fire({
//                 icon: 'error',
//                 title: 'Missing Fields',
//                 text: 'Please fill in all required fields (Organization, Contact Person, Email, Mobile Number, and Full Address).',
//                 showConfirmButton: true,
//                 confirmButtonText: 'OK',
//                 customClass: {
//                     popup: 'swal2-popup-error-clean',
//                     title: 'swal2-title-error-clean',
//                     htmlContainer: 'swal2-text-error-clean',
//                     confirmButton: 'my-error-button'
//                 }
//             });
//             return;
//         }

//         if (!isValidEmail(updatedEmail)) {
//             Swal.fire({
//                 icon: 'error',
//                 title: 'Invalid Email',
//                 text: 'Please enter a valid email address from an allowed domain.',
//                 showConfirmButton: true,
//                 confirmButtonText: 'OK',
//                 customClass: {
//                     popup: 'swal2-popup-error-clean',
//                     title: 'swal2-title-error-clean',
//                     htmlContainer: 'swal2-text-error-clean',
//                     confirmButton: 'my-error-button'
//                 }
//             });
//             return;
//         }

//         if (!isValidMobile(updatedMobileNumber)) {
//             Swal.fire({
//                 icon: 'error',
//                 title: 'Invalid Mobile Number',
//                 text: 'Mobile number must be 11 digits starting with "09"',
//                 showConfirmButton: true,
//                 confirmButtonText: 'OK',
//                 customClass: {
//                     popup: 'swal2-popup-error-clean',
//                     title: 'swal2-title-error-clean',
//                     htmlContainer: 'swal2-text-error-clean',
//                     confirmButton: 'my-error-button'
//                 }
//             });
//             return;
//         }

//         const updatedData = {
//             organization: updatedOrganization,
//             contactPerson: updatedContactPerson,
//             email: updatedEmail,
//             mobileNumber: updatedMobileNumber,
//             socialMedia: updatedSocialMedia || "N/A",
//             address: {
//                 region: updatedRegionText,
//                 province: updatedProvinceText,
//                 city: updatedCityText,
//                 barangay: updatedBarangayText,
//                 streetAddress: updatedStreetAddress || "N/A"
//             }
//         };

//         // Fetch the userId from volunteerGroups to use in isMobileNumberInUse and isEmailInUse
//         let userId;
//         try {
//             const snapshot = await database.ref(`volunteerGroups/${orgId}`).once('value');
//             const orgData = snapshot.val();
//             if (!orgData || !orgData.userId) {
//                 Swal.fire({
//                     icon: 'error',
//                     title: 'Error',
//                     text: 'Unable to find user ID for this organization.',
//                     showConfirmButton: true,
//                     confirmButtonText: 'OK',
//                     customClass: {
//                         popup: 'swal2-popup-error-clean',
//                         title: 'swal2-title-error-clean',
//                         htmlContainer: 'swal2-text-error-clean',
//                         confirmButton: 'my-error-button'
//                     }
//                 });
//                 return;
//             }
//             userId = orgData.userId;
//         } catch (error) {
//             Swal.fire({
//                 icon: 'error',
//                 title: 'Error',
//                 text: `Failed to fetch organization data: ${error.message}`,
//                 showConfirmButton: true,
//                 confirmButtonText: 'OK',
//                 customClass: {
//                     popup: 'swal2-popup-success-clean',
//                     title: 'swal2-title-success-clean',
//                     htmlContainer: 'swal2-text-success-clean',
//                     confirmButton: 'my-success-button'
//                 }
//             });
//             return;
//         }

//         // Check for unchanged data first
//         const unchanged = await isDataUnchanged(orgId, updatedData);
//         if (unchanged) {
//             Swal.fire({
//                 icon: 'info',
//                 title: 'No Changes Detected',
//                 text: 'No changes were made to the volunteer group details.',
//                 showConfirmButton: true,
//                 confirmButtonText: 'OK',
//                 customClass: {
//                     popup: 'swal2-popup-success-clean',
//                     title: 'swal2-title-success-clean',
//                     htmlContainer: 'swal2-text-success-clean',
//                     confirmButton: 'my-success-button'
//                 }
//             });
//             editOrgModal.style.display = 'none';
//             return;
//         }

//         // Check if mobile number is in use (using userId instead of orgId)
//         const mobileInUse = await isMobileNumberInUse(updatedMobileNumber, userId);
//         if (mobileInUse) {
//             Swal.fire({
//                 icon: 'error',
//                 title: 'Mobile Number In Use',
//                 text: 'The mobile number is already in use by another account.',
//                 showConfirmButton: true,
//                 confirmButtonText: 'OK',
//                 customClass: {
//                     popup: 'swal2-popup-success-clean',
//                     title: 'swal2-title-success-clean',
//                     htmlContainer: 'swal2-text-success-clean',
//                     confirmButton: 'my-success-button'
//                 }
//             });
//             return;
//         }

//         // Check if email is in use (using userId instead of orgId)
//         const emailInUse = await isEmailInUse(updatedEmail, userId);
//         if (emailInUse) {
//             Swal.fire({
//                 icon: 'error',
//                 title: 'Email In Use',
//                 text: 'The email address is already in use by another account.',
//                 showConfirmButton: true,
//                 confirmButtonText: 'OK',
//                 customClass: {
//                     popup: 'swal2-popup-success-clean',
//                     title: 'swal2-title-success-clean',
//                     htmlContainer: 'swal2-text-success-clean',
//                     confirmButton: 'my-success-button'
//                 }
//             });
//             return;
//         }

//         const passwordVerified = await verifySuperAdminPassword();
//         if (!passwordVerified) {
//             return;
//         }

//         try {
//             await database.ref(`volunteerGroups/${orgId}`).update(updatedData);
//             Swal.fire({
//                 icon: 'success',
//                 title: 'Success',
//                 text: 'The volunteer group has been updated.',
//                 showConfirmButton: true,
//                 confirmButtonText: 'OK',
//                 customClass: {
//                     popup: 'swal2-popup-success-clean',
//                     title: 'swal2-title-success-clean',
//                     htmlContainer: 'swal2-text-success-clean',
//                     confirmButton: 'my-success-button'
//                 }
//             });
//             editOrgModal.style.display = 'none';
//             editOrgForm.reset();
//             fetchAndRenderTable();
//         } catch (error) {
//             Swal.fire({
//                 icon: 'error',
//                 title: 'Error',
//                 text: `Failed to update volunteer group: ${error.message}`,
//                 showConfirmButton: true,
//                 confirmButtonText: 'OK',
//                 customClass: {
//                     popup: 'swal2-popup-success-clean',
//                     title: 'swal2-title-success-clean',
//                     htmlContainer: 'swal2-text-success-clean',
//                     confirmButton: 'my-success-button'
//                 }
//             });
//         }
//     });
// }
if (editOrgForm) {
    editOrgForm.addEventListener('submit', async e => {
        e.preventDefault();

        if (adminPosition !== 'Super Admin') {
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
        const updatedContactPerson = document.getElementById('editContactPerson').value.trim();
        const updatedEmail = document.getElementById('editEmail').value.trim();
        const updatedMobileNumber = document.getElementById('editMobileNumber').value.trim();
        const updatedSocialMedia = document.getElementById('editSocialMedia').value.trim();
        const updatedStreetAddress = document.getElementById('editStreetAddress').value.trim();
        const updatedOrganizationalBackgroundMission = document.getElementById('editOrganizationalBackgroundMission').value.trim();
        const updatedAreasOfExpertiseFocus = document.getElementById('editAreasOfExpertiseFocus').value.trim();
        const updatedLegalStatusRegistration = document.getElementById('editLegalStatusRegistration').value.trim();
        const updatedRequiredDocumentsLink = document.getElementById('editRequiredDocumentsLink').value.trim();

        const updatedRegionText = editRegionSelect.options[editRegionSelect.selectedIndex]?.textContent || '';
        const updatedProvinceText = editProvinceSelect.options[editProvinceSelect.selectedIndex]?.textContent || '';
        const updatedCityText = editCitySelect.options[editCitySelect.selectedIndex]?.textContent || '';
        const updatedBarangayText = editBarangaySelect.options[editBarangaySelect.selectedIndex]?.textContent || '';

        // Validation Checks
        if (!updatedOrganization || !updatedContactPerson || !updatedEmail || !updatedMobileNumber ||
            !updatedRegionText || !updatedProvinceText || !updatedCityText || !updatedBarangayText) {
            Swal.fire({
                icon: 'error',
                title: 'Missing Fields',
                text: 'Please fill in all required fields (Organization, Contact Person, Email, Mobile Number, and Full Address).',
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

        // Fetch the userId and existing data from volunteerGroups
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

        // Check for unchanged data
        const updatedDataForComparison = {
            organization: updatedOrganization,
            contactPerson: updatedContactPerson,
            email: updatedEmail,
            mobileNumber: updatedMobileNumber,
            socialMedia: updatedSocialMedia || "N/A",
            address: {
                region: updatedRegionText,
                province: updatedProvinceText,
                city: updatedCityText,
                barangay: updatedBarangayText,
                streetAddress: updatedStreetAddress || "N/A"
            }
        };

        const unchanged = await isDataUnchanged(orgId, updatedDataForComparison);
        if (unchanged && 
            existingData.organizationalBackgroundMission === (updatedOrganizationalBackgroundMission || "N/A") &&
            existingData.areasOfExpertiseFocus === (updatedAreasOfExpertiseFocus || "N/A") &&
            existingData.legalStatusRegistration === (updatedLegalStatusRegistration || "N/A") &&
            existingData.requiredDocumentsLink === (updatedRequiredDocumentsLink || "N/A")) {
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

        // Check if mobile number is in use
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

        // Check if email is in use
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

        const passwordVerified = await verifySuperAdminPassword();
        if (!passwordVerified) {
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
                    region: updatedRegionText,
                    province: updatedProvinceText,
                    city: updatedCityText,
                    barangay: updatedBarangayText,
                    streetAddress: updatedStreetAddress || "N/A"
                },
                organizationalBackgroundMission: updatedOrganizationalBackgroundMission || "N/A",
                areasOfExpertiseFocus: updatedAreasOfExpertiseFocus || "N/A",
                legalStatusRegistration: updatedLegalStatusRegistration || "N/A",
                requiredDocumentsLink: updatedRequiredDocumentsLink || "N/A",
                lastUpdatedBy: auth.currentUser.uid,
                lastUpdatedAt: new Date().toISOString(),
                timestamp: existingData.timestamp, // Preserve original
                userId: existingData.userId // Preserve original
            };

            await database.ref(`volunteerGroups/${orgId}`).update(updatedData);
            Swal.fire({
                icon: 'success',
                title: 'Updated!',
                text: 'The volunteer group has been updated.',
                timer: 1600,
                showConfirmButton: false,
                timerProgressBar: true,
                allowOutsideClick: false,
                customClass: {
                    popup: 'swal2-popup-success-clean',
                    title: 'swal2-title-success-clean',
                    htmlContainer: 'swal2-text-success-clean'
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

// Function to attach handlers to dynamically created table rows
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
            if (adminPosition !== 'Super Admin') {
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

            const rowId = button.getAttribute('data-id');
            const orgName = button.closest('tr').children[1].textContent;

            // Verify Super Admin password before proceeding
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
                            const snapshot = await database.ref(`volunteerGroups/${rowId}`).once('value');
                            const groupData = snapshot.val();
                            if (!groupData) {
                                Swal.fire({
                                    icon: 'error',
                                    title: 'Error',
                                    text: 'Volunteer group data not found for archiving.',
                                    showConfirmButton: true,
                                    confirmButtonText: 'OK',
                                    customClass: {
                                        popup: 'swal2-popup-success-clean',
                                        title: 'swal2-title-success-clean',
                                        htmlContainer: 'swal2-text-success-clean',
                                        confirmButton: 'my-success-button'
                                    }
                                });
                                return;
                            }

                            groupData.deletedAt = new Date().toISOString();
                            await database.ref(`deletedVolunteerGroups/${rowId}`).set(groupData);
                            await database.ref(`volunteerGroups/${rowId}`).remove();

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
        button.addEventListener('click', () => {
            if (adminPosition !== 'Super Admin') {
                Swal.fire({
                    title: 'Access Denied',
                    text: 'Only Super Admins can restore archived groups.',
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

            const rowId = button.getAttribute('data-id');
            const orgToRestore = archivedData.find(item => item.id === rowId);
            const orgName = orgToRestore ? orgToRestore.organization : 'N/A';

            Swal.fire({
                title: `Restore "${orgName}"?`,
                text: 'This will move the volunteer group back to the active list.',
                icon: 'question',
                showCancelButton: true,
                confirmButtonText: 'Restore',
                cancelButtonText: 'Cancel',
                reverseButtons: true,
                focusCancel: true,
                allowOutsideClick: false,
                customClass: {
                    popup: 'custom-swal-popup',
                    title: 'custom-swal-title',
                    confirmButton: 'custom-confirm-btn',
                    cancelButton: 'custom-cancel-btn'
                }
            }).then(async (result) => {
                if (result.isConfirmed) {
                    if (!orgToRestore) {
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

                    try {
                        const { deletedAt, ...restoredData } = orgToRestore;

                        await database.ref(`volunteerGroups/${rowId}`).set(restoredData);
                        await database.ref(`deletedVolunteerGroups/${rowId}`).remove();

                        Swal.fire({
                            icon: 'success',
                            title: 'Retrieved!',
                            text: `Volunteer group "${orgName}" has been restored to the active list.`,
                            timer: 1600,
                            showConfirmButton: false,
                            timerProgressBar: true,
                            allowOutsideClick: false,
                            customClass: {
                                popup: 'swal2-popup-success-clean',
                                title: 'swal2-title-success-clean',
                                htmlContainer: 'swal2-text-success-clean'
                            }
                        });

                        fetchAndRenderTable();
                        fetchAndRenderArchivedTable();
                    } catch (error) {
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
    entriesInfo.textContent = `Showing ${totalItems ? startIndex + 1 : 0} to ${endIndex} of ${totalItems} entries`;
}

function updateArchivedEntriesInfo(totalItems) {
    const startIndex = (archivedCurrentPage - 1) * archivedRowsPerPage;
    const endIndex = Math.min(startIndex + archivedRowsPerPage, totalItems);
    archivedEntriesInfo.textContent = `Showing ${totalItems ? startIndex + 1 : 0} to ${endIndex} of ${totalItems} entries`;
}

function renderPagination(totalRows) {
    if (!paginationContainer) return;
    paginationContainer.innerHTML = "";
    const totalPages = Math.ceil(totalRows / rowsPerPage);
    if (totalPages === 0) {
        return;
    }
    const createButton = (label, page, disabled = false, active = false) => {
        const btn = document.createElement("button");
        btn.textContent = label;
        if (disabled) btn.disabled = true;
        if (active) btn.classList.add("active-page");
        btn.addEventListener("click", () => {
            currentPage = page;
            renderTable(filteredData);
        });
        return btn;
    };
    paginationContainer.appendChild(createButton("Prev", currentPage - 1, currentPage === 1));

    const maxVisiblePages = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

    if (endPage - startPage < maxVisiblePages - 1) {
        startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
        paginationContainer.appendChild(createButton(i, i, false, i === currentPage));
    }
    paginationContainer.appendChild(createButton("Next", currentPage + 1, currentPage === totalPages));
}

function renderArchivedPagination(totalRows) {
    if (!archivedPaginationContainer) return;
    archivedPaginationContainer.innerHTML = "";
    const totalPages = Math.ceil(totalRows / archivedRowsPerPage);
    if (totalPages === 0) {
        return;
    }
    const createButton = (label, page, disabled = false, active = false) => {
        const btn = document.createElement("button");
        btn.textContent = label;
        if (disabled) btn.disabled = true;
        if (active) btn.classList.add("active-page");
        btn.addEventListener("click", () => {
            archivedCurrentPage = page;
            renderArchivedTable(filteredArchivedData);
        });
        return btn;
    };
    archivedPaginationContainer.appendChild(createButton("Prev", archivedCurrentPage - 1, archivedCurrentPage === 1));

    const maxVisiblePages = 5;
    let startPage = Math.max(1, archivedCurrentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

    if (endPage - startPage < maxVisiblePages - 1) {
        startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
        archivedPaginationContainer.appendChild(createButton(i, i, false, i === archivedCurrentPage));
    }
    archivedPaginationContainer.appendChild(createButton("Next", archivedCurrentPage + 1, archivedCurrentPage === totalPages));
}

function applySearchAndSort() {
    let currentData = [...data];

    const searchTerm = searchInput.value.toLowerCase().trim();
    if (searchTerm) {
        currentData = currentData.filter(item => {
            const organization = (item.organization || '').toLowerCase();
            const contactPerson = (item.contactPerson || '').toLowerCase();
            const email = (item.email || '').toLowerCase();
            const mobileNumber = (item.mobileNumber || '').toLowerCase();
            const region = (item.address?.region || '').toLowerCase();
            const province = (item.address?.province || '').toLowerCase();
            const city = (item.address?.city || '').toLowerCase();
            const barangay = (item.address?.barangay || '').toLowerCase();
            const streetAddress = (item.address?.streetAddress || '').toLowerCase();

            return organization.includes(searchTerm) ||
                contactPerson.includes(searchTerm) ||
                email.includes(searchTerm) ||
                mobileNumber.includes(searchTerm) ||
                region.includes(searchTerm) ||
                province.includes(searchTerm) ||
                city.includes(searchTerm) ||
                barangay.includes(searchTerm) ||
                streetAddress.includes(searchTerm);
        });
    }

    const sortValue = sortSelect.value;
    if (sortValue) {
        currentData.sort((a, b) => {
            let valA, valB;
            let order = 1;

            const parts = sortValue.split('-');
            const field = parts[0];
            if (parts.length > 1 && parts[1] === 'desc') {
                order = -1;
            }

            if (['organization', 'contactPerson', 'email', 'mobileNumber', 'socialMedia'].includes(field)) {
                valA = (a[field] || '').toString().toLowerCase();
                valB = (b[field] || '').toString().toLowerCase();
            } else if (['region', 'province', 'city', 'barangay', 'streetAddress'].includes(field)) {
                valA = (a.address?.[field] || '').toLowerCase();
                valB = (b.address?.[field] || '').toLowerCase();
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
    sortSelect.addEventListener("change", applySearchAndSort);
}

if (viewArchivedBtn) {
    viewArchivedBtn.addEventListener('click', () => {
        if (adminPosition !== 'Super Admin') {
            Swal.fire('Access Denied', 'You must be a Super Admin to view archived groups.', 'error');
            return;
        }
        if (archivedModal) {
            document.getElementById('addOrgModal').style.display = 'none';
            document.getElementById('confirmModal').style.display = 'none';
            document.getElementById('editOrgModal').style.display = 'none';
            
            archivedModal.style.display = 'flex';
            fetchAndRenderArchivedTable();
        }
    });
}

// close archived modal button
if (closeArchivedModalBtn) {
    closeArchivedModalBtn.addEventListener('click', () => {
        if (archivedModal) {
            archivedModal.style.display = 'none';
        }
    });
}

// Add event listener for closing the preview modal
document.getElementById('closeModal').addEventListener('click', hidePreviewModal);

// Add event listener for clicking outside the modal content to close it
window.addEventListener('click', (event) => {
    if (event.target === document.getElementById('previewModal')) {
        hidePreviewModal();
    }
});

const editDetailsBtn = document.getElementById('editDetailsBtn');
if (editDetailsBtn) {
    editDetailsBtn.addEventListener('click', () => {
        const confirmModal = document.getElementById('confirmModal');
        if (confirmModal) confirmModal.style.display = 'none';
        if (addOrgModal) addOrgModal.style.display = 'flex';
    });
}

// Initialize
document.addEventListener("DOMContentLoaded", () => {
});

// auth.onAuthStateChanged(user => {
//     if (!user) {
//         Swal.fire({
//             icon: "warning",
//             title: "Authentication Required",
//             text: "Please sign in as an admin to view volunteer groups.",
//             timer: 2000,
//             showConfirmButton: false
//         });
//         setTimeout(() => {
//             window.location.replace("../pages/login.html");
//         }, 2000);
//         return;
//     }

//     // Fetch user data from database to check adminPosition
//     database.ref('users/' + user.uid).once('value', snapshot => {
//         const userData = snapshot.val();
//         if (userData && userData.adminPosition === 'Super Admin') {
//             adminPosition = 'Super Admin';
//             if (viewArchivedBtn) {
//                 viewArchivedBtn.style.display = 'block'; // Show if super admin
//             }
//         } else {
//             adminPosition = userData?.adminPosition || null;
//             if (viewArchivedBtn) {
//                 viewArchivedBtn.style.display = 'none'; // Hide if not super admin
//             }
//         }

//         // Now that adminPosition is determined, fetch and render tables
//         fetchAndRenderTable();
//         fetchAndRenderArchivedTable();
//     }).catch(error => {
//         adminPosition = null; // Default to no position on error
//         if (viewArchivedBtn) {
//             viewArchivedBtn.style.display = 'none';
//         }
//         // Still attempt to fetch main table even if role check fails
//         fetchAndRenderTable();
//     });
// });

auth.onAuthStateChanged(async (user) => {
    if (!user) {
        Swal.fire({
            icon: "warning",
            title: "Authentication Required",
            text: "Please sign in as an admin to view volunteer groups.",
            timer: 2000,
            showConfirmButton: false
        });
        setTimeout(() => {
            window.location.replace("../pages/login.html");
        }, 2000);
        return;
    }

    try {
        const userSnapshot = await database.ref('users/' + user.uid).once('value');
        const userData = userSnapshot.val();
        adminPosition = userData?.adminPosition || null; // Set adminPosition here
        const passwordNeedsReset = userData?.password_needs_reset || false;

        if (passwordNeedsReset) {
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

        if (adminPosition !== 'Super Admin' && viewArchivedBtn) {
            viewArchivedBtn.style.display = 'none';
        } else if (viewArchivedBtn) {
            viewArchivedBtn.style.display = 'block';
        }

        fetchAndRenderTable();
        fetchAndRenderArchivedTable();
    } catch (error) {
        console.error(`[${new Date().toISOString()}] Error checking user data:`, error);
        adminPosition = null;
        if (viewArchivedBtn) {
            viewArchivedBtn.style.display = 'none';
        }
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
});
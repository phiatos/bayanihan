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
    console.log("Firebase initialized successfully:", firebase.app().name);
} catch (error) {
    console.error("Firebase initialization failed:", error);
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
    console.log("Secondary Firebase app initialized successfully");
} catch (error) {
    console.error("Secondary Firebase initialization failed:", error);
}
const secondaryAuth = firebase.auth(firebase.app("SecondaryApp"));

// Initialize EmailJS with updated public key
try {
    emailjs.init('ULA8rmn7VM-3fZ7ik');
    console.log("EmailJS initialized successfully");
} catch (error) {
    console.error("EmailJS initialization failed:", error);
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

let data = [];
let filteredData = [];
const rowsPerPage = 5;
let currentPage = 1;

let archivedData = []; // New: To store archived data
let filteredArchivedData = []; // New: To store filtered archived data
const archivedRowsPerPage = 5; // New: Rows per page for archived table
let archivedCurrentPage = 1; // New: Current page for archived table

let currentAddressCell = null;
let editingRowId = null;
let orgData = null;
let isProcessing = false;
let currentEditOrgKey = null;
let isSuperAdmin = false; // Flag to check super admin status

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

// --- Get Edit Modal Elements ---
const editOrgModal = document.getElementById('editOrgModal');
const closeEditModalBtn = document.getElementById('closeEditModalBtn');
const editOrgForm = document.getElementById('editOrgForm');
const editRegionSelect = document.getElementById('editRegion');
const editProvinceSelect = document.getElementById('editProvince');
const editCitySelect = document.getElementById('editCity');
const editBarangaySelect = document.getElementById('editBarangay');
const editOrgFirebaseKeyInput = document.getElementById('editOrgFirebaseKey');

const regionTextInput = document.getElementById('region-text'); // Corrected ID
const provinceTextInput = document.getElementById('province-text'); // Corrected ID
const cityTextInput = document.getElementById('city-text'); // Corrected ID
const barangayTextInput = document.getElementById('barangay-text'); // Corrected ID

// New: Archived Modal Elements
const archivedModal = document.getElementById('archivedModal');
const closeArchivedModalBtn = document.getElementById('closeArchivedModalBtn');
const archivedTableBody = document.querySelector('#archivedTable tbody');
const archivedEntriesInfo = document.getElementById('archivedEntriesInfo');
const archivedPaginationContainer = document.getElementById('archivedPagination');
const viewArchivedBtn = document.getElementById('viewArchived'); // Get the button reference

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

// Utility functions
function formatMobileNumber(mobile) {
    let cleaned = mobile.replace(/\D/g, "");

    if (cleaned.startsWith("63") && cleaned.length === 12) {
        cleaned = "0" + cleaned.slice(2);
    }
    if (/^09\d{9}$/.test(cleaned)) {
        return cleaned;
    }
    if (/^\d{9}$/.test(cleaned) && (mobile.startsWith('9') || mobile.startsWith('+639') || mobile.startsWith('09'))) {
        return '0' + cleaned;
    }
    return null;
}

// Basic email validation regex
function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// Function to clear add form inputs
function clearAInputs() {
    addOrgForm.reset();
    my_handlers.fill_regions(); // Re-populate regions to reset location dropdowns
}

// Fetch and render table data
function fetchAndRenderTable() {
    // This function now only fetches and renders the main table data.
    // The super admin check and initial fetching of archived data are handled
    // within the auth.onAuthStateChanged listener.
    database.ref("volunteerGroups").on("value", snapshot => { // Changed to .on() for real-time updates
        const fetchedData = snapshot.val();
        console.log("Fetched volunteerGroups:", fetchedData);
        if (!fetchedData) {
            console.warn("No data found in volunteerGroups node.");
            data = []; // Clear data if no entries
            filteredData = []; // Clear filtered data
            applySearchAndSort(); // Re-render with no data
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
            id: key, // Store the Firebase unique ID as 'id'
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
            }
        }));
        applySearchAndSort();
    });
}

// New: Fetch and render archived table data
function fetchAndRenderArchivedTable() {
    database.ref("deletedVolunteerGroups").on("value", snapshot => {
        const fetchedArchivedData = snapshot.val();
        console.log("Fetched deletedVolunteerGroups:", fetchedArchivedData);
        if (!fetchedArchivedData) {
            console.warn("No data found in deletedVolunteerGroups node.");
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
            deletedAt: entry.deletedAt || "N/A" // Capture deletion timestamp
        }));
        applyArchivedSearchAndSort();
    });
}


// Render table
function renderTable(dataToRender = filteredData) {
    console.log("Rendering table with data:", dataToRender);
    if (!tableBody) return;
    tableBody.innerHTML = "";
    const start = (currentPage - 1) * rowsPerPage;
    const end = start + rowsPerPage;
    const pageData = dataToRender.slice(start, end);

    if (pageData.length === 0 && searchInput.value.trim() !== "") {
        const noResultsRow = document.createElement("tr");
        noResultsRow.innerHTML = `<td colspan="12" class="text-center">No results found for your search.</td>`;
        tableBody.appendChild(noResultsRow);
    } else if (pageData.length === 0) {
        const noDataRow = document.createElement("tr");
        noDataRow.innerHTML = `<td colspan="12" class="text-center">No volunteer groups to display.</td>`;
        tableBody.appendChild(noDataRow);
    }


    pageData.forEach((row, index) => {
        const displayNo = start + index + 1; // Sequential number for display
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
                <button class="editBtn" data-id="${row.id}">Edit</button>
                <button class="deleteBtn" data-id="${row.id}">Archive</button>
            </td>
        `;
        tableBody.appendChild(tr);
    });

    updateEntriesInfo(dataToRender.length);
    renderPagination(dataToRender.length);
    attachRowHandlers(); // Re-attach handlers after rendering
}

// New: Render archived table
function renderArchivedTable(dataToRender = filteredArchivedData) {
    console.log("Rendering archived table with data:", dataToRender);
    if (!archivedTableBody) return;
    archivedTableBody.innerHTML = "";
    const start = (archivedCurrentPage - 1) * archivedRowsPerPage;
    const end = start + archivedRowsPerPage;
    const pageData = dataToRender.slice(start, end);

    if (pageData.length === 0) {
        const noResultsRow = document.createElement("tr");
        noResultsRow.innerHTML = `<td colspan="5" class="text-center">No archived volunteer groups to display.</td>`;
        archivedTableBody.appendChild(noResultsRow);
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
    attachArchivedRowHandlers(); // New: Attach handlers for archived table
}


var my_handlers = {
    fill_regions: function() {
        // Clear current selections in hidden text inputs when re-filling regions
        if (regionTextInput) regionTextInput.value = '';
        if (provinceTextInput) provinceTextInput.value = '';
        if (cityTextInput) cityTextInput.value = '';
        if (barangayTextInput) barangayTextInput.value = '';

        // Reset dropdowns to their default "Choose" states
        regionSelect.innerHTML = '<option value="" selected="true" disabled>Choose Region</option>';
        regionSelect.selectedIndex = 0;

        provinceSelect.innerHTML = '<option value="" selected="true" disabled>Choose Region First</option>';
        provinceSelect.selectedIndex = 0;

        citySelect.innerHTML = '<option value="" selected="true" disabled>Choose Region First</option>';
        citySelect.selectedIndex = 0;

        barangaySelect.innerHTML = '<option value="" selected="true" disabled>Choose Region First</option>';
        barangaySelect.selectedIndex = 0;

        const url = '../json/region.json';
        console.log(`Fetching regions from: ${url}`);

        fetch(url)
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP error! Status: ${response.status} - ${response.statusText}`);
                }
                return response.json();
            })
            .then(data => {
                console.log("Region data loaded (Vanilla JS):", data);
                // Validate data structure
                if (!Array.isArray(data) || !data.every(item => item.region_code && item.region_name)) {
                    throw new Error("Invalid region data structure");
                }

                // Sort regions alphabetically
                data.sort(function(a, b) {
                    return a.region_name.localeCompare(b.region_name);
                });

                // Populate the region dropdown
                data.forEach(entry => {
                    const opt = document.createElement('option');
                    opt.value = entry.region_code;
                    opt.textContent = entry.region_name;
                    regionSelect.appendChild(opt);
                });
            })
            .catch(error => {
                console.error("Request for region.json Failed (Vanilla JS): " + error.message);
                console.error("Fetch error object: ", error);
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

        // Warn if no region is selected
        if (!region_code) {
            Swal.fire({
                icon: 'warning',
                title: 'Select Region First',
                text: 'Please select a region before choosing a province.',
                confirmButtonText: 'OK'
            });
            // Reset dependent dropdowns and hidden inputs
            provinceSelect.innerHTML = '<option value="" selected="true" disabled>Choose Province</option>';
            provinceSelect.selectedIndex = 0;
            citySelect.innerHTML = '<option value="" selected="true" disabled>Choose Province First</option>';
            citySelect.selectedIndex = 0;
            barangaySelect.innerHTML = '<option value="" selected="true" disabled>Choose City First</option>'; // Corrected from 'Choose Barangay'
            barangaySelect.selectedIndex = 0;
            if (provinceTextInput) provinceTextInput.value = '';
            if (cityTextInput) cityTextInput.value = '';
            if (barangayTextInput) barangayTextInput.value = '';
            return;
        }

        // Update hidden text input for region
        var region_text = regionSelect.options[regionSelect.selectedIndex].textContent;
        if (regionTextInput) regionTextInput.value = region_text;

        // Clear dependent hidden text inputs
        if (provinceTextInput) provinceTextInput.value = '';
        if (cityTextInput) cityTextInput.value = '';
        if (barangayTextInput) barangayTextInput.value = '';

        // Reset dependent dropdowns
        provinceSelect.innerHTML = '<option value="" selected="true" disabled>Choose Province</option>';
        provinceSelect.selectedIndex = 0;

        citySelect.innerHTML = '<option value="" selected="true" disabled>Choose Province First</option>';
        citySelect.selectedIndex = 0;

        barangaySelect.innerHTML = '<option value="" selected="true" disabled>Choose Province First</option>';
        barangaySelect.selectedIndex = 0;

        const url = '../json/province.json';
        console.log(`Fetching provinces from: ${url}`);

        fetch(url)
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP error! Status: ${response.status} - ${response.statusText}`);
                }
                return response.json();
            })
            .then(data => {
                console.log("Province data loaded (Vanilla JS):", data);
                // Validate data structure
                if (!Array.isArray(data) || !data.every(item => item.region_code && item.province_code && item.province_name)) {
                    throw new Error("Invalid province data structure");
                }

                // Filter provinces by selected region code
                var result = data.filter(function(value) {
                    return value.region_code === region_code; // Use strict equality
                });

                // Sort provinces alphabetically
                result.sort(function(a, b) {
                    return a.province_name.localeCompare(b.province_name);
                });

                // Populate the province dropdown
                result.forEach(entry => {
                    const opt = document.createElement('option');
                    opt.value = entry.province_code;
                    opt.textContent = entry.province_name;
                    provinceSelect.appendChild(opt);
                });
            })
            .catch(error => {
                console.error("Request for province.json Failed (Vanilla JS): " + error.message);
                console.error("Fetch error object: ", error);
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

        // Warn if no province is selected
        if (!province_code) {
            Swal.fire({
                icon: 'warning',
                title: 'Select Province First',
                text: 'Please select a province before choosing a city/municipality.',
                confirmButtonText: 'OK'
            });
            // Reset dependent dropdowns and hidden inputs
            citySelect.innerHTML = '<option value="" selected="true" disabled>Choose City / Municipality</option>';
            citySelect.selectedIndex = 0;
            barangaySelect.innerHTML = '<option value="" selected="true" disabled>Choose City First</option>';
            barangaySelect.selectedIndex = 0;
            if (cityTextInput) cityTextInput.value = '';
            if (barangayTextInput) barangayTextInput.value = '';
            return;
        }

        // Update hidden text input for province
        var province_text = provinceSelect.options[provinceSelect.selectedIndex].textContent;
        if (provinceTextInput) provinceTextInput.value = province_text;

        // Clear dependent hidden text inputs
        if (cityTextInput) cityTextInput.value = '';
        if (barangayTextInput) barangayTextInput.value = '';

        // Reset dependent dropdowns
        citySelect.innerHTML = '<option value="" selected="true" disabled>Choose City / Municipality</option>';
        citySelect.selectedIndex = 0;

        barangaySelect.innerHTML = '<option value="" selected="true" disabled>Choose City First</option>';
        barangaySelect.selectedIndex = 0;

        const url = '../json/city.json';
        console.log(`Fetching cities from: ${url}`);

        fetch(url)
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP error! Status: ${response.status} - ${response.statusText}`);
                }
                return response.json();
            })
            .then(data => {
                console.log("City data loaded (Vanilla JS):", data);
                // Validate data structure
                if (!Array.isArray(data) || !data.every(item => item.province_code && item.city_code && item.city_name)) {
                    throw new Error("Invalid city data structure");
                }

                // Filter cities by selected province code
                var result = data.filter(function(value) {
                    return value.province_code === province_code; // Use strict equality
                });

                // Sort cities alphabetically
                result.sort(function(a, b) {
                    return a.city_name.localeCompare(b.city_name);
                });

                // Populate the city dropdown
                result.forEach(entry => {
                    const opt = document.createElement('option');
                    opt.value = entry.city_code;
                    opt.textContent = entry.city_name;
                    citySelect.appendChild(opt);
                });
            })
            .catch(error => {
                console.error("Request for city.json Failed (Vanilla JS): " + error.message);
                console.error("Fetch error object: ", error);
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

        // Warn if no city is selected
        if (!city_code) {
            Swal.fire({
                icon: 'warning',
                title: 'Select City/Municipality First',
                text: 'Please select a city/municipality before choosing a barangay.',
                confirmButtonText: 'OK'
            });
            // Reset dependent dropdown and hidden input
            barangaySelect.innerHTML = '<option value="" selected="true" disabled>Choose Barangay</option>';
            barangaySelect.selectedIndex = 0;
            if (barangayTextInput) barangayTextInput.value = '';
            return;
        }

        // Update hidden text input for city
        var city_text = citySelect.options[citySelect.selectedIndex].textContent;
        if (cityTextInput) cityTextInput.value = city_text;

        // Clear dependent hidden text input
        if (barangayTextInput) barangayTextInput.value = '';

        // Reset dependent dropdown
        barangaySelect.innerHTML = '<option value="" selected="true" disabled>Choose Barangay</option>';
        barangaySelect.selectedIndex = 0;

        const url = '../json/barangay.json';
        console.log(`Fetching barangays from: ${url}`);

        fetch(url)
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP error! Status: ${response.status} - ${response.statusText}`);
                }
                return response.json();
            })
            .then(data => {
                console.log("Barangay data loaded (Vanilla JS):", data);
                // Validate data structure
                if (!Array.isArray(data) || !data.every(item => item.city_code && item.brgy_code && item.brgy_name)) {
                    throw new Error("Invalid barangay data structure");
                }

                // Filter barangays by selected city code
                var result = data.filter(function(value) {
                    return value.city_code === city_code; // Use strict equality
                });

                // Sort barangays alphabetically
                result.sort(function(a, b) {
                    return a.brgy_name.localeCompare(b.brgy_name);
                });

                // Populate the barangay dropdown
                result.forEach(entry => {
                    const opt = document.createElement('option');
                    opt.value = entry.brgy_code;
                    opt.textContent = entry.brgy_name;
                    barangaySelect.appendChild(opt);
                });
            })
            .catch(error => {
                console.error("Request for barangay.json Failed (Vanilla JS): " + error.message);
                console.error("Fetch error object: ", error);
                Swal.fire({
                    icon: 'error',
                    title: 'Failed to Load Barangays',
                    text: `Unable to load barangay data: ${error.message}. Check if ${url} is accessible.`,
                    confirmButtonText: 'OK'
                });
            });
    },
    onchange_barangay: function() {
        // Update hidden text input for barangay
        var barangay_text = barangaySelect.options[barangaySelect.selectedIndex].textContent;
        if (barangayTextInput) barangayTextInput.value = barangay_text;
    },
};

// Attach event listeners for the location dropdowns
if (regionSelect) regionSelect.addEventListener('change', my_handlers.fill_provinces);
if (provinceSelect) provinceSelect.addEventListener('change', my_handlers.fill_cities);
if (citySelect) citySelect.addEventListener('change', my_handlers.fill_barangays);
if (barangaySelect) barangaySelect.addEventListener('change', my_handlers.onchange_barangay);

// Call the initial fill for regions directly on page load
my_handlers.fill_regions();


// Event listeners for modals and buttons
if (addNew) {
    addNew.addEventListener('click', () => {
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

if (continueSuccessBtn) {
    continueSuccessBtn.addEventListener('click', () => {
        const successModal = document.getElementById('successModal');
        if (successModal) {
            successModal.style.display = 'none';
        }
    });
}

// In vgm.js, replace the existing window click listener
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
    if (event.target === document.getElementById('successModal')) {
        document.getElementById('successModal').style.display = 'none';
    }
});

// Event listener for the form submission to show confirmation modal
if (addOrgForm) {
    addOrgForm.addEventListener('submit', async e => {
        e.preventDefault();

        // Get form data for organization information
        const organization = document.getElementById('organization').value.trim();
        const contactPerson = document.getElementById('contactPerson').value.trim();
        const email = document.getElementById('email').value.trim();
        const mobileNumber = document.getElementById('mobileNumber').value.trim();
        const socialMedia = document.getElementById('socialMedia').value.trim();
        const streetAddress = document.getElementById('streetAddress')?.value.trim() || '';

        // Get selected text content from location dropdowns
        const selectedRegionText = regionSelect.options[regionSelect.selectedIndex]?.textContent || '';
        const selectedProvinceText = provinceSelect.options[provinceSelect.selectedIndex]?.textContent || '';
        const selectedCityText = citySelect.options[citySelect.selectedIndex]?.textContent || '';
        const selectedBarangayText = barangaySelect.options[barangaySelect.selectedIndex]?.textContent || '';

        // Validation functions (assuming these are defined elsewhere in your script)
        // const isValidEmail = email => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email); // Already defined globally
        const formattedMobile = formatMobileNumber(mobileNumber);

        // --- Validation Checks ---
        if (!organization || !contactPerson || !email || !mobileNumber ||
            !selectedRegionText || !selectedProvinceText || !selectedCityText || !selectedBarangayText) {
            Swal.fire('Error', 'Please fill in all required fields (Organization, Contact Person, Contact Information, and Full Address).', 'error');
            return;
        }

        if (!isValidEmail(email)) {
            Swal.fire({
                icon: 'error',
                title: 'Invalid Email',
                text: 'Please enter a valid email address.'
            });
            return;
        }

        if (!formattedMobile) {
            Swal.fire({
                icon: 'error',
                title: 'Invalid Mobile Number',
                text: 'Mobile number must be 11 digits starting with "09" (e.g., 09123456789).'
            });
            return;
        }

        if (!addOrgForm.checkValidity()) {
            addOrgForm.reportValidity();
            return;
        }

        // Create an object to store organization data
        orgData = {
            organization: organization,
            contactPerson: contactPerson,
            email: email,
            mobileNumber: formattedMobile,
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

        // orgData.hq = `${orgData.address.barangay}, ${orgData.address.city}, ${orgData.address.province}, ${orgData.address.region}`;

        // --- Display Confirmation Details ---
        const confirmDetails = document.getElementById('confirmDetails');
        if (confirmDetails) {
            // Construct the full address string for display
            const fullAddress = `${orgData.address.streetAddress !== 'N/A' ? orgData.address.streetAddress + ', ' : ''}${orgData.address.barangay}, ${orgData.address.city}, ${orgData.address.province}, ${orgData.address.region}`;

            confirmDetails.innerHTML = `
                <p><strong style="color: #4059A5;">Organization:</strong> ${orgData.organization}</p>
                <p><strong style="color: #4059A5;">Full Address:</strong> ${fullAddress}</p>
                <p><strong style="color: #4059A5;">Contact Person:</strong> ${orgData.contactPerson}</p>
                <p><strong style="color: #4059A5;">Email:</strong> ${orgData.email}</p>
                <p><strong style="color: #4059A5;">Mobile:</strong> ${orgData.mobileNumber}</p>
                <p><strong style="color: #4059A5;">Social Media:</strong> ${orgData.socialMedia}</p>
            `;
        }

        // Hide add organization modal and show confirmation modal
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
                text: 'We couldn’t find any data for the selected organization. Please check your selection or try again.',
                confirmButtonText: 'OK'
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
            // Verify admin is signed in
            const adminUser = auth.currentUser;
            if (!adminUser) {
                throw new Error("No admin signed in. Please sign in again.");
            }
            console.log("Current admin:", adminUser.uid);

            // Check if mobile number already exists
            const usersSnapshot = await database.ref('users').once('value');
            const users = usersSnapshot.val();

            console.log("All users in database:", users);
            if (users) {
                for (const userId in users) {
                    const userData = users[userId];
                    const storedMobile = formatMobileNumber(userData.mobile);
                    const incomingMobile = formatMobileNumber(orgData.mobileNumber);

                    console.log(`Comparing mobile: ${incomingMobile} with stored: ${userData.mobile} -> ${storedMobile}`);

                    // Compare only if both are valid mobile numbers
                    if (storedMobile && incomingMobile && storedMobile === incomingMobile) {
                        console.log(`Match found! Mobile number ${orgData.mobileNumber} already registered for user:`, userData);
                        throw new Error("Mobile number already registered.");
                    }
                }
            }

            // Create Firebase Authentication account with the actual email
            const tempPassword = generateTempPassword();
            let userCredential;
            try {
                userCredential = await secondaryAuth.createUserWithEmailAndPassword(orgData.email, tempPassword);
            } catch (error) {
                if (error.code === 'auth/email-already-in-use') {
                    throw new Error("Email already registered. Please use a different email.");
                }
                throw new Error("Error creating user in Firebase Authentication: " + error.message);
            }
            const newUser = userCredential.user;

            // Save user data to users/<uid>
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

            // Save volunteer group
            const snapshot = await database.ref('volunteerGroups').once('value');
            const groups = snapshot.val();
            const nextKey = groups ? Math.max(...Object.keys(groups).map(Number)) + 1 : 1;

            await database.ref(`volunteerGroups/${nextKey}`).set({
                ...newVolunteerGroup,
                userId: newUser.uid
            });

            // Send EmailJS confirmation with temporary password (Updated to exclude mobileNumber)
            await emailjs.send('service_g5f0erj', 'template_0yk865p', {
                email: orgData.email,
                organization: orgData.organization,
                tempPassword: tempPassword,
                message: `Your volunteer group "${orgData.organization}" has been successfully registered with Bayanihan. Please use the credentials below to log in. You will be prompted to verify your email and reset your password upon your first login.`,
                verification_message: `Please log in using the provided email and temporary password. You will be prompted to verify your email and reset your password upon your first login.`
            });

            Swal.fire({ //Updated
                icon: 'success',
                title: 'Volunteer Group Added!',
                text: 'Login credentials have been sent via email.',
                timer: 3000,
                timerProgressBar: true,
                showConfirmButton: false
            });


            orgData = null;
            const confirmModal = document.getElementById('confirmModal');
            const successModal = document.getElementById('successModal');
            if (confirmModal) confirmModal.style.display = 'none';
            if (successModal) successModal.style.display = 'flex';
            fetchAndRenderTable(); // Re-fetch and render main table
            fetchAndRenderArchivedTable(); // New: Re-fetch and render archived table

            // Sign out secondary app (important for security)
            await secondaryAuth.signOut();
        } catch (error) {
            console.error('Error adding volunteer group:', error);
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: `Failed to add group: ${error.message}`
            });
        } finally {
            isProcessing = false;
            confirmSaveBtn.disabled = false;
            console.log("Admin still signed in:", auth.currentUser?.uid);
        }
    });
}

// --- Edit Modal Handlers ---
if (closeEditModalBtn) {
    closeEditModalBtn.addEventListener('click', () => {
        editOrgModal.style.display = 'none';
        editOrgForm.reset();
        // Optionally, reset dropdowns for edit modal here if needed
    });
}

window.addEventListener('click', (event) => {
    if (event.target === editOrgModal) {
        editOrgModal.style.display = 'none';
        editOrgForm.reset();
    }
});

// Function to populate and open the edit modal
function openEditModal(orgId) {
    const orgToEdit = data.find(org => org.id === orgId);
    if (!orgToEdit) {
        console.error("Organization not found for editing:", orgId);
        Swal.fire('Error', 'Volunteer group not found.', 'error');
        return;
    }

    currentEditOrgKey = orgId;
    editOrgFirebaseKeyInput.value = orgId;

    // Populate form fields
    document.getElementById('editOrganization').value = orgToEdit.organization;
    document.getElementById('editContactPerson').value = orgToEdit.contactPerson;
    document.getElementById('editEmail').value = orgToEdit.email;
    document.getElementById('editMobileNumber').value = orgToEdit.mobileNumber;
    document.getElementById('editSocialMedia').value = orgToEdit.socialMedia === "N/A" ? "" : orgToEdit.socialMedia;
    document.getElementById('editStreetAddress').value = orgToEdit.address.streetAddress === "N/A" ? "" : orgToEdit.address.streetAddress;

    // Populate location dropdowns for edit modal
    populateEditLocationDropdowns(orgToEdit.address.region, orgToEdit.address.province, orgToEdit.address.city, orgToEdit.address.barangay);

    editOrgModal.style.display = 'flex';
}

// Function to populate edit modal location dropdowns
async function populateEditLocationDropdowns(selectedRegion, selectedProvince, selectedCity, selectedBarangay) {
    // Clear and reset dropdowns
    editRegionSelect.innerHTML = '<option value="" selected="true" disabled>Choose Region</option>';
    editProvinceSelect.innerHTML = '<option value="" selected="true" disabled>Choose Province</option>';
    editCitySelect.innerHTML = '<option value="" selected="true" disabled>Choose City / Municipality</option>';
    editBarangaySelect.innerHTML = '<option value="" selected="true" disabled>Choose Barangay</option>';

    try {
        // Fetch and fill regions
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
        // Set selected region
        const regionFound = regions.find(r => r.region_name === selectedRegion);
        if (regionFound) {
            editRegionSelect.value = regionFound.region_code;
        }

        // Fetch and fill provinces
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
        // Set selected province
        const provinceFound = filteredProvinces.find(p => p.province_name === selectedProvince);
        if (provinceFound) {
            editProvinceSelect.value = provinceFound.province_code;
        }

        // Fetch and fill cities
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
        // Set selected city
        const cityFound = filteredCities.find(c => c.city_name === selectedCity);
        if (cityFound) {
            editCitySelect.value = cityFound.city_code;
        }

        // Fetch and fill barangays
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
        // Set selected barangay
        const barangayFound = filteredBarangays.find(b => b.brgy_name === selectedBarangay);
        if (barangayFound) {
            editBarangaySelect.value = barangayFound.brgy_code;
        }

    } catch (error) {
        console.error("Error populating edit location dropdowns:", error);
        Swal.fire({
            icon: 'error',
            title: 'Failed to Load Location Data',
            text: `Unable to load location data for editing: ${error.message}.`
        });
    }
}

// Event listeners for edit modal location dropdowns
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
        console.error("Error fetching provinces for edit modal:", error);
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
        console.error("Error fetching cities for edit modal:", error);
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
        console.error("Error fetching barangays for edit modal:", error);
    }
});


// Event listener for the edit form submission
if (editOrgForm) {
    editOrgForm.addEventListener('submit', async e => {
        e.preventDefault();

        const orgId = editOrgFirebaseKeyInput.value;
        if (!orgId) {
            Swal.fire('Error', 'No organization ID found for editing.', 'error');
            return;
        }

        const updatedOrganization = document.getElementById('editOrganization').value.trim();
        const updatedContactPerson = document.getElementById('editContactPerson').value.trim();
        const updatedEmail = document.getElementById('editEmail').value.trim();
        const updatedMobileNumber = document.getElementById('editMobileNumber').value.trim();
        const updatedSocialMedia = document.getElementById('editSocialMedia').value.trim();
        const updatedStreetAddress = document.getElementById('editStreetAddress').value.trim();

        const updatedRegionText = editRegionSelect.options[editRegionSelect.selectedIndex]?.textContent || '';
        const updatedProvinceText = editProvinceSelect.options[editProvinceSelect.selectedIndex]?.textContent || '';
        const updatedCityText = editCitySelect.options[editCitySelect.selectedIndex]?.textContent || '';
        const updatedBarangayText = editBarangaySelect.options[editBarangaySelect.selectedIndex]?.textContent || '';

        // Validation Checks (similar to add form)
        if (!updatedOrganization || !updatedContactPerson || !updatedEmail || !updatedMobileNumber ||
            !updatedRegionText || !updatedProvinceText || !updatedCityText || !updatedBarangayText) {
            Swal.fire('Error', 'Please fill in all required fields (Organization, Contact Person, Contact Information, and Full Address).', 'error');
            return;
        }

        if (!isValidEmail(updatedEmail)) {
            Swal.fire({
                icon: 'error',
                title: 'Invalid Email',
                text: 'Please enter a valid email address.'
            });
            return;
        }

        const formattedUpdatedMobile = formatMobileNumber(updatedMobileNumber);
        if (!formattedUpdatedMobile) {
            Swal.fire({
                icon: 'error',
                title: 'Invalid Mobile Number',
                text: 'Mobile number must be 11 digits starting with "09" (e.g., 09123456789).'
            });
            return;
        }

        if (!editOrgForm.checkValidity()) {
            editOrgForm.reportValidity();
            return;
        }

        // --- Password Verification Step ---
        const { value: password } = await Swal.fire({
            title: 'Confirm Changes',
            text: 'To save these changes, please enter your password:',
            icon: 'question',
            input: 'password',
            inputPlaceholder: 'Enter your password',
            showCancelButton: true,
            confirmButtonText: 'Confirm',
            cancelButtonText: 'Cancel',
            reverseButtons: true,
            focusCancel: true,
            allowOutsideClick: false,
            confirmButtonColor: '#4CAF50',
            cancelButtonColor: '#f44336',
            padding: '1.25em',
            customClass: {
                confirmButton: 'swal2-confirm-large',
                cancelButton: 'swal2-cancel-large'
            },
            preConfirm: async (enteredPassword) => {
                if (!enteredPassword) {
                    Swal.showValidationMessage('Password is required to confirm changes.');
                    return false;
                }
                // Call the existing password verification function
                const isPasswordValid = await verifyUserPassword(enteredPassword);
                if (!isPasswordValid) {
                    // verifyUserPassword already shows validation message if incorrect
                    return false;
                }
                return true; // Password is valid
            }
        });

        // If the user cancelled or password verification failed, stop here.
        if (!password) {
            Swal.fire(
                'Cancelled',
                'Your changes were not saved.',
                'info'
            );
            return;
        }

        // If we reach here, password verification was successful.
        try {
            const updatedData = {
                organization: updatedOrganization,
                contactPerson: updatedContactPerson,
                email: updatedEmail,
                mobileNumber: formattedUpdatedMobile,
                socialMedia: updatedSocialMedia || "N/A",
                address: {
                    region: updatedRegionText,
                    province: updatedProvinceText,
                    city: updatedCityText,
                    barangay: updatedBarangayText,
                    streetAddress: updatedStreetAddress || "N/A"
                }
            };

            await database.ref(`volunteerGroups/${orgId}`).update(updatedData);
            console.log("Volunteer group updated successfully!");
            Swal.fire(
                'Updated!',
                'The volunteer group has been updated.',
                'success'
            );
            editOrgModal.style.display = 'none';
            editOrgForm.reset();
            fetchAndRenderTable();
        } catch (error) {
            console.error("Error updating volunteer group:", error);
            Swal.fire(
                'Error!',
                'Failed to update volunteer group. Please try again.',
                'error'
            );
        }
    });
}

// Function to attach handlers to dynamically created table rows
function attachRowHandlers() {
    document.querySelectorAll('.editBtn').forEach(button => {
        button.onclick = (e) => {
            const orgId = e.target.dataset.id;
            openEditModal(orgId);
        };
    });

    document.querySelectorAll('.deleteBtn').forEach(button => {
        button.addEventListener('click', () => {
            const rowId = button.getAttribute('data-id');
            const orgName = button.closest('tr').children[1].textContent;

            Swal.fire({
                icon: 'warning',
                title: `Are you sure you want to archive "${orgName}"?`, // Changed text to "archive"
                text: 'This will remove the volunteer group from the active list but keep a record in the database for future access. To proceed, please enter your password:',
                input: 'password', // Add this for password input
                inputPlaceholder: 'Enter your password',
                showCancelButton: true,
                confirmButtonText: 'Yes, archive it!', // Changed text to "archive"
                cancelButtonText: 'Cancel',
                reverseButtons: true, // Puts confirm on the right
                focusCancel: true, // Focus on cancel button
                allowOutsideClick: false,
                confirmButtonColor: '#4CAF50',
                cancelButtonColor: '#f44336',
                padding: '1.25em',
                customClass: {
                    confirmButton: 'swal2-confirm-large',
                    cancelButton: 'swal2-cancel-large'
                },
                preConfirm: (password) => {
                    if (!password) {
                        Swal.showValidationMessage('Password is required to confirm archiving.'); // Changed text
                        return false; // Prevent closing the modal
                    }
                    return verifyUserPassword(password);
                },
                allowOutsideClick: () => !Swal.isLoading()
            }).then((result) => {
                if (result.isConfirmed) {
                    if (result.value) { // Proceed only if password verification was successful
                        // Fetch the volunteer group data
                        database.ref(`volunteerGroups/${rowId}`).once('value')
                            .then(snapshot => {
                                const groupData = snapshot.val();
                                if (!groupData) throw new Error("Volunteer group not found.");

                                // Move to deletedVolunteerGroups node with a timestamp
                                return database.ref(`deletedVolunteerGroups/${rowId}`).set({
                                    ...groupData,
                                    deletedAt: new Date().toISOString(), // Add deletion timestamp
                                });
                            })
                            .then(() => {
                                // Remove from the active volunteerGroups node
                                return database.ref(`volunteerGroups/${rowId}`).remove();
                            })
                            .then(() => {
                                Swal.fire({
                                    icon: 'success',
                                    title: 'Archived!', // Changed title
                                    text: `Volunteer group "${orgName}" has been moved to the archived list.`, // Changed text
                                    timer: 2000,
                                    showConfirmButton: false
                                });
                                fetchAndRenderTable(); // Re-render main table
                                fetchAndRenderArchivedTable(); // Re-render archived table
                            })
                            .catch(error => {
                                console.error("Volunteer group archiving error:", error); // Changed error log
                                Swal.fire({
                                    icon: 'error',
                                    title: 'Archiving Error', // Changed title
                                    text: `Failed to archive volunteer group: ${error.message}. Please try again.`, // Changed text
                                    footer: 'If the issue persists, contact support.'
                                });
                            });
                    } else {
                        // Password verification failed or was cancelled within preConfirm
                        Swal.fire({
                            icon: 'error',
                            title: 'Authentication Failed',
                            text: 'The password you entered is incorrect. Archiving cancelled.', // Changed text
                            timer: 3000,
                            showConfirmButton: false
                        });
                    }
                } else if (result.dismiss === Swal.DismissReason.cancel || result.dismiss === Swal.DismissReason.backdrop) {
                    Swal.fire(
                        'Cancelled',
                        'The volunteer group was not archived.', // Changed text
                        'info'
                    );
                }
            });
        });
    });
}

// New: Function to attach handlers to dynamically created archived table rows
function attachArchivedRowHandlers() {
    document.querySelectorAll('.retrieveBtn').forEach(button => {
        button.addEventListener('click', () => {
            if (!isSuperAdmin) {
                Swal.fire('Access Denied', 'Only Super Admins can restore archived groups.', 'error');
                return;
            }

            const rowId = button.getAttribute('data-id');
            const orgToRestore = archivedData.find(item => item.id === rowId);
            const orgName = orgToRestore ? orgToRestore.organization : 'N/A';

            Swal.fire({
                icon: 'question',
                title: `Restore "${orgName}"?`,
                text: 'Are you sure you want to restore this volunteer group to the active list? To proceed, please enter your password:',
                input: 'password',
                inputPlaceholder: 'Enter your password',
                showCancelButton: true,
                confirmButtonText: 'Yes, restore it!',
                cancelButtonText: 'Cancel',
                reverseButtons: true,
                focusCancel: true,
                allowOutsideClick: false,
                confirmButtonColor: '#4CAF50',
                cancelButtonColor: '#f44336',
                padding: '1.25em',
                customClass: {
                    confirmButton: 'swal2-confirm-large',
                    cancelButton: 'swal2-cancel-large'
                },
                preConfirm: (password) => {
                    if (!password) {
                        Swal.showValidationMessage('Password is required to confirm restoration.');
                        return false;
                    }
                    return verifyUserPassword(password);
                },
                allowOutsideClick: () => !Swal.isLoading()
            }).then((result) => {
                if (result.isConfirmed) {
                    if (result.value) { // Password verified
                        if (!orgToRestore) {
                            Swal.fire('Error', 'Volunteer group data not found for restoration.', 'error');
                            return;
                        }
                        // Remove deletedAt and other temporary fields before restoring
                        const { deletedAt, ...restoredData } = orgToRestore;

                        // Move from deletedVolunteerGroups to volunteerGroups
                        database.ref(`volunteerGroups/${rowId}`).set(restoredData)
                            .then(() => {
                                return database.ref(`deletedVolunteerGroups/${rowId}`).remove(); // Remove from archived
                            })
                            .then(() => {
                                Swal.fire({
                                    icon: 'success',
                                    title: 'Restored!',
                                    text: `Volunteer group "${orgName}" has been restored to the active list.`,
                                    timer: 2000,
                                    showConfirmButton: false
                                });
                                fetchAndRenderTable(); // Re-render main table
                                fetchAndRenderArchivedTable(); // Re-render archived table
                            })
                            .catch(error => {
                                console.error("Volunteer group restoration error:", error);
                                Swal.fire({
                                    icon: 'error',
                                    title: 'Restoration Error',
                                    text: `Failed to restore volunteer group: ${error.message}. Please try again.`,
                                    footer: 'If the issue persists, contact support.'
                                });
                            });
                    } else {
                        Swal.fire({
                            icon: 'error',
                            title: 'Authentication Failed',
                            text: 'The password you entered is incorrect. Restoration cancelled.',
                            timer: 3000,
                            showConfirmButton: false
                        });
                    }
                } else if (result.dismiss === Swal.DismissReason.cancel || result.dismiss === Swal.DismissReason.backdrop) {
                    Swal.fire(
                        'Cancelled',
                        'The volunteer group was not restored.',
                        'info'
                    );
                }
            });
        });
    });
}


async function verifyUserPassword(password) {
    // Show loading state while verifying password
    Swal.showLoading();

    try {
        const user = auth.currentUser;
        if (!user) {
            throw new Error("No user is currently logged in.");
        }

        const credential = firebase.auth.EmailAuthProvider.credential(user.email, password);
        await user.reauthenticateWithCredential(credential);

        Swal.hideLoading();
        return true; // Password is correct
    } catch (error) {
        Swal.hideLoading();
        console.error("Password re-authentication failed:", error);
        // Provide specific error messages based on Firebase error codes if needed
        if (error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
            Swal.showValidationMessage('Incorrect password.');
        } else if (error.code === 'auth/user-not-found') {
            Swal.showValidationMessage('User not found. Please log in again.');
        } else {
            Swal.showValidationMessage(`Authentication error: ${error.message}`);
        }
        return false; // Password is incorrect or another error occurred
    }
}

function updateEntriesInfo(totalItems) {
    const startIndex = (currentPage - 1) * rowsPerPage;
    const endIndex = Math.min(startIndex + rowsPerPage, totalItems);
    entriesInfo.textContent = `Showing ${totalItems ? startIndex + 1 : 0} to ${endIndex} of ${totalItems} entries`;
}

// New: Update archived entries info
function updateArchivedEntriesInfo(totalItems) {
    const startIndex = (archivedCurrentPage - 1) * archivedRowsPerPage;
    const endIndex = Math.min(startIndex + archivedRowsPerPage, totalItems);
    archivedEntriesInfo.textContent = `Showing ${totalItems ? startIndex + 1 : 0} to ${endIndex} of ${totalItems} entries`;
}


// Pagination
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
            renderTable(filteredData); // Re-render with filtered data
        });
        return btn;
    };
    paginationContainer.appendChild(createButton("Prev", currentPage - 1, currentPage === 1));

    const maxVisiblePages = 5; // Number of page buttons to show (e.g., 1 2 3 4 5)
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

    // Adjust startPage if not enough pages after current to fill maxVisiblePages
    if (endPage - startPage < maxVisiblePages - 1) {
        startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
        paginationContainer.appendChild(createButton(i, i, false, i === currentPage));
    }
    paginationContainer.appendChild(createButton("Next", currentPage + 1, currentPage === totalPages));
}

// New: Render archived pagination
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
            renderArchivedTable(filteredArchivedData); // Re-render with filtered archived data
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


// --- Search and Sort Logic ---
function applySearchAndSort() {
    let currentData = [...data]; // Start with a fresh copy of all data

    // Apply search filter
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

    // Apply sort
    const sortValue = sortSelect.value;
    if (sortValue) {
        currentData.sort((a, b) => {
            let valA, valB;
            let order = 1; // Default ascending

            const parts = sortValue.split('-');
            const field = parts[0];
            if (parts.length > 1 && parts[1] === 'desc') {
                order = -1; // Descending
            }

            if (['organization', 'contactPerson', 'email', 'mobileNumber', 'socialMedia'].includes(field)) {
                valA = (a[field] || '').toString().toLowerCase();
                valB = (b[field] || '').toString().toLowerCase();
            } else if (['region', 'province', 'city', 'barangay', 'streetAddress'].includes(field)) {
                valA = (a.address?.[field] || '').toLowerCase();
                valB = (b.address?.[field] || '').toLowerCase();
            } else {
                valA = (a.organization || '').toLowerCase(); // Default sort
                valB = (b.organization || '').toLowerCase();
            }

            return valA.localeCompare(valB) * order;
        });
    }

    filteredData = currentData; // Update the global filteredData
    currentPage = 1; // Reset to the first page after search/sort
    renderTable(filteredData);
}

// New: Search and Sort Logic for Archived Table
function applyArchivedSearchAndSort() {
    let currentArchivedData = [...archivedData];

    // No dedicated search/sort inputs for archived modal in HTML, so skipping for now.
    // If you add them, uncomment and adapt the following:
    /*
    const archivedSearchInput = document.getElementById('archivedSearchInput'); // Placeholder ID
    const archivedSortSelect = document.getElementById('archivedSortSelect'); // Placeholder ID

    const searchTerm = archivedSearchInput ? archivedSearchInput.value.toLowerCase().trim() : '';
    if (searchTerm) {
        currentArchivedData = currentArchivedData.filter(item => {
            const organization = (item.organization || '').toLowerCase();
            const email = (item.email || '').toLowerCase();
            const region = (item.address?.region || '').toLowerCase();
            const province = (item.address?.province || '').toLowerCase();
            const city = (item.address?.city || '').toLowerCase();
            const barangay = (item.address?.barangay || '').toLowerCase();
            const streetAddress = (item.address?.streetAddress || '').toLowerCase();

            return organization.includes(searchTerm) ||
                   email.includes(searchTerm) ||
                   region.includes(searchTerm) ||
                   province.includes(searchTerm) ||
                   city.includes(searchTerm) ||
                   barangay.includes(searchTerm) ||
                   streetAddress.includes(searchTerm);
        });
    }

    const sortValue = archivedSortSelect ? archivedSortSelect.value : '';
    if (sortValue) {
        currentArchivedData.sort((a, b) => {
            let valA, valB;
            let order = 1;

            const parts = sortValue.split('-');
            const field = parts[0];
            if (parts.length > 1 && parts[1] === 'desc') {
                order = -1;
            }

            if (['organization', 'email'].includes(field)) {
                valA = (a[field] || '').toString().toLowerCase();
                valB = (b[field] || '').toString().toLowerCase();
            } else if (['region', 'province', 'city', 'barangay', 'streetAddress'].includes(field)) {
                valA = (a.address?.[field] || '').toLowerCase();
                valB = (b.address?.[field] || '').toLowerCase();
            } else if (field === 'deletedAt') {
                valA = new Date(a.deletedAt || 0).getTime();
                valB = new Date(b.deletedAt || 0).getTime();
                return (valA - valB) * order;
            } else {
                valA = (a.organization || '').toLowerCase();
                valB = (b.organization || '').toLowerCase();
            }
            return valA.localeCompare(valB) * order;
        });
    }
    */

    filteredArchivedData = currentArchivedData;
    archivedCurrentPage = 1;
    renderArchivedTable(filteredArchivedData);
}


function clearDInputs() {
    if (!searchInput || !clearBtn) return;
    searchInput.value = '';
    clearBtn.style.display = 'none';
    applySearchAndSort(); // Re-apply search/sort to clear filter
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
            // Show/hide clear button based on search input
            clearBtn.style.display = searchInput.value.trim() ? 'flex' : 'none';
        }, 300); // Debounce for 300ms
    });
}

if (sortSelect) {
    sortSelect.addEventListener("change", applySearchAndSort);
}

if (viewArchivedBtn) {
    viewArchivedBtn.addEventListener('click', () => {
        console.log("View Archived button clicked!");
        if (!isSuperAdmin) {
            Swal.fire('Access Denied', 'You must be a Super Admin to view archived groups.', 'error');
            return;
        }
        console.log("archivedModal element before display attempt:", archivedModal, archivedModal.style.display);
        if (archivedModal) {
            // Hide other modals to prevent overlap
            document.getElementById('addOrgModal').style.display = 'none';
            document.getElementById('confirmModal').style.display = 'none';
            document.getElementById('successModal').style.display = 'none';
            document.getElementById('editOrgModal').style.display = 'none';
            
            console.log("archivedModal element found. Setting display to flex.");
            archivedModal.style.display = 'flex';
            console.log("archivedModal display after setting:", archivedModal.style.display);
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

const closeSuccessBtn = document.getElementById('closeSuccessBtn');
if (closeSuccessBtn) {
    closeSuccessBtn.addEventListener('click', () => {
        clearAInputs(); // Assuming clearAInputs() is defined elsewhere to clear the add form
        const successModal = document.getElementById('successModal');
        if (successModal) successModal.style.display = 'none';
    });
}

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
    console.log("DOM loaded, fetching data...");
    // Moved the initial fetchAndRenderTable and fetchAndRenderArchivedTable
    // calls inside the auth.onAuthStateChanged listener's .then() block
    // to ensure isSuperAdmin is set first.
});

// --- FIX APPLIED HERE: Moved data fetching and rendering inside the auth.onAuthStateChanged .then() block ---
auth.onAuthStateChanged(user => {
    console.log("User state:", user ? `Signed in as ${user.uid}` : "No user signed in");
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

    // Fetch user data from database to check isSuperAdmin flag
    database.ref('users/' + user.uid).once('value', snapshot => {
        const userData = snapshot.val();
        if (userData && userData.isSuperAdmin === true) {
            isSuperAdmin = true;
            if (viewArchivedBtn) {
                viewArchivedBtn.style.display = 'block'; // Show if super admin
            }
        } else {
            isSuperAdmin = false;
            if (viewArchivedBtn) {
                viewArchivedBtn.style.display = 'none'; // Hide if not super admin
            }
        }
        console.log("Is Super Admin:", isSuperAdmin);

        // Now that isSuperAdmin is determined, fetch and render tables
        fetchAndRenderTable();
        fetchAndRenderArchivedTable();

    }).catch(error => {
        console.error("Error fetching user role:", error);
        isSuperAdmin = false; // Default to not super admin on error
        if (viewArchivedBtn) {
            viewArchivedBtn.style.display = 'none';
        }
        // Still attempt to fetch main table even if role check fails
        fetchAndRenderTable();
    });
});

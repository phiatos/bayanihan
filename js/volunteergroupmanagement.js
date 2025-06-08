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
    emailjs.init('ULA8rmn7VM-3fZ7ik'); // Updated to your new public key
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

// Data arrays
let data = [];

// Table settings
const rowsPerPage = 5;
let currentPage = 1;
let currentAddressCell = null; 
let editingRowId = null;
let orgData = null;
let isProcessing = false;

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

const regionTextInput = document.getElementById('hq-region-text');
const provinceTextInput = document.getElementById('addOrgProvince-text');
const cityTextInput = document.getElementById('addOrgCity-text');
const barangayTextInput = document.getElementById('addOrgBarangay-text');

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

// Fetch and render table data
function fetchAndRenderTable() {
    console.log("Checking authentication state...");
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
        console.log("Fetching volunteerGroups...");
        // Listen for value changes to automatically update table
        database.ref("volunteerGroups").on("value", snapshot => { // Changed to .on() for real-time updates
            const fetchedData = snapshot.val();
            console.log("Fetched volunteerGroups:", fetchedData);
            if (!fetchedData) {
                console.warn("No data found in volunteerGroups node.");
                data = [];
                renderTable();
                Swal.fire({
                    icon: "info",
                    title: "No Data",
                    text: "No volunteer groups found in the database.",
                    toast: true, // Make it a small toast notification
                    position: 'top-end', // Position it at the top-right
                    showConfirmButton: false,
                    timer: 3000 // Disappear after 3 seconds
                });
                return;
            }
            // Use Object.entries to get key-value pairs, where key is the unique Firebase ID
            data = Object.entries(fetchedData).map(([key, entry]) => ({
                id: key, // Store the Firebase unique ID as 'id'
                organization: entry.organization || "N/A",
                hq: entry.hq || "N/A",
                contactPerson: entry.contactPerson || "N/A",
                email: entry.email || "N/A",
                mobileNumber: entry.mobileNumber || "N/A",
                socialMedia: entry.socialMedia || "N/A",
            }));
            console.log("Processed Data:", data);
            // Sorting will be handled by the sortSelect if chosen, or default alphabetical for organization
            if (sortSelect.value === 'organization') {
                data.sort((a, b) => a.organization.localeCompare(b.organization));
            } else if (sortSelect.value === 'hq') {
                data.sort((a, b) => a.hq.localeCompare(b.hq));
            } else {
                // Default sort (e.g., by creation time if available, or just Firebase key which is time-based)
                // For now, no specific default sort, just rely on Firebase's order or current filters
            }
            renderTable(filterAndSort()); // Ensure filters/sorts are applied
        });
    });
}

// Render table
function renderTable(filteredData = data) {
    console.log("Rendering table with data:", filteredData);
    if (!tableBody) return;
    tableBody.innerHTML = "";
    const start = (currentPage - 1) * rowsPerPage;
    const end = start + rowsPerPage;
    const pageData = filteredData.slice(start, end);

    console.log("Page data:", pageData);

    pageData.forEach((row, index) => {
        const displayNo = start + index + 1; // Sequential number for display
        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td>${displayNo}</td>
            <td>${row.organization}</td>
            <td class="hqCell">${row.hq}</td>
            <td>${row.contactPerson}</td>
            <td>${row.email}</td>
            <td>${row.mobileNumber}</td>
            <td>
            ${row.socialMedia && row.socialMedia !== 'N/A' ? `<a href="${row.socialMedia}" target="_blank" rel="noopener noreferrer">${row.socialMedia}</a>` : 'N/A'}
            </td>
            <td>
                <button class="editBtn" data-id="${row.id}">Edit</button> <button class="deleteBtn" data-id="${row.id}">Remove</button> </td>
        `;
        tableBody.appendChild(tr);
    });

    if (entriesInfo) {
        entriesInfo.textContent = `Showing ${start + 1} to ${Math.min(end, filteredData.length)} of ${filteredData.length} entries`;
    }
    renderPagination(filteredData.length);
    attachRowHandlers(); // Re-attach handlers after rendering
}

// Search functionality
function handleSearch() {
    if (!searchInput) return;
    const query = searchInput.value.trim().toLowerCase();
    if (clearBtn) clearBtn.style.display = query ? 'flex' : 'none';
    currentPage = 1;
    renderTable(filterAndSort());
}

function clearDInputs() {
    if (!searchInput || !clearBtn) return;
    searchInput.value = '';
    clearBtn.style.display = 'none';
    currentPage = 1;
    renderTable(filterAndSort());
}

if (clearBtn) {
    clearBtn.style.display = 'none';
    clearBtn.addEventListener('click', clearDInputs);
}

if (searchInput) {
    searchInput.addEventListener('input', handleSearch);
}

// Filter and sort
function filterAndSort() {
    let filtered = data.filter(row =>
        Object.values(row).some(val =>
            typeof val === 'string' || typeof val === 'number'
                ? val.toString().toLowerCase().includes(searchInput.value.trim().toLowerCase())
                : false
        )
    );
    if (sortSelect && sortSelect.value) {
        filtered.sort((a, b) => a[sortSelect.value].toString().localeCompare(b[sortSelect.value].toString()));
    }
    return filtered;
}

if (sortSelect) {
    sortSelect.addEventListener("change", () => {
        currentPage = 1;
        renderTable(filterAndSort());
    });
}

// Pagination
function renderPagination(totalRows) {
    if (!paginationContainer) return;
    paginationContainer.innerHTML = "";
    const totalPages = Math.ceil(totalRows / rowsPerPage);
    if (totalPages === 0) {
        paginationContainer.textContent = "No entries to display";
        return;
    }
    const createButton = (label, page, disabled = false, active = false) => {
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
    paginationContainer.appendChild(createButton("Prev", currentPage > 1 ? currentPage - 1 : null, currentPage === 1));
    for (let i = 1; i <= totalPages; i++) {
        paginationContainer.appendChild(createButton(i, i, false, i === currentPage));
    }
    paginationContainer.appendChild(createButton("Next", currentPage < totalPages ? currentPage + 1 : null, currentPage === totalPages));
}

// Edit and Delete functionality
function attachRowHandlers() {
    document.querySelectorAll('.editBtn').forEach(button => {
        button.addEventListener('click', () => {
            const row = button.closest('tr');
            const rowId = button.getAttribute('data-id');
            const cells = row.querySelectorAll('td');
            // Determine the number of editable cells based on the updated table structure
            const numEditableCells = 6; // Organization, HQ, Contact Person, Email, Mobile Number, Social Media

            const isEditable = cells[1].getAttribute('contenteditable') === 'true';

            if (!isEditable) {
                // Make cells editable
                for (let i = 1; i <= numEditableCells; i++) { // Start from index 1 (Organization)
                    cells[i].setAttribute('contenteditable', 'true');
                }
                button.textContent = 'Save';
                editingRowId = rowId;
            } else {
                // Save updated data
                const updatedData = {
                    organization: cells[1].textContent.trim() || "N/A",
                    hq: cells[2].textContent.trim() || "N/A",
                    contactPerson: cells[3].textContent.trim() || "N/A",
                    email: cells[4].textContent.trim() || "N/A",
                    mobileNumber: cells[5].textContent.trim() || "N/A",
                    socialMedia: cells[6].textContent.trim() || "N/A"
                };

                database.ref(`volunteerGroups/${rowId}`).update(updatedData)
                    .then(() => {
                        // Make cells non-editable
                        for (let i = 1; i <= numEditableCells; i++) {
                            cells[i].setAttribute('contenteditable', 'false');
                        }
                        button.textContent = 'Edit';
                        editingRowId = null;
                        fetchAndRenderTable();
                    })
                    .catch(error => {
                        console.error("Update error:", error);
                        Swal.fire({
                            icon: 'error',
                            title: 'Update Error',
                            text: error.message
                        });
                    });
            }
        });
    });

    // Delete button handler
    document.querySelectorAll('.deleteBtn').forEach(button => {
        button.addEventListener('click', () => {
            const rowId = button.getAttribute('data-id');
            Swal.fire({
                icon: 'warning',
                title: 'Are you sure?',
                text: 'This will remove the volunteer group from the list but keep it in the database for future access.',
                showCancelButton: true,
                confirmButtonText: 'Yes, delete it!',
                cancelButtonText: 'Cancel'
            }).then((result) => {
                if (result.isConfirmed) {
                    // Fetch the volunteer group data
                    database.ref(`volunteerGroups/${rowId}`).once('value')
                        .then(snapshot => {
                            const groupData = snapshot.val();
                            if (!groupData) throw new Error("Group not found.");

                            // Move to deletedVolunteerGroups node with a timestamp
                            return database.ref(`deletedVolunteerGroups/${rowId}`).set({
                                ...groupData,
                                deletedAt: new Date().toISOString()
                            });
                        })
                        .then(() => {
                            // Remove from volunteerGroups node
                            return database.ref(`volunteerGroups/${rowId}`).remove();
                        })
                        .then(() => {
                            Swal.fire({
                                icon: 'success',
                                title: 'Deleted',
                                text: 'Volunteer group has been moved to the deleted list.'
                            });
                            fetchAndRenderTable(); // Refresh the table to remove the row from the UI
                        })
                        .catch(error => {
                            console.error("Delete error:", error);
                            Swal.fire({
                                icon: 'error',
                                title: 'Delete Error',
                                text: error.message
                            });
                        });
                }
            });
        });
    });
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

    fetchAndRenderTable();

    // Modal for editing HQ [LAGAY HERE]

    // Event listeners for modals and buttons
    if (addNew) {
        addNew.addEventListener('click', () => {
            addOrgModal.style.display = 'block';
            document.getElementById('modalTitle').textContent = 'Register New ABVN';
            addOrgForm.reset(); 
            my_handlers.fill_regions();
        });
    }

    if (closeAddOrgModalBtn) {
        closeAddOrgModalBtn.addEventListener('click', () => {
            addOrgModal.style.display = 'none';
            addOrgForm.reset(); // Reset form when modal is closed
        });
    }

    // Continue button in success modal
    if (continueSuccessBtn) {
        continueSuccessBtn.addEventListener('click', () => {
            document.getElementById('successModal').style.display = 'none';
            fetchAndRenderTable(); // Refresh table after successful addition
        });
    }

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

            // Get selected text content from location dropdowns (assuming these elements are available globally or within scope)
            const selectedRegionText = regionSelect.options[regionSelect.selectedIndex]?.textContent || '';
            const selectedProvinceText = provinceSelect.options[provinceSelect.selectedIndex]?.textContent || '';
            const selectedCityText = citySelect.options[citySelect.selectedIndex]?.textContent || '';
            const selectedBarangayText = barangaySelect.options[barangaySelect.selectedIndex]?.textContent || '';

            // Validation functions (assuming these are defined elsewhere in your script)
            const isValidEmail = email => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
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
                addOrgForm.reportValidity(); // This will show browser's default validation messages
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
                    barangay: selectedBarangayText
                },
                timestamp: new Date().toISOString() 
            };

            // Combine address into hq for display (optional, can be done when displaying)
            orgData.hq = `${orgData.address.barangay}, ${orgData.address.city}, ${orgData.address.province}, ${orgData.address.region}`;

            // --- Display Confirmation Details ---
            const confirmDetails = document.getElementById('confirmDetails');
            if (confirmDetails) {
                confirmDetails.innerHTML = `
                    <p><strong style="color: #4059A5;">Organization:</strong> ${orgData.organization}</p>
                    <p><strong style="color: #4059A5;">HQ:</strong> ${orgData.hq}</p>
                    <p><strong style="color: #4059A5;">Contact Person:</strong> ${orgData.contactPerson}</p>
                    <p><strong style="color: #4059A5;">Email:</strong> ${orgData.email}</p>
                    <p><strong style="color: #4059A5;">Mobile:</strong> ${orgData.mobileNumber}</p>
                    <p><strong style="color: #4059A5;">Social Media:</strong> ${orgData.socialMedia}</p>
                `;
            }

            // Hide add organization modal and show confirmation modal
            if (addOrgModal) addOrgModal.style.display = 'none';
            const confirmModal = document.getElementById('confirmModal');
            if (confirmModal) confirmModal.style.display = 'block';

            // --- Database Submission (Placeholder, as it was not in your original snippet) ---
            // try {
            //     await database.ref("organizationApplications/pendingOrganization").push(orgData);
            //     console.log("Organization application saved to Realtime Database successfully!");
            //     // Swal.fire('Success', 'Your organization application has been submitted successfully!', 'success');
            //     addOrgForm.reset();
            //     my_handlers.fill_regions(); // Assuming this is needed to repopulate dropdowns
            // } catch (error) {
            //     console.error("Error adding organization application to Realtime Database: ", error);
            //     Swal.fire('Error', 'There was an error submitting your application. Please try again.', 'error');
            // }
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
                        title: 'Error',
                        text: 'No organization data found.'
                    });
                    isProcessing = false;
                    confirmSaveBtn.disabled = false;
                    return;
                }

                const newVolunteerGroup = {
                    organization: orgData.organization,
                    hq: orgData.hq, 
                    contactPerson: orgData.contactPerson,
                    email: orgData.email || "N/A",
                    mobileNumber: orgData.mobileNumber,
                    socialMedia: orgData.socialMedia,
                    address: {
                        region: orgData.address.region,
                        province: orgData.address.province,
                        city: orgData.address.city,
                        barangay: orgData.address.barangay
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
                        hq: orgData.hq,
                        contactPerson: orgData.contactPerson,
                        address: { 
                            region: orgData.address.region,
                            province: orgData.address.province,
                            city: orgData.address.city,
                            barangay: orgData.address.barangay
                        },
                        createdAt: new Date().toISOString(),
                        abvnKey: abvnKey,
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

                    Swal.fire({
                        icon: 'success',
                        title: 'Success',
                        text: 'Volunteer group added successfully! An email with login credentials has been sent to the user.'
                    });

                    orgData = null;
                    const confirmModal = document.getElementById('confirmModal');
                    const successModal = document.getElementById('successModal');
                    if (confirmModal) confirmModal.style.display = 'none';
                    if (successModal) successModal.style.display = 'block';
                    fetchAndRenderTable();

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



    const closeSuccessBtn = document.getElementById('closeSuccessBtn');
    if (closeSuccessBtn) {
        closeSuccessBtn.addEventListener('click', () => {
            clearAInputs();
            const successModal = document.getElementById('successModal');
            if (successModal) successModal.style.display = 'none';
        });
    }

    const editDetailsBtn = document.getElementById('editDetailsBtn');
    if (editDetailsBtn) {
        editDetailsBtn.addEventListener('click', () => {
            const confirmModal = document.getElementById('confirmModal');
            if (confirmModal) confirmModal.style.display = 'none';
            if (addOrgModal) addOrgModal.style.display = 'block';
        });
    }

    // Initialize
    document.addEventListener("DOMContentLoaded", () => {
    console.log("DOM loaded, fetching data...");
    fetchAndRenderTable();
});
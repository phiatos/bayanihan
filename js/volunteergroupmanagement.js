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

// SECURITY NOTE: In production, store firebaseConfig in environment variables (e.g., .env) or use Firebase App Check to prevent exposure.

// Initialize primary Firebase app
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
const provinces = [
    "Abra", "Agusan del Norte", "Agusan del Sur", "Aklan", "Albay", "Antique", "Apayao", "Aurora",
    "Basilan", "Bataan", "Batanes", "Batangas", "Benguet", "Biliran", "Bohol", "Bukidnon", "Bulacan",
    "Cagayan", "Camarines Norte", "Camarines Sur", "Camiguin", "Capiz", "Catanduanes", "Cavite",
    "Cebu", "Cotabato", "Davao del Norte", "Davao del Sur", "Davao Oriental", "Dinagat Islands",
    "Eastern Samar", "Guimaras", "Ifugao", "Ilocos Norte", "Ilocos Sur", "Iloilo", "Isabela", "Kalinga",
    "La Union", "Laguna", "Lanao del Norte", "Lanao del Sur", "Leyte", "Maguindanao", "Marinduque",
    "Masbate", "Mindoro Occidental", "Mindoro Oriental", "Misamis Occidental", "Misamis Oriental",
    "Mountain Province", "Negros Occidental", "Negros Oriental", "Northern Samar", "Nueva Ecija",
    "Nueva Vizcaya", "Palawan", "Pampanga", "Pangasinan", "Quezon", "Quirino", "Rizal", "Romblon",
    "Samar", "Sarangani", "Siquijor", "Sorsogon", "South Cotabato", "Southern Leyte", "Sultan Kudarat",
    "Sulu", "Surigao del Norte", "Surigao del Sur", "Tarlac", "Tawi-Tawi", "Zambales", "Zamboanga del Norte",
    "Zamboanga del Sur", "Zamboanga Sibugay"
];
const cities = {
    "Camarines Sur": ["Naga City", "Iriga City", "Goa", "Pili", "Tinambac", "Calabanga", "Sipocot", "Tigaon"]
};
const barangays = {
    "Naga City": ["Concepcion Pequena", "San Felipe", "Tinago", "Mabolo", "Abella", "Balatas", "Igualdad", "Sabang"]
};

// Table settings
const rowsPerPage = 5;
let currentPage = 1;
let currentAddressCell = null; // This might be repurposed or removed if only HQ is editable via modal
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

// Validate DOM elements
if (!tableBody) console.error("Table body (#orgTable tbody) not found.");
if (!entriesInfo) console.error("Entries info (#entriesInfo) not found.");
if (!paginationContainer) console.error("Pagination container (#pagination) not found.");
if (!addNew) console.error("Add new button (#addNew) not found.");
if (!addOrgModal) console.error("Add org modal (#addOrgModal) not found.");
if (!addOrgForm) console.error("Add org form (#addOrgForm) not found.");
if (!sortSelect) console.error("Sort select (#sortSelect) not found.");
if (!searchInput) console.error("Search input (#searchInput) not found.");
if (!clearBtn) console.error("Clear button (.clear-btn) not found.");

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
    let cleaned = mobile.replace(/\D/g, ""); // Remove all non-digits
    
    // If starts with '63' and is 12 digits long, prepend '0'
    if (cleaned.startsWith("63") && cleaned.length === 12) {
        cleaned = "0" + cleaned.slice(2);
    }
    
    // Validate if it's a typical Philippine mobile number format (e.g., 09xxxxxxxxx or 639xxxxxxxxx)
    // and is 10 or 11 digits long after formatting to '09'
    if (/^09\d{9}$/.test(cleaned)) { // Starts with 09 and has 9 more digits (total 11)
        return cleaned;
    }
    // Handle cases where input might be just the 9 digits after 09 (e.g., '123456789' for '09123456789')
    if (/^\d{9}$/.test(cleaned) && (mobile.startsWith('9') || mobile.startsWith('+639') || mobile.startsWith('09'))) {
        return '0' + cleaned;
    }
    
    return null; // Return null if invalid
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
        database.ref("volunteerGroups").once("value")
            .then(snapshot => {
                const fetchedData = snapshot.val();
                console.log("Fetched volunteerGroups:", fetchedData);
                if (!fetchedData) {
                    console.warn("No data found in volunteerGroups node.");
                    data = [];
                    renderTable();
                    Swal.fire({
                        icon: "info",
                        title: "No Data",
                        text: "No volunteer groups found in the database."
                    });
                    return;
                }
                data = Object.entries(fetchedData).map(([key, entry]) => ({
                    no: parseInt(key),
                    organization: entry.organization || "N/A",
                    hq: entry.hq || "N/A",
                    // areaOfOperation: entry.areaOfOperation || "N/A", // Removed
                    contactPerson: entry.contactPerson || "N/A",
                    email: entry.email || "N/A",
                    mobileNumber: entry.mobileNumber || "N/A",
                    socialMedia: entry.socialMedia || "N/A",
                    activation: entry.activation || "N/A",
                    calamityType: entry.calamityType || "N/A"
                }));
                console.log("Processed Data:", data);
                data.sort((a, b) => a.no - b.no);
                renderTable();
            })
            .catch(error => {
                console.error("Error fetching volunteerGroups:", error);
                let errorMessage = "Failed to fetch data. Check network or database.";
                if (error.code === "PERMISSION_DENIED") {
                    errorMessage = "Permission denied. Ensure database rules allow read access.";
                }
                Swal.fire({
                    icon: "error",
                    title: "Fetch Error",
                    text: errorMessage
                });
                data = [];
                renderTable();
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
    pageData.forEach(row => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td>${row.no}</td>
            <td>${row.organization}</td>
            <td class="hqCell">${row.hq}</td>
            
            <td>${row.contactPerson}</td>
            <td>${row.email}</td>
            <td>${row.mobileNumber}</td>
            <td>${row.socialMedia}</td>
            <td>
                <button class="editBtn" data-id="${row.no}">Edit</button>
                <button class="deleteBtn" data-id="${row.no}">Remove</button>
            </td>
        `;
        tableBody.appendChild(tr);
    });
    if (entriesInfo) {
        entriesInfo.textContent = `Showing ${start + 1} to ${Math.min(end, filteredData.length)} of ${filteredData.length} entries`;
    }
    renderPagination(filteredData.length);
    attachRowHandlers();
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

// Address modal (now specifically for HQ only, as location is removed)
function populateProvinces() {
    const list = document.getElementById('hqProvinceOptions'); // Only HQ province now
    if (list) {
        list.innerHTML = '';
        provinces.forEach(p => {
            const option = document.createElement('option');
            option.value = p;
            list.appendChild(option);
        });
    }
}

function populateCities(province, isLocation) { // isLocation parameter is now mostly illustrative, will always be false for HQ
    const list = document.getElementById('hqCityOptions'); // Only HQ city now
    if (!list) return;
    list.innerHTML = '';
    if (cities[province]) {
        cities[province].forEach(c => {
            const option = document.createElement('option');
            option.value = c;
            list.appendChild(option);
        });
    }
}

function populateBarangays(city, isLocation) { // isLocation parameter is now mostly illustrative, will always be false for HQ
    const list = document.getElementById('hqBarangayOptions'); // Only HQ barangay now
    if (!list) return;
    list.innerHTML = '';
    if (barangays[city]) {
        barangays[city].forEach(b => {
            const option = document.createElement('option');
            option.value = b;
            list.appendChild(option);
        });
    }
}

function openModal() {
    // This function might need adjustment if you want to open the modal for HQ editing specifically from the table.
    // As per the HTML, the modal is for "Edit HQ and Location", but HTML changes remove "Location".
    // So this modal now exclusively edits HQ.
    if (!currentAddressCell) return; // currentAddressCell should be set to the HQ cell if editing HQ
    const row = currentAddressCell.closest('tr');
    const hqCell = row.querySelector('.hqCell');
    
    if (hqCell) {
        const hqParts = hqCell.textContent.split(',').map(p => p.trim());
        document.getElementById('hqProvinceInput').value = hqParts[2] || ''; // Assuming format: Barangay, City, Province
        document.getElementById('hqCityInput').value = hqParts[1] || '';
        document.getElementById('hqBarangayInput').value = hqParts[0] || '';
    }
    
    populateProvinces();
    populateCities(document.getElementById('hqProvinceInput').value, false);
    populateBarangays(document.getElementById('hqCityInput').value, false);
    
    const addressModal = document.getElementById('addressModal');
    if (addressModal) addressModal.style.display = 'flex';
}

function closeModal() {
    const addressModal = document.getElementById('addressModal');
    if (addressModal) addressModal.style.display = 'none';
    currentAddressCell = null;
    clearInputs();
}

function applyChanges() {
    const hqProvince = document.getElementById('hqProvinceInput').value.trim();
    const hqCity = document.getElementById('hqCityInput').value.trim();
    const hqBarangay = document.getElementById('hqBarangayInput').value.trim();
    
    // Construct HQ address from available parts
    let hqAddressParts = [];
    if (hqBarangay) hqAddressParts.push(hqBarangay);
    if (hqCity) hqAddressParts.push(hqCity);
    if (hqProvince) hqAddressParts.push(hqProvince);
    const hqAddress = hqAddressParts.join(', ');

    if (currentAddressCell) {
        const row = currentAddressCell.closest('tr');
        const hqCell = row.querySelector('.hqCell');
        if (hqCell && hqAddress) {
            hqCell.textContent = hqAddress;
            // Optionally, save to database immediately if this modal is for direct editing
            // You would need to retrieve the rowId here, similar to attachRowHandlers
            // database.ref(`volunteerGroups/${rowId}`).update({ hq: hqAddress });
            Swal.fire({
                icon: 'success',
                title: 'HQ Updated',
                text: 'HQ address has been updated in the UI. Save the entire row to persist changes.'
            });
        }
    }
    closeModal();
}

function clearInputs() {
    // Only clear HQ related inputs
    ['hqProvinceInput', 'hqCityInput', 'hqBarangayInput'].forEach(id => {
        const input = document.getElementById(id);
        if (input) input.value = '';
    });
}

// Event listeners for HQ address inputs
const hqProvinceInput = document.getElementById('hqProvinceInput');
if (hqProvinceInput) {
    hqProvinceInput.addEventListener('input', e => populateCities(e.target.value, false));
}
const hqCityInput = document.getElementById('hqCityInput');
if (hqCityInput) {
    hqCityInput.addEventListener('input', e => populateBarangays(e.target.value, false));
}


// Add new organization
if (addNew) {
    addNew.addEventListener('click', () => {
        if (addOrgModal) addOrgModal.style.display = 'flex';
    });
}

function closeAModal() {
    if (addOrgModal) addOrgModal.style.display = 'none';
    clearAInputs();
}

// Function to clear inputs of the add organization form
function clearAInputs() {
    const form = document.getElementById('addOrgForm');
    if (form) {
        form.reset();
        form.mobileNumber.value = ''; // Ensure mobile number is also cleared
    }
}


if (addOrgForm) {
    addOrgForm.addEventListener('submit', async e => {
        e.preventDefault();
        const form = addOrgForm;
        const email = form.email.value.trim();
        const mobileNumber = form.mobileNumber.value.trim();
        const isValidEmail = email => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
        const formattedMobile = formatMobileNumber(mobileNumber);

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
        if (!form.checkValidity()) {
            form.reportValidity();
            return;
        }

        orgData = {
            organization: form.organization.value.trim(),
            hq: `${form['hq-barangay'].value}, ${form['hq-city'].value}, ${form['hq-province'].value}`,
            contactPerson: form.contactPerson.value.trim(),
            email: email,
            mobileNumber: formattedMobile,
            socialMedia: form.socialMedia.value.trim() || "N/A"
        };

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
        if (addOrgModal) addOrgModal.style.display = 'none';
        const confirmModal = document.getElementById('confirmModal');
        if (confirmModal) confirmModal.style.display = 'block';
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
            activation: "",
            calamityType: ""
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
                    throw new Error("Email already registered in Firebase Authentication. Please use a different email.");
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

// Initialize
document.addEventListener("DOMContentLoaded", () => {
  console.log("DOM loaded, fetching data...");
  fetchAndRenderTable();
});
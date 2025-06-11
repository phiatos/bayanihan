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

// Initialize Firebase if not already initialized
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const database = firebase.database();
// Initialize Firebase Auth
const auth = firebase.auth();

// Initialize secondary Firebase app for creating users securely
let secondaryApp;
try {
    secondaryApp = firebase.initializeApp(firebaseConfig, "SecondaryApp");
    console.log("Secondary Firebase app initialized successfully");
} catch (error) {
    if (!firebase.apps.some(app => app.name === "SecondaryApp")) {
        console.error("Secondary Firebase initialization failed:", error);
    }
    secondaryApp = firebase.app("SecondaryApp");
}
const secondaryAuth = firebase.auth(secondaryApp);

// Initialize EmailJS with updated public key
try {
    emailjs.init('ULA8rmn7VM-3fZ7ik'); 
    console.log("EmailJS initialized successfully");
} catch (error) {
    console.error("EmailJS initialization failed:", error);
}

// --- Variables for inactivity detection ---
let inactivityTimeout;
const INACTIVITY_TIME = 1800000; // 30 minutes (1800000 ms)

// Function to reset the inactivity timer
function resetInactivityTimer() {
    clearTimeout(inactivityTimeout);
    inactivityTimeout = setTimeout(checkInactivity, INACTIVITY_TIME);
    console.log("Inactivity timer reset.");
}

// Function to check for inactivity and prompt the user
function checkInactivity() {
    Swal.fire({
        title: 'Are you still there?',
        text: 'You\'ve been inactive for a while. Do you want to continue your session or log out?',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#3085d6',
        cancelButtonColor: '#d33',
        confirmButtonText: 'Stay Logged In',
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

// Attach event listeners to detect user activity for inactivity timer
['mousemove', 'keydown', 'scroll', 'click'].forEach(eventType => {
    document.addEventListener(eventType, resetInactivityTimer);
});

// Function to generate a random temporary password
function generateTempPassword() {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    let password = "";
    for (let i = 0; i < 8; i++) {
        password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
}

function formatMobileNumber(mobile) {
    let cleaned = String(mobile).replace(/\D/g, ""); 
    if (cleaned.startsWith("63") && cleaned.length === 12) {
        cleaned = "0" + cleaned.slice(2); // Convert +639 to 09
    }
    // Basic validation: 09 followed by 9 digits
    if (/^09\d{9}$/.test(cleaned)) {
        return cleaned;
    }
    // Handle cases where user might input 9xxxxxxxx or +639xxxxxxxx directly
    if (/^\d{9}$/.test(cleaned) && (mobile.startsWith('9') || mobile.startsWith('+639') || mobile.startsWith('09'))) {
        return '0' + cleaned;
    }
    return null; // Return null if invalid format
}

// Basic email validation regex
function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}


// --- Main DOM Content Loaded Listener ---
document.addEventListener('DOMContentLoaded', () => {
    auth.onAuthStateChanged(user => {
        if (!user) {
            Swal.fire({
                icon: 'error',
                title: 'Authentication Required',
                text: 'Please sign in to access approved applications.',
            }).then(() => {
                window.location.replace("../pages/login.html"); 
            });
            return;
        }
        console.log("User authenticated:", user.uid);
        initializeApprovedApplicationsPage(user.uid);
        resetInactivityTimer();
    });
});


function initializeApprovedApplicationsPage(adminUserId) {
    const volunteerOrgsContainer = document.getElementById('volunteerOrgsContainer');
    const searchInput = document.getElementById('searchInput');
    const sortSelect = document.getElementById('sortSelect');
    const entriesInfo = document.getElementById('entriesInfo');
    const pagination = document.getElementById('pagination');
    const viewPendingBtn = document.getElementById('viewApprovedBtn');

    // --- Modal Elements ---
    const previewModal = document.getElementById('previewModal');
    const closeModalBtn = document.getElementById('closeModal');
    const modalContentDiv = document.getElementById('modalContent');

    // --- Edit Modal Elements (Matching HTML IDs) ---
    const editOrgModal = document.getElementById('editOrgModal'); 
    const closeEditModalBtn = document.getElementById('closeEditModalBtn'); 
    const editOrgForm = document.getElementById('editOrgForm'); 
    const editOrgFirebaseKey = document.getElementById('editOrgFirebaseKey'); 

    // Form fields for editing (Matching HTML IDs)
    const editOrganization = document.getElementById('editOrganization');
    const editContactPerson = document.getElementById('editContactPerson');
    const editEmail = document.getElementById('editEmail');
    const editMobileNumber = document.getElementById('editMobileNumber');
    const editSocialMedia = document.getElementById('editSocialMedia');

    const editRegionSelect = document.getElementById('editRegion'); 
    const editProvinceSelect = document.getElementById('editProvince'); 
    const editCitySelect = document.getElementById('editCity'); 
    const editBarangaySelect = document.getElementById('editBarangay'); 
    
    // Hidden text inputs for edited location (consistent with vgm.js)
    const editRegionTextInput = document.getElementById('editRegion-text');
    const editProvinceTextInput = document.getElementById('editProvince-text');
    const editCityTextInput = document.getElementById('editCity-text');
    const editBarangayTextInput = document.getElementById('editBarangay-text');

    const editStreetAddress = document.getElementById('editStreetAddress');
    // const editMission = document.getElementById('editMission');
    // const editExpertise = document.getElementById('editExpertise');
    // const editLegalStatus = document.getElementById('editLegalStatus');
    // const editRequiredDocuments = document.getElementById('editRequiredDocuments');

    let allApplications = [];
    let filteredApplications = [];
    let currentPage = 1;
    const rowsPerPage = 5;

    // --- Data Fetching Function ---
    function fetchApprovedApplications() {
        volunteerOrgsContainer.innerHTML = '<tr><td colspan="10" style="text-align: center;">Loading approved applications...</td></tr>';

        database.ref('abvnApplications/approvedABVN').on('value', (snapshot) => {
            allApplications = []; // Clear previous data
            if (snapshot.exists()) {
                snapshot.forEach((childSnapshot) => {
                    const appData = childSnapshot.val();
                    const appKey = childSnapshot.key;
                    allApplications.push({ key: appKey, ...appData });
                });
                console.log("Fetched approved applications:", allApplications);
            } else {
                console.log("No approved ABVN applications found.");
            }
            applySearchAndSort(); 
        }, (error) => {
            console.error("Error fetching approved applications: ", error);
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'Failed to load approved applications. Please try again later.',
                confirmButtonText: 'OK'
            });
            volunteerOrgsContainer.innerHTML = '<tr><td colspan="10" style="text-align: center; color: red;">Failed to load data.</td></tr>';
        });
    }

    // --- Rendering Function ---
    function renderApplications(applicationsToRender) {
        volunteerOrgsContainer.innerHTML = '';

        const startIndex = (currentPage - 1) * rowsPerPage;
        const endIndex = startIndex + rowsPerPage;
        const paginatedApplications = applicationsToRender.slice(startIndex, endIndex);

        if (paginatedApplications.length === 0) {
            volunteerOrgsContainer.innerHTML = '<tr><td colspan="10" style="text-align: center;">No approved applications found on this page.</td></tr>';
            entriesInfo.textContent = 'Showing 0 to 0 of 0 entries';
            renderPagination();
            return;
        }

        let i = startIndex + 1;

        paginatedApplications.forEach(app => {
            const formattedTimestamp = app.applicationDateandTime ? new Date(app.applicationDateandTime).toLocaleString('en-US', {
                year: 'numeric', month: 'short', day: 'numeric',
                hour: '2-digit', minute: '2-digit', second: '2-digit'
            }) : 'N/A';

            const row = volunteerOrgsContainer.insertRow();
            row.setAttribute('data-key', app.key);

            row.innerHTML = `
                <td>${i++}</td>
                <td>${app.organizationName || 'N/A'}</td>
                <td>${app.contactPerson || 'N/A'}</td>
                <td>${app.email || 'N/A'}</td>
                <td>${app.mobileNumber || 'N/A'}</td>
                <td><a href="${app.socialMediaLink}" target="_blank" rel="noopener noreferrer">${app.socialMediaLink ? 'Link' : 'N/A'}</a></td>
                <td>${app.headquarters?.region || 'N/A'}</td>
                <td>${app.headquarters?.province || 'N/A'}</td>
                <td>${app.headquarters?.city || 'N/A'}</td>
                <td>${app.headquarters?.barangay || 'N/A'}</td>
                <td>${app.headquarters?.streetAddress || 'N/A'}</td>
                <td>${formattedTimestamp}</td>
                <td>
                    <button class="viewBtn">View</button>
                    <button class="editBtn">Edit</button>
                    <button class="registerBtn">Register</button>
                </td>
            `;
        });
        updateEntriesInfo(applicationsToRender.length);
        renderPagination(applicationsToRender.length);

        // Attach event listeners for dynamically created buttons
        attachRowHandlers(); // Call a new function to attach handlers
    }

    // --- Search and Sort Logic ---
    function applySearchAndSort() {
        let currentApplications = [...allApplications];

        // Apply search filter
        const searchTerm = searchInput.value.toLowerCase().trim();
        if (searchTerm) {
            currentApplications = currentApplications.filter(app => {
                const orgName = (app.organizationName || '').toLowerCase();
                const contactPerson = (app.contactPerson || '').toLowerCase();
                const email = (app.email || '').toLowerCase();
                const mobileNumber = (app.mobileNumber || '').toLowerCase();
                const region = (app.headquarters?.region || '').toLowerCase();
                const province = (app.headquarters?.province || '').toLowerCase();
                const city = (app.headquarters?.city || '').toLowerCase();
                const barangay = (app.headquarters?.barangay || '').toLowerCase();
                const streetAddress = (app.headquarters?.streetAddress || '').toLowerCase(); 
                const timestamp = new Date(app.applicationDateandTime || 0).toLocaleString('en-US').toLowerCase(); 

                return orgName.includes(searchTerm) ||
                       contactPerson.includes(searchTerm) ||
                       email.includes(searchTerm) ||
                       mobileNumber.includes(searchTerm) ||
                       region.includes(searchTerm) ||
                       province.includes(searchTerm) ||
                       city.includes(searchTerm) ||
                       barangay.includes(searchTerm) ||
                       streetAddress.includes(searchTerm) || 
                       timestamp.includes(searchTerm);
            });
        }

        // Apply sort
        const sortValue = sortSelect.value;
        if (sortValue) {
            const [sortBy, order] = sortValue.split('-');
            currentApplications.sort((a, b) => {
                let valA, valB;

                switch (sortBy) {
                    case 'organizationName':
                        valA = (a.organizationName || '').toLowerCase();
                        valB = (b.organizationName || '').toLowerCase();
                        break;
                    case 'contactPerson':
                        valA = (a.contactPerson || '').toLowerCase();
                        valB = (b.contactPerson || '').toLowerCase();
                        break;
                    case 'email':
                        valA = (a.email || '').toLowerCase();
                        valB = (b.email || '').toLowerCase();
                        break;
                    case 'mobileNumber':
                        valA = (a.mobileNumber || '').toLowerCase();
                        valB = (b.mobileNumber || '').toLowerCase();
                        break;
                    case 'region':
                        valA = (a.headquarters?.region || '').toLowerCase();
                        valB = (b.headquarters?.region || '').toLowerCase();
                        break;
                    case 'province':
                        valA = (a.headquarters?.province || '').toLowerCase();
                        valB = (b.headquarters?.province || '').toLowerCase();
                        break;
                    case 'city':
                        valA = (a.headquarters?.city || '').toLowerCase();
                        valB = (b.headquarters?.city || '').toLowerCase();
                        break;
                    case 'barangay':
                        valA = (a.headquarters?.barangay || '').toLowerCase();
                        valB = (b.headquarters?.barangay || '').toLowerCase();
                        break;
                    case 'applicationDateandTime': 
                        valA = new Date(a.applicationDateandTime || 0).getTime();
                        valB = new Date(b.applicationDateandTime || 0).getTime();
                        break;
                    default:
                        valA = (a.organizationName || '').toLowerCase();
                        valB = (b.organizationName || '').toLowerCase();
                        break;
                }

                if (typeof valA === 'string' && typeof valB === 'string') {
                    return order === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
                } else { // For numbers or dates
                    if (valA < valB) return order === 'asc' ? -1 : 1;
                    if (valA > valB) return order === 'asc' ? 1 : -1;
                    return 0;
                }
            });
        }
        filteredApplications = currentApplications; 
        currentPage = 1; 
        renderApplications(filteredApplications);
    }

    // --- Pagination Functions ---
    function renderPagination() {
        pagination.innerHTML = '';
        const totalPages = Math.ceil(filteredApplications.length / rowsPerPage);

        if (totalPages === 0) {
            pagination.innerHTML = '<span>No entries to display</span>';
            return;
        }

        const createButton = (label, page, disabled = false, isActive = false) => {
            const btn = document.createElement('button');
            btn.textContent = label;
            if (disabled) btn.disabled = true;
            if (isActive) btn.classList.add('active-page');
            btn.addEventListener('click', () => {
                currentPage = page;
                renderApplications(filteredApplications);
            });
            return btn;
        };

        pagination.appendChild(createButton('Prev', currentPage - 1, currentPage === 1));

        const maxVisible = 5;
        let startPage = Math.max(1, currentPage - Math.floor(maxVisible / 2));
        let endPage = Math.min(totalPages, startPage + maxVisible - 1);
        if (endPage - startPage < maxVisible - 1) {
            startPage = Math.max(1, endPage - maxVisible + 1);
        }

        for (let i = startPage; i <= endPage; i++) {
            pagination.appendChild(createButton(i, i, false, i === currentPage));
        }

        pagination.appendChild(createButton('Next', currentPage + 1, currentPage === totalPages));
    }

    function updateEntriesInfo(totalItems) {
        const startIndex = (currentPage - 1) * rowsPerPage;
        const endIndex = Math.min(startIndex + rowsPerPage, totalItems);
        entriesInfo.textContent = `Showing ${totalItems ? startIndex + 1 : 0} to ${endIndex} of ${totalItems} entries`;
    }

    function showPreviewModal(applicationData) {
        const formattedApplicationTimestamp = applicationData.applicationDateandTime ? new Date(applicationData.applicationDateandTime).toLocaleString('en-US', {
            year: 'numeric', month: 'short', day: 'numeric',
            hour: '2-digit', minute: '2-digit', second: '2-digit'
        }) : 'N/A';

        const formattedApprovedTimestamp = applicationData.approvedApplicationDate ? new Date(applicationData.approvedApplicationDate).toLocaleString('en-US', {
            year: 'numeric', month: 'short', day: 'numeric',
            hour: '2-digit', minute: '2-digit', second: '2-digit'
        }) : 'N/A';

        let content = `
            <h3 style="margin-bottom: 15px; color: #FA3B99;">Organization Details</h3>
            <p><strong>Organization Name:</strong> ${applicationData.organizationName || 'N/A'}</p>
            <p><strong>Contact Person:</strong> ${applicationData.contactPerson || 'N/A'}</p>
            <p><strong>Email:</strong> ${applicationData.email || 'N/A'}</p>
            <p><strong>Mobile Number:</strong> ${applicationData.mobileNumber || 'N/A'}</p>
            <p><strong>Social Media Link:</strong> ${applicationData.socialMediaLink ? `<a href="${applicationData.socialMediaLink}" target="_blank" rel="noopener noreferrer">${applicationData.socialMediaLink}</a>` : 'N/A'}</p>

            <h4 style="margin-top: 20px; margin-bottom: 10px; color: #FA3B99;">Headquarters Address:</h4>
            <ul>
                <li><strong>Region:</strong> ${applicationData.headquarters?.region || 'N/A'}</li>
                <li><strong>Province:</strong> ${applicationData.headquarters?.province || 'N/A'}</li>
                <li><strong>City:</strong> ${applicationData.headquarters?.city || 'N/A'}</li>
                <li><strong>Barangay:</strong> ${applicationData.headquarters?.barangay || 'N/A'}</li>
                <li><strong>Street Address:</strong> ${applicationData.headquarters?.streetAddress || 'N/A'}</li>
            </ul>

            <h4 style="margin-top: 20px; margin-bottom: 10px; color: #FA3B99;">Organizational Background:</h4>
            <p><strong>Mission/Background:</strong> ${applicationData.organizationalBackgroundMission || 'N/A'}</p>
            <p><strong>Areas of Expertise/Focus:</strong> ${applicationData.areasOfExpertiseFocus || 'N/A'}</p>

            <h4 style="margin-top: 20px; margin-bottom: 10px; color: #FA3B99;">Legal & Documents:</h4>
            <p><strong>Legal Status/Registration:</strong> ${applicationData.legalStatusRegistration || 'N/A'}</p>
            <p><strong>Required Documents:</strong> ${applicationData.requiredDocumentsLink ? `<a href="${applicationData.requiredDocumentsLink}" target="_blank" rel="noopener noreferrer">View Document</a>` : 'N/A'}</p>

            <p style="margin-top: 20px; font-size: 0.9em; color: #555;"><strong>Application Date and Time:</strong> ${formattedApplicationTimestamp}</p>
            <p style="font-size: 0.9em; color: #555;"><strong>Approval Date and Time:</strong> ${formattedApprovedTimestamp}</p>
        `;

        modalContentDiv.innerHTML = content;
        previewModal.style.display = 'flex'; 
    }

    function hidePreviewModal() {
        previewModal.style.display = 'none'; 
        modalContentDiv.innerHTML = ''; 
    }

    // --- NEW: openEditModal Function ---
    async function openEditModal(appKey) {
        const applicationToEdit = allApplications.find(app => app.key === appKey);
        if (!applicationToEdit) {
            console.error("Application not found for editing:", appKey);
            Swal.fire('Error', 'Application details not found.', 'error');
            return;
        }

        editOrgFirebaseKey.value = appKey; 

        // Populate form fields
        editOrganization.value = applicationToEdit.organizationName || '';
        editContactPerson.value = applicationToEdit.contactPerson || '';
        editEmail.value = applicationToEdit.email || '';
        editMobileNumber.value = applicationToEdit.mobileNumber || '';
        editSocialMedia.value = applicationToEdit.socialMediaLink === "N/A" ? "" : applicationToEdit.socialMediaLink;
        editStreetAddress.value = applicationToEdit.headquarters?.streetAddress === "N/A" ? "" : applicationToEdit.headquarters?.streetAddress;

        // Populate location dropdowns for edit modal
        await populateEditLocationDropdowns(
            applicationToEdit.headquarters?.region,
            applicationToEdit.headquarters?.province,
            applicationToEdit.headquarters?.city,
            applicationToEdit.headquarters?.barangay
        );

        editOrgModal.style.display = 'flex';
    }

    // --- NEW: populateEditLocationDropdowns Function ---
    async function populateEditLocationDropdowns(selectedRegionName, selectedProvinceName, selectedCityName, selectedBarangayName) {
        // Clear and reset dropdowns
        editRegionSelect.innerHTML = '<option value="" selected="true" disabled>Choose Region</option>';
        editProvinceSelect.innerHTML = '<option value="" selected="true" disabled>Choose Province</option>';
        editCitySelect.innerHTML = '<option value="" selected="true" disabled>Choose City / Municipality</option>';
        editBarangaySelect.innerHTML = '<option value="" selected="true" disabled>Choose Barangay</option>';

        try {
            // Fetch and fill regions
            const regionResponse = await fetch('../json/region.json'); // Updated path
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
            const regionFound = regions.find(r => r.region_name === selectedRegionName);
            if (regionFound) {
                editRegionSelect.value = regionFound.region_code;
                if (editRegionTextInput) editRegionTextInput.value = regionFound.region_name; // Update hidden text
            }

            // Fetch and fill provinces
            const provinceResponse = await fetch('../json/province.json'); // Updated path
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
            const provinceFound = filteredProvinces.find(p => p.province_name === selectedProvinceName);
            if (provinceFound) {
                editProvinceSelect.value = provinceFound.province_code;
                if (editProvinceTextInput) editProvinceTextInput.value = provinceFound.province_name; // Update hidden text
            }

            // Fetch and fill cities
            const cityResponse = await fetch('../json/city.json'); // Updated path
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
            const cityFound = filteredCities.find(c => c.city_name === selectedCityName);
            if (cityFound) {
                editCitySelect.value = cityFound.city_code;
                if (editCityTextInput) editCityTextInput.value = cityFound.city_name; // Update hidden text
            }

            // Fetch and fill barangays
            const barangayResponse = await fetch('../json/barangay.json'); // Updated path
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
            const barangayFound = filteredBarangays.find(b => b.brgy_name === selectedBarangayName);
            if (barangayFound) {
                editBarangaySelect.value = barangayFound.brgy_code;
                if (editBarangayTextInput) editBarangayTextInput.value = barangayFound.brgy_name; // Update hidden text
            }

        } catch (error) {
            console.error("Error populating edit location dropdowns:", error);
            Swal.fire({
                icon: 'error',
                title: 'Failed to Load Location Data',
                text: `Unable to load location data for editing: ${error.message}.`,
                confirmButtonText: 'OK'
            });
        }
    }

    // --- Event listeners for edit modal location dropdowns ---
    editRegionSelect.addEventListener('change', async () => {
        editProvinceSelect.innerHTML = '<option value="" selected="true" disabled>Choose Province</option>';
        editCitySelect.innerHTML = '<option value="" selected="true" disabled>Choose City / Municipality</option>';
        editBarangaySelect.innerHTML = '<option value="" selected="true" disabled>Choose Barangay</option>';
        if (editRegionTextInput) editRegionTextInput.value = editRegionSelect.options[editRegionSelect.selectedIndex]?.textContent || ''; // Update hidden text
        if (editProvinceTextInput) editProvinceTextInput.value = ''; // Clear dependent
        if (editCityTextInput) editCityTextInput.value = ''; // Clear dependent
        if (editBarangayTextInput) editBarangayTextInput.value = ''; // Clear dependent

        const regionCode = editRegionSelect.value;
        if (!regionCode) return;

        try {
            const response = await fetch('../json/province.json'); // Updated path
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
        if (editProvinceTextInput) editProvinceTextInput.value = editProvinceSelect.options[editProvinceSelect.selectedIndex]?.textContent || ''; // Update hidden text
        if (editCityTextInput) editCityTextInput.value = ''; // Clear dependent
        if (editBarangayTextInput) editBarangayTextInput.value = ''; // Clear dependent

        const provinceCode = editProvinceSelect.value;
        if (!provinceCode) return;

        try {
            const response = await fetch('../json/city.json'); // Updated path
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
        if (editCityTextInput) editCityTextInput.value = editCitySelect.options[editCitySelect.selectedIndex]?.textContent || ''; // Update hidden text
        if (editBarangayTextInput) editBarangayTextInput.value = ''; // Clear dependent

        const cityCode = editCitySelect.value;
        if (!cityCode) return;

        try {
            const response = await fetch('../json/barangay.json'); // Updated path
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

    // Event listener for barangay selection to update hidden text input
    editBarangaySelect.addEventListener('change', () => {
        if (editBarangayTextInput) editBarangayTextInput.value = editBarangaySelect.options[editBarangaySelect.selectedIndex]?.textContent || '';
    });


    // --- NEW: Edit Form Submission Handler ---
    if (editOrgForm) {
        editOrgForm.addEventListener('submit', async e => {
            e.preventDefault();

            const appKey = editOrgFirebaseKey.value;
            if (!appKey) {
                Swal.fire('Error', 'No application key found for editing.', 'error');
                return;
            }

            const updatedOrganization = editOrganization.value.trim();
            const updatedContactPerson = editContactPerson.value.trim();
            const updatedEmail = editEmail.value.trim();
            const updatedMobileNumber = editMobileNumber.value.trim();
            const updatedSocialMedia = editSocialMedia.value.trim();
            const updatedStreetAddress = editStreetAddress.value.trim();

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

            // --- Password Verification Step (Copied from vgm.js) ---
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
                    const isPasswordValid = await verifyUserPassword(enteredPassword);
                    if (!isPasswordValid) {
                        return false; 
                    }
                    return true; 
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
                    organizationName: updatedOrganization, // Changed to organizationName for approved data structure
                    contactPerson: updatedContactPerson,
                    email: updatedEmail,
                    mobileNumber: formattedUpdatedMobile,
                    socialMediaLink: updatedSocialMedia || "N/A", // Changed to socialMediaLink
                    headquarters: { // Changed from address to headquarters
                        region: updatedRegionText,
                        province: updatedProvinceText,
                        city: updatedCityText,
                        barangay: updatedBarangayText,
                        streetAddress: updatedStreetAddress || "N/A"
                    },
                    // Assuming organizationalBackgroundMission, areasOfExpertiseFocus,
                    // legalStatusRegistration, and requiredDocuments are NOT updated via this modal
                    // You might need to retrieve existing values or handle them differently if they can be edited.
                    // For now, these fields are NOT directly in the HTML edit form, so they won't be in updatedData.
                    lastUpdatedBy: adminUserId, // Record who updated it
                    lastUpdatedAt: new Date().toISOString() // Record when it was updated
                };

                await database.ref(`abvnApplications/approvedABVN/${appKey}`).update(updatedData);
                console.log("Approved application updated successfully!");
                Swal.fire(
                    'Updated!',
                    'The approved application has been updated.',
                    'success'
                );
                editOrgModal.style.display = 'none';
                editOrgForm.reset();
                fetchApprovedApplications(); // Re-fetch and re-render the table to show updated data
            } catch (error) {
                console.error("Error updating approved application:", error);
                Swal.fire(
                    'Error!',
                    'Failed to update approved application. Please try again.',
                    'error'
                );
            }
        });
    }

    // --- IMPORTANT: Password Verification Function (Copied from vgm.js) ---
    async function verifyUserPassword(password) {
        Swal.showLoading();

        try {
            const user = auth.currentUser;
            if (!user) {
                throw new Error("No user is currently logged in.");
            }

            const credential = firebase.auth.EmailAuthProvider.credential(user.email, password);
            await user.reauthenticateWithCredential(credential);

            Swal.hideLoading();
            return true; 
        } catch (error) {
            Swal.hideLoading();
            console.error("Password re-authentication failed:", error);
            if (error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
                Swal.showValidationMessage('Incorrect password.');
            } else if (error.code === 'auth/user-not-found') {
                Swal.showValidationMessage('User not found. Please log in again.');
            } else {
                Swal.showValidationMessage(`Authentication error: ${error.message}`);
            }
            return false; 
        }
    }


    // --- Action Handlers (View, Edit and Register Buttons) ---
    function attachRowHandlers() {
        volunteerOrgsContainer.querySelectorAll('.viewBtn').forEach(button => {
            button.onclick = () => {
                const appKey = button.closest('tr').dataset.key;
                const applicationToView = allApplications.find(app => app.key === appKey);
                if (applicationToView) {
                    showPreviewModal(applicationToView);
                } else {
                    Swal.fire('Error', 'Application details not found.', 'error');
                }
            };
        });

        volunteerOrgsContainer.querySelectorAll('.editBtn').forEach(button => {
            button.onclick = () => {
                const appKey = button.closest('tr').dataset.key;
                openEditModal(appKey);
            };
        });

        volunteerOrgsContainer.querySelectorAll('.registerBtn').forEach(button => {
            button.addEventListener('click', async () => {
                const appKey = button.closest('tr').dataset.key;
                const applicationToRegister = allApplications.find(app => app.key === appKey);
                if (applicationToRegister) {
                    await Swal.fire({
                        title: 'Confirm Registration',
                        text: `Are you sure you want to register "${applicationToRegister.organizationName}" into Volunteer Group Management? This will create a user account and move the application to "Registered".`,
                        icon: 'question',
                        showCancelButton: true,
                        confirmButtonText: 'Yes, Register It!',
                        cancelButtonText: 'Cancel',
                        reverseButtons: true
                    }).then(async (result) => {
                        if (result.isConfirmed) {
                            await registerVolunteerGroup(applicationToRegister);
                        } else if (result.dismiss === Swal.DismissReason.cancel) {
                            Swal.fire('Cancelled', 'Registration cancelled.', 'info');
                        }
                    });
                } else {
                    Swal.fire('Error', 'Application data not found for registration.', 'error');
                }
            });
        });
    }

    // Register Volunteer Group in 'volunteerGroups'
    async function registerVolunteerGroup(applicationData) {
        Swal.fire({
            title: 'Processing...',
            text: 'Registering volunteer group and creating user account. Please wait.',
            allowOutsideClick: false,
            didOpen: () => {
                Swal.showLoading();
            }
        });

        try {
            // Validate required fields from applicationData
            if (!applicationData.organizationName || !applicationData.contactPerson || !applicationData.email || !applicationData.mobileNumber ||
                !applicationData.headquarters?.region || !applicationData.headquarters?.province ||
                !applicationData.headquarters?.city || !applicationData.headquarters?.barangay) {
                throw new Error("Missing required fields in application data for registration.");
            }

            if (!isValidEmail(applicationData.email)) {
                throw new Error("Invalid email format in application data.");
            }

            const formattedMobile = formatMobileNumber(applicationData.mobileNumber);
            if (!formattedMobile) {
                throw new Error("Invalid mobile number format in application data.");
            }

            // Verify admin is signed in (should already be due to onAuthStateChanged)
            const adminUser = auth.currentUser;
            if (!adminUser) {
                throw new Error("No admin signed in. Please sign in again.");
            }
            console.log("Current admin performing registration:", adminUser.uid);


            let newUserAuthId = null;
            let tempPassword = null;
            let userAuthAlreadyExists = false;

            // Check if a Firebase Auth user with this email already exists
            try {
                const signInMethods = await secondaryAuth.fetchSignInMethodsForEmail(applicationData.email);
                if (signInMethods && signInMethods.length > 0) {
                    userAuthAlreadyExists = true;
                    console.log(`Firebase Auth user with email ${applicationData.email} already exists (via fetchSignInMethodsForEmail).`);
                    const usersSnapshot = await database.ref('users').orderByChild('email').equalTo(applicationData.email).once('value');
                    if (usersSnapshot.exists()) {
                        // const userEntry = Object.values(usersSnapshot.val())[0]; // Not used here, just for inspection
                        newUserAuthId = Object.keys(usersSnapshot.val())[0]; // Get the UID (key)
                        console.log(`Found existing user UID in /users for ${applicationData.email}: ${newUserAuthId}`);
                    } else {
                        // This scenario should ideally not happen if email exists in Auth but not in /users.
                        console.warn(`Email exists in Firebase Auth but not in /users RTDB: ${applicationData.email}. Cannot link.`);
                        throw new Error(`An account with this email already exists in Firebase Authentication, but its details are not found in the application's user database. Please verify if the organization is already registered.`);
                    }
                }
            } catch (error) {
                console.error("Error checking Firebase Auth user by email (fetchSignInMethodsForEmail):", error);
                throw new Error(`Firebase Auth user check failed: ${error.message}`);
            }

            // Create new Firebase Auth user if one doesn't exist AND email is not already in use
            if (!userAuthAlreadyExists) {
                tempPassword = generateTempPassword();
                const userCredential = await secondaryAuth.createUserWithEmailAndPassword(applicationData.email, tempPassword);
                newUserAuthId = userCredential.user.uid;
                console.log(`New Firebase Auth user created: ${newUserAuthId}`);

                // Save new user details to 'users' node (important for roles/metadata)
                await database.ref(`users/${newUserAuthId}`).set({
                    role: "ABVN", 
                    email: applicationData.email,
                    mobile: formattedMobile,
                    organization: applicationData.organizationName,
                    contactPerson: applicationData.contactPerson,
                    address: {
                        region: applicationData.headquarters?.region || "N/A",
                        province: applicationData.headquarters?.province || "N/A",
                        city: applicationData.headquarters?.city || "N/A",
                        barangay: applicationData.headquarters?.barangay || "N/A",
                        streetAddress: applicationData.headquarters?.streetAddress || "N/A"
                    },
                    createdAt: new Date().toISOString(),
                    isFirstLogin: true,
                    emailVerified: false,
                    password_needs_reset: true
                });
                console.log(`User data saved to /users/${newUserAuthId}`);
            }

            // --- Check if mobile number already exists in the 'users' node (critical for unique identification) ---
            const usersByMobileSnapshot = await database.ref('users').orderByChild('mobile').equalTo(formattedMobile).once('value');
            if (usersByMobileSnapshot.exists()) {
                // const existingUserForMobile = Object.values(usersByMobileSnapshot.val())[0]; // For inspection
                const existingUserUIDForMobile = Object.keys(usersByMobileSnapshot.val())[0];

                if (existingUserUIDForMobile !== newUserAuthId) {
                    throw new Error("Mobile number already registered for a different user.");
                }
            }

            // Find the next available key for 'volunteerGroups' or update existing
            const currentVolunteerGroupsSnapshot = await database.ref('volunteerGroups').once('value');
            const currentGroups = currentVolunteerGroupsSnapshot.val();

            let groupKeyToSave = null;
            let groupAlreadyExists = false;

            if (currentGroups) {
                for (const key in currentGroups) {
                    if (currentGroups[key].userId === newUserAuthId) {
                        groupKeyToSave = key;
                        groupAlreadyExists = true;
                        break;
                    }
                    if (currentGroups[key].email === applicationData.email) {
                        groupKeyToSave = key;
                        groupAlreadyExists = true;
                        break;
                    }
                }
            }

            if (!groupAlreadyExists) {
                let nextKey = 1;
                if (currentGroups) {
                    const keys = Object.keys(currentGroups).map(Number);
                    if (keys.length > 0) {
                        nextKey = Math.max(...keys) + 1;
                    }
                }
                groupKeyToSave = nextKey;
            }

            // Prepare the volunteer group data to be saved/updated
            const volunteerGroupData = {
                organization: applicationData.organizationName,
                contactPerson: applicationData.contactPerson,
                email: applicationData.email,
                mobileNumber: formattedMobile, 
                socialMedia: applicationData.socialMediaLink || "N/A",
                address: {
                    region: applicationData.headquarters?.region || "N/A",
                    province: applicationData.headquarters?.province || "N/A",
                    city: applicationData.headquarters?.city || "N/A",
                    barangay: applicationData.headquarters?.barangay || "N/A",
                    streetAddress: applicationData.headquarters?.streetAddress || "N/A"
                },
                userId: newUserAuthId, // Link to the created/found Firebase Auth user ID
                registeredAt: new Date().toISOString() 
            };

            if (groupAlreadyExists) {
                await database.ref(`volunteerGroups/${groupKeyToSave}`).update(volunteerGroupData); // Update existing group
                console.log(`Existing volunteer group updated: ${groupKeyToSave}`);
                Swal.update({
                    title: 'Group Already Exists & Updated',
                    text: 'This volunteer group was already registered and has been updated.',
                    icon: 'info',
                    showConfirmButton: false,
                    timer: 3000
                });
            } else {
                await database.ref(`volunteerGroups/${groupKeyToSave}`).set(volunteerGroupData); // Create new group
                console.log(`New volunteer group created: ${groupKeyToSave}`);
            }

            // Move the application from 'abvnApplications/approvedABVN' to 'abvnApplications/registeredABVN'
            await database.ref(`abvnApplications/registeredABVN/${applicationData.key}`).set({
                ...applicationData,
                registeredBy: adminUserId, // The admin who registered it
                registeredAt: new Date().toISOString(),
                volunteerGroupKey: groupKeyToSave, // Link to the newly created/updated group
                authUserId: newUserAuthId // Link to the Firebase Auth user ID
            });
            await database.ref(`abvnApplications/approvedABVN/${applicationData.key}`).remove(); // Remove from approved node

            // Send EmailJS confirmation if a new user was created
            if (tempPassword) { // Only send email if a new account was provisioned
                await emailjs.send('service_g5f0erj', 'template_0yk865p', { 
                    email: applicationData.email,
                    organization: applicationData.organizationName,
                    tempPassword: tempPassword,
                    message: `Your volunteer group "${applicationData.organizationName}" has been successfully registered with Bayanihan. Please use the credentials below to log in. You will be prompted to verify your email and reset your password upon your first login.`,
                    verification_message: `Please log in using the provided email and temporary password. You will be prompted to verify your email and reset your password upon your first login.`
                });
                console.log(`Email sent to ${applicationData.email}`);
            }

            Swal.fire({
                icon: 'success',
                title: 'Successfully Registered!',
                text: `${applicationData.organizationName} has been added to Volunteer Groups. ${tempPassword ? 'Login credentials sent via email.' : ''}`,
                timer: 4000,
                timerProgressBar: true,
                showConfirmButton: false
            });

            // Re-fetch and re-render the table to reflect changes
            fetchApprovedApplications();

        } catch (error) {
            console.error('Error registering volunteer group:', error);
            let errorMessage = 'Failed to register volunteer group. Please try again.';
            if (error.message.includes('auth/email-already-in-use')) {
                errorMessage = 'An account with this email already exists. Please check if the organization is already registered or use a different email.';
            } else if (error.message.includes('Mobile number already registered for a different user.')) { 
                errorMessage = 'This mobile number is already linked to a different existing user. Please ensure the organization is not already registered or use a unique mobile number.';
            } else if (error.message.includes('No admin signed in.')) {
                errorMessage = 'Your admin session has expired. Please log in again to register groups.';
            } else if (error.message.includes('An account with this email already exists in Firebase Authentication, but its details are not found in the application\'s user database.')) {
                errorMessage = 'An account with this email already exists in our system, but its details were not found. Please contact support or verify if the organization is already registered.';
            } else {
                errorMessage = `An unexpected error occurred: ${error.message}`;
            }
            Swal.fire({
                icon: 'error',
                title: 'Registration Failed',
                text: errorMessage,
                confirmButtonText: 'OK'
            });
        } finally {
            Swal.hideLoading();
            if (secondaryAuth.currentUser) {
                await secondaryAuth.signOut();
                console.log("Secondary app signed out.");
            }
            console.log("Admin still signed in (primary auth):", auth.currentUser?.uid);
        }
    }

    // --- Event Listeners for Search and Sort ---
    if (searchInput) {
        let searchTimeout;
        searchInput.addEventListener('keyup', () => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                applySearchAndSort();
            }, 300); 
        });
    }
    if (sortSelect) {
        sortSelect.addEventListener('change', applySearchAndSort);
    }

    // --- Modal Close Listeners ---
    closeModalBtn.addEventListener('click', hidePreviewModal);

    // Close the preview modal if clicked outside the modal content
    window.addEventListener('click', (event) => {
        if (event.target === previewModal) {
            hidePreviewModal();
        }
    });

    // Close the edit modal if clicked outside the modal content or by its close button
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


    // Initial fetch of approved applications when the page loads
    fetchApprovedApplications(); 

    if (viewPendingBtn) {
        viewPendingBtn.addEventListener('click', () => {
            window.location.href = '../pages/pendingvg.html';
        });
    }
}

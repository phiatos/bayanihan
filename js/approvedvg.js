// Firebase Configuration
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

// Initialize Firebase
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
    console.log("Firebase initialized successfully.");
} else {
    console.log("Firebase already initialized.");
}

const database = firebase.database();
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

// Initialize EmailJS
try {
    emailjs.init('ULA8rmn7VM-3fZ7ik');
    console.log("EmailJS initialized successfully");
} catch (error) {
    console.error("EmailJS initialization failed:", error);
}

// Global Variables
let currentUserAdminPosition = null;
let inactivityTimeout;
const INACTIVITY_TIME = 1800000; // 30 minutes
let allApplications = [];
let filteredApplications = [];
let currentPage = 1;
const rowsPerPage = 5;
let excelFileInput;
let importExcelBtn;
let importStatusModal;
let closeImportStatusModalBtn;
let importProgressBar;
let importStatusText;
let importErrorList;

// Inactivity Detection
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
        confirmButtonText: 'Stay Logged In',
        cancelButtonText: 'Log Out',
        allowOutsideClick: false,
        reverseButtons: true,
        customClass: {
            popup: 'custom-swal-popup-small',
            title: 'custom-swal-title',
            htmlContainer: 'custom-swal-content',
            confirmButton: 'custom-confirm-btn',
            cancelButton: 'custom-cancel-btn'
        },
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

// Authentication and Initialization
document.addEventListener('DOMContentLoaded', () => {
    auth.onAuthStateChanged(user => {
        if (!user) {
            Swal.fire({
                icon: 'error',
                title: 'Authentication Required',
                text: 'Please sign in to access approved applications.',
                timer: 1600,
                allowOutsideClick: false,
                showConfirmButton: false,
                timerProgressBar: true,
                customClass: {
                    popup: 'swal2-popup-warning-clean',
                    title: 'swal2-title-warning-clean',
                    htmlContainer: 'swal2-text-warning-clean',
                }
            }).then(() => {
                window.location.href = "../pages/login.html";
            });
            return;
        }
        console.log("User authenticated:", user.uid);

        database.ref(`users/${user.uid}`).once('value', snapshot => {
            const userData = snapshot.val();
            currentUserAdminPosition = userData && userData.adminPosition ? userData.adminPosition : null;
            console.log(currentUserAdminPosition ? `Current user has admin position: "${currentUserAdminPosition}".` : "Current user has no recognized admin position. Limiting access.");
            initializePageFunctions(user.uid);
            resetInactivityTimer();
        }).catch(error => {
            console.error("Error fetching user role:", error);
            currentUserAdminPosition = null;
            initializePageFunctions(user.uid);
            resetInactivityTimer();
        });
    });

    ['mousemove', 'keydown', 'scroll', 'click'].forEach(eventType => {
        document.addEventListener(eventType, resetInactivityTimer);
    });
});

// Page Initialization
function initializePageFunctions(adminUserId) {
    // DOM Element References
    const volunteerOrgsContainer = document.getElementById('volunteerOrgsContainer');
    const searchInput = document.getElementById('searchInput');
    const sortSelect = document.getElementById('sortSelect');
    const entriesInfo = document.getElementById('entriesInfo');
    const pagination = document.getElementById('pagination');
    const viewPendingBtn = document.getElementById('viewApprovedBtn');
    const exportBtn = document.getElementById('exportBtn');
    const savePdfBtn = document.getElementById('savePdfBtn');
    const previewModal = document.getElementById('previewModal');
    const closeModalBtn = document.getElementById('closeModal');
    const modalContentDiv = document.getElementById('modalContent');
    const editOrgModal = document.getElementById('editOrgModal');
    const closeEditModalBtn = document.getElementById('closeEditModalBtn');
    const editOrgForm = document.getElementById('editOrgForm');
    const editOrgFirebaseKey = document.getElementById('editOrgFirebaseKey');
    const editOrganization = document.getElementById('editOrganization');
    const editContactPerson = document.getElementById('editContactPerson');
    const editEmail = document.getElementById('editEmail');
    const editMobileNumber = document.getElementById('editMobileNumber');
    const editSocialMedia = document.getElementById('editSocialMedia');
    const editRegionSelect = document.getElementById('editRegion');
    const editProvinceSelect = document.getElementById('editProvince');
    const editCitySelect = document.getElementById('editCity');
    const editBarangaySelect = document.getElementById('editBarangay');
    const editRegionTextInput = document.getElementById('editRegion-text');
    const editProvinceTextInput = document.getElementById('editProvince-text');
    const editCityTextInput = document.getElementById('editCity-text');
    const editBarangayTextInput = document.getElementById('editBarangay-text');
    const editStreetAddress = document.getElementById('editStreetAddress');
    excelFileInput = document.getElementById('excelFileInput');
    importExcelBtn = document.getElementById('importExcelBtn');
    importStatusModal = document.getElementById('importStatusModal');
    closeImportStatusModalBtn = document.getElementById('closeImportStatusModalBtn');
    importProgressBar = document.getElementById('importProgressBar');
    importStatusText = document.getElementById('importStatusText');
    importErrorList = document.getElementById('importErrorList');

    // Event Listeners
    if (importExcelBtn) {
        importExcelBtn.addEventListener('click', () => {
            if (!hasImportPermission()) {
                showAccessDeniedAlert('import volunteer group applications');
                return;
            }
            excelFileInput.click();
        });
    }

    if (excelFileInput) {
        excelFileInput.addEventListener('change', handleExcelFileSelect);
    }

    if (closeImportStatusModalBtn) {
        closeImportStatusModalBtn.addEventListener('click', () => {
            importStatusModal.style.display = 'none';
        });
    }

    if (searchInput) {
        let searchTimeout;
        searchInput.addEventListener('keyup', () => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(applySearchAndSort, 300);
        });
    }

    if (sortSelect) {
        sortSelect.addEventListener('change', applySearchAndSort);
    }

    if (viewPendingBtn) {
        viewPendingBtn.addEventListener('click', () => {
            window.location.href = '../pages/pendingvg.html';
        });
    }

    if (exportBtn) {
        exportBtn.addEventListener('click', exportToExcel);
    }

    if (savePdfBtn) {
        savePdfBtn.addEventListener('click', exportToPDF);
    }

    if (closeModalBtn) {
        closeModalBtn.addEventListener('click', hidePreviewModal);
    }

    if (closeEditModalBtn) {
        closeEditModalBtn.addEventListener('click', () => {
            editOrgModal.style.display = 'none';
            editOrgForm.reset();
        });
    }

    window.addEventListener('click', (event) => {
        if (event.target === previewModal) {
            hidePreviewModal();
        }
        if (event.target === editOrgModal) {
            editOrgModal.style.display = 'none';
            editOrgForm.reset();
        }
        if (event.target === importStatusModal) {
            importStatusModal.style.display = 'none';
        }
    });

    if (editRegionSelect) {
        editRegionSelect.addEventListener('change', async () => {
            editProvinceSelect.innerHTML = '<option value="" selected="true" disabled>Choose Province</option>';
            editCitySelect.innerHTML = '<option value="" selected="true" disabled>Choose City / Municipality</option>';
            editBarangaySelect.innerHTML = '<option value="" selected="true" disabled>Choose Barangay</option>';
            if (editRegionTextInput) editRegionTextInput.value = editRegionSelect.options[editRegionSelect.selectedIndex]?.textContent || '';
            if (editProvinceTextInput) editProvinceTextInput.value = '';
            if (editCityTextInput) editCityTextInput.value = '';
            if (editBarangayTextInput) editBarangayTextInput.value = '';

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
    }

    if (editProvinceSelect) {
        editProvinceSelect.addEventListener('change', async () => {
            editCitySelect.innerHTML = '<option value="" selected="true" disabled>Choose City / Municipality</option>';
            editBarangaySelect.innerHTML = '<option value="" selected="true" disabled>Choose Barangay</option>';
            if (editProvinceTextInput) editProvinceTextInput.value = editProvinceSelect.options[editProvinceSelect.selectedIndex]?.textContent || '';
            if (editCityTextInput) editCityTextInput.value = '';
            if (editBarangayTextInput) editBarangayTextInput.value = '';

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
    }

    if (editCitySelect) {
        editCitySelect.addEventListener('change', async () => {
            editBarangaySelect.innerHTML = '<option value="" selected="true" disabled>Choose Barangay</option>';
            if (editCityTextInput) editCityTextInput.value = editCitySelect.options[editCitySelect.selectedIndex]?.textContent || '';
            if (editBarangayTextInput) editBarangayTextInput.value = '';

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
    }

    if (editBarangaySelect) {
        editBarangaySelect.addEventListener('change', () => {
            if (editBarangayTextInput) editBarangayTextInput.value = editBarangaySelect.options[editBarangaySelect.selectedIndex]?.textContent || '';
        });
    }

    if (editOrgForm) {
        editOrgForm.addEventListener('submit', async e => {
            e.preventDefault();
            handleEditFormSubmission();
        });
    }

    volunteerOrgsContainer.addEventListener('click', handleTableActions);

    // Initial Data Fetch
    fetchApprovedApplications();
}

// Utility Functions
function hasImportPermission() {
    return currentUserAdminPosition === "Super Admin" || currentUserAdminPosition === "position-one";
}

function showAccessDeniedAlert(action) {
    Swal.fire({
        title: 'Access Denied',
        text: `You do not have permission to ${action}.`,
        icon: 'error',
        timer: 2500,
        showConfirmButton: false,
        timerProgressBar: true,
        allowOutsideClick: false,
        customClass: {
            popup: 'swal2-popup-warning-clean',
            title: 'swal2-title-warning-clean',
            htmlContainer: 'swal2-text-warning-clean',
        }
    });
}

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

function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

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

// Data Fetching
function fetchApprovedApplications() {
    const volunteerOrgsContainer = document.getElementById('volunteerOrgsContainer');
    volunteerOrgsContainer.innerHTML = '<tr><td colspan="10" style="text-align: center;">Loading approved applications...</td></tr>';

    database.ref('abvnApplications/approvedABVN').on('value', (snapshot) => {
        allApplications = [];
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
            confirmButtonText: 'OK',
            allowOutsideClick: false,
            customClass: {
                popup: 'swal2-popup-warning-clean',
                title: 'swal2-title-warning-clean',
                htmlContainer: 'swal2-text-warning-clean',
                confirmButton: 'my-warning-button'
            }
        });
        volunteerOrgsContainer.innerHTML = '<tr><td colspan="10" style="text-align: center; color: red;">Failed to load data.</td></tr>';
    });
}

// Data Rendering
function renderApplications(applicationsToRender) {
    const volunteerOrgsContainer = document.getElementById('volunteerOrgsContainer');
    volunteerOrgsContainer.innerHTML = '';

    const startIndex = (currentPage - 1) * rowsPerPage;
    const endIndex = startIndex + rowsPerPage;
    const paginatedApplications = applicationsToRender.slice(startIndex, endIndex);

    if (paginatedApplications.length === 0) {
        volunteerOrgsContainer.innerHTML = '<tr><td colspan="13" style="text-align: center;">No approved applications found on this page.</td></tr>';
        updateEntriesInfo(0);
        renderPagination(0);
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
                <button class="viewBtn" data-key="${app.key}"><i class='bx bx-show-alt'></i></button>
                <button class="editBtn" data-key="${app.key}"><i class='bx bx-edit'></i></button>
                <button class="registerBtn" data-key="${app.key}"><i class='bx bx-user-plus'></i></button>
                <button class="saveSinglePdfBtn" data-key="${app.key}"><i class='bx bxs-file-pdf'></i></button>
            </td>
        `;
    });

    updateEntriesInfo(applicationsToRender.length);
    renderPagination(applicationsToRender.length);
}

// Pagination
function renderPagination(totalItems) {
    const pagination = document.getElementById('pagination');
    pagination.innerHTML = '';
    const totalPages = Math.ceil(totalItems / rowsPerPage);

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
    const entriesInfo = document.getElementById('entriesInfo');
    const startIndex = (currentPage - 1) * rowsPerPage;
    const endIndex = Math.min(startIndex + rowsPerPage, totalItems);
    entriesInfo.textContent = `Showing ${totalItems ? startIndex + 1 : 0} to ${endIndex} of ${totalItems} entries`;
}

// Search and Sort
function applySearchAndSort() {
    const searchInput = document.getElementById('searchInput');
    const sortSelect = document.getElementById('sortSelect');
    let currentApplications = [...allApplications];

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
            const timestamp = app.applicationDateandTime ? new Date(app.applicationDateandTime).toLocaleString('en-US').toLowerCase() : '';

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
                case 'streetAddress':
                    valA = (a.headquarters?.streetAddress || '').toLowerCase();
                    valB = (b.headquarters?.streetAddress || '').toLowerCase();
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
            } else {
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

// View Modal
function showPreviewModal(applicationData) {
    const modalContentDiv = document.getElementById('modalContent');
    const formattedApplicationTimestamp = applicationData.applicationDateandTime ? new Date(applicationData.applicationDateandTime).toLocaleString('en-US', {
        year: 'numeric', month: 'short', day: 'numeric',
        hour: '2-digit', minute: '2-digit', second: '2-digit'
    }) : 'N/A';

    const formattedApprovedTimestamp = applicationData.approvedApplicationDate ? new Date(applicationData.approvedApplicationDate).toLocaleString('en-US', {
        year: 'numeric', month: 'short', day: 'numeric',
        hour: '2-digit', minute: '2-digit', second: '2-digit'
    }) : 'N/A';

    modalContentDiv.innerHTML = `
        <div class="modal-content-inner" style="padding: 20px;">
            <h2>Organization Details:</h2>
            <p><strong>Organization Name:</strong> ${applicationData.organizationName || 'N/A'}</p>
            <p><strong>Contact Person:</strong> ${applicationData.contactPerson || 'N/A'}</p>
            <p><strong>Email:</strong> ${applicationData.email || 'N/A'}</p>
            <p><strong>Mobile Number:</strong> ${applicationData.mobileNumber || 'N/A'}</p>
            <p><strong>Social Media Link:</strong> ${applicationData.socialMediaLink ? `<a href="${applicationData.socialMediaLink}" target="_blank" rel="noopener noreferrer">${applicationData.socialMediaLink}</a>` : 'N/A'}</p>
            <hr>
            <h2>Headquarters Address:</h2>
            <div style="margin-left: 15px;">
                <p><strong>Region:</strong> ${applicationData.headquarters?.region || 'N/A'}</p>
                <p><strong>Province:</strong> ${applicationData.headquarters?.province || 'N/A'}</p>
                <p><strong>City:</strong> ${applicationData.headquarters?.city || 'N/A'}</p>
                <p><strong>Barangay:</strong> ${applicationData.headquarters?.barangay || 'N/A'}</p>
                <p><strong>Street Address:</strong> ${applicationData.headquarters?.streetAddress || 'N/A'}</p>
            </div>
            <hr>
            <h2>Organizational Background:</h2>
            <p><strong>Mission/Background:</strong> ${applicationData.organizationalBackgroundMission || 'N/A'}</p>
            <p><strong>Areas of Expertise/Focus:</strong> ${applicationData.areasOfExpertiseFocus || 'N/A'}</p>
            <hr>
            <h2>Legal & Documents:</h2>
            <p><strong>Legal Status/Registration:</strong> ${applicationData.legalStatusRegistration || 'N/A'}</p>
            <p><strong>Required Documents:</strong> ${applicationData.requiredDocumentsLink ? `<a href="${applicationData.requiredDocumentsLink}" target="_blank" rel="noopener noreferrer">View Document</a>` : 'N/A'}</p>
            <hr>
            <p style="margin-top: 20px; font-size: 0.9em; color: #555;"><strong>Application Date and Time:</strong> ${formattedApplicationTimestamp}</p>
            <p style="font-size: 0.9em; color: #555;"><strong>Approval Date and Time:</strong> ${formattedApprovedTimestamp}</p>
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

// Action Handlers
async function handleTableActions(event) {
    const target = event.target.closest('button');
    if (!target) return;
    const appKey = target.dataset.key;
    if (!appKey) return;

    if (target.classList.contains('viewBtn')) {
        const applicationToView = allApplications.find(app => app.key === appKey);
        if (applicationToView) {
            showPreviewModal(applicationToView);
        } else {
            Swal.fire('Error', 'Application details not found.', 'error');
        }
    } else if (target.classList.contains('editBtn')) {
        await openEditModal(appKey);
    } else if (target.classList.contains('registerBtn')) {
        const applicationToRegister = allApplications.find(app => app.key === appKey);
        if (applicationToRegister) {
            Swal.fire({
                title: 'Confirm Registration',
                text: `Are you sure you want to register "${applicationToRegister.organizationName}" into Volunteer Group Management? This will create a user account and move the application to "Registered".`,
                icon: 'question',
                showCancelButton: true,
                confirmButtonText: 'Register',
                cancelButtonText: 'Cancel',
                reverseButtons: true,
                focusCancel: true,
                allowOutsideClick: false,
                customClass: {
                    popup: 'custom-swal-popup-small',
                    title: 'custom-swal-title',
                    htmlContainer: 'custom-swal-content',
                    confirmButton: 'custom-confirm-btn',
                    cancelButton: 'custom-cancel-btn'
                },
            }).then(async (result) => {
                if (result.isConfirmed) {
                    await registerVolunteerGroup(applicationToRegister);
                } else if (result.dismiss === Swal.DismissReason.cancel) {
                }
            });
        } else {
            Swal.fire('Error', 'Application data not found for registration.', 'error');
        }
    } else if (target.classList.contains('saveSinglePdfBtn')) {
        const applicationToExport = allApplications.find(app => app.key === appKey);
        if (applicationToExport) {
            saveSingleApplicationPdf(applicationToExport);
        } else {
            Swal.fire('Error', 'Application details not found for export.', 'error');
        }
    }
}

async function openEditModal(appKey) {
    const applicationToEdit = allApplications.find(app => app.key === appKey);
    if (!applicationToEdit) {
        console.error("Application not found for editing:", appKey);
        Swal.fire('Error', 'Application details not found.', 'error');
        return;
    }

    const editOrgFirebaseKey = document.getElementById('editOrgFirebaseKey');
    const editOrganization = document.getElementById('editOrganization');
    const editContactPerson = document.getElementById('editContactPerson');
    const editEmail = document.getElementById('editEmail');
    const editMobileNumber = document.getElementById('editMobileNumber');
    const editSocialMedia = document.getElementById('editSocialMedia');
    const editStreetAddress = document.getElementById('editStreetAddress');

    editOrgFirebaseKey.value = appKey;
    editOrganization.value = applicationToEdit.organizationName || '';
    editContactPerson.value = applicationToEdit.contactPerson || '';
    editEmail.value = applicationToEdit.email || '';
    editMobileNumber.value = applicationToEdit.mobileNumber || '';
    editSocialMedia.value = applicationToEdit.socialMediaLink === "N/A" ? "" : applicationToEdit.socialMediaLink;
    editStreetAddress.value = applicationToEdit.headquarters?.streetAddress === "N/A" ? "" : applicationToEdit.headquarters?.streetAddress;

    await populateEditLocationDropdowns(
        applicationToEdit.headquarters?.region,
        applicationToEdit.headquarters?.province,
        applicationToEdit.headquarters?.city,
        applicationToEdit.headquarters?.barangay
    );

    document.getElementById('editOrgModal').style.display = 'flex';
}

async function populateEditLocationDropdowns(selectedRegionName, selectedProvinceName, selectedCityName, selectedBarangayName) {
    const editRegionSelect = document.getElementById('editRegion');
    const editProvinceSelect = document.getElementById('editProvince');
    const editCitySelect = document.getElementById('editCity');
    const editBarangaySelect = document.getElementById('editBarangay');
    const editRegionTextInput = document.getElementById('editRegion-text');
    const editProvinceTextInput = document.getElementById('editProvince-text');
    const editCityTextInput = document.getElementById('editCity-text');
    const editBarangayTextInput = document.getElementById('editBarangay-text');

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
        const regionFound = regions.find(r => r.region_name === selectedRegionName);
        if (regionFound) {
            editRegionSelect.value = regionFound.region_code;
            if (editRegionTextInput) editRegionTextInput.value = regionFound.region_name;
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
        const provinceFound = filteredProvinces.find(p => p.province_name === selectedProvinceName);
        if (provinceFound) {
            editProvinceSelect.value = provinceFound.province_code;
            if (editProvinceTextInput) editProvinceTextInput.value = provinceFound.province_name;
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
        const cityFound = filteredCities.find(c => c.city_name === selectedCityName);
        if (cityFound) {
            editCitySelect.value = cityFound.city_code;
            if (editCityTextInput) editCityTextInput.value = cityFound.city_name;
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
        const barangayFound = filteredBarangays.find(b => b.brgy_name === selectedBarangayName);
        if (barangayFound) {
            editBarangaySelect.value = barangayFound.brgy_code;
            if (editBarangayTextInput) editBarangayTextInput.value = barangayFound.brgy_name;
        }
    } catch (error) {
        console.error("Error populating edit location dropdowns:", error);
        Swal.fire({
            icon: 'error',
            title: 'Failed to Load Location Data',
            text: `Unable to load location data for editing: ${error.message}.`,
            confirmButtonText: 'OK',
            allowOutsideClick: false,
            customClass: {
                popup: 'swal2-popup-warning-clean',
                title: 'swal2-title-warning-clean',
                htmlContainer: 'swal2-text-warning-clean',
                confirmButton: 'my-warning-button'
            }
        });
    }
}

async function handleEditFormSubmission() {
    const editOrgForm = document.getElementById('editOrgForm');
    const editOrgFirebaseKey = document.getElementById('editOrgFirebaseKey');
    const editOrganization = document.getElementById('editOrganization');
    const editContactPerson = document.getElementById('editContactPerson');
    const editEmail = document.getElementById('editEmail');
    const editMobileNumber = document.getElementById('editMobileNumber');
    const editSocialMedia = document.getElementById('editSocialMedia');
    const editRegionSelect = document.getElementById('editRegion');
    const editProvinceSelect = document.getElementById('editProvince');
    const editCitySelect = document.getElementById('editCity');
    const editBarangaySelect = document.getElementById('editBarangay');
    const editStreetAddress = document.getElementById('editStreetAddress');

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

    if (!updatedOrganization || !updatedContactPerson || !updatedEmail || !updatedMobileNumber ||
        !updatedRegionText || !updatedProvinceText || !updatedCityText || !updatedBarangayText) {
        Swal.fire('Error', 'Please fill in all required fields (Organization, Contact Person, Contact Information, and Full Address).', 'error');
        return;
    }

    if (!isValidEmail(updatedEmail)) {
        Swal.fire({
            icon: 'error',
            title: 'Invalid Email',
            text: 'Please enter a valid email address.',
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

    const formattedUpdatedMobile = formatMobileNumber(updatedMobileNumber);
    if (!formattedUpdatedMobile) {
        Swal.fire({
            icon: 'error',
            title: 'Invalid Mobile Number',
            text: 'Mobile number must be 11 digits starting with "09" (e.g., 09123456789).',
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

    const approvedSnapshot = await database.ref('abvnApplications/approvedABVN').once('value');
    const registeredSnapshot = await database.ref('abvnApplications/registeredABVN').once('value');
    const usersSnapshot = await database.ref('users').once('value');
    const volunteerGroupsSnapshot = await database.ref('volunteerGroups').once('value');
    let isDuplicate = false;
    let duplicateReason = '';

    if (approvedSnapshot.exists()) {
        approvedSnapshot.forEach(child => {
            const data = child.val();
            if (child.key !== appKey &&
                (data.email.trim().toLowerCase() === updatedEmail.trim().toLowerCase() ||
                 data.mobileNumber === formattedUpdatedMobile ||
                 data.organizationName.trim().toLowerCase() === updatedOrganization.trim().toLowerCase())) {
                isDuplicate = true;
                duplicateReason = data.email.trim().toLowerCase() === updatedEmail.trim().toLowerCase() ? 'email' :
                                  data.mobileNumber === formattedUpdatedMobile ? 'mobile number' : 'organization name';
                return true;
            }
        });
    }

    if (!isDuplicate && registeredSnapshot.exists()) {
        registeredSnapshot.forEach(child => {
            const data = child.val();
            if (data.email.trim().toLowerCase() === updatedEmail.trim().toLowerCase() ||
                data.mobileNumber === formattedUpdatedMobile ||
                data.organizationName.trim().toLowerCase() === updatedOrganization.trim().toLowerCase()) {
                isDuplicate = true;
                duplicateReason = data.email.trim().toLowerCase() === updatedEmail.trim().toLowerCase() ? 'email' :
                                  data.mobileNumber === formattedUpdatedMobile ? 'mobile number' : 'organization name';
                return true;
            }
        });
    }

    if (!isDuplicate && usersSnapshot.exists()) {
        usersSnapshot.forEach(child => {
            const data = child.val();
            const childEmail = data.email?.trim().toLowerCase() ?? '';
            const childMobile = data.mobile ?? '';
            const childOrganization = data.organization?.trim().toLowerCase() ?? '';
            if (childEmail === updatedEmail.trim().toLowerCase() ||
                childMobile === formattedUpdatedMobile ||
                childOrganization === updatedOrganization.trim().toLowerCase()) {
                isDuplicate = true;
                duplicateReason = childEmail === updatedEmail.trim().toLowerCase() ? 'email' :
                                  childMobile === formattedUpdatedMobile ? 'mobile number' : 'organization name';
                return true;
            }
        });
    }

    if (!isDuplicate && volunteerGroupsSnapshot.exists()) {
        volunteerGroupsSnapshot.forEach(child => {
            const data = child.val();
            if (data.organization.trim().toLowerCase() === updatedOrganization.trim().toLowerCase()) {
                isDuplicate = true;
                duplicateReason = 'organization name';
                return true;
            }
        });
    }

    if (isDuplicate) {
        Swal.fire({
            icon: 'error',
            title: 'Duplicate Found',
            text: `An application or user with this ${duplicateReason} already exists. Please use a unique ${duplicateReason}.`,
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

    if (!editOrgForm.checkValidity()) {
        editOrgForm.reportValidity();
        return;
    }

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
        customClass: {
            popup: 'custom-swal-popup-small',
            title: 'custom-swal-title',
            htmlContainer: 'custom-swal-content',
            confirmButton: 'custom-confirm-btn',
            cancelButton: 'custom-cancel-btn'
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

    if (!password) {
        Swal.fire(
            'Cancelled',
            'Your changes were not saved.',
            'info',
            {
                timer: 1600,
                showConfirmButton: false,
                timerProgressBar: true,
                customClass: {
                    popup: 'swal2-popup-info-clean',
                    title: 'swal2-title-info-clean',
                    htmlContainer: 'swal2-text-info-clean'
                }
            }
        );
        return;
    }

    try {
        const updatedData = {
            organizationName: updatedOrganization,
            contactPerson: updatedContactPerson,
            email: updatedEmail,
            mobileNumber: formattedUpdatedMobile,
            socialMediaLink: updatedSocialMedia || "N/A",
            headquarters: {
                region: updatedRegionText,
                province: updatedProvinceText,
                city: updatedCityText,
                barangay: updatedBarangayText,
                streetAddress: updatedStreetAddress || "N/A"
            },
            lastUpdatedBy: auth.currentUser.uid,
            lastUpdatedAt: new Date().toISOString()
        };

        await database.ref(`abvnApplications/approvedABVN/${appKey}`).update(updatedData);
        console.log("Approved application updated successfully!");
        Swal.fire({
            title: 'Updated!',
            text: 'The approved application has been updated.',
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
        });
        document.getElementById('editOrgModal').style.display = 'none';
        editOrgForm.reset();
        fetchApprovedApplications();
    } catch (error) {
        console.error("Error updating approved application:", error);
        Swal.fire({
            title: 'Error!',
            text: 'Failed to update approved application. Please try again.',
            icon: 'error',
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

        const adminUser = auth.currentUser;
        if (!adminUser) {
            throw new Error("No admin signed in. Please sign in again.");
        }
        console.log("Current admin performing registration:", adminUser.uid);

        const approvedSnapshot = await database.ref('abvnApplications/approvedABVN').once('value');
        const registeredSnapshot = await database.ref('abvnApplications/registeredABVN').once('value');
        const volunteerGroupsSnapshot = await database.ref('volunteerGroups').once('value');
        let isDuplicateOrgName = false;
        let duplicateReason = '';

        if (approvedSnapshot.exists()) {
            approvedSnapshot.forEach(child => {
                const data = child.val();
                if (child.key !== applicationData.key &&
                    data.organizationName.trim().toLowerCase() === applicationData.organizationName.trim().toLowerCase()) {
                    isDuplicateOrgName = true;
                    duplicateReason = 'organization name';
                    return true;
                }
            });
        }

        if (!isDuplicateOrgName && registeredSnapshot.exists()) {
            registeredSnapshot.forEach(child => {
                const data = child.val();
                if (data.organizationName.trim().toLowerCase() === applicationData.organizationName.trim().toLowerCase()) {
                    isDuplicateOrgName = true;
                    duplicateReason = 'organization name';
                    return true;
                }
            });
        }

        if (!isDuplicateOrgName && volunteerGroupsSnapshot.exists()) {
            volunteerGroupsSnapshot.forEach(child => {
                const data = child.val();
                if (data.organization.trim().toLowerCase() === applicationData.organizationName.trim().toLowerCase()) {
                    isDuplicateOrgName = true;
                    duplicateReason = 'organization name';
                    return true;
                }
            });
        }

        if (isDuplicateOrgName) {
            throw new Error("An organization with this name already exists. Please use a unique organization name.");
        }

        let newUserAuthId = null;
        let tempPassword = null;
        let userAuthAlreadyExists = false;

        try {
            const signInMethods = await secondaryAuth.fetchSignInMethodsForEmail(applicationData.email);
            if (signInMethods && signInMethods.length > 0) {
                userAuthAlreadyExists = true;
                console.log(`Firebase Auth user with email ${applicationData.email} already exists (via fetchSignInMethodsForEmail).`);
                const usersSnapshot = await database.ref('users').orderByChild('email').equalTo(applicationData.email).once('value');
                if (usersSnapshot.exists()) {
                    newUserAuthId = Object.keys(usersSnapshot.val())[0];
                    console.log(`Found existing user UID in /users for ${applicationData.email}: ${newUserAuthId}`);
                } else {
                    console.warn(`Email exists in Firebase Auth but not in /users RTDB: ${applicationData.email}. Cannot link.`);
                    throw new Error(`An account with this email already exists in Firebase Authentication, but its details are not found in the application's user database. Please verify if the organization is already registered.`);
                }
            }
        } catch (error) {
            console.error("Error checking Firebase Auth user by email (fetchSignInMethodsForEmail):", error);
            throw new Error(`Firebase Auth user check failed: ${error.message}`);
        }

        if (!userAuthAlreadyExists) {
            tempPassword = generateTempPassword();
            const userCredential = await secondaryAuth.createUserWithEmailAndPassword(applicationData.email, tempPassword);
            newUserAuthId = userCredential.user.uid;
            console.log(`New Firebase Auth user created: ${newUserAuthId}`);

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

        const usersByMobileSnapshot = await database.ref('users').orderByChild('mobile').equalTo(formattedMobile).once('value');
        if (usersByMobileSnapshot.exists()) {
            const existingUserUIDForMobile = Object.keys(usersByMobileSnapshot.val())[0];
            if (existingUserUIDForMobile !== newUserAuthId) {
                throw new Error("Mobile number already registered for a different user.");
            }
        }

        const currentVolunteerGroupsSnapshot = await database.ref('volunteerGroups').once('value');
        const currentGroups = currentVolunteerGroupsSnapshot.val();

        let groupKeyToSave = null;
        let groupAlreadyExists = false;

        if (currentGroups) {
            for (const key in currentGroups) {
                if (currentGroups[key].userId === newUserAuthId || currentGroups[key].email === applicationData.email) {
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
            userId: newUserAuthId,
            registeredAt: new Date().toISOString()
        };

        if (groupAlreadyExists) {
            await database.ref(`volunteerGroups/${groupKeyToSave}`).update(volunteerGroupData);
            console.log(`Existing volunteer group updated: ${groupKeyToSave}`);
            Swal.update({
                title: 'Group Already Exists & Updated',
                text: 'This volunteer group was already registered and has been updated.',
                icon: 'info',
                showConfirmButton: false,
                timer: 3000
            });
        } else {
            await database.ref(`volunteerGroups/${groupKeyToSave}`).set(volunteerGroupData);
            console.log(`New volunteer group created: ${groupKeyToSave}`);
        }

        await database.ref(`abvnApplications/registeredABVN/${applicationData.key}`).set({
            ...applicationData,
            registeredBy: adminUser.uid,
            registeredAt: new Date().toISOString(),
            volunteerGroupKey: groupKeyToSave,
            authUserId: newUserAuthId
        });
        await database.ref(`abvnApplications/approvedABVN/${applicationData.key}`).remove();

        if (tempPassword) {
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
            showConfirmButton: false,
            allowOutsideClick: false,
            customClass: {
                popup: 'swal2-popup-success-clean',
                title: 'swal2-title-success-clean',
                htmlContainer: 'swal2-text-success-clean'
            }
        });

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
            confirmButtonText: 'OK',
            customClass: {
                popup: 'swal2-popup-error-clean',
                title: 'swal2-title-error-clean',
                htmlContainer: 'swal2-text-error-clean',
                confirmButton: 'my-error-button'
            }
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

// Import Excel
async function handleExcelFileSelect(event) {
    const file = event.target.files[0];
    if (!file) return;

    if (!hasImportPermission()) {
        showAccessDeniedAlert('import volunteer group applications');
        return;
    }

    importProgressBar.style.width = '0%';
    importProgressBar.textContent = '0%';
    importProgressBar.style.backgroundColor = '#4CAF50';
    importStatusText.textContent = 'Reading Excel file...';
    importErrorList.innerHTML = '';
    importStatusModal.style.display = 'flex';

    const reader = new FileReader();
    reader.onload = async (e) => {
        try {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: 'array' });
            const firstSheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[firstSheetName];
            const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

            if (jsonData.length === 0) {
                throw new Error("The Excel file is empty or could not be read.");
            }

            const headers = jsonData[0];
            const rows = jsonData.slice(1);
            const columnMap = {
                'Organization Name': 'organizationName',
                'Contact Person': 'contactPerson',
                'Email': 'email',
                'Mobile Number': 'mobileNumber',
                'Social Media': 'socialMediaLink',
                'Landline Number': 'landlineNumber',
                'Facebook Link': 'facebookLink',
                'Instagram Link': 'instagramLink',
                'Twitter Link': 'twitterLink',
                'TikTok Link': 'tiktokLink',
                'Website Link': 'websiteLink',
                'Registration Date': 'registrationDate',
                'Group Description': 'groupDescription',
                'Region': 'headquarters.region',
                'Province': 'headquarters.province',
                'City': 'headquarters.city',
                'Barangay': 'headquarters.barangay',
                'Street Address': 'headquarters.streetAddress',
                'Primary Advocacies': 'primaryAdvocacies',
                'Application Date/Time': 'applicationDateandTime'
            };

            const expectedHeaders = Object.keys(columnMap); // This variable is declared but not used. It can be removed if not needed.
            const mappedData = [];
            const importErrors = [];
            let processedCount = 0;
            const totalRecords = rows.length;

            if (totalRecords === 0) {
                Swal.fire('No Data', 'The Excel file contains headers but no data rows.', 'info');
                importStatusModal.style.display = 'none';
                return;
            }

            importStatusText.textContent = `Validating and preparing ${totalRecords} records...`;

            // Fetch existing records from Firebase for duplicate checking
            const pendingSnapshot = await database.ref('abvnApplications/pendingABVN').once('value');
            const approvedSnapshot = await database.ref('abvnApplications/approvedABVN').once('value');
            const rejectedSnapshot = await database.ref('abvnApplications/rejectedABVN').once('value');

            const existingRecords = new Set();
            [pendingSnapshot, approvedSnapshot, rejectedSnapshot].forEach(snapshot => {
                if (snapshot.exists()) {
                    snapshot.forEach(child => {
                        const data = child.val();
                        if (data.organizationName) {
                            existingRecords.add(data.organizationName.trim().toLowerCase());
                        }
                        if (data.email) {
                            existingRecords.add(data.email.trim().toLowerCase());
                        }
                    });
                }
            });

            for (let i = 0; i < totalRecords; i++) {
                const row = rows[i];
                const record = {};
                let isValidRecord = true;
                const rowErrors = [];

                headers.forEach((header, index) => {
                    const firebaseKey = columnMap[header.trim()];
                    if (firebaseKey) {
                        if (firebaseKey.includes('.')) {
                            const [parentKey, childKey] = firebaseKey.split('.');
                            record[parentKey] = record[parentKey] || {};
                            record[parentKey][childKey] = row[index];
                        } else {
                            record[firebaseKey] = row[index];
                        }
                    }
                });

                // Validate required fields
                if (!record.organizationName || record.organizationName.trim() === '') {
                    isValidRecord = false;
                    rowErrors.push('Missing Organization Name');
                }
                if (!record.email || record.email.trim() === '' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(record.email)) {
                    isValidRecord = false;
                    rowErrors.push('Invalid or Missing Email');
                }
                if (!record.contactPerson || record.contactPerson.trim() === '') {
                    isValidRecord = false;
                    rowErrors.push('Missing Contact Person');
                }
                if (!record.mobileNumber || record.mobileNumber.trim() === '') {
                    isValidRecord = false;
                    rowErrors.push('Missing Mobile Number');
                }

                // Check for duplicates
                const orgNameLower = record.organizationName ? record.organizationName.trim().toLowerCase() : '';
                const emailLower = record.email ? record.email.trim().toLowerCase() : '';
                if (orgNameLower && existingRecords.has(orgNameLower)) {
                    isValidRecord = false;
                    rowErrors.push('Duplicate Organization Name');
                }
                if (emailLower && existingRecords.has(emailLower)) {
                    isValidRecord = false;
                    rowErrors.push('Duplicate Email');
                }

                if (record.primaryAdvocacies && typeof record.primaryAdvocacies === 'string') {
                    record.primaryAdvocacies = record.primaryAdvocacies.split(',').map(s => s.trim()).filter(s => s !== '');
                } else {
                    record.primaryAdvocacies = [];
                }

                if (!record.applicationDateandTime) {
                    record.applicationDateandTime = new Date().toISOString();
                } else {
                    try {
                        const date = new Date(record.applicationDateandTime);
                        if (isNaN(date.getTime())) {
                            throw new Error("Invalid Date");
                        }
                        record.applicationDateandTime = date.toISOString();
                    } catch (e) {
                        isValidRecord = false;
                        rowErrors.push('Invalid Application Date and Time format');
                    }
                }

                record.status = 'Approved'; // Changed status to 'Approved'
                record.approvedApplicationDate = new Date().toISOString(); // Specific timestamp for approved applications

                if (isValidRecord) {
                    mappedData.push(record);
                } else {
                    importErrors.push(`Row ${i + 2} (${record.organizationName || 'N/A'}): ${rowErrors.join(', ')}`);
                }
            }

            if (mappedData.length === 0) {
                Swal.fire({
                    icon: 'error',
                    title: 'No Valid Records',
                    text: 'No valid records found in the Excel file after validation. Check errors for details.',
                    confirmButtonText: 'OK',
                    allowOutsideClick: false,
                    customClass: {
                        popup: 'swal2-popup-warning-clean',
                        title: 'swal2-title-warning-clean',
                        htmlContainer: 'swal2-text-warning-clean',
                        confirmButton: 'my-warning-button'
                    }
                });
                importErrorList.innerHTML = importErrors.map(err => `<li>${err}</li>`).join('');
                importProgressBar.style.backgroundColor = '#f44336';
                return;
            }

            importStatusText.textContent = `Importing ${mappedData.length} valid records to Firebase...`;

            let successCount = 0;
            let currentErrors = [];

            for (const appData of mappedData) {
                try {
                    const newAppRef = database.ref('abvnApplications/approvedABVN').push(); // Changed Firebase path
                    await newAppRef.set(appData);
                    successCount++;
                } catch (error) {
                    console.error("Error importing application:", appData.organizationName, error);
                    currentErrors.push(`Failed to import "${appData.organizationName || 'N/A'}": ${error.message}`);
                }
                processedCount++;
                const progress = Math.round((processedCount / rows.length) * 100);
                importProgressBar.style.width = `${progress}%`;
                importProgressBar.textContent = `${progress}%`;
                importStatusText.textContent = `Processing ${processedCount}/${rows.length} records...`;
            }

            importErrorList.innerHTML = importErrors.concat(currentErrors).map(err => `<li>${err}</li>`).join('');
            if (successCount > 0) {
                Swal.fire({
                    title: 'Import Complete!',
                    html: `Successfully imported ${successCount} new applications. ${importErrors.length + currentErrors.length > 0 ? `<br><br><strong>${importErrors.length + currentErrors.length} issues occurred (including duplicates). Check the status modal for details.</strong>` : ''}`,
                    icon: 'success',
                    timer: 1600,
                    showConfirmButton: false,
                    timerProgressBar: true,
                    allowOutsideClick: false,
                    customClass: {
                        popup: 'swal2-popup-success-clean',
                        title: 'swal2-title-success-clean',
                        htmlContainer: 'swal2-text-success-clean',
                    }
                }).then(() => {
                    fetchApprovedApplications(); // Changed fetch function
                    importStatusModal.style.display = 'none';
                });
            } else {
                Swal.fire({
                    title: 'Import Failed',
                    html: 'No applications were successfully imported. Please check for errors in the status modal.',
                    icon: 'error',
                    confirmButtonText: 'OK',
                    allowOutsideClick: false,
                    customClass: {
                        popup: 'swal2-popup-warning-clean',
                        title: 'swal2-title-warning-clean',
                        htmlContainer: 'swal2-text-warning-clean',
                        confirmButton: 'my-warning-button'
                    }
                });
            }

        } catch (error) {
            console.error("Error processing Excel file:", error);
            Swal.fire({
                title: 'Error',
                html: `Failed to process Excel file: ${error.message}`,
                icon: 'error',
                confirmButtonText: 'OK',
                allowOutsideClick: false,
                customClass: {
                    popup: 'swal2-popup-error-clean',
                    title: 'swal2-title-error-clean',
                    htmlContainer: 'swal2-text-error-clean',
                    confirmButton: 'my-error-button'
                }
            });
            importProgressBar.style.backgroundColor = '#f44336';
            importStatusText.textContent = `Error: ${error.message}`;
            importStatusModal.style.display = 'flex';
        } finally {
            event.target.value = '';
        }
    };

    reader.readAsArrayBuffer(file);
}

// Export Excel
function exportToExcel() {
    if (filteredApplications.length === 0) {
        Swal.fire({
            title: 'Info',
            text: 'No data to export!',
            icon: 'info',
            timer: 1600,
            showConfirmButton: false,
            timerProgressBar: true,
            customClass: {
                popup: 'swal2-popup-info-clean',
                title: 'swal2-title-info-clean',
                htmlContainer: 'swal2-text-info-clean'
            }
        });
        return;
    }

    const dataForExport = filteredApplications.map((app, i) => ({
        "No.": i + 1,
        "Organization Name": app.organizationName || 'N/A',
        "Contact Person": app.contactPerson || 'N/A',
        "Email": app.email || 'N/A',
        "Mobile Number": String(app.mobileNumber || 'N/A'),
        "Social Media": app.socialMediaLink || 'N/A',
        "Region": app.headquarters?.region || 'N/A',
        "Province": app.headquarters?.province || 'N/A',
        "City": app.headquarters?.city || 'N/A',
        "Barangay": app.headquarters?.barangay || 'N/A',
        "Street Address": app.headquarters?.streetAddress || 'N/A',
        "Application Date/Time": app.applicationDateandTime ? new Date(app.applicationDateandTime).toLocaleString() : 'N/A',
        "Approved Date/Time": app.approvedApplicationDate ? new Date(app.approvedApplicationDate).toLocaleString() : 'N/A' // Added approved date
    }));

    const ws = XLSX.utils.json_to_sheet(dataForExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Approved ABVN Applications");

    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    const hours = String(today.getHours()).padStart(2, '0');
    const minutes = String(today.getMinutes()).padStart(2, '0');
    const seconds = String(today.getSeconds()).padStart(2, '0');
    const formattedDateTime = `${year}-${month}-${day}_${hours}${minutes}${seconds}`;
    const filename = `approved-abvn-applications_${formattedDateTime}.xlsx`; // Changed filename

    XLSX.writeFile(wb, filename); // Changed to XLSX.writeFile for direct download
    Swal.fire("Success", `Approved ABVN Applications exported to ${filename}!`, "success");
}


// PDF all
function exportToPDF() {
    if (filteredApplications.length === 0) {
        Swal.fire("Info", "No data to export to PDF!", "info");
        return;
    }

    Swal.fire({
        title: 'Generating PDF',
        text: 'Please wait while your PDF is being generated...',
        allowOutsideClick: false,
        didOpen: () => {
            Swal.showLoading();
        }
    });

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF('landscape');
    let yOffset = 20;
    const logo = new Image();
    logo.src = '../assets/images/AB_logo.png';

    logo.onload = function() {
        const pageWidth = doc.internal.pageSize.width;
        const logoWidth = 30;
        const logoHeight = (logo.naturalHeight / logo.naturalWidth) * logoWidth;
        const margin = 14;

        doc.addImage(logo, 'PNG', pageWidth - logoWidth - margin, margin, logoWidth, logoHeight);
        doc.setFontSize(18);
        doc.text("Approved ABVN Applications Report", 14, yOffset); // Changed title
        yOffset += 10;
        doc.setFontSize(10);
        const now = new Date();
        const options = {
            year: 'numeric', month: 'long', day: 'numeric',
            hour: '2-digit', minute: '2-digit', second: '2-digit',
            hour12: true, timeZone: 'Asia/Manila'
        };
        doc.text(`Report Generated: ${now.toLocaleString('en-US', options)} (PHT)`, 14, yOffset);
        yOffset += 15;

        const head = [[
            "No.", "Organization Name", "Contact Person", "Email", "Mobile Number", "Social Media",
            "Region", "Province", "City", "Barangay", "Street Address", "Application Date/Time", "Approved Date/Time" // Added approved date header
        ]];

        const body = filteredApplications.map((app, i) => [
            i + 1,
            app.organizationName || 'N/A',
            app.contactPerson || 'N/A',
            app.email || 'N/A',
            String(app.mobileNumber) || 'N/A',
            app.socialMediaLink || 'N/A',
            app.headquarters?.region || 'N/A',
            app.headquarters?.province || 'N/A',
            app.headquarters?.city || 'N/A',
            app.headquarters?.barangay || 'N/A',
            app.headquarters?.streetAddress || 'N/A',
            app.applicationDateandTime ? new Date(app.applicationDateandTime).toLocaleString() : 'N/A',
            app.approvedApplicationDate ? new Date(app.approvedApplicationDate).toLocaleString() : 'N/A' // Added approved date data
        ]);

        doc.autoTable({
            head: head,
            body: body,
            startY: yOffset,
            theme: 'grid',
            headStyles: {
                fillColor: [20, 174, 187],
                textColor: [255, 255, 255],
                halign: 'center'
            },
            styles: {
                fontSize: 8,
                cellPadding: 2
            },
            didDrawPage: function(data) {
                doc.setFontSize(8);
                const pageNumberText = `Page ${data.pageNumber} of ${doc.internal.getNumberOfPages()}`;
                const poweredByText = "Powered by: Appvance";
                const pageWidth = doc.internal.pageSize.width;
                const margin = data.settings.margin.left;
                const footerY = doc.internal.pageSize.height - 10;

                doc.text(pageNumberText, margin, footerY);
                doc.text(poweredByText, pageWidth - margin, footerY, { align: 'right' });
            }
        });

        const nowForFilename = new Date();
        const year = nowForFilename.getFullYear();
        const month = String(nowForFilename.getMonth() + 1).padStart(2, '0');
        const day = String(nowForFilename.getDate()).padStart(2, '0');
        const hours = String(nowForFilename.getHours()).padStart(2, '0');
        const minutes = String(nowForFilename.getMinutes()).padStart(2, '0');
        const seconds = String(nowForFilename.getSeconds()).padStart(2, '0');
        const formattedDateTime = `${year}-${month}-${day}_${hours}${minutes}${seconds}`;
        const filename = `approved-abvn-applications_${formattedDateTime}.pdf`; // Changed filename

        doc.save(filename);
        Swal.close();
        Swal.fire("Success", `Approved ABVN Applications exported to "${filename}"`, "success");
    };

    logo.onerror = function() {
        Swal.close();
        Swal.fire("Error", "Failed to load logo image. Please check the path: '../assets/images/AB_logo.png'", "error");
    };
}

// PDF Single
function saveSingleApplicationPdf(application) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    const logo = new Image();
    logo.src = '../assets/images/AB_logo.png';

    logo.onload = function() {
        const pageWidth = doc.internal.pageSize.width;
        const pageHeight = doc.internal.pageSize.height;
        const logoWidth = 30;
        const logoHeight = (logo.naturalHeight / logo.naturalWidth) * logoWidth;
        const margin = 14;
        const maxTextWidth = pageWidth - 2 * margin; // Maximum width for text to fit within margins

        doc.addImage(logo, 'PNG', pageWidth - logoWidth - margin, margin, logoWidth, logoHeight);

        doc.setFontSize(18);
        doc.text("Volunteer Group Application Details", 14, 22);
        doc.setFontSize(10);
        doc.text(`Report Generated: ${new Date().toLocaleString('en-US', { timeZone: 'Asia/Manila' })}`, 14, 30);
        let y = 45;

        const addDetail = (label, value) => {
            const text = `${label}: ${value || 'N/A'}`;
            const textLines = doc.splitTextToSize(text, maxTextWidth); // Split text to fit within page width
            textLines.forEach(line => {
                if (y + 7 > pageHeight - 20) { // Check if there's enough space, else add new page
                    doc.addPage();
                    y = 20;
                    doc.addImage(logo, 'PNG', pageWidth - logoWidth - margin, margin, logoWidth, logoHeight);
                    doc.setFontSize(18);
                    doc.text("Volunteer Group Application Details (Continued)", 14, 22);
                    doc.setFontSize(10);
                }
                doc.text(line, 14, y);
                y += 7;
            });
            return y; // Return updated y position
        };

        y = addDetail("Organization Name", application.organizationName);
        y = addDetail("Contact Person", application.contactPerson);
        y = addDetail("Email", application.email);
        y = addDetail("Mobile Number", String(application.mobileNumber));
        y = addDetail("Social Media Link", application.socialMediaLink);
        y = addDetail("Region", application.headquarters?.region);
        y = addDetail("Province", application.headquarters?.province);
        y = addDetail("City", application.headquarters?.city);
        y = addDetail("Barangay", application.headquarters?.barangay);
        y = addDetail("Street Address", application.headquarters?.streetAddress);
        y = addDetail("Application Date/Time", application.applicationDateandTime ? new Date(application.applicationDateandTime).toLocaleString('en-US', {
            year: 'numeric', month: 'short', day: 'numeric',
            hour: '2-digit', minute: '2-digit', second: '2-digit'
        }) : 'N/A');
        y = addDetail("Approved Date/Time", application.approvedApplicationDate ? new Date(application.approvedApplicationDate).toLocaleString('en-US', {
            year: 'numeric', month: 'short', day: 'numeric',
            hour: '2-digit', minute: '2-digit', second: '2-digit'
        }) : 'N/A'); // Added approved date to single PDF
        y = addDetail("Mission/Background", application.organizationalBackgroundMission);
        y = addDetail("Areas of Expertise/Focus", application.areasOfExpertiseFocus);
        y = addDetail("Legal Status/Registration", application.legalStatusRegistration);
        y = addDetail("Required Documents", application.requiredDocumentsLink ? application.requiredDocumentsLink : 'N/A');

        doc.setFontSize(8);
        const footerY = doc.internal.pageSize.height - 10;
        const pageNumberText = `Page ${doc.internal.getNumberOfPages()} of ${doc.internal.getNumberOfPages()}`;
        const poweredByText = "Powered by: Appvance";

        doc.text(pageNumberText, margin, footerY);
        doc.text(poweredByText, pageWidth - margin, footerY, { align: 'right' });

        doc.save(`application_${application.organizationName || 'unknown'}_${new Date().toISOString().slice(0, 10)}.pdf`);
        Swal.fire({
            title: 'Export Successful!',
            text: 'Volunteer group application details have been exported to PDF.',
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
        });
    };

    logo.onerror = function() {
        Swal.fire("Error", "Failed to load logo image. Please check the path: '../assets/images/AB_logo.png'", "error");
    };
}

// Clear Inputs
function clearDInputs() {
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.value = '';
        if (typeof applySearchAndSort === 'function') {
            applySearchAndSort();
        } else {
            console.warn("applySearchAndSort function not found in scope for clearDInputs.");
        }
    }
}
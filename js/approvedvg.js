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
} else {}

const database = firebase.database();
const auth = firebase.auth();

// Initialize secondary Firebase app for creating users securely
let secondaryApp;
try {
    secondaryApp = firebase.initializeApp(firebaseConfig, "SecondaryApp");
} catch (error) {
    if (!firebase.apps.some(app => app.name === "SecondaryApp")) {}
    secondaryApp = firebase.app("SecondaryApp");
}
const secondaryAuth = firebase.auth(secondaryApp);

// Initialize EmailJS
try {
    emailjs.init('ULA8rmn7VM-3fZ7ik');
} catch (error) {
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
let isAdminVerified = false;

// === Permissions ===
async function checkAdminPermissions() {
    try {
        const user = auth.currentUser;
        if (!user) {
            return {
                canView: false,
                canEdit: false,
                canConfirm: false,
                canImport: false,
                canArchive: false,
                canRetrieve: false
            };
        }

        const snapshot = await database.ref(`users/${user.uid}`).once('value');
        const userData = snapshot.val();
        const adminPosition = userData?.adminPosition || null;

        const permissions = {
            canView: false,
            canEdit: false,
            canConfirm: false,
            canImport: false,
            canArchive: false,
            canRetrieve: false,
        };

        if (['Super Admin', 'position-one'].includes(adminPosition)) {
            permissions.canView = true;
            permissions.canEdit = true;
            permissions.canConfirm = true;
            permissions.canImport = true;
            permissions.canArchive = true;
            permissions.canRetrieve = true;
        } else if (adminPosition === 'position-two') {
            permissions.canView = true;
            permissions.canEdit = true;
            permissions.canConfirm = true;
            permissions.canImport = true;
            permissions.canArchive = false;
            permissions.canRetrieve = false;
        }

        return permissions;
    } catch (error) {
        console.error('Error checking admin permissions:', error);
        return {
            canView: false,
            canEdit: false,
            canConfirm: false,
            canImport: false,
            canArchive: false,
            canRetrieve: false
        };
    }
}

// === Admin Password Verification ===
async function verifySuperAdminPassword() {
    const { value: password } = await Swal.fire({
        title: 'Enter Admin Password',
        input: 'password',
        inputPlaceholder: 'Enter password here',
        inputAttributes: {
            autocapitalize: 'off',
            autocorrect: 'off',
            autocomplete: 'new-password',
        },
        showCancelButton: true,
        confirmButtonText: 'Verify',
        showLoaderOnConfirm: true,
        reverseButtons: true,
        focusCancel: true,
        inputValidator: (value) => !value && 'Password is required!',
        customClass: {
            popup: 'custom-swal-popup-small',
            title: 'custom-swal-title',
            htmlContainer: 'custom-swal-content',
            confirmButton: 'custom-confirm-btn',
            cancelButton: 'custom-cancel-btn',
        },
    });

    try {
        const user = auth.currentUser;
        const credential = firebase.auth.EmailAuthProvider.credential(user.email, password);
        await user.reauthenticateWithCredential(credential);
        isAdminVerified = true;
        return true;
    } catch (error) {
        showErrorAlert('Verification Failed', 'Invalid admin password.');
        isAdminVerified = false;
        return false;
    }
}

// === Utility Functions ===
function showErrorAlert(title, text, callback = null) {
    Swal.fire({
        title,
        text,
        icon: 'error',
        confirmButtonText: 'OK',
        allowOutsideClick: false,
        customClass: {
            popup: 'swal2-popup-error-clean',
            title: 'swal2-title-error-clean',
            htmlContainer: 'swal2-text-error-clean',
            confirmButton: 'my-error-button'
        }
    }).then(() => {
        if (callback) callback();
    });
}

function showAccessDeniedAlert(action) {
    Swal.fire({
        title: 'Access Denied',
        text: `You do not have permission to ${action}.`,
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
}

function generateTempPassword() {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    let password = "";
    for (let i = 0; i < 8; i++) {
        password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
}

function isValidMobile(mobile) {
    const mobileRegex = /^09\d{9}$/;
    return mobileRegex.test(mobile);
}

function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const validDomains = ['gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com', 'icloud.com', 'protonmail.com'];
    const domain = email.split('@')[1]?.toLowerCase();
    return emailRegex.test(email) && validDomains.includes(domain);
}

function isEmpty(value) {
    return value.trim() === "";
}

function isLettersOnly(value) {
    return /^[a-zA-Z\s]+$/.test(value);
}

function showError(inputField, message) {
    const errorDiv = inputField.nextElementSibling;
    if (!errorDiv || !errorDiv.classList.contains('error-message')) {
        const newErrorDiv = document.createElement('div');
        newErrorDiv.className = 'error-message';
        inputField.parentNode.insertBefore(newErrorDiv, inputField.nextSibling);
        newErrorDiv.textContent = message;
    } else {
        errorDiv.textContent = message;
    }
    inputField.classList.add('error');
}

function clearError(inputField) {
    const errorDiv = inputField.nextElementSibling;
    if (errorDiv && errorDiv.classList.contains('error-message')) {
        errorDiv.textContent = '';
    }
    inputField.classList.remove('error');
}

function restrictMobileNumberInput(input) {
    let isProgrammaticChange = false;

    // Function to set value programmatically without triggering restrictions
    input.setValue = function(value) {
        isProgrammaticChange = true;
        input.value = value || '';
        isProgrammaticChange = false;
    };

    input.addEventListener("input", () => {
        if (isProgrammaticChange) return; // Skip restrictions for programmatic changes
        input.value = input.value.replace(/[^0-9]/g, '');
        if (input.value.length > 11) {
            input.value = input.value.slice(0, 11);
        }
        if (input.value && !input.value.startsWith('09')) {
            input.value = '09' + input.value.replace(/^09/, '').slice(0, 9);
        }
    });
}

function validateInputInRealTime(input, fieldConfig) {
    clearError(input);
    if (fieldConfig.required !== false && isEmpty(input.value)) {
        showError(input, `${fieldConfig.label} is required.`);
    } else if (!isEmpty(input.value)) {
        if (fieldConfig.lettersOnly && !isLettersOnly(input.value)) {
            showError(input, `${fieldConfig.label} should only contain letters and spaces.`);
        }
        if (fieldConfig.isEmail && !isValidEmail(input.value.trim())) {
            showError(input, `Please enter a valid email address from an allowed domain.`);
        }
        if (fieldConfig.isMobile && !isValidMobile(input.value)) {
            showError(input, `Mobile number must be 11 digits starting with "09".`);
        }
        if (fieldConfig.isUrl) {
            try {
                new URL(input.value);
            } catch (e) {
                showError(input, `${fieldConfig.label} must be a valid URL (e.g., https://facebook.com/yourpage).`);
            }
        }
    }
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

// === Archived Applications Modal ===
async function openArchivedModal() {
    const permissions = await checkAdminPermissions();
    if (!permissions.canRetrieve) {
        showAccessDeniedAlert('view archived applications');
        return;
    }

    const archivedModal = document.getElementById('archivedModal');
    const archivedApplicationsContainer = document.getElementById('archivedApplicationsContainer');
    archivedApplicationsContainer.innerHTML = '<tr><td colspan="8" style="text-align: center;">Loading archived applications...</td></tr>';

    try {
        const snapshot = await database.ref('abvnApplications/rejectedABVN').once('value');
        const archivedApplications = [];
        if (snapshot.exists()) {
            snapshot.forEach(childSnapshot => {
                const appData = childSnapshot.val();
                const appKey = childSnapshot.key;
                archivedApplications.push({ key: appKey, ...appData });
            });
        } else {
            archivedApplicationsContainer.innerHTML = '<tr><td colspan="8" style="text-align: center;">No archived applications found.</td></tr>';
            archivedModal.style.display = 'flex';
            return;
        }

        archivedApplicationsContainer.innerHTML = '';
        archivedApplications.forEach((app, index) => {
            const formattedTimestamp = app.rejectedAt ? new Date(app.rejectedAt).toLocaleString('en-US', {
                year: 'numeric', month: 'short', day: 'numeric',
                hour: '2-digit', minute: '2-digit', second: '2-digit'
            }) : 'N/A';

            const row = archivedApplicationsContainer.insertRow();
            row.setAttribute('data-key', app.key);
            row.innerHTML = `
                <td>${index + 1}</td>
                <td>${app.organizationName || 'N/A'}</td>
                <td>${app.contactPerson || 'N/A'}</td>
                <td>${app.email || 'N/A'}</td>
                <td>${app.mobileNumber || 'N/A'}</td>
                <td>${app.headquarters?.region || 'N/A'}</td>
                <td>${formattedTimestamp}</td>
                <td>
                    <button class="retrieveBtn" data-key="${app.key}">Retrieve</button>
                </td>
            `;
        });

        archivedModal.style.display = 'flex';
    } catch (error) {
        console.error("Error fetching archived applications:", error);
        showErrorAlert('Error', 'Failed to load archived applications. Please try again.');
        archivedApplicationsContainer.innerHTML = '<tr><td colspan="8" style="text-align: center; color: red;">Failed to load data.</td></tr>';
        archivedModal.style.display = 'flex';
    }
}

function initializeArchivedModal() {
    const viewArchivedBtn = document.getElementById('viewArchived');
    const closeArchivedModalBtn = document.getElementById('closeArchivedModal');
    const archivedApplicationsContainer = document.getElementById('archivedApplicationsContainer');

    if (viewArchivedBtn) {
        viewArchivedBtn.addEventListener('click', openArchivedModal);
    }

    if (closeArchivedModalBtn) {
        closeArchivedModalBtn.addEventListener('click', () => {
            document.getElementById('archivedModal').style.display = 'none';
            archivedApplicationsContainer.innerHTML = '';
        });
    }

    window.addEventListener('click', (event) => {
        const archivedModal = document.getElementById('archivedModal');
        if (event.target === archivedModal) {
            archivedModal.style.display = 'none';
            archivedApplicationsContainer.innerHTML = '';
        }
    });

    // Handle retrieve button clicks
    archivedApplicationsContainer.addEventListener('click', async (event) => {
        const target = event.target.closest('button');
        if (!target || !target.classList.contains('retrieveBtn') || !target.dataset.key) return;

        const appKey = target.dataset.key;
        const permissions = await checkAdminPermissions();
        if (!permissions.canRetrieve) {
            showAccessDeniedAlert('retrieve archived applications');
            return;
        }

        if (!isAdminVerified) {
            const isVerified = await verifySuperAdminPassword();
            if (!isVerified) return;
        }

        try {
            const snapshot = await database.ref(`abvnApplications/rejectedABVN/${appKey}`).once('value');
            if (!snapshot.exists()) {
                showErrorAlert('Error', 'Archived application not found.');
                return;
            }

            const application = snapshot.val();
            await database.ref(`abvnApplications/approvedABVN/${appKey}`).set({
                ...application,
                status: 'Approved',
                retrievedBy: auth.currentUser.uid,
                retrievedAt: new Date().toISOString(),
                rejectedBy: null,
                rejectedAt: null
            });
            await database.ref(`abvnApplications/rejectedABVN/${appKey}`).remove();

            Swal.fire({
                title: 'Success',
                text: 'Application retrieved successfully.',
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

            // Refresh the archived applications modal
            openArchivedModal();
            // Refresh the main approved applications table
            fetchApprovedApplications();
        } catch (error) {
            console.error("Error retrieving application:", error);
            showErrorAlert('Error', 'Failed to retrieve application. Please try again.');
        }
    });
}

// === Authentication and Initialization ===
document.addEventListener('DOMContentLoaded', () => {
    auth.onAuthStateChanged(async (user) => {
        if (!user) {
            showErrorAlert('Authentication Required', 'Please sign in to access approved applications.', () => {
                window.location.href = '../pages/login.html';
            });
            return;
        }

        const permissions = await checkAdminPermissions();
        if (!permissions.canView) {
            showErrorAlert('Access Denied', 'You do not have permission to access this page.', () => {
                window.location.href = '../pages/login.html';
            });
            return;
        }

        try {
            const snapshot = await database.ref(`users/${user.uid}`).once('value');
            const userData = snapshot.val();
            currentUserAdminPosition = userData?.adminPosition || null;
            initializePageFunctions(user.uid);
            resetInactivityTimer();
        } catch (error) {
            console.error('Error fetching user role:', error);
            currentUserAdminPosition = null;
            initializePageFunctions(user.uid);
            resetInactivityTimer();
        }
    });
});

// === Page Initialization ===
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

    // Initialize archived modal
    initializeArchivedModal();

    // Apply real-time validation to edit form inputs
    const editOrgFormInputs = [
        { id: 'editOrganization', label: 'Organization Name'},
        { id: 'editContactPerson', label: 'Contact Person', lettersOnly: true },
        { id: 'editEmail', label: 'Email', isEmail: true },
        { id: 'editMobileNumber', label: 'Mobile Number', isMobile: true },
        { id: 'editSocialMedia', label: 'Social Media', isUrl: true, required: false },
        { id: 'editStreetAddress', label: 'Street Address', required: false },
        { id: 'editOrganizationalBackgroundMission', label: 'Organizational Background/Mission' },
        { id: 'editAreasOfExpertiseFocus', label: 'Areas of Expertise/Focus' },
        { id: 'editLegalStatusRegistration', label: 'Legal Status/Registration' },
        { id: 'editRequiredDocumentsLink', label: 'Required Documents Link', isUrl: true, required: false }
    ];

    editOrgFormInputs.forEach(({ id, label, lettersOnly, isEmail, isMobile, isUrl, required }) => {
        const input = document.getElementById(id);
        if (input) {
            input.addEventListener('input', () => validateInputInRealTime(input, { label, lettersOnly, isEmail, isMobile, isUrl, required }));
        }
    });

    // Apply input restrictions for mobile number
    restrictMobileNumberInput(document.getElementById('editMobileNumber'));

    // Event Listeners
    const downloadTemplateBtn = document.getElementById('downloadTemplateBtn');
    if (downloadTemplateBtn) {
        downloadTemplateBtn.addEventListener('click', downloadExcelTemplate);
    }

    if (editMobileNumber) {
        restrictMobileNumberInput(editMobileNumber);
    }

    if (importExcelBtn) {
        importExcelBtn.addEventListener('click', () => {
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

// === Data Fetching ===
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
        } else {}
        applySearchAndSort();
    }, (error) => {
        console.error("Error fetching approved applications: ", error);
        showErrorAlert('Error', 'Failed to load approved applications. Please try again later.');
        volunteerOrgsContainer.innerHTML = '<tr><td colspan="10" style="text-align: center; color: red;">Failed to load data.</td></tr>';
    });
}

// === Data Rendering ===
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
                <button class="archiveBtn" data-key="${app.key}"><i class="bx bx-x-circle"></i></button>
                <button class="saveSinglePdfBtn" data-key="${app.key}"><i class='bx bxs-file-pdf'></i></button>
            </td>
        `;
    });

    updateEntriesInfo(applicationsToRender.length);
    renderPagination(applicationsToRender.length);
}

// === Pagination ===
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

// === Search and Sort ===
function applySearchAndSort() {
  const searchInput = document.getElementById('searchInput');
  const sortSelect = document.getElementById('sortSelect');
  let currentApplications = [...allApplications];

  // Set dynamic placeholder based on sort selection
  const placeholderMap = {
    'organizationName-asc': 'Search by Organization Name',
    'organizationName-desc': 'Search by Organization Name',
    'contactPerson-asc': 'Search by Contact Person',
    'contactPerson-desc': 'Search by Contact Person',
    'email-asc': 'Search by Email',
    'email-desc': 'Search by Email',
    'mobileNumber-asc': 'Search by Mobile Number',
    'mobileNumber-desc': 'Search by Mobile Number',
    'region-asc': 'Search by Region',
    'region-desc': 'Search by Region',
    'province-asc': 'Search by Province',
    'province-desc': 'Search by Province',
    'city-asc': 'Search by City',
    'city-desc': 'Search by City',
    'barangay-asc': 'Search by Barangay',
    'barangay-desc': 'Search by Barangay',
    'streetAddress-asc': 'Search by Street Address',
    'streetAddress-desc': 'Search by Street Address',
    'applicationDateandTime-asc': 'Search by Application Date/Time',
    'applicationDateandTime-desc': 'Search by Application Date/Time',
    'areasOfExpertiseFocus-asc': 'Search by Areas of Expertise/Focus',
    'areasOfExpertiseFocus-desc': 'Search by Areas of Expertise/Focus',
    'legalStatusRegistration-asc': 'Search by Legal Status/Registration',
    'legalStatusRegistration-desc': 'Search by Legal Status/Registration',
    'organizationalBackgroundMission-asc': 'Search by Organizational Background/Mission',
    'organizationalBackgroundMission-desc': 'Search by Organizational Background/Mission',
    'requiredDocumentsLink-asc': 'Search by Required Documents Link',
    'requiredDocumentsLink-desc': 'Search by Required Documents Link',
    'socialMediaLink-asc': 'Search by Social Media Link',
    'socialMediaLink-desc': 'Search by Social Media Link',
  };
  searchInput.placeholder = placeholderMap[sortSelect.value] || 'Search All Fields';

  // Apply search filter
  const searchTerm = searchInput.value.toLowerCase().trim();
  if (searchTerm) {
    const sortValue = sortSelect.value;
    const sortBy = sortValue ? sortValue.split('-')[0] : null;

    currentApplications = currentApplications.filter((app) => {
      if (!sortBy) {
        // Search all fields when no sort option is selected
        const fields = {
          orgName: (app.organizationName || '').toLowerCase(),
          contactPerson: (app.contactPerson || '').toLowerCase(),
          email: (app.email || '').toLowerCase(),
          mobileNumber: (app.mobileNumber || '').toLowerCase(),
          region: (app.headquarters?.region || '').toLowerCase(),
          province: (app.headquarters?.province || '').toLowerCase(),
          city: (app.headquarters?.city || '').toLowerCase(),
          barangay: (app.headquarters?.barangay || '').toLowerCase(),
          streetAddress: (app.headquarters?.streetAddress || '').toLowerCase(),
          applicationDateTime: app.applicationDateandTime ? new Date(app.applicationDateandTime).toLocaleString().toLowerCase() : '',
          areasOfExpertiseFocus: (app.areasOfExpertiseFocus || '').toLowerCase(),
          legalStatusRegistration: (app.legalStatusRegistration || '').toLowerCase(),
          organizationalBackgroundMission: (app.organizationalBackgroundMission || '').toLowerCase(),
          requiredDocumentsLink: (app.requiredDocumentsLink || '').toLowerCase(),
          socialMediaLink: (app.socialMediaLink || '').toLowerCase(),
        };
        return Object.values(fields).some((field) => field.includes(searchTerm));
      } else {
        // Search only the selected field
        let fieldValue;
        switch (sortBy) {
          case 'organizationName':
            fieldValue = (app.organizationName || '').toLowerCase();
            break;
          case 'contactPerson':
            fieldValue = (app.contactPerson || '').toLowerCase();
            break;
          case 'email':
            fieldValue = (app.email || '').toLowerCase();
            break;
          case 'mobileNumber':
            fieldValue = (app.mobileNumber || '').toLowerCase();
            break;
          case 'region':
            fieldValue = (app.headquarters?.region || '').toLowerCase();
            break;
          case 'province':
            fieldValue = (app.headquarters?.province || '').toLowerCase();
            break;
          case 'city':
            fieldValue = (app.headquarters?.city || '').toLowerCase();
            break;
          case 'barangay':
            fieldValue = (app.headquarters?.barangay || '').toLowerCase();
            break;
          case 'streetAddress':
            fieldValue = (app.headquarters?.streetAddress || '').toLowerCase();
            break;
          case 'applicationDateandTime':
            fieldValue = app.applicationDateandTime ? new Date(app.applicationDateandTime).toLocaleString().toLowerCase() : '';
            break;
          case 'areasOfExpertiseFocus':
            fieldValue = (app.areasOfExpertiseFocus || '').toLowerCase();
            break;
          case 'legalStatusRegistration':
            fieldValue = (app.legalStatusRegistration || '').toLowerCase();
            break;
          case 'organizationalBackgroundMission':
            fieldValue = (app.organizationalBackgroundMission || '').toLowerCase();
            break;
          case 'requiredDocumentsLink':
            fieldValue = (app.requiredDocumentsLink || '').toLowerCase();
            break;
          case 'socialMediaLink':
            fieldValue = (app.socialMediaLink || '').toLowerCase();
            break;
          default:
            fieldValue = (app.organizationName || '').toLowerCase();
        }
        return fieldValue.includes(searchTerm);
      }
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
        case 'contactPerson':
        case 'email':
        case 'areasOfExpertiseFocus':
        case 'legalStatusRegistration':
        case 'organizationalBackgroundMission':
        case 'requiredDocumentsLink':
        case 'socialMediaLink':
          valA = (a[sortBy] || '').toLowerCase();
          valB = (b[sortBy] || '').toLowerCase();
          break;
        case 'mobileNumber':
          valA = parseInt(a.mobileNumber || '0');
          valB = parseInt(b.mobileNumber || '0');
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
      }

      if (typeof valA === 'number' && typeof valB === 'number') {
        return order === 'asc' ? valA - valB : valB - valA;
      }
      return order === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
    });
  }

  filteredApplications = currentApplications;
  currentPage = 1;
  renderApplications(filteredApplications);
}

// === View Modal ===
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

// === Action Handlers ===
async function handleTableActions(event) {
    const target = event.target.closest('button');
    if (!target || !target.dataset.key) return;
    const appKey = target.dataset.key;
    const permissions = await checkAdminPermissions();

    if (target.classList.contains('viewBtn')) {
        if (!permissions.canView) {
            showAccessDeniedAlert('view application details');
            return;
        }
        const application = allApplications.find(app => app.key === appKey);
        if (application) showPreviewModal(application);
    } else if (target.classList.contains('editBtn')) {
        if (!permissions.canEdit) {
            showAccessDeniedAlert('edit applications');
            return;
        }
        if (!isAdminVerified) {
            const isVerified = await verifySuperAdminPassword();
            if (!isVerified) return;
        }
        openEditModal(appKey);
    } else if (target.classList.contains('registerBtn')) {
        if (!permissions.canConfirm) {
            showAccessDeniedAlert('register volunteer groups');
            return;
        }
        if (!isAdminVerified) {
            const isVerified = await verifySuperAdminPassword();
            if (!isVerified) return;
        }
        const application = allApplications.find(app => app.key === appKey);
        if (application) registerVolunteerGroup(application);
    } else if (target.classList.contains('archiveBtn')) {
        if (!permissions.canArchive) {
            showAccessDeniedAlert('archive applications');
            return;
        }
        if (!isAdminVerified) {
            const isVerified = await verifySuperAdminPassword();
            if (!isVerified) return;
        }
        const application = allApplications.find(app => app.key === appKey);
        if (application) {
            await database.ref(`abvnApplications/rejectedABVN/${appKey}`).set({
                ...application,
                status: 'Rejected',
                rejectedBy: auth.currentUser.uid,
                rejectedAt: new Date().toISOString()
            });
            await database.ref(`abvnApplications/approvedABVN/${appKey}`).remove();
            Swal.fire({
                title: 'Success',
                text: 'Application archived.',
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
            fetchApprovedApplications();
        }
    } else if (target.classList.contains('saveSinglePdfBtn')) {
        const application = allApplications.find(app => app.key === appKey);
        if (application) saveSingleApplicationPdf(application);
    }
}

// === Edit Modal ===
async function openEditModal(appKey) {
    const applicationToEdit = allApplications.find(app => app.key === appKey);
    if (!applicationToEdit) {
        console.error("Application not found for editing:", appKey);
        showErrorAlert('Error', 'Application details not found.');
        return;
    }

    const editOrgFirebaseKey = document.getElementById('editOrgFirebaseKey');
    const editOrganization = document.getElementById('editOrganization');
    const editContactPerson = document.getElementById('editContactPerson');
    const editEmail = document.getElementById('editEmail');
    const editMobileNumber = document.getElementById('editMobileNumber');
    const editSocialMedia = document.getElementById('editSocialMedia');
    const editStreetAddress = document.getElementById('editStreetAddress');
    const editOrganizationalBackgroundMission = document.getElementById('editOrganizationalBackgroundMission');
    const editAreasOfExpertiseFocus = document.getElementById('editAreasOfExpertiseFocus');
    const editLegalStatusRegistration = document.getElementById('editLegalStatusRegistration');
    const editRequiredDocumentsLink = document.getElementById('editRequiredDocumentsLink');

    editOrgFirebaseKey.value = appKey;
    editOrganization.value = applicationToEdit.organizationName || '';
    editContactPerson.value = applicationToEdit.contactPerson || '';
    editEmail.value = applicationToEdit.email || '';
    editMobileNumber.setValue(applicationToEdit.mobileNumber || '');
    editSocialMedia.value = applicationToEdit.socialMediaLink === "N/A" ? "" : applicationToEdit.socialMediaLink;
    editStreetAddress.value = applicationToEdit.headquarters?.streetAddress === "N/A" ? "" : applicationToEdit.headquarters?.streetAddress;
    editOrganizationalBackgroundMission.value = applicationToEdit.organizationalBackgroundMission === "N/A" ? "" : applicationToEdit.organizationalBackgroundMission;
    editAreasOfExpertiseFocus.value = applicationToEdit.areasOfExpertiseFocus === "N/A" ? "" : applicationToEdit.areasOfExpertiseFocus;
    editLegalStatusRegistration.value = applicationToEdit.legalStatusRegistration === "N/A" ? "" : applicationToEdit.legalStatusRegistration;
    editRequiredDocumentsLink.value = applicationToEdit.requiredDocumentsLink === "N/A" ? "" : applicationToEdit.requiredDocumentsLink;

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
        showErrorAlert('Failed to Load Location Data', `Unable to load location data for editing: ${error.message}.`);
    }
}

// === Edit Form Submission ===
async function handleEditFormSubmission() {
    const permissions = await checkAdminPermissions();
    if (!permissions.canEdit) {
        showAccessDeniedAlert('edit applications');
        return;
    }
    
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
    const editOrganizationalBackgroundMission = document.getElementById('editOrganizationalBackgroundMission');
    const editAreasOfExpertiseFocus = document.getElementById('editAreasOfExpertiseFocus');
    const editLegalStatusRegistration = document.getElementById('editLegalStatusRegistration');
    const editRequiredDocumentsLink = document.getElementById('editRequiredDocumentsLink');

    const appKey = editOrgFirebaseKey.value;
    if (!appKey) {
        showErrorAlert('Error', 'No application key found for editing.');
        return;
    }

    const updatedOrganization = editOrganization.value.trim();
    const updatedContactPerson = editContactPerson.value.trim();
    const updatedEmail = editEmail.value.trim();
    const updatedMobileNumber = editMobileNumber.value.trim();
    const updatedSocialMedia = editSocialMedia.value.trim();
    const updatedStreetAddress = editStreetAddress.value.trim();
    const updatedOrganizationalBackgroundMission = editOrganizationalBackgroundMission.value.trim();
    const updatedAreasOfExpertiseFocus = editAreasOfExpertiseFocus.value.trim();
    const updatedLegalStatusRegistration = editLegalStatusRegistration.value.trim();
    const updatedRequiredDocumentsLink = editRequiredDocumentsLink.value.trim();

    const updatedRegionText = editRegionSelect.options[editRegionSelect.selectedIndex]?.textContent || '';
    const updatedProvinceText = editProvinceSelect.options[editProvinceSelect.selectedIndex]?.textContent || '';
    const updatedCityText = editCitySelect.options[editCitySelect.selectedIndex]?.textContent || '';
    const updatedBarangayText = editBarangaySelect.options[editBarangaySelect.selectedIndex]?.textContent || '';

    // Validate required fields
    if (!updatedOrganization || !updatedContactPerson || !updatedEmail || !updatedMobileNumber ||
        !updatedRegionText || !updatedProvinceText || !updatedCityText || !updatedBarangayText ||
        !updatedOrganizationalBackgroundMission || !updatedAreasOfExpertiseFocus || !updatedLegalStatusRegistration) {
        showErrorAlert('Error', 'Please fill in all required fields (Organization, Contact Person, Contact Information, Full Address, Organizational Background/Mission, Areas of Expertise/Focus, and Legal Status/Registration).');
        return;
    }

    // Validate email
    if (!isValidEmail(updatedEmail)) {
        showErrorAlert('Invalid Email', 'Please enter a valid email address.');
        return;
    }

    // Validate mobile number
    if (!isValidMobile(updatedMobileNumber)) {
        showErrorAlert('Invalid Mobile Number', 'Mobile number must be 11 digits starting with "09" (e.g., 09123456789).');
        return;
    }

    // Validate URL for requiredDocumentsLink if provided
    if (updatedRequiredDocumentsLink && updatedRequiredDocumentsLink !== "N/A") {
        try {
            new URL(updatedRequiredDocumentsLink);
        } catch (e) {
            showErrorAlert('Invalid URL', 'Required Documents Link must be a valid URL (e.g., https://example.com/documents).');
            return;
        }
    }

    // Validate form
    if (!editOrgForm.checkValidity()) {
        editOrgForm.reportValidity();
        return;
    }

    try {
        const updatedData = {
            organizationName: updatedOrganization,
            contactPerson: updatedContactPerson,
            email: updatedEmail,
            mobileNumber: updatedMobileNumber, // Save the actual mobile number string
            socialMediaLink: updatedSocialMedia || "N/A",
            headquarters: {
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
            applicationDateandTime: allApplications.find(app => app.key === appKey).applicationDateandTime, // Preserve original
            approvedApplicationDate: allApplications.find(app => app.key === appKey).approvedApplicationDate, // Preserve original
            recaptchaResponse: allApplications.find(app => app.key === appKey).recaptchaResponse // Preserve original
        };

        await database.ref(`abvnApplications/approvedABVN/${appKey}`).update(updatedData);
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
        showErrorAlert('Error', 'Failed to update approved application. Please try again.');
    }
}

// === Register Volunteer Group ===
async function registerVolunteerGroup(applicationData) {
    const result = await Swal.fire({
        title: 'Confirm Registration',
        text: `Are you sure you want to register "${applicationData.organizationName}" as a volunteer group?`,
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: 'Yes, Register!',
        cancelButtonText: 'Cancel',
        reverseButtons: true,
        customClass: {
            popup: 'custom-swal-popup-large',
            title: 'custom-swal-title',
            htmlContainer: 'custom-swal-content',
            confirmButton: 'custom-confirm-btn',
            cancelButton: 'custom-cancel-btn'
        }
    });
    if (!result.isConfirmed) {
        return;
    }

    Swal.fire({
        icon: 'success',
        title: 'Processing...',
        html: 'Registering volunteer group and creating user account. Please wait.',
        allowOutsideClick: false,
        showConfirmButton: false,
        timerProgressBar: true,
        customClass: {
            popup: 'swal2-popup-success-clean',
            title: 'swal2-title-success-clean',
            htmlContainer: 'swal2-text-success-clean'
        },
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

        const formattedMobile = isValidMobile(applicationData.mobileNumber);
        if (!formattedMobile) {
            throw new Error("Invalid mobile number format in application data.");
        }

        const adminUser = auth.currentUser;
        if (!adminUser) {
            throw new Error("No admin signed in. Please sign in again.");
        }

        // Enhanced Duplicate Check
        const registeredSnapshot = await database.ref('abvnApplications/registeredABVN').once('value');
        const usersSnapshot = await database.ref('users').once('value');
        const volunteerGroupsSnapshot = await database.ref('volunteerGroups').once('value');
        let isDuplicate = false;
        let duplicateReason = '';

        if (registeredSnapshot.exists()) {
            registeredSnapshot.forEach(child => {
                const data = child.val();
                if (data.email.trim().toLowerCase() === applicationData.email.trim().toLowerCase() ||
                    data.mobileNumber === formattedMobile ||
                    data.organizationName.trim().toLowerCase() === applicationData.organizationName.trim().toLowerCase()) {
                    isDuplicate = true;
                    duplicateReason = data.email.trim().toLowerCase() === applicationData.email.trim().toLowerCase() ? 'email' :
                                     data.mobileNumber === formattedMobile ? 'mobile number' : 'organization name';
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
                if (childEmail === applicationData.email.trim().toLowerCase() ||
                    childMobile === formattedMobile ||
                    childOrganization === applicationData.organizationName.trim().toLowerCase()) {
                    isDuplicate = true;
                    duplicateReason = childEmail === applicationData.email.trim().toLowerCase() ? 'email' :
                                     childMobile === formattedMobile ? 'mobile number' : 'organization name';
                    return true;
                }
            });
        }

        if (!isDuplicate && volunteerGroupsSnapshot.exists()) {
            volunteerGroupsSnapshot.forEach(child => {
                const data = child.val();
                if (data.organization.trim().toLowerCase() === applicationData.organizationName.trim().toLowerCase()) {
                    isDuplicate = true;
                    duplicateReason = 'organization name';
                    return true;
                }
            });
        }

        if (isDuplicate) {
            throw new Error(`An application or user with this ${duplicateReason} already exists. Please use a unique ${duplicateReason}.`);
        }

        // Remove the old duplicate check for organization name
        // The new duplicate check above is more comprehensive

        let newUserAuthId = null;
        let tempPassword = null;
        let userAuthAlreadyExists = false;

        try {
            const signInMethods = await secondaryAuth.fetchSignInMethodsForEmail(applicationData.email);
            if (signInMethods && signInMethods.length > 0) {
                userAuthAlreadyExists = true;
                const usersSnapshot = await database.ref('users').orderByChild('email').equalTo(applicationData.email).once('value');
                if (usersSnapshot.exists()) {
                    newUserAuthId = Object.keys(usersSnapshot.val())[0];
                } else {
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
            Swal.update({
                title: 'Group Already Exists & Updated',
                text: 'This volunteer group was already registered and has been updated.',
                icon: 'info',
                showConfirmButton: false,
                timer: 3000
            });
        } else {
            await database.ref(`volunteerGroups/${groupKeyToSave}`).set(volunteerGroupData);
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
        } else if (error.message.includes('An application or user with this')) {
            errorMessage = error.message;
        } else {
            errorMessage = `An unexpected error occurred: ${error.message}`;
        }
        showErrorAlert('Registration Failed', errorMessage);
    } finally {
        Swal.hideLoading();
        if (secondaryAuth.currentUser) {
            await secondaryAuth.signOut();
        }
    }
}

// === Excel Template Download ===
function downloadExcelTemplate() {
    const templateData = [
        [
        'Areas of Expertise/Focus',
        'Contact Person',
        'Email',
        'Barangay',
        'City',
        'Province',
        'Region',
        'Street Address',
        'Legal Status/Registration',
        'Mobile Number',
        'Organization Name',
        'Organizational Background/Mission',
        'Required Documents Link',
        'Social Media',
        ],
        // Example row for reference
        [
            'Environment, Community Development',
            'Maria Santos',
            'greenfutureph@example.com',
            'Barangay Mabuhay',
            'Cebu City',
            'Cebu',
            'Region VII (Central Visayas)',
            '45 Eco Lane, Banilad',
            'SEC Registered',
            '09987654321',
            'Green Future PH',
            'An NGO promoting sustainable practices and reforestation projects across local communities.',
            'https://drive.google.com/drive/folders/sample-greenfuture',
            'https://facebook.com/greenfutureph',
        ],
    ];

    const ws = XLSX.utils.aoa_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Template');
    XLSX.writeFile(wb, 'abvn_application_template.xlsx');

    Swal.fire({
        title: 'Template Downloaded!',
        text: 'Excel template has been downloaded successfully.',
        icon: 'success',
        timer: 2500,
        showConfirmButton: false,
        timerProgressBar: true,
        allowOutsideClick: false,
        customClass: {
            popup: 'swal2-popup-success-clean',
            title: 'swal2-title-success-clean',
            htmlContainer: 'swal2-text-success-clean'
        }
    });
}

// === Import Excel ===
async function handleExcelFileSelect(event) {
    const permissions = await checkAdminPermissions();
    if (!permissions.canImport) {
        showAccessDeniedAlert('import volunteer group applications');
        return;
    }

    const file = event.target.files[0];
    if (!file) return;

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
                'Region': 'headquarters.region',
                'Province': 'headquarters.province',
                'City': 'headquarters.city',
                'Barangay': 'headquarters.barangay',
                'Street Address': 'headquarters.streetAddress',
                'Organizational Background/Mission': 'organizationalBackgroundMission',
                'Areas of Expertise/Focus': 'areasOfExpertiseFocus',
                'Legal Status/Registration': 'legalStatusRegistration',
                'Required Documents Link': 'requiredDocumentsLink',
                'Application Date/Time': 'applicationDateandTime'
            };

            const mappedData = [];
            const importErrors = [];
            let processedCount = 0;
            const totalRecords = rows.length;

            if (totalRecords === 0) {
                Swal.fire({
                    title: 'No Data',
                    text: 'The Excel file contains headers but no data rows.',
                    icon: 'info',
                    timer: 1600,
                    showConfirmButton: false,
                    timerProgressBar: true
                });
                importStatusModal.style.display = 'none';
                return;
            }

            importStatusText.textContent = `Validating and preparing ${totalRecords} records...`;

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
                            record[parentKey][childKey] = row[index] ? String(row[index]).trim() : '';
                        } else {
                            record[firebaseKey] = row[index] ? String(row[index]).trim() : '';
                        }
                    }
                });

                // Validate required fields
                if (!record.organizationName || record.organizationName === '') {
                    isValidRecord = false;
                    rowErrors.push('Missing Organization Name');
                }
                if (!record.contactPerson || record.contactPerson === '') {
                    isValidRecord = false;
                    rowErrors.push('Missing Contact Person');
                }
                if (!record.email || record.email === '' || !isValidEmail(record.email)) {
                    isValidRecord = false;
                    rowErrors.push('Invalid or Missing Email');
                }
                if (!record.mobileNumber || record.mobileNumber === '' || !isValidMobile(record.mobileNumber)) {
                    isValidRecord = false;
                    rowErrors.push('Invalid or Missing Mobile Number');
                }
                if (!record.headquarters?.region || record.headquarters?.region === '') {
                    isValidRecord = false;
                    rowErrors.push('Missing Region');
                }
                if (!record.headquarters?.province || record.headquarters?.province === '') {
                    isValidRecord = false;
                    rowErrors.push('Missing Province');
                }
                if (!record.headquarters?.city || record.headquarters?.city === '') {
                    isValidRecord = false;
                    rowErrors.push('Missing City');
                }
                if (!record.headquarters?.barangay || record.headquarters?.barangay === '') {
                    isValidRecord = false;
                    rowErrors.push('Missing Barangay');
                }
                if (!record.organizationalBackgroundMission || record.organizationalBackgroundMission === '') {
                    isValidRecord = false;
                    rowErrors.push('Missing Organizational Background/Mission');
                }
                if (!record.areasOfExpertiseFocus || record.areasOfExpertiseFocus === '') {
                    isValidRecord = false;
                    rowErrors.push('Missing Areas of Expertise/Focus');
                }
                if (!record.legalStatusRegistration || record.legalStatusRegistration === '') {
                    isValidRecord = false;
                    rowErrors.push('Missing Legal Status/Registration');
                }

                // Check for duplicates
                const orgNameLower = record.organizationName ? record.organizationName.toLowerCase() : '';
                const emailLower = record.email ? record.email.toLowerCase() : '';
                if (orgNameLower && existingRecords.has(orgNameLower)) {
                    isValidRecord = false;
                    rowErrors.push('Duplicate Organization Name');
                }
                if (emailLower && existingRecords.has(emailLower)) {
                    isValidRecord = false;
                    rowErrors.push('Duplicate Email');
                }

                // Handle optional fields
                record.socialMediaLink = record.socialMediaLink || 'N/A';
                record.headquarters.streetAddress = record.headquarters?.streetAddress || 'N/A';
                record.requiredDocumentsLink = record.requiredDocumentsLink || 'N/A';

                // Validate URL for requiredDocumentsLink if provided
                if (record.requiredDocumentsLink && record.requiredDocumentsLink !== 'N/A') {
                    try {
                        new URL(record.requiredDocumentsLink);
                    } catch (e) {
                        isValidRecord = false;
                        rowErrors.push('Invalid Required Documents Link URL');
                    }
                }

                // Handle Application Date/Time
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

                // Set status and approved date
                record.status = 'Approved';
                record.approvedApplicationDate = new Date().toISOString();

                if (isValidRecord) {
                    mappedData.push(record);
                } else {
                    importErrors.push(`Row ${i + 2} (${record.organizationName || 'N/A'}): ${rowErrors.join(', ')}`);
                }
            }

            if (mappedData.length === 0) {
                showErrorAlert('No Valid Records', 'No valid records found in the Excel file after validation. Check errors for details.');
                importErrorList.innerHTML = importErrors.map(err => `<li>${err}</li>`).join('');
                importProgressBar.style.backgroundColor = '#f44336';
                return;
            }

            importStatusText.textContent = `Importing ${mappedData.length} valid records to Firebase...`;

            let successCount = 0;
            let currentErrors = [];

            for (const appData of mappedData) {
                try {
                    const newAppRef = database.ref('abvnApplications/approvedABVN').push();
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
                    fetchApprovedApplications();
                    importStatusModal.style.display = 'none';
                });
            } else {
                showErrorAlert('Import Failed', 'No applications were successfully imported. Please check for errors in the status modal.');
            }
        } catch (error) {
            console.error("Error processing Excel file:", error);
            showErrorAlert('Error', `Failed to process Excel file: ${error.message}`);
            importProgressBar.style.backgroundColor = '#f44336';
            importStatusText.textContent = `Error: ${error.message}`;
            importStatusModal.style.display = 'flex';
        } finally {
            event.target.value = '';
        }
    };

    reader.readAsArrayBuffer(file);
}

// === Export Excel ===
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
        "Mission/Background": app.organizationalBackgroundMission || 'N/A',
        "Areas of Expertise/Focus": app.areasOfExpertiseFocus || 'N/A',
        "Legal Status/Registration": app.legalStatusRegistration || 'N/A',
        "Required Documents": app.requiredDocumentsLink || 'N/A',
        "Application Date/Time": app.applicationDateandTime ? new Date(app.applicationDateandTime).toLocaleString() : 'N/A',
        "Approved Date/Time": app.approvedApplicationDate ? new Date(app.approvedApplicationDate).toLocaleString() : 'N/A',
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
    const filename = `approved-abvn-applications_${formattedDateTime}.xlsx`;

    XLSX.writeFile(wb, filename);
    Swal.fire({
        title: 'Export Successful!',
        text: `Approved ABVN Applications details have been exported to Excel "${filename}".`,
        icon: 'success',
        showConfirmButton: true,
        confirmButtonText: 'OK',
        customClass: {
            popup: 'swal2-popup-success-clean',
            title: 'swal2-title-success-clean',
            htmlContainer: 'swal2-text-success-clean',
            confirmButton: 'my-success-button'
        }
    });
}

// PDF all
function exportToPDF() {
    if (!filteredApplications.length) {
        Swal.fire({
            title: 'Info',
            text: 'No data to export to PDF!',
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

    Swal.fire({
        title: 'Generating PDF',
        text: 'Please wait while your PDF is being generated...',
        allowOutsideClick: false,
        didOpen: () => {
            Swal.showLoading();
        },
    });

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF('landscape', 'mm', 'a4');
    let yOffset = 20;
    const logo = new Image();
    logo.src = '../assets/images/AB_logo.png';

    logo.onload = () => {
        const pageWidth = doc.internal.pageSize.width;
        const logoWidth = 40;
        const logoHeight = (logo.naturalHeight / logo.naturalWidth) * logoWidth;
        const margin = 10;

        doc.addImage(logo, 'PNG', pageWidth - logoWidth - margin, margin, logoWidth, logoHeight);
        doc.setFontSize(16);
        doc.text('Approved ABVN Applications Report', margin, yOffset);
        yOffset += 12;
        doc.setFontSize(10);
        const now = new Date();
        doc.text(`Report Generated: ${now.toLocaleString('en-US', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true, timeZone: 'Asia/Manila' })} (PHT)`, margin, yOffset);
        yOffset += 15;

        const head = [[
            'No.', 'Organization Name', 'Contact Person', 'Email', 'Mobile Number', 'Social Media',
            'Region', 'Province', 'City', 'Barangay', 'Street Address', 'Application Date/Time', 'Approved Date/Time',
            'Mission/Background', 'Areas of Expertise/Focus', 'Legal Status/Registration', 'Required Documents'
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
            app.approvedApplicationDate ? new Date(app.approvedApplicationDate).toLocaleString() : 'N/A',
            app.organizationalBackgroundMission ? app.organizationalBackgroundMission.substring(0, 100) + (app.organizationalBackgroundMission.length > 100 ? '...' : '') : 'N/A',
            app.areasOfExpertiseFocus || 'N/A',
            app.legalStatusRegistration || 'N/A',
            app.requiredDocumentsLink || 'N/A'
        ]);

        doc.autoTable({
            head,
            body,
            startY: yOffset,
            theme: 'grid',
            headStyles: {
                fillColor: [20, 174, 187],
                textColor: [255, 255, 255],
                halign: 'left',
                fontSize: 10,
                cellPadding: 3,
            },
            bodyStyles: {
                fontSize: 9,
                cellPadding: 3,
                lineWidth: 0.2,
                lineColor: [150, 150, 150],
                textColor: [0, 0, 0],
                minCellHeight: 8,
            },
            columnStyles: {
                0: { cellWidth: 10 }, // No.
                1: { cellWidth: 20 }, // Organization Name
                2: { cellWidth: 20 }, // Contact Person
                3: { cellWidth: 15 }, // Email
                4: { cellWidth: 15 }, // Mobile Number
                5: { cellWidth: 15 }, // Social Media
                6: { cellWidth: 15 }, // Region
                7: { cellWidth: 15 }, // Province
                8: { cellWidth: 15 }, // City
                9: { cellWidth: 15 }, // Barangay
                10: { cellWidth: 15 }, // Street Address
                11: { cellWidth: 15 }, // Application Date/Time
                12: { cellWidth: 15 }, // Approved Date/Time
                13: { cellWidth: 20 }, // Mission/Background
                14: { cellWidth: 20 }, // Areas of Expertise/Focus
                15: { cellWidth: 20 }, // Legal Status/Registration
                16: { cellWidth: 20 }, // Required Documents
            },
            margin: { top: margin, left: margin, right: margin },
            styles: {
                overflow: 'linebreak',
                fontSize: 9,
                cellPadding: 3,
            },
            didDrawPage: (data) => {
                doc.setFontSize(8);
                const pageNumberText = `Page ${data.pageNumber} of ${doc.internal.getNumberOfPages()}`;
                const poweredByText = 'Powered by: Appvance';
                const footerY = doc.internal.pageSize.height - 15;
                doc.text(pageNumberText, margin, footerY);
                doc.text(poweredByText, pageWidth - margin, footerY, { align: 'right' });
            },
        });

        const nowForFilename = new Date();
        const formattedDateTime = `${nowForFilename.getFullYear()}-${String(nowForFilename.getMonth() + 1).padStart(2, '0')}-${String(nowForFilename.getDate()).padStart(2, '0')}_${String(
            nowForFilename.getHours(),
        ).padStart(2, '0')}${String(nowForFilename.getMinutes()).padStart(2, '0')}${String(nowForFilename.getSeconds()).padStart(2, '0')}`;
        const filename = `approved-abvn-applications_${formattedDateTime}.pdf`;

        doc.save(filename);
        Swal.close();
        Swal.fire({
            title: 'Export Successful!',
            text: `Approved ABVN Applications details have been exported to PDF "${filename}".`,
            icon: 'success',
            showConfirmButton: true,
            confirmButtonText: 'OK',
            customClass: {
                popup: 'swal2-popup-success-clean',
                title: 'swal2-title-success-clean',
                htmlContainer: 'swal2-text-success-clean',
                confirmButton: 'my-success-button'
            }
        });
    };

    logo.onerror = () => {
        Swal.close();
        showErrorAlert('Error', "Failed to load logo image. Please check the path: '../assets/images/AB_logo.png'");
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
        y = addDetail("Mission/Background", application.organizationalBackgroundMission);
        y = addDetail("Areas of Expertise/Focus", application.areasOfExpertiseFocus);
        y = addDetail("Legal Status/Registration", application.legalStatusRegistration);
        y = addDetail("Required Documents", application.requiredDocumentsLink ? application.requiredDocumentsLink : 'N/A');
        y = addDetail("Application Date/Time", application.applicationDateandTime ? new Date(application.applicationDateandTime).toLocaleString('en-US', {
            year: 'numeric', month: 'short', day: 'numeric',
            hour: '2-digit', minute: '2-digit', second: '2-digit'
        }) : 'N/A');
        y = addDetail("Approved Date/Time", application.approvedApplicationDate ? new Date(application.approvedApplicationDate).toLocaleString('en-US', {
            year: 'numeric', month: 'short', day: 'numeric',
            hour: '2-digit', minute: '2-digit', second: '2-digit'
        }) : 'N/A'); // Added approved date to single PDF

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
            showConfirmButton: true,
            confirmButtonText: 'OK',
            customClass: {
                popup: 'swal2-popup-success-clean',
                title: 'swal2-title-success-clean',
                htmlContainer: 'swal2-text-success-clean',
                confirmButton: 'my-success-button'
            }
        });
    };

    logo.onerror = function() {
        Swal.fire("Error", "Failed to load logo image. Please check the path: '../assets/images/AB_logo.png'", "error");
    };
}
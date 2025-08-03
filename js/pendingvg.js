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

// Global Variables
let currentUserAdminPosition = null;
let inactivityTimeout;
const INACTIVITY_TIME = 1800000; // 30 minutes

// DOM Elements
let excelFileInput;
let importExcelBtn;
let importStatusModal;
let closeImportStatusModalBtn;
let importProgressBar;
let importStatusText;
let importErrorList;
let allApplications = [];
let filteredApplications = [];
let currentPage = 1;
const rowsPerPage = 5;
let allArchivedVGData = [];
let currentArchivedVGPage = 1;
const archivedVGRowsPerPage = 5;

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
        confirmButtonText: 'Stay Login',
        cancelButtonText: 'Log Out',
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
                text: 'Please sign in to access pending applications.',
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
function initializePageFunctions(userId) {
    // DOM Element References
    const volunteerOrgsContainer = document.getElementById('volunteerOrgsContainer');
    const searchInput = document.getElementById('searchInput');
    const sortSelect = document.getElementById('sortSelect');
    const entriesInfo = document.getElementById('entriesInfo');
    const pagination = document.getElementById('pagination');
    const viewApprovedBtn = document.getElementById('viewApprovedBtn');
    const viewArchivedButton = document.getElementById('viewArchived');
    const exportBtn = document.getElementById('exportBtn');
    const savePdfBtn = document.getElementById('savePdfBtn');
    const previewModal = document.getElementById('previewModal');
    const closeModalBtn = document.getElementById('closeModal');
    const modalContentDiv = document.getElementById('modalContent');
    const archivedModal = document.getElementById('archivedModal');
    const closeArchivedModalBtn = document.getElementById('closeArchivedModalBtn');
    const archivedVGTableBody = document.getElementById('archivedTableBody');
    const archivedEntriesInfo = document.getElementById('archivedEntriesInfo');
    const archivedPaginationContainer = document.getElementById('archivedPagination');

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

    if (closeModalBtn) {
        closeModalBtn.addEventListener('click', hidePreviewModal);
    }

    if (viewArchivedButton) {
        viewArchivedButton.addEventListener('click', () => {
            currentArchivedVGPage = 1;
            fetchAndRenderArchivedVGs();
        });
    }

    if (closeArchivedModalBtn) {
        closeArchivedModalBtn.addEventListener('click', () => {
            archivedModal.style.display = 'none';
        });
    }

    if (viewApprovedBtn) {
        viewApprovedBtn.addEventListener('click', () => {
            window.location.href = '../pages/approvedvg.html';
        });
    }

    window.addEventListener('click', (event) => {
        if (event.target === previewModal) hidePreviewModal();
        if (event.target === archivedModal) archivedModal.style.display = 'none';
        if (event.target === importStatusModal) importStatusModal.style.display = 'none';
    });

    if (exportBtn) {
        exportBtn.addEventListener('click', exportToExcel);
    }

    if (savePdfBtn) {
        savePdfBtn.addEventListener('click', exportToPDF);
    }

    volunteerOrgsContainer.addEventListener('click', handleTableActions);

    // Initial Data Fetch
    fetchPendingApplications();
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

// Data Fetching
function fetchPendingApplications() {
    const volunteerOrgsContainer = document.getElementById('volunteerOrgsContainer');
    volunteerOrgsContainer.innerHTML = '<tr><td colspan="13" style="text-align: center;">Loading applications...</td></tr>';

    database.ref('abvnApplications/pendingABVN').on('value', (snapshot) => {
        allApplications = [];
        if (snapshot.exists()) {
            snapshot.forEach((childSnapshot) => {
                allApplications.push({ key: childSnapshot.key, ...childSnapshot.val() });
            });
            console.log("Fetched pending applications:", allApplications);
        } else {
            console.log("No pending ABVN applications found.");
        }
        applySearchAndSort();
    }, (error) => {
        console.error("Error fetching pending applications: ", error);
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'Failed to load pending applications. Please try again later.',
            confirmButtonText: 'OK',
            allowOutsideClick: false,
            customClass: {
                popup: 'swal2-popup-warning-clean',
                title: 'swal2-title-warning-clean',
                htmlContainer: 'swal2-text-warning-clean',
                confirmButton: 'my-warning-button'
            }
        });
        volunteerOrgsContainer.innerHTML = '<tr><td colspan="13" style="text-align: center; color: red;">Failed to load data.</td></tr>';
    });
}

async function fetchAndRenderArchivedVGs() {
    if (!hasImportPermission()) {
        showAccessDeniedAlert('access retrieve archive application');
        return;
    }

    try {
        const snapshot = await database.ref('abvnApplications/rejectedABVN').once('value');
        const archivedApplications = snapshot.val();
        allArchivedVGData = [];

        for (const uid in archivedApplications) {
            allArchivedVGData.push({ uid, ...archivedApplications[uid] });
        }
        Swal.close();
        renderArchivedVGTable(allArchivedVGData);
        document.getElementById('archivedModal').style.display = 'flex';
    } catch (error) {
        Swal.fire('Error', 'Failed to load archived applications: ' + error.message, 'error');
        console.error("Error fetching archived applications:", error);
    }
}

// Data Rendering
function renderApplications(applicationsToRender) {
    const volunteerOrgsContainer = document.getElementById('volunteerOrgsContainer');
    volunteerOrgsContainer.innerHTML = '';

    const startIndex = (currentPage - 1) * rowsPerPage;
    const endIndex = startIndex + rowsPerPage;
    const paginatedApplications = applicationsToRender.slice(startIndex, endIndex);

    if (paginatedApplications.length === 0) {
        volunteerOrgsContainer.innerHTML = '<tr><td colspan="13" style="text-align: center;">No pending applications found on this page.</td></tr>';
        updateEntriesInfo(0);
        renderPagination(0);
        return;
    }

    let i = startIndex + 1;

    paginatedApplications.forEach(app => {
        const row = volunteerOrgsContainer.insertRow();
        row.setAttribute('data-key', app.key);

        const formattedTimestamp = app.applicationDateandTime ? new Date(app.applicationDateandTime).toLocaleString('en-US', {
            year: 'numeric', month: 'short', day: 'numeric',
            hour: '2-digit', minute: '2-digit', second: '2-digit'
        }) : 'N/A';

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
                <button class="approveBtn" data-key="${app.key}"><i class="bx bx-check-circle"></i></button>
                <button class="rejectBtn" data-key="${app.key}"><i class="bx bx-x-circle"></i></button>
                <button class="saveSinglePdfBtn" data-key="${app.key}"><i class='bx bxs-file-pdf'></i></button>
            </td>
        `;
    });

    updateEntriesInfo(applicationsToRender.length);
    renderPagination(applicationsToRender.length);
}

function renderArchivedVGTable(data) {
    const archivedVGTableBody = document.getElementById('archivedTableBody');
    if (!archivedVGTableBody) {
        console.error("Archived volunteer group table body not found!");
        return;
    }

    archivedVGTableBody.innerHTML = '';

    const startIndex = (currentArchivedVGPage - 1) * archivedVGRowsPerPage;
    const endIndex = startIndex + archivedVGRowsPerPage;
    const paginatedData = data.slice(startIndex, endIndex);

    if (paginatedData.length === 0) {
        archivedVGTableBody.innerHTML = '<tr><td colspan="5" style="text-align: center;">No archived volunteer group applications found.</td></tr>';
        updateArchivedEntriesInfo(0);
        renderArchivedPagination(0);
        return;
    }

    paginatedData.forEach(org => {
        const row = archivedVGTableBody.insertRow();
        row.dataset.uid = org.uid;

        const archivedDate = org.rejectedAt ? new Date(org.rejectedAt).toLocaleDateString() : 'N/A';

        row.insertCell(0).textContent = org.organizationName || 'N/A';
        row.insertCell(1).textContent = org.email || 'N/A';
        row.insertCell(2).textContent = org.status || 'N/A';
        row.insertCell(3).textContent = archivedDate;
        row.insertCell(4).innerHTML = `<button class="retrieveBtn" data-uid="${org.uid}">Retrieve</button>`;
    });

    renderArchivedPagination(data.length);
    updateArchivedEntriesInfo(data.length);

    document.querySelectorAll('.retrieveBtn').forEach(button => {
        button.addEventListener('click', (event) => retrieveVG(event.target.dataset.uid));
    });
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

function renderArchivedPagination(totalItems) {
    const archivedPaginationContainer = document.getElementById('archivedPagination');
    archivedPaginationContainer.innerHTML = '';
    const totalPages = Math.ceil(totalItems / archivedVGRowsPerPage);

    if (totalPages === 0) {
        archivedPaginationContainer.innerHTML = '<span>No entries to display</span>';
        return;
    }

    const createButton = (label, page, disabled = false, isActive = false) => {
        const btn = document.createElement('button');
        btn.textContent = label;
        if (disabled) btn.disabled = true;
        if (isActive) btn.classList.add('active-page');
        btn.addEventListener('click', () => {
            currentArchivedVGPage = page;
            renderArchivedVGTable(allArchivedVGData);
        });
        return btn;
    };

    archivedPaginationContainer.appendChild(createButton('Prev', currentArchivedVGPage - 1, currentArchivedVGPage === 1));

    const maxVisible = 5;
    let startPage = Math.max(1, currentArchivedVGPage - Math.floor(maxVisible / 2));
    let endPage = Math.min(totalPages, startPage + maxVisible - 1);
    if (endPage - startPage < maxVisible - 1) {
        startPage = Math.max(1, endPage - maxVisible + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
        archivedPaginationContainer.appendChild(createButton(i, i, false, i === currentArchivedVGPage));
    }

    archivedPaginationContainer.appendChild(createButton('Next', currentArchivedVGPage + 1, currentArchivedVGPage === totalPages));
}

function updateEntriesInfo(totalItems) {
    const entriesInfo = document.getElementById('entriesInfo');
    const startIndex = (currentPage - 1) * rowsPerPage;
    const endIndex = Math.min(startIndex + rowsPerPage, totalItems);
    entriesInfo.textContent = `Showing ${totalItems ? startIndex + 1 : 0} to ${endIndex} of ${totalItems} entries`;
}

function updateArchivedEntriesInfo(totalItems) {
    const archivedEntriesInfo = document.getElementById('archivedEntriesInfo');
    const startIndex = (currentArchivedVGPage - 1) * archivedVGRowsPerPage;
    const endIndex = Math.min(startIndex + archivedVGRowsPerPage, totalItems);
    archivedEntriesInfo.textContent = `Showing ${totalItems ? startIndex + 1 : 0} to ${endIndex} of ${totalItems} entries`;
}

// Search and Sort
function applySearchAndSort() {
    const searchInput = document.getElementById('searchInput');
    const sortSelect = document.getElementById('sortSelect');
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
            const applicationDateTime = app.applicationDateandTime ? new Date(app.applicationDateandTime).toLocaleString().toLowerCase() : '';

            return orgName.includes(searchTerm) ||
                   contactPerson.includes(searchTerm) ||
                   email.includes(searchTerm) ||
                   mobileNumber.includes(searchTerm) ||
                   region.includes(searchTerm) ||
                   province.includes(searchTerm) ||
                   city.includes(searchTerm) ||
                   barangay.includes(searchTerm) ||
                   streetAddress.includes(searchTerm) ||
                   applicationDateTime.includes(searchTerm);
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
                    break;
            }

            if (typeof valA === 'number' && typeof valB === 'number') {
                return order === 'asc' ? valA - valB : valB - valA;
            } else {
                return order === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
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
    const formattedTimestamp = applicationData.applicationDateandTime ? new Date(applicationData.applicationDateandTime).toLocaleString('en-US', {
        year: 'numeric', month: 'short', day: 'numeric',
        hour: '2-digit', minute: '2-digit', second: '2-digit'
    }) : 'N/A';

    modalContentDiv.innerHTML = `
        <div class="modal-content-inner" style="padding: 20px;">
            <h2>Organization Details:</h2>
            <p><strong>Application Date/Time:</strong> ${formattedTimestamp}</p>
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
    const target = event.target;
    const appKey = target.dataset.key;

    if (!appKey) return;

    if (target.classList.contains('viewBtn')) {
        const applicationToView = allApplications.find(app => app.key === appKey);
        if (applicationToView) {
            showPreviewModal(applicationToView);
        } else {
            Swal.fire('Error', 'Application details not found.', 'error');
        }
    } else if (target.classList.contains('approveBtn')) {
        Swal.fire({
            title: 'Are you sure?',
            text: "Do you want to approve this application?",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Approve',
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
                try {
                    const appRef = database.ref(`abvnApplications/pendingABVN/${appKey}`);
                    const snapshot = await appRef.once('value');
                    const applicationData = snapshot.val();

                    if (applicationData) {
                        const approvedAppsRef = database.ref('abvnApplications/approvedABVN');
                        const approvedSnapshot = await approvedAppsRef.once('value');
                        let isDuplicate = false;

                        if (approvedSnapshot.exists()) {
                            approvedSnapshot.forEach((approvedChild) => {
                                const approvedData = approvedChild.val();
                                const normalizedOrgName = applicationData.organizationName.trim().toLowerCase();
                                const normalizedEmail = applicationData.email.trim().toLowerCase();
                                if (approvedData.organizationName.trim().toLowerCase() === normalizedOrgName &&
                                    approvedData.email.trim().toLowerCase() === normalizedEmail) {
                                    isDuplicate = true;
                                    return true;
                                }
                            });
                        }

                        if (isDuplicate) {
                            Swal.fire({
                                icon: 'error',
                                title: 'Duplicate Found',
                                html: 'This application already exists in the Approved Applications.<br><br>Please check the approved list before proceeding.',
                                confirmButtonText: 'OK',
                                allowOutsideClick: false,
                                customClass: {
                                    popup: 'swal2-popup-warning-clean',
                                    title: 'swal2-title-warning-clean',
                                    htmlContainer: 'swal2-text-warning-clean',
                                    confirmButton: 'my-warning-button'
                                }
                            });
                            return;
                        }
                        applicationData.approvedApplicationDate = new Date().toISOString();
                        await database.ref(`abvnApplications/approvedABVN/${appKey}`).set(applicationData);
                        await appRef.remove();
                        Swal.fire({
                            title: 'Approved!',
                            text: 'The application has been approved and moved to the approved list.',
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
                        });
                    } else {
                        Swal.fire('Error', 'Application not found.', 'error');
                    }
                } catch (error) {
                    console.error("Error approving application: ", error);
                    Swal.fire('Error', 'Failed to approve application. Please try again.', 'error');
                }
            }
        });
    } else if (target.classList.contains('rejectBtn')) {
        if (!hasImportPermission()) {
            showAccessDeniedAlert('reject this application');
            return;
        }

        Swal.fire({
            title: 'Are you sure to reject this application?',
            text: "This will move it to archived records.",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Reject',
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
            }
        }).then(async (result) => {
            if (result.isConfirmed) {
                try {
                    const appRef = database.ref(`abvnApplications/pendingABVN/${appKey}`);
                    const snapshot = await appRef.once('value');
                    const applicationData = snapshot.val();

                    if (applicationData) {
                        applicationData.rejectedAt = new Date().toISOString();
                        applicationData.status = 'Rejected';
                        await database.ref(`abvnApplications/rejectedABVN/${appKey}`).set(applicationData);
                        await appRef.remove();
                        Swal.fire({
                            title: 'Rejected!',
                            text: 'The application has been rejected and archived.',
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
                        });
                    } else {
                        Swal.fire('Error', 'Application not found.', 'error');
                    }
                } catch (error) {
                    console.error("Error rejecting application: ", error);
                    Swal.fire('Error', 'Failed to reject application. Please try again.', 'error');
                }
            }
        });
    } else if (target.classList.contains('saveSinglePdfBtn')) {
        const applicationToExport = allApplications.find(app => app.key === appKey);
        if (applicationToExport) {
            saveSingleApplicationPdf(applicationToExport);
        } else {
            Swal.fire('Error', 'Application details not found for export.', 'error');
        }
    }
}

async function retrieveVG(uid) {
    if (!hasImportPermission()) {
        showAccessDeniedAlert('retrieve volunteer group applications');
        return;
    }

    Swal.fire({
        title: 'Retrieve Application?',
        text: 'This will move the volunteer group application from archived records back to pending applications.',
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: 'Retrieve',
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
            try {
                const snapshot = await database.ref(`abvnApplications/rejectedABVN/${uid}`).once('value');
                const vgDataToRetrieve = snapshot.val();

                if (!vgDataToRetrieve) {
                    Swal.fire('Error', 'Archived application data not found for retrieval.', 'error');
                    return;
                }

                const pendingSnapshot = await database.ref('abvnApplications/pendingABVN').once('value');
                const approvedSnapshot = await database.ref('abvnApplications/approvedABVN').once('value');
                let isDuplicate = false;
                let duplicateReason = '';

                if (pendingSnapshot.exists()) {
                    pendingSnapshot.forEach((child) => {
                        const pendingData = child.val();
                        if (pendingData.organizationName.toLowerCase() === vgDataToRetrieve.organizationName.toLowerCase() ||
                            pendingData.email.toLowerCase() === vgDataToRetrieve.email.toLowerCase()) {
                            isDuplicate = true;
                            duplicateReason = pendingData.organizationName.toLowerCase() === vgDataToRetrieve.organizationName.toLowerCase() ? 'organization name' : 'email';
                            return true;
                        }
                    });
                }

                if (!isDuplicate && approvedSnapshot.exists()) {
                    approvedSnapshot.forEach((child) => {
                        const approvedData = child.val();
                        if (approvedData.organizationName.toLowerCase() === vgDataToRetrieve.organizationName.toLowerCase() &&
                            approvedData.email.toLowerCase() === vgDataToRetrieve.email.toLowerCase()) {
                            isDuplicate = true;
                            duplicateReason = 'organization name and email';
                            return true;
                        }
                    });
                }

                if (isDuplicate) {
                    Swal.fire({
                        icon: 'error',
                        title: 'Duplicate Found',
                        html: `An application with this ${duplicateReason} already exists in the pending or approved applications.<br><br>Please check the respective lists before proceeding.`,
                        confirmButtonText: 'OK',
                        allowOutsideClick: false,
                        customClass: {
                            popup: 'swal2-popup-warning-clean',
                            title: 'swal2-title-warning-clean',
                            htmlContainer: 'swal2-text-warning-clean',
                            confirmButton: 'my-warning-button'
                        }
                    });
                    return;
                }

                delete vgDataToRetrieve.rejectedAt;
                vgDataToRetrieve.status = 'Pending';
                await database.ref(`abvnApplications/pendingABVN/${uid}`).set(vgDataToRetrieve);
                await database.ref(`abvnApplications/rejectedABVN/${uid}`).remove();
                Swal.close();
                await fetchPendingApplications();
                await fetchAndRenderArchivedVGs();
                Swal.fire({
                    title: 'Retrieved!',
                    text: 'Volunteer Group has been retrieved to pending applications.',
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
                });
            } catch (error) {
                console.error("Error retrieving VG:", error);
                Swal.fire('Error', 'Failed to retrieve application: ' + error.message, 'error');
            }
        }
    });
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

            const expectedHeaders = Object.keys(columnMap);
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

                record.status = 'Pending';
                record.appliedAt = new Date().toISOString();

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
                    const newAppRef = database.ref('abvnApplications/pendingABVN').push();
                    await newAppRef.set(appData);
                    successCount++;
                } catch (error) {
                    console.error("Error importing application:", appData.organizationName, error);
                    currentErrors.push(error(`Failed to import "${appData.organizationName || 'N/A'}": ${error.message}`));
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
                    customClass: {
                        popup: 'swal2-popup-success-clean',
                        title: 'swal2-title-success-clean',
                        htmlContainer: 'swal2-text-success-clean',
                    }
                }).then(() => {
                    fetchPendingApplications();
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
        Swal.fire("Info", "No data to export!", "info");
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
        "Application Date/Time": app.applicationDateandTime ? new Date(app.applicationDateandTime).toLocaleString() : 'N/A'
    }));

    const ws = XLSX.utils.json_to_sheet(dataForExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Pending ABVN Applications");

    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    const hours = String(today.getHours()).padStart(2, '0');
    const minutes = String(today.getMinutes()).padStart(2, '0');
    const seconds = String(today.getSeconds()).padStart(2, '0');
    const formattedDateTime = `${year}-${month}-${day}_${hours}${minutes}${seconds}`;
    const filename = `pending-abvn-applications_${formattedDateTime}.xlsx`;

    XLSX.writeFile(wb, filename);
    Swal.fire({
        title: 'Export Successful!',
        text: `Volunteer group application details have been exported to Excel "${filename}".`,
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
        doc.text("Pending ABVN Applications Report", 14, yOffset);
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
            "Region", "Province", "City", "Barangay", "Street Address", "Application Date/Time"
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
            app.applicationDateandTime ? new Date(app.applicationDateandTime).toLocaleString() : 'N/A'
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
        const filename = `pending-abvn-applications_${formattedDateTime}.pdf`;

        doc.save(filename);
        Swal.close();
        Swal.fire({
            title: 'Export Successful!',
            text: `Volunteer group application details have been exported to PDF "${filename}".`,
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
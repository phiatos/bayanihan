// === Firebase Setup ===
const firebaseConfig = {
  apiKey: 'AIzaSyDJxMv8GCaMvQT2QBW3CdzA3dV5X_T2KqQ',
  authDomain: 'bayanihan-5ce7e.firebaseapp.com',
  databaseURL: 'https://bayanihan-5ce7e-default-rtdb.asia-southeast1.firebasedatabase.app',
  projectId: 'bayanihan-5ce7e',
  storageBucket: 'bayanihan-5ce7e.appspot.com',
  messagingSenderId: '593123849917',
  appId: '1:593123849917:web:eb85a63a536eeff78ce9d4',
  measurementId: 'G-ZTQ9VXXVV0',
};

// Initialize Firebase
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
} else {
}

const database = firebase.database();
const auth = firebase.auth();

// === Global Variables ===
const INACTIVITY_TIME = 1800000; // 30 minutes
let currentUserAdminPosition = null;
let isAdminVerified = false;
let inactivityTimeout;
let allApplications = [];
let filteredApplications = [];
let currentPage = 1;
const rowsPerPage = 5;
let allArchivedVGData = [];
let currentArchivedVGPage = 1;
const archivedVGRowsPerPage = 5;

// === DOM Elements ===
let excelFileInput;
let importExcelBtn;
let importStatusModal;
let closeImportStatusModalBtn;
let importProgressBar;
let importStatusText;
let importErrorList;

// === Permissions ===
async function checkAdminPermissions() {
  try {
    const user = auth.currentUser;
    if (!user) {
      return { canView: false, canEdit: false, canArchive: false, canRetrieve: false };
    }

    const snapshot = await database.ref(`users/${user.uid}`).once('value');
    const userData = snapshot.val();
    const adminPosition = userData?.adminPosition || null;

    const permissions = {
      canView: false,
      canEdit: false,
      canArchive: false,
      canRetrieve: false,
    };

    if (['Super Admin', 'position-one', 'position-two'].includes(adminPosition)) {
      permissions.canView = true;
      permissions.canEdit = true;
    }

    if (['Super Admin', 'position-one'].includes(adminPosition)) {
      permissions.canArchive = true;
      permissions.canRetrieve = true;
    }

    return permissions;
  } catch (error) {
    return { canView: false, canEdit: false, canArchive: false, canRetrieve: false };
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

  if (!password) {
    isAdminVerified = false;
    showErrorAlert('Verification Failed', 'Invalid admin password.');
    return false;
  }

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

// === Inactivity Detection ===
function resetInactivityTimer() {
  clearTimeout(inactivityTimeout);
  inactivityTimeout = setTimeout(checkInactivity, INACTIVITY_TIME);
}

function checkInactivity() {
  Swal.fire({
    title: 'Are you still there?',
    text: "You've been inactive for a while. Do you want to continue your session or log out?",
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
      cancelButton: 'custom-cancel-btn',
    },
  }).then((result) => {
    if (result.isConfirmed) {
      resetInactivityTimer();
    } else {
      auth
        .signOut()
        .then(() => {
          window.location.href = '../pages/login.html';
        })
        .catch((error) => {
          showErrorAlert('Error', 'Failed to log out. Please try again.');
        });
    }
  });
}

// === Authentication ===
document.addEventListener('DOMContentLoaded', () => {
  // auth.onAuthStateChanged(async (user) => {
  //   if (!user) {
  //     showErrorAlert('Authentication Required', 'Please sign in to access pending applications.', () => {
  //       window.location.href = '../pages/login.html';
  //     });
  //     return;
  //   }

  //   const permissions = await checkAdminPermissions();
  //   if (!permissions.canView) {
  //     showErrorAlert('Access Denied', 'You do not have permission to access this page.', () => {
  //       window.location.href = '../pages/login.html';
  //     });
  //     return;
  //   }

  //   try {
  //     const snapshot = await database.ref(`users/${user.uid}`).once('value');
  //     const userData = snapshot.val();
  //     currentUserAdminPosition = userData?.adminPosition || null;
  //     initializePageFunctions(user.uid);
  //     resetInactivityTimer();
  //   } catch (error) {
  //     currentUserAdminPosition = null;
  //     initializePageFunctions(user.uid);
  //     resetInactivityTimer();
  //   }
  // });
  auth.onAuthStateChanged(async (user) => {
    console.log(`[${new Date().toISOString()}] Auth state changed:`, user ? { uid: user.uid, email: user.email } : 'No user');

    if (!user) {
      showErrorAlert('Authentication Required', 'Please sign in to access pending applications.', () => {
        window.location.href = '../pages/login.html';
      });
      return;
    }

    try {
      // Check password_needs_reset
      const userSnapshot = await database.ref(`users/${user.uid}`).once('value');
      const userData = userSnapshot.val();
      const passwordNeedsReset = userData ? (userData.password_needs_reset || false) : false;

      if (passwordNeedsReset) {
        console.log(`[${new Date().toISOString()}] Password change required for user ${user.uid}. Redirecting to profile page.`);
        Swal.fire({
          icon: 'error',
          title: 'Password Change Required',
          text: 'Please change your password. Redirecting to profile.',
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

      // Proceed with normal flow
      const permissions = await checkAdminPermissions();
      if (!permissions.canView) {
        showErrorAlert('Access Denied', 'You do not have permission to access this page.', () => {
          window.location.href = '../pages/login.html';
        });
        return;
      }

        currentUserAdminPosition = userData?.adminPosition || null;
        initializePageFunctions(user.uid);
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
        window.location.href = '../pages/login.html';
      });
    }
  });

  ['mousemove', 'keydown', 'scroll', 'click'].forEach((eventType) => {
    document.addEventListener(eventType, resetInactivityTimer);
  });
});

// === UI Initialization ===
function initializePageFunctions(userId) {
  // DOM Element References
  const elements = {
    volunteerOrgsContainer: document.getElementById('volunteerOrgsContainer'),
    searchInput: document.getElementById('searchInput'),
    sortSelect: document.getElementById('sortSelect'),
    entriesInfo: document.getElementById('entriesInfo'),
    pagination: document.getElementById('pagination'),
    viewApprovedBtn: document.getElementById('viewApprovedBtn'),
    viewArchivedButton: document.getElementById('viewArchived'),
    exportBtn: document.getElementById('exportBtn'),
    savePdfBtn: document.getElementById('savePdfBtn'),
    previewModal: document.getElementById('previewModal'),
    closeModalBtn: document.getElementById('closeModal'),
    modalContentDiv: document.getElementById('modalContent'),
    archivedModal: document.getElementById('archivedModal'),
    closeArchivedModalBtn: document.getElementById('closeArchivedModalBtn'),
    archivedVGTableBody: document.getElementById('archivedTableBody'),
    archivedEntriesInfo: document.getElementById('archivedEntriesInfo'),
    archivedPaginationContainer: document.getElementById('archivedPagination'),
    downloadTemplateBtn: document.getElementById('downloadTemplateBtn'),
  };

  excelFileInput = document.getElementById('excelFileInput');
  importExcelBtn = document.getElementById('importExcelBtn');
  importStatusModal = document.getElementById('importStatusModal');
  closeImportStatusModalBtn = document.getElementById('closeImportStatusModalBtn');
  importProgressBar = document.getElementById('importProgressBar');
  importStatusText = document.getElementById('importStatusText');
  importErrorList = document.getElementById('importErrorList');

  // Event Listeners
  if (importExcelBtn) {
    importExcelBtn.addEventListener('click', async () => {
      const permissions = await checkAdminPermissions();
      if (!permissions.canEdit) {
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

  if (elements.searchInput) {
    let searchTimeout;
    elements.searchInput.addEventListener('keyup', () => {
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(applySearchAndSort, 300);
    });
  }

  if (elements.sortSelect) {
    elements.sortSelect.addEventListener('change', applySearchAndSort);
  }

  if (elements.closeModalBtn) {
    elements.closeModalBtn.addEventListener('click', hidePreviewModal);
  }

  if (elements.viewArchivedButton) {
    elements.viewArchivedButton.addEventListener('click', async () => {
      const permissions = await checkAdminPermissions();
      if (!permissions.canRetrieve) {
        showAccessDeniedAlert('view archived applications');
        return;
      }
      currentArchivedVGPage = 1;
      fetchAndRenderArchivedVGs();
    });
  }

  if (elements.closeArchivedModalBtn) {
    elements.closeArchivedModalBtn.addEventListener('click', () => {
      elements.archivedModal.style.display = 'none';
    });
  }

  if (elements.viewApprovedBtn) {
    elements.viewApprovedBtn.addEventListener('click', () => {
      window.location.href = '../pages/approvedvg.html';
    });
  }

  if (elements.downloadTemplateBtn) {
    elements.downloadTemplateBtn.addEventListener('click', downloadExcelTemplate);
  }

  window.addEventListener('click', (event) => {
    if (event.target === elements.previewModal) hidePreviewModal();
    if (event.target === elements.archivedModal) elements.archivedModal.style.display = 'none';
    if (event.target === importStatusModal) importStatusModal.style.display = 'none';
  });

  if (elements.exportBtn) {
    elements.exportBtn.addEventListener('click', exportToExcel);
  }

  if (elements.savePdfBtn) {
    elements.savePdfBtn.addEventListener('click', exportToPDF);
  }

  elements.volunteerOrgsContainer.addEventListener('click', handleTableActions);

  // Initial Data Fetch
  fetchPendingApplications();
}

// === Utility Functions ===
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

function showErrorAlert(title, text, callback = null) {
  Swal.fire({
    icon: 'error',
    title,
    text,
    timer: 1600,
    showConfirmButton: false,
    timerProgressBar: true,
    allowOutsideClick: false,
    customClass: {
      popup: 'swal2-popup-error-clean',
      title: 'swal2-title-error-clean',
      htmlContainer: 'swal2-text-error-clean',
    },
  }).then(callback);
}

function showSuccessAlert(title, text, callback = null) {
  Swal.fire({
    title,
    text,
    icon: 'success',
    timer: 1600,
    showConfirmButton: false,
    timerProgressBar: true,
    allowOutsideClick: false,
    customClass: {
      popup: 'swal2-popup-success-clean',
      title: 'swal2-title-success-clean',
      htmlContainer: 'swal2-text-success-clean',
    },
  }).then(callback);
}

// === Data Fetching ===
function fetchPendingApplications() {
  const volunteerOrgsContainer = document.getElementById('volunteerOrgsContainer');
  volunteerOrgsContainer.innerHTML = '<tr><td colspan="13" style="text-align: center;">Loading applications...</td></tr>';

  database.ref('abvnApplications/pendingABVN').on(
    'value',
    (snapshot) => {
      allApplications = [];
      if (snapshot.exists()) {
        snapshot.forEach((childSnapshot) => {
          allApplications.push({ key: childSnapshot.key, ...childSnapshot.val() });
        });
      } else {
      }
      applySearchAndSort();
    },
    (error) => {
      showErrorAlert('Error', 'Failed to load pending applications. Please try again later.');
      volunteerOrgsContainer.innerHTML = '<tr><td colspan="13" style="text-align: center; color: red;">Failed to load data.</td></tr>';
    },
  );
}

async function fetchAndRenderArchivedVGs() {
  const permissions = await checkAdminPermissions();
  if (!permissions.canRetrieve) {
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
    showErrorAlert('Error', `Failed to load archived applications: ${error.message}`);
  }
}

// === Data Rendering ===
function renderApplications(applicationsToRender) {
  const volunteerOrgsContainer = document.getElementById('volunteerOrgsContainer');
  volunteerOrgsContainer.innerHTML = '';

  const startIndex = (currentPage - 1) * rowsPerPage;
  const endIndex = startIndex + rowsPerPage;
  const paginatedApplications = applicationsToRender.slice(startIndex, endIndex);

  if (!paginatedApplications.length) {
    volunteerOrgsContainer.innerHTML = '<tr><td colspan="13" style="text-align: center;">No pending applications found on this page.</td></tr>';
    updateEntriesInfo(0);
    renderPagination(0);
    return;
  }

  let i = startIndex + 1;

  paginatedApplications.forEach((app) => {
    const row = volunteerOrgsContainer.insertRow();
    row.setAttribute('data-key', app.key);

    const formattedTimestamp = app.applicationDateandTime
      ? new Date(app.applicationDateandTime).toLocaleString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        })
      : 'N/A';

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
        <button title="View" class="viewBtn" data-key="${app.key}"><i class='bx bx-show-alt'></i></button>
        <button title="Approve" class="approveBtn" data-key="${app.key}"><i class="bx bx-check-circle"></i></button>
        <button title="Reject" class="rejectBtn" data-key="${app.key}"><i class="bx bx-x-circle"></i></button>
        <button title="Save as PDF" class="saveSinglePdfBtn" data-key="${app.key}"><i class='bx bxs-file-pdf'></i></button>
      </td>
    `;
  });

  updateEntriesInfo(applicationsToRender.length);
  renderPagination(applicationsToRender.length);
}

function renderArchivedVGTable(data) {
  const archivedVGTableBody = document.getElementById('archivedTableBody');
  if (!archivedVGTableBody) {
    return;
  }

  archivedVGTableBody.innerHTML = '';

  const startIndex = (currentArchivedVGPage - 1) * archivedVGRowsPerPage;
  const endIndex = startIndex + archivedVGRowsPerPage;
  const paginatedData = data.slice(startIndex, endIndex);

  if (!paginatedData.length) {
    archivedVGTableBody.innerHTML = '<tr><td colspan="5" style="text-align: center;">No archived volunteer group applications found.</td></tr>';
    updateArchivedEntriesInfo(0);
    renderArchivedPagination(0);
    return;
  }

  paginatedData.forEach((org) => {
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

  document.querySelectorAll('.retrieveBtn').forEach((button) => {
    button.addEventListener('click', (event) => retrieveVG(event.target.dataset.uid));
  });
}

// === Pagination ===
function renderPagination(totalItems) {
  const pagination = document.getElementById('pagination');
  pagination.innerHTML = '';
  const totalPages = Math.ceil(totalItems / rowsPerPage);

  if (!totalPages) {
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

  if (!totalPages) {
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

// === Modal Display ===
function showPreviewModal(applicationData) {
  const modalContentDiv = document.getElementById('modalContent');
  const formattedTimestamp = applicationData.applicationDateandTime
    ? new Date(applicationData.applicationDateandTime).toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      })
    : 'N/A';

  modalContentDiv.innerHTML = `
    <div class="modal-content-inner" style="padding: 20px;">
      <h2>Organization Details:</h2>
      <p><strong>Application Date/Time:</strong> ${formattedTimestamp}</p>
      <p><strong>Organization Name:</strong> ${applicationData.organizationName || 'N/A'}</p>
      <p><strong>Contact Person:</strong> ${applicationData.contactPerson || 'N/A'}</p>
      <p><strong>Email:</strong> ${applicationData.email || 'N/A'}</p>
      <p><strong>Mobile Number:</strong> ${applicationData.mobileNumber || 'N/A'}</p>
      <p><strong>Social Media Link:</strong> ${
        applicationData.socialMediaLink
          ? `<a href="${applicationData.socialMediaLink}" target="_blank" rel="noopener noreferrer">${applicationData.socialMediaLink}</a>`
          : 'N/A'
      }</p>
      <hr>
      <h2>Headquarters Address:</h2>
      <div style="margin-left: 10px;">
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
      <p><strong>Required Documents:</strong> ${
        applicationData.requiredDocumentsLink
          ? `<a href="${applicationData.requiredDocumentsLink}" target="_blank" rel="noopener noreferrer">View Document</a>`
          : 'N/A'
      }</p>
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
  const target = event.target;
  const appKey = target.dataset.key;
  if (!appKey) return;

  const permissions = await checkAdminPermissions();

  if (target.classList.contains('viewBtn')) {
    if (!permissions.canView) {
      showAccessDeniedAlert('view application details');
      return;
    }
    const applicationToView = allApplications.find((app) => app.key === appKey);
    if (applicationToView) {
      showPreviewModal(applicationToView);
    } else {
      showErrorAlert('Error', 'Application details not found.');
    }
  } else if (target.classList.contains('approveBtn')) {
    if (!permissions.canEdit) {
      showAccessDeniedAlert('approve applications');
      return;
    }
    Swal.fire({
      title: 'Are you sure?',
      text: 'Do you want to approve this application?',
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
        cancelButton: 'custom-cancel-btn',
      },
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          const appRef = database.ref(`abvnApplications/pendingABVN/${appKey}`);
          const snapshot = await appRef.once('value');
          const applicationData = snapshot.val();

          if (!applicationData) {
            showErrorAlert('Error', 'Application not found.');
            return;
          }

          const approvedAppsRef = database.ref('abvnApplications/approvedABVN');
          const approvedSnapshot = await approvedAppsRef.once('value');
          let isDuplicate = false;
          let duplicateReason = '';

          if (approvedSnapshot.exists()) {
            approvedSnapshot.forEach((approvedChild) => {
              const approvedData = approvedChild.val();
              const normalizedOrgName = applicationData.organizationName.trim().toLowerCase();
              const normalizedEmail = applicationData.email.trim().toLowerCase();
              const normalizedContactPerson = applicationData.contactPerson.trim().toLowerCase();
              const normalizedMobileNumber = String(applicationData.mobileNumber).trim();
              const normalizedStreetAddress = applicationData.headquarters?.streetAddress ? applicationData.headquarters.streetAddress.trim().toLowerCase() : '';

              if (
                approvedData.organizationName.trim().toLowerCase() === normalizedOrgName ||
                approvedData.email.trim().toLowerCase() === normalizedEmail ||
                approvedData.contactPerson.trim().toLowerCase() === normalizedContactPerson ||
                String(approvedData.mobileNumber).trim() === normalizedMobileNumber ||
                (approvedData.headquarters?.streetAddress && approvedData.headquarters.streetAddress.trim().toLowerCase() === normalizedStreetAddress)
              ) {
                isDuplicate = true;
                if (approvedData.organizationName.trim().toLowerCase() === normalizedOrgName) {
                  duplicateReason = 'organization name';
                } else if (approvedData.email.trim().toLowerCase() === normalizedEmail) {
                  duplicateReason = 'email';
                } else if (approvedData.contactPerson.trim().toLowerCase() === normalizedContactPerson) {
                  duplicateReason = 'contact person';
                } else if (String(approvedData.mobileNumber).trim() === normalizedMobileNumber) {
                  duplicateReason = 'mobile number';
                } else {
                  duplicateReason = 'street address';
                }
                return true;
              }
            });
          }

          if (isDuplicate) {
            Swal.fire({
              icon: 'error',
              title: 'Duplicate Found',
              html: `This application already exists in the Approved Applications.<br><br>Please check the approved list before proceeding.`,
              confirmButtonText: 'OK',
              allowOutsideClick: false,
              customClass: {
                popup: 'swal2-popup-warning-clean',
                title: 'swal2-title-warning-clean',
                htmlContainer: 'swal2-text-warning-clean',
                confirmButton: 'my-warning-button',
              },
            });
            return;
          }

          applicationData.approvedApplicationDate = new Date().toISOString();
          await database.ref(`abvnApplications/approvedABVN/${appKey}`).set(applicationData);
          await appRef.remove();
          showSuccessAlert('Approved!', 'The application has been approved and moved to the approved list.');
        } catch (error) {
          showErrorAlert('Error', `Failed to approve application: ${error.message}`);
        }
      }
    });
  } else if (target.classList.contains('rejectBtn')) {
    if (!permissions.canArchive) {
      showAccessDeniedAlert('reject this application');
      return;
    }

    if (!isAdminVerified) {
      const isVerified = await verifySuperAdminPassword();
      if (!isVerified) return;
    }

    Swal.fire({
      title: 'Are you sure to reject this application?',
      text: 'This will move it to archived records.',
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
        cancelButton: 'custom-cancel-btn',
      },
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          const appRef = database.ref(`abvnApplications/pendingABVN/${appKey}`);
          const snapshot = await appRef.once('value');
          const applicationData = snapshot.val();

          if (!applicationData) {
            showErrorAlert('Error', 'Application not found.');
            return;
          }

          applicationData.rejectedAt = new Date().toISOString();
          applicationData.status = 'Rejected';
          await database.ref(`abvnApplications/rejectedABVN/${appKey}`).set(applicationData);
          await appRef.remove();
          showSuccessAlert('Rejected!', 'The application has been rejected and archived.');
        } catch (error) {
          showErrorAlert('Error', `Failed to reject application: ${error.message}`);
        }
      }
    });
  } else if (target.classList.contains('saveSinglePdfBtn')) {
    const applicationToExport = allApplications.find((app) => app.key === appKey);
    if (applicationToExport) {
      saveSingleApplicationPdf(applicationToExport);
    } else {
      showErrorAlert('Error', 'Application details not found for export.');
    }
  }
}

async function retrieveVG(uid) {
  const permissions = await checkAdminPermissions();
  if (!permissions.canRetrieve) {
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
      cancelButton: 'custom-cancel-btn',
    },
  }).then(async (result) => {
    if (result.isConfirmed) {
      try {
        const snapshot = await database.ref(`abvnApplications/rejectedABVN/${uid}`).once('value');
        const vgDataToRetrieve = snapshot.val();

        if (!vgDataToRetrieve) {
          showErrorAlert('Error', 'Archived application data not found for retrieval.');
          return;
        }

        const pendingSnapshot = await database.ref('abvnApplications/pendingABVN').once('value');
        const approvedSnapshot = await database.ref('abvnApplications/approvedABVN').once('value');
        let isDuplicate = false;
        let duplicateReason = '';

        if (pendingSnapshot.exists()) {
          pendingSnapshot.forEach((child) => {
            const pendingData = child.val();
            if (
              pendingData.organizationName.toLowerCase() === vgDataToRetrieve.organizationName.toLowerCase() ||
              pendingData.email.toLowerCase() === vgDataToRetrieve.email.toLowerCase()
            ) {
              isDuplicate = true;
              duplicateReason =
                pendingData.organizationName.toLowerCase() === vgDataToRetrieve.organizationName.toLowerCase() ? 'organization name' : 'email';
              return true;
            }
          });
        }

        if (!isDuplicate && approvedSnapshot.exists()) {
          approvedSnapshot.forEach((child) => {
            const approvedData = child.val();
            if (
              approvedData.organizationName.toLowerCase() === vgDataToRetrieve.organizationName.toLowerCase() &&
              approvedData.email.toLowerCase() === vgDataToRetrieve.email.toLowerCase()
            ) {
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
              confirmButton: 'my-warning-button',
            },
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
        showSuccessAlert('Retrieved!', 'Volunteer Group has been retrieved to pending applications.');
      } catch (error) {
        showErrorAlert('Error', `Failed to retrieve application: ${error.message}`);
      }
    }
  });
}

// === Excel Import ===
function validateExcelRow(row, headers, columnMap, existingRecords) {
  const record = {};
  const rowErrors = [];
  let isValidRecord = true;

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

  const isEmpty = (value) => value === undefined || value === null || value.toString().trim() === '';
  const isLettersOnly = (value) => /^[a-zA-Z\s]+$/.test(value);
  const isValidEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const validDomains = ['gmail.com'];
    const domain = email?.split('@')[1]?.toLowerCase();
    return emailRegex.test(email) && validDomains.includes(domain);
  };
  const isValidMobile = (mobile) => /^09\d{9}$/.test(mobile);
  const isValidUrl = (url) => {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  };

  const fieldsToCheck = [
    { key: 'organizationName', label: 'Organization Name', lettersOnly: true },
    { key: 'contactPerson', label: 'Contact Person', lettersOnly: true },
    { key: 'email', label: 'Email', isEmail: true },
    { key: 'mobileNumber', label: 'Mobile Number', isMobile: true },
    { key: 'socialMediaLink', label: 'Social Media', isUrl: true, required: false },
    { key: 'headquarters.streetAddress', label: 'Street Address' },
    { key: 'headquarters.region', label: 'Region' },
    { key: 'headquarters.province', label: 'Province' },
    { key: 'headquarters.city', label: 'City' },
    { key: 'headquarters.barangay', label: 'Barangay' },
    { key: 'organizationalBackgroundMission', label: 'Organizational Background/Mission', minLength: 20 },
    { key: 'areasOfExpertiseFocus', label: 'Areas of Expertise/Focus', minLength: 20 },
    { key: 'legalStatusRegistration', label: 'Legal Status/Registration' },
    { key: 'requiredDocumentsLink', label: 'Required Documents Link', isUrl: true },
  ];

  fieldsToCheck.forEach(({ key, label, lettersOnly, isEmail, isMobile, isUrl, required = true, minLength }) => {
    let value = key.includes('.') ? record[key.split('.')[0]]?.[key.split('.')[1]] : record[key];
    value = value?.toString().trim();

    if (required && isEmpty(value)) {
      isValidRecord = false;
      rowErrors.push(`${label} is required`);
    } else if (!isEmpty(value)) {
      if (lettersOnly && !isLettersOnly(value)) {
        isValidRecord = false;
        rowErrors.push(`${label} should only contain letters and spaces`);
      }
      if (isEmail && !isValidEmail(value)) {
        isValidRecord = false;
        rowErrors.push(`Please enter a valid Gmail address for ${label} (e.g., example@gmail.com)`);
      }
      if (isMobile && !isValidMobile(value)) {
        isValidRecord = false;
        rowErrors.push(`${label} must be 11 digits starting with "09"`);
      }
      if (isUrl && !isValidUrl(value)) {
        isValidRecord = false;
        rowErrors.push(`${label} must be a valid URL (e.g., https://facebook.com/yourpage)`);
      }
      if (minLength && value.length < minLength) {
        isValidRecord = false;
        rowErrors.push(`${label} must be at least ${minLength} characters long`);
      }
    }
  });

  const orgNameLower = record.organizationName ? record.organizationName.trim().toLowerCase() : '';
  const emailLower = record.email ? record.email.trim().toLowerCase() : '';
  const contactPersonLower = record.contactPerson ? record.contactPerson.trim().toLowerCase() : '';
  const mobileNumber = record.mobileNumber ? String(record.mobileNumber).trim() : '';
  const streetAddressLower = record.headquarters?.streetAddress ? record.headquarters.streetAddress.trim().toLowerCase() : '';

  if (orgNameLower && existingRecords.has(`org:${orgNameLower}`)) {
    isValidRecord = false;
    rowErrors.push('Duplicate Organization Name');
  }
  if (emailLower && existingRecords.has(`email:${emailLower}`)) {
    isValidRecord = false;
    rowErrors.push('Duplicate Email');
  }
  if (contactPersonLower && existingRecords.has(`contact:${contactPersonLower}`)) {
    isValidRecord = false;
    rowErrors.push('Duplicate Contact Person');
  }
  if (mobileNumber && existingRecords.has(`mobile:${mobileNumber}`)) {
    isValidRecord = false;
    rowErrors.push('Duplicate Mobile Number');
  }
  if (streetAddressLower && existingRecords.has(`address:${streetAddressLower}`)) {
    isValidRecord = false;
    rowErrors.push('Duplicate Street Address');
  }

  record.applicationDateandTime = new Date().toISOString();
  record.status = 'Pending';
  record.appliedAt = new Date().toISOString();
  record.recaptchaResponse = 'N/A'; 

  return { record, isValidRecord, rowErrors };
}

async function handleExcelFileSelect(event) {
  const file = event.target.files[0];
  if (!file) return;

  const permissions = await checkAdminPermissions();
  if (!permissions.canEdit) {
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

      if (!jsonData.length) {
        throw new Error('The Excel file is empty or could not be read.');
      }

      const headers = jsonData[0];
      const rows = jsonData.slice(1);
      const columnMap = {
        'Areas of Expertise/Focus': 'areasOfExpertiseFocus',
        'Contact Person': 'contactPerson',
        'Email': 'email',
        'Barangay': 'headquarters.barangay',
        'City': 'headquarters.city',
        'Province': 'headquarters.province',
        'Region': 'headquarters.region',
        'Street Address': 'headquarters.streetAddress',
        'Legal Status/Registration': 'legalStatusRegistration',
        'Mobile Number': 'mobileNumber',
        'Organization Name': 'organizationName',
        'Organizational Background/Mission': 'organizationalBackgroundMission',
        'Required Documents Link': 'requiredDocumentsLink',
        'Social Media': 'socialMediaLink',
      };

      if (!rows.length) {
        Swal.fire({
          icon: 'info',
          title: 'No Data',
          text: 'The Excel file contains headers but no data rows.',
          confirmButtonText: 'OK',
          allowOutsideClick: false,
          customClass: {
            popup: 'swal2-popup-warning-clean',
            title: 'swal2-title-warning-clean',
            htmlContainer: 'swal2-text-warning-clean',
            confirmButton: 'my-warning-button',
          },
        });
        importStatusModal.style.display = 'none';
        return;
      }

      importStatusText.textContent = `Validating and preparing ${rows.length} records...`;

      // Fetch existing records for duplicate checking
      const snapshots = await Promise.all([
        database.ref('abvnApplications/pendingABVN').once('value'),
        database.ref('abvnApplications/approvedABVN').once('value'),
        database.ref('abvnApplications/rejectedABVN').once('value'),
      ]);

      const existingRecords = new Set();
      snapshots.forEach((snapshot) => {
        if (snapshot.exists()) {
          snapshot.forEach((child) => {
            const data = child.val();
            if (data.organizationName) existingRecords.add(`org:${data.organizationName.trim().toLowerCase()}`);
            if (data.email) existingRecords.add(`email:${data.email.trim().toLowerCase()}`);
            if (data.contactPerson) existingRecords.add(`contact:${data.contactPerson.trim().toLowerCase()}`);
            if (data.mobileNumber) existingRecords.add(`mobile:${String(data.mobileNumber).trim()}`);
            if (data.headquarters?.streetAddress) existingRecords.add(`address:${data.headquarters.streetAddress.trim().toLowerCase()}`);
          });
        }
      });

      const mappedData = [];
      const importErrors = [];
      let processedCount = 0;

      for (let i = 0; i < rows.length; i++) {
        const { record, isValidRecord, rowErrors } = validateExcelRow(rows[i], headers, columnMap, existingRecords);
        if (isValidRecord) {
          mappedData.push(record);
        } else {
          importErrors.push(`Row ${i + 2} (${record.organizationName || 'N/A'}): ${rowErrors.join(', ')}`);
        }
      }

      if (!mappedData.length) {
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
            confirmButton: 'my-warning-button',
          },
        });
        importErrorList.innerHTML = importErrors.map((err) => `<li>${err}</li>`).join('');
        importProgressBar.style.backgroundColor = '#f44336';
        return;
      }

      importStatusText.textContent = `Importing ${mappedData.length} valid records to Firebase...`;

      let successCount = 0;
      const currentErrors = [];

      for (const appData of mappedData) {
        try {
          const newAppRef = database.ref('abvnApplications/pendingABVN').push();
          await newAppRef.set(appData);
          successCount++;
        } catch (error) {
          currentErrors.push(`Failed to import "${appData.organizationName || 'N/A'}": ${error.message}`);
        }
        processedCount++;
        const progress = Math.round((processedCount / rows.length) * 100);
        importProgressBar.style.width = `${progress}%`;
        importProgressBar.textContent = `${progress}%`;
        importStatusText.textContent = `Processing ${processedCount}/${rows.length} records...`;
      }

      importErrorList.innerHTML = importErrors.concat(currentErrors).map((err) => `<li>${err}</li>`).join('');
      if (successCount > 0) {
        showSuccessAlert(
          'Import Complete!',
          `Successfully imported ${successCount} new applications. ${
            importErrors.length + currentErrors.length > 0
              ? `<br><br><strong>${importErrors.length + currentErrors.length} issues occurred (including duplicates). Check the status modal for details.</strong>`
              : ''
          }`,
          () => {
            fetchPendingApplications();
            importStatusModal.style.display = 'none';
          },
        );
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
            confirmButton: 'my-warning-button',
          },
        });
      }
    } catch (error) {
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
          confirmButton: 'my-error-button',
        },
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

// === Excel Template Download ===
function downloadExcelTemplate() {
  const templateData = [
    [
      'Organization Name',
      'Contact Person',
      'Email',
      'Mobile Number',
      'Social Media',
      'Region',
      'Province',
      'City',
      'Barangay',
      'Street Address',
      'Organizational Background/Mission',
      'Areas of Expertise/Focus',
      'Legal Status/Registration',
      'Required Documents Link',
    ],
    // Example row aligned with validation rules
    [
      'Example Organization', 
      'John Doe',
      'example@gmail.com', 
      '09123456789', 
      'https://facebook.com/exampleorg', 
      'NCR',
      'Metro Manila',
      'Quezon City',
      'Barangay Example',
      '123 Example Street',
      'Promoting education and community development through innovative programs and partnerships.', 
      'Education and Community Development Programs', 
      'Registered Non-Profit',
      'https://drive.google.com/file/d/example', 
    ],
  ];

  const ws = XLSX.utils.aoa_to_sheet(templateData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Template');
  XLSX.writeFile(wb, 'pending_abvn_application_template.xlsx');
  showSuccessAlert('Template Downloaded!', 'Excel template has been downloaded successfully.');
}

// === Export to Excel ===
function exportToExcel() {
  if (!filteredApplications.length) {
    Swal.fire('Info', 'No data to export!', 'info');
    return;
  }

  const dataForExport = filteredApplications.map((app, i) => ({
    'No.': i + 1,
    'Organization Name': app.organizationName || 'N/A',
    'Contact Person': app.contactPerson || 'N/A',
    'Email': app.email || 'N/A',
    'Mobile Number': String(app.mobileNumber || 'N/A'),
    'Social Media': app.socialMediaLink || 'N/A',
    'Region': app.headquarters?.region || 'N/A',
    'Province': app.headquarters?.province || 'N/A',
    'City': app.headquarters?.city || 'N/A',
    'Barangay': app.headquarters?.barangay || 'N/A',
    'Street Address': app.headquarters?.streetAddress || 'N/A',
    'Application Date/Time': app.applicationDateandTime ? new Date(app.applicationDateandTime).toLocaleString() : 'N/A',
    'Areas of Expertise/Focus': app.areasOfExpertiseFocus || 'N/A',
    'Legal Status/Registration': app.legalStatusRegistration || 'N/A',
    'Organizational Background/Mission': app.organizationalBackgroundMission || 'N/A',
    'Required Documents Link': app.requiredDocumentsLink || 'N/A',
  }));

  const ws = XLSX.utils.json_to_sheet(dataForExport);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Pending ABVN Applications');

  const now = new Date();
  const formattedDateTime = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}_${String(
    now.getHours(),
  ).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}`;
  const filename = `pending-abvn-applications_${formattedDateTime}.xlsx`;

  XLSX.writeFile(wb, filename);
  Swal.fire({
    title: 'Export Successful!',
    text: `Volunteer group application details have been exported to Excel "${filename}".`,
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

// === Export to PDF ===
function exportToPDF() {
  if (!filteredApplications.length) {
    Swal.fire('Info', 'No data to export to PDF!', 'info');
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
    doc.text('Pending ABVN Applications Report', margin, yOffset);
    yOffset += 12;
    doc.setFontSize(10);
    const now = new Date();
    doc.text(`Report Generated: ${now.toLocaleString('en-US', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true, timeZone: 'Asia/Manila' })} (PHT)`, margin, yOffset);
    yOffset += 15;

    const head = [['No.', 'Organization Name', 'Contact Person', 'Email', 'Mobile Number', 'Social Media', 'Region', 'Province', 'City', 'Barangay', 'Street Address', 'Application Date/Time', 'Areas of Expertise/Focus', 'Legal Status/Registration', 'Organizational Background/Mission', 'Required Documents Link']];
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
      app.areasOfExpertiseFocus || 'N/A',
      app.legalStatusRegistration || 'N/A',
      app.organizationalBackgroundMission ? app.organizationalBackgroundMission.substring(0, 100) + (app.organizationalBackgroundMission.length > 100 ? '...' : '') : 'N/A',
      app.requiredDocumentsLink || 'N/A',
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
        3: { cellWidth: 20 }, // Email
        4: { cellWidth: 20 }, // Mobile Number
        5: { cellWidth: 20 }, // Social Media
        6: { cellWidth: 15 }, // Region
        7: { cellWidth: 15 }, // Province
        8: { cellWidth: 15 }, // City
        9: { cellWidth: 15 }, // Barangay
        10: { cellWidth: 15 }, // Street Address
        11: { cellWidth: 15 }, // Application Date/Time
        12: { cellWidth: 20 }, // Areas of Expertise/Focus
        13: { cellWidth: 20 }, // Legal Status/Registration
        14: { cellWidth: 20 }, // Organizational Background/Mission
        15: { cellWidth: 20 }, // Required Documents Link
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
    const filename = `pending-abvn-applications_${formattedDateTime}.pdf`;

    doc.save(filename);
    Swal.close();
    Swal.fire({
      title: 'Export Successful!',
      text: `Volunteer group application details have been exported to PDF "${filename}".`,
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

// === Single PDF Export ===
function saveSingleApplicationPdf(application) {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  const logo = new Image();
  logo.src = '../assets/images/AB_logo.png';

  logo.onload = () => {
    const pageWidth = doc.internal.pageSize.width;
    const pageHeight = doc.internal.pageSize.height;
    const logoWidth = 30;
    const logoHeight = (logo.naturalHeight / logo.naturalWidth) * logoWidth;
    const margin = 14;
    const maxTextWidth = pageWidth - 2 * margin;

    doc.addImage(logo, 'PNG', pageWidth - logoWidth - margin, margin, logoWidth, logoHeight);
    doc.setFontSize(18);
    doc.text('Volunteer Group Application Details', 14, 22);
    doc.setFontSize(10);
    doc.text(`Report Generated: ${new Date().toLocaleString('en-US', { timeZone: 'Asia/Manila' })}`, 14, 30);
    let y = 45;

    const addDetail = (label, value) => {
      const text = `${label}: ${value || 'N/A'}`;
      const textLines = doc.splitTextToSize(text, maxTextWidth);
      textLines.forEach((line) => {
        if (y + 7 > pageHeight - 20) {
          doc.addPage();
          y = 20;
          doc.addImage(logo, 'PNG', pageWidth - logoWidth - margin, margin, logoWidth, logoHeight);
          doc.setFontSize(18);
          doc.text('Volunteer Group Application Details (Continued)', 14, 22);
          doc.setFontSize(10);
        }
        doc.text(line, 14, y);
        y += 7;
      });
      return y;
    };

    y = addDetail('Organization Name', application.organizationName);
    y = addDetail('Contact Person', application.contactPerson);
    y = addDetail('Email', application.email);
    y = addDetail('Mobile Number', String(application.mobileNumber));
    y = addDetail('Social Media Link', application.socialMediaLink);
    y = addDetail('Region', application.headquarters?.region);
    y = addDetail('Province', application.headquarters?.province);
    y = addDetail('City', application.headquarters?.city);
    y = addDetail('Barangay', application.headquarters?.barangay);
    y = addDetail('Street Address', application.headquarters?.streetAddress);
    y = addDetail(
      'Application Date/Time',
      application.applicationDateandTime
        ? new Date(application.applicationDateandTime).toLocaleString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
          })
        : 'N/A',
    );
    y = addDetail('Areas of Expertise/Focus', application.areasOfExpertiseFocus);
    y = addDetail('Legal Status/Registration', application.legalStatusRegistration);
    y = addDetail('Organizational Background/Mission', application.organizationalBackgroundMission);
    y = addDetail('Required Documents Link', application.requiredDocumentsLink);

    doc.setFontSize(8);
    const footerY = doc.internal.pageSize.height - 10;
    const pageNumberText = `Page ${doc.internal.getNumberOfPages()} of ${doc.internal.getNumberOfPages()}`;
    const poweredByText = 'Powered by: Appvance';

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

  logo.onerror = () => {
    showErrorAlert('Error', "Failed to load logo image. Please check the path: '../assets/images/AB_logo.png'");
  };
}

// === Input Clearing ===
function clearDInputs() {
  const searchInput = document.getElementById('searchInput');
  if (searchInput) {
    searchInput.value = '';
    if (typeof applySearchAndSort === 'function') {
      applySearchAndSort();
    } 
  }
}
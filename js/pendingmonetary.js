if (typeof firebase === 'undefined') {
    console.error('Firebase SDK not loaded. Please check HTML script tags.');
    Swal.fire('Error', 'Firebase SDK failed to load. Please check your network or script tags.', 'error');
}

// Firebase configuration and initialization
// const firebaseConfig = {
//     apiKey: "AIzaSyDJxMv8GCaMvQT2QBW3CdzA3dV5X_T2KqQ",
//     authDomain: "bayanihan-5ce7e.firebaseapp.com",
//     databaseURL: "https://bayanihan-5ce7e-default-rtdb.asia-southeast1.firebasedatabase.app",
//     projectId: "bayanihan-5ce7e",
//     storageBucket: "bayanihan-5ce7e.appspot.com",
//     messagingSenderId: "593123849917",
//     appId: "1:593123849917:web:eb85a63a536eeff78ce9d4",
//     measurementId: "G-ZTQ9VXXVV0"
// };
const firebaseConfig = {
  apiKey: "AIzaSyBkmXOJvnlBtzkjNyR6wyd9BgGM0BhN0L8",
  authDomain: "bayanihan-new-472410.firebaseapp.com",
  projectId: "bayanihan-new-472410",
  storageBucket: "bayanihan-new-472410.firebasestorage.app",
  messagingSenderId: "995982574131",
  appId: "1:995982574131:web:3d45e358fad330c276d946",
  measurementId: "G-CEVPTQZM9C",
  databaseURL: "https://bayanihan-new-472410-default-rtdb.asia-southeast1.firebasedatabase.app/"
};

// Initialize Firebase only if it hasn't been initialized yet
if (typeof firebase !== 'undefined' && !firebase.apps.length) {
    try {
        firebase.initializeApp(firebaseConfig);
        console.log('Firebase initialized successfully');
    } catch (error) {
        console.error('Failed to initialize Firebase:', error);
        Swal.fire('Error', `Failed to initialize Firebase: ${error.message}`, 'error');
    }
} else if (typeof firebase !== 'undefined') {
    firebase.app();
}

const database = typeof firebase !== 'undefined' && firebase.database ? firebase.database() : null;
let auth;
if (typeof firebase !== 'undefined' && firebase.auth) {
    try {
        auth = firebase.auth();
        console.log('Firebase Auth initialized');
    } catch (error) {
        console.error('Failed to initialize Firebase Auth:', error);
        auth = null;
    }
} else {
    console.error('Firebase Auth SDK not available');
    auth = null;
}

// Variables for inactivity detection
let inactivityTimeout;
const INACTIVITY_TIME = 1800000; // 30 minutes in milliseconds

// Function to reset the inactivity timer
function resetInactivityTimer() {
    if (!auth) return;
    clearTimeout(inactivityTimeout);
    inactivityTimeout = setTimeout(checkInactivity, INACTIVITY_TIME);
    console.log("Inactivity timer reset.");
}

// Function to check for inactivity and prompt the user
function checkInactivity() {
    if (!auth) return;
    Swal.fire({
        title: 'Are you still there?',
        text: 'You\'ve been inactive for a while. Do you want to continue your session or log out?',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#3085d6',
        cancelButtonColor: '#d33',
        confirmButtonText: 'Stay Login',
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

// Attach event listeners to detect user activity
if (auth) {
    ['mousemove', 'keydown', 'scroll', 'click'].forEach(eventType => {
        document.addEventListener(eventType, resetInactivityTimer);
    });
}

// Global variables for managing donations and UI state
let allMonetaryDonations = [];
let filteredMonetaryDonations = {
    Individual: [],
    Anonymous: [],
    Corporate: [],
    Foundation: []
};
let currentPage = {
    Individual: 1,
    Anonymous: 1,
    Corporate: 1,
    Foundation: 1
};
const rowsPerPage = 10;

// Get references to DOM elements
const donorTypeButtons = {
    individual: document.getElementById('individualBtn'),
    anonymous: document.getElementById('anonymousBtn'),
    corporate: document.getElementById('corporateBtn'),
    foundation: document.getElementById('foundationBtn'),
};
const tableBodies = {
    individual: document.querySelector('#individualTable tbody'),
    anonymous: document.querySelector('#anonymousTable tbody'),
    corporate: document.querySelector('#corporateTable tbody'),
    foundation: document.querySelector('#foundationTable tbody'),
};
const tableContainers = {
    individual: document.getElementById('individualTableContainer'),
    anonymous: document.getElementById('anonymousTableContainer'),
    corporate: document.getElementById('corporateTableContainer'),
    foundation: document.getElementById('foundationTableContainer'),
};

document.querySelectorAll('.tab-button').forEach(button => {
    button.addEventListener('click', () => {
        console.log(`Tab button clicked: ${button.getAttribute('data-tab')}`);
        document.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
        button.classList.add('active');
        const tabType = button.getAttribute('data-tab');
        updateArchivedTableData(tabType);
    });
});

const searchInput = document.getElementById('searchInput');
const sortSelect = document.getElementById('sortSelect');
const entriesInfo = document.getElementById('entriesInfo');
const paginationDiv = document.getElementById('pagination');
const viewApprovedBtn = document.getElementById('viewApprovedBtn');

// Variables for archived donations and modal state
let allArchivedDonations = [];
let filteredArchivedDonations = [];
let archivedCurrentPage = 1;
const archivedRowsPerPage = 10;
let permissions = { canView: false, canEdit: false, canArchive: false, canRetrieve: false };
let currentDonorType = 'individual'; // Default donor type

// Debug function to log data at each step
function debugLog(step, data) {
    console.log(`DEBUG [${step}] [${new Date().toISOString()}]:`, data);
}

// Function to load pending monetary donations from Firebase
function loadMonetaryDonationsFromFirebase() {
    if (!database) {
        console.error('Firebase Database not available');
        Swal.fire('Error', 'Cannot connect to Firebase Database. Please check Firebase setup.', 'error');
        Object.values(tableBodies).forEach(body => {
            if (body) {
                body.innerHTML = '<tr><td colspan="12" style="text-align: center; padding: 20px; color: red;">Firebase Database not available.</td></tr>';
            }
        });
        entriesInfo.textContent = 'Showing 0 to 0 of 0 entries';
        paginationDiv.innerHTML = '';
        return;
    }

    console.log('loadMonetaryDonationsFromFirebase called.');
    const monetaryDonationsRef = database.ref('donations/pending/monetary');

    monetaryDonationsRef.on('value', (snapshot) => {
        console.log('Firebase snapshot received for monetary donations');
        const donationsObject = snapshot.val();
        allMonetaryDonations = [];

        if (donationsObject) {
            for (let key in donationsObject) {
                if (donationsObject.hasOwnProperty(key) && key !== 'archivedMonetary') {
                    const donation = donationsObject[key];
                    // Validate and normalize type
                    const validTypes = ['Individual', 'Anonymous', 'Corporate', 'Foundation'];
                    donation.type = validTypes.includes(donation.type) ? donation.type : 'Individual';
                    if (!validTypes.includes(donation.type)) {
                        console.warn(`Invalid type for donation ${key}: ${donation.type}, defaulting to Individual`);
                    }
                    allMonetaryDonations.push({ id: key, ...donation });
                }
            }
        } else {
            console.log('No pending monetary donations found in Firebase at donations/pending/monetary');
        }
        debugLog('Loaded monetary donations', allMonetaryDonations);

        applyFiltersAndSort();
    }, (error) => {
        console.error("Error fetching monetary donations:", error);
        Swal.fire('Error', `Failed to load monetary donations. Error: ${error.message}`, 'error');
        Object.values(tableBodies).forEach(body => {
            if (body) {
                body.innerHTML = '<tr><td colspan="12" style="text-align: center; padding: 20px; color: red;">Failed to load monetary donations.</td></tr>';
            }
        });
        entriesInfo.textContent = 'Showing 0 to 0 of 0 entries';
        paginationDiv.innerHTML = '';
    });
}

// Function to apply search filters and sorting, then re-render the table
function applyFiltersAndSort() {
    console.log('applyFiltersAndSort called.');
    filteredMonetaryDonations = {
        Individual: [],
        Anonymous: [],
        Corporate: [],
        Foundation: []
    };

    // Filter by donor type
    allMonetaryDonations.forEach(donation => {
        if (filteredMonetaryDonations[donation.type]) {
            filteredMonetaryDonations[donation.type].push(donation);
        } else {
            console.warn(`Unexpected donor type: ${donation.type}, assigning to Individual`);
            filteredMonetaryDonations.Individual.push(donation);
        }
    });
    debugLog('After type filtering', filteredMonetaryDonations);

    // Apply search filter
    const searchTerm = searchInput ? searchInput.value.toLowerCase() : '';
    if (searchTerm) {
        Object.keys(filteredMonetaryDonations).forEach(type => {
            filteredMonetaryDonations[type] = filteredMonetaryDonations[type].filter(donation =>
                (donation.name && String(donation.name).toLowerCase().includes(searchTerm)) ||
                (donation.email && String(donation.email).toLowerCase().includes(searchTerm)) ||
                (donation.bank && String(donation.bank).toLowerCase().includes(searchTerm)) ||
                (donation.donationNote && String(donation.donationNote).toLowerCase().includes(searchTerm))
            );
        });
    }
    debugLog('After search filter', filteredMonetaryDonations);

    // Apply sorting with urgentNeed prioritization
    const sortValue = sortSelect ? sortSelect.value : '';
    Object.keys(filteredMonetaryDonations).forEach(type => {
        filteredMonetaryDonations[type].sort((a, b) => {
            // Prioritize urgentNeed
            if (a.urgentNeed === true && b.urgentNeed !== true) return -1;
            if (b.urgentNeed === true && a.urgentNeed !== true) return 1;

            if (!sortValue || sortValue.startsWith('type-')) return 0;

            const [field, order] = sortValue.split('-');
            let valA, valB;
            if (field === 'amountDonated') {
                valA = parseFloat(a.amount || 0);
                valB = parseFloat(b.amount || 0);
                return order === 'asc' ? valA - valB : valB - valA;
            } else if (field === 'donationDate') {
                valA = a.donationDate ? new Date(a.donationDate).getTime() : 0;
                valB = b.donationDate ? new Date(b.donationDate).getTime() : 0;
                return order === 'asc' ? valA - valB : valB - valA;
            } else {
                valA = a[field] ? String(a[field]).toLowerCase() : '';
                valB = b[field] ? String(b[field]).toLowerCase() : '';
                return order === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
            }
        });
    });
    debugLog('After sort', filteredMonetaryDonations);

    renderTable();
}

// Event listeners for search input and sort select
if (searchInput) {
    searchInput.addEventListener('input', () => {
        console.log('Search input changed:', searchInput.value);
        applyFiltersAndSort();
    });
}
if (sortSelect) {
    sortSelect.addEventListener('change', () => {
        console.log('Sort select changed:', sortSelect.value);
        applyFiltersAndSort();
    });
}

// Event listeners for donor type buttons
Object.keys(donorTypeButtons).forEach(key => {
    if (donorTypeButtons[key]) {
        donorTypeButtons[key].addEventListener('click', () => {
            console.log(`Donor type button clicked: ${key}`);
            Object.keys(tableContainers).forEach(containerKey => {
                tableContainers[containerKey].style.display = 'none';
                donorTypeButtons[containerKey].classList.remove('active');
            });
            tableContainers[key].style.display = 'block';
            donorTypeButtons[key].classList.add('active');
            activeDonorType = key.charAt(0).toUpperCase() + key.slice(1);
            currentPage[activeDonorType] = 1;
            renderTable();
            renderPagination();
        });
    } else {
        console.error(`Donor type button '${key}' not found`);
    }
});

// Function to show donation details in modal
function showViewModal(donation) {
    const modalContentDiv = document.getElementById('modalContent');
    const previewModal = document.getElementById('previewModal');
    if (!previewModal || !modalContentDiv) {
        console.error('Preview modal or modal content not found');
        Swal.fire({
            title: 'Error',
            text: 'Modal not found. Please check the page setup.',
            icon: 'error',
            customClass: {
                popup: 'swal2-popup-error-clean',
                title: 'swal2-title-error-clean',
                htmlContainer: 'swal2-text-error-clean'
            }
        });
        return;
    }

    const formattedTimestamp = donation.createdAt ? new Date(donation.createdAt).toLocaleString('en-PH', {
        year: 'numeric', month: 'short', day: 'numeric',
        hour: '2-digit', minute: '2-digit', second: '2-digit'
    }) : 'N/A';

    let modalHTML = `
        <div class="modal-content-inner" style="padding: 20px;">
            <h2>Donor Information:</h2>
            <p><strong>Encoder:</strong> ${donation.encoder || 'N/A'}</p>
            <p><strong>Donor Type:</strong> ${donation.type || 'N/A'}</p>
    `;

    if (donation.type === 'Individual') {
        modalHTML += `
            <p><strong>Full Name:</strong> ${donation.name || 'N/A'}</p>
            <p><strong>Mobile Number:</strong> ${donation.number || 'N/A'}</p>
            <p><strong>Email:</strong> ${donation.email || 'N/A'}</p>
        `;
    } else if (donation.type === 'Anonymous') {
        modalHTML += `
            <p><strong>Mobile Number:</strong> ${donation.number || 'N/A'}</p>
            <p><strong>Email:</strong> ${donation.email || 'N/A'}</p>
            <p><strong>Donation Note:</strong> ${donation.donationNote || 'N/A'}</p>
        `;
    } else if (donation.type === 'Corporate') {
        modalHTML += `
            <p><strong>Company Name:</strong> ${donation.name || 'N/A'}</p>
            <p><strong>Contact Person:</strong> ${donation.contactPerson || 'N/A'}</p>
            <p><strong>Mobile Number:</strong> ${donation.number || 'N/A'}</p>
            <p><strong>Email:</strong> ${donation.email || 'N/A'}</p>
        `;
    } else if (donation.type === 'Foundation') {
        modalHTML += `
            <p><strong>Foundation Name:</strong> ${donation.name || 'N/A'}</p>
            <p><strong>Contact Person:</strong> ${donation.contactPerson || 'N/A'}</p>
            <p><strong>Mobile Number:</strong> ${donation.number || 'N/A'}</p>
            <p><strong>Email:</strong> ${donation.email || 'N/A'}</p>
        `;
    }

    modalHTML += `
            <hr>
            <h2>Transaction Details:</h2>
            <p><strong>Amount Donated:</strong> ₱${parseFloat(donation.amount || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
            <p><strong>Cash Invoice #:</strong> ${donation.invoice || 'N/A'}</p>
            <p><strong>Date Received:</strong> ${donation.donationDate ? new Date(donation.donationDate).toLocaleDateString('en-PH') : 'N/A'}</p>
            <p><strong>Bank or E-Wallet:</strong> ${donation.bank || 'N/A'}</p>
            <p><strong>Reference Number:</strong> ${donation.referenceNumber || 'N/A'}</p>
            <p><strong>Proof of Transaction:</strong> ${donation.proofUrl ? `<a href="${donation.proofUrl}" target="_blank" rel="noopener noreferrer">View Proof</a>` : 'No file selected'}</p>
            <p><strong>Created On:</strong> ${formattedTimestamp}</p>
            <p><strong>Urgent Need:</strong> ${donation.urgentNeed ? 'Yes' : 'No'}</p>
            ${donation.rejectedAt ? `<p><strong>Rejected At:</strong> ${new Date(donation.rejectedAt).toLocaleString('en-PH', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' })}</p>` : ''}
        </div>
    `;

    modalContentDiv.innerHTML = modalHTML;
    previewModal.style.display = 'flex';
}

// Function to hide the preview modal
function hideViewModal() {
    const previewModal = document.getElementById('previewModal');
    if (previewModal && document.getElementById('modalContent')) {
        previewModal.style.display = 'none';
        document.getElementById('modalContent').innerHTML = '';
    }
}

// Function to render the donation table rows for the current page
function renderTable() {
    console.log('renderTable called.');
    Object.keys(tableBodies).forEach(type => {
        const tbody = tableBodies[type];
        if (!tbody) {
            console.error(`ERROR: '${type}TableBody' element not found.`);
            return;
        }
        tbody.innerHTML = '';
        const donorType = type.charAt(0).toUpperCase() + type.slice(1);
        const start = (currentPage[donorType] - 1) * rowsPerPage;
        const end = start + rowsPerPage;
        const paginatedItems = filteredMonetaryDonations[donorType].slice(start, end);
        debugLog(`Rendering ${donorType} table`, paginatedItems);

        if (paginatedItems.length === 0) {
            tbody.innerHTML = `<tr><td colspan="${donorType === 'Anonymous' ? 9 : 10}" style="text-align: center; padding: 20px;">No ${donorType} monetary donations found.</td></tr>`;
        } else {
            paginatedItems.forEach((donation, index) => {
                if (donation.type !== donorType) {
                    console.warn(`Mismatch: Donation with type ${donation.type} in ${donorType} table`, donation);
                }
                const row = tbody.insertRow();
                // Apply urgent-row class if urgentNeed is true
                if (donation.urgentNeed === true) {
                    row.classList.add('urgent-row');
                    console.log(`Added urgent-row class to donation ID: ${donation.id}, urgentNeed: ${donation.urgentNeed}`);
                }

                let rowContent = '';
                if (donorType === 'Individual') {
                    rowContent = `
                        <td>${start + index + 1}</td>
                        <td>${donation.name || 'N/A'}</td>
                        <td>${donation.number || 'N/A'}</td>
                        <td>${donation.email || 'N/A'}</td>
                        <td>₱${parseFloat(donation.amount || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                        <td>${donation.donationDate ? new Date(donation.donationDate).toLocaleDateString('en-PH') : 'N/A'}</td>
                        <td>${donation.bank || 'N/A'}</td>
                        <td>${donation.referenceNumber || 'N/A'}</td>
                        <td>${donation.proofUrl ? `<a href="${donation.proofUrl}" target="_blank" rel="noopener noreferrer">View Proof</a>` : 'No file selected'}</td>
                        <td class="action-buttons">
                            <button class="viewBtn" data-id="${donation.id}" title="View"><i class='bx bx-show-alt'></i></button>
                            ${permissions.canEdit ? `
                                <button class="approveBtn" data-id="${donation.id}" title="Approve Donation"><i class='bx bx-check-circle'></i></button>
                                ${permissions.canArchive ? `<button class="rejectBtn" data-id="${donation.id}" title="Reject Donation"><i class='bx bx-x-circle'></i></button>` : ''}
                            ` : ''}
                        </td>
                    `;
                } else if (donorType === 'Anonymous') {
                    rowContent = `
                        <td>${start + index + 1}</td>
                        <td>${donation.number || 'N/A'}</td>
                        <td>${donation.email || 'N/A'}</td>
                        <td>${donation.donationNote || 'N/A'}</td>
                        <td>${donation.donationDate ? new Date(donation.donationDate).toLocaleDateString('en-PH') : 'N/A'}</td>
                        <td>${donation.bank || 'N/A'}</td>
                        <td>${donation.referenceNumber || 'N/A'}</td>
                        <td>${donation.proofUrl ? `<a href="${donation.proofUrl}" target="_blank" rel="noopener noreferrer">View Proof</a>` : 'No file selected'}</td>
                        <td class="action-buttons">
                            <button class="viewBtn" data-id="${donation.id}" title="View"><i class='bx bx-show-alt'></i></button>
                            ${permissions.canEdit ? `
                                <button class="approveBtn" data-id="${donation.id}" title="Approve Donation"><i class='bx bx-check-circle'></i></button>
                                ${permissions.canArchive ? `<button class="rejectBtn" data-id="${donation.id}" title="Reject Donation"><i class='bx bx-x-circle'></i></button>` : ''}
                            ` : ''}
                        </td>
                    `;
                } else if (donorType === 'Corporate') {
                    rowContent = `
                        <td>${start + index + 1}</td>
                        <td>${donation.name || 'N/A'}</td>
                        <td>${donation.contactPerson || 'N/A'}</td>
                        <td>${donation.number || 'N/A'}</td>
                        <td>${donation.email || 'N/A'}</td>
                        <td>₱${parseFloat(donation.amount || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                        <td>${donation.donationDate ? new Date(donation.donationDate).toLocaleDateString('en-PH') : 'N/A'}</td>
                        <td>${donation.bank || 'N/A'}</td>
                        <td>${donation.referenceNumber || 'N/A'}</td>
                        <td>${donation.proofUrl ? `<a href="${donation.proofUrl}" target="_blank" rel="noopener noreferrer">View Proof</a>` : 'No file selected'}</td>
                        <td class="action-buttons">
                            <button class="viewBtn" data-id="${donation.id}" title="View"><i class='bx bx-show-alt'></i></button>
                            ${permissions.canEdit ? `
                                <button class="approveBtn" data-id="${donation.id}" title="Approve Donation"><i class='bx bx-check-circle'></i></button>
                                ${permissions.canArchive ? `<button class="rejectBtn" data-id="${donation.id}" title="Reject Donation"><i class='bx bx-x-circle'></i></button>` : ''}
                            ` : ''}
                        </td>
                    `;
                } else if (donorType === 'Foundation') {
                    rowContent = `
                        <td>${start + index + 1}</td>
                        <td>${donation.name || 'N/A'}</td>
                        <td>${donation.contactPerson || 'N/A'}</td>
                        <td>${donation.number || 'N/A'}</td>
                        <td>${donation.email || 'N/A'}</td>
                        <td>₱${parseFloat(donation.amount || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                        <td>${donation.donationDate ? new Date(donation.donationDate).toLocaleDateString('en-PH') : 'N/A'}</td>
                        <td>${donation.bank || 'N/A'}</td>
                        <td>${donation.referenceNumber || 'N/A'}</td>
                        <td>${donation.proofUrl ? `<a href="${donation.proofUrl}" target="_blank" rel="noopener noreferrer">View Proof</a>` : 'No file selected'}</td>
                        <td class="action-buttons">
                            <button class="viewBtn" data-id="${donation.id}" title="View"><i class='bx bx-show-alt'></i></button>
                            ${permissions.canEdit ? `
                                <button class="approveBtn" data-id="${donation.id}" title="Approve Donation"><i class='bx bx-check-circle'></i></button>
                                ${permissions.canArchive ? `<button class="rejectBtn" data-id="${donation.id}" title="Reject Donation"><i class='bx bx-x-circle'></i></button>` : ''}
                            ` : ''}
                        </td>
                    `;
                }

                row.innerHTML = rowContent;

                // Add event listeners for action buttons
                const viewBtn = row.querySelector('.viewBtn');
                const approveBtn = row.querySelector('.approveBtn');
                const rejectBtn = row.querySelector('.rejectBtn');

                if (viewBtn) {
                    viewBtn.addEventListener('click', () => {
                        const donation = allMonetaryDonations.find(item => item.id === viewBtn.dataset.id);
                        if (donation) showViewModal(donation);
                    });
                }
                if (approveBtn && permissions.canEdit) {
                    approveBtn.addEventListener('click', () => updateDonationStatus(approveBtn.dataset.id, allMonetaryDonations.find(item => item.id === approveBtn.dataset.id), 'Approved'));
                }
                if (rejectBtn && permissions.canArchive) {
                    rejectBtn.addEventListener('click', () => updateDonationStatus(rejectBtn.dataset.id, allMonetaryDonations.find(item => item.id === rejectBtn.dataset.id), 'Rejected'));
                }
            });
        }

        const totalEntries = filteredMonetaryDonations[donorType].length;
        const showingStart = totalEntries > 0 ? start + 1 : 0;
        const showingEnd = Math.min(end, totalEntries);
        if (donorType === activeDonorType) {
            entriesInfo.textContent = `Showing ${showingStart} to ${showingEnd} of ${totalEntries} entries`;
        }
    });

    if (activeDonorType) {
        renderPagination();
    }
}

// Function to render pagination for the active donor type table
function renderPagination() {
    if (!paginationDiv) {
        console.error("ERROR: 'paginationDiv' element not found.");
        return;
    }
    paginationDiv.innerHTML = '';
    const pageCount = Math.ceil(filteredMonetaryDonations[activeDonorType].length / rowsPerPage);

    if (pageCount <= 0) {
        paginationDiv.innerHTML = '';
        return;
    }

    const createPaginationButton = (label, page, disabled = false, isActive = false) => {
        const btn = document.createElement('button');
        btn.textContent = label;
        if (isActive) btn.classList.add('active-page');
        if (disabled) btn.disabled = true;
        btn.addEventListener('click', () => {
            if (!disabled) {
                currentPage[activeDonorType] = page;
                renderTable();
            }
        });
        return btn;
    };

    paginationDiv.appendChild(createPaginationButton('Prev', Math.max(1, currentPage[activeDonorType] - 1), currentPage[activeDonorType] === 1));

    const maxVisible = 5;
    let startPage = Math.max(1, currentPage[activeDonorType] - Math.floor(maxVisible / 2));
    let endPage = Math.min(pageCount, startPage + maxVisible - 1);
    if (endPage - startPage < maxVisible - 1) {
        startPage = Math.max(1, endPage - maxVisible + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
        paginationDiv.appendChild(createPaginationButton(i, i, false, i === currentPage[activeDonorType]));
    }

    paginationDiv.appendChild(createPaginationButton('Next', Math.min(pageCount, currentPage[activeDonorType] + 1), currentPage[activeDonorType] === pageCount));

    debugLog('Pagination rendered', { pageCount, currentPage: currentPage[activeDonorType], startPage, endPage });
}

// Function to load archived donations from Firebase
function loadArchivedDonationsFromFirebase() {
    if (!database) {
        console.error('Firebase Database not available');
        Swal.fire('Error', 'Cannot connect to Firebase Database. Please check Firebase setup.', 'error');
        const archivedTableBody = document.querySelector('#archivedTable tbody');
        if (archivedTableBody) {
            archivedTableBody.innerHTML = '<tr><td colspan="12" style="text-align: center; padding: 20px; color: red;">Firebase Database not available.</td></tr>';
        }
        const archivedEntriesInfo = document.getElementById('archivedEntriesInfo');
        if (archivedEntriesInfo) archivedEntriesInfo.textContent = 'Showing 0 to 0 of 0 entries';
        const archivedPaginationDiv = document.getElementById('archivedPagination');
        if (archivedPaginationDiv) archivedPaginationDiv.innerHTML = '';
        return;
    }

    console.log('loadArchivedDonationsFromFirebase called.');
    const archivedDonationsRef = database.ref('donations/pending/archivedDonations/monetary');

    archivedDonationsRef.on('value', (snapshot) => {
        console.log('Firebase snapshot received for archived monetary donations');
        const donationsObject = snapshot.val();
        allArchivedDonations = [];

        if (donationsObject) {
            for (let key in donationsObject) {
                if (donationsObject.hasOwnProperty(key)) {
                    const donation = donationsObject[key];
                    const validTypes = ['Individual', 'Anonymous', 'Corporate', 'Foundation'];
                    donation.type = validTypes.includes(donation.type) ? donation.type : 'Individual';
                    if (!validTypes.includes(donation.type)) {
                        console.warn(`Invalid type for archived donation ${key}: ${donation.type}, defaulting to Individual`);
                    }
                    allArchivedDonations.push({ id: key, ...donation });
                }
            }
        }
        debugLog('Loaded archived monetary donations', allArchivedDonations);

        applyArchivedFiltersAndSort();
    }, (error) => {
        console.error("Error fetching archived monetary donations:", error);
        Swal.fire('Error', `Failed to load archived monetary donations. Error: ${error.message}`, 'error');
        const archivedTableBody = document.querySelector('#archivedTable tbody');
        if (archivedTableBody) {
            archivedTableBody.innerHTML = '<tr><td colspan="12" style="text-align: center; padding: 20px; color: red;">Failed to load archived monetary donations.</td></tr>';
        }
        const archivedEntriesInfo = document.getElementById('archivedEntriesInfo');
        if (archivedEntriesInfo) archivedEntriesInfo.textContent = 'Showing 0 to 0 of 0 entries';
        const archivedPaginationDiv = document.getElementById('archivedPagination');
        if (archivedPaginationDiv) archivedPaginationDiv.innerHTML = '';
    });
}

// Function to apply filters and sorting for archived donations
function applyArchivedFiltersAndSort() {
    console.log('applyArchivedFiltersAndSort called.');
    const activeTab = document.querySelector('.tab-button.active')?.getAttribute('data-tab') || 'individual';
    filteredArchivedDonations = allArchivedDonations.filter(donation => donation.type.toLowerCase() === activeTab);

    const searchTerm = searchInput ? searchInput.value.toLowerCase() : '';
    if (searchTerm) {
        filteredArchivedDonations = filteredArchivedDonations.filter(donation =>
            (donation.name && String(donation.name).toLowerCase().includes(searchTerm)) ||
            (donation.email && String(donation.email).toLowerCase().includes(searchTerm)) ||
            (donation.bank && String(donation.bank).toLowerCase().includes(searchTerm)) ||
            (donation.donationNote && String(donation.donationNote).toLowerCase().includes(searchTerm))
        );
    }
    debugLog('After search filter (archived)', filteredArchivedDonations);

    const sortValue = sortSelect ? sortSelect.value : '';
    if (sortValue) {
        filteredArchivedDonations.sort((a, b) => {
            // Prioritize urgentNeed
            if (a.urgentNeed === true && b.urgentNeed !== true) return -1;
            if (b.urgentNeed === true && a.urgentNeed !== true) return 1;

            const [field, order] = sortValue.split('-');
            let valA, valB;
            if (field === 'amountDonated') {
                valA = parseFloat(a.amount || 0);
                valB = parseFloat(b.amount || 0);
                return order === 'asc' ? valA - valB : valB - valA;
            } else if (field === 'donationDate') {
                valA = a.donationDate ? new Date(a.donationDate).getTime() : 0;
                valB = b.donationDate ? new Date(b.donationDate).getTime() : 0;
                return order === 'asc' ? valA - valB : valB - valA;
            } else {
                valA = a[field] ? String(a[field]).toLowerCase() : '';
                valB = b[field] ? String(b[field]).toLowerCase() : '';
                return order === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
            }
        });
    }
    debugLog('After sort (archived)', filteredArchivedDonations);

    renderArchivedTable();
}

// Function to render the archived donations table
function renderArchivedTable() {
    console.log('renderArchivedTable called.');
    const archivedTableBody = document.querySelector('#archivedTable tbody');
    if (!archivedTableBody) {
        console.error("ERROR: 'archivedTableBody' element not found.");
        return;
    }

    archivedTableBody.innerHTML = '';
    const start = (archivedCurrentPage - 1) * archivedRowsPerPage;
    const end = start + archivedRowsPerPage;
    const paginatedItems = filteredArchivedDonations.slice(start, end);

    if (paginatedItems.length === 0) {
        archivedTableBody.innerHTML = '<tr><td colspan="12" style="text-align: center; padding: 20px;">No archived monetary donations found.</td></tr>';
    } else {
        paginatedItems.forEach((donation, index) => {
            debugLog('Rendering archived donation', donation);
            const row = archivedTableBody.insertRow();
            // Apply urgent-row class if urgentNeed is true
            if (donation.urgentNeed === true) {
                row.classList.add('urgent-row');
                console.log(`Added urgent-row class to archived donation ID: ${donation.id}, urgentNeed: ${donation.urgentNeed}`);
            }

            let rowContent = `
                <td>${start + index + 1}</td>
                <td>${donation.encoder || 'N/A'}</td>
                <td>${donation.name || (donation.type === 'Anonymous' ? 'Anonymous' : 'N/A')}</td>
                <td>${donation.number || 'N/A'}</td>
                <td>₱${parseFloat(donation.amount || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                <td>${donation.invoice || 'N/A'}</td>
                <td>${donation.donationDate ? new Date(donation.donationDate).toLocaleDateString('en-PH') : 'N/A'}</td>
                <td>${donation.email || 'N/A'}</td>
                <td>${donation.bank || 'N/A'}</td>
                <td>${donation.referenceNumber || 'N/A'}</td>
                <td>${donation.proofUrl ? `<a href="${donation.proofUrl}" target="_blank" rel="noopener noreferrer">View Proof</a>` : 'No file selected'}</td>
                <td class="action-buttons">
                    ${permissions.canRetrieve ? `<button class="retrieveBtn" data-id="${donation.id}" title="Retrieve">Retrieve</button>` : ''}
                </td>
            `;

            row.innerHTML = rowContent;

            const retrieveBtn = row.querySelector('.retrieveBtn');
            if (retrieveBtn && permissions.canRetrieve) {
                retrieveBtn.addEventListener('click', () => restoreDonation(retrieveBtn.dataset.id, donation));
            }
        });
    }

    const totalEntries = filteredArchivedDonations.length;
    const showingStart = totalEntries > 0 ? start + 1 : 0;
    const showingEnd = Math.min(end, totalEntries);
    const archivedEntriesInfo = document.getElementById('archivedEntriesInfo');
    if (archivedEntriesInfo) {
        archivedEntriesInfo.textContent = `Showing ${showingStart} to ${showingEnd} of ${totalEntries} entries`;
    }
    renderArchivedPagination();
}

function updateArchivedTableData(tabType) {
    console.log(`updateArchivedTableData called for tab: ${tabType}`);
    filteredArchivedDonations = allArchivedDonations.filter(donation => donation.type.toLowerCase() === tabType);
    archivedCurrentPage = 1;
    renderArchivedTable();
}

// Function to render pagination for archived table
function renderArchivedPagination() {
    const archivedPaginationDiv = document.getElementById('archivedPagination');
    if (!archivedPaginationDiv) {
        console.error("ERROR: 'archivedPaginationDiv' element not found.");
        return;
    }
    archivedPaginationDiv.innerHTML = '';
    const pageCount = Math.ceil(filteredArchivedDonations.length / archivedRowsPerPage);

    if (pageCount <= 1) {
        archivedPaginationDiv.innerHTML = '<span>No pagination needed</span>';
        return;
    }

    const createPaginationButton = (label, page, disabled = false, isActive = false) => {
        const btn = document.createElement('button');
        btn.textContent = label;
        btn.classList.add('pagination-button');
        if (isActive) btn.classList.add('active');
        if (disabled) btn.disabled = true;
        btn.addEventListener('click', () => {
            if (!disabled) {
                archivedCurrentPage = page;
                renderArchivedTable();
                renderArchivedPagination();
            }
        });
        return btn;
    };

    archivedPaginationDiv.appendChild(createPaginationButton('Prev', Math.max(1, archivedCurrentPage - 1), archivedCurrentPage === 1));

    const maxVisible = 5;
    let startPage = Math.max(1, archivedCurrentPage - Math.floor(maxVisible / 2));
    let endPage = Math.min(pageCount, startPage + maxVisible - 1);
    if (endPage - startPage < maxVisible - 1) {
        startPage = Math.max(1, endPage - maxVisible + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
        archivedPaginationDiv.appendChild(createPaginationButton(i, i, false, i === archivedCurrentPage));
    }

    archivedPaginationDiv.appendChild(createPaginationButton('Next', Math.min(pageCount, archivedCurrentPage + 1), archivedCurrentPage === pageCount));

    debugLog('Archived pagination rendered', { pageCount, archivedCurrentPage, startPage, endPage });
}

// Function to update donation status (Approve/Reject)
async function updateDonationStatus(id, donationData, newStatus) {
    if (!database) {
        Swal.fire('Error', 'Firebase Database not available.', 'error');
        return;
    }

    debugLog('updateDonationStatus called', { id, donationData, newStatus });

    let finalDonationData;
    try {
        const snapshot = await database.ref('donations/pending/monetary/' + id).once('value');
        if (!snapshot.exists()) {
            throw new Error('Donation not found in donations/pending/monetary');
        }
        finalDonationData = snapshot.val();
        finalDonationData.id = id;
        debugLog('Fetched donationData from donations/pending/monetary', finalDonationData);
    } catch (error) {
        console.error('Error fetching donation data:', error);
        Swal.fire('Error', `Failed to fetch donation data. Error: ${error.message}`, 'error');
        return;
    }

    Swal.fire({
        title: `Are you sure to ${newStatus.toLowerCase()} this donation?`,
        text: newStatus === 'Approved' ? 'This will move it to monetary donation records.' : 'This will move it to archived donations.',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: newStatus,
        reverseButtons: true,
        customClass: {
            popup: 'custom-swal-popup-small',
            title: 'custom-swal-title',
            htmlContainer: 'custom-swal-content',
            confirmButton: 'custom-confirm-btn',
            cancelButton: 'custom-cancel-btn',
        }
    }).then(async (result) => {
        if (result.isConfirmed) {
            try {
                if (newStatus === 'Approved') {
                    const donationToApprove = { ...finalDonationData };
                    donationToApprove.approvedAt = new Date().toISOString();
                    donationToApprove.updatedAt = new Date().toISOString();
                    await database.ref('donations/savedDonations/monetary/' + id).set(donationToApprove);
                    await database.ref('donations/pending/monetary/' + id).remove();
                    debugLog('Approved donation saved and removed from pending', { id });
                    Swal.fire({
                        title: 'Approved!',
                        text: 'The monetary donation has been approved.',
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
                } else if (newStatus === 'Rejected') {
                    const donationToArchive = { ...finalDonationData };
                    donationToArchive.rejectedAt = new Date().toISOString();
                    donationToArchive.updatedAt = new Date().toISOString();
                    await database.ref('donations/pending/archivedDonations/monetary/' + id).set(donationToArchive);
                    await database.ref('donations/pending/monetary/' + id).remove();
                    debugLog('Rejected donation archived and removed from pending', { id });
                    Swal.fire({
                        icon: 'success',
                        title: 'Archived!',
                        text: 'The donation has been archived.',
                        timer: 1600,
                        showConfirmButton: false,
                        timerProgressBar: true,
                        customClass: {
                            popup: 'swal2-popup-success-clean',
                            title: 'swal2-title-success-clean',
                            htmlContainer: 'swal2-text-success-clean'
                        }
                    });
                }
                loadMonetaryDonationsFromFirebase();
                loadArchivedDonationsFromFirebase();
            } catch (error) {
                console.error('Error updating donation status:', error);
                Swal.fire('Error', `Failed to ${newStatus.toLowerCase()} monetary donation. Error: ${error.message}`, 'error');
            }
        }
    });
}

// Function to restore an archived donation back to pending
async function restoreDonation(id, donationData) {
    if (!database) {
        Swal.fire('Error', 'Firebase Database not available.', 'error');
        return;
    }

    Swal.fire({
        title: 'Retrieve Donation?',
        text: 'This will move the monetary donation from archived donations back to pending donations.',
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
                const donationToRestore = { ...donationData };
                delete donationToRestore.rejectedAt;
                donationToRestore.updatedAt = new Date().toISOString();
                await database.ref('donations/pending/monetary/' + id).set(donationToRestore);
                await database.ref('donations/pending/archivedDonations/monetary/' + id).remove();
                debugLog('Donation restored to pending', { id });
                Swal.fire({
                    icon: 'success',
                    title: 'Retrieved!',
                    text: 'The donation has been restored to pending monetary donations.',
                    timer: 1600,
                    showConfirmButton: false,
                    timerProgressBar: true,
                    allowOutsideClick: false,
                    customClass: {
                        popup: 'swal2-popup-success-clean',
                        title: 'swal2-title-success-clean',
                        htmlContainer: 'swal2-text-success-clean',
                    },
                });
                loadMonetaryDonationsFromFirebase();
                loadArchivedDonationsFromFirebase();
            } catch (error) {
                console.error('Error restoring monetary donation:', error);
                Swal.fire('Error', `Failed to restore monetary donation. Error: ${error.message}`, 'error');
            }
        }
    });
}

// Event listeners for DOM elements
document.addEventListener('DOMContentLoaded', function() {
    async function checkAdminPermissions() {
        try {
            const user = auth.currentUser;
            if (!user) {
                console.log('No authenticated user found');
                return { canView: false, canEdit: false, canArchive: false, canRetrieve: false };
            }

            const snapshot = await database.ref(`users/${user.uid}`).once('value');
            const userData = snapshot.val();

            const adminPosition = userData?.adminPosition || null;
            console.log('Admin position:', adminPosition);

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
            console.error('Error checking admin permissions:', error);
            return { canView: false, canEdit: false, canArchive: false, canRetrieve: false };
        }
    }

    auth.onAuthStateChanged(async (user) => {
        if (user) {
            console.log('User is authenticated:', user.uid);
            try {
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

                permissions = await checkAdminPermissions();
                if (!permissions.canView) {
                    Swal.fire({
                        icon: 'error',
                        title: 'Access Denied',
                        text: 'You do not have permission to access this page.',
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
                    return;
                }

                resetInactivityTimer();
                loadMonetaryDonationsFromFirebase();
                // Uncomment the following line to add test data (run once, then comment out again)
                // addTestData();
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
        } else {
            console.error('No authenticated user found.');
            Swal.fire({
                title: 'Error',
                text: 'You must be logged in to access this page.',
                icon: 'error',
                confirmButtonText: 'Go to Login',
                customClass: {
                    popup: 'swal2-popup-error-clean',
                    title: 'swal2-title-error-clean',
                    htmlContainer: 'swal2-text-error-clean'
                }
            }).then(() => {
                window.location.href = '../pages/login.html';
            });
        }
    });

    const archivedModal = document.getElementById('archivedModal');
    const closeArchivedModalBtn = document.getElementById('closeArchivedModalBtn');
    const viewArchivedBtn = document.getElementById('viewArchived');
    const archivedTableBody = document.querySelector('#archivedTable tbody');
    const archivedEntriesInfo = document.getElementById('archivedEntriesInfo');
    const archivedPaginationDiv = document.getElementById('archivedPagination');
    const previewModal = document.getElementById('previewModal');
    const closeModal = document.getElementById('closeModal');

    if (closeModal) {
        closeModal.addEventListener('click', hideViewModal);
    }

    window.addEventListener('click', (event) => {
        if (event.target === previewModal) {
            hideViewModal();
        }
    });

    if (viewApprovedBtn) {
        viewApprovedBtn.addEventListener('click', () => {
            window.location.href = '../pages/pendinginkind.html';
        });
    }

    if (viewArchivedBtn) {
        viewArchivedBtn.addEventListener('click', () => {
            console.log('View Archived button clicked.');
            archivedModal.style.display = 'flex';
            loadArchivedDonationsFromFirebase();
        });
    }

    if (closeArchivedModalBtn) {
        closeArchivedModalBtn.addEventListener('click', () => {
            console.log('Close archived modal button clicked.');
            archivedModal.style.display = 'none';
            archivedCurrentPage = 1;
            archivedTableBody.innerHTML = '';
            archivedPaginationDiv.innerHTML = '';
            if (archivedEntriesInfo) archivedEntriesInfo.textContent = 'Showing 0 to 0 of 0 entries';
        });
    }

    window.addEventListener('click', (event) => {
        if (event.target === archivedModal) {
            console.log('Clicked outside archived modal.');
            archivedModal.style.display = 'none';
            archivedCurrentPage = 1;
            archivedTableBody.innerHTML = '';
            archivedPaginationDiv.innerHTML = '';
            if (archivedEntriesInfo) archivedEntriesInfo.textContent = 'Showing 0 to 0 of 0 entries';
        }
    });
});
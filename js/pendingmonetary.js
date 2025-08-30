if (typeof firebase === 'undefined') {
    console.error('Firebase SDK not loaded. Please check HTML script tags.');
    Swal.fire('Error', 'Firebase SDK failed to load. Please check your network or script tags.', 'error');
}

// Firebase configuration and initialization
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
let filteredMonetaryDonations = [];
let currentPage = 1;
const rowsPerPage = 10;

// Variables for archived donations and modal state
let allArchivedDonations = [];
let filteredArchivedDonations = [];
let archivedCurrentPage = 1;
const archivedRowsPerPage = 10;

// Debug function to log data at each step
function debugLog(step, data) {
    
}

// Test function to manually save a donation to pending monetary
async function testSaveToPending() {
    if (!database) {
        console.error('Firebase Database not available');
        return;
    }
    const testDonation = {
        encoder: "Test Encoder",
        name: "John Doe",
        address: "123 Test St",
        number: "1234567890",
        amountDonated: "1000",
        invoice: "INV123",
        dateReceived: "2025-08-18",
        email: "test@example.com",
        bank: "BDO",
        referenceNumber: "REF123",
        proof: "https://example.com/proof.jpg",
        updatedAt: new Date().toISOString()
    };
    try {
        await database.ref('donations/pending/monetary/test123').set(testDonation);
        debugLog('Test donation saved to donations/pending/monetary', testDonation);
        Swal.fire('Test Save', 'Test donation saved to donations/pending/monetary. Check the main table.', 'info');
        loadMonetaryDonationsFromFirebase();
    } catch (error) {
        console.error('Error saving test donation:', error);
        Swal.fire('Error', `Failed to save test donation. Error: ${error.message}`, 'error');
    }
}

// Test function to manually save a donation to archived monetary
async function testSaveToArchived() {
    if (!database) {
        console.error('Firebase Database not available');
        return;
    }
    const testDonation = {
        encoder: "Test Encoder",
        name: "John Doe",
        address: "123 Test St",
        number: "1234567890",
        amountDonated: "1000",
        invoice: "INV123",
        dateReceived: "2025-08-18",
        email: "test@example.com",
        bank: "BDO",
        referenceNumber: "REF123",
        proof: "https://example.com/proof.jpg",
        rejectedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };
    try {
        await database.ref('donations/pending/archivedDonations/monetary/testManual').set(testDonation);
        debugLog('Test donation saved to donations/pending/archivedDonations/monetary', testDonation);
        Swal.fire('Test Save', 'Test donation saved to archivedMonetary. Check the archived modal.', 'info');
        loadArchivedDonationsFromFirebase();
    } catch (error) {
        console.error('Error saving test donation:', error);
        Swal.fire('Error', `Failed to save test donation. Error: ${error.message}`, 'error');
    }
}

document.addEventListener('DOMContentLoaded', function() {
    // Get references to DOM elements
    const donationTableBody = document.getElementById('donationTableBody');
    const searchInput = document.getElementById('searchInput');
    const sortSelect = document.getElementById('sortSelect');
    const entriesInfo = document.getElementById('entriesInfo');
    const paginationDiv = document.getElementById('pagination');
    const viewApprovedBtn = document.getElementById('viewApprovedBtn');

    // Get references to archived modal DOM elements
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

    viewApprovedBtn.addEventListener('click', () => {
        window.location.href = '../pages/pendinginkind.html';
    });
    
    // Function to load pending monetary donations from Firebase
    function loadMonetaryDonationsFromFirebase() {
        if (!database) {
            console.error('Firebase Database not available');
            Swal.fire('Error', 'Cannot connect to Firebase Database. Please check Firebase setup.', 'error');
            if (donationTableBody) {
                donationTableBody.innerHTML = '<tr><td colspan="13" style="text-align: center; padding: 20px; color: red;">Firebase Database not available.</td></tr>';
            }
            entriesInfo.textContent = 'Showing 0 to 0 of 0 entries';
            paginationDiv.innerHTML = '';
            return;
        }

        console.log('1. loadMonetaryDonationsFromFirebase called.');
        const monetaryDonationsRef = database.ref('donations/pending/monetary');

        monetaryDonationsRef.on('value', (snapshot) => {
            debugLog('Firebase snapshot received for monetary donations', snapshot.val());
            const donationsObject = snapshot.val();
            const loadedDonations = [];

            if (donationsObject) {
                for (let key in donationsObject) {
                    if (donationsObject.hasOwnProperty(key) && key !== 'archivedMonetary') {
                        const donation = donationsObject[key];
                        loadedDonations.push({ id: key, ...donation });
                    }
                }
            } else {
                console.log('No pending monetary donations found in Firebase at donations/pending/monetary');
            }
            debugLog('Loaded monetary donations from Firebase', loadedDonations);

            allMonetaryDonations = loadedDonations;
            debugLog('All monetary donations loaded', allMonetaryDonations);

            applyFiltersAndSort();
        }, (error) => {
            console.error("Error fetching monetary donations:", error);
            Swal.fire('Error', `Failed to load monetary donations. Error: ${error.message}`, 'error');
            if (donationTableBody) {
                donationTableBody.innerHTML = '<tr><td colspan="13" style="text-align: center; padding: 20px; color: red;">Failed to load monetary donations.</td></tr>';
            }
            entriesInfo.textContent = 'Showing 0 to 0 of 0 entries';
            paginationDiv.innerHTML = '';
        });
    }

    // Function to apply search filters and sorting, then re-render the table
    function applyFiltersAndSort() {
        console.log('5. applyFiltersAndSort called.');
        filteredMonetaryDonations = [...allMonetaryDonations];

        const searchTerm = searchInput ? searchInput.value.toLowerCase() : '';
        if (searchTerm) {
            filteredMonetaryDonations = filteredMonetaryDonations.filter(donation =>
                (donation.encoder && String(donation.encoder).toLowerCase().includes(searchTerm)) ||
                (donation.name && String(donation.name).toLowerCase().includes(searchTerm)) ||
                (donation.address && String(donation.address).toLowerCase().includes(searchTerm)) ||
                (donation.email && String(donation.email).toLowerCase().includes(searchTerm)) ||
                (donation.bank && String(donation.bank).toLowerCase().includes(searchTerm))
            );
        }
        debugLog('After search filter, filteredMonetaryDonations', filteredMonetaryDonations);

        const sortValue = sortSelect ? sortSelect.value : '';
        if (sortValue) {
            const [field, order] = sortValue.split('-');
            filteredMonetaryDonations.sort((a, b) => {
                const valA = a[field] ? String(a[field]).toLowerCase() : '';
                const valB = b[field] ? String(b[field]).toLowerCase() : '';
                return order === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
            });
        }
        debugLog('After sort, filteredMonetaryDonations', filteredMonetaryDonations);

        currentPage = 1;
        renderTable();
        renderPagination();
    }

    // Event listeners for search input and sort select
    if (searchInput) searchInput.addEventListener('input', applyFiltersAndSort);
    if (sortSelect) sortSelect.addEventListener('change', applyFiltersAndSort);

    function showViewModal(donation) {
    const modalContentDiv = document.getElementById('modalContent');
    if (!previewModal || !modalContentDiv) {
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

    const formattedTimestamp = donation.updatedAt ? new Date(donation.updatedAt).toLocaleString('en-PH', {
        year: 'numeric', month: 'short', day: 'numeric',
        hour: '2-digit', minute: '2-digit', second: '2-digit'
    }) : 'N/A';

    modalContentDiv.innerHTML = `
        <div class="modal-content-inner" style="padding: 20px;">
            <h2>Donor Information:</h2>
            <p><strong>Encoder:</strong> ${donation.encoder || 'N/A'}</p>
            <p><strong>Name:</strong> ${donation.name || 'N/A'}</p>
            <p><strong>Location:</strong> ${donation.address || 'N/A'}</p>
            <p><strong>Number:</strong> ${donation.number || 'N/A'}</p>
            <hr>
            <h2>Transaction Details</h2>
            <p><strong>Amount Donated:</strong> ${parseFloat(donation.amountDonated || 0).toLocaleString('en-PH', { style: 'currency', currency: 'PHP' })}</p>
            <p><strong>Cash Invoice #:</strong> ${donation.invoice || 'N/A'}</p>
            <p><strong>Date Received:</strong> ${donation.dateReceived ? new Date(donation.dateReceived).toLocaleDateString('en-PH') : 'N/A'}</p>
            <p><strong>Email:</strong> ${donation.email || 'N/A'}</p>
            <p><strong>Bank:</strong> ${donation.bank || 'N/A'}</p>
            <p><strong>Reference Number:</strong> ${donation.referenceNumber || 'N/A'}</p>
            <p><strong>Proof of Transaction:</strong> ${donation.proof ? `<a href="${donation.proof}" target="_blank" rel="noopener noreferrer">View Proof</a>` : 'N/A'}</p>
            <p><strong>Updated On:</strong> ${formattedTimestamp}</p>
            ${donation.rejectedAt ? `<p><strong>Rejected At:</strong> ${new Date(donation.rejectedAt).toLocaleString('en-PH', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' })}</p>` : ''}
        </div>
    `;
    previewModal.style.display = 'flex';
}

function hideViewModal() {
    if (previewModal && document.getElementById('modalContent')) {
        previewModal.style.display = 'none';
        document.getElementById('modalContent').innerHTML = '';
    }
}

    // Function to render the donation table rows for the current page
function renderTable() {
    console.log('8. renderTable called.');
    if (!donationTableBody) {
        console.error("ERROR: 'donationTableBody' element not found.");
        return;
    }

    donationTableBody.innerHTML = '';
    const start = (currentPage - 1) * rowsPerPage;
    const end = start + rowsPerPage;
    const paginatedItems = filteredMonetaryDonations.slice(start, end);
    debugLog('Items to render on current page', paginatedItems);

    if (paginatedItems.length === 0) {
        donationTableBody.innerHTML = '<tr><td colspan="13" style="text-align: center; padding: 20px;">No pending monetary donations found.</td></tr>';
        entriesInfo.textContent = 'Showing 0 to 0 of 0 entries';
        renderPagination();
        return;
    }

    paginatedItems.forEach((donation, index) => {
        debugLog('Rendering donation', donation);
        const row = donationTableBody.insertRow();
        row.insertCell().textContent = start + index + 1;
        row.insertCell().textContent = donation.encoder || 'N/A';
        row.insertCell().textContent = donation.name || 'N/A';
        row.insertCell().textContent = donation.address || 'N/A';
        row.insertCell().textContent = donation.number || 'N/A';
        const numericAmount = parseFloat(donation.amountDonated || 0);
        row.insertCell().textContent = isNaN(numericAmount) ? 'N/A' : `PHP ${numericAmount.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
        row.insertCell().textContent = donation.invoice || 'N/A';
        row.insertCell().textContent = donation.dateReceived || 'N/A';
        row.insertCell().textContent = donation.email || 'N/A';
        row.insertCell().textContent = donation.bank || 'N/A';
        row.insertCell().textContent = donation.referenceNumber || 'N/A';
        const proofCell = row.insertCell();
        if (donation.proof && typeof donation.proof === 'string' && donation.proof.startsWith('http')) {
            const proofLink = document.createElement('a');
            proofLink.href = donation.proof;
            proofLink.textContent = 'View Proof';
            proofLink.target = '_blank';
            proofLink.rel = 'noopener noreferrer';
            proofCell.appendChild(proofLink);
        } else {
            proofCell.textContent = 'No file selected';
        }

        const actionCell = row.insertCell();
        actionCell.classList.add('action-buttons');
        actionCell.innerHTML = `
            <button class="viewBtn" data-id="${donation.id}" title="View"><i class='bx bx-show-alt'></i></button>
            <button class="approveBtn" data-id="${donation.id}" title="Approve Donation"><i class='bx bx-check-circle'></i></button>
            <button class="rejectBtn" data-id="${donation.id}" title="Reject Donation"><i class='bx bx-x-circle'></i></button>
        `;
    });

    document.querySelectorAll('.viewBtn').forEach(button => {
        button.addEventListener('click', (event) => {
            const donation = filteredMonetaryDonations.find(item => item.id === event.target.dataset.id);
            if (donation) {
                showViewModal(donation);
            } else {
                Swal.fire({
                    title: 'Error',
                    text: 'Donation details not found.',
                    icon: 'error',
                    customClass: {
                        popup: 'swal2-popup-error-clean',
                        title: 'swal2-title-error-clean',
                        htmlContainer: 'swal2-text-error-clean'
                    }
                });
            }
        });
    });

    document.querySelectorAll('.approveBtn').forEach(button => {
        button.addEventListener('click', (event) => updateDonationStatus(event.target.dataset.id, filteredMonetaryDonations.find(item => item.id === event.target.dataset.id), 'Approved'));
    });
    document.querySelectorAll('.rejectBtn').forEach(button => {
        button.addEventListener('click', (event) => updateDonationStatus(event.target.dataset.id, filteredMonetaryDonations.find(item => item.id === event.target.dataset.id), 'Rejected'));
    });

    const totalEntries = filteredMonetaryDonations.length;
    const showingStart = totalEntries > 0 ? start + 1 : 0;
    const showingEnd = Math.min(end, totalEntries);
    entriesInfo.textContent = `Showing ${showingStart} to ${showingEnd} of ${totalEntries} entries`;
    renderPagination();
}

// render
function renderPagination() {
    if (!paginationDiv) {
        console.error("ERROR: 'paginationDiv' element not found.");
        return;
    }
    paginationDiv.innerHTML = '';
    const pageCount = Math.ceil(filteredMonetaryDonations.length / rowsPerPage);

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
                currentPage = page;
                renderTable();
            }
        });
        return btn;
    };

    // Add Previous button
    paginationDiv.appendChild(createPaginationButton('Prev', Math.max(1, currentPage - 1), currentPage === 1));

    // Add numbered buttons
    const maxVisible = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxVisible / 2));
    let endPage = Math.min(pageCount, startPage + maxVisible - 1);
    if (endPage - startPage < maxVisible - 1) {
        startPage = Math.max(1, endPage - maxVisible + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
        paginationDiv.appendChild(createPaginationButton(i, i, false, i === currentPage));
    }

    // Add Next button
    paginationDiv.appendChild(createPaginationButton('Next', Math.min(pageCount, currentPage + 1), currentPage === pageCount));

    debugLog('Pagination rendered', { pageCount, currentPage, startPage, endPage });
}



    // Function to render pagination buttons
 function renderArchivedPagination() {
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
                renderArchivedPagination(); // Re-render to ensure active state
            }
        });
        return btn;
    };

    // Add Previous button
    archivedPaginationDiv.appendChild(createPaginationButton('Prev', Math.max(1, archivedCurrentPage - 1), archivedCurrentPage === 1));

    // Add numbered buttons
    const maxVisible = 5;
    let startPage = Math.max(1, archivedCurrentPage - Math.floor(maxVisible / 2));
    let endPage = Math.min(pageCount, startPage + maxVisible - 1);
    if (endPage - startPage < maxVisible - 1) {
        startPage = Math.max(1, endPage - maxVisible + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
        archivedPaginationDiv.appendChild(createPaginationButton(i, i, false, i === archivedCurrentPage));
    }

    // Add Next button
    archivedPaginationDiv.appendChild(createPaginationButton('Next', Math.min(pageCount, archivedCurrentPage + 1), archivedCurrentPage === pageCount));

    debugLog('Archived pagination rendered', { pageCount, archivedCurrentPage, startPage, endPage });
}

    // Function to update donation status (Approve/Reject)
    async function updateDonationStatus(id, donationData, newStatus) {
        if (!database) {
            Swal.fire('Error', 'Firebase Database not available.', 'error');
            return;
        }

        debugLog('updateDonationStatus called with ID and Data', { id, donationData, newStatus });

        // Always fetch the latest data from Firebase to ensure completeness
        let finalDonationData;
        try {
            const snapshot = await database.ref('donations/pending/monetary/' + id).once('value');
            if (!snapshot.exists()) {
                throw new Error('Donation not found in donations/pending/monetary');
            }
            finalDonationData = snapshot.val();
            finalDonationData.id = id; // Ensure ID is included
            debugLog('Fetched donationData from donations/pending/monetary', finalDonationData);
        } catch (error) {
            console.error('Error fetching donation data:', error);
            Swal.fire('Error', `Failed to fetch donation data. Error: ${error.message}`, 'error');
            return;
        }

        // Validate all expected fields
        const requiredFields = [
            'encoder', 'name', 'address', 'number', 'amountDonated',
            'invoice', 'dateReceived', 'email', 'bank', 'referenceNumber', 'proof'
        ];
        const missingFields = requiredFields.filter(field => 
            !finalDonationData[field] || finalDonationData[field] === '' || finalDonationData[field] === null
        );
        if (missingFields.length > 0) {
            
            Swal.fire('Error', `Required donation data missing: ${missingFields.join(', ')}. Please check the data source.`, 'error');
            return;
        }

        Swal.fire({
            title: `Are you sure to reject this application?`,
            text: 'This will move it to archived records.',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Reject',
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
                        debugLog('Saving approved donation to donations/savedDonations/monetary', donationToApprove);
                        await database.ref('donations/savedDonations/monetary/' + id).set(donationToApprove);
                        await database.ref('donations/pending/monetary/' + id).remove();
                        debugLog('Removal from donations/pending/monetary successful', { id });
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
                        debugLog('Saving rejected donation to donations/pending/archivedDonations/monetary', donationToArchive);
                        await database.ref('donations/pending/archivedDonations/monetary/' + id).set(donationToArchive);
                        // Verify the saved data
                        const savedSnapshot = await database.ref('donations/pending/archivedDonations/monetary/' + id).once('value');
                        if (!savedSnapshot.exists()) {
                            throw new Error('Failed to verify saved data in donations/pending/archivedDonations/monetary');
                        }
                        debugLog('Verified saved data in donations/pending/archivedDonations/monetary', savedSnapshot.val());
                        await database.ref('donations/pending/monetary/' + id).remove();
                        debugLog('Removal from donations/pending/monetary successful', { id });
                        Swal.fire({
                            icon: 'success',
                            title: 'Archived!',
                            text: 'The application has been archived.',
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
                    // Refresh tables
                    loadMonetaryDonationsFromFirebase();
                    loadArchivedDonationsFromFirebase();
                } catch (error) {
                    
                    Swal.fire('Error', `Failed to ${newStatus.toLowerCase()} monetary donation. Error: ${error.message}`, 'error');
                }
            }
        });
    }

    // Function to load archived (rejected) monetary donations from Firebase
    function loadArchivedDonationsFromFirebase() {
        if (!database) {
            console.error('Firebase Database not available');
            Swal.fire('Error', 'Cannot connect to Firebase Database. Please check Firebase setup.', 'error');
            if (archivedTableBody) {
                archivedTableBody.innerHTML = '<tr><td colspan="13" style="text-align: center; padding: 20px; color: red;">Firebase Database not available.</td></tr>';
            }
            archivedEntriesInfo.textContent = 'Showing 0 to 0 of 0 entries';
            archivedPaginationDiv.innerHTML = '';
            return;
        }

        console.log('loadArchivedDonationsFromFirebase called.');
        const archivedDonationsRef = database.ref('donations/pending/archivedDonations/monetary');

        archivedDonationsRef.on('value', (snapshot) => {
            debugLog('Firebase snapshot received for archived monetary donations', snapshot.val());
            const donationsObject = snapshot.val();
            const loadedArchivedDonations = [];

            if (donationsObject) {
                for (let key in donationsObject) {
                    if (donationsObject.hasOwnProperty(key)) {
                        const donation = donationsObject[key];
                        loadedArchivedDonations.push({ id: key, ...donation });
                    }
                }
            } else {
                
            }
            debugLog('Loaded archived monetary donations from Firebase', loadedArchivedDonations);

            allArchivedDonations = loadedArchivedDonations;
            filteredArchivedDonations = [...allArchivedDonations];
            renderArchivedTable();
            renderArchivedPagination();
        }, (error) => {
            console.error("Error fetching archived monetary donations:", error);
            Swal.fire('Error', `Failed to load archived monetary donations. Error: ${error.message}`, 'error');
            if (archivedTableBody) {
                archivedTableBody.innerHTML = '<tr><td colspan="13" style="text-align: center; padding: 20px; color: red;">Failed to load archived monetary donations.</td></tr>';
            }
            archivedEntriesInfo.textContent = 'Showing 0 to 0 of 0 entries';
            archivedPaginationDiv.innerHTML = '';
        });
    }

    // Function to render the archived donations table
function renderArchivedTable() {
    console.log('renderArchivedTable called.');
    if (!archivedTableBody) {
        console.error("ERROR: 'archivedTableBody' element not found.");
        return;
    }

    archivedTableBody.innerHTML = '';
    const start = (archivedCurrentPage - 1) * archivedRowsPerPage;
    const end = start + archivedRowsPerPage;
    const paginatedItems = filteredArchivedDonations.slice(start, end);

    if (paginatedItems.length === 0) {
        archivedTableBody.innerHTML = '<tr><td colspan="13" style="text-align: center; padding: 20px;">No archived monetary donations found.</td></tr>';
        archivedEntriesInfo.textContent = 'Showing 0 to 0 of 0 entries';
        renderArchivedPagination();
        return;
    }

    paginatedItems.forEach((donation, index) => {
        debugLog('Rendering archived donation', donation);
        const row = archivedTableBody.insertRow();
        row.insertCell().textContent = start + index + 1;
        row.insertCell().textContent = donation.encoder || 'N/A';
        row.insertCell().textContent = donation.name || 'N/A';
        row.insertCell().textContent = donation.address || 'N/A';
        row.insertCell().textContent = donation.number || 'N/A';
        const numericAmount = parseFloat(donation.amountDonated || 0);
        row.insertCell().textContent = isNaN(numericAmount) ? 'N/A' : `PHP ${numericAmount.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
        row.insertCell().textContent = donation.invoice || 'N/A';
        row.insertCell().textContent = donation.dateReceived || 'N/A';
        row.insertCell().textContent = donation.email || 'N/A';
        row.insertCell().textContent = donation.bank || 'N/A';
        row.insertCell().textContent = donation.referenceNumber || 'N/A';
        const proofCell = row.insertCell();
        if (donation.proof && typeof donation.proof === 'string' && donation.proof.startsWith('http')) {
            const proofLink = document.createElement('a');
            proofLink.href = donation.proof;
            proofLink.textContent = 'View Proof';
            proofLink.target = '_blank';
            proofLink.rel = 'noopener noreferrer';
            proofCell.appendChild(proofLink);
        } else {
            proofCell.textContent = 'No file selected';
        }

        const actionCell = row.insertCell();
        actionCell.classList.add('action-buttons');
        actionCell.innerHTML = `
            <button class="viewBtn" data-id="${donation.id}" title="View"><i class='bx bx-show-alt'></i></button>
            <button class="action-button restore-button" data-id="${donation.id}" title="Retrieve"><i class='bx bxs-download'></i></button>
        `;
    });

    document.querySelectorAll('.viewBtn').forEach(button => {
        button.addEventListener('click', (event) => {
            const donation = filteredArchivedDonations.find(item => item.id === event.target.dataset.id);
            if (donation) {
                showViewModal(donation);
            } else {
                Swal.fire({
                    title: 'Error',
                    text: 'Archived donation details not found.',
                    icon: 'error',
                    customClass: {
                        popup: 'swal2-popup-error-clean',
                        title: 'swal2-title-error-clean',
                        htmlContainer: 'swal2-text-error-clean'
                    }
                });
            }
        });
    });

    document.querySelectorAll('.restore-button').forEach(button => {
        button.addEventListener('click', (event) => restoreDonation(event.target.dataset.id, filteredArchivedDonations.find(item => item.id === event.target.dataset.id)));
    });

    const totalEntries = filteredArchivedDonations.length;
    const showingStart = totalEntries > 0 ? start + 1 : 0;
    const showingEnd = Math.min(end, totalEntries);
    archivedEntriesInfo.textContent = `Showing ${showingStart} to ${showingEnd} of ${totalEntries} entries`;
    renderArchivedPagination();
}

    // Function to render pagination for archived table
 function renderArchivedPagination() {
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
                renderArchivedPagination(); // Re-render to ensure active state
            }
        });
        return btn;
    };

    // Add Previous button
    archivedPaginationDiv.appendChild(createPaginationButton('Prev', Math.max(1, archivedCurrentPage - 1), archivedCurrentPage === 1));

    // Add numbered buttons
    const maxVisible = 5;
    let startPage = Math.max(1, archivedCurrentPage - Math.floor(maxVisible / 2));
    let endPage = Math.min(pageCount, startPage + maxVisible - 1);
    if (endPage - startPage < maxVisible - 1) {
        startPage = Math.max(1, endPage - maxVisible + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
        archivedPaginationDiv.appendChild(createPaginationButton(i, i, false, i === archivedCurrentPage));
    }

    // Add Next button
    archivedPaginationDiv.appendChild(createPaginationButton('Next', Math.min(pageCount, archivedCurrentPage + 1), archivedCurrentPage === pageCount));

    debugLog('Archived pagination rendered', { pageCount, archivedCurrentPage, startPage, endPage });
}

    // Function to restore an archived donation back to pending
    async function restoreDonation(id, donationData) {
        if (!database) {
            Swal.fire('Error', 'Firebase Database not available.', 'error');
            return;
        }

        Swal.fire({
            title: 'Retrieve Donation?',
            text: 'This will move the monetary donation from archived donations back to approved donations.',
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
                    debugLog('Restoring donation to donations/pending/monetary', donationToRestore);
                    await database.ref('donations/pending/monetary/' + id).set(donationToRestore);
                    await database.ref('donations/pending/archivedDonations/monetary/' + id).remove();
                    debugLog('Removal from donations/pending/archivedDonations/monetary successful', { id });
                    Swal.fire({
                        icon: 'success',
                        title: 'Retrieved!',
                        text: 'The donation has been restored to pending in-kind donations with status reset to pending.',
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

    // Function to delete an archived donation permanently
    async function deleteDonation(id, donationData) {
        if (!database) {
            console.error('Firebase Database not available');
            Swal.fire('Error', 'Cannot connect to Firebase Database. Please check Firebase setup.', 'error');
            return;
        }

        debugLog('deleteDonation called with ID and Data', { id, donationData });

        Swal.fire({
            title: 'Are you sure you want to delete this donation?',
            text: 'This will permanently delete the donation from the archived list. This action cannot be undone.',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'Yes, delete it!',
        }).then(async (result) => {
            if (result.isConfirmed) {
                try {
                    // Validate donation ID and data
                    if (!id || !donationData || typeof donationData !== 'object') {
                        throw new Error('Invalid donation ID or data');
                    }
                    debugLog('Validated ID and donationData', { id, donationData });

                    // Verify donation exists in donations/pending/archivedDonations/monetary
                    const snapshot = await database.ref('donations/pending/archivedDonations/monetary/' + id).once('value');
                    if (!snapshot.exists()) {
                        throw new Error('Donation does not exist in donations/pending/archivedDonations/monetary');
                    }
                    debugLog('Donation exists in donations/pending/archivedDonations/monetary', snapshot.val());

                    // Remove specific donation
                    await database.ref('donations/pending/archivedDonations/monetary/' + id).remove();
                    debugLog('Donation removed from donations/pending/archivedDonations/monetary', { id });

                    // Verify parent node still exists
                    const parentSnapshot = await database.ref('donations/pending/archivedDonations/monetary').once('value');
                    debugLog('Parent node after deletion', parentSnapshot.val());

                    Swal.fire('Deleted!', 'The monetary donation has been permanently deleted.', 'success');
                    loadArchivedDonationsFromFirebase();
                } catch (error) {
                    console.error('Error in deleteDonation:', error);
                    Swal.fire('Error', `Failed to delete monetary donation. Error: ${error.message}`, 'error');
                }
            }
        });
    }

    // Event listener to open the archived modal
    if (viewArchivedBtn) {
        viewArchivedBtn.addEventListener('click', () => {
            console.log('View Archived button clicked.');
            archivedModal.style.display = 'flex';
            loadArchivedDonationsFromFirebase();
        });
    }

    // Event listener to close the archived modal
    if (closeArchivedModalBtn) {
        closeArchivedModalBtn.addEventListener('click', () => {
            console.log('Close archived modal button clicked.');
            archivedModal.style.display = 'none';
            archivedCurrentPage = 1;
            archivedTableBody.innerHTML = '';
            archivedPaginationDiv.innerHTML = '';
            archivedEntriesInfo.textContent = 'Showing 0 to 0 of 0 entries';
        });
    }

    // Close modal when clicking outside of it
    window.addEventListener('click', (event) => {
        if (event.target === archivedModal) {
            archivedModal.style.display = 'none';
            archivedCurrentPage = 1;
            archivedTableBody.innerHTML = '';
            archivedPaginationDiv.innerHTML = '';
            archivedEntriesInfo.textContent = 'Showing 0 to 0 of 0 entries';
        }
    });

    // Initialize table loading
    loadMonetaryDonationsFromFirebase();
});
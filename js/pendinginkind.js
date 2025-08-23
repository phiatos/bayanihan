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

if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
} else {
  firebase.app(); // if already initialized, use that one
}

const database = firebase.database();

// EmailJS Configuration
const serviceID = 'service_mzpjk2a';
const templateID = 'template_owchxrw';
const publicKey = 'zQTkHE6hGtoKPZM_L';

// Initialize EmailJS
emailjs.init(publicKey);

// Global variables for managing donations and UI state
let allDonations = [];
let filteredDonations = [];
let currentPage = 1;
const rowsPerPage = 10;

// Archived
let allArchivedDonations = [];
let filteredAndSortedArchivedDonations = [];
let archivedCurrentPage = 1;

// DOMContentLoaded ensures the script runs after the HTML is fully loaded
document.addEventListener('DOMContentLoaded', function() {
    // Get references to DOM elements
    const donationTableBody = document.getElementById('donationTableBody');
    const searchInput = document.getElementById('searchInput');
    const sortSelect = document.getElementById('sortSelect');
    const entriesInfo = document.getElementById('entriesInfo');
    const paginationDiv = document.getElementById('pagination');

    // Archived
    const viewArchivedBtn = document.getElementById("viewArchived");
    const archivedTableBody = document.querySelector('#archivedTable tbody');
    const archivedEntriesInfo = document.getElementById('archivedEntriesInfo');
    const archivedPaginationContainer = document.getElementById("archivedPagination");
    const closeArchivedModalBtn = document.getElementById("closeArchivedModalBtn");

    // Function to load pending donations from Firebase Realtime Database
    let pendingListener = null;
    function loadDonationsFromFirebase() {
        console.log('1. loadDonationsFromFirebase called.');
        const pendingInkindDonationsRef = database.ref('donations/pending/inkind');

        pendingListener = pendingInkindDonationsRef.on('value', (snapshot) => {
            console.log('2. Firebase snapshot received for pendingInkind.');
            const donationsObject = snapshot.val();
            const loadedDonations = [];

            if (donationsObject) {
                for (let key in donationsObject) {
                    if (donationsObject.hasOwnProperty(key)) {
                        const donation = donationsObject[key];
                        if (donation && typeof donation === 'object' && key) {
                            loadedDonations.push({ id: key, ...donation });
                        } else {
                            console.warn('Invalid donation data found for ID:', key, donation);
                        }
                    }
                }
            }
            console.log('3. Loaded donations from Firebase (with IDs):', loadedDonations);

            allDonations = loadedDonations;
            console.log('4. All donations loaded:', allDonations);

            applyFiltersAndSort();
        }, (error) => {
            console.error("Error fetching data from Firebase:", error);
            Swal.fire('Error', 'Failed to load donations from Firebase. Please check your connection and Firebase rules.', 'error');
            if (donationTableBody) {
                donationTableBody.innerHTML = '<tr><td colspan="15" style="text-align: center; padding: 20px; color: red;">Failed to load data from Firebase.</td></tr>';
            }
            entriesInfo.textContent = 'Showing 0 to 0 of 0 entries';
            paginationDiv.innerHTML = '';
        });
    }

    // Load archived donations
    const archivedInkindDonationsRef = database.ref('donations/pending/inkind/archivedInkind');
    archivedInkindDonationsRef.on('value', (snapshot) => {
        console.log('Firebase snapshot received for archivedInkind.');
        const donationsObject = snapshot.val();
        allArchivedDonations = [];
        if (donationsObject) {
            for (let key in donationsObject) {
                if (donationsObject.hasOwnProperty(key)) {
                    const donation = donationsObject[key];
                    if (donation && typeof donation === 'object' && key) {
                        allArchivedDonations.push({ id: key, ...donation });
                    } else {
                        console.warn('Invalid archived donation data found for ID:', key, donation);
                    }
                }
            }
        }
        console.log('Loaded archived donations:', allArchivedDonations);
        applyArchivedFiltersAndSort();
    }, (error) => {
        console.error("Error fetching archived donations:", error);
        Swal.fire('Error', 'Failed to load archived in-kind donations.', 'error');
        if (archivedTableBody) {
            archivedTableBody.innerHTML = '<tr><td colspan="15" style="text-align: center; padding: 20px; color: red;">Failed to load archived data.</td></tr>';
        }
        archivedEntriesInfo.textContent = 'Showing 0 to 0 of 0 entries';
    });

    // Variables for inactivity detection
    let inactivityTimeout;
    const INACTIVITY_TIME = 1800000; // 30 minutes in milliseconds

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
                console.log("User logged out due to inactivity.");
                localStorage.removeItem('userRole');
                window.location.href = "../pages/login.html";
            }
        });
    }

    ['mousemove', 'keydown', 'scroll', 'click'].forEach(eventType => {
        document.addEventListener(eventType, resetInactivityTimer);
    });

    function applyFiltersAndSort() {
        console.log('5. applyFiltersAndSort called.');
        filteredDonations = allDonations.filter(donation => 
            donation != null && 
            donation.id && 
            donation.status !== 'Rejected' && 
            typeof donation === 'object' && 
            (donation.encoder || donation.name || donation.assistance)
        );
        console.log('6. Filtered donations (before search):', filteredDonations);

        const searchTerm = searchInput.value.toLowerCase();
        if (searchTerm) {
            filteredDonations = filteredDonations.filter(donation =>
                (donation.encoder && String(donation.encoder).toLowerCase().includes(searchTerm)) ||
                (donation.donorName && String(donation.donorName).toLowerCase().includes(searchTerm)) ||
                (donation.contactPerson && String(donation.contactPerson).toLowerCase().includes(searchTerm)) ||
                (donation.itemType && String(donation.itemType).toLowerCase().includes(searchTerm)) ||
                (donation.staffInCharge && String(donation.staffInCharge).toLowerCase().includes(searchTerm)) ||
                (donation.description && String(donation.description).toLowerCase().includes(searchTerm)) ||
                (donation.status && String(donation.status).toLowerCase().includes(searchTerm))
            );
        }
        console.log('7. After search filter, filteredDonations count:', filteredDonations.length, filteredDonations);

        const sortValue = sortSelect.value;
        if (sortValue) {
            const [field, order] = sortValue.split('-');
            filteredDonations.sort((a, b) => {
                const valA = a[field] ? String(a[field]).toLowerCase() : '';
                const valB = b[field] ? String(b[field]).toLowerCase() : '';
                if (order === 'asc') {
                    return valA.localeCompare(valB);
                } else {
                    return valB.localeCompare(valA);
                }
            });
        }
        console.log('8. After sort, filteredDonations count:', filteredDonations.length);

        updatePaginationInfo();
        renderPagination();
    }

    function applyArchivedFiltersAndSort() {
        console.log('applyArchivedFiltersAndSort called.');
        filteredAndSortedArchivedDonations = allArchivedDonations.filter(donation => 
            donation != null && 
            donation.id && 
            typeof donation === 'object'
        );
        console.log('Filtered and sorted archived donations:', filteredAndSortedArchivedDonations);
        archivedCurrentPage = 1;
        renderArchivedTable();
    }

    viewArchivedBtn.addEventListener('click', () => {
        console.log('View Archived button clicked.');
        document.getElementById('archivedModal').style.display = 'block';
        archivedInkindDonationsRef.once('value').then((snapshot) => {
            const donationsObject = snapshot.val();
            allArchivedDonations = [];
            if (donationsObject) {
                for (let key in donationsObject) {
                    if (donationsObject.hasOwnProperty(key)) {
                        const donation = donationsObject[key];
                        if (donation && typeof donation === 'object' && key) {
                            allArchivedDonations.push({ id: key, ...donation });
                        } else {
                            console.warn('Invalid archived donation data found for ID:', key, donation);
                        }
                    }
                }
            }
            console.log('Force fetched archived donations:', allArchivedDonations);
            applyArchivedFiltersAndSort();
        }).catch((error) => {
            console.error("Error force fetching archived donations:", error);
            Swal.fire('Error', 'Failed to load archived donations.', 'error');
        });
    });

    closeArchivedModalBtn.addEventListener('click', () => {
        console.log('Close Archived Modal button clicked.');
        document.getElementById('archivedModal').style.display = 'none';
    });

    searchInput.addEventListener('input', applyFiltersAndSort);
    sortSelect.addEventListener('change', applyFiltersAndSort);

    function renderTable() {
        console.log('9. renderTable called.');
        if (!donationTableBody) {
            console.error("ERROR: 'donationTableBody' element not found. Table cannot be rendered.");
            return;
        }

        donationTableBody.innerHTML = '';
        const start = (currentPage - 1) * rowsPerPage;
        const end = start + rowsPerPage;
        const paginatedItems = filteredDonations.slice(start, end);
        console.log('10. Items to render on current page:', paginatedItems);

        if (paginatedItems.length === 0) {
            donationTableBody.innerHTML = '<tr><td colspan="15" style="text-align: center; padding: 20px;">No pending in-kind donations found matching your criteria.</td></tr>';
            entriesInfo.textContent = 'Showing 0 to 0 of 0 entries';
            return;
        }

        paginatedItems.forEach((donation, index) => {
            if (!donation.id || donation.status === 'Rejected') {
                console.warn('Skipping invalid or rejected donation in renderTable:', donation);
                return;
            }
            const row = donationTableBody.insertRow();
            row.insertCell().textContent = start + index + 1;
            row.insertCell().textContent = donation.encoder || 'N/A';
            row.insertCell().textContent = donation.name || 'N/A';
            row.insertCell().textContent = donation.type || 'N/A';
            row.insertCell().textContent = donation.address || 'N/A';
            row.insertCell().textContent = donation.contactPerson || 'N/A';
            row.insertCell().textContent = donation.number || 'N/A';
            row.insertCell().textContent = donation.email || 'N/A';
            row.insertCell().textContent = donation.assistance || 'N/A';
            const numericValue = parseFloat(donation.valuation || 0);
            row.insertCell().textContent = isNaN(numericValue) ? 'N/A' : `PHP ${numericValue.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
            row.insertCell().textContent = donation.additionalnotes || 'N/A';
            row.insertCell().textContent = donation.staffIncharge || 'N/A';
            row.insertCell().textContent = donation.donationDate || 'N/A';
            row.insertCell().innerHTML = `<span class="status-${donation.status ? donation.status.toLowerCase() : 'na'}">${donation.status || 'N/A'}</span>`;

            const actionCell = row.insertCell();
            actionCell.classList.add('action-buttons');

            const approveButton = document.createElement('button');
            approveButton.className = 'action-button approve-button';
            approveButton.innerHTML = '<i class="bx bx-check"></i> Approve';
            if (donation.status !== 'Approved' && donation.status !== 'Rejected') {
                approveButton.addEventListener('click', () => updateDonationStatus(donation.id, donation, 'Approved'));
                actionCell.appendChild(approveButton);
            }

            const rejectButton = document.createElement('button');
            rejectButton.className = 'action-button reject-button';
            rejectButton.innerHTML = '<i class="bx bx-x"></i> Reject';
            if (donation.status !== 'Approved' && donation.status !== 'Rejected') {
                rejectButton.addEventListener('click', () => updateDonationStatus(donation.id, donation, 'Rejected'));
                actionCell.appendChild(rejectButton);
            }
        });

        const totalEntries = filteredDonations.length;
        const showingStart = totalEntries > 0 ? start + 1 : 0;
        const showingEnd = Math.min(end, totalEntries);
        entriesInfo.textContent = `Showing ${showingStart} to ${showingEnd} of ${totalEntries} entries`;
    }

    function renderArchivedTable() {
        console.log('renderArchivedTable called.');
        if (!archivedTableBody) {
            console.error("ERROR: 'archivedTableBody' element not found.");
            return;
        }

        archivedTableBody.innerHTML = '';
        const start = (archivedCurrentPage - 1) * rowsPerPage;
        const end = start + rowsPerPage;
        const paginatedItems = filteredAndSortedArchivedDonations.slice(start, end);
        console.log('Items to render in archived table:', paginatedItems);

        if (paginatedItems.length === 0) {
            archivedTableBody.innerHTML = '<tr><td colspan="15" style="text-align: center; padding: 20px;">No archived in-kind donations found.</td></tr>';
        } else {
            paginatedItems.forEach((donation, index) => {
                if (!donation.id) {
                    console.warn('Skipping invalid archived donation in renderArchivedTable:', donation);
                    return;
                }
                const row = archivedTableBody.insertRow();
                row.insertCell().textContent = start + index + 1;
                row.insertCell().textContent = donation.encoder || 'N/A';
                row.insertCell().textContent = donation.name || 'N/A';
                row.insertCell().textContent = donation.type || 'N/A';
                row.insertCell().textContent = donation.address || 'N/A';
                row.insertCell().textContent = donation.contactPerson || 'N/A';
                row.insertCell().textContent = donation.number || 'N/A';
                row.insertCell().textContent = donation.email || 'N/A';
                row.insertCell().textContent = donation.assistance || 'N/A';
                const numericValue = parseFloat(donation.valuation || 0);
                row.insertCell().textContent = isNaN(numericValue) ? 'N/A' : `PHP ${numericValue.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
                row.insertCell().textContent = donation.additionalnotes || 'N/A';
                row.insertCell().textContent = donation.staffIncharge || 'N/A';
                row.insertCell().textContent = donation.donationDate || 'N/A';
                row.insertCell().innerHTML = `<span class="status-${donation.status ? donation.status.toLowerCase() : 'na'}">${donation.status || 'N/A'}</span>`;

                const actionCell = row.insertCell();
                actionCell.classList.add('action-buttons');
                if (localStorage.getItem('userRole') === 'AB ADMIN') {
                    const retrieveButton = document.createElement('button');
                    retrieveButton.className = 'action-button retrieve-button';
                    retrieveButton.innerHTML = '<i class="bx bx-undo"></i> Retrieve';
                    retrieveButton.addEventListener('click', () => retrieveDonation(donation.id, donation));
                    actionCell.appendChild(retrieveButton);
                }
            });
        }

        const totalEntries = filteredAndSortedArchivedDonations.length;
        const showingStart = totalEntries > 0 ? start + 1 : 0;
        const showingEnd = Math.min(end, totalEntries);
        archivedEntriesInfo.textContent = `Showing ${showingStart} to ${showingEnd} of ${totalEntries} entries`;
        renderArchivedPagination();
    }

    function renderPagination() {
        if (!paginationContainer) return;
        paginationContainer.innerHTML = '';
        const totalPages = Math.ceil(filteredAndSortedDonations.length / rowsPerPage);

        if (totalPages === 0) {
            paginationContainer.innerHTML = '<span>No entries to display</span>';
            return;
        }

        const createPaginationButton = (label, page, disabled = false, isActive = false) => {
            const btn = document.createElement('button');
            btn.textContent = label;
            if (disabled) btn.disabled = true;
            if (isActive) btn.classList.add('active-page');
            btn.addEventListener('click', () => {
                if (!disabled) {
                    currentPage = page;
                    renderTable();
                }
            });
            return btn;
        };

        paginationContainer.appendChild(createPaginationButton('Prev', Math.max(1, currentPage - 1), currentPage === 1));

        const maxVisible = 5;
        let startPage = Math.max(1, currentPage - Math.floor(maxVisible / 2));
        let endPage = Math.min(totalPages, startPage + maxVisible - 1);
        if (endPage - startPage < maxVisible - 1) {
            startPage = Math.max(1, endPage - maxVisible + 1);
        }

        for (let i = startPage; i <= endPage; i++) {
            paginationContainer.appendChild(createPaginationButton(i, i, false, i === currentPage));
        }
    }

    function renderArchivedPagination() {
        archivedPaginationContainer.innerHTML = '';
        const pageCount = Math.ceil(filteredAndSortedArchivedDonations.length / rowsPerPage);

        if (pageCount <= 1) {
            return;
        }

        for (let i = 1; i <= pageCount; i++) {
            const button = document.createElement('button');
            button.textContent = i;
            button.classList.add('pagination-button');
            if (i === archivedCurrentPage) {
                button.classList.add('active');
            }
            button.addEventListener('click', () => {
                archivedCurrentPage = i;
                renderArchivedTable();
            });
            archivedPaginationContainer.appendChild(button);
        }
    }

    async function archiveDonation(id, donationData) {
        Swal.fire({
            title: 'Archive Donation?',
            text: `Are you sure you want to archive this in-kind donation from ${donationData.name || 'Unknown'}?`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#3085d6',
            cancelButtonColor: '#d33',
            confirmButtonText: 'Yes, archive it!',
            cancelButtonText: 'Cancel'
        }).then(async (result) => {
            if (result.isConfirmed) {
                try {
                    if (!navigator.onLine) {
                        throw new Error("No internet connection. Please check your network.");
                    }
                    const donationRef = database.ref(`donations/pending/inkind/${id}`);
                    const snapshot = await donationRef.once('value');
                    const donation = snapshot.val();

                    if (!donation || !donation.id) {
                        throw new Error("Donation data not found or invalid.");
                    }

                    const archivedDonation = {
                        ...donation,
                        archivedTimestamp: Date.now(),
                        archivedBy: localStorage.getItem('userRole') || 'Unknown',
                        archiveReason: 'Archived by user'
                    };

                    console.log('Archiving to:', `donations/pending/inkind/archivedInkind/${id}`, archivedDonation);
                    await database.ref(`donations/pending/inkind/archivedInkind/${id}`).set(archivedDonation);
                    console.log('Removing from:', `donations/pending/inkind/${id}`);
                    if (pendingListener) {
                        database.ref('donations/pending/inkind').off('value', pendingListener);
                    }
                    await donationRef.remove().catch(error => {
                        throw new Error(`Failed to remove donation from donations/pending/inkind: ${error.message}`);
                    });
                    const checkSnapshot = await donationRef.once('value');
                    if (checkSnapshot.exists()) {
                        throw new Error("Failed to delete donation from donations/pending/inkind.");
                    }
                    console.log('Donation removed successfully from donations/pending/inkind');
                    loadDonationsFromFirebase();

                    const message = `In-kind donation from "${donation.name || 'Unknown'}" archived by ${localStorage.getItem('userRole') || 'Unknown'} from ${localStorage.getItem('organization') || 'Unknown Group'} on ${new Date().toLocaleDateString('en-US')}.`;
                    await notifyAdmin(
                        message,
                        null,
                        null,
                        null,
                        id,
                        donation.name || 'Unknown',
                        localStorage.getItem('organization') || 'Unknown Group'
                    );

                    // Force refresh allDonations
                    const pendingSnapshot = await database.ref('donations/pending/inkind').once('value');
                    const donationsObject = pendingSnapshot.val();
                    allDonations = [];
                    if (donationsObject) {
                        for (let key in donationsObject) {
                            if (donationsObject.hasOwnProperty(key)) {
                                const donation = donationsObject[key];
                                if (donation && typeof donation === 'object' && key) {
                                    allDonations.push({ id: key, ...donation });
                                } else {
                                    console.warn('Invalid donation data found during force refresh for ID:', key, donation);
                                }
                            }
                        }
                    }
                    console.log('Force fetched pending donations after archive:', allDonations);

                    // Update allArchivedDonations
                    const archivedSnapshot = await database.ref('donations/pending/inkind/archivedInkind').once('value');
                    const archivedDonationsObject = archivedSnapshot.val();
                    allArchivedDonations = [];
                    if (archivedDonationsObject) {
                        for (let key in archivedDonationsObject) {
                            if (archivedDonationsObject.hasOwnProperty(key)) {
                                const donation = archivedDonationsObject[key];
                                if (donation && typeof donation === 'object' && key) {
                                    allArchivedDonations.push({ id: key, ...donation });
                                } else {
                                    console.warn('Invalid archived donation data found during force refresh for ID:', key, donation);
                                }
                            }
                        }
                    }
                    console.log('Force fetched archived donations after archive:', allArchivedDonations);

                    Swal.fire('Archived!', 'The donation has been archived.', 'success');
                    applyFiltersAndSort();
                    applyArchivedFiltersAndSort();
                } catch (error) {
                    console.error("Error archiving donation:", error);
                    Swal.fire('Error', `Failed to archive donation: ${error.message}`, 'error');
                    if (!pendingListener) {
                        loadDonationsFromFirebase();
                    }
                }
            }
        });
    }

    async function retrieveDonation(id, donationData) {
        Swal.fire({
            title: 'Retrieve Donation?',
            text: `Are you sure you want to retrieve this in-kind donation from ${donationData.name || 'Unknown'}?`,
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: '#3085d6',
            cancelButtonColor: '#d33',
            confirmButtonText: 'Yes, retrieve it!',
            cancelButtonText: 'Cancel'
        }).then(async (result) => {
            if (result.isConfirmed) {
                try {
                    if (!navigator.onLine) {
                        throw new Error("No internet connection. Please check your network.");
                    }
                    const archivedRef = database.ref(`donations/pending/inkind/archivedInkind/${id}`);
                    const snapshot = await archivedRef.once('value');
                    const archivedDonation = snapshot.val();

                    if (!archivedDonation || !archivedDonation.id) {
                        throw new Error("Archived donation data not found or invalid.");
                    }

                    const { archivedTimestamp, archivedBy, archiveReason, status, ...restoredDonation } = archivedDonation;
                    const updatedDonation = {
                        ...restoredDonation,
                        status: 'pending',
                        retrievedTimestamp: Date.now(),
                        retrievedBy: localStorage.getItem('userRole') || 'Unknown'
                    };

                    console.log('Restoring to:', `donations/pending/inkind/${id}`, updatedDonation);
                    await database.ref(`donations/pending/inkind/${id}`).set(updatedDonation);
                    console.log('Removing from:', `donations/pending/inkind/archivedInkind/${id}`);
                    await archivedRef.remove().catch(error => {
                        throw new Error(`Failed to remove donation from donations/pending/inkind/archivedInkind: ${error.message}`);
                    });
                    const checkSnapshot = await archivedRef.once('value');
                    if (checkSnapshot.exists()) {
                        throw new Error("Failed to delete donation from donations/pending/inkind/archivedInkind.");
                    }
                    console.log('Donation removed successfully from donations/pending/inkind/archivedInkind');
                    loadDonationsFromFirebase();

                    const message = `In-kind donation from "${archivedDonation.name || 'Unknown'}" retrieved by ${localStorage.getItem('userRole') || 'Unknown'} from ${localStorage.getItem('organization') || 'Unknown Group'} on ${new Date().toLocaleDateString('en-US')}. Status reset to pending.`;
                    await notifyAdmin(
                        message,
                        null,
                        null,
                        null,
                        id,
                        archivedDonation.name || 'Unknown',
                        localStorage.getItem('organization') || 'Unknown Group'
                    );

                    // Force refresh allDonations
                    const pendingSnapshot = await database.ref('donations/pending/inkind').once('value');
                    const donationsObject = pendingSnapshot.val();
                    allDonations = [];
                    if (donationsObject) {
                        for (let key in donationsObject) {
                            if (donationsObject.hasOwnProperty(key)) {
                                const donation = donationsObject[key];
                                if (donation && typeof donation === 'object' && key) {
                                    allDonations.push({ id: key, ...donation });
                                } else {
                                    console.warn('Invalid donation data found during force refresh for ID:', key, donation);
                                }
                            }
                        }
                    }
                    console.log('Force fetched pending donations after retrieve:', allDonations);

                    // Update allArchivedDonations
                    const archivedSnapshot = await database.ref('donations/pending/inkind/archivedInkind').once('value');
                    const archivedDonationsObject = archivedSnapshot.val();
                    allArchivedDonations = [];
                    if (archivedDonationsObject) {
                        for (let key in archivedDonationsObject) {
                            if (archivedDonationsObject.hasOwnProperty(key)) {
                                const donation = archivedDonationsObject[key];
                                if (donation && typeof donation === 'object' && key) {
                                    allArchivedDonations.push({ id: key, ...donation });
                                } else {
                                    console.warn('Invalid archived donation data found during force refresh for ID:', key, donation);
                                }
                            }
                        }
                    }
                    console.log('Force fetched archived donations after retrieve:', allArchivedDonations);

                    Swal.fire('Retrieved!', 'The donation has been restored to pending in-kind donations with status reset to pending.', 'success');
                    document.getElementById('archivedModal').style.display = 'none';
                    applyFiltersAndSort();
                    applyArchivedFiltersAndSort();
                } catch (error) {
                    console.error("Error retrieving donation:", error);
                    Swal.fire('Error', `Failed to retrieve donation: ${error.message}`, 'error');
                }
            }
        });
    }

    function sendApprovalEmail(donation) {
        const donorEmail = donation.email;
        const donorName = donation.name || 'Donor';

        if (!donorEmail) {
            console.warn("No email address provided for this donor. Skipping email notification.");
            return;
        }

        const templateParams = {
            to_email: donorEmail,
            donor_name: donorName,
            item_type: donation.assistance || 'N/A',
            description: donation.additionalnotes || 'N/A',
            valuation: donation.valuation || 'N/A',
            donation_date: donation.donationDate || 'N/A'
        };

        if (donation.valuation && !isNaN(parseFloat(donation.valuation))) {
            templateParams.valuation = parseFloat(donation.valuation).toLocaleString('en-PH', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
            });
        } else {
            templateParams.valuation = 'N/A';
        }

        emailjs.send(serviceID, templateID, templateParams)
            .then((response) => {
                console.log('Email successfully sent!', response.status, response.text);
                Swal.fire({
                    title: 'Email Sent!',
                    text: 'The donor has been notified via email.',
                    icon: 'success',
                    showConfirmButton: false,
                    timer: 2000
                });
            }, (error) => {
                console.error('Failed to send email:', error);
                Swal.fire('Email Error', 'Failed to send the approval email. Please check your EmailJS settings.', 'error');
            });
    }

    async function updateDonationStatus(id, donationData, newStatus) {
        Swal.fire({
            title: `Are you sure you want to ${newStatus.toLowerCase()} this donation?`,
            text: newStatus === 'Approved' 
                ? 'This will move the donation to the saved donations list and send an email to the donor.'
                : 'This will move the donation to the archived list with a Rejected status.',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#3085d6',
            cancelButtonColor: '#d33',
            confirmButtonText: `Yes, ${newStatus.toLowerCase()} it!`,
            customClass: {
                confirmButton: 'my-confirm-button-class',
                cancelButton: 'my-cancel-button-class'
            }
        }).then(async (result) => {
            if (result.isConfirmed) {
                try {
                    if (!navigator.onLine) {
                        throw new Error("No internet connection. Please check your network.");
                    }
                    const donationRef = database.ref(`donations/pending/inkind/${id}`);
                    const snapshot = await donationRef.once('value');
                    const donation = snapshot.val();
                    console.log('Donation data for ID', id, ':', donation);

                    if (!donation || !donation.id || typeof donation !== 'object') {
                        throw new Error("Donation data not found or invalid in donations/pending/inkind.");
                    }

                    if (newStatus === 'Approved') {
                        const approvedDonation = {
                            ...donation,
                            status: 'Approved',
                            approvedAt: new Date().toISOString(),
                            updatedAt: new Date().toISOString(),
                            approvedBy: localStorage.getItem('userRole') || 'Unknown'
                        };
                        console.log('Saving to:', `donations/savedDonations/inkind/${id}`, approvedDonation);
                        await database.ref(`donations/savedDonations/inkind/${id}`).set(approvedDonation);
                        console.log('Removing from:', `donations/pending/inkind/${id}`);
                        if (pendingListener) {
                            database.ref('donations/pending/inkind').off('value', pendingListener);
                        }
                        await donationRef.remove().catch(error => {
                            throw new Error(`Failed to remove donation from donations/pending/inkind: ${error.message}`);
                        });
                        const checkSnapshot = await donationRef.once('value');
                        if (checkSnapshot.exists()) {
                            throw new Error("Failed to delete donation from donations/pending/inkind.");
                        }
                        console.log('Donation removed successfully from donations/pending/inkind');
                        loadDonationsFromFirebase();

                        const message = `In-kind donation from "${donation.donorName || 'Unknown'}" approved by ${localStorage.getItem('userRole') || 'Unknown'} from ${localStorage.getItem('organization') || 'Unknown Group'} on ${new Date().toLocaleDateString('en-US')}.`;
                        await notifyAdmin(
                            message,
                            null,
                            null,
                            null,
                            id,
                            donation.donorName || 'Unknown',
                            localStorage.getItem('organization') || 'Unknown Group'
                        );

                        sendApprovalEmail(donation);
                    } else if (newStatus === 'Rejected') {
                        console.log('Rejecting donation with ID:', id);
                        const archivedDonation = {
                            ...donation,
                            status: 'Rejected',
                            archivedTimestamp: Date.now(),
                            archivedBy: localStorage.getItem('userRole') || 'Unknown',
                            archiveReason: 'Rejected by user'
                        };
                        console.log('Archiving to:', `donations/pending/inkind/archivedInkind/${id}`, archivedDonation);
                        await database.ref(`donations/pending/inkind/archivedInkind/${id}`).set(archivedDonation);
                        console.log('Removing from:', `donations/pending/inkind/${id}`);
                        if (pendingListener) {
                            database.ref('donations/pending/inkind').off('value', pendingListener);
                        }
                        await donationRef.remove().catch(error => {
                            throw new Error(`Failed to remove donation from donations/pending/inkind: ${error.message}`);
                        });
                        const checkSnapshot = await donationRef.once('value');
                        if (checkSnapshot.exists()) {
                            throw new Error("Failed to delete donation from donations/pending/inkind.");
                        }
                        console.log('Donation removed successfully from donations/pending/inkind');
                        loadDonationsFromFirebase();

                        const message = `In-kind donation from "${donation.donorName || 'Unknown'}" rejected and archived by ${localStorage.getItem('userRole') || 'Unknown'} from ${localStorage.getItem('organization') || 'Unknown Group'} on ${new Date().toLocaleDateString('en-US')}.`;
                        await notifyAdmin(
                            message,
                            null,
                            null,
                            null,
                            id,
                            donation.donorName || 'Unknown',
                            localStorage.getItem('organization') || 'Unknown Group'
                        );

                        // Force refresh allDonations
                        const pendingSnapshot = await database.ref('donations/pending/inkind').once('value');
                        const donationsObject = pendingSnapshot.val();
                        allDonations = [];
                        if (donationsObject) {
                            for (let key in donationsObject) {
                                if (donationsObject.hasOwnProperty(key)) {
                                    const donation = donationsObject[key];
                                    if (donation && typeof donation === 'object' && key) {
                                        allDonations.push({ id: key, ...donation });
                                    } else {
                                        console.warn('Invalid donation data found during force refresh for ID:', key, donation);
                                    }
                                }
                            }
                        }
                        console.log('Force fetched pending donations after reject:', allDonations);

                        // Update allArchivedDonations
                        const archivedSnapshot = await database.ref('donations/pending/inkind/archivedInkind').once('value');
                        const archivedDonationsObject = archivedSnapshot.val();
                        allArchivedDonations = [];
                        if (archivedDonationsObject) {
                            for (let key in archivedDonationsObject) {
                                if (archivedDonationsObject.hasOwnProperty(key)) {
                                    const donation = archivedDonationsObject[key];
                                    if (donation && typeof donation === 'object' && key) {
                                        allArchivedDonations.push({ id: key, ...donation });
                                    } else {
                                        console.warn('Invalid archived donation data found during force refresh for ID:', key, donation);
                                    }
                                }
                            }
                        }
                        console.log('Force fetched archived donations after reject:', allArchivedDonations);
                    }

                    applyFiltersAndSort();
                    applyArchivedFiltersAndSort();
                    Swal.fire('Updated!', `Donation has been ${newStatus.toLowerCase()}.`, 'success');
                } catch (error) {
                    console.error(`Error processing donation status to ${newStatus} in Firebase:`, error);
                    Swal.fire('Error', `Failed to ${newStatus.toLowerCase()} donation. Error: ${error.message}`, 'error');
                    if (!pendingListener) {
                        loadDonationsFromFirebase();
                    }
                }
            }
        });
    }

    async function notifyAdmin(message, userId, userEmail, userName, donationId, donorName, organization) {
        try {
            await database.ref('notifications').push({
                message,
                userId,
                userEmail,
                userName,
                donationId,
                donorName,
                organization,
                timestamp: Date.now()
            });
            console.log('Admin notified:', message);
        } catch (error) {
            console.error('Error notifying admin:', error);
        }
    }

    loadDonationsFromFirebase();
});
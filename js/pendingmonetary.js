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
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
} else {
    // If already initialized, just get the default app
    firebase.app();
}

const database = firebase.database();

// Global variables for managing donations and UI state
let allMonetaryDonations = []; 
let filteredMonetaryDonations = []; 
let currentPage = 1;
const rowsPerPage = 10;

document.addEventListener('DOMContentLoaded', function() {
    // Get references to DOM elements
    const donationTableBody = document.getElementById('donationTableBody');
    const searchInput = document.getElementById('searchInput');
    const sortSelect = document.getElementById('sortSelect');
    const entriesInfo = document.getElementById('entriesInfo');
    const paginationDiv = document.getElementById('pagination');

    // Function to load pending monetary donations from Firebase Realtime Database
    function loadMonetaryDonationsFromFirebase() {
        console.log('1. loadMonetaryDonationsFromFirebase called.');
        // Ensure this path matches where your monetary donations are actually stored (e.g., by donatenearme.js)
        const monetaryDonationsRef = database.ref('pendingMonetary'); 

        // Listen for changes in the 'donations/monetary' path
        monetaryDonationsRef.on('value', (snapshot) => {
            console.log('2. Firebase snapshot received for monetary donations.');
            const donationsObject = snapshot.val();
            const loadedDonations = [];

            if (donationsObject) {
                for (let key in donationsObject) {
                    if (donationsObject.hasOwnProperty(key)) {
                        const donation = donationsObject[key];
                        loadedDonations.push({ id: key, ...donation });
                    }
                }
            }
            console.log('3. Loaded monetary donations from Firebase (with IDs):', loadedDonations);

            allMonetaryDonations = loadedDonations; 
            console.log('4. All monetary donations loaded:', allMonetaryDonations);

            applyFiltersAndSort(); // Apply filters/sort and render table with the new data
        }, (error) => {
            // Error handling if data fetching fails
            console.error("Error fetching data from Firebase:", error);
            Swal.fire('Error', 'Failed to load monetary donations from Firebase. Please check your connection and Firebase rules.', 'error');
            if (donationTableBody) {
                donationTableBody.innerHTML = '<tr><td colspan="12" style="text-align: center; padding: 20px; color: red;">Failed to load data from Firebase.</td></tr>'; 
            }
            entriesInfo.textContent = 'Showing 0 to 0 of 0 entries';
            paginationDiv.innerHTML = '';
        });
    }

    // Function to apply search filters and sorting, then re-render the table
    function applyFiltersAndSort() {
        console.log('5. applyFiltersAndSort called.');
        filteredMonetaryDonations = [...allMonetaryDonations];

        // Apply search filter if a search term is present
        const searchTerm = searchInput.value.toLowerCase();
        if (searchTerm) {
            filteredMonetaryDonations = filteredMonetaryDonations.filter(donation =>
                (donation.encoder && String(donation.encoder).toLowerCase().includes(searchTerm)) ||
                (donation.name && String(donation.name).toLowerCase().includes(searchTerm)) || 
                (donation.location && String(donation.location).toLowerCase().includes(searchTerm)) ||
                (donation.email && String(donation.email).toLowerCase().includes(searchTerm)) ||
                (donation.bankUsed && String(donation.bankUsed).toLowerCase().includes(searchTerm)) 
            );
        }
        console.log('6. After search filter, filteredMonetaryDonations count:', filteredMonetaryDonations.length);

        // Apply sorting based on selected option
        const sortValue = sortSelect.value;
        if (sortValue) {
            const [field, order] = sortValue.split('-');
            filteredMonetaryDonations.sort((a, b) => {
                const valA = a[field] ? String(a[field]).toLowerCase() : '';
                const valB = b[field] ? String(b[field]).toLowerCase() : '';

                if (order === 'asc') {
                    return valA.localeCompare(valB);
                } else {
                    return valB.localeCompare(valA);
                }
            });
        }
        console.log('7. After sort, filteredMonetaryDonations count:', filteredMonetaryDonations.length);

        currentPage = 1;
        renderTable();
        renderPagination();
    }

    // Event listeners for search input and sort select
    searchInput.addEventListener('input', applyFiltersAndSort);
    sortSelect.addEventListener('change', applyFiltersAndSort);

// Function to render the donation table rows for the current page
function renderTable() {
    console.log('8. renderTable called.');
    if (!donationTableBody) {
        console.error("ERROR: 'donationTableBody' element not found. Table cannot be rendered.");
        return;
    }

    donationTableBody.innerHTML = '';
    const start = (currentPage - 1) * rowsPerPage;
    const end = start + rowsPerPage;
    const paginatedItems = filteredMonetaryDonations.slice(start, end);
    console.log('9. Items to render on current page:', paginatedItems);

    if (paginatedItems.length === 0) {
        donationTableBody.innerHTML = '<tr><td colspan="12" style="text-align: center; padding: 20px;">No pending monetary donations found matching your criteria.</td></tr>';
        entriesInfo.textContent = 'Showing 0 to 0 of 0 entries';
        return;
    }

    paginatedItems.forEach((donation, index) => {
        const row = donationTableBody.insertRow();

        row.insertCell().textContent = start + index + 1; // No.
        row.insertCell().textContent = donation.encoder || 'N/A'; // Encoder
        row.insertCell().textContent = donation.name || 'N/A'; // Names/Company
        row.insertCell().textContent = donation.address || 'N/A'; // Location (at least City)
        row.insertCell().textContent = donation.number || 'N/A'; // Number

        // Amount Donated - format as currency
        const numericAmount = parseFloat(donation.amountDonated || 0);
        row.insertCell().textContent = isNaN(numericAmount) ? 'N/A' : `PHP ${numericAmount.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

        row.insertCell().textContent = donation.invoice || 'N/A'; // Cash Invoice#
        row.insertCell().textContent = donation.dateReceived || 'N/A'; // Date Received
        row.insertCell().textContent = donation.email || 'N/A'; // Email
        row.insertCell().textContent = donation.bank || 'N/A'; // Bank (using 'bankUsed' from donation object)

        // Proof of Transfer - Make it clickable
        const proofCell = row.insertCell();
        if (donation.proof && typeof donation.proof === 'string' && donation.proof.startsWith('http')) {
            const proofLink = document.createElement('a');
            proofLink.href = donation.proof;
            proofLink.textContent = 'View Proof'; // Or donation.proof to show the URL
            proofLink.target = '_blank'; // Open in a new tab
            proofLink.rel = 'noopener noreferrer'; // Security best practice
            proofCell.appendChild(proofLink);
        } else {
            proofCell.textContent = 'No file selected'; // Or handle cases where proof is not a valid URL
        }

        const actionCell = row.insertCell();
        actionCell.classList.add('action-buttons');

        // Approve Button
        const approveButton = document.createElement('button');
        approveButton.className = 'action-button approve-button';
        approveButton.innerHTML = '<i class="bx bx-check"></i> Approve';
        approveButton.addEventListener('click', () => updateDonationStatus(donation.id, donation, 'Approved'));
        actionCell.appendChild(approveButton);

        // Reject Button
        const rejectButton = document.createElement('button');
        rejectButton.className = 'action-button reject-button';
        rejectButton.innerHTML = '<i class="bx bx-x"></i> Reject';
        rejectButton.addEventListener('click', () => updateDonationStatus(donation.id, donation, 'Rejected'));
        actionCell.appendChild(rejectButton);
    });

    const totalEntries = filteredMonetaryDonations.length;
    const showingStart = totalEntries > 0 ? start + 1 : 0;
    const showingEnd = Math.min(end, totalEntries);
    entriesInfo.textContent = `Showing ${showingStart} to ${showingEnd} of ${totalEntries} entries`;
}

    // Function to render pagination buttons
    function renderPagination() {
        paginationDiv.innerHTML = '';
        const pageCount = Math.ceil(filteredMonetaryDonations.length / rowsPerPage);

        if (pageCount <= 1) {
            return;
        }

        for (let i = 1; i <= pageCount; i++) {
            const button = document.createElement('button');
            button.textContent = i;
            button.classList.add('pagination-button');
            if (i === currentPage) {
                button.classList.add('active');
            }
            button.addEventListener('click', () => {
                currentPage = i;
                renderTable();
                renderPagination();
            });
            paginationDiv.appendChild(button);
        }
    }

    // Function to update donation status (Approve/Reject)
    async function updateDonationStatus(id, donationData, newStatus) {
        Swal.fire({
            title: `Are you sure you want to ${newStatus.toLowerCase()} this donation?`,
            text: newStatus === 'Approved' ? 'This will move the donation to the approved monetary donations list.' : 'This will remove the donation from the pending list.',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#3085d6',
            cancelButtonColor: '#d33',
            confirmButtonText: `Yes, ${newStatus.toLowerCase()} it!`
        }).then(async (result) => {
            if (result.isConfirmed) {
                try {
                    if (newStatus === 'Approved') {
                        const donationToApprove = { ...donationData }; 

                        donationToApprove.approvedAt = new Date().toISOString(); 
                        donationToApprove.updatedAt = new Date().toISOString(); 
                        
                        await database.ref('donations/monetary/' + id).set(donationToApprove);
                        await database.ref('pendingMonetary/' + id).remove();    
                    } else if (newStatus === 'Rejected') {
                        // Simply remove it from the pending path (donations/monetary)
                        await database.ref('pendingMonetary/' + id).remove();
                        // Optional: You could move rejected items to a 'donations/rejectedMonetary' path here
                    }

                    Swal.fire('Updated!', `Monetary donation has been ${newStatus.toLowerCase()}.`, 'success');
                } catch (error) {
                    console.error(`Error processing monetary donation status to ${newStatus} in Firebase:`, error);
                    Swal.fire('Error', `Failed to ${newStatus.toLowerCase()} monetary donation. Error: ${error.message}`, 'error');
                }
            }
        });
    }

    loadMonetaryDonationsFromFirebase();
});
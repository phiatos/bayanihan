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
let allDonations = [];
let filteredDonations = [];
let currentPage = 1;
const rowsPerPage = 10;

// DOMContentLoaded ensures the script runs after the HTML is fully loaded
document.addEventListener('DOMContentLoaded', function() {
    // Get references to DOM elements
    const donationTableBody = document.getElementById('donationTableBody');
    const searchInput = document.getElementById('searchInput');
    const sortSelect = document.getElementById('sortSelect');
    const entriesInfo = document.getElementById('entriesInfo');
    const paginationDiv = document.getElementById('pagination');

    // Function to load pending donations from Firebase Realtime Database
    function loadDonationsFromFirebase() {
        console.log('1. loadDonationsFromFirebase called.');
        const pendingInkindDonationsRef = database.ref('pendingInkind');

        // Listen for changes in the 'pendingInkind' path
        pendingInkindDonationsRef.on('value', (snapshot) => {
            console.log('2. Firebase snapshot received for pendingInkind.');
            const donationsObject = snapshot.val();
            const loadedDonations = [];

            if (donationsObject) {
                // Iterate through the object to create an array of donations,
                // attaching the Firebase key as 'id' to each donation object.
                for (let key in donationsObject) {
                    if (donationsObject.hasOwnProperty(key)) {
                        const donation = donationsObject[key];
                        loadedDonations.push({ id: key, ...donation });
                    }
                }
            }
            console.log('3. Loaded donations from Firebase (with IDs):', loadedDonations);

            allDonations = loadedDonations; // Update the global allDonations array
            console.log('4. All donations loaded:', allDonations);

            applyFiltersAndSort(); // Apply filters/sort and render table with the new data
        }, (error) => {
            // Error handling if data fetching fails
            console.error("Error fetching data from Firebase:", error);
            Swal.fire('Error', 'Failed to load donations from Firebase. Please check your connection and Firebase rules.', 'error');
            if (donationTableBody) {
                donationTableBody.innerHTML = '<tr><td colspan="15" style="text-align: center; padding: 20px; color: red;">Failed to load data from Firebase.</td></tr>';
            }
            entriesInfo.textContent = 'Showing 0 to 0 of 0 entries';
            paginationDiv.innerHTML = '';
        });
    }


// Variables for inactivity detection --------------------------------------------------------------------
let inactivityTimeout;
const INACTIVITY_TIME = 1800000; // 30 minutes in milliseconds

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
        confirmButtonText: 'Stay Login',
        cancelButtonText: 'Log Out',
        allowOutsideClick: false,
        reverseButtons: true
    }).then((result) => {
        if (result.isConfirmed) {
            resetInactivityTimer(); // User chose to continue, reset the timer
            console.log("User chose to continue session.");
        } else if (result.dismiss === Swal.DismissReason.cancel) {
            // User chose to log out
            auth.signOut().then(() => {
                console.log("User logged out due to inactivity.");
                window.location.href = "../pages/login.html"; // Redirect to login page
            }).catch((error) => {
                console.error("Error logging out:", error);
                Swal.fire('Error', 'Failed to log out. Please try again.', 'error');
            });
        }
    });
}

// Attach event listeners to detect user activity
['mousemove', 'keydown', 'scroll', 'click'].forEach(eventType => {
    document.addEventListener(eventType, resetInactivityTimer);
});
//-------------------------------------------------------------------------------------



    // Function to apply search filters and sorting, then re-render the table
    function applyFiltersAndSort() {
        console.log('5. applyFiltersAndSort called.');
        filteredDonations = [...allDonations]; // Start with a fresh copy of all donations

        // Apply search filter if a search term is present
        const searchTerm = searchInput.value.toLowerCase();
        if (searchTerm) {
            filteredDonations = filteredDonations.filter(donation =>
                (donation.encoder && String(donation.encoder).toLowerCase().includes(searchTerm)) ||
                (donation.donorName && String(donation.donorName).toLowerCase().includes(searchTerm)) || // Changed from 'name' to 'donorName' as per original
                (donation.contactPerson && String(donation.contactPerson).toLowerCase().includes(searchTerm)) ||
                (donation.itemType && String(donation.itemType).toLowerCase().includes(searchTerm)) || // Changed from 'assistance' to 'itemType' as per original
                (donation.staffInCharge && String(donation.staffInCharge).toLowerCase().includes(searchTerm)) || // Changed from 'staffIncharge' to 'staffInCharge' as per original
                (donation.description && String(donation.description).toLowerCase().includes(searchTerm)) || // Changed from 'additionalnotes' to 'description' as per original
                (donation.status && String(donation.status).toLowerCase().includes(searchTerm))
            );
        }
        console.log('6. After search filter, filteredDonations count:', filteredDonations.length);

        // Apply sorting based on selected option
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
        console.log('7. After sort, filteredDonations count:', filteredDonations.length);

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
        const paginatedItems = filteredDonations.slice(start, end);
        console.log('9. Items to render on current page:', paginatedItems);

        if (paginatedItems.length === 0) {
            donationTableBody.innerHTML = '<tr><td colspan="15" style="text-align: center; padding: 20px;">No pending in-kind donations found matching your criteria.</td></tr>';
            entriesInfo.textContent = 'Showing 0 to 0 of 0 entries';
            return;
        }

        paginatedItems.forEach((donation, index) => {
            const row = donationTableBody.insertRow();

            row.insertCell().textContent = start + index + 1;
            row.insertCell().textContent = donation.encoder || 'N/A';
            row.insertCell().textContent = donation.name || 'N/A'; // Using donorName
            row.insertCell().textContent = donation.type || 'N/A'; // Using donorType
            row.insertCell().textContent = donation.address || 'N/A'; // Using donorAddress
            row.insertCell().textContent = donation.contactPerson || 'N/A';
            row.insertCell().textContent = donation.number || 'N/A'; // Using contactNumber
            row.insertCell().textContent = donation.email || 'N/A'; // Using donorEmail
            row.insertCell().textContent = donation.assistance || 'N/A'; // Using itemType
            const numericValue = parseFloat(donation.valuation || 0); // Using value
            row.insertCell().textContent = isNaN(numericValue) ? 'N/A' : `PHP ${numericValue.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

            row.insertCell().textContent = donation.additionalnotes || 'N/A'; // Using description
            row.insertCell().textContent = donation.staffIncharge || 'N/A';
            row.insertCell().textContent = donation.donationDate || 'N/A';
            row.insertCell().textContent = donation.status || 'N/A'; // Displaying current status

            const actionCell = row.insertCell();
            actionCell.classList.add('action-buttons');

            // Approve Button
            const approveButton = document.createElement('button');
            approveButton.className = 'action-button approve-button';
            approveButton.innerHTML = '<i class="bx bx-check"></i> Approve';
            // Only show approve button if status is not 'Approved' or 'Rejected'
            if (donation.status !== 'Approved' && donation.status !== 'Rejected') {
                approveButton.addEventListener('click', () => updateDonationStatus(donation.id, donation, 'Approved'));
                actionCell.appendChild(approveButton);
            }

            // Reject Button
            const rejectButton = document.createElement('button');
            rejectButton.className = 'action-button reject-button';
            rejectButton.innerHTML = '<i class="bx bx-x"></i> Reject';
            // Only show reject button if status is not 'Approved' or 'Rejected'
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

    // Function to render pagination buttons
    function renderPagination() {
        paginationDiv.innerHTML = '';
        const pageCount = Math.ceil(filteredDonations.length / rowsPerPage);

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

   async function updateDonationStatus(id, donationData, newStatus) {
        Swal.fire({
            title: `Are you sure you want to ${newStatus.toLowerCase()} this donation?`,
            // Adjusted text to reflect that neither Approved nor Rejected changes the status field itself
            text: newStatus === 'Approved' ? 'This will move the donation to the approved donations list, keeping its current status.' : 'This will remove the donation from the pending list, keeping its current status.',
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
                    if (newStatus === 'Approved') {
                        // For 'Approved', we first fetch the existing data from pendingInkind
                        const snapshot = await database.ref('pendingInkind/' + id).once('value');
                        const approvedDonation = snapshot.val(); // This contains the full donation data

                        if (approvedDonation) {
                            // Status field is deliberately NOT changed here.
                            approvedDonation.approvedAt = new Date().toISOString(); // Add approval timestamp
                            approvedDonation.updatedAt = new Date().toISOString();   // Add general update timestamp

                            // Move the donation to the 'donations/inkind' path
                            await database.ref('donations/inkind/' + id).set(approvedDonation);

                            // Then, remove it from the 'pendingInkind' table
                            await database.ref('pendingInkind/' + id).remove();

                        } else {
                            throw new Error("Donation data not found in pendingInkind for approval.");
                        }
                    } else if (newStatus === 'Rejected') {
                        await database.ref('pendingInkind/' + id).remove();
                    }

                    // Show success message
                    Swal.fire('Updated!', `Donation has been ${newStatus.toLowerCase()}.`, 'success');
                } catch (error) {
                    console.error(`Error processing donation status to ${newStatus} in Firebase:`, error);
                    Swal.fire('Error', `Failed to ${newStatus.toLowerCase()} donation. Error: ${error.message}`, 'error');
                }
            }
        });
    }

    loadDonationsFromFirebase();
});
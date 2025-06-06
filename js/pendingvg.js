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

if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const database = firebase.database();

document.addEventListener('DOMContentLoaded', () => {
    const volunteerOrgsContainer = document.getElementById('volunteerOrgsContainer');
    const searchInput = document.getElementById('searchInput');
    const sortSelect = document.getElementById('sortSelect');
    const entriesInfo = document.getElementById('entriesInfo');
    const pagination = document.getElementById('pagination');
    const viewApprovedBtn = document.getElementById('viewApprovedBtn');

    if (!volunteerOrgsContainer || !searchInput || !sortSelect || !entriesInfo || !pagination || !viewApprovedBtn) {
        console.error('One or more DOM elements are missing:', {
            volunteerOrgsContainer: !!volunteerOrgsContainer,
            searchInput: !!searchInput,
            sortSelect: !!sortSelect,
            entriesInfo: !!entriesInfo,
            pagination: !!pagination,
            viewApprovedBtn: !!viewApprovedBtn
        });
        return; 
    }

    let allApplications = []; 
    let filteredApplications = []; 
    let currentPage = 1;
    const rowsPerPage = 5;

    // --- Data Fetching Function ---
    function fetchPendingApplications() {
        // Show loading state
        volunteerOrgsContainer.innerHTML = '<tr><td colspan="11" style="text-align: center;">Loading applications...</td></tr>';

        database.ref('abvnApplications/pendingABVN').on('value', (snapshot) => {
            allApplications = []; // Clear previous data
            if (snapshot.exists()) {
                snapshot.forEach((childSnapshot) => {
                    const appData = childSnapshot.val();
                    const appKey = childSnapshot.key;
                    allApplications.push({ key: appKey, ...appData });
                });
                console.log("Fetched pending applications:", allApplications);
            } else {
                console.log("No pending ABVN applications found.");
            }
            applySearchAndSort(); // Apply initial search and sort after fetching
        }, (error) => {
            console.error("Error fetching pending applications: ", error);
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'Failed to load pending applications. Please try again later.',
                confirmButtonText: 'OK'
            });
            volunteerOrgsContainer.innerHTML = '<tr><td colspan="11" style="text-align: center; color: red;">Failed to load data.</td></tr>';
        });
    }

    // --- Rendering Function ---
    function renderApplications(applicationsToRender) {
        volunteerOrgsContainer.innerHTML = ''; // Clear existing table rows

        const startIndex = (currentPage - 1) * rowsPerPage;
        const endIndex = startIndex + rowsPerPage;
        const paginatedApplications = applicationsToRender.slice(startIndex, endIndex);

        if (paginatedApplications.length === 0) {
            volunteerOrgsContainer.innerHTML = '<tr><td colspan="11" style="text-align: center;">No pending applications found on this page.</td></tr>';
            entriesInfo.textContent = 'Showing 0 to 0 of 0 entries';
            renderPagination(); // Still render pagination to show total pages
            return;
        }

        let i = startIndex + 1; // Counter for "No." column

        paginatedApplications.forEach(app => {
            const row = volunteerOrgsContainer.insertRow();
            row.setAttribute('data-key', app.key); // Store Firebase key on the row

            // Format timestamp if available
            const formattedTimestamp = app.timestamp ? new Date(app.timestamp).toLocaleString('en-US', {
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
                <td>
                    <button class="approveBtn" data-key="${app.key}">Approve</button>
                    <button class="rejectBtn" data-key="${app.key}">Reject</button>
                </td>
            `;
        });

        updateEntriesInfo(applicationsToRender.length);
        renderPagination(applicationsToRender.length);
    }

    // --- Search and Sort Logic ---
    function applySearchAndSort() {
        let currentApplications = [...allApplications]; // Start with all fetched data

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

                return orgName.includes(searchTerm) ||
                       contactPerson.includes(searchTerm) ||
                       email.includes(searchTerm) ||
                       mobileNumber.includes(searchTerm) ||
                       region.includes(searchTerm) ||
                       province.includes(searchTerm) ||
                       city.includes(searchTerm) ||
                       barangay.includes(searchTerm);
            });
        }

        // Apply sort
        const sortValue = sortSelect.value;
        if (sortValue) {
            const [sortBy, order] = sortValue.split('-');
            currentApplications.sort((a, b) => {
                let valA, valB;

                switch (sortBy) {
                    case 'DateTime':
                        valA = new Date(a.timestamp || 0).getTime();
                        valB = new Date(b.timestamp || 0).getTime();
                        break;
                    case 'OrganizationName': // This option is not in your HTML, but good to have
                        valA = (a.organizationName || '').toLowerCase();
                        valB = (b.organizationName || '').toLowerCase();
                        break;
                    case 'Location':
                        // Combine location parts for a better sort
                        valA = `${a.headquarters?.region || ''} ${a.headquarters?.province || ''} ${a.headquarters?.city || ''} ${a.headquarters?.barangay || ''}`.toLowerCase();
                        valB = `${b.headquarters?.region || ''} ${b.headquarters?.province || ''} ${b.headquarters?.city || ''} ${b.headquarters?.barangay || ''}`.toLowerCase();
                        break;
                    // Add more cases here if you want to sort by other specific fields
                    default:
                        // Default to organization name if no specific sort is defined or recognized
                        valA = (a.organizationName || '').toLowerCase();
                        valB = (b.organizationName || '').toLowerCase();
                        break;
                }

                if (valA < valB) return order === 'asc' ? -1 : 1;
                if (valA > valB) return order === 'asc' ? 1 : -1;
                return 0;
            });
        }

        filteredApplications = currentApplications; // Update filtered applications
        currentPage = 1; // Reset to first page after search/sort
        renderApplications(filteredApplications);
    }

    // --- Pagination Functions ---
    function renderPagination() { // Modified to use filteredData implicitly
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

    // --- Action Handlers (Approve/Reject) ---
    volunteerOrgsContainer.addEventListener('click', async (event) => {
        const target = event.target;
        const appKey = target.dataset.key;

        if (!appKey) return; // Not an action button

        if (target.classList.contains('approveBtn')) {
            Swal.fire({
                title: 'Are you sure?',
                text: "Do you want to approve this application?",
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#3085d6',
                cancelButtonColor: '#d33',
                confirmButtonText: 'Yes, approve it!'
            }).then(async (result) => {
                if (result.isConfirmed) {
                    try {
                        const appRef = database.ref(`abvnApplications/pendingABVN/${appKey}`);
                        const snapshot = await appRef.once('value');
                        const applicationData = snapshot.val();

                        if (applicationData) {
                            // Move to approvedABVN
                            await database.ref(`abvnApplications/approvedABVN/${appKey}`).set(applicationData);
                            // Remove from pendingABVN
                            await appRef.remove();
                            Swal.fire('Approved!', 'The application has been approved and moved.', 'success');
                            // Data will re-render automatically due to .on('value') listener
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
            Swal.fire({
                title: 'Are you sure?',
                text: "Do you want to reject this application?",
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#d33',
                cancelButtonColor: '#3085d6',
                confirmButtonText: 'Yes, reject it!'
            }).then(async (result) => {
                if (result.isConfirmed) {
                    try {
                        const appRef = database.ref(`abvnApplications/pendingABVN/${appKey}`);
                        await appRef.remove(); // Remove from pendingABVN
                        Swal.fire('Rejected!', 'The application has been rejected and removed.', 'success');
                        // Data will re-render automatically due to .on('value') listener
                    } catch (error) {
                        console.error("Error rejecting application: ", error);
                        Swal.fire('Error', 'Failed to reject application. Please try again.', 'error');
                    }
                }
            });
        }
    });

    // --- Event Listeners for Search and Sort ---
    if (searchInput) {
        searchInput.addEventListener('keyup', applySearchAndSort);
    }
    if (sortSelect) {
        sortSelect.addEventListener('change', applySearchAndSort);
    }

    // --- Initial Load ---
    fetchPendingApplications();

    // Handle "View Approved ABVN Applications" button
    if (viewApprovedBtn) {
        viewApprovedBtn.addEventListener('click', () => {
            window.location.href = '../pages/approvedvg.html';
        });
    }
});
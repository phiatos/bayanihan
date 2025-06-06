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
    const volunteersContainer = document.getElementById('volunteersContainer');
    const searchInput = document.getElementById('searchInput');
    const sortSelect = document.getElementById('sortSelect');
    const entriesInfo = document.getElementById('entriesInfo');
    const pagination = document.getElementById('pagination');
    const viewApprovedBtn = document.getElementById('viewApprovedBtn');

    // Modal elements (assuming they exist from previous HTML)
    const previewModal = document.getElementById('previewModal');
    const closeModal = document.getElementById('closeModal');
    const modalContent = document.getElementById('modalContent');

    if (!volunteersContainer || !searchInput || !sortSelect || !entriesInfo || !pagination || !viewApprovedBtn || !previewModal || !closeModal || !modalContent) {
        console.error('One or more DOM elements are missing. Please check your HTML IDs.');
        return;
    }

    let allApplications = []; 
    let filteredApplications = []; 
    let currentPage = 1;
    const rowsPerPage = 5; 

    // --- Utility Functions ---
    function formatDate(timestamp) {
        if (!timestamp) return 'N/A';
        const date = new Date(timestamp);
        return date.toLocaleString('en-US', {
            year: 'numeric', month: 'short', day: 'numeric',
            hour: '2-digit', minute: '2-digit', second: '2-digit',
            hour12: true // Ensures AM/PM
        });
    }

    function showPreviewModal(volunteer) {
        // Construct full name
        const fullName = `${volunteer.firstName || ''} ${volunteer.middleInitial ? volunteer.middleInitial + '.' : ''} ${volunteer.lastName || ''} ${volunteer.nameExtension || ''}`.trim();

        modalContent.innerHTML = `
            <h3>Volunteer Application Details</h3>
            <p><strong>Full Name:</strong> ${fullName}</p>
            <p><strong>Email:</strong> ${volunteer.email || 'N/A'}</p>
            <p><strong>Mobile Number:</strong> ${volunteer.mobileNumber || 'N/A'}</p>
            <p><strong>Age:</strong> ${volunteer.age || 'N/A'}</p>
            <p><strong>Social Media:</strong> ${volunteer.socialMediaLink ? `<a href="${volunteer.socialMediaLink}" target="_blank">${volunteer.socialMediaLink}</a>` : 'N/A'}</p>
            <p><strong>Additional Info:</strong> ${volunteer.additionalInfo || 'N/A'}</p>
            <h4>Address:</h4>
            <p><strong>Region:</strong> ${volunteer.address?.region || 'N/A'}</p>
            <p><strong>Province:</strong> ${volunteer.address?.province || 'N/A'}</p>
            <p><strong>City:</strong> ${volunteer.address?.city || 'N/A'}</p>
            <p><strong>Barangay:</strong> ${volunteer.address?.barangay || 'N/A'}</p>
            <p><strong>Street Address:</strong> ${volunteer.address?.streetAddress || 'N/A'}</p>
            <p><strong>Application Date:</strong> ${formatDate(volunteer.timestamp)}</p>
        `;
        previewModal.style.display = 'block';
    }

    function hidePreviewModal() {
        previewModal.style.display = 'none';
    }

    // --- Data Fetching Function ---
    function fetchPendingVolunteers() {
        // Show loading state
        volunteersContainer.innerHTML = '<tr><td colspan="12" style="text-align: center;">Loading volunteer applications...</td></tr>';

        database.ref('volunteerApplications/pendingVolunteer').on('value', (snapshot) => {
            allApplications = []; // Clear previous data
            if (snapshot.exists()) {
                snapshot.forEach((childSnapshot) => {
                    const volunteerData = childSnapshot.val();
                    const volunteerKey = childSnapshot.key;
                    allApplications.push({ key: volunteerKey, ...volunteerData });
                });
                console.log("Fetched pending volunteers:", allApplications);
            } else {
                console.log("No pending volunteer applications found.");
            }
            applySearchAndSort(); // Apply initial search and sort after fetching
        }, (error) => {
            console.error("Error fetching pending volunteers: ", error);
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'Failed to load pending volunteer applications. Please try again later.',
                confirmButtonText: 'OK'
            });
            volunteersContainer.innerHTML = '<tr><td colspan="12" style="text-align: center; color: red;">Failed to load data.</td></tr>';
        });
    }

    // --- Rendering Function ---
    function renderApplications(applicationsToRender) {
        volunteersContainer.innerHTML = ''; 
        const startIndex = (currentPage - 1) * rowsPerPage;
        const endIndex = startIndex + rowsPerPage;
        const paginatedApplications = applicationsToRender.slice(startIndex, endIndex);

        if (paginatedApplications.length === 0) {
            volunteersContainer.innerHTML = '<tr><td colspan="12" style="text-align: center;">No pending volunteer applications found on this page.</td></tr>';
            entriesInfo.textContent = 'Showing 0 to 0 of 0 entries';
            renderPagination(); 
            return;
        }

        let i = startIndex + 1; // Counter for "No." column

        paginatedApplications.forEach(volunteer => {
            const row = volunteersContainer.insertRow();
            row.setAttribute('data-key', volunteer.key); 

            const fullName = `${volunteer.firstName || ''} ${volunteer.middleInitial ? volunteer.middleInitial + '.' : ''} ${volunteer.lastName || ''} ${volunteer.nameExtension || ''}`.trim();
            const socialMediaDisplay = volunteer.socialMediaLink ? `<a href="${volunteer.socialMediaLink}" target="_blank" rel="noopener noreferrer">Link</a>` : 'N/A';


            row.innerHTML = `
                <td>${i++}</td>
                <td>${fullName}</td>
                <td>${volunteer.email || 'N/A'}</td>
                <td>${volunteer.mobileNumber || 'N/A'}</td>
                <td>${volunteer.age || 'N/A'}</td>
                <td>${socialMediaDisplay}</td>
                <td>${volunteer.additionalInfo || 'N/A'}</td>
                <td>${volunteer.address?.region || 'N/A'}</td>
                <td>${volunteer.address?.province || 'N/A'}</td>
                <td>${volunteer.address?.city || 'N/A'}</td>
                <td>${volunteer.address?.barangay || 'N/A'}</td>
                <td>
                    <button class="endorseBtn" data-key="${volunteer.key}">Endorse</button>
                </td>
            `;
        });

        updateEntriesInfo(applicationsToRender.length);
        renderPagination(applicationsToRender.length);
    }

    // --- Search and Sort Logic ---
    function applySearchAndSort() {
        let currentApplications = [...allApplications]; 

        // Apply search filter
        const searchTerm = searchInput.value.toLowerCase().trim();
        if (searchTerm) {
            currentApplications = currentApplications.filter(volunteer => {
                const fullName = `${volunteer.firstName || ''} ${volunteer.lastName || ''}`.toLowerCase();
                const email = (volunteer.email || '').toLowerCase();
                const mobileNumber = (volunteer.mobileNumber || '').toLowerCase();
                const region = (volunteer.address?.region || '').toLowerCase();
                const province = (volunteer.address?.province || '').toLowerCase();
                const city = (volunteer.address?.city || '').toLowerCase();
                const barangay = (volunteer.address?.barangay || '').toLowerCase();
                const additionalInfo = (volunteer.additionalInfo || '').toLowerCase();

                return fullName.includes(searchTerm) ||
                       email.includes(searchTerm) ||
                       mobileNumber.includes(searchTerm) ||
                       region.includes(searchTerm) ||
                       province.includes(searchTerm) ||
                       city.includes(searchTerm) ||
                       barangay.includes(searchTerm) ||
                       additionalInfo.includes(searchTerm);
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
                    case 'Location':
                        // Combine location parts for a better alphabetical sort
                        valA = `${a.address?.region || ''} ${a.address?.province || ''} ${a.address?.city || ''} ${a.address?.barangay || ''}`.toLowerCase();
                        valB = `${b.address?.region || ''} ${b.address?.province || ''} ${b.address?.city || ''} ${b.address?.barangay || ''}`.toLowerCase();
                        break;
                    default:
                        valA = `${a.firstName || ''} ${a.lastName || ''}`.toLowerCase();
                        valB = `${b.firstName || ''} ${b.lastName || ''}`.toLowerCase();
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

    // --- Pagination Functions ---
    function renderPagination() {
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

        
        if (endPage - startPage + 1 < maxVisible) {
            startPage = Math.max(1, totalPages - maxVisible + 1);
        }

        
        if (startPage > 1) {
            pagination.appendChild(createButton('1', 1));
            if (startPage > 2) {
                const dots = document.createElement('span');
                dots.textContent = '...';
                pagination.appendChild(dots);
            }
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
    volunteersContainer.addEventListener('click', async (event) => {
        const target = event.target;

        const rowWithKey = target.closest('tr[data-key]');
        if (!rowWithKey) return;

        const volunteerKey = rowWithKey.dataset.key;

        if (target.classList.contains('approveBtn')) {
            Swal.fire({
                title: 'Are you sure?',
                text: "Do you want to approve this volunteer application?",
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#3085d6',
                cancelButtonColor: '#d33',
                confirmButtonText: 'Yes, approve it!'
            }).then(async (result) => {
                if (result.isConfirmed) {
                    try {
                        const volunteerRef = database.ref(`volunteerApplications/approvedVolunteer/${volunteerKey}`);
                        const snapshot = await volunteerRef.once('value');
                        const volunteerData = snapshot.val();

                        if (volunteerData) {
                            // Move to approvedVolunteers
                            await database.ref(`volunteerApplications/approvedVolunteer/${volunteerKey}`).set(volunteerData);
                            // Remove from pendingVolunteer
                            await volunteerRef.remove();
                            Swal.fire('Approved!', 'The volunteer application has been approved and moved.', 'success');
                        } else {
                            Swal.fire('Error', 'Volunteer application not found.', 'error');
                        }
                    } catch (error) {
                        console.error("Error approving volunteer application: ", error);
                        Swal.fire('Error', 'Failed to approve volunteer application. Please try again.', 'error');
                    }
                }
            });
        } else if (target.classList.contains('rejectBtn')) {
            Swal.fire({
                title: 'Are you sure?',
                text: "Do you want to reject this volunteer application? It will be removed.",
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#d33',
                cancelButtonColor: '#3085d6',
                confirmButtonText: 'Yes, reject it!'
            }).then(async (result) => {
                if (result.isConfirmed) {
                    try {
                        const volunteerRef = database.ref(`volunteerApplications/pendingVolunteer/${volunteerKey}`);
                        await volunteerRef.remove(); // Remove from pendingVolunteer
                        Swal.fire('Rejected!', 'The volunteer application has been rejected and removed.', 'success');
                        // Data will re-render automatically due to .on('value') listener
                    } catch (error) {
                        console.error("Error rejecting volunteer application: ", error);
                        Swal.fire('Error', 'Failed to reject volunteer application. Please try again.', 'error');
                    }
                }
            });
        } else if (target.classList.contains('viewBtn') || target.closest('.viewBtn')) {
            // Find the volunteer data from the currently filtered/sorted array
            const volunteer = filteredApplications.find(v => v.key === volunteerKey);
            if (volunteer) {
                showPreviewModal(volunteer);
            } else {
                console.warn("Volunteer data not found for key:", volunteerKey);
            }
        }
    });

    // --- Event Listeners for Search and Sort ---
    searchInput.addEventListener('keyup', applySearchAndSort);
    sortSelect.addEventListener('change', applySearchAndSort);

    // --- Initial Load ---
    fetchPendingVolunteers();

    // Handle "View Approved Volunteer Applications" button
    viewApprovedBtn.addEventListener('click', () => {
        window.location.href = '../pages/approvedvolunteers.html';
    });

    // Event listeners for modal
    closeModal.addEventListener('click', hidePreviewModal);
    previewModal.addEventListener('click', (event) => {
        if (event.target === previewModal) {
            hidePreviewModal();
        }
    });
});
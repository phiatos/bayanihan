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

// Initialize Firebase only if it hasn't been initialized already
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
    console.log("Firebase initialized successfully.");
} else {
    console.log("Firebase already initialized.");
}

const database = firebase.database();
const auth = firebase.auth();

// Variables for inactivity detection --------------------------------------------------------------------
let inactivityTimeout;
const INACTIVITY_TIME = 180000; // 30 minutes in milliseconds

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
            resetInactivityTimer();
            console.log("User chose to continue session.");
        } else if (result.dismiss === Swal.DismissReason.cancel) {
            // User chose to log out
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

// Attach inactivity reset to common user interaction events
['mousemove', 'keydown', 'scroll', 'click'].forEach(eventType => {
    document.addEventListener(eventType, resetInactivityTimer);
});
//-------------------------------------------------------------------------------------
// Global flag for Super Admin status
let currentUserIsSuperAdmin = false;

document.addEventListener('DOMContentLoaded', () => {
    // --- Authentication Check ---
    auth.onAuthStateChanged(user => {
        if (!user) {
            Swal.fire({
                icon: 'error',
                title: 'Authentication Required',
                text: 'Please sign in to access pending applications.',
            }).then(() => {
                window.location.href = "../pages/login.html";
            });
            return;
        }
        console.log("User authenticated:", user.uid);

        // Fetch user role to determine Super Admin status
        database.ref(`users/${user.uid}`).once('value', snapshot => {
            const userData = snapshot.val();
            if (userData && userData.isSuperAdmin === true) {
                currentUserIsSuperAdmin = true;
                console.log("Current user is a Super Admin.");
            } else {
                currentUserIsSuperAdmin = false;
                console.log("Current user is NOT a Super Admin. Limiting access.");
            }
            initializePageFunctions(user.uid);
            resetInactivityTimer(); // Start inactivity timer after user is authenticated and role checked
        }).catch(error => {
            console.error("Error fetching user role:", error);
            currentUserIsSuperAdmin = false; // Default to false on error
            initializePageFunctions(user.uid);
            resetInactivityTimer();
        });
    });
});

function initializePageFunctions(userId) {
    const volunteerOrgsContainer = document.getElementById('volunteerOrgsContainer');
    const searchInput = document.getElementById('searchInput');
    const sortSelect = document.getElementById('sortSelect');
    const entriesInfo = document.getElementById('entriesInfo');
    const pagination = document.getElementById('pagination');
    const viewApprovedBtn = document.getElementById('viewApprovedBtn');
    const viewArchivedButton = document.getElementById('viewArchived'); // New: Archived button

    // --- Modal Elements ---
    const previewModal = document.getElementById('previewModal');
    const closeModalBtn = document.getElementById('closeModal');
    const modalContentDiv = document.getElementById('modalContent');

    //Archived Modal Elements
    const archivedModal = document.getElementById('archivedModal');
    const closeArchivedModalBtn = document.getElementById('closeArchivedModalBtn');
    const archivedVGTableBody = document.getElementById('archivedTableBody'); // Make sure this ID is correct in HTML
    const archivedEntriesInfo = document.getElementById('archivedEntriesInfo');
    const archivedPaginationContainer = document.getElementById('archivedPagination');

    let allApplications = []; // For active pending applications
    let filteredApplications = [];
    let currentPage = 1;
    const rowsPerPage = 5;

    let allArchivedVGData = []; // For archived applications
    let currentArchivedVGPage = 1;
    const archivedVGRowsPerPage = 5;

    // --- Data Fetching Function (Active Pending) ---
    function fetchPendingApplications() {
        volunteerOrgsContainer.innerHTML = '<tr><td colspan="13" style="text-align: center;">Loading applications...</td></tr>'; // Increased colspan

        database.ref('abvnApplications/pendingABVN').on('value', (snapshot) => {
            allApplications = [];
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
            applySearchAndSort();
        }, (error) => {
            console.error("Error fetching pending applications: ", error);
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'Failed to load pending applications. Please try again later.',
                confirmButtonText: 'OK'
            });
            volunteerOrgsContainer.innerHTML = '<tr><td colspan="13" style="text-align: center; color: red;">Failed to load data.</td></tr>'; // Increased colspan
        });
    }

    // --- Rendering Function (Active Pending) ---
    function renderApplications(applicationsToRender) {
        volunteerOrgsContainer.innerHTML = '';

        const startIndex = (currentPage - 1) * rowsPerPage;
        const endIndex = startIndex + rowsPerPage;
        const paginatedApplications = applicationsToRender.slice(startIndex, endIndex);

        if (paginatedApplications.length === 0) {
            volunteerOrgsContainer.innerHTML = '<tr><td colspan="13" style="text-align: center;">No pending applications found on this page.</td></tr>'; // Increased colspan
            updateEntriesInfo(0); // Update info for 0 entries
            renderPagination(0); // Render pagination for 0 entries
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
                <td>${formattedTimestamp || 'N/A'}</td>
                <td>
                    <button class="viewBtn" data-key="${app.key}">View</button>
                    <button class="approveBtn" data-key="${app.key}">Approve</button>
                    <button class="rejectBtn" data-key="${app.key}">Reject</button>
                </td>
            `;
        });

        updateEntriesInfo(applicationsToRender.length);
        renderPagination(applicationsToRender.length);
    }

    // --- Search and Sort Logic (Active Pending) ---
    function applySearchAndSort() {
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
                    case 'organizationName':
                    case 'contactPerson':
                    case 'email':
                        valA = (a[sortBy] || '').toLowerCase();
                        valB = (b[sortBy] || '').toLowerCase();
                        break;
                    case 'mobileNumber':
                        valA = parseInt(a.mobileNumber || '0'); // Parse as int for numeric sort
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

    // --- Pagination Functions (Active Pending - Local Implementation) ---
    function renderPagination(totalItems) {
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
        const startIndex = (currentPage - 1) * rowsPerPage;
        const endIndex = Math.min(startIndex + rowsPerPage, totalItems);
        entriesInfo.textContent = `Showing ${totalItems ? startIndex + 1 : 0} to ${endIndex} of ${totalItems} entries`;
    }

    // --- Modal Display Functions (Preview) ---
    function showPreviewModal(applicationData) {
        const formattedTimestamp = applicationData.applicationDateandTime ? new Date(applicationData.applicationDateandTime).toLocaleString('en-US', {
            year: 'numeric', month: 'short', day: 'numeric',
            hour: '2-digit', minute: '2-digit', second: '2-digit'
        }) : 'N/A';

        let content = `
            <h3 style="margin-bottom: 15px; color: #FA3B99;">Organization Details</h3>
            <p><strong>Organization Name:</strong> ${applicationData.organizationName || 'N/A'}</p>
            <p><strong>Contact Person:</strong> ${applicationData.contactPerson || 'N/A'}</p>
            <p><strong>Email:</strong> ${applicationData.email || 'N/A'}</p>
            <p><strong>Mobile Number:</strong> ${applicationData.mobileNumber || 'N/A'}</p>
            <p><strong>Social Media Link:</strong> ${applicationData.socialMediaLink ? `<a href="${applicationData.socialMediaLink}" target="_blank" rel="noopener noreferrer">${applicationData.socialMediaLink}</a>` : 'N/A'}</p>

            <h4 style="margin-top: 20px; margin-bottom: 10px; color: #FA3B99;">Headquarters Address:</h4>
            <ul>
                <li><strong>Region:</strong> ${applicationData.headquarters?.region || 'N/A'}</li>
                <li><strong>Province:</strong> ${applicationData.headquarters?.province || 'N/A'}</li>
                <li><strong>City:</strong> ${applicationData.headquarters?.city || 'N/A'}</li>
                <li><strong>Barangay:</strong> ${applicationData.headquarters?.barangay || 'N/A'}</li>
                <li><strong>Street Address:</strong> ${applicationData.headquarters?.streetAddress || 'N/A'}</li>
            </ul>

            <h4 style="margin-top: 20px; margin-bottom: 10px; color: #FA3B99;">Organizational Background:</h4>
            <p><strong>Mission/Background:</strong> ${applicationData.organizationalBackgroundMission || 'N/A'}</p>
            <p><strong>Areas of Expertise/Focus:</strong> ${applicationData.areasOfExpertiseFocus || 'N/A'}</p>

            <h4 style="margin-top: 20px; margin-bottom: 10px; color: #FA3B99;">Legal & Documents:</h4>
            <p><strong>Legal Status/Registration:</strong> ${applicationData.legalStatusRegistration || 'N/A'}</p>
            <p><strong>Required Documents:</strong> ${applicationData.requiredDocumentsLink ? `<a href="${applicationData.requiredDocumentsLink}" target="_blank" rel="noopener noreferrer">View Document</a>` : 'N/A'}</p>

            <p style="margin-top: 20px; font-size: 0.9em; color: #555;"><strong>Application Date and Time:</strong> ${formattedTimestamp}</p>
            `;

        modalContentDiv.innerHTML = content;
        previewModal.style.display = 'flex';
    }

    function hidePreviewModal() {
        previewModal.style.display = 'none';
        modalContentDiv.innerHTML = '';
    }

    // --- Action Handlers (Approve/Reject/View) ---
    volunteerOrgsContainer.addEventListener('click', async (event) => {
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
                confirmButtonColor: '#3085d6',
                cancelButtonColor: '#d33',
                confirmButtonText: 'Yes, approve it!',
                customClass: {
                    confirmButton: 'my-confirm-button-class',
                    cancelButton: 'my-cancel-button-class'
                }
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
                                    // duplicate if organizationName AND email match
                                    if (approvedData.organizationName === applicationData.organizationName &&
                                        approvedData.email === applicationData.email) {
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
                                    confirmButtonText: 'OK'
                                });
                                return;
                            }
                            applicationData.approvedApplicationDate = new Date().toISOString();
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
                text: "Do you want to reject this application? This will move it to archived records.",
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#d33',
                cancelButtonColor: '#3085d6',
                confirmButtonText: 'Yes, reject and archive it!',
                customClass: {
                    confirmButton: 'my-confirm-button-class',
                    cancelButton: 'my-cancel-button-class'
                }
            }).then(async (result) => {
                if (result.isConfirmed) {
                    try {
                        const appRef = database.ref(`abvnApplications/pendingABVN/${appKey}`);
                        const snapshot = await appRef.once('value');
                        const applicationData = snapshot.val();

                        if (applicationData) {
                            // Add rejectedAt timestamp and status
                            applicationData.rejectedAt = new Date().toISOString();
                            applicationData.status = 'Rejected';

                            // Move to rejectedABVN (archived)
                            await database.ref(`abvnApplications/rejectedABVN/${appKey}`).set(applicationData);
                            // Remove from pendingABVN
                            await appRef.remove();

                            Swal.fire('Rejected!', 'The application has been rejected and archived.', 'success');
                            // Data will re-render automatically due to .on('value') listener
                        } else {
                            Swal.fire('Error', 'Application not found.', 'error');
                        }
                    } catch (error) {
                        console.error("Error rejecting application: ", error);
                        Swal.fire('Error', 'Failed to reject application. Please try again.', 'error');
                    }
                }
            });
        }
    });

    // --- Archived Pending ABVN Applications Functions ---
    async function fetchAndRenderArchivedVGs() {
        if (!currentUserIsSuperAdmin) {
            Swal.fire('Access Denied', 'You do not have permission to view archived volunteer group applications.', 'error');
            return;
        }

        Swal.fire({
            title: 'Loading Archived Applications',
            text: 'Fetching archived volunteer group applications...',
            allowOutsideClick: false,
            didOpen: () => {
                Swal.showLoading();
            }
        });

        try {
            // Assuming archived applications are stored under 'abvnApplications/rejectedABVN'
            const snapshot = await database.ref('abvnApplications/rejectedABVN').once('value');
            const archivedApplications = snapshot.val();
            allArchivedVGData = [];

            for (const uid in archivedApplications) {
                const app = archivedApplications[uid];
                allArchivedVGData.push({
                    uid: uid, // Store UID for actions
                    ...app
                });
            }
            Swal.close();
            renderArchivedVGTable(allArchivedVGData);
            archivedModal.style.display = 'flex'; // Show the modal after data is loaded
        } catch (error) {
            Swal.fire('Error', 'Failed to load archived applications: ' + error.message, 'error');
            console.error("Error fetching archived applications:", error);
        }
    }

    function renderArchivedVGTable(data) {
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

            const archivedDate = org.rejectedAt ? new Date(org.rejectedAt).toLocaleDateString() : 'N/A'; // Use rejectedAt for archived date

            row.insertCell(0).textContent = org.organizationName || 'N/A';
            row.insertCell(1).textContent = org.email || 'N/A';
            row.insertCell(2).textContent = org.status || 'N/A'; 
            row.insertCell(3).textContent = archivedDate;

            const actionsCell = row.insertCell(4);
            actionsCell.innerHTML = `
                <button class="retrieveBtn" data-uid="${org.uid}">Retrieve</button>
            `;
        });

        // Use the local pagination functions for archived table
        renderArchivedPagination(data.length);
        updateArchivedEntriesInfo(data.length);

        // Add event listeners for retrieve buttons
        document.querySelectorAll('.retrieveBtn').forEach(button => {
            button.addEventListener('click', (event) => retrieveVG(event.target.dataset.uid));
        });
    }

    function renderArchivedPagination(totalItems) {
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
                renderArchivedVGTable(allArchivedVGData); // Re-render the current view
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


    function updateArchivedEntriesInfo(totalItems) {
        const startIndex = (currentArchivedVGPage - 1) * archivedVGRowsPerPage;
        const endIndex = Math.min(startIndex + archivedVGRowsPerPage, totalItems);
        archivedEntriesInfo.textContent = `Showing ${totalItems ? startIndex + 1 : 0} to ${endIndex} of ${totalItems} entries`;
    }

    async function retrieveVG(uid) {
        if (!currentUserIsSuperAdmin) {
            Swal.fire('Access Denied', 'You do not have permission to retrieve volunteer group applications.', 'error');
            return;
        }

        Swal.fire({
            title: 'Are you sure?',
            text: 'This will retrieve the volunteer group application from archived records and move it back to pending applications.',
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: 'Yes, retrieve it!',
            cancelButtonText: 'No, keep it archived'
        }).then(async (result) => {
            if (result.isConfirmed) {
                Swal.fire({
                    title: 'Retrieving Application...',
                    text: 'Moving application data back to active records...',
                    allowOutsideClick: false,
                    didOpen: () => {
                        Swal.showLoading();
                    }
                });

                try {
                    const snapshot = await database.ref(`abvnApplications/rejectedABVN/${uid}`).once('value');
                    const vgDataToRetrieve = snapshot.val();

                    if (!vgDataToRetrieve) {
                        Swal.fire('Error', 'Archived application data not found for retrieval.', 'error');
                        return;
                    }

                    // Remove the rejectedAt timestamp and reset status
                    delete vgDataToRetrieve.rejectedAt;
                    vgDataToRetrieve.status = 'Pending'; // Set status back to Pending

                    // Move data back to the 'abvnApplications/pendingABVN' node
                    await database.ref(`abvnApplications/pendingABVN/${uid}`).set(vgDataToRetrieve);

                    // Delete from 'abvnApplications/rejectedABVN' node
                    await database.ref(`abvnApplications/rejectedABVN/${uid}`).remove();

                    Swal.close();
                    Swal.fire('Retrieved!', 'The volunteer group application has been retrieved and is now pending.', 'success');

                    // Refresh both the active pending and archived tables
                    fetchPendingApplications(); // Re-fetch active pending
                    fetchAndRenderArchivedVGs(); // Re-fetch archived to update the modal
                } catch (error) {
                    console.error("Error retrieving VG:", error);
                    Swal.fire('Error', 'Failed to retrieve application: ' + error.message, 'error');
                }
            }
        });
    }

    // --- Event Listeners for Search, Sort, and Modals ---
    if (searchInput) {
        let searchTimeout;
        searchInput.addEventListener('keyup', () => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                applySearchAndSort();
            }, 300);
        });
    }
    if (sortSelect) {
        sortSelect.addEventListener('change', applySearchAndSort);
    }

    // Close preview modal listener
    closeModalBtn.addEventListener('click', hidePreviewModal);

    // Open Archived VGs Modal
    if (viewArchivedButton) {
        viewArchivedButton.addEventListener('click', () => {
            currentArchivedVGPage = 1; // Reset to first page when opening
            fetchAndRenderArchivedVGs();
        });
    }

    // Close Archived VGs Modal
    if (closeArchivedModalBtn) {
        closeArchivedModalBtn.addEventListener('click', () => {
            archivedModal.style.display = 'none';
        });
    }

    // Close modals when clicking outside
    window.addEventListener('click', (event) => {
        if (event.target === previewModal) {
            hidePreviewModal();
        }
        if (event.target === archivedModal) {
            archivedModal.style.display = 'none';
        }
    });

    // Handle "View Approved ABVN Applications" button
    if (viewApprovedBtn) {
        viewApprovedBtn.addEventListener('click', () => {
            window.location.href = '../pages/approvedvg.html';
        });
    }

    // Initial fetch of pending applications
    fetchPendingApplications();
}

// Function to clear search inputs (moved here from HTML script block)
function clearDInputs() {
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.value = '';
        // Assuming applySearchAndSort is available in the scope where clearDInputs is called
        // If not, this function might need to be passed as a parameter or be part of a larger object.
        // For this structure, it's called after initializePageFunctions, so it should be fine.
        if (typeof applySearchAndSort === 'function') {
            applySearchAndSort();
        } else {
            console.warn("applySearchAndSort function not found in scope for clearDInputs.");
        }
    }
}

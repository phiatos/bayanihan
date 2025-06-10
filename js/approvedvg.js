// const firebaseConfig = {
//     apiKey: "AIzaSyDJxMv8GCaMvQT2QBW3CdzA3dV5X_T2KqQ",
//     authDomain: "bayanihan-5ce7e.firebaseapp.com",
//     databaseURL: "https://bayanihan-5ce7e-default-rtdb.asia-southeast1.firebasedatabase.app",
//     projectId: "bayanihan-5ce7e",
//     storageBucket: "bayanihan-5ce7e.appspot.com",
//     messagingSenderId: "593123849917",
//     appId: "1:593123849917:web:eb85a63a536eeff78ce9d4",
//     measurementId: "G-ZTQ9VXXVV0",
// };

// // Initialize Firebase if not already initialized
// if (!firebase.apps.length) {
//     firebase.initializeApp(firebaseConfig);
// }
// const database = firebase.database();

// document.addEventListener('DOMContentLoaded', () => {
//     const volunteerOrgsContainer = document.getElementById('volunteerOrgsContainer');
//     const searchInput = document.getElementById('searchInput');
//     const sortSelect = document.getElementById('sortSelect');
//     const entriesInfo = document.getElementById('entriesInfo');
//     const pagination = document.getElementById('pagination');
//     const viewPendingBtn = document.getElementById('viewApprovedBtn'); 
    
//     // --- Modal Elements ---
//     const previewModal = document.getElementById('previewModal');
//     const closeModalBtn = document.getElementById('closeModal');
//     const modalContentDiv = document.getElementById('modalContent');

//     let allApplications = [];
//     let filteredApplications = [];
//     let currentPage = 1;
//     const rowsPerPage = 5;

//     // --- Data Fetching Function ---
//     function fetchApprovedApplications() {
//         volunteerOrgsContainer.innerHTML = '<tr><td colspan="10" style="text-align: center;">Loading approved applications...</td></tr>';

//         database.ref('abvnApplications/approvedABVN').on('value', (snapshot) => {
//             allApplications = []; // Clear previous data
//             if (snapshot.exists()) {
//                 snapshot.forEach((childSnapshot) => {
//                     const appData = childSnapshot.val();
//                     const appKey = childSnapshot.key;
//                     allApplications.push({ key: appKey, ...appData });
//                 });
//                 console.log("Fetched approved applications:", allApplications);
//             } else {
//                 console.log("No approved ABVN applications found.");
//             }
//             applySearchAndSort(); // Apply initial search and sort after fetching
//         }, (error) => {
//             console.error("Error fetching approved applications: ", error);
//             Swal.fire({
//                 icon: 'error',
//                 title: 'Error',
//                 text: 'Failed to load approved applications. Please try again later.',
//                 confirmButtonText: 'OK'
//             });
//             volunteerOrgsContainer.innerHTML = '<tr><td colspan="10" style="text-align: center; color: red;">Failed to load data.</td></tr>';
//         });
//     }

//     // --- Rendering Function ---
//     function renderApplications(applicationsToRender) {
//         volunteerOrgsContainer.innerHTML = ''; 

//         const startIndex = (currentPage - 1) * rowsPerPage;
//         const endIndex = startIndex + rowsPerPage;
//         const paginatedApplications = applicationsToRender.slice(startIndex, endIndex);

//         if (paginatedApplications.length === 0) {
//             volunteerOrgsContainer.innerHTML = '<tr><td colspan="10" style="text-align: center;">No approved applications found on this page.</td></tr>';
//             entriesInfo.textContent = 'Showing 0 to 0 of 0 entries';
//             renderPagination();
//             return;
//         }

//         let i = startIndex + 1;

//         paginatedApplications.forEach(app => {
//             const row = volunteerOrgsContainer.insertRow();
//             row.setAttribute('data-key', app.key); 

//             const formattedTimestamp = app.applicationDateandTime ? new Date(app.applicationDateandTime).toLocaleString('en-US', {
//                 year: 'numeric', month: 'short', day: 'numeric',
//                 hour: '2-digit', minute: '2-digit', second: '2-digit'
//             }) : 'N/A';

//             row.innerHTML = `
//                 <td>${i++}</td>
//                 <td>${app.organizationName || 'N/A'}</td>
//                 <td>${app.contactPerson || 'N/A'}</td>
//                 <td>${app.email || 'N/A'}</td>
//                 <td>${app.mobileNumber || 'N/A'}</td>
//                 <td><a href="${app.socialMediaLink}" target="_blank" rel="noopener noreferrer">${app.socialMediaLink ? 'Link' : 'N/A'}</a></td>
//                 <td>${app.headquarters?.region || 'N/A'}</td>
//                 <td>${app.headquarters?.province || 'N/A'}</td>
//                 <td>${app.headquarters?.city || 'N/A'}</td>
//                 <td>${app.headquarters?.barangay || 'N/A'}</td>
//                 <td>${app.headquarters?.streetAddress || 'N/A'}</td>
//                 <td>${formattedTimestamp}</td> 
//                 <td>
//                     <button class="viewBtn" data-key="${app.key}">View</button>
//                 </td>
//             `;
//         });

//         updateEntriesInfo(applicationsToRender.length);
//         renderPagination(applicationsToRender.length);
//     }

//     // --- Search and Sort Logic ---
//     function applySearchAndSort() {
//         let currentApplications = [...allApplications]; 

//         // Apply search filter
//         const searchTerm = searchInput.value.toLowerCase().trim();
//         if (searchTerm) {
//             currentApplications = currentApplications.filter(app => {
//                 const orgName = (app.organizationName || '').toLowerCase();
//                 const contactPerson = (app.contactPerson || '').toLowerCase();
//                 const email = (app.email || '').toLowerCase();
//                 const mobileNumber = (app.mobileNumber || '').toLowerCase();
//                 const region = (app.headquarters?.region || '').toLowerCase();
//                 const province = (app.headquarters?.province || '').toLowerCase();
//                 const city = (app.headquarters?.city || '').toLowerCase();
//                 const barangay = (app.headquarters?.barangay || '').toLowerCase();
//                 const timestamp = new Date(app.applicationDateandTime || 0).toLocaleString('en-US').toLowerCase(); // Search by formatted timestamp

//                 return orgName.includes(searchTerm) ||
//                        contactPerson.includes(searchTerm) ||
//                        email.includes(searchTerm) ||
//                        mobileNumber.includes(searchTerm) ||
//                        region.includes(searchTerm) ||
//                        province.includes(searchTerm) ||
//                        city.includes(searchTerm) ||
//                        barangay.includes(searchTerm) ||
//                        timestamp.includes(searchTerm); 
//             });
//         }

//         // Apply sort
//         const sortValue = sortSelect.value;
//         if (sortValue) {
//             const [sortBy, order] = sortValue.split('-');
//             currentApplications.sort((a, b) => {
//                 let valA, valB;

//                 switch (sortBy) {
//                     case 'organizationName':
//                         valA = (a.organizationName || '').toLowerCase();
//                         valB = (b.organizationName || '').toLowerCase();
//                         break;
//                     case 'contactPerson':
//                         valA = (a.contactPerson || '').toLowerCase();
//                         valB = (b.contactPerson || '').toLowerCase();
//                         break;
//                     case 'email':
//                         valA = (a.email || '').toLowerCase();
//                         valB = (b.email || '').toLowerCase();
//                         break;
//                     case 'mobileNumber':
//                         valA = (a.mobileNumber || '').toLowerCase();
//                         valB = (b.mobileNumber || '').toLowerCase();
//                         break;
//                     case 'region':
//                         valA = (a.headquarters?.region || '').toLowerCase();
//                         valB = (b.headquarters?.region || '').toLowerCase();
//                         break;
//                     case 'province':
//                         valA = (a.headquarters?.province || '').toLowerCase();
//                         valB = (b.headquarters?.province || '').toLowerCase();
//                         break;
//                     case 'city':
//                         valA = (a.headquarters?.city || '').toLowerCase();
//                         valB = (b.headquarters?.city || '').toLowerCase();
//                         break;
//                     case 'barangay':
//                         valA = (a.headquarters?.barangay || '').toLowerCase();
//                         valB = (b.headquarters?.barangay || '').toLowerCase();
//                         break;
//                     default:
//                         valA = (a.organizationName || '').toLowerCase();
//                         valB = (b.organizationName || '').toLowerCase();
//                         break;
//                 }

//                 if (typeof valA === 'string' && typeof valB === 'string') {
//                     return order === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
//                 } else {
//                     if (valA < valB) return order === 'asc' ? -1 : 1;
//                     if (valA > valB) return order === 'asc' ? 1 : -1;
//                     return 0;
//                 }
//             });
//         }

//         filteredApplications = currentApplications; // Update filtered applications
//         currentPage = 1; // Reset to first page after search/sort
//         renderApplications(filteredApplications);
//     }

//     // --- Pagination Functions ---
//     function renderPagination() {
//         pagination.innerHTML = '';
//         const totalPages = Math.ceil(filteredApplications.length / rowsPerPage);

//         if (totalPages === 0) {
//             pagination.innerHTML = '<span>No entries to display</span>';
//             return;
//         }

//         const createButton = (label, page, disabled = false, isActive = false) => {
//             const btn = document.createElement('button');
//             btn.textContent = label;
//             if (disabled) btn.disabled = true;
//             if (isActive) btn.classList.add('active-page');
//             btn.addEventListener('click', () => {
//                 currentPage = page;
//                 renderApplications(filteredApplications);
//             });
//             return btn;
//         };

//         pagination.appendChild(createButton('Prev', currentPage - 1, currentPage === 1));

//         const maxVisible = 5;
//         let startPage = Math.max(1, currentPage - Math.floor(maxVisible / 2));
//         let endPage = Math.min(totalPages, startPage + maxVisible - 1);
//         if (endPage - startPage < maxVisible - 1) {
//             startPage = Math.max(1, endPage - maxVisible + 1);
//         }

//         for (let i = startPage; i <= endPage; i++) {
//             pagination.appendChild(createButton(i, i, false, i === currentPage));
//         }

//         pagination.appendChild(createButton('Next', currentPage + 1, currentPage === totalPages));
//     }

//     function updateEntriesInfo(totalItems) {
//         const startIndex = (currentPage - 1) * rowsPerPage;
//         const endIndex = Math.min(startIndex + rowsPerPage, totalItems);
//         entriesInfo.textContent = `Showing ${totalItems ? startIndex + 1 : 0} to ${endIndex} of ${totalItems} entries`;
//     }

//     function showPreviewModal(applicationData) {
//         const formattedApplicationTimestamp = applicationData.applicationDateandTime ? new Date(applicationData.applicationDateandTime).toLocaleString('en-US', {
//             year: 'numeric', month: 'short', day: 'numeric',
//             hour: '2-digit', minute: '2-digit', second: '2-digit'
//         }) : 'N/A';

//         const formattedApprovedTimestamp = applicationData.approvedApplicationDate ? new Date(applicationData.approvedApplicationDate).toLocaleString('en-US', {
//             year: 'numeric', month: 'short', day: 'numeric',
//             hour: '2-digit', minute: '2-digit', second: '2-digit'
//         }) : 'N/A';

//         let content = `
//             <h3 style="margin-bottom: 15px; color: #FA3B99;">Organization Details</h3>
//             <p><strong>Application Key:</strong> ${applicationData.key || 'N/A'}</p>
//             <p><strong>Organization Name:</strong> ${applicationData.organizationName || 'N/A'}</p>
//             <p><strong>Contact Person:</strong> ${applicationData.contactPerson || 'N/A'}</p>
//             <p><strong>Email:</strong> ${applicationData.email || 'N/A'}</p>
//             <p><strong>Mobile Number:</strong> ${applicationData.mobileNumber || 'N/A'}</p>
//             <p><strong>Social Media Link:</strong> ${applicationData.socialMediaLink ? `<a href="${applicationData.socialMediaLink}" target="_blank" rel="noopener noreferrer">${applicationData.socialMediaLink}</a>` : 'N/A'}</p>

//             <h4 style="margin-top: 20px; margin-bottom: 10px; color: #FA3B99;">Headquarters Address:</h4>
//             <ul>
//                 <li><strong>Region:</strong> ${applicationData.headquarters?.region || 'N/A'}</li>
//                 <li><strong>Province:</strong> ${applicationData.headquarters?.province || 'N/A'}</li>
//                 <li><strong>City:</strong> ${applicationData.headquarters?.city || 'N/A'}</li>
//                 <li><strong>Barangay:</strong> ${applicationData.headquarters?.barangay || 'N/A'}</li>
//                 <li><strong>Street Address:</strong> ${applicationData.headquarters?.streetAddress || 'N/A'}</li>
//             </ul>

//             <h4 style="margin-top: 20px; margin-bottom: 10px; color: #FA3B99;">Organizational Background:</h4>
//             <p><strong>Mission/Background:</strong> ${applicationData.organizationalBackgroundMission || 'N/A'}</p>
//             <p><strong>Areas of Expertise/Focus:</strong> ${applicationData.areasOfExpertiseFocus || 'N/A'}</p>

//             <h4 style="margin-top: 20px; margin-bottom: 10px; color: #FA3B99;">Legal & Documents:</h4>
//             <p><strong>Legal Status/Registration:</strong> ${applicationData.legalStatusRegistration || 'N/A'}</p>
//             <p><strong>Required Documents:</strong> ${applicationData.requiredDocuments ? `<a href="${applicationData.requiredDocuments}" target="_blank" rel="noopener noreferrer">View Document</a>` : 'N/A'}</p>
            
//             <p style="margin-top: 20px; font-size: 0.9em; color: #555;"><strong>Application Date and Time:</strong> ${formattedApplicationTimestamp}</p>
//             <p style="font-size: 0.9em; color: #555;"><strong>Approval Date and Time:</strong> ${formattedApprovedTimestamp}</p>
//         `;

//         modalContentDiv.innerHTML = content;
//         previewModal.style.display = 'block'; // Show the modal
//     }

//     function hidePreviewModal() {
//         previewModal.style.display = 'none'; // Hide the modal
//         modalContentDiv.innerHTML = ''; // Clear content when hidden
//     }

//     // --- Action Handlers (View) ---
//     volunteerOrgsContainer.addEventListener('click', async (event) => {
//         const target = event.target;
//         const appKey = target.dataset.key;

//         if (!appKey) return;

//         if (target.classList.contains('viewBtn')) {
//             // Find the application data by key
//             const applicationToView = allApplications.find(app => app.key === appKey);
//             if (applicationToView) {
//                 showPreviewModal(applicationToView);
//             } else {
//                 Swal.fire('Error', 'Application details not found.', 'error');
//             }
//         }
//     });

//     // --- Event Listeners for Search and Sort ---
//     if (searchInput) {
//         // Debounce search input for better performance
//         let searchTimeout;
//         searchInput.addEventListener('keyup', () => {
//             clearTimeout(searchTimeout);
//             searchTimeout = setTimeout(() => {
//                 applySearchAndSort();
//             }, 300); // Wait 300ms after typing stops
//         });
//     }
//     if (sortSelect) {
//         sortSelect.addEventListener('change', applySearchAndSort);
//     }

//     // --- Modal Close Listeners ---
//     closeModalBtn.addEventListener('click', hidePreviewModal);

//     // Close the modal if clicked outside the modal content
//     window.addEventListener('click', (event) => {
//         if (event.target === previewModal) {
//             hidePreviewModal();
//         }
//     });

//     fetchApprovedApplications();

//     if (viewPendingBtn) {
//         viewPendingBtn.addEventListener('click', () => {
//             window.location.href = '../pages/pendingvg.html'; 
//         });
//     }
// });

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

// Initialize Firebase if not already initialized
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const database = firebase.database();
// Initialize Firebase Auth
const auth = firebase.auth(); // Make sure firebase.auth() is initialized

// --- Variables for inactivity detection ---
let inactivityTimeout;
const INACTIVITY_TIME = 1800000; // 30 minutes 

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
        confirmButtonText: 'Stay Logged In',
        cancelButtonText: 'Log Out',
        allowOutsideClick: false, // Prevent closing by clicking outside
        reverseButtons: true // Swap confirm and cancel buttons
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

// Attach event listeners to detect user activity for inactivity timer
['mousemove', 'keydown', 'scroll', 'click'].forEach(eventType => {
    document.addEventListener(eventType, resetInactivityTimer);
});

// --- Main DOM Content Loaded Listener ---
document.addEventListener('DOMContentLoaded', () => {
    // --- Authentication Check (Crucial for page protection) ---
    auth.onAuthStateChanged(user => {
        if (!user) {
            // User is NOT authenticated, redirect to login page
            Swal.fire({
                icon: 'error',
                title: 'Authentication Required',
                text: 'Please sign in to access approved applications.',
            }).then(() => {
                window.location.href = "../pages/login.html";
            });
            return; // Stop execution of the rest of the script
        }
        // User IS authenticated, proceed with loading and setting up the page
        console.log("User authenticated:", user.uid);
        // Initialize all page-specific functions only after authentication
        initializeApprovedApplicationsPage(user.uid);
        resetInactivityTimer(); // Start the inactivity timer only when authenticated
    });
});

// --- Encapsulate all page-specific logic in a function called after authentication ---
function initializeApprovedApplicationsPage(userId) {
    const volunteerOrgsContainer = document.getElementById('volunteerOrgsContainer');
    const searchInput = document.getElementById('searchInput');
    const sortSelect = document.getElementById('sortSelect');
    const entriesInfo = document.getElementById('entriesInfo');
    const pagination = document.getElementById('pagination');
    const viewPendingBtn = document.getElementById('viewApprovedBtn'); // Renamed from viewApprovedBtn to viewPendingBtn for clarity

    // --- Modal Elements ---
    const previewModal = document.getElementById('previewModal');
    const closeModalBtn = document.getElementById('closeModal');
    const modalContentDiv = document.getElementById('modalContent');

    let allApplications = [];
    let filteredApplications = [];
    let currentPage = 1;
    const rowsPerPage = 5;

    // --- Data Fetching Function ---
    function fetchApprovedApplications() {
        volunteerOrgsContainer.innerHTML = '<tr><td colspan="10" style="text-align: center;">Loading approved applications...</td></tr>';

        database.ref('abvnApplications/approvedABVN').on('value', (snapshot) => {
            allApplications = []; // Clear previous data
            if (snapshot.exists()) {
                snapshot.forEach((childSnapshot) => {
                    const appData = childSnapshot.val();
                    const appKey = childSnapshot.key;
                    allApplications.push({ key: appKey, ...appData });
                });
                console.log("Fetched approved applications:", allApplications);
            } else {
                console.log("No approved ABVN applications found.");
            }
            applySearchAndSort(); // Apply initial search and sort after fetching
        }, (error) => {
            console.error("Error fetching approved applications: ", error);
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'Failed to load approved applications. Please try again later.',
                confirmButtonText: 'OK'
            });
            volunteerOrgsContainer.innerHTML = '<tr><td colspan="10" style="text-align: center; color: red;">Failed to load data.</td></tr>';
        });
    }

    // --- Rendering Function ---
    function renderApplications(applicationsToRender) {
        volunteerOrgsContainer.innerHTML = '';

        const startIndex = (currentPage - 1) * rowsPerPage;
        const endIndex = startIndex + rowsPerPage;
        const paginatedApplications = applicationsToRender.slice(startIndex, endIndex);

        if (paginatedApplications.length === 0) {
            volunteerOrgsContainer.innerHTML = '<tr><td colspan="10" style="text-align: center;">No approved applications found on this page.</td></tr>';
            entriesInfo.textContent = 'Showing 0 to 0 of 0 entries';
            renderPagination();
            return;
        }

        let i = startIndex + 1;

        paginatedApplications.forEach(app => {
            const formattedTimestamp = app.applicationDateandTime ? new Date(app.applicationDateandTime).toLocaleString('en-US', {
                year: 'numeric', month: 'short', day: 'numeric',
                hour: '2-digit', minute: '2-digit', second: '2-digit'
            }) : 'N/A';

            const row = volunteerOrgsContainer.insertRow();
            row.setAttribute('data-key', app.key);

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
                    <button class="viewBtn" data-key="${app.key}">View</button>
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
            currentApplications = currentApplications.filter(app => {
                const orgName = (app.organizationName || '').toLowerCase();
                const contactPerson = (app.contactPerson || '').toLowerCase();
                const email = (app.email || '').toLowerCase();
                const mobileNumber = (app.mobileNumber || '').toLowerCase();
                const region = (app.headquarters?.region || '').toLowerCase();
                const province = (app.headquarters?.province || '').toLowerCase();
                const city = (app.headquarters?.city || '').toLowerCase();
                const barangay = (app.headquarters?.barangay || '').toLowerCase();
                const timestamp = new Date(app.applicationDateandTime || 0).toLocaleString('en-US').toLowerCase(); // Search by formatted timestamp

                return orgName.includes(searchTerm) ||
                       contactPerson.includes(searchTerm) ||
                       email.includes(searchTerm) ||
                       mobileNumber.includes(searchTerm) ||
                       region.includes(searchTerm) ||
                       province.includes(searchTerm) ||
                       city.includes(searchTerm) ||
                       barangay.includes(searchTerm) ||
                       timestamp.includes(searchTerm);
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
                        valA = (a.organizationName || '').toLowerCase();
                        valB = (b.organizationName || '').toLowerCase();
                        break;
                    case 'contactPerson':
                        valA = (a.contactPerson || '').toLowerCase();
                        valB = (b.contactPerson || '').toLowerCase();
                        break;
                    case 'email':
                        valA = (a.email || '').toLowerCase();
                        valB = (b.email || '').toLowerCase();
                        break;
                    case 'mobileNumber':
                        valA = (a.mobileNumber || '').toLowerCase();
                        valB = (b.mobileNumber || '').toLowerCase();
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

                if (typeof valA === 'string' && typeof valB === 'string') {
                    return order === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
                } else {
                    if (valA < valB) return order === 'asc' ? -1 : 1;
                    if (valA > valB) return order === 'asc' ? 1 : -1;
                    return 0;
                }
            });
        }

        filteredApplications = currentApplications; // Update filtered applications
        currentPage = 1; // Reset to first page after search/sort
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

    function showPreviewModal(applicationData) {
        const formattedApplicationTimestamp = applicationData.applicationDateandTime ? new Date(applicationData.applicationDateandTime).toLocaleString('en-US', {
            year: 'numeric', month: 'short', day: 'numeric',
            hour: '2-digit', minute: '2-digit', second: '2-digit'
        }) : 'N/A';

        const formattedApprovedTimestamp = applicationData.approvedApplicationDate ? new Date(applicationData.approvedApplicationDate).toLocaleString('en-US', {
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
            <p><strong>Required Documents:</strong> ${applicationData.requiredDocuments ? `<a href="${applicationData.requiredDocuments}" target="_blank" rel="noopener noreferrer">View Document</a>` : 'N/A'}</p>

            <p style="margin-top: 20px; font-size: 0.9em; color: #555;"><strong>Application Date and Time:</strong> ${formattedApplicationTimestamp}</p>
            <p style="font-size: 0.9em; color: #555;"><strong>Approval Date and Time:</strong> ${formattedApprovedTimestamp}</p>
        `;

        modalContentDiv.innerHTML = content;
        previewModal.style.display = 'flex'; // Show the modal
    }

    function hidePreviewModal() {
        previewModal.style.display = 'none'; // Hide the modal
        modalContentDiv.innerHTML = ''; // Clear content when hidden
    }

    // --- Action Handlers (View) ---
    volunteerOrgsContainer.addEventListener('click', async (event) => {
        const target = event.target;
        const appKey = target.dataset.key;

        if (!appKey) return;

        if (target.classList.contains('viewBtn')) {
            // Find the application data by key
            const applicationToView = allApplications.find(app => app.key === appKey);
            if (applicationToView) {
                showPreviewModal(applicationToView);
            } else {
                Swal.fire('Error', 'Application details not found.', 'error');
            }
        }
    });

    // --- Event Listeners for Search and Sort ---
    if (searchInput) {
        // Debounce search input for better performance
        let searchTimeout;
        searchInput.addEventListener('keyup', () => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                applySearchAndSort();
            }, 300); // Wait 300ms after typing stops
        });
    }
    if (sortSelect) {
        sortSelect.addEventListener('change', applySearchAndSort);
    }

    // --- Modal Close Listeners ---
    closeModalBtn.addEventListener('click', hidePreviewModal);

    // Close the modal if clicked outside the modal content
    window.addEventListener('click', (event) => {
        if (event.target === previewModal) {
            hidePreviewModal();
        }
    });

    // Initial load of approved applications after authentication check passes
    fetchApprovedApplications();

    if (viewPendingBtn) {
        viewPendingBtn.addEventListener('click', () => {
            window.location.href = '../pages/pendingvg.html';
        });
    }
}
const firebaseConfig = {
    apiKey: "AIzaSyDJxMv8GCaMvQT2QBW3CdzA3dV5X_T2KqQ", // Your actual API Key
    authDomain: "bayanihan-5ce7e.firebaseapp.com",
    databaseURL: "https://bayanihan-5ce7e-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "bayanihan-5ce7e",
    storageBucket: "bayanihan-5ce7e.appspot.com",
    messagingSenderId: "593123849917",
    appId: "1:593123849917:web:eb85a63a536eeff78ce9d4",
    measurementId: "G-ZTQ9VXXVV0",
};

// Initialize Firebase if it hasn't been initialized yet
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}

const database = firebase.database();
const auth = firebase.auth(); 

const volunteersContainer = document.getElementById('volunteersContainer');
const searchInput = document.getElementById('searchInput');
const sortSelect = document.getElementById('sortSelect');
const paginationElement = document.getElementById('pagination');
const entriesInfoSpan = document.getElementById('entriesInfo');

const previewModal = document.getElementById('previewModal');
const closeModalBtn = document.getElementById('closeModal');
const modalContentDiv = document.getElementById('modalContent');

let allEndorsedVolunteers = []; 
let filteredVolunteers = [];    
let paginatedVolunteers = [];   
let currentPage = 1;
const rowsPerPage = 10; 

let currentUserRole = 'ABVN';
let currentUserId = null;

function getFullName(volunteer) {
    return `${volunteer.firstName} ${volunteer.lastName}`;
}

function formatDate(isoString) {
    if (!isoString) return 'N/A';
    try {
        const date = new Date(isoString);
        return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    } catch (error) {
        console.error('Error formatting date:', isoString, error);
        return 'Invalid Date';
    }
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
function getSocialMediaLink(socialMediaLink) {
    if (!socialMediaLink || socialMediaLink === 'N/A') return 'N/A';
    try {
        new URL(socialMediaLink); // Test if it's a valid URL
        return `<a href="${socialMediaLink}" target="_blank">${socialMediaLink}</a>`;
    } catch (e) {
        return socialMediaLink; // Not a valid URL, just display as text
    }
}

async function fetchEndorsedVolunteers(userUid, userRole) { 
    if (!userUid) {
        console.warn("No user UID provided. Cannot fetch endorsed volunteers.");
        allEndorsedVolunteers = [];
        renderVolunteersTable();
        return;
    }

    try {
        const tempEndorsedVolunteers = [];

        if (userRole === 'AB ADMIN') { 
            // Admin: Fetch all endorsed volunteers from all volunteerGroups
            const volunteerGroupsRef = database.ref('volunteerGroups');
            const groupsSnapshot = await volunteerGroupsRef.once('value');
            const groupsData = groupsSnapshot.val();

            if (groupsData) {
                for (const abvnKey in groupsData) {
                    const group = groupsData[abvnKey];
                    const endorsedData = group.endorsedVolunteers;

                    if (endorsedData) {
                        for (const volunteerKey in endorsedData) {
                            const volunteerData = endorsedData[volunteerKey];
                            tempEndorsedVolunteers.push({
                                key: volunteerKey,
                                sourceAbvnKey: abvnKey,
                                ...volunteerData
                            });
                        }
                    }
                }
            }
            allEndorsedVolunteers = tempEndorsedVolunteers;
            applyFiltersAndSort();
        } else { 
            // Regular User: Find the ABVN key associated with this userUid
            const volunteerGroupsRef = database.ref('volunteerGroups');
            const querySnapshot = await volunteerGroupsRef.orderByChild('userId').equalTo(userUid).once('value');

            let foundAbvnKey = null;
            querySnapshot.forEach(childSnapshot => {
                foundAbvnKey = childSnapshot.key;
                return true;
            });

            if (!foundAbvnKey) {
                Swal.fire({
                    title: 'Access Denied',
                    text: 'Your account is not associated with an ABVN group to view endorsements, or the association is missing. Please contact support.',
                    icon: 'error',
                    showCancelButton: false,
                    confirmButtonText: 'OK'
                });
                allEndorsedVolunteers = []; 
                renderVolunteersTable();
                return;
            }

            // Fetch endorsed volunteers for this specific ABVN group
            const endorsedVolunteersRef = database.ref(`volunteerGroups/${foundAbvnKey}/endorsedVolunteers`);
            const snapshot = await endorsedVolunteersRef.once('value');
            const endorsedData = snapshot.val();

            if (endorsedData) {
                for (const volunteerKey in endorsedData) {
                    const volunteerData = endorsedData[volunteerKey];
                    tempEndorsedVolunteers.push({
                        key: volunteerKey,
                        sourceAbvnKey: foundAbvnKey,
                        ...volunteerData
                    });
                }
            }
            allEndorsedVolunteers = tempEndorsedVolunteers;
            applyFiltersAndSort();
        }
    } catch (error) {
        console.error("Error fetching endorsed volunteers:", error);
        Swal.fire('Error', 'Failed to fetch endorsed volunteers.', 'error');
    }
}

async function archiveVolunteer(volunteer) {
    Swal.fire({
        title: 'Are you sure?',
        text: "You are about to archive this volunteer application. It will be moved to the deleted applications.",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33', 
        cancelButtonColor: '#3085d6',
        confirmButtonText: 'Yes, archive it!'
    }).then(async (result) => {
        if (result.isConfirmed) {
            let sourcePath = '';
            let abvnKeyToOperateOn = volunteer.sourceAbvnKey; // Use the stored sourceAbvnKey

            if (!abvnKeyToOperateOn) {
                Swal.fire('Error', 'Cannot archive: Missing ABVN source key for this volunteer.', 'error');
                return;
            }

            // Construct the source path
            sourcePath = `volunteerGroups/${abvnKeyToOperateOn}/endorsedVolunteers/${volunteer.key}`;
            const destinationPath = `deletedEndorsedVolunteerApplications/${volunteer.key}`; // Using volunteer.key as the key for deleted applications

            try {
                const volunteerRef = database.ref(sourcePath);
                const deletedRef = database.ref(destinationPath);

                const snapshot = await volunteerRef.once('value');
                const dataToArchive = snapshot.val();

                if (!dataToArchive) {
                    Swal.fire('Not Found', 'Volunteer application not found for archiving.', 'error');
                    return;
                }

                // Add a timestamp for when it was archived
                dataToArchive.archivedAt = new Date().toISOString();
                // Add who archived it (optional, but good for auditing)
                dataToArchive.archivedBy = currentUserId; 
                dataToArchive.archivedByRole = currentUserRole;

                // Perform the move: Write to the new node, then remove from the old node
                await deletedRef.set(dataToArchive); 
                await volunteerRef.remove();        

                Swal.fire('Archived!', 'Volunteer application has been archived.', 'success');

                // Update local data arrays and re-render the table
                allEndorsedVolunteers = allEndorsedVolunteers.filter(v => v.key !== volunteer.key);
                applyFiltersAndSort();

            } catch (error) {
                console.error("Error archiving volunteer:", error);
                Swal.fire('Error', 'Failed to archive volunteer application. Please try again.', 'error');
            }
        }
    });
}

// --- Table Rendering and Management ---
function renderVolunteersTable() {
    volunteersContainer.innerHTML = ''; // Clear existing table rows

    if (paginatedVolunteers.length === 0) {
        volunteersContainer.innerHTML = '<tr><td colspan="16" style="text-align: center;">No endorsed volunteers found.</td></tr>';
        entriesInfoSpan.textContent = 'Showing 0 to 0 of 0 entries';
        paginationElement.innerHTML = '';
        return;
    }

    const startEntry = (currentPage - 1) * rowsPerPage + 1;
    const endEntry = Math.min(currentPage * rowsPerPage, filteredVolunteers.length);
    entriesInfoSpan.textContent = `Showing ${startEntry} to ${endEntry} of ${filteredVolunteers.length} entries`;

    paginatedVolunteers.forEach((volunteer, index) => {
        const row = volunteersContainer.insertRow();
        const rowNum = startEntry + index; // Correct row number based on pagination

        row.insertCell().textContent = rowNum;
        row.insertCell().textContent = getFullName(volunteer);
        row.insertCell().textContent = volunteer.email || 'N/A';
        row.insertCell().textContent = volunteer.mobileNumber || 'N/A';
        row.insertCell().textContent = volunteer.age || 'N/A';
        row.insertCell().innerHTML = getSocialMediaLink(volunteer.socialMediaLink);
        row.insertCell().textContent = volunteer.additionalInfo || 'N/A';
        row.insertCell().textContent = volunteer.address?.region || 'N/A';
        row.insertCell().textContent = volunteer.address?.province || 'N/A';
        row.insertCell().textContent = volunteer.address?.city || 'N/A';
        row.insertCell().textContent = volunteer.address?.barangay || 'N/A';
        row.insertCell().textContent = volunteer.endorsedToABVNName ? `${volunteer.endorsedToABVNName} (${volunteer.endorsedToABVNLocation})` : 'N/A';
        row.insertCell().textContent = formatDate(volunteer.endorsementDate);

        const actionsCell = row.insertCell();
        const viewButton = document.createElement('button');
        viewButton.textContent = 'View';
        viewButton.classList.add('action-button', 'view-info-button');
        viewButton.onclick = () => showVolunteerDetails(volunteer);
        actionsCell.appendChild(viewButton);

        // --- Archive Button ---
        const archiveButton = document.createElement('button');
        archiveButton.textContent = 'Archive';
        archiveButton.classList.add('action-button', 'archive-button');
        archiveButton.onclick = () => archiveVolunteer(volunteer); 
        actionsCell.appendChild(archiveButton);
    });

    renderPagination();
}

function applyFiltersAndSort() {
    let tempVolunteers = [...allEndorsedVolunteers];

    // Apply Search Filter
    const searchTerm = searchInput.value.toLowerCase().trim();
    if (searchTerm) {
        tempVolunteers = tempVolunteers.filter(volunteer =>
            getFullName(volunteer).toLowerCase().includes(searchTerm) ||
            (volunteer.email && volunteer.email.toLowerCase().includes(searchTerm)) ||
            (volunteer.mobileNumber && volunteer.mobileNumber.includes(searchTerm)) ||
            (volunteer.address?.region && volunteer.address.region.toLowerCase().includes(searchTerm)) ||
            (volunteer.address?.province && volunteer.address.province.toLowerCase().includes(searchTerm)) ||
            (volunteer.address?.city && volunteer.address.city.toLowerCase().includes(searchTerm)) ||
            (volunteer.address?.barangay && volunteer.address.barangay.toLowerCase().includes(searchTerm)) ||
            (volunteer.endorsedToABVNName && volunteer.endorsedToABVNName.toLowerCase().includes(searchTerm)) ||
            (volunteer.endorsedToABVNLocation && volunteer.endorsedToABVNLocation.toLowerCase().includes(searchTerm)) ||
            (volunteer.socialMediaLink && volunteer.socialMediaLink.toLowerCase().includes(searchTerm))
        );
    }

    // Apply Sort
    const sortValue = sortSelect.value;
    if (sortValue) {
        const [sortBy, sortOrder] = sortValue.split('-');
        tempVolunteers.sort((a, b) => {
            let valA, valB;
            if (sortBy === 'Location') {
                valA = `${a.endorsedToABVNName || ''} ${a.endorsedToABVNLocation || ''}`.toLowerCase();
                valB = `${b.endorsedToABVNName || ''} ${b.endorsedToABVNLocation || ''}`.toLowerCase();
            } else if (sortBy === 'region') {
                valA = (a.address?.region || '').toLowerCase();
                valB = (b.address?.region || '').toLowerCase();
            }
            else {
                valA = (a[sortBy] || '').toLowerCase();
                valB = (b[sortBy] || '').toLowerCase();
            }

            if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
            if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
            return 0;
        });
    }

    filteredVolunteers = tempVolunteers;
    currentPage = 1;
    paginateVolunteers();
}

function paginateVolunteers() {
    const startIndex = (currentPage - 1) * rowsPerPage;
    const endIndex = startIndex + rowsPerPage;
    paginatedVolunteers = filteredVolunteers.slice(startIndex, endIndex);
    renderVolunteersTable();
}

function renderPagination() {
    paginationElement.innerHTML = '';
    const totalPages = Math.ceil(filteredVolunteers.length / rowsPerPage);

    if (totalPages <= 1) return;

    const prevBtn = document.createElement('button');
    prevBtn.textContent = 'Previous';
    prevBtn.disabled = currentPage === 1;
    prevBtn.onclick = () => { currentPage--; paginateVolunteers(); };
    paginationElement.appendChild(prevBtn);

    for (let i = 1; i <= totalPages; i++) {
        const pageBtn = document.createElement('button');
        pageBtn.textContent = i;
        pageBtn.classList.toggle('active', i === currentPage);
        pageBtn.onclick = () => { currentPage = i; paginateVolunteers(); };
        paginationElement.appendChild(pageBtn);
    }

    const nextBtn = document.createElement('button');
    nextBtn.textContent = 'Next';
    nextBtn.disabled = currentPage === totalPages;
    nextBtn.onclick = () => { currentPage++; paginateVolunteers(); };
    paginationElement.appendChild(nextBtn);
}

// --- Modal Functionality  ---
function showVolunteerDetails(volunteer) {
    let socialMediaHtml = getSocialMediaLink(volunteer.socialMediaLink);

    modalContentDiv.innerHTML = `
        <h2>Volunteer Details</h2>
        <p><strong>Full Name:</strong> ${getFullName(volunteer)}</p>
        <p><strong>Email:</strong> ${volunteer.email || 'N/A'}</p>
        <p><strong>Mobile Number:</strong> ${volunteer.mobileNumber || 'N/A'}</p>
        <p><strong>Age:</strong> ${volunteer.age || 'N/A'}</p>
        <p><strong>Social Media:</strong><br>${socialMediaHtml}</p>
        <p><strong>Additional Info:</strong> ${volunteer.additionalInfo || 'N/A'}</p>
        <p><strong>Region:</strong> ${volunteer.address?.region || 'N/A'}</p>
        <p><strong>Province:</strong> ${volunteer.address?.province || 'N/A'}</p>
        <p><strong>City:</strong> ${volunteer.address?.city || 'N/A'}</p>
        <p><strong>Barangay:</strong> ${volunteer.address?.barangay || 'N/A'}</p>
        <p><strong>Endorsed To ABVN:</strong> ${volunteer.endorsedToABVNName ? `${volunteer.endorsedToABVNName} (${volunteer.endorsedToABVNLocation})` : 'N/A'}</p>
        <p><strong>Endorsement Date:</strong> ${formatDate(volunteer.endorsementDate)}</p>
    `;
    previewModal.style.display = 'flex';
}

closeModalBtn.addEventListener('click', () => {
    previewModal.style.display = 'none';
});

window.addEventListener('click', (event) => {
    if (event.target === previewModal) {
        previewModal.style.display = 'none';
    }
});

// --- Event Listeners ---
searchInput.addEventListener('keyup', applyFiltersAndSort);
sortSelect.addEventListener('change', applyFiltersAndSort);

// --- Initial Data Load (Auth Check) ---
document.addEventListener('DOMContentLoaded', () => {
    auth.onAuthStateChanged(async (user) => {
        if (user) {
            const profilePage = 'profile.html'; 

            try {
                const userSnapshot = await database.ref(`users/${user.uid}`).once("value");
                const userDataFromDb = userSnapshot.val();
                const passwordNeedsReset = userDataFromDb ? (userDataFromDb.password_needs_reset || false) : false;
                currentUserId = user.uid;
                currentUserRole = userDataFromDb ? (userDataFromDb.role || 'ABVN') : 'ABVN'; 

                if (passwordNeedsReset) {
                    console.log(`Password change required for user ${user.uid}. Redirecting to profile page.`);
                    Swal.fire({
                        icon: 'info',
                        title: 'Password Change Required',
                        text: 'For security reasons, please change your password. You will be redirected to your profile.',
                        allowOutsideClick: false,
                        allowEscapeKey: false,
                        showConfirmButton: false,
                        timer: 2000,
                        timerProgressBar: true
                    }).then(() => {
                        window.location.replace(`../pages/${profilePage}`); // Use replace to prevent back button
                    });
                    return; 
                }
                fetchEndorsedVolunteers(user.uid, currentUserRole);

            } catch (error) {
                console.error("Error checking password reset status or fetching user data:", error);
                Swal.fire({
                    icon: 'error',
                    title: 'Authentication Error',
                    text: 'Failed to verify account status. Please try logging in again.',
                }).then(() => {
                    window.location.replace('../pages/login.html'); // Redirect to login on error
                });
                return;
            }
        } else {
            Swal.fire({
                title: 'Not Logged In',
                text: 'Please log in to view endorsed volunteers.',
                icon: 'warning',
                showCancelButton: false,
                confirmButtonText: 'Go to Login'
            }).then(() => {
                window.location.replace('../pages/login.html'); // Use replace to prevent back button
            });
            allEndorsedVolunteers = [];
            renderVolunteersTable();
        }
    });
});
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

// Initialize EmailJS with updated public key
try {
    emailjs.init('BwfsCx-NJCb3qGxCk');
    console.log("EmailJS initialized successfully");
} catch (error) {
    console.error("EmailJS initialization failed:", error);
}

// Variables for inactivity detection
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

// Attach inactivity reset to common user interaction events
['mousemove', 'keydown', 'scroll', 'click'].forEach(eventType => {
    document.addEventListener(eventType, resetInactivityTimer);
});

// Global flag for Super Admin status
let currentUserIsSuperAdmin = false;

document.addEventListener('DOMContentLoaded', () => {
    // Authentication Check
    auth.onAuthStateChanged(user => {
        if (!user) {
            Swal.fire({
                icon: 'error',
                title: 'Authentication Required',
                text: 'Please sign in to access pending volunteer applications.',
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
            resetInactivityTimer();
        }).catch(error => {
            console.error("Error fetching user role:", error);
            currentUserIsSuperAdmin = false;
            initializePageFunctions(user.uid);
            resetInactivityTimer();
        });
    });
});

function initializePageFunctions(userId) {
    const volunteersContainer = document.getElementById('volunteersContainer');
    const searchInput = document.getElementById('searchInput');
    const sortSelect = document.getElementById('sortSelect');
    const entriesInfo = document.getElementById('entriesInfo');
    const pagination = document.getElementById('pagination');
    const viewApprovedBtn = document.getElementById('viewApprovedBtn');
    const viewArchivedButton = document.getElementById('viewArchived');

    // Modal Elements
    const previewModal = document.getElementById('previewModal');
    const closeModal = document.getElementById('closeModal');
    const modalContent = document.getElementById('modalContent');
    const scheduleModal = document.getElementById('scheduleModal');
    const closeScheduleModal = document.getElementById('closeScheduleModal');
    const scheduleForm = document.getElementById('scheduleForm');
    const scheduleDateTimeInput = document.getElementById('scheduleDateTime');
    const endorseABVNModal = document.getElementById('endorseABVNModal');
    const closeEndorseABVNModal = document.getElementById('closeEndorseABVNModal');
    const endorseABVNForm = document.getElementById('endorseABVNForm');
    const abvnListContainer = document.getElementById('abvnListContainer');
    const endorseABVNSubmitBtn = document.getElementById('endorseABVNSubmitBtn');
    const archivedModal = document.getElementById('archivedModal');
    const closeArchivedModalBtn = document.getElementById('closeArchivedModalBtn');
    const archivedTableBody = document.getElementById('archivedTableBody');
    const archivedEntriesInfo = document.getElementById('archivedEntriesInfo');
    const archivedPaginationContainer = document.getElementById('archivedPagination');

    let allApplications = [];
    let filteredApplications = [];
    let currentPage = 1;
    const rowsPerPage = 5;
    let currentVolunteerKey = null;
    let currentVolunteerData = null;
    let currentDropdown = null;
    let allArchivedVolunteerData = [];
    let currentArchivedVolunteerPage = 1;
    const archivedVolunteerRowsPerPage = 5;

    // Utility Functions
    function formatDate(timestamp) {
        if (!timestamp) return 'N/A';
        const date = new Date(timestamp);
        return date.toLocaleString('en-US', {
            year: 'numeric', month: 'short', day: 'numeric',
            hour: '2-digit', minute: '2-digit', second: '2-digit',
            hour12: true
        });
    }

    function getFullName(volunteer) {
        const parts = [
            volunteer.firstName,
            volunteer.middleInitial ? volunteer.middleInitial + '.' : '',
            volunteer.lastName,
            volunteer.nameExtension
        ].filter(Boolean);
        return parts.join(' ').trim();
    }

    function setupModalClose(modalElement, closeButtonElement) {
        closeButtonElement.addEventListener('click', () => modalElement.style.display = 'none');
        modalElement.addEventListener('click', (event) => {
            if (event.target === modalElement) {
                modalElement.style.display = 'none';
            }
        });
    }

    // Apply modal close listeners
    setupModalClose(previewModal, closeModal);
    setupModalClose(scheduleModal, closeScheduleModal);
    setupModalClose(endorseABVNModal, closeEndorseABVNModal);
    setupModalClose(archivedModal, closeArchivedModalBtn);

    function showPreviewModal(volunteer) {
        const fullName = getFullName(volunteer);
        modalContent.innerHTML = `
            <h3 style="color: #FA3B99;">Volunteer Application Details</h3>
            <p><strong>Application Date/Time:</strong> ${formatDate(volunteer.timestamp)}</p>
            <p><strong>Full Name:</strong> ${fullName}</p>
            <p><strong>Email:</strong> ${volunteer.email || 'N/A'}</p>
            <p><strong>Mobile Number:</strong> ${volunteer.mobileNumber || 'N/A'}</p>
            <p><strong>Age:</strong> ${volunteer.age || 'N/A'}</p>
            <p><strong>Social Media:</strong> ${volunteer.socialMediaLink ? `<a href="${volunteer.socialMediaLink}" target="_blank">${volunteer.socialMediaLink}</a>` : 'N/A'}</p>
            <p><strong>Additional Info:</strong> ${volunteer.additionalInfo || 'N/A'}</p>
            <h3 style="color: #FA3B99;">Address Information</h3>
            <p><strong>Region:</strong> ${volunteer.address?.region || 'N/A'}</p>
            <p><strong>Province:</strong> ${volunteer.address?.province || 'N/A'}</p>
            <p><strong>City:</strong> ${volunteer.address?.city || 'N/A'}</p>
            <p><strong>Barangay:</strong> ${volunteer.address?.barangay || 'N/A'}</p>
            <p><strong>Street Address:</strong> ${volunteer.address?.streetAddress || 'N/A'}</p>
            <h3 style="color: #FA3B99;">Availability</h3>
            <p><strong>General Availability:</strong> ${volunteer.availability?.general || 'N/A'}</p>
            <p><strong>Available Days:</strong> ${volunteer.availability?.specificDays ? volunteer.availability.specificDays.join(', ') : 'N/A'}</p>
            <p><strong>Time Availability:</strong> ${volunteer.availability?.timeAvailability || 'N/A'}</p>
        `;
        previewModal.style.display = 'flex';
    }

    function resetCurrentVolunteer() {
        currentVolunteerKey = null;
        currentVolunteerData = null;
        if (currentDropdown) {
            currentDropdown.remove();
            currentDropdown = null;
        }
        const previouslyActiveButton = document.querySelector('.actionBtn.active');
        if (previouslyActiveButton) {
            previouslyActiveButton.classList.remove('active');
        }
    }

    function showScheduleModal() {
        scheduleModal.style.display = 'flex';
    }

    function hideScheduleModal() {
        scheduleModal.style.display = 'none';
        scheduleForm.reset();
        resetCurrentVolunteer();
    }

    function showEndorseABVNModal() {
        endorseABVNModal.style.display = 'flex';
        fetchABVNs();
    }

    function hideEndorseABVNModal() {
        endorseABVNModal.style.display = 'none';
        abvnListContainer.innerHTML = '<p>Loading ABVN locations...</p>';
        endorseABVNSubmitBtn.disabled = true;
        resetCurrentVolunteer();
    }

    function showArchivedModal() {
        archivedModal.style.display = 'flex';
        fetchAndRenderArchivedVolunteerApplications();
    }

    function hideArchivedModal() {
        archivedModal.style.display = 'none';
        archivedTableBody.innerHTML = '';
        archivedEntriesInfo.textContent = '';
        archivedPaginationContainer.innerHTML = '';
    }

    // Data Fetching Function (Active Pending)
    function fetchPendingVolunteers() {
        const colCount = document.getElementById('volunteersTable').querySelectorAll('thead tr th').length;
        volunteersContainer.innerHTML = `<tr><td colspan="${colCount}" style="text-align: center;">Loading volunteer applications...</td></tr>`;

        database.ref('volunteerApplications/pendingVolunteer').on('value', (snapshot) => {
            allApplications = [];
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
            applySearchAndSort();
        }, (error) => {
            console.error("Error fetching pending volunteers: ", error);
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'Failed to load pending volunteer applications. Please try again later.',
                confirmButtonText: 'OK'
            });
            volunteersContainer.innerHTML = `<tr><td colspan="${colCount}" style="text-align: center; color: red;">Failed to load data.</td></tr>`;
        });
    }

    async function fetchABVNs() {
        abvnListContainer.innerHTML = '<p>Loading ABVN locations...</p>';
        endorseABVNSubmitBtn.disabled = true;

        try {
            const snapshot = await database.ref('abvnApplications/approvedABVN').once('value');
            let allVolunteerGroups = [];
            if (snapshot.exists()) {
                snapshot.forEach(childSnapshot => {
                    const groupData = childSnapshot.val();
                    allVolunteerGroups.push({ key: childSnapshot.key, ...groupData });
                });
            }

            if (allVolunteerGroups.length === 0) {
                abvnListContainer.innerHTML = '<p>No approved ABVN groups found.</p>';
                return;
            }

            const volunteerLocation = currentVolunteerData?.address;
            let matchedGroups = [];

            if (volunteerLocation) {
                const volunteerCity = (volunteerLocation.city || '').toLowerCase();
                const volunteerBarangay = (volunteerLocation.barangay || '').toLowerCase();
                const volunteerProvince = (volunteerLocation.province || '').toLowerCase();

                // 1. Try to find exact Barangay and City matches
                let tempMatched = allVolunteerGroups.filter(group => {
                    const groupAddress = group.headquarters || {};
                    const groupCity = (groupAddress.city || '').toLowerCase();
                    const groupBarangay = (groupAddress.barangay || '').toLowerCase();
                    return volunteerCity && groupCity && volunteerCity === groupCity &&
                           volunteerBarangay && groupBarangay && volunteerBarangay === groupBarangay;
                });
                if (tempMatched.length > 0) {
                    matchedGroups = tempMatched;
                    console.log("Matched by Barangay + City:", matchedGroups.map(g => g.organizationName));
                }

                // 2. If no Barangay+City match, try to find City-only matches
                if (matchedGroups.length === 0) {
                    tempMatched = allVolunteerGroups.filter(group => {
                        const groupAddress = group.headquarters || {};
                        const groupCity = (groupAddress.city || '').toLowerCase();
                        return volunteerCity && groupCity && volunteerCity === groupCity;
                    });
                    if (tempMatched.length > 0) {
                        matchedGroups = tempMatched;
                        console.log("Matched by City:", matchedGroups.map(g => g.organizationName));
                    }
                }

                // 3. If no City match, try to find Province matches
                if (matchedGroups.length === 0) {
                    tempMatched = allVolunteerGroups.filter(group => {
                        const groupAddress = group.headquarters || {};
                        const groupProvince = (groupAddress.province || '').toLowerCase();
                        return volunteerProvince && groupProvince && volunteerProvince === groupProvince;
                    });
                    if (tempMatched.length > 0) {
                        matchedGroups = tempMatched;
                        console.log("Matched by Province:", matchedGroups.map(g => g.organizationName));
                    }
                }

                // 4. If still no geographical match, display all groups
                if (matchedGroups.length === 0) {
                    matchedGroups = allVolunteerGroups;
                    console.warn("No specific geographical match found. Displaying all groups.");
                    abvnListContainer.innerHTML = `<p>${volunteerLocation ? 'No specific nearby ABVN groups found. Displaying all available groups.' : 'Volunteer location not available. Displaying all available groups.'}</p>`;
                } else {
                    matchedGroups.sort((a, b) => {
                        const nameA = (a.organizationName || '').toLowerCase();
                        const nameB = (b.organizationName || '').toLowerCase();
                        return nameA.localeCompare(nameB);
                    });
                }
            } else {
                matchedGroups = allVolunteerGroups.sort((a, b) => {
                    const nameA = (a.organizationName || '').toLowerCase();
                    const nameB = (b.organizationName || '').toLowerCase();
                    return nameA.localeCompare(nameB);
                });
                abvnListContainer.innerHTML = '<p>Volunteer location not available. Displaying all available groups.</p>';
            }

            abvnListContainer.innerHTML = '';

            if (matchedGroups.length === 0) {
                abvnListContainer.innerHTML = `<p>No ABVN groups found to display.</p>`;
                endorseABVNSubmitBtn.disabled = true;
                return;
            }

            matchedGroups.forEach(group => {
                const radioDiv = document.createElement('div');
                radioDiv.classList.add('abvn-option');
                const radioInput = document.createElement('input');
                radioInput.type = 'radio';
                radioInput.name = 'selectedABVN';
                radioInput.value = group.key;
                radioInput.id = `group-${group.key}`;
                radioInput.dataset.name = group.organizationName || 'Unknown Organization';
                const groupAddress = group.headquarters || {};
                radioInput.dataset.province = groupAddress.province || '';
                radioInput.dataset.city = groupAddress.city || '';
                radioInput.dataset.barangay = groupAddress.barangay || '';
                const locationParts = [groupAddress.barangay, groupAddress.city, groupAddress.province].filter(Boolean);
                const displayLocation = locationParts.join(', ');
                radioInput.dataset.location = displayLocation;
                const label = document.createElement('label');
                label.htmlFor = `group-${group.key}`;
                label.innerHTML = `<strong>${group.organizationName || 'N/A'}</strong> <br> (${radioInput.dataset.location || 'N/A'})`;
                radioDiv.appendChild(radioInput);
                radioDiv.appendChild(label);
                abvnListContainer.appendChild(radioDiv);
            });

            endorseABVNSubmitBtn.disabled = false;
        } catch (error) {
            console.error("Error fetching ABVN groups: ", error);
            abvnListContainer.innerHTML = '<p style="color: red;">Failed to load ABVN group locations.</p>';
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'Failed to load ABVN group locations for endorsement. Please try again.',
                confirmButtonText: 'OK'
            });
        }
    }

    // Archived Volunteer Applications Functions
    function fetchAndRenderArchivedVolunteerApplications() {
        const colCount = archivedTableBody.parentElement.querySelectorAll('thead tr th').length;
        archivedTableBody.innerHTML = `<tr><td colspan="${colCount}" style="text-align: center;">Loading archived volunteer applications...</td></tr>`;

        database.ref('volunteerApplications/rejectedVolunteer').once('value', (snapshot) => {
            allArchivedVolunteerData = [];
            if (snapshot.exists()) {
                snapshot.forEach((childSnapshot) => {
                    const volunteerData = childSnapshot.val();
                    const volunteerKey = childSnapshot.key;
                    allArchivedVolunteerData.push({ key: volunteerKey, ...volunteerData });
                });
                console.log("Fetched archived volunteers:", allArchivedVolunteerData);
            } else {
                console.log("No archived volunteer applications found.");
            }
            renderArchivedVolunteerApplications();
        }, (error) => {
            console.error("Error fetching archived volunteers: ", error);
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'Failed to load archived volunteer applications. Please try again later.',
                confirmButtonText: 'OK'
            });
            archivedTableBody.innerHTML = `<tr><td colspan="${colCount}" style="text-align: center; color: red;">Failed to load data.</td></tr>`;
        });
    }

    function renderArchivedVolunteerApplications() {
        const colCount = archivedTableBody.parentElement.querySelectorAll('thead tr th').length;
        archivedTableBody.innerHTML = '';

        const startIndex = (currentArchivedVolunteerPage - 1) * archivedVolunteerRowsPerPage;
        const endIndex = startIndex + archivedVolunteerRowsPerPage;
        const paginatedApplications = allArchivedVolunteerData.slice(startIndex, endIndex);

        if (paginatedApplications.length === 0) {
            archivedTableBody.innerHTML = `<tr><td colspan="${colCount}" style="text-align: center;">No archived volunteer applications found.</td></tr>`;
            archivedEntriesInfo.textContent = 'Showing 0 to 0 of 0 entries';
            renderArchivedPagination();
            return;
        }

        let i = startIndex + 1;

        paginatedApplications.forEach(volunteer => {
            const row = archivedTableBody.insertRow();
            row.setAttribute('data-key', volunteer.key);
            const fullName = getFullName(volunteer);
            row.innerHTML = `
                <td>${i++}</td>
                <td>${fullName}</td>
                <td>${volunteer.email || 'N/A'}</td>
                <td>${volunteer.status || 'Rejected'}</td>
                <td>${formatDate(volunteer.rejectedAt)}</td>
                <td>
                    <button class="actionBtn" data-key="${volunteer.key}">Retrieve</button>
                </td>
            `;
        });

        updateArchivedEntriesInfo();
        renderArchivedPagination();
    }

    function updateArchivedEntriesInfo() {
        const startIndex = (currentArchivedVolunteerPage - 1) * archivedVolunteerRowsPerPage;
        const endIndex = Math.min(startIndex + archivedVolunteerRowsPerPage, allArchivedVolunteerData.length);
        archivedEntriesInfo.textContent = `Showing ${allArchivedVolunteerData.length ? startIndex + 1 : 0} to ${endIndex} of ${allArchivedVolunteerData.length} entries`;
    }

    function renderArchivedPagination() {
        archivedPaginationContainer.innerHTML = '';
        const totalPages = Math.ceil(allArchivedVolunteerData.length / archivedVolunteerRowsPerPage);

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
                currentArchivedVolunteerPage = page;
                renderArchivedVolunteerApplications();
            });
            return btn;
        };

        archivedPaginationContainer.appendChild(createButton('Prev', currentArchivedVolunteerPage - 1, currentArchivedVolunteerPage === 1));

        const maxVisible = 5;
        let startPage = Math.max(1, currentArchivedVolunteerPage - Math.floor(maxVisible / 2));
        let endPage = Math.min(totalPages, startPage + maxVisible - 1);
        if (endPage - startPage < maxVisible - 1) {
            startPage = Math.max(1, endPage - maxVisible + 1);
        }

        if (startPage > 1) {
            archivedPaginationContainer.appendChild(createButton('1', 1));
            if (startPage > 2) {
                const dots = document.createElement('span');
                dots.textContent = '...';
                archivedPaginationContainer.appendChild(dots);
            }
        }

        for (let i = startPage; i <= endPage; i++) {
            archivedPaginationContainer.appendChild(createButton(i, i, false, i === currentArchivedVolunteerPage));
        }

        if (endPage < totalPages) {
            if (endPage < totalPages - 1) {
                const dots = document.createElement('span');
                dots.textContent = '...';
                archivedPaginationContainer.appendChild(dots);
            }
            archivedPaginationContainer.appendChild(createButton(totalPages, totalPages));
        }

        archivedPaginationContainer.appendChild(createButton('Next', currentArchivedVolunteerPage + 1, currentArchivedVolunteerPage === totalPages));
    }

    // Rendering Function (Active Pending)
    function renderApplications(applicationsToRender) {
        const colCount = document.getElementById('volunteersTable').querySelectorAll('thead tr th').length;
        volunteersContainer.innerHTML = '';

        const startIndex = (currentPage - 1) * rowsPerPage;
        const endIndex = startIndex + rowsPerPage;
        const paginatedApplications = applicationsToRender.slice(startIndex, endIndex);

        if (paginatedApplications.length === 0) {
            volunteersContainer.innerHTML = `<tr><td colspan="${colCount}" style="text-align: center;">No pending volunteer applications found on this page.</td></tr>`;
            updateEntriesInfo(0);
            renderPagination(0);
            return;
        }

        let i = startIndex + 1;

        paginatedApplications.forEach(volunteer => {
            const row = volunteersContainer.insertRow();
            row.setAttribute('data-key', volunteer.key);

            const fullName = getFullName(volunteer);
            const socialMediaDisplay = volunteer.socialMediaLink ? `<a href="${volunteer.socialMediaLink}" target="_blank" rel="noopener noreferrer">Link</a>` : 'N/A';

            let displayStatusNotes = '-';
            if (typeof volunteer.statusNotes === 'string' && volunteer.statusNotes.trim() !== '') {
                displayStatusNotes = volunteer.statusNotes;
            } else if (Array.isArray(volunteer.statusNotes) && volunteer.statusNotes.length > 0) {
                displayStatusNotes = volunteer.statusNotes[volunteer.statusNotes.length - 1].note;
            }

            row.innerHTML = `
                <td>${i++}</td>
                <td>${fullName}</td>
                <td>${volunteer.email || 'N/A'}</td>
                <td>${volunteer.mobileNumber || 'N/A'}</td>
                <td>${volunteer.age || 'N/A'}</td>
                <td>${socialMediaDisplay}</td>
                <td>${volunteer.additionalInfo || 'N/A'}</td>
                <td>${
                    volunteer.availability && volunteer.availability.general === 'Specific days'
                    ? `Specific Days: ${volunteer.availability.specificDays ? volunteer.availability.specificDays.join(', ') : 'N/A'}`
                    : (volunteer.availability?.general || 'N/A')
                }</td>
                <td>${volunteer.availability?.timeAvailability || 'N/A'}</td>
                <td>${volunteer.address?.region || 'N/A'}</td>
                <td>${volunteer.address?.province || 'N/A'}</td>
                <td>${volunteer.address?.city || 'N/A'}</td>
                <td>${volunteer.address?.barangay || 'N/A'}</td>
                <td>${displayStatusNotes}</td>
                <td>
                    <button class="actionBtn" data-key="${volunteer.key}">Actions <i class='bx bxs-chevron-down'></i></button>
                    <button class="viewBtn" data-key="${volunteer.key}">View</button>
                </td>
            `;
        });

        updateEntriesInfo(applicationsToRender.length);
        renderPagination(applicationsToRender.length);
    }

    // Search and Sort Logic
    function applySearchAndSort() {
        let currentApplications = [...allApplications];

        const searchTerm = searchInput.value.toLowerCase().trim();
        if (searchTerm) {
            currentApplications = currentApplications.filter(volunteer => {
                const fullName = getFullName(volunteer).toLowerCase();
                const email = (volunteer.email || '').toLowerCase();
                const mobileNumber = (volunteer.mobileNumber || '').toLowerCase();
                const region = (volunteer.address?.region || '').toLowerCase();
                const province = (volunteer.address?.province || '').toLowerCase();
                const city = (volunteer.address?.city || '').toLowerCase();
                const barangay = (volunteer.address?.barangay || '').toLowerCase();
                const additionalInfo = (volunteer.additionalInfo || '').toLowerCase();
                const statusNotes = (volunteer.statusNotes || '').toLowerCase();

                return fullName.includes(searchTerm) ||
                       email.includes(searchTerm) ||
                       mobileNumber.includes(searchTerm) ||
                       region.includes(searchTerm) ||
                       province.includes(searchTerm) ||
                       city.includes(searchTerm) ||
                       barangay.includes(searchTerm) ||
                       additionalInfo.includes(searchTerm) ||
                       statusNotes.includes(searchTerm);
            });
        }

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
                        valA = `${a.address?.region || ''} ${a.address?.province || ''} ${a.address?.city || ''} ${a.address?.barangay || ''}`.toLowerCase();
                        valB = `${b.address?.region || ''} ${b.address?.province || ''} ${b.address?.city || ''} ${b.address?.barangay || ''}`.toLowerCase();
                        break;
                    case 'Name':
                        valA = getFullName(a).toLowerCase();
                        valB = getFullName(b).toLowerCase();
                        break;
                    case 'Age':
                        valA = parseInt(a.age) || 0;
                        valB = parseInt(b.age) || 0;
                        break;
                    default:
                        valA = getFullName(a).toLowerCase();
                        valB = getFullName(b).toLowerCase();
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

    // Pagination Functions
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

        if (endPage < totalPages) {
            if (endPage < totalPages - 1) {
                const dots = document.createElement('span');
                dots.textContent = '...';
                pagination.appendChild(dots);
            }
            pagination.appendChild(createButton(totalPages, totalPages));
        }

        pagination.appendChild(createButton('Next', currentPage + 1, currentPage === totalPages));
    }

    function updateEntriesInfo(totalItems) {
        const startIndex = (currentPage - 1) * rowsPerPage;
        const endIndex = Math.min(startIndex + rowsPerPage, totalItems);
        entriesInfo.textContent = `Showing ${totalItems ? startIndex + 1 : 0} to ${endIndex} of ${totalItems} entries`;
    }

    // Email for Confirmed to AB
    async function sendApprovalEmail(volunteer, scheduledDate) {
        if (!volunteer || !volunteer.email) {
            console.error("Cannot send email: Volunteer or email missing.");
            Swal.fire('Error', 'Missing volunteer email. Cannot send confirmation.', 'error');
            return;
        }

        const fullName = getFullName(volunteer);

        const templateParams = {
            to_name: fullName,
            to_email: volunteer.email,
            scheduled_date: scheduledDate,
        };

        try {
            const response = await emailjs.send('service_gupgjog', 'template_udpyecq', templateParams);
            console.log('Email successfully sent!', response.status, response.text);
            Swal.fire('Email Sent!', 'Confirmation email has been sent to the volunteer.', 'success');
        } catch (error) {
            console.error('Failed to send email:', error);
            Swal.fire('Email Error', 'Failed to send confirmation email. Please try again.', 'error');
        }
    }

    // Email for Endorsed to ABVN
    async function sendEndorsementEmail(volunteer, abvnGroup) {
        if (!volunteer || !volunteer.email || !abvnGroup || !abvnGroup.email) {
            console.error("Cannot send endorsement email: Missing volunteer or ABVN group email.");
            Swal.fire('Error', 'Missing volunteer or ABVN group email. Cannot send endorsement.', 'error');
            return;
        }

        const volunteerFullName = getFullName(volunteer);
        const abvnOrganization = abvnGroup.organizationName || 'Unknown ABVN Group';
        const abvnContactPerson = abvnGroup.contactPerson || 'ABVN Admin';
        const abvnContactEmail = abvnGroup.email;
        const abvnContactNumber = abvnGroup.mobileNumber || 'N/A';

        const templateParams = {
            volunteer_name: volunteerFullName,
            volunteer_email: volunteer.email,
            abvn_name: abvnOrganization,
            abvn_contact_person: abvnContactPerson,
            abvn_contact_email: abvnContactEmail,
            abvn_contact_number: abvnContactNumber,
            volunteer_mobile: volunteer.mobileNumber || 'N/A',
            volunteer_address: `${volunteer.address?.barangay || ''}, ${volunteer.address?.city || ''}, ${volunteer.address?.province || ''}, ${volunteer.address?.region || ''}`.trim().replace(/^,?\s*|,?\s*$/g, '').replace(/,,\s*/g, ', '),
            volunteer_additional_info: volunteer.additionalInfo || 'N/A',
        };

        try {
            const response = await emailjs.send('service_gupgjog', 'template_5ndnhco', templateParams);
            console.log('Endorsement email successfully sent!', response.status, response.text);
            Swal.fire('Endorsement Sent!', 'Endorsement email has been sent to the ABVN group.', 'success');
        } catch (error) {
            console.error('Failed to send endorsement email:', error);
            Swal.fire('Email Error', 'Failed to send endorsement email. Please try again.', 'error');
        }
    }

    // Action Handlers (Active Pending)
    volunteersContainer.addEventListener('click', async (event) => {
        const target = event.target;
        const rowWithKey = target.closest('tr[data-key]');

        const clickedActionButton = target.closest('.actionBtn');

        if (!rowWithKey) {
            if (currentDropdown && !currentDropdown.contains(target)) {
                currentDropdown.remove();
                currentDropdown = null;
                const previouslyActiveButton = document.querySelector('.actionBtn.active');
                if (previouslyActiveButton) {
                    previouslyActiveButton.classList.remove('active');
                }
            }
            return;
        }

        const volunteerKey = rowWithKey.dataset.key;
        const volunteer = allApplications.find(v => v.key === volunteerKey);

        if (!volunteer) {
            console.warn("Volunteer data not found for key:", volunteerKey);
            Swal.fire('Error', 'Volunteer data not found.', 'error');
            resetCurrentVolunteer();
            return;
        }

        if (clickedActionButton) {
            const actionButton = clickedActionButton;

            if (currentDropdown) {
                if (currentDropdown.previousElementSibling === actionButton) {
                    currentDropdown.remove();
                    currentDropdown = null;
                    actionButton.classList.remove('active');
                    return;
                } else {
                    currentDropdown.remove();
                    currentDropdown = null;
                    const previouslyActiveButton = document.querySelector('.actionBtn.active');
                    if (previouslyActiveButton) {
                        previouslyActiveButton.classList.remove('active');
                    }
                }
            }

            actionButton.classList.add('active');

            currentVolunteerKey = volunteerKey;
            currentVolunteerData = volunteer;

            const rect = actionButton.getBoundingClientRect();

            const dropdown = document.createElement('div');
            dropdown.classList.add('action-dropdown-menu');
            dropdown.style.top = `${rect.bottom + window.scrollY}px`;
            dropdown.style.left = `${rect.left + window.scrollX}px`;
            dropdown.innerHTML = `
                <button id="dropdownConfirmByAB"><i class='bx bxs-check-circle'></i>Confirm by AB</button>
                <button id="dropdownDirectedToABVN"><i class='bx bxs-group'></i>Directed to ABVN</button>
                <button id="dropdownSetStalled"><i class='bx bxs-hand'></i>Status Notes</button>
                <button id="dropdownCancelled"><i class='bx bxs-ghost'></i>Cancelled</button>
            `;
            document.body.appendChild(dropdown);
            currentDropdown = dropdown;

            dropdown.querySelector('#dropdownConfirmByAB').addEventListener('click', () => {
                showScheduleModal();
            });

            dropdown.querySelector('#dropdownDirectedToABVN').addEventListener('click', () => {
                if (!currentVolunteerKey || !currentVolunteerData) {
                    Swal.fire('Error', 'No volunteer selected for endorsement.', 'error');
                    resetCurrentVolunteer();
                    return;
                }
                handleEndorsementProcess();
            });

            dropdown.querySelector('#dropdownSetStalled').addEventListener('click', async () => {
                const { value: notes } = await Swal.fire({
                    title: 'Set Volunteer to Stalled',
                    input: 'textarea',
                    inputLabel: 'Reason for stalling (e.g., Cannot be reached, Awaiting documents, etc.)',
                    inputPlaceholder: 'Enter notes here...',
                    inputAttributes: {
                        'aria-label': 'Enter notes here'
                    },
                    showCancelButton: true,
                    confirmButtonText: 'Confirm',
                    cancelButtonText: 'Cancel',
                    customClass: {
                        popup: 'my-custom-swal-popup',
                        confirmButton: 'my-confirm-button-class',
                        cancelButton: 'my-cancel-button-class'
                    },
                    inputValidator: (value) => {
                        if (!value) {
                            return 'Notes are required!';
                        }
                    }
                });

                if (notes) {
                    const updates = {};
                    updates[`volunteerApplications/pendingVolunteer/${currentVolunteerKey}/status`] = 'Stalled';
                    updates[`volunteerApplications/pendingVolunteer/${currentVolunteerKey}/statusNotes`] = notes;
                    updates[`volunteerApplications/pendingVolunteer/${currentVolunteerKey}/lastStatusUpdate`] = firebase.database.ServerValue.TIMESTAMP;

                    try {
                        await database.ref().update(updates);
                        Swal.fire('Success!', 'Volunteer status updated to Stalled with notes.', 'success');
                        fetchPendingVolunteers();
                    } catch (error) {
                        console.error("Error setting volunteer to stalled:", error);
                        Swal.fire('Error', 'Failed to update volunteer status. Please try again.', 'error');
                    }
                } else {
                    Swal.fire('Cancelled', 'No notes entered. Status remains unchanged.', 'info');
                }
                resetCurrentVolunteer();
            });

            dropdown.querySelector('#dropdownCancelled').addEventListener('click', async () => {
                Swal.fire({
                    title: 'Are you sure?',
                    text: "Do you want to reject this volunteer application? This will move it to archived records.",
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
                            const volunteerRef = database.ref(`volunteerApplications/pendingVolunteer/${currentVolunteerKey}`);
                            const snapshot = await volunteerRef.once('value');
                            const volunteerData = snapshot.val();

                            if (volunteerData) {
                                volunteerData.rejectedAt = new Date().toISOString();
                                volunteerData.status = 'Rejected';
                                await database.ref(`volunteerApplications/rejectedVolunteer/${currentVolunteerKey}`).set(volunteerData);
                                await volunteerRef.remove();
                                Swal.fire('Rejected!', 'The volunteer application has been rejected and archived.', 'success');
                                fetchPendingVolunteers();
                            } else {
                                Swal.fire('Error', 'Volunteer application not found.', 'error');
                            }
                        } catch (error) {
                            console.error("Error rejecting volunteer application: ", error);
                            Swal.fire('Error', 'Failed to reject volunteer application. Please try again.', 'error');
                        }
                    }
                    resetCurrentVolunteer();
                });
            });
        } else if (target.classList.contains('viewBtn') || target.closest('.viewBtn')) {
            if (currentDropdown) {
                currentDropdown.remove();
                currentDropdown = null;
                const previouslyActiveButton = document.querySelector('.actionBtn.active');
                if (previouslyActiveButton) {
                    previouslyActiveButton.classList.remove('active');
                }
            }
            showPreviewModal(volunteer);
            resetCurrentVolunteer();
        }
    });

    // Archived Action Handlers
    // Archived Action Handlers
    archivedTableBody.addEventListener('click', async (event) => {
        const target = event.target;
        const rowWithKey = target.closest('tr[data-key]');

        if (!rowWithKey) return;

        const volunteerKey = rowWithKey.dataset.key;
        const volunteer = allArchivedVolunteerData.find(v => v.key === volunteerKey);

        if (!volunteer) {
            console.warn("Archived volunteer data not found for key:", volunteerKey);
            Swal.fire('Error', 'Archived volunteer data not found.', 'error');
            return;
        }

        if (target.classList.contains('viewBtn') || target.closest('.viewBtn')) {
            showPreviewModal(volunteer);
        } else if (target.classList.contains('actionBtn') || target.closest('.actionBtn')) {
            currentVolunteerKey = volunteerKey;
            currentVolunteerData = volunteer;

            Swal.fire({
                title: 'Retrieve Volunteer Application?',
                text: `Do you want to retrieve the application for ${getFullName(volunteer)}? This will move it back to pending applications.`,
                icon: 'question',
                showCancelButton: true,
                confirmButtonColor: '#3085d6',
                cancelButtonColor: '#d33',
                confirmButtonText: 'Yes, Retrieve!',
                customClass: {
                    confirmButton: 'my-confirm-button-class',
                    cancelButton: 'my-cancel-button-class'
                }
            }).then(async (result) => {
                if (result.isConfirmed) {
                    try {
                        const archivedRef = database.ref(`volunteerApplications/rejectedVolunteer/${currentVolunteerKey}`);
                        const snapshot = await archivedRef.once('value');
                        const volunteerData = snapshot.val();

                        if (volunteerData) {
                            delete volunteerData.rejectedAt;
                            volunteerData.status = 'Pending';
                            await database.ref(`volunteerApplications/pendingVolunteer/${currentVolunteerKey}`).set(volunteerData);
                            await archivedRef.remove();
                            Swal.fire('Retrieved!', 'The volunteer application has been moved back to pending.', 'success');
                            fetchAndRenderArchivedVolunteerApplications();
                        } else {
                            Swal.fire('Error', 'Volunteer application not found.', 'error');
                        }
                    } catch (error) {
                        console.error("Error retrieving volunteer application: ", error);
                        Swal.fire('Error', 'Failed to retrieve volunteer application. Please try again.', 'error');
                    }
                }
                resetCurrentVolunteer();
            });
        }
    });

    // Schedule Modal Form Submission
    scheduleForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        const scheduledDateTime = scheduleDateTimeInput.value;

        if (!currentVolunteerKey || !currentVolunteerData) {
            Swal.fire('Error', 'No volunteer selected for scheduling.', 'error');
            hideScheduleModal();
            return;
        }

        if (!scheduledDateTime) {
            Swal.fire('Error', 'Please fill in all scheduling details.', 'error');
            return;
        }

        const selectedDate = new Date(scheduledDateTime);
        const now = new Date();
        now.setSeconds(0);
        now.setMilliseconds(0);
        selectedDate.setSeconds(0);
        selectedDate.setMilliseconds(0);

        if (selectedDate <= now) {
            Swal.fire({
                title: 'Invalid Date',
                text: 'You cannot schedule a volunteer for a date and time that has already passed. Please select a future date and time.',
                icon: 'error',
                confirmButtonText: 'Understood'
            });
            return;
        }

        const volunteerEmail = currentVolunteerData.email;
        const volunteerMobile = currentVolunteerData.mobileNumber;
        const volunteerFullName = getFullName(currentVolunteerData).toLowerCase();

        if (!volunteerEmail && !volunteerMobile) {
            Swal.fire('Error', 'Volunteer data is missing email and mobile number. Cannot perform duplicate check.', 'error');
            hideScheduleModal();
            return;
        }

        try {
            const approvedVolunteersRef = database.ref('volunteerApplications/approvedVolunteer');
            let duplicateMessages = [];

            if (volunteerEmail) {
                const emailSnapshot = await approvedVolunteersRef.orderByChild('email').equalTo(volunteerEmail).once('value');
                if (emailSnapshot.exists()) {
                    let foundDuplicate = false;
                    emailSnapshot.forEach(childSnapshot => {
                        if (childSnapshot.key !== currentVolunteerKey) {
                            foundDuplicate = true;
                            return true;
                        }
                    });
                    if (foundDuplicate) {
                        duplicateMessages.push('• Email Address');
                    }
                }
            }

            if (volunteerMobile) {
                const mobileSnapshot = await approvedVolunteersRef.orderByChild('mobileNumber').equalTo(volunteerMobile).once('value');
                if (mobileSnapshot.exists()) {
                    let foundDuplicate = false;
                    mobileSnapshot.forEach(childSnapshot => {
                        if (childSnapshot.key !== currentVolunteerKey) {
                            foundDuplicate = true;
                            return true;
                        }
                    });
                    if (foundDuplicate) {
                        duplicateMessages.push('• Mobile Number');
                    }
                }
            }

            if (volunteerFullName) {
                const nameSnapshot = await approvedVolunteersRef.once('value');
                let nameExists = false;
                if (nameSnapshot.exists()) {
                    nameSnapshot.forEach(childSnapshot => {
                        const approvedVolunteer = childSnapshot.val();
                        if (childSnapshot.key !== currentVolunteerKey) {
                            const approvedFullName = getFullName(approvedVolunteer).toLowerCase();
                            if (approvedFullName === volunteerFullName) {
                                nameExists = true;
                                return true;
                            }
                        }
                    });
                }
                if (nameExists) {
                    duplicateMessages.push('• Full Name');
                }
            }

            if (duplicateMessages.length > 0) {
                Swal.fire({
                    title: 'Possible Duplicate Volunteer Detected!',
                    html: `This volunteer might already exist in the approved list based on the following:<br><br>${duplicateMessages.join('<br>')}<br><br>Please verify if this is a new application or a duplicate entry.`,
                    icon: 'warning',
                    showCancelButton: true,
                    confirmButtonText: 'Proceed Anyway (Manual Override)',
                    cancelButtonText: 'Cancel & Review',
                    reverseButtons: true
                }).then((duplicateResult) => {
                    if (duplicateResult.isConfirmed) {
                        Swal.fire('Proceeding', 'Proceeding with scheduling despite potential duplicate warning.', 'info');
                        handleScheduleConfirmation(scheduledDateTime, currentVolunteerKey, currentVolunteerData);
                    } else {
                        Swal.fire('Cancelled', 'Scheduling cancelled for review.', 'info');
                        hideScheduleModal();
                    }
                });
                return;
            }

            handleScheduleConfirmation(scheduledDateTime, currentVolunteerKey, currentVolunteerData);
        } catch (error) {
            console.error("Error during duplicate check for approved volunteer:", error);
            Swal.fire('Error', 'Failed to perform duplicate check. Please try again.', 'error');
            hideScheduleModal();
        }
    });

    async function handleScheduleConfirmation(scheduledDateTime, volunteerKey, volunteerData) {
        Swal.fire({
            title: 'Confirm Schedule?',
            text: `Schedule volunteer for ${formatDate(new Date(scheduledDateTime).toISOString())}? An email will be sent.`,
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: '#3085d6',
            cancelButtonColor: '#d33',
            confirmButtonText: 'Yes, Confirm!'
        }).then(async (result) => {
            if (result.isConfirmed) {
                try {
                    await database.ref(`volunteerApplications/approvedVolunteer/${volunteerKey}`).set({
                        ...volunteerData,
                        status: 'confirmedByAB',
                        scheduledDateTime: new Date(scheduledDateTime).toISOString()
                    });
                    await database.ref(`volunteerApplications/pendingVolunteer/${volunteerKey}`).remove();
                    await sendApprovalEmail(volunteerData, formatDate(new Date(scheduledDateTime).toISOString()));
                    Swal.fire('Scheduled & Approved!', 'Volunteer has been scheduled, approved, and confirmation email sent.', 'success');
                    hideScheduleModal();
                } catch (error) {
                    console.error("Error confirming schedule and approving volunteer: ", error);
                    Swal.fire('Error', 'Failed to schedule and approve volunteer. Please try again.', 'error');
                    hideScheduleModal();
                }
            } else {
                hideScheduleModal();
            }
        });
    }

    // Endorse ABVN Modal Form Submission
    endorseABVNForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        const selectedABVN = document.querySelector('input[name="selectedABVN"]:checked');

        if (!selectedABVN) {
            Swal.fire('Error', 'Please select an ABVN to endorse to.', 'error');
            return;
        }

        if (!currentVolunteerKey || !currentVolunteerData) {
            Swal.fire('Error', 'No volunteer selected for endorsement.', 'error');
            hideEndorseABVNModal();
            return;
        }

        const abvnKey = selectedABVN.value;
        const abvnName = selectedABVN.dataset.name;
        const abvnLocation = selectedABVN.dataset.location;

        Swal.fire({
            title: 'Confirm Endorsement?',
            html: `Endorse <strong>${getFullName(currentVolunteerData)}</strong> to <strong>${abvnName}</strong> in ${abvnLocation}? An endorsement email will be sent to the ABVN group.`,
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: '#3085d6',
            cancelButtonColor: '#d33',
            confirmButtonText: 'Yes, Endorse!',
            customClass: {
                confirmButton: 'swal2-confirm-large',
                cancelButton: 'swal2-cancel-large'
            },
        }).then(async (result) => {
            if (result.isConfirmed) {
                try {
                    const abvnSnapshot = await database.ref(`abvnApplications/approvedABVN/${abvnKey}`).once('value');
                    const abvnGroupData = abvnSnapshot.val();

                    if (!abvnGroupData) {
                        Swal.fire('Error', 'Selected ABVN group details not found.', 'error');
                        return;
                    }

                    await database.ref(`abvnApplications/approvedABVN/${abvnKey}/endorsedVolunteers/${currentVolunteerKey}`).set({
                        ...currentVolunteerData,
                        status: 'directedToABVN',
                        endorsedToABVNKey: abvnKey,
                        endorsedToABVNName: abvnName,
                        endorsedToABVNLocation: abvnLocation,
                        endorsementDate: new Date().toISOString()
                    });
                    await database.ref(`volunteerApplications/pendingVolunteer/${currentVolunteerKey}`).remove();
                    await sendEndorsementEmail(currentVolunteerData, abvnGroupData);
                    Swal.fire('Endorsed!', 'Volunteer has been endorsed to the selected ABVN group, and an endorsement email sent.', 'success');
                    hideEndorseABVNModal();
                } catch (error) {
                    console.error("Error endorsing volunteer to ABVN: ", error);
                    Swal.fire('Error', 'Failed to endorse volunteer. Please try again.', 'error');
                    hideEndorseABVNModal();
                }
            } else {
                hideEndorseABVNModal();
            }
        });
    });

    async function handleEndorsementProcess() {
        const volunteerEmail = currentVolunteerData.email;
        const volunteerMobile = currentVolunteerData.mobileNumber;
        const volunteerFullName = getFullName(currentVolunteerData).toLowerCase();

        if (!volunteerEmail && !volunteerMobile && !volunteerFullName) {
            Swal.fire('Error', 'Volunteer data is missing crucial information (email, mobile, full name). Cannot perform duplicate check for endorsement.', 'error');
            resetCurrentVolunteer();
            return;
        }

        try {
            const abvnGroupsRef = database.ref('abvnApplications/approvedABVN');
            let duplicateMessages = [];
            let isAlreadyEndorsedToAnABVN = false;

            const allAbvnSnapshot = await abvnGroupsRef.once('value');

            let allEndorsedVolunteersData = [];
            if (allAbvnSnapshot.exists()) {
                allAbvnSnapshot.forEach(abvnGroupChild => {
                    const groupData = abvnGroupChild.val();
                    const groupName = groupData.organizationName || abvnGroupChild.key;
                    const endorsedVolunteers = abvnGroupChild.child('endorsedVolunteers').val();

                    if (endorsedVolunteers) {
                        for (const volKey in endorsedVolunteers) {
                            if (volKey !== currentVolunteerKey) {
                                allEndorsedVolunteersData.push({
                                    key: volKey,
                                    endorsedGroupName: groupName,
                                    ...endorsedVolunteers[volKey]
                                });
                            } else {
                                isAlreadyEndorsedToAnABVN = true;
                                duplicateMessages.push(`• This exact volunteer application (key: ${currentVolunteerKey}) is already endorsed to: <strong>${groupName}</strong>`);
                            }
                        }
                    }
                });
            }

            if (isAlreadyEndorsedToAnABVN) {
                Swal.fire({
                    title: 'Volunteer Already Endorsed!',
                    html: `This volunteer application appears to be already endorsed.<br><br>${duplicateMessages.join('<br>')}<br><br>Are you sure you want to proceed? This will re-endorse them.`,
                    icon: 'warning',
                    showCancelButton: true,
                    confirmButtonText: 'Proceed Anyway (Manual Override)',
                    cancelButtonText: 'Cancel & Review',
                    reverseButtons: true
                }).then((duplicateResult) => {
                    if (duplicateResult.isConfirmed) {
                        Swal.fire('Proceeding', 'Proceeding with endorsement despite previous record.', 'info');
                        showEndorseABVNModal();
                    } else {
                        Swal.fire('Cancelled', 'Endorsement cancelled for review.', 'info');
                        hideEndorseABVNModal();
                    }
                });
                return;
            }

            if (volunteerEmail) {
                const emailDuplicate = allEndorsedVolunteersData.find(ev => 
                    (ev.email || '').toLowerCase() === volunteerEmail.toLowerCase()
                );
                if (emailDuplicate) {
                    isAlreadyEndorsedToAnABVN = true;
                    duplicateMessages.push(`• Email Address (found in ABVN Group: ${emailDuplicate.endorsedGroupName})`);
                }
            }

            if (volunteerMobile) {
                const mobileDuplicate = allEndorsedVolunteersData.find(ev => 
                    (ev.mobileNumber || '') === volunteerMobile
                );
                if (mobileDuplicate) {
                    isAlreadyEndorsedToAnABVN = true;
                    duplicateMessages.push(`• Mobile Number (found in ABVN Group: ${mobileDuplicate.endorsedGroupName})`);
                }
            }

            if (volunteerFullName) {
                const nameDuplicate = allEndorsedVolunteersData.find(ev => 
                    getFullName(ev).toLowerCase() === volunteerFullName
                );
                if (nameDuplicate) {
                    isAlreadyEndorsedToAnABVN = true;
                    duplicateMessages.push(`• Full Name (found in ABVN Group: ${nameDuplicate.endorsedGroupName})`);
                }
            }

            if (isAlreadyEndorsedToAnABVN) {
                Swal.fire({
                    title: 'Possible Duplicate Volunteer Detected in Endorsed ABVN Groups!',
                    html: `This volunteer might already exist in an endorsed ABVN group based on the following:<br><br>${duplicateMessages.join('<br>')}<br><br>Please verify if this is a new endorsement or a duplicate entry.`,
                    icon: 'warning',
                    showCancelButton: true,
                    confirmButtonText: 'Proceed Anyway (Manual Override)',
                    cancelButtonText: 'Cancel & Review',
                    reverseButtons: true
                }).then((duplicateResult) => {
                    if (duplicateResult.isConfirmed) {
                        Swal.fire('Proceeding', 'Proceeding with endorsement despite potential duplicate warning.', 'info');
                        showEndorseABVNModal();
                    } else {
                        Swal.fire('Cancelled', 'Endorsement cancelled for review.', 'info');
                        hideEndorseABVNModal();
                    }
                });
                return;
            }

            showEndorseABVNModal();
        } catch (error) {
            console.error("Error during duplicate check for endorsed volunteer:", error);
            Swal.fire('Error', 'Failed to perform endorsement duplicate check. Please try again.', 'error');
            hideEndorseABVNModal();
        }
    }

    // Event Listeners
    viewApprovedBtn.addEventListener('click', () => {
        window.location.href = '../pages/approvedvolunteers.html';
    });

    viewArchivedButton.addEventListener('click', () => {
        showArchivedModal();
    });

    searchInput.addEventListener('input', applySearchAndSort);
    sortSelect.addEventListener('change', applySearchAndSort);

    document.addEventListener('click', (event) => {
        if (currentDropdown && !currentDropdown.contains(event.target) && !event.target.closest('.actionBtn')) {
            currentDropdown.remove();
            currentDropdown = null;
            const previouslyActiveButton = document.querySelector('.actionBtn.active');
            if (previouslyActiveButton) {
                previouslyActiveButton.classList.remove('active');
            }
        }
    });

    fetchPendingVolunteers();
}
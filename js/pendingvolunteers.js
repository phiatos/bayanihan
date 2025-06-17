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

// Initialize EmailJS with updated public key
try {
    emailjs.init('BwfsCx-NJCb3qGxCk');
    console.log("EmailJS initialized successfully");
} catch (error) {
    console.error("EmailJS initialization failed:", error);
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
document.addEventListener('DOMContentLoaded', () => {
    const volunteersContainer = document.getElementById('volunteersContainer');
    const searchInput = document.getElementById('searchInput');
    const sortSelect = document.getElementById('sortSelect');
    const entriesInfo = document.getElementById('entriesInfo');
    const pagination = document.getElementById('pagination');
    const viewApprovedBtn = document.getElementById('viewApprovedBtn');

    // Modals (existing)
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

    let allApplications = [];
    let filteredApplications = [];
    let currentPage = 1;
    const rowsPerPage = 5;
    let currentVolunteerKey = null;
    let currentVolunteerData = null;
    let currentDropdown = null;

    viewApprovedBtn.addEventListener('click', () => {
        window.location.href = '../pages/approvedvolunteers.html';
    });

    // --- Utility Functions ---
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

    // Apply the setupModalClose function to each modal
    setupModalClose(previewModal, closeModal);
    setupModalClose(scheduleModal, closeScheduleModal);
    setupModalClose(endorseABVNModal, closeEndorseABVNModal);

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

    // Removed hideActionStatusModal function
    function resetCurrentVolunteer() {
        currentVolunteerKey = null;
        currentVolunteerData = null;
        if (currentDropdown) {
            currentDropdown.remove();
            currentDropdown = null;
        }
        // Ensure action button active state is removed
        const previouslyActiveButton = document.querySelector('.actionBtn.active');
        if (previouslyActiveButton) {
            previouslyActiveButton.classList.remove('active');
        }
    }

    function showScheduleModal() {
        scheduleModal.style.display = 'flex';
        // No hideActionStatusModal needed here
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
        abvnListContainer.innerHTML = '<p>Loading ABVN locations...</p>'; // Reset list
        endorseABVNSubmitBtn.disabled = true; // Disable button
        resetCurrentVolunteer(); // Reset after action
    }

    // --- Data Fetching Function ---
    function fetchPendingVolunteers() {
        volunteersContainer.innerHTML = '<tr><td colspan="12" style="text-align: center;">Loading volunteer applications...</td></tr>';

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
            volunteersContainer.innerHTML = '<tr><td colspan="12" style="text-align: center; color: red;">Failed to load data.</td></tr>';
        });
    }

    async function fetchABVNs() {
        abvnListContainer.innerHTML = '<p>Loading ABVN locations...</p>';
        endorseABVNSubmitBtn.disabled = true;

        try {
            const snapshot = await database.ref('volunteerGroups').once('value');
            let allVolunteerGroups = [];
            if (snapshot.exists()) {
                snapshot.forEach(childSnapshot => {
                    const groupData = childSnapshot.val();
                    allVolunteerGroups.push({ key: childSnapshot.key, ...groupData });
                });
            }

            if (allVolunteerGroups.length === 0) {
                abvnListContainer.innerHTML = '<p>No volunteer groups found.</p>';
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
                    const groupAddress = group.address || {};
                    const groupCity = (groupAddress.city || '').toLowerCase();
                    const groupBarangay = (groupAddress.barangay || '').toLowerCase();
                    return volunteerCity && groupCity && volunteerCity === groupCity &&
                        volunteerBarangay && groupBarangay && volunteerBarangay === groupBarangay;
                });
                if (tempMatched.length > 0) {
                    matchedGroups = tempMatched;
                    console.log("Matched by Barangay + City:", matchedGroups.map(g => g.organization));
                }

                if (matchedGroups.length === 0) {
                    // 2. If no Barangay+City match, try to find City-only matches
                    tempMatched = allVolunteerGroups.filter(group => {
                        const groupAddress = group.address || {};
                        const groupCity = (groupAddress.city || '').toLowerCase();
                        return volunteerCity && groupCity && volunteerCity === groupCity;
                    });
                    if (tempMatched.length > 0) {
                        matchedGroups = tempMatched;
                        console.log("Matched by City:", matchedGroups.map(g => g.organization));
                    }
                }

                if (matchedGroups.length === 0) {
                    // 3. If no City match, try to find Province matches
                    tempMatched = allVolunteerGroups.filter(group => {
                        const groupAddress = group.address || {};
                        const groupProvince = (groupAddress.province || '').toLowerCase();
                        return volunteerProvince && groupProvince && volunteerProvince === groupProvince;
                    });
                    if (tempMatched.length > 0) {
                        matchedGroups = tempMatched;
                        console.log("Matched by Province:", matchedGroups.map(g => g.organization));
                    }
                }

                // 4. If still no geographical match (Barangay, City, or Province), display all groups as a final fallback
                if (matchedGroups.length === 0) {
                    matchedGroups = allVolunteerGroups;
                    console.warn("No specific geographical match found (Barangay, City, or Province). Displaying all groups.");
                    abvnListContainer.innerHTML = `<p>${volunteerLocation ? 'No specific nearby volunteer groups found. Displaying all available groups.' : 'Volunteer location not available. Displaying all available groups.'}</p>`;
                } else {
                    console.log("Final Matched Groups:", matchedGroups.map(g => g.organization));
                    matchedGroups.sort((a, b) => {
                        const nameA = (a.organization || '').toLowerCase();
                        const nameB = (b.organization || '').toLowerCase();
                        return nameA.localeCompare(nameB);
                    });
                }

            } else {
                // If volunteer has no location, display all groups sorted alphabetically
                matchedGroups = allVolunteerGroups.sort((a, b) => {
                    const nameA = (a.organization || '').toLowerCase();
                    const nameB = (b.organization || '').toLowerCase();
                    return nameA.localeCompare(nameB);
                });
                abvnListContainer.innerHTML = '<p>Volunteer location not available. Displaying all available groups.</p>';
            }

            abvnListContainer.innerHTML = ''; // Clear loading message

            if (matchedGroups.length === 0) {
                abvnListContainer.innerHTML = `<p>No volunteer groups found to display.</p>`;
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
                radioInput.dataset.name = group.organization || 'Unknown Organization';

                const groupAddress = group.address || {};
                // Removed region from dataset
                radioInput.dataset.province = groupAddress.province || '';
                radioInput.dataset.city = groupAddress.city || '';
                radioInput.dataset.barangay = groupAddress.barangay || '';

                // Removed region from displayLocation
                const locationParts = [groupAddress.barangay, groupAddress.city, groupAddress.province].filter(Boolean);
                const displayLocation = locationParts.join(', ');
                radioInput.dataset.location = displayLocation;

                const label = document.createElement('label');
                label.htmlFor = `group-${group.key}`;
                label.innerHTML = `<strong>${group.organization || 'N/A'}</strong> <br> (${radioInput.dataset.location || 'N/A'})`;

                radioDiv.appendChild(radioInput);
                radioDiv.appendChild(label);
                abvnListContainer.appendChild(radioDiv);
            });

            endorseABVNSubmitBtn.disabled = false;

        } catch (error) {
            console.error("Error fetching volunteer groups: ", error);
            abvnListContainer.innerHTML = '<p style="color: red;">Failed to load volunteer group locations.</p>';
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'Failed to load volunteer group locations for endorsement. Please try again.',
                confirmButtonText: 'OK'
            });
        }
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

        let i = startIndex + 1;

        paginatedApplications.forEach(volunteer => {
            const row = volunteersContainer.insertRow();
            row.setAttribute('data-key', volunteer.key);

            const fullName = getFullName(volunteer);
            const socialMediaDisplay = volunteer.socialMediaLink ? `<a href="${volunteer.socialMediaLink}" target="_blank" rel="noopener noreferrer">Link</a>` : 'N/A';

            let displayStatusNotes = '-';
            // Assuming statusNotes is intended to be a simple string for the latest note
            if (typeof volunteer.statusNotes === 'string' && volunteer.statusNotes.trim() !== '') {
                displayStatusNotes = volunteer.statusNotes;
            } else if (Array.isArray(volunteer.statusNotes) && volunteer.statusNotes.length > 0) {
                // Fallback for previous data structure, if applicable
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
                <td>
                    ${
                        volunteer.availability && volunteer.availability.general === 'Specific days'
                        ? `Specific Days: ${volunteer.availability.specificDays ? volunteer.availability.specificDays.join(', ') : 'N/A'}`
                        : (volunteer.availability?.general || 'N/A')
                    }
                </td>
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

    // --- Search and Sort Logic ---
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

    // --- Email for Confirmed to AB---
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
            // admin_contact_info: 'Admin Name - contact@example.com'
        };

        try {
            const response = await emailjs.send('service_gupgjog', 'template_udpyecq', templateParams);
            console.log('Email successfully sent!', response.status, response.text);
            Swal.fire('Email Sent!', 'Confirmation email has been sent to the volunteer.', 'success');
        } catch (error) {
            console.error('Failed to send email:', error);
            Swal.fire('Email Error', 'Failed to send confirmation email. Please check EmailJS configuration or try again.', 'error');
        }
    }

    // --- Email for Endorsed to ABVN ---
    async function sendEndorsementEmail(volunteer, abvnGroup) {
        if (!volunteer || !volunteer.email || !abvnGroup || !abvnGroup.email) {
            console.error("Cannot send endorsement email: Missing volunteer or ABVN group email.");
            Swal.fire('Error', 'Missing volunteer or ABVN group email. Cannot send endorsement.', 'error');
            return;
        }

        const volunteerFullName = getFullName(volunteer);
        const abvnOrganization = abvnGroup.organization || 'Unknown ABVN Group';
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
            Swal.fire('Email Error', 'Failed to send endorsement email. Please check EmailJS configuration or try again.', 'error');
        }
    }

    // --- Action Handlers (Approve/Reject/Status) ---
    volunteersContainer.addEventListener('click', async (event) => {
        const target = event.target;
        const rowWithKey = target.closest('tr[data-key]');

        const clickedActionButton = target.closest('.actionBtn');

        if (!rowWithKey) {
            // Clicked outside a row or action button, close any open dropdown
            if (currentDropdown) {
                if (!currentDropdown.contains(target)) { // Check if the click was truly outside the dropdown
                    currentDropdown.remove();
                    currentDropdown = null;
                    const previouslyActiveButton = document.querySelector('.actionBtn.active');
                    if (previouslyActiveButton) {
                        previouslyActiveButton.classList.remove('active');
                    }
                }
            }
            return;
        }

        const volunteerKey = rowWithKey.dataset.key;
        const volunteer = allApplications.find(v => v.key === volunteerKey);

        if (!volunteer) {
            console.warn("Volunteer data not found for key:", volunteerKey);
            Swal.fire('Error', 'Volunteer data not found.', 'error');
            resetCurrentVolunteer(); // Clear state if data is missing
            return;
        }

        // Handle Action button clicks
        if (clickedActionButton) {
            const actionButton = clickedActionButton;

            // Close existing dropdown if open, unless it's the same button
            if (currentDropdown) {
                if (currentDropdown.previousElementSibling === actionButton) {
                    // Clicked the same button, toggle off
                    currentDropdown.remove();
                    currentDropdown = null;
                    actionButton.classList.remove('active');
                    return;
                } else {
                    // Clicked a different button, close existing
                    currentDropdown.remove();
                    currentDropdown = null;
                    const previouslyActiveButton = document.querySelector('.actionBtn.active');
                    if (previouslyActiveButton) {
                        previouslyActiveButton.classList.remove('active');
                    }
                }
            }

            actionButton.classList.add('active'); // Activate the clicked button


            currentVolunteerKey = volunteerKey;
            currentVolunteerData = volunteer; // Set current volunteer data here

            const rect = actionButton.getBoundingClientRect();

            const dropdown = document.createElement('div');
            dropdown.classList.add('action-dropdown-menu');
            dropdown.style.top = `${rect.bottom + window.scrollY}px`;
            dropdown.style.left = `${rect.left + window.scrollX}px`;
            dropdown.innerHTML = `
                <button id="dropdownConfirmByAB"><i class='bx bxs-check-circle' ></i>Confirm by AB</button>
                <button id="dropdownDirectedToABVN"><i class='bx bxs-group'></i>Directed to ABVN</button>
                <button id="dropdownSetStalled"><i class='bx bxs-hand'></i>Status Notes</button>
                <button id="dropdownCancelled"><i class='bx bxs-ghost'></i>Cancelled</button>
            `;
            document.body.appendChild(dropdown);
            currentDropdown = dropdown;

            // Add event listeners to the new dropdown buttons
            dropdown.querySelectorAll('button').forEach(button => {
                button.addEventListener('click', () => {
                   
                });
            });

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
                //showEndorseABVNModal();
            });

            dropdown.querySelector('#dropdownSetStalled').addEventListener('click', async () => {
                const { value: notes } = await Swal.fire({
                    title: 'Set Volunteer to Stalled',
                    input: 'textarea',
                    inputLabel: '  Reason for stalling (e.g., Cannot be reached, Awaiting documents, etc.)',
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
                    // Update the status in Firebase
                    const updates = {};
                    updates[`volunteerApplications/pendingVolunteer/${currentVolunteerKey}/status`] = 'Stalled';
                    updates[`volunteerApplications/pendingVolunteer/${currentVolunteerKey}/statusNotes`] = notes; // Storing as a string for simplicity based on current render logic
                    updates[`volunteerApplications/pendingVolunteer/${currentVolunteerKey}/lastStatusUpdate`] = firebase.database.ServerValue.TIMESTAMP;


                    try {
                        await database.ref().update(updates);
                        Swal.fire('Success!', 'Volunteer status updated to Stalled with notes.', 'success');
                        fetchPendingVolunteers(); // Re-fetch to update the table
                    } catch (error) {
                        console.error("Error setting volunteer to stalled:", error);
                        Swal.fire('Error', 'Failed to update volunteer status. Please try again.', 'error');
                    }
                } else {
                    Swal.fire('Cancelled', 'No notes entered. Status remains unchanged.', 'info');
                }
                resetCurrentVolunteer(); // Reset after action (whether confirmed or cancelled)
            });

            dropdown.querySelector('#dropdownCancelled').addEventListener('click', async () => {
                Swal.fire({
                    title: 'Are you sure?',
                    text: "Do you want to remove this volunteer application? It will be permanently deleted.",
                    icon: 'warning',
                    showCancelButton: true,
                    confirmButtonColor: '#d33',
                    cancelButtonColor: '#3085d6',
                    confirmButtonText: 'Yes, remove it!',
                    customClass: {
                        confirmButton: 'my-confirm-button-class',
                        cancelButton: 'my-cancel-button-class'
                    },
                }).then(async (result) => {
                    if (result.isConfirmed) {
                        try {
                            const volunteerRef = database.ref(`volunteerApplications/pendingVolunteer/${currentVolunteerKey}`);
                            await volunteerRef.remove();
                            Swal.fire('Removed!', 'The volunteer application has been removed.', 'success');
                            fetchPendingVolunteers(); // Re-fetch to update the table
                        } catch (error) {
                            console.error("Error removing volunteer application: ", error);
                            Swal.fire('Error', 'Failed to remove volunteer application. Please try again.', 'error');
                        }
                    } else {
                        // Action cancelled, nothing to do but maybe inform user
                        Swal.fire('Cancelled', 'Volunteer application was not removed.', 'info');
                    }
                    resetCurrentVolunteer(); // Reset after action (whether confirmed or cancelled)
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
            resetCurrentVolunteer(); // Reset since view action is complete
        }
    });

    // --- Schedule Modal Form Submission ---
    scheduleForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        const scheduledDateTime = scheduleDateTimeInput.value;

        if (!currentVolunteerKey || !currentVolunteerData) {
            Swal.fire('Error', 'No volunteer selected for scheduling.', 'error');
            hideScheduleModal(); // This will also call resetCurrentVolunteer()
            return;
        }

        if (!scheduledDateTime) {
            Swal.fire('Error', 'Please fill in all scheduling details.', 'error');
            return;
        }

        // --- Check for past date, pwede current date basta bawal past time ---
        const selectedDate = new Date(scheduledDateTime);
        const now = new Date();

        now.setSeconds(0);
        now.setMilliseconds(0);

        selectedDate.setSeconds(0);
        selectedDate.setMilliseconds(0);

        if (selectedDate < now) {
            Swal.fire({
                title: 'Invalid Date',
                text: 'You cannot schedule a volunteer for a date and time that has already passed. Please select a future date and time.',
                icon: 'error',
                confirmButtonText: 'Understood'
            });
            return; // Stop execution if the date is in the past
        }

        // --- START OF NEW DUPLICATE CHECK LOGIC ---
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

            // 1. Check for duplicate email
            if (volunteerEmail) {
                const emailSnapshot = await approvedVolunteersRef.orderByChild('email').equalTo(volunteerEmail).once('value');
                if (emailSnapshot.exists()) {
                    // Check if the duplicate is NOT the volunteer being moved (unlikely but good for robustness)
                    let foundDuplicate = false;
                    emailSnapshot.forEach(childSnapshot => {
                        if (childSnapshot.key !== currentVolunteerKey) { // Ensure it's not the same record if moving within same path (not applicable here, but good practice)
                            foundDuplicate = true;
                            return true; // Break forEach
                        }
                    });
                    if (foundDuplicate) {
                        duplicateMessages.push('• Email Address');
                    }
                }
            }
            // 2. Check for duplicate mobile number
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
            // 3. Check for duplicate full name (consider this a softer check)
            // Note: Full name duplicates are more prone to false positives (e.g., common names).
            // The admin might need to manually verify these.
            if (volunteerFullName) {
                const nameSnapshot = await approvedVolunteersRef.once('value'); // Fetch all to manually filter by full name
                let nameExists = false;
                if (nameSnapshot.exists()) {
                    nameSnapshot.forEach(childSnapshot => {
                        const approvedVolunteer = childSnapshot.val();
                        if (childSnapshot.key !== currentVolunteerKey) {
                            const approvedFullName = getFullName(approvedVolunteer).toLowerCase();
                            if (approvedFullName === volunteerFullName) {
                                nameExists = true;
                                return true; // Break forEach
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

            } catch (duplicateCheckError) {
                console.error("Error during duplicate check for approved volunteer:", duplicateCheckError);
                Swal.fire('Error', 'Failed to perform duplicate check. Please try again.', 'error');
                hideScheduleModal();
                return;
            }

            // If no duplicates were found, or if user chose to proceed anyway (via recursive call)
            // The original confirmation dialog
            handleScheduleConfirmation(scheduledDateTime, currentVolunteerKey, currentVolunteerData);
        });


    // --- Confirm by AB LOGIC ---
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
                    // Move to approvedVolunteers
                    await database.ref(`volunteerApplications/approvedVolunteer/${volunteerKey}`).set({
                        ...volunteerData,
                        status: 'confirmedByAB',
                        scheduledDateTime: new Date(scheduledDateTime).toISOString()
                    });
                    // Remove from pendingVolunteer
                    await database.ref(`volunteerApplications/pendingVolunteer/${volunteerKey}`).remove();

                    // Send email
                    await sendApprovalEmail(volunteerData, formatDate(new Date(scheduledDateTime).toISOString()));

                    Swal.fire('Scheduled & Approved!', 'Volunteer has been scheduled, approved, and confirmation email sent.', 'success');
                    hideScheduleModal(); // This calls resetCurrentVolunteer() and resets form
                } catch (error) {
                    console.error("Error confirming schedule and approving volunteer: ", error);
                    Swal.fire('Error', 'Failed to schedule and approve volunteer. Please try again.', 'error');
                    hideScheduleModal(); // Ensure modal closes and state resets even on error
                }
            } else {
                hideScheduleModal(); // If cancelled, hide and reset
            }
        });
    }

    // --- Endorse ABVN Modal Form Submission ---
    endorseABVNForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        const selectedABVNR = document.querySelector('input[name="selectedABVN"]:checked');

        if (!selectedABVNR) {
            Swal.fire('Error', 'Please select an ABVN to endorse to.', 'error');
            return;
        }

        if (!currentVolunteerKey || !currentVolunteerData) {
            Swal.fire('Error', 'No volunteer selected for endorsement.', 'error');
            hideEndorseABVNModal(); // This will also call resetCurrentVolunteer()
            return;
        }

        const abvnKey = selectedABVNR.value;
        const abvnName = selectedABVNR.dataset.name;
        const abvnLocation = selectedABVNR.dataset.location;

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
                    // Fetch the full ABVN group data to get their contact info for the email
                    const abvnSnapshot = await database.ref(`volunteerGroups/${abvnKey}`).once('value');
                    const abvnGroupData = abvnSnapshot.val();

                    if (!abvnGroupData) {
                        Swal.fire('Error', 'Selected ABVN group details not found.', 'error');
                        return;
                    }

                    // Move to endorsedVolunteer
                    await database.ref(`volunteerGroups/${abvnKey}/endorsedVolunteers/${currentVolunteerKey}`).set({
                        ...currentVolunteerData,
                        status: 'directedToABVN',
                        endorsedToABVNKey: abvnKey,
                        endorsedToABVNName: abvnName,
                        endorsedToABVNLocation: abvnLocation,
                        endorsementDate: new Date().toISOString()
                    });
                    // Remove from pendingVolunteer
                    await database.ref(`volunteerApplications/pendingVolunteer/${currentVolunteerKey}`).remove();

                    // Send endorsement email to the ABVN group
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
        const volunteerFullName = getFullName(currentVolunteerData).toLowerCase(); // Assuming getFullName is defined and works

        if (!volunteerEmail && !volunteerMobile && !volunteerFullName) {
            Swal.fire('Error', 'Volunteer data is missing crucial information (email, mobile, full name). Cannot perform duplicate check for endorsement.', 'error');
            resetCurrentVolunteer();
            return;
        }

        try {
            const abvnGroupsRef = database.ref('volunteerGroups');
            let duplicateMessages = [];
            let isAlreadyEndorsedToAnABVN = false;

            const allAbvnSnapshot = await abvnGroupsRef.once('value');
            
            // Step 1: Collect all currently endorsed volunteers from ALL ABVN groups
            let allEndorsedVolunteersData = [];
            if (allAbvnSnapshot.exists()) {
                allAbvnSnapshot.forEach(abvnGroupChild => {
                    const groupData = abvnGroupChild.val();
                    const groupName = groupData.organization || abvnGroupChild.key; // Use organization name for display
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

            // Step 2: Now, check for duplicates based on contact information (email, mobile, full name)
            if (volunteerEmail) {
                const emailDuplicate = allEndorsedVolunteersData.find(ev => 
                    (ev.email || '').toLowerCase() === volunteerEmail.toLowerCase()
                );
                if (emailDuplicate) {
                    isAlreadyEndorsedToAnABVN = true;
                    duplicateMessages.push(`• Email Address (found in ABVN Group: ${emailDuplicate.endorsedGroupName})`);
                }
            }

            // Only check mobile if email wasn't a duplicate, or if we still want to list all duplicate reasons
            if (volunteerMobile && !isAlreadyEndorsedToAnABVN) { 
                const mobileDuplicate = allEndorsedVolunteersData.find(ev => 
                    (ev.mobileNumber || '') === volunteerMobile
                );
                if (mobileDuplicate) {
                    isAlreadyEndorsedToAnABVN = true;
                    duplicateMessages.push(`• Mobile Number (found in ABVN Group: ${mobileDuplicate.endorsedGroupName})`);
                }
            }
            
            // Full name check (softer check, prone to false positives for common names)
            if (volunteerFullName && !isAlreadyEndorsedToAnABVN) { 
                const nameDuplicate = allEndorsedVolunteersData.find(ev => 
                    getFullName(ev).toLowerCase() === volunteerFullName
                );
                if (nameDuplicate) {
                    isAlreadyEndorsedToAnABVN = true;
                    duplicateMessages.push(`• Full Name (found in ABVN Group: ${nameDuplicate.endorsedGroupName})`);
                }
            }

            // Step 3: If any duplicates based on contact info were found, show the warning
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

        } catch (endorseCheckError) {
            console.error("Error during duplicate check for endorsed volunteer:", endorseCheckError);
            Swal.fire('Error', 'Failed to perform endorsement duplicate check. Please try again.', 'error');
            hideEndorseABVNModal();
        }
    }


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
});
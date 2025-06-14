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
const auth = firebase.auth();

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
    const viewPendingBtn = document.getElementById('viewApprovedBtn'); 

    // Modals
    const previewModal = document.getElementById('previewModal');
    const closeModal = document.getElementById('closeModal');
    const modalContent = document.getElementById('modalContent');

    let allApprovedApplications = [];
    let filteredApprovedApplications = [];
    let currentPage = 1;
    const rowsPerPage = 5;

    // Change button text and functionality for this page
    viewPendingBtn.innerHTML = "<i class='bx bx-show' style='font-size: 1.2rem;'></i>View Pending Volunteer Applications";
    viewPendingBtn.addEventListener('click', () => {
        window.location.href = '../pages/pendingvolunteers.html';
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

    // Function to format date for datetime-local input
    function formatToDatetimeLocal(timestamp) {
        if (!timestamp) return '';
        const date = new Date(timestamp);
        const year = date.getFullYear();
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const day = date.getDate().toString().padStart(2, '0');
        const hours = date.getHours().toString().padStart(2, '0');
        const minutes = date.getMinutes().toString().padStart(2, '0');
        return `${year}-${month}-${day}T${hours}:${minutes}`;
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

    // Apply the setupModalClose function to the preview modal
    setupModalClose(previewModal, closeModal);

    function showPreviewModal(volunteer) {
        const fullName = getFullName(volunteer);
        modalContent.innerHTML = `
            <h3 style="color: #FA3B99;">Approved Volunteer Details</h3>
            <p><strong>Scheduled Date/Time:</strong> ${formatDate(volunteer.scheduledDateTime || volunteer.timestamp)}</p>
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
        `;
        previewModal.style.display = 'flex';
    }

    // --- Data Fetching Function ---
    function fetchApprovedVolunteers() {
        volunteersContainer.innerHTML = '<tr><td colspan="12" style="text-align: center;">Loading approved volunteer applications...</td></tr>';

        database.ref('volunteerApplications/approvedVolunteer').on('value', (snapshot) => {
            allApprovedApplications = [];
            if (snapshot.exists()) {
                snapshot.forEach((childSnapshot) => {
                    const volunteerData = childSnapshot.val();
                    const volunteerKey = childSnapshot.key;
                    allApprovedApplications.push({ key: volunteerKey, ...volunteerData });
                });
                console.log("Fetched approved volunteers:", allApprovedApplications);
            } else {
                console.log("No approved volunteer applications found.");
            }
            applySearchAndSort();
        }, (error) => {
            console.error("Error fetching approved volunteers: ", error);
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'Failed to load approved volunteer applications. Please try again later.',
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
            volunteersContainer.innerHTML = '<tr><td colspan="12" style="text-align: center;">No approved volunteer applications found on this page.</td></tr>';
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

            // Display the scheduled date/time if available, otherwise "N/A"
            const scheduledDateTimeDisplay = volunteer.scheduledDateTime ? formatDate(volunteer.scheduledDateTime) : 'N/A';
            
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
                <td>${scheduledDateTimeDisplay}</td>
                <td>
                    <button class="viewBtn" data-key="${volunteer.key}">View</button>
                    <button class="rescheduleBtn" data-key="${volunteer.key}">Reschedule</button>
                    <button class="archiveBtn" data-key="${volunteer.key}">Archive</button>
                </td>
            `;
        });

        updateEntriesInfo(applicationsToRender.length);
        renderPagination(applicationsToRender.length);
    }

    // --- Search and Sort Logic ---
    function applySearchAndSort() {
        let currentApplications = [...allApprovedApplications];

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
                const scheduledDateTime = (volunteer.scheduledDateTime ? formatDate(volunteer.scheduledDateTime) : '').toLowerCase();

                return fullName.includes(searchTerm) ||
                    email.includes(searchTerm) ||
                    mobileNumber.includes(searchTerm) ||
                    region.includes(searchTerm) ||
                    province.includes(searchTerm) ||
                    city.includes(searchTerm) ||
                    barangay.includes(searchTerm) ||
                    additionalInfo.includes(searchTerm) ||
                    scheduledDateTime.includes(searchTerm);
            });
        }

        const sortValue = sortSelect.value;
        if (sortValue) {
            const [sortBy, order] = sortValue.split('-');
            currentApplications.sort((a, b) => {
                let valA, valB;

                switch (sortBy) {
                    case 'DateTime':
                        valA = new Date(a.scheduledDateTime || a.timestamp || 0).getTime();
                        valB = new Date(b.scheduledDateTime || b.timestamp || 0).getTime();
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

        filteredApprovedApplications = currentApplications;
        currentPage = 1;
        renderApplications(filteredApprovedApplications);
    }

    // --- Pagination Functions ---
    function renderPagination() {
        pagination.innerHTML = '';
        const totalPages = Math.ceil(filteredApprovedApplications.length / rowsPerPage);

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
                renderApplications(filteredApprovedApplications);
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

    // --- Event Listener for View, Reschedule, and Archive Buttons ---
    volunteersContainer.addEventListener('click', async (event) => {
        const target = event.target;
        const viewButton = target.closest('.viewBtn');
        const rescheduleButton = target.closest('.rescheduleBtn'); // New reschedule button
        const archiveButton = target.closest('.archiveBtn');

        if (viewButton) {
            const volunteerKey = viewButton.dataset.key;
            const volunteer = allApprovedApplications.find(v => v.key === volunteerKey);
            if (volunteer) {
                showPreviewModal(volunteer);
            } else {
                console.warn("Volunteer data not found for key:", volunteerKey);
                Swal.fire('Error', 'Volunteer data not found.', 'error');
            }
        } else if (rescheduleButton) { // Handle reschedule button click
            const volunteerKey = rescheduleButton.dataset.key;
            const volunteer = allApprovedApplications.find(v => v.key === volunteerKey);

            if (!volunteer) {
                console.warn("Volunteer data not found for rescheduling:", volunteerKey);
                Swal.fire('Error', 'Volunteer data not found for rescheduling.', 'error');
                return;
            }

            const currentScheduledDateTime = volunteer.scheduledDateTime ? formatToDatetimeLocal(volunteer.scheduledDateTime) : '';

            Swal.fire({
                title: `Reschedule ${getFullName(volunteer)}`,
                html: `
                    <label for="swal-input-datetime">New Scheduled Date & Time:</label>
                    <input type="datetime-local" id="swal-input-datetime" class="swal2-input" value="${currentScheduledDateTime}">
                `,
                focusConfirm: false,
                showCancelButton: true,
                confirmButtonText: 'Save Reschedule',
                cancelButtonText: 'Cancel',
                preConfirm: () => {
                    const newDateTimeString = document.getElementById('swal-input-datetime').value;
                    if (!newDateTimeString) {
                        Swal.showValidationMessage('Please select a date and time.');
                        return false;
                    }
                    const newTimestamp = new Date(newDateTimeString).getTime();
                    if (isNaN(newTimestamp)) {
                        Swal.showValidationMessage('Invalid date and time format.');
                        return false;
                    }

                     // --- Check for past dates ---
                    const currentDateTime = Date.now(); 
                    if (newTimestamp < currentDateTime) {
                        Swal.showValidationMessage('Scheduled date and time cannot be in the past.');
                        return false;
                    }

                    return newTimestamp;
                }
            }).then(async (result) => {
                if (result.isConfirmed) {
                    const newTimestamp = result.value;
                    try {
                        const volunteerRef = database.ref(`volunteerApplications/approvedVolunteer/${volunteerKey}`);
                        await volunteerRef.update({ scheduledDateTime: newTimestamp });

                        Swal.fire(
                            'Rescheduled!',
                            `${getFullName(volunteer)}'s schedule has been updated to ${formatDate(newTimestamp)}.`,
                            'success'
                        );
                        // The .on('value') listener in fetchApprovedVolunteers will automatically update the table.
                    } catch (error) {
                        console.error("Error rescheduling volunteer: ", error);
                        Swal.fire(
                            'Error!',
                            `Failed to reschedule volunteer: ${error.message}`,
                            'error'
                        );
                    }
                }
            });

        } else if (archiveButton) {
            const volunteerKey = archiveButton.dataset.key;
            const volunteer = allApprovedApplications.find(v => v.key === volunteerKey);

            if (!volunteer) {
                console.warn("Volunteer data not found for archiving:", volunteerKey);
                Swal.fire('Error', 'Volunteer data not found for archiving.', 'error');
                return;
            }

            Swal.fire({
                title: 'Are you sure?',
                text: `You are about to archive the application for ${getFullName(volunteer)}. This action cannot be undone.`,
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#d33',
                cancelButtonColor: '#3085d6',
                confirmButtonText: 'Yes, archive it!',
                cancelButtonText: 'Cancel'
            }).then(async (result) => {
                if (result.isConfirmed) {
                    try {
                        // 1. Get a snapshot of the approved volunteer data
                        const approvedVolunteerRef = database.ref(`volunteerApplications/approvedVolunteer/${volunteerKey}`);
                        const snapshot = await approvedVolunteerRef.once('value');
                        const volunteerToArchive = snapshot.val();

                        if (!volunteerToArchive) {
                            Swal.fire('Error', 'Volunteer data not found in approved applications.', 'error');
                            return;
                        }

                        // Add timestamp for when it was archived
                        volunteerToArchive.archivedAt = firebase.database.ServerValue.TIMESTAMP;

                        // 2. Write the data to the 'deletedApprovedVolunteerApplications' node
                        const deletedApprovedRef = database.ref(`deletedApprovedVolunteerApplications/${volunteerKey}`);
                        await deletedApprovedRef.set(volunteerToArchive);

                        // 3. Remove the data from the 'approvedVolunteer' node
                        await approvedVolunteerRef.remove();

                        Swal.fire(
                            'Archived!',
                            `${getFullName(volunteer)}'s application has been archived.`,
                            'success'
                        );
                        // Data will automatically re-fetch due to .on('value') listener
                        // in fetchApprovedVolunteers, so no manual re-render needed.
                    } catch (error) {
                        console.error("Error archiving volunteer application: ", error);
                        Swal.fire(
                            'Error!',
                            `Failed to archive application: ${error.message}`,
                            'error'
                        );
                    }
                }
            });
        }
    });

    // Initial fetch of approved volunteers when the page loads
    fetchApprovedVolunteers();
});
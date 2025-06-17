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

    // New: View Toggle Elements
    const toggleViewBtn = document.getElementById('toggleViewBtn'); 
    const tableView = document.getElementById('tableView');      
    const calendarView = document.getElementById('calendarView'); 

    // Modals
    const previewModal = document.getElementById('previewModal');
    const closeModal = document.getElementById('closeModal');
    const modalContent = document.getElementById('modalContent');

    // Renamed for clarity: was viewApprovedBtn, now viewPendingBtn
    const viewPendingBtn = document.getElementById('viewPendingBtn'); 

    let allApprovedApplications = [];
    let filteredApprovedApplications = [];
    let currentPage = 1;
    const rowsPerPage = 5; // Keep this consistent
    let currentView = 'table'; // Initial view is table

    // FullCalendar instance variable
    let calendar;

    // Change button text and functionality for this page
    viewPendingBtn.innerHTML = "<i class='bx bx-show'></i> View Pending Volunteer Applications";
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
            <p><strong>Time Availability:</strong> ${volunteer.availability?.timeAvailability || 'N/A'}</p>
        `;
        previewModal.style.display = 'flex';
    }

    // --- Data Fetching Function ---
    function fetchApprovedVolunteers() {
        volunteersContainer.innerHTML = '<tr><td colspan="15" style="text-align: center;">Loading approved volunteer applications...</td></tr>';

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
            applySearchAndSort(); // This will trigger renderCurrentView() implicitly
        }, (error) => {
            console.error("Error fetching approved volunteers: ", error);
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'Failed to load approved volunteer applications. Please try again later.',
                confirmButtonText: 'OK'
            });
            volunteersContainer.innerHTML = '<tr><td colspan="15" style="text-align: center; color: red;">Failed to load data.</td></tr>';
        });
    }

    // --- View Rendering Logic (New) ---
    function renderCurrentView() {
        if (currentView === 'table') {
            tableView.style.display = 'block';
            calendarView.style.display = 'none';
            toggleViewBtn.innerHTML = "<i class='bx bx-calendar'></i>Calendar View";
            renderApplications(filteredApprovedApplications); // Render table
            searchInput.style.display = 'block'; 
            sortSelect.style.display = 'block';
        } else { // currentView === 'calendar'
            tableView.style.display = 'none';
            calendarView.style.display = 'block';
            toggleViewBtn.innerHTML = "<i class='bx bx-list-ul'></i> Switch to Table View";
            renderVolunteerCalendar(); // Render calendar
            searchInput.style.display = 'none'; // Hide search and sort for calendar view
            sortSelect.style.display = 'none';
        }
    }

    // --- Table Rendering Function (Modified to be called by renderCurrentView) ---
    function renderApplications(applicationsToRender) {
        volunteersContainer.innerHTML = '';
        const startIndex = (currentPage - 1) * rowsPerPage;
        const endIndex = startIndex + rowsPerPage;
        const paginatedApplications = applicationsToRender.slice(startIndex, endIndex);

        if (paginatedApplications.length === 0) {
            volunteersContainer.innerHTML = '<tr><td colspan="15" style="text-align: center;">No approved volunteer applications found on this page.</td></tr>';
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
            const scheduledDateTimeDisplay = volunteer.scheduledDateTime ? formatDate(volunteer.scheduledDateTime) : 'N/A';

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

        // Add event listeners to the new buttons in the rendered rows
        volunteersContainer.querySelectorAll('.viewBtn').forEach(button => {
            button.onclick = () => showPreviewModal(allApprovedApplications.find(v => v.key === button.dataset.key));
        });
        volunteersContainer.querySelectorAll('.rescheduleBtn').forEach(button => {
            button.onclick = (event) => handleRescheduleClick(event.target.closest('button'));
        });
        volunteersContainer.querySelectorAll('.archiveBtn').forEach(button => {
            button.onclick = (event) => handleArchiveClick(event.target.closest('button'));
        });
    }

    // --- Search and Sort Logic (Modified to call renderCurrentView) ---
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
                const generalAvailability = (volunteer.availability?.general || '').toLowerCase();
                const specificDays = (volunteer.availability?.specificDays ? volunteer.availability.specificDays.join(', ') : '').toLowerCase();
                const timeAvailability = (volunteer.availability?.timeAvailability || '').toLowerCase();
                const scheduledDateTime = (volunteer.scheduledDateTime ? formatDate(volunteer.scheduledDateTime) : '').toLowerCase();


                return fullName.includes(searchTerm) ||
                    email.includes(searchTerm) ||
                    mobileNumber.includes(searchTerm) ||
                    region.includes(searchTerm) ||
                    province.includes(searchTerm) ||
                    city.includes(searchTerm) ||
                    barangay.includes(searchTerm) ||
                    additionalInfo.includes(searchTerm) ||
                    generalAvailability.includes(searchTerm) ||
                    specificDays.includes(searchTerm) ||
                    timeAvailability.includes(searchTerm) ||
                    scheduledDateTime.includes(searchTerm);
            });
        }

        const sortValue = sortSelect.value;
        if (sortValue) {
            currentApplications.sort((a, b) => {
                let valA, valB;

                switch (sortBy) { // `sortBy` is already defined in the outer scope
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
                        // Default sort by name if no specific sort option matches
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
        renderCurrentView(); // Call the main render function
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

    // --- FullCalendar Initialization and Rendering ---
    function renderVolunteerCalendar() {
        const calendarEl = document.getElementById('volunteerCalendar');
        
        // Destroy existing calendar instance to prevent duplicates if function is called multiple times
        if (calendar) {
            calendar.destroy();
        }

        // Prepare events for FullCalendar
        const events = filteredApprovedApplications
            .filter(v => v.scheduledDateTime) // Only include volunteers with a scheduled date
            .map(volunteer => {
                // Assuming scheduledDateTime is a timestamp
                const scheduledDate = new Date(volunteer.scheduledDateTime);
                
                // Parse time availability for start and end times
                let startTime = '09:00:00'; 
                let endTime = '17:00:00';  

                if (volunteer.availability?.timeAvailability) {
                    const timeParts = volunteer.availability.timeAvailability.split(' - ');
                    if (timeParts.length === 2) {
                        startTime = formatTimeTo24Hr(timeParts[0]);
                        endTime = formatTimeTo24Hr(timeParts[1]);
                    }
                }

                // Construct ISO string for FullCalendar
                const startISO = `${scheduledDate.getFullYear()}-${(scheduledDate.getMonth() + 1).toString().padStart(2, '0')}-${scheduledDate.getDate().toString().padStart(2, '0')}T${startTime}`;
                const endISO = `${scheduledDate.getFullYear()}-${(scheduledDate.getMonth() + 1).toString().padStart(2, '0')}-${scheduledDate.getDate().toString().padStart(2, '0')}T${endTime}`;

                return {
                    title: getFullName(volunteer),
                    start: startISO,
                    end: endISO, 
                    id: volunteer.key,
                    extendedProps: volunteer
                };
            });

        calendar = new FullCalendar.Calendar(calendarEl, {
            initialView: 'dayGridMonth', 
            headerToolbar: {
                left: 'prev,next today',
                center: 'title',
                right: 'dayGridMonth,timeGridWeek,timeGridDay' 
            },
            events: events,
            eventClick: function(info) {
                // Open modal when an event is clicked
                showPreviewModal(info.event.extendedProps);
            },
            eventDidMount: function(info) {
                // Optional: You can add custom styling or elements to events here
                // For example, adding an icon or a tooltip
            },
            noEventsContent: {
                html: '<p style="text-align: center; color: #777;">No approved volunteer schedules for this period.</p>'
            },
            // Enable resizing and dragging if you want to allow changing schedules directly on calendar
            // eventResizableFromStart: true,
            // eventDurationEditable: true,
            // editable: true,
            // eventDrop: function(info) {
            //     // Handle event drop (drag-and-drop reschedule)
            //     // You would update Firebase here: info.event.id is volunteer.key
            //     // info.event.start and info.event.end are the new dates
            //     Swal.fire({
            //         title: 'Update Schedule?',
            //         text: `Move ${info.event.title} to ${formatDate(info.event.start.getTime())}?`,
            //         icon: 'question',
            //         showCancelButton: true,
            //         confirmButtonText: 'Yes, update!',
            //         cancelButtonText: 'No'
            //     }).then(async (result) => {
            //         if (result.isConfirmed) {
            //             try {
            //                 const newTimestamp = info.event.start.getTime();
            //                 const volunteerRef = database.ref(`volunteerApplications/approvedVolunteer/${info.event.id}`);
            //                 await volunteerRef.update({ scheduledDateTime: newTimestamp });
            //                 Swal.fire('Updated!', 'Schedule updated successfully.', 'success');
            //             } catch (error) {
            //                 console.error("Error updating schedule from calendar: ", error);
            //                 Swal.fire('Error!', 'Failed to update schedule.', 'error');
            //                 info.revert(); // Revert the event's position on the calendar
            //             }
            //         } else {
            //             info.revert(); // Revert the event's position on the calendar
            //         }
            //     });
            // },
            // eventResize: function(info) {
            //     // Handle event resize (change duration)
            //     // Similar to eventDrop, update Firebase with new start/end times
            // }
        });
        calendar.render();
    }

    // Helper to convert AM/PM time (e.g., "9:00 AM", "1:30 PM") to 24-hour format (e.g., "09:00:00", "13:30:00")
    function formatTimeTo24Hr(timeStr) {
        if (!timeStr) return "00:00:00"; // Default if no time string

        let [time, period] = timeStr.split(' ');
        let [hours, minutes] = time.split(':');
        hours = parseInt(hours);

        if (period && period.toLowerCase() === 'pm' && hours < 12) {
            hours += 12;
        } else if (period && period.toLowerCase() === 'am' && hours === 12) {
            hours = 0; // 12 AM is 00:00 in 24hr format
        }
        return `${String(hours).padStart(2, '0')}:${minutes.padStart(2, '0')}:00`;
    }

    // --- Event Listeners ---
    searchInput.addEventListener('keyup', applySearchAndSort);
    sortSelect.addEventListener('change', applySearchAndSort);

    // New: Toggle View Button Event Listener
    toggleViewBtn.addEventListener('click', () => {
        currentView = currentView === 'table' ? 'calendar' : 'table';
        applySearchAndSort(); // Re-apply search/sort and then render the correct view
    });

    // Event listener for action buttons (View, Reschedule, Archive)
    volunteersContainer.addEventListener('click', async (event) => {
        const target = event.target;
        
        const viewButton = target.closest('.viewBtn');
        const rescheduleButton = target.closest('.rescheduleBtn');
        const archiveButton = target.closest('.archiveBtn');

        if (viewButton) {
            handleViewClick(viewButton);
        } else if (rescheduleButton) {
            handleRescheduleClick(rescheduleButton);
        } else if (archiveButton) {
            handleArchiveClick(archiveButton);
        }
    });

    // Helper functions for delegated events
    function handleViewClick(button) {
        const volunteerKey = button.dataset.key;
        const volunteer = allApprovedApplications.find(v => v.key === volunteerKey);
        if (volunteer) {
            showPreviewModal(volunteer);
        } else {
            console.warn("Volunteer data not found for key:", volunteerKey);
            Swal.fire('Error', 'Volunteer data not found.', 'error');
        }
    }

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

    async function handleRescheduleClick(button) {
        const volunteerKey = button.dataset.key;
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
                <label for="swal-input-datetime" style="display:block; margin-bottom: 5px; font-weight: bold;">New Scheduled Date & Time:</label>
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

                    // Send email
                    await sendApprovalEmail(volunteer, formatDate(newTimestamp));

                    Swal.fire(
                        'Rescheduled!',
                        `${getFullName(volunteer)}'s schedule has been updated to ${formatDate(newTimestamp)}. New Schedule Email has been sent to the Volunteer.`,
                        'success'
                    );
                } catch (error) {
                    console.error("Error rescheduling volunteer or sending email: ", error);
                    let errorMessage = `Failed to reschedule volunteer: ${error.message}`;
                    if (error && error.status === 422) {
                        errorMessage = 'Failed to send reschedule email. Please check EmailJS template parameters and IDs. (Error 422)';
                    } else if (error && error.text) { 
                        errorMessage = `Failed to send reschedule email: ${error.text}. Please check EmailJS setup.`;
                    }
                    Swal.fire(
                        'Error!',
                        errorMessage,
                        'error'
                    );
                }
            }
        });
    }

    async function handleArchiveClick(button) {
        const volunteerKey = button.dataset.key;
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
                    const approvedVolunteerRef = database.ref(`volunteerApplications/approvedVolunteer/${volunteerKey}`);
                    const snapshot = await approvedVolunteerRef.once('value');
                    const volunteerToArchive = snapshot.val();

                    if (!volunteerToArchive) {
                        Swal.fire('Error', 'Volunteer data not found in approved applications.', 'error');
                        return;
                    }

                    volunteerToArchive.archivedAt = firebase.database.ServerValue.TIMESTAMP;

                    const deletedApprovedRef = database.ref(`deletedApprovedVolunteerApplications/${volunteerKey}`);
                    await deletedApprovedRef.set(volunteerToArchive);
                    await approvedVolunteerRef.remove();

                    Swal.fire(
                        'Archived!',
                        `${getFullName(volunteer)}'s application has been archived.`,
                        'success'
                    );
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

    // Initial fetch of approved volunteers when the page loads
    fetchApprovedVolunteers();
});
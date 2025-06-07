// Initialize EmailJS with your Public Key
emailjs.init("YOUR_EMAILJS_PUBLIC_KEY"); // Replace with your actual EmailJS Public Key

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
        `;
        previewModal.style.display = 'block';
    }

    // Removed hideActionStatusModal function
    function resetCurrentVolunteer() {
        currentVolunteerKey = null;
        currentVolunteerData = null;
        if (currentDropdown) {
            currentDropdown.remove(); 
            currentDropdown = null;
        }
    }

    function showScheduleModal() {
        scheduleModal.style.display = 'block';
        // No hideActionStatusModal needed here
    }

    function hideScheduleModal() {
        scheduleModal.style.display = 'none';
        scheduleForm.reset(); // Clear form
        resetCurrentVolunteer(); // Reset after action
    }

    function showEndorseABVNModal() {
        endorseABVNModal.style.display = 'block';
        fetchABVNs(); // Populate ABVN list when modal is shown
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
            let volunteerGroups = [];
            if (snapshot.exists()) {
                snapshot.forEach(childSnapshot => {
                    const groupData = childSnapshot.val();
                    volunteerGroups.push({ key: childSnapshot.key, ...groupData });
                });
            }

            if (volunteerGroups.length === 0) {
                abvnListContainer.innerHTML = '<p>No volunteer groups found.</p>';
                return;
            }

            const volunteerLocation = currentVolunteerData?.address;
            let matchedGroups = [];

            if (volunteerLocation) {
                // Helper function to determine match level
                const getMatchLevel = (group) => { // Changed parameter name
                    const volunteerCity = (volunteerLocation.city || '').toLowerCase();
                    const volunteerBarangay = (volunteerLocation.barangay || '').toLowerCase();
                    const volunteerProvince = (volunteerLocation.province || '').toLowerCase();
                    const volunteerRegion = (volunteerLocation.region || '').toLowerCase();

                    // Access group address details
                    const groupAddress = group.address || {}; // Ensure address object exists
                    const groupCity = (groupAddress.city || '').toLowerCase();
                    const groupBarangay = (groupAddress.barangay || '').toLowerCase();
                    const groupProvince = (groupAddress.province || '').toLowerCase();
                    const groupRegion = (groupAddress.region || '').toLowerCase();

                    // Check for exact matches, prioritizing most specific
                    if (volunteerCity && groupCity && volunteerCity === groupCity) {
                        if (volunteerBarangay && groupBarangay && volunteerBarangay === groupBarangay) {
                            return 4;
                        }
                        return 3; // Best match: City (without barangay match)
                    }
                    if (volunteerProvince && groupProvince && volunteerProvince === groupProvince) {
                        return 2; // Next best: Province
                    }
                    if (volunteerRegion && groupRegion && volunteerRegion === groupRegion) {
                        return 1; // Good match: Region
                    }
                    return 0; // No significant location match
                };

                let bestMatchLevel = 0;
                // Find the highest match level achieved by any group
                volunteerGroups.forEach(group => {
                    const level = getMatchLevel(group);
                    if (level > bestMatchLevel) {
                        bestMatchLevel = level;
                    }
                });

                // Filter groups to only include those at the best match level
                if (bestMatchLevel > 0) {
                    matchedGroups = volunteerGroups.filter(group => getMatchLevel(group) === bestMatchLevel);
                } else {
                    // If no match by address, display all groups as a fallback
                    matchedGroups = volunteerGroups;
                }

                // Sort the matched groups alphabetically by organization name
                matchedGroups.sort((a, b) => {
                    const nameA = (a.organization || '').toLowerCase(); // Use 'organization' property
                    const nameB = (b.organization || '').toLowerCase();
                    return nameA.localeCompare(nameB);
                });
            } else {
                // If volunteer has no location, display all groups sorted alphabetically
                matchedGroups = volunteerGroups.sort((a, b) => {
                    const nameA = (a.organization || '').toLowerCase();
                    const nameB = (b.organization || '').toLowerCase();
                    return nameA.localeCompare(nameB);
                });
            }

            abvnListContainer.innerHTML = ''; // Clear loading message

            if (matchedGroups.length === 0) {
                abvnListContainer.innerHTML = `<p>${volunteerLocation ? 'No nearby volunteer groups found for this volunteer.' : 'Volunteer location not available. No specific nearby volunteer groups found.'}</p>`;
                endorseABVNSubmitBtn.disabled = true;
                return;
            }

            matchedGroups.forEach(group => { // Iterate over matchedGroups
                const radioDiv = document.createElement('div');
                radioDiv.classList.add('abvn-option'); // Keep class name for styling
                const radioInput = document.createElement('input');
                radioInput.type = 'radio';
                radioInput.name = 'selectedABVN'; // Keep name for radio group behavior
                radioInput.value = group.key;
                radioInput.id = `group-${group.key}`; // Updated ID
                radioInput.dataset.name = group.organization || 'Unknown Organization'; // Use 'organization' property

                // Access address details for the group
                const groupAddress = group.address || {};
                radioInput.dataset.region = groupAddress.region || '';
                radioInput.dataset.province = groupAddress.province || '';
                radioInput.dataset.city = groupAddress.city || '';
                radioInput.dataset.barangay = groupAddress.barangay || '';

                const locationParts = [groupAddress.barangay, groupAddress.city, groupAddress.province, groupAddress.region].filter(Boolean);
                const displayLocation = locationParts.join(', ');
                radioInput.dataset.location = displayLocation;

                const label = document.createElement('label');
                label.htmlFor = `group-${group.key}`; // Updated htmlFor
                label.innerHTML = `<strong>${group.organization || 'N/A'}</strong> <br> (${radioInput.dataset.location || 'N/A'})`;

                radioDiv.appendChild(radioInput);
                radioDiv.appendChild(label);
                abvnListContainer.appendChild(radioDiv);
            });

            endorseABVNSubmitBtn.disabled = false;

        } catch (error) {
            console.error("Error fetching volunteer groups: ", error); // Updated message
            abvnListContainer.innerHTML = '<p style="color: red;">Failed to load volunteer group locations.</p>'; // Updated message
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
            if (Array.isArray(volunteer.statusNotes) && volunteer.statusNotes.length > 0) {
                displayStatusNotes = volunteer.statusNotes[volunteer.statusNotes.length - 1].note;
            } else if (typeof volunteer.statusNotes === 'string' && volunteer.statusNotes.trim() !== '') {
                displayStatusNotes = volunteer.statusNotes;
            }

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

    // --- Email Sending Function ---
    async function sendApprovalEmail(volunteer, scheduledDate, abContact) {
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
            contact_info: abContact, 
        };

        try {
            const response = await emailjs.send('YOUR_EMAILJS_SERVICE_ID', 'YOUR_EMAILJS_TEMPLATE_ID', templateParams);
            console.log('Email successfully sent!', response.status, response.text);
            Swal.fire('Email Sent!', 'Confirmation email has been sent to the volunteer.', 'success');
        } catch (error) {
            console.error('Failed to send email:', error);
            Swal.fire('Email Error', 'Failed to send confirmation email. Please check EmailJS configuration or try again.', 'error');
        }
    }

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
            // Replace with your actual EmailJS Service ID and Endorsement Template ID
            const response = await emailjs.send('YOUR_EMAILJS_SERVICE_ID', 'YOUR_ENDORSEMENT_TEMPLATE_ID', templateParams);
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
            if (currentDropdown) {
                if (!currentDropdown.contains(target)) {
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
            resetCurrentVolunteer();
            return;
        }

        if (clickedActionButton) { 
            const actionButton = clickedActionButton; 

            if (currentDropdown) {
                currentDropdown.remove();
                currentDropdown = null;
                const previouslyActiveButton = document.querySelector('.actionBtn.active');
                if (previouslyActiveButton && previouslyActiveButton !== actionButton) {
                    previouslyActiveButton.classList.remove('active');
                }
            }

            actionButton.classList.toggle('active');
            if (!actionButton.classList.contains('active')) {
                return; 
            }


            currentVolunteerKey = volunteerKey;
            currentVolunteerData = volunteer;

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
                    if (currentDropdown) {
                        currentDropdown.remove();
                        currentDropdown = null;
                    }
                    actionButton.classList.remove('active');
                });
            });

            dropdown.querySelector('#dropdownConfirmByAB').addEventListener('click', () => {
                showScheduleModal();
                resetCurrentVolunteer();
            });

            dropdown.querySelector('#dropdownDirectedToABVN').addEventListener('click', () => {
                showEndorseABVNModal();
                resetCurrentVolunteer();
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
                    updates[`volunteerApplications/pendingVolunteer/${currentVolunteerKey}/statusNotes`] = notes; 
                    updates[`volunteerApplications/pendingVolunteer/${currentVolunteerKey}/lastStatusUpdate`] = firebase.database.ServerValue.TIMESTAMP;


                    try {
                        await database.ref().update(updates);
                        Swal.fire('Success!', 'Volunteer status updated to Stalled with notes.', 'success');
                        resetCurrentVolunteer(); 
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
                    text: "Do you want to remove this volunteer application? It will be permanently deleted.",
                    icon: 'warning',
                    showCancelButton: true,
                    confirmButtonColor: '#d33',
                    cancelButtonColor: '#3085d6',
                    confirmButtonText: 'Yes, remove it!'
                }).then(async (result) => {
                    if (result.isConfirmed) {
                        try {
                            const volunteerRef = database.ref(`volunteerApplications/pendingVolunteer/${currentVolunteerKey}`);
                            await volunteerRef.remove();
                            Swal.fire('Removed!', 'The volunteer application has been removed.', 'success');
                            resetCurrentVolunteer();
                        } catch (error) {
                            console.error("Error removing volunteer application: ", error);
                            Swal.fire('Error', 'Failed to remove volunteer application. Please try again.', 'error');
                        }
                    } else {
                        resetCurrentVolunteer();
                    }
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

    // --- Schedule Modal Form Submission ---
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
                    await database.ref(`volunteerApplications/approvedVolunteer/${currentVolunteerKey}`).set({
                        ...currentVolunteerData,
                        status: 'confirmedByAB',
                        scheduledDateTime: new Date(scheduledDateTime).toISOString()
                    });
                    // Remove from pendingVolunteer
                    await database.ref(`volunteerApplications/pendingVolunteer/${currentVolunteerKey}`).remove();

                    // Send email
                    await sendApprovalEmail(currentVolunteerData, formatDate(new Date(scheduledDateTime).toISOString()));

                    Swal.fire('Scheduled & Approved!', 'Volunteer has been scheduled, approved, and confirmation email sent.', 'success');
                    hideScheduleModal(); // This calls resetCurrentVolunteer
                } catch (error) {
                    console.error("Error confirming schedule and approving volunteer: ", error);
                    Swal.fire('Error', 'Failed to schedule and approve volunteer. Please try again.', 'error');
                }
            }
        });
    });

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
            hideEndorseABVNModal();
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
            confirmButtonText: 'Yes, Endorse!'
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
                    await database.ref(`volunteerApplications/endorsedVolunteer/${currentVolunteerKey}`).set({
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
                    hideEndorseABVNModal(); // This calls resetCurrentVolunteer
                } catch (error) {
                    console.error("Error endorsing volunteer to ABVN: ", error);
                    Swal.fire('Error', 'Failed to endorse volunteer. Please try again.', 'error');
                }
            }
        });
    });

    // Event listener for clicks anywhere on the document to close dropdown
    document.addEventListener('click', (event) => {
        if (currentDropdown && !event.target.closest('.actionBtn') && !currentDropdown.contains(event.target)) {
            currentDropdown.remove();
            currentDropdown = null;
        }
    });
    fetchPendingVolunteers();
});
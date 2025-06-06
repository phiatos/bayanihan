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

    // Modals (existing and new)
    const previewModal = document.getElementById('previewModal');
    const closeModal = document.getElementById('closeModal');
    const modalContent = document.getElementById('modalContent');

    const actionStatusModal = document.getElementById('actionStatusModal');
    const closeActionStatusModal = document.getElementById('closeActionStatusModal');
    const confirmByABBtn = document.getElementById('confirmByABBtn');
    const cannotBeReachedBtn = document.getElementById('cannotBeReachedBtn');
    const hindiNaTutuloyBtn = document.getElementById('hindiNaTutuloyBtn');
    const directedToABVNBtn = document.getElementById('directedToABVNBtn');

    const scheduleModal = document.getElementById('scheduleModal');
    const closeScheduleModal = document.getElementById('closeScheduleModal');
    const scheduleForm = document.getElementById('scheduleForm');
    const scheduleDateTimeInput = document.getElementById('scheduleDateTime');
    const abContactInfoInput = document.getElementById('abContactInfo');

    const endorseABVNModal = document.getElementById('endorseABVNModal');
    const closeEndorseABVNModal = document.getElementById('closeEndorseABVNModal');
    const endorseABVNForm = document.getElementById('endorseABVNForm');
    const abvnListContainer = document.getElementById('abvnListContainer');
    const endorseABVNSubmitBtn = document.getElementById('endorseABVNSubmitBtn');


    if (!volunteersContainer || !searchInput || !sortSelect || !entriesInfo || !pagination || !viewApprovedBtn || !previewModal || !closeModal || !modalContent ||
        !actionStatusModal || !closeActionStatusModal || !confirmByABBtn || !cannotBeReachedBtn || !hindiNaTutuloyBtn || !directedToABVNBtn ||
        !scheduleModal || !closeScheduleModal || !scheduleForm || !scheduleDateTimeInput || !abContactInfoInput ||
        !endorseABVNModal || !closeEndorseABVNModal || !endorseABVNForm || !abvnListContainer || !endorseABVNSubmitBtn
    ) {
        console.error('One or more DOM elements are missing. Please check your HTML IDs.');
        return;
    }

    let allApplications = [];
    let filteredApplications = [];
    let currentPage = 1;
    const rowsPerPage = 5;
    let currentVolunteerKey = null; // To store the key of the volunteer being actioned
    let currentVolunteerData = null; // To store the data of the volunteer being actioned

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

    function showPreviewModal(volunteer) {
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
            <p><strong>General Availability:</strong> ${volunteer.availability?.general || 'N/A'}</p>
            <p><strong>Specific Availability:</strong> ${volunteer.availability?.specificDays ? volunteer.availability.specificDays.join(', ') : 'N/A'}</p>
            <p><strong>Application Date:</strong> ${formatDate(volunteer.timestamp)}</p>
        `;
        previewModal.style.display = 'block';
    }

    function hidePreviewModal() {
        previewModal.style.display = 'none';
    }

    function showActionStatusModal(key, data) {
        currentVolunteerKey = key;
        currentVolunteerData = data;
        actionStatusModal.style.display = 'block';
    }

    function hideActionStatusModal() {
        actionStatusModal.style.display = 'none';
        currentVolunteerKey = null;
        currentVolunteerData = null;
    }

    function showScheduleModal() {
        scheduleModal.style.display = 'block';
        hideActionStatusModal(); // Hide the status selection modal
    }

    function hideScheduleModal() {
        scheduleModal.style.display = 'none';
        scheduleForm.reset(); // Clear form
    }

    function showEndorseABVNModal() {
        endorseABVNModal.style.display = 'block';
        hideActionStatusModal(); // Hide the status selection modal
        fetchABVNs(); // Populate ABVN list when modal is shown
    }

    function hideEndorseABVNModal() {
        endorseABVNModal.style.display = 'none';
        abvnListContainer.innerHTML = '<p>Loading ABVN locations...</p>'; // Reset list
        endorseABVNSubmitBtn.disabled = true; // Disable button
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
            const snapshot = await database.ref('volunteerNetworks/approvedABVN').once('value');
            const abvns = [];
            if (snapshot.exists()) {
                snapshot.forEach(childSnapshot => {
                    const abvnData = childSnapshot.val();
                    abvns.push({ key: childSnapshot.key, ...abvnData });
                });
            }

            if (abvns.length === 0) {
                abvnListContainer.innerHTML = '<p>No ABVN locations found.</p>';
                return;
            }

            // Sort ABVNs by proximity (simplified: by region, then province, then city)
            // Prioritize ABVNs that match the volunteer's location more closely
            const volunteerLocation = currentVolunteerData?.address;
            if (volunteerLocation) {
                abvns.sort((a, b) => {
                    let scoreA = 0;
                    let scoreB = 0;

                    if (a.region === volunteerLocation.region) scoreA += 3;
                    if (a.province === volunteerLocation.province) scoreA += 2;
                    if (a.city === volunteerLocation.city) scoreA += 1;

                    if (b.region === volunteerLocation.region) scoreB += 3;
                    if (b.province === volunteerLocation.province) scoreB += 2;
                    if (b.city === volunteerLocation.city) scoreB += 1;

                    // Prioritize activated ABVNs (assuming a 'status' field exists, e.g., 'active' or 'activated')
                    // You might need to adjust this based on your actual ABVN data structure
                    if (a.status === 'activated' && b.status !== 'activated') return -1;
                    if (a.status !== 'activated' && b.status === 'activated') return 1;

                    return scoreB - scoreA; // Higher score means closer/better match
                });
            }

            abvnListContainer.innerHTML = ''; // Clear loading message

            abvns.forEach(abvn => {
                const radioDiv = document.createElement('div');
                radioDiv.classList.add('abvn-option'); // Add a class for styling if needed
                const radioInput = document.createElement('input');
                radioInput.type = 'radio';
                radioInput.name = 'selectedABVN';
                radioInput.value = abvn.key;
                radioInput.id = `abvn-${abvn.key}`;
                radioInput.dataset.name = abvn.networkName || 'Unknown ABVN';
                radioInput.dataset.location = `${abvn.region || ''}, ${abvn.province || ''}, ${abvn.city || ''}`.trim();

                const label = document.createElement('label');
                label.htmlFor = `abvn-${abvn.key}`;
                label.innerHTML = `<strong>${abvn.networkName || 'N/A'}</strong> <br> (${abvn.region || 'N/A'}, ${abvn.province || 'N/A'}, ${abvn.city || 'N/A'})`;

                radioDiv.appendChild(radioInput);
                radioDiv.appendChild(label);
                abvnListContainer.appendChild(radioDiv);
            });

            endorseABVNSubmitBtn.disabled = false; // Enable button once options are loaded

        } catch (error) {
            console.error("Error fetching ABVNs: ", error);
            abvnListContainer.innerHTML = '<p style="color: red;">Failed to load ABVN locations.</p>';
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'Failed to load ABVN locations for endorsement. Please try again.',
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
                    <button class="actionBtn" data-key="${volunteer.key}">Actions <i class='bx bx-dots-vertical-rounded'></i></button>
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
                        valA = `${a.firstName || ''} ${a.lastName || ''}`.toLowerCase();
                        valB = `${b.firstName || ''} ${b.lastName || ''}`.toLowerCase();
                        break;
                    case 'Age':
                        valA = parseInt(a.age) || 0;
                        valB = parseInt(b.age) || 0;
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

        const fullName = `${volunteer.firstName || ''} ${volunteer.middleInitial ? volunteer.middleInitial + '.' : ''} ${volunteer.lastName || ''} ${volunteer.nameExtension || ''}`.trim();

        const templateParams = {
            to_name: fullName,
            to_email: volunteer.email,
            scheduled_date: scheduledDate,
            contact_info: abContact,
            // Add any other parameters you want to send to your EmailJS template
        };

        try {
            const response = await emailjs.send('YOUR_EMAILJS_SERVICE_ID', 'YOUR_EMAILJS_TEMPLATE_ID', templateParams); // Replace with your Service ID and Template ID
            console.log('Email successfully sent!', response.status, response.text);
            Swal.fire('Email Sent!', 'Confirmation email has been sent to the volunteer.', 'success');
        } catch (error) {
            console.error('Failed to send email:', error);
            Swal.fire('Email Error', 'Failed to send confirmation email. Please check EmailJS configuration or try again.', 'error');
        }
    }


    // --- Action Handlers (Approve/Reject/Status) ---
    volunteersContainer.addEventListener('click', async (event) => {
        const target = event.target;
        const rowWithKey = target.closest('tr[data-key]');
        if (!rowWithKey) return;

        const volunteerKey = rowWithKey.dataset.key;
        const volunteer = allApplications.find(v => v.key === volunteerKey); // Get the full volunteer data

        if (!volunteer) {
            console.warn("Volunteer data not found for key:", volunteerKey);
            Swal.fire('Error', 'Volunteer data not found.', 'error');
            return;
        }

        if (target.classList.contains('actionBtn') || target.closest('.actionBtn')) {
            showActionStatusModal(volunteerKey, volunteer); // Pass both key and data
        } else if (target.classList.contains('viewBtn') || target.closest('.viewBtn')) {
            showPreviewModal(volunteer);
        }
    });

    // --- Action Status Modal Button Handlers ---
    confirmByABBtn.addEventListener('click', () => {
        if (currentVolunteerKey && currentVolunteerData) {
            showScheduleModal();
        } else {
            Swal.fire('Error', 'No volunteer selected for this action.', 'error');
            hideActionStatusModal();
        }
    });

    cannotBeReachedBtn.addEventListener('click', async () => {
        if (!currentVolunteerKey) {
            Swal.fire('Error', 'No volunteer selected for this action.', 'error');
            hideActionStatusModal();
            return;
        }

        Swal.fire({
            title: 'Mark as "Cannot be reached"?',
            text: "This volunteer application will remain pending but marked as 'Cannot be reached'.",
            icon: 'info',
            showCancelButton: true,
            confirmButtonColor: '#3085d6',
            cancelButtonColor: '#d33',
            confirmButtonText: 'Yes, mark it'
        }).then(async (result) => {
            if (result.isConfirmed) {
                try {
                    // Update status in Firebase (optional, but good for tracking)
                    await database.ref(`volunteerApplications/pendingVolunteer/${currentVolunteerKey}/status`).set('cannotBeReached');
                    Swal.fire('Marked!', "Volunteer marked as 'Cannot be reached'.", 'success');
                    hideActionStatusModal();
                    // Data will re-render automatically due to .on('value') listener
                } catch (error) {
                    console.error("Error marking volunteer as 'Cannot be reached': ", error);
                    Swal.fire('Error', 'Failed to update volunteer status. Please try again.', 'error');
                }
            }
        });
    });

    hindiNaTutuloyBtn.addEventListener('click', () => {
        if (!currentVolunteerKey) {
            Swal.fire('Error', 'No volunteer selected for this action.', 'error');
            hideActionStatusModal();
            return;
        }

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
                    hideActionStatusModal();
                } catch (error) {
                    console.error("Error removing volunteer application: ", error);
                    Swal.fire('Error', 'Failed to remove volunteer application. Please try again.', 'error');
                }
            }
        });
    });

    directedToABVNBtn.addEventListener('click', () => {
        if (currentVolunteerKey && currentVolunteerData) {
            showEndorseABVNModal();
        } else {
            Swal.fire('Error', 'No volunteer selected for this action.', 'error');
            hideActionStatusModal();
        }
    });

    // --- Schedule Modal Form Submission ---
    scheduleForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        const scheduledDateTime = scheduleDateTimeInput.value;
        const abContactInfo = abContactInfoInput.value;

        if (!currentVolunteerKey || !currentVolunteerData) {
            Swal.fire('Error', 'No volunteer selected for scheduling.', 'error');
            hideScheduleModal();
            return;
        }

        if (!scheduledDateTime || !abContactInfo) {
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
                        scheduledDateTime: new Date(scheduledDateTime).toISOString(),
                        abContact: abContactInfo
                    });
                    // Remove from pendingVolunteer
                    await database.ref(`volunteerApplications/pendingVolunteer/${currentVolunteerKey}`).remove();

                    // Send email
                    await sendApprovalEmail(currentVolunteerData, formatDate(new Date(scheduledDateTime).toISOString()), abContactInfo);

                    Swal.fire('Scheduled & Approved!', 'Volunteer has been scheduled, approved, and confirmation email sent.', 'success');
                    hideScheduleModal();
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
            text: `Endorse volunteer to ${abvnName} (${abvnLocation})?`,
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: '#3085d6',
            cancelButtonColor: '#d33',
            confirmButtonText: 'Yes, Endorse!'
        }).then(async (result) => {
            if (result.isConfirmed) {
                try {
                    // Move to endorsedToABVN path
                    await database.ref(`volunteerApplications/endorsedToABVN/${currentVolunteerKey}`).set({
                        ...currentVolunteerData,
                        status: 'endorsedToABVN',
                        endorsedABVNKey: abvnKey,
                        endorsedABVNName: abvnName
                    });
                    // Remove from pendingVolunteer
                    await database.ref(`volunteerApplications/pendingVolunteer/${currentVolunteerKey}`).remove();

                    Swal.fire('Endorsed!', `Volunteer has been endorsed to ${abvnName}.`, 'success');
                    hideEndorseABVNModal();
                } catch (error) {
                    console.error("Error endorsing volunteer to ABVN: ", error);
                    Swal.fire('Error', 'Failed to endorse volunteer. Please try again.', 'error');
                }
            }
        });
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

    // Event listeners for modals
    closeModal.addEventListener('click', hidePreviewModal);
    previewModal.addEventListener('click', (event) => {
        if (event.target === previewModal) {
            hidePreviewModal();
        }
    });

    closeActionStatusModal.addEventListener('click', hideActionStatusModal);
    actionStatusModal.addEventListener('click', (event) => {
        if (event.target === actionStatusModal) {
            hideActionStatusModal();
        }
    });

    closeScheduleModal.addEventListener('click', hideScheduleModal);
    scheduleModal.addEventListener('click', (event) => {
        if (event.target === scheduleModal) {
            hideScheduleModal();
        }
    });

    closeEndorseABVNModal.addEventListener('click', hideEndorseABVNModal);
    endorseABVNModal.addEventListener('click', (event) => {
        if (event.target === endorseABVNModal) {
            hideEndorseABVNModal();
        }
    });
});
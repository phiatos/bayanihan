document.addEventListener("DOMContentLoaded", () => {
    // Firebase configuration
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

    // Initialize Firebase
    firebase.initializeApp(firebaseConfig);
    const database = firebase.database();
    const auth = firebase.auth();

    // EmailJS Configuration
    const publicKey = 'zQTkHE6hGtoKPZM_L';
    emailjs.init(publicKey); // Initialize with the new public key

    // DOM elements
    const tableBody = document.querySelector("#donationTable tbody");
    const searchInput = document.getElementById("searchInput");
    const sortSelect = document.getElementById("sortSelect");
    const entriesInfo = document.getElementById("entriesInfo");
    const paginationContainer = document.getElementById("pagination");
    const previewModal = document.getElementById("previewModal");
    const modalContent = document.getElementById("modalContent");
    const closeModal = document.getElementById("closeModal");

    const rowsPerPage = 10;
    let currentPage = 1;
    let allDonations = [];
    let filteredAndSortedDonations = [];
    let permissions = { canView: false, canEdit: false };

    // Check DOM elements
    if (!tableBody) console.warn('Table body (#donationTable tbody) not found in the DOM.');
    if (!searchInput) console.warn('Search input (#searchInput) not found in the DOM.');
    if (!sortSelect) console.warn('Sort select (#sortSelect) not found in the DOM.');
    if (!entriesInfo) console.warn('Entries info (#entriesInfo) not found in the DOM.');
    if (!paginationContainer) console.warn('Pagination container (#pagination) not found in the DOM.');
    if (!previewModal) console.warn('Preview modal (#previewModal) not found in the DOM.');
    if (!modalContent) console.warn('Modal content (#modalContent) not found in the DOM.');
    if (!closeModal) console.warn('Close modal button (#closeModal) not found in the DOM.');

    // Check admin permissions
    async function checkAdminPermissions() {
        const user = auth.currentUser;
        if (!user) {
            Swal.fire('Error', 'User not authenticated.', 'error');
            return { canView: false, canEdit: false };
        }
        const snapshot = await database.ref(`users/${user.uid}`).once('value');
        const userData = snapshot.val();
        const adminPosition = userData?.adminPosition || '';
        return {
            canView: ['Super Admin', 'position-one', 'position-two'].includes(adminPosition),
            canEdit: ['Super Admin', 'position-one', 'position-two'].includes(adminPosition)
        };
    }

    // Function to log errors to Firebase
    function logErrorToFirebase(error, context) {
        const errorLog = {
            message: error.message || 'No error message available',
            stack: error.stack || 'No stack trace available',
            context: context || 'Unknown context',
            timestamp: new Date().toISOString(),
            userUid: auth.currentUser ? auth.currentUser.uid : 'anonymous'
        };
        database.ref('errorLogs/pendingInkind').push(errorLog)
            .catch(err => console.error("Failed to log error to Firebase:", err));
    }

    // Function to send approval email
    function sendApprovalEmail(donationData) {
        console.log('Attempting to send approval email with data:', donationData);
        
        if (!donationData.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(donationData.email)) {
            console.error('Invalid or missing donor email:', donationData.email);
            Swal.fire('Warning', 'Cannot send approval email: Invalid or missing donor email address.', 'warning');
            logErrorToFirebase(new Error('Invalid or missing donor email'), 'sendApprovalEmail');
            return;
        }

        const donorName = donationData.name && donationData.name.trim() ? donationData.name.trim() : 'Donor';
        const templateParams = {
            to_email: donationData.email,
            donor_name: donorName,
            item_type: donationData.type || 'N/A',
            description: donationData.assistance || 'N/A',
            valuation: donationData.valuation ? `PHP ${parseFloat(donationData.valuation).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : 'PHP 0.00',
            donation_date: donationData.donationDate ? new Date(donationData.donationDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
            assignment: donationData.assignment ? `${donationData.assignment.type}: ${donationData.assignment.name} (${donationData.assignment.details})` : 'Pending manual assignment'
        };

        console.log('EmailJS send call:', { serviceID: 'service_mzpjk2a', templateID: 'template_owchxrw', templateParams });

        emailjs.send('service_mzpjk2a', 'template_owchxrw', templateParams)
            .then(() => {
                console.log('Approval email sent successfully to', donationData.email);
                Swal.fire('Success', `Approval email sent to ${donationData.email}`, 'success');
            })
            .catch(error => {
                console.error('Error sending approval email:', error);
                const errorMessage = error && typeof error === 'object' && error.message ? error.message : 'Unknown error';
                Swal.fire('Error', `Failed to send approval email: ${errorMessage}`, 'error');
                logErrorToFirebase(error, 'sendApprovalEmail');
            });
    }

    // Function to queue donation when no ABVNs or relief requests are available
    async function queueDonation(id, donationData) {
        try {
            console.log('Queuing donation ID:', id);
            const snapshot = await database.ref('pendingInkind/' + id).once('value');
            const queuedDonation = snapshot.val();
            if (!queuedDonation) {
                throw new Error('Donation data not found in pendingInkind.');
            }
            console.log('Donation data for queuing:', queuedDonation);

            queuedDonation.approvedAt = new Date().toISOString();
            queuedDonation.updatedAt = new Date().toISOString();
            queuedDonation.status = 'pendingAssignment';

            console.log('Moving donation to donations/savedDonations/inkind with pendingAssignment status...');
            await database.ref('donations/savedDonations/inkind/' + id).set(queuedDonation);
            await database.ref('pendingInkind/' + id).remove();

            console.log('Triggering approval email for queued donation...');
            sendApprovalEmail(queuedDonation);

            Swal.fire('Queued!', 'No active ABVNs or pending relief requests available. Donation has been approved and queued for manual assignment.', 'success');
        } catch (error) {
            console.error('Error queuing donation in Firebase:', error);
            Swal.fire('Error', `Failed to queue donation. Error: ${error.message}`, 'error');
            logErrorToFirebase(error, 'queueDonation');
        }
    }

    // Updated function to handle donation approval or rejection
    async function updateDonationStatus(id, donationData, newStatus) {
        if (newStatus === 'Rejected') {
            Swal.fire({
                title: 'Are you sure you want to reject this donation?',
                text: 'This will remove the donation from the pending list, keeping its current status.',
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#3085d6',
                cancelButtonColor: '#d33',
                confirmButtonText: 'Yes, reject it!',
                customClass: {
                    confirmButton: 'my-confirm-button-class',
                    cancelButton: 'my-cancel-button-class'
                }
            }).then(async (result) => {
                if (result.isConfirmed) {
                    try {
                        console.log('Rejecting donation ID:', id);
                        await database.ref('pendingInkind/' + id).remove();
                        Swal.fire('Rejected!', 'Donation has been rejected.', 'success');
                    } catch (error) {
                        console.error('Error rejecting donation in Firebase:', error);
                        Swal.fire('Error', `Failed to reject donation. Error: ${error.message}`, 'error');
                        logErrorToFirebase(error, 'rejectDonation');
                    }
                }
            });
            return;
        }

        try {
            if (auth && !auth.currentUser) {
                console.error('No authenticated user detected. Firebase rules require authentication.');
                Swal.fire('Error', 'You must be logged in to access ABVNs and relief requests. Please log in and try again.', 'error');
                window.location.href = '../pages/login.html';
                return;
            }
            console.log('Authenticated user:', auth ? auth.currentUser?.uid : 'No auth required');

            console.log('Fetching active ABVNs from Firebase...');
            const abvnSnapshot = await database.ref('activations').orderByChild('status').equalTo('active').once('value');
            const abvns = abvnSnapshot.val();
            console.log('ABVN snapshot:', abvns);

            console.log('Fetching pending relief requests from Firebase...');
            const reliefSnapshot = await database.ref('requestRelief/requests').orderByChild('status').equalTo('Pending').once('value');
            const reliefRequests = reliefSnapshot.val();
            console.log('Relief requests snapshot:', reliefRequests);

            const options = [];

            if (abvns) {
                for (let key in abvns) {
                    if (abvns.hasOwnProperty(key)) {
                        const abvn = abvns[key];
                        console.log(`Processing ABVN ${key}:`, abvn);
                        options.push({
                            type: 'ABVN',
                            id: key,
                            name: abvn.organization || 'Unknown',
                            details: abvn.areaOfOperation || 'N/A',
                            display: `
                                <strong>ABVN: ${abvn.organization || 'Unknown'}</strong><br>
                                <p>Area of Operation: ${abvn.areaOfOperation || 'N/A'}</p>
                            `
                        });
                    }
                }
            }

            if (reliefRequests) {
                for (let key in reliefRequests) {
                    if (reliefRequests.hasOwnProperty(key)) {
                        const request = reliefRequests[key];
                        console.log(`Processing relief request ${key}:`, request);
                        const itemsList = (request.items || []).map(i => `${i.name} (Qty: ${i.quantity})`).join(', ');
                        options.push({
                            type: 'Relief Request',
                            id: key,
                            name: request.volunteerOrganization || 'Unknown',
                            details: request.category || 'N/A',
                            reliefData: request,
                            display: `
                                <strong>Relief Request: ${request.id || 'N/A'}</strong><br>
                                <p><strong>Volunteer Group:</strong> ${request.volunteerOrganization || 'N/A'}</p>
                                <p><strong>Category:</strong> ${request.category || 'N/A'}</p>
                                <p><strong>Items Requested:</strong> ${itemsList || 'N/A'}</p>
                                <p><strong>Drop-off Address:</strong> ${request.address || 'N/A'}</p>
                                <p><strong>Contact Person:</strong> ${request.contactPerson || 'N/A'}</p>
                                <p><strong>Contact Number:</strong> ${request.contactNumber || 'N/A'}</p>
                            `
                        });
                    }
                }
            } else {
                console.warn('No relief requests found or access denied.');
            }

            console.log('Processed options (ABVNs and relief requests):', options);

            if (options.length === 0) {
                console.error('No active ABVNs or pending relief requests found.');
                Swal.fire({
                    title: 'No Options Available',
                    text: 'No active volunteer networks or pending relief requests are available. Would you like to queue the donation for manual assignment later?',
                    icon: 'warning',
                    showCancelButton: true,
                    confirmButtonColor: '#3085d6',
                    cancelButtonColor: '#d33',
                    confirmButtonText: 'Queue Donation',
                    cancelButtonText: 'Cancel'
                }).then(async (result) => {
                    if (result.isConfirmed) {
                        await queueDonation(id, donationData);
                    }
                });
                return;
            }

            options.sort((a, b) => a.name.localeCompare(b.name));
            console.log('Sorted options:', options);

            const selectOptions = options.map(option => {
                return `<option value="${option.type}:${option.id}">${option.type}: ${option.name} (${option.details})</option>`;
            }).join('');

            let selectedOptionDisplay = '';
            function updateDetailsDisplay(selectedValue) {
                if (!selectedValue) {
                    selectedOptionDisplay = '<p>Please select an option to view details.</p>';
                } else {
                    const [type, selectedId] = selectedValue.split(':');
                    const option = options.find(opt => opt.type === type && opt.id === selectedId);
                    selectedOptionDisplay = option ? option.display : '<p>Details not available for this selection.</p>';
                }
                const detailsElement = document.getElementById('assignmentDetails');
                if (detailsElement) {
                    detailsElement.innerHTML = selectedOptionDisplay;
                } else {
                    console.error('Assignment details element not found in DOM.');
                }
            }

            Swal.fire({
                title: 'Assign Donation',
                html: `
                    <p>Select an active volunteer network or pending relief request:</p>
                    <select id="assignmentSelect" style="width: 100%; padding: 8px;">
                        <option value="" selected>-- Select an option --</option>
                        ${selectOptions}
                    </select>
                    <div id="assignmentDetails" style="margin-top: 10px; max-height: 200px; overflow-y: auto; text-align: left;">
                        <p>Please select an option to view details.</p>
                    </div>
                `,
                icon: 'info',
                showCancelButton: true,
                confirmButtonText: 'Confirm Selection',
                cancelButtonText: 'Cancel',
                didOpen: () => {
                    console.log('Options available:', options);
                    const select = document.getElementById('assignmentSelect');
                    if (options.length > 0) {
                        select.value = `${options[0].type}:${options[0].id}`;
                        updateDetailsDisplay(select.value);
                    }
                    select.addEventListener('change', () => {
                        updateDetailsDisplay(select.value);
                    });
                },
                preConfirm: () => {
                    const selectedValue = document.getElementById('assignmentSelect').value;
                    if (!selectedValue) {
                        Swal.showValidationMessage('Please select an option.');
                        return false;
                    }
                    return selectedValue;
                }
            }).then(async (result) => {
                if (result.isConfirmed) {
                    const [type, selectedId] = result.value.split(':');
                    const selectedOption = options.find(opt => opt.type === type && opt.id === selectedId);
                    console.log('Selected option:', selectedOption);

                    let reliefDetails = '';
                    if (type === 'Relief Request' && selectedOption.reliefData) {
                        const reliefData = selectedOption.reliefData;
                        const itemsList = (reliefData.items || []).map(i => `${i.name} (Qty: ${i.quantity})`).join(', ');
                        reliefDetails = `
                            <h3>Assigned Relief Request Details:</h3>
                            <p><strong>Relief ID:</strong> ${reliefData.id || 'N/A'}</p>
                            <p><strong>Volunteer Group:</strong> ${reliefData.volunteerOrganization || 'N/A'}</p>
                            <p><strong>Category:</strong> ${reliefData.category || 'N/A'}</p>
                            <p><strong>Items Requested:</strong> ${itemsList || 'N/A'}</p>
                            <p><strong>Drop-off Address:</strong> ${reliefData.address || 'N/A'}</p>
                            <p><strong>Contact Person:</strong> ${reliefData.contactPerson || 'N/A'}</p>
                            <p><strong>Contact Number:</strong> ${reliefData.contactNumber || 'N/A'}</p>
                        `;
                    } else {
                        reliefDetails = `<p><strong>Assigned to:</strong> ${selectedOption.type}: ${selectedOption.name} (${selectedOption.details})</p>`;
                    }

                    const confirmResult = await Swal.fire({
                        title: `Assign to ${selectedOption.name}?`,
                        html: `
                            <p>The donation will be assigned to ${selectedOption.type}: ${selectedOption.name} (${selectedOption.details}). Proceed with approval?</p>
                            ${reliefDetails}
                        `,
                        icon: 'question',
                        showCancelButton: true,
                        confirmButtonColor: '#3085d6',
                        cancelButtonColor: '#d33',
                        confirmButtonText: 'Yes, approve it!'
                    });

                    if (confirmResult.isConfirmed) {
                        try {
                            console.log('Fetching donation data for ID:', id);
                            const snapshot = await database.ref('pendingInkind/' + id).once('value');
                            const approvedDonation = snapshot.val();
                            if (!approvedDonation) {
                                throw new Error('Donation data not found in pendingInkind.');
                            }
                            console.log('Donation data:', approvedDonation);

                            approvedDonation.approvedAt = new Date().toISOString();
                            approvedDonation.updatedAt = new Date().toISOString();
                            approvedDonation.status = 'Approved';
                            approvedDonation.assignment = {
                                type: selectedOption.type,
                                id: selectedId,
                                name: selectedOption.name,
                                details: selectedOption.details
                            };

                            console.log('Moving donation to donations/savedDonations/inkind and removing from pendingInkind...');
                            await database.ref('donations/savedDonations/inkind/' + id).set(approvedDonation);
                            await database.ref('pendingInkind/' + id).remove();

                            if (type === 'Relief Request') {
                                console.log('Updating relief request status to Completed for ID:', selectedId);
                                await database.ref(`requestRelief/requests/${selectedId}`).update({
                                    status: 'Completed',
                                    updatedAt: new Date().toISOString()
                                });
                            }

                            console.log('Triggering approval email...');
                            sendApprovalEmail(approvedDonation);

                            // Notify ABVN group if assigned to ABVN
                            if (type === 'ABVN') {
                                const abvnNotification = {
                                    type: "abvn_endorsed",
                                    message: `A donation has been assigned to ${selectedOption.name}.`,
                                    abvnGroup: selectedOption.name,
                                    timestamp: new Date().toISOString(),
                                    read: false,
                                    identifier: `abvn_endorsed_${id}_${Date.now()}`
                                };
                                await database.ref("notifications").push(abvnNotification).catch(error => {
                                    console.error("Error sending ABVN notification:", error);
                                    Swal.fire('Error', `Failed to notify ABVN group. Error: ${error.message}`, 'error');
                                    logErrorToFirebase(error, 'sendABVNNotification');
                                });
                            }

                            // Notify approving admin (optional, kept for consistency)
                            const approvalNotification = {
                                type: "donation_approved",
                                message: `The donation from ${approvedDonation.name || 'an anonymous donor'} has been approved and assigned to ${selectedOption.type}: ${selectedOption.name}.`,
                                approverUid: auth.currentUser.uid,
                                timestamp: new Date().toISOString(),
                                read: false,
                                identifier: `donation_approved_${id}_${Date.now()}`
                            };
                            await database.ref("notifications").push(approvalNotification).catch(error => {
                                console.error("Error sending approval notification:", error);
                                Swal.fire('Error', `Failed to notify admin. Error: ${error.message}`, 'error');
                                logErrorToFirebase(error, 'sendApprovalNotification');
                            });

                            Swal.fire({
                                title: 'Approved!',
                                html: `
                                    <p>Donation has been approved and assigned to ${selectedOption.type}: ${selectedOption.name}.</p>
                                    ${reliefDetails}
                                `,
                                icon: 'success'
                            });
                        } catch (error) {
                            console.error('Error approving donation in Firebase:', error);
                            Swal.fire('Error', `Failed to approve donation. Error: ${error.message}`, 'error');
                            logErrorToFirebase(error, 'approveDonation');
                        }
                    }
                }
            });
        } catch (error) {
            console.error('Error fetching ABVNs or relief requests:', error);
            Swal.fire('Error', `Failed to load assignment options. Error: ${error.message}`, 'error');
            logErrorToFirebase(error, 'fetchAssignmentOptions');
        }
    }

    // Load donations from Firebase
    function loadDonationsFromFirebase() {
        database.ref('pendingInkind').on('value', (snapshot) => {
            allDonations = [];
            const data = snapshot.val();
            if (data) {
                Object.keys(data).forEach((key) => {
                    const donation = data[key];
                    allDonations.push({
                        id: key,
                        encoder: donation.encoder || 'N/A',
                        name: donation.name || 'N/A',
                        type: donation.type || 'N/A',
                        address: donation.address || 'N/A',
                        contactPerson: donation.contactPerson || 'N/A',
                        number: donation.number || 'N/A',
                        email: donation.email || 'N/A',
                        assistance: donation.assistance || 'N/A',
                        valuation: donation.valuation || 0,
                        additionalnotes: donation.additionalnotes || 'N/A',
                        status: donation.status || 'Pending',
                        staffIncharge: donation.staffIncharge || 'N/A',
                        donationDate: donation.donationDate || 'N/A',
                        createdAt: donation.createdAt || 'N/A'
                    });
                });
            }
            filteredAndSortedDonations = [...allDonations];
            applySorting(filteredAndSortedDonations, sortSelect?.value || '');
            renderTable();
        }, (error) => {
            console.error('Error loading donations:', error);
            Swal.fire('Error', `Failed to load donations: ${error.message}`, 'error');
            logErrorToFirebase(error, 'loadDonations');
        });
    }

    // Render table
    function renderTable() {
        if (!tableBody) return;
        tableBody.innerHTML = '';
        const startIndex = (currentPage - 1) * rowsPerPage;
        const endIndex = startIndex + rowsPerPage;
        const currentRows = filteredAndSortedDonations.slice(startIndex, endIndex);

        if (currentRows.length === 0) {
            tableBody.innerHTML = `<tr><td colspan="15" style="text-align: center;">No pending donations found.</td></tr>`;
        } else {
            currentRows.forEach((donation, index) => {
                const row = tableBody.insertRow();
                row.innerHTML = `
                    <td>${startIndex + index + 1}</td>
                    <td>${donation.encoder}</td>
                    <td>${donation.name}</td>
                    <td>${donation.type}</td>
                    <td>${donation.address}</td>
                    <td>${donation.contactPerson}</td>
                    <td>${donation.number}</td>
                    <td>${donation.email}</td>
                    <td>${donation.assistance}</td>
                    <td>₱${parseFloat(donation.valuation || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    <td>${donation.additionalnotes}</td>
                    <td>${donation.status}</td>
                    <td>${donation.staffIncharge}</td>
                    <td>${donation.donationDate ? new Date(donation.donationDate).toLocaleDateString('en-PH') : 'N/A'}</td>
                    <td>
                        <button class="viewBtn"><i class='bx bx-show-alt'></i></button>
                        ${permissions.canEdit ? `
                            <button class="approveBtn"><i class='bx bx-check-circle'></i></button>
                            <button class="rejectBtn"><i class='bx bx-x-circle'></i></button>
                        ` : ''}
                    </td>
                `;
                const viewBtn = row.querySelector('.viewBtn');
                if (viewBtn) viewBtn.addEventListener('click', () => showPreviewModal(donation));
                if (permissions.canEdit) {
                    const approveBtn = row.querySelector('.approveBtn');
                    const rejectBtn = row.querySelector('.rejectBtn');
                    if (approveBtn) approveBtn.addEventListener('click', () => updateDonationStatus(donation.id, donation, 'Approved'));
                    if (rejectBtn) approveBtn.addEventListener('click', () => updateDonationStatus(donation.id, donation, 'Rejected'));
                }
            });
        }

        updatePaginationInfo();
        renderPagination();
    }

    // Update pagination info
    function updatePaginationInfo() {
        if (!entriesInfo) return;
        const totalEntries = filteredAndSortedDonations.length;
        const startEntry = (currentPage - 1) * rowsPerPage + 1;
        const endEntry = Math.min(currentPage * rowsPerPage, totalEntries);
        entriesInfo.textContent = `Showing ${startEntry} to ${endEntry} of ${totalEntries} entries`;
        if (totalEntries === 0) {
            entriesInfo.textContent = `Showing 0 to 0 of 0 entries`;
        }
    }

    // Render pagination
    function renderPagination() {
        if (!paginationContainer) return;
        paginationContainer.innerHTML = '';
        const totalPages = Math.ceil(filteredAndSortedDonations.length / rowsPerPage);

        if (totalPages === 0) {
            paginationContainer.innerHTML = '<span>No entries to display</span>';
            return;
        }

        const createPaginationButton = (label, page, disabled = false, isActive = false) => {
            const btn = document.createElement('button');
            btn.textContent = label;
            if (disabled) btn.disabled = true;
            if (isActive) btn.classList.add('active-page');
            btn.addEventListener('click', () => {
                if (!disabled) {
                    currentPage = page;
                    renderTable();
                }
            });
            return btn;
        };

        paginationContainer.appendChild(createPaginationButton('Prev', Math.max(1, currentPage - 1), currentPage === 1));

        const maxVisible = 5;
        let startPage = Math.max(1, currentPage - Math.floor(maxVisible / 2));
        let endPage = Math.min(totalPages, startPage + maxVisible - 1);
        if (endPage - startPage < maxVisible - 1) {
            startPage = Math.max(1, endPage - maxVisible + 1);
        }

        for (let i = startPage; i <= endPage; i++) {
            paginationContainer.appendChild(createPaginationButton(i, i, false, i === currentPage));
        }

        paginationContainer.appendChild(createPaginationButton('Next', Math.min(totalPages, currentPage + 1), currentPage === totalPages));
    }

    // Search functionality
    if (searchInput) {
        searchInput.addEventListener('input', () => {
            const searchTerm = searchInput.value.toLowerCase();
            const currentSort = sortSelect?.value || '';

            filteredAndSortedDonations = allDonations.filter(d => {
                if (currentSort.includes('encoder')) return (d.encoder || '').toLowerCase().includes(searchTerm);
                if (currentSort.includes('name')) return (d.name || '').toLowerCase().includes(searchTerm);
                if (currentSort.includes('type')) return (d.type || '').toLowerCase().includes(searchTerm);
                if (currentSort.includes('address')) return (d.address || '').toLowerCase().includes(searchTerm);
                if (currentSort.includes('contactPerson')) return (d.contactPerson || '').toLowerCase().includes(searchTerm);
                if (currentSort.includes('number')) return (d.number || '').includes(searchTerm);
                if (currentSort.includes('email')) return (d.email || '').toLowerCase().includes(searchTerm);
                if (currentSort.includes('assistance')) return (d.assistance || '').toLowerCase().includes(searchTerm);
                if (currentSort.includes('valuation')) return String(d.valuation || '').includes(searchTerm);
                if (currentSort.includes('notes')) return (d.additionalnotes || '').toLowerCase().includes(searchTerm);
                if (currentSort.includes('status')) return (d.status || '').toLowerCase().includes(searchTerm);
                if (currentSort.includes('staffIncharge')) return (d.staffIncharge || '').toLowerCase().includes(searchTerm);
                if (currentSort.includes('donationDate')) return (d.donationDate || '').toLowerCase().includes(searchTerm);

                return (d.encoder || '').toLowerCase().includes(searchTerm) ||
                       (d.name || '').toLowerCase().includes(searchTerm) ||
                       (d.type || '').toLowerCase().includes(searchTerm) ||
                       (d.address || '').toLowerCase().includes(searchTerm) ||
                       (d.contactPerson || '').toLowerCase().includes(searchTerm) ||
                       (d.number || '').includes(searchTerm) ||
                       (d.email || '').toLowerCase().includes(searchTerm) ||
                       (d.assistance || '').toLowerCase().includes(searchTerm) ||
                       String(d.valuation || '').includes(searchTerm) ||
                       (d.additionalnotes || '').toLowerCase().includes(searchTerm) ||
                       (d.status || '').toLowerCase().includes(searchTerm) ||
                       (d.staffIncharge || '').toLowerCase().includes(searchTerm) ||
                       (d.donationDate || '').toLowerCase().includes(searchTerm);
            });

            currentPage = 1;
            renderTable();
        });
    }

    // Sort functionality
    if (sortSelect) {
        sortSelect.addEventListener('change', () => {
            applySorting(filteredAndSortedDonations, sortSelect.value);
            renderTable();
        });
    }

    function applySorting(arr, sortVal) {
        if (sortVal === 'donationDrive-asc') arr.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
        else if (sortVal === 'donationDrive-desc') arr.sort((a, b) => (b.name || '').localeCompare(a.name || ''));
        else if (sortVal === 'contactPerson-asc') arr.sort((a, b) => (a.contactPerson || '').localeCompare(b.contactPerson || ''));
        else if (sortVal === 'contactPerson-desc') arr.sort((a, b) => (b.contactPerson || '').localeCompare(a.contactPerson || ''));
        else if (sortVal === 'accountName-asc') arr.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
        else if (sortVal === 'accountName-desc') arr.sort((a, b) => (b.name || '').localeCompare(a.name || ''));
        else if (sortVal === 'dropOff-asc') arr.sort((a, b) => (a.address || '').localeCompare(b.address || ''));
        else if (sortVal === 'dropOff-desc') arr.sort((a, b) => (b.address || '').localeCompare(a.address || ''));
    }

    // Show preview modal
    function showPreviewModal(donation) {
        if (!modalContent || !previewModal) return;
        modalContent.innerHTML = `
            <div class="modal-content-inner" style="padding: 20px;">
                <h2>Donor Information:</h2>
                <p><strong>Encoder:</strong> ${donation.encoder}</p>
                <p><strong>Name:</strong> ${donation.name}</p>
                <p><strong>Type:</strong> ${donation.type}</p>
                <p><strong>Address:</strong> ${donation.address}</p>
                <p><strong>Contact Person:</strong> ${donation.contactPerson}</p>
                <p><strong>Number:</strong> ${donation.number}</p>
                <p><strong>Email:</strong> ${donation.email}</p>
                <hr>
                <h2>Donation Details:</h2>
                <p><strong>Assistance:</strong> ${donation.assistance}</p>
                <p><strong>Valuation:</strong> ₱${parseFloat(donation.valuation || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                <p><strong>Additional Notes:</strong> ${donation.additionalnotes}</p>
                <p><strong>Status:</strong> ${donation.status}</p>
                <p><strong>Staff-In-Charge:</strong> ${donation.staffIncharge}</p>
                <p><strong>Donation Date:</strong> ${donation.donationDate ? new Date(donation.donationDate).toLocaleDateString('en-PH') : 'N/A'}</p>
                <p><strong>Recorded On:</strong> ${donation.createdAt ? new Date(donation.createdAt).toLocaleString('en-PH') : 'N/A'}</p>
            </div>
        `;
        previewModal.style.display = 'flex';
    }

    // Close preview modal
    if (closeModal) {
        closeModal.addEventListener('click', () => {
            if (previewModal && modalContent) {
                previewModal.style.display = 'none';
                modalContent.innerHTML = '';
            }
        });
    }

    // Authentication state listener
    auth.onAuthStateChanged(async (user) => {
        if (!user) {
            Swal.fire('Authentication Required', 'Please sign in to access pending in-kind donations.', 'error').then(() => {
                window.location.href = '../pages/login.html';
            });
            return;
        }
        permissions = await checkAdminPermissions();
        if (!permissions.canView) {
            Swal.fire('Access Denied', 'You do not have permission to access this page.', 'error').then(() => {
                window.location.href = '../pages/login.html';
            });
            return;
        }
        loadDonationsFromFirebase();
    });
});
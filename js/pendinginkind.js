document.addEventListener("DOMContentLoaded", () => {
    // Firebase configuration (Note: Consider moving to environment variables for security)
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
    if (typeof firebase === 'undefined') {
        console.error('Firebase SDK not loaded.');
        alert('Firebase SDK is not loaded. Please check your script inclusion.');
        return;
    }
    firebase.initializeApp(firebaseConfig);
    const database = firebase.database();
    const auth = firebase.auth();

    // EmailJS Configuration
    const publicKey = 'zQTkHE6hGtoKPZM_L';
    if (typeof emailjs === 'undefined') {
        console.error('EmailJS SDK not loaded.');
        alert('EmailJS SDK is not loaded. Please check your script inclusion.');
        return;
    }
    emailjs.init(publicKey);

    // DOM elements
    const tableBody = document.querySelector("#donationTable tbody");
    const searchInput = document.getElementById("searchInput");
    const sortSelect = document.getElementById("sortSelect");
    const entriesInfo = document.getElementById("entriesInfo");
    const paginationContainer = document.getElementById("pagination");
    const previewModal = document.getElementById("previewModal");
    const modalContent = document.getElementById("modalContent");
    const closeModal = document.getElementById("closeModal");
    const viewApprovedBtn = document.getElementById('viewApprovedBtn');

    const viewArchivedBtn = document.getElementById("viewArchived");
    const archivedTableBody = document.querySelector('#archivedTable tbody');
    const archivedEntriesInfo = document.getElementById('archivedEntriesInfo');
    const archivedPaginationContainer = document.getElementById("archivedPagination");
    const closeArchivedModalBtn = document.getElementById("closeArchivedModalBtn");

    // Check DOM elements
    if (!tableBody) console.warn('Table body (#donationTable tbody) not found in the DOM.');
    if (!searchInput) console.warn('Search input (#searchInput) not found in the DOM.');
    if (!sortSelect) console.warn('Sort select (#sortSelect) not found in the DOM.');
    if (!entriesInfo) console.warn('Entries info (#entriesInfo) not found in the DOM.');
    if (!paginationContainer) console.warn('Pagination container (#pagination) not found in the DOM.');
    if (!previewModal) console.warn('Preview modal (#previewModal) not found in the DOM.');
    if (!modalContent) console.warn('Modal content (#modalContent) not found in the DOM.');
    if (!closeModal) console.warn('Close modal button (#closeModal) not found in the DOM.');

    // Check SweetAlert2
    if (typeof Swal === 'undefined') {
        console.error('SweetAlert2 not loaded.');
        alert('SweetAlert2 is not loaded. Please check your script inclusion.');
        return;
    }

    viewApprovedBtn.addEventListener('click', () => {
        window.location.href = '../pages/pendingmonetary.html';
    });

    let allArchivedDonations = [];
    let filteredAndSortedArchivedDonations = [];
    let archivedCurrentPage = 1;
    const rowsPerPage = 10;
    let currentPage = 1;
    let allDonations = [];
    let filteredAndSortedDonations = [];
    let permissions = { canView: false, canEdit: false, canArchive: false, canRetrieve: false };
    let isAdminVerified = false;


    // Check admin permissions
    async function checkAdminPermissions() {
        try {
            const user = auth.currentUser;
            if (!user) {
                console.log('No authenticated user found');
                return { canView: false, canEdit: false, canArchive: false, canRetrieve: false };
            }
            console.log('Checking permissions for user:', user.uid); // Debug log
            const snapshot = await database.ref(`users/${user.uid}`).once('value');
            const userData = snapshot.val();
            console.log('User data from database:', userData); // Debug log
            const adminPosition = userData?.adminPosition || null;
            console.log('Admin position:', adminPosition); // Debug log

            const permissions = {
                canView: false,
                canEdit: false,
                canArchive: false,
                canRetrieve: false,
            };

            if (['Super Admin', 'position-one', 'position-two'].includes(adminPosition)) {
                permissions.canView = true;
                permissions.canEdit = true;
            }

            if (['Super Admin', 'position-one'].includes(adminPosition)) {
                permissions.canArchive = true;
                permissions.canRetrieve = true;
            }

            console.log('Computed permissions:', permissions); // Debug log
            return permissions;
        } catch (error) {
            console.error('Error checking admin permissions:', error);
            return { canView: false, canEdit: false, canArchive: false, canRetrieve: false };
        }
    }

    // === Add verifySuperAdminPassword function ===
    async function verifySuperAdminPassword() {
        const { value: password } = await Swal.fire({
            title: 'Enter Admin Password',
            input: 'password',
            inputPlaceholder: 'Enter password here',
            inputAttributes: {
            autocapitalize: 'off',
            autocorrect: 'off',
            autocomplete: 'new-password',
            },
            showCancelButton: true,
            confirmButtonText: 'Verify',
            showLoaderOnConfirm: true,
            reverseButtons: true,
            focusCancel: true,
            inputValidator: (value) => !value && 'Password is required!',
            customClass: {
            popup: 'custom-swal-popup-small',
            title: 'custom-swal-title',
            htmlContainer: 'custom-swal-content',
            confirmButton: 'custom-confirm-btn',
            cancelButton: 'custom-cancel-btn',
            },
        });

        if (!password) {
            isAdminVerified = false;
            showErrorAlert('Verification Failed', 'Invalid admin password.');
            return false;
        }

        try {
            const user = auth.currentUser;
            const credential = firebase.auth.EmailAuthProvider.credential(user.email, password);
            await user.reauthenticateWithCredential(credential);
            console.log('Admin password verified successfully.');
            isAdminVerified = true;
            return true;
        } catch (error) {
            console.error('Password verification failed:', error);
            showErrorAlert('Verification Failed', 'Invalid admin password.');
            isAdminVerified = false;
            return false;
        }
    }

    function showErrorAlert(title, text, callback = null) {
        Swal.fire({
            icon: 'error',
            title,
            text,
            timer: 1600,
            showConfirmButton: false,
            timerProgressBar: true,
            allowOutsideClick: false,
            customClass: {
            popup: 'swal2-popup-error-clean',
            title: 'swal2-title-error-clean',
            htmlContainer: 'swal2-text-error-clean',
            },
        }).then(callback);
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
        database.ref('errorLogs/donations/pending/inkind').push(errorLog)
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
            const snapshot = await database.ref('donations/pending/inkind/' + id).once('value');
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
            await database.ref('donations/pending/inkind/' + id).remove();

            console.log('Triggering approval email for queued donation...');
            sendApprovalEmail(queuedDonation);

            Swal.fire('Queued!', 'No active ABVNs or pending relief requests available. Donation has been approved and queued for manual assignment.', 'success');
        } catch (error) {
            console.error('Error queuing donation in Firebase:', error);
            Swal.fire('Error', `Failed to queue donation. Error: ${error.message}`, 'error');
            logErrorToFirebase(error, 'queueDonation');
        }
    }

    async function retrieveDonation(id, donationData) {
    console.log('retrieveDonation called with ID:', id, 'Data:', donationData); // Debug log
    const permissions = await checkAdminPermissions();
    console.log('Permissions in retrieveDonation:', permissions); // Debug log
    if (!permissions.canRetrieve) {
        console.log('Access denied: User lacks retrieve permissions'); // Debug log
        Swal.fire({
            title: 'Access Denied',
            text: 'You do not have permission to retrieve donations.',
            icon: 'error',
            timer: 1600,
            showConfirmButton: false,
            timerProgressBar: true,
            allowOutsideClick: false,
            customClass: {
                popup: 'swal2-popup-error-clean',
                title: 'swal2-title-error-clean',
                htmlContainer: 'swal2-text-error-clean',
            },
        });
        return;
    }

    Swal.fire({
        title: 'Retrieve Donation?',
        text: `This will move the in-kind donation from ${donationData.name || 'Unknown'} back to pending donations.`,
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: 'Retrieve',
        cancelButtonText: 'Cancel',
        reverseButtons: true,
        focusCancel: true,
        allowOutsideClick: false,
        customClass: {
            popup: 'custom-swal-popup-small',
            title: 'custom-swal-title',
            htmlContainer: 'custom-swal-content',
            confirmButton: 'custom-confirm-btn',
            cancelButton: 'custom-cancel-btn',
        },
    }).then(async (result) => {
        if (result.isConfirmed) {
            console.log('User confirmed retrieval for donation ID:', id); // Debug log
            try {
                if (!navigator.onLine) {
                    throw new Error("No internet connection. Please check your network.");
                }
                const archivedRef = database.ref(`donations/pending/archivedDonations/inkind/${id}`);
                console.log('Fetching archived donation from:', archivedRef.toString()); // Debug log
                const snapshot = await archivedRef.once('value');
                const archivedDonation = snapshot.val();
                console.log('Archived donation data:', archivedDonation); // Debug log

                if (!archivedDonation || !archivedDonation.id) {
                    throw new Error("Archived donation data not found or invalid.");
                }

                const { archivedTimestamp, archivedBy, archiveReason, rejectedAt, ...restoredDonation } = archivedDonation;
                const updatedDonation = {
                    ...restoredDonation,
                    status: 'Pending',
                    retrievedTimestamp: Date.now(),
                    retrievedBy: auth.currentUser?.adminPosition || 'Unknown',
                };
                console.log('Restored donation data:', updatedDonation); // Debug log

                await database.ref(`donations/pending/inkind/${id}`).set(updatedDonation);
                console.log('Donation restored to pending/inkind'); // Debug log
                await archivedRef.remove();
                console.log('Donation removed from archivedDonations'); // Debug log
                const checkSnapshot = await archivedRef.once('value');
                if (checkSnapshot.exists()) {
                    throw new Error("Failed to delete donation from donations/pending/archivedDonations/inkind.");
                }

                const message = `In-kind donation from "${archivedDonation.name || 'Unknown'}" retrieved by ${auth.currentUser?.adminPosition || 'Unknown'} from ${localStorage.getItem('organization') || 'Unknown Group'} on ${new Date().toLocaleDateString('en-US')}. Status reset to pending.`;
                await database.ref('notifications').push({
                    message,
                    userId: auth.currentUser?.uid || null,
                    userEmail: auth.currentUser?.email || null,
                    userName: auth.currentUser?.displayName || null,
                    donationId: id,
                    donorName: archivedDonation.name || 'Unknown',
                    organization: localStorage.getItem('organization') || 'Unknown Group',
                    timestamp: Date.now(),
                });
                console.log('Notification pushed for retrieval'); // Debug log

                // Force refresh donations
                allDonations.push({ id, ...updatedDonation });
                filteredAndSortedDonations = [...allDonations];
                applySorting(filteredAndSortedDonations, sortSelect?.value || '');
                renderTable();
                console.log('Main table refreshed'); // Debug log

                // Update archived donations
                allArchivedDonations = allArchivedDonations.filter((d) => d.id !== id);
                filteredAndSortedArchivedDonations = [...allArchivedDonations];
                renderArchivedTable();
                console.log('Archived table refreshed'); // Debug log

                Swal.fire({
                    icon: 'success',
                    title: 'Retrieved!',
                    text: 'The donation has been restored to pending in-kind donations with status reset to pending.',
                    timer: 1600,
                    showConfirmButton: false,
                    timerProgressBar: true,
                    allowOutsideClick: false,
                    customClass: {
                        popup: 'swal2-popup-success-clean',
                        title: 'swal2-title-success-clean',
                        htmlContainer: 'swal2-text-success-clean',
                    },
                });
                if (document.getElementById('archivedModal')) {
                    document.getElementById('archivedModal').style.display = 'none';
                }
                console.log('Retrieval completed successfully'); // Debug log
            } catch (error) {
                console.error("Error retrieving donation:", error);
                Swal.fire({
                    title: 'Error',
                    text: `Failed to retrieve donation: ${error.message}`,
                    icon: 'error',
                    confirmButtonText: 'OK',
                    allowOutsideClick: false,
                    customClass: {
                        popup: 'swal2-popup-error-clean',
                        title: 'swal2-title-error-clean',
                        htmlContainer: 'swal2-text-error-clean',
                        confirmButton: 'my-error-button',
                    },
                });
                logErrorToFirebase(error, 'retrieveDonation');
            }
        }
    });
}
    
    // Updated function to handle donation approval or rejection
    async function updateDonationStatus(id, donationData, newStatus) {
        if (newStatus === 'Rejected') {
            Swal.fire({
                title: 'Are you sure to reject this application?',
                text: 'This will move it to archived records.',
                icon: 'warning',
                showCancelButton: true,
                confirmButtonText: 'Reject',
                customClass: {
                    popup: 'custom-swal-popup-small',
                    title: 'custom-swal-title',
                    htmlContainer: 'custom-swal-content',
                    confirmButton: 'custom-confirm-btn',
                    cancelButton: 'custom-cancel-btn',
                }
            }).then(async (result) => {
                if (result.isConfirmed) {
                    try {
                        console.log('Rejecting donation ID:', id);
                        const donationRef = database.ref('donations/pending/inkind/' + id);
                        const snapshot = await donationRef.once('value');
                        const donation = snapshot.val();
                        if (!donation || !donation.id) {
                            throw new Error("Donation data not found or invalid.");
                        }

                        const archivedDonation = {
                            ...donation,
                            status: 'Rejected',
                            archivedTimestamp: Date.now(),
                            archivedBy: auth.currentUser?.adminPosition || 'Unknown',
                            archiveReason: 'Rejected by user'
                        };

                        await database.ref(`donations/pending/archivedDonations/inkind/${id}`).set(archivedDonation);
                        await donationRef.remove();
                        const checkSnapshot = await donationRef.once('value');
                        if (checkSnapshot.exists()) {
                            throw new Error("Failed to delete donation from donations/pending/inkind.");
                        }

                        const message = `In-kind donation from "${donation.name || 'Unknown'}" rejected and archived by ${auth.currentUser?.adminPosition || 'Unknown'} from ${localStorage.getItem('organization') || 'Unknown Group'} on ${new Date().toLocaleDateString('en-US')}.`;
                        await database.ref('notifications').push({
                            message,
                            userId: auth.currentUser?.uid || null,
                            userEmail: auth.currentUser?.email || null,
                            userName: auth.currentUser?.displayName || null,
                            donationId: id,
                            donorName: donation.name || 'Unknown',
                            organization: localStorage.getItem('organization') || 'Unknown Group',
                            timestamp: Date.now()
                        });

                        // Force refresh donations
                        allDonations = allDonations.filter(d => d.id !== id);
                        filteredAndSortedDonations = filteredAndSortedDonations.filter(d => d.id !== id);
                        renderTable();

                        // Update archived donations
                        const archivedSnapshot = await database.ref('donations/pending/archivedDonations/inkind').once('value');
                        const archivedDonationsObject = archivedSnapshot.val();
                        allArchivedDonations = [];
                        if (archivedDonationsObject) {
                            Object.keys(archivedDonationsObject).forEach(key => {
                                const donation = archivedDonationsObject[key];
                                if (donation && typeof donation === 'object' && key) {
                                    allArchivedDonations.push({ id: key, ...donation });
                                }
                            });
                        }
                        filteredAndSortedArchivedDonations = [...allArchivedDonations];
                        renderArchivedTable();

                        Swal.fire({
                            icon: 'success',
                            title: 'Rejected!',
                            text: 'The application has been rejected and archived.',
                            timer: 1600,
                            showConfirmButton: false,
                            timerProgressBar: true,
                            customClass: {
                                popup: 'swal2-popup-success-clean',
                                title: 'swal2-title-success-clean',
                                htmlContainer: 'swal2-text-success-clean'
                            }
                        });
                    } catch (error) {
                        console.error('Error rejecting donation in Firebase:', error);
                        Swal.fire('Error', `Failed to reject donation: ${error.message}`, 'error');
                        logErrorToFirebase(error, 'rejectDonation');
                    }
                }
            });
            return;
        }

        try {
            if (!auth.currentUser) {
                console.error('No authenticated user detected.');
                Swal.fire('Error', 'You must be logged in to access ABVNs and relief requests. Please log in and try again.', 'error');
                window.location.href = '../pages/login.html';
                return;
            }
            console.log('Authenticated user:', auth.currentUser.uid);

            console.log('Fetching active ABVNs from Firebase...');
            const abvnSnapshot = await database.ref('activations').orderByChild('status').equalTo('active').once('value');
            const abvns = abvnSnapshot.val();
            console.log('ABVN snapshot:', abvns);

            console.log('Fetching pending relief requests from Firebase...');
            const reliefSnapshot = await database.ref('requestRelief/requests').orderByChild('status').equalTo('Pending').once('value');
            const reliefRequests = reliefSnapshot.val();
            console.log('Relief requests snapshot:', reliefRequests);

            const options = [];

            if (abvns && typeof abvns === 'object') {
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

            if (reliefRequests && typeof reliefRequests === 'object') {
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
                <p style="font-weight: 500; color: #333;">Select an active volunteer network or pending relief request:</p>
                <select id="assignmentSelect" style="
                    width: 100%; 
                    margin-bottom: 10px;
                    padding: 10px; 
                    border-radius: 8px; 
                    border: 1px solid #ccc; 
                    font-size: 14px;
                    background: #fefefe;
                    box-shadow: inset 0 1px 3px rgba(0,0,0,0.1);
                ">
                    <option value="" selected>-- Select an option --</option>
                    ${selectOptions}
                </select>
                <div id="assignmentDetails" style="
                    margin-top: 15px; 
                    max-height: 200px; 
                    overflow-y: auto; 
                    text-align: left; 
                    background: #f9f9f9; 
                    padding: 10px; 
                    border-radius: 8px; 
                    box-shadow: 0 2px 6px rgba(0,0,0,0.1);
                ">
                    <p>Please select an option to view details.</p>
                </div>
            `,
            icon: 'info',
            showCancelButton: true,
            confirmButtonText: 'Confirm Selection',
            cancelButtonText: 'Cancel',
            confirmButtonColor: '#1e88e5',
            cancelButtonColor: '#e0e0e0',
            buttonsStyling: true,
            customClass: {
                popup: 'swal-popup-modern',
                title: 'swal-title-modern',
                content: 'swal-content-modern',
                confirmButton: 'swal-confirm-modern',
                cancelButton: 'swal-cancel-modern'
            },
            didOpen: () => {
                const select = document.getElementById('assignmentSelect');
                if (options.length > 0) {
                    select.value = `${options[0].type}:${options[0].id}`;
                    updateDetailsDisplay(select.value);
                }
                select.addEventListener('change', () => updateDetailsDisplay(select.value));
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
                            const snapshot = await database.ref('donations/pending/inkind/' + id).once('value');
                            const approvedDonation = snapshot.val();
                            if (!approvedDonation) {
                                throw new Error('Donation data not found in donations/pending/inkind.');
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
                            await database.ref('donations/pending/inkind/' + id).remove();

                            if (type === 'Relief Request') {
                                console.log('Updating relief request status to Completed for ID:', selectedId);
                                await database.ref(`requestRelief/requests/${selectedId}`).update({
                                    status: 'Completed',
                                    updatedAt: new Date().toISOString()
                                });
                            }

                            console.log('Triggering approval email...');
                            sendApprovalEmail(approvedDonation);

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

    // Load donations from Firebase with debouncing
    function loadDonationsFromFirebase() {
        let debounceTimeout;
        database.ref('donations/pending/inkind').on('value', (snapshot) => {
            clearTimeout(debounceTimeout);
            debounceTimeout = setTimeout(() => {
                allDonations = [];
                const data = snapshot.val();
                if (data && typeof data === 'object') {
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
            }, 300);
        }, (error) => {
            console.error('Error loading donations:', error);
            Swal.fire('Error', `Failed to load donations: ${error.message}`, 'error');
            logErrorToFirebase(error, 'loadDonations');
        });
    }

    function loadArchivedDonationsFromFirebase() {
        let debounceTimeout;
        database.ref('donations/pending/archivedDonations/inkind').on('value', (snapshot) => {
            clearTimeout(debounceTimeout);
            debounceTimeout = setTimeout(() => {
                allArchivedDonations = [];
                const data = snapshot.val();
                if (data && typeof data === 'object') {
                    Object.keys(data).forEach((key) => {
                        const donation = data[key];
                        allArchivedDonations.push({
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
                            createdAt: donation.createdAt || 'N/A',
                            archivedTimestamp: donation.archivedTimestamp || 'N/A',
                            archivedBy: donation.archivedBy || 'Unknown',
                            archiveReason: donation.archiveReason || 'N/A'
                        });
                    });
                }
                filteredAndSortedArchivedDonations = [...allArchivedDonations];
                renderArchivedTable();
            }, 300);
        }, (error) => {
            console.error("Error loading archived donations:", error);
            Swal.fire('Error', `Failed to load archived donations: ${error.message}`, 'error');
            logErrorToFirebase(error, 'loadArchivedDonations');
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
                        <button title="View" class="viewBtn" aria-label="View donation details"><i class='bx bx-show-alt'></i></button>
                        ${permissions.canEdit ? `
                            <button title="Approve" class="approveBtn" aria-label="Approve donation"><i class='bx bx-check-circle'></i></button>
                            ${permissions.canArchive ? `
                                <button title="Reject" class="rejectBtn" aria-label="Reject donation"><i class='bx bx-x-circle'></i></button>
                            ` : ''}
                        ` : ''}
                    </td>
                `;
                const viewBtn = row.querySelector('.viewBtn');
                if (viewBtn) viewBtn.addEventListener('click', () => showPreviewModal(donation));
                if (permissions.canEdit) {
                    const approveBtn = row.querySelector('.approveBtn');
                    const rejectBtn = row.querySelector('.rejectBtn');
                    if (approveBtn) approveBtn.addEventListener('click', () => updateDonationStatus(donation.id, donation, 'Approved'));
                    if (rejectBtn) rejectBtn.addEventListener('click', () => updateDonationStatus(donation.id, donation, 'Rejected'));
                }
            });
        }
        updatePaginationInfo();
        renderPagination();
    }

    function renderArchivedTable() {
        if (!archivedTableBody) {
            console.error("ERROR: 'archivedTableBody' element not found.");
            return;
        }

        archivedTableBody.innerHTML = '';
        const start = (archivedCurrentPage - 1) * rowsPerPage;
        const end = start + rowsPerPage;
        const paginatedItems = filteredAndSortedArchivedDonations.slice(start, end);

        if (paginatedItems.length === 0) {
            archivedTableBody.innerHTML = '<tr><td colspan="15" style="text-align: center; padding: 20px;">No archived in-kind donations found.</td></tr>';
        } else {
            paginatedItems.forEach((donation, index) => {
                if (!donation.id) {
                    console.warn('Skipping invalid archived donation in renderArchivedTable:', donation);
                    return;
                }
                const row = archivedTableBody.insertRow();
                row.innerHTML = `
                    <td>${start + index + 1}</td>
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
                    <td>${donation.staffIncharge}</td>
                    <td>${donation.donationDate ? new Date(donation.donationDate).toLocaleDateString('en-PH') : 'N/A'}</td>
                    <td><span class="status-${donation.status ? donation.status.toLowerCase() : 'na'}">${donation.status || 'N/A'}</span></td>
                    <td>
                        ${permissions.canEdit && permissions.canRetrieve ? `
                            <button class="retrieveBtn" aria-label="Retrieve donation"><i class='bx bx-undo'></i></button>
                        ` : ''}
                    </td>
                `;
                if (permissions.canEdit && auth.currentUser?.adminPosition === 'Super Admin') {
                    const retrieveBtn = row.querySelector('.retrieveBtn');
                    if (retrieveBtn) {
                        retrieveBtn.addEventListener('click', () => retrieveDonation(donation.id, donation));
                    }
                }
            });
        }

        const totalEntries = filteredAndSortedArchivedDonations.length;
        const showingStart = totalEntries > 0 ? start + 1 : 0;
        const showingEnd = Math.min(end, totalEntries);
        if (archivedEntriesInfo) {
            archivedEntriesInfo.textContent = `Showing ${showingStart} to ${showingEnd} of ${totalEntries} entries`;
        }
        renderArchivedPagination();
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

        if (totalPages <= 0) {
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

    function renderArchivedPagination() {
        if (!archivedPaginationContainer) return;
        archivedPaginationContainer.innerHTML = '';
        const pageCount = Math.ceil(filteredAndSortedArchivedDonations.length / rowsPerPage);

        if (pageCount <= 1) {
            return;
        }

        for (let i = 1; i <= pageCount; i++) {
            const button = document.createElement('button');
            button.textContent = i;
            button.classList.add('pagination-button');
            if (i === archivedCurrentPage) {
                button.classList.add('active');
            }
            button.addEventListener('click', () => {
                archivedCurrentPage = i;
                renderArchivedTable();
            });
            archivedPaginationContainer.appendChild(button);
        }
    }

    // Search functionality
    if (searchInput) {
        searchInput.addEventListener('input', () => {
            const searchTerm = searchInput.value.toLowerCase();
            filteredAndSortedDonations = allDonations.filter(d => {
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
        if (!sortVal) return;
        const [field, direction] = sortVal.split('-');
        const fields = {
            donationDrive: 'name',
            contactPerson: 'contactPerson',
            accountName: 'name',
            dropOff: 'address'
        };
        const sortField = fields[field] || 'name';
        arr.sort((a, b) => {
            const valA = (a[sortField] || '').toString().toLowerCase();
            const valB = (b[sortField] || '').toString().toLowerCase();
            return direction === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
        });
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

    if (viewArchivedBtn) {
        viewArchivedBtn.addEventListener('click', () => {
            if (document.getElementById('archivedModal')) {
                document.getElementById('archivedModal').style.display = 'flex';
                loadArchivedDonationsFromFirebase();
            }
        });
    }

    if (closeArchivedModalBtn) {
        closeArchivedModalBtn.addEventListener('click', () => {
            if (document.getElementById('archivedModal')) {
                document.getElementById('archivedModal').style.display = 'none';
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
        loadArchivedDonationsFromFirebase();
    });
});
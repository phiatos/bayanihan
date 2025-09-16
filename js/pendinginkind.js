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

    const matchModal = document.getElementById('matchModal');
    const closeMatchModalBtn = document.querySelector('#matchModal .closeBtn');
    const confirmMatchBtn = document.getElementById('confirmMatchBtn');
    const donationMatches = document.getElementById('donationMatches');


    // DOM elements
    const donorTypeButtons = {
        individual: document.getElementById('individualBtn'),
        anonymous: document.getElementById('anonymousBtn'),
        corporate: document.getElementById('corporateBtn'),
        foundation: document.getElementById('foundationBtn'),
    };
    const tableBodies = {
        individual: document.querySelector("#individualTable tbody"),
        anonymous: document.querySelector("#anonymousTable tbody"),
        corporate: document.querySelector("#corporateTable tbody"),
        foundation: document.querySelector("#foundationTable tbody"),
    };
    const tableContainers = {
        individual: document.getElementById('individualTableContainer'),
        anonymous: document.getElementById('anonymousTableContainer'),
        corporate: document.getElementById('corporateTableContainer'),
        foundation: document.getElementById('foundationTableContainer'),
    };

    if (closeMatchModalBtn) {
        closeMatchModalBtn.addEventListener('click', () => {
            if (matchModal) matchModal.style.display = 'none';
        });
    }

    if (confirmMatchBtn) {
        confirmMatchBtn.addEventListener('click', () => {
            const donationId = confirmMatchBtn.dataset.donationId;
            if (donationId) confirmMatch(donationId);
        });
    }

    document.querySelectorAll('.tab-button').forEach(button => {
        button.addEventListener('click', () => {
            // Remove active class from all buttons
            document.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
            // Add active class to clicked button
            button.classList.add('active');
            // Load data for the selected tab
            const tabType = button.getAttribute('data-tab');
            updateArchivedTableData(tabType);
        });
    });


    // Check DOM elements
    Object.entries(donorTypeButtons).forEach(([type, btn]) => {
        if (!btn) console.warn(`Donor type button (#${type}Btn) not found in the DOM.`);
    });
    Object.entries(tableBodies).forEach(([type, tbody]) => {
        if (!tbody) console.warn(`Table body (#${type}Table tbody) not found in the DOM.`);
    });
    Object.entries(tableContainers).forEach(([type, container]) => {
        if (!container) console.warn(`Table container (#${type}TableContainer) not found in the DOM.`);
    });

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
    let allDonations = {
        individual: [],
        anonymous: [],
        corporate: [],
        foundation: [],
    };
    let filteredAndSortedDonations = {
        individual: [],
        anonymous: [],
        corporate: [],
        foundation: [],
    };
    let currentPage = {
        individual: 1,
        anonymous: 1,
        corporate: 1,
        foundation: 1,
    };
    let currentDonorType = 'individual'; // Default donor type
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
            
            const snapshot = await database.ref(`users/${user.uid}`).once('value');
            const userData = snapshot.val();
            
            const adminPosition = userData?.adminPosition || null;
            console.log('Admin position:', adminPosition);

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

            return permissions;
        } catch (error) {
            console.error('Error checking admin permissions:', error);
            return { canView: false, canEdit: false, canArchive: false, canRetrieve: false };
        }
    }

    // Verify Super Admin password
    async function verifySuperAdminPassword() {
        const { value: password } = await Swal.fire({
            title: 'Enter Admin Password',
            input: 'password',
            inputPlaceholder: 'Enter password here',
            inputAttributes: {
                autocapitalize: 'off',
                autocorrect: 'off',
                autocomplete: 'new-password'
            },
            showCancelButton: true,
            confirmButtonText: 'Verify',
            showLoaderOnConfirm: true,
            reverseButtons: true,
            focusCancel: true,
            preConfirm: async (password) => {
                try {
                    const user = auth.currentUser;
                    const credential = firebase.auth.EmailAuthProvider.credential(user.email, password);
                    await auth.signInWithCredential(credential);
                    return true;
                } catch (error) {
                    Swal.fire({
                        icon: 'error',
                        title: 'Verification Failed',
                        text: 'Invalid admin password.',
                        timer: 1600,
                        showConfirmButton: false,
                        timerProgressBar: true,
                        allowOutsideClick: false,
                        customClass: {
                            popup: 'swal2-popup-error-clean',
                            title: 'swal2-title-error-clean',
                            htmlContainer: 'swal2-text-error-clean'
                        }
                    });
                    return false;
                }
            },
            allowOutsideClick: () => !Swal.isLoading(),
            customClass: {
                popup: 'custom-swal-popup',
                title: 'custom-swal-title',
                input: 'custom-swal-input',
                confirmButton: 'custom-confirm-btn',
                cancelButton: 'custom-cancel-btn'
            }
        });
        if (!password) {
            isAdminVerified = true; // Note: Potential bug; consider setting to false
            searchInput.value = '';
            return false;
        }
        isAdminVerified = true;
        searchInput.value = '';
        return password;
    }

    // Replace the existing notifyABVNEndorsement function with this updated version
    async function notifyABVNEndorsement(donationId, groupId, donationData, endorsedGroup) {
        try {
            const user = firebase.auth().currentUser;
            if (!user) {
                throw new Error("User not authenticated.");
            }

            const group = endorsedGroup;
            if (!group) {
                throw new Error(`Volunteer group not found for groupId: ${groupId}`);
            }

            let abvnUserUid = null;
            const usersSnapshot = await database.ref("users").orderByChild("organization").equalTo(group.name).once("value");
            if (usersSnapshot.exists()) {
                usersSnapshot.forEach(child => {
                    const userData = child.val();
                    if (userData.role === "ABVN") {
                        abvnUserUid = child.key;
                    }
                });
            }

            const donationDetails = `
                Donor Name: ${donationData.name || 'Unknown Donor'},
                Donation Type: ${donationData.type || 'N/A'},
                Donation Quantity: ${parseFloat(donationData.valuation || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })},
                Endorsement Date: ${new Date().toLocaleDateString('en-US')},
                Organization Email: ${endorsedGroup.email || 'Not specified'},
                Organization Contact Number: ${endorsedGroup.contactNumber || 'Not specified'},
                Donor Full Address: ${donationData.formattedAddress || 'Not specified'},
                Donor Contact Person: ${donationData.contactPerson || 'Not specified'},
                Donor Contact Number: ${donationData.number || 'Not specified'}
            `;

            const notification = {
                groupId: groupId,
                organization: group.name,
                donationId: donationId,
                timestamp: new Date().toISOString(),
                read: false,
                type: "endorsement",
                userUid: abvnUserUid || null,
                message: `A donation has been endorsed to ${group.name}. Donation Details: ${donationDetails}`,
                identifier: `endorsement_${donationId}_${groupId}_${Date.now()}`
            };

            const newNotificationRef = await database.ref("notifications").push(notification);
            console.log(`Endorsement notification created for ${group.name}:`, notification);

            return newNotificationRef.key;
        } catch (error) {
            console.error("Error creating endorsement notification:", error);
            logErrorToFirebase(error, 'notifyABVNEndorsement');
            throw error;
        }
    }

    // Placeholder for recommendVolunteerGroup (add if not already present)
    async function recommendVolunteerGroup(address) {
        try {
            const snapshot = await database.ref('activations').orderByChild('status').equalTo('active').once('value');
            const abvns = snapshot.val();
            if (!abvns) return null;

            // Placeholder: Select the first active ABVN (replace with real logic using address/geocoding)
            const firstAbvn = Object.entries(abvns)[0];
            if (!firstAbvn) return null;

            const [id, data] = firstAbvn;
            return {
                id,
                name: data.organization || 'Unknown',
                details: data.areaOfOperation || 'N/A',
                email: data.email || 'default@example.com',
                contactNumber: data.contactNumber || 'N/A',
                distance: Infinity,
                reason: 'First available active ABVN',
                type: 'ABVN'
            };
        } catch (error) {
            console.error('Error recommending volunteer group:', error);
            logErrorToFirebase(error, 'recommendVolunteerGroup');
            return null;
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

    // Function to validate email format
    function isValidEmail(email) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    }

    function calculateDistance(lat1, lon1, lat2, lon2) {
        if (!lat1 || !lon1 || !lat2 || !lon2) return Infinity;
        const R = 6371; // Earth's radius in km
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    }

    // Function to send approval email
    function sendApprovalEmail(donationData) {
        if (!donationData.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(donationData.email)) {
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

        emailjs.send('service_mzpjk2a', 'template_owchxrw', templateParams)
            .then(() => {
                Swal.fire({
                    title: 'Success!',
                    text: `Approval email sent to ${donationData.email}`,
                    icon: 'success',
                    showConfirmButton: true,
                    confirmButtonText: 'OK',
                    customClass: {
                        popup: 'swal2-popup-success-clean',
                        title: 'swal2-title-success-clean',
                        htmlContainer: 'swal2-text-success-clean',
                        confirmButton: 'my-success-button'
                    }
                });
            })
            .catch(error => {
                const errorMessage = error && typeof error === 'object' && error.message ? error.message : 'Unknown error';
                Swal.fire('Error', `Failed to send approval email: ${errorMessage}`, 'error');
                logErrorToFirebase(error, 'sendApprovalEmail');
            });
    }

    function matchDonationToRelief(donationId, donationData, database) {
    return new Promise((resolve, reject) => {
        database.ref('requestRelief/requests').orderByChild('status').equalTo('Pending').once('value', (snapshot) => {
            try {
                const requests = snapshot.val();
                if (!requests) {
                    resolve({ donationId, matches: [] });
                    return;
                }

                const matches = [];
                Object.entries(requests).forEach(([id, request]) => {
                    if (request.category === donationData.assistance) {
                        const distance = calculateDistance(
                            donationData.address?.latitude,
                            donationData.address?.longitude,
                            request.address?.latitude,
                            request.address?.longitude
                        );
                        matches.push({
                            id,
                            category: request.category,
                            address: request.address?.formattedAddress || 'N/A',
                            organization: request.volunteerOrganization || 'N/A',
                            contactPerson: request.contactPerson || 'N/A',
                            contactNumber: request.contactNumber || 'N/A',
                            donationDate: request.donationDate || null,
                            distance
                        });
                    }
                });

                // Sort matches by distance (ascending, closest first), fallback to donationDate if distance is Infinity
                matches.sort((a, b) => {
                    if (a.distance === Infinity && b.distance === Infinity) {
                        // If both have no coordinates, sort by donationDate (newest first)
                        const dateA = a.donationDate ? new Date(a.donationDate).getTime() : Infinity;
                        const dateB = b.donationDate ? new Date(b.donationDate).getTime() : Infinity;
                        return dateB - dateA; // Newer dates first
                    }
                    return a.distance - b.distance; // Closest first
                });

                resolve({ donationId, matches });
            } catch (error) {
                console.error('Error matching donation to relief:', error);
                logErrorToFirebase(error, 'matchDonationToRelief');
                reject(error);
            }
        }, (error) => {
            console.error('Error fetching relief requests:', error);
            logErrorToFirebase(error, 'matchDonationToRelief');
            reject(error);
        });
    });
}

    async function showMatchModal(donationId, donationData) {
    if (!matchModal || !donationMatches) return;

    // Populate modal fields
    document.getElementById('modalReliefCategory').textContent = donationData.assistance || 'N/A';
    document.getElementById('modalReliefAddress').textContent = donationData.address?.formattedAddress || donationData.address || 'N/A';
    document.getElementById('modalDonationDate').textContent = donationData.donationDate ? new Date(donationData.donationDate).toLocaleDateString('en-PH') : 'N/A';

    donationMatches.innerHTML = '<p>Loading matches...</p>';

    try {
        const result = await matchDonationToRelief(donationId, donationData, database);
        if (result.matches.length === 0) {
            donationMatches.innerHTML = '<p>No matching relief requests found.</p>';
        } else {
            donationMatches.innerHTML = `
                <ul style="list-style: none; padding: 0; max-height: 300px; overflow-y: auto;">
                    ${result.matches.map((match, index) => `
                        <li style="padding: 10px; border-bottom: 1px solid #eee; ${index === 0 ? 'background: #e8f5e9;' : ''}">
                            <label style="display: flex; align-items: center;">
                                <input type="radio" name="matchSelect" value="${match.id}" ${index === 0 ? 'checked' : ''} style="margin-right: 10px;">
                                <div>
                                    <strong>${match.organization}</strong> - ${match.category}<br>
                                    <span style="font-size: 0.9em; color: #555;">Address: ${match.address}</span><br>
                                    <span style="font-size: 0.9em; color: #555;">
                                        ${match.distance !== Infinity ? `Distance: ${match.distance.toFixed(2)} km` : ''}
                                        ${match.donationDate ? `Date: ${new Date(match.donationDate).toLocaleDateString('en-PH')}` : ''}
                                    </span><br>
                                    <span style="font-size: 0.9em; color: #777;">Contact: ${match.contactPerson} (${match.contactNumber})</span>
                                </div>
                            </label>
                        </li>
                    `).join('')}
                </ul>
                
            `;

            // Update details when a radio button is selected
            const radioButtons = donationMatches.querySelectorAll('input[name="matchSelect"]');
            const updateDetails = () => {
                const selectedId = donationMatches.querySelector('input[name="matchSelect"]:checked')?.value;
                const selectedMatch = result.matches.find(match => match.id === selectedId);
                const matchDetails = document.getElementById('matchDetails');
                // if (selectedMatch) {
                //     matchDetails.innerHTML = `
                //         <p><strong>Relief ID:</strong> ${selectedMatch.id}</p>
                //         <p><strong>Category:</strong> ${selectedMatch.category}</p>
                //         <p><strong>Address:</strong> ${selectedMatch.address}</p>
                //         <p><strong>Organization:</strong> ${selectedMatch.organization}</p>
                //         <p><strong>Contact Person:</strong> ${selectedMatch.contactPerson}</p>
                //         <p><strong>Contact Number:</strong> ${selectedMatch.contactNumber}</p>
                //         <p><strong>Donation Date:</strong> ${selectedMatch.donationDate ? new Date(selectedMatch.donationDate).toLocaleDateString('en-PH') : 'N/A'}</p>
                //         ${selectedMatch.distance !== Infinity ? `<p><strong>Distance:</strong> ${selectedMatch.distance.toFixed(2)} km</p>` : ''}
                //     `;
                // } else {
                //     matchDetails.innerHTML = '<p>Please select a relief request to view details.</p>';
                // }
            };

            radioButtons.forEach(radio => {
                radio.addEventListener('change', updateDetails);
            });

            // Auto-select the first match and show its details
            if (result.matches.length > 0) {
                updateDetails();
            }
        }

        // Store donationId for confirm button
        confirmMatchBtn.dataset.donationId = donationId;
        matchModal.style.display = 'flex';
    } catch (error) {
        console.error('Error showing match modal:', error);
        donationMatches.innerHTML = '<p>Error loading matches. Please try again.</p>';
        logErrorToFirebase(error, 'showMatchModal');
    }
}

// Update confirmMatch to work with radio button selection
async function confirmMatch(donationId) {
    const selectedId = document.querySelector('#donationMatches input[name="matchSelect"]:checked')?.value;
    if (!selectedId) {
        Swal.fire({
            icon: 'error',
            title: 'No Selection',
            text: 'Please select a relief request to match.',
            timer: 1600,
            showConfirmButton: false,
            timerProgressBar: true,
            customClass: {
                popup: 'swal2-popup-error-clean',
                title: 'swal2-title-error-clean',
                htmlContainer: 'swal2-text-error-clean'
            }
        });
        return;
    }

    try {
        const snapshot = await database.ref('donations/pending/inkind/' + donationId).once('value');
        const donationData = snapshot.val();
        if (!donationData) {
            throw new Error('Donation data not found.');
        }

        const reliefSnapshot = await database.ref('requestRelief/requests/' + selectedId).once('value');
        const reliefData = reliefSnapshot.val();
        if (!reliefData) {
            throw new Error('Relief request data not found.');
        }

        // Update donation with assignment
        const updatedDonation = {
            ...donationData,
            status: 'Approved',
            approvedAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            assignment: {
                type: 'Relief Request',
                id: selectedId,
                name: reliefData.volunteerOrganization || 'N/A',
                details: reliefData.category || 'N/A',
                email: reliefData.email || 'N/A'
            }
        };

        // Move donation to savedDonations and update relief request
        await database.ref('donations/savedDonations/inkind/' + donationId).set(updatedDonation);
        await database.ref('donations/pending/inkind/' + donationId).remove();
        await database.ref('requestRelief/requests/' + selectedId).update({
            status: 'Completed',
            updatedAt: new Date().toISOString()
        });

        // Send approval email
        sendApprovalEmail(updatedDonation);

        // Update local data and table
        const donorType = donationData.type.toLowerCase();
        allDonations[donorType] = allDonations[donorType].filter(d => d.id !== donationId);
        filteredAndSortedDonations[donorType] = filteredAndSortedDonations[donorType].filter(d => d.id !== donationId);
        if (currentDonorType === donorType) {
            renderTable(donorType);
        }

        Swal.fire({
            icon: 'success',
            title: 'Donation Assigned',
            text: `Donation assigned to relief request ${selectedId}.`,
            timer: 1600,
            showConfirmButton: false,
            timerProgressBar: true
        });

        matchModal.style.display = 'none';
    } catch (error) {
        console.error('Error confirming match:', error);
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: `Failed to assign donation: ${error.message}`,
            customClass: {
                popup: 'swal2-popup-error-clean',
                title: 'swal2-title-error-clean',
                htmlContainer: 'swal2-text-error-clean'
            }
        });
        logErrorToFirebase(error, 'confirmMatch');
    }
}

    // Function to send endorsement email to volunteer group
    async function sendEndorsementEmail(donation, endorsedGroup) {
        const serviceID = 'service_mzpjk2a';
        const templateID = 'template_4tks2la';

        if (!endorsedGroup.email || !isValidEmail(endorsedGroup.email)) {
            Swal.fire({
                icon: 'error',
                title: 'Invalid Email',
                text: 'The volunteer group’s email is invalid or missing.',
                customClass: {
                    popup: 'swal2-popup-error-clean',
                    title: 'swal2-title-error-clean',
                    htmlContainer: 'swal2-text-error-clean'
                }
            });
            logErrorToFirebase(new Error('Invalid or missing volunteer group email'), 'sendEndorsementEmail');
            return;
        }

        const templateParams = {
            to_email: endorsedGroup.email,
            reply_to: 'jldelossantos1101@gmail.com',
            volunteer_group_name: endorsedGroup.name || 'Unknown Group',
            donor_name: donation.name || 'Unknown Donor',
            donation_type: donation.type || 'N/A',
            donation_quantity: parseFloat(donation.valuation || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
            endorsement_date: new Date().toLocaleDateString('en-US'),
            organization_email: endorsedGroup.email,
            organization_contact_number: endorsedGroup.contactNumber || 'Not specified',
            donor_full_address: donation.address || 'Not specified',
            donor_contact_person: donation.contactPerson || 'Not specified',
            donor_contact_number: donation.number || 'Not specified'
        };

        Swal.fire({
            title: 'Sending Endorsement...',
            text: 'Please wait while we send the email to the volunteer group.',
            allowOutsideClick: false,
            didOpen: () => {
                Swal.showLoading();
            }
        });

        try {
            await emailjs.send(serviceID, templateID, templateParams);
            Swal.fire({
                icon: 'success',
                title: 'Endorsement Sent!',
                text: `An email has been sent to ${endorsedGroup.email} confirming the endorsement of the donation from ${donation.name}.`,
                timer: 3000,
                showConfirmButton: false,
                timerProgressBar: true,
                customClass: {
                    popup: 'swal2-popup-success-clean',
                    title: 'swal2-title-success-clean',
                    htmlContainer: 'swal2-text-success-clean'
                }
            });
        } catch (error) {
            console.error("Error sending endorsement email with EmailJS:", error);
            logErrorToFirebase(error, 'sendEndorsementEmail');
            Swal.fire({
                icon: 'error',
                title: 'Endorsement Failed',
                text: `An error occurred: ${error.text || error.message || 'Unknown error'}. Please try again later.`,
                customClass: {
                    popup: 'swal2-popup-error-clean',
                    title: 'swal2-title-error-clean',
                    htmlContainer: 'swal2-text-error-clean'
                }
            });
        }
    }

    // Function to queue donation when no ABVNs or relief requests are available
    async function queueDonation(id, donationData) {
        try {
            const snapshot = await database.ref('donations/pending/inkind/' + id).once('value');
            const queuedDonation = snapshot.val();
            if (!queuedDonation) {
                throw new Error('Donation data not found in pendingInkind.');
            }

            queuedDonation.approvedAt = new Date().toISOString();
            queuedDonation.updatedAt = new Date().toISOString();
            queuedDonation.status = 'pendingAssignment';

            console.log('Moving donation to donations/savedDonations/inkind with pendingAssignment status...');
            await database.ref('donations/savedDonations/inkind/' + id).set(queuedDonation);
            await database.ref('donations/pending/inkind/' + id).remove();

            const donorType = queuedDonation.type.toLowerCase();
            allDonations[donorType] = allDonations[donorType].filter(d => d.id !== id);
            filteredAndSortedDonations[donorType] = filteredAndSortedDonations[donorType].filter(d => d.id !== id);
            if (currentDonorType === donorType) {
                renderTable(donorType);
            }

            console.log('Triggering approval email for queued donation...');
            sendApprovalEmail(queuedDonation);

            Swal.fire('Queued!', 'No active ABVNs or pending relief requests available. Donation has been approved and queued for manual assignment.', 'success');
        } catch (error) {
            console.error('Error queuing donation in Firebase:', error);
            Swal.fire('Error', `Failed to queue donation. Error: ${error.message}`, 'error');
            logErrorToFirebase(error, 'queueDonation');
        }
    }

    const donationData = {
        id: "-O_DLpws_yTvT38Pi_6g",
        assistance: "Relief Packs",
        address: "",
        items: [{ name: "Rice", quantity: 100, notes: "N/A" }],
        latitude: null, // Or set real coordinates if available
        longitude: null
    };
    matchDonationToRelief(donationData.id, donationData, firebase.database()).then(result => {
        console.log("Match result:", JSON.stringify(result, null, 2));
    });

        async function retrieveDonation(id, donationData) {
            const permissions = await checkAdminPermissions();
            if (!permissions.canRetrieve) {
                console.log('Access denied: User lacks retrieve permissions');
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

            if (auth.currentUser?.adminPosition === 'Super Admin' && !isAdminVerified) {
                const verified = await verifySuperAdminPassword();
                if (!verified) {
                    return;
                }
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
                    try {
                        if (!navigator.onLine) {
                            throw new Error("No internet connection. Please check your network.");
                        }

                        const archivedRef = database.ref(`donations/pending/archivedDonations/inkind/${id}`);
                        const snapshot = await archivedRef.once('value');
                        const archivedDonation = snapshot.val();

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

                        await database.ref(`donations/pending/inkind/${id}`).set(updatedDonation);
                        await archivedRef.remove();
                        console.log('Donation removed from archivedDonations');

                        const donorType = archivedDonation.type.toLowerCase();
                        allArchivedDonations = allArchivedDonations.filter(d => d.id !== id);
                        filteredAndSortedArchivedDonations = filteredAndSortedArchivedDonations.filter(d => d.id !== id);
                        allDonations[donorType].push(updatedDonation);
                        filteredAndSortedDonations[donorType] = [...allDonations[donorType]];
                        if (currentDonorType === donorType) {
                            renderTable(donorType);
                        }

                        const checkSnapshot = await archivedRef.once('value');
                        if (checkSnapshot.exists()) {
                            throw new Error("Failed to delete donation from archived donations.");
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
                        console.log('Notification pushed for retrieval');

                        await loadDonationsFromFirebase();
                        await loadArchivedDonationsFromFirebase();

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
                        console.log('Retrieval completed successfully');
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
                reverseButtons: true,
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
                        const donorType = donation.type.toLowerCase();
                        allDonations[donorType] = allDonations[donorType].filter(d => d.id !== id);
                        filteredAndSortedDonations[donorType] = filteredAndSortedDonations[donorType].filter(d => d.id !== id);
                        if (currentDonorType === donorType) {
                            renderTable(donorType);
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

                        allDonations = allDonations.filter(d => d.id !== id);
                        filteredAndSortedDonations = filteredAndSortedDonations.filter(d => d.id !== id);
                        renderTable();

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
                console.error(`[${new Date().toISOString()}] updateDonationStatus: No authenticated user detected.`);
                Swal.fire('Error', 'You must be logged in to access ABVNs and relief requests. Please log in and try again.', 'error');
                window.location.href = '../pages/login.html';
                return;
            }

            console.log(`[${new Date().toISOString()}] updateDonationStatus: Fetching active ABVNs from Firebase...`);
            const abvnSnapshot = await database.ref('activations').orderByChild('status').equalTo('active').once('value');
            const abvns = abvnSnapshot.val();
            console.log(`[${new Date().toISOString()}] updateDonationStatus: ABVN snapshot:`, abvns ? Object.keys(abvns).length : 'None');

            console.log(`[${new Date().toISOString()}] updateDonationStatus: Fetching pending relief requests from Firebase...`);
            const reliefSnapshot = await database.ref('requestRelief/requests').orderByChild('status').equalTo('Pending').once('value');
            const reliefRequests = reliefSnapshot.val();
            console.log(`[${new Date().toISOString()}] updateDonationStatus: Relief requests snapshot:`, reliefRequests ? Object.keys(reliefRequests).length : 'None');

            // Get recommended volunteer group
            console.log(`[${new Date().toISOString()}] updateDonationStatus: Calling recommendVolunteerGroup with address:`, donationData.address);
            const recommendedGroup = await recommendVolunteerGroup(donationData.address);
            console.log(`[${new Date().toISOString()}] updateDonationStatus: Recommended group:`, recommendedGroup);

            const options = [];

            if (abvns && typeof abvns === 'object') {
                for (let key in abvns) {
                    if (abvns.hasOwnProperty(key)) {
                        const abvn = abvns[key];
                        options.push({
                            type: 'ABVN',
                            id: key,
                            name: abvn.organization || 'Unknown',
                            details: abvn.areaOfOperation || 'N/A',
                            email: abvn.email || 'default@example.com',
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
            }

            if (options.length === 0) {
                console.error(`[${new Date().toISOString()}] updateDonationStatus: No active ABVNs or pending relief requests found.`);
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
            console.log(`[${new Date().toISOString()}] updateDonationStatus: Available options:`, options.length);

            // Create dropdown with recommendation section
            let selectOptions = '<optgroup label="--Recommendation--">';
            if (recommendedGroup) {
                selectOptions += `<option value="ABVN:${recommendedGroup.id}">${recommendedGroup.name} (${recommendedGroup.details})</option>`;
                console.log(`[${new Date().toISOString()}] updateDonationStatus: Added recommended group to dropdown:`, recommendedGroup);
            } else {
                selectOptions += '<option value="" disabled>No recommendation available</option>';
                console.log(`[${new Date().toISOString()}] updateDonationStatus: No recommended group available.`);
            }
            selectOptions += '</optgroup><optgroup label="--Select an Option--">';
            selectOptions += options.map(option => {
                if (recommendedGroup && option.type === 'ABVN' && option.id === recommendedGroup.id) {
                    return ''; // Skip recommended group to avoid duplication
                }
                return `<option value="${option.type}:${option.id}">${option.type}: ${option.name} (${option.details})</option>`;
            }).join('');
            selectOptions += '</optgroup>';

            let selectedOptionDisplay = '';
            function updateDetailsDisplay(selectedValue) {
                console.log(`[${new Date().toISOString()}] updateDetailsDisplay: Selected value:`, selectedValue);
                if (!selectedValue) {
                    selectedOptionDisplay = '<p>Please select an option to view details.</p>';
                } else {
                    const [type, selectedId] = selectedValue.split(':');
                    const option = options.find(opt => opt.type === type && opt.id === selectedId);
                    selectedOptionDisplay = option ? option.display : '<p>Details not available for this selection.</p>';
                    console.log(`[${new Date().toISOString()}] updateDetailsDisplay: Selected option display:`, selectedOptionDisplay);
                }
                const detailsElement = document.getElementById('assignmentDetails');
                if (detailsElement) {
                    detailsElement.innerHTML = selectedOptionDisplay;
                } else {
                    console.error(`[${new Date().toISOString()}] updateDetailsDisplay: Assignment details element not found in DOM.`);
                }
            }

            console.log(`[${new Date().toISOString()}] updateDonationStatus: Rendering SweetAlert modal...`);
            Swal.fire({
                title: 'Assign Donation',
                html: `
                    <p style="font-weight: 500; color: #333;">Select an active volunteer network or pending relief request:</p>
                    ${recommendedGroup ? `
                        <div style="margin-top: 15px; text-align: left; background: #e8f5e9; padding: 10px; border-radius: 8px; box-shadow: 0 2px 6px rgba(0,0,0,0.1);">
                            <p><strong>Recommended ${recommendedGroup.type}: ${recommendedGroup.name} (${recommendedGroup.details})</strong></p>
                            <p><strong>Contact:</strong> ${recommendedGroup.email}</p>
                            <p><strong>Contact Number:</strong> ${recommendedGroup.contactNumber}</p>
                            ${recommendedGroup.distance !== Infinity ? `<p><strong>Distance:</strong> ${recommendedGroup.distance.toFixed(2)} km</p>` : ''}
                            <p><strong>Reason:</strong> ${recommendedGroup.reason}</p>
                        </div>
                    ` : '<p>No strong recommendation available (no category match or nearby group).</p>'}
                    <select id="assignmentSelect" style="width: 100%; margin-bottom: 10px; padding: 10px; border-radius: 8px; border: 1px solid #ccc; font-size: 14px; background: #fefefe; box-shadow: inset 0 1px 3px rgba(0,0,0,0.1);">
                        ${selectOptions}
                    </select>
                    <div id="assignmentDetails" style="margin-top: 15px; max-height: 200px; overflow-y: auto; text-align: left; background: #f9f9f9; padding: 10px; border-radius: 8px; box-shadow: 0 2px 6px rgba(0,0,0,0.1);">
                        <p>Please select an option to view details.</p>
                    </div>
                `,
                icon: 'info',
                showCancelButton: true,
                confirmButtonText: 'Confirm Selection',
                cancelButtonText: 'Cancel',
                confirmButtonColor: '#1e88e5',
                cancelButtonColor: '#e0e0e0',
                reverseButtons: true,
                buttonsStyling: true,
                customClass: {
                    popup: 'custom-swal-popup-large',
                    title: 'swal-title-modern',
                    content: 'swal-content-modern',
                    confirmButton: 'swal-confirm-modern',
                    cancelButton: 'swal-cancel-modern'
                },
                didOpen: () => {
                    console.log(`[${new Date().toISOString()}] updateDonationStatus: SweetAlert modal opened`);
                    const select = document.getElementById('assignmentSelect');
                    if (recommendedGroup) {
                        select.value = `ABVN:${recommendedGroup.id}`;
                        console.log(`[${new Date().toISOString()}] updateDonationStatus: Set default dropdown value to recommended group:`, recommendedGroup.id);
                        updateDetailsDisplay(select.value);
                    } else if (options.length > 0) {
                        select.value = `${options[0].type}:${options[0].id}`;
                        console.log(`[${new Date().toISOString()}] updateDonationStatus: Set default dropdown value to first option:`, select.value);
                        updateDetailsDisplay(select.value);
                    }
                    select.addEventListener('change', () => {
                        console.log(`[${new Date().toISOString()}] updateDonationStatus: Dropdown changed to:`, select.value);
                        updateDetailsDisplay(select.value);
                    });
                },
                preConfirm: () => {
                    const selectedValue = document.getElementById('assignmentSelect').value;
                    console.log(`[${new Date().toISOString()}] updateDonationStatus: Confirm button clicked, selected value:`, selectedValue);
                    if (!selectedValue) {
                        Swal.showValidationMessage('Please select an option.');
                        console.warn(`[${new Date().toISOString()}] updateDonationStatus: No option selected in dropdown`);
                        return false;
                    }
                    return selectedValue;
                }
            }).then(async (result) => {
                if (result.isConfirmed) {
                    console.log(`[${new Date().toISOString()}] updateDonationStatus: User confirmed selection:`, result.value);
                    const [type, selectedId] = result.value.split(':');
                    const selectedOption = options.find(opt => opt.type === type && opt.id === selectedId);
                    console.log(`[${new Date().toISOString()}] updateDonationStatus: Selected option:`, selectedOption);

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
                            ${recommendedGroup && type === 'ABVN' && selectedId === recommendedGroup.id ? `
                                <p style="color: #2e7d32; font-weight: bold;">This is the recommended volunteer group based on address proximity.</p>
                            ` : ''}
                        `,
                        icon: 'question',
                        showCancelButton: true,
                        confirmButtonText: 'Yes, approve it!',
                        cancelButtonText: 'Cancel',
                        reverseButtons: true,
                        customClass: {
                            popup: 'custom-swal-popup-large',
                            title: 'custom-swal-title',
                            htmlContainer: 'custom-swal-content',
                            confirmButton: 'custom-confirm-btn',
                            cancelButton: 'custom-cancel-btn'
                        }
                    });

                    if (confirmResult.isConfirmed) {
                        console.log(`[${new Date().toISOString()}] updateDonationStatus: User confirmed approval for:`, selectedOption);
                        try {
                            const snapshot = await database.ref('donations/pending/inkind/' + id).once('value');
                            const approvedDonation = snapshot.val();
                            if (!approvedDonation) {
                                throw new Error('Donation data not found in donations/pending/inkind.');
                            }

                            approvedDonation.approvedAt = new Date().toISOString();
                            approvedDonation.updatedAt = new Date().toISOString();
                            approvedDonation.status = 'Approved';
                            approvedDonation.assignment = {
                                type: selectedOption.type,
                                id: selectedId,
                                name: selectedOption.name,
                                details: selectedOption.details,
                                email: selectedOption.email
                            };

                            console.log(`[${new Date().toISOString()}] updateDonationStatus: Moving donation to donations/savedDonations/inkind and removing from pendingInkind...`);
                            await database.ref('donations/savedDonations/inkind/' + id).set(approvedDonation);
                            await database.ref('donations/pending/inkind/' + id).remove();

                            if (type === 'Relief Request') {
                                console.log(`[${new Date().toISOString()}] updateDonationStatus: Updating relief request status to Completed for ID:`, selectedId);
                                await database.ref(`requestRelief/requests/${selectedId}`).update({
                                    status: 'Completed',
                                    updatedAt: new Date().toISOString()
                                });
                            }

                            console.log(`[${new Date().toISOString()}] updateDonationStatus: Triggering approval email...`);
                            sendApprovalEmail(approvedDonation);

                            // if (type === 'ABVN') {
                            //     console.log(`[${new Date().toISOString()}] updateDonationStatus: Triggering endorsement email for:`, selectedOption);
                            //     await sendEndorsementEmail(approvedDonation, {
                            //         email: selectedOption.email,
                            //         name: selectedOption.name,
                            //         details: selectedOption.details
                            //     });
                            // }
                            if (type === 'ABVN') {
                                console.log(`[${new Date().toISOString()}] updateDonationStatus: Triggering endorsement email and notification for:`, selectedOption);
                                await Promise.all([
                                    sendEndorsementEmail(approvedDonation, {
                                        email: selectedOption.email,
                                        name: selectedOption.name,
                                        details: selectedOption.details
                                    }),
                                    notifyABVNEndorsement(id, selectedId, approvedDonation, {
                                        email: selectedOption.email,
                                        name: selectedOption.name,
                                        details: selectedOption.details
                                    })
                                ]);
                            }

                            if (type === 'ABVN') {
                                const abvnNotification = {
                                    type: "abvn_endorsed",
                                    message: `A donation has been assigned to ${selectedOption.name}.`,
                                    abvnGroup: selectedOption.name,
                                    timestamp: new Date().toISOString(),
                                    read: false,
                                    identifier: `abvn_endorsed_${id}_${Date.now()}`
                                };
                                console.log(`[${new Date().toISOString()}] updateDonationStatus: Sending ABVN notification:`, abvnNotification);
                                await database.ref("notifications").push(abvnNotification).catch(error => {
                                    console.error(`[${new Date().toISOString()}] updateDonationStatus: Error sending ABVN notification:`, error);
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
                            console.log(`[${new Date().toISOString()}] updateDonationStatus: Sending approval notification:`, approvalNotification);
                            await database.ref("notifications").push(approvalNotification).catch(error => {
                                console.error(`[${new Date().toISOString()}] updateDonationStatus: Error sending approval notification:`, error);
                                Swal.fire('Error', `Failed to notify admin. Error: ${error.message}`, 'error');
                                logErrorToFirebase(error, 'sendApprovalNotification');
                            });

                            Swal.fire({
                                title: 'Approved!',
                                html: `
                                    <p>Donation has been approved and assigned to ${selectedOption.type}: ${selectedOption.name}.</p>
                                    ${reliefDetails}
                                `,
                                icon: 'success',
                                showConfirmButton: true,
                                confirmButtonText: 'OK',
                                customClass: {
                                    popup: 'swal2-popup-success-clean',
                                    title: 'swal2-title-success-clean',
                                    htmlContainer: 'swal2-text-success-clean',
                                    confirmButton: 'my-success-button'
                                }
                            });

                            // Refresh table after approval
                            allDonations = allDonations.filter(d => d.id !== id);
                            filteredAndSortedDonations = filteredAndSortedDonations.filter(d => d.id !== id);
                            renderTable();
                        } catch (error) {
                            console.error(`[${new Date().toISOString()}] updateDonationStatus: Error approving donation:`, error);
                            Swal.fire('Error', `Failed to approve donation. Error: ${error.message}`, 'error');
                            logErrorToFirebase(error, 'approveDonation');
                        }
                    }
                }
            });
        } catch (error) {
            console.error(`[${new Date().toISOString()}] updateDonationStatus: Error fetching ABVNs or relief requests:`, error);
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
                allDonations = { individual: [], anonymous: [], corporate: [], foundation: [] };
                const data = snapshot.val();
                if (data && typeof data === 'object') {
                    Object.keys(data).forEach((key) => {
                        const donation = data[key];
                        const donorType = donation.type ? donation.type.toLowerCase() : 'individual';
                        const donationEntry = {
                            id: key,
                            encoder: donation.encoder || 'N/A',
                            name: donation.name || 'N/A',
                            type: donation.type || 'N/A',
                            address: donation.address?.formattedAddress || donation.address || 'N/A',
                            contactPerson: donation.contactPerson || 'N/A',
                            number: donation.number || 'N/A',
                            email: donation.email || 'N/A',
                            assistance: donation.assistance || 'N/A',
                            valuation: donation.valuation || 0,
                            items: donation.items || [], // Ensure items is included
                            additionalnotes: donation.additionalnotes || donation.description || 'N/A',
                            status: donation.status || 'Pending',
                            staffIncharge: donation.staffIncharge || 'N/A',
                            donationDate: donation.donationDate || 'N/A',
                            createdAt: donation.createdAt || 'N/A',
                            urgentNeed: donation.urgentNeed || false
                        };
                        if (['individual', 'anonymous', 'corporate', 'foundation'].includes(donorType)) {
                            allDonations[donorType].push(donationEntry);
                        } else {
                            allDonations.individual.push(donationEntry);
                        }
                    });
                }
                Object.keys(allDonations).forEach(type => {
                    filteredAndSortedDonations[type] = [...allDonations[type]];
                    applySorting(filteredAndSortedDonations[type], sortSelect?.value || '');
                });
                renderTable(currentDonorType);
            }, 300);
        }, (error) => {
            console.error('Error loading donations:', error);
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: `Failed to load donations: ${error.message}`,
                customClass: {
                    popup: 'swal2-popup-error-clean',
                    title: 'swal2-title-error-clean',
                    htmlContainer: 'swal2-text-error-clean'
                }
            });
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

    // Render table (updated version)
    function renderTable(donorType) {
        const tableBody = tableBodies[donorType];
        if (!tableBody) return;
        tableBody.innerHTML = '';
        const startIndex = (currentPage[donorType] - 1) * rowsPerPage;
        const endIndex = startIndex + rowsPerPage;
        const currentRows = filteredAndSortedDonations[donorType].slice(startIndex, endIndex);

        if (currentRows.length === 0) {
            tableBody.innerHTML = `<tr><td colspan="${donorType === 'anonymous' ? 14 : 13}" style="text-align: center;">No ${donorType} donations found.</td></tr>`;
        } else {
            currentRows.forEach((donation, index) => {
                const row = tableBody.insertRow();
                if (donation.urgentNeed === true) {
                    row.classList.add('urgent-row');
                }

                const itemsString = donation.items && Array.isArray(donation.items) && donation.items.length > 0
                    ? donation.items.filter(item => item && item.name).map(item => item.name).join(', ')
                    : 'No items specified';

                let rowContent = '';
                if (donorType === 'individual') {
                    rowContent = `
                        <td>${startIndex + index + 1}</td>
                        <td>${donation.name || 'N/A'}</td>
                        <td>${donation.type || 'Individual'}</td>
                        <td>${donation.address || 'N/A'}</td>
                        <td>${donation.number || 'N/A'}</td>
                        <td>${donation.email || 'N/A'}</td>
                        <td>${donation.assistance || 'N/A'}</td>
                        <td>₱${parseFloat(donation.valuation || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                        <td>${itemsString}</td>
                        <td>${donation.additionalnotes || 'N/A'}</td>
                        <td>${donation.donationDate ? new Date(donation.donationDate).toLocaleDateString('en-PH') : 'N/A'}</td>
                        <td>${donation.status || 'Pending'}</td>
                        <td>
                            <button title="View" class="viewBtn" aria-label="View donation details"><i class='bx bx-show-alt'></i></button>
                            ${permissions.canEdit ? `
                                <button title="Match" class="matchBtn" aria-label="Match donation to relief"><i class='bx bx-link'></i></button>
                                <button title="Approve" class="approveBtn" aria-label="Approve donation"><i class='bx bx-check-circle'></i></button>
                                ${permissions.canArchive ? `
                                    <button title="Reject" class="rejectBtn" aria-label="Reject donation"><i class='bx bx-x-circle'></i></button>
                                ` : ''}
                            ` : ''}
                        </td>
                    `;
                } else if (donorType === 'anonymous') {
                    rowContent = `
                        <td>${startIndex + index + 1}</td>
                        <td>${donation.address || 'N/A'}</td>
                        <td>${donation.number || 'N/A'}</td>
                        <td>${donation.email || 'N/A'}</td>
                        <td>${donation.additionalnotes || 'N/A'}</td>
                        <td>${donation.assistance || 'N/A'}</td>
                        <td>₱${parseFloat(donation.valuation || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                        <td>${donation.type || 'Anonymous'}</td>
                        <td>${itemsString}</td>
                        <td>${donation.additionalnotes || 'N/A'}</td>
                        <td>${donation.donationDate ? new Date(donation.donationDate).toLocaleDateString('en-PH') : 'N/A'}</td>
                        <td>${donation.status || 'Pending'}</td>
                        <td>
                            <button title="View" class="viewBtn" aria-label="View donation details"><i class='bx bx-show-alt'></i></button>
                            ${permissions.canEdit ? `
                                <button title="Match" class="matchBtn" aria-label="Match donation to relief"><i class='bx bx-link'></i></button>
                                <button title="Approve" class="approveBtn" aria-label="Approve donation"><i class='bx bx-check-circle'></i></button>
                                ${permissions.canArchive ? `
                                    <button title="Reject" class="rejectBtn" aria-label="Reject donation"><i class='bx bx-x-circle'></i></button>
                                ` : ''}
                            ` : ''}
                        </td>
                    `;
                } else if (donorType === 'corporate') {
                    rowContent = `
                        <td>${startIndex + index + 1}</td>
                        <td>${donation.name || 'N/A'}</td>
                        <td>${donation.address || 'N/A'}</td>
                        <td>${donation.number || 'N/A'}</td>
                        <td>${donation.email || 'N/A'}</td>
                        <td>${donation.additionalnotes || 'N/A'}</td>
                        <td>${donation.assistance || 'N/A'}</td>
                        <td>₱${parseFloat(donation.valuation || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                        <td>${itemsString}</td>
                        <td>${donation.additionalnotes || 'N/A'}</td>
                        <td>${donation.donationDate ? new Date(donation.donationDate).toLocaleDateString('en-PH') : 'N/A'}</td>
                        <td>${donation.status || 'Pending'}</td>
                        <td>
                            <button title="View" class="viewBtn" aria-label="View donation details"><i class='bx bx-show-alt'></i></button>
                            ${permissions.canEdit ? `
                                <button title="Match" class="matchBtn" aria-label="Match donation to relief"><i class='bx bx-link'></i></button>
                                <button title="Approve" class="approveBtn" aria-label="Approve donation"><i class='bx bx-check-circle'></i></button>
                                ${permissions.canArchive ? `
                                    <button title="Reject" class="rejectBtn" aria-label="Reject donation"><i class='bx bx-x-circle'></i></button>
                                ` : ''}
                            ` : ''}
                        </td>
                    `;
                } else if (donorType === 'foundation') {
                    rowContent = `
                        <td>${startIndex + index + 1}</td>
                        <td>${donation.name || 'N/A'}</td>
                        <td>${donation.address || 'N/A'}</td>
                        <td>${donation.contactPerson || 'N/A'}</td>
                        <td>${donation.number || 'N/A'}</td>
                        <td>${donation.email || 'N/A'}</td>
                        <td>${donation.assistance || 'N/A'}</td>
                        <td>₱${parseFloat(donation.valuation || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                        <td>${itemsString}</td>
                        <td>${donation.additionalnotes || 'N/A'}</td>
                        <td>${donation.donationDate ? new Date(donation.donationDate).toLocaleDateString('en-PH') : 'N/A'}</td>
                        <td>${donation.status || 'Pending'}</td>
                        <td>
                            <button title="View" class="viewBtn" aria-label="View donation details"><i class='bx bx-show-alt'></i></button>
                            ${permissions.canEdit ? `
                                <button title="Match" class="matchBtn" aria-label="Match donation to relief"><i class='bx bx-link'></i></button>
                                <button title="Approve" class="approveBtn" aria-label="Approve donation"><i class='bx bx-check-circle'></i></button>
                                ${permissions.canArchive ? `
                                    <button title="Reject" class="rejectBtn" aria-label="Reject donation"><i class='bx bx-x-circle'></i></button>
                                ` : ''}
                            ` : ''}
                        </td>
                    `;
                }

                row.innerHTML = rowContent;

                const viewBtn = row.querySelector('.viewBtn');
                if (viewBtn) viewBtn.addEventListener('click', () => showPreviewModal(donation));
                if (permissions.canEdit) {
                    const matchBtn = row.querySelector('.matchBtn');
                    const approveBtn = row.querySelector('.approveBtn');
                    const rejectBtn = row.querySelector('.rejectBtn');
                    if (matchBtn) matchBtn.addEventListener('click', () => showMatchModal(donation.id, donation));
                    if (approveBtn) approveBtn.addEventListener('click', () => updateDonationStatus(donation.id, donation, 'Approved'));
                    if (rejectBtn) {
                        rejectBtn.addEventListener('click', async () => {
                            if (permissions.canArchive && !isAdminVerified) {
                                const verified = await verifySuperAdminPassword();
                                if (!verified) return;
                            }
                            updateDonationStatus(donation.id, donation, 'Rejected');
                        });
                    }
                }
            });
        }
        updatePaginationInfo(donorType);
        renderPagination(donorType);
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
                if (!donation.id) return;
                const row = archivedTableBody.insertRow();
                let rowContent = '';
                if (donation.type.toLowerCase() === 'individual') {
                    rowContent = `
                        <td>${start + index + 1}</td>
                        <td>${donation.encoder || 'N/A'}</td>
                        <td>${donation.name || 'N/A'}</td>
                        <td>${donation.type || 'Individual'}</td>
                        <td>${donation.address || 'N/A'}</td>
                        <td>${donation.contactPerson || 'N/A'}</td>
                        <td>${donation.number || 'N/A'}</td>
                        <td>${donation.email || 'N/A'}</td>
                        <td>${donation.assistance || 'N/A'}</td>
                        <td>₱${parseFloat(donation.valuation || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                        <td>${donation.additionalnotes || 'N/A'}</td>
                        <td>${donation.staffIncharge || 'N/A'}</td>
                        <td>${donation.donationDate ? new Date(donation.donationDate).toLocaleDateString('en-PH') : 'N/A'}</td>
                        <td><span class="status-${donation.status ? donation.status.toLowerCase() : 'na'}">${donation.status || 'N/A'}</span></td>
                        <td>
                            ${permissions.canRetrieve ? `
                                <button class="retrieveBtn" aria-label="Retrieve donation">Retrieve</button>
                            ` : ''}
                        </td>
                    `;
                } else if (donation.type.toLowerCase() === 'anonymous') {
                    rowContent = `
                        <td>${start + index + 1}</td>
                        <td>${donation.encoder || 'N/A'}</td>
                        <td>Anonymous</td>
                        <td>${donation.type || 'Anonymous'}</td>
                        <td>${donation.address || 'N/A'}</td>
                        <td>${donation.contactPerson || 'N/A'}</td>
                        <td>${donation.number || 'N/A'}</td>
                        <td>${donation.email || 'N/A'}</td>
                        <td>${donation.assistance || 'N/A'}</td>
                        <td>₱${parseFloat(donation.valuation || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                        <td>${donation.additionalnotes || 'N/A'}</td>
                        <td>${donation.staffIncharge || 'N/A'}</td>
                        <td>${donation.donationDate ? new Date(donation.donationDate).toLocaleDateString('en-PH') : 'N/A'}</td>
                        <td><span class="status-${donation.status ? donation.status.toLowerCase() : 'na'}">${donation.status || 'N/A'}</span></td>
                        <td>
                            ${permissions.canRetrieve ? `
                                <button class="retrieveBtn" aria-label="Retrieve donation">Retrieve</button>
                            ` : ''}
                        </td>
                    `;
                } else if (donation.type.toLowerCase() === 'corporate') {
                    rowContent = `
                        <td>${start + index + 1}</td>
                        <td>${donation.encoder || 'N/A'}</td>
                        <td>${donation.name || 'N/A'}</td>
                        <td>${donation.type || 'Corporate'}</td>
                        <td>${donation.address || 'N/A'}</td>
                        <td>${donation.contactPerson || 'N/A'}</td>
                        <td>${donation.number || 'N/A'}</td>
                        <td>${donation.email || 'N/A'}</td>
                        <td>${donation.assistance || 'N/A'}</td>
                        <td>₱${parseFloat(donation.valuation || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                        <td>${donation.additionalnotes || 'N/A'}</td>
                        <td>${donation.staffIncharge || 'N/A'}</td>
                        <td>${donation.donationDate ? new Date(donation.donationDate).toLocaleDateString('en-PH') : 'N/A'}</td>
                        <td><span class="status-${donation.status ? donation.status.toLowerCase() : 'na'}">${donation.status || 'N/A'}</span></td>
                        <td>
                            ${permissions.canRetrieve ? `
                                <button class="retrieveBtn" aria-label="Retrieve donation">Retrieve</button>
                            ` : ''}
                        </td>
                    `;
                } else if (donation.type.toLowerCase() === 'foundation') {
                    rowContent = `
                        <td>${start + index + 1}</td>
                        <td>${donation.encoder || 'N/A'}</td>
                        <td>${donation.name || 'N/A'}</td>
                        <td>${donation.type || 'Foundation'}</td>
                        <td>${donation.address || 'N/A'}</td>
                        <td>${donation.contactPerson || 'N/A'}</td>
                        <td>${donation.number || 'N/A'}</td>
                        <td>${donation.email || 'N/A'}</td>
                        <td>${donation.assistance || 'N/A'}</td>
                        <td>₱${parseFloat(donation.valuation || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                        <td>${donation.additionalnotes || 'N/A'}</td>
                        <td>${donation.staffIncharge || 'N/A'}</td>
                        <td>${donation.donationDate ? new Date(donation.donationDate).toLocaleDateString('en-PH') : 'N/A'}</td>
                        <td><span class="status-${donation.status ? donation.status.toLowerCase() : 'na'}">${donation.status || 'N/A'}</span></td>
                        <td>
                            ${permissions.canRetrieve ? `
                                <button class="retrieveBtn" aria-label="Retrieve donation">Retrieve</button>
                            ` : ''}
                        </td>
                    `;
                }

                row.innerHTML = rowContent;

                if (permissions.canRetrieve) {
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
    function updatePaginationInfo(donorType) {
        if (!entriesInfo) return;
        const totalEntries = filteredAndSortedDonations[donorType].length;
        const startEntry = (currentPage[donorType] - 1) * rowsPerPage + 1;
        const endEntry = Math.min(currentPage[donorType] * rowsPerPage, totalEntries);
        entriesInfo.textContent = `Showing ${startEntry} to ${endEntry} of ${totalEntries} entries`;
        if (totalEntries === 0) {
            entriesInfo.textContent = `Showing 0 to 0 of 0 entries`;
        }
    }

    function updateArchivedTableData(tabType) {
        filteredAndSortedArchivedDonations = allArchivedDonations.filter(donation => donation.type.toLowerCase() === tabType);
        archivedCurrentPage = 1;
        renderArchivedTable();
    }

    // Render pagination
    function renderPagination(donorType) {
        if (!paginationContainer) return;
        paginationContainer.innerHTML = '';
        const totalPages = Math.ceil(filteredAndSortedDonations[donorType].length / rowsPerPage);

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
                    currentPage[donorType] = page;
                    renderTable(donorType);
                }
            });
            return btn;
        };

        paginationContainer.appendChild(createPaginationButton('Prev', Math.max(1, currentPage[donorType] - 1), currentPage[donorType] === 1));

        const maxVisible = 5;
        let startPage = Math.max(1, currentPage[donorType] - Math.floor(maxVisible / 2));
        let endPage = Math.min(totalPages, startPage + maxVisible - 1);
        if (endPage - startPage < maxVisible - 1) {
            startPage = Math.max(1, endPage - maxVisible + 1);
        }

        for (let i = startPage; i <= endPage; i++) {
            paginationContainer.appendChild(createPaginationButton(i, i, false, i === currentPage[donorType]));
        }

        paginationContainer.appendChild(createPaginationButton('Next', Math.min(totalPages, currentPage[donorType] + 1), currentPage[donorType] === totalPages));
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

    // Initialize donor type buttons
    Object.entries(donorTypeButtons).forEach(([type, btn]) => {
        if (btn) {
            btn.addEventListener('click', () => {
                currentDonorType = type;
                Object.values(donorTypeButtons).forEach(button => button.classList.remove('active'));
                btn.classList.add('active');
                Object.values(tableContainers).forEach(container => container.style.display = 'none');
                tableContainers[type].style.display = 'block';
                currentPage[type] = 1;
                renderTable(type);
            });
        }
});

    // Search functionality
    if (searchInput) {
        searchInput.addEventListener('input', () => {
            const searchTerm = searchInput.value.toLowerCase();
            filteredAndSortedDonations[currentDonorType] = allDonations[currentDonorType].filter(d => {
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
            currentPage[currentDonorType] = 1;
            renderTable(currentDonorType);
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
        // First, sort by urgentNeed (true comes first)
        arr.sort((a, b) => {
            // If urgentNeed is true, it should come first (return -1)
            // If urgentNeed is false or undefined, it comes later (return 1)
            if (a.urgentNeed === true && b.urgentNeed !== true) return -1;
            if (b.urgentNeed === true && a.urgentNeed !== true) return 1;
            // If both have same urgentNeed status, apply secondary sorting
            if (!sortVal) return 0;
            const [field, direction] = sortVal.split('-');
            const fields = {
                donationDrive: 'name',
                contactPerson: 'contactPerson',
                accountName: 'name',
                dropOff: 'address'
            };
            const sortField = fields[field] || 'name';
            const valA = (a[sortField] || '').toString().toLowerCase();
            const valB = (b[sortField] || '').toString().toLowerCase();
            return direction === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
        });
    }

    // Show preview modal
    function showPreviewModal(donation) {
        if (!modalContent || !previewModal) return;
        let modalHTML = `
            <div class="modal-content-inner" style="padding: 20px;">
                <h2>Donor Information:</h2>
                <p><strong>Encoder:</strong> ${donation.encoder || 'N/A'}</p>
                <p><strong>Type:</strong> ${donation.type || 'N/A'}</p>
        `;
        
        if (donation.type.toLowerCase() === 'individual') {
            modalHTML += `
                <p><strong>Full Name:</strong> ${donation.name || 'N/A'}</p>
                <p><strong>Address:</strong> ${donation.address || 'N/A'}</p>
                <p><strong>Mobile Number:</strong> ${donation.number || 'N/A'}</p>
                <p><strong>Email:</strong> ${donation.email || 'N/A'}</p>
            `;
        } else if (donation.type.toLowerCase() === 'anonymous') {
            modalHTML += `
                <p><strong>Address:</strong> ${donation.address || 'N/A'}</p>
                <p><strong>Mobile Number:</strong> ${donation.number || 'N/A'}</p>
                <p><strong>Email:</strong> ${donation.email || 'N/A'}</p>
                <p><strong>Donation Note:</strong> ${donation.additionalnotes || 'N/A'}</p>
            `;
        } else if (donation.type.toLowerCase() === 'corporate') {
            modalHTML += `
                <p><strong>Company Name:</strong> ${donation.name || 'N/A'}</p>
                <p><strong>Address:</strong> ${donation.address || 'N/A'}</p>
                <p><strong>Mobile Number:</strong> ${donation.number || 'N/A'}</p>
                <p><strong>Email:</strong> ${donation.email || 'N/A'}</p>
                <p><strong>Donation Note:</strong> ${donation.additionalnotes || 'N/A'}</p>
            `;
        } else if (donation.type.toLowerCase() === 'foundation') {
            modalHTML += `
                <p><strong>Foundation Name:</strong> ${donation.name || 'N/A'}</p>
                <p><strong>Address:</strong> ${donation.address || 'N/A'}</p>
                <p><strong>Contact Person:</strong> ${donation.contactPerson || 'N/A'}</p>
                <p><strong>Mobile Number:</strong> ${donation.number || 'N/A'}</p>
                <p><strong>Email:</strong> ${donation.email || 'N/A'}</p>
            `;
        }

        modalHTML += `
                <hr>
                <h2>Donation Details:</h2>
                <p><strong>Donation Category:</strong> ${donation.assistance || 'N/A'}</p>
                <p><strong>Valuation:</strong> ₱${parseFloat(donation.valuation || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                <p><strong>Additional Notes:</strong> ${donation.additionalnotes || 'N/A'}</p>
                <p><strong>Status:</strong> ${donation.status || 'Pending'}</p>
                <p><strong>Staff-In-Charge:</strong> ${donation.staffIncharge || 'N/A'}</p>
                <p><strong>Donation Date:</strong> ${donation.donationDate ? new Date(donation.donationDate).toLocaleDateString('en-PH') : 'N/A'}</p>
                <p><strong>Recorded On:</strong> ${donation.createdAt ? new Date(donation.createdAt).toLocaleString('en-PH') : 'N/A'}</p>
                <p><strong>Urgent Need:</strong> ${donation.urgentNeed ? 'Yes' : 'No'}</p>
            </div>
        `;
        
        modalContent.innerHTML = modalHTML;
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
        console.log(`[${new Date().toISOString()}] Auth state changed:`, user ? { uid: user.uid, email: user.email } : 'No user');

        if (!user) {
            Swal.fire({
                icon: 'error',
                title: 'Authentication Required',
                text: 'Please sign in to access pending in-kind donations.',
                showConfirmButton: true,
                confirmButtonText: 'OK',
                customClass: {
                    popup: 'swal2-popup-error-clean',
                    title: 'swal2-title-error-clean',
                    htmlContainer: 'swal2-text-error-clean',
                    confirmButton: 'my-error-button'
                }
            }).then(() => {
                window.location.href = '../pages/login.html';
            });
            return;
        }

        try {
            const userSnapshot = await database.ref(`users/${user.uid}`).once('value');
            const userData = userSnapshot.val();
            const passwordNeedsReset = userData ? (userData.password_needs_reset || false) : false;

            if (passwordNeedsReset) {
                console.log(`[${new Date().toISOString()}] Password change required for user ${user.uid}. Redirecting to profile page.`);
                Swal.fire({
                    icon: 'error',
                    title: 'Password Change Required',
                    text: 'Please change your password. Redirecting to profile.',
                    allowOutsideClick: false,
                    timer: 1600,
                    showConfirmButton: false,
                    timerProgressBar: true,
                    customClass: {
                        popup: 'swal2-popup-error-clean',
                        title: 'swal2-title-error-clean',
                        htmlContainer: 'swal2-text-error-clean'
                    }
                }).then(() => {
                    window.location.replace('../pages/profile.html');
                });
                return;
            }

            permissions = await checkAdminPermissions();
            if (!permissions.canView) {
                Swal.fire({
                    icon: 'error',
                    title: 'Access Denied',
                    text: 'You do not have permission to access this page.',
                    showConfirmButton: true,
                    confirmButtonText: 'OK',
                    customClass: {
                        popup: 'swal2-popup-error-clean',
                        title: 'swal2-title-error-clean',
                        htmlContainer: 'swal2-text-error-clean',
                        confirmButton: 'my-error-button'
                    }
                }).then(() => {
                    window.location.href = '../pages/login.html';
                });
                return;
            }

            loadDonationsFromFirebase();
            loadArchivedDonationsFromFirebase();
            resetInactivityTimer();
        } catch (error) {
            console.error(`[${new Date().toISOString()}] Error checking user data:`, error);
            Swal.fire({
                icon: 'error',
                title: 'Authentication Error',
                text: 'Failed to verify account status. Please try logging in again.',
                showConfirmButton: true,
                confirmButtonText: 'OK',
                customClass: {
                    popup: 'swal2-popup-error-clean',
                    title: 'swal2-title-error-clean',
                    htmlContainer: 'swal2-text-error-clean',
                    confirmButton: 'my-error-button'
                }
            }).then(() => {
                window.location.href = '../pages/login.html';
            });
        }
    });
});
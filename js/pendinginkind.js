document.addEventListener("DOMContentLoaded", () => {
    // Firebase configuration (Note: Consider moving to environment variables for security)
    // const firebaseConfig = {
    //     apiKey: "AIzaSyDJxMv8GCaMvQT2QBW3CdzA3dV5X_T2KqQ",
    //     authDomain: "bayanihan-5ce7e.firebaseapp.com",
    //     databaseURL: "https://bayanihan-5ce7e-default-rtdb.asia-southeast1.firebasedatabase.app",
    //     projectId: "bayanihan-5ce7e",
    //     storageBucket: "bayanihan-5ce7e.appspot.com",
    //     messagingSenderId: "593123849917",
    //     appId: "1:593123849917:web:eb85a63a536eeff78ce9d4",
    //     measurementId: "G-ZTQ9VXXVV0",
    // };
    const firebaseConfig = {
        apiKey: "AIzaSyBkmXOJvnlBtzkjNyR6wyd9BgGM0BhN0L8",
        authDomain: "bayanihan-new-472410.firebaseapp.com",
        projectId: "bayanihan-new-472410",
        storageBucket: "bayanihan-new-472410.firebasestorage.app",
        messagingSenderId: "995982574131",
        appId: "1:995982574131:web:3d45e358fad330c276d946",
        measurementId: "G-CEVPTQZM9C",
        databaseURL: "https://bayanihan-new-472410-default-rtdb.asia-southeast1.firebasedatabase.app/"
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
            document.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
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
    if (!matchModal || !donationMatches || !confirmMatchBtn) return;

    // Populate modal fields
    document.getElementById('modalReliefCategory').textContent = donationData.assistance || 'N/A';
    document.getElementById('modalReliefAddress').textContent = donationData.address?.formattedAddress || donationData.address || 'N/A';
    document.getElementById('modalDonationDate').textContent = donationData.donationDate ? new Date(donationData.donationDate).toLocaleDateString('en-PH') : 'N/A';

    donationMatches.innerHTML = '<p>Loading matches...</p>';
    confirmMatchBtn.disabled = true; // Disable button initially

    try {
        const result = await matchDonationToRelief(donationId, donationData, database);
        if (result.matches.length === 0) {
            donationMatches.innerHTML = '<p>No matching relief requests found.</p>';
            confirmMatchBtn.disabled = true; // Keep button disabled if no matches
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
            confirmMatchBtn.disabled = false; // Enable button if matches exist

            // Update details when a radio button is selected
            const radioButtons = donationMatches.querySelectorAll('input[name="matchSelect"]');
            const updateDetails = () => {
                const selectedId = donationMatches.querySelector('input[name="matchSelect"]:checked')?.value;
                const selectedMatch = result.matches.find(match => match.id === selectedId);
                const matchDetails = document.getElementById('matchDetails');
                // Note: matchDetails is commented out in the original code, so no changes needed here
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
        confirmMatchBtn.disabled = true; // Disable button on error
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
            cancelButtonText: 'Cancel',
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

                    allArchivedDonations = [];
                    const archivedSnapshot = await database.ref('donations/pending/archivedDonations/inkind').once('value');
                    const archivedDonationsObject = archivedSnapshot.val();
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
            Swal.fire('Error', 'You must be logged in to approve donations. Please log in and try again.', 'error');
            window.location.href = '../pages/login.html';
            return;
        }

        Swal.fire({
            title: 'Approve Donation?',
            text: `This will approve the in-kind donation from ${donationData.name || 'Unknown'} and move it to saved donations.`,
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: 'Yes, approve it!',
            cancelButtonText: 'Cancel',
            reverseButtons: true,
            customClass: {
                popup: 'custom-swal-popup-small',
                title: 'custom-swal-title',
                htmlContainer: 'custom-swal-content',
                confirmButton: 'custom-confirm-btn',
                cancelButton: 'custom-cancel-btn',
                actions: 'custom-swal-actions' // Added custom class for button container
            },
            didOpen: () => {
                // Optional: Ensure buttons are styled correctly on open
                const actionsContainer = document.querySelector('.swal2-actions');
                if (actionsContainer) {
                    actionsContainer.style.display = 'flex';
                    actionsContainer.style.gap = '10px'; // Space between buttons
                    actionsContainer.style.justifyContent = 'center'; // Center buttons
                }
            }
        }).then(async (result) => {
            if (result.isConfirmed) {
                try {
                    const snapshot = await database.ref('donations/pending/inkind/' + id).once('value');
                    const approvedDonation = snapshot.val();
                    if (!approvedDonation) {
                        throw new Error('Donation data not found in donations/pending/inkind.');
                    }

                    approvedDonation.approvedAt = new Date().toISOString();
                    approvedDonation.updatedAt = new Date().toISOString();
                    approvedDonation.status = 'Approved';

                    console.log(`[${new Date().toISOString()}] updateDonationStatus: Moving donation to donations/savedDonations/inkind and removing from pendingInkind...`);
                    await database.ref('donations/savedDonations/inkind/' + id).set(approvedDonation);
                    await database.ref('donations/pending/inkind/' + id).remove();

                    console.log(`[${new Date().toISOString()}] updateDonationStatus: Triggering approval email...`);
                    sendApprovalEmail(approvedDonation);

                    const approvalNotification = {
                        type: "donation_approved",
                        message: `The donation from ${approvedDonation.name || 'an anonymous donor'} has been approved.`,
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

                    const donorType = approvedDonation.type.toLowerCase();
                    allDonations[donorType] = allDonations[donorType].filter(d => d.id !== id);
                    filteredAndSortedDonations[donorType] = filteredAndSortedDonations[donorType].filter(d => d.id !== id);
                    if (currentDonorType === donorType) {
                        renderTable(donorType);
                    }

                    Swal.fire({
                        title: 'Approved!',
                        text: `Donation from ${approvedDonation.name || 'Unknown'} has been approved and moved to saved donations.`,
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
                } catch (error) {
                    console.error(`[${new Date().toISOString()}] updateDonationStatus: Error approving donation:`, error);
                    Swal.fire('Error', `Failed to approve donation. Error: ${error.message}`, 'error');
                    logErrorToFirebase(error, 'approveDonation');
                }
            }
        });
    } catch (error) {
        console.error(`[${new Date().toISOString()}] updateDonationStatus: Error processing approval:`, error);
        Swal.fire('Error', `Failed to process approval. Error: ${error.message}`, 'error');
        logErrorToFirebase(error, 'approveDonation');
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
                    // Ensure items is an array, even if missing or invalid
                    const items = Array.isArray(donation.items) ? donation.items : [];
                    if (!donation.items) {
                        console.warn(`Items missing for donation ${key}, defaulting to empty array:`, donation.items);
                    } else if (!Array.isArray(donation.items)) {
                        console.warn(`Items is not an array for donation ${key}, defaulting to empty array:`, donation.items);
                    }
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
                        items: items, // Use sanitized items array
                        additionalnotes: donation.additionalnotes || 'N/A',
                        status: donation.status || 'Pending',
                        staffIncharge: donation.staffIncharge || 'N/A',
                        donationDate: donation.donationDate || 'N/A',
                        createdAt: donation.createdAt || 'N/A',
                        archivedTimestamp: donation.archivedTimestamp || 'N/A',
                        archivedBy: donation.archivedBy || 'Unknown',
                        archiveReason: donation.archiveReason || 'N/A',
                        urgentNeed: donation.urgentNeed || false
                    });
                });
            } else {
                console.warn('No archived donations found or data is invalid:', data);
            }
            // Apply sorting to archived donations for the current donor type
            filteredAndSortedArchivedDonations = [...allArchivedDonations];
            applySorting('archived', currentDonorType, sortSelect?.value || 'donationDate-desc');
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
                                <button title="Match" class="matchBtn" aria-label="Match donation to relief"><i class="bx bx-mail-send"></i></button>
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
                                <button title="Match" class="matchBtn" aria-label="Match donation to relief"><i class="bx bx-mail-send"></i></button>
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
                                <button title="Match" class="matchBtn" aria-label="Match donation to relief"><i class="bx bx-mail-send"></i></button>
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
                                <button title="Match" class="matchBtn" aria-label="Match donation to relief"><i class="bx bx-mail-send"></i></button>
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
    if (!archivedTableBody || !document.getElementById('archivedTableHead')) {
        console.error("ERROR: 'archivedTableBody' or 'archivedTableHead' element not found.");
        return;
    }

    const tableHead = document.getElementById('archivedTableHead');
    tableHead.innerHTML = ''; // Clear existing header
    const headerRow = tableHead.insertRow();
    let headerContent = '';

    // Define headers based on donor type
    if (currentDonorType === 'individual') {
        headerContent = `
            <th>No.</th>
            <th>Name</th>
            <th>Type</th>
            <th>Address</th>
            <th>Number</th>
            <th>Email</th>
            <th>Assistance</th>
            <th>Valuation</th>
            <th>Items</th>
            <th>Additional Notes</th>
            <th>Donation Date</th>
            <th>Status</th>
            <th>Action</th>
        `;
    } else if (currentDonorType === 'anonymous') {
        headerContent = `
            <th>No.</th>
            <th>Address</th>
            <th>Number</th>
            <th>Email</th>
            <th>Donation Note</th>
            <th>Assistance</th>
            <th>Valuation</th>
            <th>Type</th>
            <th>Items</th>
            <th>Additional Notes</th>
            <th>Donation Date</th>
            <th>Status</th>
            <th>Action</th>
        `;
    } else if (currentDonorType === 'corporate') {
        headerContent = `
            <th>No.</th>
            <th>Company Name</th>
            <th>Address</th>
            <th>Number</th>
            <th>Email</th>
            <th>Donation Note</th>
            <th>Assistance</th>
            <th>Valuation</th>
            <th>Items</th>
            <th>Additional Notes</th>
            <th>Donation Date</th>
            <th>Status</th>
            <th>Action</th>
        `;
    } else if (currentDonorType === 'foundation') {
        headerContent = `
            <th>No.</th>
            <th>Foundation Name</th>
            <th>Address</th>
            <th>Contact Person</th>
            <th>Number</th>
            <th>Email</th>
            <th>Assistance</th>
            <th>Valuation</th>
            <th>Items</th>
            <th>Additional Notes</th>
            <th>Donation Date</th>
            <th>Status</th>
            <th>Action</th>
        `;
    }
    headerRow.innerHTML = headerContent;

    archivedTableBody.innerHTML = '';
    const start = (archivedCurrentPage - 1) * rowsPerPage;
    const end = start + rowsPerPage;
    const paginatedItems = filteredAndSortedArchivedDonations.slice(start, end);

    if (paginatedItems.length === 0) {
        archivedTableBody.innerHTML = `<tr><td colspan="${currentDonorType === 'anonymous' ? 13 : 13}" style="text-align: center; padding: 20px;">No archived ${currentDonorType} donations found.</td></tr>`;
    } else {
        paginatedItems.forEach((donation, index) => {
            if (!donation.id) return;
            const row = archivedTableBody.insertRow();
            if (donation.urgentNeed === true) {
                row.classList.add('urgent-row');
            }

            // Handle items field with enhanced parsing
            let itemsString = 'No items specified';
            if (donation.items && Array.isArray(donation.items) && donation.items.length > 0) {
                const validItems = donation.items.filter(item => item && typeof item === 'object');
                if (validItems.length > 0) {
                    itemsString = validItems.map(item => {
                        if (item.name) {
                            return item.quantity ? `${item.name} (${item.quantity})` : item.name;
                        } else if (item.quantity) {
                            return `Item (Qty: ${item.quantity})`;
                        } else {
                            return 'Unnamed item';
                        }
                    }).join(', ');
                } else {
                    console.warn(`No valid items for donation ${donation.id}:`, donation.items);
                    itemsString = 'No valid items found';
                }
            } else {
                console.warn(`Items field missing or not an array for donation ${donation.id}:`, donation.items);
            }

            // Handle address field
            const address = donation.address?.formattedAddress || (typeof donation.address === 'string' ? donation.address : 'N/A');

            let rowContent = '';
            if (currentDonorType === 'individual') {
                rowContent = `
                    <td>${start + index + 1}</td>
                    <td>${donation.name || 'N/A'}</td>
                    <td>${donation.type || 'Individual'}</td>
                    <td>${address}</td>
                    <td>${donation.number || 'N/A'}</td>
                    <td>${donation.email || 'N/A'}</td>
                    <td>${donation.assistance || 'N/A'}</td>
                    <td>₱${parseFloat(donation.valuation || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    <td>${itemsString}</td>
                    <td>${donation.additionalnotes || 'N/A'}</td>
                    <td>${donation.donationDate ? new Date(donation.donationDate).toLocaleDateString('en-PH') : 'N/A'}</td>
                    <td><span class="status-${donation.status ? donation.status.toLowerCase() : 'na'}">${donation.status || 'N/A'}</span></td>
                    <td>${permissions.canRetrieve ? `<button class="retrieveBtn" aria-label="Retrieve donation">Retrieve</button>` : ''}</td>
                `;
            } else if (currentDonorType === 'anonymous') {
                rowContent = `
                    <td>${start + index + 1}</td>
                    <td>${address}</td>
                    <td>${donation.number || 'N/A'}</td>
                    <td>${donation.email || 'N/A'}</td>
                    <td>${donation.additionalnotes || 'N/A'}</td>
                    <td>${donation.assistance || 'N/A'}</td>
                    <td>₱${parseFloat(donation.valuation || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    <td>${donation.type || 'Anonymous'}</td>
                    <td>${itemsString}</td>
                    <td>${donation.additionalnotes || 'N/A'}</td>
                    <td>${donation.donationDate ? new Date(donation.donationDate).toLocaleDateString('en-PH') : 'N/A'}</td>
                    <td><span class="status-${donation.status ? donation.status.toLowerCase() : 'na'}">${donation.status || 'N/A'}</span></td>
                    <td>${permissions.canRetrieve ? `<button class="retrieveBtn" aria-label="Retrieve donation">Retrieve</button>` : ''}</td>
                `;
            } else if (currentDonorType === 'corporate') {
                rowContent = `
                    <td>${start + index + 1}</td>
                    <td>${donation.name || 'N/A'}</td>
                    <td>${address}</td>
                    <td>${donation.number || 'N/A'}</td>
                    <td>${donation.email || 'N/A'}</td>
                    <td>${donation.additionalnotes || 'N/A'}</td>
                    <td>${donation.assistance || 'N/A'}</td>
                    <td>₱${parseFloat(donation.valuation || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    <td>${itemsString}</td>
                    <td>${donation.additionalnotes || 'N/A'}</td>
                    <td>${donation.donationDate ? new Date(donation.donationDate).toLocaleDateString('en-PH') : 'N/A'}</td>
                    <td><span class="status-${donation.status ? donation.status.toLowerCase() : 'na'}">${donation.status || 'N/A'}</span></td>
                    <td>${permissions.canRetrieve ? `<button class="retrieveBtn" aria-label="Retrieve donation">Retrieve</button>` : ''}</td>
                `;
            } else if (currentDonorType === 'foundation') {
                rowContent = `
                    <td>${start + index + 1}</td>
                    <td>${donation.name || 'N/A'}</td>
                    <td>${address}</td>
                    <td>${donation.contactPerson || 'N/A'}</td>
                    <td>${donation.number || 'N/A'}</td>
                    <td>${donation.email || 'N/A'}</td>
                    <td>${donation.assistance || 'N/A'}</td>
                    <td>₱${parseFloat(donation.valuation || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    <td>${itemsString}</td>
                    <td>${donation.additionalnotes || 'N/A'}</td>
                    <td>${donation.donationDate ? new Date(donation.donationDate).toLocaleDateString('en-PH') : 'N/A'}</td>
                    <td><span class="status-${donation.status ? donation.status.toLowerCase() : 'na'}">${donation.status || 'N/A'}</span></td>
                    <td>${permissions.canRetrieve ? `<button class="retrieveBtn" aria-label="Retrieve donation">Retrieve</button>` : ''}</td>
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
        currentDonorType = tabType; // Sync donor type with main tables
        filteredAndSortedArchivedDonations = [...allArchivedDonations]; // Reset to full dataset
        applySorting('archived', tabType, sortSelect?.value || 'donationDate-desc');
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
            // Apply sorting to all main donor types
            ['individual', 'anonymous', 'corporate', 'foundation'].forEach(type => {
                applySorting('main', type, sortSelect.value);
            });
            // Apply sorting to archived donations
            applySorting('archived', currentDonorType, sortSelect.value);
            // Render the current table (main or archived based on visibility)
            if (document.getElementById('archivedModal')?.style.display === 'flex') {
                renderArchivedTable();
            } else {
                renderTable(currentDonorType);
            }
        });
    }

    function applySorting(dataSource, donorType, sortVal) {
        const arr = dataSource === 'archived' ? filteredAndSortedArchivedDonations : filteredAndSortedDonations[donorType];
        if (!arr) return;

        arr.sort((a, b) => {
            // Primary sort: urgentNeed (true comes first)
            if (a.urgentNeed === true && b.urgentNeed !== true) return -1;
            if (b.urgentNeed === true && a.urgentNeed !== true) return 1;

            // If no sort value, default to donationDate descending
            if (!sortVal) {
                const dateA = a.donationDate ? new Date(a.donationDate).getTime() : Infinity;
                const dateB = b.donationDate ? new Date(b.donationDate).getTime() : Infinity;
                return dateB - dateA; // Newer dates first
            }

            const [field, direction] = sortVal.split('-');
            const fields = {
                donationDrive: 'name',
                contactPerson: 'contactPerson',
                accountName: 'name',
                dropOff: 'address',
                donationDate: 'donationDate',
                valuation: 'valuation'
            };
            const sortField = fields[field] || 'donationDate';

            // Handle different field types
            let valA, valB;
            if (sortField === 'donationDate') {
                valA = a[sortField] ? new Date(a[sortField]).getTime() : Infinity;
                valB = b[sortField] ? new Date(b[sortField]).getTime() : Infinity;
            } else if (sortField === 'valuation') {
                valA = parseFloat(a[sortField] || 0);
                valB = parseFloat(b[sortField] || 0);
            } else {
                valA = (a[sortField] || '').toString().toLowerCase();
                valB = (b[sortField] || '').toString().toLowerCase();
            }

            if (valA === valB) return 0;
            if (direction === 'asc') {
                return valA < valB ? -1 : 1;
            } else {
                return valA > valB ? -1 : 1;
            }
        });

        // For archived donations, filter by donorType after sorting
        if (dataSource === 'archived' && donorType) {
            filteredAndSortedArchivedDonations = filteredAndSortedArchivedDonations.filter(d => d.type.toLowerCase() === donorType);
        }
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
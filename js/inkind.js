import { renderPagination, updateEntriesInfo, getPaginatedData } from '../js/pagination.js';

document.addEventListener("DOMContentLoaded", () => {
    emailjs.init('zQTkHE6hGtoKPZM_L');

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

    const rowsPerPage = 10;
    let currentPage = 1;
    let allDonations = [];
    let filteredAndSortedDonations = [];
    let editingKey = null;
    let formHasChanges = false;
    let currentUserIsSuperAdmin = false;
    let currentUserAdminPosition = null;
    let allArchivedInKindDonation = [];
    let currentArchivedPage = 1;
    const archivedRowsPerPage = 5;

    // DOM elements
    const form = document.getElementById("form-container-1");
    const tableBody = document.querySelector("#inKindTable tbody");
    const searchInput = document.getElementById("searchInput");
    const sortSelect = document.getElementById("sortSelect");
    const exportBtn = document.getElementById("exportBtn");
    const savePdfBtn = document.getElementById("savePdfBtn");
    const entriesInfo = document.getElementById("entriesInfo");
    const paginationContainer = document.getElementById("pagination");
    const clearFormBtn = document.getElementById("clearFormBtn");
    const viewArchivedButton = document.getElementById('viewArchived');
    const archivedModal = document.getElementById('archivedModal');
    const closeArchivedModalBtn = document.getElementById('closeArchivedModalBtn');
    const archivedTableBody = document.querySelector('#archivedTable tbody');
    const archivedEntriesInfo = document.querySelector("#archivedEntriesInfo");
    const archivedPaginationContainer = document.querySelector("#archivedPagination");

    // Inactivity detection code remains unchanged
    let inactivityTimeout;
    const INACTIVITY_TIME = 1800000;

    // Function to validate email format
    function isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        const validDomains = ['gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com', 'icloud.com', 'protonmail.com'];
        const domain = email.split('@')[1]?.toLowerCase();
        return emailRegex.test(email) && validDomains.includes(domain);
    }

    // Function to validate mobile number format
    function isValidMobile(mobile) {
        const mobileRegex = /^09[0-9]{9}$/;
        return mobileRegex.test(mobile);
    }

    // Function to check if mobile number is already in use
    async function isMobileNumberInUse(mobile, excludeKey) {
        try {
            const paths = ['donations/inkind', 'deletedDonations/deletedinkind'];
            for (const path of paths) {
                const snapshot = await database.ref(path).once('value');
                const records = snapshot.val();
                if (records) {
                    for (const key in records) {
                        if (key !== excludeKey && records[key].number === mobile) {
                            return true;
                        }
                    }
                }
            }
            return false;
        } catch (error) {
            console.error("Error checking mobile number in use:", error);
            return false;
        }
    }

    // Function to check if email is already in use
    async function isEmailInUse(email, excludeKey) {
        try {
            const paths = ['donations/inkind', 'deletedDonations/deletedinkind'];
            for (const path of paths) {
                const snapshot = await database.ref(path).once('value');
                const records = snapshot.val();
                if (records) {
                    for (const key in records) {
                        if (key !== excludeKey && records[key].email === email) {
                            return true;
                        }
                    }
                }
            }
            return false;
        } catch (error) {
            console.error("Error checking email in use:", error);
            return false;
        }
    }

    function resetInactivityTimer() {
        clearTimeout(inactivityTimeout);
        inactivityTimeout = setTimeout(checkInactivity, INACTIVITY_TIME);
        console.log("Inactivity timer reset.");
    }

    function checkInactivity() {
        Swal.fire({
            title: 'Are you still there?',
            text: 'You\'ve been inactive for a while. Do you want to continue your session or log out?',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Stay Login',
            cancelButtonText: 'Log Out',
            reverseButtons: true,
            focusCancel: true,
            allowOutsideClick: false,
            customClass: {
                popup: 'custom-swal-popup-small',
                title: 'custom-swal-title',
                htmlContainer: 'custom-swal-content',
                confirmButton: 'custom-confirm-btn',
                cancelButton: 'custom-cancel-btn'
            },
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

    ['mousemove', 'keydown', 'scroll', 'click'].forEach(eventType => {
        document.addEventListener(eventType, resetInactivityTimer);
    });

    const updateSearchPlaceholder = () => {
        const selectedSort = sortSelect.value;
        let placeholderText = "Search";

        switch (selectedSort) {
            case "encoder-asc":
            case "encoder-desc":
                placeholderText = "Search by Encoder";
                break;
            case "name-asc":
            case "name-desc":
                placeholderText = "Search by Name";
                break;
            case "type-asc":
            case "type-desc":
                placeholderText = "Search by Type";
                break;
            case "address-asc":
            case "address-desc":
                placeholderText = "Search by Address";
                break;
            case "contactPerson-asc":
            case "contactPerson-desc":
                placeholderText = "Search by Contact Person";
                break;
            case "number-asc":
            case "number-desc":
                placeholderText = "Search by Number";
                break;
            case "email-asc":
            case "email-desc":
                placeholderText = "Search by Email";
                break;
            case "assistance-asc":
            case "assistance-desc":
                placeholderText = "Search by Type of Assistance";
                break;
            case "valuation-asc":
            case "valuation-desc":
                placeholderText = "Search by Valuation";
                break;
            case "notes-asc":
            case "notes-desc":
                placeholderText = "Search by Additional Notes";
                break;
            case "status-asc":
            case "status-desc":
                placeholderText = "Search by Status";
                break;
            case "staffIncharge-asc":
            case "staffIncharge-desc":
                placeholderText = "Search by Staff-In Charge";
                break;
            case "donationDate-asc":
            case "donationDate-desc":
                placeholderText = "Search by Donation Date";
                break;
            default:
                placeholderText = "Search by Name, Encoder, Staff-In Charge"; // Default broad search
        }
        searchInput.placeholder = placeholderText;
    };

    auth.onAuthStateChanged(user => {
        if (!user) {
            Swal.fire({
                icon: 'error',
                title: 'Authentication Required',
                text: 'Please sign in to access in-kind donations.',
            }).then(() => {
                window.location.href = "../pages/login.html";
            });
            return;
        }
        console.log("User authenticated:", user.uid);
        database.ref(`users/${user.uid}`).once('value', snapshot => {
            const userData = snapshot.val();
            currentUserIsSuperAdmin = userData && userData.isSuperAdmin === true;
            currentUserAdminPosition = userData && userData.adminPosition;
            console.log("Super Admin status:", currentUserIsSuperAdmin);
            console.log("Admin Position:", currentUserAdminPosition);
            loadDonations(user.uid);
            updateSearchPlaceholder();
            resetInactivityTimer();
        }).catch(error => {
            console.error("Error fetching user role:", error);
            currentUserIsSuperAdmin = false;
            currentUserAdminPosition = null;
            loadDonations(user.uid);
            updateSearchPlaceholder();
            resetInactivityTimer();
        });
    });

    function loadDonations(userUid) {
        database.ref("donations/inkind").on("value", snapshot => {
            allDonations = [];
            const donations = snapshot.val();
            if (donations) {
                Object.keys(donations).forEach(key => {
                    const donation = donations[key];
                    allDonations.push({
                        firebaseKey: key,
                        userUid: donation.userUid,
                        ...donation
                    });
                });
            }
            filteredAndSortedDonations = [...allDonations];
            renderTable();
        }, error => {
            console.error("Error fetching in-kind donations:", error);
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'Failed to load in-kind donations: ' + error.message,
            });
        });
    }

    function hasImportPermission() {
        return currentUserIsSuperAdmin || currentUserAdminPosition === 'position-one';
    }

    function showAccessDeniedAlert(action) {
        Swal.fire({
            title: 'Access Denied',
            text: `You do not have permission to ${action}.`,
            icon: 'error',
            timer: 2500,
            showConfirmButton: false,
            timerProgressBar: true,
            allowOutsideClick: false,
            customClass: {
                popup: 'swal2-popup-warning-clean',
                title: 'swal2-title-warning-clean',
                htmlContainer: 'swal2-text-warning-clean',
            }
        });
    }
  
    const isEmpty = (value) => value.trim() === "";
    const isLettersOnly = (value) => /^[a-zA-Z\s]+$/.test(value);
    const isValidNumber = (value) => /^\d+(\.\d+)?$/.test(value);

    const showError = (inputField, message) => {
        const errorDiv = inputField.nextElementSibling;
        if (!errorDiv || !errorDiv.classList.contains('error-message')) {
            const newErrorDiv = document.createElement('div');
            newErrorDiv.className = 'error-message';
            inputField.parentNode.insertBefore(newErrorDiv, inputField.nextSibling);
            newErrorDiv.textContent = message;
        } else {
            errorDiv.textContent = message;
        }
        inputField.classList.add('error');
    };

    const clearError = (inputField) => {
        const errorDiv = inputField.nextElementSibling;
        if (errorDiv && errorDiv.classList.contains('error-message')) {
            errorDiv.textContent = '';
        }
        inputField.classList.remove('error');
    };

    async function validateForm() {
    let isValid = true;
    const fieldsToCheck = [
        { input: form.encoder, label: "Encoder", lettersOnly: true },
        { input: form.name, label: "Name", lettersOnly: true },
        { input: form.type, label: "Type", lettersOnly: true },
        { input: form.contactPerson, label: "Contact Person", lettersOnly: true },
        { input: form.assistance, label: "Type of Assistance", lettersOnly: true },
        { input: form.number, label: "Number", numberOnly: true, checkMobile: true },
        { input: form.valuation, label: "Valuation", numberOnly: true },
        { input: form.address, label: "Address" },
        { input: form.email, label: "Email", checkEmail: true },
        { input: form.additionalnotes, label: "Additional Notes", required: false },
        { input: form.status, label: "Status" },
        { input: form.staffIncharge, label: "Staff-In Charge", lettersOnly: true },
        { input: document.getElementById("donationDate"), label: "Donation Date", isDate: true },
    ];

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (const { input, label, lettersOnly, numberOnly, checkEmail, checkMobile, isDate, required = true } of fieldsToCheck) {
        clearError(input);
        if (required && isEmpty(input.value)) {
            showError(input, `${label} is required`);
            isValid = false;
        } else if (!isEmpty(input.value) && lettersOnly && !isLettersOnly(input.value)) {
            showError(input, `${label} should only contain letters and spaces`);
            isValid = false;
        } else if (!isEmpty(input.value) && numberOnly && !isValidNumber(input.value)) {
            showError(input, `${label} should only contain numbers`);
            isValid = false;
        } else if (!isEmpty(input.value) && checkEmail && !isValidEmail(input.value)) {
            showError(input, 'Please enter a valid email address from an allowed domain.');
            isValid = false;
        } else if (!isEmpty(input.value) && checkMobile && !isValidMobile(input.value)) {
            showError(input, 'Mobile number must be 11 digits starting with "09"');
            isValid = false;
        } else if (isDate && !isEmpty(input.value)) {
            const donationDate = new Date(input.value);
            if (isNaN(donationDate.getTime())) {
                showError(input, `${label} is not a valid date`);
                isValid = false;
            } else if (donationDate.setHours(0,0,0,0) > today.setHours(0,0,0,0)) {
                showError(input, `${label} cannot be a future date`);
                isValid = false;
            }
        }
    }

    // Check for potential duplicates and warn user
    if (isValid) {
        const email = form.email.value.trim();
        const mobile = form.number.value.trim();
        const name = form.name.value.trim().toLowerCase();

        let isDuplicate = false;
        let duplicateFields = [];

        const paths = ['donations/inkind', 'deletedDonations/deletedinkind'];
        for (const path of paths) {
            const snapshot = await database.ref(path).once('value');
            const records = snapshot.val();
            if (records) {
                for (const key in records) {
                    const record = records[key];
                    if (record.email === email) {
                        isDuplicate = true;
                        duplicateFields.push('email');
                    }
                    if (record.number === mobile) {
                        isDuplicate = true;
                        duplicateFields.push('mobile number');
                    }
                    if (record.name.toLowerCase() === name) {
                        isDuplicate = true;
                        duplicateFields.push('name');
                    }
                }
            }
        }

        if (isDuplicate) {
            const result = await Swal.fire({
                title: 'Potential Duplicate Donation',
                html: `A donation with the same mobile number and email address already exists.<br><br>Do you want to proceed with adding this donation?`,
                icon: 'warning',
                showCancelButton: true,
                confirmButtonText: 'Yes, Add Donation',
                cancelButtonText: 'Cancel',
                reverseButtons: true,
                focusCancel: true,
                allowOutsideClick: false,
                customClass: {
                    popup: 'custom-swal-popup-large',
                    title: 'custom-swal-title',
                    htmlContainer: 'custom-swal-content',
                    confirmButton: 'custom-confirm-btn',
                    cancelButton: 'custom-cancel-btn'
                }
            });

            if (!result.isConfirmed) {
                isValid = false;
            }
        }
    }

    return isValid;
}

    form.addEventListener("input", () => {
        formHasChanges = true;
    });

    form.addEventListener("submit", async (e) => {
        e.preventDefault();

        if (!hasImportPermission()) {
            showAccessDeniedAlert('add this donation');
            return;
        }
        
        if (await validateForm()) {
            const user = auth.currentUser;
            if (!user) {
                Swal.fire("Error", "User not authenticated!", "error");
                return;
            }

            const newDonation = {
                encoder: form.encoder.value,
                name: form.name.value,
                type: form.type.value,
                address: form.address.value,
                contactPerson: form.contactPerson.value,
                number: form.number.value,
                email: form.email.value,
                assistance: form.assistance.value,
                valuation: form.valuation.value,
                additionalnotes: form.additionalnotes.value,
                status: form.status.value,
                staffIncharge: form.staffIncharge.value,
                donationDate: document.getElementById("donationDate").value,
                id: Date.now(),
                userUid: user.uid,
                createdAt: new Date().toISOString(),
            };

            database.ref("donations/inkind").push(newDonation)
            .then(() => {
                form.reset();
                formHasChanges = false;
                Swal.fire({
                    icon: 'success',
                    title: 'Donation Added!',
                    text: 'Your donation has been successfully recorded.',
                    timer: 2000,
                    showConfirmButton: false,
                    timerProgressBar: true,
                    background: '#e6f4ea',
                    color: '#1b5e20',
                    iconColor: '#2e7d32',
                    customClass: {
                        popup: 'swal2-popup-success-clean',
                        title: 'swal2-title-success-clean',
                        htmlContainer: 'swal2-text-success-clean'
                    }
                });
            })
            .catch(error => {
                console.error("Error adding donation:", error);
                Swal.fire({
                icon: 'error',
                title: 'Failed to Add Donation',
                text: 'An error occurred: ' + error.message,
                background: '#fcebea',         
                color: '#b71c1c',               
                iconColor: '#c62828',           
                confirmButtonColor: '#c62828',  
                customClass: {
                    popup: 'swal2-popup-error-clean',
                    title: 'swal2-title-error-clean',
                    content: 'swal2-text-error-clean'
                }
                });
            });
        }
    });

    clearFormBtn.addEventListener("click", () => {
        if (formHasChanges) {
            Swal.fire({
            title: 'Discard Changes?',
            text: 'You have unsaved changes. Are you sure you want to clear the form?',
            icon: 'warning',                                
            iconColor: '#f57c00',               
            showCancelButton: true,
            confirmButtonColor: '#c62828',      
            cancelButtonColor: '#546e7a',        
            confirmButtonText: 'Yes, clear it!',
            cancelButtonText: 'No, keep editing',
            reverseButtons: true,               
            customClass: {
                popup: 'swal2-popup-warning-clean',
                title: 'swal2-title-warning-clean',
                content: 'swal2-text-warning-clean',
                confirmButton: 'swal2-button-confirm-clean',
                cancelButton: 'swal2-button-cancel-clean'
            }
            }).then((result) => {
                if (result.isConfirmed) {
                    form.reset();
                    formHasChanges = false;
                    const errorMessages = form.querySelectorAll('.error-message');
                    errorMessages.forEach(msg => msg.textContent = '');
                    const errorInputs = form.querySelectorAll('.error');
                    errorInputs.forEach(input => input.classList.remove('error'));
                }
            });
        } else {
            form.reset();
            const errorMessages = form.querySelectorAll('.error-message');
            errorMessages.forEach(msg => msg.textContent = '');
            const errorInputs = form.querySelectorAll('.error');
            errorInputs.forEach(input => input.classList.remove('error'));
        }
    });

    function deleteRow(firebaseKey) {
        Swal.fire({
            title: 'Are you sure?',
            text: ' This donation entry will be removed from the list but kept in the deleted donations archive.',
            icon: 'warning',
            iconColor: '#ffa000',
            showCancelButton: true,
            confirmButtonColor: '#dlaub2f2f',
            cancelButtonColor: '#546e7a',
            confirmButtonText: 'Yes, delete it!',
            cancelButtonText: 'Cancel',
            reverseButtons: true,
            customClass: {
                popup: 'swal2-popup-delete-clean',
                title: 'swal2-title-delete-clean',
                content: 'swal2-text-delete-clean',
                confirmButton: 'swal2-button-confirm-clean',
                cancelButton: 'swal2-button-cancel-clean'
            }
        }).then((result) => {
            if (result.isConfirmed) {
                const donationToDelete = allDonations.find(d => d.firebaseKey === firebaseKey);
                if (!donationToDelete) {
                    Swal.fire("Error", "Donation not found!", "error");
                    return;
                }

                const deletedDonation = {
                    ...donationToDelete,
                    deletedAt: new Date().toISOString()
                };

                database.ref(`deleteddonations/deletedinkind/${firebaseKey}`).set(deletedDonation)
                    .then(() => {
                        return database.ref(`donations/inkind/${firebaseKey}`).remove();
                    })
                    .then(() => {
                        Swal.fire('Deleted!', 'The donation entry has been moved to deleted donations.', 'success');
                        renderTable();
                    })
                    .catch(error => {
                        console.error("Error moving donation to deleted donations:", error);
                        Swal.fire("Error", "Failed to delete donation: " + error.message, "error");
                    });
            }
        });
    }

    async function fetchAndRenderArchivedDonations() {
        if (!currentUserIsSuperAdmin) {
            Swal.fire('Access Denied', 'You do not have permission to view archived donations.', 'error');
            return;
        }

        Swal.fire({
            title: 'Loading Archived Donations',
            text: 'Fetching archived data from Firebase...',
            allowOutsideClick: false,
            didOpen: () => {
                Swal.showLoading();
            }
        });

        try {
            const snapshot = await database.ref('deleteddonations/deletedinkind').once('value');
            const archivedDonations = snapshot.val();
            allArchivedInKindDonation = [];

            for (const key in archivedDonations) {
                const donation = archivedDonations[key];
                allArchivedInKindDonation.push({
                    firebaseKey: key,
                    ...donation
                });
            }
            Swal.close();
            renderArchivedTable(allArchivedInKindDonation);
            archivedModal.style.display = 'flex';
        } catch (error) {
            Swal.fire('Error', 'Failed to load archived donation data: ' + error.message, 'error');
            console.error("Error fetching archived donation data:", error);
        }
    }

    function renderArchivedTable(data) {
        if (!archivedTableBody) {
            console.error("Archived donation table body not found!");
            return;
        }

        archivedTableBody.innerHTML = '';

        const paginatedData = getPaginatedData(data, currentArchivedPage, archivedRowsPerPage);

        if (paginatedData.length === 0) {
            archivedTableBody.innerHTML = '<tr><td colspan="16" style="text-align: center;">No archived donation records found.</td></tr>';
        }

        paginatedData.forEach((donation, index) => {
            const row = archivedTableBody.insertRow();
            row.dataset.firebaseKey = donation.firebaseKey;

            const archivedDate = donation.deletedAt ? new Date(donation.deletedAt).toLocaleDateString() : 'N/A';

            row.insertCell(0).textContent = ((currentArchivedPage - 1) * archivedRowsPerPage + index + 1);
            row.insertCell(1).textContent = donation.encoder || 'N/A';
            row.insertCell(2).textContent = donation.name || 'N/A';
            row.insertCell(3).textContent = donation.type || 'N/A';
            row.insertCell(4).textContent = donation.address || 'N/A';
            row.insertCell(5).textContent = donation.contactPerson || 'N/A';
            row.insertCell(6).textContent = donation.number || 'N/A';
            row.insertCell(7).textContent = donation.email || 'N/A';
            row.insertCell(8).textContent = donation.assistance || 'N/A';
            row.insertCell(9).textContent = `₱${parseFloat(donation.valuation || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
            row.insertCell(10).textContent = donation.additionalnotes || 'N/A';
            row.insertCell(11).textContent = donation.staffIncharge || 'N/A';
            row.insertCell(12).textContent = donation.status || 'N/A';
            row.insertCell(13).textContent = donation.donationDate || 'N/A';
            row.insertCell(14).textContent = archivedDate;

            const actionsCell = row.insertCell(15);
            actionsCell.innerHTML = `
                <button class="retrieveBtn" data-firebase-key="${donation.firebaseKey}">Retrieve</button>
            `;
        });

        document.querySelectorAll('.retrieveBtn').forEach(button => {
            button.addEventListener('click', (event) => retrieveDonation(event.target.dataset.firebaseKey));
        });

        renderPagination(data, currentArchivedPage, archivedRowsPerPage, archivedPaginationContainer, (newPage) => {
            currentArchivedPage = newPage;
            renderArchivedTable(data);
        });
        updateEntriesInfo(data, currentArchivedPage, archivedRowsPerPage, archivedEntriesInfo);
    }

    async function retrieveDonation(firebaseKey) {
        if (!currentUserIsSuperAdmin) {
            Swal.fire('Access Denied', 'You do not have permission to retrieve donation records.', 'error');
            return;
        }

        Swal.fire({
            title: 'Are you sure?',
            text: 'This will retrieve the donation record from archived records and make it active again.',
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: 'Yes, retrieve it!',
            cancelButtonText: 'No, keep it archived',
            customClass: {
                popup: 'swal2-popup-warning-clean',
                title: 'swal2-title-warning-clean',
                content: 'swal2-text-warning-clean',
                confirmButton: 'swal2-button-confirm-clean',
                cancelButton: 'swal2-button-cancel-clean'
            }
        }).then(async (result) => {
            if (result.isConfirmed) {
                Swal.fire({
                    title: 'Retrieving Donation...',
                    text: 'Moving donation data back to active records...',
                    allowOutsideClick: false,
                    didOpen: () => {
                        Swal.showLoading();
                    }
                });

                try {
                    const snapshot = await database.ref(`deleteddonations/deletedinkind/${firebaseKey}`).once('value');
                    const donationDataToRetrieve = snapshot.val();

                    if (!donationDataToRetrieve) {
                        Swal.fire('Error', 'Archived donation data not found for retrieval.', 'error');
                        return;
                    }

                    delete donationDataToRetrieve.deletedAt;

                    await database.ref(`donations/inkind/${firebaseKey}`).set(donationDataToRetrieve);
                    await database.ref(`deleteddonations/deletedinkind/${firebaseKey}`).remove();

                    Swal.close();
                    Swal.fire('Retrieved!', 'The donation record has been retrieved and is now active.', 'success');
                    renderTable();
                    fetchAndRenderArchivedDonations();
                } catch (error) {
                    console.error("Error retrieving donation:", error);
                    Swal.close();
                    Swal.fire('Error', 'Failed to retrieve donation: ' + error.message, 'error');
                }
            }
        });
    }

    if (viewArchivedButton) {
        viewArchivedButton.addEventListener('click', () => {
            currentArchivedPage = 1;
            fetchAndRenderArchivedDonations();
        });
    }

    if (closeArchivedModalBtn) {
        closeArchivedModalBtn.addEventListener('click', () => {
            archivedModal.style.display = 'none';
        });
    }

    document.addEventListener('click', (event) => {
        if (event.target === archivedModal) {
            archivedModal.style.display = 'none';
        }
        if (event.target === document.getElementById("endorseModal")) {
            document.getElementById("endorseModal").style.display = "none";
        }
        if (event.target === document.getElementById("editModal")) {
            closeEditModal();
        }
    });

    async function handleExcelFileSelect(event) {
        const file = event.target.files[0];
        if (!file) return;

        if (!hasImportPermission()) {
            showAccessDeniedAlert('import in-kind donations');
            return;
        }

        importProgressBar.style.width = '0%';
        importProgressBar.textContent = '0%';
        importProgressBar.style.backgroundColor = '#4CAF50';
        importStatusText.textContent = 'Reading Excel file...';
        importErrorList.innerHTML = '';
        importStatusModal.style.display = 'flex';

        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, { type: 'array' });
                const firstSheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[firstSheetName];
                const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

                if (jsonData.length === 0) {
                    throw new Error("The Excel file is empty or could not be read.");
                }

                const headers = jsonData[0];
                const rows = jsonData.slice(1);
                const columnMap = {
                    'Encoder': 'encoder',
                    'Name': 'name',
                    'Type': 'type',
                    'Address': 'address',
                    'Contact Person': 'contactPerson',
                    'Number': 'number',
                    'Email': 'email',
                    'Type of Assistance': 'assistance',
                    'Valuation': 'valuation',
                    'Additional Notes': 'additionalnotes',
                    'Status': 'status',
                    'Staff-In Charge': 'staffIncharge',
                    'Donation Date': 'donationDate'
                };

                const expectedHeaders = Object.keys(columnMap);
                const mappedData = [];
                const importErrors = [];
                let processedCount = 0;
                const totalRecords = rows.length;

                if (totalRecords === 0) {
                    Swal.fire('No Data', 'The Excel file contains headers but no data rows.', 'info');
                    importStatusModal.style.display = 'none';
                    return;
                }

                importStatusText.textContent = `Validating and preparing ${totalRecords} records...`;

                // Fetch existing records from Firebase for duplicate checking
                const activeSnapshot = await database.ref('donations/inkind').once('value');
                const deletedSnapshot = await database.ref('deletedDonations/deletedinkind').once('value');

                const existingRecords = new Set();
                [activeSnapshot, deletedSnapshot].forEach(snapshot => {
                    if (snapshot.exists()) {
                        snapshot.forEach(child => {
                            const data = child.val();
                            if (data.name) {
                                existingRecords.add(data.name.trim().toLowerCase());
                            }
                            if (data.email) {
                                existingRecords.add(data.email.trim().toLowerCase());
                            }
                        });
                    }
                });

                for (let i = 0; i < totalRecords; i++) {
                    const row = rows[i];
                    const record = {};
                    let isValidRecord = true;
                    const rowErrors = [];

                    headers.forEach((header, index) => {
                        const firebaseKey = columnMap[header.trim()];
                        if (firebaseKey) {
                            record[firebaseKey] = row[index];
                        }
                    });

                    // Validate required fields
                    if (!record.encoder || record.encoder.trim() === '') {
                        isValidRecord = false;
                        rowErrors.push('Missing Encoder');
                    }
                    if (!record.name || record.name.trim() === '') {
                        isValidRecord = false;
                        rowErrors.push('Missing Name');
                    }
                    if (!record.type || record.type.trim() === '') {
                        isValidRecord = false;
                        rowErrors.push('Missing Type');
                    }
                    if (!record.contactPerson || record.contactPerson.trim() === '') {
                        isValidRecord = false;
                        rowErrors.push('Missing Contact Person');
                    }
                    if (!record.number || record.number.toString().trim() === '') {
                        isValidRecord = false;
                        rowErrors.push('Missing Number');
                    } else if (!isValidMobile(record.number.toString())) {
                        isValidRecord = false;
                        rowErrors.push('Mobile number must be 11 digits starting with "09"');
                    }
                    if (!record.email || record.email.trim() === '' || !isValidEmail(record.email)) {
                        isValidRecord = false;
                        rowErrors.push('Invalid or Missing Email');
                    }
                    if (!record.assistance || record.assistance.trim() === '') {
                        isValidRecord = false;
                        rowErrors.push('Missing Type of Assistance');
                    }
                    if (!record.valuation || record.valuation.toString().trim() === '' || !isValidNumber(record.valuation)) {
                        isValidRecord = false;
                        rowErrors.push('Invalid or Missing Valuation');
                    }
                    if (!record.status || record.status.trim() === '') {
                        isValidRecord = false;
                        rowErrors.push('Missing Status');
                    }
                    if (!record.staffIncharge || record.staffIncharge.trim() === '') {
                        isValidRecord = false;
                        rowErrors.push('Missing Staff-In Charge');
                    }

                    // Check for duplicates
                    const nameLower = record.name ? record.name.trim().toLowerCase() : '';
                    const emailLower = record.email ? record.email.trim().toLowerCase() : '';
                    const number = record.number ? record.number.toString().trim() : '';
                    if (nameLower && existingRecords.has(nameLower)) {
                        isValidRecord = false;
                        rowErrors.push('Duplicate Name');
                    }
                    if (emailLower && existingRecords.has(emailLower)) {
                        isValidRecord = false;
                        rowErrors.push('Duplicate Email');
                    }
                    if (number && existingRecords.has(number)) {
                        isValidRecord = false;
                        rowErrors.push('Duplicate Number');
                    }
                    if (!record.donationDate) {
                        record.donationDate = new Date().toISOString().slice(0, 10);
                    } else {
                        try {
                            const date = new Date(record.donationDate);
                            if (isNaN(date.getTime())) {
                                throw new Error("Invalid Date");
                            }
                            const today = new Date();
                            today.setHours(0, 0, 0, 0);
                            if (date.setHours(0, 0, 0, 0) > today.setHours(0, 0, 0, 0)) {
                                isValidRecord = false;
                                rowErrors.push('Donation Date cannot be a future date');
                            } else {
                                record.donationDate = date.toISOString().slice(0, 10);
                            }
                        } catch (e) {
                            isValidRecord = false;
                            rowErrors.push('Invalid Donation Date format');
                        }
                    }

                    record.id = Date.now();
                    record.userUid = auth.currentUser.uid;
                    record.createdAt = new Date().toISOString();
                    record.status = 'Pending';

                    if (isValidRecord) {
                        mappedData.push(record);
                    } else {
                        importErrors.push(`Row ${i + 2} (${record.name || 'N/A'}): ${rowErrors.join(', ')}`);
                    }
                }

                if (mappedData.length === 0) {
                    Swal.fire({
                        icon: 'error',
                        title: 'No Valid Records',
                        text: 'No valid records found in the Excel file after validation. Check errors for details.',
                        confirmButtonText: 'OK',
                        allowOutsideClick: false,
                        customClass: {
                            popup: 'swal2-popup-warning-clean',
                            title: 'swal2-title-warning-clean',
                            htmlContainer: 'swal2-text-warning-clean',
                            confirmButton: 'my-warning-button'
                        }
                    });
                    importErrorList.innerHTML = importErrors.map(err => `<li>${err}</li>`).join('');
                    importProgressBar.style.backgroundColor = '#f44336';
                    return;
                }

                importStatusText.textContent = `Importing ${mappedData.length} valid records to Firebase...`;

                let successCount = 0;
                let currentErrors = [];

                for (const donationData of mappedData) {
                    try {
                        const newDonationRef = database.ref('donations/inkind').push();
                        await newDonationRef.set(donationData);
                        successCount++;
                    } catch (error) {
                        console.error("Error importing donation:", donationData.name, error);
                        currentErrors.push(`Failed to import "${donationData.name || 'N/A'}": ${error.message}`);
                    }
                    processedCount++;
                    const progress = Math.round((processedCount / rows.length) * 100);
                    importProgressBar.style.width = `${progress}%`;
                    importProgressBar.textContent = `${progress}%`;
                    importStatusText.textContent = `Processing ${processedCount}/${rows.length} records...`;
                }

                importErrorList.innerHTML = importErrors.concat(currentErrors).map(err => `<li>${err}</li>`).join('');
                if (successCount > 0) {
                    Swal.fire({
                        title: 'Import Complete!',
                        html: `Successfully imported ${successCount} new donations. ${importErrors.length + currentErrors.length > 0 ? `<br><br><strong>${importErrors.length + currentErrors.length} issues occurred (including duplicates). Check the status modal for details.</strong>` : ''}`,
                        icon: 'success',
                        timer: 1600,
                        showConfirmButton: false,
                        timerProgressBar: true,
                        customClass: {
                            popup: 'swal2-popup-success-clean',
                            title: 'swal2-title-success-clean',
                            htmlContainer: 'swal2-text-success-clean',
                        }
                    }).then(() => {
                        loadDonations(auth.currentUser.uid);
                        importStatusModal.style.display = 'none';
                    });
                } else {
                    Swal.fire({
                        title: 'Import Failed',
                        html: 'No donations were successfully imported. Please check for errors in the status modal.',
                        icon: 'error',
                        confirmButtonText: 'OK',
                        allowOutsideClick: false,
                        customClass: {
                            popup: 'swal2-popup-warning-clean',
                            title: 'swal2-title-warning-clean',
                            htmlContainer: 'swal2-text-warning-clean',
                            confirmButton: 'my-warning-button'
                        }
                    });
                }

            } catch (error) {
                console.error("Error processing Excel file:", error);
                Swal.fire({
                    title: 'Error',
                    html: `Failed to process Excel file: ${error.message}`,
                    icon: 'error',
                    confirmButtonText: 'OK',
                    allowOutsideClick: false,
                    customClass: {
                        popup: 'swal2-popup-error-clean',
                        title: 'swal2-title-error-clean',
                        htmlContainer: 'swal2-text-error-clean',
                        confirmButton: 'my-error-button'
                    }
                });
                importProgressBar.style.backgroundColor = '#f44336';
                importStatusText.textContent = `Error: ${error.message}`;
                importStatusModal.style.display = 'flex';
            } finally {
                event.target.value = '';
            }
        };

        reader.readAsArrayBuffer(file);
    }

    function renderTable() {
        const startIndex = (currentPage - 1) * rowsPerPage;
        const endIndex = startIndex + rowsPerPage;
        const currentPageRows = filteredAndSortedDonations.slice(startIndex, endIndex);

        tableBody.innerHTML = "";
        if (currentPageRows.length === 0) {
            const noResultsRow = document.createElement("tr");
            noResultsRow.innerHTML = `<td colspan="16" style="text-align: center; padding: 20px;">No donations found matching your criteria.</td>`;
            tableBody.appendChild(noResultsRow);
        } else {
            currentPageRows.forEach((d, i) => {
                const tr = document.createElement("tr");
                tr.innerHTML = `
                    <td>${startIndex + i + 1}</td>
                    <td>${d.encoder}</td>
                    <td>${d.name}</td>
                    <td>${d.type}</td>
                    <td>${d.address}</td>
                    <td>${d.contactPerson}</td>
                    <td>${d.number}</td>
                    <td>${d.email}</td>
                    <td>${d.assistance}</td>
                    <td>₱${parseFloat(d.valuation).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    <td>${d.additionalnotes}</td>
                    <td>${d.staffIncharge}</td>
                    <td>${d.status}</td>
                    <td>${d.donationDate || 'N/A'}</td>
                    <td>
                        <button class="editBtn"><i class="bx bx-edit"></i></button>
                        <button class="deleteBtn"><i class="bx bx-x-circle"></i></button>
                        <button class="savePDFBtn"><i class="bx bxs-file-pdf"></i></button></td>
                    </td>
                    <td>
                        <button class="endorseBtn"><i class="bx bx-send"></i></button>
                    </td>
                `;
                tr.querySelector(".editBtn").addEventListener("click", () => openEditModal(d.firebaseKey));
                tr.querySelector(".deleteBtn").addEventListener("click", () => deleteRow(d.firebaseKey));
                tr.querySelector(".endorseBtn").addEventListener("click", () => openEndorseModal(d.firebaseKey));
                tr.querySelector(".savePDFBtn").addEventListener("click", () => saveSingleDonationPdf(d));

                tableBody.appendChild(tr);
            });
        }

        updatePaginationInfo();
        renderPagination();
    }

    function updatePaginationInfo() {
        const totalEntries = filteredAndSortedDonations.length;
        const startEntry = (currentPage - 1) * rowsPerPage + 1;
        const endEntry = Math.min(currentPage * rowsPerPage, totalEntries);
        entriesInfo.textContent = `Showing ${startEntry} to ${endEntry} of ${totalEntries} entries`;
        if (totalEntries === 0) {
            entriesInfo.textContent = `Showing 0 to 0 of 0 entries`;
        }
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

    function renderPagination() {
        paginationContainer.innerHTML = '';
        const totalPages = Math.ceil(filteredAndSortedDonations.length / rowsPerPage);

        if (totalPages === 0 || filteredAndSortedDonations.length === 0) {
            paginationContainer.innerHTML = '<span>No entries to display</span>';
            return;
        }

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

    searchInput.addEventListener("input", () => {
        const searchTerm = searchInput.value.toLowerCase();
        const currentSort = sortSelect.value;
        filteredAndSortedDonations = allDonations.filter(d => {
            if (currentSort.includes('encoder')) return d.encoder.toLowerCase().includes(searchTerm);
            if (currentSort.includes('name')) return d.name.toLowerCase().includes(searchTerm);
            if (currentSort.includes('type')) return d.type.toLowerCase().includes(searchTerm);
            if (currentSort.includes('address')) return d.address.toLowerCase().includes(searchTerm);
            if (currentSort.includes('contactPerson')) return d.contactPerson.toLowerCase().includes(searchTerm);
            if (currentSort.includes('number')) return String(d.number).includes(searchTerm); // Number as string
            if (currentSort.includes('email')) return d.email.toLowerCase().includes(searchTerm);
            if (currentSort.includes('assistance')) return d.assistance.toLowerCase().includes(searchTerm);
            if (currentSort.includes('valuation')) return String(d.valuation).includes(searchTerm); // Valuation as string
            if (currentSort.includes('notes')) return d.additionalnotes.toLowerCase().includes(searchTerm);
            if (currentSort.includes('status')) return d.status.toLowerCase().includes(searchTerm);
            if (currentSort.includes('staffIncharge')) return d.staffIncharge.toLowerCase().includes(searchTerm);
            if (currentSort.includes('donationDate')) return d.donationDate.toLowerCase().includes(searchTerm);
            
            // Default broad search if no specific sort or 'Sort by' is selected
            return d.name.toLowerCase().includes(searchTerm) ||
                   d.encoder.toLowerCase().includes(searchTerm) ||
                   d.staffIncharge.toLowerCase().includes(searchTerm);
        });
        currentPage = 1;
        renderTable();
    });

    sortSelect.addEventListener("change", () => {
        const sortVal = sortSelect.value;
        applySorting(filteredAndSortedDonations, sortVal);
        updateSearchPlaceholder(); // New: Update placeholder when sort changes
        renderTable();
    });

    function applySorting(arr, sortVal) {
        if (sortVal === "encoder-asc") arr.sort((a, b) => a.encoder.localeCompare(b.encoder));
        else if (sortVal === "encoder-desc") arr.sort((a, b) => b.encoder.localeCompare(a.encoder));
        else if (sortVal === "name-asc") arr.sort((a, b) => a.name.localeCompare(b.name));
        else if (sortVal === "name-desc") arr.sort((a, b) => b.name.localeCompare(a.name));
        else if (sortVal === "type-asc") arr.sort((a, b) => a.type.localeCompare(b.type));
        else if (sortVal === "type-desc") arr.sort((a, b) => b.type.localeCompare(a.type));
        else if (sortVal === "address-asc") arr.sort((a, b) => a.address.localeCompare(b.address));
        else if (sortVal === "address-desc") arr.sort((a, b) => b.address.localeCompare(a.address));
        else if (sortVal === "contactPerson-asc") arr.sort((a, b) => a.contactPerson.localeCompare(b.contactPerson));
        else if (sortVal === "contactPerson-desc") arr.sort((a, b) => b.contactPerson.localeCompare(a.contactPerson));
        else if (sortVal === "number-asc") arr.sort((a, b) => parseInt(a.number) - parseInt(b.number));
        else if (sortVal === "number-desc") arr.sort((a, b) => parseInt(b.number) - parseInt(a.number));
        else if (sortVal === "email-asc") arr.sort((a, b) => a.email.localeCompare(b.email));
        else if (sortVal === "email-desc") arr.sort((a, b) => b.email.localeCompare(a.email));
        else if (sortVal === "assistance-asc") arr.sort((a, b) => a.assistance.localeCompare(b.assistance));
        else if (sortVal === "assistance-desc") arr.sort((a, b) => b.assistance.localeCompare(a.assistance));
        else if (sortVal === "valuation-asc") arr.sort((a, b) => parseFloat(a.valuation) - parseFloat(b.valuation));
        else if (sortVal === "valuation-desc") arr.sort((a, b) => parseFloat(b.valuation) - parseFloat(a.valuation));
        else if (sortVal === "notes-asc") arr.sort((a, b) => a.additionalnotes.localeCompare(b.additionalnotes));
        else if (sortVal === "notes-desc") arr.sort((a, b) => b.additionalnotes.localeCompare(a.additionalnotes));
        else if (sortVal === "status-asc") arr.sort((a, b) => a.status.localeCompare(b.status));
        else if (sortVal === "status-desc") arr.sort((a, b) => b.status.localeCompare(a.status));
        else if (sortVal === "staffIncharge-asc") arr.sort((a, b) => a.staffIncharge.localeCompare(b.staffIncharge));
        else if (sortVal === "staffIncharge-desc") arr.sort((a, b) => b.staffIncharge.localeCompare(a.staffIncharge));
        else if (sortVal === "donationDate-asc") arr.sort((a, b) => new Date(a.donationDate) - new Date(b.donationDate));
        else if (sortVal === "donationDate-desc") arr.sort((a, b) => new Date(b.donationDate) - new Date(a.donationDate));
    }

    // --- Excel Export Functionality ---
    exportBtn.addEventListener("click", () => {
        if (allDonations.length === 0) {
            Swal.fire("Info", "No data to export!", "info");
            return;
        }

        const dataForExport = allDonations.map((d, i) => ({
            "No.": i + 1,
            "Encoder": d.encoder,
            "Name": d.name,
            "Type": d.type,
            "Address": d.address,
            "Contact Person": d.contactPerson,
            "Number": String(d.number),
            "Email": d.email,
            "Type of Assistance": d.assistance,
            "Valuation": parseFloat(d.valuation),
            "Additional Notes": d.additionalnotes,
            "Staff-In Charge": d.staffIncharge,
            "Status": d.status,
            "Donation Date": d.donationDate
        }));

        const ws = XLSX.utils.json_to_sheet(dataForExport);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "In-Kind Donations");
        // Get current date and format it for the filename
        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0'); 
        const day = String(today.getDate()).padStart(2, '0');
        const formattedDate = `${year}-${month}-${day}`;
        // Construct the filename with the date
        const filename = `in-kind-donations_${formattedDate}.xlsx`;
        XLSX.writeFile(wb, filename);
        Swal.fire("Success", `In-Kind Donations exported to ${filename}!`, "success");
    });

    // --- PDF Export Functionality (All Data) ---
    savePdfBtn.addEventListener("click", () => {
        if (allDonations.length === 0) {
            Swal.fire("Info", "No data to export to PDF!", "info");
            return;
        }

        const { jsPDF } = window.jspdf;
        const doc = new jsPDF('landscape');

        let yOffset = 20;
        const logo = new Image();
        logo.src = '../assets/images/AB_logo.png';

        logo.onload = function() {
            const pageWidth = doc.internal.pageSize.width;
            const logoWidth = 30;
            const logoHeight = (logo.naturalHeight / logo.naturalWidth) * logoWidth;
            const margin = 14;

            doc.addImage(logo, 'PNG', pageWidth - logoWidth - margin, margin, logoWidth, logoHeight);

            doc.setFontSize(18);
            doc.text("In-Kind Donations Report", 14, yOffset);
            yOffset += 10;
            doc.setFontSize(10);
            doc.text(`Report Generated: ${new Date().toLocaleString()}`, 14, yOffset);
            yOffset += 15;

            const head = [[
                "No.", "Encoder", "Name", "Type", "Address", "Contact Person",
                "Number", "Email", "Type of Assistance", "Valuation",
                "Additional Notes", "Staff-In Charge", "Status", "Donation Date"
            ]];

            const body = allDonations.map((d, i) => [
                i + 1,
                d.encoder || 'N/A',
                d.name || 'N/A',
                d.type || 'N/A',
                d.address || 'N/A',
                String(d.contactPerson) || 'N/A',
                String(d.number) || 'N/A',
                d.email || 'N/A',
                d.assistance || 'N/A',
                `PHP ${parseFloat(d.valuation || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
                d.additionalnotes || 'N/A',
                d.staffIncharge || 'N/A',
                d.status || 'N/A',
                d.donationDate || 'N/A'
            ]);

            doc.autoTable({
                head: head,
                body: body,
                startY: yOffset,
                theme: 'grid',
                headStyles: {
                    fillColor: [20, 174, 187],
                    textColor: [255, 255, 255],
                    halign: 'center'
                },
                styles: {
                    fontSize: 8,
                    cellPadding: 2
                },
                didDrawPage: function (data) {
                    doc.setFontSize(8);
                    const pageNumberText = `Page ${data.pageNumber} of ${doc.internal.getNumberOfPages()}`;
                    const poweredByText = "Powered by: Appvance";
                    const pageWidth = doc.internal.pageSize.width;
                    const margin = data.settings.margin.left;
                    const footerY = doc.internal.pageSize.height - 10;

                    doc.text(pageNumberText, margin, footerY);
                    doc.text(poweredByText, pageWidth - margin, footerY, { align: 'right' });
                }
            });

            const filename = `all-in-kind-donations_${new Date().toISOString().slice(0, 10)}.pdf`;
            doc.save(filename);
            Swal.close();
            Swal.fire("Success", `All In-Kind Donations exported to "${filename}"`, "success");
        };

        logo.onerror = function() {
            Swal.fire("Error", "Failed to load logo image. Please check the path.", "error");
        };
    });

    // --- Save Single Donation to PDF ---
    function saveSingleDonationPdf(donation) {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();

        const logo = new Image();
        logo.src = '../assets/images/AB_logo.png';

        logo.onload = function() {
            const pageWidth = doc.internal.pageSize.width;
            const logoWidth = 30;
            const logoHeight = (logo.naturalHeight / logo.naturalWidth) * logoWidth;
            const margin = 14;

            doc.addImage(logo, 'PNG', pageWidth - logoWidth - margin, margin, logoWidth, logoHeight);

            doc.setFontSize(18);
            doc.text("In-Kind Donation Details", 14, 22);
            doc.setFontSize(10);
            doc.text(`Report Generated: ${new Date().toLocaleString()}`, 14, 30);
            let y = 45;

            const addDetail = (label, value) => {
                doc.text(`${label}: ${value || 'N/A'}`, 14, y);
                y += 7;
            };

            addDetail("Encoder", donation.encoder);
            addDetail("Name", donation.name);
            addDetail("Type", donation.type);
            addDetail("Address", donation.address);
            addDetail("Contact Person", donation.contactPerson);
            addDetail("Number", String(donation.number));
            addDetail("Email", donation.email);
            addDetail("Type of Assistance", donation.assistance);
            addDetail("Valuation", `PHP ${parseFloat(donation.valuation || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
            addDetail("Staff-In Charge", donation.staffIncharge);
            addDetail("Status", donation.status);
            addDetail("Donation Date", donation.donationDate || 'N/A');
            addDetail("Recorded On", new Date(donation.createdAt).toLocaleString());


            doc.setFontSize(8);
            const footerY = doc.internal.pageSize.height - 10;
            const pageNumberText = `Page 1 of 1`;
            const poweredByText = "Powered by: Appvance";

            doc.text(pageNumberText, margin, footerY);
            doc.text(poweredByText, pageWidth - margin, footerY, { align: 'right' });

            doc.save(`donation_${new Date().toISOString().slice(0, 10)}.pdf`);
            Swal.fire({
            title: 'Export Successful!',
            text: 'Donation details have been exported to PDF.',
            icon: 'success',
            color: '#1b5e20',
            iconColor: '#43a047',
            confirmButtonColor: '#388e3c',
            confirmButtonText: 'Great!',
            customClass: {
                popup: 'swal2-popup-success-export',
                title: 'swal2-title-success-export',
                content: 'swal2-text-success-export',
                confirmButton: 'swal2-button-success-export'
            }
            });

        };

        logo.onerror = function() {
            Swal.fire("Error", "Failed to load logo image. Please check the path.", "error");
        };
    }

    function deleteRow(firebaseKey) {
       Swal.fire({
        title: 'Are you sure?',
        text: 'This donation entry will be removed from the list but kept in the deleted donations archive.',
        icon: 'warning',
        iconColor: '#ffa000',
        showCancelButton: true,
        confirmButtonColor: '#d32f2f',  
        cancelButtonColor: '#546e7a',  
        confirmButtonText: 'Yes, delete it!',
        cancelButtonText: 'Cancel',
        reverseButtons: true,
        customClass: {
            popup: 'swal2-popup-delete-clean',
            title: 'swal2-title-delete-clean',
            content: 'swal2-text-delete-clean',
            confirmButton: 'swal2-button-confirm-clean',
            cancelButton: 'swal2-button-cancel-clean'
        }
        }).then((result) => {
            if (result.isConfirmed) {
                const donationToDelete = allDonations.find(d => d.firebaseKey === firebaseKey);
                if (!donationToDelete) {
                    Swal.fire("Error", "Donation not found!", "error");
                    return;
                }

                const deletedDonation = {
                    ...donationToDelete,
                    deletedAt: new Date().toISOString()
                };

                database.ref(`deleteddonations/deletedinkind/${firebaseKey}`).set(deletedDonation)
                    .then(() => {
                        return database.ref(`donations/inkind/${firebaseKey}`).remove();
                    })
                    .then(() => {
                        Swal.fire('Deleted!', 'The donation entry has been moved to deleted donations.', 'success');
                    })
                    .catch(error => {
                        console.error("Error moving donation to deleted donations:", error);
                        Swal.fire("Error", "Failed to delete donation: " + error.message, "error");
                    });
            }
        });
    }

// Function to send an endorsement email using EmailJS
function sendEndorsementEmail(donation, endorsedGroup) {
    const serviceID = 'service_mzpjk2a';
    const templateID = 'template_4tks2la';

    // The templateParams object, with duplicate keys removed and the to_email added.
    const templateParams = {
    'to_email': donation.email, // The donor's email
    'reply_to': 'jldelossantos1101@gmail.com', // Set a reply-to for responses
    'donor_name': donation.name,
    'volunteer_group_name': endorsedGroup.name,
    'donation_type': donation.type,
    'donation_quantity': parseFloat(donation.valuation).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
    'endorsement_date': new Date().toLocaleDateString('en-US'),
    'organization_email': 'jldelossantos1101@gmail.com',
    'organization_contact_number': 'YOUR_ORGANIZATION_CONTACT_NUMBER',
};

    // Show a loading state
    Swal.fire({
        title: 'Sending Endorsement...',
        text: 'Please wait while we send the email.',
        allowOutsideClick: false,
        didOpen: () => {
            Swal.showLoading();
        }
    });

    // The emailjs.send call is correct.
    emailjs.send(serviceID, templateID, templateParams)
        .then(() => {
            Swal.fire({
                icon: 'success',
                title: 'Endorsement Sent!',
                text: `An email has been sent to the donor and to ${endorsedGroup.name} confirming the endorsement.`,
                timer: 3000,
                showConfirmButton: false
            });
        })
        .catch((error) => {
            console.error("Error sending endorsement email with EmailJS:", error);
            Swal.fire({
                icon: 'error',
                title: 'Endorsement Failed',
                text: `An error occurred: ${error.text || error}. Please try again later.`,
                customClass: {
                    popup: 'swal2-popup-error-clean'
                }
            });
        });
}
    function openEndorseModal(firebaseKey) {
        const modal = document.getElementById("endorseModal");
        modal.style.display = "flex";
        const abvnList = document.getElementById("abvnList");

        abvnList.innerHTML = '<p>Loading organizations...</p>';
        
        // Find the donation that is being endorsed
        const donationToEndorse = allDonations.find(d => d.firebaseKey === firebaseKey);
        if (!donationToEndorse) {
            Swal.fire("Error", "Donation not found!", "error");
            modal.style.display = "none";
            return;
        }

        let loadedVolunteerGroups = []; 

        firebase.database().ref("volunteerGroups/address").once("value")
            .then((volunteerGroupsSnapshot) => {
                const fetchedGroups = volunteerGroupsSnapshot.val();
                if (fetchedGroups) {
                    for (let key in fetchedGroups) {
                        const groupData = fetchedGroups[key];
                        const addressData = groupData.address;

                        let combinedAddress = "Not specified";
                        if (addressData) {
                            const addressParts = [];
                            if (addressData.region && addressData.region.trim() !== '') {
                                addressParts.push(addressData.region.trim());
                            }
                            if (addressData.province && addressData.province.trim() !== '') {
                                addressParts.push(addressData.province.trim());
                            }
                            if (addressData.city && addressData.city.trim() !== '') {
                                addressParts.push(addressData.city.trim());
                            }
                            if (addressParts.length > 0) {
                                combinedAddress = addressParts.join(', ');
                            }
                        }
                        loadedVolunteerGroups.push({
                            no: parseInt(key),
                            organization: groupData.organization || "Unknown",
                            hq: combinedAddress,
                            email: groupData.contactEmail // Assuming you have an email field for the group
                        });
                    }
                } else {
                    console.warn("No volunteer groups found.");
                }

                return firebase.database().ref('activations/').once('value');
            })
            .then((activationsSnapshot) => {
                const activations = activationsSnapshot.val();
                let groupHtml = '';

                if (activations) {
                    for (const activationId in activations) {
                        const activationData = activations[activationId];
                        if (activationData.status === 'active') {
                            const organizationName = activationData.organization;
                            const groupId = activationData.groupId;
                            
                            const correspondingVolunteerGroup = loadedVolunteerGroups.find(group => group.no === groupId);
                            
                            let displayHq = "Not specified";
                            let groupEmail = "Not specified";
                            if (correspondingVolunteerGroup) {
                                displayHq = correspondingVolunteerGroup.hq;
                                groupEmail = correspondingVolunteerGroup.email; // Get the email
                            } else if (activationData.areaOfOperation) {
                                displayHq = activationData.areaOfOperation;
                            }

                            if (organizationName) {
                                // Add a data attribute for the email to the radio button
                                groupHtml += `<label><input type="radio" name="abvn" value="${organizationName}" data-email="${groupEmail}" /> ${organizationName} (${displayHq})</label><br/>`;
                            }
                        }
                    }
                    abvnList.innerHTML = groupHtml;
                } else {
                    abvnList.innerHTML = '<p>No active activations found for endorsement.</p>';
                }
            })
            .catch((error) => {
                console.error("Error loading endorsement options:", error);
                abvnList.innerHTML = '<p>Error loading endorsement options.</p>';
            })
            .finally(() => {
                // No need for this note, you can remove it.
            });

        modal.dataset.firebaseKey = firebaseKey;
        
        // Add event listener for the new endorsement button
        const submitEndorsementBtn = document.getElementById("submitEndorsementBtn");
        submitEndorsementBtn.onclick = () => {
            const selectedRadio = document.querySelector('input[name="abvn"]:checked');
            if (selectedRadio) {
                const endorsedGroupName = selectedRadio.value;
                const endorsedGroupEmail = selectedRadio.dataset.email;
                
                // Call the email function with the donation data and the selected group's details
                sendEndorsementEmail(donationToEndorse, { 
                    name: endorsedGroupName, 
                    email: endorsedGroupEmail
                });

                // Close the modal after sending
                modal.style.display = "none";

            } else {
                Swal.fire({
                    icon: 'warning',
                    title: 'No Group Selected',
                    text: 'Please select a volunteer group to endorse this donation.',
                    confirmButtonText: 'OK'
                });
            }
        };

        const closeButton = document.querySelector(".close-endorse-modal");
        if(closeButton) {
            closeButton.onclick = () => {
                modal.style.display = "none";
            };
        }
    }

    document.getElementById("confirmEndorseBtn").addEventListener("click", () => {
        const modal = document.getElementById("endorseModal");
        const firebaseKey = modal.dataset.firebaseKey;
        const selected = document.querySelector("input[name='abvn']:checked");
        if (!selected) {
            Swal.fire("Select a group to endorse", "", "warning");
            return;
        }
        const group = selected.value;
        Swal.fire("Endorsed!", `Donation with ID ${firebaseKey} endorsed to ${group}`, "success");
        modal.style.display = "none";
    });

        document.getElementById("cancelEndorseBtn").addEventListener("click", () => {
        document.getElementById("endorseModal").style.display = "none";
    });

    async function validateEditForm() {
        console.log("Starting validateEditForm at", new Date().toISOString());
        let isValid = true;
        const fieldsToCheck = [
            { input: document.getElementById("edit-encoder"), label: "Encoder", lettersOnly: true },
            { input: document.getElementById("edit-name"), label: "Name", lettersOnly: true },
            { input: document.getElementById("edit-type"), label: "Type", lettersOnly: true },
            { input: document.getElementById("edit-contactPerson"), label: "Contact Person", lettersOnly: true },
            { input: document.getElementById("edit-assistance"), label: "Type of Assistance", lettersOnly: true },
            { input: document.getElementById("edit-number"), label: "Number", numberOnly: true, checkMobile: true },
            { input: document.getElementById("edit-valuation"), label: "Valuation", numberOnly: true },
            { input: document.getElementById("edit-address"), label: "Address" },
            { input: document.getElementById("edit-email"), label: "Email", checkEmail: true },
            { input: document.getElementById("edit-additionalnotes"), label: "Additional Notes", required: false },
            { input: document.getElementById("edit-status"), label: "Status" },
            { input: document.getElementById("edit-staffIncharge"), label: "Staff-In Charge", lettersOnly: true },
            { input: document.getElementById("edit-donationDate"), label: "Donation Date", isDate: true },
        ];

        // Log all input values for debugging
        console.log("Edit form input values:", {
            encoder: document.getElementById("edit-encoder")?.value,
            name: document.getElementById("edit-name")?.value,
            type: document.getElementById("edit-type")?.value,
            address: document.getElementById("edit-address")?.value,
            contactPerson: document.getElementById("edit-contactPerson")?.value,
            number: document.getElementById("edit-number")?.value,
            email: document.getElementById("edit-email")?.value,
            assistance: document.getElementById("edit-assistance")?.value,
            valuation: document.getElementById("edit-valuation")?.value,
            additionalnotes: document.getElementById("edit-additionalnotes")?.value,
            status: document.getElementById("edit-status")?.value,
            staffIncharge: document.getElementById("edit-staffIncharge")?.value,
            donationDate: document.getElementById("edit-donationDate")?.value
        });

        // Step 1: Check for blank fields, invalid formats, and future dates
        for (const { input, label, lettersOnly, numberOnly, checkEmail, checkMobile, isDate, required = true } of fieldsToCheck) {
            if (!input) {
                console.error(`Input for ${label} not found in DOM`);
                isValid = false;
                Swal.fire({
                    icon: 'error',
                    title: 'Form Error',
                    text: `Input field for ${label} is missing. Please check the form.`,
                    background: '#fcebea',
                    color: '#b71c1c',
                    iconColor: '#c62828',
                    confirmButtonColor: '#c62828',
                    customClass: {
                        popup: 'swal2-popup-error-clean',
                        title: 'swal2-title-error-clean',
                        htmlContainer: 'swal2-text-error-clean'
                    }
                });
                return false;
            }

            clearError(input);
            console.log(`Validating ${label}:`, input.value);
            if (required && isEmpty(input.value)) {
                showError(input, `${label} is required`);
                console.log(`${label} is empty`);
                isValid = false;
            } else if (!isEmpty(input.value) && lettersOnly && !isLettersOnly(input.value)) {
                showError(input, `${label} should only contain letters and spaces`);
                console.log(`${label} contains invalid characters`);
                isValid = false;
            } else if (!isEmpty(input.value) && numberOnly && !isValidNumber(input.value)) {
                showError(input, `${label} should only contain numbers`);
                console.log(`${label} is not a valid number`);
                isValid = false;
            } else if (!isEmpty(input.value) && checkEmail && !isValidEmail(input.value)) {
                showError(input, 'Please enter a valid email address from an allowed domain.');
                console.log(`${label} is not a valid email`);
                isValid = false;
            } else if (!isEmpty(input.value) && checkMobile && !isValidMobile(input.value)) {
                showError(input, 'Mobile number must be 11 digits starting with "09"');
                console.log(`${label} is not a valid mobile number`);
                isValid = false;
            } else if (isDate && !isEmpty(input.value)) {
                const donationDate = new Date(input.value);
                const today = new Date();
                today.setHours(0, 0, 0, 0);
              
                if (isNaN(donationDate.getTime())) {
                    showError(input, `${label} is not a valid date`);
                    console.log(`${label} is not a valid date`);
                    isValid = false;

                } else if (donationDate.setHours(0, 0, 0, 0) > today.setHours(0, 0, 0, 0)) {
                    showError(input, `${label} cannot be a future date`);
                    console.log(`${label} is a future date`);
                    isValid = false;
                }
            }
        }

        // Step 2: Check for unchanged data
        if (isValid) {
            const donationToEdit = allDonations.find(d => d.firebaseKey === editingKey);
            if (!donationToEdit) {
                console.error("Donation to edit not found for firebaseKey:", editingKey);
                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: 'Donation data not found for editing.',
                    background: '#fcebea',
                    color: '#b71c1c',
                    iconColor: '#c62828',
                    confirmButtonColor: '#c62828',
                    customClass: {
                        popup: 'swal2-popup-error-clean',
                        title: 'swal2-title-error-clean',
                        htmlContainer: 'swal2-text-error-clean'
                    }
                });
                return false;
            }

            const formData = {
                encoder: document.getElementById("edit-encoder").value.trim(),
                name: document.getElementById("edit-name").value.trim(),
                type: document.getElementById("edit-type").value.trim(),
                address: document.getElementById("edit-address").value.trim(),
                contactPerson: document.getElementById("edit-contactPerson").value.trim(),
                number: document.getElementById("edit-number").value.trim(),
                email: document.getElementById("edit-email").value.trim().toLowerCase(),
                assistance: document.getElementById("edit-assistance").value.trim(),
                valuation: document.getElementById("edit-valuation").value.trim(),
                additionalnotes: document.getElementById("edit-additionalnotes").value.trim(),
                status: document.getElementById("edit-status").value.trim(),
                staffIncharge: document.getElementById("edit-staffIncharge").value.trim(),
                donationDate: document.getElementById("edit-donationDate").value.trim(),
            };

            const isUnchanged = (
                formData.encoder === (donationToEdit.encoder || '') &&
                formData.name === (donationToEdit.name || '') &&
                formData.type === (donationToEdit.type || '') &&
                formData.address === (donationToEdit.address || '') &&
                formData.contactPerson === (donationToEdit.contactPerson || '') &&
                formData.number === (donationToEdit.number || '') &&
                formData.email === (donationToEdit.email || '').toLowerCase() &&
                formData.assistance === (donationToEdit.assistance || '') &&
                formData.valuation === (donationToEdit.valuation || '') &&
                formData.additionalnotes === (donationToEdit.additionalnotes || '') &&
                formData.status === (donationToEdit.status || '') &&
                formData.staffIncharge === (donationToEdit.staffIncharge || '') &&
                formData.donationDate === (donationToEdit.donationDate || '')
            );

            console.log("Unchanged data check:", { isUnchanged, formData, original: donationToEdit });
            if (isUnchanged) {
                console.log("No changes detected in edit form");
                Swal.fire({
                    title: 'No Changes Detected',
                    text: 'The donation data has not been modified. No update is needed.',
                    icon: 'info',
                    timer: 2000,
                    showConfirmButton: false,
                    timerProgressBar: true,
                    allowOutsideClick: false,
                    customClass: {
                        popup: 'swal2-popup-info-clean',
                        title: 'swal2-title-info-clean',
                        htmlContainer: 'swal2-text-info-clean',
                    }
                });
                return false;
            }
        }

        // Step 3: Check for potential duplicates
        if (isValid) {
            const email = document.getElementById("edit-email").value.trim().toLowerCase();
            const mobile = document.getElementById("edit-number").value.trim();
            const name = document.getElementById("edit-name").value.trim().toLowerCase();
            console.log("Checking duplicates for:", { email, mobile, name });

            let isDuplicate = false;
            let duplicateFields = [];

            const paths = ['donations/inkind', 'deletedDonations/deletedinkind'];
            for (const path of paths) {
                try {
                    const snapshot = await database.ref(path).once('value');
                    const records = snapshot.val();
                    if (records) {
                        for (const key in records) {
                            if (key !== editingKey) {
                                const record = records[key];
                                if (record.email && record.email.toLowerCase() === email) {
                                    isDuplicate = true;
                                    duplicateFields.push('email');
                                }
                                if (record.number === mobile) {
                                    isDuplicate = true;
                                    duplicateFields.push('mobile number');
                                }
                                if (record.name && record.name.toLowerCase() === name) {
                                    isDuplicate = true;
                                    duplicateFields.push('name');
                                }
                            }
                        }
                    }
                } catch (error) {
                    console.error(`Error checking duplicates in ${path}:`, error);
                    Swal.fire({
                        icon: 'error',
                        title: 'Error',
                        text: `Failed to check duplicates: ${error.message}`,
                        background: '#fcebea',
                        color: '#b71c1c',
                        iconColor: '#c62828',
                        confirmButtonColor: '#c62828',
                        customClass: {
                            popup: 'swal2-popup-error-clean',
                            title: 'swal2-title-error-clean',
                            htmlContainer: 'swal2-text-error-clean'
                        }
                    });
                    return false;
                }
            }

            if (isDuplicate) {
                console.log("Duplicates found:", duplicateFields);
                const result = await Swal.fire({
                    title: 'Potential Duplicate Donation',
                    html: `A donation with the same ${duplicateFields.join(", ")} already exists.<br><br>Do you want to proceed with updating this donation?`,
                    icon: 'warning',
                    showCancelButton: true,
                    confirmButtonText: 'Yes, Update Donation',
                    cancelButtonText: 'Cancel',
                    reverseButtons: true,
                    focusCancel: true,
                    allowOutsideClick: false,
                    customClass: {
                        popup: 'custom-swal-popup-large',
                        title: 'custom-swal-title',
                        htmlContainer: 'custom-swal-content',
                        confirmButton: 'custom-confirm-btn',
                        cancelButton: 'custom-cancel-btn'
                    }
                });

                if (!result.isConfirmed) {
                    console.log("User cancelled due to duplicate donation");
                    isValid = false;
                }
            }
        }

        console.log("validateEditForm completed, isValid:", isValid);
        return isValid;
    }

    function openEditModal(firebaseKey) {
        editingKey = firebaseKey;
        const donationToEdit = allDonations.find(d => d.firebaseKey === firebaseKey);
        if (donationToEdit) {
            const editModal = document.getElementById("editModal");
            document.getElementById("edit-encoder").value = donationToEdit.encoder;
            document.getElementById("edit-name").value = donationToEdit.name;
            document.getElementById("edit-type").value = donationToEdit.type;
            document.getElementById("edit-address").value = donationToEdit.address;
            document.getElementById("edit-contactPerson").value = donationToEdit.contactPerson;
            document.getElementById("edit-number").value = donationToEdit.number;
            document.getElementById("edit-email").value = donationToEdit.email;
            document.getElementById("edit-assistance").value = donationToEdit.assistance;
            document.getElementById("edit-valuation").value = donationToEdit.valuation;
            document.getElementById("edit-additionalnotes").value = donationToEdit.additionalnotes;
            document.getElementById("edit-status").value = donationToEdit.status;
            document.getElementById("edit-staffIncharge").value = donationToEdit.staffIncharge;
            document.getElementById("edit-donationDate").value = donationToEdit.donationDate || '';
            editModal.style.display = "flex";
        }
    }

    document.getElementById("saveEditBtn").addEventListener("click", async () => {
        console.log("Save edit button clicked at", new Date().toISOString(), "editingKey:", editingKey);
        if (editingKey === null) {
            console.error("No donation selected for editing");
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'No donation selected for editing.',
                background: '#fcebea',
                color: '#b71c1c',
                iconColor: '#c62828',
                confirmButtonColor: '#c62828',
                customClass: {
                    popup: 'swal2-popup-error-clean',
                    title: 'swal2-title-error-clean',
                    htmlContainer: 'swal2-text-error-clean'
                }
            });
            return;
        }

        if (!hasImportPermission()) {
            console.log("Permission denied for editing");
            showAccessDeniedAlert('update this donation');
            return;
        }

        console.log("Calling validateEditForm");
        const isValid = await validateEditForm();
        console.log("validateEditForm result:", isValid);

        if (!isValid) {
            console.log("Validation failed, stopping update");
            Swal.fire({
                icon: 'error',
                title: 'Validation Failed',
                text: 'Please correct the errors in the form and try again.',
                showConfirmButton: true,
                confirmButtonText: 'OK',
                background: '#fcebea',
                color: '#b71c1c',
                iconColor: '#c62828',
                confirmButtonColor: '#c62828',
                customClass: {
                    popup: 'swal2-popup-error-clean',
                    title: 'swal2-title-error-clean',
                    htmlContainer: 'swal2-text-error-clean',
                    confirmButton: 'my-error-button'
                }
            });
            return;
        }

        console.log("Validation passed, updating donation");
        const updatedDonation = {
            encoder: document.getElementById("edit-encoder").value.trim(),
            name: document.getElementById("edit-name").value.trim(),
            type: document.getElementById("edit-type").value.trim(),
            address: document.getElementById("edit-address").value.trim(),
            contactPerson: document.getElementById("edit-contactPerson").value.trim(),
            number: document.getElementById("edit-number").value.trim(),
            email: document.getElementById("edit-email").value.trim(),
            assistance: document.getElementById("edit-assistance").value.trim(),
            valuation: document.getElementById("edit-valuation").value.trim(),
            additionalnotes: document.getElementById("edit-additionalnotes").value.trim(),
            status: document.getElementById("edit-status").value.trim(),
            staffIncharge: document.getElementById("edit-staffIncharge").value.trim(),
            donationDate: document.getElementById("edit-donationDate").value.trim(),
            id: allDonations.find(d => d.firebaseKey === editingKey)?.id,
            userUid: allDonations.find(d => d.firebaseKey === editingKey)?.userUid,
            createdAt: allDonations.find(d => d.firebaseKey === editingKey)?.createdAt,
            updatedAt: new Date().toISOString(),
        };

        console.log("Updating donation in Firebase:", updatedDonation);
        try {
            await database.ref(`donations/inkind/${editingKey}`).set(updatedDonation);
            console.log("Donation updated successfully");
            closeEditModal();
            Swal.fire({
                icon: 'success',
                title: 'Donation Updated!',
                text: 'Your donation has been successfully updated.',
                timer: 2000,
                showConfirmButton: false,
                timerProgressBar: true,
                background: '#e6f4ea',
                color: '#1b5e20',
                iconColor: '#2e7d32',
                customClass: {
                    popup: 'swal2-popup-success-clean',
                    title: 'swal2-title-success-clean',
                    htmlContainer: 'swal2-text-success-clean'
                }
            });
            editingKey = null;
            renderTable();
        } catch (error) {
            console.error("Error updating donation:", error);
            Swal.fire({
                icon: 'error',
                title: 'Failed to Update Donation',
                text: 'An error occurred: ' + error.message,
                background: '#fcebea',
                color: '#b71c1c',
                iconColor: '#c62828',
                confirmButtonColor: '#c62828',
                customClass: {
                    popup: 'swal2-popup-error-clean',
                    title: 'swal2-title-error-clean',
                    htmlContainer: 'swal2-text-error-clean'
                }
            });
        }
    });

    function closeEditModal() {
        const editModal = document.getElementById("editModal");
        editModal.style.display = "none";
        editingKey = null;
        const errorMessages = editModal.querySelectorAll('.error-message');
        errorMessages.forEach(msg => msg.textContent = '');
        const errorInputs = editModal.querySelectorAll('.error');
        errorInputs.forEach(input => input.classList.remove('error'));
    }

    document.getElementById("closeEditModalBtn").addEventListener("click", closeEditModal);
    document.getElementById("cancelEditBtn").addEventListener("click", closeEditModal);
});
import { renderPagination, updateEntriesInfo, getPaginatedData } from '../js/pagination.js';

document.addEventListener("DOMContentLoaded", () => {
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
    const excelFileInput = document.getElementById('excelFileInput');
    const importExcelBtn = document.getElementById('importExcelBtn');
    const importStatusModal = document.getElementById('importStatusModal');
    const closeImportStatusModalBtn = document.getElementById('closeImportStatusModalBtn');
    const importProgressBar = document.getElementById('importProgressBar');
    const importStatusText = document.getElementById('importStatusText');
    const importErrorList = document.getElementById('importErrorList');

    // Inactivity detection
    let inactivityTimeout;
    const INACTIVITY_TIME = 1800000;

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
            confirmButtonColor: '#3085d6',
            cancelButtonColor: '#d33',
            confirmButtonText: 'Stay Login',
            cancelButtonText: 'Log Out',
            allowOutsideClick: false,
            reverseButtons: true,
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
                placeholderText = "Search by Name, Encoder, Staff-In Charge";
        }
        searchInput.placeholder = placeholderText;
    };

    // Search and Sort functionality
    function filterAndSortDonations() {
        const searchTerm = searchInput.value.trim().toLowerCase();
        const sortOption = sortSelect.value;

        // Start with all donations
        filteredAndSortedDonations = [...allDonations];

        // Apply search filter
        if (searchTerm) {
            filteredAndSortedDonations = filteredAndSortedDonations.filter(donation => {
                switch (sortSelect.value) {
                    case "encoder-asc":
                    case "encoder-desc":
                        return donation.encoder?.toLowerCase().includes(searchTerm);
                    case "name-asc":
                    case "name-desc":
                        return donation.name?.toLowerCase().includes(searchTerm);
                    case "type-asc":
                    case "type-desc":
                        return donation.type?.toLowerCase().includes(searchTerm);
                    case "address-asc":
                    case "address-desc":
                        return donation.address?.toLowerCase().includes(searchTerm);
                    case "contactPerson-asc":
                    case "contactPerson-desc":
                        return donation.contactPerson?.toLowerCase().includes(searchTerm);
                    case "number-asc":
                    case "number-desc":
                        return donation.number?.toString().toLowerCase().includes(searchTerm);
                    case "email-asc":
                    case "email-desc":
                        return donation.email?.toLowerCase().includes(searchTerm);
                    case "assistance-asc":
                    case "assistance-desc":
                        return donation.assistance?.toLowerCase().includes(searchTerm);
                    case "valuation-asc":
                    case "valuation-desc":
                        return donation.valuation?.toString().toLowerCase().includes(searchTerm);
                    case "notes-asc":
                    case "notes-desc":
                        return donation.additionalnotes?.toLowerCase().includes(searchTerm);
                    case "status-asc":
                    case "status-desc":
                        return donation.status?.toLowerCase().includes(searchTerm);
                    case "staffIncharge-asc":
                    case "staffIncharge-desc":
                        return donation.staffIncharge?.toLowerCase().includes(searchTerm);
                    case "donationDate-asc":
                    case "donationDate-desc":
                        return donation.donationDate?.toLowerCase().includes(searchTerm);
                    default:
                        // Default search across multiple fields
                        return (
                            donation.name?.toLowerCase().includes(searchTerm) ||
                            donation.encoder?.toLowerCase().includes(searchTerm) ||
                            donation.staffIncharge?.toLowerCase().includes(searchTerm) ||
                            donation.type?.toLowerCase().includes(searchTerm) ||
                            donation.address?.toLowerCase().includes(searchTerm) ||
                            donation.contactPerson?.toLowerCase().includes(searchTerm) ||
                            donation.email?.toLowerCase().includes(searchTerm) ||
                            donation.assistance?.toLowerCase().includes(searchTerm) ||
                            donation.additionalnotes?.toLowerCase().includes(searchTerm) ||
                            donation.status?.toLowerCase().includes(searchTerm)
                        );
                }
            });
        }

        // Apply sorting
        if (sortOption) {
            const [field, direction] = sortOption.split('-');
            filteredAndSortedDonations.sort((a, b) => {
                let valueA = a[field] || '';
                let valueB = b[field] || '';
                
                // Handle numeric fields
                if (field === 'valuation' || field === 'number') {
                    valueA = parseFloat(valueA) || 0;
                    valueB = parseFloat(valueB) || 0;
                } else if (field === 'donationDate') {
                    // Handle date sorting
                    valueA = valueA ? new Date(valueA).getTime() : 0;
                    valueB = valueB ? new Date(valueB).getTime() : 0;
                } else {
                    // Handle string fields
                    valueA = valueA.toString().toLowerCase();
                    valueB = valueB.toString().toLowerCase();
                }

                if (valueA === valueB) return 0; // Preserve order for equal elements
                return direction === 'asc' ? (valueA > valueB ? 1 : -1) : (valueA < valueB ? 1 : -1);
            });
        }

        // Reset to page 1 to avoid pagination issues
        currentPage = 1;
        renderTable();
    }

    // Event listeners for search and sort
    searchInput.addEventListener('input', () => {
        filterAndSortDonations();
        updateSearchPlaceholder();
    });

    sortSelect.addEventListener('change', () => {
        filterAndSortDonations();
        updateSearchPlaceholder();
    });

    auth.onAuthStateChanged(user => {
        if (!user) {
            Swal.fire({
                icon: 'error',
                title: 'Authentication Required',
                text: 'Please sign in to access in-kind donations.',
                timer: 1600,
                allowOutsideClick: false,
                showConfirmButton: false,
                timerProgressBar: true,
                customClass: {
                    popup: 'swal2-popup-warning-clean',
                    title: 'swal2-title-warning-clean',
                    htmlContainer: 'swal2-text-warning-clean',
                }
            }).then(() => {
                window.location.href = "../pages/login.html";
            });
            return;
        }
        console.log("User authenticated:", user.uid);
        database.ref(`users/${user.uid}`).once('value', snapshot => {
            const userData = snapshot.val();
            currentUserIsSuperAdmin = userData && userData.isSuperAdmin === true;
            console.log("Super Admin status:", currentUserIsSuperAdmin);
            loadDonations(user.uid);
            updateSearchPlaceholder();
            resetInactivityTimer();
        }).catch(error => {
            console.error("Error fetching user role:", error);
            currentUserIsSuperAdmin = false;
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
                confirmButtonText: 'OK',
                allowOutsideClick: false,
                customClass: {
                    popup: 'swal2-popup-warning-clean',
                    title: 'swal2-title-warning-clean',
                    htmlContainer: 'swal2-text-warning-clean',
                    confirmButton: 'my-warning-button'
                }
            });
        });
    }

    function hasImportPermission() {
        return currentUserIsSuperAdmin;
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

    const validateForm = () => {
        let isValid = true;
        const fieldsToCheck = [
            { input: form.encoder, label: "Encoder", lettersOnly: true },
            { input: form.name, label: "Name", lettersOnly: true },
            { input: form.type, label: "Type", lettersOnly: true },
            { input: form.contactPerson, label: "Contact Person", lettersOnly: true },
            { input: form.assistance, label: "Type of Assistance", lettersOnly: true },
            { input: form.number, label: "Number", numberOnly: true },
            { input: form.valuation, label: "Valuation", numberOnly: true },
            { input: form.address, label: "Address" },
            { input: form.email, label: "Email" },
            { input: form.additionalnotes, label: "Additional Notes", required: false },
            { input: form.status, label: "Status" },
            { input: form.staffIncharge, label: "Staff-In Charge", lettersOnly: true },
            { input: document.getElementById("donationDate"), label: "Donation Date", isDate: true },
        ];

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        fieldsToCheck.forEach(({ input, label, lettersOnly, numberOnly, isDate, required = true }) => {
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
        });

        return isValid;
    };

    form.addEventListener("input", () => {
        formHasChanges = true;
    });

    form.addEventListener("submit", (e) => {
        e.preventDefault();
        if (validateForm()) {
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
                        htmlContainer: 'swal2-text-error-clean'
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
                    htmlContainer: 'swal2-text-warning-clean',
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
        if (!hasImportPermission()) {
            showAccessDeniedAlert('reject this donation');
            return;
        }

        Swal.fire({
            title: 'Are you sure to reject this donation?',
            text: "This will move it to archived records.",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Reject',
            cancelButtonText: 'Cancel',
            reverseButtons: true,
            focusCancel: true,
            allowOutsideClick: false,
            customClass: {
                popup: 'custom-swal-popup-small',
                title: 'custom-swal-title',
                htmlContainer: 'custom-swal-content',
                confirmButton: 'custom-confirm-btn',
                cancelButton: 'custom-cancel-btn'
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
                    rejectedAt: new Date().toISOString(),
                    status: 'Rejected'
                };

                database.ref(`deletedDonations/deletedinkind/${firebaseKey}`).set(deletedDonation)
                    .then(() => {
                        return database.ref(`donations/inkind/${firebaseKey}`).remove();
                    })
                    .then(() => {
                        Swal.fire({
                            title: 'Rejected!',
                            text: 'The donation has been rejected and archived.',
                            icon: 'success',
                            timer: 1600,
                            showConfirmButton: false,
                            timerProgressBar: true,
                            allowOutsideClick: false,
                            customClass: {
                                popup: 'swal2-popup-success-clean',
                                title: 'swal2-title-success-clean',
                                htmlContainer: 'swal2-text-success-clean',
                            }
                        });
                        renderTable();
                    })
                    .catch(error => {
                        console.error("Error moving donation to deleted donations:", error);
                        Swal.fire("Error", "Failed to reject donation: " + error.message, "error");
                    });
            }
        });
    }

    async function fetchAndRenderArchivedDonations() {
        if (!hasImportPermission()) {
            showAccessDeniedAlert('access retrieve archive donation');
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
            const snapshot = await database.ref('deletedDonations/deletedinkind').once('value');
            const archivedDonations = snapshot.val();
            allArchivedInKindDonation = [];

            for (const key in archivedDonations) {
                allArchivedInKindDonation.push({
                    firebaseKey: key,
                    ...archivedDonations[key]
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

        const startIndex = (currentArchivedPage - 1) * archivedRowsPerPage;
        const endIndex = startIndex + archivedRowsPerPage;
        const paginatedData = data.slice(startIndex, endIndex);

        if (paginatedData.length === 0) {
            archivedTableBody.innerHTML = '<tr><td colspan="15" style="text-align: center;">No archived donation records found.</td></tr>';
            updateArchivedEntriesInfo(0);
            renderArchivedPagination(0);
            return;
        }

        paginatedData.forEach((donation, index) => {
            const row = archivedTableBody.insertRow();
            row.dataset.firebaseKey = donation.firebaseKey;

            const archivedDate = donation.rejectedAt ? new Date(donation.rejectedAt).toLocaleDateString() : 'N/A';

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
            row.insertCell(14).textContent = donation.rejectedAt || 'N/A';
            row.insertCell(15).innerHTML = `<button class="retrieveBtn" data-firebase-key="${donation.firebaseKey}">Retrieve</button>`;
        });

        document.querySelectorAll('.retrieveBtn').forEach(button => {
            button.addEventListener('click', (event) => retrieveDonation(event.target.dataset.firebaseKey));
        });

        renderArchivedPagination(data.length);
        updateArchivedEntriesInfo(data.length);
    }

    function renderArchivedPagination(totalItems) {
        archivedPaginationContainer.innerHTML = '';
        const totalPages = Math.ceil(totalItems / archivedRowsPerPage);

        if (totalPages === 0) {
            archivedPaginationContainer.innerHTML = '<span>No entries to display</span>';
            return;
        }

        const createButton = (label, page, disabled = false, isActive = false) => {
            const btn = document.createElement('button');
            btn.textContent = label;
            if (disabled) btn.disabled = true;
            if (isActive) btn.classList.add('active-page');
            btn.addEventListener('click', () => {
                currentArchivedPage = page;
                renderArchivedTable(allArchivedInKindDonation);
            });
            return btn;
        };

        archivedPaginationContainer.appendChild(createButton('Prev', currentArchivedPage - 1, currentArchivedPage === 1));

        const maxVisible = 5;
        let startPage = Math.max(1, currentArchivedPage - Math.floor(maxVisible / 2));
        let endPage = Math.min(totalPages, startPage + maxVisible - 1);
        if (endPage - startPage < maxVisible - 1) {
            startPage = Math.max(1, endPage - maxVisible + 1);
        }

        for (let i = startPage; i <= endPage; i++) {
            archivedPaginationContainer.appendChild(createButton(i, i, false, i === currentArchivedPage));
        }

        archivedPaginationContainer.appendChild(createButton('Next', currentArchivedPage + 1, currentArchivedPage === totalPages));
    }

    function updateArchivedEntriesInfo(totalItems) {
        const startIndex = (currentArchivedPage - 1) * archivedRowsPerPage;
        const endIndex = Math.min(startIndex + archivedRowsPerPage, totalItems);
        archivedEntriesInfo.textContent = `Showing ${totalItems ? startIndex + 1 : 0} to ${endIndex} of ${totalItems} entries`;
    }

    async function retrieveDonation(firebaseKey) {
        if (!hasImportPermission()) {
            showAccessDeniedAlert('retrieve donation records');
            return;
        }

        Swal.fire({
            title: 'Retrieve Donation?',
            text: 'This will move the donation from archived records back to active donations.',
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
                cancelButton: 'custom-cancel-btn'
            },
        }).then(async (result) => {
            if (result.isConfirmed) {
                try {
                    const snapshot = await database.ref(`deletedDonations/deletedinkind/${firebaseKey}`).once('value');
                    const donationDataToRetrieve = snapshot.val();

                    if (!donationDataToRetrieve) {
                        Swal.fire('Error', 'Archived donation data not found for retrieval.', 'error');
                        return;
                    }

                    const activeSnapshot = await database.ref('donations/inkind').once('value');
                    let isDuplicate = false;
                    let duplicateReason = '';

                    if (activeSnapshot.exists()) {
                        activeSnapshot.forEach((child) => {
                            const activeData = child.val();
                            if (activeData.name.toLowerCase() === donationDataToRetrieve.name.toLowerCase() ||
                                activeData.email.toLowerCase() === donationDataToRetrieve.email.toLowerCase()) {
                                isDuplicate = true;
                                duplicateReason = activeData.name.toLowerCase() === donationDataToRetrieve.name.toLowerCase() ? 'name' : 'email';
                                return true;
                            }
                        });
                    }

                    if (isDuplicate) {
                        Swal.fire({
                            icon: 'error',
                            title: 'Duplicate Found',
                            html: `A donation with this ${duplicateReason} already exists in the active donations.<br><br>Please check the active list before proceeding.`,
                            confirmButtonText: 'OK',
                            allowOutsideClick: false,
                            customClass: {
                                popup: 'swal2-popup-warning-clean',
                                title: 'swal2-title-warning-clean',
                                htmlContainer: 'swal2-text-warning-clean',
                                confirmButton: 'my-warning-button'
                            }
                        });
                        return;
                    }

                    delete donationDataToRetrieve.rejectedAt;
                    donationDataToRetrieve.status = 'Pending';
                    await database.ref(`donations/inkind/${firebaseKey}`).set(donationDataToRetrieve);
                    await database.ref(`deletedDonations/deletedinkind/${firebaseKey}`).remove();
                    Swal.close();
                    await loadDonations(auth.currentUser.uid);
                    await fetchAndRenderArchivedDonations();
                    Swal.fire({
                        title: 'Retrieved!',
                        text: 'Donation has been retrieved to active donations.',
                        icon: 'success',
                        timer: 1600,
                        showConfirmButton: false,
                        timerProgressBar: true,
                        allowOutsideClick: false,
                        customClass: {
                            popup: 'swal2-popup-success-clean',
                            title: 'swal2-title-success-clean',
                            htmlContainer: 'swal2-text-success-clean',
                        }
                    });
                } catch (error) {
                    console.error("Error retrieving donation:", error);
                    Swal.fire('Error', 'Failed to retrieve donation: ' + error.message, 'error');
                }
            }
        });
    }

    function closeEditModal() {
        const editModal = document.getElementById("editModal");
        editModal.style.display = "none";
        editingKey = null;
        const errorMessages = editModal.querySelectorAll('.error-message');
        errorMessages.forEach(msg => msg.textContent = '');
        const errorInputs = editModal.querySelectorAll('.error');
        errorInputs.forEach(input => input.classList.remove('error'));
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

    if (importExcelBtn) {
        importExcelBtn.addEventListener('click', () => {
            if (!hasImportPermission()) {
                showAccessDeniedAlert('import in-kind donations');
                return;
            }
            excelFileInput.click();
        });
    }

    if (excelFileInput) {
        excelFileInput.addEventListener('change', handleExcelFileSelect);
    }

    if (closeImportStatusModalBtn) {
        closeImportStatusModalBtn.addEventListener('click', () => {
            importStatusModal.style.display = 'none';
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
        if (event.target === importStatusModal) {
            importStatusModal.style.display = 'none';
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
                    }
                    if (!record.email || record.email.trim() === '' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(record.email)) {
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
                    if (nameLower && existingRecords.has(nameLower)) {
                        isValidRecord = false;
                        rowErrors.push('Duplicate Name');
                    }
                    if (emailLower && existingRecords.has(emailLower)) {
                        isValidRecord = false;
                        rowErrors.push('Duplicate Email');
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
        const paginatedData = getPaginatedData(filteredAndSortedDonations, currentPage, rowsPerPage);

        tableBody.innerHTML = "";
        if (paginatedData.length === 0) {
            const noResultsRow = document.createElement("tr");
            noResultsRow.innerHTML = `<td colspan="15" style="text-align: center; padding: 20px;">No donations found matching your criteria.</td>`;
            tableBody.appendChild(noResultsRow);
        } else {
            paginatedData.forEach((d, i) => {
                const tr = document.createElement("tr");
                const startIndex = (currentPage - 1) * rowsPerPage;
                tr.innerHTML = `
                    <td>${startIndex + i + 1}</td>
                    <td>${d.encoder || 'N/A'}</td>
                    <td>${d.name || 'N/A'}</td>
                    <td>${d.type || 'N/A'}</td>
                    <td>${d.address || 'N/A'}</td>
                    <td>${d.contactPerson || 'N/A'}</td>
                    <td>${d.number || 'N/A'}</td>
                    <td>${d.email || 'N/A'}</td>
                    <td>${d.assistance || 'N/A'}</td>
                    <td>₱${parseFloat(d.valuation || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    <td>${d.additionalnotes || 'N/A'}</td>
                    <td>${d.staffIncharge || 'N/A'}</td>
                    <td>${d.status || 'N/A'}</td>
                    <td>${d.donationDate || 'N/A'}</td>
                    <td>
                        <button class="editBtn"><i class='bx bx-edit'></i></button>
                        <button class="deleteBtn"><i class="bx bx-x-circle"></i></button>
                        <button class="savePDFBtn"><i class='bx bxs-file-pdf'></i></button>
                        <button class="endorseBtn"><i class='bx bx-star' ></i></button>
                    </td>
                `;
                tr.querySelector(".editBtn").addEventListener("click", () => openEditModal(d.firebaseKey));
                tr.querySelector(".deleteBtn").addEventListener("click", () => deleteRow(d.firebaseKey));
                tr.querySelector(".endorseBtn").addEventListener("click", () => openEndorseModal(d.firebaseKey));
                tr.querySelector(".savePDFBtn").addEventListener("click", () => saveSingleDonationPdf(d));
                tableBody.appendChild(tr);
            });
        }

        updateEntriesInfo(filteredAndSortedDonations, currentPage, rowsPerPage, entriesInfo);
        renderPagination(filteredAndSortedDonations, currentPage, rowsPerPage, paginationContainer, (page) => {
            currentPage = page;
            renderTable();
        });
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

    function exportToExcel() {
        if (filteredAndSortedDonations.length === 0) {
            Swal.fire("Info", "No data to export!", "info");
            return;
        }

        const dataForExport = filteredAndSortedDonations.map((d, i) => ({
            "No.": i + 1,
            "Encoder": d.encoder || 'N/A',
            "Name": d.name || 'N/A',
            "Type": d.type || 'N/A',
            "Address": d.address || 'N/A',
            "Contact Person": d.contactPerson || 'N/A',
            "Number": String(d.number) || 'N/A',
            "Email": d.email || 'N/A',
            "Type of Assistance": d.assistance || 'N/A',
            "Valuation": parseFloat(d.valuation) || 0,
            "Additional Notes": d.additionalnotes || 'N/A',
            "Staff-In Charge": d.staffIncharge || 'N/A',
            "Status": d.status || 'N/A',
            "Donation Date": d.donationDate || 'N/A'
        }));

        const ws = XLSX.utils.json_to_sheet(dataForExport);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "In-Kind Donations");

        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const day = String(today.getDate()).padStart(2, '0');
        const hours = String(today.getHours()).padStart(2, '0');
        const minutes = String(today.getMinutes()).padStart(2, '0');
        const seconds = String(today.getSeconds()).padStart(2, '0');
        const formattedDateTime = `${year}-${month}-${day}_${hours}${minutes}${seconds}`;
        const filename = `in-kind-donations_${formattedDateTime}.xlsx`;

        XLSX.writeFile(wb, filename);
        Swal.fire({
            title: 'Export Successful!',
            text: `In-Kind Donations exported to "${filename}"!`,
            icon: 'success',
            timer: 2500,
            showConfirmButton: false,
            timerProgressBar: true,
            allowOutsideClick: false,
            customClass: {
                popup: 'swal2-popup-success-clean',
                title: 'swal2-title-success-clean',
                htmlContainer: 'swal2-text-success-clean'
            }
        });
    }

    function exportToPDF() {
        if (filteredAndSortedDonations.length === 0) {
            Swal.fire("Info", "No data to export to PDF!", "info");
            return;
        }

        Swal.fire({
            title: 'Generating PDF',
            text: 'Please wait while your PDF is being generated...',
            allowOutsideClick: false,
            didOpen: () => {
                Swal.showLoading();
            }
        });

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
            const now = new Date();
            const options = {
                year: 'numeric', month: 'long', day: 'numeric',
                hour: '2-digit', minute: '2-digit', second: '2-digit',
                hour12: true, timeZone: 'Asia/Manila'
            };
            doc.text(`Report Generated: ${now.toLocaleString('en-US', options)} (PHT)`, 14, yOffset);
            yOffset += 15;

            const head = [[
                "No.", "Encoder", "Name", "Type", "Address", "Contact Person",
                "Number", "Email", "Type of Assistance", "Valuation",
                "Additional Notes", "Staff-In Charge", "Status", "Donation Date"
            ]];

            const body = filteredAndSortedDonations.map((d, i) => [
                i + 1,
                d.encoder || 'N/A',
                d.name || 'N/A',
                d.type || 'N/A',
                d.address || 'N/A',
                d.contactPerson || 'N/A',
                String(d.number) || 'N/A',
                d.email || 'N/A',
                d.assistance || 'N/A',
                `₱${parseFloat(d.valuation || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
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
                didDrawPage: function(data) {
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

            const nowForFilename = new Date();
            const year = nowForFilename.getFullYear();
            const month = String(nowForFilename.getMonth() + 1).padStart(2, '0');
            const day = String(nowForFilename.getDate()).padStart(2, '0');
            const hours = String(nowForFilename.getHours()).padStart(2, '0');
            const minutes = String(nowForFilename.getMinutes()).padStart(2, '0');
            const seconds = String(nowForFilename.getSeconds()).padStart(2, '0');
            const formattedDateTime = `${year}-${month}-${day}_${hours}${minutes}${seconds}`;
            const filename = `in-kind-donations_${formattedDateTime}.pdf`;

            doc.save(filename);
            Swal.close();
            Swal.fire({
                title: 'Success!',
                text: `All In-Kind Donations exported to "${filename}"`,
                icon: 'success',
                timer: 2500,
                showConfirmButton: false,
                timerProgressBar: true,
                allowOutsideClick: false,
                customClass: {
                    popup: 'swal2-popup-success-clean',
                    title: 'swal2-title-success-clean',
                    htmlContainer: 'swal2-text-success-clean'
                }
            });
        };

        logo.onerror = function() {
            Swal.close();
            Swal.fire("Error", "Failed to load logo image. Please check the path: '../assets/images/AB_logo.png'", "error");
        };
    }

    function saveSingleDonationPdf(donation) {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();

        const logo = new Image();
        logo.src = '../assets/images/AB_logo.png';

        logo.onload = function() {
            const pageWidth = doc.internal.pageSize.width;
            const pageHeight = doc.internal.pageSize.height;
            const logoWidth = 30;
            const logoHeight = (logo.naturalHeight / logo.naturalWidth) * logoWidth;
            const margin = 14;
            const maxTextWidth = pageWidth - 2 * margin;

            doc.addImage(logo, 'PNG', pageWidth - logoWidth - margin, margin, logoWidth, logoHeight);

            doc.setFontSize(18);
            doc.text("In-Kind Donation Details", 14, 22);
            doc.setFontSize(10);
            doc.text(`Report Generated: ${new Date().toLocaleString('en-US', { timeZone: 'Asia/Manila' })}`, 14, 30);
            let y = 45;

            const addDetail = (label, value) => {
                const text = `${label}: ${value || 'N/A'}`;
                const textLines = doc.splitTextToSize(text, maxTextWidth);
                textLines.forEach(line => {
                    if (y + 7 > pageHeight - 20) {
                        doc.addPage();
                        y = 20;
                        doc.addImage(logo, 'PNG', pageWidth - logoWidth - margin, margin, logoWidth, logoHeight);
                        doc.setFontSize(18);
                        doc.text("In-Kind Donation Details (Continued)", 14, 22);
                        doc.setFontSize(10);
                    }
                    doc.text(line, 14, y);
                    y += 7;
                });
                return y;
            };

            y = addDetail("Encoder", donation.encoder);
            y = addDetail("Name", donation.name);
            y = addDetail("Type", donation.type);
            y = addDetail("Address", donation.address);
            y = addDetail("Contact Person", donation.contactPerson);
            y = addDetail("Number", String(donation.number));
            y = addDetail("Email", donation.email);
            y = addDetail("Type of Assistance", donation.assistance);
            y = addDetail("Valuation", `₱${parseFloat(donation.valuation || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
            y = addDetail("Additional Notes", donation.additionalnotes);
            y = addDetail("Staff-In Charge", donation.staffIncharge);
            y = addDetail("Status", donation.status);
            y = addDetail("Donation Date", donation.donationDate || 'N/A');
            y = addDetail("Recorded On", new Date(donation.createdAt).toLocaleString());

            doc.setFontSize(8);
            const footerY = doc.internal.pageSize.height - 10;
            const pageNumberText = `Page ${doc.internal.getNumberOfPages()} of ${doc.internal.getNumberOfPages()}`;
            const poweredByText = "Powered by: Appvance";

            doc.text(pageNumberText, margin, footerY);
            doc.text(poweredByText, pageWidth - margin, footerY, { align: 'right' });

            doc.save(`donation_${donation.name || 'unknown'}_${new Date().toISOString().slice(0, 10)}.pdf`);
            Swal.fire({
                title: 'Export Successful!',
                text: 'Donation details have been exported to PDF.',
                icon: 'success',
                timer: 1600,
                showConfirmButton: false,
                timerProgressBar: true,
                allowOutsideClick: false,
                customClass: {
                    popup: 'swal2-popup-success-clean',
                    title: 'swal2-title-success-clean',
                    htmlContainer: 'swal2-text-success-clean'
                }
            });
        };

        logo.onerror = function() {
            Swal.fire("Error", "Failed to load logo image. Please check the path: '../assets/images/AB_logo.png'", "error");
        };
    }

    function openEndorseModal(firebaseKey) {
        const modal = document.getElementById("endorseModal");
        modal.style.display = "block";
        const abvnList = document.getElementById("abvnList");

        abvnList.innerHTML = '<p>Loading organizations...</p>';
        abvnList.innerHTML = '';

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
                            if (correspondingVolunteerGroup && correspondingVolunteerGroup.hq) {
                                displayHq = correspondingVolunteerGroup.hq;
                            } else if (activationData.areaOfOperation) {
                                displayHq = activationData.areaOfOperation;
                            }

                            if (organizationName) {
                                groupHtml += `<label><input type="radio" name="abvn" value="${organizationName}" /> ${organizationName} (${displayHq})</label><br/>`;
                            }
                        }
                    }
                    abvnList.innerHTML = groupHtml;
                } else {
                    abvnList.innerHTML = '<p>No activations found for endorsement.</p>';
                }
            })
            .catch((error) => {
                console.error("Error loading endorsement options:", error);
                abvnList.innerHTML = '<p>Error loading endorsement options.</p>';
            });

        modal.dataset.firebaseKey = firebaseKey;
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

    const validateEditForm = () => {
        let isValid = true;
        const fieldsToCheck = [
            { input: document.getElementById("edit-encoder"), label: "Encoder", lettersOnly: true },
            { input: document.getElementById("edit-name"), label: "Name", lettersOnly: true },
            { input: document.getElementById("edit-type"), label: "Type", lettersOnly: true },
            { input: document.getElementById("edit-contactPerson"), label: "Contact Person", lettersOnly: true },
            { input: document.getElementById("edit-assistance"), label: "Type of Assistance", lettersOnly: true },
            { input: document.getElementById("edit-number"), label: "Number", numberOnly: true },
            { input: document.getElementById("edit-valuation"), label: "Valuation", numberOnly: true },
            { input: document.getElementById("edit-address"), label: "Address" },
            { input: document.getElementById("edit-email"), label: "Email" },
            { input: document.getElementById("edit-additionalnotes"), label: "Additional Notes", required: false },
            { input: document.getElementById("edit-status"), label: "Status" },
            { input: document.getElementById("edit-staffIncharge"), label: "Staff-In Charge", lettersOnly: true },
            { input: document.getElementById("edit-donationDate"), label: "Donation Date", isDate: true },
        ];

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        fieldsToCheck.forEach(({ input, label, lettersOnly, numberOnly, isDate, required = true }) => {
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
        });

        return isValid;
    };

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
            editModal.style.display = "block";
        }
    }

    document.getElementById("saveEditBtn").addEventListener("click", () => {
        if (editingKey !== null) {
            if (validateEditForm()) {
                const updatedDonation = {
                    encoder: document.getElementById("edit-encoder").value,
                    name: document.getElementById("edit-name").value,
                    type: document.getElementById("edit-type").value,
                    address: document.getElementById("edit-address").value,
                    contactPerson: document.getElementById("edit-contactPerson").value,
                    number: document.getElementById("edit-number").value,
                    email: document.getElementById("edit-email").value,
                    assistance: document.getElementById("edit-assistance").value,
                    valuation: document.getElementById("edit-valuation").value,
                    additionalnotes: document.getElementById("edit-additionalnotes").value,
                    status: document.getElementById("edit-status").value,
                    staffIncharge: document.getElementById("edit-staffIncharge").value,
                    donationDate: document.getElementById("edit-donationDate").value,
                    id: allDonations.find(d => d.firebaseKey === editingKey).id,
                    userUid: allDonations.find(d => d.firebaseKey === editingKey).userUid,
                    createdAt: allDonations.find(d => d.firebaseKey === editingKey).createdAt,
                    updatedAt: new Date().toISOString(),
                };

                database.ref(`donations/inkind/${editingKey}`).set(updatedDonation)
                .then(() => {
                    closeEditModal();
                    Swal.fire({
                        title: 'Success!',
                        text: 'Donation updated successfully!',
                        icon: 'success',
                        timer: 1600,
                        showConfirmButton: false,
                        timerProgressBar: true,
                        allowOutsideClick: false,
                        customClass: {
                            popup: 'swal2-popup-success-clean',
                            title: 'swal2-title-success-clean',
                            htmlContainer: 'swal2-text-success-clean',
                        }
                    });
                    editingKey = null;
                })
                .catch(error => {
                    console.error("Error updating donation:", error);
                    Swal.fire("Error", "Failed to update donation: " + error.message, "error");
                });
            }
        }
    });

    document.getElementById("closeEditModalBtn").addEventListener("click", closeEditModal);
    document.getElementById("cancelEditBtn").addEventListener("click", closeEditModal);

    // Event listeners for buttons
    if (exportBtn) {
        exportBtn.addEventListener('click', exportToExcel);
    }

    if (savePdfBtn) {
        savePdfBtn.addEventListener('click', exportToPDF);
    }
});
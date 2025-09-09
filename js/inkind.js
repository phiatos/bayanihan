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
    const archivedInKindRef = database.ref('donations/archivedDonations/inkind');

    emailjs.init("zQTkHE6hGtoKPZM_L");

    const form = document.getElementById("form-container-1");
    const tableBody = document.querySelector("#inKindTable tbody");
    const searchInput = document.getElementById("searchInput");
    const sortSelect = document.getElementById("sortSelect");
    const exportBtn = document.getElementById("exportBtn");
    const savePdfBtn = document.getElementById("savePdfBtn");
    const entriesInfo = document.getElementById("entriesInfo");
    const paginationContainer = document.getElementById("pagination");
    const clearFormBtn = document.getElementById("clearFormBtn");
    const editModal = document.getElementById("editModal");
    const importExcelBtn = document.getElementById('importExcelBtn');
    const excelFileInput = document.getElementById('excelFileInput');
    const importStatusModal = document.getElementById('importStatusModal');
    const closeImportStatusModalBtn = document.getElementById('closeImportStatusModalBtn');
    const importProgressBar = document.getElementById('importProgressBar');
    const importStatusText = document.getElementById('importStatusText');
    const importErrorList = document.getElementById('importErrorList');
    const archivedModal = document.getElementById('archivedModal');
    const closeArchivedModalBtn = document.getElementById('closeArchivedModalBtn');
    const viewArchivedBtn = document.getElementById('viewArchived');
    const archivedTableBody = document.querySelector('#archivedTable tbody');
    const archivedEntriesInfo = document.querySelector("#archivedEntriesInfo");
    const archivedPaginationContainer = document.querySelector("#archivedPagination");

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
    let isAdminVerified = false;
    const archivedRowsPerPage = 5;
    let inactivityTimeout;
    const INACTIVITY_TIME = 1800000;
    let permissions = { canView: false, canEdit: false, canArchive: false, canRetrieve: false };

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

    // Function to validate valuation format
    function isValidValuation(value) {
        const valuationRegex = /^\d+(\.\d{1,2})?$/;
        const numValue = parseFloat(value);
        return valuationRegex.test(value) && numValue > 0 && numValue <= 1000000;
    }

    function isValidNumber(value) {
        return /^\d+(\.\d+)?$/.test(value);
    }

    // Add real-time input restrictions for number fields
    const numberInput = form.number;
    const editNumberInput = document.getElementById("edit-number");

    function restrictNumberInput(input) {
        input.addEventListener("input", () => {
            let value = input.value.replace(/[^0-9]/g, '');
            if (value.length > 11) value = value.slice(0, 11);
            if (value && !value.startsWith('09')) {
                value = '09' + value.replace(/^09/, '').slice(0, 9);
            }
            input.value = value;
        });
        input.addEventListener("paste", (e) => {
            e.preventDefault();
            const pastedData = (e.clipboardData || window.clipboardData).getData('text').replace(/[^0-9]/g, '');
            if (pastedData) {
                input.value = '09' + pastedData.slice(0, 9);
            }
        });
    }

    restrictNumberInput(numberInput);
    restrictNumberInput(editNumberInput);

    // Check for duplicate email, number, and name
    async function checkForDuplicate(number, email, name, excludeKey = null) {
        const duplicates = { email: false, number: false, name: false, all: false };
        const paths = ['donations/savedDonations/inkind', 'donations/archivedDonations/inkind'];

        for (const path of paths) {
            try {
                const snapshot = await database.ref(path).once('value');
                const donations = snapshot.val();
                if (!donations) continue;

                for (const key in donations) {
                    if (excludeKey && key === excludeKey) continue;
                    const donation = donations[key];
                    if (donation.email && donation.email.toLowerCase() === email.toLowerCase()) duplicates.email = true;
                    if (donation.number === number) duplicates.number = true;
                    if (donation.name && donation.name.toLowerCase() === name.toLowerCase()) duplicates.name = true;
                    if (donation.number === number && donation.email.toLowerCase() === email.toLowerCase() && donation.name.toLowerCase() === name.toLowerCase()) {
                        duplicates.all = true;
                    }
                }
            } catch (error) {
                logErrorToFirebase(error, `checkForDuplicate_${path}`);
            }
        }
        return duplicates;
    }

    // Function to sanitize input to prevent XSS
    function sanitizeInput(input) {
        if (typeof input !== 'string') return input;
        return input.replace(/[<>&"']/g, (match) => ({
            '<': '&lt;',
            '>': '&gt;',
            '&': '&amp;',
            '"': '&quot;',
            "'": '&#x27;'
        })[match]);
    }

    // Function to log errors to Firebase
    function logErrorToFirebase(error, context) {
        const errorLog = {
            message: error.message,
            stack: error.stack,
            context: context,
            timestamp: new Date().toISOString(),
            userUid: auth.currentUser ? auth.currentUser.uid : 'anonymous'
        };
        database.ref('errorLogs/inkind').push(errorLog)
            .catch(err => console.error("Failed to log error to Firebase:", err));
    }

    // Check admin permissions
    async function checkAdminPermissions() {
        const user = auth.currentUser;
        if (!user) {
            Swal.fire('Error', 'User not authenticated.', 'error');
            return { canView: false, canEdit: false, canArchive: false, canRetrieve: false };
        }
        const snapshot = await database.ref(`users/${user.uid}`).once('value');
        const userData = snapshot.val();
        const adminPosition = userData?.adminPosition || '';
        return {
            canView: ['Super Admin', 'position-one', 'position-two'].includes(adminPosition),
            canEdit: ['Super Admin', 'position-one', 'position-two'].includes(adminPosition),
            canArchive: ['Super Admin', 'position-one'].includes(adminPosition),
            canRetrieve: ['Super Admin', 'position-one'].includes(adminPosition)
        };
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
            isAdminVerified = true;
            searchInput.value = '';
            return false;
        }
        searchInput.value = '';
        return password;
    }

    function resetInactivityTimer() {
        clearTimeout(inactivityTimeout);
        inactivityTimeout = setTimeout(checkInactivity, INACTIVITY_TIME);
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
            } else if (result.dismiss === Swal.DismissReason.cancel) {
                auth.signOut().then(() => {
                    window.location.href = "../pages/login.html";
                }).catch((error) => {
                    Swal.fire('Error', 'Failed to log out. Please try again.', 'error');
                });
            }
        });
    }

    ['mousemove', 'keydown', 'scroll', 'click'].forEach(eventType => {
        document.addEventListener(eventType, resetInactivityTimer);
    });

    function validateInputInRealTime(input, fieldConfig, inputs, excludeKey = null) {
        clearError(input);
        if (fieldConfig.required !== false && isEmpty(input.value)) {
            showError(input, `${fieldConfig.label} is required.`);
        } else if (!isEmpty(input.value)) {
            if (fieldConfig.lettersOnly && !isLettersOnly(input.value)) {
                showError(input, `${fieldConfig.label} should only contain letters and spaces.`);
            }
            if (fieldConfig.telNumber && !isValidMobile(input.value)) {
                showError(input, `Mobile number must be 11 digits starting with "09"`);
            }
            if (fieldConfig.numericAmount) {
                if (!isValidNumericAmount(input.value)) {
                    showError(input, `${fieldConfig.label} should only contain numbers.`);
                } else if (fieldConfig.positiveNumber && parseFloat(input.value) <= 0) {
                    showError(input, `${fieldConfig.label} must be a positive number.`);
                }
            }
            if (fieldConfig.isEmail && !isValidEmail(input.value.trim())) {
                showError(input, `Please enter a valid email address from an allowed domain.`);
            }
            if (fieldConfig.isDate) {
                const receivedDate = new Date(input.value);
                if (isNaN(receivedDate.getTime())) {
                    showError(input, `${fieldConfig.label} is not a valid date.`);
                }
            }
            // if (fieldConfig.isDate) {
            //     const receivedDate = new Date(input.value);
            //     const oneWeekFromNow = new Date();
            //     oneWeekFromNow.setDate(oneWeekFromNow.getDate() + 7);
            //     oneWeekFromNow.setHours(0, 0, 0, 0);
            //     const normalizedReceivedDate = new Date(receivedDate);
            //     normalizedReceivedDate.setHours(0, 0, 0, 0);
            //     if (isNaN(receivedDate.getTime())) {
            //         showError(input, `${fieldConfig.label} is not a valid date.`);
            //     } else if (normalizedReceivedDate.getTime() > oneWeekFromNow.getTime()) {
            //         showError(input, `${fieldConfig.label} cannot be more than one week in the future.`);
            //     }
            // }
        }
    }

    // Real-time validation for the form
    Array.from(form.querySelectorAll('input, select')).forEach(input => {
        const fieldConfig = {
            encoder: { label: 'Encoder', lettersOnly: true },
            name: { label: 'Donor Name', lettersOnly: true },
            type: { label: 'Donor Type', lettersOnly: true },
            contactPerson: { label: 'Contact Person', lettersOnly: true },
            assistance: { label: 'Type of Assistance', lettersOnly: true },
            number: { label: 'Mobile Number', numberOnly: true, checkMobile: true },
            valuation: { label: 'Valuation', numberOnly: true, checkValuation: true },
            address: { label: 'Address' },
            email: { label: 'Email', checkEmail: true },
            additionalnotes: { label: 'Additional Notes', required: false },
            status: { label: 'Status' },
            staffIncharge: { label: 'Staff-In Charge', lettersOnly: true },
            donationDate: { label: 'Donation Date', isDate: true }
        }[input.name];
        if (fieldConfig) {
            input.addEventListener('input', () => {
                validateInputInRealTime(input, fieldConfig, {
                    encoder: form.encoder,
                    name: form.name,
                    type: form.type,
                    contactPerson: form.contactPerson,
                    assistance: form.assistance,
                    number: form.number,
                    valuation: form.valuation,
                    address: form.address,
                    email: form.email,
                    additionalnotes: form.additionalnotes,
                    status: form.status,
                    staffIncharge: form.staffIncharge,
                    donationDate: form.donationDate
                });
            });
        }
    });

    // Real-time validation for edit modal
    Array.from(editModal.querySelectorAll('input, select')).forEach(input => {
        const fieldConfig = {
            'edit-encoder': { label: 'Encoder', lettersOnly: true },
            'edit-name': { label: 'Name', lettersOnly: true },
            'edit-type': { label: 'Type', lettersOnly: true },
            'edit-contactPerson': { label: 'Contact Person', lettersOnly: true },
            'edit-assistance': { label: 'Type of Assistance', lettersOnly: true },
            'edit-number': { label: 'Number', numberOnly: true, checkMobile: true },
            'edit-valuation': { label: 'Valuation', numberOnly: true, checkValuation: true },
            'edit-address': { label: 'Address' },
            'edit-email': { label: 'Email', checkEmail: true },
            'edit-additionalnotes': { label: 'Additional Notes', required: false },
            'edit-status': { label: 'Status' },
            'edit-staffIncharge': { label: 'Staff-In Charge', lettersOnly: true },
            'edit-donationDate': { label: 'Donation Date', isDate: true }
        }[input.id];
        if (fieldConfig) {
            input.addEventListener('input', () => validateInputInRealTime(input, fieldConfig, {
                encoder: document.getElementById("edit-encoder"),
                name: document.getElementById("edit-name"),
                type: document.getElementById("edit-type"),
                contactPerson: document.getElementById("edit-contactPerson"),
                assistance: document.getElementById("edit-assistance"),
                number: document.getElementById("edit-number"),
                valuation: document.getElementById("edit-valuation"),
                address: document.getElementById("edit-address"),
                email: document.getElementById("edit-email"),
                additionalnotes: document.getElementById("edit-additionalnotes"),
                status: document.getElementById("edit-status"),
                staffIncharge: document.getElementById("edit-staffIncharge"),
                donationDate: document.getElementById("edit-donationDate")
            }, editingKey));
        }
    });

    viewArchivedBtn.addEventListener('click', async () => {
        if (!permissions.canRetrieve) {
            Swal.fire({
                title: 'Access Denied',
                text: 'You do not have permission to view archived donations.',
                icon: 'error',
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
            return;
        }
        archivedModal.style.display = 'flex';
        fetchArchivedDonations();
    });

    closeArchivedModalBtn.addEventListener('click', () => {
        archivedModal.style.display = 'none';
    });

    window.addEventListener('click', (event) => {
        if (event.target === archivedModal) {
            archivedModal.style.display = 'none';
        }
    });

    importExcelBtn.addEventListener("click", () => {
        if (!permissions.canEdit) {
            Swal.fire('Error', 'You do not have permission to import donations.', 'error');
            return;
        }
        excelFileInput.click();
    });

    closeImportStatusModalBtn.addEventListener("click", () => {
        importStatusModal.style.display = "none";
    });

    function closeImportStatusModal() {
        importStatusModal.style.display = "none";
    }

    function showImportStatusModal(message) {
        importStatusModal.style.display = "flex";
        importProgressBar.style.width = "0%";
        importProgressBar.textContent = "0%";
        importStatusText.textContent = message || "Processing file...";
        importErrorList.innerHTML = "";
    }

    function updateImportStatus(progress, message) {
        const percentage = Math.round(progress);
        importProgressBar.style.width = `${percentage}%`;
        importProgressBar.textContent = `${percentage}%`;
        importStatusText.textContent = message;
    }

    function downloadExcelTemplate() {
        const headers = [
            "Encoder",
            "Name",
            "Type",
            "Address",
            "Contact Person",
            "Number",
            "Email",
            "Assistance",
            "Valuation",
            "Additional Notes",
            "Status",
            "Staff-In-Charge",
            "Donation Date"
        ];
        const sampleData = [{
            Encoder: "John Smith",
            Name: "Jane Doe",
            Type: "Clothing",
            Address: "Manila",
            "Contact Person": "Jane Doe",
            Number: "09123456789",
            Email: "jane.doe@gmail.com",
            Assistance: "Relief Goods",
            Valuation: 5000.00,
            "Additional Notes": "Donated used clothes in good condition",
            Status: "Received",
            "Staff-In-Charge": "Maria Cruz",
            "Donation Date": "2025-08-10"
        }];
        const instructions = [{
            Instructions: "1. Ensure mobile numbers are 11 digits starting with '09' (e.g., 09123456789). Format the Number column as 'Text' in Excel to preserve leading zeros.\n2. Valuation must be a positive number with up to 2 decimal places, max 1,000,000.\n3. Duplicate donations (same name, mobile number, and email) are allowed but will prompt for confirmation during import."
        }];

        const ws = XLSX.utils.json_to_sheet(sampleData, { header: headers });
        const wsInstructions = XLSX.utils.json_to_sheet(instructions);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "In-Kind Donations Template");
        XLSX.utils.book_append_sheet(wb, wsInstructions, "Instructions");
        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const day = String(today.getDate()).padStart(2, '0');
        const formattedDate = `${year}-${month}-${day}`;
        const filename = `inkind_donations_template_${formattedDate}.xlsx`;
        XLSX.writeFile(wb, filename);
        Swal.fire({
            title: 'Template Downloaded!',
            text: `Excel template saved as "${filename}"`,
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
    }

    excelFileInput.addEventListener("change", (event) => {
        const file = event.target.files[0];
        if (!file) return;

        showImportStatusModal("Reading file...");

        const reader = new FileReader();
        reader.onload = async function(e) {
            try {
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, { type: 'array' });
                const firstSheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[firstSheetName];
                const json = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

                const headers = json[0];
                const requiredHeaders = [
                    "Encoder",
                    "Name",
                    "Type",
                    "Address",
                    "Contact Person",
                    "Number",
                    "Email",
                    "Assistance",
                    "Valuation",
                    "Additional Notes",
                    "Status",
                    "Staff-In-Charge",
                    "Donation Date"
                ];
                const missingHeaders = requiredHeaders.filter(h => !headers.includes(h));
                if (missingHeaders.length > 0) {
                    importErrorList.innerHTML = `<li>Missing required columns: ${missingHeaders.join(', ')}</li>`;
                    updateImportStatus(0, "Import failed due to missing columns.");
                    Swal.fire({
                        icon: 'error',
                        title: 'Error',
                        text: `Missing required columns: ${missingHeaders.join(', ')}`,
                        showConfirmButton: true,
                        confirmButtonText: 'OK',
                        customClass: {
                            popup: 'swal2-popup-error-clean',
                            title: 'swal2-title-error-clean',
                            htmlContainer: 'swal2-text-error-clean',
                            confirmButton: 'my-error-button'
                        }
                    });
                    importStatusModal.style.display = 'flex';
                    return;
                }

                const rows = json.slice(1);
                const donationsToImport = [];
                const potentialDuplicates = [];
                const importErrors = [];
                const totalRows = rows.length;
                let processedRows = 0;

                for (let i = 0; i < totalRows; i++) {
                    const row = rows[i];
                    if (!row || row.every(cell => !cell || cell.toString().trim() === '')) {
                        importErrors.push(`Row ${i + 2}: Empty row skipped.`);
                        continue;
                    }
                    processedRows++;
                    const progress = (processedRows / totalRows) * 100;
                    updateImportStatus(progress, `Processing row ${processedRows} of ${totalRows}...`);

                    // Create donation object for in-kind donations
                    const donation = {
                        encoder: String(row[headers.indexOf("Encoder")] || '').trim(),
                        name: String(row[headers.indexOf("Name")] || '').trim(),
                        type: String(row[headers.indexOf("Type")] || '').trim(),
                        address: String(row[headers.indexOf("Address")] || '').trim(),
                        contactPerson: String(row[headers.indexOf("Contact Person")] || '').trim(),
                        number: String(row[headers.indexOf("Number")] || '').trim().replace(/\D/g, ''),
                        email: String(row[headers.indexOf("Email")] || '').trim(),
                        assistance: String(row[headers.indexOf("Assistance")] || '').trim(),
                        valuation: String(row[headers.indexOf("Valuation")] || '').trim(),
                        additionalnotes: String(row[headers.indexOf("Additional Notes")] || '').trim(),
                        status: String(row[headers.indexOf("Status")] || '').trim(),
                        staffIncharge: String(row[headers.indexOf("Staff-In-Charge")] || '').trim(),
                        donationDate: String(row[headers.indexOf("Donation Date")] || '').trim(),
                        userUid: firebase.auth().currentUser.uid,
                        createdAt: new Date().toISOString(),
                        updatedAt: new Date().toISOString()
                    };

                    // Normalize mobile number
                    if (donation.number && donation.number.length === 10 && donation.number.startsWith('9')) {
                        donation.number = '0' + donation.number;
                    }

                    // Create mock input elements for validateDonationForm
                    const mockInputs = {
                        encoder: { value: donation.encoder, classList: { add: () => {}, remove: () => {} }, nextElementSibling: null },
                        name: { value: donation.name, classList: { add: () => {}, remove: () => {} }, nextElementSibling: null },
                        type: { value: donation.type, classList: { add: () => {}, remove: () => {} }, nextElementSibling: null },
                        address: { value: donation.address, classList: { add: () => {}, remove: () => {} }, nextElementSibling: null },
                        contactPerson: { value: donation.contactPerson, classList: { add: () => {}, remove: () => {} }, nextElementSibling: null },
                        number: { value: donation.number, classList: { add: () => {}, remove: () => {} }, nextElementSibling: null },
                        email: { value: donation.email, classList: { add: () => {}, remove: () => {} }, nextElementSibling: null },
                        assistance: { value: donation.assistance, classList: { add: () => {}, remove: () => {} }, nextElementSibling: null },
                        valuation: { value: donation.valuation, classList: { add: () => {}, remove: () => {} }, nextElementSibling: null },
                        additionalnotes: { value: donation.additionalnotes, classList: { add: () => {}, remove: () => {} }, nextElementSibling: null },
                        status: { value: donation.status, classList: { add: () => {}, remove: () => {} }, nextElementSibling: null },
                        staffIncharge: { value: donation.staffIncharge, classList: { add: () => {}, remove: () => {} }, nextElementSibling: null },
                        donationDate: { value: donation.donationDate, classList: { add: () => {}, remove: () => {} }, nextElementSibling: null }
                    };

                    // Override showError to collect errors instead of modifying DOM
                    const originalShowError = showError;
                    const rowErrors = [];
                    showError = (input, message) => {
                        rowErrors.push(`Row ${i + 2}: ${message}`);
                    };

                    // Validate using validateDonationForm
                    const isValidRow = await validateDonationForm(mockInputs);

                    // Restore original showError
                    showError = originalShowError;

                    if (!isValidRow) {
                        if (rowErrors.length > 0) {
                            importErrors.push(...rowErrors);
                        }
                        continue;
                    }

                    // Format donationDate to match form submission format
                    if (donation.donationDate) {
                        const parsedDate = new Date(donation.donationDate);
                        if (!isNaN(parsedDate.getTime())) {
                            donation.donationDate = parsedDate.toISOString().slice(0, 10);
                        }
                    }

                    // Convert valuation to number for storage
                    donation.valuation = parseFloat(donation.valuation) || 0;

                    // Check for duplicates
                    const duplicates = await checkForDuplicate(donation.number, donation.email, donation.name);
                    if (duplicates.all || duplicates.email || duplicates.number || duplicates.name) {
                        const duplicateMessages = [];
                        if (duplicates.all) {
                            duplicateMessages.push(`Row ${i + 2}: Same name, mobile number, and email already exist.`);
                        } else {
                            if (duplicates.email) duplicateMessages.push(`Row ${i + 2}: Email already used.`);
                            if (duplicates.number) duplicateMessages.push(`Row ${i + 2}: Mobile number already used.`);
                            if (duplicates.name) duplicateMessages.push(`Row ${i + 2}: Name already used.`);
                        }
                        potentialDuplicates.push({
                            rowIndex: i + 2,
                            donation,
                            duplicateMessages
                        });
                    } else {
                        donationsToImport.push(donation);
                    }

                    await new Promise(resolve => setTimeout(resolve, 10));
                }

                // Handle potential duplicates with a confirmation prompt
                if (potentialDuplicates.length > 0) {
                    const duplicateMessages = potentialDuplicates.map(d => d.duplicateMessages.join('<br>')).join('<br>');
                    const result = await Swal.fire({
                        title: 'Potential Duplicate Donations Detected',
                        html: `${duplicateMessages}<br><br>Do you want to proceed with importing these records?`,
                        icon: 'warning',
                        showCancelButton: true,
                        confirmButtonText: 'Proceed Anyway',
                        cancelButtonText: 'Skip Duplicates',
                        reverseButtons: true,
                        customClass: {
                            popup: 'custom-swal-popup-large',
                            title: 'custom-swal-title',
                            htmlContainer: 'custom-swal-content',
                            confirmButton: 'custom-confirm-btn',
                            cancelButton: 'custom-cancel-btn'
                        }
                    });

                    if (result.isConfirmed) {
                        potentialDuplicates.forEach(d => donationsToImport.push(d.donation));
                    } else {
                        potentialDuplicates.forEach(d => {
                            importErrors.push(d.duplicateMessages.join(''));
                        });
                    }
                }

                if (donationsToImport.length > 0) {
                    updateImportStatus(100, `Importing ${donationsToImport.length} records to Firebase...`);
                    const updates = {};
                    donationsToImport.forEach(donation => {
                        const newKey = database.ref().child('donations/savedDonations/inkind').push().key;
                        updates[`donations/savedDonations/inkind/${newKey}`] = donation;
                    });

                    try {
                        await database.ref().update(updates);
                        updateImportStatus(100, `Import complete! ${donationsToImport.length} records added.`);
                        Swal.fire({
                            icon: 'success',
                            title: 'Export Successful!',
                            text: `${donationsToImport.length} in-kind donation records imported successfully.`,
                            showConfirmButton: true,
                            confirmButtonText: 'OK',
                            customClass: {
                                popup: 'swal2-popup-success-clean',
                                title: 'swal2-title-success-clean',
                                htmlContainer: 'swal2-text-success-clean',
                                confirmButton: 'my-success-button'
                            }
                        }).then(() => {
                            if (importErrors.length === 0) {
                                closeImportStatusModal();
                            }
                        });
                    } catch (error) {
                        importErrorList.innerHTML = `<li>Error: ${error.message}</li>`;
                        Swal.fire({
                            icon: 'error',
                            title: 'Error',
                            text: `Failed to import records: ${error.message}`,
                            showConfirmButton: true,
                            confirmButtonText: 'OK',
                            customClass: {
                                popup: 'swal2-popup-error-clean',
                                title: 'swal2-title-error-clean',
                                htmlContainer: 'swal2-text-error-clean',
                                confirmButton: 'my-error-button'
                            }
                        });
                        importStatusModal.style.display = 'flex';
                    }
                } else {
                    updateImportStatus(100, "Import failed. No valid records found.");
                    Swal.fire({
                        icon: 'error',
                        title: 'Error',
                        text: 'No valid records found in the Excel file. Please check the data format.',
                        showConfirmButton: true,
                        confirmButtonText: 'OK',
                        customClass: {
                            popup: 'swal2-popup-error-clean',
                            title: 'swal2-title-error-clean',
                            htmlContainer: 'swal2-text-error-clean',
                            confirmButton: 'my-error-button'
                        }
                    });
                    importStatusModal.style.display = 'flex';
                }

                if (importErrors.length > 0) {
                    importErrorList.innerHTML = '<li>Errors:</li>' + importErrors.map(err => `<li>${err}</li>`).join('');
                    Swal.fire({
                        icon: 'warning',
                        title: 'Warning',
                        text: 'Some records were not imported due to errors. Check the status modal for details.',
                        showConfirmButton: true,
                        confirmButtonText: 'OK',
                        customClass: {
                            popup: 'swal2-popup-warning-clean',
                            title: 'swal2-title-warning-clean',
                            htmlContainer: 'swal2-text-warning-clean',
                            confirmButton: 'my-warning-button'
                        }
                    });
                    importStatusModal.style.display = 'flex';
                }
            } catch (error) {
                importErrorList.innerHTML = `<li>Error: ${error.message}</li>`;
                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: 'An error occurred while importing the Excel file: ' + error.message,
                    showConfirmButton: true,
                    confirmButtonText: 'OK',
                    customClass: {
                        popup: 'swal2-popup-error-clean',
                        title: 'swal2-title-error-clean',
                        htmlContainer: 'swal2-text-error-clean',
                        confirmButton: 'my-error-button'
                    }
                });
                importStatusModal.style.display = 'flex';
            }
        };
        reader.readAsArrayBuffer(file);
    });

    function fetchArchivedDonations() {
        archivedInKindRef.on('value', (snapshot) => { 
            allArchivedInKindDonation = []; 
            snapshot.forEach((childSnapshot) => {
                const donation = childSnapshot.val();
                donation.id = childSnapshot.key;
                allArchivedInKindDonation.push(donation);
            });

            allArchivedInKindDonation.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
            renderArchivedTable(currentArchivedPage);
            renderArchivedPagination();
        });
    }

    function renderArchivedTable(page) {
        archivedTableBody.innerHTML = '';
        const start = (page - 1) * archivedRowsPerPage; 
        const end = start + archivedRowsPerPage;
        const paginatedItems = allArchivedInKindDonation.slice(start, end); 

        if (paginatedItems.length === 0) {
            archivedTableBody.innerHTML = '<tr><td colspan="14" class="no-data">No archived in-kind donations found.</td></tr>';
            archivedEntriesInfo.textContent = 'Showing 0 to 0 of 0 entries';
            return;
        }

        paginatedItems.forEach((item, index) => {
            const row = archivedTableBody.insertRow();
            row.innerHTML = `
                <td>${start + index + 1}</td>
                <td>${item.encoder}</td>
                <td>${item.name}</td>
                <td>${item.type}</td>
                <td>${item.address}</td> <!-- Fixed column order -->
                <td>${item.contactPerson}</td>
                <td>${item.number}</td>
                <td>${item.email}</td> <!-- Fixed column order -->
                <td>${item.assistance}</td>
                <td>${parseFloat(item.valuation || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                <td>${item.additionalnotes}</td>
                <td>${item.status}</td>
                <td>${item.staffIncharge}</td>
                <td>${item.donationDate ? new Date(item.donationDate).toLocaleDateString('en-PH') : 'N/A'}</td>
                <td>${item.rejectedAt ? new Date(item.rejectedAt).toLocaleDateString('en-PH') : 'N/A'}</td>
                <td>
                    ${permissions.canRetrieve ? `<button class="retrieve-btn" data-id="${item.id}" title="Retrieve">Retrieve</button>` : ''}
                </td>
            `;
        });

        const totalEntries = allArchivedInKindDonation.length; 
        const startEntry = start + 1;
        const endEntry = Math.min(start + paginatedItems.length, totalEntries);
        archivedEntriesInfo.textContent = `Showing ${startEntry} to ${endEntry} of ${totalEntries} entries`;

        if (permissions.canRetrieve) {
            document.querySelectorAll('.retrieve-btn').forEach(button => {
                button.addEventListener('click', (event) => retrieveDonation(event.target.dataset.id));
            });
        }
    }

    function renderArchivedPagination() {
        archivedPaginationContainer.innerHTML = ''; 
        const totalPages = Math.ceil(allArchivedInKindDonation.length / archivedRowsPerPage);

        for (let i = 1; i <= totalPages; i++) {
            const pageBtn = document.createElement('button');
            pageBtn.textContent = i;
            pageBtn.classList.add('pagination-button');
            if (i === currentArchivedPage) {
                pageBtn.classList.add('active');
            }
            pageBtn.addEventListener('click', () => {
                currentArchivedPage = i;
                renderArchivedTable(currentArchivedPage);
                renderArchivedPagination();
            });
            archivedPaginationContainer.appendChild(pageBtn);
        }
    }

    async function retrieveDonation(firebaseKey) {
        if (!permissions.canRetrieve) {
            Swal.fire('Error', 'You do not have permission to retrieve donations.', 'error');
            return;
        }
        Swal.fire({
            title: 'Retrieve Donation?',
            text: 'This will retrieve the donation from archived records.',
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
                    const snapshot = await database.ref(`donations/archivedDonations/inkind/${firebaseKey}`).once('value');
                    const donationToRetrieve = snapshot.val();
                    if (!donationToRetrieve) {
                        Swal.fire('Error', 'Archived donation data not found for retrieval.', 'error');
                        return;
                    }
                    delete donationToRetrieve.rejectedAt;
                    await database.ref(`donations/savedDonations/inkind/${firebaseKey}`).set(donationToRetrieve);
                    await database.ref(`donations/archivedDonations/inkind/${firebaseKey}`).remove();
                    Swal.close();
                    Swal.fire({
                        icon: 'success',
                        title: 'Retrieved!',
                        text: 'The donation has been retrieved.',
                        timer: 2000,
                        showConfirmButton: false,
                        timerProgressBar: true,
                        customClass: {
                            popup: 'swal2-popup-success-clean',
                            title: 'swal2-title-success-clean',
                            htmlContainer: 'swal2-text-success-clean'
                        }
                    }).then(() => {
                        renderTable();
                        fetchArchivedDonations();
                    });
                } catch (error) {
                    Swal.close();
                    Swal.fire('Error', 'Failed to retrieve donation: ' + error.message, 'error');
                }
            }
        });
    }

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
        }
        searchInput.placeholder = placeholderText;
    };

    auth.onAuthStateChanged(async user => {
        console.log(`[${new Date().toISOString()}] Auth state changed:`, user ? { uid: user.uid, email: user.email } : 'No user');
        
        if (!user) {
            Swal.fire({
                icon: 'error',
                title: 'Authentication Required',
                text: 'Please sign in to access in-kind donations.',
                showConfirmButton: true,
                confirmButtonText: 'OK',
                customClass: {
                    popup: 'swal2-popup-error-clean',
                    title: 'swal2-title-error-clean',
                    htmlContainer: 'swal2-text-error-clean',
                    confirmButton: 'my-error-button'
                }
            }).then(() => window.location.href = "../pages/login.html");
            return;
        }

        try {
            // Fetch user data to check password_needs_reset
            const userSnapshot = await database.ref('users/' + user.uid).once('value');
            const userData = userSnapshot.val();
            const passwordNeedsReset = userData ? (userData.password_needs_reset || false) : false;

            if (passwordNeedsReset) {
                console.log(`[${new Date().toISOString()}] Password change required for user ${user.uid}. Redirecting to profile.`);
                Swal.fire({
                    icon: 'error',
                    title: 'Password Change Required',
                    text: 'For security reasons, please change your password.',
                    allowOutsideClick: false,
                    timer: 1600,
                    showConfirmButton: false,
                    timerProgressBar: true,
                    customClass: {
                        popup: 'swal2-popup-error-clean',
                        title: 'swal2-title-error-clean',
                        htmlContainer: 'swal2-text-error-clean'
                    }
                }).then(() => window.location.replace("../pages/profile.html"));
                return;
            }

            // Proceed with normal initialization if no password reset needed
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
                }).then(() => window.location.href = "../pages/login.html");
                return;
            }

            loadDonations(user.uid);
            updateSearchPlaceholder();
            resetInactivityTimer();

            viewArchivedBtn.addEventListener('click', async () => {
                if (!permissions.canRetrieve) {
                    Swal.fire({
                        title: 'Access Denied',
                        text: 'You do not have permission to view archived donations.',
                        icon: 'error',
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
                    return;
                }
                archivedModal.style.display = 'flex';
                fetchArchivedDonations();
            });

            if (!permissions.canArchive) document.querySelectorAll('.archiveBtn').forEach(btn => btn.style.display = 'none');
            if (!permissions.canEdit) document.querySelectorAll('.editBtn').forEach(btn => btn.style.display = 'none');

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
            }).then(() => window.location.href = "../pages/login.html");
        }
    });


    function loadDonations(userUid) {
    database.ref("donations/savedDonations/inkind").on("value", snapshot => {
        allDonations = [];
        const donations = snapshot.val();
        if (donations) {
            Object.keys(donations).forEach(key => {
                const donation = donations[key];
                const donationEntry = {
                    firebaseKey: key,
                    userUid: donation.userUid || '',
                    encoder: donation.encoder || '',
                    name: donation.name || '',
                    type: donation.type || '',
                    address: donation.address || '',
                    contactPerson: donation.contactPerson || '',
                    number: donation.number || '',
                    email: donation.email || '',
                    assistance: donation.assistance || '',
                    valuation: donation.valuation || 0,
                    additionalnotes: donation.additionalnotes || '',
                    status: donation.status || '',
                    staffIncharge: donation.staffIncharge || '',
                    donationDate: donation.donationDate || '',
                    createdAt: donation.createdAt || ''
                };
                allDonations.push(donationEntry);
            });
        }
        filteredAndSortedDonations = [...allDonations];
        applySorting(filteredAndSortedDonations, sortSelect.value);
        renderTable();
    }, error => {
        logErrorToFirebase(error, 'loadDonations_inkind');
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'Failed to load in-kind donations: ' + error.message,
            showConfirmButton: true,
            confirmButtonText: 'OK',
            customClass: {
                popup: 'swal2-popup-error-clean',
                title: 'swal2-title-error-clean',
                htmlContainer: 'swal2-text-error-clean',
                confirmButton: 'my-error-button'
            }
        });
    });
}

    const isEmpty = (value) => value.trim() === "";
    const isLettersOnly = (value) => /^[a-zA-Z\s]+$/.test(value);
    const isValidNumericAmount = (value) => /^\d*\.?\d{0,2}$/.test(value);

    function showError(inputField, message) {
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
    }

    function clearError(inputField) {
        const errorDiv = inputField.nextElementSibling;
        if (errorDiv && errorDiv.classList.contains('error-message')) {
            errorDiv.textContent = '';
        }
        inputField.classList.remove('error');
    }

    async function validateDonationForm(inputs, excludeKey = null, isEditOrArchive = false) {
        let isValid = true;
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const fieldsToCheck = [
            { input: inputs.encoder, label: "Encoder", lettersOnly: true },
            { input: inputs.name, label: "Name", lettersOnly: true },
            { input: inputs.type, label: "Type", lettersOnly: true },
            { input: inputs.contactPerson, label: "Contact Person", lettersOnly: true },
            { input: inputs.number, label: "Number", numberOnly: true, checkMobile: true },
            { input: inputs.address, label: "Address" },
            { input: inputs.email, label: "Email", checkEmail: true },
            { input: inputs.assistance, label: "Assistance", lettersOnly: true },
            { input: inputs.valuation, label: "Valuation", numberOnly: true },
            { input: inputs.additionalnotes, label: "Additional Notes", required: false },
            { input: inputs.status, label: "Status" },
            { input: inputs.staffIncharge, label: "Staff-In-Charge", lettersOnly: true },
            { input: inputs.donationDate, label: "Donation Date", checkDate: true }
        ];

        for (const { input, label, lettersOnly, numberOnly, checkEmail, checkMobile, checkValuation, isDate, required = true } of fieldsToCheck) {
            if (!input) {
                isValid = false;
                continue;
            }
            const fieldId = input.id || input.name;
            if (excludeKey && fieldId === excludeKey) continue;

            clearError(input);
            const sanitizedValue = sanitizeInput(input.value);
            if (required && isEmpty(sanitizedValue)) {
                showError(input, `${label} is required`);
                isValid = false;
            } else if (!isEmpty(sanitizedValue)) {
                if (lettersOnly && !isLettersOnly(sanitizedValue)) {
                    showError(input, `${label} should only contain letters and spaces`);
                    isValid = false;
                }
                if (numberOnly && !isValidNumber(sanitizedValue)) {
                    showError(input, `${label} should only contain numbers`);
                    isValid = false;
                }
                if (checkEmail && !isValidEmail(sanitizedValue)) {
                    showError(input, 'Please enter a valid email address from an allowed domain.');
                    isValid = false;
                }
                if (checkMobile && !isValidMobile(sanitizedValue)) {
                    showError(input, 'Mobile number must be 11 digits starting with "09"');
                    isValid = false;
                }
                if (checkValuation && !isValidValuation(sanitizedValue)) {
                    showError(input, 'Valuation must be a positive number with up to 2 decimal places, max 1,000,000');
                    isValid = false;
                }
                if (isDate) {
                    const donationDate = new Date(sanitizedValue);
                    if (isNaN(donationDate.getTime())) {
                        showError(input, `${label} is not a valid date`);
                        isValid = false;
                    }
                }
                // if (isDate) {
                //     const donationDate = new Date(sanitizedValue);
                //     const oneWeekFromNow = new Date();
                //     oneWeekFromNow.setDate(oneWeekFromNow.getDate() + 7);
                //     oneWeekFromNow.setHours(0, 0, 0, 0);
                //     const normalizedDonationDate = new Date(donationDate);
                //     normalizedDonationDate.setHours(0, 0, 0, 0);
                //     if (isNaN(donationDate.getTime())) {
                //         showError(input, `${label} is not a valid date`);
                //         isValid = false;
                //     } else if (normalizedDonationDate.getTime() > oneWeekFromNow.getTime()) {
                //         showError(input, `${label} cannot be more than one week in the future`);
                //         isValid = false;
                //     }
                // }
            }
            input.value = sanitizedValue;
        }

        if (!isValid) {
            return false;
        }

        const permissions = await checkAdminPermissions();
        if (!permissions.canEdit) {
            Swal.fire({
                title: 'Access Denied',
                text: 'You do not have permission to add or edit this donation.',
                icon: 'error',
                timer: 1600,
                showConfirmButton: false,
                timerProgressBar: true,
                allowOutsideClick: false,
                customClass: {
                    popup: 'swal2-popup-warning-clean',
                    title: 'swal2-title-warning-clean',
                    htmlContainer: 'swal2-text-warning-clean',
                }
            });
            return false;
        }

        if (isEditOrArchive && !currentUserIsSuperAdmin && !isAdminVerified) {
            const verified = await verifySuperAdminPassword();
            if (!verified) {
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
        }

        const email = sanitizeInput(inputs.email.value.trim());
        const mobile = sanitizeInput(inputs.number.value.trim());
        const name = sanitizeInput(inputs.name.value.trim().toLowerCase());

        try {
            const duplicates = await checkForDuplicate(mobile, email, name, excludeKey);
            if (duplicates.email || duplicates.number || duplicates.name) {
                const duplicateFields = [];
                if (duplicates.email) duplicateFields.push('email');
                if (duplicates.number) duplicateFields.push('mobile number');
                if (duplicates.name) duplicateFields.push('name');
                const result = await Swal.fire({
                    title: 'Potential Duplicate Donation',
                    html: `A donation with the same ${duplicateFields.join(", ")} already exists.<br><br>Do you want to proceed?`,
                    icon: 'warning',
                    showCancelButton: true,
                    confirmButtonText: 'Yes, Proceed',
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

                if (!result.isConfirmed) return false;
            }
        } catch (error) {
            Swal.fire({
                title: 'Error',
                text: 'Failed to check for duplicates: ' + error.message,
                icon: 'error',
                customClass: {
                    popup: 'swal2-popup-error-clean',
                    title: 'swal2-title-error-clean',
                    htmlContainer: 'swal2-text-error-clean',
                    confirmButton: 'my-error-button'
                }
            });
            return false;
        }

        return isValid;
    }

    form.addEventListener("input", () => {
        formHasChanges = true;
    });

    const clearFormFields = () => {
        form.encoder.value = '';
        form.name.value = '';
        form.type.value = '';
        form.address.value = '';
        form.contactPerson.value = '';
        form.number.value = '';
        form.email.value = '';
        form.assistance.value = '';
        form.valuation.value = '';
        form.additionalnotes.value = '';
        form.status.value = '';
        form.staffIncharge.value = '';
        form.donationDate.value = '';
        formHasChanges = false;
        const errorMessages = form.querySelectorAll('.error-message');
        errorMessages.forEach(msg => msg.textContent = '');
        const errorInputs = form.querySelectorAll('.error');
        errorInputs.forEach(input => input.classList.remove('error'));
    };

    form.addEventListener("submit", async (e) => {
        e.preventDefault();
        const inputs = {
            encoder: form.encoder,
            name: form.name,
            type: form.type,
            address: form.address,
            contactPerson: form.contactPerson,
            number: form.number,
            email: form.email,
            assistance: form.assistance,
            valuation: form.valuation,
            additionalnotes: form.additionalnotes,
            status: form.status,
            staffIncharge: form.staffIncharge,
            donationDate: form.donationDate,
        };
        const isValid = await validateDonationForm(inputs);
        if (isValid) {
            const user = auth.currentUser;
            if (!user) {
                Swal.fire({
                    title: "Error",
                    text: "User not authenticated!",
                    icon: "error",
                    customClass: {
                        popup: 'swal2-popup-error-clean',
                        title: 'swal2-title-error-clean',
                        htmlContainer: 'swal2-text-error-clean',
                        confirmButton: 'my-error-button'
                    }
                });
                return;
            }

            const newDonation = {
                encoder: sanitizeInput(form.encoder.value),
                name: sanitizeInput(form.name.value),
                type: sanitizeInput(form.type.value),
                address: sanitizeInput(form.address.value),
                contactPerson: sanitizeInput(form.contactPerson.value),
                number: sanitizeInput(form.number.value),
                email: sanitizeInput(form.email.value),
                assistance: sanitizeInput(form.assistance.value),
                valuation: parseFloat(form.valuation.value) || 0,
                additionalnotes: sanitizeInput(form.additionalnotes.value),
                status: form.status.value,
                staffIncharge: sanitizeInput(form.staffIncharge.value),
                donationDate: form.donationDate.value,
                createdAt: new Date().toISOString(),
                createdBy: user.uid,
            };

            try {
                await database.ref("donations/savedDonations/inkind").push(newDonation);
                Swal.fire({
                    icon: 'success',
                    title: 'Donation Added!',
                    text: 'Your donation has been successfully recorded.',
                    showConfirmButton: true,
                    confirmButtonText: 'OK',
                    customClass: {
                        popup: 'swal2-popup-success-clean',
                        title: 'swal2-title-success-clean',
                        htmlContainer: 'swal2-text-success-clean',
                        confirmButton: 'my-success-button'
                    }
                });
                clearFormFields();
            } catch (error) {
                Swal.fire({
                    title: 'Error',
                    text: 'Failed to add donation: ' + error.message,
                    icon: 'error',
                    customClass: {
                        popup: 'swal2-popup-error-clean',
                        title: 'swal2-title-error-clean',
                        htmlContainer: 'swal2-text-error-clean',
                        confirmButton: 'my-error-button'
                    }
                });
            }
        } else {
            Swal.fire({
                title: 'Validation Error',
                text: 'Please correct the errors in the form before submitting.',
                icon: 'error',
                showConfirmButton: true,
                confirmButtonText: 'OK',
                customClass: {
                    popup: 'swal2-popup-error-clean',
                    title: 'swal2-title-error-clean',
                    htmlContainer: 'swal2-text-error-clean',
                    confirmButton: 'my-error-button'
                }
            });
            return;
        }
    });

    clearFormBtn.addEventListener("click", () => {
        if (formHasChanges) {
            Swal.fire({
                title: 'Discard Changes?',
                text: 'You have unsaved changes. Are you sure you want to clear the form?',
                icon: 'warning',
                showCancelButton: true,
                confirmButtonText: 'Yes, clear it!',
                cancelButtonText: 'No, keep editing',
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
            }).then((result) => {
                if (result.isConfirmed) {
                    clearFormFields();
                }
            });
        } else {
            clearFormFields();
        }
    });

    function showViewModal(donation) {
        const modalContentDiv = document.getElementById('modalContent');
        const previewModal = document.getElementById('previewModal');
        if (!previewModal || !modalContentDiv) {
            Swal.fire({
                title: 'Error',
                text: 'Modal not found. Please check the page setup.',
                icon: 'error',
                customClass: {
                    popup: 'swal2-popup-error-clean',
                    title: 'swal2-title-error-clean',
                    htmlContainer: 'swal2-text-error-clean'
                }
            });
            return;
        }

        const formattedTimestamp = donation.createdAt ? new Date(donation.createdAt).toLocaleString('en-PH', {
            year: 'numeric', month: 'short', day: 'numeric',
            hour: '2-digit', minute: '2-digit', second: '2-digit'
        }) : 'N/A';

        modalContentDiv.innerHTML = `
            <div class="modal-content-inner" style="padding: 20px;">
                <h2>Donor Information:</h2>
                <p><strong>Encoder:</strong> ${sanitizeInput(donation.encoder || 'N/A')}</p>
                <p><strong>Name:</strong> ${sanitizeInput(donation.name || 'N/A')}</p>
                <p><strong>Type:</strong> ${sanitizeInput(donation.type || 'N/A')}</p>
                <p><strong>Address:</strong> ${sanitizeInput(donation.address || 'N/A')}</p>
                <p><strong>Contact Person:</strong> ${sanitizeInput(donation.contactPerson || 'N/A')}</p>
                <p><strong>Number:</strong> ${sanitizeInput(donation.number || 'N/A')}</p>
                <p><strong>Email:</strong> ${sanitizeInput(donation.email || 'N/A')}</p>
                <hr>
                <h2>Donation Details:</h2>
                <p><strong>Assistance:</strong> ${sanitizeInput(donation.assistance || 'N/A')}</p>
                <p><strong>Valuation:</strong> ₱${parseFloat(donation.valuation || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                <p><strong>Additional Notes:</strong> ${sanitizeInput(donation.additionalnotes || 'N/A')}</p>
                <p><strong>Status:</strong> ${sanitizeInput(donation.status || 'N/A')}</p>
                <p><strong>Staff-In-Charge:</strong> ${sanitizeInput(donation.staffIncharge || 'N/A')}</p>
                <p><strong>Donation Date:</strong> ${donation.donationDate ? new Date(donation.donationDate).toLocaleDateString('en-PH') : 'N/A'}</p>
                <p><strong>Recorded On:</strong> ${formattedTimestamp}</p>
            </div>
        `;
        previewModal.style.display = 'flex';
    }

    function hideViewModal() {
        const previewModal = document.getElementById('previewModal');
        const modalContentDiv = document.getElementById('modalContent');
        if (previewModal && modalContentDiv) {
            previewModal.style.display = 'none';
            modalContentDiv.innerHTML = '';
        }
    }

    function renderTable() {
        const startIndex = (currentPage - 1) * rowsPerPage;
        const endIndex = startIndex + rowsPerPage;
        const currentPageRows = filteredAndSortedDonations.slice(startIndex, endIndex);

        tableBody.innerHTML = "";
        if (currentPageRows.length === 0) {
            tableBody.innerHTML = `<tr><td colspan="15" style="text-align: center;">No donations found.</td></tr>`;
        } else {
            currentPageRows.forEach((d, i) => {
                const tr = document.createElement("tr");
                tr.innerHTML = `
                    <td>${startIndex + i + 1}</td>
                    <td>${sanitizeInput(d.encoder || 'N/A')}</td>
                    <td>${sanitizeInput(d.name || 'N/A')}</td>
                    <td>${sanitizeInput(d.type || 'N/A')}</td>
                    <td>${sanitizeInput(d.address || 'N/A')}</td>
                    <td>${sanitizeInput(d.contactPerson || 'N/A')}</td>
                    <td>${sanitizeInput(d.number || 'N/A')}</td>
                    <td>${sanitizeInput(d.email || 'N/A')}</td>
                    <td>${sanitizeInput(d.assistance || 'N/A')}</td>
                    <td>₱${parseFloat(d.valuation || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    <td>${sanitizeInput(d.additionalnotes || 'N/A')}</td>
                    <td>${sanitizeInput(d.status || 'N/A')}</td>
                    <td>${sanitizeInput(d.staffIncharge || 'N/A')}</td>
                    <td>${sanitizeInput(d.donationDate ? new Date(d.donationDate).toLocaleDateString('en-PH') : 'N/A')}</td>
                    <td>
                        <button class="viewBtn"><i class='bx bx-show-alt'></i></button>
                        ${permissions.canEdit ? `<button class="editBtn"><i class='bx bx-edit'></i></button>` : ''}
                        ${permissions.canArchive ? `<button class="archiveBtn"><i class="bx bx-x-circle"></i></button>` : ''}
                        <button class="endorseBtn"><i class='bx bx-mail-send'></i></button>
                        <button class="savePDFBtn"><i class='bx bxs-file-pdf'></i></button>
                    </td>
                `;
                tr.querySelector(".viewBtn").addEventListener("click", () => {
                    const donationToView = allDonations.find(app => app.firebaseKey === d.firebaseKey);
                    if (donationToView) {
                        showViewModal(donationToView);
                    } else {
                        Swal.fire({
                            title: 'Error',
                            text: 'Donation details not found.',
                            icon: 'error',
                            customClass: {
                                popup: 'swal2-popup-error-clean',
                                title: 'swal2-title-error-clean',
                                htmlContainer: 'swal2-text-error-clean'
                            }
                        });
                    }
                });
                if (permissions.canEdit) {
                    tr.querySelector(".editBtn").addEventListener("click", () => openEditModal(d.firebaseKey));
                }
                if (permissions.canArchive) {
                    tr.querySelector(".archiveBtn").addEventListener("click", () => deleteRow(d.firebaseKey));
                }
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

    function createPaginationButton(label, page, disabled = false, isActive = false) {
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
    }

    function renderPagination() {
        paginationContainer.innerHTML = '';
        const totalPages = Math.ceil(filteredAndSortedDonations.length / rowsPerPage);

        if (totalPages === 0) {
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

    sortSelect.addEventListener("change", () => {
        const sortVal = sortSelect.value;
        applySorting(filteredAndSortedDonations, sortVal);
        updateSearchPlaceholder();
        renderTable();
    });

    function applySorting(arr, sortVal) {
        if (sortVal === "encoder-asc") arr.sort((a, b) => (a.encoder || '').localeCompare(b.encoder || ''));
        else if (sortVal === "encoder-desc") arr.sort((a, b) => (b.encoder || '').localeCompare(a.encoder || ''));
        else if (sortVal === "name-asc") arr.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
        else if (sortVal === "name-desc") arr.sort((a, b) => (b.name || '').localeCompare(a.name || ''));
        else if (sortVal === "type-asc") arr.sort((a, b) => (a.type || '').localeCompare(b.type || ''));
        else if (sortVal === "type-desc") arr.sort((a, b) => (b.type || '').localeCompare(a.type || ''));
        else if (sortVal === "address-asc") arr.sort((a, b) => (a.address || '').localeCompare(b.address || ''));
        else if (sortVal === "address-desc") arr.sort((a, b) => (b.address || '').localeCompare(a.address || ''));
        else if (sortVal === "contactPerson-asc") arr.sort((a, b) => (a.contactPerson || '').localeCompare(b.contactPerson || ''));
        else if (sortVal === "contactPerson-desc") arr.sort((a, b) => (b.contactPerson || '').localeCompare(a.contactPerson || ''));
        else if (sortVal === "number-asc") arr.sort((a, b) => parseInt((a.number || '0').replace(/\D/g, '')) - parseInt((b.number || '0').replace(/\D/g, '')));
        else if (sortVal === "number-desc") arr.sort((a, b) => parseInt((b.number || '0').replace(/\D/g, '')) - parseInt((a.number || '0').replace(/\D/g, '')));
        else if (sortVal === "email-asc") arr.sort((a, b) => (a.email || '').localeCompare(b.email || ''));
        else if (sortVal === "email-desc") arr.sort((a, b) => (b.email || '').localeCompare(a.email || ''));
        else if (sortVal === "assistance-asc") arr.sort((a, b) => (a.assistance || '').localeCompare(b.assistance || ''));
        else if (sortVal === "assistance-desc") arr.sort((a, b) => (b.assistance || '').localeCompare(a.assistance || ''));
        else if (sortVal === "valuation-asc") arr.sort((a, b) => (a.valuation || '').localeCompare(b.valuation || ''));
        else if (sortVal === "valuation-desc") arr.sort((a, b) => (b.valuation || '').localeCompare(a.valuation || ''));
        else if (sortVal === "additionalnotes-asc") arr.sort((a, b) => (a.additionalnotes || '').localeCompare(b.additionalnotes || ''));
        else if (sortVal === "additionalnotes-desc") arr.sort((a, b) => (b.additionalnotes || '').localeCompare(a.additionalnotes || ''));
        else if (sortVal === "status-asc") arr.sort((a, b) => (a.status || '').localeCompare(b.status || ''));
        else if (sortVal === "status-desc") arr.sort((a, b) => (b.status || '').localeCompare(a.status || ''));
        else if (sortVal === "staffIncharge-asc") arr.sort((a, b) => (a.staffIncharge || '').localeCompare(b.staffIncharge || ''));
        else if (sortVal === "staffIncharge-desc") arr.sort((a, b) => (b.staffIncharge || '').localeCompare(a.staffIncharge || ''));
        else if (sortVal === "donationDate-asc") arr.sort((a, b) => new Date(a.donationDate || '0') - new Date(b.donationDate || '0'));
        else if (sortVal === "donationDate-desc") arr.sort((a, b) => new Date(b.donationDate || '0') - new Date(a.donationDate || '0'));
    }

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
            "Number": d.number,
            "Email": d.email,
            "Assistance": d.assistance,
            "Valuation": d.valuation,
            "Additional Notes": d.additionalnotes,
            "Staff-In-Charge": d.staffIncharge,
            "Donation Date": d.donationDate,
        }));

        const ws = XLSX.utils.json_to_sheet(dataForExport);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Inkind Donations");
        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const day = String(today.getDate()).padStart(2, '0');
        const formattedDate = `${year}-${month}-${day}`;
        const filename = `excel-inkind-donations_${formattedDate}.xlsx`;
        XLSX.writeFile(wb, filename);
        Swal.fire({
            title: 'Export Successful!',
            text: `Inkind Donations exported to "${filename}"!`,
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
    });
    
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

            const head = [["No.", "Encoder", "Name", "Address", "Contact Person", "Number", "Email", "Assistance", "Valuation", "Additional Notes", "Status", "Staff-In-Charge", "Donation Date"]];
            const body = allDonations.map((d, i) => [
                i + 1,
                d.encoder || 'N/A',
                d.name || 'N/A',
                d.address || 'N/A',
                d.contactPerson || 'N/A',
                String(d.number) || 'N/A',
                d.email || 'N/A',
                d.assistance || 'N/A',
                `PHP ${parseFloat(d.valuation || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
                d.additionalnotes || 'N/A',
                d.status || 'N/A',
                d.staffIncharge || 'N/A',
                new Date(d.donationDate).toLocaleDateString('en-PH') || 'N/A'
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

            const filename = `pdf-inkind-donations_${new Date().toISOString().slice(0, 10)}.pdf`;
            doc.save(filename);
            
            Swal.fire({
                title: 'Export Successful!',
                text: `In-Kind Donations Report exported to "${filename}"!`,
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
        };

        logo.onerror = function() {
            Swal.fire("Error", "Failed to load logo image. Please check the path.", "error");
        };
    });

    function saveSingleDonationPdf(donation) {
        if (!donation || typeof donation !== 'object') {
            Swal.fire("Error", "Invalid donation data provided.", "error");
            return;
        }

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
            doc.text(`Report Generated: ${new Date().toLocaleString('en-PH')}`, 14, 30);
            let y = 45;

            const addDetail = (label, value) => {
                const displayValue = (value === null || value === undefined || value === '') ? 'N/A' : value;
                doc.text(`${label}: ${sanitizeInput(displayValue)}`, 14, y);
                y += 7;
            };

            addDetail("Encoder", donation.encoder);
            addDetail("Name", donation.name);
            addDetail("Type", donation.type);
            addDetail("Address", donation.address);
            addDetail("Contact Person", donation.contactPerson);
            addDetail("Number", donation.number);
            addDetail("Email", donation.email);
            addDetail("Assistance", donation.assistance);
            addDetail("Valuation", `₱${parseFloat(donation.valuation || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
            addDetail("Additional Notes", donation.additionalnotes);
            addDetail("Status", donation.status);
            addDetail("Staff-In-Charge", donation.staffIncharge);
            addDetail("Donation Date", donation.donationDate ? new Date(donation.donationDate).toLocaleDateString('en-PH') : 'N/A');
            addDetail("Recorded On", donation.createdAt ? new Date(donation.createdAt).toLocaleString('en-PH') : 'N/A');

            doc.setFontSize(8);
            const footerY = doc.internal.pageSize.height - 10;
            const poweredByText = "Powered by: Appvance";

            doc.text(`Page 1 of 1`, margin, footerY);
            doc.text(poweredByText, pageWidth - margin, footerY, { align: 'right' });

            const safeName = (donation.name || 'unknown')
            .replace(/[^a-z0-9]/gi, '-')
            .toLowerCase();

            const filename = `pdf-inkind-donation_${safeName}_${new Date().toISOString().slice(0, 10)}.pdf`;
            doc.save(filename);

            Swal.fire({
                title: 'Export Successful!',
                text: `In-kind donation details have been exported to "${filename}".`,
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
        };

        logo.onerror = function() {
            Swal.fire("Error", "Failed to load logo image. Please check the path.", "error");
        };
    }

    async function deleteRow(firebaseKey) {
        if (!permissions.canArchive) {
            Swal.fire('Error', 'You do not have permission to archive donations.', 'error');
            return;
        }

        const isVerified = await verifySuperAdminPassword();
        isAdminVerified = isVerified;
        if (!isVerified) {
            Swal.fire({
                title: 'Error',
                text: 'Incorrect admin password.',
                icon: 'error',
                showConfirmButton: true,
                confirmButtonText: 'OK',
                customClass: {
                    popup: 'swal2-popup-error-clean',
                    title: 'swal2-title-error-clean',
                    htmlContainer: 'swal2-text-error-clean',
                    confirmButton: 'my-error-button'
                }
            });
            return;
        }

        Swal.fire({
            title: 'Are you sure to archive this donation?',
            text: "This will move it to archived records.",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Archive',
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

                database.ref(`donations/archivedDonations/inkind/${firebaseKey}`).set(deletedDonation)
                    .then(() => {
                        return database.ref(`donations/savedDonations/inkind/${firebaseKey}`).remove();
                    })
                    .then(() => {
                        Swal.fire({
                            title: 'Archived!',
                            text: 'The donation has been archived.',
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
                        Swal.fire("Error", "Failed to delete donation: " + error.message, "error");
                    });
            }
        });
    }

    // Function to send an endorsement email using EmailJS
    async function sendEndorsementEmail(donation, endorsedGroup) {
        const serviceID = 'service_mzpjk2a';
        const templateID = 'template_4tks2la';

        // Validate the volunteer group's email
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
            return;
        }

        const templateParams = {
            to_email: endorsedGroup.email,
            reply_to: 'jldelossantos1101@gmail.com', // Replace with your organization’s email
            volunteer_group_name: endorsedGroup.name || 'Unknown Group',
            donor_name: donation.name || 'Unknown Donor',
            donation_type: donation.type || 'N/A',
            donation_quantity: parseFloat(donation.valuation || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
            endorsement_date: new Date().toLocaleDateString('en-US'),
            organization_email: 'jldelossantos1101@gmail.com', // Replace with your organization’s email
            organization_contact_number: '123-456-7890', // Replace with your organization’s contact number
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

    async function openEndorseModal(firebaseKey) {
        const donationToEndorse = allDonations.find(d => d.firebaseKey === firebaseKey);

        if (!donationToEndorse) {
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'Donation not found for endorsement.',
                customClass: {
                    popup: 'swal2-popup-error-clean',
                    title: 'swal2-title-error-clean',
                    htmlContainer: 'swal2-text-error-clean'
                }
            });
            return;
        }

        try {
            // Fetch active activations
            const activationsSnapshot = await firebase.database().ref('activations').orderByChild('status').equalTo('active').once('value');
            const activations = activationsSnapshot.val();

            // Fetch volunteer groups
            const volunteerGroupsSnapshot = await firebase.database().ref('volunteerGroups').once('value');
            const volunteerGroups = volunteerGroupsSnapshot.val() || {};

            let selectOptions = '<option value="" disabled selected>-- Select an option --</option>';
            const donationAddress = (donationToEndorse.address || '').toLowerCase().trim();

            if (activations && volunteerGroups) {
                for (const activationId in activations) {
                    const activation = activations[activationId];
                    if (activation.status !== 'active') continue;

                    let matchedGroup = null;
                    for (const groupId in volunteerGroups) {
                        const group = volunteerGroups[groupId];
                        const groupArea = (group.areaOfOperation || '').toLowerCase().trim();
                        if (group.organization && activation.organization &&
                            group.organization.toLowerCase() === activation.organization.toLowerCase() &&
                            isValidEmail(group.email) &&
                            (donationAddress.includes(groupArea) || groupArea.includes(donationAddress))) {
                            matchedGroup = group;
                            break;
                        }
                    }

                    if (matchedGroup) {
                        const orgName = activation.organization || 'Unknown';
                        const area = activation.areaOfOperation || 'Not specified';
                        selectOptions += `<option value="${orgName}" data-email="${matchedGroup.email}" data-activation-id="${activationId}">${orgName} (${area})</option>`;
                    }
                }

                if (selectOptions !== '<option value="" disabled selected>-- Select an option --</option>') {
                    Swal.fire({
                        title: 'Endorse Donation',
                        html: `
                            <p style="font-weight: 500; color: #333;">Select a volunteer group in the donation's area (${donationToEndorse.address}):</p>
                            <select id="assignmentSelect" style="
                                width: 100%;
                                padding: 10px;
                                border-radius: 8px;
                                border: 1px solid #ccc;
                                font-size: 14px;
                                background: #fefefe;
                                box-shadow: inset 0 1px 3px rgba(0,0,0,0.1);
                            ">
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
                        confirmButtonText: 'Endorse',
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
                            const select = document.getElementById('assignmentSelect');
                            const details = document.getElementById('assignmentDetails');
                            select.addEventListener('change', () => {
                                const selectedOption = select.options[select.selectedIndex];
                                if (selectedOption.value) {
                                    const email = selectedOption.getAttribute('data-email');
                                    const activationId = selectedOption.getAttribute('data-activation-id');
                                    details.innerHTML = `
                                        <p><strong>Organization:</strong> ${selectedOption.value}</p>
                                        <p><strong>Email:</strong> ${email}</p>
                                    `;
                                } else {
                                    details.innerHTML = '<p>Please select an option to view details.</p>';
                                }
                            });
                        },
                        preConfirm: () => {
                            const select = document.getElementById('assignmentSelect');
                            const selectedOption = select.options[select.selectedIndex];
                            if (!selectedOption.value) {
                                Swal.showValidationMessage('Please select a volunteer group.');
                                return false;
                            }
                            return {
                                organization: selectedOption.value,
                                email: selectedOption.getAttribute('data-email'),
                                activationId: selectedOption.getAttribute('data-activation-id'),
                                firebaseKey: firebaseKey
                            };
                        }
                    }).then(async (result) => {
                        if (result.isConfirmed) {
                            const { organization, email, activationId, firebaseKey } = result.value;
                            const endorsedGroup = {
                                name: organization,
                                email: email
                            };

                            try {
                                await database.ref(`donations/savedDonations/inkind/${firebaseKey}`).update({
                                    endorsedTo: endorsedGroup.name,
                                    endorsedEmail: endorsedGroup.email,
                                    endorsementDate: new Date().toISOString(),
                                    activationId: activationId
                                });

                                await sendEndorsementEmail(donationToEndorse, endorsedGroup);

                                Swal.fire({
                                    icon: 'success',
                                    title: 'Endorsement Successful!',
                                    text: `Donation endorsed to ${organization}.`,
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
                                logErrorToFirebase(error, 'openEndorseModal_update');
                                Swal.fire({
                                    icon: 'error',
                                    title: 'Endorsement Failed',
                                    text: `Failed to endorse donation: ${error.message}`,
                                    customClass: {
                                        popup: 'swal2-popup-error-clean',
                                        title: 'swal2-title-error-clean',
                                        htmlContainer: 'swal2-text-error-clean'
                                    }
                                });
                            }
                        }
                    });
                } else {
                    Swal.fire({
                        icon: 'warning',
                        title: 'No Matching Volunteer Groups',
                        text: `No active volunteer groups found in the donation's area (${donationToEndorse.address}).`,
                        customClass: {
                            popup: 'swal2-popup-warning-clean',
                            title: 'swal2-title-warning-clean',
                            htmlContainer: 'swal2-text-warning-clean'
                        }
                    });
                }
            }
        } catch (error) {
            logErrorToFirebase(error, 'openEndorseModal');
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: `Error loading endorsement options: ${error.message}`,
                customClass: {
                    popup: 'swal2-popup-error-clean',
                    title: 'swal2-title-error-clean',
                    htmlContainer: 'swal2-text-error-clean'
                }
            });
        }
    }

    async function openEditModal(firebaseKey) {
        if (!permissions.canEdit) {
            Swal.fire('Error', 'You do not have permission to edit donations.', 'error');
            return;
        }
        const isVerified = await verifySuperAdminPassword();
        isAdminVerified = isVerified;
        if (!isVerified) {
            Swal.fire({
                title: 'Error',
                text: 'Incorrect admin password.',
                icon: 'error',
                showConfirmButton: true,
                confirmButtonText: 'OK',
                customClass: {
                    popup: 'swal2-popup-error-clean',
                    title: 'swal2-title-error-clean',
                    htmlContainer: 'swal2-text-error-clean',
                    confirmButton: 'my-error-button'
                }
            });
            return;
        }
        editingKey = firebaseKey;
        const donationToEdit = allDonations.find(d => d.firebaseKey === firebaseKey);

        if (donationToEdit) {
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
            Array.from(editModal.querySelectorAll('input, select')).forEach(clearError);
        }
    }

    saveEditBtn.addEventListener("click", async () => {
        const inputs = {
            encoder: document.getElementById("edit-encoder"),
            name: document.getElementById("edit-name"),
            type: document.getElementById("edit-type"),
            address: document.getElementById("edit-address"),
            contactPerson: document.getElementById("edit-contactPerson"),
            number: document.getElementById("edit-number"),
            email: document.getElementById("edit-email"),
            assistance: document.getElementById("edit-assistance"),
            valuation: document.getElementById("edit-valuation"),
            additionalnotes: document.getElementById("edit-additionalnotes"),
            status: document.getElementById("edit-status"),
            staffIncharge: document.getElementById("edit-staffIncharge"),
            donationDate: document.getElementById("edit-donationDate"),
        };

        const isValid = await validateDonationForm(inputs, null, true);
        if (isValid) {
            const updatedDonation = {
                encoder: sanitizeInput(inputs.encoder.value),
                name: sanitizeInput(inputs.name.value),
                type: sanitizeInput(inputs.type.value),
                address: sanitizeInput(inputs.address.value),
                contactPerson: sanitizeInput(inputs.contactPerson.value),
                number: sanitizeInput(inputs.number.value),
                email: sanitizeInput(inputs.email.value),
                assistance: sanitizeInput(inputs.assistance.value),
                valuation: parseFloat(inputs.valuation.value) || 0,
                additionalnotes: sanitizeInput(inputs.additionalnotes.value),
                status: inputs.status.value,
                staffIncharge: sanitizeInput(inputs.staffIncharge.value),
                donationDate: inputs.donationDate.value,
            };

            try {
                await database.ref(`donations/savedDonations/inkind/${editingKey}`).update(updatedDonation);
                Swal.fire({
                    title: 'Success',
                    text: 'Donation updated successfully!',
                    icon: 'success',
                    timer: 2500,
                    showConfirmButton: false,
                    timerProgressBar: true,
                    allowOutsideClick: false,
                    customClass: {
                        popup: 'swal2-popup-success-clean',
                        title: 'swal2-title-success-clean',
                        htmlContainer: 'swal2-text-success-clean',
                    }
                });
                editModal.style.display = "none";
            } catch (error) {
                Swal.fire({
                    title: 'Error',
                    text: 'Failed to update donation: ' + error.message,
                    icon: 'error',
                    customClass: {
                        popup: 'swal2-popup-error-clean',
                        title: 'swal2-title-error-clean',
                        htmlContainer: 'swal2-text-error-clean',
                        confirmButton: 'my-error-button'
                    }
                });
            }
        } else {
            Swal.fire({
                title: 'Validation Error',
                text: 'Please correct the errors in the form before saving.',
                icon: 'error',
                showConfirmButton: true,
                confirmButtonText: 'OK',
                customClass: {
                    popup: 'swal2-popup-error-clean',
                    title: 'swal2-title-error-clean',
                    htmlContainer: 'swal2-text-error-clean',
                    confirmButton: 'my-error-button'
                }
            });
            return;
        }
    });

    function closeEditModal() {
        editModal.style.display = "none";
        editingKey = null;
        isAdminVerified = false;
        const errorMessages = editModal.querySelectorAll('.error-message');
        errorMessages.forEach(msg => msg.textContent = '');
        const errorInputs = editModal.querySelectorAll('.error');
        errorInputs.forEach(input => input.classList.remove('error'));
    }

    document.getElementById("cancelEndorseBtn").addEventListener("click", () => {
        document.getElementById("endorseModal").style.display = "none";
    });
    
    document.getElementById("closeEditModalBtn").addEventListener("click", closeEditModal);
    document.getElementById("cancelEditBtn").addEventListener("click", closeEditModal);
    document.getElementById("closeModal").addEventListener("click", hideViewModal);
    document.getElementById("downloadTemplateBtn").addEventListener("click", downloadExcelTemplate);

});
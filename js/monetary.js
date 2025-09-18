document.addEventListener("DOMContentLoaded", () => {
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

    firebase.initializeApp(firebaseConfig);
    const database = firebase.database();
    const auth = firebase.auth();
    const archivedMonetaryRef = database.ref('donations/archivedDonations/monetary');

    const form = document.getElementById("form-container-1");
    const tableBody = document.querySelector("#monetaryTable tbody");
    const searchInput = document.getElementById("searchInput");
    const sortSelect = document.getElementById("sortSelect");
    const exportBtn = document.getElementById("exportBtn");
    const savePdfBtn = document.getElementById("savePdfBtn");
    const entriesInfo = document.getElementById("entriesInfo");
    const paginationContainer = document.getElementById("pagination");
    const clearFormBtn = document.getElementById("clearFormBtn");
    const editModal = document.getElementById("editModal");
    const importExcelBtn = document.getElementById("importExcelBtn");
    const excelFileInput = document.getElementById("excelFileInput");
    const importStatusModal = document.getElementById("importStatusModal");
    const closeImportStatusModalBtn = document.getElementById("closeImportStatusModalBtn");
    const importProgressBar = document.getElementById("importProgressBar");
    const importStatusText = document.getElementById("importStatusText");
    const importErrorList = document.getElementById("importErrorList");
    const archivedModal = document.getElementById('archivedModal');
    const closeArchivedModalBtn = document.getElementById('closeArchivedModalBtn');
    const viewArchivedBtn = document.getElementById('viewArchived');
    const archivedTableBody = document.querySelector('#archivedTable tbody');
    const archivedEntriesInfo = document.getElementById('archivedEntriesInfo');
    const archivedPagination = document.getElementById('archivedPagination');

    const rowsPerPage = 10;
    let currentPage = 1;
    let allDonations = [];
    let filteredAndSortedDonations = [];
    let archivedData = [];
    let archivedCurrentPage = 1;
    const archivedItemsPerPage = 10;
    let editingKey = null;
    let formHasChanges = false;
    const INACTIVITY_TIME = 1800000;
    let inactivityTimeout;
    let permissions = { canView: false, canEdit: false, canArchive: false, canRetrieve: false };

    // Email validation 
    function isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        const validDomains = ['gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com', 'icloud.com', 'protonmail.com'];
        const domain = email.split('@')[1]?.toLowerCase();
        return emailRegex.test(email) && validDomains.includes(domain);
    }

    // Mobile number validation
    function isValidMobile(mobile) {
        const mobileRegex = /^09[0-9]{9}$/;
        return mobileRegex.test(mobile);
    }

    // Add real-time input restrictions for number fields
    const numberInput = form.number;
    const editNumberInput = document.getElementById("edit-number");

    function restrictNumberInput(input) {
        input.addEventListener("input", () => {
            // Remove non-digits and prevent decimals/exponential notation
            input.value = input.value.replace(/[^0-9]/g, '');
            // Limit to 11 digits
            if (input.value.length > 11) {
                input.value = input.value.slice(0, 11);
            }
            // Enforce 09 prefix
            if (input.value && !input.value.startsWith('09')) {
                input.value = '09' + input.value.replace(/^09/, '').slice(0, 9);
            }
        });
    }

    restrictNumberInput(numberInput);
    restrictNumberInput(editNumberInput);

    // checkForDuplicate (email, mobile num, and name)
    async function checkForDuplicate(number, email, name, excludeKey = null) {
        const snapshot = await database.ref('donations/savedDonations/monetary').once('value');
        const donations = snapshot.val();
        const duplicates = { email: false, number: false, name: false, all: false };

        if (!donations) return duplicates;

        for (const key in donations) {
            if (excludeKey && key === excludeKey) continue;
            const donation = donations[key];
            if (donation.email.toLowerCase() === email.toLowerCase()) duplicates.email = true;
            if (donation.number === number) duplicates.number = true;
            if (donation.name.toLowerCase() === name.toLowerCase()) duplicates.name = true;
            if (donation.number === number && donation.email.toLowerCase() === email.toLowerCase() && donation.name.toLowerCase() === name.toLowerCase()) {
                duplicates.all = true;
            }
        }
        return duplicates;
    }

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

    const isValidUrl = (url) => {
        try {
            new URL(url);
            return true;
        } catch {
            return false;
        }
    };

    const isValidReferenceNumber = (value) => /^[a-zA-Z0-9]{1,20}$/.test(value);

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
            if (fieldConfig.label === "Amount Donated" && parseFloat(input.value) < 100) {
                showError(input, `${fieldConfig.label} must be at least PHP 100.`);
            }
            if (fieldConfig.isUrl && input.value && !isValidUrl(input.value.trim())) {
                showError(input, `${fieldConfig.label} must be a valid URL.`);
            }
            // bawal future date
            // if (fieldConfig.isDate) {
            //     const receivedDate = new Date(input.value);
            //     if (isNaN(receivedDate.getTime())) {
            //         showError(input, `${fieldConfig.label} is not a valid date.`);
            //     } else if (receivedDate.setHours(0, 0, 0, 0) > new Date().setHours(0, 0, 0, 0)) {
            //         showError(input, `${fieldConfig.label} cannot be a future date.`);
            //     }
            // }

            // pede past, present, and future
            // if (fieldConfig.isDate) {
            //     const receivedDate = new Date(input.value);
            //     if (isNaN(receivedDate.getTime())) {
            //         showError(input, `${fieldConfig.label} is not a valid date.`);
            //     }
            // }
            if (fieldConfig.isDate) {
                const receivedDate = new Date(input.value);
                if (isNaN(receivedDate.getTime())) {
                    showError(input, `${fieldConfig.label} is not a valid date.`);
                } else if (receivedDate.setHours(0, 0, 0, 0) > new Date().setHours(0, 0, 0, 0)) {
                    Swal.fire({
                        title: 'Future Date Detected',
                        text: 'The Date Received is in the future. Is this a pledged or scheduled donation?',
                        icon: 'question',
                        showCancelButton: true,
                        confirmButtonText: 'Yes, Proceed',
                        cancelButtonText: 'No, Change Date',
                        reverseButtons: true,
                        customClass: {
                            popup: 'custom-swal-popup-large',
                            title: 'custom-swal-title',
                            htmlContainer: 'custom-swal-content',
                            confirmButton: 'custom-confirm-btn',
                            cancelButton: 'custom-cancel-btn'
                        }
                    }).then((result) => {
                        if (!result.isConfirmed) {
                            input.value = '';
                            showError(input, 'Please select a valid date.');
                        }
                    });
                }
            }
            if (fieldConfig.isValidReferenceNumber && input.value &&    !isValidReferenceNumber(input.value)) {
                showError(input, `${fieldConfig.label} must be alphanumeric and up to 20 characters.`);
            }
        }
    }

    // Real-time validation for main form
    Array.from(form.querySelectorAll('input')).forEach(input => {
        const fieldConfig = {
            encoder: { label: 'Encoder', lettersOnly: true },
            name: { label: 'Name', lettersOnly: false },
            address: { label: 'Location' },
            number: { label: 'Number', telNumber: true },
            amount: { label: 'Amount Donated', numericAmount: true, positiveNumber: true },
            invoice: { label: 'Cash Invoice #', required: false },
            dateReceived: { label: 'Date Received', isDate: true },
            email: { label: 'Email', isEmail: true },
            bank: { label: 'Bank' },
            referenceNumber: { label: 'Reference Number', required: false, isValidReferenceNumber: true },            proof: { label: 'Proof of Transaction', required: false, isUrl: true }
        }[input.id];
        if (fieldConfig) {
            input.addEventListener('input', () => validateInputInRealTime(input, fieldConfig, {
                encoder: form.encoder,
                name: form.name,
                address: form.address,
                number: form.number,
                amount: form.amount,
                invoice: form.invoice,
                dateReceived: form.dateReceived,
                email: form.email,
                bank: form.bank,
                referenceNumber: form.referenceNumber,
                proof: form.proof
            }));
        }
    });

    // Real-time validation for edit modal
    Array.from(editModal.querySelectorAll('input')).forEach(input => {
        const fieldConfig = {
            'edit-encoder': { label: 'Encoder', lettersOnly: true },
            'edit-name': { label: 'Name', lettersOnly: false },
            'edit-address': { label: 'Location' },
            'edit-number': { label: 'Number', telNumber: true },
            'edit-amount': { label: 'Amount Donated', numericAmount: true, positiveNumber: true },
            'edit-invoice': { label: 'Cash Invoice #', required: false },
            'edit-dateReceived': { label: 'Date Received', isDate: true },
            'edit-email': { label: 'Email', isEmail: true },
            'edit-bank': { label: 'Bank' },
            'edit-referenceNumber': { label: 'Reference Number', required: false, isValidReferenceNumber: true },
            'edit-proof': { label: 'Proof of Transaction', required: false, isUrl: true}
        }[input.id];
        if (fieldConfig) {
            input.addEventListener('input', () => validateInputInRealTime(input, fieldConfig, {
                encoder: document.getElementById("edit-encoder"),
                name: document.getElementById("edit-name"),
                address: document.getElementById("edit-address"),
                number: document.getElementById("edit-number"),
                amount: document.getElementById("edit-amount"),
                invoice: document.getElementById("edit-invoice"),
                dateReceived: document.getElementById("edit-dateReceived"),
                email: document.getElementById("edit-email"),
                bank: document.getElementById("edit-bank"),
                referenceNumber: document.getElementById("edit-referenceNumber"),
                proof: document.getElementById("edit-proof")
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
            "Location",
            "Number",
            "Amount Donated",
            "Cash Invoice #",
            "Date Received",
            "Email",
            "Bank",
            "Reference No.",
            "Proof of Transaction"
        ];
        const sampleData = [{
            Encoder: "John Smith",
            Name: "Jane Doe",
            Location: "Manila",
            Number: "09123456789",
            "Amount Donated": 1000.50,
            "Cash Invoice #": "CINV-123456",
            "Date Received": "2025-08-10",
            Email: "jane.doe@gmail.com",
            Bank: "BDO",
            "Reference No.": "REF123",
            "Proof of Transaction": "https://drive.google.com/sample"
        }];
        const instructions = [{
            Instructions: "1. Ensure mobile numbers are 11 digits starting with '09' (e.g., 09123456789). Format the Number column as 'Text' in Excel to preserve leading zeros.\n2. Duplicate donations (same name, mobile number, and email) are allowed but will prompt for confirmation during import."
        }];

        const ws = XLSX.utils.json_to_sheet(sampleData, { header: headers });
        const wsInstructions = XLSX.utils.json_to_sheet(instructions);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Monetary Donations Template");
        XLSX.utils.book_append_sheet(wb, wsInstructions, "Instructions");
        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const day = String(today.getDate()).padStart(2, '0');
        const formattedDate = `${year}-${month}-${day}`;
        const filename = `monetary_donations_template_${formattedDate}.xlsx`;
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
                // Verify isValidUrl is defined
                if (typeof isValidUrl !== 'function') {
                    throw new Error('isValidUrl function is not defined');
                }

                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, { type: 'array' });
                const firstSheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[firstSheetName];
                const json = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

                const headers = json[0];
                const requiredHeaders = ["Encoder", "Name", "Location", "Number", "Amount Donated", "Date Received", "Email", "Bank"];
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

                    const donation = {
                        encoder: String(row[headers.indexOf("Encoder")] || '').trim(),
                        name: String(row[headers.indexOf("Name")] || '').trim(),
                        address: String(row[headers.indexOf("Location")] || '').trim(),
                        number: String(row[headers.indexOf("Number")] || '').trim().replace(/\D/g, ''),
                        amount: parseFloat(row[headers.indexOf("Amount Donated")] || 0).toString(),
                        invoice: String(row[headers.indexOf("Cash Invoice #")] || '').trim(),
                        dateReceived: String(row[headers.indexOf("Date Received")] || '').trim(),
                        email: String(row[headers.indexOf("Email")] || '').trim(),
                        bank: String(row[headers.indexOf("Bank")] || '').trim(),
                        referenceNumber: String(row[headers.indexOf("Reference No.")] || '').trim(),
                        proof: String(row[headers.indexOf("Proof of Transaction")] || '').trim(),
                        userUid: firebase.auth().currentUser.uid,
                        createdAt: new Date().toISOString(),
                        updatedAt: new Date().toISOString()
                    };

                    if (donation.number && donation.number.length === 10 && donation.number.startsWith('9')) {
                        donation.number = '0' + donation.number;
                    }

                    const mockInputs = {
                        encoder: { value: donation.encoder, classList: { add: () => {}, remove: () => {} }, nextElementSibling: null },
                        name: { value: donation.name, classList: { add: () => {}, remove: () => {} }, nextElementSibling: null },
                        address: { value: donation.address, classList: { add: () => {}, remove: () => {} }, nextElementSibling: null },
                        number: { value: donation.number, classList: { add: () => {}, remove: () => {} }, nextElementSibling: null },
                        amount: { value: donation.amount, classList: { add: () => {}, remove: () => {} }, nextElementSibling: null },
                        invoice: { value: donation.invoice, classList: { add: () => {}, remove: () => {} }, nextElementSibling: null },
                        dateReceived: { value: donation.dateReceived, classList: { add: () => {}, remove: () => {} }, nextElementSibling: null },
                        email: { value: donation.email, classList: { add: () => {}, remove: () => {} }, nextElementSibling: null },
                        bank: { value: donation.bank, classList: { add: () => {}, remove: () => {} }, nextElementSibling: null },
                        referenceNumber: { value: donation.referenceNumber, classList: { add: () => {}, remove: () => {} }, nextElementSibling: null },
                        proof: { value: donation.proof, classList: { add: () => {}, remove: () => {} }, nextElementSibling: null }
                    };

                    const originalShowError = showError;
                    const rowErrors = [];
                    showError = (input, message) => {
                        rowErrors.push(`Row ${i + 2}: ${message}`);
                    };

                    const isValidRow = await validateDonationForm(mockInputs);

                    showError = originalShowError;

                    if (!isValidRow) {
                        if (rowErrors.length > 0) {
                            importErrors.push(...rowErrors);
                        }
                        continue;
                    }

                    // if (donation.dateReceived) {
                    //     const parsedDate = new Date(donation.dateReceived);
                    //     if (!isNaN(parsedDate.getTime())) {
                    //         donation.dateReceived = parsedDate.toISOString().slice(0, 10);
                    //     }
                    // }

                    // if (donation.dateReceived) {
                    //     const parsedDate = new Date(donation.dateReceived);
                    //     if (!isNaN(parsedDate.getTime())) {
                    //         donation.dateReceived = parsedDate.toISOString().slice(0, 10);
                    //     } else {
                    //         importErrors.push(`Row ${i + 2}: Invalid Date Received.`);
                    //         continue;
                    //     }
                    // }

                    if (donation.dateReceived) {
                        const parsedDate = new Date(donation.dateReceived);
                        if (!isNaN(parsedDate.getTime())) {
                            donation.dateReceived = parsedDate.toISOString().slice(0, 10);
                            if (parsedDate.setHours(0, 0, 0, 0) > new Date().setHours(0, 0, 0, 0)) {
                                const result = await Swal.fire({
                                    title: 'Future Date Detected in Row ' + (i + 2),
                                    text: 'The Date Received is in the future. Is this a pledged or scheduled donation?',
                                    icon: 'question',
                                    showCancelButton: true,
                                    confirmButtonText: 'Yes, Proceed',
                                    cancelButtonText: 'No, Skip Row',
                                    reverseButtons: true,
                                    customClass: {
                                        popup: 'custom-swal-popup-large',
                                        title: 'custom-swal-title',
                                        htmlContainer: 'custom-swal-content',
                                        confirmButton: 'custom-confirm-btn',
                                        cancelButton: 'custom-cancel-btn'
                                    }
                                });
                                if (!result.isConfirmed) {
                                    importErrors.push(`Row ${i + 2}: Future date not confirmed as pledged/scheduled.`);
                                    continue;
                                }
                            }
                        } else {
                            importErrors.push(`Row ${i + 2}: Invalid Date Received.`);
                            continue;
                        }
                    }

                    donation.amountDonated = parseFloat(donation.amount);

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
                        const newKey = database.ref().child('donations/savedDonations/monetary').push().key;
                        updates[`donations/savedDonations/monetary/${newKey}`] = donation;
                    });

                    await database.ref().update(updates);
                    updateImportStatus(100, `Import complete! ${donationsToImport.length} records added.`);
                    Swal.fire({
                        icon: 'success',
                        title: 'Success!',
                        text: `${donationsToImport.length} monetary donation records imported successfully.`,
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
        archivedMonetaryRef.on('value', (snapshot) => {
            archivedData = [];
            snapshot.forEach((childSnapshot) => {
                const donation = childSnapshot.val();
                donation.id = childSnapshot.key;
                archivedData.push(donation);
            });

            archivedData.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
            renderArchivedTable(archivedCurrentPage);
            renderArchivedPagination();
        });
    }

    function renderArchivedTable(page) {
        archivedTableBody.innerHTML = '';
        const start = (page - 1) * archivedItemsPerPage;
        const end = start + archivedItemsPerPage;
        const paginatedItems = archivedData.slice(start, end);

        if (paginatedItems.length === 0) {
            archivedTableBody.innerHTML = '<tr><td colspan="14" class="no-data">No archived monetary donations found.</td></tr>';
            archivedEntriesInfo.textContent = 'Showing 0 to 0 of 0 entries';
            return;
        }

        paginatedItems.forEach((item, index) => {
            const row = archivedTableBody.insertRow();
            row.innerHTML = `
                <td>${start + index + 1}</td>
                <td>${item.encoder}</td>
                <td>${item.name}</td>
                <td>${item.address}</td>
                <td>${item.number}</td>
                <td>${item.amountDonated.toLocaleString('en-PH', { style: 'currency', currency: 'PHP' })}</td>
                <td>${item.invoice}</td>
                <td>${item.dateReceived}</td>
                <td>${item.email}</td>
                <td>${item.bank}</td>
                <td>${item.referenceNumber || 'N/A'}</td>
                <td><a href="${item.proof}" target="_blank">View Proof</a></td>
                <td>${item.deletedAt ? new Date(item.deletedAt).toLocaleDateString('en-PH') : 'N/A'}</td>
                <td>
                    ${permissions.canRetrieve ? `<button class="retrieve-btn" data-id="${item.id}" title="Retrieve"><i class='bx bx-archive-in'></i></button>` : ''}
                </td>
            `;
        });

        const totalEntries = archivedData.length;
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
        archivedPagination.innerHTML = '';
        const totalPages = Math.ceil(archivedData.length / archivedItemsPerPage);

        for (let i = 1; i <= totalPages; i++) {
            const pageBtn = document.createElement('button');
            pageBtn.textContent = i;
            pageBtn.classList.add('pagination-button');
            if (i === archivedCurrentPage) {
                pageBtn.classList.add('active');
            }
            pageBtn.addEventListener('click', () => {
                archivedCurrentPage = i;
                renderArchivedTable(archivedCurrentPage);
                renderArchivedPagination();
            });
            archivedPagination.appendChild(pageBtn);
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
                    const snapshot = await database.ref(`donations/archivedDonations/monetary/${firebaseKey}`).once('value');
                    const donationToRetrieve = snapshot.val();
                    if (!donationToRetrieve) {
                        Swal.fire('Error', 'Archived donation data not found for retrieval.', 'error');
                        return;
                    }
                    delete donationToRetrieve.deletedAt;
                    await database.ref(`donations/savedDonations/monetary/${firebaseKey}`).set(donationToRetrieve);
                    await database.ref(`donations/archivedDonations/monetary/${firebaseKey}`).remove();
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

    function generateCashInvoiceNumber() {
        const prefix = "CINV-";
        const randomNumber = Math.floor(100000 + Math.random() * 900000);
        return prefix + randomNumber;
    }

    document.getElementById("invoice").value = generateCashInvoiceNumber();

    function updateSearchPlaceholder() {
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
            case "address-asc":
            case "address-desc":
                placeholderText = "Search by Address";
                break;
            case "number-asc":
            case "number-desc":
                placeholderText = "Search by Number";
                break;
            case "amount-asc":
            case "amount-desc":
                placeholderText = "Search by Amount";
                break;
            case "invoice-asc":
            case "invoice-desc":
                placeholderText = "Search by Invoice";
                break;
            case "dateReceived-asc":
            case "dateReceived-desc":
                placeholderText = "Search by Date Received";
                break;
            case "email-asc":
            case "email-desc":
                placeholderText = "Search by Email";
                break;
            case "bank-asc":
            case "bank-desc":
                placeholderText = "Search by Bank";
                break;
        }
        searchInput.placeholder = placeholderText;
    }

    // auth.onAuthStateChanged(async user => {
    //     if (!user) {
    //         Swal.fire({
    //             icon: 'error',
    //             title: 'Authentication Required',
    //             text: 'Please sign in to access in-kind donations.',
    //             showConfirmButton: true,
    //             confirmButtonText: 'OK',
    //             customClass: {
    //                 popup: 'swal2-popup-error-clean',
    //                 title: 'swal2-title-error-clean',
    //                 htmlContainer: 'swal2-text-error-clean',
    //                 confirmButton: 'my-error-button'
    //             }
    //         }).then(() => {
    //             window.location.href = "../pages/login.html";
    //         });
    //         return;
    //     }
    //     permissions = await checkAdminPermissions();
    //     if (!permissions.canView) {
    //         Swal.fire({
    //             icon: 'error',
    //             title: 'Access Denied',
    //             text: 'You do not have permission to access this page.',
    //             showConfirmButton: true,
    //             confirmButtonText: 'OK',
    //             customClass: {
    //                 popup: 'swal2-popup-error-clean',
    //                 title: 'swal2-title-error-clean',
    //                 htmlContainer: 'swal2-text-error-clean',
    //                 confirmButton: 'my-error-button'
    //             }
    //         }).then(() => {
    //             window.location.href = "../pages/login.html";
    //         });
    //         return;
    //     }
    //     loadDonations(user.uid);
    //     updateSearchPlaceholder();
    //     resetInactivityTimer();
    //     if (!permissions.canArchive) {
    //         document.querySelectorAll('.archiveBtn').forEach(btn => btn.style.display = 'none');
    //     }
    //     if (!permissions.canEdit) {
    //         document.querySelectorAll('.editBtn').forEach(btn => btn.style.display = 'none');
    //     }
    // });

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
            }).then(() => {
                window.location.href = "../pages/login.html";
            });
            return;
        }

        try {
            // Check password_needs_reset
            const userSnapshot = await database.ref(`users/${user.uid}`).once("value");
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
                    window.location.replace("../pages/profile.html");
                });
                return;
            }

            // Proceed with normal flow
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
                    window.location.href = "../pages/login.html";
                });
                return;
            }

            loadDonations(user.uid);
            updateSearchPlaceholder();
            resetInactivityTimer();
            if (!permissions.canArchive) {
                document.querySelectorAll('.archiveBtn').forEach(btn => btn.style.display = 'none');
            }
            if (!permissions.canEdit) {
                document.querySelectorAll('.editBtn').forEach(btn => btn.style.display = 'none');
            }
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
                window.location.href = "../pages/login.html";
            });
        }
    });

    function loadDonations(userUid) {
        database.ref("donations/savedDonations/monetary").on("value", snapshot => {
            allDonations = [];
            const donations = snapshot.val();
            if (donations) {
                Object.keys(donations).forEach(key => {
                    const donation = donations[key];
                    allDonations.push({
                        firebaseKey: key, 
                        userUid: donation.userUid || userUid, 
                        encoder: donation.encoder || '',
                        name: donation.name || '',
                        address: donation.address || '',
                        number: donation.number || '',
                        amountDonated: donation.amountDonated || 0,
                        invoice: donation.invoice || '',
                        dateReceived: donation.dateReceived || '',
                        email: donation.email || '',
                        bank: donation.bank || '',
                        referenceNumber: donation.referenceNumber || '',
                        proof: donation.proof || '',
                        id: donation.id || Date.now(), 
                        createdAt: donation.createdAt || new Date().toISOString(),
                        updatedAt: donation.updatedAt || new Date().toISOString()
                    });
                });
            }
            filteredAndSortedDonations = [...allDonations];
            renderTable();
        }, error => {
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'Failed to load monetary donations: ' + error.message,
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

async function validateDonationForm(inputs, excludeKey = null) {
    let isValid = true;
    const today = new Date();

    // Define fields to validate with their properties
    const fieldsToCheck = [
        { id: "encoder", label: "Encoder", lettersOnly: true },
        { id: "name", label: "Name", lettersOnly: false },
        { id: "address", label: "Location" },
        { id: "number", label: "Number", telNumber: true },
        { id: "amount", label: "Amount Donated", numericAmount: true, positiveNumber: true },
        { id: "invoice", label: "Cash Invoice #", required: false },
        { id: "dateReceived", label: "Date Received", isDate: true },
        { id: "email", label: "Email", isEmail: true },
        { id: "bank", label: "Bank" },
        { id: "referenceNumber", label: "Reference Number", required: false, hasValidReferenceNumber: true }, // Changed property name
        { id: "proof", label: "Proof of Transaction", required: false, isUrl: true },
    ];

    // Validate each field
    fieldsToCheck.forEach(({ id, label, lettersOnly, telNumber, numericAmount, positiveNumber, isEmail, isDate = false, required = true, isUrl = false, hasValidReferenceNumber = false }) => {
        const input = inputs[id];
        clearError(input);
        if (required && isEmpty(input.value)) {
            showError(input, `${label} is required.`);
            isValid = false;
        } else if (!isEmpty(input.value)) {
            if (lettersOnly && !isLettersOnly(input.value)) {
                showError(input, `${label} should only contain letters and spaces.`);
                isValid = false;
            }
            if (telNumber && !isValidMobile(input.value)) {
                showError(input, `Mobile number must be 11 digits starting with "09"`);
                isValid = false;
            }
            if (numericAmount) {
                if (!isValidNumericAmount(input.value)) {
                    showError(input, `${label} should only contain numbers.`);
                    isValid = false;
                } else if (positiveNumber && parseFloat(input.value) <= 0) {
                    showError(input, `${label} must be a positive number.`);
                    isValid = false;
                } else if (label === "Amount Donated" && parseFloat(input.value) < 100) {
                    showError(input, `${label} must be at least PHP 100.`);
                    isValid = false;
                }
            }
            if (isEmail && !isValidEmail(input.value.trim())) {
                showError(input, `Please enter a valid email address from an allowed domain.`);
                isValid = false;
            }
            // bawal future date
            // if (isDate) {
            //     const receivedDate = new Date(input.value);
            //     if (isNaN(receivedDate.getTime())) {
            //         showError(input, `${label} is not a valid date.`);
            //         isValid = false;
            //     } else if (receivedDate.setHours(0, 0, 0, 0) > today.setHours(0, 0, 0, 0)) {
            //         showError(input, `${label} cannot be a future date.`);
            //         isValid = false;
            //     }
            // }

            // pede past, present, and future
            // if (isDate) {
            //     const receivedDate = new Date(input.value);
            //     if (isNaN(receivedDate.getTime())) {
            //         showError(input, `${label} is not a valid date.`);
            //         isValid = false;
            //     }
            // }
            if (isDate) {
                const receivedDate = new Date(input.value);
                if (isNaN(receivedDate.getTime())) {
                    showError(input, `${label} is not a valid date.`);
                    isValid = false;
                } else if (receivedDate.setHours(0, 0, 0, 0) > today.setHours(0, 0, 0, 0)) {
                    return new Promise((resolve) => {
                        Swal.fire({
                            title: 'Future Date Detected',
                            text: 'The Date Received is in the future. Is this a pledged or scheduled donation?',
                            icon: 'question',
                            showCancelButton: true,
                            confirmButtonText: 'Yes, Proceed',
                            cancelButtonText: 'No, Change Date',
                            reverseButtons: true,
                            customClass: {
                                popup: 'custom-swal-popup-large',
                                title: 'custom-swal-title',
                                htmlContainer: 'custom-swal-content',
                                confirmButton: 'custom-confirm-btn',
                                cancelButton: 'custom-cancel-btn'
                            }
                        }).then((result) => {
                            if (!result.isConfirmed) {
                                showError(input, 'Please select a valid date.');
                                isValid = false;
                            }
                            resolve(isValid);
                        });
                    });
                }
            }
            if (hasValidReferenceNumber && input.value && !isValidReferenceNumber(input.value)) {
                showError(input, `${label} must be alphanumeric and up to 20 characters.`);
                isValid = false;
            }
            if (isUrl && input.value && !isValidUrl(input.value.trim())) {
                showError(input, `${label} must be a valid URL.`);
                isValid = false;
            }
        }
    });

    // Check for duplicate donation
    if (isValid) {
        const number = inputs.number.value;
        const email = inputs.email.value;
        const name = inputs.name.value;
        const duplicates = await checkForDuplicate(number, email, name, excludeKey);
        const duplicateMessages = [];
        if (duplicates.all) {
            duplicateMessages.push("A donation with the same name, mobile number, and email already exists.");
        } else {
            if (duplicates.email) duplicateMessages.push("<li>This email is already used in another donation.</li>");
            if (duplicates.number) duplicateMessages.push("<li>This mobile number is already used in another donation.</li>");
            if (duplicates.name) duplicateMessages.push("<li>This name is already used in another donation.</li>");
        }

        if (duplicateMessages.length > 0) {
            return new Promise((resolve) => {
                Swal.fire({
                    title: 'Potential Duplicate Donation',
                    html: duplicateMessages.join('<br>') + '<br>Proceed anyway?',
                    icon: 'warning',
                    showCancelButton: true,
                    confirmButtonText: 'Proceed Anyway',
                    cancelButtonText: 'Cancel',
                    reverseButtons: true,
                    customClass: {
                        popup: 'custom-swal-popup-large',
                        title: 'custom-swal-title',
                        htmlContainer: 'custom-swal-content',
                        confirmButton: 'custom-confirm-btn',
                        cancelButton: 'custom-cancel-btn'
                    }
                }).then((result) => {
                    resolve(result.isConfirmed);
                });
            });
        }
    }
    return isValid;
}

    form.addEventListener("input", () => {
        formHasChanges = true;
    });

    form.addEventListener("submit", async (e) => {
        e.preventDefault();
        const inputs = {
            encoder: form.encoder,
            name: form.name,
            address: form.address,
            number: form.number,
            amount: form.amount,
            invoice: form.invoice,
            dateReceived: form.dateReceived,
            email: form.email,
            bank: form.bank,
            referenceNumber: form.referenceNumber,
            proof: form.proof
        };
        const isValid = await validateDonationForm(inputs);
        if (isValid) {
            const user = auth.currentUser;
            if (!user) {
                Swal.fire("Error", "User not authenticated!", "error");
                return;
            }

            const newDonation = {
                encoder: inputs.encoder.value,
                name: inputs.name.value,
                address: inputs.address.value,
                number: inputs.number.value,
                amountDonated: parseFloat(inputs.amount.value),
                invoice: inputs.invoice.value,
                dateReceived: inputs.dateReceived.value,
                email: inputs.email.value,
                bank: inputs.bank.value,
                referenceNumber: inputs.referenceNumber.value,
                proof: inputs.proof.value,
                id: Date.now(),
                userUid: user.uid,
                createdAt: new Date().toISOString(),
            };

            database.ref("donations/savedDonations/monetary").push(newDonation)
            .then(() => {
                form.reset();
                document.getElementById("invoice").value = generateCashInvoiceNumber();
                formHasChanges = false;
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
            })
            .catch(error => {
                Swal.fire({
                    icon: 'error',
                    title: 'Failed to Add Donation',
                    text: 'An error occurred: ' + error.message,
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
    });

    clearFormBtn.addEventListener("click", () => {
        const clearFormFields = () => {
            form.encoder.value = '';
            form.name.value = '';
            form.address.value = '';
            form.number.value = '';
            form.amount.value = '';
            form.dateReceived.value = '';
            form.email.value = '';
            form.bank.value = '';
            form.referenceNumber.value = '';
            form.proof.value = '';
            document.getElementById("invoice").value = generateCashInvoiceNumber();
            formHasChanges = false;
            const errorMessages = form.querySelectorAll('.error-message');
            errorMessages.forEach(msg => msg.textContent = '');
            const errorInputs = form.querySelectorAll('.error');
            errorInputs.forEach(input => input.classList.remove('error'));
        };

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
                    popup: 'custom-swal-popup-small',
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
                <p><strong>Encoder:</strong> ${donation.encoder || 'N/A'}</p>
                <p><strong>Name:</strong> ${donation.name || 'N/A'}</p>
                <p><strong>Location:</strong> ${donation.address || 'N/A'}</p>
                <p><strong>Number:</strong> ${donation.number || 'N/A'}</p>
                <hr>
                <h2>Transaction Details</h2>
                <p><strong>Amount Donated:</strong> ${parseFloat(donation.amountDonated || 0).toLocaleString('en-PH', { style: 'currency', currency: 'PHP' })}</p>
                <p><strong>Cash Invoice #:</strong> ${donation.invoice || 'N/A'}</p>
                <p><strong>Date Received:</strong> ${donation.dateReceived ? new Date(donation.dateReceived).toLocaleDateString('en-PH') : 'N/A'}</p>
                <p><strong>Email:</strong> ${donation.email || 'N/A'}</p>
                <p><strong>Bank:</strong> ${donation.bank || 'N/A'}</p>
                <p><strong>Reference Number:</strong> ${donation.referenceNumber || 'N/A'}</p>
                <p><strong>Proof of Transaction:</strong> ${donation.proof ? `<a href="${donation.proof}" target="_blank" rel="noopener noreferrer">View Proof</a>` : 'N/A'}</p>
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
            tableBody.innerHTML = `<tr><td colspan="12" style="text-align: center;">No donations found.</td></tr>`;
        } else {
            currentPageRows.forEach((d, i) => {
                const tr = document.createElement("tr");
                tr.innerHTML = `
                    <td>${startIndex + i + 1}</td>
                    <td>${d.encoder || 'N/A'}</td>
                    <td>${d.name || 'N/A'}</td>
                    <td>${d.address || 'N/A'}</td>
                    <td>${d.number || 'N/A'}</td>
                    <td>${parseFloat(d.amountDonated || 0).toLocaleString('en-PH', { style: 'currency', currency: 'PHP' })}</td>
                    <td>${d.invoice || 'N/A'}</td>
                    <td>${new Date(d.dateReceived).toLocaleDateString('en-PH')}</td>
                    <td>${d.email || 'N/A'}</td>
                    <td>${d.bank || 'N/A'}</td>
                    <td>${d.referenceNumber || 'N/A'}</td>
                    <td>${d.proof ? `<a href="${d.proof}" target="_blank">View Proof</a>` : 'N/A'}</td>
                    <td>
                        <button class="viewBtn"><i class='bx bx-show-alt'></i></button>
                        ${permissions.canEdit ? `<button title="Edit" class="editBtn"><i class='bx bx-edit'></i></button>` : ''}
                        ${permissions.canArchive ? `<button title="Archive" class="archiveBtn"><i class='bx bx-archive'></i></button>` : ''}
                        <button title="Save as PDF" class="savePDFBtn"><i class='bx bxs-file-pdf'></i></button>
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
                tr.querySelector(".savePDFBtn").addEventListener("click", () => saveSingleMonetaryDonationPdf(d));
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
            if (currentSort.includes('address')) return (d.address || '').toLowerCase().includes(searchTerm);
            if (currentSort.includes('number')) return String(d.number || '').includes(searchTerm);
            if (currentSort.includes('amount')) return String(d.amountDonated || '').includes(searchTerm);
            if (currentSort.includes('invoice')) return (d.invoice || '').toLowerCase().includes(searchTerm);
            if (currentSort.includes('dateReceived')) return (d.dateReceived || '').toLowerCase().includes(searchTerm);
            if (currentSort.includes('email')) return (d.email || '').toLowerCase().includes(searchTerm);
            if (currentSort.includes('bank')) return (d.bank || '').toLowerCase().includes(searchTerm);

            return (d.name || '').toLowerCase().includes(searchTerm) ||
                (d.encoder || '').toLowerCase().includes(searchTerm) ||
                (d.address || '').toLowerCase().includes(searchTerm) ||
                (String(d.number) || '').includes(searchTerm) ||
                (String(d.amountDonated) || '').includes(searchTerm) ||
                (d.invoice || '').toLowerCase().includes(searchTerm) ||
                (d.dateReceived || '').toLowerCase().includes(searchTerm) ||
                (d.email || '').toLowerCase().includes(searchTerm) ||
                (d.bank || '').toLowerCase().includes(searchTerm);
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
        else if (sortVal === "address-asc") arr.sort((a, b) => (a.address || '').localeCompare(b.address || ''));
        else if (sortVal === "address-desc") arr.sort((a, b) => (b.address || '').localeCompare(a.address || ''));
        else if (sortVal === "number-asc") arr.sort((a, b) => parseInt((a.number || '0').replace(/\D/g, '')) - parseInt((b.number || '0').replace(/\D/g, '')));
        else if (sortVal === "number-desc") arr.sort((a, b) => parseInt((b.number || '0').replace(/\D/g, '')) - parseInt((a.number || '0').replace(/\D/g, '')));
        else if (sortVal === "amount-asc") arr.sort((a, b) => (a.amountDonated || 0) - (b.amountDonated || 0));
        else if (sortVal === "amount-desc") arr.sort((a, b) => (b.amountDonated || 0) - (a.amountDonated || 0));
        else if (sortVal === "invoice-asc") arr.sort((a, b) => (a.invoice || '').localeCompare(b.invoice || ''));
        else if (sortVal === "invoice-desc") arr.sort((a, b) => (b.invoice || '').localeCompare(a.invoice || ''));
        else if (sortVal === "dateReceived-asc") arr.sort((a, b) => new Date(a.dateReceived || '0') - new Date(b.dateReceived || '0'));
        else if (sortVal === "dateReceived-desc") arr.sort((a, b) => new Date(b.dateReceived || '0') - new Date(a.dateReceived || '0'));
        else if (sortVal === "email-asc") arr.sort((a, b) => (a.email || '').localeCompare(b.email || ''));
        else if (sortVal === "email-desc") arr.sort((a, b) => (b.email || '').localeCompare(a.email || ''));
        else if (sortVal === "bank-asc") arr.sort((a, b) => (a.bank || '').localeCompare(b.bank || ''));
        else if (sortVal === "bank-desc") arr.sort((a, b) => (b.email || '').localeCompare(a.email || ''));
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
            "Location": d.address,
            "Number": d.number,
            "Amount Donated": d.amountDonated,
            "Cash Invoice #": d.invoice,
            "Date Received": new Date(d.dateReceived).toLocaleDateString('en-PH'),
            "Email": d.email,
            "Bank": d.bank,
            "Proof of Transaction": d.proof
        }));

        const ws = XLSX.utils.json_to_sheet(dataForExport);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Monetary Donations");
        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const day = String(today.getDate()).padStart(2, '0');
        const formattedDate = `${year}-${month}-${day}`;
        const filename = `monetary-donations_${formattedDate}.xlsx`;
        XLSX.writeFile(wb, filename);
        Swal.fire({
            title: 'Export Successful!',
            text: `Monetary Donations exported to "${filename}"!`,
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
            doc.text("Monetary Donations Report", 14, yOffset);
            yOffset += 10;
            doc.setFontSize(10);
            doc.text(`Report Generated: ${new Date().toLocaleString()}`, 14, yOffset);
            yOffset += 15;

            const head = [["No.", "Encoder", "Name", "Location", "Number", "Amount Donated", "Cash Invoice #", "Date Received", "Email", "Bank"]];
            const body = allDonations.map((d, i) => [
                i + 1,
                d.encoder || 'N/A',
                d.name || 'N/A',
                d.address || 'N/A',
                String(d.number) || 'N/A',
                `PHP ${parseFloat(d.amountDonated || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
                d.invoice || 'N/A',
                new Date(d.dateReceived).toLocaleDateString('en-PH') || 'N/A',
                d.email || 'N/A',
                d.bank || 'N/A'
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

            const filename = `all-monetary-donations_${new Date().toISOString().slice(0, 10)}.pdf`;
            doc.save(filename);
            Swal.fire({
                title: 'Success!',
                text: `All Monetary Donations exported to "${filename}"`,
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

    function saveSingleMonetaryDonationPdf(donation) {
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
            doc.text("Monetary Donation Details", 14, 22);
            doc.setFontSize(10);
            doc.text(`Report Generated: ${new Date().toLocaleString()}`, 14, 30);
            let y = 45;

            const addDetail = (label, value) => {
                doc.text(`${label}: ${value || 'N/A'}`, 14, y);
                y += 7;
            };

            addDetail("Encoder", donation.encoder);
            addDetail("Name", donation.name);
            addDetail("Location", donation.address);
            addDetail("Number", String(donation.number));
            addDetail("Amount Donated", `PHP ${parseFloat(donation.amountDonated || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
            addDetail("Cash Invoice #", donation.invoice);
            addDetail("Date Received", new Date(donation.dateReceived).toLocaleDateString('en-PH'));
            addDetail("Email", donation.email);
            addDetail("Bank", donation.bank);
            addDetail("Reference Number", donation.referenceNumber);
            addDetail("Proof of Transaction", donation.proof);
            addDetail("Recorded On", new Date(donation.createdAt).toLocaleString());

            doc.setFontSize(8);
            const footerY = doc.internal.pageSize.height - 10;
            const pageNumberText = `Page 1 of 1`;
            const poweredByText = "Powered by: Appvance";

            doc.text(pageNumberText, margin, footerY);
            doc.text(poweredByText, pageWidth - margin, footerY, { align: 'right' });

            doc.save(`monetary_donation_${new Date().toISOString().slice(0, 10)}.pdf`);
            Swal.fire({
                title: 'Export Successful!',
                text: 'Monetary donation details have been exported to PDF.',
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
                    deletedAt: new Date().toISOString()
                };

                database.ref(`donations/archivedDonations/monetary/${firebaseKey}`).set(deletedDonation)
                    .then(() => {
                        return database.ref(`donations/savedDonations/monetary/${firebaseKey}`).remove();
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

    async function openEditModal(firebaseKey) {
        if (!permissions.canEdit) {
            Swal.fire('Error', 'You do not have permission to edit donations.', 'error');
            return;
        }
        const isVerified = await verifySuperAdminPassword();
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
                document.getElementById("edit-encoder").value = donationToEdit.encoder || '';
                document.getElementById("edit-name").value = donationToEdit.name || '';
                document.getElementById("edit-address").value = donationToEdit.address || '';
                document.getElementById("edit-number").value = donationToEdit.number || '';
                document.getElementById("edit-amount").value = donationToEdit.amountDonated;
                document.getElementById("edit-invoice").value = donationToEdit.invoice || '';
                document.getElementById("edit-dateReceived").value = donationToEdit.dateReceived || '';
                document.getElementById("edit-email").value = donationToEdit.email || '';
                document.getElementById("edit-bank").value = donationToEdit.bank || '';
                document.getElementById("edit-referenceNumber").value = donationToEdit.referenceNumber || ''; 
                document.getElementById("edit-proof").value = donationToEdit.proof || "";
                editModal.style.display = "flex";
                Array.from(editModal.querySelectorAll('input, select')).forEach(clearError);
            }
        }

        document.getElementById("saveEditBtn").addEventListener("click", async () => {
        if (editingKey !== null) {
            const inputs = {
                encoder: document.getElementById("edit-encoder"),
                name: document.getElementById("edit-name"),
                address: document.getElementById("edit-address"),
                number: document.getElementById("edit-number"),
                amount: document.getElementById("edit-amount"),
                invoice: document.getElementById("edit-invoice"),
                dateReceived: document.getElementById("edit-dateReceived"),
                email: document.getElementById("edit-email"),
                bank: document.getElementById("edit-bank"),
                referenceNumber: document.getElementById("edit-referenceNumber"),
                proof: document.getElementById("edit-proof")
            };
            const isValid = await validateDonationForm(inputs, editingKey);
            if (isValid) {
                const donation = allDonations.find(d => d.firebaseKey === editingKey);
                if (!donation) {
                    Swal.fire("Error", "Donation not found!", "error");
                    return;
                }
                const updatedDonation = {
                    encoder: inputs.encoder.value,
                    name: inputs.name.value,
                    address: inputs.address.value,
                    number: inputs.number.value,
                    amountDonated: parseFloat(inputs.amount.value),
                    invoice: inputs.invoice.value,
                    dateReceived: inputs.dateReceived.value,
                    email: inputs.email.value,
                    bank: inputs.bank.value,
                    referenceNumber: inputs.referenceNumber.value,
                    proof: inputs.proof.value,
                    id: donation.id,
                    userUid: donation.userUid,
                    createdAt: donation.createdAt,
                    updatedAt: new Date().toISOString(),
                };

                database.ref(`donations/savedDonations/monetary/${editingKey}`).update(updatedDonation)
                    .then(() => {
                        closeEditModal();
                        Swal.fire({
                            title: 'Success!',
                            text: 'Donation updated successfully!',
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
                        editingKey = null;
                    })
                    .catch(error => {
                        Swal.fire("Error", "Failed to update donation: " + error.message, "error");
                    });
            }
        }
    });

    function closeEditModal() {
        editModal.style.display = "none";
        editingKey = null;
        const errorMessages = editModal.querySelectorAll('.error-message');
        errorMessages.forEach(msg => msg.textContent = '');
        const errorInputs = editModal.querySelectorAll('.error');
        errorInputs.forEach(input => input.classList.remove('error'));
    }

    document.getElementById("closeEditModalBtn").addEventListener("click", closeEditModal);
    document.getElementById("cancelEditBtn").addEventListener("click", closeEditModal);
    document.getElementById("closeModal").addEventListener("click", hideViewModal);
    document.getElementById("downloadTemplateBtn").addEventListener("click", downloadExcelTemplate);
});